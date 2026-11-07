# Pinned Essence Attribute for Spell Success % Implementation Plan

Use the character's pinned Essence attribute (`int`, `log`, `per`) when calculating spell success % (chance to hit) for all Essence-fueled magic traditions, with hybrid stat preservation for Shadow (DEX), Ki (STA), and Demonology (PRE), while preserving Stamina-fueled tradition defaults and unpinned fallbacks.

- **Spec:** [2026-11-06-spell-success-essence-pin-design.md](file:///Users/jrf/wayworlds-vtt/docs/superpowers/specs/2026-11-06-spell-success-essence-pin-design.md)
- **Branch:** `main`

---

## Tasks

### Task 1: Add Unit Tests for Pinned Essence Spell Target Calculations (TDD Red)
- **File:** `client/src/constants/characterRules.test.js`
- **Actions:**
  1. Add tests in `characterRules.test.js` asserting `calcTraditionTargetPct` and `calcTraditionBaseStatValue`:
     - Pinned to `int`: Arcane, Eldritch, and Druidic use `char.int`.
     - Pinned to `log`: Arcane uses `char.log` (HIST/REL).
     - Pinned to `per`: Arcane uses `char.per` (WIL).
     - Shadow preserves `char.dex` if `char.dex > pinnedVal`.
     - Ki preserves `char.sta` if `char.sta > pinnedVal`.
     - Demonology preserves `char.ldr` if `char.ldr > pinnedVal`.
     - Blood (STA-fueled) continues using `char.per` (WIL).
     - Unpinned fallback (`ess_pin` is `""` or `null`) uses standard tradition baseStat.
  2. Run vitest on `characterRules.test.js` and verify the new tests fail as expected (RED).

### Task 2: Implement Pinned Essence Resolution in `characterRules.js` (TDD Green)
- **File:** `client/src/constants/characterRules.js`
- **Actions:**
  1. Update `calcTraditionBaseStatValue(char, traditionName)`:
     - Check `essPin = char?.ess_pin || char?.racial_abilities?.ess_pin`.
     - If `essPin` is present and tradition `cfg.fuel === 'ess'`:
       - Resolve `pinnedVal` based on `int`, `log`, or `per`.
       - For `cfg.baseStat === 'int_or_dex'`, return `Math.max(pinnedVal, dex)`.
       - For `cfg.baseStat === 'sta_or_per'`, return `Math.max(pinnedVal, sta)`.
       - For `cfg.baseStat === 'per_or_ldr'`, return `Math.max(pinnedVal, pre)`.
       - Otherwise return `pinnedVal`.
     - If unpinned or tradition uses STA fuel (Blood/Warg), execute standard `cfg.baseStat` switch.
  2. Run vitest on `characterRules.test.js` and verify tests pass (GREEN).

### Task 3: Character Sheet Integration & Spell Casting Tests
- **File:** `client/test/CharacterSheetsView.test.js`
- **Actions:**
  1. Add integration tests verifying:
     - In `CharacterSheetsView`, changing `selectedChar.ess_pin` dynamically updates `getSpellTargetPct(spell)`.
     - Casting an Arcane spell with `ess_pin = 'log'` checks against the HIST/REL-derived target percentage.
  2. Run vitest on `CharacterSheetsView.test.js` and ensure all pass.

### Task 4: Full Test Suite Verification & Production Build
- **Actions:**
  1. Run entire test suite `npm run test` (all 54 test files).
  2. Run production build `npm run build`.
  3. Commit all changes and push to `origin/main`.
