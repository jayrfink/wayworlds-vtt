export const RACES_DATA = {
  Human: {
    modifiers: { str: 0, sta: 0, dex: 0, rs: 0, int: 0, log: 0, per: 0, ldr: 0 },
    movement: { walk: 2, run: 6, glide: 0 },
    abilitiesDescription: 'Versatile species. Receives a +5 bonus to any single ability score during creation.'
  },
  Dralasite: {
    modifiers: { str: 5, sta: 5, dex: -5, rs: -5, int: 0, log: 0, per: 0, ldr: 0 },
    movement: { walk: 1, run: 4, glide: 0 },
    abilitiesDescription: 'Elasticity (grows limbs up to DEX/10), Lie Detection (5% base).'
  },
  Vrusk: {
    modifiers: { str: -5, sta: -5, dex: 5, rs: 5, int: 0, log: 0, per: 0, ldr: 0 },
    movement: { walk: 3, run: 7, glide: 0 },
    abilitiesDescription: 'Comprehension (15% base), Ambidexterity.'
  },
  Yazirian: {
    modifiers: { str: -10, sta: -10, dex: 5, rs: 5, int: 5, log: 5, per: 0, ldr: 0 },
    movement: { walk: 2, run: 6, glide: 4 },
    abilitiesDescription: 'Battle Rage (5% base, +20 to hit in melee), Gliding, Night Vision.'
  }
};

export const OFFICIAL_SKILLS = [
  // Military
  { name: 'Beam Weapons', psa: 'Military', baseChance: 'Dexterity' },
  { name: 'Gyrojet Weapons', psa: 'Military', baseChance: 'Dexterity' },
  { name: 'Projectile Weapons', psa: 'Military', baseChance: 'Dexterity' },
  { name: 'Melee Weapons', psa: 'Military', baseChance: 'Melee Base (STR/DEX)' },
  { name: 'Ranged Weapons', psa: 'Military', baseChance: 'Dexterity' },
  { name: 'Armor & Shield Mastery', psa: 'Military', baseChance: 'Strength' },
  { name: 'Striker & Grappler', psa: 'Military', baseChance: 'Melee Base (STR/DEX)' },
  { name: 'Athletics & Acrobatics', psa: 'Military', baseChance: 'Melee Base (STR/DEX)' },
  { name: 'Thrown Weapons', psa: 'Military', baseChance: 'Dexterity' },
  { name: 'Demolitions', psa: 'Military', baseChance: 'Logic' },
  { name: 'Martial Arts', psa: 'Military', baseChance: 'Melee Base (STR/DEX)' },
  // Technological & Tradecraft
  { name: 'Tradecraft', psa: 'Technological', baseChance: 'Logic' },
  { name: 'Stealth & Secrecy', psa: 'Technological', baseChance: 'Dexterity' },
  { name: 'Computer', psa: 'Technological', baseChance: 'Logic' },
  { name: 'Robotics', psa: 'Technological', baseChance: 'Logic' },
  { name: 'Technician', psa: 'Technological', baseChance: 'Logic' },
  // Biosocial & Lore
  { name: 'Wilderness & Beast Lore', psa: 'Biosocial', baseChance: 'Logic' },
  { name: 'Herbalism & Medicine', psa: 'Biosocial', baseChance: 'Intuition' },
  { name: 'History & Religion', psa: 'Biosocial', baseChance: 'Logic' },
  { name: 'Environmental', psa: 'Biosocial', baseChance: 'Intuition' },
  { name: 'Medical', psa: 'Biosocial', baseChance: 'Logic' },
  { name: 'Psycho-Social', psa: 'Biosocial', baseChance: 'Personality' },
  // Magic & Ki Traditions
  { name: 'Arcane', psa: 'Biosocial', baseChance: 'Intuition', isTradition: true },
  { name: 'Blood', psa: 'Biosocial', baseChance: 'Personality', isTradition: true },
  { name: 'Shadow', psa: 'Biosocial', baseChance: 'Dexterity', isTradition: true },
  { name: 'Demonology', psa: 'Biosocial', baseChance: 'Logic', isTradition: true },
  { name: 'Necromancy', psa: 'Biosocial', baseChance: 'Logic', isTradition: true },
  { name: 'Druidic', psa: 'Biosocial', baseChance: 'Personality', isTradition: true },
  { name: 'Spiritual', psa: 'Biosocial', baseChance: 'Personality', isTradition: true },
  { name: 'Ki', psa: 'Military', baseChance: 'Melee Base (STR/DEX)', isTradition: true },
  { name: 'Warg', psa: 'Biosocial', baseChance: 'Personality', isTradition: true },
  { name: 'Witchcraft', psa: 'Biosocial', baseChance: 'Logic', isTradition: true }
];

