/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
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
    expect(html).toMatch(/Filter rules &(amp;)?\s*tables\.\.\./);
  });

  describe('Ranged Combat Tab', () => {
    it('renders turn sequence, weapons, modifiers, and armor', async () => {
      const html = await renderComponent({ initialCategory: 'ranged' });

      // Turn sequence
      expect(html).toContain('Turn Sequence');
      expect(html).toContain('Reaction Speed');

      // Ranged weapons
      expect(html).toContain('Ranged Weapons');
      expect(html).toContain('Laser Pistol');
      expect(html).toContain('Automatic Rifle');
      expect(html).toContain('Frag Grenade');
      expect(html).toContain('RoF');

      // Modifiers
      expect(html).toContain('To-Hit Modifiers');
      expect(html).toContain('Point Blank range');
      expect(html).toContain('+20%');
      expect(html).toContain('Careful Aim');

      // Armor & Screens
      expect(html).toMatch(/Armor &(amp;)? Screens/);
      expect(html).toContain('Skeinsuit');
      expect(html).toContain('Albedo Screen');
    });
  });

  describe('Melee Combat Tab', () => {
    it('renders base hit formula banner, unarmed combat, weapons, and modifiers', async () => {
      const html = await renderComponent({ initialCategory: 'melee' });

      // Formula callout
      expect(html).toContain('Higher of ceil(STR / 2)');

      // Unarmed combat table
      expect(html).toContain('Unarmed Combat');
      expect(html).toContain('STR 1-20');
      expect(html).toContain('STR 81+');
      expect(html).toContain('Punch Damage');
      expect(html).toContain('Kick Damage');

      // Melee weapons
      expect(html).toContain('Melee Weapons');
      expect(html).toContain('Vibroknife');
      expect(html).toContain('Stun Baton');
      expect(html).toContain('Special Properties');

      // Melee modifiers
      expect(html).toContain('Melee Modifiers');
      expect(html).toContain('Charging into melee');
      expect(html).toContain('Yazirian Battle Rage');
    });
  });

  describe('Search Filter', () => {
    it('filters tables based on search query', async () => {
      const html = await renderComponent({
        initialCategory: 'ranged',
        initialSearch: 'Gyrojet'
      });

      expect(html).toContain('Gyrojet');
      expect(html).not.toContain('Needler');
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
