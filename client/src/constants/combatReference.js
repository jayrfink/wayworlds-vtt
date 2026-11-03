/**
 * Wayworlds Combat Quick Reference Constants
 * Derived from Wayworlds d100 core combat rules.
 */

export const RANGED_COMBAT_REF = {
  sequenceOfPlay: [
    {
      step: 1,
      name: 'Initiative',
      description: 'Compare Reaction Speed (IM = ceil(RS / 10)). Highest initiative acts first.'
    },
    {
      step: 2,
      name: 'Movement',
      description: 'Characters may walk up to their walking speed or sprint up to running speed in meters.'
    },
    {
      step: 3,
      name: 'Actions',
      description: 'Perform combat actions: Aim (+10%), Shoot/Fire weapon, Reload clip/battery, Throw grenade, or change stance.'
    },
    {
      step: 4,
      name: 'Damage & Effects',
      description: 'Roll weapon damage, deduct armor/screens absorption, and apply remaining damage to Stamina.'
    }
  ],

  weapons: [
    {
      name: 'Laser Pistol',
      category: 'Beam Weapon',
      damage: '1d10 to 10d10 (dial)',
      rof: 1,
      shortRange: '10m',
      medRange: '25m',
      longRange: '50m',
      ammo: '20 ESS clip',
      notes: 'Dial setting determines ESS drained and damage dice rolled'
    },
    {
      name: 'Laser Rifle',
      category: 'Beam Weapon',
      damage: '1d10 to 20d10 (dial)',
      rof: 1,
      shortRange: '30m',
      medRange: '75m',
      longRange: '150m',
      ammo: '20 ESS clip or Backpack (100 ESS)',
      notes: 'High-power dialable beam weapon'
    },
    {
      name: 'Electrostunner',
      category: 'Energy Weapon',
      damage: 'Stun',
      rof: 1,
      shortRange: '5m',
      medRange: '15m',
      longRange: '30m',
      ammo: '20 ESS clip',
      notes: 'Non-lethal electrical discharge; causes unconsciousness on failed STA check'
    },
    {
      name: 'Automatic Pistol',
      category: 'Projectile Weapon',
      damage: '1d10',
      rof: 2,
      shortRange: '10m',
      medRange: '25m',
      longRange: '50m',
      ammo: '20 bullets',
      notes: 'Semi-automatic slug thrower'
    },
    {
      name: 'Automatic Rifle',
      category: 'Projectile Weapon',
      damage: '1d10',
      rof: 3,
      shortRange: '30m',
      medRange: '75m',
      longRange: '150m',
      ammo: '20 bullets',
      notes: 'Burst fire: +10% to hit, +1d10 damage (expends 3 rounds)'
    },
    {
      name: 'Gyrojet Pistol',
      category: 'Gyrojet Weapon',
      damage: '1d10',
      rof: 2,
      shortRange: '10m',
      medRange: '25m',
      longRange: '50m',
      ammo: '10 rockets',
      notes: 'Micro-rocket launcher pistol; low recoil'
    },
    {
      name: 'Gyrojet Rifle',
      category: 'Gyrojet Weapon',
      damage: '1d10',
      rof: 2,
      shortRange: '30m',
      medRange: '75m',
      longRange: '150m',
      ammo: '10 rockets',
      notes: 'Micro-rocket long rifle with extended range'
    },
    {
      name: 'Needler',
      category: 'Special Weapon',
      damage: 'Poison / Sleep',
      rof: 3,
      shortRange: '5m',
      medRange: '15m',
      longRange: '30m',
      ammo: '10 needles',
      notes: 'Silent flechette weapon loaded with tranquilizer or toxin'
    },
    {
      name: 'Frag Grenade',
      category: 'Grenade',
      damage: '5d10',
      rof: 1,
      shortRange: 'STR / 2 meters',
      medRange: '-',
      longRange: '-',
      ammo: '1 grenade',
      notes: 'Blast radius 5m; halved damage outside 2m radius'
    },
    {
      name: 'Doze Grenade',
      category: 'Grenade',
      damage: 'Sleep Gas',
      rof: 1,
      shortRange: 'STR / 2 meters',
      medRange: '-',
      longRange: '-',
      ammo: '1 grenade',
      notes: 'Blast radius 5m; produces sleep-inducing gas cloud'
    },
    {
      name: 'Smoke Grenade',
      category: 'Grenade',
      damage: 'Obscuration',
      rof: 1,
      shortRange: 'STR / 2 meters',
      medRange: '-',
      longRange: '-',
      ammo: '1 grenade',
      notes: 'Blast radius 10m; blocks vision and laser lines of sight'
    },
    {
      name: 'Tangler Grenade',
      category: 'Grenade',
      damage: 'Restraining fibers',
      rof: 1,
      shortRange: 'STR / 2 meters',
      medRange: '-',
      longRange: '-',
      ammo: '1 grenade',
      notes: 'Blast radius 3m; immobilizes targets caught in strong polymer threads'
    }
  ],

  modifiers: [
    {
      condition: 'Point Blank range',
      modifier: '+20%',
      notes: 'Target within 2 meters'
    },
    {
      condition: 'Short range',
      modifier: '0%',
      notes: 'Standard base weapon range'
    },
    {
      condition: 'Medium range',
      modifier: '-10%',
      notes: 'Beyond short range up to medium range limit'
    },
    {
      condition: 'Long range',
      modifier: '-20%',
      notes: 'Beyond medium range up to long range limit'
    },
    {
      condition: 'Extreme range',
      modifier: '-30%',
      notes: 'Beyond long range limit up to maximum effective weapon range'
    },
    {
      condition: 'Target moving fast / running',
      modifier: '-10%',
      notes: 'Target is sprinting or executing evasive dash'
    },
    {
      condition: 'Target in soft cover',
      modifier: '-10%',
      notes: 'Foliage, light furniture, translucent barriers'
    },
    {
      condition: 'Target in hard cover',
      modifier: '-20%',
      notes: 'Stone walls, metal bulkheads, armor plates'
    },
    {
      condition: 'Partial darkness / smoke',
      modifier: '-15%',
      notes: 'Dim lighting, mist, light smoke screens'
    },
    {
      condition: 'Total darkness / blind',
      modifier: '-30%',
      notes: 'Zero-visibility environments'
    },
    {
      condition: 'Careful Aim (1 turn)',
      modifier: '+10%',
      notes: 'Spend full turn aiming without moving (max +20% for 2 turns)'
    },
    {
      condition: 'Target Prone',
      modifier: '+10% within 10m, -10% at distance',
      notes: 'Easier to hit up close, harder to silhouette at long distance'
    }
  ],

  armor: [
    {
      name: 'Skeinsuit',
      type: 'Ballistic Cloth',
      protection: 'Halves projectile, bullet, and blast damage',
      notes: 'Flexible lightweight weave; no effect on laser or energy weapons'
    },
    {
      name: 'Albedo Suit',
      type: 'Ablative Suit',
      protection: 'Absorbs up to 20 pts of laser damage before degradation',
      notes: 'Reflective surface; ineffective against bullets or kinetic trauma'
    },
    {
      name: 'Albedo Screen',
      type: 'Energy Shield',
      protection: 'Absorbs laser damage (1 ESS per 2 pts absorbed)',
      notes: 'Belt-mounted powered field; protects against laser and beam attacks'
    },
    {
      name: 'Inertia Screen',
      type: 'Kinetic Shield',
      protection: 'Absorbs kinetic and blast damage',
      notes: 'Belt-mounted force field; cushions against bullets, shrapnel, and falls'
    }
  ]
};

