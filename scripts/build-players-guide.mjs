#!/usr/bin/env node
/**
 * Wayworlds Player's Guide PDF builder.
 *
 * Compiles the in-app Guides (client/src/constants/*, data/spell_examples.json and the
 * UlvWylde cartridge lore) into a print-ready PDF styled with the app's color package.
 * Rendering uses the locally installed Google Chrome in headless mode, so no extra npm
 * dependencies are required.
 *
 * Usage:
 *   node scripts/build-players-guide.mjs [--theme silver] [--out docs/Wayworlds-Players-Guide.pdf] [--keep-html]
 *
 * Environment:
 *   CHROME_PATH   Override the Chrome/Chromium executable location.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const opts = { theme: 'silver', out: path.join(ROOT, 'docs', 'Wayworlds-Players-Guide.pdf'), keepHtml: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--theme') opts.theme = argv[++i];
    else if (a === '--out') opts.out = path.resolve(argv[++i]);
    else if (a === '--keep-html') opts.keepHtml = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/build-players-guide.mjs [--theme <color-package>] [--out <file.pdf>] [--keep-html]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
async function loadData() {
  const ref = await import(pathToFileURL(path.join(ROOT, 'client/src/constants/combatReference.js')).href);
  const rules = await import(pathToFileURL(path.join(ROOT, 'client/src/constants/characterRules.js')).href);

  const spellsPath = path.join(ROOT, 'data', 'spell_examples.json');
  if (!fs.existsSync(spellsPath)) throw new Error(`Missing spell examples file: ${spellsPath}`);
  const spells = JSON.parse(fs.readFileSync(spellsPath, 'utf8'));

  const itemsPath = path.join(ROOT, 'data', 'inventory_items.json');
  if (!fs.existsSync(itemsPath)) throw new Error(`Missing inventory items file: ${itemsPath}`);
  const inventoryItems = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));

  const vehiclesPath = path.join(ROOT, 'data', 'vehicles.json');
  const vehicles = fs.existsSync(vehiclesPath) ? JSON.parse(fs.readFileSync(vehiclesPath, 'utf8')) : [];

  const cartridgeDir = path.join(ROOT, 'cartridges', 'ulvwylde');
  const lore = fs.readFileSync(path.join(cartridgeDir, 'lore.md'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(cartridgeDir, 'manifest.json'), 'utf8'));

  return { ref, rules, spells, inventoryItems, vehicles, lore, manifest };
}

/**
 * Prepares optimized JPEG copies of the app screenshots in workDir so the generated PDF
 * stays compact while keeping screenshots crisp at print resolution.
 */
function prepareScreenshots(workDir) {
  const srcDir = path.join(ROOT, 'docs', 'screenshots');
  const files = {
    characterSheet: 'character_sheet.png',
    rpgVtt: 'rpg_vtt.png',
    worldVtt: 'world_vtt.png',
    guides: 'rulebooks.png',
  };
  const urls = {};
  const hasSips = fs.existsSync('/usr/bin/sips');
  for (const [key, filename] of Object.entries(files)) {
    const srcPath = path.join(srcDir, filename);
    if (!fs.existsSync(srcPath)) continue;
    if (hasSips) {
      const outPath = path.join(workDir, filename.replace(/\.png$/i, '.jpg'));
      try {
        execFileSync('/usr/bin/sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '84', '-Z', '1650', srcPath, '--out', outPath], {
          stdio: 'ignore',
        });
        if (fs.existsSync(outPath)) {
          urls[key] = pathToFileURL(outPath).href;
          continue;
        }
      } catch {
        // Fall back to original PNG URL if sips fails
      }
    }
    urls[key] = pathToFileURL(srcPath).href;
  }
  return urls;
}

