import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { createDb } from '../src/db.js';

describe('World Maps & WorldMarker API', () => {
  let app;
  let io;
  let server;
  let db;
  let gmAgent;
  let playerAgent;
  let otherAgent;
  let playerId;
  let worldMapId;
  let tacticalMapId;

  beforeAll(async () => {
    db = createDb(':memory:');
    const result = createApp(db, ':memory:');
    app = result.app;
    io = result.io;
    server = result.server;

    gmAgent = request.agent(app);
    playerAgent = request.agent(app);
    otherAgent = request.agent(app);

    await gmAgent.post('/api/auth/register').send({ username: 'worldgm', password: 'password123', role: 'GameMaster' });
    await gmAgent.post('/api/auth/login').send({ username: 'worldgm', password: 'password123' });
    const p = await gmAgent.post('/api/auth/register').send({ username: 'worldplayer', password: 'password123', role: 'Player' });
    playerId = p.body.id;
    await gmAgent.post('/api/auth/register').send({ username: 'worldother', password: 'password123', role: 'Player' });
    await playerAgent.post('/api/auth/login').send({ username: 'worldplayer', password: 'password123' });
    await otherAgent.post('/api/auth/login').send({ username: 'worldother', password: 'password123' });

    const world = await gmAgent.post('/api/maps').send({ name: 'Realm of Aldoria', map_type: 'world', hex_miles: 12, is_active: 1 });
    worldMapId = world.body.id;
    const tactical = await gmAgent.post('/api/maps').send({ name: 'Goblin Keep', map_type: 'rpg' });
    tacticalMapId = tactical.body.id;
  });

  afterAll(() => {
    if (db) db.close();
    if (server && server.close) server.close();
  });

  describe('world maps', () => {
    it('creates a world map with hex_miles and rejects unknown map types', async () => {
      const res = await gmAgent.get('/api/maps?type=world');
      expect(res.body.length).toBe(1);
      expect(res.body[0].hex_miles).toBe(12);

      const bad = await gmAgent.post('/api/maps').send({ name: 'Void', map_type: 'space' });
      expect(bad.status).toBe(400);
    });

    it('updates hex_miles on PUT /api/maps/:id and defaults to 6', async () => {
      const m = await gmAgent.post('/api/maps').send({ name: 'Default Hexes', map_type: 'world' });
      expect(m.body.hex_miles).toBe(6);
      const upd = await gmAgent.put(`/api/maps/${m.body.id}`).send({ hex_miles: 24 });
      expect(upd.body.hex_miles).toBe(24);
    });
  });

  describe('POST /api/world-markers', () => {
    it('lets a GM create a marker from hex coordinates and derives miles', async () => {
      const res = await gmAgent.post('/api/world-markers').send({
        map_id: worldMapId, marker_type: 'poi', name: 'Ruined Tower', hex_q: 2, hex_r: 1, linked_map_id: tacticalMapId,
      });
      expect(res.status).toBe(201);
      expect(res.body.marker_type).toBe('poi');
      expect(res.body.hex_q).toBe(2);
      expect(res.body.hex_r).toBe(1);
      expect(res.body.x_miles).toBeCloseTo(12 * 2.5);
      expect(res.body.y_miles).toBeCloseTo(12 * Math.sqrt(3) / 2);
      expect(res.body.linked_map_id).toBe(tacticalMapId);
      expect(res.body.hidden).toBe(false);
    });

    it('derives hex coordinates from miles', async () => {
      const res = await gmAgent.post('/api/world-markers').send({
        map_id: worldMapId, marker_type: 'hazard', name: 'Sinkhole', x_miles: 24, y_miles: 0,
      });
      expect(res.status).toBe(201);
      expect(res.body.hex_q).toBe(2);
      expect(res.body.hex_r).toBe(0);
      expect(res.body.x_miles).toBe(24);
    });

    it('accepts every marker type', async () => {
      for (const t of ['party', 'battle', 'faction', 'poi', 'hazard']) {
        const res = await gmAgent.post('/api/world-markers').send({ map_id: worldMapId, marker_type: t, name: `T-${t}` });
        expect(res.status).toBe(201);
        expect(res.body.marker_type).toBe(t);
      }
    });

    it('validates input', async () => {
      expect((await gmAgent.post('/api/world-markers').send({ map_id: worldMapId, name: '' })).status).toBe(400);
      expect((await gmAgent.post('/api/world-markers').send({ map_id: worldMapId, name: 'x', marker_type: 'starship' })).status).toBe(400);
      expect((await gmAgent.post('/api/world-markers').send({ map_id: worldMapId, name: 'x', color: 'red' })).status).toBe(400);
      expect((await gmAgent.post('/api/world-markers').send({ map_id: 99999, name: 'x' })).status).toBe(404);
      expect((await gmAgent.post('/api/world-markers').send({ map_id: tacticalMapId, name: 'x' })).status).toBe(400);
      expect((await gmAgent.post('/api/world-markers').send({ map_id: worldMapId, name: 'x', linked_map_id: worldMapId })).status).toBe(400);
      expect((await gmAgent.post('/api/world-markers').send({ map_id: worldMapId, name: 'x', linked_map_id: 99999 })).status).toBe(400);
      expect((await gmAgent.post('/api/world-markers').send({ map_id: worldMapId, name: 'x', owner_user_id: 99999 })).status).toBe(400);
    });

    it('rejects creation by players', async () => {
      const res = await playerAgent.post('/api/world-markers').send({ map_id: worldMapId, name: 'Cheat' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/world-markers', () => {
    it('requires map_id and authentication', async () => {
      expect((await gmAgent.get('/api/world-markers')).status).toBe(400);
      expect((await request(app).get(`/api/world-markers?map_id=${worldMapId}`)).status).toBe(401);
    });

    it('hides hidden markers from players but not from the GM', async () => {
      const hidden = await gmAgent.post('/api/world-markers').send({ map_id: worldMapId, name: 'Secret Lair', marker_type: 'faction', hidden: true });
      const gmList = await gmAgent.get(`/api/world-markers?map_id=${worldMapId}`);
      const playerList = await playerAgent.get(`/api/world-markers?map_id=${worldMapId}`);
      expect(gmList.body.some(m => m.id === hidden.body.id)).toBe(true);
      expect(playerList.status).toBe(200);
      expect(playerList.body.some(m => m.id === hidden.body.id)).toBe(false);
      expect(playerList.body.length).toBe(gmList.body.length - 1);
    });
  });

  describe('PUT /api/world-markers/:id', () => {
    let partyId;

    beforeAll(async () => {
      const res = await gmAgent.post('/api/world-markers').send({
        map_id: worldMapId, marker_type: 'party', name: 'The Wanderers', owner_user_id: playerId, hex_q: 0, hex_r: 0,
      });
      partyId = res.body.id;
    });

    it('lets the owner move their party marker, recomputing miles', async () => {
      const res = await playerAgent.put(`/api/world-markers/${partyId}`).send({ hex_q: 3, hex_r: -1 });
      expect(res.status).toBe(200);
      expect(res.body.hex_q).toBe(3);
      expect(res.body.hex_r).toBe(-1);
      expect(res.body.x_miles).toBeCloseTo(12 * 2.5);
    });

    it('ignores non-positional fields from players', async () => {
      const res = await playerAgent.put(`/api/world-markers/${partyId}`).send({
        name: 'Hacked', marker_type: 'hazard', hidden: true, linked_map_id: tacticalMapId, owner_user_id: null,
      });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('The Wanderers');
      expect(res.body.marker_type).toBe('party');
      expect(res.body.hidden).toBe(false);
      expect(res.body.linked_map_id).toBeNull();
      expect(res.body.owner_user_id).toBe(playerId);
    });

    it('forbids other players and non-party markers', async () => {
      expect((await otherAgent.put(`/api/world-markers/${partyId}`).send({ hex_q: 1, hex_r: 1 })).status).toBe(403);
      const poi = await gmAgent.post('/api/world-markers').send({ map_id: worldMapId, name: 'Inn', owner_user_id: playerId });
      expect((await playerAgent.put(`/api/world-markers/${poi.body.id}`).send({ hex_q: 1, hex_r: 1 })).status).toBe(403);
    });

    it('lets the GM edit everything, including linking a tactical scene', async () => {
      const res = await gmAgent.put(`/api/world-markers/${partyId}`).send({
        name: 'The Wanderers II', marker_type: 'battle', linked_map_id: tacticalMapId, hidden: true, color: '#ff0000',
      });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('The Wanderers II');
      expect(res.body.marker_type).toBe('battle');
      expect(res.body.linked_map_id).toBe(tacticalMapId);
      expect(res.body.hidden).toBe(true);
      expect(res.body.color).toBe('#ff0000');

      const cleared = await gmAgent.put(`/api/world-markers/${partyId}`).send({ linked_map_id: null, hidden: false, marker_type: 'party' });
      expect(cleared.body.linked_map_id).toBeNull();
    });

    it('returns 404 for unknown markers and 400 for invalid GM edits', async () => {
      expect((await gmAgent.put('/api/world-markers/999999').send({ name: 'x' })).status).toBe(404);
      expect((await gmAgent.put(`/api/world-markers/${partyId}`).send({ marker_type: 'ship' })).status).toBe(400);
      expect((await gmAgent.put(`/api/world-markers/${partyId}`).send({ name: '  ' })).status).toBe(400);
    });

    it('hides a marker from players when the GM hides it and emits scoped socket events', async () => {
      const toSpy = vi.spyOn(io, 'to');
      const exceptSpy = vi.spyOn(io, 'except');
      await gmAgent.put(`/api/world-markers/${partyId}`).send({ hidden: true });
      expect(toSpy).toHaveBeenCalledWith('role:GameMaster');
      expect(exceptSpy).toHaveBeenCalledWith('role:GameMaster');
      const list = await playerAgent.get(`/api/world-markers?map_id=${worldMapId}`);
      expect(list.body.some(m => m.id === partyId)).toBe(false);
      // Hidden: owner can no longer move it
      expect((await playerAgent.put(`/api/world-markers/${partyId}`).send({ hex_q: 0, hex_r: 0 })).status).toBe(403);
      await gmAgent.put(`/api/world-markers/${partyId}`).send({ hidden: false });
      toSpy.mockRestore();
      exceptSpy.mockRestore();
    });
  });

  describe('DELETE /api/world-markers/:id', () => {
    it('allows the GM only, emits world-marker:deleted, and cascades with the map', async () => {
      const m = await gmAgent.post('/api/world-markers').send({ map_id: worldMapId, name: 'Doomed' });
      expect((await playerAgent.delete(`/api/world-markers/${m.body.id}`)).status).toBe(403);

      const emitSpy = vi.spyOn(io, 'emit');
      const del = await gmAgent.delete(`/api/world-markers/${m.body.id}`);
      expect(del.status).toBe(200);
      expect(emitSpy).toHaveBeenCalledWith('world-marker:deleted', { id: m.body.id, map_id: worldMapId });
      emitSpy.mockRestore();
      expect((await gmAgent.delete(`/api/world-markers/${m.body.id}`)).status).toBe(404);
    });

    it('sets linked_map_id to NULL when the linked tactical map is deleted', async () => {
      const t = await gmAgent.post('/api/maps').send({ name: 'Temp Scene', map_type: 'rpg' });
      const m = await gmAgent.post('/api/world-markers').send({ map_id: worldMapId, name: 'Linked', linked_map_id: t.body.id });
      expect(m.body.linked_map_id).toBe(t.body.id);
      await gmAgent.delete(`/api/maps/${t.body.id}`);
      const row = db.prepare('SELECT linked_map_id FROM world_markers WHERE id = ?').get(m.body.id);
      expect(row.linked_map_id).toBeNull();
    });
  });
});
