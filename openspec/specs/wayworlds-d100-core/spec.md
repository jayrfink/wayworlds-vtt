# OpenSpec Specification: Wayworlds d100 Core System & VTT Engine

* **Spec ID:** `wayworlds-d100-core`
* **Version:** `0.6.7-draft`
* **Base Engine:** Forked from `https://github.com/jayrfink/star-frontiers-vtt` (Clean-Room Open-Source d100 Engine)
* **License Target:** Code: `MIT` / `GPLv3` | Core System Rules & SRD Gear: `CC-BY-4.0`
* **Active Setting Cartridge:** `/cartridges/ulvwylde` (Swappable JSON/Markdown Data Package)

---

## 1. System Philosophy, Open-Source Cleanliness & Architectural Invariants

**Wayworlds** is a setting-agnostic, open-source percentile (`d100` roll-under) fantasy/adventure RPG engine and Virtual Tabletop (VTT) designed for zero-lookup play across two distinct map modes:

1. **Tactical VTT (Grid/Encounter & Exploration Mode):** Supports entire dungeon levels, sprawling forests, town quarters, or any other playable terrain. Inherits all UI, typography, and engine capabilities from `star-frontiers-vtt`—including **movable/draggable PC character sheets displaying the character's overall Tier**, **Erasable Fog of War** (opaque to players, semi-transparent to the GM), real-time **Map Pinging**, measurement rulers, built-in popup applets for self-contained NPC/Adversary generation (with integrated free art generator calls for automatic token creation), custom Equipment/Magic Item creation, and fast d100 combat/stat tracking.
2. **WorldVTT (Hex Overworld Mode — transformed from Space/Ship VTT):** A non-combat hex-based strategic map used for world/regional navigation, tracking party location, map pinging, marking active battles/sieges, faction movements, and linking Points of Interest (POIs) to Tactical VTT scenes, with all **Ship Sheets** and space combat mechanics removed.

### Critical Architectural Invariants

1. **Clean-Room Open-Source IP Compliance:** While inspired by classic d100 paired-stat mechanics and forked from `jayrfink/star-frontiers-vtt`, the Wayworlds codebase and ruleset contain **zero** proprietary TSR/WotC sci-fi trademarks, creature names, or rulebook prose. Internal schema keys use clean Wayworlds terminology (`ess_current` / `ess_max` instead of `seu_current`, `hp_current` / `hp_max` for Stamina `STA`). Mundane equipment baselines derive from the **CC-BY-4.0 5e System Reference Document (SRD)** converted to Wayworlds `Nd10` and percentile math.
2. **100% UI, Typography & Engine Inheritance from `star-frontiers-vtt` (Except Space VTT, Ship Sheets & Modesto Headings):** Wayworlds inherits **all** existing and future UI, body/control font family styles, window management, XP point-buy logic, and engine capabilities built into `jayrfink/star-frontiers-vtt`—including **movable/floating PC sheets displaying character tier badges**, **Map Pinging**, distance/radius measurement tools, WebSocket real-time state sync, camera pan/zoom, initiative/spotlight tracker, dice roller log, delta math parser (`"-12"`, `"+8"`), in-app NPC/Adversary creation modal, automated free art token pipeline, Mount/Vehicle embarkation, Token HUD drawers, and any new features added to the upstream SFVTT repo prior to forking. **The only exceptions** are:
   * Transforming the **Space VTT** hex canvas into the non-combat **WorldVTT (Regional/World Map)**.
   * Completely removing **Ship Sheets** (which are not used in Wayworlds).
   * Setting all UI title and heading fonts to **Modesto** (`'Modesto Condensed'`, `'Modesto'`).
3. **Engine vs. Setting Cartridge Separation:** The Wayworlds Core Engine defines the math, ability pairs, resource pools (`STA` and `ESS`), secular skills, freeform power scaling table, PSA-scaled XP point-buy rules, Equipment/Magic Item Forge applet, In-App Adversary/NPC Spawner popup, Tactical Fog/Terrain state, Mount/Vehicle schemas, WorldVTT hex schema, and Threat Tier `1–5` benchmarks. A **Setting Cartridge** (`/cartridges/<world-name>/`) supplies the playable lineages, magic/power traditions, setting equipment, and world lore via developer-friendly JSON and Markdown files.
4. **English / Imperial Measurement Standard:** All Wayworlds distances, ranges, areas, speeds, heights, and weights strictly use **English / Imperial units** (inches, feet, yards, miles, and pounds `lbs`). Standard Tactical VTT grid squares default to **5 ft x 5 ft**.

---

## 2. Setting Cartridge Architecture (Loading Custom Campaign Worlds)

Wayworlds is intentionally designed so technical GMs and developers can load or swap entire campaign worlds via Git-manageable data directories without touching the core VTT engine code.

### A. Cartridge Directory Structure (`/cartridges/<cartridge_id>/`)

Each campaign world resides in its own directory under `/cartridges/` (default: `/cartridges/ulvwylde/`):

* `manifest.json`: Defines cartridge metadata (`id`, `title`, `version`, `author`), default WorldVTT hex scales (`regional_hex_miles: 6`, `world_hex_miles: 24`), and default border/widget color package key (`"maroons"`).
* `lineages.json`: Array of playable and NPC species/lineages, their automatic stat adjustments (applied to the `50` baseline), base movement speeds in `ft`, size footprints, and innate traits.
* `traditions.json`: Array of supernatural/magic/Ki traditions, governing base stats, fuel sources (`ESS` or `STA`), and special casting rules.
* `equipment.json`: Setting-specific mundane and magical weapons, armor, shields, mounts, vehicles, and healing/artisan kits (seeded with the CC-BY-4.0 SRD baseline).
* `lore.md`: World overview and faction reference markdown accessible inside the VTT reference drawer.

### B. Loading & Validating a Cartridge

* The active world is selected via `"active_cartridge": "ulvwylde"` in the server configuration (`config.json` or `.env`).
* On server startup, the VTT validates the folder against `/cartridges/cartridge.schema.json` and dynamically populates all Character Sheet dropdowns, Grimoire tradition selectors, Equipment tables, and In-App Adversary Spawner menus.

---

## 3. Tactical VTT (Full SFVTT Inheritance, Fog of War, Typography & Widget Color Packages)

The Tactical VTT canvas handles local exploration, movable character sheets, in-app adversary spawning, and combat across any terrain scale.

### A. Full Inheritance of `star-frontiers-vtt` UI, Windowing & Canvas Features

* **Movable PC Character Sheets & Window Management:** Inherits the floating, draggable/movable PC character sheet windows and modal management directly from `star-frontiers-vtt` (with **Ship Sheets** removed). The header of every movable PC character sheet prominently displays the character's **Overall Character Tier** (calculated dynamically from their highest skill level, magic cast tier, or attribute milestone).
* **Upward Compatibility with New SFVTT Features:** Any new UI, canvas, typography, audio, lighting, or quality-of-life features added to `jayrfink/star-frontiers-vtt` automatically carry over into Wayworlds.
* **Multi-Scale Playable Maps:** Scenes can represent entire multi-room dungeon levels, cavern complexes, dense forests, mountain passes, castle grounds, or city districts (defaulting to `5 ft` per grid square).
* **Real-Time Map Pinging & Table UX:** Retains all interactive canvas tools from `star-frontiers-vtt`, including player/GM **Map Pinging** (visual radar pulse broadcasted via WebSocket to draw attention to specific squares, doors, or hexes), distance/burst measurement rulers (displaying `ft` on Tactical VTT and `miles` on WorldVTT), condition badges, and floating combat text/logs.
* **Persistent In-App Stocking:** All NPCs, monsters, and room hazards created via the VTT's built-in Adversary/NPC popup form remain saved at their placed coordinates within the scene state (`scene_*.json`) hidden beneath the Fog of War until revealed.

### B. Erasable Fog of War Layer

* **Dual-Opacity Rendering:**
  * **Player View:** Unrevealed fog renders at `100%` opacity (solid black or dark mist texture), completely hiding the underlying map terrain and any enemy tokens inside the fogged region.
  * **GM View:** Unrevealed fog renders at `35–50%` semi-transparent opacity, allowing the GM to see all room layouts, terrain features, and pre-stocked adversary tokens clearly while knowing exactly what is still hidden from the players.
