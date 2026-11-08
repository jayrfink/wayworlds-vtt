import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createApp } from '../src/index.js';
import { createDb } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('GET /api/spells - Wayworlds Spells & Martial Techniques Catalog', () => {
  let db;
  let server;
  let response;

  beforeAll(async () => {
    db = createDb(':memory:');
    const result = createApp(db, ':memory:');
    server = result.server;
    response = await request(result.app).get('/api/spells');
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

  it('contains canonical spell and technique examples across traditions', () => {
    expect(response.body.length).toBeGreaterThanOrEqual(10);
    const names = response.body.map(s => s.name);
    expect(names).toContain('Arcane Missile');
    expect(names).toContain('Crimson Lance');
    expect(names).toContain('Iron Palm Strike');
  });

  it('validates schema for all spell examples', () => {
    const validCategories = ['strike', 'blast', 'ward_heal', 'hex_summon'];
    for (const spell of response.body) {
      expect(typeof spell.name).toBe('string');
      expect(spell.name.trim().length).toBeGreaterThan(0);
      expect(typeof spell.tradition).toBe('string');
      expect(validCategories).toContain(spell.category);
      expect(typeof spell.default_tier).toBe('number');
      expect(spell.default_tier).toBeGreaterThanOrEqual(0);
      expect(typeof spell.range_area).toBe('string');
      expect(typeof spell.description).toBe('string');
    }
  });
});

describe('POST / PUT / DELETE /api/spells - GM-Only Authorization & Validation', () => {
  let testDb;
  let testApp;
  let gmAgent;
  let playerAgent;
  let tempFilePath;

  beforeAll(async () => {
    testDb = createDb(':memory:');
    tempFilePath = path.join(__dirname, 'test_spells.json');
    fs.writeFileSync(
      tempFilePath,
      JSON.stringify([
        {
          spell_id: 'sp_test_1',
          name: 'Test Missile',
          tradition: 'Arcane',
          category: 'strike',
          default_tier: 1,
          cost: 2,
          fuel: 'ess',
          range_area: '60 ft',
          description: 'A test projectile'
        }
      ], null, 2),
      'utf8'
    );
    process.env.SPELLS_JSON_PATH = tempFilePath;

    const result = createApp(testDb, ':memory:');
    testApp = result.app;

    gmAgent = request.agent(testApp);
    playerAgent = request.agent(testApp);

    await gmAgent.post('/api/auth/register').send({ username: 'spellgm', password: 'password123', role: 'GameMaster' });
    await gmAgent.post('/api/auth/login').send({ username: 'spellgm', password: 'password123' });

    await gmAgent.post('/api/auth/register').send({ username: 'spellplayer', password: 'password123', role: 'Player' });
    await playerAgent.post('/api/auth/login').send({ username: 'spellplayer', password: 'password123' });
  });

  afterAll(async () => {
    delete process.env.SPELLS_JSON_PATH;
    try {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    } catch {}
    if (testDb) testDb.close();
  });

  it('blocks unauthenticated requests to POST /api/spells with 401', async () => {
    const res = await request(testApp).post('/api/spells').send({ name: 'Shadow Bolt' });
    expect([401, 403]).toContain(res.status);
  });

  it('blocks non-GM players from POST /api/spells with 403', async () => {
    const res = await playerAgent.post('/api/spells').send({ name: 'Shadow Bolt', tradition: 'Shadow' });
    expect(res.status).toBe(403);
  });

  it('allows GM to create a new spell example via POST /api/spells', async () => {
    const res = await gmAgent.post('/api/spells').send({
      name: 'Shadow Bolt',
      tradition: 'Shadow',
      category: 'strike',
      default_tier: 2,
      range_area: '60 ft',
      description: 'Hurls an umbral bolt dealing cold damage.'
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Shadow Bolt');
    expect(res.body.tradition).toBe('Shadow');
    expect(res.body.default_tier).toBe(2);
    expect(res.body.cost).toBe(4);
    expect(res.body.fuel).toBe('ess');
  });

  it('prevents creating duplicate spell names with 400', async () => {
    const res = await gmAgent.post('/api/spells').send({
      name: 'Shadow Bolt',
      tradition: 'Shadow'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('allows GM to update a spell example via PUT /api/spells/:id', async () => {
    const res = await gmAgent.put('/api/spells/sp_test_1').send({
      description: 'Updated test projectile flavor text.'
    });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Updated test projectile flavor text.');
  });

  it('blocks non-GM player from deleting a spell example with 403', async () => {
    const res = await playerAgent.delete('/api/spells/sp_test_1');
    expect(res.status).toBe(403);
  });

  it('allows GM to delete a spell example via DELETE /api/spells/:id', async () => {
    const res = await gmAgent.delete('/api/spells/sp_test_1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(testApp).get('/api/spells');
    const ids = getRes.body.map(s => s.spell_id);
    expect(ids).not.toContain('sp_test_1');
  });
});
