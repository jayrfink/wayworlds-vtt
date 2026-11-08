/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import {
  DEFAULT_DICE_COLORS,
  DICE_COLORS_STORAGE_KEY,
  isValidHexColor,
  normalizeHexColor,
  getSavedDiceColors,
  saveDiceColors,
  resetDiceColors,
  syncDiceColorsWithUser,
  getContrastingNumberColor,
  getContrastRatio,
} from '../src/utils/diceColorManager.js';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth.js';
import DiceColorModal from '../src/components/DiceColorModal.vue';

describe('Dice Color Management & Modal', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  describe('diceColorManager utility', () => {
    it('validates hex colors correctly', () => {
      expect(isValidHexColor('#fff')).toBe(true);
      expect(isValidHexColor('#ffffff')).toBe(true);
      expect(isValidHexColor('#77d19e')).toBe(true);
      expect(isValidHexColor('#123456')).toBe(true);

      expect(isValidHexColor('77d19e')).toBe(false);
      expect(isValidHexColor('#12')).toBe(false);
      expect(isValidHexColor('#gggggg')).toBe(false);
      expect(isValidHexColor(null)).toBe(false);
      expect(isValidHexColor(undefined)).toBe(false);
    });

    it('normalizes 3-char and 6-char hex colors to lowercase 6-char format', () => {
      expect(normalizeHexColor('#FFF')).toBe('#ffffff');
      expect(normalizeHexColor('#77D19E')).toBe('#77d19e');
      expect(normalizeHexColor('#abc')).toBe('#aabbcc');
      expect(normalizeHexColor('invalid')).toBe('#77d19e');
    });

    it('returns default dice colors when nothing is in localStorage', () => {
      const colors = getSavedDiceColors();
      expect(colors.percentileTens).toBe(DEFAULT_DICE_COLORS.percentileTens);
      expect(colors.percentileOnes).toBe(DEFAULT_DICE_COLORS.percentileOnes);
      expect(colors.damage).toBe(DEFAULT_DICE_COLORS.damage);
      expect(colors.initiativePlayer).toBe(DEFAULT_DICE_COLORS.initiativePlayer);
      expect(colors.initiativeOpp).toBe(DEFAULT_DICE_COLORS.initiativeOpp);
    });

    it('saves and loads customized dice colors', () => {
      saveDiceColors({
        percentileTens: '#ff00aa',
        percentileOnes: '#00ffcc',
        damage: '#ff9900',
        initiativePlayer: '#112233',
        initiativeOpp: '#445566',
      });

      const loaded = getSavedDiceColors();
      expect(loaded.percentileTens).toBe('#ff00aa');
      expect(loaded.percentileOnes).toBe('#00ffcc');
      expect(loaded.damage).toBe('#ff9900');
      expect(loaded.initiativePlayer).toBe('#112233');
      expect(loaded.initiativeOpp).toBe('#445566');
    });

    it('resets to defaults when resetDiceColors is called', () => {
      saveDiceColors({ damage: '#ff0000' });
      resetDiceColors();
      const loaded = getSavedDiceColors();
      expect(loaded.damage).toBe(DEFAULT_DICE_COLORS.damage);
    });

    it('syncDiceColorsWithUser synchronizes account dice colors into storage', () => {
      const userWithColors = {
        id: 1,
        username: 'gm',
        preferences: {
          dice_colors: {
            damage: '#9933cc',
            percentileTens: '#118822',
          },
        },
      };

      const result = syncDiceColorsWithUser(userWithColors);
      expect(result.damage).toBe('#9933cc');
      expect(result.percentileTens).toBe('#118822');

      const loaded = getSavedDiceColors();
      expect(loaded.damage).toBe('#9933cc');
      expect(loaded.percentileTens).toBe('#118822');
      expect(loaded.percentileOnes).toBe(DEFAULT_DICE_COLORS.percentileOnes);
    });

    it('syncDiceColorsWithUser returns existing saved dice colors if user has no preferences', () => {
      saveDiceColors({ damage: '#ff3311' });
      const userWithoutColors = { id: 2, username: 'player' };

      const result = syncDiceColorsWithUser(userWithoutColors);
      expect(result.damage).toBe('#ff3311');
    });

    it('automatically calculates readable contrasting number color', () => {
      // Dark blue background -> light blue number
      const darkBlueNum = getContrastingNumberColor('#001f3f');
      expect(getContrastRatio('#001f3f', darkBlueNum)).toBeGreaterThan(4.5);

      // Pitch black background -> near white number
      const blackNum = getContrastingNumberColor('#000000');
      expect(getContrastRatio('#000000', blackNum)).toBeGreaterThan(10);

      // Pure white background -> near black number
      const whiteNum = getContrastingNumberColor('#ffffff');
      expect(getContrastRatio('#ffffff', whiteNum)).toBeGreaterThan(10);

      // Bright yellow background -> dark yellow/brown number
      const yellowNum = getContrastingNumberColor('#ffff00');
      expect(getContrastRatio('#ffff00', yellowNum)).toBeGreaterThan(7);

      // Mint green background -> dark green number
      const mintNum = getContrastingNumberColor('#77d19e');
      expect(getContrastRatio('#77d19e', mintNum)).toBeGreaterThan(4.5);
    });
  });

  describe('DiceColorModal Component', () => {
    it('renders when modelValue is true and allows editing colors', async () => {
      const wrapper = mount(DiceColorModal, {
        props: {
          modelValue: true,
        },
      });

      expect(wrapper.find('.dice-color-modal-card').exists()).toBe(true);
      expect(wrapper.find('#dice-color-modal-title').text()).toContain('Dice Colors');

      const inputs = wrapper.findAll('input[type="color"]');
      expect(inputs.length).toBe(5); // Tens, Ones, Damage, Init Player, Init Opp

      // Change Damage die color
      const damageInput = inputs[2];
      await damageInput.setValue('#aa33bb');

      const emitted = wrapper.emitted('change');
      expect(emitted).toBeTruthy();
      expect(emitted[0][0].damage).toBe('#aa33bb');

      // Test reset button
      const resetBtn = wrapper.find('.btn-dice-reset');
      await resetBtn.trigger('click');

      const emittedAfterReset = wrapper.emitted('change');
      expect(emittedAfterReset[emittedAfterReset.length - 1][0].damage).toBe(DEFAULT_DICE_COLORS.damage);
    });

    it('emits update:modelValue false when close or done is clicked', async () => {
      const wrapper = mount(DiceColorModal, {
        props: {
          modelValue: true,
        },
      });

      const doneBtn = wrapper.find('.btn-dice-done');
      await doneBtn.trigger('click');
      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([false]);
    });

    it('syncs updated colors to authStore.updatePreferences when authenticated', async () => {
      const auth = useAuthStore();
      auth.user = { id: 1, username: 'gm', role: 'GameMaster', preferences: {} };
      let updatedPayload = null;
      auth.updatePreferences = async (prefs) => {
        updatedPayload = prefs;
        return prefs;
      };

      const wrapper = mount(DiceColorModal, {
        props: {
          modelValue: true,
        },
      });

      const damageInput = wrapper.findAll('input[type="color"]')[2];
      await damageInput.setValue('#112233');

      expect(updatedPayload).not.toBeNull();
      expect(updatedPayload.dice_colors.damage).toBe('#112233');

      // Test reset calls updatePreferences with defaults
      const resetBtn = wrapper.find('.btn-dice-reset');
      await resetBtn.trigger('click');

      expect(updatedPayload.dice_colors.damage).toBe(DEFAULT_DICE_COLORS.damage);
    });
  });
});
