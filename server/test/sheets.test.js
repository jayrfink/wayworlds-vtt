import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createTestDb, createDb } from '../src/db.js';
import { createApp } from '../src/index.js';

describe('Sheets API & Socket.io', () => {
  let db, app, server, io;

  beforeEach(() => {
    db = createTestDb();
    const result = createApp(db, ':memory:');
    app = result.app;
    server = result.server;
    io = result.io;
  });

  afterEach(() => {
    if (db) db.close();
    if (server && server.close) server.close();
  });

  describe('Character Sheets API', () => {
    it('creates and lists character sheets', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const emitSpy = vi.spyOn(io, 'emit');

      const createRes = await agent.post('/api/characters').send({
        name: 'Wilks',
        race: 'Vrusk',
        str: 45, sta: 50, current_sta: 50, dex: 60, rs: 55,
        int_stat: 50, log_stat: 50, per: 40, ldr: 40,
        skills: [{ name: 'Gyropistol', level: 2 }],
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe('Wilks');
      expect(createRes.body.race).toBe('Vrusk');
      expect(createRes.body.skills).toEqual([{ name: 'Gyropistol', level: 2 }]);
      expect(emitSpy).toHaveBeenCalledWith('sheet:created', {
        type: 'character',
        sheet: expect.objectContaining({ name: 'Wilks', race: 'Vrusk' }),
      });

      const listRes = await agent.get('/api/characters');
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].name).toBe('Wilks');
    });

    it('gets character sheet by id', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const createRes = await agent.post('/api/characters').send({
        name: 'Jane',
        race: 'Human',
      });
      const charId = createRes.body.id;

      const getRes = await agent.get(`/api/characters/${charId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.name).toBe('Jane');
      expect(getRes.body.race).toBe('Human');
    });

    it('returns 404 for non-existent character', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await agent.get('/api/characters/999');
      expect(res.status).toBe(404);
    });

    it('updates character sheet and emits sheet:updated', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const createRes = await agent.post('/api/characters').send({
        name: 'Wilks',
        race: 'Vrusk',
        sta: 50,
        current_sta: 50,
      });
      const charId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const updateRes = await agent.put(`/api/characters/${charId}`).send({
        current_sta: 30,
        notes: 'Injured in combat',
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.current_sta).toBe(30);
      expect(updateRes.body.notes).toBe('Injured in combat');
      expect(emitSpy).toHaveBeenCalledWith('sheet:updated', {
        type: 'character',
        sheet: expect.objectContaining({ id: charId, current_sta: 30 }),
      });
    });

    it('creates character with specified PSA and allows updating PSA', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      // Create with Magic PSA
      const createRes = await agent.post('/api/characters').send({
        name: 'Magic Specialist',
        race: 'Yazirian',
        psa: 'Magic',
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.psa).toBe('Magic');
      const charId = createRes.body.id;

      // Fetch by ID
      const getRes = await agent.get(`/api/characters/${charId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.psa).toBe('Magic');

      // Update to Theurgy PSA
      const emitSpy = vi.spyOn(io, 'emit');
      const updateRes = await agent.put(`/api/characters/${charId}`).send({
        psa: 'Theurgy',
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.psa).toBe('Theurgy');
      expect(emitSpy).toHaveBeenCalledWith('sheet:updated', {
        type: 'character',
        sheet: expect.objectContaining({ id: charId, psa: 'Theurgy' }),
      });

      // Verify persistence via GET
      const verifyRes = await agent.get(`/api/characters/${charId}`);
      expect(verifyRes.body.psa).toBe('Theurgy');

      // Update to Combat PSA
      const updateCombatRes = await agent.put(`/api/characters/${charId}`).send({
        psa: 'Combat',
      });
      expect(updateCombatRes.status).toBe(200);
      expect(updateCombatRes.body.psa).toBe('Combat');

      // Also verifies legacy PSA input maps automatically
      const legacyRes = await agent.put(`/api/characters/${charId}`).send({
        psa: 'Technological',
      });
      expect(legacyRes.status).toBe(200);
      expect(legacyRes.body.psa).toBe('Magic');
    });

    it('manages max_ess and current_ess, clamps them, and cascades current_ess to active map tokens', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      // Default values when not specified
      const res1 = await agent.post('/api/characters').send({ name: 'DefaultESS', race: 'Human' });
      expect(res1.status).toBe(201);
      expect(res1.body.max_ess).toBe(50);
      expect(res1.body.current_ess).toBe(50);

      // Create with explicit ESS
      const createRes = await agent.post('/api/characters').send({
        name: 'Garth',
        race: 'Dralasite',
        max_ess: 100,
        current_ess: 75,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.max_ess).toBe(100);
      expect(createRes.body.current_ess).toBe(75);
      const charId = createRes.body.id;

      // Create a map and token linked to Garth
      const mapStmt = db.prepare("INSERT INTO maps (user_id, name, width, height) VALUES (1, 'Arena', 20, 20)");
      const mapInfo = mapStmt.run();
      const tokenStmt = db.prepare(`
        INSERT INTO tokens (map_id, character_id, name, ess_current)
        VALUES (?, ?, 'Garth Token', 75)
      `);
      const tokenInfo = tokenStmt.run(mapInfo.lastInsertRowid, charId);

      const emitSpy = vi.spyOn(io, 'emit');

      // Update current_ess (spend 15 ESS)
      const updateRes = await agent.put(`/api/characters/${charId}`).send({
        current_ess: 60,
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.current_ess).toBe(60);

      // Verify token.ess_current was cascaded
      const tokenAfter = db.prepare('SELECT ess_current FROM tokens WHERE id = ?').get(tokenInfo.lastInsertRowid);
      expect(tokenAfter.ess_current).toBe(60);
      expect(emitSpy).toHaveBeenCalledWith('token:updated', expect.objectContaining({
        token: expect.objectContaining({ id: tokenInfo.lastInsertRowid, ess_current: 60 }),
      }));

      // Clamps current_ess between 0 and max_ess
      const clampLow = await agent.put(`/api/characters/${charId}`).send({ current_ess: -10 });
      expect(clampLow.body.current_ess).toBe(0);

      const clampHigh = await agent.put(`/api/characters/${charId}`).send({ current_ess: 500 });
      expect(clampHigh.body.current_ess).toBe(100);
    });

    it('manages current_xp on create and update, default 0 and clamps to min 0', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      // Default value when not specified
      const res1 = await agent.post('/api/characters').send({ name: 'DefaultXP', race: 'Human' });
      expect(res1.status).toBe(201);
      expect(res1.body.current_xp).toBe(0);

      // Verify GET returns current_xp
      const listRes = await agent.get('/api/characters');
      const found = listRes.body.find(c => c.id === res1.body.id);
      expect(found.current_xp).toBe(0);

      // Create with explicit current_xp
      const createRes = await agent.post('/api/characters').send({
        name: 'Veteran',
        race: 'Yazirian',
        current_xp: 25,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.current_xp).toBe(25);
      const charId = createRes.body.id;

      // Update current_xp
      const emitSpy = vi.spyOn(io, 'emit');
      const updateRes = await agent.put(`/api/characters/${charId}`).send({
        current_xp: 42,
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.current_xp).toBe(42);
      expect(emitSpy).toHaveBeenCalledWith('sheet:updated', {
        type: 'character',
        sheet: expect.objectContaining({ id: charId, current_xp: 42 }),
      });

      // Clamp negative current_xp to 0
      const clampRes = await agent.put(`/api/characters/${charId}`).send({
        current_xp: -10,
      });
      expect(clampRes.status).toBe(200);
      expect(clampRes.body.current_xp).toBe(0);
    });

    it('deletes character sheet and emits sheet:deleted', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const createRes = await agent.post('/api/characters').send({
        name: 'Wilks',
        race: 'Vrusk',
      });
      const charId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const delRes = await agent.delete(`/api/characters/${charId}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.ok).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('sheet:deleted', {
        type: 'character',
        id: charId,
      });

      const getRes = await agent.get(`/api/characters/${charId}`);
      expect(getRes.status).toBe(404);
    });

    it('allows creating a character sheet with a custom race', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await agent.post('/api/characters').send({
        name: 'Gronk',
        race: 'Saurian',
        psa: 'Military',
        str: 60,
        sta: 60,
        dex: 40,
        rs: 40,
        int_stat: 45,
        log_stat: 45,
        per: 50,
        ldr: 50,
      });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Gronk');
      expect(res.body.race).toBe('Saurian');
    });

    it('allows updating a character sheet to a custom race', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const createRes = await agent.post('/api/characters').send({
        name: 'Torg',
        race: 'Human',
        psa: 'Military',
        str: 50, sta: 50, dex: 50, rs: 50, int_stat: 50, log_stat: 50, per: 50, ldr: 50,
      });

      const updateRes = await agent.put(`/api/characters/${createRes.body.id}`).send({
        race: 'Cyborg-Alpha',
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.race).toBe('Cyborg-Alpha');
    });

    it('rejects empty or whitespace-only race', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await agent.post('/api/characters').send({
        name: 'Blanko',
        race: '   ',
        psa: 'Military',
      });

      expect(res.status).toBe(400);
    });

    it('trims leading and trailing whitespace from race on create and update', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const createRes = await agent.post('/api/characters').send({
        name: 'Trimmy',
        race: '   Custom Alien   ',
        psa: 'Military',
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.race).toBe('Custom Alien');

      const updateRes = await agent.put(`/api/characters/${createRes.body.id}`).send({
        race: '   Cyber Human   ',
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.race).toBe('Cyber Human');
    });

    it('includes owner_username in character sheet responses', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmUser', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmUser', password: 'password123' });

      const res = await gmAgent.post('/api/characters').send({ name: 'Hero', race: 'Human' });
      expect(res.status).toBe(201);
      expect(res.body.owner_username).toBe('gmUser');

      const listRes = await gmAgent.get('/api/characters');
      expect(listRes.body[0].owner_username).toBe('gmUser');
    });

    it('allows GM to assign character to another player login on create and update', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmBoss', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmBoss', password: 'password123' });

      // Register player account
      const playerReg = await gmAgent.post('/api/auth/register').send({ username: 'playerAlice', password: 'password123' });
      const playerUser = playerReg.body;

      // GM creates sheet assigned to playerAlice
      const createRes = await gmAgent.post('/api/characters').send({
        name: 'AliceChar',
        race: 'Yazirian',
        user_id: playerUser.id,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.user_id).toBe(playerUser.id);
      expect(createRes.body.owner_username).toBe('playerAlice');

      // GM reassigns sheet back to GM
      const gmInfo = (await gmAgent.get('/api/auth/me')).body;
      const updateRes = await gmAgent.put(`/api/characters/${createRes.body.id}`).send({
        user_id: gmInfo.id,
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.user_id).toBe(gmInfo.id);
      expect(updateRes.body.owner_username).toBe('gmBoss');
    });

    it('rejects assignment to non-existent user_id with 400', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmRoot', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmRoot', password: 'password123' });

      const res = await gmAgent.post('/api/characters').send({
        name: 'GhostChar',
        race: 'Human',
        user_id: 99999,
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/user.*exist/i);
    });

    it('prevents non-GM players from changing user_id', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmAdmin', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmAdmin', password: 'password123' });

      const p1 = (await gmAgent.post('/api/auth/register').send({ username: 'playerOne', password: 'password123' })).body;
      const p2 = (await gmAgent.post('/api/auth/register').send({ username: 'playerTwo', password: 'password123' })).body;

      const p1Agent = request.agent(app);
      await p1Agent.post('/api/auth/login').send({ username: 'playerOne', password: 'password123' });

      const char = (await p1Agent.post('/api/characters').send({ name: 'P1Char', race: 'Human' })).body;
      expect(char.user_id).toBe(p1.id);

      // Player attempts to reassign sheet to playerTwo
      const putRes = await p1Agent.put(`/api/characters/${char.id}`).send({
        user_id: p2.id,
        name: 'RenamedChar',
      });
      expect(putRes.status).toBe(200);
      expect(putRes.body.user_id).toBe(p1.id); // Must remain playerOne
    });

    it('validates invalid race or missing fields', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const invalidRaceRes = await agent.post('/api/characters').send({
        name: 'Invalid',
        race: '   ',
      });
      expect(invalidRaceRes.status).toBe(400);

      const missingNameRes = await agent.post('/api/characters').send({
        race: 'Human',
      });
      expect(missingNameRes.status).toBe(400);
    });
  });

  describe('Character Sheets Ownership & Reordering API', () => {
    it('enforces ownership on character update/delete, clears avatar, and decouples tokens', async () => {
      // First user is GM
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmUser', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmUser', password: 'password123' });

      // GM creates player1 and player2
      await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123', role: 'Player' });
      await gmAgent.post('/api/auth/register').send({ username: 'player2', password: 'password123', role: 'Player' });

      const p1Agent = request.agent(app);
      await p1Agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const p2Agent = request.agent(app);
      await p2Agent.post('/api/auth/login').send({ username: 'player2', password: 'password123' });

      // player1 creates a character
      const p1Char = (await p1Agent.post('/api/characters').send({
        name: 'P1 Char',
        race: 'Human',
        avatar_url: '/uploads/char1.png',
      })).body;

      // player2 attempts to update player1's character (IDOR attempt) -> 403
      const badCharUpdate = await p2Agent.put(`/api/characters/${p1Char.id}`).send({ name: 'Hacked Char' });
      expect(badCharUpdate.status).toBe(403);

      // player2 attempts to delete player1's character -> 403
      const badCharDelete = await p2Agent.delete(`/api/characters/${p1Char.id}`);
      expect(badCharDelete.status).toBe(403);

      // player1 clears avatar URL to empty string -> should persist empty string
      const clearAvatarRes = await p1Agent.put(`/api/characters/${p1Char.id}`).send({ avatar_url: '' });
      expect(clearAvatarRes.status).toBe(200);
      expect(clearAvatarRes.body.avatar_url).toBe('');

      // Create a map and token linked to p1Char
      const mapRes = await gmAgent.post('/api/maps').send({ name: 'Battle Map', map_type: 'rpg' });
      const mapId = mapRes.body.id;
      const tokenRes = await gmAgent.post('/api/tokens').send({
        map_id: mapId,
        character_id: p1Char.id,
        name: 'P1 Token',
      });
      const tokenId = tokenRes.body.id;

      // When player1 deletes character, linked token's character_id should become NULL
      const delRes = await p1Agent.delete(`/api/characters/${p1Char.id}`);
      expect(delRes.status).toBe(200);

      const checkToken = db.prepare('SELECT character_id FROM tokens WHERE id = ?').get(tokenId);
      expect(checkToken.character_id).toBeNull();
    });

    it('rejects empty name and clamps numeric stats on PUT /api/characters/:id', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'charClampUser', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'charClampUser', password: 'password123' });

      const created = (await agent.post('/api/characters').send({
        name: 'Normal Hero',
        race: 'Human',
        str: 50,
        sta: 50,
      })).body;

      // Reject empty or whitespace-only name
      const emptyNameRes = await agent.put(`/api/characters/${created.id}`).send({ name: '   ' });
      expect(emptyNameRes.status).toBe(400);

      // Clamp stats to 1..200 (and current_sta to 0..200)
      const clampedRes = await agent.put(`/api/characters/${created.id}`).send({
        name: 'Super Hero',
        str: 999,
        sta: -50,
        current_sta: -10,
        dex: 500,
        rs: 0,
      });

      expect(clampedRes.status).toBe(200);
      expect(clampedRes.body.name).toBe('Super Hero');
      expect(clampedRes.body.str).toBe(200);
      expect(clampedRes.body.sta).toBe(1);
      expect(clampedRes.body.current_sta).toBe(0);
      expect(clampedRes.body.dex).toBe(200);
      expect(clampedRes.body.rs).toBe(1);
    });

    it('reorders character sheets updates sort_order, returns new order, and emits sheets:reordered', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmUser', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmUser', password: 'password123' });

      const c1 = (await gmAgent.post('/api/characters').send({ name: 'Alpha', race: 'Human' })).body;
      const c2 = (await gmAgent.post('/api/characters').send({ name: 'Beta', race: 'Vrusk' })).body;
      const c3 = (await gmAgent.post('/api/characters').send({ name: 'Gamma', race: 'Yazirian' })).body;

      const emitSpy = vi.spyOn(io, 'emit');

      // Reorder: Gamma, Alpha, Beta
      const reorderRes = await gmAgent.put('/api/characters/reorder').send({
        order: [c3.id, c1.id, c2.id],
      });

      expect(reorderRes.status).toBe(200);
      expect(reorderRes.body).toEqual({ success: true, order: [c3.id, c1.id, c2.id] });
      expect(emitSpy).toHaveBeenCalledWith('sheets:reordered', {
        type: 'character',
        order: [c3.id, c1.id, c2.id],
      });

      const listRes = await gmAgent.get('/api/characters');
      expect(listRes.status).toBe(200);
      expect(listRes.body.map(c => c.id)).toEqual([c3.id, c1.id, c2.id]);
    });

    it('preserves reordered character sheets across server restart / database reinitialization', async () => {
      const tmpDbPath = path.join('/tmp', `test-char-restart-${Date.now()}.db`);
      let localDb = createDb(tmpDbPath);
      let localAppObj = createApp(localDb, ':memory:');

      try {
        const gmAgent = request.agent(localAppObj.app);
        await gmAgent.post('/api/auth/register').send({ username: 'gmRestart', password: 'password123' });
        await gmAgent.post('/api/auth/login').send({ username: 'gmRestart', password: 'password123' });

        const c1 = (await gmAgent.post('/api/characters').send({ name: 'Alpha', race: 'Human' })).body;
        const c2 = (await gmAgent.post('/api/characters').send({ name: 'Beta', race: 'Vrusk' })).body;
        const c3 = (await gmAgent.post('/api/characters').send({ name: 'Gamma', race: 'Yazirian' })).body;

        // Reorder to Gamma, Alpha, Beta
        const reorderRes = await gmAgent.put('/api/characters/reorder').send({
          order: [c3.id, c1.id, c2.id],
        });
        expect(reorderRes.status).toBe(200);

        // Close app and db (server shutdown)
        if (localAppObj.server && localAppObj.server.close) localAppObj.server.close();
        localDb.close();

        // Server restarts: re-opens database with createDb and creates new app instance
        localDb = createDb(tmpDbPath);
        localAppObj = createApp(localDb, ':memory:');

        const restartAgent = request.agent(localAppObj.app);
        await restartAgent.post('/api/auth/login').send({ username: 'gmRestart', password: 'password123' });

        const listRes = await restartAgent.get('/api/characters');
        expect(listRes.status).toBe(200);
        expect(listRes.body.map(c => c.id)).toEqual([c3.id, c1.id, c2.id]);
      } finally {
        if (localAppObj && localAppObj.server && localAppObj.server.close) localAppObj.server.close();
        if (localDb) localDb.close();
        if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
        if (fs.existsSync(`${tmpDbPath}-wal`)) fs.unlinkSync(`${tmpDbPath}-wal`);
        if (fs.existsSync(`${tmpDbPath}-shm`)) fs.unlinkSync(`${tmpDbPath}-shm`);
      }
    });

    it('rejects unauthenticated requests to reorder character sheets with 401', async () => {
      const res = await request(app).put('/api/characters/reorder').send({ order: [1, 2] });
      expect(res.status).toBe(401);
    });

    it('rejects invalid payloads on character reorder with 400', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmValidate', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmValidate', password: 'password123' });

      // Non-array
      let res = await gmAgent.put('/api/characters/reorder').send({ order: 'not-an-array' });
      expect(res.status).toBe(400);

      // Empty array
      res = await gmAgent.put('/api/characters/reorder').send({ order: [] });
      expect(res.status).toBe(400);

      // Non-numeric IDs
      res = await gmAgent.put('/api/characters/reorder').send({ order: [1, 'abc'] });
      expect(res.status).toBe(400);

      // Duplicate IDs
      res = await gmAgent.put('/api/characters/reorder').send({ order: [1, 1] });
      expect(res.status).toBe(400);
    });

    it('enforces character reorder permissions (GM allowed, non-GM forbidden)', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmAuth', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmAuth', password: 'password123' });

      const gmChar = (await gmAgent.post('/api/characters').send({ name: 'GM Char', race: 'Human' })).body;

      // GM creates playerAuth
      await gmAgent.post('/api/auth/register').send({ username: 'playerAuth', password: 'password123', role: 'Player' });

      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'playerAuth', password: 'password123' });

      const pChar1 = (await playerAgent.post('/api/characters').send({ name: 'Player Char 1', race: 'Vrusk' })).body;
      const pChar2 = (await playerAgent.post('/api/characters').send({ name: 'Player Char 2', race: 'Dralasite' })).body;

      // Player attempting to reorder receives 403 Forbidden
      const playerForbiddenRes = await playerAgent.put('/api/characters/reorder').send({
        order: [pChar2.id, pChar1.id],
      });
      expect(playerForbiddenRes.status).toBe(403);

      // GM can reorder all sheets
      const gmSuccessRes = await gmAgent.put('/api/characters/reorder').send({
        order: [pChar1.id, gmChar.id, pChar2.id],
      });
      expect(gmSuccessRes.status).toBe(200);
      expect(gmSuccessRes.body.order).toEqual([pChar1.id, gmChar.id, pChar2.id]);
    });

    it('persists grimoire array on POST /api/characters and PUT /api/characters/:id', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'magePlayer', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'magePlayer', password: 'password123' });

      const initialGrimoire = [
        {
          spell_id: 'sp_rime_1',
          name: "Grimnir's Rime-Lance",
          tradition: 'Arcane',
          default_tier: 2,
          category: 'strike',
          range_area: '60 ft',
          description: 'Hurls a jagged spear of hoarfrost.',
        },
      ];

      const createRes = await agent.post('/api/characters').send({
        name: 'Vaelen',
        race: 'Human',
        grimoire: initialGrimoire,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.grimoire).toEqual(initialGrimoire);

      const updatedGrimoire = [
        ...initialGrimoire,
        {
          spell_id: 'sp_ki_2',
          name: 'Flowing River Counter',
          tradition: 'Ki',
          default_tier: 3,
          category: 'ward_heal',
          range_area: 'Self',
          description: 'Redirects incoming kinetic force.',
        },
      ];

      const putRes = await agent.put(`/api/characters/${createRes.body.id}`).send({
        grimoire: updatedGrimoire,
      });
      expect(putRes.status).toBe(200);
      expect(putRes.body.grimoire).toEqual(updatedGrimoire);

      const getRes = await agent.get(`/api/characters/${createRes.body.id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.grimoire).toEqual(updatedGrimoire);
    });
  });
});
