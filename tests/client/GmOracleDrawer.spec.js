/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import fs from 'fs';
import path from 'path';
import GmOracleDrawer from '../src/components/oracle/GmOracleDrawer.vue';
import OracleControls from '../src/components/oracle/OracleControls.vue';
import OracleFeed from '../src/components/oracle/OracleFeed.vue';
import ArcAuthorModal from '../src/components/oracle/ArcAuthorModal.vue';

describe('GmOracleDrawer Component Suite', () => {
  const mockEnvironments = [
    { id: 1, name: 'UlvWylde: The Rime Wastes', description: 'Frozen tundra' },
    { id: 2, name: 'UlvWylde: The Ice Mire', description: 'Treacherous peat bog' },
  ];

  const mockArcs = [
    { id: 10, environment_id: 1, title: 'The Blood-Rime Conspiracy', synopsis: 'Blood mage plot', is_custom: 0 },
    { id: 11, environment_id: 1, title: 'Sanctum of the Warg-King', synopsis: 'Feral pack plot', is_custom: 0 },
    { id: 20, environment_id: 2, title: "The Necromancer's Essence Tithe", synopsis: 'Bog host plot', is_custom: 0 },
  ];

  const mockLogs = [
    {
      id: 101,
      environment_id: 1,
      arc_id: 10,
      source: 'engine',
      context_type: 'explore',
      text_content: 'Surveying the glacial trench, the howling wind bites deep.',
      created_at: new Date().toISOString(),
      arc_title: 'The Blood-Rime Conspiracy',
    },
    {
      id: 102,
      environment_id: 1,
      arc_id: 10,
      source: 'twist',
      context_type: 'combat',
      text_content: 'A fierce warg attacks! [TWIST]: The warg is a transformed shaman!',
      created_at: new Date().toISOString(),
      arc_title: 'The Blood-Rime Conspiracy',
    },
    {
      id: 103,
      environment_id: 1,
      arc_id: null,
      source: 'gm_manual',
      context_type: 'custom',
      text_content: 'The party rested by the basalt Menhir.',
      created_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url, options) => {
        if (url === '/api/oracle/init') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              environments: mockEnvironments,
              arcs: mockArcs,
              logs: mockLogs,
            }),
          });
        }
        if (url === '/api/oracle/generate') {
          const body = JSON.parse(options?.body || '{}');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: 999,
              environment_id: body.environmentId,
              arc_id: body.arcId,
              source: 'engine',
              context_type: body.contextType,
              text_content: `Procedural beat: ${body.directiveText || 'Encounter in the snow.'}`,
              created_at: new Date().toISOString(),
            }),
          });
        }
        if (url === '/api/oracle/log') {
          const body = JSON.parse(options?.body || '{}');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: 998,
              environment_id: body.environmentId,
              arc_id: body.arcId,
              source: 'gm_manual',
              context_type: body.contextType,
              text_content: body.textContent,
              created_at: new Date().toISOString(),
            }),
          });
        }
        if (url === '/api/oracle/share') {
          const body = JSON.parse(options?.body || '{}');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              shared: { text: body.textContent, sender: 'Game Master', timestamp: new Date().toISOString() },
            }),
          });
        }
        if (url === '/api/oracle/logs' && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Strict GM Access Guard', () => {
    it('does NOT render anything in the DOM when isGm is false', () => {
      const wrapper = mount(GmOracleDrawer, {
        props: {
          open: true,
          isGm: false,
        },
      });

      expect(wrapper.find('.gm-oracle-drawer').exists()).toBe(false);
      expect(wrapper.find('.oracle-drawer-backdrop').exists()).toBe(false);
      expect(wrapper.html()).toBe('<!--v-if-->');
    });

    it('does NOT render when open is false even if isGm is true', () => {
      const wrapper = mount(GmOracleDrawer, {
        props: {
          open: false,
          isGm: true,
        },
      });

      expect(wrapper.find('.gm-oracle-drawer').exists()).toBe(false);
      expect(wrapper.html()).toBe('<!--v-if-->');
    });

    it('renders the complete GM Oracle Drawer when isGm is true and open is true', async () => {
      const wrapper = mount(GmOracleDrawer, {
        props: {
          open: true,
          isGm: true,
        },
      });
      await flushPromises();

      expect(wrapper.find('.gm-oracle-drawer').exists()).toBe(true);
      expect(wrapper.find('.branding-title').text()).toContain('Narrative Oracle & Arc Engine');
      expect(wrapper.find('#oracle-env-select').exists()).toBe(true);
      expect(wrapper.find('#oracle-arc-select').exists()).toBe(true);
    });
  });

  describe('Narrative Arc Filtering & Selector Bar', () => {
    it('filters Narrative Arc dropdown to only Arcs matching the selected Environment', async () => {
      const wrapper = mount(GmOracleDrawer, {
        props: {
          open: true,
          isGm: true,
        },
      });
      await flushPromises();

      // Environment 1 is initially selected (Rime Wastes)
      const arcSelect = wrapper.find('#oracle-arc-select');
      let options = arcSelect.findAll('option');

      // 1 Sandbox option + 2 Rime Wastes arcs = 3 options
      expect(options).toHaveLength(3);
      expect(options[0].text()).toBe('[All / Sandbox]');
      expect(options[1].text()).toContain('The Blood-Rime Conspiracy');
      expect(options[2].text()).toContain('Sanctum of the Warg-King');

      // Change environment to Environment 2 (Ice Mire)
      wrapper.vm.selectedEnvironmentId = 2;
      wrapper.vm.onEnvironmentChanged();
      await flushPromises();

      options = wrapper.find('#oracle-arc-select').findAll('option');
      // 1 Sandbox option + 1 Ice Mire arc = 2 options
      expect(options).toHaveLength(2);
      expect(options[0].text()).toBe('[All / Sandbox]');
      expect(options[1].text()).toContain("The Necromancer's Essence Tithe");
    });

    it('displays the Arc synopsis banner when an active Arc is selected', async () => {
      const wrapper = mount(GmOracleDrawer, {
        props: {
          open: true,
          isGm: true,
        },
      });
      await flushPromises();

      // Initially [All / Sandbox] is selected, synopsis banner is not visible
      expect(wrapper.find('.arc-synopsis-banner').exists()).toBe(false);

      // Select Arc 10
      wrapper.vm.selectedArcId = 10;
      await flushPromises();

      expect(wrapper.find('.arc-synopsis-banner').exists()).toBe(true);
      expect(wrapper.find('.synopsis-text').text()).toBe('Blood mage plot');
    });
  });

  describe('GM Controls & Procedural Generation', () => {
    it('triggers procedural generation with directive override and outcome weight', async () => {
      const wrapper = mount(GmOracleDrawer, {
        props: {
          open: true,
          isGm: true,
        },
      });
      await flushPromises();

      // Set directive text
      const directiveInput = wrapper.find('#oracle-directive-input');
      await directiveInput.setValue('Giant Ambush on the Ice Bridge');

      // Select After Failure outcome
      const failureBtn = wrapper.find('.toggle-failure');
      await failureBtn.trigger('click');

      // Click Combat Beat context trigger
      const combatBtn = wrapper.find('.btn-combat');
      await combatBtn.trigger('click');
      await flushPromises();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/oracle/generate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            environmentId: 1,
            arcId: null,
            contextType: 'combat',
            resolutionOutcome: 'failure',
            directiveText: 'Giant Ambush on the Ice Bridge',
          }),
        })
      );
    });

    it('allows GM to write manual chronicle notes into the feed', async () => {
      const wrapper = mount(GmOracleDrawer, {
        props: {
          open: true,
          isGm: true,
        },
      });
      await flushPromises();

      const textarea = wrapper.find('#oracle-manual-notes');
      await textarea.setValue('The players established camp under the ruined menhir.');

      const addBtn = wrapper.find('.btn-save-manual');
      await addBtn.trigger('click');
      await flushPromises();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/oracle/log',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            environmentId: 1,
            arcId: null,
            textContent: 'The players established camp under the ruined menhir.',
            contextType: 'explore',
          }),
        })
      );
    });
  });

  describe('Chronicle Feed & Public Sharing', () => {
    it('renders color-coded cards for engine, twist, and manual entries', async () => {
      const wrapper = mount(GmOracleDrawer, {
        props: {
          open: true,
          isGm: true,
        },
      });
      await flushPromises();

      const cards = wrapper.findAll('.feed-card');
      expect(cards.length).toBeGreaterThanOrEqual(3);

      expect(wrapper.find('.card-engine').exists()).toBe(true);
      expect(wrapper.find('.card-twist').exists()).toBe(true);
      expect(wrapper.find('.card-manual').exists()).toBe(true);

      expect(wrapper.find('.card-twist').text()).toContain('TWIST');
    });

    it('calls /api/oracle/share when [Send to Public Chat] is clicked', async () => {
      const wrapper = mount(GmOracleDrawer, {
        props: {
          open: true,
          isGm: true,
        },
      });
      await flushPromises();

      const shareBtn = wrapper.find('.btn-share-chat');
      expect(shareBtn.exists()).toBe(true);
      await shareBtn.trigger('click');
      await flushPromises();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/oracle/share',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            textContent: mockLogs[0].text_content,
            source: 'engine',
          }),
        })
      );

      expect(wrapper.emitted('shared-to-chat')).toBeTruthy();
    });

    it('clears session logs when Clear Logs button is clicked', async () => {
      const wrapper = mount(GmOracleDrawer, {
        props: {
          open: true,
          isGm: true,
        },
      });
      await flushPromises();

      const clearBtn = wrapper.find('.btn-clear-feed');
      expect(clearBtn.exists()).toBe(true);
      await clearBtn.trigger('click');
      await flushPromises();

      expect(global.fetch).toHaveBeenCalledWith('/api/oracle/logs', { method: 'DELETE' });
      expect(wrapper.findAll('.feed-card')).toHaveLength(0);
    });
  });

  describe('Custom Arc Author Modal', () => {
    it('opens the ArcAuthorModal when + New Arc is clicked', async () => {
      const wrapper = mount(GmOracleDrawer, {
        props: {
          open: true,
          isGm: true,
        },
      });
      await flushPromises();

      expect(wrapper.find('.arc-author-modal').exists()).toBe(false);

      const newArcBtn = wrapper.find('.btn-new-arc');
      await newArcBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.arc-author-modal').exists()).toBe(true);
      expect(wrapper.find('#arc-author-title').text()).toContain('Write Custom Narrative Arc');
    });
  });

  describe('Integration with RpgVttView', () => {
    it('verifies RpgVttView integrates Narrative Oracle button and drawer for GM', () => {
      const vttPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
      const content = fs.readFileSync(vttPath, 'utf8');

      expect(content).toContain('btn-oracle');
      expect(content).toContain('Narrative Oracle');
      expect(content).toContain('<GmOracleDrawer');
      expect(content).toContain("showOracleDrawer = !showOracleDrawer");
      expect(content).toContain("socket.on('oracle:public_message'");
    });
  });
});
