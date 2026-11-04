import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('RPG VTT Button Outer Borders Removed', () => {
  const rpgPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const rpgContent = fs.readFileSync(rpgPath, 'utf8');

  it('removes outer borders globally for all buttons in .vtt-view', () => {
    expect(rpgContent).toMatch(/\.vtt-view button,\s*\.vtt-view button:hover,\s*\.vtt-view button:active,\s*\.vtt-view button:focus\s*\{[^}]*border:\s*none\s*!important;/);
  });

  it('removes outer borders from .zoom-controls button', () => {
    expect(rpgContent).toMatch(/\.zoom-controls button\s*\{[^}]*border:\s*none\s*!important;/);
  });

  it('removes outer borders from GM, stock, deploy vehicle, and sidebar buttons', () => {
    expect(rpgContent).toMatch(/\.btn-gm,\s*\.btn-stock-encounter,\s*\.btn-deploy-vehicle,\s*\.btn-sidebar\s*\{[^}]*border:\s*none\s*!important;/);
    expect(rpgContent).toMatch(/\.btn-sidebar\.active\s*\{[^}]*border:\s*none\s*!important;/);
    expect(rpgContent).not.toMatch(/\.btn-gm,\s*\.btn-stock-encounter,\s*\.btn-deploy-vehicle,\s*\.btn-sidebar\s*\{[^}]*border:\s*1px solid/);
  });

  it('removes outer borders from .vtt-toolbar button and its active state', () => {
    expect(rpgContent).toMatch(/\.vtt-toolbar button\s*\{[^}]*border:\s*none\s*!important;/);
    expect(rpgContent).toMatch(/\.vtt-toolbar > button\.active\s*\{[^}]*border:\s*none\s*!important;/);
    expect(rpgContent).not.toMatch(/\.vtt-toolbar > button\.active\s*\{[^}]*border:\s*1px solid/);
  });

  it('removes outer borders from damage roller buttons (.btn-dmg-main and .btn-dmg-step)', () => {
    expect(rpgContent).toMatch(/\.btn-dmg-main\s*\{[^}]*border:\s*none\s*!important;/);
    expect(rpgContent).toMatch(/\.btn-dmg-step\s*\{[^}]*border:\s*none\s*!important;/);
  });

  it('removes outer borders from pill buttons (.btn-audio-toggle-pill and .btn-roll-log-pill)', () => {
    expect(rpgContent).toMatch(/\.btn-audio-toggle-pill\s*\{[^}]*border:\s*none\s*!important;/);
    expect(rpgContent).toMatch(/\.btn-roll-log-pill\s*\{[^}]*border:\s*none\s*!important;/);
    expect(rpgContent).not.toMatch(/\.btn-audio-toggle-pill\s*\{[^}]*border:\s*1px solid/);
    expect(rpgContent).not.toMatch(/\.btn-roll-log-pill\s*\{[^}]*border:\s*1px solid/);
  });

  it('removes outer borders from inspector and modal buttons', () => {
    expect(rpgContent).toMatch(/\.btn-add-token\s*\{[^}]*border:\s*none\s*!important;/);
    expect(rpgContent).toMatch(/\.btn-modal-cancel\s*\{[^}]*border:\s*none\s*!important;/);
    expect(rpgContent).toMatch(/\.btn-add-token-submit\s*\{[^}]*border:\s*none\s*!important;/);
  });
});
