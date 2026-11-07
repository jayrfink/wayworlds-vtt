# Skills Text Records, Column Alignment, and Add Skill Modal Implementation Plan

Transform the Skills & Experience records into clean text badges (like Inventory), balance the Skills & Inventory cards 50/50, align row columns using CSS Grid so the % Success badge is anchored at the exact same location across all records, and add an Add Skill catalog modal.

- **Spec:** [2026-11-07-skills-text-records-design.md](file:///Users/jrf/wayworlds-vtt/docs/superpowers/specs/2026-11-07-skills-text-records-design.md)
- **Branch:** `main`

---

## Tasks

### Task 1: Write Unit and Component Tests for New Skills Row Layout and Add Skill Modal (TDD Red)
- **File:** `client/test/skillsRecordLayout.test.js`
- **Actions:**
  1. Create tests verifying:
     - `.skills-card` and `.inventory-card` both have `min-height: 360px`.
     - `.skill-row` uses CSS Grid layout with aligned column tracks.
     - `.skill-row` contains `.skill-item-badge` with `.skill-name` and does not contain `<select class="select-official-skill">`.
     - `.skill-chance-badge` is rendered in column 3.
     - `showAddSkillModal` defaults to false, opening on `+ Add Skill` button click.
     - Add Skill modal lists available skills and allows adding a skill at Level 1.
  2. Run vitest on `test/skillsRecordLayout.test.js` and verify tests fail (RED).

### Task 2: Implement Skills Text Records and CSS Grid Column Alignment
- **File:** `client/src/views/CharacterSheetsView.vue`
- **Actions:**
  1. In the Skills template:
     - Replace `<div class="skill-main-select">...<select>...</select>...</div>` with:
       ```html
       <div class="skill-item-badge">
         <span class="skill-name">{{ skill.name }}</span>
         <span class="skill-psa-tag">({{ getSkillPSA(skill.name) }})</span>
       </div>
       <span class="skill-chance-badge" title="Calculated Success Chance">
         {{ getSkillSuccessChance(skill) }}%
       </span>
       ```
  2. In the CSS:
     - Enforce `min-height: 360px;` on `.skills-card`.
     - Style `.skill-row` with CSS Grid: `display: grid; grid-template-columns: 16px 1fr 54px 146px 36px 18px; align-items: center; gap: 8px; min-height: 28px; padding: 3px 6px; box-sizing: border-box;`.
     - Style `.skill-item-badge`, `.skill-name`, and `.skill-psa-tag` to match `.inventory-item-badge`.
     - Ensure `.skill-chance-badge` has fixed width and centered text.
  3. Add `getSkillPSA(skillName)` helper method in `methods`.

### Task 3: Implement Add Skill Catalog Modal
- **File:** `client/src/views/CharacterSheetsView.vue`
- **Actions:**
  1. Add modal state to `data()`: `showAddSkillModal: false`, `skillSearchQuery: ''`, `activeSkillCategory: 'All'`, `skillCategories: ['All', 'Martial', 'Mystic', 'Theurgy']`.
  2. Add computed property `filteredAvailableSkills` that filters `OFFICIAL_SKILLS` by category and search query.
  3. Add methods `openAddSkillModal()`, `addSkillFromModal(skillName)`, `isSkillLearned(skillName)`, `getLearnedSkillLevel(skillName)`.
  4. In template, wire `+ Add Skill` button to `openAddSkillModal`.
  5. Add modal markup for `showAddSkillModal` with catalog listing, PSA tags, governing stats, and Add / Learned buttons.
  6. Add CSS for `.skill-modal`, `.skill-catalog-list`, `.skill-catalog-item`, etc.

### Task 4: Run Tests, Verify Existing Test Suite, and Production Build
- **Actions:**
  1. Run `test/skillsRecordLayout.test.js` and verify it passes (GREEN).
  2. Run `test/CharacterSheetsView.test.js` to ensure existing drag/reorder/XP upgrade tests continue to pass.
  3. Run entire client vitest suite across all 54+ test files.
  4. Run `npm run build`.
  5. Commit and push changes to `main`.
