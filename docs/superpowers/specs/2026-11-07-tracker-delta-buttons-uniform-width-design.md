# Design: Tracker Delta Buttons Uniform Width

**Date**: 2026-11-07  
**Branch**: `main`  
**Status**: Approved by User  

## 1. Problem Statement
In the Character Sheets view, the tracker control panels for Stamina (STA), Essence (ESS), and Experience (XP) have action buttons for quick deltas:
- Stamina: `- Dmg` and `+ Heal`
- Essence: `- Spend` and `+ Charge`
- Experience: `- Spend` and `+ Award`

Currently, `.btn-delta` does not have a fixed width or minimum width, causing buttons to size dynamically based on text label length (e.g., `- Dmg` vs `- Spend`, `+ Heal` vs `+ Charge`). The user requested that:
- `+ Award`, `+ Charge`, and `+ Heal` have the same width.
- `- Spend` and `- Dmg` have the same width.
- The user approved Option 1: a unified 70px width across all delta buttons so both positive and negative actions align consistently across all three trackers.

## 2. Solution Architecture

### 2.1 CSS Styling in `client/src/views/CharacterSheetsView.vue`
Update `.btn-delta`:
```css
.btn-delta {
  width: 70px;
  min-width: 70px;
  box-sizing: border-box;
  text-align: center;
  justify-content: center;
  padding: 3px 4px;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease-in-out;
}
```

### 2.2 Testing Strategy
- Add unit tests in `client/test/CharacterSheetsView.test.js` or a dedicated test verifying:
  - `.btn-delta` contains `width: 70px;` and `min-width: 70px;`.
  - All tracker delta buttons (`.btn-delta.btn-sub` and `.btn-delta.btn-add`) render cleanly without text truncation.
- Run the full Vitest suite to verify no regressions.
