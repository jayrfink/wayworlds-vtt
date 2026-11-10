/**
 * GM-Only Narrative Oracle & Arc Engine Service
 * Wayworlds VTT - Dark Gothic Fantasy
 *
 * Implements Context-Free Grammar (CFG) template parsing with
 * Arc-prioritized fragment substitution, GM directive injection,
 * and deterministic twist cadence.
 */

let twistCounter = 0;

export function getTwistCounter() {
  return twistCounter;
}

export function resetTwistCounter() {
  twistCounter = 0;
  return twistCounter;
}

export function setTwistCounter(val) {
  twistCounter = Number(val) || 0;
  return twistCounter;
}

/**
 * Pick a random element from an array.
 */
function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

/**
 * Fetch a fragment for a given category using Arc-aware fallback:
 * 1. Specific to environmentId AND arcId
 * 2. Fall back to environmentId AND arcId IS NULL
 * 3. Fall back to any fragment in the database with that category
 */
export function resolveFragment({ db, environmentId, arcId, category }) {
  if (arcId) {
    const arcRows = db.prepare(`
      SELECT text_value FROM oracle_fragments
      WHERE environment_id = ? AND arc_id = ? AND category = ?
    `).all(environmentId, arcId, category);

    if (arcRows.length > 0) {
      return pickRandom(arcRows)?.text_value;
    }
  }

  // Fallback to general environment fragment
  const envRows = db.prepare(`
    SELECT text_value FROM oracle_fragments
    WHERE environment_id = ? AND arc_id IS NULL AND category = ?
  `).all(environmentId, category);

  if (envRows.length > 0) {
    return pickRandom(envRows)?.text_value;
  }

  // Fallback to global category fragment
  const globalRows = db.prepare(`
    SELECT text_value FROM oracle_fragments
    WHERE category = ?
  `).all(category);

  if (globalRows.length > 0) {
    return pickRandom(globalRows)?.text_value;
  }

  return `[${category}]`;
}

/**
 * Select an appropriate scene template matching context and resolution weight.
 */
export function selectTemplate({ db, environmentId, arcId, contextType, resolutionOutcome }) {
  const outcome = resolutionOutcome && resolutionOutcome !== 'any' ? resolutionOutcome : 'any';
  const context = contextType && contextType !== 'custom' ? contextType : null;

  // 1. Try arc-specific templates first if arcId is set
  if (arcId) {
    let rows = db.prepare(`
      SELECT text_value FROM oracle_fragments
      WHERE environment_id = ? AND arc_id = ? AND category = 'scene_template'
        AND resolution_weight IN (?, 'any')
    `).all(environmentId, arcId, outcome);

    // If context is specified, filter by resolution_weight matching context if applicable
    if (context && rows.length > 1) {
      const matched = rows.filter(r => r.text_value.toLowerCase().includes(context.toLowerCase()));
      if (matched.length > 0) rows = matched;
    }

    if (rows.length > 0) return pickRandom(rows)?.text_value;

    // Fallback: any template for this arc
    const arcAny = db.prepare(`
      SELECT text_value FROM oracle_fragments
      WHERE environment_id = ? AND arc_id = ? AND category = 'scene_template'
    `).all(environmentId, arcId);
    if (arcAny.length > 0) return pickRandom(arcAny)?.text_value;
  }

  // 2. Try environment general templates matching resolution outcome
  let envRows = db.prepare(`
    SELECT text_value FROM oracle_fragments
    WHERE environment_id = ? AND arc_id IS NULL AND category = 'scene_template'
      AND resolution_weight IN (?, 'any')
  `).all(environmentId, outcome);

  if (context && envRows.length > 1) {
    const matched = envRows.filter(r => {
      const lower = r.text_value.toLowerCase();
      if (context === 'explore') return lower.includes('explore') || lower.includes('survey') || lower.includes('navigat');
      if (context === 'combat') return lower.includes('combat') || lower.includes('clash') || lower.includes('shatter') || lower.includes('ambush');
      if (context === 'social') return lower.includes('social') || lower.includes('shelter') || lower.includes('cross paths') || lower.includes('counc') || lower.includes('confront');
      if (context === 'lore') return lower.includes('lore') || lower.includes('ward') || lower.includes('reliquary') || lower.includes('inscript');
      return false;
    });
    if (matched.length > 0) envRows = matched;
  }

  if (envRows.length > 0) return pickRandom(envRows)?.text_value;

  // 3. Any general template in this environment
  const envAny = db.prepare(`
    SELECT text_value FROM oracle_fragments
    WHERE environment_id = ? AND arc_id IS NULL AND category = 'scene_template'
  `).all(environmentId);
  if (envAny.length > 0) return pickRandom(envAny)?.text_value;

  // 4. Any template in the database
  const globalAny = db.prepare(`
    SELECT text_value FROM oracle_fragments
    WHERE category = 'scene_template'
  `).all();
  if (globalAny.length > 0) return pickRandom(globalAny)?.text_value;

  return 'At #location#, #sensory_detail# #npc# warns that #threat# #action_trigger#! #tradition_hook# Resolve on VTT.';
}

/**
 * Generate a procedural narrative prompt.
 *
 * @param {Object} params
 * @param {import('better-sqlite3').Database} params.db
 * @param {number} params.environmentId
 * @param {number|null} [params.arcId]
 * @param {string} [params.contextType] - explore, combat, social, lore, custom
 * @param {string} [params.resolutionOutcome] - any, success, failure, bypass
 * @param {string} [params.directiveText] - GM forced hook
 * @returns {Object} Saved oracle_session_logs row
 */
