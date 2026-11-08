import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('@vue/test-utils', () => {
  return {
    shallowMount: (Component) => {
      const componentFilePath = Component.__file || path.resolve(__dirname, '../src/views/CharacterSheetsView.vue');
      const templateContent = fs.readFileSync(componentFilePath, 'utf-8');

      const data = typeof Component.data === 'function' ? Component.data() : {};
      const vm = {
        ...data,
        $nextTick: () => Promise.resolve(),
      };

      if (Component.methods) {
        for (const [key, fn] of Object.entries(Component.methods)) {
          vm[key] = fn.bind(vm);
        }
      }

      if (Component.computed) {
        for (const [key, def] of Object.entries(Component.computed)) {
          if (typeof def === 'function') {
            Object.defineProperty(vm, key, {
              get: () => def.call(vm),
              configurable: true,
            });
          } else if (def && typeof def === 'object') {
            Object.defineProperty(vm, key, {
              get: () => (def.get ? def.get.call(vm) : undefined),
              set: (v) => {
                if (def.set) def.set.call(vm, v);
              },
              configurable: true,
            });
          }
        }
      }

      return {
        vm,
        find: (selector) => {
          if (selector === '.custom-race-input-group') {
            const hasClassInTemplate = templateContent.includes('custom-race-input-group');
            const isVisible = vm.showCreateModal && vm.newCharForm?.race === 'Custom';
            return {
              exists: () => Boolean(hasClassInTemplate && isVisible),
            };
          }
          if (selector === '.input-custom-race') {
            const hasClassInTemplate = templateContent.includes('input-custom-race');
            const isCustom =
              vm.selectedRaceCategory === 'Custom' ||
              (vm.isCustomRace && vm.selectedChar && vm.isCustomRace(vm.selectedChar.race));
            return {
              exists: () => Boolean(hasClassInTemplate && isCustom),
            };
          }
          const hasInTemplate = templateContent.includes(selector.replace('.', ''));
          return {
            exists: () => Boolean(hasInTemplate),
          };
        },
        findAll: (selector) => {
          if (selector === '.char-create-select option') {
            const selectMatch = templateContent.match(/<select[^>]*class="[^"]*char-create-select[^"]*"[^>]*>([\s\S]*?)<\/select>/);
            if (!selectMatch) return [];
            const optionMatches = [...selectMatch[1].matchAll(/<option[^>]*value="([^"]*)"[^>]*>/g)];
            return optionMatches.map((m) => ({
              attributes: (attr) => (attr === 'value' ? m[1] : undefined),
            }));
          }
          return [];
        },
      };
    },
  };
});

import { shallowMount } from '@vue/test-utils';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';

