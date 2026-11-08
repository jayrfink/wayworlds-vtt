/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import fs from 'fs';
import path from 'path';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';
import { useAuthStore } from '../src/stores/auth.js';

describe('Skills Card Strike & Shoot Action Buttons', () => {
  let pinia;
  let auth;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    auth = useAuthStore();
    auth.user = { id: 1, username: 'testplayer', role: 'Player' };
  });

  it('calculates Strike % and Shoot % accurately with and without skills', () => {
    const vm = {
      selectedChar: {
        str: 40,
        dex: 60,
        skills: [
          { name: 'Melee Weapons', level: 2 },
          { name: 'Ranged Weapons', level: 3 },
        ],
      },
      derivedMeleeHit: 30, // max(ceil(40/2)=20, ceil(60/2)=30) = 30%
      derivedRangedHit: 30, // ceil(60/2) = 30%
    };

    const strikeTotalPct = CharacterSheetsView.computed.strikeTotalPct.call(vm);
    const shootTotalPct = CharacterSheetsView.computed.shootTotalPct.call(vm);

    // 30 base + (2 * 10) = 50%
    expect(strikeTotalPct).toBe(50);
    // 30 base + (3 * 10) = 60%
    expect(shootTotalPct).toBe(60);

    // Without skills fallback
    const vmNoSkills = {
      selectedChar: {
        str: 50,
        dex: 50,
        skills: [],
      },
      derivedMeleeHit: 25,
      derivedRangedHit: 25,
    };
    expect(CharacterSheetsView.computed.strikeTotalPct.call(vmNoSkills)).toBe(25);
    expect(CharacterSheetsView.computed.shootTotalPct.call(vmNoSkills)).toBe(25);
  });

  it('renders Strike and Shoot buttons before skill records inside Skills & Experience card', async () => {
    const origFetch = global.fetch;
    const mockPostRoll = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 101 }) });
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (url === '/api/characters') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{
            id: 1,
            user_id: 1,
            name: 'Kaelen',
            race: 'Dawn Elf',
            psa: 'Martial',
            str: 50,
            dex: 60,
            rs: 50,
            current_stamina: 45,
            max_stamina: 45,
            skills: [
              { name: 'Melee Weapons', level: 1 },
              { name: 'Ranged Weapons', level: 2 },
            ],
          }]),
        });
      }
      if (url === '/api/rolls' && options?.method === 'POST') {
        return mockPostRoll(url, options);
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

      const skillsCard = wrapper.find('.skills-card');
      expect(skillsCard.exists()).toBe(true);

      const combatBar = skillsCard.find('.combat-actions-bar');
      expect(combatBar.exists()).toBe(true);

      const strikeBtn = combatBar.find('.btn-strike-action');
      expect(strikeBtn.exists()).toBe(true);
      expect(strikeBtn.text()).toContain('Strike');
      // 30 base + 10 = 40%
      expect(strikeBtn.text()).toContain('(40%)');

      const shootBtn = combatBar.find('.btn-shoot-action');
      expect(shootBtn.exists()).toBe(true);
      expect(shootBtn.text()).toContain('Shoot');
      // 30 base + 20 = 50%
      expect(shootBtn.text()).toContain('(50%)');

      // Click Strike and verify POST /api/rolls with source: 'sheet'
      await strikeBtn.trigger('click');
      await flushPromises();

      expect(mockPostRoll).toHaveBeenCalled();
      const strikeCall = JSON.parse(mockPostRoll.mock.calls[0][1].body);
      expect(strikeCall.mode).toBe('rpg');
      expect(strikeCall.type).toBe('percentile');
      expect(strikeCall.source).toBe('sheet');
      expect(strikeCall.label).toMatch(/Kaelen: ⚔️ Strike \(40%\)/);

      // Verify banner appears
      expect(skillsCard.find('.combat-action-banner').exists()).toBe(true);

      // Click Shoot and verify POST /api/rolls
      await shootBtn.trigger('click');
      await flushPromises();

      const shootCall = JSON.parse(mockPostRoll.mock.calls[1][1].body);
      expect(shootCall.mode).toBe('rpg');
      expect(shootCall.type).toBe('percentile');
      expect(shootCall.source).toBe('sheet');
      expect(shootCall.label).toMatch(/Kaelen: 🏹 Shoot \(50%\)/);
    } finally {
      global.fetch = origFetch;
    }
  });

  it('styles combat action buttons with padding left of Strike button and padding/gap between buttons', () => {
    const sheetViewPath = path.resolve(__dirname, '../src/views/CharacterSheetsView.vue');
    const sheetContent = fs.readFileSync(sheetViewPath, 'utf8');

    expect(sheetContent).toMatch(/\.combat-actions-bar\s*\{[\s\S]*?padding-left:\s*2px;/);
    expect(sheetContent).toMatch(/\.combat-actions-bar\s*\{[\s\S]*?gap:\s*1[24]px;/);
  });

  it('verifies RpgVttView triggers % dice box animation and HUD when roll originates from sheet', () => {
    const rpgViewPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
    const rpgContent = fs.readFileSync(rpgViewPath, 'utf8');

    // Asserts RpgVttView checks isFromSheet to display HUD and roll % dice
    expect(rpgContent).toContain("roll.source === 'sheet' || roll.rollSummary?.source === 'sheet'");
    expect(rpgContent).toContain("executeQueuedDiceRoll(diceBox, [");
    expect(rpgContent).toContain("theme: 'custom-tens'");
    expect(rpgContent).toContain("theme: 'custom-ones'");
  });
});
