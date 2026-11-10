# AGY Implementation Spec: GM-Only Narrative Oracle & Arc Engine (Wayworlds VTT)

## 1. Execution Directive for `agy`
You are tasked with full-stack implementation of the **GM-Only Narrative Oracle Engine** inside `wayworlds-vtt`. You must autonomously create all SQLite schema migrations, comprehensive `UlvWylde` seed data, Express API endpoints, Vue.js GM components, and Vitest test suites. Do not leave placeholder stubs; generate production-ready code and rich initial narrative tables.

## 2. Core Architecture & GM-Only Access Control
* **Strict GM Visibility:** The Oracle Engine UI and API routes are strictly restricted to the active GM (`role === 'gm'` or VTT host state). Player clients must never render the `<GmOraclePanel />` component or receive Oracle socket broadcasts unless the GM explicitly clicks a `[Send to Public Chat]` action on a specific log entry.
* **Targeted Narrative Steering:** The engine steers procedural generation using three mechanisms:
  1. **Environment:** Broad regional setting (e.g., `UlvWylde - Rime Wastes`, `UlvWylde - Deepwood`).
  2. **Narrative Arc (Module):** Specific preloaded or GM-written storylines within an environment (e.g., `The Blood-Rime Conspiracy`, `Sanctum of the Warg-King`). When an Arc is active, the engine prioritizes fragments tied to that `arc_id` while falling back to general `environment_id` fragments for sensory details.
  3. **Forced Directive Hook:** An optional text/tag input in the GM deck that forces the next generated template to inject the GM's specified subject, NPC, or threat.

## 3. SQLite Database Schema Migrations
Create a migration script to add four tables to the existing SQLite database:

### `oracle_environments`
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `name` (TEXT NOT NULL UNIQUE)
* `description` (TEXT)

### `oracle_arcs`
Stores specific narrative storylines/modules that tell the engine which plots to use.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `environment_id` (INTEGER NOT NULL, FOREIGN KEY -> `oracle_environments.id` ON DELETE CASCADE)
* `title` (TEXT NOT NULL)
* `synopsis` (TEXT)
* `is_custom` (INTEGER DEFAULT 0) — `0` for preloaded seeds, `1` for GM-authored narratives.

### `oracle_fragments`
Stores Context-Free Grammar (CFG) templates and slot fragments.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `environment_id` (INTEGER NOT NULL, FOREIGN KEY -> `oracle_environments.id` ON DELETE CASCADE)
* `arc_id` (INTEGER NULL, FOREIGN KEY -> `oracle_arcs.id` ON DELETE CASCADE) — `NULL` means general environment fragment; populated means specific to that Narrative Arc.
* `category` (TEXT NOT NULL) — Valid values: `scene_template`, `location`, `npc`, `threat`, `action_trigger`, `sensory_detail`, `twist`, `tradition_hook`
* `resolution_weight` (TEXT DEFAULT 'any') — Valid values: `any`, `success`, `failure`, `bypass`
* `text_value` (TEXT NOT NULL) — Supports token tags (`#location#`, `#threat#`, `#npc#`, `#action_trigger#`, `#sensory_detail#`, `#tradition_hook#`).

