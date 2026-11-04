/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import fs from 'fs';
import path from 'path';
import {
  COLOR_PACKAGES,
  DEFAULT_COLOR_PACKAGE,
  isValidColorPackage,
  getSavedColorPackage,
  applyColorPackage,
  initColorPackage,
} from '../src/utils/themeManager.js';
import LoginView from '../src/views/LoginView.vue';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';
import NavBar from '../src/components/NavBar.vue';

describe('Theme Packages: Silver, Dark Grey, Dark Emerald, and Defaults', () => {
  it('defines silver as the default theme package for unauthenticated / new users', () => {
    expect(DEFAULT_COLOR_PACKAGE).toBe('silver');
  });

  it('includes silver, dark-grey, emerald, azure, plum, copper, rust, oceanic, crimson, forest, indiglo, fire, and lime in COLOR_PACKAGES', () => {
    const keys = COLOR_PACKAGES.map((p) => p.key);
    expect(keys).toContain('silver');
    expect(keys).toContain('dark-grey');
    expect(keys).toContain('emerald');
    expect(keys).toContain('azure');
    expect(keys).toContain('plum');
    expect(keys).toContain('copper');
    expect(keys).toContain('rust');
    expect(keys).toContain('oceanic');
    expect(keys).toContain('crimson');
    expect(keys).toContain('forest');
    expect(keys).toContain('indiglo');
    expect(keys).toContain('fire');
    expect(keys).toContain('lime');
    expect(keys).not.toContain('blues-greens');

    const rustPkg = COLOR_PACKAGES.find((p) => p.key === 'rust');
    expect(rustPkg.label).toBe('Rust');
    expect(rustPkg.widgetColor).toBe('#7f513e');
    expect(rustPkg.borderColor).toBe('#543325');
    expect(rustPkg.brightColor).toBe('#c27a59');

    const emeraldPkg = COLOR_PACKAGES.find((p) => p.key === 'emerald');
    expect(emeraldPkg.label).toBe('Emerald');
    expect(emeraldPkg.widgetColor).toBe('#1b7a4d');
    expect(emeraldPkg.borderColor).toBe('#0d3822');
    expect(emeraldPkg.brightColor).toBe('#10b981');

    const plumPkg = COLOR_PACKAGES.find((p) => p.key === 'plum');
    expect(plumPkg.label).toBe('Plum');

    const azurePkg = COLOR_PACKAGES.find((p) => p.key === 'azure');
    expect(azurePkg.label).toBe('Azure');

    const copperPkg = COLOR_PACKAGES.find((p) => p.key === 'copper');
    expect(copperPkg.label).toBe('Copper');

    const oceanicPkg = COLOR_PACKAGES.find((p) => p.key === 'oceanic');
    expect(oceanicPkg.label).toBe('Oceanic');
    expect(oceanicPkg.widgetColor).toBe('#27b3a7');

    const crimsonPkg = COLOR_PACKAGES.find((p) => p.key === 'crimson');
    expect(crimsonPkg.label).toBe('Crimson');
    expect(crimsonPkg.widgetColor).toBe('#b3273a');

    const forestPkg = COLOR_PACKAGES.find((p) => p.key === 'forest');
    expect(forestPkg.label).toBe('Forest');
    expect(forestPkg.widgetColor).toBe('#3dd465');

    const indigloPkg = COLOR_PACKAGES.find((p) => p.key === 'indiglo');
    expect(indigloPkg.label).toBe('Indiglo');
    expect(indigloPkg.widgetColor).toBe('#2d798a');

    const firePkg = COLOR_PACKAGES.find((p) => p.key === 'fire');
    expect(firePkg.label).toBe('Fire');
    expect(firePkg.widgetColor).toBe('#d44a27');

    const limePkg = COLOR_PACKAGES.find((p) => p.key === 'lime');
    expect(limePkg.label).toBe('Lime');
    expect(limePkg.widgetColor).toBe('#b4f071');
  });

  it('sets data-color-pkg="silver" on index.html', () => {
    const htmlPath = path.resolve(__dirname, '../index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toMatch(/<html[^>]*data-color-pkg="silver"/);
  });

  it('renders LoginView with data-color-pkg="silver" on the login card and container', () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia],
        stubs: {
          AuthForm: true,
        },
        mocks: {
          $router: { push: () => {} },
        },
      },
    });

    const page = wrapper.find('.login-page');
    expect(page.attributes('data-color-pkg')).toBe('silver');

    const card = wrapper.find('.login-card');
    expect(card.attributes('data-color-pkg')).toBe('silver');
  });

  it('makes all themes available in NavBar sitewide selector', () => {
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

    const select = wrapper.find('#nav-color-pkg-select');
    expect(select.exists()).toBe(true);
    const optionValues = select.findAll('option').map((o) => o.element.value);
    expect(optionValues).toContain('silver');
    expect(optionValues).toContain('dark-grey');
    expect(optionValues).toContain('emerald');
    expect(optionValues).toContain('azure');
    expect(optionValues).toContain('plum');
    expect(optionValues).toContain('copper');
    expect(optionValues).toContain('rust');
    expect(optionValues).toContain('oceanic');
    expect(optionValues).toContain('crimson');
    expect(optionValues).toContain('forest');
    expect(optionValues).toContain('indiglo');
    expect(optionValues).toContain('fire');
    expect(optionValues).toContain('lime');
    expect(optionValues).not.toContain('blues-greens');
  });

  it('makes all themes available in CharacterSheetsView character sheet theme selector', async () => {
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

    wrapper.vm.characters = [
      {
        id: 1,
        name: 'Themed Hero',
        race: 'Dawn Elves',
        psa: 'Combat',
        color_theme: 'silver',
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

    const select = wrapper.find('.select-char-theme');
    expect(select.exists()).toBe(true);
    const optionValues = select.findAll('option').map((o) => o.element.value);
    expect(optionValues).toContain(''); // Default (App Theme)
    expect(optionValues).toContain('silver');
    expect(optionValues).toContain('dark-grey');
    expect(optionValues).toContain('emerald');
    expect(optionValues).toContain('azure');
    expect(optionValues).toContain('plum');
    expect(optionValues).toContain('copper');
    expect(optionValues).toContain('rust');
    expect(optionValues).toContain('oceanic');
    expect(optionValues).toContain('crimson');
    expect(optionValues).toContain('forest');
    expect(optionValues).toContain('indiglo');
    expect(optionValues).toContain('fire');
    expect(optionValues).toContain('lime');
    expect(optionValues).not.toContain('blues-greens');

    // Scoped container receives data-color-pkg="silver"
    const sheetContainer = wrapper.find('.sheet-container');
    expect(sheetContainer.attributes('data-color-pkg')).toBe('silver');
  });
});
