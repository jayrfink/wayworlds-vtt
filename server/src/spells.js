import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, requireGM } from './middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_SPELLS_PATH = path.join(__dirname, '../../data/spell_examples.json');

export const VALID_TRADITIONS = [
  'Arcane',
  'Blood',
  'Shadow',
  'Demonology',
  'Necromancy',
  'Eldritch',
  'Druidic',
  'Spiritual',
  'Ki',
  'Warg',
  'Witchcraft',
];

export const VALID_CATEGORIES = ['strike', 'blast', 'ward_heal', 'hex_summon'];

export function createSpellsRouter(db, io, customPath = null) {
  const router = Router();
  const filePath = customPath || process.env.SPELLS_JSON_PATH || DEFAULT_SPELLS_PATH;

  function readSpells() {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading spell examples file:', err);
    }
    return [];
  }

  function writeSpells(spells) {
    fs.writeFileSync(filePath, JSON.stringify(spells, null, 2), 'utf8');
  }

  // GET /api/spells - list all spell & martial technique examples
  router.get('/', (req, res) => {
    try {
      const spells = readSpells();
      res.json(spells);
    } catch {
      res.status(500).json({ error: 'Failed to read spell examples' });
    }
  });

  // POST /api/spells - add a new example (GM only)
  router.post('/', requireAuth, requireGM(db), (req, res) => {
    try {
      const {
        name,
        tradition,
        category,
        default_tier,
        range_area,
        description,
        cost,
        fuel,
      } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Spell name is required' });
      }

      const trimmedName = name.trim();
      const spells = readSpells();

      if (spells.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
        return res.status(400).json({ error: 'A spell or technique with this name already exists' });
      }

      const normTradition = VALID_TRADITIONS.find(
        t => t.toLowerCase() === String(tradition || '').toLowerCase()
      ) || 'Arcane';

      const normCategory = VALID_CATEGORIES.includes(category) ? category : 'strike';
      const tierNum = Math.max(0, Math.min(6, parseInt(default_tier, 10) || 0));
      const fuelType = (normTradition === 'Blood' || normTradition === 'Warg') ? 'sta' : (fuel === 'sta' ? 'sta' : 'ess');
      const calculatedCost = Number.isFinite(Number(cost)) ? Number(cost) : tierNum * 2;

      const newSpell = {
        spell_id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: trimmedName,
        tradition: normTradition,
        category: normCategory,
        default_tier: tierNum,
        cost: calculatedCost,
        fuel: fuelType,
        range_area: typeof range_area === 'string' && range_area.trim() ? range_area.trim() : '60 ft',
        description: typeof description === 'string' ? description.trim() : '',
      };

      spells.push(newSpell);
      writeSpells(spells);

      if (io) {
        io.emit('spells:updated', spells);
      }

      return res.status(201).json(newSpell);
    } catch (err) {
      console.error('Error adding spell example:', err);
      return res.status(500).json({ error: 'Failed to save spell example' });
    }
  });

  // PUT /api/spells/:id - update an example (GM only)
  router.put('/:id', requireAuth, requireGM(db), (req, res) => {
    try {
      const spellId = req.params.id;
      const spells = readSpells();
      const idx = spells.findIndex(s => s.spell_id === spellId || s.name === spellId);

      if (idx === -1) {
        return res.status(404).json({ error: 'Spell example not found' });
      }

      const {
        name,
        tradition,
        category,
        default_tier,
        range_area,
        description,
        cost,
        fuel,
      } = req.body;

      if (name && typeof name === 'string' && name.trim()) {
        spells[idx].name = name.trim();
      }

      if (tradition) {
        const norm = VALID_TRADITIONS.find(t => t.toLowerCase() === String(tradition).toLowerCase());
        if (norm) spells[idx].tradition = norm;
      }

      if (category && VALID_CATEGORIES.includes(category)) {
        spells[idx].category = category;
      }

      if (default_tier !== undefined) {
        spells[idx].default_tier = Math.max(0, Math.min(6, parseInt(default_tier, 10) || 0));
        spells[idx].cost = spells[idx].default_tier * 2;
      }

      if (cost !== undefined && Number.isFinite(Number(cost))) {
        spells[idx].cost = Number(cost);
      }

      if (fuel !== undefined) {
        spells[idx].fuel = fuel === 'sta' ? 'sta' : 'ess';
      }

      if (range_area !== undefined && typeof range_area === 'string') {
        spells[idx].range_area = range_area.trim();
      }

      if (description !== undefined && typeof description === 'string') {
        spells[idx].description = description.trim();
      }

      writeSpells(spells);

      if (io) {
        io.emit('spells:updated', spells);
      }

      return res.json(spells[idx]);
    } catch (err) {
      console.error('Error updating spell example:', err);
      return res.status(500).json({ error: 'Failed to update spell example' });
    }
  });

  // DELETE /api/spells/:id - delete an example (GM only)
  router.delete('/:id', requireAuth, requireGM(db), (req, res) => {
    try {
      const spellId = req.params.id;
      const spells = readSpells();
      const idx = spells.findIndex(s => s.spell_id === spellId || s.name === spellId);

      if (idx === -1) {
        return res.status(404).json({ error: 'Spell example not found' });
      }

      const [removed] = spells.splice(idx, 1);
      writeSpells(spells);

      if (io) {
        io.emit('spells:updated', spells);
      }

      return res.json({ success: true, removed });
    } catch (err) {
      console.error('Error deleting spell example:', err);
      return res.status(500).json({ error: 'Failed to delete spell example' });
    }
  });

  return router;
}
