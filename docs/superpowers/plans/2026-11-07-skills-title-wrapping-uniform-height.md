# Skills Title Wrapping with Uniform Record Heights Implementation Plan

Wrap skill titles so full titles and PSA tags are never truncated, and maintain a uniform record height of 44px across all rows.

## User Review Required

> [!IMPORTANT]
> This plan modifies `.skill-row`, `.skill-item-badge`, `.skill-name`, and `.skill-psa-tag` styling to enable word wrapping while enforcing a uniform row height of 44px with vertical centering.

## Proposed Changes

### Character Sheets View Styling & Tests

#### [CharacterSheetsView.vue](file:///Users/jrf/wayworlds-vtt/client/src/views/CharacterSheetsView.vue)
- Update `.skill-row`:
  - Set `min-height: 44px;` and `padding: 4px 6px;`
  - Keep `align-items: center;` so content is vertically centered in the 44px track.
- Update `.skill-item-badge`:
  - Replace `overflow: hidden; white-space: nowrap; text-overflow: ellipsis;` with `flex-wrap: wrap; column-gap: 6px; row-gap: 2px; word-break: break-word; overflow-wrap: anywhere; line-height: 1.25;`
- Update `.skill-name`:
  - Replace `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` with `white-space: normal; word-break: break-word; overflow-wrap: anywhere; line-height: 1.25;`
- Update `.skill-psa-tag`:
  - Add `white-space: nowrap; line-height: 1.25; flex-shrink: 0;`

#### [skillsRecordLayout.test.js](file:///Users/jrf/wayworlds-vtt/client/test/skillsRecordLayout.test.js)
- Update layout assertions to test for `min-height: 44px;`, `flex-wrap: wrap;`, `white-space: normal;`, and `white-space: nowrap;`.

## Verification Plan

### Automated Tests
1. Run `npx vitest run test/skillsRecordLayout.test.js` to verify layout tests pass.
2. Run `npm test` inside `client` to verify the entire test suite passes (all 55 test files, 662+ tests).
3. Run `npm --prefix client run build` to verify production bundle builds cleanly.

### Manual Verification
- Check skill rows in browser at `http://localhost:3001` or `http://10.0.0.106:3001` with long skill names (e.g. *Athletics & Acrobatics (Martial)*, *Influence & Deception (Theurgy)*) to verify full title visibility, wrapping, and uniform row height.
