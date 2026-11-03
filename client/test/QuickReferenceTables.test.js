/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import QuickReferenceTables from '../src/components/QuickReferenceTables.vue';

describe('QuickReferenceTables.vue', () => {
  async function renderComponent(props = {}) {
    const app = createSSRApp(QuickReferenceTables, props);
    const html = await renderToString(app);
    return html;
  }

  it('renders both category tabs and search input', async () => {
    const html = await renderComponent();
    expect(html).toContain('Ranged Weapon Combat');
    expect(html).toContain('Melee Combat');
    expect(html).toMatch(/Filter rules &(amp;)?\s*tables\.\.\./);
  });

  describe('Ranged Combat Tab', () => {
    it('renders turn sequence, fantasy ranged weapons, modifiers, and armor/shields', async () => {
      const html = await renderComponent({ initialCategory: 'ranged' });

      // Turn sequence
      expect(html).toContain('Turn Sequence');
      expect(html).toContain('Initiative');

      // Ranged weapons
      expect(html).toContain('Ranged Weapons');
      expect(html).toContain('Shortbow');
      expect(html).toContain('Longbow');
      expect(html).toContain('Heavy Crossbow');
      expect(html).toContain('RoF');

      // Modifiers
      expect(html).toContain('To-Hit Modifiers');
      expect(html).toContain('Point Blank range');
      expect(html).toContain('+10%');
      expect(html).toContain('Careful Aim');

      // Armor, Shields & Wards
      expect(html).toMatch(/Armor, Shields &(amp;)? Wards/);
      expect(html).toContain('Light Armor');
      expect(html).toContain('Full Plate');
    });
  });

  describe('Melee Combat Tab', () => {
    it('renders base hit formula banner, unarmed combat, weapons, and modifiers', async () => {
      const html = await renderComponent({ initialCategory: 'melee' });

      // Formula callout
      expect(html).toContain('1/2 STR');
      expect(html).toContain('Melee Weapons Skill Rank');

      // Unarmed combat table
      expect(html).toContain('Unarmed Combat');
      expect(html).toContain('40 - 49 (Baseline)');
      expect(html).toContain('80+');
      expect(html).toContain('Punch Damage');
      expect(html).toContain('Kick Damage');

      // Melee weapons
      expect(html).toContain('Melee Weapons');
      expect(html).toContain('Broadsword / Longsword');
      expect(html).toContain('Greatsword / Greataxe / Maul');
      expect(html).toContain('Special Properties');

      // Melee modifiers
      expect(html).toContain('Melee Modifiers');
      expect(html).toContain('Charging Attack');
      expect(html).toContain('Flanking / Rear Attack');
    });
  });

  describe('Search Filter', () => {
    it('filters tables based on search query', async () => {
      const html = await renderComponent({
        initialCategory: 'ranged',
        initialSearch: 'Crossbow'
      });

      expect(html).toContain('Crossbow');
      expect(html).not.toContain('Shortbow');
    });

    it('shows no-results state when search yields no matches', async () => {
      const html = await renderComponent({
        initialCategory: 'ranged',
        initialSearch: 'NonExistentTermXYZ'
      });

      expect(html).toContain('No matching rules or tables found');
    });
  });
});