export const MAGIC_TRADITIONS = [
  { name: 'Arcane', baseStat: 'int', fuel: 'ess', label: 'Arcane (1/2 INT • ESS)' },
  { name: 'Blood', baseStat: 'per', fuel: 'sta', label: 'Blood (1/2 WIL • STA)' },
  { name: 'Shadow', baseStat: 'dex', fuel: 'ess', label: 'Shadow (1/2 DEX • ESS)' },
  { name: 'Demonology', baseStat: 'log', fuel: 'ess', label: 'Demonology (1/2 HIST/REL • ESS)' },
  { name: 'Necromancy', baseStat: 'log', fuel: 'ess', label: 'Necromancy (1/2 HIST/REL • ESS)' },
  { name: 'Druidic', baseStat: 'per', fuel: 'ess', label: 'Druidic (1/2 WIL • ESS)' },
  { name: 'Spiritual', baseStat: 'per', fuel: 'ess', label: 'Spiritual (1/2 WIL/PRE • ESS)' },
  { name: 'Ki', baseStat: 'dex', fuel: 'ess', label: 'Ki (1/2 DEX/STR • ESS)' },
  { name: 'Warg', baseStat: 'per', fuel: 'sta', label: 'Warg (1/2 WIL • STA)' },
  { name: 'Witchcraft', baseStat: 'log', fuel: 'ess', label: 'Witchcraft (1/2 HIST/REL • ESS)' }
];

export const UNIVERSAL_MAGNITUDE_TABLE = {
  0: {
    tier: 0,
    label: 'Cantrip / Minor (Tier 0)',
    cost: 0,
    strike: { dice: '1d6', count: 1, sides: 6, summary: '1d6 (Spark, minor strike)' },
    blast: { dice: '1d6', count: 1, sides: 6, summary: 'Light campfire / 5 ft smoke puff (1d6)' },
    ward_heal: { dice: '0d10', flatHeal: 2, count: 0, sides: 10, summary: 'Stop bleeding (+2 STA)' },
    hex_summon: { dice: '0d10', count: 0, sides: 10, summary: 'Minor sensory trick / 10 ft wall-run' }
  },
  1: {
    tier: 1,
    label: 'Tier 1 (Lvl 1)',
    cost: 2,
    strike: { dice: '2d10', count: 2, sides: 10, summary: '2d10 damage' },
    blast: { dice: '1d10', count: 1, sides: 10, summary: '1d10 (5 ft radius / 2 foes)' },
    ward_heal: { dice: '2d10', count: 2, sides: 10, summary: '2d10 STA or 10 Temp Ward' },
    hex_summon: { dice: '1d10', count: 1, sides: 10, summary: 'Inflict 1 Condition (-10% save) or summon Tier 1 minion' }
  },
  2: {
    tier: 2,
    label: 'Tier 2 (Lvl 2)',
    cost: 4,
    strike: { dice: '3d10', count: 3, sides: 10, summary: '3d10 damage' },
    blast: { dice: '2d10', count: 2, sides: 10, summary: '2d10 (10 ft radius / 3 foes)' },
    ward_heal: { dice: '3d10', count: 3, sides: 10, summary: '3d10 STA or 20 Temp Ward' },
    hex_summon: { dice: '2d10', count: 2, sides: 10, summary: 'Inflict Condition (-20% save) or summon Tier 2 minion' }
  },
  3: {
    tier: 3,
    label: 'Tier 3 (Lvl 3)',
    cost: 6,
    strike: { dice: '4d10', count: 4, sides: 10, summary: '4d10 damage' },
    blast: { dice: '3d10', count: 3, sides: 10, summary: '3d10 (15 ft radius / 4 foes)' },
    ward_heal: { dice: '4d10', count: 4, sides: 10, summary: '4d10 STA or Half-Dmg Ward' },
    hex_summon: { dice: '3d10', count: 3, sides: 10, summary: 'Multi-target Hex (-30% save) or summon Tier 3 entity' }
  },
  4: {
    tier: 4,
    label: 'Tier 4 (Lvl 4)',
    cost: 8,
    strike: { dice: '5d10', count: 5, sides: 10, summary: '5d10 damage' },
    blast: { dice: '4d10', count: 4, sides: 10, summary: '4d10 (20 ft radius burst)' },
    ward_heal: { dice: '5d10', count: 5, sides: 10, summary: '5d10 STA or Party Ward' },
    hex_summon: { dice: '4d10', count: 4, sides: 10, summary: 'Area Lockdown (-40% save) or summon Tier 4 entity' }
  },
  5: {
    tier: 5,
    label: 'Tier 5 (Lvl 5 Apex)',
    cost: 10,
    strike: { dice: '6d10', count: 6, sides: 10, summary: '6d10 damage' },
    blast: { dice: '5d10', count: 5, sides: 10, summary: '5d10 (30 ft Cataclysm)' },
    ward_heal: { dice: '6d10', count: 6, sides: 10, summary: '6d10 STA / Full Restore' },
    hex_summon: { dice: '5d10', count: 5, sides: 10, summary: 'Mass Dominate or summon Tier 5 Avatar' }
  },
  6: {
    tier: 6,
    label: 'Tier 6 (Lvl 6 Mythic)',
    cost: 12,
    strike: { dice: '8d10', count: 8, sides: 10, summary: '8d10 damage' },
    blast: { dice: '6d10', count: 6, sides: 10, summary: '6d10 (30 ft+ Cataclysm)' },
    ward_heal: { dice: '8d10', count: 8, sides: 10, summary: '8d10 STA / Mythic Aegis' },
    hex_summon: { dice: '6d10', count: 6, sides: 10, summary: 'Apex Avatar (-50% save)' }
  }
};