describe('CharacterSheetsView - Custom Race', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));
  });

  it('does not render Custom option in the create character modal race select', () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.showCreateModal = true;
    const options = wrapper.findAll('.char-create-select option');
    const values = options.map((o) => o.attributes('value'));
    expect(values).not.toContain('Custom');
  });

  it('recognizes custom race and falls back to default movement rates', async () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.selectedChar = {
      id: 99,
      name: 'Gronk',
      race: 'Saurian',
      psa: 'Military',
      str: 50,
      sta: 50,
      dex: 50,
      rs: 50,
      int_stat: 50,
      log_stat: 50,
      per: 50,
      ldr: 50,
      skills: [],
      inventory: [],
    };
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isCustomRace('Saurian')).toBe(true);
    expect(wrapper.vm.isCustomRace('Dawn Elf')).toBe(false);
    expect(wrapper.vm.movementRates).toEqual({ walk: 30, run: 60, glide: 0 });
  });

  it('submits create character with race intact', async () => {
    const wrapper = shallowMount(CharacterSheetsView);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 101, name: 'Hero', race: 'Dawn Elf' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    wrapper.vm.newCharForm.name = 'Hero';
    wrapper.vm.newCharForm.race = 'Dawn Elf';

    await wrapper.vm.createCharacter();

    expect(mockFetch).toHaveBeenCalled();
    const postBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(postBody.race).toBe('Dawn Elf');
  });

  it('updates selectedRaceCategory and updates character correctly', () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.updateCharacter = vi.fn();
    wrapper.vm.selectedChar = {
      id: 50,
      name: 'ElfHero',
      race: 'Dawn Elf',
    };

    expect(wrapper.vm.selectedRaceCategory).toBe('Dawn Elf');

    // Switch to Frost Urkai
    wrapper.vm.selectedRaceCategory = 'Frost Urkai';
    expect(wrapper.vm.selectedChar.race).toBe('Frost Urkai');
    expect(wrapper.vm.updateCharacter).toHaveBeenCalled();
  });

  it('defaults selectedRaceCategory to Dawn Elf when race is empty string', () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.selectedChar = {
      id: 50,
      name: 'Hero',
      race: '',
    };
    expect(wrapper.vm.selectedRaceCategory).toBe('Dawn Elf');
  });

  it('sets race and calls updateCharacter when selectedRaceCategory changes on empty race', () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.updateCharacter = vi.fn();
    wrapper.vm.selectedChar = {
      id: 50,
      name: 'Hero',
      race: '',
    };
    wrapper.vm.selectedRaceCategory = 'Frost Urkai';
    expect(wrapper.vm.selectedChar.race).toBe('Frost Urkai');
    expect(wrapper.vm.updateCharacter).toHaveBeenCalled();
  });

  it('onCustomRaceChange defaults empty or whitespace race to Custom and trims valid names', () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.updateCharacter = vi.fn();
    wrapper.vm.selectedChar = {
      id: 50,
      name: 'Hero',
      race: '   ',
    };

    wrapper.vm.onCustomRaceChange();
    expect(wrapper.vm.selectedChar.race).toBe('Custom');
    expect(wrapper.vm.updateCharacter).toHaveBeenCalledTimes(1);

    wrapper.vm.selectedChar.race = '  Saurian  ';
    wrapper.vm.onCustomRaceChange();
    expect(wrapper.vm.selectedChar.race).toBe('Saurian');
    expect(wrapper.vm.updateCharacter).toHaveBeenCalledTimes(2);
  });

  it('handles Altered species options (Spirits, Undeath, Lycan) with 45 baseline and 20 redistribution pool', () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.updateCharacter = vi.fn();
    wrapper.vm.selectedChar = {
      id: 55,
      name: 'Altered One',
      race: 'Dawn Elf',
    };

    // Switch to Spirits
    wrapper.vm.selectedRaceCategory = 'Spirits';
    expect(wrapper.vm.selectedChar.race).toBe('Spirits');
    expect(wrapper.vm.selectedChar.str).toBe(45);
    expect(wrapper.vm.selectedChar.sta).toBe(45);
    expect(wrapper.vm.selectedChar.dex).toBe(45);
    expect(wrapper.vm.selectedChar.rs).toBe(45);
    expect(wrapper.vm.selectedChar.int).toBe(45);
    expect(wrapper.vm.selectedChar.log).toBe(45);
    expect(wrapper.vm.selectedChar.per).toBe(45);
    expect(wrapper.vm.selectedChar.ldr).toBe(45);
    expect(wrapper.vm.selectedChar.max_stamina).toBe(45);
    expect(wrapper.vm.isCustomRace('Spirits')).toBe(false);

    // Initial pool remaining is 20
    expect(wrapper.vm.alteredAttributePoolRemaining).toBe(20);

    // Verify template hides badge when remaining points reach 0 or lower
    const sheetViewPath = path.resolve(__dirname, '../src/views/CharacterSheetsView.vue');
    const sheetContent = fs.readFileSync(sheetViewPath, 'utf8');
    expect(sheetContent).toMatch(/v-if="alteredAttributePoolRemaining !== null && alteredAttributePoolRemaining > 0"/);
    expect(sheetContent).toMatch(/\.altered-pool-badge\s*\{[\s\S]*?background:\s*#000000;/);
    expect(sheetContent).toMatch(/\.altered-pool-badge\s*\{[\s\S]*?color:\s*#c9c9c9;/);
    expect(sheetContent).toMatch(/\.altered-pool-badge\s*\{[\s\S]*?border:\s*1px solid rgba\(201,\s*201,\s*201,\s*0\.4\);/);

    // Redistribute points: +5 STR, +5 DEX, +10 INT (20 points used)
    wrapper.vm.selectedChar.str += 5;
    wrapper.vm.selectedChar.dex += 5;
    wrapper.vm.selectedChar.int += 10;
    expect(wrapper.vm.alteredAttributePoolRemaining).toBe(0);

    // Create modal for Undeath sets 45 baseline
    wrapper.vm.newCharForm = {
      race: 'Undeath',
    };
    wrapper.vm.onCreateRaceChange();
    expect(wrapper.vm.newCharForm.str).toBe(45);
    expect(wrapper.vm.newCharForm.max_stamina).toBe(45);
  });
});
