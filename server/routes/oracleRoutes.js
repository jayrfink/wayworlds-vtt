/**
 * GM-Only Narrative Oracle & Arc Engine Router
 * Wayworlds VTT - Dark Gothic Fantasy
 *
 * All routes strictly protected by requireAuth and requireGM middleware.
 */

import { Router } from 'express';
import { requireAuth, requireGM } from '../src/middleware.js';
import {
  generatePrompt,
  logManualNarrative,
  createArc,
  getInitData,
  clearSessionLogs,
} from '../services/oracleService.js';

export function createOracleRouter(db, io = null) {
  const router = Router();

  // Strict GM-Only Access Control on all Oracle endpoints
  router.use(requireAuth, requireGM(db));

  // GET /api/oracle/init - Fetch environments, arcs, and recent session logs
  router.get('/init', (req, res) => {
    try {
      const data = getInitData({ db });
      res.json(data);
    } catch (err) {
      console.error('Error fetching oracle init data:', err);
      res.status(500).json({ error: 'Failed to fetch oracle initialization data' });
    }
  });

  // POST /api/oracle/generate - Procedurally generate a narrative prompt
  router.post('/generate', (req, res) => {
    try {
      const {
        environmentId,
        arcId,
        contextType = 'explore',
        resolutionOutcome = 'any',
        directiveText = '',
      } = req.body || {};

      if (!environmentId) {
        return res.status(400).json({ error: 'environmentId is required' });
      }

      const log = generatePrompt({
        db,
        environmentId: Number(environmentId),
        arcId: arcId ? Number(arcId) : null,
        contextType,
        resolutionOutcome,
        directiveText,
      });

      // Broadcast exclusively to GameMasters
      if (io) {
        io.to('role:GameMaster').emit('oracle:log_added', log);
      }

      res.status(201).json(log);
    } catch (err) {
      console.error('Error generating oracle prompt:', err);
      res.status(500).json({ error: err.message || 'Failed to generate narrative prompt' });
    }
  });

  // POST /api/oracle/log - Log a manual GM narrative note
  router.post('/log', (req, res) => {
    try {
      const { environmentId, arcId, textContent, contextType = 'custom' } = req.body || {};

      if (!textContent || typeof textContent !== 'string' || !textContent.trim()) {
        return res.status(400).json({ error: 'textContent is required' });
      }

      const log = logManualNarrative({
        db,
        environmentId: environmentId ? Number(environmentId) : null,
        arcId: arcId ? Number(arcId) : null,
        textContent,
        contextType,
      });

      // Broadcast exclusively to GameMasters
      if (io) {
        io.to('role:GameMaster').emit('oracle:log_added', log);
      }

      res.status(201).json(log);
    } catch (err) {
      console.error('Error logging manual narrative:', err);
      res.status(500).json({ error: err.message || 'Failed to log manual narrative' });
    }
  });

  // POST /api/oracle/arcs - Create a new custom Narrative Arc
  router.post('/arcs', (req, res) => {
    try {
      const { environmentId, title, synopsis = '', fragments = [] } = req.body || {};

      if (!environmentId) {
        return res.status(400).json({ error: 'environmentId is required' });
      }
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'title is required' });
      }

      const arc = createArc({
        db,
        environmentId: Number(environmentId),
        title,
        synopsis,
        fragments,
      });

      // Broadcast arc creation to GameMasters
      if (io) {
        io.to('role:GameMaster').emit('oracle:arc_created', arc);
      }

      res.status(201).json(arc);
    } catch (err) {
      console.error('Error creating narrative arc:', err);
      res.status(500).json({ error: err.message || 'Failed to create narrative arc' });
    }
  });

  // DELETE /api/oracle/logs - Clear GM session logs
  router.delete('/logs', (req, res) => {
    try {
      const result = clearSessionLogs({ db });

      // Notify GameMasters
      if (io) {
        io.to('role:GameMaster').emit('oracle:logs_cleared');
      }

      res.json(result);
    } catch (err) {
      console.error('Error clearing oracle logs:', err);
      res.status(500).json({ error: 'Failed to clear oracle session logs' });
    }
  });

  // POST /api/oracle/share - Explicit GM action to broadcast a narrative entry to Public Chat
  router.post('/share', (req, res) => {
    try {
      const { textContent, source = 'engine' } = req.body || {};
      if (!textContent || typeof textContent !== 'string' || !textContent.trim()) {
        return res.status(400).json({ error: 'textContent is required' });
      }

      const payload = {
        text: textContent.trim(),
        source,
        timestamp: new Date().toISOString(),
        sender: 'Game Master',
      };

      if (io) {
        // Broadcast publicly to all connected player and GM clients
        io.emit('oracle:public_message', payload);
      }

      res.json({ success: true, shared: payload });
    } catch (err) {
      console.error('Error sharing oracle message:', err);
      res.status(500).json({ error: 'Failed to share message to public chat' });
    }
  });

  return router;
}
