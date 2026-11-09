import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, requireGM } from './middleware.js';
import { validateAdversaryTemplate, generateNpcStats, generateCreatureStats } from './adversaryMathEngine.js';
import { spawnAdversaries } from './adversarySpawner.js';
import { generateTokenRingImage } from './tokenImagePipeline.js';
import { generateTokenArtFromDescription } from './imageGeneratorService.js';
import { formatToken } from './maps.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');

function resolveUploadDiskPath(urlStr, baseUploadsDir = path.join(DATA_DIR, 'uploads')) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const cleanUrl = urlStr.split('?')[0];
  const rel = cleanUrl.startsWith('/uploads/')
    ? cleanUrl.replace(/^\/uploads\//, '')
    : cleanUrl.replace(/^\//, '');
  const candidate = path.resolve(baseUploadsDir, rel);
  const uploadsRoot = path.resolve(baseUploadsDir);
  if (!candidate.startsWith(uploadsRoot + path.sep)) return null;
  try {
    return fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : null;
  } catch {
    return null;
  }
}

function normalizeUploadUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return '';
  const cleanUrl = urlStr.split('?')[0].replace(/\\/g, '/');
  if (cleanUrl.startsWith('/uploads/')) return cleanUrl;
  return '/uploads/' + cleanUrl.replace(/^\/+/, '');
}