/** Pulls the "World Overview" prose out of the cartridge lore markdown. */
function extractWorldOverview(lore) {
  const m = lore.match(/## World Overview\s+([\s\S]*?)\n---/);
  if (!m) throw new Error('Could not find "## World Overview" in lore.md');
  return m[1].trim();
}

// ---------------------------------------------------------------------------
// Theme (read from client/src/main.css so the PDF tracks the app's color packages)
// ---------------------------------------------------------------------------
function loadTheme(themeKey) {
  const css = fs.readFileSync(path.join(ROOT, 'client/src/main.css'), 'utf8');
  const tm = fs.readFileSync(path.join(ROOT, 'client/src/utils/themeManager.js'), 'utf8');

  const aliasBlock = tm.match(/THEME_KEY_ALIASES\s*=\s*\{([\s\S]*?)\}/);
  const aliases = {};
  if (aliasBlock) {
    for (const m of aliasBlock[1].matchAll(/['"]?([\w-]+)['"]?\s*:\s*'([\w-]+)'/g)) aliases[m[1]] = m[2];
  }
  const key = aliases[themeKey] || themeKey;

  const vars = {};
  const rootVars = {};
  for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = block[1];
    const body = block[2];
    const isRoot = /(^|,)\s*:root\s*(,|$)/.test(selector.trim());
    const matchesTheme = selector.includes(`[data-color-pkg="${key}"]`);
    if (!isRoot && !matchesTheme) continue;
    for (const decl of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      (matchesTheme ? vars : rootVars)[decl[1]] = decl[2].trim();
    }
  }
  if (!Object.keys(vars).length) {
    throw new Error(`Unknown color package "${themeKey}". See client/src/main.css for [data-color-pkg] names.`);
  }
  return { key, vars: { ...rootVars, ...vars } };
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------
const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function table(headers, rows, { cls = '', widths = [] } = {}) {
  const colgroup = widths.length ? `<colgroup>${widths.map((w) => `<col style="width:${w}">`).join('')}</colgroup>` : '';
  return `<table class="ref-table ${cls}">${colgroup}<thead><tr>${headers
    .map((h) => `<th>${h}</th>`)
    .join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

const sectionHead = (badge, title) =>
  `<div class="section-head"><span class="title-badge">${esc(badge)}</span><h2>${esc(title)}</h2></div>`;

const banner = (icon, subtitle, code, desc = '') =>
  `<div class="formula-banner"><div class="formula-icon">${icon}</div><div class="formula-details">` +
  `<span class="formula-subtitle">${esc(subtitle)}</span>` +
  (code ? `<div class="formula-code">${esc(code)}</div>` : '') +
  (desc ? `<p class="formula-desc">${esc(desc)}</p>` : '') +
  `</div></div>`;

const callout = (icon, html) => `<div class="note"><span class="note-icon">${icon}</span><div class="note-text">${html}</div></div>`;

const bullets = (items) => `<ul class="bullets">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

// ---------------------------------------------------------------------------
// Chapter builders
// ---------------------------------------------------------------------------
function buildChapters({ ref, rules, spells, inventoryItems, vehicles, lore, manifest, screenshots = {} }) {
  const { ATTRIBUTES_RULES_REF: ATTR, PSA_RULES_REF: PSA, ARCHETYPES_RULES_REF: ARCH, PLAYABLE_SPECIES_REF: SPECIES, MELEE_COMBAT_REF: MELEE, RANGED_COMBAT_REF: RANGED, ADDITIONAL_RULES_REF: ADDL } = ref;
  const { MAGIC_TRADITIONS, UNIVERSAL_MAGNITUDE_TABLE, ALLOWED_TRADECRAFT_DOMAINS } = rules;

  const chapters = [];
  let n = 0;
  const add = (part, title, intro, body, opts = {}) => {
    const appendix = Boolean(opts.appendix);
    const num = appendix ? opts.label : String(++n);
    chapters.push({ id: `ch-${slug(title)}`, part, title, num, intro, body, appendix });
  };

  const fuelLabel = (f) => (String(f).toLowerCase() === 'sta' ? 'STA' : 'ESS');

  // ---- 1. How the game works ------------------------------------------------
  add(
    'Welcome',
    'How the Game Works',
    'Wayworlds is a percentile (d100) role-playing game. Everything you attempt comes down to a single question: can you roll equal to or under your Target %?',
    [
      sectionHead('The Core Roll', 'Roll d100, Beat Your Target %'),
      banner('🎲', `${ATTR.overview.title} (Baseline: ${ATTR.overview.baseline})`, ATTR.overview.formula, ATTR.overview.description),
      callout(
        '💡',
        '<strong>Reading the dice:</strong> a d100 roll uses two ten-sided dice, one for the tens and one for the ones. A roll equal to or under your <strong>Target %</strong> succeeds. On attack rolls, <strong>doubles</strong> (11, 22, 33 …) at or under your target score a <strong>Critical Hit</strong>; doubles over your target, or a roll of <strong>99–00</strong>, are a <strong>Fumble</strong>.'
      ),
      sectionHead('Your Dice', 'What You Will Roll'),
      table(
        ['Dice', 'Used For'],
        [
          ['<span class="dice">d100</span>', 'Skill checks, attacks and casting. Success when the roll is equal to or under your Target %.'],
          ['<span class="dice">1d10 + IM</span>', 'Initiative at the start of a combat. IM is your Initiative Modifier, taken from Reflex Speed.'],
          ['<span class="dice">Nd10</span>', 'Damage and spell magnitude. Weapons and spells list how many d10 to roll, for example a Longsword at 2d10.'],
          ['<span class="dice">1d10/2</span>', 'The smallest damage and effect dice: roll a d10 and halve it. Used by Tier 0 spells and unarmed strikes.'],
        ],
        { widths: ['22%', '78%'] }
      ),
      sectionHead('Your Pools', 'Stamina & Essence'),
      table(
        ['Pool', 'Maximum', 'What It Does'],
        ATTR.resourcePools.map((p) => [`<strong>${esc(p.name)}</strong>`, `<span class="mono">${esc(p.metric)}</span>`, esc(p.description)]),
        { widths: ['18%', '26%', '56%'] }
      ),
      sectionHead('A Round of Play', 'Taking Your Turn'),
      table(
        ['Step', 'What Happens'],
        MELEE.sequenceOfPlay.map((s) => [`<span class="step">${s.step}</span>`, `<strong>${esc(s.name)}.</strong> ${esc(s.description)}`]),
        { widths: ['9%', '91%'] }
      ),
      sectionHead('Glossary', 'Terms You Will See Often'),
      table(
        ['Term', 'Meaning'],
        [
          ['<strong>STA</strong>', 'Stamina: your health pool. Also fuel for Blood and Warg powers.'],
          ['<strong>ESS</strong>', 'Essence: the energy pool that fuels spells and Ki techniques.'],
          ['<strong>PSA</strong>', 'Primary System Area: Martial, Mystic or Theurgy. Skills in your PSA cost half as much XP to advance.'],
          ['<strong>IM</strong>', 'Initiative Modifier, added to your 1d10 initiative roll.'],
          ['<strong>Target %</strong>', 'Your chance of success on a d100 check, from the formula above.'],
          ['<strong>Cast Tier</strong>', 'The power level of a spell or technique, from Tier 0 (cantrips) up to Tier 6.'],
          ['<strong>Archetype</strong>', 'A ready-made starting package of three skills.'],
        ],
        { widths: ['20%', '80%'] }
      ),
    ].join('')
  );

  // ---- 2. The world -----------------------------------------------------------
  const overview = extractWorldOverview(lore).replace(
    /through ten supernatural traditions/,
    'through the supernatural traditions of the realm'
  );
  const overviewHtml = overview
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`)
    .join('');
  add(
    'Welcome',
    'The World of UlvWylde',
    manifest.title,
    [
      sectionHead('Setting', 'A Mythic Dark-Fantasy Realm'),
      `<div class="prose lead">${overviewHtml}</div>`,
      sectionHead('Lineage Families', 'The Peoples of the Realm'),
      table(
        ['Family', 'Overview', 'Lineages'],
        SPECIES.map((g) => [
          `<strong>${g.icon} ${esc(g.group.replace(/\s*\(.*\)$/, ''))}</strong>`,
          esc(g.description),
          esc(g.species.map((s) => s.name).join(', ')),
        ]),
        { widths: ['24%', '40%', '36%'] }
      ),
      sectionHead('Scale', 'Distances on the Map'),
      bullets([
        `Regional maps: each hex is ${manifest.hex_scales.regional_hex_miles} miles across.`,
        `World map: each hex is ${manifest.hex_scales.world_hex_miles} miles across.`,
      ]),
    ].join('')
  );

  // ---- 3. Species -------------------------------------------------------------
  add(
    'Part I · Creating Your Character',
    'Choose Your Species',
    'Your species (lineage) adjusts your starting attributes from the 50 baseline and may grant movement or special traits.',
    [
      ...SPECIES.map(
        (g) =>
          `<div class="group-block">` +
          `<div class="group-head"><span class="group-icon">${g.icon}</span><div><h3>${esc(g.group)}</h3><p>${esc(g.description)}</p></div></div>` +
          table(
            ['Species', 'Modifiers & Traits', 'Description'],
            g.species.map((s) => [`<strong>${esc(s.name)}</strong>`, `<span class="mono accent">${esc(s.traits)}</span>`, esc(s.description)]),
            { widths: ['22%', '31%', '47%'] }
          ) +
          `</div>`
      ),
      callout('🧭', `<strong>Altered Species Origin Rule.</strong> ${esc(ARCH.alteredSpeciesNote)}`),
    ].join('')
  );

  // ---- 4. Attributes ----------------------------------------------------------
  add(
    'Part I · Creating Your Character',
    'Primary Attributes',
    'Eight attributes in four pairs drive every skill chance, physical threshold and resource pool. Each starts at 50 before your species is applied.',
    [
      banner('✨', `${ATTR.overview.title} (Baseline: ${ATTR.overview.baseline})`, ATTR.overview.formula),
      sectionHead('Quick Reference', 'Attributes at a Glance'),
      table(
        ['Attr.', 'Name', 'Pair', 'Role', 'Key Formula'],
        ATTR.summaryTable.map((r) => [
          `<strong class="accent">${esc(r.acronym)}</strong>`,
          esc(r.name),
          esc(r.pair),
          esc(r.baseRole),
          `<span class="mono">${esc(r.formulaRole)}</span>`,
        ]),
        { widths: ['11%', '17%', '11%', '31%', '30%'] }
      ),
      sectionHead('The Four Pairs', 'What Each Attribute Governs'),
      ...ATTR.pairs.map(
        (p) =>
          `<div class="pair-card"><div class="pair-head"><span class="pair-acr">${esc(p.acronym)}</span><div><h3>${esc(p.pairName)}: ${esc(p.title)}</h3><p>${esc(p.primaryRole)}</p></div></div>` +
          `<div class="pair-cols">${p.stats
            .map(
              (s) =>
                `<div class="stat-block"><h4>${esc(s.name)} <span class="accent">(${esc(s.acronym)})</span></h4><p class="stat-desc">${esc(s.description)}</p>` +
                `<div class="mini-label">Governs</div>${bullets(s.governs)}` +
                `<div class="mini-label">Key skills</div><p class="stat-skills">${esc(s.keySkills)}</p></div>`
            )
            .join('')}</div></div>`
      ),
      sectionHead('Vital Pools', 'Stamina & Essence'),
      table(
        ['Pool', 'Maximum', 'Description'],
        ATTR.resourcePools.map((p) => [`<strong>${esc(p.name)}</strong>`, `<span class="mono">${esc(p.metric)}</span>`, esc(p.description)]),
        { widths: ['18%', '26%', '56%'] }
      ),
    ].join('')
  );

  // ---- 5. PSA & skills --------------------------------------------------------
  add(
    'Part I · Creating Your Character',
    'Primary System Areas & Skills',
    'Choose one Primary System Area (Martial, Mystic or Theurgy). Skills in your PSA advance at half the XP cost of skills outside it.',
    [
      banner('🛡️', PSA.overview.title, PSA.overview.formula, PSA.overview.description),
      sectionHead('Advancement', 'XP Point-Buy Table (Levels 1–6)'),
      table(
        ['Level', 'Bonus', 'In-PSA Cost', 'Out-of-PSA Cost', 'Total In-PSA', 'Total Out-of-PSA', 'Rank'],
        PSA.xpTable.map((r) => [
          `<strong>${r.level}</strong>`,
          `<span class="mono accent">${esc(r.bonus)}</span>`,
          `${r.inPsaCost} XP`,
          `${r.outPsaCost} XP`,
          `${r.cumInPsa} XP`,
          `${r.cumOutPsa} XP`,
          esc(r.rank),
        ]),
        { widths: ['9%', '10%', '13%', '15%', '14%', '16%', '23%'] }
      ),
      sectionHead('Standing', 'Character Tiers'),
      table(
        ['Tier', 'Title', 'Requirement', 'Typical Adventurers'],
        PSA.characterTiers.map((t) => [`<strong>${esc(t.tier)}</strong>`, esc(t.title), esc(t.req), esc(t.benchmark)]),
        { widths: ['11%', '20%', '28%', '41%'] }
      ),
      ...PSA.areas.map(
        (a) =>
          `<div class="area-block"><div class="area-head"><span class="area-icon">${a.icon}</span><div><h3>${esc(a.name)}</h3><div class="area-tag">${esc(a.tagline)}</div></div></div>` +
          `<p class="area-desc">${esc(a.description)}</p>` +
          `<div class="mini-label">Secular skills</div>` +
          table(
            ['Skill', 'Base', 'Key Use'],
            a.secularSkills.map((s) => [
              `<strong>${esc(s.name)}</strong><div class="cell-sub">${esc(s.description)}</div>`,
              `<span class="mono accent">${esc(s.baseChance)}</span>`,
              esc(s.keyUse),
            ]),
            { widths: ['52%', '22%', '26%'] }
          ) +
          `<div class="mini-label">Traditions</div>` +
          table(
            ['Tradition', 'Base / Fuel', 'Key Use'],
            a.traditions.map((s) => [
              `<strong>${esc(s.name)}</strong><div class="cell-sub">${esc(s.description)}</div>`,
              `<span class="mono accent">${esc(s.baseChance)}</span><div class="cell-sub">Fuel: ${esc(s.fuel)}</div>`,
              esc(s.keyUse),
            ]),
            { widths: ['52%', '22%', '26%'] }
          ) +
          `</div>`
      ),
    ].join('')
  );

  // ---- 6. Archetypes ----------------------------------------------------------
  const archCard = (a, extra = '') =>
    `<div class="arch-card"><div class="arch-head"><span class="arch-icon">${a.icon}</span><div><h4>${extra}${esc(a.name || a.archetype)}</h4><div class="psa-pill">${esc(a.psa)}</div></div></div>` +
    `<p class="arch-tag">${esc(a.tagline)}</p>` +
    `<ol class="arch-skills">${a.skills
      .map(
        (s) =>
          `<li><span class="rank">${s.rank}</span><span class="sk-name">${esc(s.name)}</span><span class="sk-type">${esc(s.type)}</span><span class="${s.inPsa ? 'in-psa' : 'out-psa'}">${s.inPsa ? 'In-PSA' : 'Out-of-PSA'}</span></li>`
      )
      .join('')}</ol></div>`;

  const psaOrder = ['Martial', 'Mystic', 'Theurgy'];
  const byPsa = (list) => psaOrder.map((p) => [p, list.filter((a) => a.psa === p)]).filter(([, l]) => l.length);

  add(
    'Part I · Creating Your Character',
    'Choose Your Archetype (Optional)',
    'Archetypes are optional starting templates that give you three starting skills so you can begin play quickly. Pick one, or freely choose your own skills.',
    [
      callout(
        '📜',
        `<strong>Archetypes Are Optional — Not Mandatory:</strong> ${esc(ARCH.doctrine)} You are never locked into a fixed class—if none of the examples below fit your concept, simply add any starting Secular Skills and Traditions you want on your Character Sheet.`
      ),
      ...byPsa(ARCH.standardArchetypes).map(
        ([psa, list]) => `${sectionHead('Optional Templates', `${psa} Archetypes`)}<div class="arch-grid">${list.map((a) => archCard(a)).join('')}</div>`
      ),
      sectionHead('Altered Species', 'Altered Species Archetype Examples'),
      `<p class="prose">${esc(ARCH.alteredSpeciesNote)}</p>`,
      `<div class="arch-grid">${ARCH.alteredArchetypes.map((a) => archCard(a, `<span class="species-tag">${esc(a.species)}</span> `)).join('')}</div>`,
    ].join('')
  );

  // ---- 7. Magic ---------------------------------------------------------------
  const catLabel = { strike: 'Strike', blast: 'Blast', ward_heal: 'Ward / Heal', hex_summon: 'Hex / Control' };
  const magCell = (m) => `<strong class="dice-hi">${esc(m.dice)}</strong><span class="mag-sum">${esc(m.summary)}</span>`;
  const tradOrder = MAGIC_TRADITIONS.map((t) => t.name);
  const spellGroups = [];
  for (const t of MAGIC_TRADITIONS) {
    const list = spells.filter((s) => s.tradition === t.name);
    if (!list.length) continue;
    const rows = [
      `<tr class="group-row"><td colspan="6">${esc(t.name)} <span class="group-sub">Governing attribute: ${esc(t.baseStatLabel)} · Fuel: ${fuelLabel(t.fuel)}</span></td></tr>`,
      ...list.map(
        (s) =>
          `<tr><td><strong>${esc(s.name)}</strong></td><td>${esc(catLabel[s.category] || s.category)}</td><td class="center">${s.default_tier}</td>` +
          `<td class="center mono">${s.cost} ${fuelLabel(s.fuel)}</td><td>${esc(s.range_area)}</td><td>${esc(s.description)}</td></tr>`
      ),
    ];
    spellGroups.push(`<tbody class="spell-group">${rows.join('')}</tbody>`);
  }
  const orphanSpells = spells.filter((s) => !tradOrder.includes(s.tradition));
  if (orphanSpells.length) {
    const rows = [
      `<tr class="group-row"><td colspan="6">Other</td></tr>`,
      ...orphanSpells.map(
        (s) =>
          `<tr><td><strong>${esc(s.name)}</strong></td><td>${esc(catLabel[s.category] || s.category)}</td><td class="center">${s.default_tier}</td>` +
          `<td class="center mono">${s.cost} ${fuelLabel(s.fuel)}</td><td>${esc(s.range_area)}</td><td>${esc(s.description)}</td></tr>`
      ),
    ];
    spellGroups.push(`<tbody class="spell-group">${rows.join('')}</tbody>`);
  }

  add(
    'Part II · Magic & Martial Techniques',
    'Spells & Martial Techniques',
    `Magic and Ki powers all follow one universal framework. There are ${MAGIC_TRADITIONS.length} traditions; each names the attribute that governs it and the pool that pays for it.`,
    [
      sectionHead('Universal Framework', 'Universal Magnitude Table'),
      callout(
        '🔮',
        '<strong>Universal Casting Cost:</strong> <code>Cast Tier × 2</code> (paid from <strong>ESS</strong> for Magic and Ki traditions, or directly from <strong>STA</strong> for Blood and Warg). Tier 0 powers (cantrips and techniques) cost <strong>0 fuel</strong>.'
      ),
      table(
        ['Tier', 'Cost', 'Strike (Single Target)', 'Blast / Cleave (Area)', 'Ward / Heal', 'Hex / Control'],
        UNIVERSAL_MAGNITUDE_TABLE.map((r) => [
          `<strong class="accent">Tier ${r.tier}</strong>`,
          `<span class="mono">${r.cost} Fuel</span>`,
          magCell(r.strike),
          magCell(r.blast_heal),
          magCell(r.ward_buff),
          magCell(r.hex_summon),
        ]),
        { cls: 'magnitude', widths: ['8%', '9%', '21%', '21%', '21%', '20%'] }
      ),
      sectionHead('Disciplines', `The ${MAGIC_TRADITIONS.length} Magic & Ki Traditions`),
      table(
        ['Tradition', 'Governing Attribute', 'Fuel', 'Focus'],
        MAGIC_TRADITIONS.map((t) => [`<strong>${esc(t.name)}</strong>`, `<span class="mono accent">${esc(t.baseStatLabel)}</span>`, fuelLabel(t.fuel), esc(t.description)]),
        { widths: ['16%', '19%', '8%', '57%'] }
      ),
      callout(
        '💡',
        '<strong>Multi-Magic Fuel Rule:</strong> players with multiple magic skills or traditions may choose the highest governing attribute to fuel their <strong>ESSENCE/MANA</strong> pool (for example, a caster with Necromancy [INT/HIST] and Demonology [WIL/PRE] uses the higher of the two attributes).'
      ),
      sectionHead('Grimoire Examples', 'Example Spells & Martial Techniques'),
      callout(
        '✨',
        '<strong>Spell &amp; Martial Technique Lists Are EXAMPLES Only:</strong> The spells and techniques listed below (and in the website’s <em>Guides</em> tab) are <strong>examples for inspiration</strong>, not a closed spellbook. Players are encouraged to invent and scribe their own custom spells and martial techniques on their Character Sheet using <code>+ Write Spell / Technique</code>, as long as they are reasonable for their chosen Tradition and follow the <strong>Universal Magnitude Table</strong> (<code>Cast Tier × 2</code> fuel cost and <code>Nd10</code> magnitude).'
      ),
      `<table class="ref-table spells"><colgroup><col style="width:15%"><col style="width:10%"><col style="width:6%"><col style="width:10%"><col style="width:16%"><col style="width:43%"></colgroup>` +
        `<thead><tr><th>Name</th><th>Type</th><th>Tier</th><th>Cost</th><th>Range / Area</th><th>Effect</th></tr></thead>${spellGroups.join('')}</table>`,
    ].join('')
  );

  // ---- 8. Turn order ----------------------------------------------------------
  add(
    'Part III · Combat',
    'Turn Order & Actions',
    'Combat is played in rounds. Initiative decides who acts first, then each combatant takes two spotlights of two actions each.',
    [
      sectionHead('Tactical Flow', 'Sequence of Play'),
      table(
        ['Step', 'Phase', 'What Happens'],
        MELEE.sequenceOfPlay.map((s) => [`<span class="step">${s.step}</span>`, `<strong>${esc(s.name)}</strong>`, esc(s.description)]),
        { widths: ['9%', '29%', '62%'] }
      ),
    ].join('')
  );

  // ---- 9. Melee ---------------------------------------------------------------
  add(
    'Part III · Combat',
    'Melee Combat',
    'Close-quarters fighting with weapons or bare hands.',
    [
      banner('⚔️', 'Melee Attack', MELEE.attackBaseFormula),
      sectionHead('Brawling', 'Unarmed Damage by Strength'),
      table(
        ['STR', 'Punch', 'Kick'],
        MELEE.unarmedDamage.map((r) => [`<strong>${esc(r.strBracket)}</strong>`, `<span class="mono">${esc(r.punchDamage)}</span>`, `<span class="mono">${esc(r.kickDamage)}</span>`]),
        { widths: ['24%', '38%', '38%'] }
      ),
      sectionHead('Weapons', 'Melee Weapons'),
      table(
        ['Weapon', 'Damage', 'Weight', 'Special'],
        MELEE.weapons.map((w) => [`<strong>${esc(w.name)}</strong>`, `<span class="mono accent">${esc(w.damage)}</span>`, esc(w.weight), esc(w.special)]),
        { widths: ['26%', '19%', '10%', '45%'] }
      ),
      sectionHead('Tactics', 'Situational Modifiers'),
      table(
        ['Situation', 'Modifier', 'Notes'],
        MELEE.modifiers.map((m) => [`<strong>${esc(m.situation)}</strong>`, `<span class="mono accent">${esc(m.modifier)}</span>`, esc(m.notes)]),
        { widths: ['34%', '22%', '44%'] }
      ),
    ].join('')
  );

  // ---- 10. Ranged -------------------------------------------------------------
  add(
    'Part III · Combat',
    'Ranged Combat & Armor',
    'Bows, crossbows, slings and thrown weapons, plus the armor that protects you.',
    [
      banner('🏹', 'Ranged Attack', RANGED.baseRule),
      sectionHead('Arsenal', 'Ranged Weapons'),
      table(
        ['Weapon', 'Damage', 'Rate of Fire', 'Short / Medium / Long', 'Ammo', 'Notes'],
        RANGED.weapons.map((w) => [
          `<strong>${esc(w.name)}</strong><div class="cell-sub">${esc(w.category)}</div>`,
          `<span class="mono accent">${esc(w.damage)}</span>`,
          esc(w.rof),
          `<span class="mono">${esc(w.shortRange)}<br>${esc(w.medRange)}<br>${esc(w.longRange)}</span>`,
          esc(w.ammo),
          esc(w.notes),
        ]),
        { widths: ['19%', '9%', '11%', '17%', '14%', '30%'] }
      ),
      sectionHead('Targeting', 'Situational Modifiers'),
      table(
        ['Condition', 'Modifier', 'Notes'],
        RANGED.modifiers.map((m) => [`<strong>${esc(m.condition)}</strong>`, `<span class="mono accent">${esc(m.modifier)}</span>`, esc(m.notes)]),
        { widths: ['34%', '16%', '50%'] }
      ),
      sectionHead('Defense', 'Armor'),
      table(
        ['Armor', 'Type', 'Protection', 'Notes'],
        RANGED.armor.map((a) => [`<strong>${esc(a.name)}</strong>`, esc(a.type), `<span class="mono accent">${esc(a.protection)}</span>`, esc(a.notes)]),
        { widths: ['20%', '15%', '22%', '43%'] }
      ),
    ].join('')
  );

  // ---- 11. Equipment Lists & Item Forge -------------------------------------
  const seenItemNames = new Set();
  const uniqueItems = (inventoryItems || []).filter((it) => {
    const key = String(it.name || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/^fullplatearmor$/, 'fullplate');
    if (seenItemNames.has(key)) return false;
    seenItemNames.add(key);
    return true;
  });
  const catalogWeapons = uniqueItems.filter((i) => i.category === 'Weapon');
  const catalogArmor = uniqueItems.filter((i) => i.category === 'Armor' || i.category === 'Shield');
  const catalogKits = uniqueItems.filter((i) => i.category === 'Kit');

  const formatDr = (it) => {
    if (it.category === 'Shield') return `${it.attacker_pct_penalty || -10}% to incoming attack rolls`;
    if (it.armor_dr === 'half_all') return `Halves all damage & ${it.attacker_pct_penalty || -10}% to non-magic attacker roll`;
    if (it.armor_dr === 'half_nonmagical') return 'Halves non-magical damage';
    if (typeof it.armor_dr === 'number') return `-${it.armor_dr} DR vs non-magical attacks`;
    return it.properties || '—';
  };

  add(
    'Part IV · Equipment, Crafting & Travel',
    'Equipment Lists & The Item Forge',
    'Standard weapons, armor, shields, kits, and field gear available in the Character Sheet equipment picker, plus rules for crafting custom gear in the Item Forge.',
    [
      banner(
        '🎒',
        'Carry Capacity & Encumbrance Thresholds',
        'Unencumbered = STR × 1 lb   |   Maximum Carry Capacity = STR × 2 lbs',
        'Your Character Sheet automatically sums the weight of all carried weapons, armor, shields, and kits against your Strength.'
      ),
      sectionHead('Character Sheet Catalog', 'Standard Weapons (+ Add Equipment)'),
      table(
        ['Weapon', 'Damage Dice', 'Weight', 'Properties & Capabilities'],
        catalogWeapons.map((w) => [
          `<strong>${esc(w.name)}</strong>`,
          `<span class="mono accent">${esc(w.damage_dice || '1d10')}</span>`,
          `${w.weight_lbs} lbs`,
          esc(w.properties || w.capabilities || ''),
        ]),
        { widths: ['22%', '24%', '11%', '43%'] }
      ),
      sectionHead('Character Sheet Catalog', 'Standard Armor & Shields (+ Add Equipment)'),
      table(
        ['Armor / Shield', 'Category', 'Weight', 'Protection / Damage Reduction', 'Notes'],
        catalogArmor.map((a) => [
          `<strong>${esc(a.name)}</strong>`,
          esc(a.category),
          `${a.weight_lbs} lbs`,
          `<span class="mono accent">${esc(formatDr(a))}</span>`,
          esc(a.properties || ''),
        ]),
        { widths: ['21%', '11%', '10%', '31%', '27%'] }
      ),
      sectionHead('Kits, Tools & Field Supplies', 'Adventuring Gear & Kits'),
      table(
        ['Item / Kit', 'Category', 'Weight', 'Rules & Field Use'],
        (ADDL.adventuringGear || catalogKits.map((k) => ({ name: k.name, category: 'Kit', weight: `${k.weight_lbs} lbs`, effect: k.properties }))).map((g) => [
          `<strong>${esc(g.name)}</strong>`,
          esc(g.category),
          `<span class="mono">${esc(g.weight)}</span>`,
          esc(g.effect),
        ]),
        { widths: ['28%', '16%', '10%', '46%'] }
      ),
      `<div class="forge-block">` +
        sectionHead('Tradecraft & Crafting', 'Custom Equipment & Magic Item Forge') +
        callout(
          '⚒️',
          '<strong>Crafting Your Own Gear:</strong> On your Character Sheet, click <code>⚒ Item Forge</code> to craft custom weapons, armor, shields, or runeforged magic items. Your maximum Forge Item Tier equals your <strong>Tradecraft Skill Level (1–5)</strong>. Custom weapon damage must use clean <code>Nd10</code> or <code>1d10/2</code> dice (no flat <code>+1</code> or <code>+3</code> damage numbers).'
        ) +
        table(
          ['Forge Item Tier', 'Required Tradecraft', 'Max Attack / Parry Bonus', 'Quality & Examples'],
          [
            ['<strong class="accent">Tier 1–2</strong>', 'Tradecraft Lvl 1–2', '<span class="mono">+5%</span>', 'Fine / Masterwork mundane weapons, fitted armor, and artisan tools.'],
            ['<strong class="accent">Tier 3–4</strong>', 'Tradecraft Lvl 3–4', '<span class="mono">+10%</span>', 'Superior alloys, dwarven steel, and Tradition-imbued enchanted arms.'],
            ['<strong class="accent">Tier 5</strong>', 'Tradecraft Lvl 5', '<span class="mono">+15%</span>', 'Runeforged relics and master-crafted mythril/planar armaments.'],
            ['<strong class="accent">Tier 6 (GM)</strong>', 'Tradecraft Lvl 6 / GM', '<span class="mono">+20%</span>', 'Legendary artifacts and realm-shaping relics.'],
          ],
          { widths: ['16%', '22%', '20%', '42%'] }
        ) +
        `<div class="mini-label">Allowed Tradecraft Specializations</div>` +
        `<p class="prose">${esc((ALLOWED_TRADECRAFT_DOMAINS || []).join('  ·  '))}</p>` +
      `</div>`,
    ].join('')
  );

  // ---- 12. Overland & Conveyances -------------------------------------------
  add(
    'Part IV · Equipment, Crafting & Travel',
    'Mounts, Conveyances & Overland Travel',
    ADDL.description,
    [
      sectionHead('Mounts & Travel', 'Mounts & Overland Movement'),
      table(
        ['Mount / Conveyance', 'Tactical Speed', 'Overland Speed', 'Capacity', 'Rules & Mechanics'],
        ADDL.mountsAndMovement.map((r) => [
          `<strong>${esc(r.subject)}</strong>`,
          `<span class="mono accent">${esc(r.tacticalSpeed)}</span>`,
          `<span class="mono">${esc(r.overlandSpeed)}</span>`,
          esc(r.capacity),
          esc(r.mechanics),
        ]),
        { widths: ['18%', '16%', '18%', '16%', '32%'] }
      ),
      ...(vehicles && vehicles.length
        ? [
            sectionHead('Tactical Conveyances', 'Mount & Vehicle Stat Profiles'),
            table(
              ['Name', 'Type', 'Max STA', 'Defense / DR', 'Tactical Speed', 'Crew / Cargo', 'Special Traits'],
              vehicles.map((v) => [
                `<strong>${esc(v.name)}</strong>`,
                esc(v.category === 'mount' ? 'Mount' : 'Land Transport'),
                `<span class="mono">${v.hp_max} STA</span>`,
                `<span class="mono accent">${esc(v.defense_summary)}</span>`,
                esc(v.movement),
                `${v.max_passengers} / ${v.cargo_capacity_lbs} lbs`,
                esc((v.traits || []).join(' ')),
              ]),
              { widths: ['18%', '11%', '9%', '14%', '16%', '11%', '21%'] }
            ),
          ]
        : []),
    ].join('')
  );

  // ---- 13. How the Website Works (Player's UI Tour) -------------------------
  const shotBlock = (src, caption, masks = []) =>
    src
      ? `<figure class="screenshot-card"><div class="screenshot-frame"><img src="${src}" alt="${esc(caption)}" />` +
        masks.map((m) => `<span class="gm-mask" style="${m}"></span>`).join('') +
        `</div><figcaption>${caption}</figcaption></figure>`
      : '';

  // Subtle masks hide GM-only navbar/toolbar pills so screenshots match a Player's view
  const topNavMasks = [
    'left:48.5%;top:0.2%;width:11.0%;height:2.5%;background:#14171c;', // GM Notes & Admin tabs
    'left:84.4%;top:0.3%;width:2.3%;height:2.3%;background:#14171c;',  // GM role pill
  ];

  add(
    'Part V · Using the Wayworlds VTT Website',
    'How the Website Works',
    'A visual player’s tour of the Wayworlds VTT web application: managing your character sheet, rolling 3D dice on the tactical battle map, exploring the overland atlas, and looking up rules.',
    [
      sectionHead('Top Navigation Bar', 'Switching Views, Themes & Dice Colors'),
      table(
        ['Control', 'Where to Find It', 'What It Does for Players'],
        [
          ['<strong>🗺️ RPG VTT</strong>', 'Top navigation bar', 'Opens the square-grid Tactical Battle Map where you move your character token, measure distances, and fight encounters.'],
          ['<strong>🧭 World VTT</strong>', 'Top navigation bar', 'Opens the hex-grid Overland & Regional Atlas of UlvWylde to track party travel and world landmarks.'],
          ['<strong>📋 Character Sheets</strong>', 'Top navigation bar', 'Opens your interactive digital Character Sheet to manage attributes, skills, STA/ESS pools, inventory, and spells.'],
          ['<strong>📖 Guides</strong>', 'Top navigation bar', 'Opens the searchable in-app Reference Guides (Attributes, PSA, Optional Archetypes, Example Spells, Combat & Overland).'],
          ['<strong>Theme</strong>', 'Top-right header', 'Switches your UI color package (Silver, Gold, Blues, Greens, Maroons, etc.) across all panels.'],
          ['<strong>🎨 Dice</strong>', 'RPG VTT left tool dock', 'Opens the 3D Dice Color Customizer so you can personalize your tens/ones d100 dice, number colors, and presets (saved to your account).'],
        ],
        { widths: ['20%', '20%', '60%'] }
      ),
      callout(
        '🖥️',
        '<strong>Real-Time Multiplayer Sync:</strong> Everything you do on the website—moving your token, rolling 3D dice, updating Stamina or Essence, levelling skills, or casting from your Grimoire—saves automatically and syncs live across every player at the table.'
      ),

      `<div class="page-break"></div>`,
      sectionHead('1 · Character Sheets View', 'Managing Your Character, Gear & Grimoire'),
      shotBlock(
        screenshots.characterSheet,
        'Interactive Digital Character Sheet: attributes, STA/ESS gauges, skills with one-click XP progression, inventory & Item Forge, and custom Grimoire spells.',
        [...topNavMasks, 'left:74.6%;top:10.5%;width:11.6%;height:2.4%;background:#000000;']
      ),
      table(
        ['Sheet Area', 'How to Use It'],
        [
          ['<strong>1. Roster & Header</strong>', 'Use <code>+ New</code> in the left sidebar to create a character. Select your <strong>Species</strong> (auto-applies attribute modifiers and traits) and <strong>PSA</strong> (Martial, Mystic, or Theurgy). Your <strong>Tier 1–5</strong> badge, <strong>IM</strong>, <strong>Melee Base Hit</strong>, <strong>Movement</strong>, and <strong>Encumbrance</strong> update automatically.'],
          ['<strong>2. Primary Attributes</strong>', 'Adjust your four attribute pairs (<code>STR/STA</code>, <code>DEX/RS</code>, <code>INT/HIST-REL</code>, <code>WIL/PRE</code>) with the pair-shift arrows. Altered Species (Spirits, Undeath, Lycan) display a 20-point pool badge that disappears once all points are assigned.'],
          ['<strong>3. STA, ESS & XP Pools</strong>', 'Track <strong>Stamina (STA)</strong>, <strong>Essence (ESS)</strong>, and <strong>Experience (XP)</strong> using the quick <code>-5 / -1 / +1 / +5</code> buttons or custom amount box. Click <code>Rest</code> or <code>Reload</code> to restore your pools to full.'],
          ['<strong>4. Skills & Experience</strong>', 'Click <code>+ Add Skill</code> to add any Secular Skill or Tradition (archetypes are optional!). Each row shows your live <strong>Target %</strong>, a <code>% Die</code> button to roll a d100 check on the table, and a <code>+Lvl</code> button that spends <code>Next Level × 3 XP</code> (In-PSA) or <code>× 6 XP</code> (Out-of-PSA).'],
          ['<strong>5. Inventory & Mass</strong>', 'Click <code>+ Add Equipment</code> to pick from standard weapons, armor, shields, and kits; <code>⚒ Item Forge</code> to craft Tier 1–5 gear with Tradecraft; or <code>+ Custom Item</code>. Weapon rows include quick <code>Strike</code> / <code>Shoot</code> and <code>d10s</code> damage buttons.'],
          ['<strong>6. Grimoire & Techniques</strong>', 'Click <code>+ Write Spell / Technique</code> to scribe <strong>your own custom spells or martial techniques</strong> (the Guides list is just examples!). Pick a Category (<em>Strike</em>, <em>Blast / Cleave</em>, <em>Ward / Heal</em>, <em>Hex / Control</em>) and <strong>Tier (0–6)</strong>, then click <code>Cast</code> to auto-spend <code>Tier × 2</code> fuel and roll the 3D dice.'],
        ],
        { widths: ['23%', '77%'] }
      ),

      `<div class="page-break"></div>`,
      sectionHead('2 · Tactical RPG VTT View', 'Exploring Battle Maps, Rolling Dice & Combat Actions'),
      shotBlock(
        screenshots.rpgVtt,
        'Tactical RPG VTT Canvas: square battle grid, left tool dock (Move, Pan, Ruler, Ping, Initiative, Roll d%, DMG Die, Dice Colors), and right Token Inspector.',
        [...topNavMasks, 'left:74.8%;top:3.8%;width:18.4%;height:2.7%;background:#14171c;', 'left:81.6%;top:12.6%;width:17.7%;height:3.0%;background:#14171c;']
      ),
      table(
        ['Tactical Tool', 'How It Works During an Encounter'],
        [
          ['<strong>Move & Pan</strong>', 'Select <code>Move</code> to drag your character token square-by-square (5 ft per square), or hold <code>Space + Drag</code> / select <code>Pan</code> to pan the camera. Use the top zoom controls (<code>- / + / Reset</code>) or mouse wheel to zoom.'],
          ['<strong>Ruler & Ping</strong>', 'Select <code>Ruler</code> and drag across the grid to measure exact range in feet for bows, spells, and movement. Select <code>Ping</code> and click anywhere on the map to broadcast an animated beacon to all players.'],
          ['<strong>3D Dice Rollers</strong>', 'Click <code>Initiative</code> to roll <code>1d10 + IM</code>, <code>Roll d%</code> for an instant d100 percentile check, or <code>DMG Die (Nd10)</code> (use <code>- / +</code> to choose how many d10s) to roll damage. Press <code>Clear Dice</code> or <code>Escape</code> to dismiss dice from the screen.'],
          ['<strong>Token Inspector & Combat HUD</strong>', 'Click your token on the map (or in the right-hand <strong>Map Tokens</strong> list) to see your live Stamina bar and quick action buttons (<code>Strike</code>, <code>Shoot</code>, <code>Cast</code>, <code>% Die</code>, <code>d10s</code>). Click <code>Mount(s)</code> in the top-right toolbar to board or manage horses and wagons.'],
          ['<strong>Shared Roll Log & Audio</strong>', 'Click <code>Roll Log</code> at the bottom-left of the screen to expand the live 20-roll multiplayer history (showing every player’s d100 rolls, critical hits, fumbles, and damage), and toggle dice sound effects with the speaker icon.'],
        ],
        { widths: ['24%', '76%'] }
      ),

      `<div class="page-break"></div>`,
      sectionHead('3 · World VTT & In-App Guides', 'Overland Hex Atlas & Instant Rules Search'),
      `<div class="dual-shots">` +
        shotBlock(
          screenshots.worldVtt,
          'World VTT Overland Atlas: hex map of UlvWylde (6 mi/hex regional, 24 mi/hex world) with party & landmark pins.',
          [...topNavMasks, 'left:90.8%;top:3.8%;width:8.6%;height:2.7%;background:#14171c;', 'left:81.0%;top:12.4%;width:18.3%;height:3.0%;background:#14171c;']
        ) +
        shotBlock(
          screenshots.guides,
          'In-App Guides Compendium: category tabs and live search bar for attributes, skills, optional archetypes, example spells, and combat tables.',
          topNavMasks
        ) +
      `</div>`,
      table(
        ['View', 'How Players Use It at the Table'],
        [
          ['<strong>World VTT (Overland Atlas)</strong>', 'Tracks your party’s overland journey across UlvWylde. Use the <strong>World Marker Inspector</strong> on the right to locate your party pin, camps, settlements, and adventure sites, and use the <strong>Ruler</strong> tool to measure hex travel distances in miles before setting out.'],
          ['<strong>Guides (In-App Compendium)</strong>', 'Click any category tab (<em>Primary Attributes</em>, <em>Primary System Areas</em>, <em>Archetypes</em>, <em>Spells/Martial Techniques</em>, <em>Ranged Weapon Combat</em>, <em>Melee Combat</em>, <em>Overland</em>) or type into <code>Filter rules &amp; tables...</code> to look up modifiers, weapon stats, or spell examples without leaving the table.'],
        ],
        { widths: ['26%', '74%'] }
      ),
    ].join('')
  );

  // ---- Appendix A -------------------------------------------------------------
  add(
    'Appendix',
    'Skills & Traditions Reference',
    `Every skill and tradition in one place (${PSA.summaryTable.length} total), sorted by Primary System Area.`,
    psaOrder
      .map((p) => {
        const list = PSA.summaryTable.filter((r) => r.psa === p);
        if (!list.length) return '';
        return (
          sectionHead('Reference', `${p} Skills & Traditions`) +
          table(
            ['Name', 'Type', 'Base Stat', 'Base Chance', 'Fuel', 'Key Use'],
            list.map((r) => [
              `<strong>${esc(r.name)}</strong>`,
              esc(r.category),
              esc(r.baseStat),
              `<span class="mono accent">${esc(r.baseChance)}</span>`,
              esc(r.fuel),
              esc(r.keyUse),
            ]),
            { cls: 'compact', widths: ['17%', '12%', '12%', '21%', '11%', '27%'] }
          )
        );
      })
      .join(''),
    { appendix: true, label: 'A' }
  );

  return chapters;
}

// ---------------------------------------------------------------------------
// Document assembly
// ---------------------------------------------------------------------------
function buildCss(theme, fontsDir) {
  const v = theme.vars;
  const get = (k, fb) => v[k] || fb;
  const font = (name) => pathToFileURL(path.join(fontsDir, name)).href;
  return `
@font-face { font-family: 'Roboto'; font-weight: 400; src: url('${font('Roboto-Regular.ttf')}') format('truetype'); }
@font-face { font-family: 'Roboto'; font-weight: 700; src: url('${font('Roboto-Bold.ttf')}') format('truetype'); }
@font-face { font-family: 'Modesto'; font-weight: 400; src: url('${font('Modesto-Regular.otf')}') format('opentype'); }
@font-face { font-family: 'Modesto'; font-weight: 700; src: url('${font('Modesto-Bold.otf')}') format('opentype'); }

:root {
  --bg-primary: ${get('--bg-primary', '#0d0f12')};
  --bg-secondary: ${get('--bg-secondary', '#14171c')};
  --bg-tertiary: ${get('--bg-tertiary', '#1c2026')};
  --text-primary: ${get('--text-primary', '#cecece')};
  --text-secondary: ${get('--text-secondary', '#8b949e')};
  --accent: ${get('--accent', '#45acba')};
  --border: ${get('--border', '#484f58')};
  --bright: ${get('--theme-bright', '#c0c0c0')};
  --header: ${get('--theme-header-color', get('--theme-bright', '#c8c8c8'))};
  --surface: ${get('--theme-surface-active', '#1f242c')};
  --subtle: ${get('--theme-border-subtle', 'rgba(192,192,192,0.35)')};
  --row-line: rgba(72, 79, 88, 0.45);
}

* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

@page {
  size: Letter;
  margin: 0.65in 0.65in 0.8in 0.65in;
  background: ${get('--bg-primary', '#0d0f12')};
  @bottom-left { content: "Wayworlds · Player's Guide"; font: 400 7.5pt 'Roboto', sans-serif; color: ${get('--text-secondary', '#8b949e')}; }
  @bottom-right { content: counter(page); font: 700 8pt 'Roboto', sans-serif; color: ${get('--theme-bright', '#c0c0c0')}; }
}
@page :first { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }

html { background: var(--bg-primary); }
body {
  margin: 0;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Roboto', -apple-system, 'Helvetica Neue', Arial, sans-serif;
  font-size: 9.2pt;
  line-height: 1.45;
}
.page-bg {
  position: fixed;
  top: -1in;
  left: -1in;
  right: -1in;
  bottom: -1in;
  background: var(--bg-primary);
  z-index: -1;
  pointer-events: none;
}
h1, h2, h3, h4 { margin: 0; font-family: 'Modesto', 'Roboto', sans-serif; }
p { margin: 0; }
strong { color: #e4e4e4; }
code, .mono { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 0.92em; }
code { background: var(--bg-tertiary); padding: 1px 5px; border-radius: 3px; border: 1px solid var(--row-line); color: var(--bright); }
.accent { color: var(--accent); }
.center { text-align: center; }

/* ---------- Cover ---------- */
.cover {
  height: 10.96in; width: 8.5in; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at 50% 38%, var(--surface) 0%, var(--bg-primary) 68%);
  page-break-after: always; break-after: page;
}
.cover-frame {
  width: 6.7in; padding: 0.95in 0.5in 0.8in; text-align: center;
  border: 2px solid var(--bright); outline: 1px solid var(--subtle); outline-offset: 7px;
  background: rgba(13, 15, 18, 0.55);
}
.cover-eyebrow { font-size: 10pt; letter-spacing: 6px; text-transform: uppercase; color: var(--text-secondary); }
.cover-title { margin-top: 0.3in; font-size: 66pt; line-height: 1; letter-spacing: 6px; text-transform: uppercase; font-weight: 700; color: var(--header); }
.cover-rule { width: 3.2in; height: 2px; margin: 0.32in auto; background: linear-gradient(90deg, transparent, var(--bright), transparent); }
.cover-subtitle { font-family: 'Modesto', sans-serif; font-size: 27pt; letter-spacing: 7px; text-transform: uppercase; color: var(--bright); }
.cover-setting { margin-top: 0.3in; font-size: 11pt; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); }
.cover-tag { margin-top: 0.75in; font-size: 8.5pt; letter-spacing: 2.5px; text-transform: uppercase; color: var(--text-secondary); line-height: 2; }
.cover-foot { margin-top: 0.55in; font-size: 7.5pt; color: var(--text-secondary); letter-spacing: 1px; }

/* ---------- Table of contents ---------- */
.toc { break-after: page; page-break-after: always; }
.toc h1 { font-size: 26pt; letter-spacing: 3px; text-transform: uppercase; color: var(--header); border-bottom: 2px solid var(--border); padding-bottom: 8px; margin-bottom: 14px; }
.toc-intro { color: var(--text-secondary); margin-bottom: 16px; font-size: 9.5pt; }
.toc-part { margin: 15px 0 5px; font-size: 8pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--text-secondary); }
.toc-row { display: flex; align-items: baseline; gap: 8px; padding: 5px 0; text-decoration: none; color: var(--text-primary); font-size: 11pt; }
.toc-num { width: 22px; flex: none; font-weight: 700; color: var(--accent); text-align: right; }
.toc-title { flex: none; }
.toc-dots { flex: 1; border-bottom: 1px dotted var(--border); transform: translateY(-3px); }
.toc-page { flex: none; width: 24px; text-align: right; font-weight: 700; color: var(--bright); }
.toc-how { margin-top: 24px; padding: 12px 16px; border: 1px solid var(--subtle); background: var(--surface); border-radius: 6px; font-size: 9pt; color: var(--text-secondary); }
.toc-how strong { color: var(--bright); }

/* ---------- Chapters ---------- */
.chapter { break-before: page; page-break-before: always; }
.chapter-eyebrow { font-size: 8pt; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: var(--text-secondary); }
.chapter h1 {
  display: flex; align-items: center; gap: 14px; margin-top: 4px;
  font-size: 25pt; line-height: 1.1; letter-spacing: 1.5px; text-transform: uppercase; color: var(--header);
  padding-bottom: 9px; border-bottom: 2px solid var(--border);
}
.chapter-num {
  flex: none; min-width: 38px; height: 38px; padding: 0 8px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 18pt; letter-spacing: 0; color: var(--bright); background: var(--surface); border: 1.5px solid var(--bright);
}
.chapter-intro { margin: 10px 0 4px; font-size: 10pt; color: var(--text-secondary); font-style: italic; max-width: 6.4in; }

.section-head { display: flex; align-items: center; gap: 10px; margin: 18px 0 8px; break-after: avoid; page-break-after: avoid; }
.section-head h2 { font-size: 13.5pt; letter-spacing: 0.6px; text-transform: uppercase; color: var(--header); }
.title-badge {
  flex: none; font-size: 6.8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
  padding: 2px 8px; border-radius: 12px; color: var(--bright); background: var(--surface); border: 1px solid var(--subtle);
}

.prose { line-height: 1.55; }
.prose p + p { margin-top: 8px; }
.prose.lead { font-size: 10.4pt; }
.bullets { margin: 4px 0 0; padding-left: 16px; }
.bullets li { margin: 2px 0; }

/* ---------- Tables ---------- */
.ref-table { width: 100%; border-collapse: collapse; font-size: 8.4pt; margin-top: 4px; border: 1px solid var(--row-line); }
.ref-table thead { display: table-header-group; }
.ref-table th {
  background: var(--bg-tertiary); color: var(--text-secondary); text-align: left;
  font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
  padding: 6px 8px; border-bottom: 1px solid var(--border);
}
.ref-table td { padding: 6px 8px; vertical-align: top; border-bottom: 1px solid var(--row-line); background: var(--bg-secondary); }
.ref-table tbody tr:nth-child(even) td { background: #181b21; }
.ref-table tr { break-inside: avoid; page-break-inside: avoid; }
.ref-table.compact { font-size: 7.8pt; }
.ref-table.compact td, .ref-table.compact th { padding: 5px 6px; }
.cell-sub { margin-top: 2px; font-size: 7.6pt; color: var(--text-secondary); line-height: 1.35; }
.dice { display: inline-block; padding: 1px 7px; border-radius: 3px; background: var(--surface); border: 1px solid var(--subtle); color: var(--bright); font-family: 'SF Mono', Menlo, monospace; font-weight: 700; }
.dice-hi { display: block; color: var(--bright); font-family: 'SF Mono', Menlo, monospace; font-size: 8.8pt; }
.mag-sum { display: block; font-size: 7.4pt; color: var(--text-secondary); line-height: 1.3; margin-top: 1px; }
.step { display: inline-flex; width: 20px; height: 20px; align-items: center; justify-content: center; border-radius: 50%; background: var(--surface); border: 1px solid var(--bright); color: var(--bright); font-weight: 700; font-size: 8pt; }
tr.group-row td { background: var(--surface) !important; color: var(--bright); font-family: 'Modesto', sans-serif; font-size: 10pt; letter-spacing: 1px; text-transform: uppercase; padding: 6px 8px; }
.group-sub { margin-left: 10px; font-family: 'Roboto', sans-serif; font-size: 7.2pt; letter-spacing: 0.4px; color: var(--text-secondary); text-transform: none; }
.ref-table.spells td { font-size: 8pt; }
tbody.spell-group { break-inside: avoid; page-break-inside: avoid; }

/* ---------- Callouts ---------- */
.formula-banner { display: flex; align-items: flex-start; gap: 14px; padding: 12px 16px; margin: 12px 0 4px; background: var(--surface); border: 1px solid var(--subtle); border-left: 4px solid var(--bright); border-radius: 6px; break-inside: avoid; }
.formula-icon { font-size: 22pt; line-height: 1; }
.formula-subtitle { display: block; font-size: 7.4pt; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-secondary); }
.formula-code { margin-top: 3px; font-family: 'SF Mono', Menlo, monospace; font-size: 9.2pt; font-weight: 700; color: var(--bright); line-height: 1.4; }
.formula-desc { margin-top: 6px; font-size: 8.8pt; color: var(--text-primary); }
.note { display: flex; gap: 10px; align-items: flex-start; margin: 10px 0; padding: 9px 14px; background: var(--bg-secondary); border: 1px solid var(--subtle); border-radius: 6px; break-inside: avoid; }
.note-icon { font-size: 13pt; line-height: 1.2; }
.note-text { font-size: 8.8pt; }

/* ---------- Species ---------- */
.group-block { margin-top: 14px; }
.group-head { display: flex; gap: 10px; align-items: center; margin-bottom: 5px; break-after: avoid; page-break-after: avoid; }
.group-icon { font-size: 18pt; }
.group-head h3 { font-size: 12pt; color: var(--header); letter-spacing: 0.5px; text-transform: uppercase; }
.group-head p { font-size: 8.4pt; color: var(--text-secondary); }

/* ---------- Attributes ---------- */
.pair-card { margin-top: 12px; border: 1px solid var(--subtle); border-radius: 6px; background: var(--bg-secondary); break-inside: avoid; page-break-inside: avoid; overflow: hidden; }
.pair-head { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: var(--surface); border-bottom: 1px solid var(--subtle); }
.pair-acr { flex: none; min-width: 86px; text-align: center; padding: 4px 8px; border-radius: 4px; background: var(--bg-primary); border: 1px solid var(--bright); color: var(--bright); font-family: 'Modesto', sans-serif; font-size: 11pt; letter-spacing: 1px; }
.pair-head h3 { font-size: 11pt; color: var(--header); letter-spacing: 0.4px; }
.pair-head p { font-size: 8pt; color: var(--text-secondary); }
.pair-cols { display: flex; }
.stat-block { flex: 1; padding: 9px 12px; }
.stat-block + .stat-block { border-left: 1px solid var(--row-line); }
.stat-block h4 { font-size: 11pt; color: var(--bright); letter-spacing: 0.5px; text-transform: uppercase; }
.stat-desc { margin: 3px 0 5px; font-size: 8.2pt; color: var(--text-secondary); font-style: italic; }
.stat-block .bullets { font-size: 8pt; }
.stat-skills { font-size: 8pt; }
.mini-label { margin: 7px 0 2px; font-size: 6.8pt; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--accent); }

/* ---------- PSA ---------- */
.area-block { margin-top: 16px; padding: 12px 14px; border: 1px solid var(--subtle); border-radius: 6px; background: var(--bg-secondary); break-inside: avoid; page-break-inside: avoid; }
.area-head { display: flex; align-items: center; gap: 12px; break-after: avoid; page-break-after: avoid; }
.area-icon { font-size: 22pt; }
.area-head h3 { font-size: 16pt; letter-spacing: 1.5px; text-transform: uppercase; color: var(--header); }
.area-tag { font-size: 8pt; color: var(--accent); font-weight: 700; letter-spacing: 0.4px; }
.area-desc { margin: 7px 0 4px; font-size: 8.8pt; }

/* ---------- Archetypes ---------- */
.arch-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.arch-card { width: calc(50% - 4px); padding: 8px 11px; border: 1px solid var(--subtle); border-radius: 6px; background: var(--bg-secondary); break-inside: avoid; page-break-inside: avoid; }
.arch-head { display: flex; align-items: center; gap: 9px; }
.arch-icon { font-size: 17pt; }
.arch-head h4 { font-size: 11pt; letter-spacing: 0.5px; text-transform: uppercase; color: var(--header); }
.species-tag { color: var(--accent); }
.psa-pill { display: inline-block; margin-top: 1px; padding: 0 7px; font-size: 6.6pt; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase; color: var(--bright); background: var(--surface); border: 1px solid var(--subtle); border-radius: 10px; }
.arch-tag { margin: 5px 0; font-size: 8pt; color: var(--text-secondary); font-style: italic; min-height: 22px; }
.arch-skills { list-style: none; margin: 0; padding: 0; }
.arch-skills li { display: flex; align-items: baseline; gap: 6px; padding: 2px 0; border-top: 1px solid var(--row-line); font-size: 8pt; }
.rank { flex: none; width: 13px; font-weight: 700; color: var(--accent); }
.sk-name { flex: 1; font-weight: 700; color: #e4e4e4; }
.sk-type { flex: none; color: var(--text-secondary); font-size: 7pt; }
.in-psa, .out-psa { flex: none; width: 52px; text-align: center; font-size: 6.4pt; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; border-radius: 3px; padding: 0 3px; }
.in-psa { color: var(--bright); border: 1px solid var(--bright); }
.out-psa { color: var(--text-secondary); border: 1px solid var(--border); }

/* ---------- Website UI Tour & Screenshots ---------- */
.forge-block { break-inside: avoid; page-break-inside: avoid; }
.page-break { break-before: page; page-break-before: always; height: 0; }
.screenshot-card {
  margin: 8px 0 10px;
  padding: 6px;
  border: 1px solid var(--subtle);
  border-radius: 6px;
  background: var(--bg-secondary);
  text-align: center;
  break-inside: avoid;
  page-break-inside: avoid;
}
.screenshot-frame {
  position: relative;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid var(--row-line);
  background: #0d0f12;
}
.screenshot-frame img {
  display: block;
  max-width: 100%;
  max-height: 4.1in;
  width: auto;
  height: auto;
}
.gm-mask {
  position: absolute;
  background: #14171c;
  pointer-events: none;
}
.screenshot-card figcaption {
  margin-top: 5px;
  font-size: 7.8pt;
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
}
.dual-shots {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dual-shots .screenshot-frame img {
  max-height: 2.7in;
}
`;
}

function buildDocument({ chapters, theme, css, dateLabel, pageNumbers }) {
  const parts = [];
  for (const c of chapters) {
    if (!parts.length || parts[parts.length - 1].name !== c.part) parts.push({ name: c.part, items: [] });
    parts[parts.length - 1].items.push(c);
  }

  const tocHtml =
    `<section class="toc"><h1>Contents</h1>` +
    `<p class="toc-intro">Everything you need to create a character and play. Chapters follow the order you will use them at the table.</p>` +
    parts
      .map(
        (p) =>
          `<div class="toc-part">${esc(p.name)}</div>` +
          p.items
            .map(
              (c) =>
                `<a class="toc-row" href="#${c.id}"><span class="toc-num">${esc(c.num)}</span><span class="toc-title">${esc(c.title)}</span><span class="toc-dots"></span><span class="toc-page">${pageNumbers?.[c.id] ?? ''}</span></a>`
            )
            .join('')
      )
      .join('') +
    `<div class="toc-how"><strong>New to Wayworlds?</strong> Read <em>How the Game Works</em> first, then follow Part I to build your character. Parts II and III cover casting and fighting, and the Appendix lists every skill on one page.</div>` +
    `</section>`;

  const coverHtml =
    `<section class="cover"><div class="cover-frame">` +
    `<div class="cover-eyebrow">A d100 Role-Playing Game</div>` +
    `<div class="cover-title">Wayworlds</div><div class="cover-rule"></div>` +
    `<div class="cover-subtitle">Player's Guide</div>` +
    `<div class="cover-setting">Setting · UlvWylde</div>` +
    `<div class="cover-tag">Species · Attributes · Skills<br>Archetypes · Magic · Combat · Travel</div>` +
    `<div class="cover-foot">Compiled from the Wayworlds VTT Guides · ${esc(dateLabel)}</div>` +
    `</div></section>`;

  const chaptersHtml = chapters
    .map(
      (c) =>
        `<section class="chapter" id="${c.id}"><div class="chapter-eyebrow">${esc(c.part)}</div>` +
        `<h1><span class="chapter-num">${esc(c.num)}</span> <span>${esc(c.title)}</span></h1>` +
        `<p class="chapter-intro">${esc(c.intro)}</p>${c.body}</section>`
    )
    .join('');

  return `<!doctype html><html lang="en" data-color-pkg="${esc(theme.key)}"><head><meta charset="utf-8"><title>Wayworlds Player's Guide</title><style>${css}</style></head><body><div class="page-bg" aria-hidden="true"></div>${coverHtml}${tocHtml}${chaptersHtml}</body></html>`;
}

/**
 * Extracts 1-based starting page numbers for each chapter from Chrome's generated PDF
 * outline/page tree so the Table of Contents can be rendered with exact page numbers.
 */
function extractChapterPages(pdfPath, chapters) {
  const raw = fs.readFileSync(pdfPath, 'latin1');
  const pagesNodes = new Map();
  let rootId = null;
  for (const m of raw.matchAll(/(\d+)\s+0\s+obj\s*<<([^>]*\/Type\s*\/Pages[\s\S]*?)>>/g)) {
    const id = Number(m[1]);
    const body = m[2];
    const kidsMatch = body.match(/\/Kids\s*\[([^\]]+)\]/);
    const kids = kidsMatch ? [...kidsMatch[1].matchAll(/(\d+)\s+0\s+R/g)].map((k) => Number(k[1])) : [];
    const hasParent = /\/Parent\s+\d+\s+0\s+R/.test(body);
    pagesNodes.set(id, kids);
    if (!hasParent) rootId = id;
  }
  const pageOrder = [];
  const walk = (id) => {
    const kids = pagesNodes.get(id);
    if (!kids) {
      pageOrder.push(id);
      return;
    }
    for (const k of kids) walk(k);
  };
  if (rootId !== null) walk(rootId);
  const objToPage = new Map(pageOrder.map((objId, idx) => [objId, idx + 1]));

  const outlines = [];
  for (const m of raw.matchAll(/<<\s*\/Title\s*\(((?:\\.|[^\\)])*)\)\s*\/Dest\s*\[\s*(\d+)\s+0\s+R/g)) {
    const title = m[1].replace(/\\([()\\])/g, '$1').trim().toUpperCase();
    const page = objToPage.get(Number(m[2]));
    if (page) outlines.push({ title, page });
  }

  const pageNumbers = {};
  for (const c of chapters) {
    const expected = `${c.num} ${c.title}`.toUpperCase();
    const expectedNoSpace = `${c.num}${c.title}`.toUpperCase();
    const hit = outlines.find((o) => o.title === expected || o.title === expectedNoSpace || o.title.endsWith(c.title.toUpperCase()));
    if (hit) pageNumbers[c.id] = hit.page;
  }
  return pageNumbers;
}

// ---------------------------------------------------------------------------
// Chrome rendering
// ---------------------------------------------------------------------------
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Chrome/Chromium not found. Install Google Chrome or set CHROME_PATH.');
  return found;
}

function renderPdf(htmlPath, pdfPath) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-guide-chrome-'));
  try {
    execFileSync(
      findChrome(),
      [
        '--headless=new',
        '--disable-gpu',
        `--user-data-dir=${profile}`,
        '--no-pdf-header-footer',
        '--generate-pdf-document-outline',
        '--export-tagged-pdf',
        '--run-all-compositor-stages-before-draw',
        '--virtual-time-budget=15000',
        `--print-to-pdf=${pdfPath}`,
        pathToFileURL(htmlPath).href,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'], timeout: 120000 }
    );
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }
  if (!fs.existsSync(pdfPath)) throw new Error('Chrome did not produce a PDF.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const data = await loadData();
  const theme = loadTheme(opts.theme);
  const css = buildCss(theme, path.join(ROOT, 'client/public/fonts'));
  const dateLabel = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const workDir = opts.keepHtml ? path.join(ROOT, 'scratch') : fs.mkdtempSync(path.join(os.tmpdir(), 'ww-guide-html-'));
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  const htmlPath = path.join(workDir, 'players-guide.html');

  try {
    const screenshots = prepareScreenshots(workDir);
    const chapters = buildChapters({ ...data, screenshots });
    const build = (pageNumbers) => buildDocument({ chapters, theme, css, dateLabel, pageNumbers });

    // Pass 1: render PDF to discover exact chapter starting pages from the PDF outline tree
    fs.writeFileSync(htmlPath, build(null));
    renderPdf(htmlPath, opts.out);

    // Pass 2: inject discovered chapter page numbers into the Table of Contents and re-render
    const pageNumbers = extractChapterPages(opts.out, chapters);
    if (Object.keys(pageNumbers).length > 0) {
      fs.writeFileSync(htmlPath, build(pageNumbers));
      renderPdf(htmlPath, opts.out);
    }

    const kb = Math.round(fs.statSync(opts.out).size / 1024);
    console.log(`Built ${path.relative(ROOT, opts.out)} (${kb} KB, theme: ${theme.key}, ${chapters.length} chapters)`);
  } finally {
    if (!opts.keepHtml) fs.rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(`Player's Guide build failed: ${err.message}`);
  process.exit(1);
});
