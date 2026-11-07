# Design Spec: Pinned Essence Attribute for Spell Success %

## Summary
In Wayworlds, players can pin their **ESSENCE/MANA** pool to an attribute (`INT`, `HIST/REL`, or `WIL`) to represent which mental discipline powers their magical reservoir. This change integrates the player's pinned Essence attribute into the calculation of their spell success % (chance to hit) for all Essence-fueled spell traditions, ensuring a scholar (pinned to INT), cleric/historian (pinned to HIST/REL), or mystic/druid (pinned to WIL) applies their governing magical attribute to cast their spells.

---

## 1. Scope & Rules Logic

### 1.1 Formula
The formula for tradition spell target success % is:
$$\text{Target \%} = \left\lceil \frac{\text{BaseStatValue}}{2} \right\rceil + (\text{SkillLevel} \times 10)$$
*(Ward/Heal spells remain an automatic 99% success rate per existing rules).*

### 1.2 Pinned Essence Stat Resolution (`Approach A`)
When determining `BaseStatValue` in `calcTraditionBaseStatValue(char, traditionName)`:
1. Identify the character's active Essence pin:
   $$\text{essPin} = \text{char.ess\_pin} \lor \text{char.racial\_abilities.ess\_pin}$$
2. Retrieve the pinned attribute value:
   - `'int'`: `char.int` (Intellect)
   - `'log'`: `char.log` (History & Religion)
   - `'per'`: `char.per` (Willpower)
3. Check the tradition's fuel type (`cfg.fuel`):
   - **Essence-Fueled Traditions (`cfg.fuel === 'ess'`)**:
     - **Shadow**: `Math.max(pinnedVal, char.dex)` (preserves DEX if higher for agile rogues).
     - **Ki**: `Math.max(pinnedVal, char.sta)` (preserves STA if higher for martial artists).
     - **Demonology**: `Math.max(pinnedVal, char.ldr)` (preserves PRE if higher).
     - **All other Essence traditions** (Arcane, Eldritch, Druidic, Necromancy, Spiritual, Witchcraft): Uses `pinnedVal`.
   - **Stamina-Fueled Traditions (`cfg.fuel === 'sta'`)**:
     - Blood and Warg use their native tradition stat (`WIL`), because they are fueled directly by physical life force (Stamina), not the Essence/Mana pool.
   - **Unpinned ("None" / empty string / null)**:
     - Falls back to the tradition's existing default base stat configuration (`int`, `log`, `per`, or `Math.max` pairs).

---

## 2. Component Integration

### 2.1 `client/src/constants/characterRules.js`
- Update `calcTraditionBaseStatValue(char, traditionName)` to check `char.ess_pin` and apply the pinned attribute for Essence-fueled traditions.

### 2.2 `client/src/views/CharacterSheetsView.vue`
- When the user changes their Essence pin (`<select v-model="selectedChar.ess_pin">`), `onEssPinChange()` already updates the character.
- The UI's Grimoire table calls `getSpellTargetPct(spell)` which invokes `calcTraditionTargetPct(this.selectedChar, spell.tradition)`. It will reactively reflect the updated success percentage immediately.
- When casting a spell via `castGrimoireSpell(spell)`, the to-hit check compares `d100Roll <= targetPct`, using the newly calculated target percentage.

---

## 3. Testing Plan

### 3.1 Unit Tests (`client/src/constants/characterRules.test.js`)
- **INT-pinned caster**: An Arcane and Eldritch spell both use `INT` for base chance when `ess_pin === 'int'`.
- **HIST/REL-pinned caster**: An Arcane spell uses `HIST/REL` (`log`) when `ess_pin === 'log'`.
- **WIL-pinned caster**: An Arcane spell uses `WIL` (`per`) when `ess_pin === 'per'`.
- **Shadow DEX preservation**: When `ess_pin === 'int'` but `DEX > INT`, Shadow uses `DEX`.
- **Ki STA preservation**: When `ess_pin === 'int'` but `STA > INT`, Ki uses `STA`.
- **Stamina-fueled traditions**: Blood magic continues to use `WIL` even when `ess_pin === 'int'`.
- **Unpinned fallback**: When `ess_pin` is `""`, `null`, or undefined, traditions use their default configuration.

### 3.2 Integration Tests (`client/test/CharacterSheetsView.test.js`)
- Verify that changing `selectedChar.ess_pin` updates `getSpellTargetPct(spell)` across different Grimoire spells.
- Verify that casting a spell with an active pin uses the updated target % for roll outcome evaluation.