* **GM Eraser & Restore Tools:**
  * **Brush / Polygon / Rectangle Erase:** The GM can manually erase fog using adjustable brush sizes or shape tools as the party explores rooms or treks through forest clearings.
  * **Fog Restore & Reset:** Includes a brush toggle to paint fog back over areas or reset the scene to fully fogged.
  * **Real-Time State Sync:** Erasing fog updates the scene's fog mask state and immediately pushes the revealed region to connected player views via WebSocket/state sync.

### C. UI Typography: Modesto Titles/Headings & Inherited `star-frontiers-vtt` Body Styles

* **Title & Heading Font (`Modesto`):** All VTT application titles, window headers, movable Character Sheet banners, Character Tier badges, section headings (`h1`–`h4`), popup modal titles, and adversary stat block headers use the **Modesto** font family (`--font-display` / `--font-heading`: `'Modesto Condensed'`, `'Modesto'`, `'Modesto Poster'`, serif).
* **Inherited Body & Control Font Stack:** All remaining UI labels, skill rows, roll buttons, inputs, Grimoire entries, and combat logs **directly inherit the `font-family` declarations, font sizing, letter-spacing, and text styling implemented in `jayrfink/star-frontiers-vtt`**.

### D. Permanent Dark UI & Border/Widget Color Packages (No Light/Bright Themes)

* **Strict Dark-Only Background Invariant:** There is **no** light or bright theme option in Wayworlds. All page backgrounds, movable character sheet panels, popup modals, and input fields remain **permanently dark** (`#0d0f12` main backdrop, `#14171c` panel surfaces, `#1c2026` input fields) across the entire application.
* **Borders & Widget Controls Only:** Player-selectable **Color Packages** (saved per-client in `localStorage`) strictly change the colors of **panel/input borders** and **UI widget controls**—specifically scrollbars (`scrollbar-color`), checkboxes (`accent-color`), radio buttons, range sliders, dropdown arrows, and section divider lines:

| Color Package | `data-color-pkg` Key | Active Widget Controls (`--widget-color`) | Standard Panel & Input Borders (`--border-color`) | Scrollbar Track & Recessed Borders (`--widget-track`) |
| :--- | :--- | :---: | :---: | :---: |
| **Maroons** (Default) | `"maroons"` | `#853146` | `#521d2a` | `#1f090f` |
| **Greens** | `"greens"` | `#2b8c42` | `#1f542b` | `#131c15` |
| **Blues** | `"blues"` | `#4cb2d4` | `#347b93` | `#1c4452` |
| **Blues & Greens** | `"blues-greens"` | `#4cb2d4` (Checkboxes, Scrollbar Thumb) | `#2b8c42` (Panel & Input Borders) | `#131c15` to `#1c4452` |
| **Oranges & Maroon** | `"oranges-maroon"` | `#d46a2b` (Checkboxes, Scrollbar Thumb) | `#853146` (Panel & Input Borders) | `#1f090f` |

---

## 4. Mounts & Vehicles System (Ported from SFVTT Tactical Vehicles)

Carried over directly from the `star-frontiers-vtt` tactical vehicle and transport architecture (distinct from deleted Ship Sheets), mounts and land/water/air vehicles operate as specialized multi-passenger tokens on the Tactical VTT with their own movement rates, structural stamina tracking, and passenger seating states.

### A. Core Mechanical Rules

* **Driver / Rider Binding:** A character token can "embark" or "mount" a vehicle/mount token, locking their grid position to the transport while it moves.
* **Speed & Maneuverability:** Vehicles and mounts use their own movement rates (in **feet per turn** on the Tactical VTT and **miles per hour / miles per day** on the WorldVTT hex map).
* **Structural Health (`STA`) & Tradecraft Repairs:** Unlike standard characters, mounts and heavy vehicles have large structural Stamina pools (`STA`) and Damage Reduction (DR) against physical attacks. If reduced to `0 STA`, the mount/vehicle is wrecked, throwing riders `Prone` in adjacent `5 ft` squares. Damaged vehicles (`land_transport`, `watercraft`, `airship`) are repaired using a matching **Tradecraft** skill (*Carpenter*, *Shipwright*, *Metalsmith*) and an Artisan Tool Kit.

### B. `VehicleTemplate` Data Structure Definition

Each mount or vehicle object contains:

* `vehicle_id`: Unique string (e.g., `"veh_heavy_wagon_01"`)
* `name`: Display title (e.g., `"Reinforced Iron-Bound Wagon"`)
* `category`: Transport class (`"mount"`, `"land_transport"`, `"watercraft"`, or `"airship"`)
* `threat_tier`: Integer threat level (`1–5`)
* `token_image_path`: File path or generated URL to vehicle/mount token graphic
* `hp_max`: Maximum structural Stamina integer (`120`)
* `hp_current`: Current structural Stamina integer (`120`)
* `defense_summary`: Armor or material Damage Reduction (e.g., `"Wood/Iron DR 5"`)
* `movement`: Movement speed string in feet (e.g., `"30 ft (Drawn by 2 Draft Beasts)"`)
* `max_passengers`: Integer seating capacity (`6`)
* `cargo_capacity_lbs`: Integer cargo weight limit in pounds (`3300`)
* `traits`: List of special rules (e.g., `"Cover: Passengers inside gain Hard Cover (+20% defense vs. ranged attacks)."`)

---

## 5. WorldVTT (Regional/World Hex Map — Transformed from Space VTT; Ship Sheets Removed)

The sole structural departure from `star-frontiers-vtt` is the transformation of the **Space VTT** into **WorldVTT** (Regional & World Map mode) and the complete removal of **Ship Sheets**.

### A. Space VTT to WorldVTT Transformation & Ship Sheet Removal

* **Complete Removal of Ship Sheets:** All starship character sheets, ship hull/power allocation panels, and space weapon firing UIs from `star-frontiers-vtt` are removed.
* **No Combat Tracking on the Hex Map:** WorldVTT disables Stamina/Essence delta bars, initiative queues, and weapon/spell targeting on the hex grid while retaining all core canvas UX tools (**Map Pinging**, hex distance rulers in miles, pan/zoom, and fog/visibility toggles).
* **Hex Coordinate Tracking (`q, r`):** Tracks overland position across regional and continental hexes in English miles (e.g., `1 hex = 6 miles` regional scale, or `1 hex = 24 miles` world scale).
* **Overworld Token & Marker Types (`WorldMarker`):**
  1. **`party`:** The player party's banner/token showing current hex location.
  2. **`battle`:** Active conflict markers indicating ongoing skirmishes, sieges, warband raids, or front-line clashes in the world.
  3. **`faction`:** Moving armies, patrols, or monster migrations (e.g., a Frost Giant host or Urkai warband).
  4. **`poi` (Point of Interest):** Settlements, ruins, shrines, or dungeons. Can optionally store a `linked_tactical_scene` ID to jump into the Tactical VTT map.
  5. **`hazard`:** Weather fronts, cursed blights, or blocked mountain passes.

### B. `WorldMarker` Data Structure Definition

Instead of starship combat tokens, a `WorldMarker` instance contains:

* `marker_id`: Unique string (e.g., `"wmk_001"`)
* `type`: Category (`"party"`, `"battle"`, `"faction"`, `"poi"`, or `"hazard"`)
* `label`: Display title (e.g., `"Siege of Ironhold Pass"`)
* `hex_q`: Integer q-coordinate on hex grid
* `hex_r`: Integer r-coordinate on hex grid
* `icon_asset`: File path to marker graphic (e.g., `"/assets/world_markers/crossed_swords_red.webp"`)
* `visibility`: Access level (`"players"` or `"dm_only"`)
* `notes`: Campaign lore or GM description text
* `linked_tactical_scene`: Optional scene ID to open Tactical VTT view (e.g., `"scene_ironhold_breach_01"`)

---

## 6. Core Ability Score Pairs, Character Creation Baseline, Resource Pools & XP Point-Buy Advancement

All characters, NPCs, and sentient adversaries use 4 paired percentile scores (`1–100`), two primary resource pools, and English physical dimensions (height in **feet and inches**, weight/encumbrance in **pounds `lbs`**, tactical movement in **feet per turn**).

### A. Character Creation Baseline (`50`) & Automatic Lineage Modifiers

* **Universal Ability Baseline (`50`):** Upon creation of a new character or sentient NPC in the VTT popup form, all 8 individual ability scores (`STR`, `STA`, `DEX`, `RS`, `INT`, `HISTORY & RELIGION`, `WIL`, `PRE`) initialize at a flat baseline of **50**.
* **Automatic Lineage Stat Assignment:** When a player or GM selects a character's **Lineage** from the active Setting Cartridge (Section 13A), the VTT character creation engine **automatically applies that lineage's stat adjustments** directly to the `50` baseline (e.g., selecting *Dawn Elf* automatically sets `INT` to `55`, `HISTORY & RELIGION` to `55`, and `STA` to `45`) and recalculates starting `hp_max` (`STA`), `ess_max` (`ESS`), carry capacity (`STR * 2 lbs`), and Initiative Modifier (`IM = ceil(RS / 10)`).