export const DISALLOWED_TRADECRAFT_DOMAINS = [
  'herbalist',
  'herbalism',
  'medic',
  'medicine',
  'alchemist',
  'alchemy',
  'poisoner',
  'locksmith',
  'thief',
  'assassin',
  'stealth',
  'beast trainer',
  'tracker',
  'scholar',
  'priest',
  'runecaster',
  'wizard',
  'mage',
  'warlock',
  'necromancer'
];

export const ALLOWED_TRADECRAFTS = [
  'Weaponsmith',
  'Armorer',
  'Bowyer',
  'Fletcher',
  'Leatherworker',
  'Metalsmith',
  'Carpenter',
  'Stonemason',
  'Jeweler',
  'Tailor',
  'Shipwright',
  'Cartographer'
];

export function calcCastCost(castTier) {
  const tier = Math.max(0, Math.min(6, Math.floor(Number(castTier) || 0)));
  return tier * 2;
}

export function getMagnitudeEntry(castTier, category = 'strike') {
  const tier = Math.max(0, Math.min(6, Math.floor(Number(castTier) || 0)));
  const row = UNIVERSAL_MAGNITUDE_TABLE[tier] || UNIVERSAL_MAGNITUDE_TABLE[1];
  const cat = row[category] ? category : 'strike';
  return {
    tier,
    cost: row.cost,
    label: row.label,
    category: cat,
    ...row[cat]
  };
}

export function getTraditionConfig(traditionName) {
  if (!traditionName) return MAGIC_TRADITIONS[0];
  const found = MAGIC_TRADITIONS.find(
    t => t.name.toLowerCase() === String(traditionName).trim().toLowerCase()
  );
  return found || { name: String(traditionName).trim(), baseStat: 'int', fuel: 'ess', label: String(traditionName).trim() };
}

export function calcTraditionTargetPct(char, traditionName) {
  if (!char) return 25;
  const cfg = getTraditionConfig(traditionName);
  let statVal = 50;
  if (cfg.name === 'Ki' || cfg.name === 'Shadow') {
    const dex = Number(char.dex ?? 50);
    const alt = cfg.name === 'Ki' ? Number(char.str ?? 50) : Number(char.int ?? char.int_stat ?? 50);
    statVal = Math.max(dex, alt);
  } else if (cfg.name === 'Spiritual') {
    statVal = Math.max(Number(char.per ?? 50), Number(char.ldr ?? 50));
  } else if (cfg.baseStat === 'int') {
    statVal = Number(char.int ?? char.int_stat ?? 50);
  } else if (cfg.baseStat === 'log') {
    statVal = Number(char.log ?? char.log_stat ?? 50);
  } else if (cfg.baseStat === 'per') {
    statVal = Number(char.per ?? 50);
  } else if (cfg.baseStat === 'dex') {
    statVal = Number(char.dex ?? 50);
  }

  const baseChance = Math.ceil(statVal / 2);
  const skills = Array.isArray(char.skills) ? char.skills : [];
  const matchingSkill = skills.find(
    s => s && s.name && s.name.toLowerCase() === cfg.name.toLowerCase()
  );
  const skillLvl = matchingSkill ? Math.max(0, Number(matchingSkill.level) || 0) : 0;
  return baseChance + skillLvl * 10;
}

