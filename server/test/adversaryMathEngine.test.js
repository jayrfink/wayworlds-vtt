import { describe, it, expect } from 'vitest';
import {
  calculateNpcHitChance,
  calculateInitiativeMod,
  parseHpDelta,
  generateNpcStats,
  generateCreatureStats,
  validateAdversaryTemplate,
  validateTokenInstance,
} from '../src/adversaryMathEngine.js';

describe('Adversary Math Engine & Validator', () => {
  describe('Wayworlds NPC Math Formulas', () => {
    it('calculates hit chance with formula: ceil(DEX / 2) + (skill_level * 10) + equip_mod', () => {
      // Base: DEX 50 -> 25%, Skill Lvl 0 -> 25%
      expect(calculateNpcHitChance(50, 0)).toBe(25);

      // Tier 1: DEX 45 -> ceil(22.5) = 23%, Skill Lvl 1 (+10) -> 33%
      expect(calculateNpcHitChance(45, 1)).toBe(33);

      // Tier 2: DEX 50 -> 25%, Skill Lvl 2 (+20) -> 45%
      expect(calculateNpcHitChance(50, 2)).toBe(45);

      // Tier 3: DEX 60 -> 30%, Skill Lvl 3 (+30), +5 Scope Mod -> 65%
      expect(calculateNpcHitChance(60, 3, 5)).toBe(65);

      // Tier 4: DEX 70 -> 35%, Skill Lvl 4 (+40) -> 75%
      expect(calculateNpcHitChance(70, 4)).toBe(75);

      // Tier 5: DEX 85 -> 43%, Skill Lvl 5 (+50) -> 93%
      expect(calculateNpcHitChance(85, 5)).toBe(93);
    });

    it('calculates Initiative Modifier IM as ceil(RS / 10)', () => {
      expect(calculateInitiativeMod(45)).toBe(5);
      expect(calculateInitiativeMod(50)).toBe(5);
      expect(calculateInitiativeMod(51)).toBe(6);
      expect(calculateInitiativeMod(75)).toBe(8);
      expect(calculateInitiativeMod(85)).toBe(9);
    });
  });

  describe('HP / Stamina Delta Math Parser', () => {
    it('sets direct value without prefix', () => {
      expect(parseHpDelta(50, 60, '35')).toBe(35);
      expect(parseHpDelta(20, 60, '0')).toBe(0);
      expect(parseHpDelta(20, 60, '60')).toBe(60);
    });

    it('subtracts delta with negative prefix without capping temporary HP at maxHp', () => {
      expect(parseHpDelta(50, 60, '-12')).toBe(38);
      expect(parseHpDelta(15, 60, '-20')).toBe(0); // floored at 0
      expect(parseHpDelta(70, 60, '-5')).toBe(65); // temporary HP preserved
    });

    it('adds delta with positive prefix', () => {
      expect(parseHpDelta(35, 60, '+10')).toBe(45);
      expect(parseHpDelta(55, 60, '+15')).toBe(60); // capped at hp_max
    });

    it('returns currentHp for invalid or empty input', () => {
      expect(parseHpDelta(42, 60, '')).toBe(42);
      expect(parseHpDelta(42, 60, 'invalid')).toBe(42);
      expect(parseHpDelta(42, 60, null)).toBe(42);
    });
  });

  describe('Threat Tier NPC Generator', () => {
    it('generates Tier 2 Frost Urkai Raider adhering to Threat Tier benchmarks', () => {
      const template = generateNpcStats(2, {
        name: 'Frost Urkai Raider',
        race: 'Frost Urkai',
        weapon: 'Broadsword',
        armor: 'Chainmail (7 DR)',
      });

      expect(template.threat_tier).toBe(2);
      expect(template.category).toBe('npc');
      expect(template.hp_max).toBe(40);
      expect(template.defense_summary).toContain('Chainmail');
      expect(template.actions.length).toBeGreaterThan(0);

      const mainAction = template.actions[0];
      expect(mainAction.name).toBe('Broadsword');
      // DEX 50 (25%) + Skill 2 (20%) - 10% adjustment = 35%
      expect(mainAction.target_pct).toBe(35);
      expect(mainAction.damage).toBe('1d10+2');
      expect(mainAction.ess_cost).toBe(0);

      expect(template.system_data.str).toBe(50);
      expect(template.system_data.skills['Melee Weapons']).toBe(2);
    });

    it('enforces tier boundaries across Tiers 1 through 5', () => {
      const t1 = generateNpcStats(1, { weapon: 'Shortsword' });
      const t5 = generateNpcStats(5, { weapon: 'Runeforged Greataxe' });

      expect(t1.hp_max).toBeLessThan(t5.hp_max);
      expect(t1.actions[0].target_pct).toBeLessThan(t5.actions[0].target_pct);
      expect(t5.threat_tier).toBe(5);
    });
  });

  describe('Threat Tier Creature Generator', () => {
    it('generates Tier 3 Stalker Creature adhering to creature benchmarks', () => {
      const creature = generateCreatureStats(3, {
        name: 'Rift Stalker-Beast',
        diet: 'Carnivore',
        attacks: ['Bite', 'Acid Spit'],
      });

      expect(creature.threat_tier).toBe(3);
      expect(creature.category).toBe('creature');
      expect(creature.hp_max).toBe(90);
      expect(creature.actions.length).toBeGreaterThanOrEqual(2);

      const bite = creature.actions.find(a => a.name === 'Bite');
      expect(bite).toBeDefined();
      expect(bite.target_pct).toBe(60);
      expect(bite.damage).toBe('3d10');

      const acid = creature.actions.find(a => a.name === 'Acid Spit');
      expect(acid).toBeDefined();
      expect(acid.damage).toBe('3d10');
      expect(creature.system_data.diet).toBe('Carnivore');
    });

    it('scales down creature damage across tiers 1 through 5 by 1d10', () => {
      const c1 = generateCreatureStats(1);
      const c2 = generateCreatureStats(2);
      const c3 = generateCreatureStats(3);
      const c4 = generateCreatureStats(4);
      const c5 = generateCreatureStats(5);

      expect(c1.actions[0].damage).toBe('1d10');
      expect(c2.actions[0].damage).toBe('2d10');
      expect(c3.actions[0].damage).toBe('3d10');
      expect(c4.actions[0].damage).toBe('4d10');
      expect(c5.actions[0].damage).toBe('6d10');
    });
  });

  describe('Schema Validation', () => {
    it('validates a complete AdversaryTemplate successfully', () => {
      const valid = generateNpcStats(2, { name: 'Test NPC' });
      const result = validateAdversaryTemplate(valid);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('detects missing required fields in AdversaryTemplate', () => {
      const invalid = { name: 'Missing Fields' };
      const result = validateAdversaryTemplate(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects threat_tier = 0 in AdversaryTemplate', () => {
      const valid = generateNpcStats(2, { name: 'Test NPC' });
      const result = validateAdversaryTemplate({ ...valid, threat_tier: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Threat tier must be between 1 and 5');
    });

    it('validates TokenInstance successfully', () => {
      const instance = {
        template_id: 'sathar-trooper-t2',
        label: 'Sathar Trooper #1',
        x: 10,
        y: 12,
        hp_current: 45,
        hp_max: 50,
        conditions: ['Wounded'],
      };
      const result = validateTokenInstance(instance);
      expect(result.valid).toBe(true);
    });
  });
});
