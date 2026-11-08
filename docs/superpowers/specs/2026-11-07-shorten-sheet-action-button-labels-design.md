# Design: Shorten Character Sheet Action Button Labels

**Date**: 2026-11-07  
**Branch**: `main`  
**Status**: Approved by User  

## 1. Problem Statement
In the Character Sheets view, the header action buttons on the Skills card and Inventory card take substantial horizontal space:
- `+ Add Skill`
- `+ Add Equipment`
- `+ Item Forge`
- `+ Custom Item`

The user requested compact labels:
- `+ Add Skill` $\rightarrow$ `+ Skill`
- `+ Add Equipment` $\rightarrow$ `+ Equip`
- `+ Item Forge` $\rightarrow$ `+ Forge`
- `+ Custom Item` $\rightarrow$ `+ Custom`

## 2. Solution Architecture

### 2.1 Template Updates (`client/src/views/CharacterSheetsView.vue`)
- Update line 574 button text from `+ Add Skill` to `+ Skill`.
- Update line 654 button text from `+ Add Equipment` to `+ Equip`.
- Update line 655 button text from `+ Item Forge` to `+ Forge`.
- Update line 656 button text from `+ Custom Item` to `+ Custom`.
- Preserve all existing CSS classes (`.btn-add-skill`, `.btn-add-equipment`, `.btn-open-forge`, `.btn-add-custom-item`) and click handlers.

### 2.2 Tests
- Update/extend `client/test/skillsRecordLayout.test.js` or `client/test/CharacterSheetsView.test.js` to assert the shortened button text.
