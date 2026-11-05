---
name: stock-encounter
description: Stocks tactical VTT maps with rulebook-accurate Wayworlds Sentient NPCs or Creatures using procedural Threat Tier scaling, circular token art generation, and collision-avoidant canvas placement.
---

# Stock Encounter Skill

This skill allows Game Masters to populate the active tactical battle map directly from conversational natural language prompts or structured CLI options during prep or live sessions.

## Architecture & Pipeline

When stocking an encounter, follow the 4-step pipeline:

```
[Prompt: "Create 3 Tier 2 Frost Urkai Raiders..."]
       │
       ▼
 1. Parse Threat Tier, Category, Weapon/Armor/Attacks
       │
       ▼
 2. Math Engine: Pre-calculate Hit %, STA, IM, Defenses
       │
       ▼
 3. Token Image Pipeline: Generate 256x256 circular ringed PNG
       │
       ▼
 4. Spawner: Insert into active map with spiral collision avoidance
```

---

## Usage

### 1. Programmatic CLI Invocation

You can stock encounters directly using the workspace script `scripts/stock-encounter.js`:

```bash
# Sentient NPC Example
node scripts/stock-encounter.js \
  --name "Frost Urkai Raider" \
  --tier 2 \
  --category npc \
  --species "Frost Urkai" \
  --weapon "Battleaxe" \
  --armor "Chainmail" \
  --count 3

# Creature / Monster Example
node scripts/stock-encounter.js \
  --name "Dire Wolf Alpha" \
  --tier 3 \
  --category creature \
  --attacks "Bite, Claws" \
  --traits "Pack Tactics, Knockdown" \
  --diet Carnivore \
  --size Large \
  --count 2
```

### 2. Available CLI Arguments

| Flag | Description | Default |
|------|-------------|---------|
| `--name <string>` | Name of the adversary or creature | `"Raider"` / `"Creature"` |
| `--tier <1-5>` | Threat Tier benchmark (1 to 5) | `2` |
| `--category <npc\|creature>` | Whether to use NPC skill math or creature attack matrices | `'npc'` |
| `--count <number>` | Number of tokens to spawn | `1` |
| `--species <string>` | NPC lineage (Frost Urkai, Orcish, Dawn Elves, Weirgoth Dwarves, Human, etc.) | `'Frost Urkai'` |
| `--weapon <string>` | NPC primary weapon (Broadsword, Battleaxe, Longbow, Greatsword, etc.) | Tier default |
| `--armor <string>` | NPC armor or shield defense (Leather Armor, Chainmail, Full Plate, etc.) | Tier default |
| `--attacks <string>` | Comma-separated list of creature natural attacks (Bite, Claws, Gore) | `'Bite, Claws'` |
| `--traits <string>` | Comma-separated special traits or predatory skills | Pre-set |
| `--diet <string>` | Carnivore, Omnivore, Herbivore, Scavenger | `'Carnivore'` |
| `--size <string>` | Small, Medium, Large, Very Large | Tier default |
| `--map-id <id>` | Target map ID (defaults to active RPG map) | Active RPG map |
| `--json <string>` | Raw JSON string of an AdversaryTemplate object | None |

---

## Threat Tier Scaling Benchmark (Quick Reference)

### Path A: Sentient NPCs
- **Tier 1 (Green):** Stats 35–45, Skill Rank 1 (+10%), STA 30–40, Leather Armor (3 DR), Basic Weapons.
- **Tier 2 (Regular / Blue):** Stats 45–55, Skill Rank 2 (+20%), STA 45–55, Chainmail (7 DR), Martial Weapons.
- **Tier 3 (Veteran / Purple):** Stats 55–65, Skill Rank 3 (+30%), STA 60–75, Half-Plate & Shield (11 DR), Heavy/Masterwork Weapons.
- **Tier 4 (Elite / Gold):** Stats 65–75, Skill Rank 4 (+40%), STA 80–100, Full Plate + Magical Ward.
- **Tier 5 (Boss / Crimson):** Stats 75–85+, Skill Rank 5 (+50%), STA 100–130+, Runeforged Plate & Wards.

### Path B: Alien Creatures & Beasts
- **Tier 1:** Attack 35–45%, STA 15–35, 1 attack (1d10 or 1d6).
- **Tier 2:** Attack 50–60%, STA 40–75, 1–2 attacks (2d10).
- **Tier 3:** Attack 65–75%, STA 80–130, 2–3 attacks (3d10) + 1 Special Trait.
- **Tier 4:** Attack 75–85%, STA 140–220, multi-attack (4d10) + damage reduction/armor.
- **Tier 5:** Attack 85–95%, STA 250+, multi-attack / apex traits / area attacks (5d10 to 6d10+).

---

## Token Border Ring Colors by Threat Tier

- **Tier 1:** `#2ecc71` (Emerald Green)
- **Tier 2:** `#3498db` (Cobalt Blue)
- **Tier 3:** `#9b59b6` (Amethyst Purple)
- **Tier 4:** `#f1c40f` (Imperial Gold)
- **Tier 5:** `#e74c3c` (Crimson Red)

All token assets are output to `/uploads/tokens/<template_id>.png` as standard 256x256 circular PNGs with transparency.

---

## 3. Natural Language Description & AI Art Generation Workflow

When the GM provides a descriptive prompt detailing the adversary's appearance, species, weapons, or armor:
1. **Prompt Synthesis**: The assistant formulates a detailed square character/creature prompt emphasizing species traits, weaponry, armor, dramatic lighting, and a centered composition for circular battle tokens.
2. **AI Art Generation**: Launch the `image-generator` subagent to generate a high-contrast square illustration.
3. **Circular Mask & Threat Tier Ring**: Run `generateTokenRingImage({ sourceImagePath, threatTier, outputPath })` to composite the portrait inside the color-coded border ring.
4. **Scene Instantiation**: Register the adversary blueprint and spawn tokens onto the active map using `scripts/stock-encounter.js` or `spawnAdversaries()`.
5. **In-App VTT UI**: GMs can also open the **"⚔️ Stock Adversary"** modal in the VTT to configure adversaries, specify visual descriptions and armament details, and select or upload custom token art.
