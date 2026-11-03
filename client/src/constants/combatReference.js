/**
 * Wayworlds d100 Combat Quick Reference Data
 *
 * Pure data constants for the Quick Reference Drawer component.
 * Covers Ranged Weapon Combat (Bows, Crossbows, Thrown) and Melee Combat
 * tables, modifiers, sequence of play, and armor/shields per Wayworlds d100 Core Spec.
 */

export const RANGED_COMBAT_REF = {
  title: 'Ranged Weapon Combat',
  baseRule:
    'Base Hit Chance = 1/2 DEX (rounded up) + (10 x Ranged Weapons Skill Rank). Roll d100 <= Modified Hit Chance to hit. Doubles <= hit target score a Critical Hit; doubles > hit target or 99-00 trigger a Fumble.',

  sequenceOfPlay: [
    { step: 1, name: 'Initiative', description: 'Roll 1d10 + IM (floor(RS / 10)). Highest acts first; ties go to higher RS.' },
    { step: 2, name: 'Movement & Action Economy', description: 'Spend Movement (Walk / Dash in ft) and up to 2 Actions (or 1 Full-Round Action) on your turn.' },
    { step: 3, name: 'Declare Ranged Attack', description: 'Name target, verify Line of Sight, measure range band, and check ammunition/loading state.' },
    { step: 4, name: 'Resolve Ranged Attacks', description: 'Compute Modified Hit Chance (Base + range, cover, aim, and movement modifiers), then roll d100.' },
    { step: 5, name: 'Apply Damage & Armor DR', description: 'Roll weapon damage dice and subtract target Armor Soak (DR). Remaining damage reduces STA.' },
    { step: 6, name: 'Reactions & End of Turn', description: 'Resolve Shield Block or Dodge reactions (up to 2 Reactions per round) and track spent arrows/bolts.' },
  ],

  weapons: [
    {
      name: 'Shortbow',
      category: 'Bow',
      damage: '1d10',
      rof: '1 / Action',
      shortRange: '0-80ft',
      medRange: '81-160ft',
      longRange: '161-320ft',
      ammo: 'Quiver (20)',
      notes: 'Two-Handed; nimble hunting and skirmish bow',
    },
    {
      name: 'Longbow',
      category: 'Bow',
      damage: '2d10',
      rof: '1 / Action',
      shortRange: '0-150ft',
      medRange: '151-300ft',
      longRange: '301-600ft',
      ammo: 'Quiver (20)',
      notes: 'Two-Handed, Heavy (Min STR 50); war bow',
    },
    {
      name: 'Composite Bow',
      category: 'Bow',
      damage: '2d10+2',
      rof: '1 / Action',
      shortRange: '0-120ft',
      medRange: '121-240ft',
      longRange: '241-480ft',
      ammo: 'Quiver (20)',
      notes: 'Two-Handed, Heavy (Min STR 55); recurve horn-and-sinew bow; usable mounted',
    },
    {
      name: 'Light Crossbow',
      category: 'Crossbow',
      damage: '2d10',
      rof: '1 / Reload (1 Action)',
      shortRange: '0-80ft',
      medRange: '81-160ft',
      longRange: '161-320ft',
      ammo: 'Case (20)',
      notes: 'Two-Handed, Loading (1 Action to reload)',
    },
    {
      name: 'Heavy Crossbow',
      category: 'Crossbow',
      damage: '3d10',
      rof: '1 / Full Reload',
      shortRange: '0-100ft',
      medRange: '101-200ft',
      longRange: '201-400ft',
      ammo: 'Case (20)',
      notes: 'Two-Handed, Heavy, Loading (Full Round), Armor Piercing (ignores 2 DR)',
    },
    {
      name: 'Hand Crossbow',
      category: 'Crossbow',
      damage: '1d10',
      rof: '1 / Reload (1 Action)',
      shortRange: '0-30ft',
      medRange: '31-60ft',
      longRange: '61-120ft',
      ammo: 'Case (20)',
      notes: 'One-Handed, Light, Loading (1 Action to reload)',
    },
    {
      name: 'Sling',
      category: 'Sling',
      damage: '1d10-1',
      rof: '1 / Action',
      shortRange: '0-30ft',
      medRange: '31-60ft',
      longRange: '61-120ft',
      ammo: 'Pouch (20)',
      notes: 'One-Handed, Blunt; hurls lead bullets or smooth stones',
    },
    {
      name: 'Javelin',
      category: 'Thrown',
      damage: '1d10 + STR Mod',
      rof: '1 / Thrown',
      shortRange: '0-30ft',
      medRange: '31-60ft',
      longRange: '61-120ft',
      ammo: '1 (Thrown)',
      notes: 'Thrown or Melee; adds melee STR Damage Modifier',
    },
    {
      name: 'Throwing Axe',
      category: 'Thrown',
      damage: '1d10 + STR Mod',
      rof: '1 / Thrown',
      shortRange: '0-20ft',
      medRange: '21-40ft',
      longRange: '41-60ft',
      ammo: '1 (Thrown)',
      notes: 'One-Handed, Light, Thrown; adds melee STR Damage Modifier',
    },
    {
      name: 'Thrown Dagger / Kunai',
      category: 'Thrown',
      damage: '1d10-2 + STR Mod',
      rof: '1 / Thrown',
      shortRange: '0-20ft',
      medRange: '21-40ft',
      longRange: '41-60ft',
      ammo: '1 (Thrown)',
      notes: 'One-Handed, Light, Finesse, Concealable',
    },
    {
      name: 'Dart',
      category: 'Thrown',
      damage: '1d5 + STR Mod',
      rof: '1 / Thrown',
      shortRange: '0-20ft',
      medRange: '21-40ft',
      longRange: '41-60ft',
      ammo: '1 (Thrown)',
      notes: 'One-Handed, Light, Finesse; weighted throwing dart',
    },
    {
      name: 'Bolas / Entangling Net',
      category: 'Thrown',
      damage: '1d5 (Snare)',
      rof: '1 / Thrown',
      shortRange: '0-15ft',
      medRange: '16-30ft',
      longRange: '31-45ft',
      ammo: '1 (Thrown)',
      notes: 'Entangling; on hit, target is Restrained until freed (1 Action STR/DEX check)',
    },
  ],

  modifiers: [
    { condition: 'Point Blank range (within 10 ft, unengaged)', modifier: '+10%', notes: 'Clear close-quarters shot when no enemy is within 5 ft' },
    { condition: 'Short range', modifier: '+0%', notes: 'Within weapon short range increment' },
    { condition: 'Medium range', modifier: '-10%', notes: 'Within weapon medium range increment' },
    { condition: 'Long range', modifier: '-25%', notes: 'Within weapon long range increment' },
    { condition: 'Extreme range (up to 1.5x Long Range, bows only)', modifier: '-40%', notes: 'High-arc volley shot; bows and heavy crossbows only' },
    { condition: 'Careful Aim (1 Action spent aiming)', modifier: '+15%', notes: 'Must have Line of Sight and not Dash this turn' },
    { condition: 'Attacker Moved / Walked this turn', modifier: '-10%', notes: 'Shooting on the move' },
    { condition: 'Target Running / Dashing or Evading', modifier: '-15%', notes: 'Fast-moving or actively dodging target' },
    { condition: 'Shooting while Engaged in Melee (within 5 ft)', modifier: '-20%', notes: 'Provokes Opportunity Attack unless using Hand Crossbow or Thrown Dagger' },
    { condition: 'Target in Soft Cover (foliage, crates, allies)', modifier: '-15%', notes: 'Partial obstruction' },
    { condition: 'Target in Hard Cover (stone wall, battlements)', modifier: '-30%', notes: 'Three-quarters cover; arrow slits grant -40%' },
    { condition: 'Dim Light / Heavy Fog / Rain', modifier: '-15%', notes: 'Dawn/Dusk/Twilight Elves and Dwarves ignore dim light penalty' },
    { condition: 'Total Darkness / Blinded', modifier: '-40%', notes: 'Requires Athletics & Perception hearing check to locate square' },
    { condition: 'Target Prone (at Ranged > 10 ft)', modifier: '-15%', notes: 'Smaller silhouette against ranged fire' },
    { condition: 'Target Size: Small (Whisperling, Goblin)', modifier: '-10%', notes: 'Smaller target profile' },
    { condition: 'Target Size: Large or Huge (Ogre, Giant, Minotaur)', modifier: '+10% / +20%', notes: '+10% vs Large (2x2), +20% vs Huge (3x3)' },
  ],

  armor: [
    {
      name: 'Light Armor (Padded, Leather, Studded Leather, Hide)',
      type: 'Light Armor',
      protection: '2 - 4 DR per hit',
      notes: 'Padded (2 DR), Leather (3 DR), Studded Leather / Hide (4 DR). Full movement; no stealth or casting penalty.',
    },
    {
      name: 'Medium Armor (Chain Shirt, Scale Mail, Chainmail, Brigandine)',
      type: 'Medium Armor',
      protection: '5 - 7 DR per hit',
      notes: 'Chain Shirt (5 DR), Scale Mail / Breastplate (6 DR), Chainmail / Brigandine (7 DR). -10% Stealth on heavy chain/scale.',
    },
    {
      name: 'Heavy Armor (Splint, Half-Plate, Full Plate, Runeforged)',
      type: 'Heavy Armor',
      protection: '8 - 12 DR per hit',
      notes: 'Splint (8 DR), Half-Plate (9 DR), Full Plate (10 DR), Dwarven Stone-Plate (11 DR), Runeforged Plate (12 DR). Min STR 55-65.',
    },
    {
      name: 'Shields (Buckler, Wooden, Iron Heater, Tower, Runeforged)',
      type: 'Shield',
      protection: '+1 to +3 DR & Shield Block',
      notes: 'Buckler (+1 DR, +5% Block), Wooden/Iron Shield (+2 DR, +10% Block), Tower Shield (+3 DR, +15% Block vs ranged).',
    },
    {
      name: 'Magical Wards (Arcane Shield, Barkskin, Blood Aegis)',
      type: 'Supernatural Ward',
      protection: '+2 to +6 Ward DR',
      notes: 'Stacks with physical armor unless tradition rules specify otherwise; absorbs physical and elemental damage.',
    },
  ],
};

