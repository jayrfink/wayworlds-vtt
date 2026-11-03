import { describe, it, expect } from 'vitest';
import {
  OFFICIAL_SKILLS,
  MAGIC_TRADITIONS,
  UNIVERSAL_MAGNITUDE_TABLE,
  calcCharacterTier,
  calcCastCost,
  getMagnitudeEntry,
  getTraditionConfig,
  calcTraditionTargetPct,
  getCharacterTradecraftRank,
  calcMaxForgeTier,
  validateTradecraftSpecialization,
  validateForgeDamageFormula,
  validateForgedItem,
  calcXPCost,
  calcIM,
  calcPunchDamage,
  calcMeleeHit,
  calcMaxCarry,
  calcUnencumberedMax,
} from './characterRules.js';

describe('Skill XP Costs in characterRules.js', () => {
  it('calculates standard PSA costs for ground skills', () => {
    // Beam Weapons (Military): in-PSA = nextLevel * 3, out-of-PSA = nextLevel * 6
    expect(calcXPCost('Beam Weapons', 2, 'Military')).toBe(6);
    expect(calcXPCost('Beam Weapons', 2, 'Technological')).toBe(12);
  });

  it('calculates custom skill XP cost with out-of-PSA penalty (Bug 35)', () => {
    // Custom skill without skillPSA: base nextLevel * 3
    expect(calcXPCost('Hacking', 2, 'Technological')).toBe(6);
    // Custom skill with matching skillPSA: base nextLevel * 3
    expect(calcXPCost('Hacking', 2, 'Technological', 'Technological')).toBe(6);
    // Custom skill with out-of-PSA skillPSA: double penalty nextLevel * 3 * 2
    expect(calcXPCost('Hacking', 2, 'Military', 'Technological')).toBe(12);
    expect(calcXPCost('Alien Biology', 3, 'Military', 'Biosocial')).toBe(18); // 3 * 3 * 2
  });
});

describe('characterRules.js Math Helpers with Nullish Coalescing (0-safe)', () => {
  it('calcIM correctly handles 0, valid scores, and undefined fallback', () => {
    expect(calcIM(0)).toBe(0);
    expect(calcIM(45)).toBe(5);
    expect(calcIM(65)).toBe(7);
    expect(calcIM(undefined)).toBe(5);
    expect(calcIM(null)).toBe(5);
  });

  it('calcPunchDamage correctly handles 0, boundaries, and undefined fallback', () => {
    expect(calcPunchDamage(0)).toBe('1');
    expect(calcPunchDamage(20)).toBe('1');
    expect(calcPunchDamage(21)).toBe('2');
    expect(calcPunchDamage(40)).toBe('2');
    expect(calcPunchDamage(50)).toBe('3');
    expect(calcPunchDamage(60)).toBe('3');
    expect(calcPunchDamage(80)).toBe('4');
    expect(calcPunchDamage(85)).toBe('5');
    expect(calcPunchDamage(undefined)).toBe('3');
    expect(calcPunchDamage(null)).toBe('3');
  });

  it('calcMeleeHit correctly handles 0 for str or dex without resetting to 50', () => {
    expect(calcMeleeHit(0, 0)).toBe(0);
    expect(calcMeleeHit(0, 60)).toBe(30);
    expect(calcMeleeHit(60, 0)).toBe(30);
    expect(calcMeleeHit(45, 55)).toBe(28); // Math.max(Math.ceil(45/2)=23, Math.ceil(55/2)=28)
    expect(calcMeleeHit(undefined, undefined)).toBe(25);
  });

  it('calcMaxCarry correctly handles 0 kg carry limit', () => {
    expect(calcMaxCarry(0)).toBe(0);
    expect(calcMaxCarry(75)).toBe(75);
    expect(calcMaxCarry(undefined)).toBe(50);
    expect(calcMaxCarry(null)).toBe(50);
  });

  it('calcUnencumberedMax correctly handles 0 kg unencumbered limit and rounds up (Bug 34)', () => {
    expect(calcUnencumberedMax(0)).toBe(0);
    // 75 / 2 = 37.5 -> Math.ceil = 38 (Wayworlds round fractions up rule)
    expect(calcUnencumberedMax(75)).toBe(38);
    expect(calcUnencumberedMax(undefined)).toBe(25);
    expect(calcUnencumberedMax(null)).toBe(25);
  });
});

