import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('World VTT Toolbar and Marker Inspector match RPG VTT Styling', () => {
  const worldPath = path.resolve(__dirname, '../src/views/WorldVttView.vue');
  const rpgPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const worldContent = fs.readFileSync(worldPath, 'utf8');
  const rpgContent = fs.readFileSync(rpgPath, 'utf8');

  describe('World VTT Toolbar Styling matches RPG Toolbar', () => {
    it('applies border-free styling globally to buttons in .vtt-view', () => {
      expect(worldContent).toMatch(/\.vtt-view button,\s*\.vtt-view button:hover,\s*\.vtt-view button:active,\s*\.vtt-view button:focus\s*\{[^}]*border:\s*none\s*!important;/);
    });

    it('matches .vtt-toolbar container box-shadow', () => {
      expect(worldContent).toMatch(/\.vtt-toolbar\s*\{[^}]*box-shadow:\s*0\s+4px\s+12px\s+rgba\(0,\s*0,\s*0,\s*0\.3\);/);
    });

    it('removes outer borders from .vtt-toolbar button and its active state', () => {
      expect(worldContent).toMatch(/\.vtt-toolbar button\s*\{[^}]*border:\s*none\s*!important;/);
      expect(worldContent).toMatch(/\.vtt-toolbar > button\.active\s*\{[^}]*border:\s*none\s*!important;/);
      expect(worldContent).not.toMatch(/\.vtt-toolbar > button\.active\s*\{[^}]*border:\s*1px solid/);
      expect(worldContent).toMatch(/\.vtt-toolbar > button\.active\s*\{[^}]*box-shadow:\s*0\s+0\s+8px\s+var\(--theme-glow/);
    });

    it('removes outer borders from ping buttons (.btn-clear-ping and .btn-clear-all-pings)', () => {
      expect(worldContent).toMatch(/\.btn-clear-ping\s*\{[^}]*border:\s*none\s*!important;/);
      expect(worldContent).toMatch(/\.btn-clear-all-pings\s*\{[^}]*border:\s*none\s*!important;/);
    });

    it('removes outer borders from damage roller buttons (.btn-dmg-main and .btn-dmg-step)', () => {
      expect(worldContent).toMatch(/\.btn-dmg-main\s*\{[^}]*border:\s*none\s*!important;/);
      expect(worldContent).toMatch(/\.btn-dmg-step\s*\{[^}]*border:\s*none\s*!important;/);
      expect(worldContent).toMatch(/\.btn-roll-dmg-action\s*\{[^}]*border:\s*none\s*!important;/);
    });

    it('removes outer borders from fog-shape-btn and fog active states', () => {
      expect(worldContent).toMatch(/\.vtt-toolbar \.fog-shape-btn\.selected\s*\{[^}]*box-shadow:\s*0\s+0\s+6px\s+var\(--theme-glow/);
    });
  });

  describe('World Marker Inspector Styling matches RPG Token Inspector', () => {
    it('sets token-sidebar width to 320px in both normal and rolled-up states', () => {
      expect(worldContent).toMatch(/\.token-sidebar\s*\{[^}]*width:\s*320px;/);
      expect(worldContent).toMatch(/\.token-sidebar\.token-sidebar-rolled-up\s*\{[^}]*width:\s*320px;/);
    });

    it('styles .btn-add-token with black background, glow, and border: none !important', () => {
      expect(worldContent).toMatch(/\.btn-add-token\s*\{[^}]*border:\s*none\s*!important;/);
      expect(worldContent).toMatch(/\.btn-add-token\s*\{[^}]*background-color:\s*#000000\s*!important;/);
    });

    it('styles .btn-delete-token and .inspector-actions .danger with dark red styling', () => {
      expect(worldContent).toMatch(/\.btn-delete-token,\s*\.inspector-actions \.danger\s*\{[^}]*background:\s*#340c0e\s*!important;/);
      expect(worldContent).toMatch(/\.btn-delete-token,\s*\.inspector-actions \.danger\s*\{[^}]*color:\s*#f85149\s*!important;/);
      expect(worldContent).toMatch(/\.btn-delete-token,\s*\.inspector-actions \.danger\s*\{[^}]*border:\s*none\s*!important;/);
      expect(worldContent).toMatch(/\.btn-delete-token:hover:not\(:disabled\),\s*\.inspector-actions \.danger:hover:not\(:disabled\)\s*\{[^}]*background:\s*#4a1316\s*!important;/);
    });

    it('styles .btn-toggle-visibility without outer borders', () => {
      expect(worldContent).toMatch(/\.btn-toggle-visibility\s*\{[^}]*border:\s*none\s*!important;/);
      expect(worldContent).toMatch(/\.btn-toggle-visibility\.is-hidden\s*\{[^}]*border:\s*none\s*!important;/);
    });

    it('styles .section-box h4 with matching font size and bottom border', () => {
      expect(worldContent).toMatch(/\.section-box h4\s*\{[^}]*font-size:\s*15\.5px;/);
      expect(worldContent).toMatch(/\.section-box h4\s*\{[^}]*border-bottom:\s*1px solid var\(--border\);/);
    });

    it('styles select and text/number inputs in marker inspector with dark theme', () => {
      expect(worldContent).toMatch(/\.world-select,\s*\.world-select option\s*\{[^}]*background-color:\s*#000000\s*!important;/);
      expect(worldContent).toMatch(/\.token-inspector input\[type="text"\],\s*\.token-inspector input\[type="number"\]\s*\{[^}]*background-color:\s*#000000\s*!important;/);
    });

    it('styles active marker row in marker list', () => {
      expect(worldContent).toMatch(/\.map-list li\.active,\s*\.token-list li\.active\s*\{[^}]*border-color:\s*var\(--accent\);/);
    });

    it('styles .btn-launch-scene with border: none !important', () => {
      expect(worldContent).toMatch(/\.btn-launch-scene\s*\{[^}]*border:\s*none\s*!important;/);
    });
  });
});
