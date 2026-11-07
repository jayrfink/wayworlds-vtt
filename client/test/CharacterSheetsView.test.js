/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import fs from 'fs';
import path from 'path';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';
import { useAuthStore } from '../src/stores/auth.js';
import * as characterExport from '../src/utils/characterExport.js';

describe('CharacterSheetsView - Equipment Catalog & Inventory Logic', () => {
  it('filters equipment list by name, category, or capability', () => {
    const vm = {
      equipmentList: [
        { name: 'Vibroknife', category: 'Weapon', cost: 30, weight: 1, capabilities: 'Damage: 1d10, Melee' },
        { name: 'Laser Pistol', category: 'Weapon', cost: 500, weight: 1, capabilities: 'Damage: 1d10 to 10d10' },
        { name: 'Albedo Screen', category: 'Armor', cost: 500, weight: 1, capabilities: 'Defends vs lasers' },
        { name: 'Chronocom', category: 'Equipment', cost: 50, weight: 0.5, capabilities: 'Timepiece and communicator' },
      ],
      equipmentSearchQuery: '',
    };

    // All items when query is empty
    let filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
    expect(filtered.length).toBe(4);

    // Search by name
    vm.equipmentSearchQuery = 'Pistol';
    filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Laser Pistol');

    // Search by category
    vm.equipmentSearchQuery = 'Armor';
    filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Albedo Screen');

    // Search by capability
    vm.equipmentSearchQuery = 'communicator';
    filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Chronocom');
  });

  it('adds an equipment item from catalog to character inventory with notes', () => {
    const vm = {
      selectedChar: {
        inventory: [
          { name: 'Rations', quantity: 2, weight: 0.5, notes: 'Food' },
        ],
      },
      recentlyAddedMap: {},
      updateCharacter: () => {},
    };

    const item = {
      name: 'Laser Pistol',
      category: 'Weapon',
      cost: 500,
      weight: 1,
      capabilities: 'Damage: 1d10 to 10d10, Range: 50m',
    };

    CharacterSheetsView.methods.addEquipment.call(vm, item);

    expect(vm.selectedChar.inventory.length).toBe(2);
    const added = vm.selectedChar.inventory[1];
    expect(added.name).toBe('Laser Pistol');
    expect(added.weight).toBe(1);
    expect(added.quantity).toBe(1);
    expect(added.notes).toBe('Damage: 1d10 to 10d10, Range: 50m');
    expect(vm.recentlyAddedMap['Laser Pistol']).toBe(true);
  });

  it('filters character inventory items by name or notes', () => {
    const vm = {
      selectedChar: {
        inventory: [
          { name: 'Rations', quantity: 2, weight: 0.5, notes: 'Food cubes' },
          { name: 'Laser Pistol', quantity: 1, weight: 1, notes: 'ESS weapon' },
        ],
      },
      searchInventoryQuery: '',
    };

    let filtered = CharacterSheetsView.computed.filteredInventory.call(vm);
    expect(filtered.length).toBe(2);

    vm.searchInventoryQuery = 'Laser';
    filtered = CharacterSheetsView.computed.filteredInventory.call(vm);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Laser Pistol');

    vm.searchInventoryQuery = 'cubes';
    filtered = CharacterSheetsView.computed.filteredInventory.call(vm);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Rations');
  });

  it('removes inventory item by object reference or index', () => {
    const item1 = { name: 'Rations', quantity: 2, weight: 0.5 };
    const item2 = { name: 'Vibroknife', quantity: 1, weight: 1 };
    const vm = {
      selectedChar: {
        inventory: [item1, item2],
      },
      updateCharacter: () => {},
    };

    // Remove by item reference
    CharacterSheetsView.methods.removeInventoryItem.call(vm, item1);
    expect(vm.selectedChar.inventory.length).toBe(1);
    expect(vm.selectedChar.inventory[0].name).toBe('Vibroknife');

    // Remove by index
    CharacterSheetsView.methods.removeInventoryItem.call(vm, 0);
    expect(vm.selectedChar.inventory.length).toBe(0);
  });

  describe('PSA Selection & Normalization', () => {
    it('normalizes PSA values to Martial, Mystic, Theurgy and defaults missing PSA to Martial', () => {
      const normalize = CharacterSheetsView.methods.normalizeCharacterData;

      const mysticChar = normalize({ name: 'Mystic', psa: 'Mystic' });
      expect(mysticChar.psa).toBe('Mystic');

      const bioChar = normalize({ name: 'Medic', psa: 'Theurgy' });
      expect(bioChar.psa).toBe('Theurgy');

      const martialChar = normalize({ name: 'Soldier', psa: 'Martial' });
      expect(martialChar.psa).toBe('Martial');

      const defaultChar = normalize({ name: 'Recruit' });
      expect(defaultChar.psa).toBe('Martial');

      // Also converts legacy PSA names
      expect(normalize({ name: 'OldTech', psa: 'Technological' }).psa).toBe('Mystic');
      expect(normalize({ name: 'OldMagic', psa: 'Magic' }).psa).toBe('Mystic');
      expect(normalize({ name: 'OldBio', psa: 'Biosocial' }).psa).toBe('Theurgy');
      expect(normalize({ name: 'OldMil', psa: 'Military' }).psa).toBe('Martial');
      expect(normalize({ name: 'OldCombat', psa: 'Combat' }).psa).toBe('Martial');
    });

    it('calculates XP cost based on active PSA', () => {
      const vmMystic = {
        selectedChar: { psa: 'Mystic' },
      };
      const vmMartial = {
        selectedChar: { psa: 'Martial' },
      };

      // Lore & Arcana is Mystic PSA (base cost 3 * level = 6)
      const costInPSA = CharacterSheetsView.methods.getXPCost.call(vmMystic, 'Lore & Arcana', 2);
      expect(costInPSA).toBe(6); // 2 * 3

      const costOutOfPSA = CharacterSheetsView.methods.getXPCost.call(vmMartial, 'Lore & Arcana', 2);
      expect(costOutOfPSA).toBe(12); // 2 * (3 * 2)

      // Legacy PSA support
      const vmMil = { selectedChar: { psa: 'Military' } };
      expect(CharacterSheetsView.methods.getXPCost.call(vmMil, 'Lore & Arcana', 2)).toBe(12);
      const vmCombat = { selectedChar: { psa: 'Combat' } };
      expect(CharacterSheetsView.methods.getXPCost.call(vmCombat, 'Lore & Arcana', 2)).toBe(12);
      const vmTech = { selectedChar: { psa: 'Technological' } };
      expect(CharacterSheetsView.methods.getXPCost.call(vmTech, 'Lore & Arcana', 2)).toBe(6);
    });
  });

  describe('ImageBrowserModal Integration', () => {
    it('opens image browser modal with given target', () => {
      const vm = {
        showImageBrowser: false,
        imageBrowserTarget: 'char',
      };

      CharacterSheetsView.methods.openImageBrowser.call(vm, 'char');
      expect(vm.showImageBrowser).toBe(true);
      expect(vm.imageBrowserTarget).toBe('char');

      CharacterSheetsView.methods.openImageBrowser.call(vm, 'create');
      expect(vm.showImageBrowser).toBe(true);
      expect(vm.imageBrowserTarget).toBe('create');
    });

    it('handles image selection for sheet portrait and triggers update', () => {
      let updated = false;
      const vm = {
        imageBrowserTarget: 'char',
        selectedChar: {
          id: 'c1',
          name: 'Wilf',
          avatar_url: '',
        },
        updateCharacter() {
          updated = true;
        },
      };

      CharacterSheetsView.methods.onImageSelected.call(vm, '/uploads/portraits/wilf.png');
      expect(vm.selectedChar.avatar_url).toBe('/uploads/portraits/wilf.png');
      expect(updated).toBe(true);
    });

    it('handles image selection for create character form', () => {
      const vm = {
        imageBrowserTarget: 'create',
        newCharForm: {
          name: '',
          avatar_url: '',
        },
      };

      CharacterSheetsView.methods.onImageSelected.call(vm, '/uploads/portraits/new_hero.png');
      expect(vm.newCharForm.avatar_url).toBe('/uploads/portraits/new_hero.png');
    });

    it('computes currentBrowserImage and imageBrowserTitle correctly', () => {
      const vmChar = {
        imageBrowserTarget: 'char',
        selectedChar: { avatar_url: '/uploads/char1.png' },
        newCharForm: { avatar_url: '/uploads/char2.png' },
      };
      expect(CharacterSheetsView.computed.currentBrowserImage.call(vmChar)).toBe('/uploads/char1.png');
      expect(CharacterSheetsView.computed.imageBrowserTitle.call(vmChar)).toBe('Select Character Portrait');

      const vmCreate = {
        imageBrowserTarget: 'create',
        selectedChar: { avatar_url: '/uploads/char1.png' },
        newCharForm: { avatar_url: '/uploads/char2.png' },
      };
      expect(CharacterSheetsView.computed.currentBrowserImage.call(vmCreate)).toBe('/uploads/char2.png');
      expect(CharacterSheetsView.computed.imageBrowserTitle.call(vmCreate)).toBe('Select Character Avatar');
    });
  });

  describe('Character Notes Section', () => {
    it('normalizes missing notes to empty string and preserves existing notes', () => {
      const normalize = CharacterSheetsView.methods.normalizeCharacterData;
      const charWithoutNotes = normalize({ name: 'Ace' });
      expect(charWithoutNotes.notes).toBe('');

      const charWithNotes = normalize({ name: 'Ace', notes: 'Carries backup power clip' });
      expect(charWithNotes.notes).toBe('Carries backup power clip');
    });

    it('sends notes in updateCharacter PUT payload', async () => {
      let sentBody = null;
      const origFetch = global.fetch;
      global.fetch = async (url, opts) => {
        sentBody = JSON.parse(opts.body);
        return { ok: true, json: async () => sentBody };
      };

      try {
        const vm = {
          selectedChar: {
            id: 42,
            name: 'Ace',
            str: 50,
            sta: 50,
            dex: 50,
            rs: 50,
            int: 50,
            log: 50,
            per: 50,
            ldr: 50,
            current_stamina: 50,
            notes: 'Met contact on Ironhold',
          },
          characters: [{ id: 42, name: 'Ace', notes: '' }],
          normalizeCharacterData: CharacterSheetsView.methods.normalizeCharacterData,
        };

        await CharacterSheetsView.methods.updateCharacter.call(vm);
        expect(sentBody).not.toBeNull();
        expect(sentBody.notes).toBe('Met contact on Ironhold');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('styles Character Notes section-header padding and h4 style/color consistently', () => {
      const charContent = fs.readFileSync(path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'), 'utf-8');

      expect(charContent).toMatch(/\.notes-section\s+\.section-header\s*\{[^}]*padding-bottom:\s*2%;?[^}]*\}/);
      expect(charContent).toMatch(/\.notes-section\s+h4\s*\{[^}]*margin:\s*0;?[^}]*color:\s*#45acba;?[^}]*\}/);
      expect(charContent).toMatch(/\.notes-textarea\s*\{[^}]*background:\s*#0d1117;?[^}]*border:\s*1px solid #30363d;?[^}]*\}/);
    });

    it('defaults character note panels to empty array when no notes exist', () => {
      const normalize = CharacterSheetsView.methods.normalizeCharacterData;
      const char = normalize({ name: 'Wilf' });
      expect(char.note_panels).toBeDefined();
      expect(char.note_panels.length).toBe(0);
    });

    it('loads legacy plain text notes into a single Notes panel', () => {
      const normalize = CharacterSheetsView.methods.normalizeCharacterData;
      const char = normalize({ name: 'Wilf', notes: 'Native of Gran Quivera.' });
      expect(char.note_panels.length).toBe(1);
      expect(char.note_panels[0].title).toBe('Notes');
      expect(char.note_panels[0].content).toBe('Native of Gran Quivera.');
    });

    it('adds, deletes, and reorders note panels updating serialized notes', () => {
      let updatedCharCalled = 0;
      const vm = {
        selectedChar: {
          id: 1,
          name: 'Wilf',
          notes: '',
          note_panels: [
            { id: 'p1', title: 'Background', content: 'Pale native' },
            { id: 'p2', title: 'Notes', content: 'Contact at Port Loren' },
          ],
        },
        updateCharacter() {
          updatedCharCalled++;
        },
        parseNotePanels: CharacterSheetsView.methods.parseNotePanels,
        updateNotePanels: CharacterSheetsView.methods.updateNotePanels,
        addNotePanel: CharacterSheetsView.methods.addNotePanel,
        deleteNotePanel: CharacterSheetsView.methods.deleteNotePanel,
        moveNotePanel: CharacterSheetsView.methods.moveNotePanel,
      };

      // 1. Add Note Panel
      vm.addNotePanel('Equipment Locker');
      expect(vm.selectedChar.note_panels.length).toBe(3);
      expect(vm.selectedChar.note_panels[2].title).toBe('Equipment Locker');
      expect(updatedCharCalled).toBe(1);
      const parsedNotes = JSON.parse(vm.selectedChar.notes);
      expect(parsedNotes.length).toBe(3);

      // 2. Reorder (move 3rd panel up)
      vm.moveNotePanel(2, -1);
      expect(vm.selectedChar.note_panels[1].title).toBe('Equipment Locker');
      expect(vm.selectedChar.note_panels[2].title).toBe('Notes');
      expect(updatedCharCalled).toBe(2);

      // 3. Delete panel (disable confirm modal via mock if needed)
      const origConfirm = global.confirm;
      global.confirm = () => true;
      try {
        vm.deleteNotePanel(0);
        expect(vm.selectedChar.note_panels.length).toBe(2);
        expect(vm.selectedChar.note_panels[0].title).toBe('Equipment Locker');
        expect(updatedCharCalled).toBe(3);
      } finally {
        global.confirm = origConfirm;
      }
    });

    it('reorders note panels via drag-and-drop onNotePanelDrop', () => {
      let updatedCharCalled = false;
      const vm = {
        draggedNotePanelIndex: 0,
        dragOverNotePanelIndex: 1,
        selectedChar: {
          id: 1,
          name: 'Wilf',
          notes: '',
          note_panels: [
            { id: 'p1', title: 'Background', content: 'Item 1' },
            { id: 'p2', title: 'Notes', content: 'Item 2' },
          ],
        },
        updateCharacter() {
          updatedCharCalled = true;
        },
        updateNotePanels: CharacterSheetsView.methods.updateNotePanels,
        onNotePanelDrop: CharacterSheetsView.methods.onNotePanelDrop,
      };

      const mockEvent = { preventDefault: () => {} };
      vm.onNotePanelDrop(mockEvent, 1);

      expect(vm.selectedChar.note_panels[0].title).toBe('Notes');
      expect(vm.selectedChar.note_panels[1].title).toBe('Background');
      expect(vm.draggedNotePanelIndex).toBeNull();
      expect(vm.dragOverNotePanelIndex).toBeNull();
      expect(updatedCharCalled).toBe(true);
    });

    it('limits character note panels to a maximum of 4 panels', () => {
      const vm = {
        selectedChar: {
          id: 1,
          name: 'Wilf',
          notes: '',
          note_panels: [
            { id: 'p1', title: 'Background', content: '' },
            { id: 'p2', title: 'Notes', content: '' },
          ],
        },
        updateCharacter: vi.fn(),
        parseNotePanels: CharacterSheetsView.methods.parseNotePanels,
        updateNotePanels: CharacterSheetsView.methods.updateNotePanels,
        addNotePanel: CharacterSheetsView.methods.addNotePanel,
      };

      vm.addNotePanel('Panel 3');
      expect(vm.selectedChar.note_panels.length).toBe(3);

      vm.addNotePanel('Panel 4');
      expect(vm.selectedChar.note_panels.length).toBe(4);

      // Attempting to add a 5th panel must be rejected
      vm.addNotePanel('Panel 5');
      expect(vm.selectedChar.note_panels.length).toBe(4);

      // Verify parseNotePanels clamps arrays with > 4 panels to exactly 4
      const overflownPanels = [
        { id: '1', title: 'P1' },
        { id: '2', title: 'P2' },
        { id: '3', title: 'P3' },
        { id: '4', title: 'P4' },
        { id: '5', title: 'P5' },
        { id: '6', title: 'P6' },
      ];
      const parsed = vm.parseNotePanels(overflownPanels);
      expect(parsed.length).toBe(4);
    });
  });

  describe('Equipment Catalog Category Filtering & Tabs', () => {
    const mockEquipmentList = [
      { name: 'Laser Pistol', category: 'Weapon', cost: 500, weight: 1, capabilities: 'Damage: 1d10' },
      { name: 'Heavy Laser', category: 'Weapon', cost: 1000, weight: 15, capabilities: 'Damage: 1d10 to 30d10' },
      { name: 'ESS Clip (20 ESS)', category: 'Ammunition', cost: 10, weight: 0.1, capabilities: '20 ESS' },
      { name: 'Skeinsuit', category: 'Defense', cost: 200, weight: 2, capabilities: 'Defends vs kinetic' },
      { name: 'Techkit', category: 'Toolkit', cost: 500, weight: 5, capabilities: 'Diagnostic toolkit' },
      { name: 'Stimdose', category: 'Medical', cost: 20, weight: 0.1, capabilities: 'Restores 10 STA' },
      { name: 'Chronocom', category: 'Gear', cost: 50, weight: 0.5, capabilities: 'Personal communicator' },
      { name: 'Power Backpack', category: 'Power', cost: 200, weight: 5, capabilities: '100 ESS' },
    ];

    it('calculates category count accurately including All', () => {
      const vm = {
        equipmentList: mockEquipmentList,
      };

      const getCount = CharacterSheetsView.methods.getCategoryCount;
      expect(getCount.call(vm, 'All')).toBe(8);
      expect(getCount.call(vm, 'Weapon')).toBe(2);
      expect(getCount.call(vm, 'Ammunition')).toBe(1);
      expect(getCount.call(vm, 'Defense')).toBe(1);
      expect(getCount.call(vm, 'Toolkit')).toBe(1);
      expect(getCount.call(vm, 'Medical')).toBe(1);
      expect(getCount.call(vm, 'Gear')).toBe(1);
      expect(getCount.call(vm, 'Power')).toBe(1);
      expect(getCount.call(vm, 'NonExistent')).toBe(0);
    });

    it('filters equipment list by activeEquipmentCategory when category is not All', () => {
      const vm = {
        equipmentList: mockEquipmentList,
        activeEquipmentCategory: 'Weapon',
        equipmentSearchQuery: '',
      };

      let filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(2);
      expect(filtered.map(i => i.name)).toEqual(['Laser Pistol', 'Heavy Laser']);

      vm.activeEquipmentCategory = 'Defense';
      filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Skeinsuit');

      vm.activeEquipmentCategory = 'All';
      filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(8);
    });

    it('filters by both category and search query simultaneously', () => {
      const vm = {
        equipmentList: mockEquipmentList,
        activeEquipmentCategory: 'Weapon',
        equipmentSearchQuery: 'Heavy',
      };

      let filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Heavy Laser');

      // Search term does not match anything in active category
      vm.equipmentSearchQuery = 'Skeinsuit';
      filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(0);

      // Switching category back to All matches search term
      vm.activeEquipmentCategory = 'All';
      filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Skeinsuit');
    });

    it('defaults activeEquipmentCategory gracefully if unset on vm', () => {
      const vm = {
        equipmentList: mockEquipmentList,
        equipmentSearchQuery: '',
      };

      const filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(8);
    });
  });

  describe('Stamina Tracker & Max Stamina Editing', () => {
    it('updates character sta and max_stamina when onMaxStaminaChange is invoked without being overwritten by old sta', async () => {
      let sentPayload = null;
      const mockFetch = vi.fn().mockImplementation((url, options) => {
        sentPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ...sentPayload,
            id: 1,
          }),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const vm = {
        selectedChar: {
          id: 1,
          name: 'Hero',
          race: 'Human',
          sta: 50,
          max_stamina: 50,
          current_stamina: 50,
        },
        characters: [
          { id: 1, name: 'Hero', race: 'Human', sta: 50, max_stamina: 50, current_stamina: 50 }
        ],
        normalizeCharacterData: CharacterSheetsView.methods.normalizeCharacterData,
      };
      vm.updateCharacter = CharacterSheetsView.methods.updateCharacter.bind(vm);
      vm.onMaxStaminaChange = CharacterSheetsView.methods.onMaxStaminaChange.bind(vm);

      // Simulate user editing the Max STA input from 50 to 65
      vm.selectedChar.max_stamina = 65;
      await vm.onMaxStaminaChange();

      expect(vm.selectedChar.max_stamina).toBe(65);
      expect(vm.selectedChar.sta).toBe(65);
      expect(sentPayload.sta).toBe(65);
      expect(sentPayload.max_stamina).toBe(65);
    });

    it('caps current_stamina to max_stamina if max_stamina is lowered below current_stamina', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const vm = {
        selectedChar: {
          id: 1,
          name: 'Hero',
          race: 'Human',
          sta: 50,
          max_stamina: 50,
          current_stamina: 45,
        },
        characters: [],
        normalizeCharacterData: CharacterSheetsView.methods.normalizeCharacterData,
      };
      vm.updateCharacter = CharacterSheetsView.methods.updateCharacter.bind(vm);
      vm.onMaxStaminaChange = CharacterSheetsView.methods.onMaxStaminaChange.bind(vm);

      // Lower max_stamina to 30
      vm.selectedChar.max_stamina = 30;
      await vm.onMaxStaminaChange();

      expect(vm.selectedChar.max_stamina).toBe(30);
      expect(vm.selectedChar.sta).toBe(30);
      expect(vm.selectedChar.current_stamina).toBe(30);
    });

    it('updateCharacter directly preserves edited max_stamina and synchronizes sta in payload', async () => {
      let sentPayload = null;
      const mockFetch = vi.fn().mockImplementation((url, options) => {
        sentPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...sentPayload, id: 2 }),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const vm = {
        selectedChar: {
          id: 2,
          name: 'Vrusk Scout',
          race: 'Vrusk',
          sta: 40,
          max_stamina: 55, // User edited max_stamina
          current_stamina: 40,
        },
        characters: [],
        normalizeCharacterData: CharacterSheetsView.methods.normalizeCharacterData,
      };
      vm.updateCharacter = CharacterSheetsView.methods.updateCharacter.bind(vm);

      await vm.updateCharacter();

      expect(vm.selectedChar.max_stamina).toBe(55);
      expect(sentPayload.sta).toBe(55);
    });

    it('clamps current_stamina to max_stamina when sta is reduced via shiftStat', () => {
      const vm = {
        selectedChar: {
          str: 40,
          sta: 50,
          max_stamina: 50,
          current_stamina: 50,
        },
        updateCharacter: vi.fn(),
      };
      vm.shiftStat = CharacterSheetsView.methods.shiftStat.bind(vm);

      // Shift 5 points from STA to STR (amount = 5 for str, -5 for sta)
      vm.shiftStat('str', 'sta', 5);

      expect(vm.selectedChar.str).toBe(45);
      expect(vm.selectedChar.sta).toBe(45);
      expect(vm.selectedChar.max_stamina).toBe(45);
      expect(vm.selectedChar.current_stamina).toBe(45);
      expect(vm.updateCharacter).toHaveBeenCalled();
    });

    it('Bug 10: has correct point-shift arrow directions and tooltips in template', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const vueFile = fs.readFileSync(path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'), 'utf8');

      // Left button ◄ should shift point to left stat (+1)
      expect(vueFile).toContain('<button class="btn-shift" title="Shift point to STR" @click="shiftStat(\'str\', \'sta\', 1)">◄</button>');
      expect(vueFile).toContain('<button class="btn-shift" title="Shift point to DEX" @click="shiftStat(\'dex\', \'rs\', 1)">◄</button>');
      expect(vueFile).toContain('<button class="btn-shift" title="Shift point to INT" @click="shiftStat(\'int\', \'log\', 1)">◄</button>');

      // Right button ► should shift point to right stat (-1)
      expect(vueFile).toContain('<button class="btn-shift" title="Shift point to STA" @click="shiftStat(\'str\', \'sta\', -1)">►</button>');
      expect(vueFile).toContain('<button class="btn-shift" title="Shift point to RS" @click="shiftStat(\'dex\', \'rs\', -1)">►</button>');
      expect(vueFile).toContain('<button class="btn-shift" title="Shift point to HIST/REL" @click="shiftStat(\'int\', \'log\', -1)">►</button>');
    });

    it('Bug 29: displays reactive errorMessage when character update, create, or delete fails', async () => {
      const vm = {
        selectedChar: { id: 10, name: 'Hero', str: 50, sta: 50 },
        errorMessage: '',
        normalizeCharacterData: (c) => c,
        characters: [{ id: 10, name: 'Hero' }],
      };

      // Test updateCharacter failure
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden to edit character' }),
      });

      await CharacterSheetsView.methods.updateCharacter.call(vm);
      expect(vm.errorMessage).toBe('Forbidden to edit character');

      // Test deleteCharacter failure
      global.confirm = () => true;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Database error' }),
      });

      await CharacterSheetsView.methods.deleteCharacter.call(vm, 10);
      expect(vm.errorMessage).toBe('Database error');
    });

    it('manages freeform stamina damage & healing with bounds clamping', () => {
      const vm = {
        selectedChar: { current_stamina: 40, max_stamina: 50 },
        staminaDelta: 15,
        updateCharacter: vi.fn(),
      };

      // Apply damage: 40 - 15 = 25
      CharacterSheetsView.methods.applyStaminaDamage.call(vm);
      expect(vm.selectedChar.current_stamina).toBe(25);
      expect(vm.staminaDelta).toBeNull();
      expect(vm.updateCharacter).toHaveBeenCalled();

      // Apply damage that exceeds current stamina: clamped to 0
      vm.staminaDelta = 50;
      CharacterSheetsView.methods.applyStaminaDamage.call(vm);
      expect(vm.selectedChar.current_stamina).toBe(0);

      // Apply heal: 0 + 20 = 20
      vm.staminaDelta = 20;
      CharacterSheetsView.methods.applyStaminaHeal.call(vm);
      expect(vm.selectedChar.current_stamina).toBe(20);

      // Apply heal that exceeds max: clamped to max_stamina (50)
      vm.staminaDelta = 100;
      CharacterSheetsView.methods.applyStaminaHeal.call(vm);
      expect(vm.selectedChar.current_stamina).toBe(50);
    });

    it('resets character stamina and ESS to maximum on Full Rest', () => {
      const vm = {
        selectedChar: { current_stamina: 10, max_stamina: 55, current_ess: 5, max_ess: 50 },
        updateCharacter: vi.fn(),
      };

      CharacterSheetsView.methods.resetCharacterStats.call(vm);
      expect(vm.selectedChar.current_stamina).toBe(55);
      expect(vm.selectedChar.current_ess).toBe(50);
      expect(vm.updateCharacter).toHaveBeenCalled();
    });

    it('tracks ESS energy pool adjustments and computes percentage & color', () => {
      const vm = {
        selectedChar: { current_ess: 40, max_ess: 50 },
        essDelta: 10,
        updateCharacter: vi.fn(),
      };

      // Compute percentage: 40/50 = 80% (teal/cyan)
      expect(CharacterSheetsView.computed.essPercentage.call(vm)).toBe(80);
      expect(CharacterSheetsView.computed.essColor.call(vm)).toBe('#14b8a6');
      expect(CharacterSheetsView.computed.essGlow.call(vm)).toBe('0 0 10px rgba(20, 184, 166, 0.7)');

      // Adjust ESS: -5
      CharacterSheetsView.methods.adjustEss.call(vm, -5);
      expect(vm.selectedChar.current_ess).toBe(35);
      expect(vm.updateCharacter).toHaveBeenCalled();

      // Freeform burn: 35 - 10 = 25 (50% -> pale orange)
      CharacterSheetsView.methods.applyEssBurn.call(vm);
      expect(vm.selectedChar.current_ess).toBe(25);
      expect(CharacterSheetsView.computed.essPercentage.call(vm)).toBe(50);
      expect(CharacterSheetsView.computed.essColor.call(vm)).toBe('#fdba74');
      expect(CharacterSheetsView.computed.essGlow.call(vm)).toBe('0 0 10px rgba(253, 186, 116, 0.7)');

      // Critical low (< 25% -> pale red)
      vm.selectedChar.current_ess = 5;
      expect(CharacterSheetsView.computed.essPercentage.call(vm)).toBe(10);
      expect(CharacterSheetsView.computed.essColor.call(vm)).toBe('#fca5a5');
      expect(CharacterSheetsView.computed.essGlow.call(vm)).toBe('0 0 10px rgba(252, 165, 165, 0.7)');

      // Freeform recharge: 5 + 20 = 25
      vm.essDelta = 20;
      CharacterSheetsView.methods.applyEssRecharge.call(vm);
      expect(vm.selectedChar.current_ess).toBe(25);
    });

    it('pins max_ess to INT (int), HIST/REL (log), or WIL (per) and automatically updates on attribute change', () => {
      const vm = {
        selectedChar: {
          int: 62,
          log: 60,
          per: 55,
          max_ess: 50,
          current_ess: 50,
          ess_pin: 'int',
          racial_abilities: {},
        },
        updateCharacter: vi.fn(),
      };
      vm.syncEssFromPin = CharacterSheetsView.methods.syncEssFromPin.bind(vm);
      vm.onEssPinChange = CharacterSheetsView.methods.onEssPinChange.bind(vm);
      vm.onStatChange = CharacterSheetsView.methods.onStatChange.bind(vm);
      vm.shiftStat = CharacterSheetsView.methods.shiftStat.bind(vm);

      // Test onEssPinChange when pinned to int
      vm.onEssPinChange();
      expect(vm.selectedChar.max_ess).toBe(62);
      expect(vm.selectedChar.racial_abilities.ess_pin).toBe('int');
      expect(vm.updateCharacter).toHaveBeenCalled();

      // Test onStatChange when int increases
      vm.selectedChar.int = 70;
      vm.onStatChange('int');
      expect(vm.selectedChar.max_ess).toBe(70);

      // Change pin to log (HIST/REL)
      vm.selectedChar.ess_pin = 'log';
      vm.onEssPinChange();
      expect(vm.selectedChar.max_ess).toBe(60);

      // Change pin to per (WIL)
      vm.selectedChar.ess_pin = 'per';
      vm.onEssPinChange();
      expect(vm.selectedChar.max_ess).toBe(55);

      // Increase WIL via shiftStat
      vm.shiftStat('per', 'ldr', 5);
      expect(vm.selectedChar.per).toBe(60);
      expect(vm.selectedChar.max_ess).toBe(60);
    });

    it('computes staminaPercentage, staminaColor, and staminaGlow dynamically across health tiers', () => {
      const vm = {
        selectedChar: { current_stamina: 50, max_stamina: 50 },
      };

      // Full / healthy (> 50% -> darkened green)
      expect(CharacterSheetsView.computed.staminaPercentage.call(vm)).toBe(100);
      expect(CharacterSheetsView.computed.staminaColor.call(vm)).toBe('#79d79b');
      expect(CharacterSheetsView.computed.staminaGlow.call(vm)).toBe('0 0 10px rgba(121, 215, 155, 0.7)');

      // Getting low (50% -> orange)
      vm.selectedChar.current_stamina = 25;
      expect(CharacterSheetsView.computed.staminaPercentage.call(vm)).toBe(50);
      expect(CharacterSheetsView.computed.staminaColor.call(vm)).toBe('#fb923c');
      expect(CharacterSheetsView.computed.staminaGlow.call(vm)).toBe('0 0 10px rgba(251, 146, 60, 0.7)');

      // Dangerously low (20% -> red)
      vm.selectedChar.current_stamina = 10;
      expect(CharacterSheetsView.computed.staminaPercentage.call(vm)).toBe(20);
      expect(CharacterSheetsView.computed.staminaColor.call(vm)).toBe('#ef4444');
      expect(CharacterSheetsView.computed.staminaGlow.call(vm)).toBe('0 0 10px rgba(239, 68, 68, 0.7)');
    });
  });

  describe('Character ASCII Download Action', () => {
    it('provides downloadAsciiSheet method calling export utility', () => {
      expect(typeof CharacterSheetsView.methods.downloadAsciiSheet).toBe('function');
      const spy = vi.spyOn(characterExport, 'downloadCharacterAscii');
      const testChar = { name: 'Test Scout', race: 'Human', str: 50 };
      const vm = { selectedChar: testChar };

      CharacterSheetsView.methods.downloadAsciiSheet.call(vm);
      expect(spy).toHaveBeenCalledWith(testChar);
      spy.mockRestore();
    });

    it('handles downloadAsciiSheet gracefully when no character is selected', () => {
      const spy = vi.spyOn(characterExport, 'downloadCharacterAscii');
      const vm = { selectedChar: null };
      CharacterSheetsView.methods.downloadAsciiSheet.call(vm);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('Character Sheets Left Navigation Reordering', () => {
    it('determines reordering permission based on GameMaster role', () => {
      const vmGM = {
        isGm: true,
        canReorder: CharacterSheetsView.methods.canReorder,
      };
      const vmPlayer = {
        isGm: false,
        canReorder: CharacterSheetsView.methods.canReorder,
      };

      // When character is null
      expect(vmGM.canReorder(null)).toBe(false);
      // When user is GameMaster
      expect(vmGM.canReorder({ id: 1, user_id: 2 })).toBe(true);
      // When user is not GameMaster (Player)
      expect(vmPlayer.canReorder({ id: 1, user_id: 1 })).toBe(false);
    });

    it('moves character up and down, updates local array optimistically, and dispatches PUT /api/characters/reorder', async () => {
      const origFetch = global.fetch;
      let requestedUrl = null;
      let requestedBody = null;

      global.fetch = vi.fn().mockImplementation((url, opts) => {
        requestedUrl = url;
        requestedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, order: requestedBody.order }),
        });
      });

      try {
        const vm = {
          characters: [
            { id: 101, name: 'Char A' },
            { id: 102, name: 'Char B' },
            { id: 103, name: 'Char C' },
          ],
          errorMessage: '',
          moveCharacter: CharacterSheetsView.methods.moveCharacter,
          saveCharacterOrder: CharacterSheetsView.methods.saveCharacterOrder,
        };

        // Move Char B up (index 1 + -1 -> index 0)
        await vm.moveCharacter(1, -1);
        expect(vm.characters.map(c => c.id)).toEqual([102, 101, 103]);
        expect(requestedUrl).toBe('/api/characters/reorder');
        expect(requestedBody).toEqual({ order: [102, 101, 103] });

        // Move Char B down (index 0 + 1 -> index 1)
        await vm.moveCharacter(0, 1);
        expect(vm.characters.map(c => c.id)).toEqual([101, 102, 103]);
        expect(requestedBody).toEqual({ order: [101, 102, 103] });

        // Boundary checks (move top item up, or bottom item down does nothing)
        requestedUrl = null;
        await vm.moveCharacter(0, -1);
        expect(requestedUrl).toBeNull();

        await vm.moveCharacter(2, 1);
        expect(requestedUrl).toBeNull();
      } finally {
        global.fetch = origFetch;
      }
    });

    it('rolls back optimistic character order and sets errorMessage on API failure', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Cannot reorder sheets you do not own' }),
      });

      try {
        const initial = [
          { id: 101, name: 'Char A' },
          { id: 102, name: 'Char B' },
        ];
        const vm = {
          characters: [...initial],
          errorMessage: '',
          moveCharacter: CharacterSheetsView.methods.moveCharacter,
          saveCharacterOrder: CharacterSheetsView.methods.saveCharacterOrder,
        };

        await vm.moveCharacter(0, 1);
        // On error, should rollback to original order
        expect(vm.characters.map(c => c.id)).toEqual([101, 102]);
        expect(vm.errorMessage).toBe('Cannot reorder sheets you do not own');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('reorders character list on socket event sheets:reordered while preserving selectedChar', () => {
      const char1 = { id: 101, name: 'Char 1' };
      const char2 = { id: 102, name: 'Char 2' };
      const char3 = { id: 103, name: 'Char 3' };

      const vm = {
        characters: [char1, char2, char3],
        selectedChar: char2,
        handleSheetsReordered: CharacterSheetsView.methods.handleSheetsReordered,
      };

      // Reorder payload
      vm.handleSheetsReordered({
        type: 'character',
        order: [103, 101, 102],
      });

      expect(vm.characters.map(c => c.id)).toEqual([103, 101, 102]);
      expect(vm.selectedChar).toBe(char2);

      // Ignores events for ship type
      vm.handleSheetsReordered({
        type: 'ship',
        order: [102, 101, 103],
      });
      expect(vm.characters.map(c => c.id)).toEqual([103, 101, 102]);
    });

    it('handles drag and drop reordering', async () => {
      const origFetch = global.fetch;
      let sentOrder = null;
      global.fetch = vi.fn().mockImplementation((url, opts) => {
        sentOrder = JSON.parse(opts.body).order;
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, order: sentOrder }),
        });
      });

      try {
        const vm = {
          characters: [
            { id: 1, name: 'First' },
            { id: 2, name: 'Second' },
            { id: 3, name: 'Third' },
          ],
          draggedCharIndex: 0,
          dragOverCharIndex: 2,
          errorMessage: '',
          onDrop: CharacterSheetsView.methods.onDrop,
          saveCharacterOrder: CharacterSheetsView.methods.saveCharacterOrder,
        };

        const mockEvent = {
          preventDefault: vi.fn(),
        };

        await vm.onDrop(mockEvent, 2);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(vm.characters.map(c => c.id)).toEqual([2, 3, 1]);
        expect(sentOrder).toEqual([2, 3, 1]);
        expect(vm.draggedCharIndex).toBeNull();
        expect(vm.dragOverCharIndex).toBeNull();
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  describe('Tier Badge Calculation & Display', () => {
    it('computes character tier based on skills, explicit tier, or defaults to 1', () => {
      const getCharTier = CharacterSheetsView.methods.getCharTier;

      // Null or empty character
      expect(getCharTier(null)).toBe(1);
      expect(getCharTier({})).toBe(1);

      // Explicit tier or threat_tier
      expect(getCharTier({ tier: 3 })).toBe(3);
      expect(getCharTier({ threat_tier: 4 })).toBe(4);

      // Tier 1: No skills, max level 1, or up to 3 level 1 skills
      expect(getCharTier({ skills: [{ name: 'Beam Weapons', level: 1 }] })).toBe(1);
      expect(getCharTier({
        skills: [
          { name: 'Beam Weapons', level: 1 },
          { name: 'Melee Weapons', level: 1 },
          { name: 'Technician', level: 1 },
        ],
      })).toBe(1);

      // Tier 2: Max level 2 or total >= 4
      expect(getCharTier({ skills: [{ name: 'Beam Weapons', level: 2 }] })).toBe(2);
      expect(getCharTier({
        skills: [
          { name: 'Beam Weapons', level: 1 },
          { name: 'Melee Weapons', level: 1 },
          { name: 'Technician', level: 1 },
          { name: 'Stealth', level: 1 },
        ],
      })).toBe(2);

      // Tier 3: Max level 3 or 4
      expect(getCharTier({ skills: [{ name: 'Beam Weapons', level: 3 }] })).toBe(3);
      expect(getCharTier({ skills: [{ name: 'Beam Weapons', level: 4 }] })).toBe(3);

      // Tier 4: Max level 5
      expect(getCharTier({ skills: [{ name: 'Beam Weapons', level: 5 }] })).toBe(4);

      // Tier 5: Max level 6
      expect(getCharTier({ skills: [{ name: 'Beam Weapons', level: 6 }] })).toBe(5);
    });

    it('computes characterTier from selectedChar', () => {
      const vm = {
        selectedChar: {
          skills: [{ name: 'Beam Weapons', level: 4 }],
        },
        getCharTier: CharacterSheetsView.methods.getCharTier,
      };

      const tier = CharacterSheetsView.computed.characterTier.call(vm);
      expect(tier).toBe(3);
    });

    it('renders the Tier badge in the header when a character is selected', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/api/equipment')) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ([{
            id: 1,
            name: 'Wulfen',
            race: 'Yazirian',
            current_stamina: 50,
            max_stamina: 50,
            skills: [{ name: 'Beam Weapons', level: 3 }],
          }]),
        });
      });
      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();
        const badge = wrapper.find('.badge-tier');
        expect(badge.exists()).toBe(true);
        expect(badge.text()).toBe('Tier 3');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('displays "Characters" in sidebar header and no mini icon in ESSENCE/MANA header', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'), 'utf-8');
      expect(content).toMatch(/<div class="sidebar-header">\s*<h3>Characters<\/h3>/);
      expect(content).toMatch(/<div class="ess-header">[\s\S]*?<span class="tracker-label">ESSENCE\/MANA<\/span>/);
      expect(content).not.toMatch(/<span class="tracker-label">⚡/);
    });
  });

  describe('Character Sheets - Player Assignment (GM only)', () => {
    it('fetches registered users on mount when user is GameMaster and renders player assignment dropdown', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 1, username: 'gmUser', role: 'GameMaster' };

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 10,
              user_id: 2,
              owner_username: 'playerAlice',
              name: 'Alice Hero',
              race: 'Human',
              psa: 'Military',
              current_stamina: 50,
              max_stamina: 50,
            }]),
          });
        }
        if (url === '/api/auth/users') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { id: 1, username: 'gmUser', role: 'GameMaster' },
              { id: 2, username: 'playerAlice', role: 'Player' },
            ]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        expect(global.fetch).toHaveBeenCalledWith('/api/auth/users', expect.any(Object));
        const playerSelect = wrapper.find('.select-player');
        expect(playerSelect.exists()).toBe(true);
        expect(wrapper.find('.player-select-wrap').exists()).toBe(true);

        // Selecting a new player updates user_id
        await playerSelect.setValue('1');
        expect(Number(wrapper.vm.selectedChar.user_id)).toBe(1);
      } finally {
        global.fetch = origFetch;
      }
    });

    it('renders read-only badge-player for non-GM players', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 2, username: 'playerAlice', role: 'Player' };

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 10,
              user_id: 2,
              owner_username: 'playerAlice',
              name: 'Alice Hero',
              race: 'Human',
              psa: 'Military',
              current_stamina: 50,
              max_stamina: 50,
            }]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        expect(wrapper.find('.select-player').exists()).toBe(false);
        const badge = wrapper.find('.badge-player');
        expect(badge.exists()).toBe(true);
        expect(badge.text()).toContain('playerAlice');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('includes Assigned Player select in Create Character modal when isGm is true', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 1, username: 'gmUser', role: 'GameMaster' };

      const vm = {
        isGm: true,
        registeredUsers: [
          { id: 1, username: 'gmUser', role: 'GameMaster' },
          { id: 2, username: 'playerAlice', role: 'Player' },
        ],
        newCharForm: {},
        showCreateModal: false,
      };

      CharacterSheetsView.methods.openCreateModal.call(vm);
      expect(vm.showCreateModal).toBe(true);
      expect(vm.newCharForm.user_id).toBe(1);
    });
  });

  describe('Experience Points (XP) Tracker & Skill Spend', () => {
    it('normalizes character data with current_xp default 0', () => {
      const c1 = CharacterSheetsView.methods.normalizeCharacterData({});
      expect(c1.current_xp).toBe(0);

      const c2 = CharacterSheetsView.methods.normalizeCharacterData({ current_xp: 15 });
      expect(c2.current_xp).toBe(15);

      const c3 = CharacterSheetsView.methods.normalizeCharacterData({ current_xp: '20' });
      expect(c3.current_xp).toBe(20);
    });

    it('adjusts XP with adjustXP and clamps to minimum 0', () => {
      const vm = {
        selectedChar: { current_xp: 10 },
        updateCharacter: vi.fn(),
      };

      CharacterSheetsView.methods.adjustXP.call(vm, 5);
      expect(vm.selectedChar.current_xp).toBe(15);
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);

      CharacterSheetsView.methods.adjustXP.call(vm, -20);
      expect(vm.selectedChar.current_xp).toBe(0);
      expect(vm.updateCharacter).toHaveBeenCalledTimes(2);
    });

    it('upgrades skill level and deducts XP when current_xp is sufficient', () => {
      const vm = {
        selectedChar: {
          psa: 'Military',
          current_xp: 10,
          skills: [
            { name: 'Beam Weapons', level: 1, psa: 'Military' },
          ],
        },
        getXPCost: CharacterSheetsView.methods.getXPCost,
        updateCharacter: vi.fn(),
      };

      // Cost for Beam Weapons level 2 (Military in PSA) = 2 * 3 = 6 XP
      CharacterSheetsView.methods.upgradeSkillLevel.call(vm, 0);

      expect(vm.selectedChar.skills[0].level).toBe(2);
      expect(vm.selectedChar.current_xp).toBe(4);
      expect(vm.updateCharacter).toHaveBeenCalled();
    });

    it('does not upgrade skill level or deduct XP when current_xp is insufficient', () => {
      const vm = {
        selectedChar: {
          psa: 'Military',
          current_xp: 3,
          skills: [
            { name: 'Beam Weapons', level: 1, psa: 'Military' },
          ],
        },
        errorMessage: '',
        getXPCost: CharacterSheetsView.methods.getXPCost,
        updateCharacter: vi.fn(),
      };

      // Cost is 6 XP, have 3 XP
      CharacterSheetsView.methods.upgradeSkillLevel.call(vm, 0);

      expect(vm.selectedChar.skills[0].level).toBe(1);
      expect(vm.selectedChar.current_xp).toBe(3);
      expect(vm.updateCharacter).not.toHaveBeenCalled();
      expect(vm.errorMessage).toMatch(/insufficient xp/i);
    });

    it('renders XP tracker card with delta input, - Spend, + Award, and updates current_xp without steppers', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 1, username: 'testuser', role: 'Player' };

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 1,
              name: 'Wilks',
              race: 'Vrusk',
              psa: 'Military',
              current_stamina: 50,
              max_stamina: 50,
              current_ess: 50,
              max_ess: 50,
              current_xp: 12,
              skills: [],
            }]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        // Check XP tracker section exists
        const xpSection = wrapper.find('.xp-section');
        expect(xpSection.exists()).toBe(true);
        expect(xpSection.text().toUpperCase()).toContain('EXPERIENCE POINTS (XP)');
        expect(xpSection.text()).toContain('12');

        // Check steppers do NOT exist (removed per requirement: no increment -5,-1,+1,+5 buttons)
        const steppers = xpSection.findAll('.btn-xp');
        expect(steppers.length).toBe(0);

        // Test delta input with + Award
        const deltaInput = xpSection.find('.input-delta');
        expect(deltaInput.exists()).toBe(true);
        await deltaInput.setValue(3);
        const awardBtn = xpSection.find('.btn-delta.btn-add');
        expect(awardBtn.exists()).toBe(true);
        await awardBtn.trigger('click');
        expect(wrapper.vm.selectedChar.current_xp).toBe(15);

        // Test delta input with - Spend
        await deltaInput.setValue(5);
        const spendBtn = xpSection.find('.btn-delta.btn-sub');
        expect(spendBtn.exists()).toBe(true);
        await spendBtn.trigger('click');
        expect(wrapper.vm.selectedChar.current_xp).toBe(10);

        // Verify the up/down widget right next to current XP was removed
        expect(xpSection.find('.input-xp').exists()).toBe(false);
        // Verify there is no separate xp-controls row underneath
        expect(xpSection.find('.xp-controls').exists()).toBe(false);
      } finally {
        global.fetch = origFetch;
      }
    });

    it('renders middle section with 2x2 primary attributes left and compact STA/ESS/XP trackers right', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 1, username: 'testuser', role: 'Player' };

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 1,
              name: 'Wilks',
              race: 'Vrusk',
              psa: 'Military',
              str: 50,
              sta: 50,
              dex: 55,
              rs: 55,
              int: 45,
              log: 45,
              per: 40,
              ldr: 40,
              current_stamina: 50,
              max_stamina: 50,
              current_ess: 50,
              max_ess: 50,
              current_xp: 12,
              skills: [],
            }]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        // Verify middle-section-grid exists
        const middleGrid = wrapper.find('.middle-section-grid');
        expect(middleGrid.exists()).toBe(true);

        // Left box: stats-section with 4 stat pairs in 2x2
        const statsSection = middleGrid.find('.stats-section');
        expect(statsSection.exists()).toBe(true);
        expect(statsSection.find('.tracker-label').text()).toBe('PRIMARY ATTRIBUTES');
        const statBoxes = statsSection.findAll('.stat-pair-box');
        expect(statBoxes.length).toBe(4);
        expect(statBoxes[0].find('.stat-pair-header').text()).toBe('STR / STA');
        expect(statBoxes[0].attributes('title')).toBe('Strength / Stamina');
        expect(statBoxes[1].find('.stat-pair-header').text()).toBe('DEX / RS');
        expect(statBoxes[1].attributes('title')).toBe('Agility / Reflex Speed');
        expect(statBoxes[2].find('.stat-pair-header').text()).toBe('INT / HIST/REL');
        expect(statBoxes[2].attributes('title')).toBe('Intellect / History & Religion');
        expect(statBoxes[3].find('.stat-pair-header').text()).toBe('WIL / PRE');
        expect(statBoxes[3].attributes('title')).toBe('Willpower / Presence');

        // Right box: trackers-section with STA, ESS, XP
        const trackersSection = middleGrid.find('.trackers-section');
        expect(trackersSection.exists()).toBe(true);

        // Stamina tracker
        const staItem = trackersSection.find('.stamina-section');
        expect(staItem.exists()).toBe(true);
        expect(staItem.find('.tracker-label').text()).toBe('STAMINA (STA)');
        expect(staItem.find('.stamina-bar-bg').exists()).toBe(true);
        const resetBtn = staItem.find('.btn-action-reset');
        expect(resetBtn.exists()).toBe(true);
        expect(resetBtn.text()).toBe('Rest');
        expect(resetBtn.text()).not.toContain('🔄');

        // ESS tracker
        const essItem = trackersSection.find('.ess-section');
        expect(essItem.exists()).toBe(true);
        expect(essItem.find('.tracker-label').text()).toBe('ESSENCE/MANA');
        expect(essItem.find('.ess-bar-bg').exists()).toBe(true);
        const reloadBtn = essItem.find('.btn-action-reload');
        expect(reloadBtn.exists()).toBe(true);
        expect(reloadBtn.text()).toBe('Recharge');
        expect(reloadBtn.text()).not.toContain('⚡');

        // XP tracker
        const xpItem = trackersSection.find('.xp-section');
        expect(xpItem.exists()).toBe(true);
        expect(xpItem.find('.tracker-label').text()).toBe('EXPERIENCE POINTS (XP)');
        expect(xpItem.find('.freeform-delta-group').exists()).toBe(true);
        expect(xpItem.find('.input-xp').exists()).toBe(false);
        expect(xpItem.find('.xp-controls').exists()).toBe(false);

        // Ensure no h4 headers used in the middle section
        expect(middleGrid.findAll('h4').length).toBe(0);
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  describe('Character Sheet Header Layout & Organization', () => {
    it('renders clean header with top row and sub row, without Species Info banner, and without download icon', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 1, username: 'gmUser', role: 'GameMaster' };

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 1,
              user_id: 1,
              owner_username: 'gmUser',
              name: 'Commander John',
              race: 'Human',
              psa: 'Military',
              current_stamina: 50,
              max_stamina: 50,
              current_xp: 10,
            }]),
          });
        }
        if (url === '/api/auth/users') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1, username: 'gmUser', role: 'GameMaster' }]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        // 1. Verify Species Info banner is completely removed
        expect(wrapper.find('.race-ability-banner').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('Species Info:');

        // 2. Verify top row contains input-name, tier badge, and download button
        const topRow = wrapper.find('.header-top-row');
        expect(topRow.exists()).toBe(true);
        expect(topRow.find('.input-name').exists()).toBe(true);
        expect(topRow.find('.badge-tier').exists()).toBe(true);
        const downloadBtn = topRow.find('.btn-action-download');
        expect(downloadBtn.exists()).toBe(true);

        // 3. Verify download button does not contain the mini-icon 📥
        expect(downloadBtn.text()).not.toContain('📥');
        expect(downloadBtn.text()).toContain('Download Sheet (.txt)');

        // 4. Verify sub row contains Species, PSA, and Player selectors to the right of PSA
        const subRow = wrapper.find('.header-sub-row');
        expect(subRow.exists()).toBe(true);
        expect(subRow.find('.race-select-wrap').exists()).toBe(true);
        expect(subRow.find('.psa-select-wrap').exists()).toBe(true);
        expect(subRow.find('.player-select-wrap').exists()).toBe(true);

        // 5. Verify sub-row CSS font size is 0.9rem (10% smaller)
        const fs = require('fs');
        const path = require('path');
        const vueFile = fs.readFileSync(path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'), 'utf-8');
        expect(vueFile).toMatch(/\.header-sub-row\s*\{[^}]*font-size:\s*0\.9rem/);
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  describe('Species Traits & Abilities Banner Presentation', () => {
    it('renders traits banner formatted after ship flip-burn capable banner without h4', async () => {
      setActivePinia(createPinia());
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 1,
              name: 'Dawn Elf Mage',
              race: 'Dawn Elves',
              skills: [],
              inventory: [],
            }]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const banner = wrapper.find('.species-traits-banner');
        expect(banner.exists()).toBe(true);
        expect(banner.find('h4').exists()).toBe(false);

        const badge = banner.find('.traits-badge');
        expect(badge.exists()).toBe(true);
        expect(badge.text()).toContain('Species Traits & Abilities');
        expect(badge.text()).toContain('Dawn Elves');

        const ruleText = banner.find('.traits-rule-text');
        expect(ruleText.exists()).toBe(true);
        expect(ruleText.text()).toContain('Solar & Arcane Attunement:');

        // Verify non-mutable presentation (no input or select fields inside banner)
        expect(banner.find('input').exists()).toBe(false);
        expect(banner.find('select').exists()).toBe(false);
        expect(banner.find('button').exists()).toBe(false);

        // Verify dark and light grey colors on species traits banner & badge
        const fs = require('fs');
        const path = require('path');
        const vueFile = fs.readFileSync(path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'), 'utf-8');
        expect(vueFile).toMatch(/\.racial-panel\.species-traits-banner\s*\{[^}]*background:\s*rgba\(200,\s*200,\s*200,\s*0\.04\)/);
        expect(vueFile).toMatch(/\.racial-panel\.species-traits-banner\s*\{[^}]*border:\s*1px solid rgba\(200,\s*200,\s*200,\s*0\.2\)/);
        expect(vueFile).toMatch(/\.traits-badge\s*\{[^}]*color:\s*#c8c8c8/);
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  describe('Skill Reordering in Skills & Experience List', () => {
    it('reorders skills via moveSkill and calls updateCharacter', () => {
      const vm = {
        selectedChar: {
          skills: [
            { name: 'Beam Weapons', level: 2 },
            { name: 'Technician', level: 1 },
            { name: 'Piloting', level: 3 },
          ],
        },
        updateCharacter: vi.fn(),
      };

      // Boundary check: move up from index 0 should do nothing
      CharacterSheetsView.methods.moveSkill.call(vm, 0, -1);
      expect(vm.selectedChar.skills[0].name).toBe('Beam Weapons');
      expect(vm.updateCharacter).not.toHaveBeenCalled();

      // Move Technician (index 1) up to index 0
      CharacterSheetsView.methods.moveSkill.call(vm, 1, -1);
      expect(vm.selectedChar.skills[0].name).toBe('Technician');
      expect(vm.selectedChar.skills[1].name).toBe('Beam Weapons');
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);

      // Boundary check: move down from last index should do nothing
      CharacterSheetsView.methods.moveSkill.call(vm, 2, 1);
      expect(vm.selectedChar.skills[2].name).toBe('Piloting');
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);

      // Move Beam Weapons (index 1) down to index 2
      CharacterSheetsView.methods.moveSkill.call(vm, 1, 1);
      expect(vm.selectedChar.skills[1].name).toBe('Piloting');
      expect(vm.selectedChar.skills[2].name).toBe('Beam Weapons');
      expect(vm.updateCharacter).toHaveBeenCalledTimes(2);
    });

    it('handles skill drag and drop reordering', () => {
      const vm = {
        selectedChar: {
          skills: [
            { name: 'Beam Weapons', level: 2 },
            { name: 'Technician', level: 1 },
            { name: 'Piloting', level: 3 },
          ],
        },
        draggedSkillIndex: null,
        dragOverSkillIndex: null,
        updateCharacter: vi.fn(),
      };

      // Ignore drag on input
      const inputEvent = { target: { tagName: 'INPUT' }, preventDefault: vi.fn() };
      CharacterSheetsView.methods.onSkillDragStart.call(vm, inputEvent, 0);
      expect(inputEvent.preventDefault).toHaveBeenCalled();
      expect(vm.draggedSkillIndex).toBe(null);

      // Drag from index 2 to index 0
      const dragEvent = {
        target: { tagName: 'DIV' },
        dataTransfer: { effectAllowed: '', setData: vi.fn() },
      };
      CharacterSheetsView.methods.onSkillDragStart.call(vm, dragEvent, 2);
      expect(vm.draggedSkillIndex).toBe(2);

      const dropEvent = { preventDefault: vi.fn() };
      CharacterSheetsView.methods.onSkillDrop.call(vm, dropEvent, 0);
      expect(dropEvent.preventDefault).toHaveBeenCalled();
      expect(vm.selectedChar.skills[0].name).toBe('Piloting');
      expect(vm.selectedChar.skills[1].name).toBe('Beam Weapons');
      expect(vm.selectedChar.skills[2].name).toBe('Technician');
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);
    });

    it('renders drag handle and reorder buttons on each skill row in the UI', async () => {
      setActivePinia(createPinia());
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 1,
              name: 'Skill Specialist',
              race: 'Human',
              skills: [
                { name: 'Beam Weapons', level: 2 },
                { name: 'Technician', level: 1 },
              ],
              inventory: [],
            }]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const skillRows = wrapper.findAll('.skill-row');
        expect(skillRows.length).toBe(2);

        // First row: drag handle and reorder buttons
        const firstRowHandle = skillRows[0].find('.drag-handle');
        expect(firstRowHandle.exists()).toBe(true);
        const firstUp = skillRows[0].find('.btn-move-up');
        const firstDown = skillRows[0].find('.btn-move-down');
        expect(firstUp.exists()).toBe(true);
        expect(firstDown.exists()).toBe(true);
        expect(firstUp.attributes('disabled')).toBeDefined(); // disabled at top
        expect(firstDown.attributes('disabled')).toBeUndefined(); // enabled to move down

        // Second row: Move Down should be disabled at bottom
        const secondUp = skillRows[1].find('.btn-move-up');
        const secondDown = skillRows[1].find('.btn-move-down');
        expect(secondUp.attributes('disabled')).toBeUndefined();
        expect(secondDown.attributes('disabled')).toBeDefined();
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  describe('Inventory Reordering in Inventory List', () => {
    it('reorders inventory items via moveInventoryItem and calls updateCharacter', () => {
      const item1 = { name: 'Rations', quantity: 2, weight: 0.5 };
      const item2 = { name: 'Laser Pistol', quantity: 1, weight: 1.0 };
      const item3 = { name: 'Medkit', quantity: 1, weight: 1.5 };
      const vm = {
        selectedChar: {
          inventory: [item1, item2, item3],
        },
        updateCharacter: vi.fn(),
      };

      // Edge disabled checks
      expect(CharacterSheetsView.methods.isInventoryMoveDisabled.call(vm, item1, -1)).toBe(true);
      expect(CharacterSheetsView.methods.isInventoryMoveDisabled.call(vm, item1, 1)).toBe(false);
      expect(CharacterSheetsView.methods.isInventoryMoveDisabled.call(vm, item3, 1)).toBe(true);

      // Move item2 up to index 0
      CharacterSheetsView.methods.moveInventoryItem.call(vm, item2, -1);
      expect(vm.selectedChar.inventory[0].name).toBe('Laser Pistol');
      expect(vm.selectedChar.inventory[1].name).toBe('Rations');
      expect(vm.selectedChar.inventory[2].name).toBe('Medkit');
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);

      // Boundary check on index 0
      CharacterSheetsView.methods.moveInventoryItem.call(vm, item2, -1);
      expect(vm.selectedChar.inventory[0].name).toBe('Laser Pistol');
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);
    });

    it('handles inventory drag and drop even with filtered inventory', () => {
      const item1 = { name: 'Alpha Rations', quantity: 2, weight: 0.5, notes: 'Food' };
      const item2 = { name: 'Beta Blaster', quantity: 1, weight: 1.0, notes: 'ESS' };
      const item3 = { name: 'Gamma Grenade', quantity: 3, weight: 0.25, notes: 'Explosive' };

      const vm = {
        selectedChar: {
          inventory: [item1, item2, item3],
        },
        searchInventoryQuery: 'b',
        draggedInventoryIndex: null,
        dragOverInventoryIndex: null,
        updateCharacter: vi.fn(),
      };
      Object.defineProperty(vm, 'filteredInventory', {
        get() {
          return CharacterSheetsView.computed.filteredInventory.call(vm);
        },
      });

      // Filtered list contains only item2 ('Beta Blaster')
      expect(vm.filteredInventory.length).toBe(1);

      // Clear search to test multi-item drop
      vm.searchInventoryQuery = '';
      expect(vm.filteredInventory.length).toBe(3);

      vm.draggedInventoryIndex = 0; // Alpha Rations
      const dropEvent = { preventDefault: vi.fn() };
      CharacterSheetsView.methods.onInventoryDrop.call(vm, dropEvent, 2); // Drop onto Gamma Grenade

      expect(dropEvent.preventDefault).toHaveBeenCalled();
      expect(vm.selectedChar.inventory[0].name).toBe('Beta Blaster');
      expect(vm.selectedChar.inventory[1].name).toBe('Gamma Grenade');
      expect(vm.selectedChar.inventory[2].name).toBe('Alpha Rations');
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);
    });

    it('renders drag handle and reorder buttons on each inventory row in the UI', async () => {
      setActivePinia(createPinia());
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 1,
              name: 'Explorer',
              race: 'Human',
              skills: [],
              inventory: [
                { name: 'Chronocom', quantity: 1, weight: 0.1, notes: 'Wrist comm' },
                { name: 'Flashlight', quantity: 1, weight: 0.5, notes: 'Electric torch' },
              ],
            }]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const invRows = wrapper.findAll('.inventory-row');
        expect(invRows.length).toBe(2);

        // First row: drag handle and reorder buttons
        const firstRowHandle = invRows[0].find('.drag-handle');
        expect(firstRowHandle.exists()).toBe(true);
        const firstUp = invRows[0].find('.btn-move-up');
        const firstDown = invRows[0].find('.btn-move-down');
        expect(firstUp.exists()).toBe(true);
        expect(firstDown.exists()).toBe(true);
        expect(firstUp.attributes('disabled')).toBeDefined(); // disabled at top
        expect(firstDown.attributes('disabled')).toBeUndefined(); // enabled to move down

        // First row: Name and Traits rendered in seamless text badge, without editable inputs
        const firstBadge = invRows[0].find('.inventory-item-badge');
        expect(firstBadge.exists()).toBe(true);
        expect(firstBadge.find('.inventory-item-name').text()).toBe('Chronocom');
        expect(firstBadge.find('.inventory-item-traits').text()).toBe('— Wrist comm');
        expect(invRows[0].findAll('input[placeholder="Item Name"]').length).toBe(0);
        expect(invRows[0].findAll('input[placeholder="Notes / Capabilities"]').length).toBe(0);
        expect(invRows[0].findAll('.item-weight-input').length).toBe(0);

        // Qty up/down input remains present and uses 10% smaller inventory sizing
        const qtyInput = invRows[0].find('.inventory-qty-input');
        expect(qtyInput.exists()).toBe(true);
        expect(qtyInput.element.value).toBe('1');

        // Second row: Move Down should be disabled at bottom
        const secondUp = invRows[1].find('.btn-move-up');
        const secondDown = invRows[1].find('.btn-move-down');
        expect(secondUp.attributes('disabled')).toBeUndefined();
        expect(secondDown.attributes('disabled')).toBeDefined();
      } finally {
        global.fetch = origFetch;
      }
    });

    it('renders "+ New" on the create character sidebar button', () => {
      const fs = require('fs');
      const path = require('path');
      const vueFile = fs.readFileSync(path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'), 'utf-8');
      expect(vueFile).toMatch(/<button[^>]*class="[^"]*btn-new-character[^"]*"[^>]*>\s*\+\s*New\s*<\/button>/);
    });

    it('creates custom inventory items via modal submit and formats tooltip', () => {
      const vm = {
        selectedChar: { inventory: [] },
        customItemForm: {
          name: 'Elven Cloak',
          notes: '+10% Stealth in foliage',
          weight: 1.5,
          quantity: 1,
        },
        showCustomItemModal: true,
        updateCharacter: vi.fn(),
      };

      CharacterSheetsView.methods.submitCustomItem.call(vm);
      expect(vm.selectedChar.inventory.length).toBe(1);
      const added = vm.selectedChar.inventory[0];
      expect(added.name).toBe('Elven Cloak');
      expect(added.notes).toBe('+10% Stealth in foliage');
      expect(added.weight).toBe(1.5);
      expect(added.quantity).toBe(1);
      expect(vm.showCustomItemModal).toBe(false);
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);

      const tooltip = CharacterSheetsView.methods.getInventoryItemTooltip.call(vm, added);
      expect(tooltip).toBe('Elven Cloak (1.5 lbs) — +10% Stealth in foliage');
    });

    it('allows inventory attributes to wrap lines and constrains list cards within grid columns', () => {
      const fs = require('fs');
      const path = require('path');
      const vueFile = fs.readFileSync(path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'), 'utf-8');

      // Grid columns must use minmax(0, 1fr) to prevent content blowout past other cards
      expect(vueFile).toMatch(/\.two-column-lists\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(0,\s*1fr\)/);
      // List card must have min-width: 0
      expect(vueFile).toMatch(/\.two-column-lists\s+\.list-card\s*\{[^}]*min-width:\s*0/);
      // Traits must allow line wrapping
      expect(vueFile).toMatch(/\.inventory-item-traits\s*\{[^}]*white-space:\s*normal/);
      expect(vueFile).toMatch(/\.inventory-item-traits\s*\{[^}]*word-break:\s*break-word/);

      // Verify Artisan Tool Kit description is shortened in cartridge equipment
      const cartEquip = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../cartridges/ulvwylde/equipment.json'), 'utf-8'));
      const artisanItem = cartEquip.find(i => i.name.includes('Artisan Tool Kit'));
      expect(artisanItem).toBeDefined();
      expect(artisanItem.properties).toBe('Tradecraft repairs etc');
      expect(artisanItem.capabilities).toBe('Tradecraft repairs etc');
    });
  });

  describe('Grimoire & Techniques Tab', () => {
    it('normalizes grimoire entries and elevates Character Tier from grimoire cast tiers', () => {
      const normalize = CharacterSheetsView.methods.normalizeCharacterData;
      const getCharTier = CharacterSheetsView.methods.getCharTier;

      const c1 = normalize({ name: 'Apprentice' });
      expect(Array.isArray(c1.grimoire)).toBe(true);
      expect(c1.grimoire.length).toBe(0);

      const c2 = normalize({
        name: 'Archmage',
        skills: [{ name: 'Arcane', level: 1 }],
        grimoire: [{ spell_id: 'sp1', name: 'Cataclysmic Lance', tradition: 'Arcane', default_tier: 5 }],
      });
      expect(c2.grimoire.length).toBe(1);
      expect(getCharTier(c2)).toBe(4); // Cast Tier 5 -> Character Tier 4
    });

    it('scribes, updates, clamps cast tier to tradition level, and removes Grimoire entries', () => {
      const vm = {
        selectedChar: {
          name: 'Lyra',
          int: 60,
          skills: [{ name: 'Arcane', level: 3 }],
          grimoire: [],
          racial_abilities: {},
        },
        updateCharacter: vi.fn(),
      };
      vm.getMaxCastTierForTradition = CharacterSheetsView.methods.getMaxCastTierForTradition.bind(vm);
      vm.getMaxCastTierForSpell = CharacterSheetsView.methods.getMaxCastTierForSpell.bind(vm);
      vm.clampSpellTier = CharacterSheetsView.methods.clampSpellTier.bind(vm);
      vm.updateGrimoire = CharacterSheetsView.methods.updateGrimoire.bind(vm);
      vm.addGrimoireEntry = CharacterSheetsView.methods.addGrimoireEntry.bind(vm);
      vm.removeGrimoireEntry = CharacterSheetsView.methods.removeGrimoireEntry.bind(vm);

      const added = vm.addGrimoireEntry({
        name: "Grimnir's Rime-Lance",
        tradition: 'Arcane',
        default_tier: 5, // Exceeds Arcane level 3 -> must clamp to 3
        category: 'strike',
      });

      expect(vm.selectedChar.grimoire.length).toBe(1);
      expect(added.default_tier).toBe(3);
      expect(CharacterSheetsView.methods.getSpellCost.call(vm, added)).toBe(6); // Tier 3 * 2 = 6 ESS
      expect(CharacterSheetsView.methods.getSpellFuelLabel.call(vm, added)).toBe('ESS');
      expect(CharacterSheetsView.methods.getSpellTargetPct.call(vm, added)).toBe(60); // 60/2 + 30 = 60%
      expect(CharacterSheetsView.methods.getSpellMagnitudeSummary.call(vm, added)).toContain('4d10');
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);

      // Verify ward_heal spells always succeed with target 99%
      const wardSpell = {
        name: 'Aegis of Light',
        tradition: 'Arcane',
        default_tier: 1,
        category: 'ward_heal',
      };
      expect(CharacterSheetsView.methods.getSpellTargetPct.call(vm, wardSpell)).toBe(99);

      vm.removeGrimoireEntry(0);
      expect(vm.selectedChar.grimoire.length).toBe(0);
      expect(vm.updateCharacter).toHaveBeenCalledTimes(2);
    });

    it('casts ESS and STA spells, deducting Cast Tier * 2 and rolling Universal Magnitude Nd10 dice', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 99 }) });

      try {
        const vm = {
          selectedChar: {
            id: 7,
            name: 'Kaelen',
            int: 60,
            per: 50,
            current_ess: 20,
            max_ess: 50,
            current_stamina: 30,
            max_stamina: 50,
            skills: [
              { name: 'Arcane', level: 3 },
              { name: 'Blood', level: 2 },
            ],
            grimoire: [],
          },
          errorMessage: '',
          lastCastResult: null,
          updateCharacter: vi.fn().mockResolvedValue(),
        };
        vm.getMaxCastTierForTradition = CharacterSheetsView.methods.getMaxCastTierForTradition.bind(vm);
        vm.getMaxCastTierForSpell = CharacterSheetsView.methods.getMaxCastTierForSpell.bind(vm);
        vm.clampSpellTier = CharacterSheetsView.methods.clampSpellTier.bind(vm);
        vm.getSpellTargetPct = CharacterSheetsView.methods.getSpellTargetPct.bind(vm);
        vm.castGrimoireSpell = CharacterSheetsView.methods.castGrimoireSpell.bind(vm);

        // 1. Cast Tier 3 Arcane Strike (6 ESS, 4d10)
        const arcaneSpell = {
          spell_id: 'sp_arc',
          name: 'Void Lance',
          tradition: 'Arcane',
          default_tier: 3,
          category: 'strike',
        };
        const res1 = await vm.castGrimoireSpell(arcaneSpell);
        expect(res1).not.toBeNull();
        expect(res1.cost).toBe(6);
        expect(res1.fuel).toBe('ess');
        expect(res1.diceFormula).toBe('4d10');
        expect(vm.selectedChar.current_ess).toBe(14); // 20 - 6
        expect(vm.updateCharacter).toHaveBeenCalledTimes(1);

        // 2. Cast Tier 2 Blood Hex (4 STA, 2d10)
        const bloodSpell = {
          spell_id: 'sp_bld',
          name: 'Crimson Shackle',
          tradition: 'Blood',
          default_tier: 2,
          category: 'hex_summon',
        };
        const res2 = await vm.castGrimoireSpell(bloodSpell);
        expect(res2).not.toBeNull();
        expect(res2.cost).toBe(4);
        expect(res2.fuel).toBe('sta');
        expect(res2.diceFormula).toBe('2d10');
        expect(vm.selectedChar.current_stamina).toBe(26); // 30 - 4

        // 3. Cast Tier 1 Ward/Heal spell (target 99%, always succeeds)
        const wardSpell = {
          spell_id: 'sp_wrd',
          name: 'Vital Mending',
          tradition: 'Arcane',
          default_tier: 1,
          category: 'ward_heal',
        };
        const resWard = await vm.castGrimoireSpell(wardSpell);
        expect(resWard).not.toBeNull();
        expect(resWard.targetPct).toBe(99);
        expect(resWard.success).toBe(true);

        // 4. Reject when ESS is insufficient
        vm.selectedChar.current_ess = 2;
        const resFail = await vm.castGrimoireSpell(arcaneSpell);
        expect(resFail).toBeNull();
        expect(vm.selectedChar.current_ess).toBe(2);
        expect(vm.errorMessage).toMatch(/Insufficient Essence/i);
      } finally {
        global.fetch = origFetch;
      }
    });

    it('reorders spells/martial technique records via moveGrimoireEntry and calls updateGrimoire', () => {
      const spell1 = { spell_id: 'sp1', name: 'Arcane Bolt', tradition: 'Arcane', default_tier: 1 };
      const spell2 = { spell_id: 'sp2', name: 'Iron Palm', tradition: 'Ki', default_tier: 2 };
      const spell3 = { spell_id: 'sp3', name: 'Shadow Cloak', tradition: 'Shadow', default_tier: 1 };

      const vm = {
        selectedChar: {
          name: 'Monk Mage',
          grimoire: [spell1, spell2, spell3],
          racial_abilities: {},
        },
        updateCharacter: vi.fn(),
      };
      vm.updateGrimoire = CharacterSheetsView.methods.updateGrimoire.bind(vm);
      vm.moveGrimoireEntry = CharacterSheetsView.methods.moveGrimoireEntry.bind(vm);

      // Move spell1 down (index 0 -> 1)
      vm.moveGrimoireEntry(0, 1);
      expect(vm.selectedChar.grimoire.map(s => s.name)).toEqual(['Iron Palm', 'Arcane Bolt', 'Shadow Cloak']);
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);

      // Boundary: Cannot move first item up
      vm.moveGrimoireEntry(0, -1);
      expect(vm.selectedChar.grimoire.map(s => s.name)).toEqual(['Iron Palm', 'Arcane Bolt', 'Shadow Cloak']);
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);

      // Move last item down: boundary
      vm.moveGrimoireEntry(2, 1);
      expect(vm.selectedChar.grimoire.map(s => s.name)).toEqual(['Iron Palm', 'Arcane Bolt', 'Shadow Cloak']);
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);

      // Move spell3 up (index 2 -> 1)
      vm.moveGrimoireEntry(2, -1);
      expect(vm.selectedChar.grimoire.map(s => s.name)).toEqual(['Iron Palm', 'Shadow Cloak', 'Arcane Bolt']);
      expect(vm.updateCharacter).toHaveBeenCalledTimes(2);
    });

    it('reorders spells/martial technique records via drag and drop', () => {
      const spell1 = { spell_id: 'sp1', name: 'Arcane Bolt' };
      const spell2 = { spell_id: 'sp2', name: 'Iron Palm' };
      const spell3 = { spell_id: 'sp3', name: 'Shadow Cloak' };

      const vm = {
        selectedChar: {
          name: 'Monk Mage',
          grimoire: [spell1, spell2, spell3],
          racial_abilities: {},
        },
        draggedGrimoireIndex: null,
        dragOverGrimoireIndex: null,
        updateCharacter: vi.fn(),
      };
      vm.updateGrimoire = CharacterSheetsView.methods.updateGrimoire.bind(vm);
      vm.onGrimoireDragStart = CharacterSheetsView.methods.onGrimoireDragStart.bind(vm);
      vm.onGrimoireDragOver = CharacterSheetsView.methods.onGrimoireDragOver.bind(vm);
      vm.onGrimoireDrop = CharacterSheetsView.methods.onGrimoireDrop.bind(vm);
      vm.onGrimoireDragEnd = CharacterSheetsView.methods.onGrimoireDragEnd.bind(vm);

      const fakeEvent = {
        preventDefault: vi.fn(),
        target: { tagName: 'LI' },
        dataTransfer: { effectAllowed: null, setData: vi.fn(), dropEffect: null },
      };

      // Start drag at index 2
      vm.onGrimoireDragStart(fakeEvent, 2);
      expect(vm.draggedGrimoireIndex).toBe(2);

      // Drag over index 0
      vm.onGrimoireDragOver(fakeEvent, 0);
      expect(vm.dragOverGrimoireIndex).toBe(0);

      // Drop on index 0
      vm.onGrimoireDrop(fakeEvent, 0);
      expect(vm.selectedChar.grimoire.map(s => s.name)).toEqual(['Shadow Cloak', 'Arcane Bolt', 'Iron Palm']);
      expect(vm.draggedGrimoireIndex).toBeNull();
      expect(vm.dragOverGrimoireIndex).toBeNull();
      expect(vm.updateCharacter).toHaveBeenCalled();
    });
  });

  describe('Custom Equipment & Magic Item Forge Applet', () => {
    it('enforces Tradecraft Lvl 1-6 rank cap, clean Nd10 dice, and 5% hit increments', () => {
      const vm = {
        isGm: false,
        selectedChar: {
          id: 1,
          name: 'Borin Ironhand',
          int: 60,
          dex: 50,
          str: 60,
          skills: [
            { name: 'Tradecraft', specialization: 'Weaponsmith', level: 3 },
          ],
          inventory: [],
        },
        forgeError: '',
        lastForgeResult: null,
        forgeForm: {
          name: 'Superior Broadsword',
          category: 'weapon',
          required_tradecraft: 'Weaponsmith',
          item_tier: 3,
          damage_dice: '2d10',
          attack_pct_bonus: 10,
          weight_lbs: 3,
          bound_power: '',
        },
        updateCharacter: vi.fn(),
      };
      Object.defineProperty(vm, 'maxForgeTier', {
        get() {
          return CharacterSheetsView.computed.maxForgeTier.call(vm);
        },
      });
      vm.submitForgeItem = CharacterSheetsView.methods.submitForgeItem.bind(vm);

      // Tradecraft Lvl 3 -> Max Forge Tier 3
      expect(vm.maxForgeTier).toBe(3);

      // Valid Tier 3 weapon with 2d10 and +10% Hit Bonus
      const forged = vm.submitForgeItem();
      expect(forged).not.toBeNull();
      expect(forged.name).toBe('Superior Broadsword');
      expect(forged.item_tier).toBe(3);
      expect(forged.damage_dice).toBe('2d10');
      expect(forged.attack_pct_bonus).toBe(10);
      expect(vm.selectedChar.inventory.length).toBe(1);
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);

      // Reject Tier 4 when Tradecraft is Lvl 3
      const overTier = vm.submitForgeItem({
        ...vm.forgeForm,
        name: 'Apex Greatsword',
        item_tier: 4,
      });
      expect(overTier).toBeNull();
      expect(vm.forgeError).toMatch(/exceeds your maximum Tradecraft Forge Tier/i);

      // Reject flat + damage modifiers
      const flatDmg = vm.submitForgeItem({
        ...vm.forgeForm,
        name: 'Illegal +3 Sword',
        item_tier: 2,
        damage_dice: '2d10+3',
        attack_pct_bonus: 5,
      });
      expect(flatDmg).toBeNull();
      expect(vm.forgeError).toMatch(/Flat damage modifiers/i);

      // Reject prohibited Tradecraft domain
      const badDomain = vm.submitForgeItem({
        ...vm.forgeForm,
        required_tradecraft: 'Herbalist',
      });
      expect(badDomain).toBeNull();
      expect(vm.forgeError).toMatch(/conflicts with a core skill/i);
    });
  });

  describe('Character Sheet Independent Theme Selector', () => {
    it('computes characterSheetColorPkg correctly from selectedChar', () => {
      const vmNoChar = { selectedChar: null };
      expect(CharacterSheetsView.computed.characterSheetColorPkg.call(vmNoChar)).toBeNull();

      const vmDefault = { selectedChar: { color_theme: '' } };
      expect(CharacterSheetsView.computed.characterSheetColorPkg.call(vmDefault)).toBeNull();

      const vmGreens = { selectedChar: { color_theme: 'greens' } };
      expect(CharacterSheetsView.computed.characterSheetColorPkg.call(vmGreens)).toBe('greens');

      const vmOranges = { selectedChar: { color_theme: 'oranges-maroon' } };
      expect(CharacterSheetsView.computed.characterSheetColorPkg.call(vmOranges)).toBe('oranges-maroon');
    });

    it('onCharThemeChange saves to localStorage and calls updateCharacter', () => {
      localStorage.removeItem('wayworlds_char_theme_42');
      const updateSpy = vi.fn();
      const vm = {
        selectedChar: { id: 42, color_theme: 'blues' },
        updateCharacter: updateSpy,
      };

      CharacterSheetsView.methods.onCharThemeChange.call(vm);
      expect(localStorage.getItem('wayworlds_char_theme_42')).toBe('blues');
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });

    it('normalizes character data and falls back to localStorage if color_theme is empty', () => {
      localStorage.setItem('wayworlds_char_theme_99', 'maroons');

      const normalized = CharacterSheetsView.methods.normalizeCharacterData({
        id: 99,
        name: 'Themed Scout',
        race: 'Dawn Elves',
        color_theme: '',
      });

      expect(normalized.color_theme).toBe('maroons');
      localStorage.removeItem('wayworlds_char_theme_99');
    });

    it('mounts and renders the theme selector dropdown to the right of PSA and sets data-color-pkg on sheet-container', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);

      const wrapper = mount(CharacterSheetsView, {
        global: {
          plugins: [pinia],
          stubs: {
            ImageBrowserModal: true,
          },
        },
      });

      await flushPromises();

      wrapper.vm.characters = [
        {
          id: 1,
          name: 'Hero A',
          race: 'Dawn Elves',
          psa: 'Combat',
          color_theme: 'emerald',
          str: 50,
          sta: 50,
          dex: 50,
          rs: 50,
          int_stat: 50,
          log_stat: 50,
          per: 50,
          ldr: 50,
          max_ess: 50,
          current_ess: 50,
          current_xp: 0,
        },
      ];
      wrapper.vm.selectCharacter(wrapper.vm.characters[0]);
      await wrapper.vm.$nextTick();

      // Check sheet container has data-color-pkg="emerald"
      const sheetContainer = wrapper.find('.sheet-container');
      expect(sheetContainer.exists()).toBe(true);
      expect(sheetContainer.attributes('data-color-pkg')).toBe('emerald');

      // Check theme dropdown is present next to PSA
      const psaWrap = wrapper.find('.psa-select-wrap');
      const themeWrap = wrapper.find('.char-theme-select-wrap');
      expect(psaWrap.exists()).toBe(true);
      expect(themeWrap.exists()).toBe(true);

      const themeSelect = wrapper.find('.select-char-theme');
      expect(themeSelect.exists()).toBe(true);

      // Verify options include Default plus color packages
      const options = themeSelect.findAll('option');
      expect(options.length).toBeGreaterThanOrEqual(6); // 1 default + packages
      expect(options[0].text()).toContain('Default');
      expect(themeSelect.element.value).toBe('emerald');
    });

    it('has no outline or border on the encumbrance bar indicator', () => {
      const vueFile = fs.readFileSync(path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'), 'utf-8');
      expect(vueFile).toMatch(/\.encumbrance-bar-bg\s*\{[^}]*border:\s*none\s*!important;/);
      expect(vueFile).toMatch(/\.encumbrance-bar-bg\s*\{[^}]*outline:\s*none\s*!important;/);
      expect(vueFile).not.toMatch(/\.encumbrance-bar-bg\s*\{[^}]*border:\s*1px\s*solid\s*var\(--border-color/);
    });
  });

  describe('Character Navigation Bar Collapsing and Rollup', () => {
    it('provides controls to hide character navigation bar by rolling up or collapsing to the left', async () => {
      setActivePinia(createPinia());
      const wrapper = mount(CharacterSheetsView, {
        global: {
          stubs: {
            ImageBrowserModal: true,
          },
        },
      });

      // Initially sidebar is visible and unrolled
      const sidebar = wrapper.find('aside.sidebar');
      expect(sidebar.exists()).toBe(true);
      expect(sidebar.classes()).not.toContain('sidebar-collapsed-left');
      expect(sidebar.classes()).not.toContain('sidebar-rolled-up');
      expect(wrapper.find('.btn-sidebar-edge-toggle').exists()).toBe(false);

      const btnCollapseLeft = wrapper.find('.btn-sidebar-collapse-left');
      const btnRollup = wrapper.find('.btn-sidebar-rollup');
      expect(btnCollapseLeft.exists()).toBe(true);
      expect(btnRollup.exists()).toBe(true);
      expect(btnRollup.text()).toBe('▲');

      // 1. Collapse to the left
      await btnCollapseLeft.trigger('click');
      expect(wrapper.vm.isSidebarCollapsedLeft).toBe(true);
      expect(sidebar.classes()).toContain('sidebar-collapsed-left');

      // Edge toggle button appears
      const edgeToggle = wrapper.find('.btn-sidebar-edge-toggle');
      expect(edgeToggle.exists()).toBe(true);
      expect(edgeToggle.text()).toContain('Characters');

      // Click edge toggle to restore
      await edgeToggle.trigger('click');
      expect(wrapper.vm.isSidebarCollapsedLeft).toBe(false);
      expect(sidebar.classes()).not.toContain('sidebar-collapsed-left');
      expect(wrapper.find('.btn-sidebar-edge-toggle').exists()).toBe(false);

      // 2. Roll up
      await btnRollup.trigger('click');
      expect(wrapper.vm.isSidebarRolledUp).toBe(true);
      expect(sidebar.classes()).toContain('sidebar-rolled-up');
      expect(wrapper.find('.sidebar-body-wrap').classes()).toContain('rolled-up');
      expect(btnRollup.text()).toBe('▼');

      // Roll back down
      await btnRollup.trigger('click');
      expect(wrapper.vm.isSidebarRolledUp).toBe(false);
      expect(sidebar.classes()).not.toContain('sidebar-rolled-up');
      expect(wrapper.find('.sidebar-body-wrap').classes()).not.toContain('rolled-up');
      expect(btnRollup.text()).toBe('▲');
    });

    it('removes manual attribute inputs from create character modal and sets attributes based on species/race', async () => {
      setActivePinia(createPinia());
      const wrapper = mount(CharacterSheetsView, {
        global: {
          stubs: {
            ImageBrowserModal: true,
          },
        },
      });

      wrapper.vm.openCreateModal();
      await wrapper.vm.$nextTick();

      const modal = wrapper.find('.modal-card');
      expect(modal.exists()).toBe(true);

      // Verify no manual attribute inputs exist in the create character form
      const attributeInputs = modal.findAll('input[type="number"]');
      expect(attributeInputs.length).toBe(0);

      // Verify species selection automatically sets lineage baseline stats on newCharForm
      wrapper.vm.newCharForm.race = 'Vanir Dwarves';
      wrapper.vm.onCreateRaceChange();
      expect(wrapper.vm.newCharForm.str).toBe(55); // Vanir Dwarves +5 STR
      expect(wrapper.vm.newCharForm.sta).toBe(55); // Vanir Dwarves +5 STA
      expect(wrapper.vm.newCharForm.rs).toBe(45);  // Vanir Dwarves -5 RS

      // Change to Ogre
      wrapper.vm.newCharForm.race = 'Ogre';
      wrapper.vm.onCreateRaceChange();
      expect(wrapper.vm.newCharForm.str).toBe(65); // Ogre +15 STR
      expect(wrapper.vm.newCharForm.sta).toBe(65); // Ogre +15 STA
    });
  });
});



