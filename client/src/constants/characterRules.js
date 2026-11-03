/**
 * UlvWylde Setting Cartridge Lineages & Wayworlds D100 Character Rules
 * Baseline ability score for all 8 attributes is 50.
 * Selecting a lineage automatically applies its modifiers to the 50 baseline.
 */
export const RACES_DATA = {
  'Dawn Elves': {
    category: 'The Norn',
    modifiers: { str: 0, sta: -5, dex: 0, rs: 0, int: 5, log: 5, per: 0, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Solar & Arcane Attunement',
    abilities: 'Solar & Arcane Attunement: +5% to Arcane or Spiritual channeling; immune to dazzling/blinding light (30 ft base move).',
    modSummary: '+5 INT (55), +5 HIST/REL (55), -5 STA (45)',
  },
  'Dusk Elves': {
    category: 'The Norn',
    modifiers: { str: 0, sta: -5, dex: 5, rs: 0, int: 5, log: 0, per: 0, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Gloaming Attunement',
    abilities: 'Gloaming Attunement: +5% to Shadow or Witchcraft casting; darkvision up to 60 ft (no penalty in dim/dark terrain).',
    modSummary: '+5 INT (55), +5 DEX (55), -5 STA (45)',
  },
  'Sylvan Elves': {
    category: 'The Norn',
    modifiers: { str: -5, sta: 0, dex: 5, rs: 5, int: 0, log: 0, per: 0, ldr: 0 },
    movement: { walk: 35, run: 70, glide: 0 },
    movement_ft: 35,
    size: 'Medium',
    warg_eligible: true,
    trait_name: 'Woodland Stride & Warg Bloodline',
    abilities: 'Woodland Stride & Warg Bloodline: Eligible for the Warg skill; 35 ft base movement speed and +10% Stealth & Secrecy / Wilderness in forests.',
    modSummary: '+5 DEX (55), +5 RS (55), -5 STR (45)',
  },
  'Wilder Elves': {
    category: 'The Norn',
    modifiers: { str: 0, sta: 0, dex: 5, rs: 0, int: 0, log: -5, per: 5, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: true,
    trait_name: 'Feral Instinct & Warg Bloodline',
    abilities: 'Feral Instinct & Warg Bloodline: Eligible for the Warg skill; +1 Initiative Modifier (IM) and +5% melee accuracy.',
    modSummary: '+5 DEX (55), +5 WIL (55), -5 HIST/REL (45)',
  },
  'Twilight Elves': {
    category: 'The Norn',
    modifiers: { str: -5, sta: 0, dex: 5, rs: 0, int: 0, log: 0, per: 5, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Veil Sight',
    abilities: 'Veil Sight: Sees invisible/shadow-melded spirits within 60 ft; +10% to resist Hexing, illusions, and mental domination.',
    modSummary: '+5 DEX (55), +5 WIL (55), -5 STR (45)',
  },
  'Wendhya': {
    category: 'The Norn',
    modifiers: { str: -5, sta: 0, dex: 0, rs: 5, int: 0, log: 0, per: 5, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: true,
    trait_name: 'Spirit-Kin & Warg Bloodline',
    abilities: 'Spirit-Kin & Warg Bloodline: Eligible for the Warg skill; can sense nearby spirits, undead, or demonic taint within 30 ft automatically.',
    modSummary: '+5 WIL (55), +5 RS (55), -5 STR (45)',
  },
  'Weirgoth Dwarves': {
    category: 'The Norn',
    modifiers: { str: 0, sta: 5, dex: -5, rs: 0, int: 0, log: 0, per: 5, ldr: 0 },
    movement: { walk: 25, run: 50, glide: 0 },
    movement_ft: 25,
    size: 'Medium',
    warg_eligible: true,
    trait_name: 'Stone-Blood & Warg Bloodline',
    abilities: 'Stone-Blood & Warg Bloodline: Eligible for the Warg skill (cavern/stone beasts); -2 damage per die from Poison and Slashing (25 ft base move).',
    modSummary: '+5 STA (55), +5 WIL (55), -5 DEX (45)',
  },
  'Vanir Dwarves': {
    category: 'The Norn',
    modifiers: { str: 5, sta: 5, dex: 0, rs: -5, int: 0, log: 0, per: 0, ldr: 0 },
    movement: { walk: 25, run: 50, glide: 0 },
    movement_ft: 25,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Runeforged Resilience',
    abilities: 'Runeforged Resilience: +10% resistance to hostile magic; ignores movement speed penalties of heavy armor (25 ft base move); can forge Runic magic items at Tradecraft Lvl 5+ without a co-caster.',
    modSummary: '+5 STR (55), +5 STA (55), -5 RS (45)',
  },
  'Frost Urkai': {
    category: 'The Urkai',
    modifiers: { str: 5, sta: 5, dex: 0, rs: 0, int: 0, log: -5, per: 0, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Rime-Born',
    abilities: 'Rime-Born: Takes half damage from Cold/Frost; ignores ice movement penalties (30 ft base move).',
    modSummary: '+5 STR (55), +5 STA (55), -5 HIST/REL (45)',
  },
  'Ash Urkai': {
    category: 'The Urkai',
    modifiers: { str: 5, sta: 5, dex: 0, rs: 0, int: 0, log: -5, per: 0, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Cinder-Born',
    abilities: 'Cinder-Born: Takes half damage from Fire/Heat; immune to smoke/ash inhalation penalties (30 ft base move).',
    modSummary: '+5 STR (55), +5 STA (55), -5 HIST/REL (45)',
  },
  'Forest Urkai': {
    category: 'The Urkai',
    modifiers: { str: 5, sta: 0, dex: 5, rs: 0, int: 0, log: -5, per: 0, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Thorn-Born',
    abilities: 'Thorn-Born: Takes half damage from Poison/Acid; +10% ambush/stealth in heavy overgrowth (30 ft base move).',
    modSummary: '+5 STR (55), +5 DEX (55), -5 HIST/REL (45)',
  },
  'Stone Urkai': {
    category: 'The Urkai',
    modifiers: { str: 5, sta: 10, dex: -5, rs: 0, int: 0, log: -5, per: 0, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Granite Hide',
    abilities: 'Granite Hide: Natural Damage Reduction (-2 damage per die from Slashing, Piercing, and Bludgeoning; 30 ft base move).',
    modSummary: '+5 STR (55), +10 STA (60), -5 DEX (45), -5 HIST/REL (45)',
  },
  'Orcish': {
    category: 'The Urkai',
    modifiers: { str: 5, sta: 5, dex: 0, rs: 0, int: -5, log: 0, per: 0, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Blood Fury',
    abilities: 'Blood Fury: When Stamina drops below 50% of Max STA, gains +10% to all Melee Attacks and +1d10 melee damage (30 ft base move).',
    modSummary: '+5 STR (55), +5 STA (55), -5 INT (45)',
  },
  'Hobgoblins': {
    category: 'The Urkai',
    modifiers: { str: 5, sta: 0, dex: 0, rs: 0, int: 0, log: 0, per: -5, ldr: 5 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Phalanx Discipline',
    abilities: 'Phalanx Discipline: Gains +5% to hit and -2 damage per die when within 5 ft (adjacent) of at least one allied token on the VTT grid (30 ft base move).',
    modSummary: '+5 STR (55), +5 PRE (55), -5 WIL (45)',
  },
  'Goblins': {
    category: 'The Urkai',
    modifiers: { str: -10, sta: -5, dex: 10, rs: 5, int: 0, log: 0, per: 0, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Small',
    warg_eligible: false,
    trait_name: 'Scurry & Skulk',
    abilities: 'Scurry & Skulk: Small size (3–4 ft tall, 40 lbs); +10% to Stealth & Secrecy; can move through enemy 5 ft spaces and disengage without triggering free strikes (30 ft base move).',
    modSummary: '+10 DEX (60), +5 RS (55), -10 STR (40), -5 STA (45)',
  },
  'True Giants': {
    category: 'The Giants',
    modifiers: { str: 20, sta: 20, dex: 0, rs: 0, int: 0, log: 0, per: 0, ldr: 0 },
    movement: { walk: 40, run: 80, glide: 0 },
    movement_ft: 40,
    size: 'Large',
    warg_eligible: false,
    trait_name: 'Elder Primordials',
    abilities: 'Elder Primordials: Large/Huge VTT footprint (10x10 ft or 15x15 ft, 12–20 ft tall); native mastery of Druidic, Arcane, or Ki power matching their lineage; immune to their native energy type (40 ft base move).',
    modSummary: '+20 STR (70), +20 STA (70)',
  },
  'Giantken / Goliath': {
    category: 'The Giants',
    modifiers: { str: 10, sta: 10, dex: -10, rs: 0, int: 0, log: -5, per: 0, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: "Titan's Heritage",
    abilities: "Titan's Heritage: 7–8 ft tall (280–340 lbs); wields two-handed weapons in one hand (+1d10 melee damage) and halves incoming knockback/push distances (30 ft base move).",
    modSummary: '+10 STR (60), +10 STA (60), -10 DEX (40), -5 HIST/REL (45)',
  },
  'Trollkin': {
    category: 'The Giants',
    modifiers: { str: 10, sta: 10, dex: 0, rs: 0, int: -10, log: 0, per: 0, ldr: -5 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Feral Regeneration',
    abilities: 'Feral Regeneration: Regains 5 STA at the start of each turn unless damaged by Fire or Acid since their last turn (30 ft base move).',
    modSummary: '+10 STR (60), +10 STA (60), -10 INT (40), -5 PRE (45)',
  },
  'Ogre': {
    category: 'The Giants',
    modifiers: { str: 15, sta: 15, dex: -10, rs: 0, int: -15, log: 0, per: 0, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Large',
    warg_eligible: false,
    trait_name: 'Crushing Bulk',
    abilities: 'Crushing Bulk: Large footprint (10x10 ft, 9–10 ft tall); melee strikes knock Medium or smaller targets Prone on a roll ending in 0 or 5 (30 ft base move).',
    modSummary: '+15 STR (65), +15 STA (65), -15 INT (35), -10 DEX (40)',
  },
  'Minotaur / Nord Minotaur': {
    category: 'The Giants',
    modifiers: { str: 10, sta: 5, dex: 0, rs: 0, int: -5, log: 0, per: 0, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Goring Charge',
    abilities: 'Goring Charge: Moving 20 ft+ (4+ grid squares) in a straight line before attacking adds +1d10 damage and knocks target Prone; Nord Minotaur also halves Cold damage (30 ft base move).',
    modSummary: '+10 STR (60), +5 STA (55), -5 INT (45)',
  },
  'Whisperlings': {
    category: 'Hybrid & Spirit-Infected Lineages',
    modifiers: { str: -5, sta: 0, dex: 5, rs: 0, int: 0, log: 0, per: 5, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Spirit-Infected',
    abilities: 'Spirit-Infected: Rooted in any Foundation Species and transformed by spirit infection. Gains half-damage resistance to one energy type (Fire, Shadow, or Cold) and +5% to Shadow, Demonology, or Witchcraft casting (30 ft base move).',
    modSummary: '+5 DEX (55), +5 WIL (55), -5 STR (45)',
  },
  'Mixlanders': {
    category: 'Hybrid & Spirit-Infected Lineages',
    modifiers: { str: 0, sta: -5, dex: 5, rs: 0, int: 5, log: 0, per: 0, ldr: 0 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Elven Amalgam',
    abilities: 'Elven Amalgam: A mixed-heritage blend of elven lineages (+5 to two stats, -5 to one stat). Inherits flexibility (+5% to any one secular skill check) and adapts easily to diverse regional magic traditions (30 ft base move).',
    modSummary: '+5 DEX (55), +5 INT (55), -5 STA (45)',
  },
  'Human': {
    category: 'Foundation Folk',
    modifiers: { str: 0, sta: 0, dex: 0, rs: 0, int: 5, log: 0, per: 0, ldr: 5 },
    movement: { walk: 30, run: 60, glide: 0 },
    movement_ft: 30,
    size: 'Medium',
    warg_eligible: false,
    trait_name: 'Adaptive Versatility',
    abilities: 'Adaptive Versatility: +5 INT (55), +5 PRE (55); gains +5% to any one chosen secular skill check (30 ft base move).',
    modSummary: '+5 INT (55), +5 PRE (55)',
  },
};

export const CARTRIDGE_LINEAGE_GROUPS = [
  {
    label: 'The Norn (Elves, Dwarves & Wendhya)',
    lineages: [
      'Dawn Elves',
      'Dusk Elves',
      'Sylvan Elves',
      'Wilder Elves',
      'Twilight Elves',
      'Wendhya',
      'Weirgoth Dwarves',
      'Vanir Dwarves',
    ],
  },
  {
    label: 'The Urkai & Goblinoid Clans',
    lineages: [
      'Frost Urkai',
      'Ash Urkai',
      'Forest Urkai',
      'Stone Urkai',
      'Orcish',
      'Hobgoblins',
      'Goblins',
    ],
  },
  {
    label: 'The Giants & Primordial Kin',
    lineages: [
      'True Giants',
      'Giantken / Goliath',
      'Trollkin',
      'Ogre',
      'Minotaur / Nord Minotaur',
    ],
  },
  {
    label: 'Hybrid, Spirit-Infected & Foundation Folk',
    lineages: [
      'Whisperlings',
      'Mixlanders',
      'Human',
    ],
  },
];

/**
 * Compute the 8 baseline ability scores for a given lineage name (applying modifiers to the 50 baseline).
 */
export function getLineageBaselineStats(lineageName) {
  const mods = RACES_DATA[lineageName]?.modifiers || {
    str: 0, sta: 0, dex: 0, rs: 0, int: 0, log: 0, per: 0, ldr: 0,
  };
  const str = 50 + (mods.str || 0);
  const sta = 50 + (mods.sta || 0);
  const dex = 50 + (mods.dex || 0);
  const rs = 50 + (mods.rs || 0);
  const int = 50 + (mods.int || 0);
  const log = 50 + (mods.log || 0);
  const per = 50 + (mods.per || 0);
  const ldr = 50 + (mods.ldr || 0);
  const max_ess = Math.max(per, log, sta);
  return {
    str,
    sta,
    dex,
    rs,
    int,
    log,
    per,
    ldr,
    max_stamina: sta,
    current_stamina: sta,
    max_ess,
    current_ess: max_ess,
  };
}

export const OFFICIAL_SKILLS = [
  // Wayworlds Core Secular Skills (10)
  { name: 'Melee Weapons', psa: 'Combat', baseChance: 'Melee Base (STR or DEX / 2)' },
  { name: 'Ranged Weapons', psa: 'Combat', baseChance: 'Dexterity' },
  { name: 'Striker & Grappler', psa: 'Combat', baseChance: 'Melee Base (STR or DEX / 2)' },
  { name: 'Armor & Shield Mastery', psa: 'Combat', baseChance: 'Stamina' },
  { name: 'Athletics & Acrobatics', psa: 'Combat', baseChance: 'Dexterity' },
  { name: 'Stealth & Secrecy', psa: 'Combat', baseChance: 'Dexterity' },
  { name: 'Wilderness & Survival', psa: 'Theurgy', baseChance: 'Intuition' },
  { name: 'Lore & Arcana', psa: 'Magic', baseChance: 'Logic' },
  { name: 'Influence & Deception', psa: 'Theurgy', baseChance: 'Personality' },
  { name: 'Herbalism & Medicine', psa: 'Theurgy', baseChance: 'Intuition' },
  // Open-Ended Tradecraft Skill
  { name: 'Tradecraft', psa: 'Magic', baseChance: 'Intuition' },
  // 10 Magic & Ki Traditions
  { name: 'Arcane', psa: 'Magic', baseChance: 'Intuition' },
  { name: 'Blood', psa: 'Theurgy', baseChance: 'Personality' },
  { name: 'Shadow', psa: 'Combat', baseChance: 'Dexterity' },
  { name: 'Demonology', psa: 'Theurgy', baseChance: 'Personality' },
  { name: 'Necromancy', psa: 'Magic', baseChance: 'Intuition' },
  { name: 'Druidic', psa: 'Theurgy', baseChance: 'Personality' },
  { name: 'Spiritual', psa: 'Theurgy', baseChance: 'Logic' },
  { name: 'Ki', psa: 'Combat', baseChance: 'Personality' },
  { name: 'Warg', psa: 'Theurgy', baseChance: 'Personality' },
  { name: 'Witchcraft', psa: 'Theurgy', baseChance: 'Intuition' },
];

export const MAGIC_TRADITIONS = [
  { name: 'Arcane', baseStat: 'int', baseStatLabel: 'INT', fuel: 'ess', description: 'Raw elemental manipulation, telekinesis, force wards, and scholarly enchantments.' },
  { name: 'Blood', baseStat: 'per', baseStatLabel: 'WIL', fuel: 'sta', description: 'Hemomancy and crimson curses; pays casting costs directly from Stamina (STA).' },
  { name: 'Shadow', baseStat: 'int_or_dex', baseStatLabel: 'INT or DEX', fuel: 'ess', description: 'Shadow-stepping, darkness generation, illusions, and umbral strikes.' },
  { name: 'Demonology', baseStat: 'per_or_ldr', baseStatLabel: 'WIL or PRE', fuel: 'ess', description: 'Infernal pacts and hellfire; can sacrifice 2 STA per 1 ESS to upcast.' },
  { name: 'Necromancy', baseStat: 'int_or_log', baseStatLabel: 'INT or HIST/REL', fuel: 'ess', description: 'Soul-draining, bone armor, raising undead thralls, and necrotic decay.' },
  { name: 'Druidic', baseStat: 'per', baseStatLabel: 'WIL', fuel: 'ess', description: 'Primal weather, entangling roots, stone-shaping, and natural regeneration.' },
  { name: 'Spiritual', baseStat: 'log_or_per', baseStatLabel: 'HIST/REL or WIL', fuel: 'ess', description: 'Ancestral/divine invocation, spirit-warding, radiant smiting, and soul-mending.' },
  { name: 'Ki', baseStat: 'sta_or_per', baseStatLabel: 'STA or WIL', fuel: 'ess', description: 'Internal martial energy enhancing unarmed/melee strikes, iron-body deflection, and speed.' },
  { name: 'Warg', baseStat: 'per', baseStatLabel: 'WIL', fuel: 'sta', description: 'Skin-changing and beast-bonding (Sylvan/Wilder Elves, Wendhya, Weirgoth Dwarves).' },
  { name: 'Witchcraft', baseStat: 'int_or_per', baseStatLabel: 'INT or WIL', fuel: 'ess', description: 'Hexes, evil-eye curses, fate-twisting, poultices/brews, and folk charms.' },
];

export const UNIVERSAL_MAGNITUDE_TABLE = [
  {
    tier: 0,
    cost: 0,
    strike: { dice: '1d6', count: 1, sides: 6, summary: 'Single Target (Up to 60 ft)' },
    blast_heal: { dice: '1d6', count: 1, sides: 6, flatHeal: 5, summary: '5 ft Burst OR Restore 5 STA' },
    ward_buff: { dice: '1d6', count: 1, sides: 6, summary: '+5% Skill/Defense OR 5 Temp Ward STA' },
    hex_summon: { dice: '1d6', count: 1, sides: 6, summary: '-5% Penalty (1 Round) OR Minor Illusion' },
  },
  {
    tier: 1,
    cost: 2,
    strike: { dice: '2d10', count: 2, sides: 10, summary: 'Single Target (Up to 60 ft)' },
    blast_heal: { dice: '1d10', count: 1, sides: 10, summary: '10 ft Burst OR Restore 1d10 STA' },
    ward_buff: { dice: '1d10', count: 1, sides: 10, summary: '-2 DR/die OR 10 Temp Ward STA OR +10% Skill' },
    hex_summon: { dice: '1d10', count: 1, sides: 10, summary: '-10% Penalty / Prone OR Tier 1 Thrall/Beast' },
  },
  {
    tier: 2,
    cost: 4,
    strike: { dice: '3d10', count: 3, sides: 10, summary: 'Single Target (Up to 90 ft)' },
    blast_heal: { dice: '2d10', count: 2, sides: 10, summary: '15 ft Cone/Burst OR Restore 2d10 STA' },
    ward_buff: { dice: '2d10', count: 2, sides: 10, summary: 'Half Damage (1 Type) OR 15 Temp Ward STA' },
    hex_summon: { dice: '2d10', count: 2, sides: 10, summary: '-15% Penalty / Pinned OR Tier 2 Thrall/Beast' },
  },
  {
    tier: 3,
    cost: 6,
    strike: { dice: '4d10', count: 4, sides: 10, summary: 'Single Target (Up to 120 ft)' },
    blast_heal: { dice: '3d10', count: 3, sides: 10, summary: '20 ft Sphere / 30 ft Line OR Restore 3d10 STA' },
    ward_buff: { dice: '3d10', count: 3, sides: 10, summary: 'Half Physical/Elemental OR 20 Temp Ward STA' },
    hex_summon: { dice: '3d10', count: 3, sides: 10, summary: 'Blinded / Stunned (1 Rd) OR Tier 3 Thrall/Beast' },
  },
  {
    tier: 4,
    cost: 8,
    strike: { dice: '5d10', count: 5, sides: 10, summary: 'Single Target (Up to 150 ft)' },
    blast_heal: { dice: '4d10', count: 4, sides: 10, summary: '25 ft Sphere OR Restore 4d10 STA (Allies)' },
    ward_buff: { dice: '4d10', count: 4, sides: 10, summary: '25 Temp Ward STA + +15% Attack/Defense' },
    hex_summon: { dice: '4d10', count: 4, sides: 10, summary: 'Paralyzed / Dominated OR Tier 4 Demon/Undead' },
  },
  {
    tier: 5,
    cost: 10,
    strike: { dice: '6d10', count: 6, sides: 10, summary: 'Single Target (Up to 240 ft)' },
    blast_heal: { dice: '5d10', count: 5, sides: 10, summary: '30 ft Sphere OR Restore 5d10 STA (Allies)' },
    ward_buff: { dice: '5d10', count: 5, sides: 10, summary: '30 Temp Ward STA + Flight / Ethereal Form' },
    hex_summon: { dice: '5d10', count: 5, sides: 10, summary: 'Mass Hex (20 ft) OR Tier 4 Pack / Greater Fiend' },
  },
  {
    tier: 6,
    cost: 12,
    strike: { dice: '8d10', count: 8, sides: 10, summary: 'Cataclysmic Lance (Up to 300 ft)' },
    blast_heal: { dice: '6d10', count: 6, sides: 10, summary: '40 ft Cataclysm OR Full Party Restoration (6d10)' },
    ward_buff: { dice: '6d10', count: 6, sides: 10, summary: '40 Temp Ward STA + Total Damage Immunity (1 Rd)' },
    hex_summon: { dice: '6d10', count: 6, sides: 10, summary: 'Soul-Bind / Banishment OR Tier 5 Apex Entity' },
  },
];

export const ALLOWED_TRADECRAFT_DOMAINS = [
  'Weaponsmith',
  'Armorsmith',
  'Armorer',
  'Bowyer / Fletcher',
  'Bowyer',
  'Leatherworker',
  'Jeweler / Lapidary',
  'Carpenter / Woodcarver',
  'Stonemason',
  'Tailor / Weaver',
  'Cartographer / Scribe',
  'Brewer / Cook',
  'Shipwright / Wainwright',
];

export const PROHIBITED_TRADECRAFT_TERMS = [
  'herbalist',
  'herbalism',
  'healer',
  'medic',
  'medicine',
  'alchemist',
  'apothecary',
  'locksmith',
  'runecaster',
  'swordsman',
  'archer',
  'wizard',
  'sorcerer',
];

export function getTraditionConfig(traditionName) {
  if (!traditionName) return MAGIC_TRADITIONS[0];
  return (
    MAGIC_TRADITIONS.find(
      (t) => t.name.toLowerCase() === String(traditionName).trim().toLowerCase()
    ) || MAGIC_TRADITIONS[0]
  );
}

export function getMagnitudeEntry(castTier = 0, category = 'strike') {
  const clamped = Math.max(0, Math.min(6, Number(castTier) || 0));
  const row = UNIVERSAL_MAGNITUDE_TABLE[clamped] || UNIVERSAL_MAGNITUDE_TABLE[0];
  let catKey = category;
  if (category === 'blast' || category === 'heal') catKey = 'blast_heal';
  else if (category === 'ward' || category === 'buff') catKey = 'ward_buff';
  else if (category === 'hex' || category === 'summon') catKey = 'hex_summon';
  else if (!['strike', 'blast_heal', 'ward_buff', 'hex_summon'].includes(category)) {
    catKey = 'strike';
  }
  return {
    tier: row.tier,
    cost: row.cost,
    ...row[catKey],
  };
}

export function calcCastCost(castTier = 0) {
  const clamped = Math.max(0, Math.min(6, Number(castTier) || 0));
  return clamped * 2;
}

export function calcTraditionBaseStatValue(char, traditionName) {
  if (!char) return 50;
  const cfg = getTraditionConfig(traditionName);
  const str = Number(char.str ?? 50);
  const sta = Number(char.sta ?? char.max_stamina ?? 50);
  const dex = Number(char.dex ?? 50);
  const int = Number(char.int ?? char.int_stat ?? 50);
  const log = Number(char.log ?? char.log_stat ?? 50);
  const wil = Number(char.per ?? 50);
  const pre = Number(char.ldr ?? 50);

  switch (cfg.baseStat) {
    case 'int':
      return int;
    case 'per':
      return wil;
    case 'int_or_dex':
      return Math.max(int, dex);
    case 'per_or_ldr':
      return Math.max(wil, pre);
    case 'int_or_log':
      return Math.max(int, log);
    case 'log_or_per':
      return Math.max(log, wil);
    case 'sta_or_per':
      return Math.max(sta, wil);
    case 'int_or_per':
      return Math.max(int, wil);
    default:
      return Math.max(int, wil, str);
  }
}

export function calcTraditionTargetPct(char, traditionName, explicitSkillLevel = null) {
  const statVal = calcTraditionBaseStatValue(char, traditionName);
  let skillLvl = explicitSkillLevel;
  if (skillLvl === null || skillLvl === undefined) {
    const skills = Array.isArray(char?.skills) ? char.skills : [];
    const match = skills.find(
      (s) => s && s.name && s.name.toLowerCase() === String(traditionName || '').toLowerCase()
    );
    skillLvl = match ? Number(match.level) || 0 : 0;
  }
  return Math.ceil(statVal / 2) + Math.max(0, Number(skillLvl) || 0) * 10;
}

export function validateTradecraftSpecialization(specName) {
  const trimmed = String(specName || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Tradecraft specialization domain is required.' };
  }
  const lower = trimmed.toLowerCase();
  if (PROHIBITED_TRADECRAFT_TERMS.some((term) => lower.includes(term))) {
    return {
      valid: false,
      error: `Specialization "${trimmed}" conflicts with a core skill or magic tradition (e.g., Herbalism & Medicine).`,
    };
  }
  return { valid: true, specialization: trimmed };
}

/**
 * Get a character's Tradecraft skill rank (0-6), optionally matching a specialization.
 */
export function getCharacterTradecraftRank(char, specialization = null) {
  if (!char || !Array.isArray(char.skills)) return 0;
  let maxRank = 0;
  for (const s of char.skills) {
    if (!s || typeof s !== 'object') continue;
    const name = String(s.name || '').trim().toLowerCase();
    if (name === 'tradecraft' || name.startsWith('tradecraft')) {
      if (
        !specialization ||
        !s.specialization ||
        String(s.specialization).trim().toLowerCase() === String(specialization).trim().toLowerCase()
      ) {
        maxRank = Math.max(maxRank, Number(s.level ?? s.rank ?? 0) || 0);
      }
    }
  }
  return maxRank;
}

/**
 * Calculate maximum Forge Item Tier (0 to 5, or 6) based on Tradecraft rank or GM override.
 */
export function calcMaxForgeTier(tradecraftRank = 0, isGm = false) {
  if (isGm) return 5;
  const r = Math.max(0, Number(tradecraftRank) || 0);
  if (r <= 0) return 0;
  return Math.min(5, r);
}

/**
 * Validate clean Nd10 (or 1d6) damage formula without flat + or - numeric modifiers.
 */
export function validateForgeDamageFormula(formula) {
  const str = String(formula || '').trim();
  if (!str) {
    return { valid: false, error: 'Damage dice formula is required.' };
  }
  // Reject flat numeric modifiers like +2, -1, 2d10+3, etc. (allow dice terms like + 1d10)
  if (/[+-]\s*\d+(?!\s*d)/i.test(str) || /^\d+$/.test(str)) {
    return {
      valid: false,
      error: `Invalid damage_dice "${str}". Flat damage modifiers (like +1 or +3) are prohibited; use clean Nd10 or 1d6.`,
    };
  }
  // Must contain at least one Nd10 or 1d6 term and no d4/d8/d12/d20 or multi-d6
  const diceMatches = str.match(/\d+d\d+/gi);
  if (!diceMatches || diceMatches.length === 0) {
    return {
      valid: false,
      error: `Invalid damage_dice "${str}". Use clean Nd10 or 1d6 dice.`,
    };
  }
  for (const dm of diceMatches) {
    if (!/^([1-9]\d*d10|1d6)$/i.test(dm)) {
      return {
        valid: false,
        error: `Invalid damage_dice "${str}". Flat damage modifiers and non-d10 dice are prohibited; use clean Nd10 or 1d6.`,
      };
    }
  }
  return { valid: true, formula: str };
}

export function validateForgedEquipment(item = {}, crafterTradecraftLevel = 1, isGm = false) {
  const errors = [];
  const maxTier = isGm ? 6 : Math.max(0, Math.min(6, Number(crafterTradecraftLevel) || 0));
  const itemTier = Number(item.item_tier ?? 1);

  if (!item.name || !String(item.name).trim()) {
    errors.push('Item name is required.');
  }
  if (!Number.isInteger(itemTier) || itemTier < 1 || itemTier > 6) {
    errors.push('Item Tier must be an integer between 1 and 6.');
  } else if (itemTier > maxTier) {
    errors.push(
      `Item Tier (${itemTier}) exceeds your maximum Tradecraft Forge Tier (Level ${maxTier}).`
    );
  }

  if (item.required_tradecraft) {
    const tcCheck = validateTradecraftSpecialization(item.required_tradecraft);
    if (!tcCheck.valid) {
      errors.push(tcCheck.error);
    }
  }

  if (item.damage_dice !== undefined && item.damage_dice !== null && String(item.damage_dice).trim() !== '') {
    const dmgCheck = validateForgeDamageFormula(item.damage_dice);
    if (!dmgCheck.valid) {
      errors.push(dmgCheck.error);
    }
  }

  if (item.attack_pct_bonus !== undefined && item.attack_pct_bonus !== null) {
    const bonus = Number(item.attack_pct_bonus);
    if (!Number.isFinite(bonus) || bonus < 0 || bonus > 30 || bonus % 5 !== 0) {
      errors.push('Attack % bonus must be a multiple of 5% between 0% and 30%.');
    }
    const tierMaxBonus = itemTier <= 2 ? 5 : itemTier <= 4 ? 10 : itemTier === 5 ? 15 : 20;
    if (bonus > tierMaxBonus) {
      errors.push(
        `Attack % bonus (+${bonus}%) exceeds the maximum allowed for Tier ${itemTier} (+${tierMaxBonus}%).`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    error: errors[0] || null,
  };
}

export const validateForgedItem = validateForgedEquipment;

/**
 * Calculate Character Tier (1 to 5) based on skill levels (or explicit tier override).
 */
export function calcCharacterTier(char) {
  if (!char) return 1;
  if (typeof char.tier === 'number' && char.tier >= 1 && char.tier <= 5) {
    return char.tier;
  }
  if (typeof char.threat_tier === 'number' && char.threat_tier >= 1 && char.threat_tier <= 5) {
    return char.threat_tier;
  }

  const skills = Array.isArray(char.skills) ? char.skills : [];
  let maxLevel = 0;
  let totalLevels = 0;
  for (const s of skills) {
    const lvl = typeof s === 'object' && s !== null ? Number(s.level ?? s.rank ?? 0) : 0;
    if (lvl > maxLevel) maxLevel = lvl;
    if (lvl > 0) totalLevels += lvl;
  }

  const grimoire = Array.isArray(char.grimoire)
    ? char.grimoire
    : Array.isArray(char.racial_abilities?.grimoire)
    ? char.racial_abilities.grimoire
    : [];
  for (const sp of grimoire) {
    const castTier = Number(sp?.default_tier ?? sp?.tier ?? 0);
    if (castTier > maxLevel) maxLevel = castTier;
  }

  if (maxLevel >= 6 || totalLevels >= 15) return 5;
  if (maxLevel >= 5 || totalLevels >= 10) return 4;
  if (maxLevel >= 3 || totalLevels >= 6) return 3;
  if (maxLevel >= 2 || totalLevels >= 3) return 2;
  return 1;
}

/**
 * Normalize PSA values to canonical Wayworlds terms (Combat, Magic, Theurgy).
 */
export function normalizePSA(psa) {
  if (!psa) return psa;
  if (psa === 'Military') return 'Combat';
  if (psa === 'Technological') return 'Magic';
  if (psa === 'Biosocial') return 'Theurgy';
  return psa;
}

/**
 * Calculate the XP cost to advance a skill to `nextLevel` (1 to 6).
 * Universal XP Cost Formula: 3 * nextLevel (Level 1: 3 XP, Level 2: 6 XP, Level 3: 9 XP, Level 4: 12 XP, Level 5: 15 XP, Level 6: 18 XP).
 */
export function calcXPCost(skillName, nextLevel, charPSA, explicitSkillPSA = null) {
  if (nextLevel < 1 || nextLevel > 6) return 0;

  const baseCost = nextLevel * 3;
  const official = OFFICIAL_SKILLS.find((s) => s.name === skillName);
  const effectiveSkillPSA = explicitSkillPSA || (official ? official.psa : null);
  const normCharPSA = normalizePSA(charPSA);
  const normSkillPSA = normalizePSA(effectiveSkillPSA);
  if (normSkillPSA && normCharPSA && normSkillPSA !== normCharPSA) {
    return baseCost * 2;
  }
  return baseCost;
}

/**
 * Calculate Initiative Modifier IM = ceil(RS / 10).
 */
export function calcIM(rs) {
  const val = rs ?? 50;
  return Math.ceil(val / 10);
}

/**
 * Calculate unarmed / punch damage bracket from STR.
 */
export function calcPunchDamage(str) {
  const s = str ?? 50;
  if (s <= 20) return '1';
  if (s <= 40) return '2';
  if (s <= 60) return '3';
  if (s <= 80) return '4';
  return '5';
}

/**
 * Calculate base melee hit % = Higher of ceil(STR / 2) or ceil(DEX / 2).
 */
export function calcMeleeHit(str, dex) {
  const s = str ?? 50;
  const d = dex ?? 50;
  return Math.max(Math.ceil(s / 2), Math.ceil(d / 2));
}

/**
 * Calculate carrying capacity from STR.
 */
export function calcMaxCarry(str) {
  const s = str ?? 50;
  return s;
}

/**
 * Calculate unencumbered carry threshold = ceil(STR / 2).
 */
export function calcUnencumberedMax(str) {
  const s = str ?? 50;
  return Math.ceil(s / 2);
}
