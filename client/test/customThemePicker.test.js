/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import {
  COLOR_PACKAGES,
  clampShadowLuminance,
  generateThemeVariablesFromHex,
  getRelativeLuminance,
  parseHexToRgb,
  isCustomColor,
  applyColorPackage,
  getSavedColorPackage,
  getSavedCustomColor,
  setSavedCustomColor,
  CUSTOM_THEME_STORAGE_KEY,
} from '../src/utils/themeManager.js';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';
import NavBar from '../src/components/NavBar.vue';

describe('Custom Theme Color Picker & Shadow Clamp', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-color-pkg');
    document.documentElement.removeAttribute('style');
  });

  describe('Shadow Clamp & Palette Generation', () => {
    it('clamps pitch black (#000000) or very dark colors up to visible luminance', () => {
      const clampedBlack = clampShadowLuminance('#000000');
      // Lightness must be clamped up so it does not blend into pitch black backgrounds
      expect(clampedBlack).not.toBe('#000000');
      
      const vars = generateThemeVariablesFromHex('#000000');
      expect(vars['--theme-bright']).toBeDefined();
      expect(vars['--theme-bright']).not.toBe('#000000');
      // Box shadow glow must have adequate alpha
      expect(vars['--theme-glow']).toMatch(/rgba\(/);
    });

    it('clamps dark colors (e.g. #0f172a, #111827) so letters contrast well with >= 4.5:1 ratio against dark toolbar/black background', () => {
      const darkColors = ['#0f172a', '#111827', '#000000', '#1a0529', '#051b11'];
      for (const darkHex of darkColors) {
        const clamped = clampShadowLuminance(darkHex);
        const rgb = parseHexToRgb(clamped);
        const lum = getRelativeLuminance(rgb.r, rgb.g, rgb.b);
        // Against black (#000000), contrast ratio is (lum + 0.05) / 0.05
        const contrastAgainstBlack = (lum + 0.05) / 0.05;
        expect(contrastAgainstBlack).toBeGreaterThanOrEqual(4.5);

        const vars = generateThemeVariablesFromHex(darkHex);
        expect(vars['--theme-btn-color']).toBe(clamped);
        expect(vars['--theme-bright']).toBe(clamped);
      }
    });

    it('generates complete set of theme CSS variables from a seed hex', () => {
      const vars = generateThemeVariablesFromHex('#a855f7');
      expect(vars['--theme-bright']).toBe('#a855f7');
      expect(vars['--theme-glow']).toContain('rgba(');
      expect(vars['--theme-glow-bg']).toContain('rgba(');
      expect(vars['--border-color']).toBeDefined();
      expect(vars['--theme-primary']).toBeDefined();
      expect(vars['--theme-sta-color']).toBeDefined();
      expect(vars['--theme-ess-color']).toBeDefined();
    });

    it('identifies custom hex values and custom keyword', () => {
      expect(isCustomColor('#a855f7')).toBe(true);
      expect(isCustomColor('#00E5FF')).toBe(true);
      expect(isCustomColor('custom')).toBe(true);
      expect(isCustomColor('emerald')).toBe(false);
      expect(isCustomColor('silver')).toBe(false);
      expect(isCustomColor('')).toBe(false);
    });
  });

  describe('applyColorPackage with Custom Colors', () => {
    it('applies custom hex directly to document.documentElement and sets data-color-pkg="custom"', () => {
      const applied = applyColorPackage('#e11d48');
      expect(applied).toBe('custom');
      expect(document.documentElement.getAttribute('data-color-pkg')).toBe('custom');
      expect(document.documentElement.style.getPropertyValue('--theme-bright')).toBe('#e11d48');
      expect(localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)).toBe('#e11d48');
    });

    it('clears inline custom CSS variables when switching back to a preset', () => {
      applyColorPackage('#e11d48');
      expect(document.documentElement.style.getPropertyValue('--theme-bright')).toBe('#e11d48');

      applyColorPackage('emerald');
      expect(document.documentElement.getAttribute('data-color-pkg')).toBe('emerald');
      expect(document.documentElement.style.getPropertyValue('--theme-bright')).toBe('');
    });
  });

  describe('CharacterSheetsView Custom Color Picker Button', () => {
    it('renders Color Scheme button and hidden picker, applying custom theme variables to sheet-container', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);

      const wrapper = mount(CharacterSheetsView, {
        global: {
          plugins: [pinia],
          stubs: { ImageBrowserModal: true },
        },
      });

      wrapper.vm.characters = [
        {
          id: 101,
          name: 'Custom Paladin',
          race: 'Dawn Elves',
          psa: 'Martial',
          color_theme: '#8b5cf6',
          str: 60,
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

      // Old preset theme dropdown must NOT exist
      expect(wrapper.find('.select-char-theme').exists()).toBe(false);

      // Color Scheme button is rendered
      const schemeBtn = wrapper.find('.btn-char-color-scheme');
      expect(schemeBtn.exists()).toBe(true);
      expect(schemeBtn.text()).toBe('Color Scheme');

      // Hidden color input is bound
      const colorInput = wrapper.find('.hidden-color-input');
      expect(colorInput.exists()).toBe(true);
      expect(colorInput.element.value).toBe('#8b5cf6');

      // Styles applied with brighter accent and darker button background
      const sheetContainer = wrapper.find('.sheet-container');
      expect(sheetContainer.attributes('style')).toContain('--theme-bright: #8b5cf6');
      expect(sheetContainer.attributes('style')).toContain('--theme-btn-bg:');
    });

    it('styles .btn-char-color-scheme with 10% smaller font-size and padding', () => {
      const mainCss = fs.readFileSync(path.resolve(__dirname, '../src/main.css'), 'utf8');
      expect(mainCss).toMatch(/\.btn-char-color-scheme\s*\{[^}]*font-size:\s*0\.765rem/);
      expect(mainCss).toMatch(/\.btn-char-color-scheme\s*\{[^}]*padding:\s*4\.5px\s+12\.5px/);
    });
  });

  describe('NavBar Site Custom Color Picker Button', () => {
    it('renders Color Scheme button and hidden picker in top row without preset dropdown', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);

      const wrapper = mount(NavBar, {
        global: {
          plugins: [pinia],
          stubs: {
            RouterLink: true,
            ChangePasswordModal: true,
          },
        },
      });

      // Old preset select dropdown must NOT exist
      expect(wrapper.find('#nav-color-pkg-select').exists()).toBe(false);

      // Color Scheme button exists
      const schemeBtn = wrapper.find('.btn-color-scheme');
      expect(schemeBtn.exists()).toBe(true);
      expect(schemeBtn.text()).toBe('Color Scheme');

      // Hidden color input exists
      const navColorPicker = wrapper.find('#nav-custom-color-picker');
      expect(navColorPicker.exists()).toBe(true);
    });
  });
});
