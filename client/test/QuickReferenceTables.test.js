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

  it('renders all three category tabs and search input', async () => {
    const html = await renderComponent();
    expect(html).toContain('Ranged Weapon Combat');
    expect(html).toContain('Melee Combat');
    expect(html).toContain('Overland');
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
    it('renders turn sequence, base hit formula banner, unarmed combat, weapons, and modifiers', async () => {
      const html = await renderComponent({ initialCategory: 'melee' });

      // Turn sequence
      expect(html).toContain('Turn Sequence');
      expect(html).toContain('Tactical Flow');
      expect(html).toContain('Close Distance &amp; Position');
      expect(html).toContain('Declare Melee Attack &amp; Maneuver');

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

  describe('Overland Tab', () => {
    it('renders horse movement rules and mounts table', async () => {
      const html = await renderComponent({ initialCategory: 'overland' });

      expect(html).toContain('Mounts &amp; Overland Movement');
      expect(html).toContain('Horse Movement (Riding Horse)');
      expect(html).toContain('50 ft / Action (Dash: 100 ft)');
      expect(html).toContain('4 mph (24–32 miles / day); Gallop: 8 mph');
      expect(html).toContain('1 Rider + 250 lbs cargo');
      expect(html).toContain('Rider shares mount movement');
    });
  });

  describe('Primary Attributes Tab', () => {
    it('renders attribute pairs, overview baseline formula, summary table, and resource pools', async () => {
      const html = await renderComponent({ initialCategory: 'attributes' });

      // Overview banner
      expect(html).toContain('Universal d100 Attribute Baseline &amp; Pair Shifting');
      expect(html).toContain('Baseline: 50');
      expect(html).toContain('Target % = ceil(Base Stat / 2) + (Skill Level x 10) + Lineage &amp; Gear Modifiers');

      // Summary table
      expect(html).toContain('Attributes Quick Reference');
      expect(html).toContain('STR');
      expect(html).toContain('STA');
      expect(html).toContain('DEX');
      expect(html).toContain('RS');
      expect(html).toContain('INT');
      expect(html).toContain('HIST/REL');
      expect(html).toContain('WIL');
      expect(html).toContain('PRE');

      // Pairs and cards
      expect(html).toContain('Strength / Stamina (STR / STA)');
      expect(html).toContain('Agility / Reflex Speed (DEX / RS)');
      expect(html).toContain('Intellect / History &amp; Religion (INT / HIST/REL)');
      expect(html).toContain('Willpower / Presence (WIL / PRE)');

      // Resource pools
      expect(html).toContain('Primary Resource Pools');
      expect(html).toContain('Stamina (STA)');
      expect(html).toContain('Essence (ESS)');
    });

    it('filters attributes tab based on search query', async () => {
      const html = await renderComponent({
        initialCategory: 'attributes',
        initialSearch: 'Willpower',
      });

      expect(html).toContain('Willpower');
      expect(html).not.toContain('Agility / Reflex Speed (DEX / RS)');
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
