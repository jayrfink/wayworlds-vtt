/**
 * Core Schema Validator & Wayworlds Math Engine
 *
 * Implements rulebook-accurate calculations for Wayworlds d100
 * and strict JSON contract validation for AdversaryTemplate and TokenInstance.
 */

/**
 * Calculates NPC attack success percentage:
 * Target % = ceil(DEX / 2) + (Skill_Level * 10) + Equipment_Modifier
 */
export function calculateNpcHitChance(dex, skillLevel = 0, equipMod = 0) {
  const base = Math.ceil((Number(dex) || 0) / 2);
  const skillBonus = (Number(skillLevel) || 0) * 10;
  return base + skillBonus + (Number(equipMod) || 0);
}

/**
 * Calculates Initiative Modifier: IM = ceil(RS / 10)
 */
export function calculateInitiativeMod(rs) {
  return Math.ceil((Number(rs) || 50) / 10);
}

/**
 * Parses and applies HP/Stamina delta input:
 * - "50"  -> direct set to 50
 * - "-12" -> subtract 12 (floored at 0)
 * - "+10" -> add 10 (capped at maxHp)
 */
export function parseHpDelta(currentHp, maxHp, deltaStr) {
  const cur = Number(currentHp) || 0;
  const max = Number(maxHp) || 0;
  if (deltaStr === null || deltaStr === undefined) return cur;

  const raw = String(deltaStr).trim();
  if (!raw) return cur;

  if (raw.startsWith('+')) {
    const val = parseInt(raw.slice(1), 10);
    if (isNaN(val)) return cur;
    return Math.min(max, Math.max(0, cur + val));
  }

  if (raw.startsWith('-')) {
    const val = parseInt(raw.slice(1), 10);
    if (isNaN(val)) return cur;
    return Math.max(0, cur - val);
  }

  const direct = parseInt(raw, 10);
  if (isNaN(direct)) return cur;
  return Math.min(max, Math.max(0, direct));
}

// Threat Tier Preset Configurations (Wayworlds d100 Core Spec Section 12B)
const NPC_TIER_CONFIGS = {
  1: {
    statRange: [35, 45],
    defaultStat: 40,
    skillLevel: 1,
    sta: 25,
    armor: 'Leather Armor (3 DR)',
    defaultWeapon: 'Shortsword',
    damage: '1d10',
    range: 'Melee (5ft)',
    ess: 0,
  },
  2: {
    statRange: [45, 55],
    defaultStat: 50,
    skillLevel: 2,
    sta: 40,
    armor: 'Chainmail (7 DR)',
    defaultWeapon: 'Broadsword',
    damage: '1d10+2',
    range: 'Melee (5ft)',
    ess: 0,
  },
  3: {
    statRange: [55, 65],
    defaultStat: 60,
    skillLevel: 3,
    sta: 60,
    armor: 'Half-Plate & Shield (11 DR)',
    defaultWeapon: 'Longbow',
    damage: '2d10+2',
    range: '150ft / 300ft',
    ess: 0,
  },
  4: {
    statRange: [65, 75],
    defaultStat: 70,
    skillLevel: 4,
    sta: 85,
    armor: 'Full Plate Armor (10 DR) + Magical Ward (+3 DR)',
    defaultWeapon: 'Greatsword',
    damage: '3d10',
    range: 'Melee (5ft)',
    ess: 0,
  },
  5: {
    statRange: [75, 85],
    defaultStat: 80,
    skillLevel: 5,
    sta: 120,
    armor: 'Runeforged Plate & Ward (15 DR)',
    defaultWeapon: 'Runeforged Greataxe',
    damage: '4d10+4',
    range: 'Melee (10ft)',
    ess: 5,
  },
};

const CREATURE_TIER_CONFIGS = {
  1: {
    attackPct: 30,
    sta: 15,
    attacksCount: 1,
    damage: '1d10',
    size: 'Small',
  },
  2: {
    attackPct: 45,
    sta: 45,
    attacksCount: 2,
    damage: '2d10',
    size: 'Medium',
  },
  3: {
    attackPct: 60,
    sta: 90,
    attacksCount: 2,
    damage: '3d10',
    size: 'Large',
  },
  4: {
    attackPct: 70,
    sta: 170,
    attacksCount: 3,
    damage: '4d10',
    size: 'Large',
  },
  5: {
    attackPct: 80,
    sta: 290,
    attacksCount: 4,
    damage: '6d10',
    size: 'Very Large',
  },
};

/**
 * Procedurally generates an AdversaryTemplate for Sentient NPCs
 */