export const MELEE_COMBAT_REF = {
  title: 'Melee Combat',
  attackBaseFormula:
    'Base Hit Chance = 1/2 STR (or 1/2 DEX for Finesse weapons, rounded up) + (10 x Melee Weapons Skill Rank) + Weapon Accuracy Bonus. Add STR Damage Modifier (+1 per 10 full STR above 40; -1 per 10 below 40).',
  baseRule:
    'Base Hit Chance = 1/2 STR (or 1/2 DEX for Finesse weapons, rounded up) + (10 x Melee Weapons Skill Rank) + Weapon Accuracy Bonus. Add STR Damage Modifier (+1 per 10 full STR above 40; -1 per 10 below 40).',

  unarmedDamage: [
    { strBracket: '01 - 29', punchDamage: '1d5 - 2 (min 1)', kickDamage: '1d5 - 1 (min 1)' },
    { strBracket: '30 - 39', punchDamage: '1d5 - 1 (min 1)', kickDamage: '1d5' },
    { strBracket: '40 - 49 (Baseline)', punchDamage: '1d5', kickDamage: '1d5 + 1' },
    { strBracket: '50 - 59 (Baseline)', punchDamage: '1d5 + 1', kickDamage: '1d5 + 2' },
    { strBracket: '60 - 69', punchDamage: '1d5 + 2', kickDamage: '1d5 + 3' },
    { strBracket: '70 - 79', punchDamage: '1d5 + 3', kickDamage: '1d10' },
    { strBracket: '80+', punchDamage: '1d10 + 1', kickDamage: '1d10 + 3' },
  ],

  weapons: [
    {
      name: 'Unarmed Strike / Brawling / Grapple',
      damage: '1d5 + STR Mod',
      weight: '0 lbs',
      special: 'Natural weapon; Ki adepts and Minotaur Horns (1d10) deal lethal damage without penalty',
    },
    {
      name: 'Dagger / Kunai',
      damage: '1d10-2 + STR Mod',
      weight: '1 lb',
      special: 'One-Handed, Light, Finesse (may use DEX), Thrown (20/40/60ft), +5% Hit Bonus',
    },
    {
      name: 'Shortsword / Scimitar',
      damage: '1d10 + STR Mod',
      weight: '2-3 lbs',
      special: 'One-Handed, Light, Finesse (may use DEX), +5% Hit Bonus; ideal for dual-wielding',
    },
    {
      name: 'Rapier',
      damage: '1d10 + STR Mod',
      weight: '2 lbs',
      special: 'One-Handed, Finesse (may use DEX), Defensive (+5% Parry), +5% Hit Bonus',
    },
    {
      name: 'Handaxe / Light Hammer / Sickle',
      damage: '1d10 + STR Mod',
      weight: '2 lbs',
      special: 'One-Handed, Light, Thrown (20/40/60ft)',
    },
    {
      name: 'Club / Mace / Quarterstaff',
      damage: '1d10 + STR Mod',
      weight: '3-4 lbs',
      special: 'Blunt; Quarterstaff is Versatile (1d10+2 Two-Handed) and Defensive (+5% Parry)',
    },
    {
      name: 'Spear',
      damage: '1d10 + STR Mod',
      weight: '3 lbs',
      special: 'Versatile (1d10+2 Two-Handed), Reach (10ft when Two-Handed), Thrown (20/40/60ft)',
    },
    {
      name: 'Broadsword / Longsword',
      damage: '1d10+2 + STR Mod',
      weight: '3 lbs',
      special: 'One-Handed, Versatile (2d10-2 Two-Handed), +5% Hit Bonus',
    },
    {
      name: 'Battleaxe / Warhammer / Flail',
      damage: '1d10+3 + STR Mod',
      weight: '4 lbs',
      special: 'One-Handed; Warhammer ignores 1 DR vs Heavy Armor; Flail ignores Shield bonus',
    },
    {
      name: 'Bastard Sword',
      damage: '2d10-1 + STR Mod',
      weight: '5 lbs',
      special: 'Versatile (One-Handed if STR >= 55; Two-Handed otherwise), +5% Hit Bonus',
    },
    {
      name: 'Greatsword / Greataxe / Maul',
      damage: '2d10+2 + STR Mod',
      weight: '6-10 lbs',
      special: 'Two-Handed, Heavy (Min STR 55), Cleave; Maul ignores 2 DR vs Heavy Armor',
    },
    {
      name: 'Halberd / Glaive / Pike',
      damage: '2d10 + STR Mod',
      weight: '6-8 lbs',
      special: 'Two-Handed, Heavy (Min STR 55), Reach (10ft), Brace vs Charge (+2d10 damage)',
    },
  ],

  modifiers: [
    { situation: 'Charging Attack (move >= 20 ft in straight line)', modifier: '+10% Hit, +1d5 Dmg', notes: 'Grants -10% to attacker Defense until next turn' },
    { situation: 'Flanking / Rear Attack (ally opposite target)', modifier: '+15%', notes: 'Requires an active ally threatening the opposite side of target' },
    { situation: 'High Ground Advantage (elevated terrain / mounted)', modifier: '+10%', notes: 'Attacker on higher elevation or mounted vs infantry' },
    { situation: 'Target Prone (vs Melee Attack)', modifier: '+20%', notes: 'Standing up from Prone costs half of base Walk speed' },
    { situation: 'Target Stunned, Restrained, or Blinded', modifier: '+20%', notes: 'Target cannot take Opportunity Attacks while Stunned/Blinded' },
    { situation: 'Defensive Stance / Fighting Defensively', modifier: '-15% Hit', notes: 'Grants +15% to Parry and Dodge reactions until start of next turn' },
    { situation: 'Dual-Wielding (Two Light Melee Weapons)', modifier: '-10% / -15%', notes: 'Allows 1 bonus off-hand attack; reduced by 5% at Melee Rank 3+' },
    { situation: 'Parry or Shield Block Reaction', modifier: '-10% to -(10 x Rank)%', notes: 'Spends 1 Reaction to impose penalty on incoming melee attack' },
    { situation: 'Improvised Melee Weapon (torch, chair, rock)', modifier: '-15%', notes: 'Base 1d5 + STR Mod damage; breaks on Fumble' },
  ],
};

export const ADDITIONAL_RULES_REF = {
  title: 'Additional Rules',
  description: 'Supplementary mechanics, mounted travel, and situational rules for Wayworlds d100.',
  mountsAndMovement: [
    {
      subject: 'Horse Movement (Riding Horse)',
      tacticalSpeed: '50 ft / Action (Dash: 100 ft)',
      overlandSpeed: '4 mph (24–32 miles / day); Gallop: 8 mph',
      capacity: '1 Rider + 250 lbs cargo',
      mechanics:
        'Rider shares mount movement without spending own movement actions. Grants +10% Melee Hit bonus vs targets on foot. Mounting or dismounting costs half of base Walk speed. If mount is reduced to 0 STA or knocked prone, rider must pass an Athletics & Acrobatics check or fall Prone in an adjacent 5 ft square, taking 1d10 damage.',
    },
  ],
};
