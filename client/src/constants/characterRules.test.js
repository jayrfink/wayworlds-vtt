import { describe, it, expect } from 'vitest';
import {
  RACES_DATA,
  CARTRIDGE_LINEAGE_GROUPS,
  getLineageBaselineStats,
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
  calcRangedHit,
  calcMeleeHit,
  calcMaxCarry,
  calcUnencumberedMax,
} from './characterRules.js';

describe('Skill XP Costs in characterRules.js', () => {
  it('calculates standard PSA costs for ground skills', () => {
    // Ranged Weapons (Martial): in-PSA = nextLevel * 3, out-of-PSA = nextLevel * 6
    expect(calcXPCost('Ranged Weapons', 2, 'Martial')).toBe(6);
    expect(calcXPCost('Ranged Weapons', 2, 'Mystic')).toBe(12);
    // Legacy support for Combat, Magic, Military & Technological
    expect(calcXPCost('Ranged Weapons', 2, 'Combat')).toBe(6);
    expect(calcXPCost('Ranged Weapons', 2, 'Magic')).toBe(12);
    expect(calcXPCost('Ranged Weapons', 2, 'Military')).toBe(6);
    expect(calcXPCost('Ranged Weapons', 2, 'Technological')).toBe(12);
  });

  it('calculates custom skill XP cost with out-of-PSA penalty (Bug 35)', () => {
    // Custom skill without skillPSA: base nextLevel * 3
    expect(calcXPCost('Hacking', 2, 'Mystic')).toBe(6);
    // Custom skill with matching skillPSA: base nextLevel * 3
    expect(calcXPCost('Hacking', 2, 'Mystic', 'Mystic')).toBe(6);
    // Custom skill with out-of-PSA skillPSA: double penalty nextLevel * 3 * 2
    expect(calcXPCost('Hacking', 2, 'Martial', 'Mystic')).toBe(12);
    expect(calcXPCost('Ancient Runes', 3, 'Martial', 'Theurgy')).toBe(18); // 3 * 3 * 2
    // Legacy support
    expect(calcXPCost('Hacking', 2, 'Combat', 'Magic')).toBe(12);
    expect(calcXPCost('Ancient Runes', 3, 'Combat', 'Theurgy')).toBe(18);
    expect(calcXPCost('Hacking', 2, 'Military', 'Technological')).toBe(12);
    expect(calcXPCost('Ancient Runes', 3, 'Military', 'Biosocial')).toBe(18);
  });
});

