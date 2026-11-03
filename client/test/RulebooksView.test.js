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

  describe('Rulebooks View Layout', () => {
    it('renders Quick Reference Tables directly without redundant top row', async () => {
      const html = await renderView();

      // Top redundant mode-toggle row is removed
      expect(html).not.toContain('top-nav-bar');
      expect(html).not.toContain('mode-toggle');
      expect(html).not.toContain('mode-btn');

      // Category navigation tabs from the second row are present
      expect(html).toContain('Ranged Weapon Combat');
      expect(html).toContain('Melee Combat');
      expect(html).toContain('Overland');
      expect(html).toMatch(/Filter rules &(amp;)?\s*tables\.\.\./);

      // Old PDF / text reader elements are completely gone
      expect(html).not.toContain('pdf-iframe');
      expect(html).not.toContain('pdf-sidebar');
      expect(html).not.toContain('Search PDF rulebooks');
    });

    it('renders Overland when initialCategory or initialViewMode is overland', async () => {
      const html = await renderView({ initialCategory: 'overland' });

      // Renders horse movement rules table
      expect(html).toContain('Mounts &amp; Overland Movement');
      expect(html).toContain('Horse Movement (Riding Horse)');
      expect(html).toContain('50 ft / Action (Dash: 100 ft)');
      expect(html).toContain('4 mph (24–32 miles / day); Gallop: 8 mph');
      expect(html).toContain('1 Rider + 250 lbs cargo');
      expect(html).toContain('Rider shares mount movement');

      // No redundant top navbar row
      expect(html).not.toContain('top-nav-bar');
    });
  });
});
