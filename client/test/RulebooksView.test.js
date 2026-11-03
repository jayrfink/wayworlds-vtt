import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import RulebooksView from '../src/views/RulebooksView.vue';

describe('RulebooksView.vue', () => {
  async function renderView(props = {}) {
    const app = createSSRApp(RulebooksView, props);
    const html = await renderToString(app);
    return html;
  }

  describe('Default Tab (Quick Reference Tables)', () => {
    it('renders Quick Reference Tables view by default', async () => {
      const html = await renderView();

      // Top nav bar buttons
      expect(html).toContain('Quick Reference Tables');
      expect(html).toContain('Additional Rules');
      expect(html).not.toContain('PDF Rulebooks');

      // Quick reference tab is active
      expect(html).toMatch(/class="[^"]*(active\s+mode-btn|mode-btn\s+active)[^"]*"[^>]*>\s*Quick Reference Tables/);

      // Renders QuickReferenceTables component content
      expect(html).toContain('Ranged Weapon Combat');
      expect(html).toContain('Melee Combat');

      // Old PDF / text reader elements are completely gone
      expect(html).not.toContain('pdf-iframe');
      expect(html).not.toContain('pdf-sidebar');
      expect(html).not.toContain('Search PDF rulebooks');
    });
  });

  describe('Additional Rules Tab', () => {
    it('renders Additional Rules view when initialViewMode is additional', async () => {
      const html = await renderView({ initialViewMode: 'additional' });

      // Active button is Additional Rules
      expect(html).toMatch(/class="[^"]*(active\s+mode-btn|mode-btn\s+active)[^"]*"[^>]*>\s*Additional Rules/);

      // Renders horse movement rules table
      expect(html).toContain('Mounts &amp; Overland Movement');
      expect(html).toContain('Horse Movement (Riding Horse)');
      expect(html).toContain('50 ft / Action (Dash: 100 ft)');
      expect(html).toContain('4 mph (24–32 miles / day); Gallop: 8 mph');
      expect(html).toContain('1 Rider + 250 lbs cargo');
      expect(html).toContain('Rider shares mount movement');

      // PDF elements do not exist
      expect(html).not.toContain('pdf-iframe');
    });
  });
});
