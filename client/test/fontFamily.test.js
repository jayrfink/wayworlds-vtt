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

  it('defines all 5 data-color-pkg theme packages (maroons, greens, blues, blues-greens, oranges-maroon) in main.css', () => {
    expect(mainCss).toMatch(/\[data-color-pkg="maroons"\]\s*\{[\s\S]*?--widget-color:\s*#853146;[\s\S]*?--border-color:\s*#521d2a;[\s\S]*?--widget-track:\s*#1f090f;/);
    expect(mainCss).toMatch(/\[data-color-pkg="greens"\]\s*\{[\s\S]*?--widget-color:\s*#2b8c42;[\s\S]*?--border-color:\s*#1f542b;[\s\S]*?--widget-track:\s*#131c15;/);
    expect(mainCss).toMatch(/\[data-color-pkg="blues"\]\s*\{[\s\S]*?--widget-color:\s*#4cb2d4;[\s\S]*?--border-color:\s*#347b93;[\s\S]*?--widget-track:\s*#1c4452;/);
    expect(mainCss).toMatch(/\[data-color-pkg="blues-greens"\]\s*\{[\s\S]*?--widget-color:\s*#4cb2d4;[\s\S]*?--border-color:\s*#2b8c42;[\s\S]*?--widget-track:\s*#131c15;/);
    expect(mainCss).toMatch(/\[data-color-pkg="oranges-maroon"\]\s*\{[\s\S]*?--widget-color:\s*#d46a2b;[\s\S]*?--border-color:\s*#853146;[\s\S]*?--widget-track:\s*#1f090f;/);
  });

  it('applies --widget-color to checkboxes, radios, range inputs, and scrollbars', () => {
    expect(mainCss).toMatch(/input\[type="checkbox"\][\s\S]*?accent-color:\s*var\(--widget-color/);
    expect(mainCss).toMatch(/\[data-color-pkg\]\s*\*\s*\{[\s\S]*?scrollbar-color:\s*var\(--widget-color\)\s*var\(--widget-track\);/);
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
      'maroons',
      'greens',
      'blues',
      'blues-greens',
      'oranges-maroon',
    ]);
    expect(DEFAULT_COLOR_PACKAGE).toBe('maroons');
    expect(isValidColorPackage('oranges-maroon')).toBe(true);
    expect(isValidColorPackage('light-mode')).toBe(false);

    // Initialize defaults to maroons
    expect(initColorPackage()).toBe('maroons');
    expect(attrs['data-color-pkg']).toBe('maroons');

    // Switch to oranges-maroon
    expect(applyColorPackage('oranges-maroon')).toBe('oranges-maroon');
    expect(store[COLOR_PKG_STORAGE_KEY]).toBe('oranges-maroon');
    expect(attrs['data-color-pkg']).toBe('oranges-maroon');
    expect(getSavedColorPackage()).toBe('oranges-maroon');

    // Invalid key falls back to maroons
    expect(applyColorPackage('invalid-theme')).toBe('maroons');
    expect(attrs['data-color-pkg']).toBe('maroons');
  });
});
