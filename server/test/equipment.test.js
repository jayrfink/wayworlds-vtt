import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { createDb } from '../src/db.js';

describe('GET /api/equipment - Wayworlds Fantasy Equipment Catalog', () => {
  let db;
  let server;
  let response;
  const ALLOWED_CATEGORIES = ['Weapon', 'Armor', 'Shield', 'Kit', 'Gear'];

  beforeAll(async () => {
    db = createDb(':memory:');
    const result = createApp(db, ':memory:');
    server = result.server;
    response = await request(result.app).get('/api/equipment');
  });

  afterAll(() => {
    if (db) db.close();
    if (server && server.close) server.close();
  });

  it('returns HTTP 200 with JSON content', () => {
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('contains the canonical fantasy equipment items', () => {
    expect(response.body.length).toBeGreaterThanOrEqual(18);
  });

  it('validates that every item matches the equipment schema', () => {
    const names = new Set();
    for (const item of response.body) {
      expect(typeof item.name).toBe('string');
      expect(item.name.trim().length).toBeGreaterThan(0);
      expect(names.has(item.name)).toBe(false);
      names.add(item.name);

      expect(ALLOWED_CATEGORIES).toContain(item.category);

      expect(typeof item.weight_lbs).toBe('number');
      expect(item.weight_lbs).toBeGreaterThanOrEqual(0);

      expect(typeof item.properties).toBe('string');
      expect(item.properties.trim().length).toBeGreaterThan(0);

      if (item.category === 'Weapon') {
        expect(item.damage_dice).toMatch(/^\d+d\d+/);
      }
    }
  });

  it('verifies representative weapons', () => {
    const names = response.body.map(i => i.name);
    for (const n of ['Dagger', 'Shortsword', 'Spear', 'Longsword', 'BattleAxe', 'Broadsword',
      'Bastard Sword', 'Greatsword', 'Greataxe', 'Shortbow', 'Longbow']) {
      expect(names).toContain(n);
    }
  });

  it('verifies representative armor, shields, and kits', () => {
    const names = response.body.map(i => i.name);
    for (const n of ['Padded Armor', 'Leather Armor', 'Hide Armor', 'Studded Leather Armor', 'Chain Mail', 'Chainmail', 'Breastplate', 'Scale Mail', 'Banded Mail', 'Full Plate', 'Full Plate Armor', 'Mythril Armor', 'Shield',
      'Herbalism Kit', 'Medic Kit', 'Artisan Tool Kit']) {
      expect(names).toContain(n);
    }
  });

  it('validates exact stats for key items', () => {
    const itemMap = new Map(response.body.map(i => [i.name, i]));

    const longsword = itemMap.get('Longsword');
    expect(longsword.category).toBe('Weapon');
    expect(longsword.weight_lbs).toBe(3);
    expect(longsword.damage_dice).toBe('2d10');
    expect(longsword.properties).toContain('Versatile (3d10)');

    const greatsword = itemMap.get('Greatsword');
    expect(greatsword.damage_dice).toBe('3d10');
    expect(greatsword.weight_lbs).toBe(6);

    const padded = itemMap.get('Padded Armor');
    expect(padded.category).toBe('Armor');
    expect(padded.armor_dr).toBe(2);
    expect(padded.properties).toBe('-2 any non-magical attack');

    const leather = itemMap.get('Leather Armor');
    expect(leather.category).toBe('Armor');
    expect(leather.armor_dr).toBe(4);
    expect(leather.weight_lbs).toBe(10);
    expect(leather.properties).toBe('-4 any non magical attack');

    const hide = itemMap.get('Hide Armor');
    expect(hide.category).toBe('Armor');
    expect(hide.armor_dr).toBe(4);
    expect(hide.properties).toBe('-4 any non magical attack');

    const studded = itemMap.get('Studded Leather Armor');
    expect(studded.category).toBe('Armor');
    expect(studded.armor_dr).toBe(5);
    expect(studded.properties).toBe('-5 any non magic attack');

    const chain = itemMap.get('Chain Mail');
    expect(chain.category).toBe('Armor');
    expect(chain.armor_dr).toBe('half_nonmagical');
    expect(chain.properties).toBe('Halves any non magical damage');

    const plate = itemMap.get('Full Plate');
    expect(plate.armor_dr).toBe('half_all');
    expect(plate.attacker_pct_penalty).toBe(-10);
    expect(plate.weight_lbs).toBe(50);
    expect(plate.properties).toBe('Halves any damage and -10% to attackers roll of any non magical attack');

    const mythril = itemMap.get('Mythril Armor');
    expect(mythril.category).toBe('Armor');
    expect(mythril.armor_dr).toBe('half_all');
    expect(mythril.attacker_pct_penalty).toBe(-10);
    expect(mythril.properties).toBe('Halves any damage and -10% to attackers roll of any non magical attack');

    const shield = itemMap.get('Shield');
    expect(shield.category).toBe('Shield');
    expect(shield.attacker_pct_penalty).toBe(-10);

    const medic = itemMap.get('Medic Kit');
    expect(medic.category).toBe('Kit');
    expect(medic.weight_lbs).toBe(2);
  });

  describe('GM Equipment Management (POST & DELETE)', () => {
    let gmAgent;
    let playerAgent;
    let testApp;
    let testDb;
    let tempFilePath;

    beforeAll(async () => {
      const fsModule = await import('fs');
      const osModule = await import('os');
      const pathModule = await import('path');

      tempFilePath = pathModule.join(osModule.tmpdir(), `test-equipment-${Date.now()}.json`);
      const canonicalData = fsModule.readFileSync(pathModule.join(__dirname, '../../data/inventory_items.json'), 'utf8');
      fsModule.writeFileSync(tempFilePath, canonicalData, 'utf8');
      process.env.EQUIPMENT_JSON_PATH = tempFilePath;

      testDb = createDb(':memory:');
      const result = createApp(testDb, ':memory:');
      testApp = result.app;

      gmAgent = request.agent(testApp);
      playerAgent = request.agent(testApp);

      // Register GM and Player
      await gmAgent.post('/api/auth/register').send({ username: 'eqgm', password: 'password123', role: 'GameMaster' });
      await gmAgent.post('/api/auth/login').send({ username: 'eqgm', password: 'password123' });

      await gmAgent.post('/api/auth/register').send({ username: 'eqplayer', password: 'password123', role: 'Player' });
      await playerAgent.post('/api/auth/login').send({ username: 'eqplayer', password: 'password123' });
    });

    afterAll(async () => {
      delete process.env.EQUIPMENT_JSON_PATH;
      const fsModule = await import('fs');
      try {
        if (fsModule.existsSync(tempFilePath)) fsModule.unlinkSync(tempFilePath);
      } catch {}
      if (testDb) testDb.close();
    });

    it('blocks unauthenticated requests to POST /api/equipment', async () => {
      const res = await request(testApp).post('/api/equipment').send({ name: 'Halberd' });
      expect([401, 403]).toContain(res.status);
    });

    it('blocks non-GM players from POST /api/equipment', async () => {
      const res = await playerAgent.post('/api/equipment').send({ name: 'Halberd', category: 'Weapon' });
      expect(res.status).toBe(403);
    });

    it('allows GM to create a new Weapon', async () => {
      const res = await gmAgent.post('/api/equipment').send({
        name: 'Halberd',
        category: 'Weapon',
        weight_lbs: 6,
        damage_dice: '2d10',
        properties: 'Reach, Heavy, Two-Handed',
        cost: 20
      });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Halberd');
      expect(res.body.category).toBe('Weapon');
      expect(res.body.weight_lbs).toBe(6);
      expect(res.body.damage_dice).toBe('2d10');
    });

    it('prevents creating duplicate items with the same name', async () => {
      const res = await gmAgent.post('/api/equipment').send({
        name: 'Halberd',
        category: 'Weapon'
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('allows GM to create a new Armor item', async () => {
      const res = await gmAgent.post('/api/equipment').send({
        name: 'Tower Shield',
        category: 'Shield',
        weight_lbs: 12,
        attacker_pct_penalty: -15,
        properties: 'Massive Pavise Deflection (-15% to incoming attacks)'
      });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Tower Shield');
      expect(res.body.category).toBe('Shield');
    });

    it('allows GM to update an existing equipment item via PUT', async () => {
      const res = await gmAgent.put(`/api/equipment/${encodeURIComponent('Halberd')}`).send({
        name: 'Grand Halberd',
        category: 'Weapon',
        weight_lbs: 7,
        damage_dice: '3d10',
        properties: 'Polearm, Heavy Reach',
        cost: 35,
      });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Grand Halberd');
      expect(res.body.damage_dice).toBe('3d10');
      expect(res.body.weight_lbs).toBe(7);
      expect(res.body.cost).toBe(35);

      // Verify update persisted
      const getRes = await gmAgent.get('/api/equipment');
      const updated = getRes.body.find(i => i.name === 'Grand Halberd');
      expect(updated).toBeDefined();
      expect(updated.damage_dice).toBe('3d10');
    });

    it('blocks non-GM players from PUT /api/equipment/:name', async () => {
      const res = await playerAgent.put(`/api/equipment/${encodeURIComponent('Grand Halberd')}`).send({
        name: 'Hacked Halberd',
      });
      expect(res.status).toBe(403);
    });

    it('returns 404 on PUT /api/equipment/:name for nonexistent item', async () => {
      const res = await gmAgent.put(`/api/equipment/${encodeURIComponent('NonexistentItem')}`).send({
        name: 'Something',
      });
      expect(res.status).toBe(404);
    });

    it('prevents renaming equipment to an already existing other item', async () => {
      const res = await gmAgent.put(`/api/equipment/${encodeURIComponent('Grand Halberd')}`).send({
        name: 'Dagger',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('allows GM to delete an equipment item', async () => {
      const res = await gmAgent.delete(`/api/equipment/${encodeURIComponent('Tower Shield')}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.deleted).toBe('Tower Shield');

      // Verify it is gone
      const getRes = await gmAgent.get('/api/equipment');
      expect(getRes.body.some(i => i.name === 'Tower Shield')).toBe(false);
    });
  });
});