describe('Wayworlds Character Tier, Universal Magnitude, & Tradecraft Forge Rules', () => {
  it('calculates overall Character Tier (1-5) from skills and grimoire cast tiers', () => {
    expect(calcCharacterTier(null)).toBe(1);
    expect(calcCharacterTier({})).toBe(1);
    expect(calcCharacterTier({ skills: [{ name: 'Melee Weapons', level: 1 }] })).toBe(1);
    expect(calcCharacterTier({ skills: [{ name: 'Arcane', level: 2 }] })).toBe(2);
    expect(calcCharacterTier({ grimoire: [{ name: 'Rime Bolt', default_tier: 3 }] })).toBe(3);
    expect(calcCharacterTier({ skills: [{ name: 'Ki', level: 4 }] })).toBe(3);
    expect(calcCharacterTier({ skills: [{ name: 'Necromancy', level: 5 }] })).toBe(4);
    expect(calcCharacterTier({ skills: [{ name: 'Arcane', level: 6 }] })).toBe(5);
    expect(calcCharacterTier({ grimoire: [{ name: 'Cataclysm', default_tier: 6 }] })).toBe(5);
  });

  it('computes Universal Magnitude Table cost (Cast Tier * 2) and Nd10 dice', () => {
    expect(calcCastCost(0)).toBe(0);
    expect(calcCastCost(1)).toBe(2);
    expect(calcCastCost(3)).toBe(6);
    expect(calcCastCost(5)).toBe(10);
    expect(calcCastCost(6)).toBe(12);

    const t0Strike = getMagnitudeEntry(0, 'strike');
    expect(t0Strike.cost).toBe(0);
    expect(t0Strike.dice).toBe('1d6');

    const t2Strike = getMagnitudeEntry(2, 'strike');
    expect(t2Strike.cost).toBe(4);
    expect(t2Strike.dice).toBe('3d10');
    expect(t2Strike.count).toBe(3);

    const t4Blast = getMagnitudeEntry(4, 'blast');
    expect(t4Blast.cost).toBe(8);
    expect(t4Blast.dice).toBe('4d10');
  });

  it('identifies Magic/Ki traditions fuel (ESS vs STA) and target percentages', () => {
    expect(getTraditionConfig('Arcane').fuel).toBe('ess');
    expect(getTraditionConfig('Ki').fuel).toBe('ess');
    expect(getTraditionConfig('Blood').fuel).toBe('sta');
    expect(getTraditionConfig('Warg').fuel).toBe('sta');

    const mage = {
      int: 60,
      per: 50,
      skills: [{ name: 'Arcane', level: 3 }, { name: 'Blood', level: 2 }],
    };
    // 60 / 2 = 30 + (3 * 10) = 60%
    expect(calcTraditionTargetPct(mage, 'Arcane')).toBe(60);
    // 50 / 2 = 25 + (2 * 10) = 45%
    expect(calcTraditionTargetPct(mage, 'Blood')).toBe(45);
  });

  it('caps Custom Equipment & Magic Item Forge tier by Lvl 1-6 Tradecraft rank', () => {
    expect(calcMaxForgeTier(0, false)).toBe(0);
    expect(calcMaxForgeTier(1, false)).toBe(1);
    expect(calcMaxForgeTier(2, false)).toBe(2);
    expect(calcMaxForgeTier(3, false)).toBe(3);
    expect(calcMaxForgeTier(4, false)).toBe(4);
    expect(calcMaxForgeTier(5, false)).toBe(5);
    expect(calcMaxForgeTier(6, false)).toBe(5);
    expect(calcMaxForgeTier(0, true)).toBe(5); // GM override

    const smith = {
      skills: [{ name: 'Tradecraft', specialization: 'Weaponsmith', level: 3 }],
    };
    expect(getCharacterTradecraftRank(smith, 'Weaponsmith')).toBe(3);
  });

  it('rejects prohibited Tradecraft specializations that overlap with core skills or magic', () => {
    expect(validateTradecraftSpecialization('Weaponsmith').valid).toBe(true);
    expect(validateTradecraftSpecialization('Armorer').valid).toBe(true);
    expect(validateTradecraftSpecialization('Bowyer').valid).toBe(true);
    expect(validateTradecraftSpecialization('Herbalist').valid).toBe(false);
    expect(validateTradecraftSpecialization('Locksmith').valid).toBe(false);
    expect(validateTradecraftSpecialization('Runecaster').valid).toBe(false);
  });

  it('enforces clean Nd10 damage formulas and rejects any flat + or - damage numbers', () => {
    expect(validateForgeDamageFormula('1d10').valid).toBe(true);
    expect(validateForgeDamageFormula('2d10').valid).toBe(true);
    expect(validateForgeDamageFormula('3d10 Slashing + 1d10 Cold').valid).toBe(true);

    // Reject flat numeric modifiers
    expect(validateForgeDamageFormula('2d10+3').valid).toBe(false);
    expect(validateForgeDamageFormula('1d10 + 2').valid).toBe(false);
    expect(validateForgeDamageFormula('2d10 - 1').valid).toBe(false);
    expect(validateForgeDamageFormula('+4').valid).toBe(false);
    expect(validateForgeDamageFormula('5').valid).toBe(false);
    expect(validateForgeDamageFormula('2d6').valid).toBe(false);

    // Validate full forged item against Tradecraft rank
    const validSword = {
      name: 'Masterwork Broadsword',
      category: 'weapon',
      required_tradecraft: 'Weaponsmith',
      item_tier: 2,
      damage_dice: '2d10',
      attack_pct_bonus: 5,
    };
    expect(validateForgedItem(validSword, 2, false).valid).toBe(true);
    expect(validateForgedItem(validSword, 1, false).valid).toBe(false); // Tier 2 > Rank 1

    const flatBonusSword = {
      ...validSword,
      damage_dice: '2d10 + 2',
    };
    expect(validateForgedItem(flatBonusSword, 5, false).valid).toBe(false);
  });
});
