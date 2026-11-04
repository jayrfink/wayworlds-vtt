import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  COLOR_PACKAGES,
  DEFAULT_COLOR_PACKAGE,
  COLOR_PKG_STORAGE_KEY,
  isValidColorPackage,
  getSavedColorPackage,
  applyColorPackage,
  initColorPackage,
} from '../src/utils/themeManager.js';

describe('Sitewide Font Family (Modesto Headings & Inherited Body - Roboto)', () => {
  const indexHtmlPath = path.resolve(__dirname, '../index.html');
  const mainCssPath = path.resolve(__dirname, '../src/main.css');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  const mainCss = fs.readFileSync(mainCssPath, 'utf-8');

  it('loads Roboto from Google Fonts in index.html', () => {
    expect(indexHtml).toMatch(/fonts\.googleapis\.com\/css2\?family=.*Roboto/);
    expect(indexHtml).toMatch(/rel=["']preconnect["']\s+href=["']https:\/\/fonts\.googleapis\.com["']/);
  });

  it('defines local @font-face rules for offline and local serving in main.css', () => {
    expect(mainCss).toMatch(/@font-face\s*\{[^}]*font-family:\s*['"]Roboto['"][^}]*src:\s*url\(['"]\/fonts\/Roboto-Regular\.ttf['"]\)/);
    expect(mainCss).toMatch(/@font-face\s*\{[^}]*font-family:\s*['"]Roboto['"][^}]*src:\s*url\(['"]\/fonts\/Roboto-Bold\.ttf['"]\)/);
  });

  it('defines local @font-face rules for Modesto header font in main.css', () => {
    expect(mainCss).toMatch(/@font-face\s*\{[^}]*font-family:\s*['"]Modesto['"][^}]*src:\s*url\(['"]\/fonts\/Modesto-Regular\.otf['"]\)/);
    expect(mainCss).toMatch(/@font-face\s*\{[^}]*font-family:\s*['"]Modesto['"][^}]*src:\s*url\(['"]\/fonts\/Modesto-Bold\.otf['"]\)/);
  });

  it('sets Modesto font styles on application titles, window headers, movable character sheet banners, and character tier badges in main.css', () => {
    expect(mainCss).toMatch(/--font-family-header:\s*['"]?Modesto Condensed['"]?,\s*['"]?Modesto['"]?/);
    expect(mainCss).toMatch(/h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6[\s\S]*?\.badge-tier[\s\S]*?\{[^}]*font-family:\s*var\(--font-family-header\)/);
  });

  it('sets Modesto header font on brand title in NavBar.vue and character tier badges in CharacterSheetsView.vue', () => {
    const navBarPath = path.resolve(__dirname, '../src/components/NavBar.vue');
    const navBarContent = fs.readFileSync(navBarPath, 'utf-8');
    expect(navBarContent).toMatch(/\.navbar-brand\s*\{[^}]*font-family:\s*var\(--font-family-header/);

    const charSheetsPath = path.resolve(__dirname, '../src/views/CharacterSheetsView.vue');
    const charSheetsContent = fs.readFileSync(charSheetsPath, 'utf-8');
    expect(charSheetsContent).toMatch(/\.badge-tier\s*\{[^}]*font-family:\s*var\(--font-family-header/);
    expect(charSheetsContent).toMatch(/\.traits-badge\s*\{[^}]*font-family:\s*var\(--font-family-header/);
  });

  it('defines 10% larger font sizes for headings in main.css', () => {
    expect(mainCss).toMatch(/h1\s*\{[^}]*font-size:\s*2\.2rem;/);
    expect(mainCss).toMatch(/h2\s*\{[^}]*font-size:\s*1\.65rem;/);
    expect(mainCss).toMatch(/h3\s*\{[^}]*font-size:\s*1\.3rem;/);
    expect(mainCss).toMatch(/h4\s*\{[^}]*font-size:\s*1\.1rem;/);
  });

  it('sets Roboto as the primary font-family on body in main.css', () => {
    expect(mainCss).toMatch(/font-family:\s*[^;]*['"]?Roboto['"]?[^;]*;/);
    expect(mainCss).toMatch(/body\s*\{[^}]*font-family:\s*[^;]*['"]?Roboto['"]?[^;]*;/);
  });

  it('ensures form controls inherit the sitewide font family', () => {
    expect(mainCss).toMatch(/button\s*\{[^}]*font-family:\s*inherit;/);
    expect(mainCss).toMatch(/(?:input|select|textarea)[^{]*\{[^}]*font-family:\s*inherit;/);
  });
});

describe('Permanent Dark UI Backdrop & data-color-pkg Theme Switcher', () => {
  const mainCssPath = path.resolve(__dirname, '../src/main.css');
  const mainCss = fs.readFileSync(mainCssPath, 'utf-8');

  it('enforces permanent dark UI backdrop (#0d0f12 main, #14171c panels, #1c2026 inputs) with zero light theme options', () => {
    expect(mainCss).toMatch(/--bg-main:\s*#0d0f12;/);
    expect(mainCss).toMatch(/--bg-panel:\s*#14171c;/);
    expect(mainCss).toMatch(/--bg-input:\s*#1c2026;/);
    expect(mainCss).toMatch(/--bg-primary:\s*#0d0f12;/);
    expect(mainCss).toMatch(/--bg-secondary:\s*#14171c;/);
    expect(mainCss).not.toMatch(/color-scheme:\s*light/i);
  });

  it('defines all 13 data-color-pkg theme packages (silver, dark-grey, emerald, azure, plum, copper, rust, oceanic, crimson, forest, indiglo, fire, lime) in main.css', () => {
    expect(mainCss).toMatch(/\[data-color-pkg="silver"\]\s*\{[\s\S]*?--widget-color:\s*#7d8590;[\s\S]*?--border-color:\s*#484f58;[\s\S]*?--widget-track:\s*#161b22;/);
    expect(mainCss).toMatch(/\[data-color-pkg="dark-grey"\]\s*\{[\s\S]*?--widget-color:\s*#545d68;[\s\S]*?--border-color:\s*#30363d;[\s\S]*?--widget-track:\s*#111418;/);
    expect(mainCss).toMatch(/\[data-color-pkg="emerald"\]\s*\{[\s\S]*?--widget-color:\s*#1b7a4d;[\s\S]*?--border-color:\s*#0d3822;[\s\S]*?--widget-track:\s*#081a10;/);
    expect(mainCss).toMatch(/\[data-color-pkg="azure"\]\s*\{[\s\S]*?--widget-color:\s*#4cb2d4;[\s\S]*?--border-color:\s*#347b93;[\s\S]*?--widget-track:\s*#1c4452;/);
    expect(mainCss).not.toMatch(/\[data-color-pkg="blues-greens"\]/);
    expect(mainCss).toMatch(/\[data-color-pkg="plum"\]\s*\{[\s\S]*?--widget-color:\s*#bc3846;[\s\S]*?--border-color:\s*#72222a;[\s\S]*?--widget-track:\s*#2d0b0f;/);
    expect(mainCss).toMatch(/\[data-color-pkg="copper"\]\s*\{[\s\S]*?--widget-color:\s*#d46a2b;[\s\S]*?--border-color:\s*#853146;[\s\S]*?--widget-track:\s*#1f090f;/);
    expect(mainCss).toMatch(/\[data-color-pkg="rust"\]\s*\{[\s\S]*?--widget-color:\s*#7f513e;[\s\S]*?--border-color:\s*#543325;[\s\S]*?--widget-track:\s*#180e0a;/);
    expect(mainCss).toMatch(/\[data-color-pkg="oceanic"\]\s*\{[\s\S]*?--widget-color:\s*#27b3a7;[\s\S]*?--border-color:\s*#186d66;[\s\S]*?--widget-track:\s*#092522;/);
    expect(mainCss).toMatch(/\[data-color-pkg="crimson"\]\s*\{[\s\S]*?--widget-color:\s*#b3273a;[\s\S]*?--border-color:\s*#6d1823;[\s\S]*?--widget-track:\s*#25090d;/);
    expect(mainCss).toMatch(/\[data-color-pkg="forest"\]\s*\{[\s\S]*?--widget-color:\s*#3dd465;[\s\S]*?--border-color:\s*#1d8639;[\s\S]*?--widget-track:\s*#092511;/);
    expect(mainCss).toMatch(/\[data-color-pkg="indiglo"\]\s*\{[\s\S]*?--widget-color:\s*#2d798a;[\s\S]*?--border-color:\s*#1b4a55;[\s\S]*?--widget-track:\s*#0b1e23;/);
    expect(mainCss).toMatch(/\[data-color-pkg="fire"\]\s*\{[\s\S]*?--widget-color:\s*#fa982f;[\s\S]*?--border-color:\s*#7a4c1a;[\s\S]*?--widget-track:\s*#251709;/);
    expect(mainCss).toMatch(/\[data-color-pkg="lime"\]\s*\{[\s\S]*?--widget-color:\s*#bdff7a;[\s\S]*?--border-color:\s*#578f1e;[\s\S]*?--widget-track:\s*#172509;/);
  });

  it('applies --widget-color to checkboxes, radios, and range inputs in main.css', () => {
    expect(mainCss).toMatch(/input\[type="checkbox"\][\s\S]*?accent-color:\s*var\(--widget-color/);
  });

  it('switches and persists data-color-pkg via themeManager.js', () => {
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = String(v); },
    };
    const attrs = {};
    globalThis.document = {
      documentElement: {
        setAttribute: (k, v) => { attrs[k] = v; },
        getAttribute: (k) => attrs[k],
      },
      body: {
        setAttribute: (k, v) => { attrs[`body_${k}`] = v; },
      },
    };

    expect(COLOR_PACKAGES.map((p) => p.key)).toEqual([
      'silver',
      'dark-grey',
      'emerald',
      'azure',
      'plum',
      'copper',
      'rust',
      'oceanic',
      'crimson',
      'forest',
      'indiglo',
      'fire',
      'lime',
    ]);
    expect(DEFAULT_COLOR_PACKAGE).toBe('silver');
    expect(isValidColorPackage('silver')).toBe(true);
    expect(isValidColorPackage('dark-grey')).toBe(true);
    expect(isValidColorPackage('emerald')).toBe(true);
    expect(isValidColorPackage('azure')).toBe(true);
    expect(isValidColorPackage('plum')).toBe(true);
    expect(isValidColorPackage('copper')).toBe(true);
    expect(isValidColorPackage('rust')).toBe(true);
    expect(isValidColorPackage('oceanic')).toBe(true);
    expect(isValidColorPackage('crimson')).toBe(true);
    expect(isValidColorPackage('forest')).toBe(true);
    expect(isValidColorPackage('indiglo')).toBe(true);
    expect(isValidColorPackage('fire')).toBe(true);
    expect(isValidColorPackage('lime')).toBe(true);
    expect(isValidColorPackage('oranges-maroon')).toBe(true);
    expect(isValidColorPackage('blues-greens')).toBe(false);
    expect(isValidColorPackage('light-mode')).toBe(false);

    // Initialize defaults to silver
    expect(initColorPackage()).toBe('silver');
    expect(attrs['data-color-pkg']).toBe('silver');

    // Switch to copper
    expect(applyColorPackage('copper')).toBe('copper');
    expect(store[COLOR_PKG_STORAGE_KEY]).toBe('copper');
    expect(attrs['data-color-pkg']).toBe('copper');
    expect(getSavedColorPackage()).toBe('copper');

    // Invalid key falls back to silver
    expect(applyColorPackage('invalid-theme')).toBe('silver');
    expect(attrs['data-color-pkg']).toBe('silver');
  });
});