### B. Ability Score Pairs & Resource Pool Mapping

| Clean Schema Key | Legacy SFVTT Key | Wayworlds Label | Mechanical Role |
| :--- | :--- | :--- | :--- |
| `STR` / `STA` | `STR` / `STA` | **Strength / Stamina** | Initializes at `50 / 50` before automatic lineage modifiers. Governs melee damage bonus, carry capacity in **lbs** (`Max Carry = STR * 2 lbs`), heavy gear tolerance, and primary Health Pool (`hp_current` / `hp_max`). |
| `DEX` / `RS` | `DEX` / `RS` | **Agility / Reflex Speed** | Initializes at `50 / 50` before automatic lineage modifiers. Governs base ranged/finesse accuracy (`ceil(DEX / 2)`), dodging, and Initiative Modifier (`IM = ceil(RS / 10)`). |
| `INT` / `HIST_REL` | `INT` / `LOG` | **Intellect / History & Religion** | Initializes at `50 / 50` before automatic lineage modifiers. Governs base scholarly/arcane accuracy (`ceil(INT / 2)` or `ceil(HISTORY & RELIGION / 2)`), medicine, history, and religion. |
| `WIL` / `PRE` | `PER` / `LDR` | **Willpower / Presence** | Initializes at `50 / 50` before automatic lineage modifiers. Governs base channeling/spiritual accuracy (`ceil(WIL / 2)`), mental/fear saves, and social/command influence (`PRE`). |
| `hp_current` | `hp_current` | **Stamina (`STA`)** | Physical health, endurance, and fuel source for **Blood Magic** or **Overchanneling** (`Default Max = adjusted STA score`). |
| `ess_current` | `seu_current` | **Essence (`ESS`)** | Consumable power/focus pool (`Default Max = highest of adjusted WIL, HISTORY & RELIGION, or STA for Ki users`, plus charged Runestones/Foci). |

### C. Starting Skills, Universal PSA-Scaled XP Point-Buy & Character Tier Calculation

Wayworlds inherits the exact starting skill allocation and XP point-buy engine from `star-frontiers-vtt`, with two key additions: **all Secular Skills, Tradecrafts, and Magic/Ki Traditions are treated as PSA-scaled (`1x` cost) skills**, and **the character sheet dynamically calculates and displays the character's overall Character Tier (Tier 1–5 matching Threat Tiers)**.

1. **Character Tier Calculation on the Sheet:**
   The movable Character Sheet dynamically computes and displays the character's **Character Tier (`Tier 1` to `Tier 5`)** based on their highest active Skill Level, Magic/Ki Cast Tier, or average Attribute milestone:
   * **Tier 1 (Minor / Novice):** Skills at Lvl 1–2; attributes around baseline 50–55.
   * **Tier 2 (Regular / Adept):** Skills at Lvl 2–3; attributes around 55–60.
   * **Tier 3 (Veteran):** Skills at Lvl 3–4; attributes around 60–65.
   * **Tier 4 (Elite / Master):** Skills at Lvl 4–5 (unlocking multi-attacks); attributes around 65–75.
   * **Tier 5 (Mythic / Legend):** Skills at Lvl 6 (Apex mastery); attributes at 75–85+.
2. **Starting Skill Allocation at Character Creation:**
   * A newly created character starts with **two Level 1 skills** OR **one Level 2 skill** chosen from any Core Secular Skill, Tradecraft, or eligible Magic/Ki Tradition (the flexible character sheet also allows the GM or player to adjust starting skills directly if a campaign starts at a higher tier).
3. **Universal PSA-Scaled Skill & Magic Tradition XP Costs (`Lvl 1` to `Lvl 6`):**
   Every Core Skill, Tradecraft, and Magic/Ki Tradition costs **`3 * Next Level` XP** to advance by `+1 Level`:

| Target Skill / Magic Level | XP Cost from Previous Level | Cumulative XP Invested | Mechanical Unlock |
| :--- | :---: | :---: | :--- |
| **Level 0 -> Level 1** | **3 XP** | `3 XP` | `+10%` check bonus; unlocks **Tier 1** Magic/Ki or **Tier 1** Tradecraft Forge |
| **Level 1 -> Level 2** | **6 XP** | `9 XP` | `+20%` check bonus; unlocks **Tier 2** Magic/Ki or **Tier 2** Masterwork Forge |
| **Level 2 -> Level 3** | **9 XP** | `18 XP` | `+30%` check bonus; unlocks **Tier 3** Magic/Ki, Melee Parry, or **Tier 3** Forge |
| **Level 3 -> Level 4** | **12 XP** | `30 XP` | `+40%` check bonus; **Martial Mastery** (`2` Attacks per Attack Action for Melee, Ranged, and Striker & Grappler); unlocks **Tier 4** Magic/Ki or **Tier 4** Forge |
| **Level 4 -> Level 5** | **15 XP** | `45 XP` | `+50%` check bonus; unlocks **Tier 5** Apex Magic/Ki or **Tier 5** Runeforging |
| **Level 5 -> Level 6** | **18 XP** | `63 XP` | `+60%` check bonus; **Apex Martial Mastery** (`3` Attacks per Attack Action for Melee, Ranged, and Striker & Grappler); **Tier 6** Mythic Mastery cap |

4. **Ability Score XP Point-Buy Costs:**
   * Players may also spend XP directly on their 8 Ability Scores (`STR`, `STA`, `DEX`, `RS`, `INT`, `HISTORY & RELIGION`, `WIL`, `PRE`) using the default `star-frontiers-vtt` attribute XP point-buy engine (`1 XP` per `+1` attribute point baseline, or tiered bracket costs as configured in the SFVTT sheet).
   * **Scenario / Adventure XP Awards:** A typical challenge or scenario section awards **5–10 XP** (enough to raise 1–2 skills or add `~5` points to attributes), while completing a full adventure awards roughly **3x that (15–30 XP)**.
5. **Automatic VTT Sheet Recalculation on XP Spend:**
   Whenever a player spends XP on their movable Character Sheet to raise an Attribute or Skill Level, the VTT automatically recalculates all derived values (including updating the displayed **Character Tier** badge):
   * Raising `STA` immediately increases `hp_max` (`STA`) point-for-point.
   * Raising `WIL`, `HISTORY & RELIGION`, or `STA` (for Ki users) immediately increases `ess_max` (`ESS`) point-for-point.
   * Raising `STR` updates maximum carry capacity (`STR * 2 lbs`), and raising `RS` updates Initiative Modifier (`IM = ceil(RS / 10)`).

---

## 7. Universal d100 Action Resolution, Spotlight Turn Order & 2-Action Combat Economy

All weapon attacks, spell/power casts, and skill checks resolve via a single `d100` roll-under target number, paired with a fluid **Side-Based Spotlight Turn Order** and a **2-Action Economy**.

### A. Universal d100 Roll-Under Formula

* **Formula:** `Target % = ceil(Base Stat / 2) + (Skill Level * 10) + Lineage/Gear/Shield Modifiers`
* **Skill Levels (`Lvl 0` to `Lvl 6`):** Each rank grants `+10%` to the check. For supernatural/magic/Ki traditions, **Skill Level also sets the maximum Cast Tier (`Tier 1–6`)** the character can channel. For **Tradecraft**, **Skill Level sets the maximum Craft / Masterwork Tier (`Tier 1–6`)** the artisan can forge or repair.
* **Critical Hits & Fumbles:** Rolling `01–05` (or doubles under the Target %) is a Critical Success (`2x` damage dice or automatic secondary condition). Rolling `96–00` is a Fumble.

### B. Side-Based Initiative & GM Spotlight Turn Order

Rather than locking combatants into a rigid individual initiative queue or a fixed "Move -> Attack -> Heal" phase sequence, Wayworlds uses **Side-Based Initiative** followed by **GM Spotlight Cycling**:

1. **Side-Based Initiative Roll:** At the start of a combat round (or encounter), each side rolls for initiative (modified by the highest or leader's Initiative Modifier `IM = ceil(RS / 10)`). The winning side acts first.
2. **The Spotlight System (Player Phase):** During the Players' side of the round, **the GM cycles the Spotlight through the players in whatever tactical or narrative order makes the most sense** for the scene (e.g., resolving a frontline breach first, then a flanking rogue, then a supporting caster). The VTT tracker allows the GM to click any player token/portrait to pass the active Spotlight and marks which characters have acted this round.
3. **Adversary Phase:** During the Adversaries' side of the round, the GM activates enemy tokens/groups in the order that makes the most sense for the encounter.

### C. Any Two Actions Per Turn (Flexible 2-Action Economy & Martial Multi-Attack Scaling)

When a character or NPC has the Spotlight on their turn, they do **not** follow a rigid phase order. Instead, **they may perform ANY TWO ACTIONS in any order** (including repeating the same action twice, such as moving twice for a sprint or taking two Attack actions):

* **Available Actions (Pick Any 2 per Turn):**
  * **Move:** Move up to the character's base speed in feet (e.g., `30 ft`). Taking **Move + Move** allows dashing `60 ft` across the map.
  * **Attack (Scales at Martial Skill Tier 4 & Tier 6):** Perform a weapon or unarmed attack using **Melee Weapons**, **Ranged Weapons**, or **Striker & Grappler**:
    * **Skill Lvl 0–3:** `1` attack per Attack action.
    * **Skill Lvl 4–5 (Tier 4 Martial Mastery):** `2` attacks per Attack action at full Target `%` (so a martial character keeps pace with Tier 4 `5d10` spellcasters).
    * **Skill Lvl 6 (Tier 6 Apex Martial Mastery):** `3` attacks per Attack action at full Target `%`.
  * **Cast / Channel:** Cast a spell from the Grimoire or channel a Magic/Ki Tradition power.
  * **Heal / Bind Wounds:** Apply a *Battle Medic Binding Kit* (`1d10 + Skill Lvl STA`) or channel a Restoration power.
  * **Use Item / Interact:** Draw/stow gear, drink a potion (when enabled), open/bar a heavy door, embark/disembark a Mount/Vehicle, or perform a mid-combat skill check.
  * **Aim / Brace / Defend:** Spend 1 action aiming (`+10%` to the next attack roll this turn) or bracing behind a shield/cover (`-10%` to incoming attacks until next turn).

---

## 8. Wayworlds Core Skills (Secular Martial, Adventuring & Tradecraft)

These 10 core secular skills exist across all Wayworlds fantasy settings and all use the universal PSA-scaled XP cost table (Section 6C):

1. **Melee Weapons** (`Base: 1/2 STR or DEX`): Blades, axes, polearms, bludgeons (`5 ft` standard reach; `10 ft` reach for polearms).
   * **Lvl 3+:** Unlocks **Parry** (`-10%` to incoming melee attacks).
   * **Lvl 4 (Tier 4):** Unlocks **2 attacks per Attack action** at full accuracy.
   * **Lvl 6 (Tier 6):** Unlocks **3 attacks per Attack action** at full accuracy.
2. **Ranged Weapons** (`Base: 1/2 DEX`): Bows, crossbows, javelins, slings, thrown weapons (ranges measured in **feet**, e.g., Short `30 ft`, Medium `60 ft`, Long `120 ft`).
   * **Lvl 4 (Tier 4):** Unlocks **2 attacks per Attack action** at full accuracy.
   * **Lvl 6 (Tier 6):** Unlocks **3 attacks per Attack action** at full accuracy.
3. **Armor & Shield Mastery** (`Base: 1/2 STR`): Negates heavy armor speed penalties and powers **Shield Deflection** (decreases an attacker's hit percentage on a sliding scale: `-5%` base shield penalty plus `-5%` per *Armor & Shield Mastery* Skill Level, plus any magic shield tier bonus).
4. **Striker & Grappler** (`Base: 1/2 STR or DEX`): Unarmed martial arts, pugilism, precision striking (`1d10` base unarmed damage at `Lvl 1+`), joint locks, pinning (`Pinned` condition), and throws/knockdowns (`Prone` condition).
   * **Lvl 4 (Tier 4):** Unlocks **2 unarmed/grapple attacks per Attack action** at full accuracy.
   * **Lvl 6 (Tier 6):** Unlocks **3 unarmed/grapple attacks per Attack action** at full accuracy.
5. **Athletics & Acrobatics** (`Base: 1/2 STR` for **Athletics**; `1/2 DEX` for **Acrobatics**):
   * **Athletics (`1/2 STR`):** Climbing sheer surfaces, swimming in rough/armored conditions, high/long jumping (`ft`), forcing open barred doors, and feats of raw physical exertion.
   * **Acrobatics (`1/2 DEX`):** Balancing on narrow ledges, tumbling through threatened squares, escaping bonds, and reducing fall damage (`-1d10` fall damage per Skill Level).
6. **Stealth & Secrecy** (`Base: 1/2 DEX`): Stealth, lockpicking, trap finding/disarming, ambush mechanics, backstabbing, disguise, pickpocketing, and sleight of hand.
7. **Wilderness & Beast Lore** (`Base: 1/2 HISTORY & RELIGION`): Tracking, overland navigation in **miles** on the **WorldVTT hex map**, foraging, monster identification, and mounted riding/handling.
8. **Herbalism & Medicine** (`Base: 1/2 INT or HISTORY & RELIGION`): Field surgery, battle medic binding kits, and wound restoration (restores `2d10 STA`), diagnosing illnesses/curses, brewing healing poultices, antitoxins, and blade poisons.
9. **History & Religion** (`Base: 1/2 INT or HISTORY & RELIGION`): Knowledge of ancient empires, genealogies, regional customs, deities, spirit cults, runes, and planar myths.
10. **Tradecraft (Freeform Write-In Artisan Skill)** (`Base: 1/2 INT, DEX, or STR` depending on craft):
    * **Write-In Craft Specialization:** When selecting *Tradecraft*, the player writes in a specific mundane artisan profession on their movable character sheet—such as *Leatherworker*, *Armorer*, *Bowyer*, *Fletcher*, *Metalsmith / Weaponsmith*, *Carpenter*, *Stonemason*, *Jeweler*, *Tailor*, *Shipwright*, or *Cartographer*. Multiple distinct Tradecrafts can be taken as separate write-in rows.
    * **Mechanical Role:** Governs field repairs of sundered gear/vehicles and unlocks tiered item creation in the **Custom Equipment & Magic Item Forge Applet** (see Section 11B).
    * **Domain Conflict Restriction (Guardrail):** A player **cannot** write in a Tradecraft specialization that overlaps or conflicts with any existing Core Skill or Magic/Ki Tradition domain. Specifically, write-ins such as *"Herbalist"*, *"Medic"*, *"Alchemist / Poisoner"* (covered by **Herbalism & Medicine**), *"Locksmith / Thief / Assassin"* (covered by **Stealth & Secrecy**), *"Beast Trainer / Tracker"* (covered by **Wilderness & Beast Lore**), or *"Scholar / Priest / Runecaster"* (covered by **History & Religion** or Magic Traditions) are strictly disallowed and blocked/flagged by the character sheet validator.

---

## 9. Wayworlds Freeform Power, Magic & Ki Engine + Character Sheet Grimoire

Wayworlds combines an open-ended **Universal Magnitude Table** with a customizable **Character Sheet Grimoire & Martial Technique Book** so players can both improvise on the fly and save named, one-click signature spells/moves. All Magic, Power, and Ki Traditions use the exact same PSA-scaled XP advancement costs (`3 / 6 / 9 / 12 / 15 / 18 XP`) as secular skills.

### A. Core Casting & Channeling Mechanics

1. **Skill Level (Tier) locks the mechanical ceiling** (via the Universal Magnitude Table below).
2. **Dial-a-Tier Essence Cost:** The player chooses which Cast Tier (`0` up to their `Skill Level`) to channel before rolling. The `ESS` (or `STA`) cost is strictly `Cast Tier * 2` (`0` for Cantrips/Minor moves). Increasing `WIL`, `HISTORY & RELIGION`, or `STA` with XP increases the character's maximum `ESS` pool.
3. **The Tradition locks the narrative palette and fuel source** (defined in the active Setting Cartridge).
4. **The Player narrates the exact manifestation** on the fly or triggers a saved entry from their Character Sheet Grimoire.

### B. The Universal Freeform Magnitude Table (Distances in Feet)

A practitioner may channel any Cast Tier up to their **Skill Level (`1–6`)** in their chosen Tradition (standard spell range is `30 ft` to `60 ft` unless melee/self):

| Cast Tier (Max = Skill Lvl) | Cost (`ESS` or `STA`) | Single-Target Strike (Bolt, Lash, Smite, Ki) | Area Blast / Cleave (Cone, Burst, Whirlwind) | Ward / Restoration (Shield DR or Heal `STA`) | Hex / Control / Summon (Condition or VTT Token) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Cantrip / Minor** | `0` | `1d6` (Spark, minor strike) | Light campfire / `5 ft` smoke puff | Stop bleeding (`+2 STA`) | Minor sensory trick / `10 ft` wall-run |
| **Tier 1 (Lvl 1)** | `2` | **2d10** damage | **1d10** (`5 ft` radius / 2 foes) | **2d10 STA** or `10 Temp Ward` | Inflict **1 Condition** (`-10%` save) or summon **Tier 1** minion |
| **Tier 2 (Lvl 2)** | `4` | **3d10** damage | **2d10** (`10 ft` radius / 3 foes) | **3d10 STA** or `20 Temp Ward` | Inflict Condition (`-20%` save) or summon **Tier 2** minion |
| **Tier 3 (Lvl 3)** | `6` | **4d10** damage | **3d10** (`15 ft` radius / 4 foes) | **4d10 STA** or `Half-Dmg Ward` | Multi-target Hex (`-30%` save) or summon **Tier 3** entity |
| **Tier 4 (Lvl 4)** | `8` | **5d10** damage | **4d10** (`20 ft` radius burst) | **5d10 STA** or Party Ward | Area Lockdown (`-40%` save) or summon **Tier 4** entity |
| **Tier 5–6 (Apex)** | `10+` | **6d10–8d10** | **5d10+** (`30 ft+` Cataclysm) | Full Restore / Mythic Aegis | Mass Dominate or summon **Tier 5** Avatar |

### C. Character Sheet Grimoire & Martial Technique Book (Saved Player Spells)

Whenever a PC has `Lvl 1+` in any Magic, Power, or Ki Tradition, their movable Character Sheet displays a dedicated **Grimoire & Techniques Tab** where they can write, edit, and trigger custom named spells or martial arts moves:

* **Custom Entry Fields (`SpellEntry`):**
  * `spell_id`: Unique ID
  * `name`: Player-authored title (e.g., *"Grimnir's Rime-Lance"*, *"Stormlord's Thunder Palm"*, *"Shadow-Step Ambush"*)
  * `tradition`: Linked Tradition skill (e.g., `"Arcane"`, `"Ki"`, `"Blood"`)
  * `default_tier`: Selected Cast Tier (`0` to `Skill Level`, adjustable via an inline Tier dial before clicking Cast)
  * `category`: `"strike"`, `"blast"`, `"ward_heal"`, or `"hex_summon"`
  * `range_area`: Range/radius in feet (e.g., `"60 ft / Single Target"` or `"10 ft Burst"`)
  * `description`: Player's custom flavor text and secondary condition notes
* **One-Click VTT Execution:** Clicking **[Cast / Channel]** on a Grimoire row automatically deducts `Cast Tier * 2` from the character's `ess_current` (or `hp_current` for Blood Magic), rolls `d100` against their Tradition Target `%`, and rolls the corresponding `Nd10` effect into the VTT combat log.

---

## 10. Weapons, Armor, Inventory & Custom Item Forge (`CC-BY-4.0` SRD Baseline)

Wayworlds seeds its standard equipment catalog from the **CC-BY-4.0 5e SRD** (preserving familiar fantasy item names and weights in `lbs`), while converting all weapon damage to **`Nd10` (no flat `+` damage modifiers)** and armor/shields to Wayworlds DR and percentile deflection.

### A. Mundane Weapon Baseline (`Nd10` Scaling)

| Weapon Class | Examples (CC-BY-4.0 SRD Baseline) | Base Damage | Weight (`lbs`) | Range / Reach & Properties |
| :--- | :--- | :---: | :---: | :--- |
| **Unarmed / Improvised** | Fist, Kick, Grapple, Torch, Club | **1d6** (or **1d10** w/ *Striker & Grappler Lvl 1+*) | `0–2 lbs` | `5 ft` reach; `2` attacks/action at *Striker & Grappler Lvl 4*, `3` at *Lvl 6* |
| **Light / Fast Melee** | Dagger, Shortsword, Handaxe, Sickle, Rapier, Kunai | **1d10** | `1–3 lbs` | `5 ft` reach (throwable `20/60 ft`); `+5%` finesse accuracy; `2` attacks/action at *Lvl 4*, `3` at *Lvl 6* |
| **Standard Martial Melee** | Broadsword, Longsword, Battleaxe, Warhammer, Mace, Spear | **2d10** (or **3d10** 2-Handed Versatile) | `3–4 lbs` | `5 ft` reach; Broadsword/Longsword support 1-handed (`2d10`) or 2-handed (`3d10`) grips; `2` attacks/action at *Lvl 4*, `3* at *Lvl 6* |
| **Heavy / Versatile Melee** | Bastard Sword, Greatsword, Greataxe, Maul, Halberd | **3d10** (Bastard Sword: **2d10** 1-hand w/ STR 55+) | `4–12 lbs` | `5 ft` (`10 ft` polearms); Bastard Sword usable 1-handed (STR 55+) or 2-handed (`3d10`); `2` attacks/action at *Lvl 4*, `3* at *Lvl 6* |
| **Light Ranged / Thrown** | Shortbow, Sling, Javelin, Throwing Axe, Dart | **1d10** | `1–2 lbs` | Short `30 ft` / Med `60 ft` / Long `120 ft`; `2` attacks/action at *Lvl 4*, `3` at *Lvl 6* |
| **Martial / Heavy Ranged** | Longbow, Light Crossbow, Heavy Crossbow | **2d10** (`3d10` Heavy X-Bow) | `3–18 lbs` | Short `60 ft` / Med `120 ft` / Long `240 ft`; `2` attacks/action at *Lvl 4*, `3` at *Lvl 6* |

### B. Armor, Shield Deflection & Ward Mitigation

To keep combat fast, Armor provides **Damage Reduction (DR)** or **Damage Halving**, while Shields actively reduce the attacker's hit percentage:

* **-2 any non-magical attack:** **Padded Armor** (`8 lbs`).
* **-4 any non-magical attack:** **Leather Armor** (`10 lbs`), **Hide Armor** (`15 lbs`).
* **-5 any non-magical attack:** **Studded Leather Armor** (`13 lbs`).
* **Halves any non-magical damage:** **Chain Mail** (`35 lbs`), **Breastplate** (`20 lbs`), **Scale Mail** (`30 lbs`), **Banded Mail** (`35 lbs`).
* **Halves any damage and -10% to attackers roll of any non-magical attack:** **Mythril Armor** (`25 lbs`), **Full Plate Armor / Full Plate** (`50 lbs`).
* **Shields (`6 lbs` — Torpedo-Style Attacker % Penalty):** Equipping a shield directly reduces incoming melee and ranged attackers' target hit percentage:
  * **Formula:** `Attacker Hit % Penalty = -5% (Base Shield) - (5% * Armor & Shield Mastery Skill Lvl) - (Magic Shield Tier Bonus %)`
  * *Example:* A warrior with a Tier 1 Magic Shield (`-5%`) and *Armor & Shield Mastery Lvl 2* (`-10%`) imposes a **`-20%` hit penalty** on all incoming attacks.
* **Active Wards:** Absorbs a flat pool of damage or halves Elemental/Magic damage for the scene.

---

## 11. Restricted Healing, Tradecraft Repair & Custom Equipment / Magic Item Forge Applet

To maintain tactical grit and unify item creation with player skills, Wayworlds restricts casual healing and links the **Equipment & Magic Item Forge Popup Applet** directly to **Tradecraft** skill levels.

### A. Restricted Healing Rules (No General Magic "Cure Wounds")

* **Restricted Healing Sources:** Stamina (`STA`) recovery is restricted to dedicated **Spiritual / Druidic / Witchcraft** restoration effects, **Herbalism Kits**, and **Battle Medic Binding Kits**.
* **Permitted Healing Methods (Current Build):**
  1. **Magical Restoration:** Channeled via *Spiritual*, *Druidic*, or *Witchcraft* traditions using the Ward / Restoration column of the Universal Magnitude Table (or Necromancy life-drain).
  2. **Herbalism Kits (`3 lbs`):** Requires a successful *Herbalism & Medicine* skill check using poultices and salves during a short rest (10 minutes) to recover `2d10 STA` and purge `Poisoned` or `Diseased` conditions.
  3. **Battle Medic Binding Kits (`2 lbs`):** Fast tactical field kits usable in combat (1 of the character's 2 actions within `5 ft`, *Herbalism & Medicine* check) to stop `Bleeding` and immediately bind wounds for `1d10 + Skill Level STA` (usable once per character per combat encounter).
  *(Note: Healing Potions and Essence Potions are reserved for a future specification update).*

### B. Tradecraft Mechanics: Field Repairs & Tiered Crafting in the Forge Applet

A character's rank (`Lvl 1–6`) in a relevant **Tradecraft** specialization (*Weaponsmith, Armorer, Bowyer, Leatherworker, Carpenter, Shipwright, Jeweler*) governs both field maintenance and the maximum item tier they can build in the **Equipment & Magic Item Forge Applet**:

1. **Field Repairs (Armor, Shields & Vehicles — Short Rest / 10 Mins):**
   * Requires an **Artisan Tool Kit (`5 lbs`)** matching the Tradecraft and a successful `d100` Tradecraft roll (`ceil(Base Stat / 2) + (Skill Level * 10)`).
   * **Armor & Shield Repair:** Removes the `Sundered` or `Damaged` condition from armor, shields, or weapons, restoring their full DR or deflection penalty.
   * **Vehicle & Construct Repair:** Restores **`2d10 + (Tradecraft Skill Lvl * 10) STA`** to a damaged wagon, watercraft, airship, or siege engine (`VehicleTemplate`).
2. **Tradecraft Tier-Gating in the Custom Equipment Forge Applet:**
   * While the GM can forge any item (`Tier 0–5`) unrestricted, a player crafting in the Forge Applet is capped by their **Tradecraft Skill Level (`Lvl 1–6`)** and must succeed on a `d100` Tradecraft check (with a `-5%` penalty per Craft Tier above `1`):

| Tradecraft Rank | Max Forge Tier | Permitted Crafting Output in the Equipment Forge Applet |
| :--- | :---: | :--- |
| **Lvl 1 (Apprentice)** | **Tier 1** | **Standard Mundane Gear:** Craft any standard mundane weapon (`1d10–3d10`), shield (`-5%` penalty), or armor (`Light/Medium/Heavy`) from raw materials; perform field repairs. |
| **Lvl 2 (Journeyman)** | **Tier 2** | **Masterwork Arms & Shields:** Forge finely balanced weapons granting **+5% Attack Hit Bonus** or reinforced shields granting an extra **-5% Attacker Hit Penalty** (`-10%` total before skill). |
| **Lvl 3 (Master)** | **Tier 3** | **Superior Masterwork & Reinforced Armor:** Forge weapons with **+10% Attack Hit Bonus**, shields with **-10% bonus deflection**, or armor with **+1 additional DR per die** (e.g., Light Armor `-3` per die). |
| **Lvl 4 (Grandmaster)** | **Tier 4** | **Apex Mundane Craft:** Forge weapons with **+15% Attack Hit Bonus**, or custom-fitted Heavy Armor that **eliminates the `-5 ft` speed penalty and `-10%` Stealth/Athletics penalty**. |
| **Lvl 5–6 (Mythic / Runeforger)** | **Tier 5** | **Enchanted & Runeforged Vessels:** Forge items with **+1d10 to +3d10 bonus elemental/runic damage dice**, damage-halving properties, or bound `Tier 1–5` powers (requires either a co-crafting caster with the matching Magic Tradition, or a crafter with their own Magic/Ki Tradition or Vanir *Runeforged* trait). |

### C. Custom Equipment & Magic Item Forge Applet Rules (`Nd10` & `%` Only)

Whether used by the GM on the fly or by a player rolling a **Tradecraft** check, the Forge Applet enforces clean `Nd10` and `%` math—**never flat `+1 / +2` damage arithmetic**:

1. **Custom & Magic Weapons (`Nd10` Damage & Hit `%` Boosts Only):**
   * **No Flat Damage Modifiers:** Weapons never add flat numbers (like `+1` or `+3`) to damage rolls. Mundane weapons pick a base die (`1d10`, `2d10`, `3d10`), and magical weapons add whole **`Nd10` bonus dice** (`+1d10`, `+2d10`, `+3d10` elemental/runic damage) or trigger bound Universal Magnitude Table effects.
   * **Attack Percentage Bonus:** Masterwork or magical weapons increase the wielder's attack Target `%` for that weapon type by flat percentile increments (`+5%`, `+10%`, `+15%`, or `+20%`).
2. **Custom & Magic Armor (Armor Rating / DR Increases):**
   * Defines custom armor weight (`lbs`), base DR (`-2` to `-4` per die), damage-halving categories (Slashing, Piercing, Bludgeoning, or Elemental), or a regenerating `Temp Ward` pool (`10–30 STA`).
3. **Custom & Magic Shields (Attacker Hit `%` Reduction):**
   * Sets the shield's base deflection (`-5%`) plus any masterwork/magical tier penalty (`-5%` to `-20%`) that stacks with the bearer's *Armor & Shield Mastery* skill to reduce incoming attackers' hit percentages.
4. **Spell/Power Relics & Essence Foci:**
   * Stores external `ESS` (`10–30 ESS`) or triggers a bound `Tier 1–5` effect from the Universal Magnitude Table directly from the Token HUD `actions[]` list.

### D. `ItemTemplate` Data Structure (Mundane, Masterwork & Magical Gear)

* `item_id`: Unique string (e.g., `"itm_frostbrand_greatsword"`)
* `name`: Display title (e.g., `"Rime-Forged Greatsword"`)
* `category`: Item type (`"weapon"`, `"armor"`, `"shield"`, `"kit"`, `"relic"`, or `"gear"`)
* `required_tradecraft`: Matching artisan skill string (e.g., `"Weaponsmith"`, `"Armorer"`, `"Bowyer"`)
* `is_magical`: Boolean (`true` / `false`)
* `item_tier`: Integer tier (`1` for standard mundane, `2–4` for Masterwork, `5` for Runeforged/Magic)
* `weight_lbs`: Weight in pounds (`6`)
* `attack_pct_bonus`: Flat percentage added to attack rolls (`+10%`)
* `damage_dice`: Total or bonus `Nd10` damage dice (`"3d10 Slashing + 1d10 Cold"` — never flat `+` numbers)
* `attacker_pct_penalty`: For shields, percentage subtracted from incoming attack rolls (`-10%` base + magic shield penalty, stacking with `-5%` per *Armor & Shield Mastery* level)
* `armor_dr_bonus`: Damage Reduction or damage-halving rule
* `bound_power`: Optional Tier `1–5` effect from the Universal Magnitude Table

---

## 12. In-App NPC & Adversary Spawner Popup & Threat Tier 1–5 Benchmarks

Rather than relying on an external CLI agent to stock encounters, **the VTT application itself handles NPC and Adversary creation and placement** via a built-in Popup Form (ported directly from `https://github.com/jayrfink/star-frontiers-vtt`), including automated calls to free AI art generators to create token graphics on the fly.

### A. Built-In VTT Adversary/NPC Popup Form & Free Art Token Pipeline

* **Interactive Creation Modal:** The GM opens the NPC/Adversary Spawner popup form directly inside the VTT UI, selects the **Threat Tier (`1–5`)**, **Category** (Sentient Lineage vs. Beast/Monster/Undead), **Lineage** (auto-applying stat adjustments to the `50` baseline), **Weapon/Magic/Ki Tradition**, and **Quantity (`#1..#N`)**.
* **Automated Math & Action Generation:** The VTT form automatically calculates the creature's `STA` (`hp_max`), `ESS` (`ess_max`), d100 hit percentages, and `Nd10` damage dice according to the Threat Tier table below and the Universal Magnitude Table.
* **Integrated Free Art Token Generator:** When creating a new NPC, monster, or mount in the popup form, the VTT automatically constructs a visual prompt from the creature's lineage/description and calls free art generation endpoints (matching the `jayrfink/star-frontiers-vtt` token pipeline) to generate, crop, and ring a circular top-down/portrait token image, binding it directly to the spawned `TokenInstance` objects on the canvas.

### B. Wayworlds Threat Tier 1–5 Benchmarks

The VTT's built-in Adversary Spawner enforces these default mathematical bounds (default humanoid movement speed is **30 ft per Move action**; GMs can freely customize/alter STA, Attack %, and damage on adversary creation):

| Threat Tier | Archetype Role | Sentient NPCs (Base Stats, Skill/Cast Tier, STA, ESS) | Beasts, Undead & Monsters (Hit %, STA, Attacks/Dmg, Traits) |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Minor)** | Minion, Raider, Acolyte, Lesser Undead | Stats: `35–45`, Skill/Magic: **Lvl 1** (`35–45%` hit, `1` atk/action), STA: `20–30`, ESS: `10–20` | Hit: `30–35%`, STA: `10–25`, `1` attack (`1d10` or `1d6`) |
| **Tier 2 (Regular)** | Trained Soldier, Cultist, Pack Predator | Stats: `45–55`, Skill/Magic: **Lvl 2** (`45–55%` hit, `1` atk/action), STA: `35–50`, ESS: `25–40` | Hit: `40–50%`, STA: `35–65`, `1–2` attacks (`2d10`) + 1 Lineage/Innate Trait |
| **Tier 3 (Veteran)** | Champion, Battle-Mage, Greater Undead | Stats: `55–65`, Skill/Magic: **Lvl 3** (`55–65%` hit, `1` atk/action + Parry), STA: `55–75`, ESS: `45–65` | Hit: `55–65%`, STA: `70–120`, `2` attacks (`3d10`) + Special Aura/Hex |
| **Tier 4 (Elite)** | Warlord, Arch-Caster, Behemoth | Stats: `65–75`, Skill/Magic: **Lvl 4** (`65–75%` hit, **2 atks/action**), STA: `80–110`, ESS: `70–100` | Hit: `65–75%`, STA: `130–210`, `2–3` attacks (`4d10`) + Heavy DR / Magic Ward |
| **Tier 5 (Mythic)** | Demigod, Ancient Wyrm, Avatar | Stats: `75–85+`, Skill/Magic: **Lvl 5–6** (`75–85%` hit, **2–3 atks/action**), STA: `120–170+`, ESS: `120+` | Hit: `75–85%`, STA: `240+`, Area Cataclysms (`5d10+`), Regeneration, Terror |

---

## 13. Default Setting Cartridge Modules (`/cartridges/ulvwylde/`)

*Note: The tables below define the default `UlvWylde` Setting Cartridge (`lineages.json` and `traditions.json`) and populate the dropdown menus in the VTT's movable Character Sheet and NPC/Adversary Creation Popup. All Stat Adjustments are automatically applied to the `50` ability score baseline.*

### Module 13A: Foundation Species & Lineages (`lineages.json`)

#### I. The Norn (Elven, Wendhya & Dwarven Lineages)

| Lineage | Automatic Stat Adjustments (Applied to `50` Baseline) | Innate Trait & VTT Mechanical Hook |
| :--- | :--- | :--- |
| **Dawn Elves** | `+5 INT (55), +5 HISTORY & RELIGION (55), -5 STA (45)` | **Solar & Arcane Attunement:** `+5%` to *Arcane* or *Spiritual* channeling; immune to dazzling/blinding light (`30 ft` base move). |
| **Dusk Elves** | `+5 INT (55), +5 DEX (55), -5 STA (45)` | **Gloaming Attunement:** `+5%` to *Shadow* or *Witchcraft* casting; darkvision up to `60 ft` (no penalty in dim/dark terrain). |
| **Sylvan Elves** | `+5 DEX (55), +5 RS (55), -5 STR (45)` | **Woodland Stride & Warg Bloodline:** Eligible for the **Warg** skill; `35 ft` base movement speed and `+10%` *Stealth & Secrecy* / *Wilderness* in forests. |
| **Wilder Elves** | `+5 DEX (55), +5 WIL (55), -5 HISTORY & RELIGION (45)` | **Feral Instinct & Warg Bloodline:** Eligible for the **Warg** skill; `+1` Initiative Modifier (`IM`) and `+5%` melee accuracy. |
| **Twilight Elves** | `+5 DEX (55), +5 WIL (55), -5 STR (45)` | **Veil Sight:** Sees invisible/shadow-melded spirits within `60 ft`; `+10%` to resist *Hexing*, illusions, and mental domination. |
| **Wendhya** | `+5 WIL (55), +5 RS (55), -5 STR (45)` | **Spirit-Kin & Warg Bloodline:** Eligible for the **Warg** skill; can sense nearby spirits, undead, or demonic taint within `30 ft` automatically. |
| **Weirgoth Dwarves** | `+5 STA (55), +5 WIL (55), -5 DEX (45)` | **Stone-Blood & Warg Bloodline:** Eligible for the **Warg** skill (cavern/stone beasts); `-2` damage per die from Poison and Slashing (`25 ft` base move). |
| **Vanir Dwarves** | `+5 STR (55), +5 STA (55), -5 RS (45)` | **Runeforged Resilience:** `+10%` resistance to hostile magic; ignores movement speed penalties of heavy armor (`25 ft` base move); can forge Runic magic items at *Tradecraft Lvl 5+* without a co-caster. |

#### II. The Urkai (Elemental Urkai, Orcish & Goblinoid Lineages)

| Lineage | Automatic Stat Adjustments (Applied to `50` Baseline) | Innate Trait & VTT Mechanical Hook |
| :--- | :--- | :--- |
| **Frost Urkai** | `+5 STR (55), +5 STA (55), -5 HISTORY & RELIGION (45)` | **Rime-Born:** Takes **half damage** from Cold/Frost; ignores ice movement penalties. |
| **Ash Urkai** | `+5 STR (55), +5 STA (55), -5 HISTORY & RELIGION (45)` | **Cinder-Born:** Takes **half damage** from Fire/Heat; immune to smoke/ash inhalation penalties. |
| **Forest Urkai** | `+5 STR (55), +5 DEX (55), -5 HISTORY & RELIGION (45)` | **Thorn-Born:** Takes **half damage** from Poison/Acid; `+10%` ambush/stealth in heavy overgrowth. |
| **Stone Urkai** | `+5 STR (55), +10 STA (60), -5 DEX (45), -5 HISTORY & RELIGION (45)` | **Granite Hide:** Natural Damage Reduction (`-2` damage per die from Slashing, Piercing, and Bludgeoning). |
| **Orcish** | `+5 STR (55), +5 STA (55), -5 INT (45)` | **Blood Fury:** When `hp_current` drops below `50%` of `hp_max`, gains `+10%` to all Melee Attacks and `+1d10` melee damage. |
| **Hobgoblins** | `+5 STR (55), +5 PRE (55), -5 WIL (45)` | **Phalanx Discipline:** Gains `+5%` to hit and `-2` damage per die when within `5 ft` (adjacent) of at least one allied token on the VTT grid. |
| **Goblins** | `+10 DEX (60), +5 RS (55), -10 STR (40), -5 STA (45)` | **Scurry & Skulk:** Small size (`3–4 ft` tall, `40 lbs`); `+10%` to *Stealth & Secrecy*; can move through enemy `5 ft` spaces and disengage without triggering free strikes. |

#### III. The Giants (True Giants, Giantkin & Minotaurs)

| Lineage | Automatic Stat Adjustments (Applied to `50` Baseline) | Innate Trait & VTT Mechanical Hook |
| :--- | :--- | :--- |
| **True Giants** *(Storm, Cloud, Frost, Stone, Hill)* | `+15 to +25 STR/STA (65–75)` *(Tier 3–5 Scale)* | **Elder Primordials:** Large/Huge VTT footprint (`10x10 ft` or `15x15 ft`, `12–20 ft` tall); native mastery of **Druidic**, **Arcane**, or **Ki** power matching their lineage; immune to their native energy type (`40 ft` move). |
| **Giantken / Goliath** | `+10 STR (60), +10 STA (60), -10 DEX (40), -5 HISTORY & RELIGION (45)` | **Titan's Heritage:** `7–8 ft` tall (`280–340 lbs`); wields two-handed weapons in one hand (`+1d10` melee damage) and halves incoming knockback/push distances. |
| **Trollkin** | `+10 STR (60), +10 STA (60), -10 INT (40), -5 PRE (45)` | **Feral Regeneration:** Regains **5 STA** at the start of each turn unless damaged by Fire or Acid since their last turn. |
| **Ogre** | `+15 STR (65), +15 STA (65), -15 INT (35), -10 DEX (40)` | **Crushing Bulk:** Large footprint (`10x10 ft`, `9–10 ft` tall); melee strikes knock Medium or smaller targets `Prone` on a roll ending in `0` or `5`. |
| **Minotaur / Nord Minotaur** | `+10 STR (60), +5 STA (55), -5 INT (45)` | **Goring Charge:** Moving `20 ft+` (`4+` grid squares) in a straight line before attacking adds `+1d10` damage and knocks target `Prone` (*Nord Minotaur* also halves Cold damage). |

#### IV. Hybrid & Spirit-Infected Lineages (Whisperlings & Mixlanders)

| Lineage | Size / Automatic Stat Adjustments (Applied to `50` Baseline) | Innate Trait & VTT Mechanical Hook |
| :--- | :--- | :--- |
| **Whisperlings** | **Small (`3–4 ft`) or Medium (`5–6 ft`)** · `+5 DEX (55), +5 WIL (55), -5 STR (45)` | **Spirit-Infected:** Rooted in any Foundation Species and transformed by spirit infection (Tiefling analog). Gains half-damage resistance to one energy type (Fire, Shadow, or Cold) and `+5%` to *Shadow*, *Demonology*, or *Witchcraft* casting. |
| **Mixlanders** | **Medium (`5–6 ft`)** · `+5 to two stats of choice (55), -5 to one stat (45)` | **Elven Amalgam:** A mixed-heritage blend of elven lineages. Inherits flexibility (`+5%` to any one secular skill check) and adapts easily to diverse regional magic traditions. |

### Module 13B: Power, Magic & Ki Traditions Registry (`traditions.json`)

| Tradition | Base Stat | Fuel Source | Narrative Palette, Restrictions & Special Mechanics |
| :--- | :--- | :--- | :--- |
| **1. Arcane** | `1/2 INT` | **Essence (`ESS`)** | *General Wizardry:* Pure force, fire, frost, lightning, telekinesis, arcane wards. Can draw bonus `ESS` from charged runestones and staves. |
| **2. Blood** | `1/2 WIL` | **Stamina (`STA`)** | *Hemocraft & Sacrifice:* **Bypasses `ESS`—burns the caster's `STA` directly!** Can also drain `STA` from willing sacrifices or freshly slain foes within `10 ft` to fuel blood spirits/crimson blades. |
| **3. Shadow** | `1/2 DEX` or `INT` | **Essence (`ESS`)** | *Shades & Possession:* Shadow-stepping (teleporting up to `30 ft` between dim spaces), conjuring `Tier N` Shade tokens onto the map, blinding foes, or pinning targets via shadow-possession. |
| **4. Demonology** | `1/2 HISTORY & RELIGION` | **Essence (`ESS`)** | *Demon Binding:* Summons bound `Tier N` Demon tokens onto the VTT or channels abyssal fire/chains. **Backlash Rule:** On a Fumble (`96–00`), the summoned demon breaks free and turns hostile! |
| **5. Necromancy** | `1/2 HISTORY & RELIGION` | **Essence (`ESS`)** | *Undead Creation & Death-Craft:* Raises slain tokens within `30 ft` on the map as permanent/scene `Tier N` Skeletons or Wights; necrotic `Strike` spells heal the Necromancer for `50%` of damage dealt. |
| **6. Druidic** | `1/2 WIL` | **Essence (`ESS`)** | *Nature Communion:* Direct interaction with flora, roots, stone, wind, weather, and beasts (not formal spellcasting). **Costs HALF `ESS` (rounded up) in natural outdoor terrain.** |
| **7. Spiritual** | `1/2 PRE` or `WIL` | **Essence (`ESS`)** | *Spirit Favor:* Divine power bestowed by the favor of spirits (arguably not magic). Radiant smites, spirit-forged shields, restoration, and banishing Undead/Demons (`+1d10` bonus damage vs. Undead, Shades, and Demons). |
| **8. Ki** | `1/2 DEX` or `STR` | **Essence (`ESS`)** | *Martial Arts, Ninja/Shinobi & Order of the Stormlord:* Foundational life-force channeled into special unarmed strikes, pressure-point paralysis, whirlwind weapon techniques, smoke/shadow clones, `20 ft+` wall-running/leaps, missile deflection, and lightning-infused blows. Max `ESS` can scale off `WIL` or `STA`. |
| **9. Warg** | `1/2 WIL` | **`STA` / Innate** | **Restricted to Sylvan/Wilder Elves, Weirgoths, Wendhya & select Whisperlings.** Bonded to **one specific creature species** at character creation. Can communicate with that species, call nearby packmates (within `1 mile`), or **Wild Shape** into a `Tier N` version of that creature (swapping VTT token and physical attack array). |
| **10. Witchcraft** | `1/2 HISTORY & RELIGION` or `WIL` | **Essence / Ritual** | *Eldritch, Moon & Blood Witches:* Flexible mix of curses, hexes, charms, and folk rituals. Can cast out-of-combat **Rituals** for `0 ESS` by spending 10 minutes and herbal/fetish components. |

---

## 14. VTT In-App Creation, Spotlight Combat & World Marker Rules (GIVEN / WHEN / THEN)

* **GIVEN** a combat encounter begins on the Tactical VTT,
* **WHEN** Side-Based Initiative is rolled,
* **THEN** the winning side acts first, and during the Players' phase **the GM cycles the Spotlight** through the players in whatever order makes tactical/narrative sense, with each character taking **any 2 Actions** on their turn (and Martial characters at **Skill Lvl 4** or **Lvl 6** in *Melee Weapons*, *Ranged Weapons*, or *Striker & Grappler* receiving **2 or 3 attacks per Attack action** respectively, per Section 7C & Section 8).
* **GIVEN** the GM opens the **In-App NPC/Adversary Spawner Popup Form** on the Tactical VTT and submits a request (e.g., `3x Tier 2 Frost Urkai Blood-Warriors`),
* **WHEN** the VTT's internal spawner processes the form submission,
* **THEN** the VTT application MUST:
  1. Read the active Setting Cartridge (`/cartridges/<active_id>/`), apply the selected Lineage's stat adjustments to the `50` ability score baseline, and scale stats to the chosen Threat Tier (Section 12).
  2. Express all speeds, ranges, and sizes in **English units (`ft`, `lbs`)**, and pre-calculate d100 hit percentages and Universal Magnitude Table / Weapon `Nd10` damage strings.
  3. Call the integrated **free art generator endpoint** (as implemented in `jayrfink/star-frontiers-vtt`) to automatically create the creature's circular token graphic and spawn the numbered `TokenInstance` objects (`#1..#N`) directly onto the Tactical VTT canvas beneath the semi-transparent GM Fog of War layer.
* **GIVEN** a Player opens the **Custom Equipment & Magic Item Forge Applet** via their movable Character Sheet to craft or repair an item using **Tradecraft**,
* **WHEN** the player submits the item or repair action,
* **THEN** the VTT MUST verify that the write-in Tradecraft does not conflict with core skill domains (Section 8.10), cap the maximum craftable tier to the character's Tradecraft Skill Level (Section 11B), roll `d100` against their Tradecraft Target `%`, and inject the resulting `ItemTemplate` (using `Nd10` and `%` modifiers only) into their inventory.
* **GIVEN** a Player spends XP on their movable Character Sheet using the **Universal PSA-Scaled XP Point-Buy System** (Section 6C),
* **WHEN** a Skill/Magic Tradition or Attribute is increased,
* **THEN** the VTT MUST deduct the PSA-scaled XP cost (`3 * Next Level` XP for skills/magic), automatically recalculate `hp_max` (`STA`), `ess_max` (`ESS`), carry capacity (`STR * 2 lbs`), Initiative Modifier (`IM = ceil(RS / 10)`), and dynamically update the displayed **Character Tier** badge on the character sheet.
* **GIVEN** a Player opens their **movable PC Character Sheet**, writes a custom spell or martial technique into their **Grimoire**, and clicks **[Cast / Channel]**,
* **WHEN** the VTT processes the action,
* **THEN** the VTT MUST deduct `Cast Tier * 2` from `ess_current` (or `hp_current` for Blood Magic), roll `d100` under the character's Tradition Target `%`, and output the corresponding `Nd10` roll from the Universal Magnitude Table.
* **GIVEN** the GM switches to **WorldVTT** (transformed from the Space VTT with **Ship Sheets removed**) and places a marker (e.g., a `battle` marker at hex `14, -6` for the *Siege of Ironhold Pass* or a `party` token at `12, -5`),
* **WHEN** the WorldVTT state updates,
* **THEN** the VTT MUST render lightweight `WorldMarker` pins on the hex map (measured in **miles per hex**) without ship/combat stat blocks, optionally linking POI or battle markers directly to a Tactical VTT scene.