export function calcCharacterTier(char) {
  if (!char) return 1;
  if (char.tier != null && !isNaN(char.tier)) return Math.max(1, Math.min(5, Number(char.tier)));
  if (char.threat_tier != null && !isNaN(char.threat_tier)) return Math.max(1, Math.min(5, Number(char.threat_tier)));

  const skills = Array.isArray(char.skills) ? char.skills : [];
  const skillLevels = skills.map(s => Number(s?.level) || 0);
  const grimoire = Array.isArray(char.grimoire)
    ? char.grimoire
    : (Array.isArray(char.racial_abilities?.grimoire) ? char.racial_abilities.grimoire : []);
  const castTiers = grimoire.map(g => Number(g?.default_tier ?? g?.cast_tier) || 0);

  const maxLvl = Math.max(...skillLevels, ...castTiers, 0);
  const totalLevels = skillLevels.reduce((sum, lvl) => sum + lvl, 0);

  if (maxLvl >= 6 || totalLevels >= 15) return 5;
  if (maxLvl >= 5 || totalLevels >= 10) return 4;
  if (maxLvl >= 3 || totalLevels >= 6) return 3;
  if (maxLvl >= 2 || totalLevels >= 3) return 2;
  return 1;
}

export function getCharacterTradecraftRank(char, tradecraftName = null) {
  if (!char) return 0;
  const skills = Array.isArray(char.skills) ? char.skills : [];
  let maxRank = 0;
  for (const sk of skills) {
    if (!sk || !sk.name) continue;
    const rawName = String(sk.name).trim();
    const lower = rawName.toLowerCase();
    const isTradecraft =
      lower === 'tradecraft' ||
      lower.startsWith('tradecraft:') ||
      lower.startsWith('tradecraft (') ||
      ALLOWED_TRADECRAFTS.some(t => t.toLowerCase() === lower);
    if (!isTradecraft) continue;

    if (tradecraftName) {
      const targetLower = String(tradecraftName).trim().toLowerCase();
      const spec = String(sk.specialization || '').trim().toLowerCase();
      const matchesSpecific =
        lower === 'tradecraft' ||
        lower.includes(targetLower) ||
        (spec && spec === targetLower);
      if (!matchesSpecific) continue;
    }

    const lvl = Math.max(0, Math.min(6, Number(sk.level) || 0));
    if (lvl > maxRank) maxRank = lvl;
  }
  return maxRank;
}

export function calcMaxForgeTier(tradecraftRank, isGm = false) {
  if (isGm) return 5;
  const rank = Math.max(0, Math.min(6, Math.floor(Number(tradecraftRank) || 0)));
  if (rank <= 0) return 0;
  if (rank >= 5) return 5;
  return rank;
}

export function validateTradecraftSpecialization(specName) {
  if (!specName || !String(specName).trim()) {
    return { valid: true, error: '' };
  }
  const normalized = String(specName).trim().toLowerCase();
  for (const forbidden of DISALLOWED_TRADECRAFT_DOMAINS) {
    if (normalized.includes(forbidden)) {
      return {
        valid: false,
        error: `Tradecraft "${specName}" conflicts with a core skill or magic domain (${forbidden}).`
      };
    }
  }
  return { valid: true, error: '' };
}