function safeJsonParse(val, fallback) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export function formatAdversary(row) {
  if (!row) return null;
  return {
    template_id: row.id,
    name: row.name,
    category: row.category,
    threat_tier: row.threat_tier,
    token_image_path: row.token_image_path,
    token_size: row.token_size,
    hp_max: row.hp_max,
    defense_summary: row.defense_summary,
    movement: row.movement,
    initiative_mod: row.initiative_mod,
    actions: safeJsonParse(row.actions, []),
    traits: safeJsonParse(row.traits, []),
    system_data: safeJsonParse(row.system_data, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function createAdversariesRouter(db, io, uploadDir = null) {
  const router = Router();
  router.use(requireAuth);
  const effectiveUploadsDir = uploadDir || path.join(DATA_DIR, 'uploads');

  // GET /api/adversaries - List all templates
  router.get('/', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM adversary_templates ORDER BY threat_tier ASC, name ASC').all();
      res.json(rows.map(formatAdversary));
    } catch (err) {
      console.error('Error listing adversaries:', err);
      res.status(500).json({ error: 'Failed to list adversaries' });
    }
  });

  // GET /api/adversaries/:id - Get specific template
  router.get('/:id', (req, res) => {
    try {
      const row = db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(req.params.id);
      if (!row) {
        return res.status(404).json({ error: 'Adversary template not found' });
      }
      res.json(formatAdversary(row));
    } catch (err) {
      console.error('Error fetching adversary:', err);
      res.status(500).json({ error: 'Failed to fetch adversary' });
    }
  });

  // POST /api/adversaries/generate-token-art - Generate AI token portrait & masked ring
  router.post('/generate-token-art', requireGM(db), async (req, res) => {
    try {
      const { prompt, name, species, category, threat_tier, weapon, armor, attacks, folder } = req.body;
      const result = await generateTokenArtFromDescription({
        prompt,
        name,
        species,
        category,
        threat_tier: Number(threat_tier) || 2,
        weapon,
        armor,
        attacks,
        folder,
        uploadDir: effectiveUploadsDir,
      });
      res.json(result);
    } catch (err) {
      console.error('Error generating AI token art:', err);
      const statusCode = err.status || (err.code === 'RATE_LIMITED' ? 429 : 500);
      res.status(statusCode).json({
        error: err.code === 'RATE_LIMITED' ? 'Rate limit reached' : 'Failed to generate token art',
        message: err.message,
        retryAfter: err.retryAfter,
      });
    }
  });

  // POST /api/adversaries - Register / create template
  router.post('/', requireGM(db), (req, res) => {
    try {
      const templatePayload = {
        token_image_path: '',
        token_size: 1,
        defense_summary: '',
        movement: '12 m/s',
        initiative_mod: 0,
        actions: [],
        traits: [],
        system_data: {},
        ...req.body,
      };

      if (!templatePayload.template_id && templatePayload.id) {
        templatePayload.template_id = templatePayload.id;
      }

      const validation = validateAdversaryTemplate(templatePayload);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Invalid template payload', details: validation.errors });
      }

      const {
        template_id,
        name,
        category,
        threat_tier,
        token_image_path,
        token_size,
        hp_max,
        defense_summary,
        movement,
        initiative_mod,
        actions,
        traits,
        system_data,
      } = templatePayload;

      const actionsStr = JSON.stringify(actions);
      const traitsStr = JSON.stringify(traits);
      const systemDataStr = JSON.stringify(system_data);

      const stmt = db.prepare(`
        INSERT INTO adversary_templates (
          id, name, category, threat_tier, token_image_path, token_size,
          hp_max, defense_summary, movement, initiative_mod,
          actions, traits, system_data
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          category = excluded.category,
          threat_tier = excluded.threat_tier,
          token_image_path = excluded.token_image_path,
          token_size = excluded.token_size,
          hp_max = excluded.hp_max,
          defense_summary = excluded.defense_summary,
          movement = excluded.movement,
          initiative_mod = excluded.initiative_mod,
          actions = excluded.actions,
          traits = excluded.traits,
          system_data = excluded.system_data,
          updated_at = CURRENT_TIMESTAMP
      `);

      stmt.run(
        template_id, name, category, threat_tier, token_image_path, token_size,
        hp_max, defense_summary, movement, initiative_mod,
        actionsStr, traitsStr, systemDataStr
      );

      const saved = db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(template_id);
      const formatted = formatAdversary(saved);

      if (io) {
        io.emit('adversary:saved', { template: formatted });
      }

      res.status(201).json(formatted);
    } catch (err) {
      console.error('Error creating adversary:', err);
      res.status(500).json({ error: 'Failed to save adversary template' });
    }
  });

  // POST /api/adversaries/spawn - Spawn N tokens on a map
  router.post('/spawn', requireGM(db), async (req, res) => {
    try {
      const { mapId, templateId, template: templateInput, count = 1, source_image_url } = req.body;
      if (!mapId) {
        return res.status(400).json({ error: 'mapId is required' });
      }

      let templateObj;
      if (templateId) {
        const row = db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(templateId);
        if (!row) {
          return res.status(404).json({ error: `Adversary template with id "${templateId}" not found` });
        }
        templateObj = formatAdversary(row);
      } else if (templateInput && typeof templateInput === 'object') {
        if (!templateInput.actions || templateInput.actions.length === 0) {
          const threatTier = Math.min(5, Math.max(1, parseInt(templateInput.threat_tier || templateInput.tier, 10) || 2));
          if (templateInput.category === 'creature') {
            const attacks = Array.isArray(templateInput.attacks)
              ? templateInput.attacks
              : typeof templateInput.attacks === 'string'
              ? templateInput.attacks.split(',').map((s) => s.trim())
              : ['Bite', 'Claws'];
            const traits = Array.isArray(templateInput.traits)
              ? templateInput.traits
              : typeof templateInput.traits === 'string'
              ? templateInput.traits.split(',').map((s) => ({ name: s.trim(), description: 'Special creature trait.' }))
              : undefined;

            templateObj = generateCreatureStats(threatTier, {
              name: templateInput.name,
              attacks,
              traits,
              diet: templateInput.diet,
              size: templateInput.size,
            });
          } else {
            templateObj = generateNpcStats(threatTier, {
              name: templateInput.name,
              race: templateInput.species || templateInput.race,
              weapon: templateInput.weapon,
              armor: templateInput.armor,
            });
          }
          if (templateInput.token_image_path && !templateObj.token_image_path) {
            templateObj.token_image_path = templateInput.token_image_path;
          }
        } else {
          templateObj = { ...templateInput };
        }
      } else {
        return res.status(400).json({ error: 'Either templateId or template object is required' });
      }

      if (!templateObj.template_id && templateObj.id) {
        templateObj.template_id = templateObj.id;
      }
      if (!templateObj.id && templateObj.template_id) {
        templateObj.id = templateObj.template_id;
      }

      const rawTemplateId = String(templateObj.template_id || '');
      if (
        !rawTemplateId ||
        !/^[a-zA-Z0-9_-]+$/.test(rawTemplateId) ||
        rawTemplateId.includes('..') ||
        rawTemplateId.includes('/') ||
        rawTemplateId.includes('\\')
      ) {
        return res.status(400).json({ error: 'Invalid template_id: invalid characters or path traversal rejected' });
      }

      // Handle token image assignment or fallback procedural generation.
      // When an existing uploaded image is chosen (source_image_url or template.token_image_path),
      // share the original filename directly instead of creating a duplicate $tokenname-t$TIER.png copy.
      const sourceDiskPath = resolveUploadDiskPath(source_image_url, effectiveUploadsDir);
      let existingTokenDiskPath = resolveUploadDiskPath(templateObj.token_image_path, effectiveUploadsDir);

      if (!sourceDiskPath && !existingTokenDiskPath && templateObj.name) {
        const siblingRow = db
          .prepare(
            "SELECT token_image_path FROM adversary_templates WHERE LOWER(name) = LOWER(?) AND id != ? AND token_image_path != '' ORDER BY updated_at DESC LIMIT 1"
          )
          .get(templateObj.name, rawTemplateId);
        if (siblingRow?.token_image_path) {
          const siblingDiskPath = resolveUploadDiskPath(siblingRow.token_image_path, effectiveUploadsDir);
          if (siblingDiskPath) {
            templateObj.token_image_path = normalizeUploadUrl(siblingRow.token_image_path);
            existingTokenDiskPath = siblingDiskPath;
          }
        }
      }

      if (sourceDiskPath) {
        templateObj.token_image_path = normalizeUploadUrl(source_image_url);
      } else if (existingTokenDiskPath && templateObj.token_image_path) {
        templateObj.token_image_path = normalizeUploadUrl(templateObj.token_image_path);
      } else {
        const tokensUploadDir = path.join(effectiveUploadsDir, 'tokens');
        if (!fs.existsSync(tokensUploadDir)) {
          fs.mkdirSync(tokensUploadDir, { recursive: true });
        }
        const safeTemplateId = path.basename(rawTemplateId);
        const tokenFileName = `${safeTemplateId}.png`;
        const tokenOutputPath = path.join(tokensUploadDir, tokenFileName);

        await generateTokenRingImage({
          outputPath: tokenOutputPath,
          threatTier: templateObj.threat_tier,
          category: templateObj.category,
          label: templateObj.name,
          size: 256,
        });
        templateObj.token_image_path = `/uploads/tokens/${tokenFileName}`;
      }

      const spawnLayer = (req.body.layer === 'gm' || req.body.options?.layer === 'gm') ? 'gm' : 'character';
      const result = await spawnAdversaries({
        db,
        io,
        mapId: Number(mapId),
        template: templateObj,
        count: Math.min(50, Math.max(1, parseInt(count, 10) || 1)),
        options: { layer: spawnLayer },
      });

      res.status(201).json(result);
    } catch (err) {
      console.error('Error spawning adversaries:', err);
      res.status(500).json({ error: 'Failed to spawn adversaries', message: err.message });
    }
  });

  // PATCH /api/adversaries/:id/token - Update template token image and sync active map tokens
  router.patch('/:id/token', requireGM(db), async (req, res) => {
    try {
      const templateId = req.params.id;
      if (
        !templateId ||
        !/^[a-zA-Z0-9_-]+$/.test(templateId) ||
        templateId.includes('..') ||
        templateId.includes('/') ||
        templateId.includes('\\')
      ) {
        return res.status(400).json({ error: 'Invalid template id: invalid characters or path traversal rejected' });
      }

      const row = db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(templateId);
      if (!row) {
        return res.status(404).json({ error: 'Adversary template not found' });
      }

      const { source_image_url, apply_all_tiers } = req.body || {};
      let newTokenPath;

      if (source_image_url) {
        const trimmedUrl = String(source_image_url).trim();
        if (/^https?:\/\//i.test(trimmedUrl)) {
          newTokenPath = trimmedUrl;
        } else {
          const sourceDiskPath = resolveUploadDiskPath(trimmedUrl, effectiveUploadsDir);
          if (!sourceDiskPath) {
            return res.status(400).json({ error: 'Source image file not found on disk' });
          }
          // Share the original uploaded filename directly without making a $tokenname-t$TIER duplicate
          newTokenPath = normalizeUploadUrl(trimmedUrl);
        }
      } else {
        const tokensUploadDir = path.join(effectiveUploadsDir, 'tokens');
        if (!fs.existsSync(tokensUploadDir)) {
          fs.mkdirSync(tokensUploadDir, { recursive: true });
        }
        const safeTemplateId = path.basename(templateId);
        const tokenFileName = `${safeTemplateId}.png`;
        const tokenOutputPath = path.join(tokensUploadDir, tokenFileName);

        await generateTokenRingImage({
          outputPath: tokenOutputPath,
          threatTier: row.threat_tier,
          category: row.category,
          label: row.name,
          size: 256,
        });
        newTokenPath = `/uploads/tokens/${tokenFileName}`;
      }
      let updateTokensResult = { changes: 0 };
      let updatedRow;
      let targetTemplateIds = [templateId];

      const updateAdversaryTokenTx = db.transaction(() => {
        if (apply_all_tiers && row.name) {
          const matchingRows = db
            .prepare('SELECT id FROM adversary_templates WHERE id = ? OR LOWER(name) = LOWER(?)')
            .all(templateId, row.name);
          targetTemplateIds = matchingRows.map((r) => r.id);
        }

        const updateTplStmt = db.prepare(`
          UPDATE adversary_templates
          SET token_image_path = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        const updateTokStmt = db.prepare(`
          UPDATE tokens
          SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP
          WHERE template_id = ?
        `);

        for (const tid of targetTemplateIds) {
          updateTplStmt.run(newTokenPath, tid);
          const tokRes = updateTokStmt.run(newTokenPath, tid);
          updateTokensResult.changes += tokRes.changes;
        }

        updatedRow = db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(templateId);
      });

      updateAdversaryTokenTx();

      const formattedTemplate = formatAdversary(updatedRow);
      const updatedTemplates = targetTemplateIds
        .map((tid) => db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(tid))
        .filter(Boolean)
        .map(formatAdversary);

      if (io) {
        for (const tpl of updatedTemplates) {
          io.emit('adversary:saved', { template: tpl });
        }
      }

      if (io && updateTokensResult.changes > 0) {
        const placeholders = targetTemplateIds.map(() => '?').join(', ');
        const affectedTokens = db
          .prepare(`SELECT * FROM tokens WHERE template_id IN (${placeholders})`)
          .all(...targetTemplateIds);
        for (const tRow of affectedTokens) {
          io.emit('token:updated', { token: formatToken(tRow, db) });
        }
      }

      res.json({
        template: formattedTemplate,
        updatedTemplates,
        updatedTokensCount: updateTokensResult.changes,
      });
    } catch (err) {
      console.error('Error updating adversary token:', err);
      res.status(500).json({ error: 'Failed to update adversary token', message: err.message });
    }
  });

  // DELETE /api/adversaries/:id
  router.delete('/:id', requireGM(db), (req, res) => {
    try {
      const existing = db.prepare('SELECT id FROM adversary_templates WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Adversary template not found' });
      }

      const deleteAdversaryTx = db.transaction((id) => {
        db.prepare('UPDATE tokens SET template_id = NULL WHERE template_id = ?').run(id);
        db.prepare('DELETE FROM adversary_templates WHERE id = ?').run(id);
      });
      deleteAdversaryTx(req.params.id);

      if (io) {
        io.emit('adversary:deleted', { id: req.params.id });
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting adversary:', err);
      res.status(500).json({ error: 'Failed to delete adversary template' });
    }
  });

  return router;
}
