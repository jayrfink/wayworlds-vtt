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

      // Verify % Die button is rendered to the right of Shoot button
      const pctBtn = combatBar.find('.btn-percentile-action');
      expect(pctBtn.exists()).toBe(true);
      expect(pctBtn.text()).toContain('% Die');

      // Click % Die and verify POST /api/rolls
      await pctBtn.trigger('click');
      await flushPromises();

      const pctCall = JSON.parse(mockPostRoll.mock.calls[2][1].body);
      expect(pctCall.mode).toBe('rpg');
      expect(pctCall.type).toBe('percentile');
      expect(pctCall.source).toBe('sheet');
      expect(pctCall.label).toContain('Kaelen: 🎲 % Die (d100)');

      // Verify d10(s) roller is rendered to the right of % Die button
      const d10Group = combatBar.find('.sheet-d10-roller-group');
      expect(d10Group.exists()).toBe(true);

      const d10MainBtn = d10Group.find('.btn-d10-main');
      expect(d10MainBtn.exists()).toBe(true);
      expect(d10MainBtn.text()).toContain('d10s (1d10)');

      const stepBtns = d10Group.findAll('.btn-d10-step');
      expect(stepBtns.length).toBe(2);
      const minusBtn = stepBtns[0];
      const plusBtn = stepBtns[1];
      expect(minusBtn.text()).toBe('−');
      expect(plusBtn.text()).toBe('+');

      // Adjust dice count with stepper
      await plusBtn.trigger('click');
      await plusBtn.trigger('click');
      expect(d10MainBtn.text()).toContain('d10s (3d10)');

      await minusBtn.trigger('click');
      expect(d10MainBtn.text()).toContain('d10s (2d10)');

      // Click d10(s) button and verify POST /api/rolls
      await d10MainBtn.trigger('click');
      await flushPromises();

      const d10Call = JSON.parse(mockPostRoll.mock.calls[3][1].body);
      expect(d10Call.mode).toBe('rpg');
      expect(d10Call.type).toBe('damage');
      expect(d10Call.source).toBe('sheet');
      expect(d10Call.label).toContain('Kaelen: 💥 2d10');
      expect(d10Call.rollSummary.count).toBe(2);
      expect(d10Call.rollSummary.dice.length).toBe(2);
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

  it('styles Strike, Shoot, Cast, +Lvl, % Die, and d10(s) buttons using character selected theme variables with consistent border, shading, and text', () => {
    const sheetViewPath = path.resolve(__dirname, '../src/views/CharacterSheetsView.vue');
    const sheetContent = fs.readFileSync(sheetViewPath, 'utf8');

    // Strike, Shoot, % Die, and d10(s) share btn-xp-upgrade and btn-combat-action
    expect(sheetContent).toContain('class="btn-xp-upgrade btn-combat-action btn-strike-action"');
    expect(sheetContent).toContain('class="btn-xp-upgrade btn-combat-action btn-shoot-action"');
    expect(sheetContent).toContain('class="btn-xp-upgrade btn-combat-action btn-percentile-action"');
    expect(sheetContent).toContain('class="btn-xp-upgrade btn-combat-action btn-d10-main"');
    expect(sheetContent).toContain('class="btn-xp-upgrade btn-d10-step"');
    expect(sheetContent).toContain('class="btn-xp-upgrade btn-cast-spell"');

    // Asserts .btn-xp-upgrade uses character selected theme CSS variables
    expect(sheetContent).toMatch(/\.btn-xp-upgrade\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*var\(--theme-btn-bg/);
    expect(sheetContent).toMatch(/\.btn-xp-upgrade\s*\{[\s\S]*?border:\s*1px solid var\(--theme-bright/);
    expect(sheetContent).toMatch(/\.btn-xp-upgrade\s*\{[\s\S]*?box-shadow:\s*0 0 6px var\(--theme-glow/);
    expect(sheetContent).toMatch(/\.btn-xp-upgrade:hover\s*\{[\s\S]*?box-shadow:\s*var\(--theme-glow-hover/);
    expect(sheetContent).toMatch(/\.btn-xp-upgrade:hover\s*\{[\s\S]*?border-color:\s*var\(--theme-bright-hover/);
  });

  it('verifies RpgVttView triggers % and d10 dice box animation and HUD when roll originates from sheet', () => {
    const rpgViewPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
    const rpgContent = fs.readFileSync(rpgViewPath, 'utf8');

    // Asserts RpgVttView checks isFromSheet to display HUD and roll % dice
    expect(rpgContent).toContain("roll.source === 'sheet' || roll.rollSummary?.source === 'sheet'");
    expect(rpgContent).toContain("executeQueuedDiceRoll(diceBox, [");
    expect(rpgContent).toContain("theme: 'custom-tens'");
    expect(rpgContent).toContain("theme: 'custom-ones'");
    expect(rpgContent).toContain("theme: 'custom-dmg'");
  });
});
