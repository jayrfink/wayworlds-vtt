# Tracker Delta Buttons Uniform Width Implementation Plan

Apply uniform 70px width to all tracker delta action buttons (`- Dmg`, `+ Heal`, `- Spend`, `+ Charge`, `+ Award`) across Stamina, Essence, and XP trackers in the Character Sheets view.

## Proposed Changes

### Character Sheets View Styling & Tests

#### [CharacterSheetsView.vue](file:///Users/jrf/wayworlds-vtt/client/src/views/CharacterSheetsView.vue)
- Update `.btn-delta` in CSS:
  - Add `width: 70px; min-width: 70px; text-align: center; box-sizing: border-box; justify-content: center;`
  - Adjust padding to `padding: 3px 4px;` so button labels fit cleanly without text overflow.

#### [CharacterSheetsView.test.js](file:///Users/jrf/wayworlds-vtt/client/test/CharacterSheetsView.test.js)
- Add a test verifying `.btn-delta` is styled with uniform `width: 70px;` and `min-width: 70px;`.

## Verification Plan

### Automated Tests
1. Run `npm --prefix client test -- test/CharacterSheetsView.test.js` to verify test passes.
2. Run `npm --prefix client test` to verify full Vitest suite (55 test files, 662+ tests) passes without regression.
3. Run `npm --prefix client run build` to verify production bundle builds cleanly.

### Manual Verification
- In the browser at `http://localhost:3001` (or `http://10.0.0.106:3001`), verify:
  - `- Dmg` and `+ Heal` buttons are 70px wide.
  - `- Spend` and `+ Charge` buttons are 70px wide.
  - `- Spend` and `+ Award` buttons are 70px wide.
  - All buttons align cleanly across the trackers.
