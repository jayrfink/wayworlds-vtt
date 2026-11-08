# Shorten Character Sheet Action Button Labels Implementation Plan

Shorten the header action buttons on the Skills & Inventory cards:
- `+ Add Skill` $\rightarrow$ `+ Skill`
- `+ Add Equipment` $\rightarrow$ `+ Equip`
- `+ Item Forge` $\rightarrow$ `+ Forge`
- `+ Custom Item` $\rightarrow$ `+ Custom`

## Proposed Changes

### Character Sheets View

#### [CharacterSheetsView.vue](file:///Users/jrf/wayworlds-vtt/client/src/views/CharacterSheetsView.vue)
- Update button texts in Skills card header and Inventory card header.

### Tests

#### [skillsRecordLayout.test.js](file:///Users/jrf/wayworlds-vtt/client/test/skillsRecordLayout.test.js)
- Assert that `.btn-add-skill` displays `+ Skill`.
- Assert that `.btn-add-equipment` displays `+ Equip`.
- Assert that `.btn-open-forge` displays `+ Forge`.
- Assert that `.btn-add-custom-item` displays `+ Custom`.

## Verification Plan

### Automated Tests
1. `npm --prefix client test -- test/skillsRecordLayout.test.js`
2. `npm --prefix client test` (all 55 test files, 670+ tests)
3. `npm --prefix client run build`

### Manual Verification
- In the browser at `http://localhost:3001/dashboard/character-sheets`, confirm the button labels appear as `+ Skill`, `+ Equip`, `+ Forge`, `+ Custom`.