export const MELEE_COMBAT_REF = {
  attackBaseFormula: 'Higher of ceil(STR / 2) or ceil(DEX / 2) + (Melee Weapons skill level * 10%)',

  unarmedDamage: [
    {
      strBracket: 'STR 1-20',
      punchDamage: '1 pt punch',
      kickDamage: '1d10/2 kick'
    },
    {
      strBracket: 'STR 21-40',
      punchDamage: '2 pts punch',
      kickDamage: '1d10 kick'
    },
    {
      strBracket: 'STR 41-60',
      punchDamage: '3 pts punch',
      kickDamage: '1d10+1 kick'
    },
    {
      strBracket: 'STR 61-80',
      punchDamage: '4 pts punch',
      kickDamage: '1d10+2 kick'
    },
    {
      strBracket: 'STR 81+',
      punchDamage: '5 pts punch',
      kickDamage: '1d10+3 kick'
    }
  ],

  weapons: [
    {
      name: 'Knife',
      damage: '1d10 / 2',
      weight: '0.5 kg',
      special: 'Can be thrown (short range 5m)'
    },
    {
      name: 'Vibroknife',
      damage: '1d10',
      weight: '1 kg',
      special: 'Powered blade (1 ESS per minute of combat)'
    },
    {
      name: 'Stun Baton',
      damage: 'Stun damage',
      weight: '1 kg',
      special: 'Non-lethal electrical shock (uses 2 ESS per hit)'
    },
    {
      name: 'Club / Staff',
      damage: '1d10 / 2',
      weight: '1-2 kg',
      special: 'Simple bludgeoning weapon; can parry'
    },
    {
      name: 'Sword / Machete',
      damage: '1d10',
      weight: '2 kg',
      special: 'Edged blade; standard one-handed weapon'
    },
    {
      name: 'Axe',
      damage: '1d10+1',
      weight: '2.5 kg',
      special: 'Heavy cleaving weapon'
    }
  ],

  modifiers: [
    {
      situation: 'Charging into melee',
      modifier: '+10%',
      notes: '+10% to hit, but opponent attacks first'
    },
    {
      situation: 'Defending / dodging',
      modifier: '-10%',
      notes: '-10% to attacker\'s hit chance; defender forfeit own attack'
    },
    {
      situation: 'Multiple attackers',
      modifier: '+5% per additional attacker',
      notes: 'Applies up to maximum of +20%'
    },
    {
      situation: 'Target prone / pinned',
      modifier: '+20%',
      notes: 'Target cannot dodge effectively while on ground or held'
    },
    {
      situation: 'Yazirian Battle Rage',
      modifier: '+20%',
      notes: '+20% to hit in melee; enraged Yazirians fight without fear'
    }
  ]
};
