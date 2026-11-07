# Design Spec: Skills Text Records, Column Alignment, and Add Skill Modal

## Summary
Refactor the **Skills & Experience** list in `CharacterSheetsView.vue` so that skill records no longer use inline `<select>` form fields, but instead render clean text labels formatted after the Inventory records. Balance the **Skills & Experience** card and **Inventory** card to each take equal half-space (50/50) of the character sheet, enforce identical record sizes, align all columns top-to-bottom so the `% Success` value appears in the exact same location across all records, and introduce an **Add Skill Modal** for selecting and learning skills from the official catalog.

---

## 1. 50/50 Layout & Card Sizing

### 1.1 Two-Column List Container (`.two-column-lists`)
- Parent grid: `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px;`
- Both `.skills-card` and `.inventory-card`:
  - `min-height: 360px;`
  - `display: flex; flex-direction: column;`
- Scrollable list containers (`.skills-items-list` and `.inventory-items-list`):
  - Equal `max-height: 240px;` (or matched heights accounting for search box in inventory).
  - Consistent scrollbars and dark background tracks.

---

## 2. Text-Based Skill Records & Column Alignment

### 2.1 Replaced Form Field with Text Badge
In `CharacterSheetsView.vue`, replace:
```html
<div class="skill-main-select">
  <select v-model="skill.name" class="select-official-skill">...</select>
  <span class="skill-chance-badge">{{ getSkillSuccessChance(skill) }}%</span>
</div>
```
With a semantic text badge:
```html
<div class="skill-item-badge">
  <span class="skill-name">{{ skill.name }}</span>
  <span class="skill-psa-tag">({{ getSkillPSA(skill.name) }})</span>
</div>
<span class="skill-chance-badge" title="Calculated Success Chance">
  {{ getSkillSuccessChance(skill) }}%
</span>
```

### 2.2 CSS Grid Column Alignment
To ensure all columns line up pixel-perfect from top to bottom across records:
```css
.skill-row {
  display: grid;
  grid-template-columns: 16px 1fr 54px 146px 36px 18px;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 3px 6px;
  box-sizing: border-box;
}
```
Columns:
1. `16px` &rarr; Drag handle (`⋮⋮`)
2. `1fr` &rarr; Skill Name + PSA badge
3. `54px` &rarr; `% Success` badge (`XX%`), anchored at the exact same location on every row
4. `146px` &rarr; `level-wrap`: `Lvl:`, input, and fixed-width `+Lvl (X XP)` button (or spacer)
5. `36px` &rarr; Reorder arrows (`▲` / `▼`)
6. `18px` &rarr; Remove button (`✕`)

---

## 3. "+ Add Skill" Modal Dialog

### 3.1 Modal Behavior
- Clicking `+ Add Skill` sets `showAddSkillModal = true`.
- Renders `<div v-if="showAddSkillModal" class="modal-backdrop">` containing `modal-card skill-modal`.
- Header: "Available Skills Catalog" with close button `✕`.
- Body:
  - Search/filter input for skills.
  - Category tabs for PSA: All, Martial, Mystic, Theurgy.
  - List of official Wayworlds skills (from `OFFICIAL_SKILLS`). Each entry shows:
    - Skill name
    - PSA tag (Martial, Mystic, Theurgy)
    - Governing base chance attribute (e.g. Agility, Intellect, Melee Base)
    - Status: If the character already has the skill, shows "Learned (Lvl X)" with disabled button; otherwise shows "+ Learn / Add" button.
- Clicking "+ Learn / Add" pushes `{ name: skill.name, level: 1 }`, triggers `updateCharacter()`, and marks the skill as learned.
- "Done" button closes the modal.

---

## 4. Testing Plan

1. **Card Layout & Sizing**:
   - Both `.skills-card` and `.inventory-card` have `min-height: 360px;`.
   - Grid layout splits the two cards 50/50.
2. **Text Skills Records**:
   - Skill rows do not contain `<select class="select-official-skill">`.
   - Skill rows render `.skill-item-badge` with `.skill-name`.
   - `.skill-row` has `display: grid;` and aligned columns.
   - `% Success` chance badge exists as a top-level child of `.skill-row`.
3. **Add Skill Modal**:
   - Clicking `+ Add Skill` sets `showAddSkillModal = true`.
   - Adding a skill appends it to `selectedChar.skills` at Level 1 and invokes `updateCharacter()`.
