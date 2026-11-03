import { describe, it, expect } from 'vitest';
import {
  RANGED_COMBAT_REF,
  MELEE_COMBAT_REF,
  ADDITIONAL_RULES_REF,
} from './combatReference.js';

describe('combatReference', () => {
  describe('RANGED_COMBAT_REF', () => {
    it('exports comprehensive ranged combat reference structure', () => {
      expect(RANGED_COMBAT_REF.sequenceOfPlay).toBeDefined();
      expect(Array.isArray(RANGED_COMBAT_REF.sequenceOfPlay)).toBe(true);
      expect(RANGED_COMBAT_REF.weapons.length).toBeGreaterThanOrEqual(12);
      expect(RANGED_COMBAT_REF.modifiers.length).toBeGreaterThanOrEqual(10);
      expect(RANGED_COMBAT_REF.armor.length).toBeGreaterThanOrEqual(4);
    });

    it('contains bows, crossbows, and thrown weapons with valid schema', () => {
      const weaponNames = RANGED_COMBAT_REF.weapons.map((w) => w.name);
      expect(weaponNames).toContain('Shortbow');
      expect(weaponNames).toContain('Longbow');
      expect(weaponNames).toContain('Composite Bow');
      expect(weaponNames).toContain('Light Crossbow');
      expect(weaponNames).toContain('Heavy Crossbow');
      expect(weaponNames).toContain('Hand Crossbow');
      expect(weaponNames).toContain('Sling');
      expect(weaponNames).toContain('Javelin');
      expect(weaponNames).toContain('Throwing Axe');
      expect(weaponNames).toContain('Thrown Dagger / Kunai');
      expect(weaponNames).toContain('Dart');
      expect(weaponNames).toContain('Bolas / Entangling Net');

      RANGED_COMBAT_REF.weapons.forEach((w) => {
        expect(w).toHaveProperty('name');
        expect(w).toHaveProperty('category');
        expect(w).toHaveProperty('damage');
        expect(w).toHaveProperty('rof');
        expect(w).toHaveProperty('shortRange');
        expect(w).toHaveProperty('medRange');
        expect(w).toHaveProperty('longRange');
        expect(w).toHaveProperty('ammo');
        expect(w).toHaveProperty('notes');
      });
    });

    it('contains ranged modifiers and defenses', () => {
      RANGED_COMBAT_REF.modifiers.forEach((m) => {
        expect(m).toHaveProperty('condition');
        expect(m).toHaveProperty('modifier');
        expect(m).toHaveProperty('notes');
      });

      const armorTypes = RANGED_COMBAT_REF.armor.map((a) => a.type);
      expect(armorTypes).toContain('Light Armor');
      expect(armorTypes).toContain('Medium Armor');
      expect(armorTypes).toContain('Heavy Armor');
      expect(armorTypes).toContain('Shield');
      expect(armorTypes).toContain('Supernatural Ward');

      RANGED_COMBAT_REF.armor.forEach((a) => {
        expect(a).toHaveProperty('name');
        expect(a).toHaveProperty('type');
        expect(a).toHaveProperty('protection');
        expect(a).toHaveProperty('notes');
      });
    });
  });

  describe('MELEE_COMBAT_REF', () => {
    it('exports comprehensive melee combat reference structure', () => {
      expect(MELEE_COMBAT_REF.attackBaseFormula).toBeDefined();
      expect(typeof MELEE_COMBAT_REF.attackBaseFormula).toBe('string');
      expect(Array.isArray(MELEE_COMBAT_REF.sequenceOfPlay)).toBe(true);
      expect(MELEE_COMBAT_REF.sequenceOfPlay.length).toBe(6);
      expect(Array.isArray(MELEE_COMBAT_REF.unarmedDamage)).toBe(true);
      expect(MELEE_COMBAT_REF.unarmedDamage.length).toBeGreaterThanOrEqual(5);
      expect(Array.isArray(MELEE_COMBAT_REF.weapons)).toBe(true);
      expect(MELEE_COMBAT_REF.weapons.length).toBeGreaterThanOrEqual(10);
      expect(Array.isArray(MELEE_COMBAT_REF.modifiers)).toBe(true);
      expect(MELEE_COMBAT_REF.modifiers.length).toBeGreaterThanOrEqual(5);
    });

    it('contains melee tactical flow sequence with valid schema', () => {
      MELEE_COMBAT_REF.sequenceOfPlay.forEach((step) => {
        expect(step).toHaveProperty('step');
        expect(step).toHaveProperty('name');
        expect(step).toHaveProperty('description');
      });

      const stepNames = MELEE_COMBAT_REF.sequenceOfPlay.map((s) => s.name);
      expect(stepNames).toContain('Initiative');
      expect(stepNames).toContain('Close Distance & Position');
      expect(stepNames).toContain('Declare Melee Attack & Maneuver');
      expect(stepNames).toContain('Resolve Melee Attack Roll');
      expect(stepNames).toContain('Apply Damage, STR Mod & Armor DR');
      expect(stepNames).toContain('Reactions, Parry & Opportunity Attacks');
    });

    it('verifies unarmed damage brackets and fantasy melee weapons', () => {
      const brackets = MELEE_COMBAT_REF.unarmedDamage.map((b) => b.strBracket);
      expect(brackets.some((b) => b.includes('40 - 49'))).toBe(true);
      expect(brackets.some((b) => b.includes('50 - 59'))).toBe(true);
      expect(brackets).toContain('80+');

      MELEE_COMBAT_REF.unarmedDamage.forEach((u) => {
        expect(u).toHaveProperty('strBracket');
        expect(u).toHaveProperty('punchDamage');
        expect(u).toHaveProperty('kickDamage');
      });

      const meleeNames = MELEE_COMBAT_REF.weapons.map((w) => w.name);
      expect(meleeNames).toContain('Dagger / Kunai');
      expect(meleeNames).toContain('Shortsword / Scimitar');
      expect(meleeNames).toContain('Rapier');
      expect(meleeNames).toContain('Broadsword / Longsword');
      expect(meleeNames).toContain('Battleaxe / Warhammer / Flail');
      expect(meleeNames).toContain('Greatsword / Greataxe / Maul');
      expect(meleeNames).toContain('Halberd / Glaive / Pike');

      MELEE_COMBAT_REF.weapons.forEach((w) => {
        expect(w).toHaveProperty('name');
        expect(w).toHaveProperty('damage');
        expect(w).toHaveProperty('weight');
        expect(w).toHaveProperty('special');
      });

      MELEE_COMBAT_REF.modifiers.forEach((m) => {
        expect(m).toHaveProperty('situation');
        expect(m).toHaveProperty('modifier');
        expect(m).toHaveProperty('notes');
      });
    });
  });

  describe('ADDITIONAL_RULES_REF', () => {
    it('exports comprehensive additional rules with horse movement', () => {
      expect(ADDITIONAL_RULES_REF.title).toBe('Additional Rules');
      expect(ADDITIONAL_RULES_REF.description).toBeDefined();
      expect(Array.isArray(ADDITIONAL_RULES_REF.mountsAndMovement)).toBe(true);
      expect(ADDITIONAL_RULES_REF.mountsAndMovement.length).toBeGreaterThanOrEqual(1);

      const horse = ADDITIONAL_RULES_REF.mountsAndMovement[0];
      expect(horse.subject).toContain('Horse Movement');
      expect(horse.tacticalSpeed).toContain('50 ft');
      expect(horse.overlandSpeed).toContain('4 mph');
      expect(horse.capacity).toContain('250 lbs');
      expect(horse.mechanics).toContain('Rider shares mount movement');
    });
  });
});
