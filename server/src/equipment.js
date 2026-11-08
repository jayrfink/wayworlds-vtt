import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, requireGM } from './middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_INVENTORY_PATH = path.join(__dirname, '../../data/inventory_items.json');

export function createEquipmentRouter(db, io, customPath = null) {
  const router = Router();
  const filePath = customPath || process.env.EQUIPMENT_JSON_PATH || DEFAULT_INVENTORY_PATH;

  function readItems() {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (err) {
      console.error('Error reading equipment file:', err);
    }
    return [];
  }

  function writeItems(items) {
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
  }

  // GET /api/equipment
  router.get('/', (req, res) => {
    try {
      const items = readItems();
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: 'Equipment list not found' });
    }
  });

  // POST /api/equipment (GM Only)
  router.post('/', requireAuth, requireGM(db), (req, res) => {
    try {
      const {
        name,
        category,
        weight_lbs,
        properties,
        damage_dice,
        armor_dr,
        attacker_pct_penalty,
        cost,
      } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Item name is required' });
      }

      const trimmedName = name.trim();
      const validCategories = ['Weapon', 'Armor', 'Shield', 'Gear', 'Kit'];
      const normalizedCat = validCategories.includes(category) ? category : 'Gear';

      const items = readItems();
      if (items.some(i => i.name.toLowerCase() === trimmedName.toLowerCase())) {
        return res.status(400).json({ error: 'An item with this name already exists' });
      }

      const newItem = {
        name: trimmedName,
        category: normalizedCat,
        weight_lbs: Number.isFinite(Number(weight_lbs)) ? Math.max(0, Number(weight_lbs)) : 0,
        properties: typeof properties === 'string' ? properties.trim() : '',
      };

      if (damage_dice && typeof damage_dice === 'string') {
        newItem.damage_dice = damage_dice.trim();
      }
      if (armor_dr !== undefined && armor_dr !== null && armor_dr !== '') {
        newItem.armor_dr = typeof armor_dr === 'number' ? armor_dr : String(armor_dr).trim();
      }
      if (attacker_pct_penalty !== undefined && attacker_pct_penalty !== null && attacker_pct_penalty !== '') {
        newItem.attacker_pct_penalty = Number(attacker_pct_penalty) || 0;
      }
      if (cost !== undefined && cost !== null && cost !== '') {
        newItem.cost = Number(cost) || 0;
      }

      items.push(newItem);
      writeItems(items);

      if (io) {
        io.emit('equipment:updated', items);
      }

      return res.status(201).json(newItem);
    } catch (err) {
      console.error('Error creating equipment:', err);
      return res.status(500).json({ error: 'Failed to create equipment item' });
    }
  });

  // DELETE /api/equipment/:name (GM Only)
  router.delete('/:name', requireAuth, requireGM(db), (req, res) => {
    try {
      const targetName = decodeURIComponent(req.params.name).trim();
      const items = readItems();
      const idx = items.findIndex(i => i.name.toLowerCase() === targetName.toLowerCase());

      if (idx === -1) {
        return res.status(404).json({ error: 'Equipment item not found' });
      }

      const removed = items.splice(idx, 1)[0];
      writeItems(items);

      if (io) {
        io.emit('equipment:updated', items);
      }

      return res.json({ success: true, deleted: removed.name });
    } catch (err) {
      console.error('Error deleting equipment:', err);
      return res.status(500).json({ error: 'Failed to delete equipment item' });
    }
  });

  return router;
}