### `oracle_session_logs`
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `environment_id` (INTEGER)
* `arc_id` (INTEGER NULL)
* `source` (TEXT NOT NULL) — Valid values: `engine`, `twist`, `gm_manual`
* `context_type` (TEXT) — Valid values: `explore`, `combat`, `social`, `lore`, `custom`
* `text_content` (TEXT NOT NULL)
* `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

## 4. Autonomous Seed Requirement (`server/db/seeds/oracle_ulvwylde_seed.js`)
`agy` must write and execute a complete seed file containing:
1. **3 Default Environments:** `UlvWylde: The Rime Wastes`, `UlvWylde: The Ice Mire`, `UlvWylde: Ironhold Citadels`.
2. **6 Preloaded Narrative Arcs (2 per Environment):** Complete with plot synopses (e.g., *The Necromancer's Essence Tithe*, *Urkai Warband on the Border*, *The Shadow Pact*).
3. **Minimum 120 `oracle_fragments`:** Richly detailed fantasy entries incorporating `wayworlds-vtt` lore:
   * Species: Norn, Urkai, Giants, Whisperlings, Mixlanders.
   * Magic/Spiritual Traditions: Arcane, Blood, Shadow, Demonology, Druidic, Necromancy, Spiritual, Ki, Warg, Witchcraft.
   * Prompts ending with mechanical VTT handoffs (e.g., *"Resolve d100 Stealth & Secrecy or initiate spotlight combat on the VTT."*).
   * Use monsters that go with the flavor (gothic horror, World of Ice and Fire, Tolkien-like) 
   * Solo GMplayer can choose the correct tier for immediate creation. EX; the narrative engine says "2 skeleton warriors attack" and the character is tier3, the GM player will make the adversaries tier3
   * Build in socials that make sense
   * Limit magic items more than most fantasy campaigns

## 5. Backend Service & Express Endpoints

### `server/services/oracleService.js`
* **Arc-Aware Template Parser:** When `generatePrompt({ environmentId, arcId, contextType, resolutionOutcome, directiveText })` is called:
  1. Select a `scene_template` matching `contextType` and `resolutionOutcome`.
  2. For each `#token#` in the template, query `oracle_fragments` where `arc_id = arcId` first. If no arc-specific fragment exists for that category, fall back to `environment_id = environmentId AND arc_id IS NULL`.
  3. If `directiveText` is provided by the GM (e.g., `"Giant ambush"`), override the primary `#threat#` or `#action_trigger#` token with `directiveText`.
  4. Increment an internal twist counter; every 5th generation, append or substitute a `twist` fragment from the active `arc_id`.

### `server/routes/oracleRoutes.js` (Protected by GM-Check Middleware)
* `GET /api/oracle/init` — Returns all environments, their associated `oracle_arcs`, and recent `oracle_session_logs`.
* `POST /api/oracle/generate` — Accepts `{ environmentId, arcId, contextType, resolutionOutcome, directiveText }`. Generates prompt, saves to `oracle_session_logs`, returns log entry.
* `POST /api/oracle/log` — Accepts `{ environmentId, arcId, textContent }`. Saves custom GM narrative entry (`source: 'gm_manual'`).
* `POST /api/oracle/arcs` — Accepts `{ environmentId, title, synopsis, fragments: [{ category, text_value }] }`. Allows the GM to write and save custom Narrative Arcs and custom plot beats directly from the UI.
* `DELETE /api/oracle/logs` — Clears the GM session log.

## 6. Vue.js Frontend (`client/src/components/oracle/`)
Render `<GmOracleDrawer />` exclusively when the user is in GM mode, styled to match the permanent dark UI (`#0d0f12`), Modesto headers, and Maroon (`#853146` / `#1f090f`) & Teal (`#38b2ac`) color packages.

1. **Top Narrative Selector Bar:**
   * **Environment Dropdown:** Selects the regional setting.
   * **Active Narrative Arc Dropdown:** Filters generation to a specific preloaded or custom storyline (includes an `[All / Sandbox]` option).
   * **`[+ New Arc / Write Narrative]` Button:** Opens `ArcAuthorModal.vue` where the GM can create a new storyline or bulk-paste custom locations, NPCs, and plot beats into the active Arc.
2. **GM Narrative Feed (`OracleFeed.vue`):**
   * Chronological scroll view.
   * Color coding: Teal (`#4fd1c5`) for `engine` prompts, Muted Gray (`#a0aec0`) for `gm_manual` logs, Maroon border/fill (`#853146` / `#1f090f`) for `twist` alerts.
3. **GM Control Deck (`OracleControls.vue`):**
   * **Directive Input:** Single-line input (`placeholder="Force next hook (e.g., Blood magic trap, Urkai scout)..."`) to steer the immediate next generation.
   * **Context Triggers:** `[Explore]`, `[Combat Beat]`, `[Social / NPC]`, `[Tradition / Lore]`.
   * **VTT Outcome Toggles:** `[Any]`, `[After Success]`, `[After Failure]`, `[After Bypass]` to tell the engine how the last VTT mechanical check went.
   * **Manual Narrative Textarea:** Multi-line box for the GM to write custom story beats directly into the log (`POST /api/oracle/log`).

## 7. Automated Testing (`Vitest`)
`agy` must create and pass all tests before completing the task:
* `tests/server/oracle.test.js`: Test seed execution, arc-prioritized fragment resolution, `directiveText` token override, twist counter triggering, and GM-only route protection.
* `tests/client/GmOracleDrawer.spec.js`: Verify component does not render for non-GM users, verify Arc dropdown filtering, and test manual narrative submission.
