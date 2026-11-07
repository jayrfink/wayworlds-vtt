import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Die Roll Results use site ColorScheme', () => {
  const rpgPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const worldPath = path.resolve(__dirname, '../src/views/WorldVttView.vue');
  const rpgContent = fs.readFileSync(rpgPath, 'utf8');
  const worldContent = fs.readFileSync(worldPath, 'utf8');

  describe('RpgVttView Die Roll Results', () => {
    it('does not bind inline styles with activeDiceColors on damage, percentile, initiative HUD banners, or d10s buttons', () => {
      // Banners and buttons should use scoped CSS variables, avoiding dynamic inline styles for better performance & contrast
      expect(rpgContent).not.toMatch(/class="damage-hud-banner"[^>]*:style/);
      expect(rpgContent).not.toMatch(/class="percentile-hud-banner"[^>]*:style/);
      expect(rpgContent).not.toMatch(/class="init-die-box init-player-die"[^>]*:style/);
      expect(rpgContent).not.toMatch(/class="init-die-box init-opp-die"[^>]*:style/);
      expect(rpgContent).not.toMatch(/class="btn-tool btn-dmg-main"[^>]*:style/);
      expect(rpgContent).not.toMatch(/class="btn-roll-dmg-action"[^>]*:style/);
    });

    it('styles damage-hud-banner with site theme variables', () => {
      expect(rpgContent).toMatch(/\.damage-hud-banner\s*\{[^}]*border:\s*2px solid var\(--theme-bright/);
      expect(rpgContent).toMatch(/\.damage-hud-banner\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(rpgContent).toMatch(/\.damage-hud-banner \.hud-total\s*\{[^}]*color:\s*var\(--theme-bright/);
    });

    it('styles percentile-hud-banner with site theme variables', () => {
      expect(rpgContent).toMatch(/\.percentile-hud-banner\s*\{[^}]*border:\s*2px solid var\(--theme-bright/);
      expect(rpgContent).toMatch(/\.percentile-hud-banner\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(rpgContent).toMatch(/\.percentile-hud-banner \.hud-total\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(rpgContent).toMatch(/\.percentile-hud-banner \.hud-tens-val\s*\{[^}]*color:\s*var\(--theme-bright/);
    });

    it('styles initiative HUD with site theme variables', () => {
      expect(rpgContent).toMatch(/\.initiative-hud-banner\s*\{[^}]*border:\s*2px solid var\(--theme-bright/);
      expect(rpgContent).toMatch(/\.init-player-die\s*\{[^}]*border:\s*2px solid var\(--theme-bright/);
      expect(rpgContent).toMatch(/\.init-player-die\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(rpgContent).toMatch(/\.init-opp-die\s*\{[^}]*border:\s*2px solid var\(--theme-accent/);
      expect(rpgContent).toMatch(/\.init-opp-die\s*\{[^}]*color:\s*var\(--theme-accent/);
      expect(rpgContent).toMatch(/\.init-opp-die\s*\{[^}]*background:\s*var\(--theme-btn-bg/);
    });

    it('styles VTT toolbar buttons with high-contrast theme variables', () => {
      expect(rpgContent).toMatch(/\.vtt-toolbar button\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(rpgContent).toMatch(/\.vtt-toolbar button:hover\s*\{[^}]*color:\s*var\(--theme-bright-hover/);
      expect(rpgContent).toMatch(/\.vtt-toolbar > button\.active\s*\{[^}]*color:\s*var\(--theme-bright/);
    });

    it('styles d10s button and pop-out with site theme variables', () => {
      expect(rpgContent).toMatch(/\.btn-dmg-main\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(rpgContent).toMatch(/\.btn-dmg-step\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(rpgContent).toMatch(/\.btn-roll-dmg-action\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(rpgContent).toMatch(/\.dmg-popover-header\s*\{[^}]*color:\s*var\(--theme-bright/);
    });
  });

  describe('WorldVttView Die Roll Results', () => {
    it('does not bind inline styles with activeDiceColors on damage, percentile, initiative HUD banners, or d10s buttons', () => {
      expect(worldContent).not.toMatch(/class="damage-hud-banner"[^>]*:style/);
      expect(worldContent).not.toMatch(/class="percentile-hud-banner"[^>]*:style/);
      expect(worldContent).not.toMatch(/class="init-die-box init-player-die"[^>]*:style/);
      expect(worldContent).not.toMatch(/class="init-die-box init-opp-die"[^>]*:style/);
      expect(worldContent).not.toMatch(/class="btn-tool btn-dmg-main"[^>]*:style/);
      expect(worldContent).not.toMatch(/class="btn-roll-dmg-action"[^>]*:style/);
    });

    it('styles damage-hud-banner with site theme variables', () => {
      expect(worldContent).toMatch(/\.damage-hud-banner\s*\{[^}]*border:\s*2px solid var\(--theme-bright/);
      expect(worldContent).toMatch(/\.damage-hud-banner\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(worldContent).toMatch(/\.damage-hud-banner \.hud-total\s*\{[^}]*color:\s*var\(--theme-bright/);
    });

    it('styles percentile-hud-banner with site theme variables', () => {
      expect(worldContent).toMatch(/\.percentile-hud-banner\s*\{[^}]*border:\s*2px solid var\(--theme-bright/);
      expect(worldContent).toMatch(/\.percentile-hud-banner\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(worldContent).toMatch(/\.percentile-hud-banner \.hud-total\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(worldContent).toMatch(/\.percentile-hud-banner \.hud-tens-val\s*\{[^}]*color:\s*var\(--theme-bright/);
    });

    it('styles initiative HUD with site theme variables', () => {
      expect(worldContent).toMatch(/\.initiative-hud-banner\s*\{[^}]*border:\s*2px solid var\(--theme-bright/);
      expect(worldContent).toMatch(/\.init-player-die\s*\{[^}]*border:\s*2px solid var\(--theme-bright/);
      expect(worldContent).toMatch(/\.init-player-die\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(worldContent).toMatch(/\.init-opp-die\s*\{[^}]*border:\s*2px solid var\(--theme-accent/);
      expect(worldContent).toMatch(/\.init-opp-die\s*\{[^}]*color:\s*var\(--theme-accent/);
      expect(worldContent).toMatch(/\.init-opp-die\s*\{[^}]*background:\s*var\(--theme-btn-bg/);
    });

    it('styles VTT toolbar buttons with high-contrast theme variables', () => {
      expect(worldContent).toMatch(/\.vtt-toolbar button\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(worldContent).toMatch(/\.vtt-toolbar button:hover\s*\{[^}]*color:\s*var\(--theme-bright-hover/);
      expect(worldContent).toMatch(/\.vtt-toolbar > button\.active\s*\{[^}]*color:\s*var\(--theme-bright/);
    });

    it('styles d10s button and pop-out with site theme variables', () => {
      expect(worldContent).toMatch(/\.btn-dmg-main\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(worldContent).toMatch(/\.btn-dmg-step\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(worldContent).toMatch(/\.btn-roll-dmg-action\s*\{[^}]*color:\s*var\(--theme-bright/);
      expect(worldContent).toMatch(/\.dmg-popover-header\s*\{[^}]*color:\s*var\(--theme-bright/);
    });
  });
});
