import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('VTT Dice and Roll Banners Layering', () => {
  const rpgViewPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const spaceViewPath = path.resolve(__dirname, '../src/views/WorldVttView.vue');
  const rpgContent = fs.readFileSync(rpgViewPath, 'utf8');
  const spaceContent = fs.readFileSync(spaceViewPath, 'utf8');

  function extractZIndex(content, selector) {
    // If inline style: id="dice-box" ... z-index: (\d+)
    if (selector.startsWith('#')) {
      const match = content.match(new RegExp(`id="${selector.slice(1)}"[^>]*style="[^"]*z-index:\\s*(\\d+)`));
      if (match) return parseInt(match[1], 10);
    }
    // If CSS rule: .selector { ... z-index: (\d+); ... }
    const cssMatch = content.match(new RegExp(`\\${selector}\\s*\\{[^}]*z-index:\\s*(\\d+)`, 's'));
    if (cssMatch) return parseInt(cssMatch[1], 10);
    return null;
  }

  describe('RPG VTT View', () => {
    it('sets #dice-box z-index higher than all page widgets', () => {
      const diceZ = extractZIndex(rpgContent, '#dice-box');
      const rollLogZ = extractZIndex(rpgContent, '.roll-log-hud');
      const toolbarZ = extractZIndex(rpgContent, '.vtt-toolbar');
      const popoverZ = extractZIndex(rpgContent, '.dmg-popover');

      expect(diceZ).toBeGreaterThan(rollLogZ);
      expect(diceZ).toBeGreaterThan(toolbarZ);
      expect(diceZ).toBeGreaterThan(popoverZ);
      expect(diceZ).toBe(200);
    });

    it('sets damage and percentile HUD banners z-index higher than #dice-box', () => {
      const diceZ = extractZIndex(rpgContent, '#dice-box');
      const damageHudZ = extractZIndex(rpgContent, '.damage-hud-banner');
      const percentileHudZ = extractZIndex(rpgContent, '.percentile-hud-banner');

      expect(damageHudZ).toBeGreaterThan(diceZ);
      expect(percentileHudZ).toBeGreaterThan(diceZ);
      expect(damageHudZ).toBe(250);
      expect(percentileHudZ).toBe(250);
    });

    it('guarantees pointer-events: none !important on #dice-box, canvas, and children to keep VTT responsive', () => {
      expect(rpgContent).toContain('pointer-events: none !important;');
      expect(rpgContent).toMatch(/#dice-box[^\{]*\{[^}]*pointer-events:\s*none\s*!important;/s);
    });

    it('ensures clearDice resets HUDs, aborts active roll, and clears queue immediately', () => {
      const clearDiceFnMatch = rpgContent.match(/async function clearDice\(\)\s*\{([\s\S]*?)\n\}/);
      expect(clearDiceFnMatch).toBeTruthy();
      const fnBody = clearDiceFnMatch[1];
      expect(fnBody).toContain('abortCurrentRoll()');
      expect(fnBody).toContain('diceRollQueue.clear()');
      expect(fnBody).toContain('showPercentileHud.value = false');
      expect(fnBody).toContain('showDamageHud.value = false');
      expect(fnBody).toContain('showInitiativeHud.value = false');
      // Must NOT await getReadyDiceBox() just to clear
      expect(fnBody).not.toContain('await getReadyDiceBox()');
      // Must NOT perform raw WebGL buffer clears which cause whiteouts
      expect(fnBody).not.toContain('gl.clear');
    });
  });

  describe('World VTT View', () => {
    it('does not have #dice-box or roll HUD banners (dice exclusive to RPG VTT)', () => {
      expect(spaceContent).not.toContain('<div id="dice-box"');
      expect(spaceContent).not.toContain('class="damage-hud-banner"');
      expect(spaceContent).not.toContain('class="percentile-hud-banner"');
    });
  });
});
