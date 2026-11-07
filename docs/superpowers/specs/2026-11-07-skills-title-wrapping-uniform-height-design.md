# Design: Skills Title Wrapping with Uniform Record Heights

**Date**: 2026-11-07  
**Branch**: `main`  
**Status**: Approved by User  

## 1. Problem Statement
In the Character Sheets view, skill names inside `.skill-item-badge` currently use `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`. When skill titles are long (such as *Athletics & Acrobatics*, *Wilderness & Survival*, *Influence & Deception*, *Herbalism & Medicine*, or custom skills), portions of the title and the `(PSA)` tag are truncated with ellipsis. 

The user requested:
1. Wrap skill titles so the entire title is visible, borrowing the multi-line wrapping pattern used by Inventory item records.
2. Keep the record heights uniform across all skill rows so the list remains visually consistent without jagged height differences between single-line and two-line records.

## 2. Solution Architecture

### 2.1 CSS Layout & Wrapping for Skill Titles
Update `.skill-item-badge`, `.skill-name`, and `.skill-psa-tag` in `client/src/views/CharacterSheetsView.vue`:
- `.skill-item-badge`:
  - `min-width: 0;`
  - `display: flex;`
  - `flex-wrap: wrap;`
  - `align-items: baseline;`
  - `column-gap: 6px;`
  - `row-gap: 2px;`
  - `word-break: break-word;`
  - `overflow-wrap: anywhere;`
  - `line-height: 1.25;`
- `.skill-name`:
  - Remove `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`
  - Add `white-space: normal; word-break: break-word; overflow-wrap: anywhere; line-height: 1.25;`
- `.skill-psa-tag`:
  - `white-space: nowrap; line-height: 1.25; flex-shrink: 0;` ensures the badge `(Martial)`, `(Theurgy)`, or `(Mystic)` wraps as an intact unit.

### 2.2 Uniform Record Height & Vertical Alignment
Update `.skill-row` in `client/src/views/CharacterSheetsView.vue`:
- `display: grid;`
- `grid-template-columns: 16px 1fr 54px 146px 36px 18px;` (preserving existing locked column alignment)
- `align-items: center;` (centers drag handles, badges, inputs, buttons, and reorder controls vertically within the track)
- `min-height: 44px;` (provides a uniform 44px height that comfortably accommodates wrapped 2-line titles as well as 1-line titles with vertical centering)
- `padding: 4px 6px;`
- `box-sizing: border-box;`
- `flex-shrink: 0;`

## 3. Impact & Testing Strategy
- Update / add assertions in `client/test/skillsRecordLayout.test.js`:
  - Verify `.skill-row` has `min-height: 44px;`.
  - Verify `.skill-item-badge` has `flex-wrap: wrap;`.
  - Verify `.skill-name` has `white-space: normal;`.
  - Verify `.skill-psa-tag` has `white-space: nowrap;`.
- Run Vitest suite to ensure all tests pass cleanly without regression.
