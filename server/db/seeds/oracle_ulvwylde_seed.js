/**
 * Comprehensive UlvWylde Narrative Oracle & Arc Engine Seed Data
 * Wayworlds VTT - Dark Gothic Fantasy Lore
 *
 * Includes:
 * - 3 Default Environments
 * - 6 Preloaded Narrative Arcs (2 per environment)
 * - 160+ Richly detailed Oracle Fragments with CFG tokens and mechanical VTT handoffs
 */

export function seedOracle(db) {
  const insertEnv = db.prepare(`
    INSERT INTO oracle_environments (name, description)
    VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET description = excluded.description
  `);

  const insertArc = db.prepare(`
    INSERT INTO oracle_arcs (environment_id, title, synopsis, is_custom)
    VALUES (?, ?, ?, 0)
  `);

  const insertFragment = db.prepare(`
    INSERT INTO oracle_fragments (environment_id, arc_id, category, resolution_weight, text_value)
    VALUES (?, ?, ?, ?, ?)
  `);

  const seedTransaction = db.transaction(() => {
    // -------------------------------------------------------------
    // 1. ENVIRONMENTS
    // -------------------------------------------------------------
    const envs = [
      {
        name: 'UlvWylde: The Rime Wastes',
        description: 'A frozen tundra of howling blizzards, black-ice fissures, and towering glacial monoliths where warmth is as rare as mercy.',
      },
      {
        name: 'UlvWylde: The Ice Mire',
        description: 'A treacherous peat wetland frozen over with treacherous black ice, decaying barrows, weeping willow-thickets, and sulfurous bogs.',
      },
      {
        name: 'UlvWylde: Ironhold Citadels',
        description: 'Colossal mountain fortresses carved into basalt peaks, guarded by grim wardens, ancient arcane ballistas, and deep subterranean vault crypts.',
      },
    ];

    const envMap = {};
    for (const env of envs) {
      insertEnv.run(env.name, env.description);
      const row = db.prepare('SELECT id FROM oracle_environments WHERE name = ?').get(env.name);
      envMap[env.name] = row.id;
    }

    const rimeId = envMap['UlvWylde: The Rime Wastes'];
    const mireId = envMap['UlvWylde: The Ice Mire'];
    const ironId = envMap['UlvWylde: Ironhold Citadels'];

    // -------------------------------------------------------------
    // 2. NARRATIVE ARCS (6 total, 2 per environment)
    // -------------------------------------------------------------
    const arcs = [
      // Rime Wastes Arcs
      {
        envId: rimeId,
        key: 'blood_rime',
        title: 'The Blood-Rime Conspiracy',
        synopsis: 'A cabal of exiled blood mages harvest the frozen essence of travelers along the tundra pass to awaken a slumbering primeval frost colossus.',
      },
      {
        envId: rimeId,
        key: 'warg_king',
        title: 'Sanctum of the Warg-King',
        synopsis: 'Feral beast-stalkers and lupine shapeshifters unite under a ravenous warlord deep in the howling glacial crevasses to raid all southern outposts.',
      },
      // Ice Mire Arcs
      {
        envId: mireId,
        key: 'essence_tithe',
        title: "The Necromancer's Essence Tithe",
        synopsis: 'Sunken barrows under thawing black peat leach soul-filaments, as a rogue necromancer binds the drowned dead into an unstoppable bog host.',
      },
      {
        envId: mireId,
        key: 'shadow_pact',
        title: 'The Shadow Pact of the Fen-Hags',
        synopsis: 'Ancient covens in the mist-choked marshes demand dark bargains and blood sacrifice of wanderers seeking forbidden witch-lore.',
      },
      // Ironhold Citadels Arcs
      {
        envId: ironId,
        key: 'urkai_warband',
        title: 'Urkai Warband on the Border',
        synopsis: 'Displaced Urkai clans and their siege beasts assemble outside the monolithic fortress walls, demanding ancient blood rights and hunting grounds.',
      },
      {
        envId: ironId,
        key: 'whispering_vaults',
        title: 'The Whispering Vaults of the Iron Bastion',
        synopsis: 'Beneath the high citadel halls, forbidden reliquaries hum with forgotten arcane sigils and treacherous political mutiny among the garrison captains.',
      },
    ];

    const arcMap = {};
    for (const arc of arcs) {
      const existing = db.prepare('SELECT id FROM oracle_arcs WHERE environment_id = ? AND title = ?').get(arc.envId, arc.title);
      let arcId = existing?.id;
      if (!arcId) {
        const info = insertArc.run(arc.envId, arc.title, arc.synopsis);
        arcId = info.lastInsertRowid;
      }
      arcMap[arc.key] = arcId;
    }

    // -------------------------------------------------------------
    // 3. ORACLE FRAGMENTS
    // -------------------------------------------------------------
    // Helper to push fragments
    const addFrag = (envId, arcId, category, weight, text) => {
      insertFragment.run(envId, arcId, category, weight, text);
    };

    // =============================================================
    // ENVIRONMENT 1: RIME WASTES - GENERAL FRAGMENTS (arcId = NULL)
    // =============================================================

    // Scene Templates (General)
    addFrag(rimeId, null, 'scene_template', 'any',
      'Across #location#, #sensory_detail# #npc# halts in their tracks as #action_trigger#. Suddenly, #threat# emerges from the frozen drifts! #tradition_hook# Resolve d100 Stealth & Secrecy or initiate spotlight combat on the VTT.');
    addFrag(rimeId, null, 'scene_template', 'any',
      'Surveying #location#, #sensory_detail# The party spots #npc# gesturing urgently. Without warning, #action_trigger#, revealing #threat#! #tradition_hook# Make a d100 Wilderness Survival or Perception check before proceeding.');
    addFrag(rimeId, null, 'scene_template', 'any',
      'The calm shatters at #location#! #threat# charges forward as #action_trigger#. #npc# cries out amid the fury: #sensory_detail# #tradition_hook# Spawn adversaries at matching Threat Tier and roll Initiative.');
    addFrag(rimeId, null, 'scene_template', 'any',
      'Taking shelter at #location#, the travelers cross paths with #npc#. #sensory_detail# Rather than fighting, #action_trigger#. Yet close behind, #threat# watches from the gale. Test d100 Persuasion & Influence to secure safe passage.');
    addFrag(rimeId, null, 'scene_template', 'success',
      'Following a hard-won victory at #location#, #sensory_detail# #npc# nods in grim respect. However, #action_trigger#, stirring #threat# in the distance! #tradition_hook# Take advantage on next VTT check or press the attack.');
    addFrag(rimeId, null, 'scene_template', 'failure',
      'Disaster strikes at #location#! #sensory_detail# Reeling from the setback, #npc# stumbles as #action_trigger#. In that moment of weakness, #threat# strikes! #tradition_hook# Suffer 2d10 frost endurance strain or enter defensive stance.');
    addFrag(rimeId, null, 'scene_template', 'bypass',
      'Stealthily skirting #location#, the party moves under the howling gale. #sensory_detail# Watching from cover, they observe #npc# while #action_trigger#. In the whiteout, #threat# prowls past unaware. #tradition_hook# Advance forward unnoticed.');

    // Locations (General)
    addFrag(rimeId, null, 'location', 'any', 'a wind-scoured glacial trench flanked by jagged pillars of blue permafrost');
    addFrag(rimeId, null, 'location', 'any', 'the half-buried ruins of an ancient Norn watch-cairn draped in frozen lichen');
    addFrag(rimeId, null, 'location', 'any', 'a treacherous crevasse spanned only by a fragile bridge of compacted rime');
    addFrag(rimeId, null, 'location', 'any', 'a desolate frost-ridge littered with the petrified ribs of a primeval tundra leviathan');
    addFrag(rimeId, null, 'location', 'any', 'an abandoned way-station shelter whose stone hearth is choked with black frost');
    addFrag(rimeId, null, 'location', 'any', 'a frozen lake whose glass-clear ice reveals dark figures entombed twenty feet below');

    // NPCs (General)
    addFrag(rimeId, null, 'npc', 'any', 'a battle-scarred Norn trapper wrapped in thick wool pelts and bone talismans');
    addFrag(rimeId, null, 'npc', 'any', 'a solitary Urkai exile carrying a nicked iron cleaver and burning pine-pitch torch');
    addFrag(rimeId, null, 'npc', 'any', 'a shivering Whisperling messenger whose goggles are caked in ice crystals');
    addFrag(rimeId, null, 'npc', 'any', 'a weary Mixlander scout clutching a notched compass that spins erratically');
    addFrag(rimeId, null, 'npc', 'any', 'a silent Giant wanderer leaning against a massive driftwood walking staff');

    // Threats (General)
    addFrag(rimeId, null, 'threat', 'any', 'two Tier 1 Frost Warg scouts stalking the flank of the snowdrift');
    addFrag(rimeId, null, 'threat', 'any', 'a Tier 2 Glacial Wendigo whose sunken eyes burn with pale sapphire witchfire');
    addFrag(rimeId, null, 'threat', 'any', 'a Tier 3 Rime Drake hatchling coiled atop a mound of frozen traveler bones');
    addFrag(rimeId, null, 'threat', 'any', 'a squad of Tier 2 Frost-Bitten Draugr wielding chipped obsidian halberds');
    addFrag(rimeId, null, 'threat', 'any', 'a Tier 4 Tundra Behemoth awakening from subterranean hibernation beneath the crust');

    // Action Triggers (General)
    addFrag(rimeId, null, 'action_trigger', 'any', 'a violent gust of razor-sharp hail tears across the ridge');
    addFrag(rimeId, null, 'action_trigger', 'any', 'the permafrost shelf gives way with a sickening crack');
    addFrag(rimeId, null, 'action_trigger', 'any', 'a bloodstained prayer-strip whips into view on the freezing wind');
    addFrag(rimeId, null, 'action_trigger', 'any', 'a guttural warhorn bellows from the blinding snow haze');
    addFrag(rimeId, null, 'action_trigger', 'any', 'an ominous drumbeat echoes from deep within the hollow glacier');

    // Sensory Details (General)
    addFrag(rimeId, null, 'sensory_detail', 'any', 'The sub-zero wind stings exposed skin like needles of splintered glass.');
    addFrag(rimeId, null, 'sensory_detail', 'any', 'Breath freezes into brittle clouds the instant it leaves the lungs.');
    addFrag(rimeId, null, 'sensory_detail', 'any', 'Eerie whistling groans echo through the glacial crevasses like dying voices.');
    addFrag(rimeId, null, 'sensory_detail', 'any', 'The scent of frozen blood and burning fat drifts through the whiteout.');
    addFrag(rimeId, null, 'sensory_detail', 'any', 'Pale auroral lights flicker sickly green and purple across the iron-gray clouds.');

    // Twists (General)
    addFrag(rimeId, null, 'twist', 'any', 'The apparent tracks lead in a deliberate circle—the prey was hunting the party all along!');
    addFrag(rimeId, null, 'twist', 'any', 'A sudden blizzard whiteout drops visibility to zero, separating frontline characters from rear support.');
    addFrag(rimeId, null, 'twist', 'any', 'The icy ground collapses into a concealed subterranean cavern filled with ancient runes.');
    addFrag(rimeId, null, 'twist', 'any', 'The encounter was monitored by an unseen observer who slips away to alert the regional warband.');

    // Tradition Hooks (General)
    addFrag(rimeId, null, 'tradition_hook', 'any', 'Blood Tradition: A spill of fresh crimson upon the snow hums with latent power; an adept can harvest 10 temporary ESS with an essence tithe.');
    addFrag(rimeId, null, 'tradition_hook', 'any', 'Warg Tradition: The predator pauses, meeting your gaze with primal sentience; a Beast Empathy test can turn hostility into guarded respect.');
    addFrag(rimeId, null, 'tradition_hook', 'any', 'Shadow Tradition: The deep shadows cast by the ice ridge stretch unnaturally, offering complete concealment to any who step into the dark.');
    addFrag(rimeId, null, 'tradition_hook', 'any', 'Ki Tradition: Focusing inner heat against the killing chill grants +10 to physical reaction rolls for the next scene.');
    addFrag(rimeId, null, 'tradition_hook', 'any', 'Spiritual Tradition: The wailing gale carries the whispers of fallen Norn warriors offering cryptic guidance on the path ahead.');
    addFrag(rimeId, null, 'tradition_hook', 'any', 'Arcane Tradition: Glacial crystalline formations focus ambient ley lines, providing free spell range extension.');

    // =============================================================
    // ARC 1: THE BLOOD-RIME CONSPIRACY (Rime Wastes)
    // =============================================================
    const brId = arcMap['blood_rime'];
    addFrag(rimeId, brId, 'scene_template', 'any',
      'Following a trail of crimson icicles to #location#, #sensory_detail# #npc# uncovers signs of ritual drainage as #action_trigger#! #threat# steps into the circle to claim the essence tithe. #tradition_hook# Test d100 Arcane Lore or engage in tactical VTT combat.');
    addFrag(rimeId, brId, 'scene_template', 'any',
      'The Blood-Rime Cabal strikes at #location#! #threat# unleashes a spray of boiling blood-frost as #action_trigger#. #npc# rallies to defend the altar: #sensory_detail# #tradition_hook# Roll Initiative on the VTT; blood magic wards inflict 1d10 essence drain per turn.');
    addFrag(rimeId, brId, 'location', 'any', 'an unholy sacrificial circle etched with frozen blood-runes upon a glacial altar');
    addFrag(rimeId, brId, 'location', 'any', 'the cavernous ice hollow where a 40-foot frost colossus lies chained in crimson wards');
    addFrag(rimeId, brId, 'npc', 'any', 'an apostate Blood Theurge with veins blackened by frost-venom and essence corruption');
    addFrag(rimeId, brId, 'npc', 'any', 'a rescued caravan guard whose wrists are scarred from blood-draining clamps');
    addFrag(rimeId, brId, 'threat', 'any', 'a Tier 3 Blood-Gilded Frost Golem driven by the thumping heart of a sacrificed mammoth');
    addFrag(rimeId, brId, 'threat', 'any', 'two Tier 2 Crimson Sanguinists wielding ritual marrow daggers and blood-whips');
    addFrag(rimeId, brId, 'action_trigger', 'any', 'crimson veins surge visibly through the surrounding glacial ice walls');
    addFrag(rimeId, brId, 'twist', 'any', 'The colossus begins to stir; deep tremors crack the battlefield and awakening chants ring out!');
    addFrag(rimeId, brId, 'twist', 'any', 'The allied guide reveals a fresh ritual brand—they are feeding the cabal insider information!');

    // =============================================================
    // ARC 2: SANCTUM OF THE WARG-KING (Rime Wastes)
    // =============================================================
    const wkId = arcMap['warg_king'];
    addFrag(rimeId, wkId, 'scene_template', 'any',
      'Deep inside #location#, the stench of wolf dens permeates the frost. #sensory_detail# #npc# whispers a dire warning just as #action_trigger#! Out of the snow-shadows, #threat# rushes the line. #tradition_hook# Resolve d100 Beast Handling or fight for survival.');
    addFrag(rimeId, wkId, 'scene_template', 'any',
      'Cornered at #location#, the pack surrounds the party. #npc# gestures toward their feral chieftain: #sensory_detail# Rather than immediate carnage, #action_trigger#. #threat# snarls in the background. d100 Persuasion or Intimidation to avoid total slaughter.');
    addFrag(rimeId, wkId, 'location', 'any', 'the bone-strewn cavern throne room of the Warg-King carved out of living blue ice');
    addFrag(rimeId, wkId, 'location', 'any', 'a narrow rocky gorge flanked by elevated hunting blinds and wolf-skull totems');
    addFrag(rimeId, wkId, 'npc', 'any', 'a scarred Norn warg-bonded shaman cloaked in the pelt of an alpha dire-wolf');
    addFrag(rimeId, wkId, 'npc', 'any', 'an escaped trapper clutching a broken iron spearhead stained with beast-blood');
    addFrag(rimeId, wkId, 'threat', 'any', 'the Warg-King himself, a Tier 4 feral berserker capable of dire-lupine transformation');
    addFrag(rimeId, wkId, 'threat', 'any', 'a pack of three Tier 2 Winter Stalkers coordinating flanking maneuvers in high snow');
    addFrag(rimeId, wkId, 'action_trigger', 'any', 'a chorus of spine-chilling howls erupts from every high vantage point');
    addFrag(rimeId, wkId, 'twist', 'any', 'The alpha beast singles out the party member with the highest ESS, perceiving them as the rival pack leader!');
    addFrag(rimeId, wkId, 'twist', 'any', 'The cavern floor is hollowed out—beneath the crust lies a pit of starving wolf-pups and spikes.');

    // =============================================================
    // ENVIRONMENT 2: THE ICE MIRE - GENERAL FRAGMENTS (arcId = NULL)
    // =============================================================

    // Scene Templates (General)
    addFrag(mireId, null, 'scene_template', 'any',
      'Wading through #location#, #sensory_detail# #npc# gestures toward a submerged disturbance as #action_trigger#. Breaking the brackish surface, #threat# attacks! #tradition_hook# Test d100 Agility or sink into the grasping mud.');
    addFrag(mireId, null, 'scene_template', 'any',
      'Navigating the maze-like channels of #location#, #sensory_detail# #npc# pauses to inspect strange tracks. Suddenly, #action_trigger#, revealing #threat#! #tradition_hook# Roll d100 Navigation & Survival to find solid ground.');
    addFrag(mireId, null, 'scene_template', 'any',
      'Ambush in #location#! Rotten ice gives way as #threat# lunges! #npc# draws their weapon in panic: #sensory_detail# Amid the chaos, #action_trigger#! #tradition_hook# Spawn adversaries on the VTT; mud is difficult terrain (half movement).');
    addFrag(mireId, null, 'scene_template', 'any',
      'Stumbling upon a solitary peat-fire at #location#, the party finds #npc#. #sensory_detail# As mist gathers, #action_trigger#. In the marsh darkness, #threat# waits quietly. Test d100 Social Influence to learn the safe crossing paths.');
    addFrag(mireId, null, 'scene_template', 'success',
      'Securing the elevated mound at #location#, #sensory_detail# #npc# catches their breath. Then, #action_trigger#, exposing the lair of #threat#! #tradition_hook# Gain tactical high ground (+10 to ranged attacks).');
    addFrag(mireId, null, 'scene_template', 'failure',
      'The party is mired down at #location#! #sensory_detail# #npc# sinks to their waist as #action_trigger#. Drawn by the commotion, #threat# closes in for the kill! #tradition_hook# Make a d100 Athletics check or suffer restrained condition.');
    addFrag(mireId, null, 'scene_template', 'bypass',
      'Stepping carefully over floating reed-mats at #location#, the travelers evade detection. #sensory_detail# #npc# signals silence while #action_trigger#. #threat# slides into the deep peat pool without noticing them. #tradition_hook# Proceed quietly.');

    // Locations (General)
    addFrag(mireId, null, 'location', 'any', 'a vast fen of thawing black peat choked with rotting willow roots and sulfur puddles');
    addFrag(mireId, null, 'location', 'any', 'a sunken burial barrow whose collapsed stone capstone leaks eerie green phosphorescence');
    addFrag(mireId, null, 'location', 'any', 'a ruined boardwalk whose slime-coated timbers shudder above bottomless quick-mire');
    addFrag(mireId, null, 'location', 'any', 'an island of gnarled alder trees hung with dried animal fetishes and witch-bottles');
    addFrag(mireId, null, 'location', 'any', 'a stagnant mire pool covered in oily iridescent scum and bloated corpse-lilies');
    addFrag(mireId, null, 'location', 'any', 'a half-submerged stone dolmen carved with pre-cataclysm spiral glyphs');

    // NPCs (General)
    addFrag(mireId, null, 'npc', 'any', 'a mud-caked Whisperling fen-runner poling a flat-bottomed birch canoe');
    addFrag(mireId, null, 'npc', 'any', 'a grim Urkai peat-cutter wielding a rusty curved harvest blade');
    addFrag(mireId, null, 'npc', 'any', 'a blind hedge-witch tasting water ripples with trembling fingertips');
    addFrag(mireId, null, 'npc', 'any', 'a lost Norn outrider shivering with swamp ague and fever delirium');
    addFrag(mireId, null, 'npc', 'any', 'a solitary Mixlander grave-robber laden with sodden canvas sacks of tarnished relics');

    // Threats (General)
    addFrag(mireId, null, 'threat', 'any', 'three Tier 1 Bog Crawlers with chitinous barbed legs and venomous mandibles');
    addFrag(mireId, null, 'threat', 'any', 'a Tier 2 Drowned Draugr entangled in rotting reed ropes and rusted chainmail');
    addFrag(mireId, null, 'threat', 'any', 'a Tier 3 Mire Hag whose curdled wail curdles living blood and saps willpower');
    addFrag(mireId, null, 'threat', 'any', 'a Tier 3 Marsh Leech-Swarm coalescing into a grotesque bipedal silhouette in the water');
    addFrag(mireId, null, 'threat', 'any', 'a Tier 4 Fen Drake lurking beneath the surface with moss-covered dorsal spines');

    // Action Triggers (General)
    addFrag(mireId, null, 'action_trigger', 'any', 'a plume of noxious marsh gas belches violently from beneath the ice');
    addFrag(mireId, null, 'action_trigger', 'any', 'the hollow ground groans as a hidden sinkhole opens underfoot');
    addFrag(mireId, null, 'action_trigger', 'any', 'a chorus of ghostly lights flickers into being across the black water');
    addFrag(mireId, null, 'action_trigger', 'any', 'a rotting corpse suddenly floats face-up against the party\'s boots');
    addFrag(mireId, null, 'action_trigger', 'any', 'a discordant reed-pipe melody drifts through the thick morning fog');

    // Sensory Details (General)
    addFrag(mireId, null, 'sensory_detail', 'any', 'The pungent stench of rotting vegetation and stagnant mineral water burns the nostrils.');
    addFrag(mireId, null, 'sensory_detail', 'any', 'A suffocating damp mist clings to wool and armor, chilling bone and marrow alike.');
    addFrag(mireId, null, 'sensory_detail', 'any', 'Waterfowl fall suddenly silent, leaving only the wet sucking sound of peat beneath boots.');
    addFrag(mireId, null, 'sensory_detail', 'any', 'Pale green will-o\'-wisps bob lazily over the stagnant pools like distant lantern light.');
    addFrag(mireId, null, 'sensory_detail', 'any', 'Cold mud oozes through seams in leather boots with every sluggish, agonizing stride.');

    // Twists (General)
    addFrag(mireId, null, 'twist', 'any', 'The solid ground is an illusion—a floating shelf of peat about to rupture into deep bog water!');
    addFrag(mireId, null, 'twist', 'any', 'Noxious swamp fumes induce disorientation; all characters must test Stamina or suffer dizziness.');
    addFrag(mireId, null, 'twist', 'any', 'The fallen adversary is possessed by an ancient mire spirit that jumps into the nearest corpse.');
    addFrag(mireId, null, 'twist', 'any', 'A sudden torrential downpour thaws the surface ice, doubling the depth of all mud water.');

    // Tradition Hooks (General)
    addFrag(mireId, null, 'tradition_hook', 'any', 'Necromancy Tradition: The sunken bog preserves centuries of dead; necrotic weaves require half normal essence cost.');
    addFrag(mireId, null, 'tradition_hook', 'any', 'Witchcraft Tradition: Bundles of dried swamp nightshade hanging from willow branches can be harvested as potent curse reagents.');
    addFrag(mireId, null, 'tradition_hook', 'any', 'Druidic Tradition: Deep peat roots pulse with ancient fungal networks; communing yields the safest dry route across the mire.');
    addFrag(mireId, null, 'tradition_hook', 'any', 'Demonology Tradition: A submerged brimstone vent reeks of infernal binding rites; dark adepts sense an imprisoned fiend nearby.');
    addFrag(mireId, null, 'tradition_hook', 'any', 'Shadow Tradition: Mist and murky reflections provide instant stepping stones for shadow-step weaves.');
    addFrag(mireId, null, 'tradition_hook', 'any', 'Blood Tradition: Leech bites in the bog water can be coaxed to filter impurities and restore 5 current STA.');

    // =============================================================
    // ARC 3: THE NECROMANCER'S ESSENCE TITHE (Ice Mire)
    // =============================================================
    const etId = arcMap['essence_tithe'];
    addFrag(mireId, etId, 'scene_template', 'any',
      'Approaching #location#, the water glows with sickly necrotic filament. #sensory_detail# #npc# warns of ritual exhumation as #action_trigger#! The marsh erupts as #threat# rises from the mud. #tradition_hook# Test d100 Spiritual Resistance or fight off soul-siphon.');
    addFrag(mireId, etId, 'scene_template', 'any',
      'Desecration at #location#! #threat# advances in disciplined ranks while #action_trigger#. #npc# shouts a desperate incantation: #sensory_detail# #tradition_hook# Spawn adversaries on the VTT; defeating the leader breaks the bog thrall.');
    addFrag(mireId, etId, 'location', 'any', 'a desecrated royal barrow mound where sarcophagi have been dredged from peat muck');
    addFrag(mireId, etId, 'location', 'any', 'a makeshift bone laboratory constructed upon the ribcage of an ancient swamp mammoth');
    addFrag(mireId, etId, 'npc', 'any', 'a renegade Necromancer from the Ironhold universities, draped in moldering burial shrouds');
    addFrag(mireId, etId, 'npc', 'any', 'a half-drowned Norn scout whose spiritual essence is visibly leaking into the bog water');
    addFrag(mireId, etId, 'threat', 'any', 'a Tier 3 Bog Mummy encased in petrified peat and clutching an iron executioner sword');
    addFrag(mireId, etId, 'threat', 'any', 'four Tier 1 Silt Skeletons wielding rusted bronze sickles and swamp-weed nets');
    addFrag(mireId, etId, 'action_trigger', 'any', 'soul-filaments tethering the drowned dead snap taut, pulling living victims toward the pool');
    addFrag(mireId, etId, 'twist', 'any', 'The necromancer was acting under compulsion—a far older entity rests in the deepest barrow beneath!');
    addFrag(mireId, etId, 'twist', 'any', 'The soul tithe vessel shatters, unleashing a tempest of enraged spirit fragments across the map.');

    // =============================================================
    // ARC 4: THE SHADOW PACT OF THE FEN-HAGS (Ice Mire)
    // =============================================================
    const spId = arcMap['shadow_pact'];
    addFrag(mireId, spId, 'scene_template', 'any',
      'Enshrouded in darkness at #location#, witch-fire flickers in the haze. #sensory_detail# #npc# halts as #action_trigger#. Stepping through the gloom, #threat# offers a perilous bargain. #tradition_hook# Roll d100 Intuition & Insight to detect the trap in the pact.');
    addFrag(mireId, spId, 'scene_template', 'any',
      'Sitting before a bubbling cauldron at #location#, #npc# cackles softly. #sensory_detail# #action_trigger#, revealing the true form of #threat#! d100 Deception or Persuasion to barter for forbidden secrets without forfeiting a soul.');
    addFrag(mireId, spId, 'location', 'any', 'a ring of weeping black willows surrounding a sunken stone well overflowing with dark blood');
    addFrag(mireId, spId, 'location', 'any', 'a tilted stilt-hut draped in drying skins, mandrake roots, and polished crow skulls');
    addFrag(mireId, spId, 'npc', 'any', 'a matriarch Fen-Hag with teeth filed to sharp points and skin like rotting birch bark');
    addFrag(mireId, spId, 'npc', 'any', 'a desperate young merchant who pledged their firstborn for wealth and now seeks a way out');
    addFrag(mireId, spId, 'threat', 'any', 'a Tier 3 Coven Hag flanked by two Tier 2 Shadow Horrors summoned from the void');
    addFrag(mireId, spId, 'threat', 'any', 'a Tier 4 Swamp Chimera stitched together from drowned beasts and bog predator parts');
    addFrag(mireId, spId, 'action_trigger', 'any', 'a black shadow detaches from the party\'s own feet, whispering dark temptation');
    addFrag(mireId, spId, 'twist', 'any', 'Accepting any aid from the hag inflicts an immediate blood mark; rejecting it triggers an ambush!');
    addFrag(mireId, spId, 'twist', 'any', 'The witch\'s cauldron explodes with blinding grease fire, plunging the scene into complete shadow.');

    // =============================================================
    // ENVIRONMENT 3: IRONHOLD CITADELS - GENERAL FRAGMENTS (arcId = NULL)
    // =============================================================

    // Scene Templates (General)
    addFrag(ironId, null, 'scene_template', 'any',
      'Within #location#, #sensory_detail# #npc# pauses at the sound of heavy boots as #action_trigger#. Suddenly, #threat# blocks the corridor! #tradition_hook# Test d100 Tactics or initiate spotlight combat on the VTT.');
    addFrag(ironId, null, 'scene_template', 'any',
      'Prowling through #location#, the party moves between torchlit pillars. #sensory_detail# #npc# signals a halt when #action_trigger#! In the shadows ahead, #threat# patrols. #tradition_hook# Make a d100 Stealth or Lockpicking check to proceed.');
    addFrag(ironId, null, 'scene_template', 'any',
      'Steel clashes against stone at #location#! #threat# charges with weapons drawn as #action_trigger#. #npc# shouts the citadel alarm: #sensory_detail# #tradition_hook# Spawn adversaries at matching Threat Tier and roll Initiative.');
    addFrag(ironId, null, 'scene_template', 'any',
      'Entering the council chamber at #location#, the travelers confront #npc#. #sensory_detail# Tensions rise when #action_trigger#. Flanked by #threat#, the warden demands identification. Roll d100 Persuasion or Etiquette.');
    addFrag(ironId, null, 'scene_template', 'success',
      'Securing the reinforced portcullis at #location#, #sensory_detail# #npc# catches their breath and salutes. Yet outside, #action_trigger#, signaling the approach of #threat#! #tradition_hook# Barricade the door or prepare an ambush.');
    addFrag(ironId, null, 'scene_template', 'failure',
      'The alarm clangs throughout #location#! #sensory_detail# Caught out of position, #npc# stumbles as #action_trigger#. Rounding the corner, #threat# corners the party! #tradition_hook# Suffer disadvantage on initiative or expend 15 ESS on defensive weaves.');
    addFrag(ironId, null, 'scene_template', 'bypass',
      'Slipping through the service aqueducts beneath #location#, the travelers avoid the patrols. #sensory_detail# Listening through the iron grating, they hear #npc# while #action_trigger#. #threat# marches past unaware. #tradition_hook# Advance into the inner keep.');

    // Locations (General)
    addFrag(ironId, null, 'location', 'any', 'the wind-buffeted outer ramparts of Bastion Kraag overlooking sheer thousand-foot abyss cliffs');
    addFrag(ironId, null, 'location', 'any', 'a vaulted subterranean armory illuminated by flickering peat braziers and smoldering soot');
    addFrag(ironId, null, 'location', 'any', 'a monolithic gatehouse barred with triple-banded iron gates and murder holes');
    addFrag(ironId, null, 'location', 'any', 'a grand feasting hall hung with faded clan banners and trophies of slain mountain giants');
    addFrag(ironId, null, 'location', 'any', 'an iron foundry where molten slag pours through stone channels under choking sulfur smoke');
    addFrag(ironId, null, 'location', 'any', 'the forbidden catacombs beneath the keep, paved with the tomb-slabs of forgotten warlords');

    // NPCs (General)
    addFrag(ironId, null, 'npc', 'any', 'a stern Norn Citadel Castellan clad in engraved black plate armor and fur-trimmed mantle');
    addFrag(ironId, null, 'npc', 'any', 'a surly Urkai mercenary sergeant smoking dried bitterleaf from a clay pipe');
    addFrag(ironId, null, 'npc', 'any', 'a nervous Whisperling archivist carrying heavy leather codices bound in brass');
    addFrag(ironId, null, 'npc', 'any', 'a scarred Mixlander blacksmith hammering dents out of a heavy tower shield');
    addFrag(ironId, null, 'npc', 'any', 'a captive clan emissary bound in heavy iron manacles awaiting execution');

    // Threats (General)
    addFrag(ironId, null, 'threat', 'any', 'two Tier 2 Ironhold Gate Enforcers armed with heavy billhooks and pavise shields');
    addFrag(ironId, null, 'threat', 'any', 'a Tier 3 Clockwork Siege Automaton powered by a volatile essence furnace');
    addFrag(ironId, null, 'threat', 'any', 'a Tier 3 Urkai Shock-Trooper wielding twin jagged war-cleavers');
    addFrag(ironId, null, 'threat', 'any', 'a squad of Tier 1 Citadel Crossbowmen aiming from the elevated crenellations');
    addFrag(ironId, null, 'threat', 'any', 'a Tier 4 Corrupted Bastion Commander infused with demonic shadow-sigils');

    // Action Triggers (General)
    addFrag(ironId, null, 'action_trigger', 'any', 'a heavy portcullis slams shut with deafening thunder, cutting off retreat');
    addFrag(ironId, null, 'action_trigger', 'any', 'the iron alarm gong rings out across the courtyard three distinct times');
    addFrag(ironId, null, 'action_trigger', 'any', 'a flaming catapult stone smashes into the parapet, raining stone shrapnel');
    addFrag(ironId, null, 'action_trigger', 'any', 'a secret flagstone swivels open, revealing a hidden stairwell');
    addFrag(ironId, null, 'action_trigger', 'any', 'whispers of insurrection pass from guard to guard in coded hand signals');

    // Sensory Details (General)
    addFrag(ironId, null, 'sensory_detail', 'any', 'The deafening clang of blacksmith hammers rings off impenetrable basalt masonry.');
    addFrag(ironId, null, 'sensory_detail', 'any', 'Thick greasy soot from peat furnaces coats armor and clings stubbornly to the palate.');
    addFrag(ironId, null, 'sensory_detail', 'any', 'Biting sub-zero mountain gales roar through arrow-slits with ear-piercing shrieks.');
    addFrag(ironId, null, 'sensory_detail', 'any', 'The pungent smell of hot lamp oil, stale beer, and oiled leather fills the corridor.');
    addFrag(ironId, null, 'sensory_detail', 'any', 'Heavy iron door-chains rattle rhythmically in the drafty subterranean corridors.');

    // Twists (General)
    addFrag(ironId, null, 'twist', 'any', 'The garrison guards have just mutinied; neither side recognizes external authority anymore!');
    addFrag(ironId, null, 'twist', 'any', 'The defensive ballista fires at the party\'s position—a traitor has taken command of the tower!');
    addFrag(ironId, null, 'twist', 'any', 'The stone floor gives way under excessive weight, dropping everyone into the lower armory.');
    addFrag(ironId, null, 'twist', 'any', 'The stronghold is under simultaneous stealth assault from subterranean mining tunnels.');

    // Tradition Hooks (General)
    addFrag(ironId, null, 'tradition_hook', 'any', 'Arcane Tradition: The basalt walls are inlaid with copper dampening wire, reducing spell range unless the grounding wire is severed.');
    addFrag(ironId, null, 'tradition_hook', 'any', 'Ki Tradition: The sheer stone columns offer perfect focal points for wall-running and aerial acrobatic maneuvers.');
    addFrag(ironId, null, 'tradition_hook', 'any', 'Demonology Tradition: Deep beneath the foundry, an ancient binding circle keeps a mountain demon chained in forge-flame.');
    addFrag(ironId, null, 'tradition_hook', 'any', 'Spiritual Tradition: The statues of ancient fortress founders watch sternly; paying homage grants +10 to morale rolls.');
    addFrag(ironId, null, 'tradition_hook', 'any', 'Blood Tradition: Spilled blood upon the cold flagstones reacts with the iron ore, smoking with corrosive vapor.');
    addFrag(ironId, null, 'tradition_hook', 'any', 'Shadow Tradition: Torch sconces spaced far apart leave deep, impenetrable pockets of darkness along the vaulted ceilings.');

    // =============================================================
    // ARC 5: URKAI WARBAND ON THE BORDER (Ironhold Citadels)
    // =============================================================
    const uwId = arcMap['urkai_warband'];
    addFrag(ironId, uwId, 'scene_template', 'any',
      'Surveying the outer valley from #location#, #sensory_detail# #npc# spots the war-standards as #action_trigger#! Leading the vanguard, #threat# demands parley or slaughter. #tradition_hook# Test d100 Battle Lore or coordinate defenses on the VTT.');
    addFrag(ironId, uwId, 'scene_template', 'any',
      'The warband breaches the lower breach of #location#! #threat# charges through the rubble as #action_trigger#. #npc# shouts for backup: #sensory_detail# #tradition_hook# Spawn adversaries on the VTT; hold the line for 3 rounds.');
    addFrag(ironId, uwId, 'location', 'any', 'the smoking crater of a collapsed barbican where siege drums thud ceaselessly');
    addFrag(ironId, uwId, 'location', 'any', 'a snowy canyon choke-point fortified with sharpened mammoth tusks and iron caltrops');
    addFrag(ironId, uwId, 'npc', 'any', 'a fierce Urkai Warlord riding an armored tusked war-rhino and brandishing a notched greatsword');
    addFrag(ironId, uwId, 'npc', 'any', 'a defiant Citadel Scout with broken arrows protruding from their shattered shield');
    addFrag(ironId, uwId, 'threat', 'any', 'a Tier 4 Urkai Clan Champion backed by two Tier 2 Berserkers in bear-skull helms');
    addFrag(ironId, uwId, 'threat', 'any', 'a Tier 3 Armored War-Beast equipped with spiked battering rams on its flank');
    addFrag(ironId, uwId, 'action_trigger', 'any', 'warband drums pound a rhythmic assault beat that vibrates the teeth inside the jaw');
    addFrag(ironId, uwId, 'twist', 'any', 'The Urkai are fleeing a greater horror from the high peaks—the warband is actually an armed exodus!');
    addFrag(ironId, uwId, 'twist', 'any', 'A second Urkai detachment scales the blind cliff face behind the party using hooked climbing irons.');

    // =============================================================
    // ARC 6: THE WHISPERING VAULTS OF THE IRON BASTION (Ironhold Citadels)
    // =============================================================
    const wvId = arcMap['whispering_vaults'];
    addFrag(ironId, wvId, 'scene_template', 'any',
      'Descending deep into #location#, the air turns frigid and thick with ozone. #sensory_detail# #npc# unseals the forbidden ward when #action_trigger#! Awoken from stasis, #threat# glares through runic glass. #tradition_hook# Test d100 Arcane Wards or face essence feedback.');
    addFrag(ironId, wvId, 'scene_template', 'any',
      'Examining the forbidden reliquary at #location#, #sensory_detail# #npc# deciphers the treasonous inscriptions. Suddenly, #action_trigger#, unchaining #threat#! #tradition_hook# Make a d100 Ancient History check or forfeit key intelligence.');
    addFrag(ironId, wvId, 'location', 'any', 'the subterranean Vault of Whispers sealed with seven interlocking iron combination locks');
    addFrag(ironId, wvId, 'location', 'any', 'a dark pre-cataclysm archive where glass essence cylinders float in stasis fluid');
    addFrag(ironId, wvId, 'npc', 'any', 'a treasonous Citadel Magistrate attempting to smuggle an unstable essence core out of the keep');
    addFrag(ironId, wvId, 'npc', 'any', 'a bound spectral entity pleading for release from a soul-binding iron pillar');
    addFrag(ironId, wvId, 'threat', 'any', 'a Tier 4 Pre-Cataclysm Vault Sentinel armed with twin disintegrating energy blades');
    addFrag(ironId, wvId, 'threat', 'any', 'two Tier 3 Shadow Infiltrators hired by the mutinous captains to eliminate witnesses');
    addFrag(ironId, wvId, 'action_trigger', 'any', 'the vault containment runes flare blinding violet and begin to hum at deafening pitch');
    addFrag(ironId, wvId, 'twist', 'any', 'The vault security system misidentifies the party as escaped lab specimens and triggers automated lockdown gas!');
    addFrag(ironId, wvId, 'twist', 'any', 'The magistrate poisons the air vents, leaving only 4 turns before suffocating vapors fill the chamber.');
  });

  seedTransaction();
}