describe('UlvWylde Cartridge Lineages & Baseline Stats', () => {
  it('includes all UlvWylde cartridge lineages and excludes legacy sci-fi species', () => {
    expect(RACES_DATA['Dawn Elf']).toBeDefined();
    expect(RACES_DATA['Dusk Elf']).toBeDefined();
    expect(RACES_DATA['Sylvan Elf']).toBeDefined();
    expect(RACES_DATA['Wilder Elf']).toBeDefined();
    expect(RACES_DATA['Twilight Elf']).toBeDefined();
    expect(RACES_DATA['Dawn Elves']).toBeDefined();
    expect(RACES_DATA['Wendhyan']).toBeDefined();
    expect(RACES_DATA['Weirgoth Dwarf']).toBeDefined();
    expect(RACES_DATA['Vanir Dwarf']).toBeDefined();
    expect(RACES_DATA['Weirgoth Dwarves']).toBeDefined();
    expect(RACES_DATA['Vanir Dwarves']).toBeDefined();
    expect(RACES_DATA['Frost Urkai']).toBeDefined();
    expect(RACES_DATA['Ash Urkai']).toBeDefined();
    expect(RACES_DATA['Forest Urkai']).toBeDefined();
    expect(RACES_DATA['Stone Urkai']).toBeDefined();
    expect(RACES_DATA['Orcish']).toBeDefined();
    expect(RACES_DATA['Hobgoblin']).toBeDefined();
    expect(RACES_DATA['Goblin']).toBeDefined();
    expect(RACES_DATA['Hobgoblins']).toBeDefined();
    expect(RACES_DATA['Goblins']).toBeDefined();
    expect(RACES_DATA['Giantken / Goliath']).toBeDefined();
    expect(RACES_DATA['Trollkin']).toBeDefined();
    expect(RACES_DATA['Ogre']).toBeDefined();
    expect(RACES_DATA['Minotaur / Nord Minotaur']).toBeDefined();
    expect(RACES_DATA['Whisperling']).toBeDefined();
    expect(RACES_DATA['Mixlander']).toBeDefined();
    expect(RACES_DATA['Whisperlings']).toBeDefined();
    expect(RACES_DATA['Mixlanders']).toBeDefined();

    // Altered species grouping: Spirits, Undeath, Lycan
    expect(RACES_DATA['Spirits']).toBeDefined();
    expect(RACES_DATA['Undeath']).toBeDefined();
    expect(RACES_DATA['Lycan']).toBeDefined();
    expect(RACES_DATA['Spirits'].category).toBe('Altered');
    expect(RACES_DATA['Undeath'].category).toBe('Altered');
    expect(RACES_DATA['Lycan'].category).toBe('Altered');
    expect(RACES_DATA['Spirits'].baseline).toBe(45);
    expect(RACES_DATA['Undeath'].baseline).toBe(45);
    expect(RACES_DATA['Lycan'].baseline).toBe(45);
    expect(RACES_DATA['Spirits'].attribute_pool).toBe(20);
    expect(RACES_DATA['Undeath'].attribute_pool).toBe(20);
    expect(RACES_DATA['Lycan'].attribute_pool).toBe(20);

    const alteredGroup = CARTRIDGE_LINEAGE_GROUPS.find(g => g.label === 'Altered');
    expect(alteredGroup).toBeDefined();
    expect(alteredGroup.lineages).toEqual(['Spirits', 'Undeath', 'Lycan']);

    // Human and True Giants deleted from setting
    expect(RACES_DATA['Human']).toBeUndefined();
    expect(RACES_DATA['True Giants']).toBeUndefined();

    // Legacy Star Frontiers species must be removed
    expect(RACES_DATA['Dralasite']).toBeUndefined();
    expect(RACES_DATA['Vrusk']).toBeUndefined();
    expect(RACES_DATA['Yazirian']).toBeUndefined();
    expect(CARTRIDGE_LINEAGE_GROUPS.length).toBeGreaterThanOrEqual(4);
  });

  it('computes 50-baseline stat adjustments accurately via getLineageBaselineStats', () => {
    const dawn = getLineageBaselineStats('Dawn Elves');
    expect(dawn.int).toBe(55);
    expect(dawn.log).toBe(55);
    expect(dawn.sta).toBe(45);
    expect(dawn.max_stamina).toBe(45);
    expect(dawn.max_ess).toBe(55);

    const stoneUrkai = getLineageBaselineStats('Stone Urkai');
    expect(stoneUrkai.str).toBe(55);
    expect(stoneUrkai.sta).toBe(60);
    expect(stoneUrkai.dex).toBe(45);
    expect(stoneUrkai.log).toBe(45);
    expect(stoneUrkai.max_stamina).toBe(60);

    const goblin = getLineageBaselineStats('Goblins');
    expect(goblin.dex).toBe(60);
    expect(goblin.rs).toBe(55);
    expect(goblin.str).toBe(40);
    expect(goblin.sta).toBe(45);
  });

  it('computes 45-baseline stat adjustments and 20 redistribution points for Altered species', () => {
    for (const alteredName of ['Spirits', 'Undeath', 'Lycan']) {
      const stats = getLineageBaselineStats(alteredName);
      expect(stats.str).toBe(45);
      expect(stats.sta).toBe(45);
      expect(stats.dex).toBe(45);
      expect(stats.rs).toBe(45);
      expect(stats.int).toBe(45);
      expect(stats.log).toBe(45);
      expect(stats.per).toBe(45);
      expect(stats.ldr).toBe(45);
      expect(stats.max_stamina).toBe(45);
      expect(stats.current_stamina).toBe(45);
      expect(stats.attribute_pool).toBe(20);
    }
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

  it('calcRangedHit correctly calculates ceil(dex / 2) and handles 0 or undefined', () => {
    expect(calcRangedHit(0)).toBe(0);
    expect(calcRangedHit(50)).toBe(25);
    expect(calcRangedHit(55)).toBe(28); // Math.ceil(55 / 2) = 28
    expect(calcRangedHit(60)).toBe(30);
    expect(calcRangedHit(undefined)).toBe(25);
    expect(calcRangedHit(null)).toBe(25);
  });

  it('calcMeleeHit correctly handles 0 for str or dex without resetting to 50', () => {
    expect(calcMeleeHit(0, 0)).toBe(0);
    expect(calcMeleeHit(0, 60)).toBe(30);
    expect(calcMeleeHit(60, 0)).toBe(30);
    expect(calcMeleeHit(45, 55)).toBe(28); // Math.max(Math.ceil(45/2)=23, Math.ceil(55/2)=28)
    expect(calcMeleeHit(undefined, undefined)).toBe(25);
  });

  it('calcMaxCarry correctly handles 0 carry limit', () => {
    expect(calcMaxCarry(0)).toBe(0);
    expect(calcMaxCarry(75)).toBe(75);
    expect(calcMaxCarry(undefined)).toBe(50);
    expect(calcMaxCarry(null)).toBe(50);
  });

  it('calcUnencumberedMax correctly handles 0 unencumbered limit and rounds up (Bug 34)', () => {
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
    expect(calcCharacterTier({ skills: [{ name: 'Melee Weapons', level: 1 }, { name: 'Stealth', level: 1 }, { name: 'Arcane', level: 1 }] })).toBe(1);
    expect(calcCharacterTier({ skills: [{ name: 'Arcane', level: 2 }] })).toBe(2);
    expect(calcCharacterTier({ skills: [{ name: 'Melee Weapons', level: 1 }, { name: 'Stealth', level: 1 }, { name: 'Arcane', level: 1 }, { name: 'Ride', level: 1 }] })).toBe(2);
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
    expect(t0Strike.dice).toBe('1d10/2');
    expect(t0Strike.count).toBe(1);
    expect(t0Strike.sides).toBe(10);
    expect(t0Strike.divisor).toBe(2);

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
      log: 70,
      per: 50,
      skills: [{ name: 'Arcane', level: 3 }, { name: 'Blood', level: 2 }, { name: 'Eldritch', level: 2 }],
    };
    // 60 / 2 = 30 + (3 * 10) = 60%
    expect(calcTraditionTargetPct(mage, 'Arcane')).toBe(60);
    // 50 / 2 = 25 + (2 * 10) = 45%
    expect(calcTraditionTargetPct(mage, 'Blood')).toBe(45);
    // Eldritch uses HIST/REL (log): 70 / 2 = 35 + (2 * 10) = 55%
    expect(calcTraditionTargetPct(mage, 'Eldritch')).toBe(55);
  });

  it('uses pinned Essence attribute (int, log, per) for Essence-fueled tradition spell target %', () => {
    const caster = {
      int: 80,
      log: 60,
      per: 40,
      dex: 70,
      sta: 65,
      ldr: 55,
      ess_pin: 'int',
      skills: [
        { name: 'Arcane', level: 2 },
        { name: 'Eldritch', level: 2 },
        { name: 'Druidic', level: 2 },
        { name: 'Shadow', level: 2 },
        { name: 'Ki', level: 2 },
        { name: 'Blood', level: 2 },
      ],
    };

    // When pinned to INT (80):
    // Arcane: ceil(80/2) + 20 = 60%
    expect(calcTraditionTargetPct(caster, 'Arcane')).toBe(60);
    // Eldritch (normally log 60 -> 50%): with ess_pin 'int' (80) -> ceil(80/2) + 20 = 60%
    expect(calcTraditionTargetPct(caster, 'Eldritch')).toBe(60);
    // Druidic (normally per 40 -> 40%): with ess_pin 'int' (80) -> ceil(80/2) + 20 = 60%
    expect(calcTraditionTargetPct(caster, 'Druidic')).toBe(60);
    // Shadow uses Math.max(int 80, dex 70) = 80 -> 60%
    expect(calcTraditionTargetPct(caster, 'Shadow')).toBe(60);
    // Ki uses Math.max(int 80, sta 65) = 80 -> 60%
    expect(calcTraditionTargetPct(caster, 'Ki')).toBe(60);
    // Blood is Stamina-fueled (STA/WIL): continues to use WIL (per 40) -> ceil(40/2) + 20 = 40%
    expect(calcTraditionTargetPct(caster, 'Blood')).toBe(40);

    // Now switch ess_pin to 'log' (HIST/REL 60):
    caster.ess_pin = 'log';
    // Arcane: ceil(60/2) + 20 = 50%
    expect(calcTraditionTargetPct(caster, 'Arcane')).toBe(50);
    // Eldritch: ceil(60/2) + 20 = 50%
    expect(calcTraditionTargetPct(caster, 'Eldritch')).toBe(50);
    // Shadow: Math.max(log 60, dex 70) -> dex 70 is higher! ceil(70/2) + 20 = 55%
    expect(calcTraditionTargetPct(caster, 'Shadow')).toBe(55);
    // Ki: Math.max(log 60, sta 65) -> sta 65 is higher! ceil(65/2) + 20 = 53%
    expect(calcTraditionTargetPct(caster, 'Ki')).toBe(53);

    // Now switch ess_pin to 'per' (WIL 40):
    caster.ess_pin = 'per';
    // Arcane: ceil(40/2) + 20 = 40%
    expect(calcTraditionTargetPct(caster, 'Arcane')).toBe(40);

    // Now unpinned (ess_pin = ''): falls back to standard tradition stats
    caster.ess_pin = '';
    // Arcane uses int (80) -> 60%
    expect(calcTraditionTargetPct(caster, 'Arcane')).toBe(60);
    // Eldritch uses log (60) -> 50%
    expect(calcTraditionTargetPct(caster, 'Eldritch')).toBe(50);
    // Druidic uses per (40) -> 40%
    expect(calcTraditionTargetPct(caster, 'Druidic')).toBe(40);
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
    expect(validateForgeDamageFormula('1d10/2').valid).toBe(true);
    expect(validateForgeDamageFormula('3d10 Slashing + 1d10 Cold').valid).toBe(true);

    // Reject flat numeric modifiers and non-d10 dice
    expect(validateForgeDamageFormula('2d10+3').valid).toBe(false);
    expect(validateForgeDamageFormula('1d10 + 2').valid).toBe(false);
    expect(validateForgeDamageFormula('2d10 - 1').valid).toBe(false);
    expect(validateForgeDamageFormula('+4').valid).toBe(false);
    expect(validateForgeDamageFormula('5').valid).toBe(false);
    expect(validateForgeDamageFormula('1d6').valid).toBe(false);
    expect(validateForgeDamageFormula('2d6').valid).toBe(false);
    expect(validateForgeDamageFormula('1d5').valid).toBe(false);

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
