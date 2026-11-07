/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import fs from 'fs';
import path from 'path';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';

describe('Skills Text Records, Column Alignment, and Add Skill Modal', () => {
  const vuePath = path.resolve(__dirname, '../src/views/CharacterSheetsView.vue');
  const vueContent = fs.readFileSync(vuePath, 'utf-8');

  it('enforces min-height: 360px on both skills-card and inventory-card in two-column-lists', () => {
    // Both cards should have min-height: 360px to take balanced equal space
    expect(vueContent).toMatch(/\.two-column-lists\s+\.skills-card[\s\S]*?min-height:\s*360px/);
    expect(vueContent).toMatch(/\.two-column-lists\s+\.inventory-card[\s\S]*?min-height:\s*360px/);
  });

  it('styles .skill-row with CSS Grid column alignment and uniform height/padding', () => {
    expect(vueContent).toMatch(/\.skill-row\s*\{[^}]*display:\s*grid;/);
    expect(vueContent).toMatch(/\.skill-row\s*\{[^}]*grid-template-columns:/);
    expect(vueContent).toMatch(/\.skill-row\s*\{[^}]*min-height:\s*44px;/);
    expect(vueContent).toMatch(/\.skill-row\s*\{[^}]*padding:\s*4px\s+6px;/);
  });

  it('renders skill records as text badges that wrap cleanly without truncation', () => {
    expect(vueContent).not.toMatch(/<select[^>]*v-model="skill\.name"/);
    expect(vueContent).not.toMatch(/class="select-official-skill/);
    expect(vueContent).toMatch(/class="[^"]*skill-item-badge[^"]*"/);
    expect(vueContent).toMatch(/class="[^"]*skill-name[^"]*"/);

    // Verify wrapping CSS
    expect(vueContent).toMatch(/\.skill-item-badge\s*\{[^}]*flex-wrap:\s*wrap;/);
    expect(vueContent).toMatch(/\.skill-name\s*\{[^}]*white-space:\s*normal;/);
    expect(vueContent).toMatch(/\.skill-psa-tag\s*\{[^}]*white-space:\s*nowrap;/);
  });

  it('includes an Add Skill Catalog Modal with category tabs and search filter', () => {
    expect(vueContent).toMatch(/v-if="showAddSkillModal"/);
    expect(vueContent).toMatch(/class="[^"]*skill-modal[^"]*"/);
    expect(vueContent).toMatch(/openAddSkillModal/);
  });

  it('renders skill name as text, aligned success chance badge, and opens modal on + Add Skill', async () => {
    setActivePinia(createPinia());
    const origFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/characters') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 1,
              name: 'Lyra',
              race: 'Dawn Elf',
              psa: 'Martial',
              dex: 60,
              int: 50,
              skills: [
                { name: 'Melee Weapons', level: 2 },
                { name: 'Stealth & Secrecy', level: 1 },
              ],
              inventory: [],
            },
          ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    try {
      const wrapper = mount(CharacterSheetsView);
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Skill rows should render .skill-name text and .skill-chance-badge
      const skillRows = wrapper.findAll('.skill-row');
      expect(skillRows.length).toBe(2);

      const firstRow = skillRows[0];
      const nameEl = firstRow.find('.skill-name');
      expect(nameEl.exists()).toBe(true);
      expect(nameEl.text()).toBe('Melee Weapons');

      const chanceEl = firstRow.find('.skill-chance-badge');
      expect(chanceEl.exists()).toBe(true);
      expect(chanceEl.text()).toMatch(/\d+%/);

      // Verify no select in row
      expect(firstRow.find('select').exists()).toBe(false);

      // Verify + Add Skill button opens modal
      const addSkillBtn = wrapper.find('.btn-add-skill');
      expect(addSkillBtn.exists()).toBe(true);

      expect(wrapper.vm.showAddSkillModal).toBe(false);
      await addSkillBtn.trigger('click');
      expect(wrapper.vm.showAddSkillModal).toBe(true);

      const modal = wrapper.find('.skill-modal');
      expect(modal.exists()).toBe(true);
    } finally {
      global.fetch = origFetch;
    }
  });
});