export function validateForgeDamageFormula(damageStr) {
  if (damageStr === undefined || damageStr === null || String(damageStr).trim() === '') {
    return { valid: true, error: '' };
  }
  const raw = String(damageStr).trim();

  // Reject any flat + or - numeric damage modifiers (e.g., "2d10+3", "1d10 + 2", "+5")
  // Every '+' segment must contain an Nd10 or Nd6 die expression, never a flat number
  if (/[+-]\s*\d+(?!\s*d\d+)/i.test(raw) || /^\d+$/.test(raw)) {
    return {
      valid: false,
      error: 'Flat damage modifiers (e.g. +1, +3) are forbidden. Use whole Nd10 dice only (e.g. "2d10" or "2d10 Slashing + 1d10 Cold").'
    };
  }

  const segments = raw.split('+').map(s => s.trim()).filter(Boolean);
  if (segments.length === 0) {
    return { valid: false, error: 'Damage formula cannot be empty.' };
  }

  for (const seg of segments) {
    if (!/^\d+d10(?:\s+[a-zA-Z/()-]+)*$/i.test(seg)) {
      return {
        valid: false,
        error: `Invalid damage segment "${seg}". Weapons must use whole Nd10 dice (e.g. 1d10, 2d10, 3d10) without flat + numbers.`
      };
    }
  }

  return { valid: true, error: '' };
}

export function validateForgedItem(item, tradecraftRank = 1, isGm = false) {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Invalid item configuration.' };
  }
  const name = String(item.name || '').trim();
  if (!name) {
    return { valid: false, error: 'Item name is required.' };
  }

  if (item.required_tradecraft) {
    const tcCheck = validateTradecraftSpecialization(item.required_tradecraft);
    if (!tcCheck.valid) return tcCheck;
  }

  const maxTier = calcMaxForgeTier(tradecraftRank, isGm);
  const itemTier = Math.max(1, Math.min(5, Math.floor(Number(item.item_tier) || 1)));
  if (!isGm && itemTier > maxTier) {
    return {
      valid: false,
      error: `Item Tier ${itemTier} exceeds your maximum Tradecraft Forge Tier (Tier ${maxTier} at Tradecraft Lvl ${tradecraftRank}).`
    };
  }

  if (item.category === 'weapon' || item.damage_dice) {
    const dmgCheck = validateForgeDamageFormula(item.damage_dice || '1d10');
    if (!dmgCheck.valid) return dmgCheck;
  }

  const atkBonus = Number(item.attack_pct_bonus || 0);
  if (atkBonus < 0 || atkBonus > 20 || atkBonus % 5 !== 0) {
    return {
      valid: false,
      error: 'Attack hit bonus must be a clean 5% percentile increment (0%, +5%, +10%, +15%, or +20%).'
    };
  }

  const maxAllowedAtkBonus = itemTier === 1 ? 0 : (itemTier === 2 ? 5 : (itemTier === 3 ? 10 : (itemTier === 4 ? 15 : 20)));
  if (!isGm && atkBonus > maxAllowedAtkBonus) {
    return {
      valid: false,
      error: `+${atkBonus}% Attack Hit Bonus requires at least Forge Tier ${atkBonus / 5 + 1} (current item is Tier ${itemTier}).`
    };
  }

  if (item.bonus_elemental_dice && Number(item.bonus_elemental_dice) > 0 && itemTier < 5 && !isGm) {
    return {
      valid: false,
      error: 'Enchanted/Runeforged bonus elemental Nd10 dice require Forge Tier 5 (Tradecraft Lvl 5–6).'
    };
  }

  return { valid: true, error: '' };
}

export function calcIM(rs) {
  return Math.ceil((rs ?? 50) / 10);
}

export function calcPunchDamage(str) {
  const val = str ?? 50;
  if (val <= 20) return '1';
  if (val <= 40) return '2';
  if (val <= 60) return '3';
  if (val <= 80) return '4';
  return '5';
}

export function calcMeleeHit(str, dex) {
  return Math.max(Math.ceil((str ?? 50) / 2), Math.ceil((dex ?? 50) / 2));
}

export function calcMaxCarry(str) {
  return str ?? 50; // kg
}

export function calcUnencumberedMax(str) {
  return Math.ceil((str ?? 50) / 2); // kg
}

export function calcXPCost(skillName, nextLevel, charPSA, skillPSA = null) {
  const sk = OFFICIAL_SKILLS.find(s => s.name === skillName);
  if (!sk) {
    const isOutOfPsa = Boolean(skillPSA && charPSA && skillPSA !== charPSA);
    return isOutOfPsa ? nextLevel * 3 * 2 : nextLevel * 3;
  }
  let baseMult = 3;
  if (sk.psa === 'Technological') baseMult = 4;
  if (sk.psa === 'Biosocial') baseMult = 5;
  const inPSA = sk.psa === charPSA;
  const cost = nextLevel * baseMult;
  return inPSA ? cost : cost * 2;
}