export function generateNpcStats(tier, options = {}) {
  const safeTier = Math.min(5, Math.max(1, parseInt(tier, 10) || 1));
  const cfg = NPC_TIER_CONFIGS[safeTier];

  const race = options.race || 'Frost Urkai';
  const name = options.name || `${race} Raider (T${safeTier})`;
  const baseStat = options.stat || cfg.defaultStat;
  const weapon = options.weapon || cfg.defaultWeapon;
  const armor = options.armor || cfg.armor;

  const hitPct = options.hitPct !== undefined
    ? Number(options.hitPct)
    : Math.max(5, calculateNpcHitChance(baseStat, cfg.skillLevel, options.equipMod || 0) - 10);
  const im = calculateInitiativeMod(baseStat);

  const isRanged = /bow|crossbow|sling|javelin|thrown|dart/i.test(weapon);

  const actions = [
    {
      name: weapon,
      type: isRanged ? 'ranged' : 'melee',
      target_pct: hitPct,
      damage: options.damage || cfg.damage,
      range: options.range || (isRanged ? '80ft / 160ft' : cfg.range),
      ess_cost: cfg.ess,
      description: `Primary combat armament, Skill Rank ${cfg.skillLevel}`,
    },
  ];

  return {
    template_id: options.template_id || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-t${safeTier}`,
    name,
    category: 'npc',
    threat_tier: safeTier,
    token_image_path: options.token_image_path || `/uploads/tokens/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`,
    token_size: 1,
    hp_max: options.sta || cfg.sta,
    defense_summary: armor,
    movement: options.movement || '30 ft (Walk: 30ft / Dash: 60ft)',
    initiative_mod: im,
    actions,
    traits: options.traits || [
      { name: 'Martial Discipline', description: 'Coordinated strikes with allied warband members.' },
    ],
    system_data: {
      race,
      str: baseStat,
      sta: options.sta || cfg.sta,
      dex: baseStat,
      rs: baseStat,
      int: baseStat,
      log: baseStat,
      per: Math.max(30, baseStat - 10),
      ldr: Math.max(30, baseStat - 10),
      skills: {
        'Melee Weapons': cfg.skillLevel,
        'Ranged Weapons': cfg.skillLevel,
        'Athletics & Perception': 1,
      },
      ess_max: 50,
    },
  };
}

/**
 * Procedurally generates an AdversaryTemplate for Alien Creatures & Beasts
 */
export function generateCreatureStats(tier, options = {}) {
  const safeTier = Math.min(5, Math.max(1, parseInt(tier, 10) || 1));
  const cfg = CREATURE_TIER_CONFIGS[safeTier];

  const name = options.name || `Wilderness Predator (T${safeTier})`;
  const diet = options.diet || 'Carnivore';
  const size = options.size || cfg.size;
  const attackPct = options.attackPct || cfg.attackPct;
  const sta = options.sta || cfg.sta;

  const actions = [];
  const attacksList = options.attacks && options.attacks.length > 0 ? options.attacks : ['Bite', 'Claws'];

  attacksList.forEach((atkName) => {
    actions.push({
      name: atkName,
      type: atkName.toLowerCase().includes('spit') || atkName.toLowerCase().includes('acid') || atkName.toLowerCase().includes('breath') ? 'special' : 'natural',
      target_pct: attackPct,
      damage: options.damage || cfg.damage,
      range: atkName.toLowerCase().includes('spit') || atkName.toLowerCase().includes('breath') ? '30ft' : 'Melee (5ft)',
      ess_cost: 0,
      description: `Natural predatory attack.`,
    });
  });

  return {
    template_id: options.template_id || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-t${safeTier}`,
    name,
    category: 'creature',
    threat_tier: safeTier,
    token_image_path: options.token_image_path || `/uploads/tokens/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`,
    token_size: size === 'Large' ? 2 : size === 'Very Large' ? 3 : 1,
    hp_max: sta,
    defense_summary: options.defense || (safeTier >= 4 ? 'Thick Armored Hide (8 DR)' : 'Natural Hide (2 DR)'),
    movement: options.movement || '40 ft (Dash: 80ft)',
    initiative_mod: 4 + safeTier,
    actions,
    traits: options.traits || [
      { name: 'Predatory Reflexes', description: 'Surprise bonus when striking from stealth or high ground.' },
    ],
    system_data: {
      diet,
      size_class: size,
      habitat: options.habitat || 'Wilderness',
    },
  };
}

/**
 * Validates an AdversaryTemplate against the contract schema
 */
export function validateAdversaryTemplate(template) {
  const errors = [];
  if (!template || typeof template !== 'object') {
    return { valid: false, errors: ['Template must be an object'] };
  }

  if (!template.template_id && template.id) {
    template.template_id = template.id;
  }

  const required = [
    'template_id',
    'name',
    'category',
    'threat_tier',
    'token_image_path',
    'hp_max',
    'defense_summary',
    'movement',
    'initiative_mod',
    'actions',
    'traits',
    'system_data',
  ];

  for (const field of required) {
    if (template[field] === undefined || template[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (template.category && !['npc', 'creature'].includes(template.category)) {
    errors.push(`Category must be 'npc' or 'creature'`);
  }

  if (template.threat_tier !== undefined && template.threat_tier !== null) {
    const tierNum = Number(template.threat_tier);
    if (!Number.isInteger(tierNum) || tierNum < 1 || tierNum > 5) {
      errors.push(`Threat tier must be between 1 and 5`);
    }
  }

  if (template.actions && !Array.isArray(template.actions)) {
    errors.push(`Actions must be an array`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a TokenInstance against the contract schema
 */
export function validateTokenInstance(instance) {
  const errors = [];
  if (!instance || typeof instance !== 'object') {
    return { valid: false, errors: ['Instance must be an object'] };
  }

  const required = ['label', 'x', 'y', 'hp_current', 'hp_max'];
  for (const field of required) {
    if (instance[field] === undefined || instance[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (instance.conditions && !Array.isArray(instance.conditions)) {
    errors.push(`Conditions must be an array`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