export function generatePrompt({
  db,
  environmentId,
  arcId = null,
  contextType = 'explore',
  resolutionOutcome = 'any',
  directiveText = '',
}) {
  if (!db) throw new Error('Database instance required');
  if (!environmentId) throw new Error('environmentId is required');

  // Increment twist cadence counter
  twistCounter += 1;
  const isTwist = twistCounter % 5 === 0;

  // Select scene template
  const rawTemplate = selectTemplate({
    db,
    environmentId,
    arcId,
    contextType,
    resolutionOutcome,
  });

  let processed = rawTemplate;
  const cleanDirective = typeof directiveText === 'string' ? directiveText.trim() : '';

  // Handle Forced Directive Hook
  let directiveInjected = false;
  if (cleanDirective) {
    if (processed.includes('#threat#')) {
      processed = processed.replace('#threat#', cleanDirective);
      directiveInjected = true;
    } else if (processed.includes('#action_trigger#')) {
      processed = processed.replace('#action_trigger#', cleanDirective);
      directiveInjected = true;
    }
  }

  // Resolve all remaining tokens: #location#, #threat#, #npc#, #action_trigger#, #sensory_detail#, #tradition_hook#
  const tokenRegex = /#([a-z_]+)#/g;
  processed = processed.replace(tokenRegex, (_match, tokenCategory) => {
    return resolveFragment({
      db,
      environmentId,
      arcId,
      category: tokenCategory,
    });
  });

  // If directive was provided but neither token was in the template, append it
  if (cleanDirective && !directiveInjected) {
    processed += `\n[DIRECTIVE]: ${cleanDirective}`;
  }

  // Append twist if twist counter triggered
  let finalSource = 'engine';
  if (isTwist) {
    finalSource = 'twist';
    const twistText = resolveFragment({
      db,
      environmentId,
      arcId,
      category: 'twist',
    });
    processed += `\n\n[TWIST]: ${twistText}`;
  }

  // Save to oracle_session_logs
  const insertLog = db.prepare(`
    INSERT INTO oracle_session_logs (environment_id, arc_id, source, context_type, text_content, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const info = insertLog.run(
    environmentId,
    arcId || null,
    finalSource,
    contextType || 'explore',
    processed
  );

  const savedLog = db.prepare('SELECT * FROM oracle_session_logs WHERE id = ?').get(info.lastInsertRowid);
  return savedLog;
}

/**
 * Log a manual GM narrative entry.
 */
export function logManualNarrative({ db, environmentId, arcId = null, textContent, contextType = 'custom' }) {
  if (!db) throw new Error('Database instance required');
  if (!textContent || typeof textContent !== 'string' || !textContent.trim()) {
    throw new Error('textContent is required and cannot be empty');
  }

  const insertLog = db.prepare(`
    INSERT INTO oracle_session_logs (environment_id, arc_id, source, context_type, text_content, created_at)
    VALUES (?, ?, 'gm_manual', ?, ?, CURRENT_TIMESTAMP)
  `);

  const info = insertLog.run(
    environmentId || null,
    arcId || null,
    contextType || 'custom',
    textContent.trim()
  );

  return db.prepare('SELECT * FROM oracle_session_logs WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Create a new custom Narrative Arc with optional fragments.
 */
export function createArc({ db, environmentId, title, synopsis = '', fragments = [] }) {
  if (!db) throw new Error('Database instance required');
  if (!environmentId) throw new Error('environmentId is required');
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('title is required and cannot be empty');
  }

  const tx = db.transaction(() => {
    const insertArc = db.prepare(`
      INSERT INTO oracle_arcs (environment_id, title, synopsis, is_custom)
      VALUES (?, ?, ?, 1)
    `);
    const info = insertArc.run(environmentId, title.trim(), (synopsis || '').trim());
    const arcId = info.lastInsertRowid;

    if (Array.isArray(fragments) && fragments.length > 0) {
      const insertFrag = db.prepare(`
        INSERT INTO oracle_fragments (environment_id, arc_id, category, resolution_weight, text_value)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const f of fragments) {
        if (f && f.category && f.text_value) {
          const weight = f.resolution_weight || 'any';
          insertFrag.run(environmentId, arcId, f.category, weight, f.text_value.trim());
        }
      }
    }

    return db.prepare('SELECT * FROM oracle_arcs WHERE id = ?').get(arcId);
  });

  return tx();
}

/**
 * Retrieve initial state: environments with nested arcs, all arcs, and recent session logs.
 */
export function getInitData({ db }) {
  if (!db) throw new Error('Database instance required');

  const environments = db.prepare('SELECT * FROM oracle_environments ORDER BY id ASC').all();
  const arcs = db.prepare('SELECT * FROM oracle_arcs ORDER BY id ASC').all();

  const envsWithArcs = environments.map((env) => ({
    ...env,
    arcs: arcs.filter((a) => a.environment_id === env.id),
  }));

  const logs = db.prepare(`
    SELECT l.*, e.name as environment_name, a.title as arc_title
    FROM oracle_session_logs l
    LEFT JOIN oracle_environments e ON l.environment_id = e.id
    LEFT JOIN oracle_arcs a ON l.arc_id = a.id
    ORDER BY l.id DESC
    LIMIT 60
  `).all();

  return {
    environments: envsWithArcs,
    arcs,
    logs,
    twistCounter,
  };
}

/**
 * Clear session logs.
 */
export function clearSessionLogs({ db }) {
  if (!db) throw new Error('Database instance required');
  db.prepare('DELETE FROM oracle_session_logs').run();
  resetTwistCounter();
  return { success: true };
}
