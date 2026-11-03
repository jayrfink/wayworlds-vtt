import { Router } from 'express';
import { requireAuth, requireGM, isGameMaster } from './middleware.js';
import { hexToMiles, milesToHex } from './worldHex.js';

export const MARKER_TYPES = ['party', 'battle', 'faction', 'poi', 'hazard'];
const MAX_MILES = 1000000;

function isValidHexColor(c) {
  return typeof c === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c.trim());
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function formatWorldMarker(row) {
  if (!row) return null;
  return {
    ...row,
    hidden: Boolean(row.hidden),
    description: row.description || '',
    avatar_url: row.avatar_url || '',
  };
}

export function createWorldMarkerRouter(db, io) {
  const router = Router();
  router.use(requireAuth);

  function getMap(mapId) {
    return db.prepare('SELECT id, map_type, hex_miles FROM maps WHERE id = ?').get(mapId);
  }

  // Resolve a coordinate set. Supplying q/r takes precedence over miles.
  function resolvePosition(body, hexMiles, fallback = { x_miles: 0, y_miles: 0, hex_q: 0, hex_r: 0 }) {
    const q = num(body.hex_q);
    const r = num(body.hex_r);
    const x = num(body.x_miles);
    const y = num(body.y_miles);
    if (q !== null && r !== null) {
      const cq = Math.round(q);
      const cr = Math.round(r);
      return { hex_q: cq, hex_r: cr, ...hexToMiles(cq, cr, hexMiles) };
    }
    if (x !== null && y !== null) {
      const cx = Math.max(-MAX_MILES, Math.min(MAX_MILES, x));
      const cy = Math.max(-MAX_MILES, Math.min(MAX_MILES, y));
      const hex = milesToHex(cx, cy, hexMiles);
      return { x_miles: cx, y_miles: cy, hex_q: hex.q, hex_r: hex.r };
    }
    return fallback;
  }

  function validateLink(linkedMapId) {
    if (linkedMapId === null || linkedMapId === undefined || linkedMapId === '') return { ok: true, id: null };
    const id = Number(linkedMapId);
    const target = Number.isInteger(id) ? getMap(id) : null;
    if (!target) return { ok: false, error: 'linked_map_id does not reference an existing map' };
    if (target.map_type !== 'rpg') return { ok: false, error: 'linked_map_id must reference a Tactical VTT (rpg) map' };
    return { ok: true, id };
  }

  // GET /api/world-markers?map_id=
  router.get('/', (req, res) => {
    try {
      const mapId = Number(req.query.map_id);
      if (!Number.isInteger(mapId)) {
        return res.status(400).json({ error: 'map_id is required' });
      }
      let rows = db.prepare('SELECT * FROM world_markers WHERE map_id = ? ORDER BY id ASC').all(mapId);
      if (!isGameMaster(db, req.session?.userId)) {
        rows = rows.filter(r => !r.hidden);
      }
      res.json(rows.map(formatWorldMarker));
    } catch (err) {
      console.error('Error listing world markers:', err);
      res.status(500).json({ error: 'Failed to list world markers' });
    }
  });

  // POST /api/world-markers (GM only)
  router.post('/', requireGM(db), (req, res) => {
    try {
      const {
        map_id, marker_type = 'poi', name, description = '', color = '#4fc3f7',
        avatar_url = '', hidden = false, owner_user_id = null, linked_map_id = null,
      } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'name is required' });
      }
      if (!MARKER_TYPES.includes(marker_type)) {
        return res.status(400).json({ error: `marker_type must be one of: ${MARKER_TYPES.join(', ')}` });
      }
      if (color && !isValidHexColor(color)) {
        return res.status(400).json({ error: 'Invalid color format. Hex color required (e.g. #333333 or #fff)' });
      }
      const map = getMap(map_id);
      if (!map) return res.status(404).json({ error: 'Map not found' });
      if (map.map_type !== 'world') {
        return res.status(400).json({ error: 'Markers can only be placed on world maps' });
      }
      const link = validateLink(linked_map_id);
      if (!link.ok) return res.status(400).json({ error: link.error });

      let ownerId = null;
      if (owner_user_id !== null && owner_user_id !== undefined && owner_user_id !== '') {
        ownerId = Number(owner_user_id);
        if (!Number.isInteger(ownerId) || !db.prepare('SELECT id FROM users WHERE id = ?').get(ownerId)) {
          return res.status(400).json({ error: 'owner_user_id does not reference an existing user' });
        }
      }

      const pos = resolvePosition(req.body, map.hex_miles ?? 6);
      const result = db.prepare(`
        INSERT INTO world_markers (
          map_id, marker_type, name, description, color, avatar_url, x_miles, y_miles,
          hex_q, hex_r, linked_map_id, owner_user_id, hidden
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        map.id, marker_type, name.trim(), String(description || ''), (color || '#4fc3f7').trim(), String(avatar_url || ''),
        pos.x_miles, pos.y_miles, pos.hex_q, pos.hex_r, link.id, ownerId, hidden ? 1 : 0
      );

      const marker = formatWorldMarker(db.prepare('SELECT * FROM world_markers WHERE id = ?').get(result.lastInsertRowid));
      if (io) {
        if (marker.hidden) io.to('role:GameMaster').emit('world-marker:created', { marker });
        else io.emit('world-marker:created', { marker });
      }
      res.status(201).json(marker);
    } catch (err) {
      console.error('Error creating world marker:', err);
      res.status(500).json({ error: 'Failed to create world marker' });
    }
  });

  // PUT /api/world-markers/:id
  // GM: full edit. Player: may only reposition the visible party marker they own.
  router.put('/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM world_markers WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'World marker not found' });

      const isGM = isGameMaster(db, req.session.userId);
      const isOwnParty = existing.marker_type === 'party' && existing.owner_user_id === req.session.userId && !existing.hidden;
      if (!isGM && !isOwnParty) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const map = getMap(existing.map_id);
      const hexMiles = map?.hex_miles ?? 6;
      const pos = resolvePosition(req.body, hexMiles, {
        x_miles: existing.x_miles, y_miles: existing.y_miles, hex_q: existing.hex_q, hex_r: existing.hex_r,
      });

      let next = { ...existing, ...pos };

      if (isGM) {
        if (req.body.marker_type !== undefined) {
          if (!MARKER_TYPES.includes(req.body.marker_type)) {
            return res.status(400).json({ error: `marker_type must be one of: ${MARKER_TYPES.join(', ')}` });
          }
          next.marker_type = req.body.marker_type;
        }
        if (req.body.name !== undefined) {
          if (!req.body.name || !String(req.body.name).trim()) return res.status(400).json({ error: 'name is required' });
          next.name = String(req.body.name).trim();
        }
        if (req.body.description !== undefined) next.description = String(req.body.description || '');
        if (req.body.color !== undefined && req.body.color) {
          if (!isValidHexColor(req.body.color)) {
            return res.status(400).json({ error: 'Invalid color format. Hex color required (e.g. #333333 or #fff)' });
          }
          next.color = req.body.color.trim();
        }
        if (req.body.avatar_url !== undefined) next.avatar_url = String(req.body.avatar_url || '');
        if (req.body.hidden !== undefined) next.hidden = req.body.hidden ? 1 : 0;
        if (req.body.linked_map_id !== undefined) {
          const link = validateLink(req.body.linked_map_id);
          if (!link.ok) return res.status(400).json({ error: link.error });
          next.linked_map_id = link.id;
        }
        if (req.body.owner_user_id !== undefined) {
          if (req.body.owner_user_id === null || req.body.owner_user_id === '') {
            next.owner_user_id = null;
          } else {
            const ownerId = Number(req.body.owner_user_id);
            if (!Number.isInteger(ownerId) || !db.prepare('SELECT id FROM users WHERE id = ?').get(ownerId)) {
              return res.status(400).json({ error: 'owner_user_id does not reference an existing user' });
            }
            next.owner_user_id = ownerId;
          }
        }
      }

      db.prepare(`
        UPDATE world_markers SET
          marker_type = ?, name = ?, description = ?, color = ?, avatar_url = ?,
          x_miles = ?, y_miles = ?, hex_q = ?, hex_r = ?, linked_map_id = ?, owner_user_id = ?, hidden = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        next.marker_type, next.name, next.description, next.color, next.avatar_url,
        next.x_miles, next.y_miles, next.hex_q, next.hex_r, next.linked_map_id, next.owner_user_id, next.hidden ? 1 : 0,
        existing.id
      );

      const marker = formatWorldMarker(db.prepare('SELECT * FROM world_markers WHERE id = ?').get(existing.id));
      if (io) {
        if (marker.hidden) {
          io.to('role:GameMaster').emit('world-marker:updated', { marker });
          if (!existing.hidden) io.except('role:GameMaster').emit('world-marker:deleted', { id: marker.id, map_id: marker.map_id });
        } else if (existing.hidden) {
          io.to('role:GameMaster').emit('world-marker:updated', { marker });
          io.except('role:GameMaster').emit('world-marker:created', { marker });
        } else {
          io.emit('world-marker:updated', { marker });
        }
      }
      res.json(marker);
    } catch (err) {
      console.error('Error updating world marker:', err);
      res.status(500).json({ error: 'Failed to update world marker' });
    }
  });

  // DELETE /api/world-markers/:id (GM only)
  router.delete('/:id', requireGM(db), (req, res) => {
    try {
      const existing = db.prepare('SELECT id, map_id, hidden FROM world_markers WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'World marker not found' });
      db.prepare('DELETE FROM world_markers WHERE id = ?').run(existing.id);
      if (io) {
        const payload = { id: existing.id, map_id: existing.map_id };
        if (existing.hidden) io.to('role:GameMaster').emit('world-marker:deleted', payload);
        else io.emit('world-marker:deleted', payload);
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('Error deleting world marker:', err);
      res.status(500).json({ error: 'Failed to delete world marker' });
    }
  });

  return router;
}
