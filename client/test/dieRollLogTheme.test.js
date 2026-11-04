import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Die Roll Logs match VTT Toolbar Colors and Glow Effects', () => {
  const rpgPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const spacePath = path.resolve(__dirname, '../src/views/WorldVttView.vue');
  const rpgContent = fs.readFileSync(rpgPath, 'utf8');
  const spaceContent = fs.readFileSync(spacePath, 'utf8');

  describe('RpgVttView Die Roll Log', () => {
    it('styles .roll-log-card with toolbar translucent background, blur, border, and shadow', () => {
      expect(rpgContent).toMatch(/\.roll-log-card\s*\{[^}]*background:\s*rgba\(22,\s*27,\s*34,\s*0\.92\);/);
      expect(rpgContent).toMatch(/\.roll-log-card\s*\{[^}]*backdrop-filter:\s*blur\(8px\);/);
      expect(rpgContent).toMatch(/\.roll-log-card\s*\{[^}]*border:\s*1px solid var\(--border\);/);
    });

    it('styles .roll-log-header with dark slate background and border-bottom', () => {
      expect(rpgContent).toMatch(/\.roll-log-header\s*\{[^}]*background:\s*rgba\(13,\s*17,\s*23,\s*0\.85\);/);
      expect(rpgContent).toMatch(/\.roll-log-header\s*\{[^}]*border-bottom:\s*1px solid var\(--border\);/);
    });

    it('styles .roll-log-title with toolbar text color and glow drop shadow', () => {
      expect(rpgContent).toMatch(/\.roll-log-title\s*\{[^}]*color:\s*#cecece;/);
      expect(rpgContent).toMatch(/\.roll-log-title\s*\{[^}]*text-shadow:\s*0 0 6px rgba\(206,\s*206,\s*206,\s*0\.4\);/);
    });

    it('styles .btn-roll-log-pill and .btn-audio-toggle-pill with toolbar colors and hover glow', () => {
      expect(rpgContent).toMatch(/\.btn-roll-log-pill\s*\{[^}]*color:\s*#cecece/);
      expect(rpgContent).toMatch(/\.btn-roll-log-pill:hover\s*\{[^}]*box-shadow:\s*0 0 10px rgba\(206,\s*206,\s*206,\s*0\.5\)/);
      expect(rpgContent).toMatch(/\.btn-audio-toggle-pill\s*\{[^}]*color:\s*#cecece/);
      expect(rpgContent).toMatch(/\.btn-audio-toggle-pill:hover\s*\{[^}]*box-shadow:\s*0 0 10px rgba\(206,\s*206,\s*206,\s*0\.5\)/);
    });

    it('styles .roll-log-item and badges with toolbar borders and glow effects', () => {
      expect(rpgContent).toMatch(/\.roll-log-item\s*\{[^}]*background:\s*rgba\(22,\s*27,\s*34,\s*0\.7\);/);
      expect(rpgContent).toMatch(/\.roll-log-item\.percentile\s*\{[^}]*border-left:\s*3px solid #cecece;/);
      expect(rpgContent).toMatch(/\.roll-item-badge\s*\{[^}]*color:\s*#cecece;[^}]*border:\s*1px solid var\(--border\);/);
      expect(rpgContent).toMatch(/\.roll-item-total\s*\{[^}]*color:\s*#cecece;[^}]*text-shadow:\s*0 0 8px rgba\(206,\s*206,\s*206,\s*0\.5\);/);
    });
  });

  describe('WorldVttView Die Roll Log', () => {
    it('styles .roll-log-card with toolbar translucent background, blur, and border', () => {
      expect(spaceContent).toMatch(/\.roll-log-card\s*\{[^}]*background:\s*rgba\(22,\s*27,\s*34,\s*0\.92\);/);
      expect(spaceContent).toMatch(/\.roll-log-card\s*\{[^}]*backdrop-filter:\s*blur\(8px\);/);
      expect(spaceContent).toMatch(/\.roll-log-card\s*\{[^}]*border:\s*1px solid var\(--border\);/);
    });

    it('styles .roll-log-header and .roll-log-title with toolbar styling and glow', () => {
      expect(spaceContent).toMatch(/\.roll-log-header\s*\{[^}]*background:\s*rgba\(13,\s*17,\s*23,\s*0\.85\);/);
      expect(spaceContent).toMatch(/\.roll-log-title\s*\{[^}]*color:\s*#cecece;/);
      expect(spaceContent).toMatch(/\.roll-log-title\s*\{[^}]*text-shadow:\s*0 0 6px rgba\(206,\s*206,\s*206,\s*0\.4\);/);
    });

    it('styles .btn-roll-log-pill with toolbar colors and hover glow', () => {
      expect(spaceContent).toMatch(/\.btn-roll-log-pill\s*\{[^}]*color:\s*#cecece/);
      expect(spaceContent).toMatch(/\.btn-roll-log-pill:hover\s*\{[^}]*box-shadow:\s*0 0 10px rgba\(206,\s*206,\s*206,\s*0\.5\)/);
    });
  });
});
