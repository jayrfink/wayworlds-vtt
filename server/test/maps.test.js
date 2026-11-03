import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';

describe('Maps & Tokens API & Socket.io', () => {
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

  describe('Maps API', () => {
    it('returns 401 when unauthenticated on GET /api/maps', async () => {
      const res = await request(app).get('/api/maps');
      expect(res.status).toBe(401);
    });

    it('returns 200 list when authenticated on GET /api/maps', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      const res = await agent.get('/api/maps');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('defaults, updates, and clamps grid_line_width', async () => {
      const gm = request.agent(app);
      await gm.post('/api/auth/register').send({ username: 'gm_lw', password: 'password123' });
      await gm.post('/api/auth/login').send({ username: 'gm_lw', password: 'password123' });

      const created = await gm.post('/api/maps').send({ name: 'Thin Lines' });
      expect(created.status).toBe(201);
      expect(created.body.grid_line_width).toBe(1);

      const thin = await gm.put(`/api/maps/${created.body.id}`).send({ grid_line_width: 0.25 });
      expect(thin.body.grid_line_width).toBe(0.25);

      const tooBig = await gm.put(`/api/maps/${created.body.id}`).send({ grid_line_width: 99 });
      expect(tooBig.body.grid_line_width).toBe(10);

      const invalid = await gm.put(`/api/maps/${created.body.id}`).send({ grid_line_width: -3 });
      expect(invalid.body.grid_line_width).toBe(10); // invalid input keeps existing value
    });

    it('defaults grid_visible to true and allows toggling it', async () => {
      const gm = request.agent(app);
      await gm.post('/api/auth/register').send({ username: 'gm_gv', password: 'password123' });
      await gm.post('/api/auth/login').send({ username: 'gm_gv', password: 'password123' });

      const created = await gm.post('/api/maps').send({ name: 'Hidden Grid' });
      expect(created.body.grid_visible).toBe(true);

      const hidden = await gm.put(`/api/maps/${created.body.id}`).send({ grid_visible: false });
      expect(hidden.body.grid_visible).toBe(false);

      const untouched = await gm.put(`/api/maps/${created.body.id}`).send({ grid_color: '#ffffff' });
      expect(untouched.body.grid_visible).toBe(false);

      const shown = await gm.put(`/api/maps/${created.body.id}`).send({ grid_visible: true });
      expect(shown.body.grid_visible).toBe(true);
    });

    it('creates map (GM only) and emits map:created', async () => {
      const gmAgent = request.agent(app);
      // First user registered becomes GameMaster
      await gmAgent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      const playerAgent = request.agent(app);
      // Second user registered becomes Player (registered by GM)
      await gmAgent.post('/api/auth/register').send({ username: 'player_user', password: 'password123' });
      await playerAgent.post('/api/auth/login').send({ username: 'player_user', password: 'password123' });

      // Player attempting to create map should get 403
      const playerCreateRes = await playerAgent.post('/api/maps').send({ name: 'Player Map' });
      expect(playerCreateRes.status).toBe(403);

      const emitSpy = vi.spyOn(io, 'emit');

      // GM creating map
      const gmCreateRes = await gmAgent.post('/api/maps').send({
        name: 'Volturnus Outpost',
        preset_bg: 'volturnus_desert',
        width: 30,
        height: 30,
        grid_size: 40,
        grid_color: '#ff9900',
      });

      expect(gmCreateRes.status).toBe(201);
      expect(gmCreateRes.body.name).toBe('Volturnus Outpost');
      expect(gmCreateRes.body.preset_bg).toBe('volturnus_desert');
      expect(gmCreateRes.body.width).toBe(30);
      expect(gmCreateRes.body.fog_data).toEqual([]);
      expect(emitSpy).toHaveBeenCalledWith('map:created', expect.objectContaining({
        map: expect.objectContaining({ name: 'Volturnus Outpost' }),
      }));
    });

    it('activates map and emits map:activated', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      const map1Res = await gmAgent.post('/api/maps').send({ name: 'Map 1' });
      const map2Res = await gmAgent.post('/api/maps').send({ name: 'Map 2' });

      const gmEmitSpy = vi.fn();
      const playerEmitSpy = vi.fn();
      vi.spyOn(io, 'to').mockImplementation((room) => {
        if (room === 'role:GameMaster') return { emit: gmEmitSpy };
        return io;
      });
      vi.spyOn(io, 'except').mockImplementation((room) => {
        if (room === 'role:GameMaster') return { emit: playerEmitSpy };
        return io;
      });

      const activateRes = await gmAgent.post(`/api/maps/${map2Res.body.id}/activate`);
      expect(activateRes.status).toBe(200);
      expect(activateRes.body.map.id).toBe(map2Res.body.id);
      expect(activateRes.body.map.is_active).toBe(1);

      expect(gmEmitSpy).toHaveBeenCalledWith('map:activated', expect.objectContaining({
        map: expect.objectContaining({ id: map2Res.body.id, is_active: 1 }),
      }));
      expect(playerEmitSpy).toHaveBeenCalledWith('map:activated', expect.objectContaining({
        map: expect.objectContaining({ id: map2Res.body.id, is_active: 1 }),
      }));

      // Verify in DB map1 is not active and map2 is active
      const mapsRes = await gmAgent.get('/api/maps');
      const map1 = mapsRes.body.find(m => m.id === map1Res.body.id);
      const map2 = mapsRes.body.find(m => m.id === map2Res.body.id);
      expect(map1.is_active).toBe(0);
      expect(map2.is_active).toBe(1);
    });

    it('supports independent active maps and filtering for rpg and world map types', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      // Create RPG map 1 and 2
      const rpg1 = await gmAgent.post('/api/maps').send({ name: 'RPG Map 1', map_type: 'rpg', is_active: 1 });
      const rpg2 = await gmAgent.post('/api/maps').send({ name: 'RPG Map 2', map_type: 'rpg', is_active: 0 });

      // Create World map 1 and 2
      const world1 = await gmAgent.post('/api/maps').send({ name: 'World Map 1', map_type: 'world', is_active: 1 });
      const world2 = await gmAgent.post('/api/maps').send({ name: 'World Map 2', map_type: 'world', is_active: 0 });

      // Check active maps
      const activeRpg = await gmAgent.get('/api/maps/active?type=rpg');
      expect(activeRpg.body.map.id).toBe(rpg1.body.id);

      const activeWorld = await gmAgent.get('/api/maps/active?type=world');
      expect(activeWorld.body.map.id).toBe(world1.body.id);

      // Activate World Map 2
      await gmAgent.post(`/api/maps/${world2.body.id}/activate`);

      // RPG Map 1 should STILL be active!
      const activeRpgAfter = await gmAgent.get('/api/maps/active?type=rpg');
      expect(activeRpgAfter.body.map.id).toBe(rpg1.body.id);

      // World Map 2 should now be active!
      const activeWorldAfter = await gmAgent.get('/api/maps/active?type=world');
      expect(activeWorldAfter.body.map.id).toBe(world2.body.id);

      // Verify filtering GET /api/maps?type=rpg and GET /api/maps?type=world
      const rpgList = await gmAgent.get('/api/maps?type=rpg');
      expect(rpgList.body.every(m => m.map_type === 'rpg')).toBe(true);
      expect(rpgList.body.length).toBe(2);

      const worldList = await gmAgent.get('/api/maps?type=world');
      expect(worldList.body.every(m => m.map_type === 'world')).toBe(true);
      expect(worldList.body.length).toBe(2);
    });

    it('updates map and fog_data', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      const createRes = await gmAgent.post('/api/maps').send({ name: 'Ship Interior' });
      const mapId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const fogData = [{ x: 5, y: 5, w: 2, h: 2 }];
      const updateRes = await gmAgent.put(`/api/maps/${mapId}`).send({
        name: 'Ship Deck 1',
        fog_data: fogData,
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe('Ship Deck 1');
      expect(updateRes.body.fog_data).toEqual(fogData);
      expect(emitSpy).toHaveBeenCalledWith('map:updated', expect.objectContaining({
        map: expect.objectContaining({ id: mapId, name: 'Ship Deck 1' }),
      }));
    });

    it('deletes map and emits map:deleted', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      const createRes = await gmAgent.post('/api/maps').send({ name: 'Temp Map' });
      const mapId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const delRes = await gmAgent.delete(`/api/maps/${mapId}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.ok).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('map:deleted', { id: mapId });
    });
  });

  describe('Tokens API', () => {
    let agent, mapId;

    beforeEach(async () => {
      agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      const mapRes = await agent.post('/api/maps').send({ name: 'Battlefield' });
      mapId = mapRes.body.id;
    });

    it('creates token and emits token:created', async () => {
      const emitSpy = vi.spyOn(io, 'emit');

      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Sathras Warrior',
        color: '#ff0055',
        x: 5,
        y: 10,
        size: 1,
        current_hp: 30,
        max_hp: 30,
        status_effects: ['Stunned'],
        layer: 'character',
      });

      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe('Sathras Warrior');
      expect(createRes.body.x).toBe(5);
      expect(createRes.body.y).toBe(10);
      expect(createRes.body.status_effects).toEqual(['Stunned']);
      expect(emitSpy).toHaveBeenCalledWith('token:created', expect.objectContaining({
        token: expect.objectContaining({ name: 'Sathras Warrior' }),
      }));
    });

    it('moves and updates token, emitting token:moved and token:updated', async () => {
      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Hero',
        x: 0,
        y: 0,
      });
      expect(createRes.body.color).toBe('#666666');
      const tokenId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const updateRes = await agent.put(`/api/tokens/${tokenId}`).send({
        x: 3,
        y: 4,
        current_hp: 25,
        color: '#123456',
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.x).toBe(3);
      expect(updateRes.body.y).toBe(4);
      expect(updateRes.body.color).toBe('#123456');

      expect(emitSpy).toHaveBeenCalledWith('token:moved', expect.objectContaining({
        token: expect.objectContaining({ id: tokenId, x: 3, y: 4 }),
      }));
      expect(emitSpy).toHaveBeenCalledWith('token:updated', expect.objectContaining({
        token: expect.objectContaining({ id: tokenId, current_hp: 25, color: '#123456' }),
      }));
    });

    it('updates token rotation and speed', async () => {
      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Starship',
      });
      const tokenId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const res = await agent.put(`/api/tokens/${tokenId}`).send({
        rotation: 60,
        current_speed: 10,
      });
      expect(res.status).toBe(200);
      expect(res.body.rotation).toBe(60);
      expect(res.body.current_speed).toBe(10);
      expect(emitSpy).toHaveBeenCalledWith('token:updated', expect.objectContaining({
        token: expect.objectContaining({ id: tokenId, rotation: 60, current_speed: 10 }),
      }));
    });

    it('creates token with rotation and speed', async () => {
      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Fighter',
        rotation: 180,
        current_speed: 6,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.rotation).toBe(180);
      expect(createRes.body.current_speed).toBe(6);
    });

    it('deletes token and emits token:deleted', async () => {
      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Enemy',
      });
      const tokenId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const delRes = await agent.delete(`/api/tokens/${tokenId}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.ok).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('token:deleted', { id: tokenId });
    });

    it('creates and persists celestial token with layer: "celestial"', async () => {
      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Centurian Moon',
        layer: 'celestial',
        size: 1,
        color: '',
        rotation: 0,
        current_speed: null,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.layer).toBe('celestial');
      expect(createRes.body.name).toBe('Centurian Moon');
      expect(createRes.body.size).toBe(1);

      const fetchRes = await agent.get(`/api/tokens/${createRes.body.id}`);
      expect(fetchRes.status).toBe(200);
      expect(fetchRes.body.layer).toBe('celestial');
    });

    it('returns 400 when missing required fields on token creation', async () => {
      const res = await agent.post('/api/tokens').send({
        color: '#00ff00',
      });
      expect(res.status).toBe(400);
    });

    it('enforces token permissions and formats templates on map activation', async () => {
      // agent is already logged in as gm_user from beforeEach
      // Register a player account using agent (GM)
      await agent.post('/api/auth/register').send({ username: 'playerTok', password: 'password123', role: 'Player' });
      const pAgent = request.agent(app);
      await pAgent.post('/api/auth/login').send({ username: 'playerTok', password: 'password123' });

      // Player creates a character
      const charRes = await pAgent.post('/api/characters').send({ name: 'My Hero', race: 'Human' });
      expect(charRes.status).toBe(201);
      const charId = charRes.body.id;

      // GM creates a map
      const mapRes = await agent.post('/api/maps').send({ name: 'Active Battle', map_type: 'rpg' });
      const activeMapId = mapRes.body.id;

      // Player creates token for their own character -> allowed
      const pTokenRes = await pAgent.post('/api/tokens').send({
        map_id: activeMapId,
        character_id: charId,
        name: 'My Hero Token',
        x: -5000,
        y: 50000,
      });
      expect(pTokenRes.status).toBe(201);
      expect(pTokenRes.body.x).toBe(-1000); // clamped
      expect(pTokenRes.body.y).toBe(10000); // clamped
      const pTokenId = pTokenRes.body.id;

      // GM creates an NPC token
      const npcRes = await agent.post('/api/tokens').send({
        map_id: activeMapId,
        name: 'Sathar Spy',
      });
      const npcId = npcRes.body.id;

      // Player can move GM's NPC token (any player can move tokens)
      const playerMoveNpc = await pAgent.put(`/api/tokens/${npcId}`).send({ x: 25, y: 25 });
      expect(playerMoveNpc.status).toBe(200);

      // But Player attempts to delete GM's NPC token -> 403
      const badDel = await pAgent.delete(`/api/tokens/${npcId}`);
      expect(badDel.status).toBe(403);

      // Player CAN update their own token
      const goodPut = await pAgent.put(`/api/tokens/${pTokenId}`).send({ name: 'My Hero Renamed' });
      expect(goodPut.status).toBe(200);
      expect(goodPut.body.name).toBe('My Hero Renamed');

      // Create adversary template and add 2 adversary tokens
      db.prepare(`
        INSERT INTO adversary_templates (id, name, category, threat_tier, hp_max)
        VALUES ('tpl_test', 'Sathar Trooper', 'npc', 2, 45)
      `).run();

      await agent.post('/api/tokens').send({
        map_id: activeMapId,
        template_id: 'tpl_test',
        name: 'Sathar 1',
      });
      await agent.post('/api/tokens').send({
        map_id: activeMapId,
        template_id: 'tpl_test',
        name: 'Sathar 2',
      });

      // Activate map and ensure all tokens have template populated (Bug 2.1)
      const activateRes = await agent.post(`/api/maps/${activeMapId}/activate`);
      expect(activateRes.status).toBe(200);
      const advTokens = activateRes.body.tokens.filter(t => t.template_id === 'tpl_test');
      expect(advTokens.length).toBe(2);
      expect(advTokens[0].template).toBeDefined();
      expect(advTokens[0].template.name).toBe('Sathar Trooper');
      expect(advTokens[1].template).toBeDefined();
      expect(advTokens[1].template.name).toBe('Sathar Trooper');
    });

    it('enforces single active map when updated via PUT /api/maps/:id', async () => {
      // agent is already logged in as gm_user from beforeEach
      const mapA = (await agent.post('/api/maps').send({ name: 'Map A', map_type: 'rpg', is_active: 1 })).body;
      const mapB = (await agent.post('/api/maps').send({ name: 'Map B', map_type: 'rpg', is_active: 0 })).body;

      // PUT map B with is_active: 1
      const updateB = await agent.put(`/api/maps/${mapB.id}`).send({ is_active: 1 });
      expect(updateB.status).toBe(200);

      const checkA = db.prepare('SELECT is_active FROM maps WHERE id = ?').get(mapA.id);
      const checkB = db.prepare('SELECT is_active FROM maps WHERE id = ?').get(mapB.id);
      expect(checkA.is_active).toBe(0);
      expect(checkB.is_active).toBe(1);
    });

    it('prevents non-GM players from modifying map_id, template_id, layer, and vehicle_data on PUT /api/tokens/:id', async () => {
      // 1. Create a player user and character
      await agent.post('/api/auth/register').send({ username: 'playerMap', password: 'password123', role: 'Player' });
      const pAgent = request.agent(app);
      await pAgent.post('/api/auth/login').send({ username: 'playerMap', password: 'password123' });

      const charRes = await pAgent.post('/api/characters').send({
        name: 'Player Ranger',
        race: 'Yazirian',
        sta: 40,
        psa: 'Military',
      });
      const charId = charRes.body.id;

      const mapRes = await agent.post('/api/maps').send({ name: 'Arena 1', map_type: 'rpg', is_active: 1 });
      const mapRes2 = await agent.post('/api/maps').send({ name: 'Arena 2', map_type: 'rpg', is_active: 0 });

      // Player creates their token on map 1
      const tokenRes = await pAgent.post('/api/tokens').send({
        map_id: mapRes.body.id,
        character_id: charId,
        name: 'Ranger Token',
        layer: 'character',
        x: 10,
        y: 20,
        current_hp: 40,
      });
      const tokenId = tokenRes.body.id;

      // Player attempts to update restricted fields (map_id, template_id, layer, vehicle_data)
      const attackRes = await pAgent.put(`/api/tokens/${tokenId}`).send({
        map_id: mapRes2.body.id,
        template_id: 'secret-sathar',
        layer: 'gm_hidden',
        vehicle_data: { speed: 100 },
        // Permitted fields
        x: 50,
        y: 60,
        rotation: 90,
        color: '#ff0000',
        avatar_url: '/uploads/new-avatar.png',
        current_hp: 35,
      });

      expect(attackRes.status).toBe(200);
      expect(attackRes.body.map_id).toBe(mapRes.body.id); // Not modified!
      expect(attackRes.body.template_id).toBeNull(); // Not modified!
      expect(attackRes.body.layer).toBe('character'); // Not modified!
      expect(attackRes.body.vehicle_data).toBeNull(); // Not modified!

      // Permitted fields WERE updated
      expect(attackRes.body.x).toBe(50);
      expect(attackRes.body.y).toBe(60);
      expect(attackRes.body.rotation).toBe(90);
      expect(attackRes.body.color).toBe('#ff0000');
      expect(attackRes.body.avatar_url).toBe('/uploads/new-avatar.png');
      expect(attackRes.body.current_hp).toBe(35);
    });

    it('safely handles null status_effects and conditions on PUT /api/tokens/:id without crashing', async () => {
      const mapRes = await agent.post('/api/maps').send({ name: 'Arena Null Test', map_type: 'rpg', is_active: 1 });
      const tokenRes = await agent.post('/api/tokens').send({
        map_id: mapRes.body.id,
        name: 'Null Test Token',
        x: 10,
        y: 10,
        status_effects: ['Poisoned'],
        conditions: ['Stunned'],
      });
      const tokenId = tokenRes.body.id;

      const nullUpdateRes = await agent.put(`/api/tokens/${tokenId}`).send({
        status_effects: null,
        conditions: null,
      });

      expect(nullUpdateRes.status).toBe(200);
      expect(Array.isArray(nullUpdateRes.body.status_effects)).toBe(true);
      expect(Array.isArray(nullUpdateRes.body.conditions)).toBe(true);
    });

    it('emits map:activated with tokens when PUT /api/maps/:id activates a map', async () => {
      const mapRes = await agent.post('/api/maps').send({ name: 'Dormant Map', map_type: 'rpg', is_active: 0 });
      const tokenRes = await agent.post('/api/tokens').send({
        map_id: mapRes.body.id,
        name: 'Stationary Sentry',
      });

      const gmEmitSpy = vi.fn();
      const playerEmitSpy = vi.fn();
      vi.spyOn(io, 'to').mockImplementation((room) => {
        if (room === 'role:GameMaster') return { emit: gmEmitSpy };
        return io;
      });
      vi.spyOn(io, 'except').mockImplementation((room) => {
        if (room === 'role:GameMaster') return { emit: playerEmitSpy };
        return io;
      });

      const putRes = await agent.put(`/api/maps/${mapRes.body.id}`).send({ is_active: 1 });
      expect(putRes.status).toBe(200);

      expect(gmEmitSpy).toHaveBeenCalledWith('map:activated', expect.objectContaining({
        map: expect.objectContaining({ id: mapRes.body.id, is_active: 1 }),
        tokens: expect.arrayContaining([
          expect.objectContaining({ id: tokenRes.body.id, name: 'Stationary Sentry' }),
        ]),
      }));
      expect(playerEmitSpy).toHaveBeenCalledWith('map:activated', expect.objectContaining({
        map: expect.objectContaining({ id: mapRes.body.id, is_active: 1 }),
        tokens: expect.arrayContaining([
          expect.objectContaining({ id: tokenRes.body.id, name: 'Stationary Sentry' }),
        ]),
      }));
    });

    it('allows non-GM token owners to update their own current_speed and ess_current, while clamping size (1..10) and rotation (0..359)', async () => {
      await agent.post('/api/auth/register').send({ username: 'pilotSpeed', password: 'password123', role: 'Player' });
      const pAgent = request.agent(app);
      await pAgent.post('/api/auth/login').send({ username: 'pilotSpeed', password: 'password123' });

      const char = (await pAgent.post('/api/characters').send({ name: 'Speedster', race: 'Human' })).body;
      const trackMap = (await agent.post('/api/maps').send({ name: 'Race Track', map_type: 'rpg', is_active: 1 })).body;

      // Token creation with negative rotation and out-of-range size
      const token = (await pAgent.post('/api/tokens').send({
        map_id: trackMap.id,
        character_id: char.id,
        name: 'Speedster Token',
        size: 99,
        rotation: -45,
        current_speed: 10,
        ess_current: 50,
      })).body;

      expect(token.size).toBe(10); // clamped to 10
      expect(token.rotation).toBe(315); // -45 mod 360 -> 315
      expect(token.current_speed).toBe(10);
      expect(token.ess_current).toBe(50);

      // Player updates current_speed and ess_current, and provides rotation 450
      const updated = (await pAgent.put(`/api/tokens/${token.id}`).send({
        current_speed: 25,
        ess_current: 40,
        rotation: 450,
      })).body;

      expect(updated.current_speed).toBe(25);
      expect(updated.ess_current).toBe(40);
      expect(updated.rotation).toBe(90); // 450 % 360 = 90
    });

    it('Bug 5 & 6: GM-layer filtering, socket scoping, and player layer enforcement', async () => {
      // 1. GM creates map and GM token
      const mapRes = await agent.post('/api/maps').send({ name: 'Secret Map' });
      const mapId = mapRes.body.id;

      const gmRoomEmitSpy = vi.fn();
      const globalEmitSpy = vi.spyOn(io, 'emit');
      vi.spyOn(io, 'to').mockImplementation((room) => {
        if (room === 'role:GameMaster') {
          return { emit: gmRoomEmitSpy };
        }
        return io;
      });

      // GM creates gm layer token
      const gmTokenRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Hidden Ambush',
        layer: 'gm',
        x: 10,
        y: 10,
      });
      expect(gmTokenRes.status).toBe(201);
      expect(gmTokenRes.body.layer).toBe('gm');
      expect(gmRoomEmitSpy).toHaveBeenCalledWith('token:created', expect.objectContaining({ token: expect.objectContaining({ layer: 'gm' }) }));

      // GM creates character layer token
      const charTokenRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Visible Guard',
        layer: 'character',
        x: 20,
        y: 20,
      });
      expect(charTokenRes.status).toBe(201);
      expect(globalEmitSpy).toHaveBeenCalledWith('token:created', expect.objectContaining({ token: expect.objectContaining({ layer: 'character' }) }));

      // 2. Create player
      await agent.post('/api/auth/register').send({ username: 'stealthPlayer', password: 'password123', role: 'Player' });
      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'stealthPlayer', password: 'password123' });

      // Player GET /api/tokens should only see character layer token
      const tokensListRes = await playerAgent.get(`/api/tokens?map_id=${mapId}`);
      expect(tokensListRes.status).toBe(200);
      expect(tokensListRes.body.some((t) => t.id === gmTokenRes.body.id)).toBe(false);
      expect(tokensListRes.body.some((t) => t.id === charTokenRes.body.id)).toBe(true);

      // Player GET /api/maps/:id should filter out gm token
      const mapFetchRes = await playerAgent.get(`/api/maps/${mapId}`);
      expect(mapFetchRes.status).toBe(200);
      expect(mapFetchRes.body.tokens.some((t) => t.id === gmTokenRes.body.id)).toBe(false);
      expect(mapFetchRes.body.tokens.some((t) => t.id === charTokenRes.body.id)).toBe(true);

      // Player GET /api/tokens/:id on gm token returns 404
      const tokenDirectRes = await playerAgent.get(`/api/tokens/${gmTokenRes.body.id}`);
      expect(tokenDirectRes.status).toBe(404);

      // GM can see GM tokens
      const gmTokensListRes = await agent.get(`/api/tokens?map_id=${mapId}`);
      expect(gmTokensListRes.body.some((t) => t.id === gmTokenRes.body.id)).toBe(true);

      // Bug 6: Player attempting to create token with layer: 'gm' or 'adversary' is enforced to 'character'
      const charSheet = (await playerAgent.post('/api/characters').send({ name: 'Sneaky PC', race: 'Human' })).body;
      const playerTokRes = await playerAgent.post('/api/tokens').send({
        map_id: mapId,
        character_id: charSheet.id,
        name: 'Hacked Token',
        layer: 'gm',
      });
      expect(playerTokRes.status).toBe(201);
      expect(playerTokRes.body.layer).toBe('character');

      // GM updating/moving gm token emits only to role:GameMaster
      gmRoomEmitSpy.mockClear();
      await agent.put(`/api/tokens/${gmTokenRes.body.id}`).send({ x: 15, y: 15 });
      expect(gmRoomEmitSpy).toHaveBeenCalledWith('token:moved', expect.anything());
      expect(gmRoomEmitSpy).toHaveBeenCalledWith('token:updated', expect.anything());

      // GM deleting gm token emits only to role:GameMaster
      gmRoomEmitSpy.mockClear();
      await agent.delete(`/api/tokens/${gmTokenRes.body.id}`);
      expect(gmRoomEmitSpy).toHaveBeenCalledWith('token:deleted', { id: gmTokenRes.body.id });
    });

    it('Bug 15 & 37: clamps map dimensions and validates hex colors', async () => {
      // Bug 15: Map width/height clamped (5..250), grid_size (10..200)
      const clampedMapRes = await agent.post('/api/maps').send({
        name: 'Bounds Map',
        width: 1000,
        height: 1,
        grid_size: 999,
        grid_color: '#112233',
      });
      expect(clampedMapRes.status).toBe(201);
      expect(clampedMapRes.body.width).toBe(250);
      expect(clampedMapRes.body.height).toBe(5);
      expect(clampedMapRes.body.grid_size).toBe(200);
      expect(clampedMapRes.body.grid_color).toBe('#112233');

      // Clamped on PUT as well
      const updatedMapRes = await agent.put(`/api/maps/${clampedMapRes.body.id}`).send({
        width: 2,
        height: 500,
        grid_size: 5,
      });
      expect(updatedMapRes.status).toBe(200);
      expect(updatedMapRes.body.width).toBe(5);
      expect(updatedMapRes.body.height).toBe(250);
      expect(updatedMapRes.body.grid_size).toBe(10);

      // Bug 37: Hex color validation
      // Invalid grid_color on POST returns 400
      const badColorPost = await agent.post('/api/maps').send({
        name: 'Bad Color Map',
        grid_color: 'invalid-red',
      });
      expect(badColorPost.status).toBe(400);

      // Invalid grid_color on PUT returns 400
      const badColorPut = await agent.put(`/api/maps/${clampedMapRes.body.id}`).send({
        grid_color: '#nothex',
      });
      expect(badColorPut.status).toBe(400);

      // Invalid token color on POST returns 400
      const badTokColorPost = await agent.post('/api/tokens').send({
        map_id: clampedMapRes.body.id,
        name: 'Bad Color Token',
        color: 'blue;',
      });
      expect(badTokColorPost.status).toBe(400);

      // Valid 3-char and 6-char hex color accepted
      const validTok = await agent.post('/api/tokens').send({
        map_id: clampedMapRes.body.id,
        name: 'Valid Color Token',
        color: '#abc',
      });
      expect(validTok.status).toBe(201);
      expect(validTok.body.color).toBe('#abc');

      // Invalid token color on PUT returns 400
      const badTokColorPut = await agent.put(`/api/tokens/${validTok.body.id}`).send({
        color: '#1234567',
      });
      expect(badTokColorPut.status).toBe(400);
    });

    it('SEC-05: Token stat manipulation & integrity clamp checks for non-GMs', async () => {
      // 1. GM creates RPG map
      const rpgMap = (await agent.post('/api/maps').send({ name: 'Sec RPG', map_type: 'rpg' })).body;

      // 2. Register Player
      await agent.post('/api/auth/register').send({ username: 'secPlayer', password: 'password123', role: 'Player' });
      const pAgent = request.agent(app);
      await pAgent.post('/api/auth/login').send({ username: 'secPlayer', password: 'password123' });

      // Create character: sta = 45, max_ess = 60, current_sta = 40, current_ess = 50
      const charRes = await pAgent.post('/api/characters').send({
        name: 'Sec Hero',
        race: 'Yazirian',
        sta: 45,
        current_sta: 40,
        max_ess: 60,
        current_ess: 50,
      });
      const char = charRes.body;

      // Non-GM creates token on RPG map attempting to inflate stats (max_hp: 9999, current_hp: 9999, ess_current: 9999)
      const inflatedCharTokenRes = await pAgent.post('/api/tokens').send({
        map_id: rpgMap.id,
        character_id: char.id,
        name: 'Sec Hero Token',
        max_hp: 9999,
        current_hp: 9999,
        ess_current: 9999,
      });
      expect(inflatedCharTokenRes.status).toBe(201);
      const cToken = inflatedCharTokenRes.body;
      // Clamped to character sheet STA and max_ess!
      expect(cToken.max_hp).toBe(45);
      expect(cToken.current_hp).toBe(45);
      expect(cToken.ess_current).toBe(60);

      // Non-GM attempts to update token current_hp beyond existing.max_hp (or negative)
      const badHpUpdate = await pAgent.put(`/api/tokens/${cToken.id}`).send({
        current_hp: 500,
        ess_current: 500,
      });
      expect(badHpUpdate.status).toBe(200);
      expect(badHpUpdate.body.current_hp).toBe(45); // clamped to max_hp (45)
      expect(badHpUpdate.body.ess_current).toBe(60); // clamped to char max_ess (60)

      const negHpUpdate = await pAgent.put(`/api/tokens/${cToken.id}`).send({
        current_hp: -20,
        ess_current: -10,
      });
      expect(negHpUpdate.status).toBe(200);
      expect(negHpUpdate.body.current_hp).toBe(0);
      expect(negHpUpdate.body.ess_current).toBe(0);

      // Verify that non-GM cannot change max_hp on PUT
      const tryChangeMax = await pAgent.put(`/api/tokens/${cToken.id}`).send({
        max_hp: 999,
      });
      expect(tryChangeMax.status).toBe(200);
      expect(tryChangeMax.body.max_hp).toBe(45);
    });

    it('SEC-AUDIT-01: map:activated emits GM tokens only to role:GameMaster and excludes GM-layer tokens for regular players', async () => {
      // GM creates map
      const mapRes = await agent.post('/api/maps').send({ name: 'Audit Map', map_type: 'rpg', is_active: 0 });
      const mapId = mapRes.body.id;

      // GM creates a visible character token
      const charTok = (await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Visible Explorer',
        layer: 'character',
        x: 10,
        y: 10,
      })).body;

      // GM creates a hidden GM-layer token
      const gmTok = (await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Secret Ambush Beast',
        layer: 'gm',
        x: 20,
        y: 20,
      })).body;

      const gmEmitSpy = vi.fn();
      const playerEmitSpy = vi.fn();
      vi.spyOn(io, 'to').mockImplementation((room) => {
        if (room === 'role:GameMaster') return { emit: gmEmitSpy };
        return io;
      });
      vi.spyOn(io, 'except').mockImplementation((room) => {
        if (room === 'role:GameMaster') return { emit: playerEmitSpy };
        return io;
      });

      // 1. Activate via POST /api/maps/:id/activate
      const activateRes = await agent.post(`/api/maps/${mapId}/activate`);
      expect(activateRes.status).toBe(200);

      expect(gmEmitSpy).toHaveBeenCalledWith('map:activated', expect.objectContaining({
        map: expect.objectContaining({ id: mapId, is_active: 1 }),
        tokens: expect.arrayContaining([
          expect.objectContaining({ id: charTok.id, name: 'Visible Explorer', layer: 'character' }),
          expect.objectContaining({ id: gmTok.id, name: 'Secret Ambush Beast', layer: 'gm' }),
        ]),
      }));

      // Player room broadcast must NOT contain GM-layer tokens
      expect(playerEmitSpy).toHaveBeenCalledWith('map:activated', expect.objectContaining({
        map: expect.objectContaining({ id: mapId, is_active: 1 }),
      }));
      const playerPayload = playerEmitSpy.mock.calls.find(call => call[0] === 'map:activated')?.[1];
      expect(playerPayload).toBeDefined();
      expect(playerPayload.tokens.some(t => t.id === gmTok.id || t.layer === 'gm')).toBe(false);
      expect(playerPayload.tokens.some(t => t.id === charTok.id)).toBe(true);

      // 2. Also verify activation via PUT /api/maps/:id
      gmEmitSpy.mockClear();
      playerEmitSpy.mockClear();

      // Deactivate first
      await agent.put(`/api/maps/${mapId}`).send({ is_active: 0 });
      gmEmitSpy.mockClear();
      playerEmitSpy.mockClear();

      // Now activate via PUT
      const putActivateRes = await agent.put(`/api/maps/${mapId}`).send({ is_active: 1 });
      expect(putActivateRes.status).toBe(200);

      expect(gmEmitSpy).toHaveBeenCalledWith('map:activated', expect.objectContaining({
        map: expect.objectContaining({ id: mapId, is_active: 1 }),
        tokens: expect.arrayContaining([
          expect.objectContaining({ id: charTok.id, name: 'Visible Explorer', layer: 'character' }),
          expect.objectContaining({ id: gmTok.id, name: 'Secret Ambush Beast', layer: 'gm' }),
        ]),
      }));

      const putPlayerPayload = playerEmitSpy.mock.calls.find(call => call[0] === 'map:activated')?.[1];
      expect(putPlayerPayload).toBeDefined();
      expect(putPlayerPayload.tokens.some(t => t.id === gmTok.id || t.layer === 'gm')).toBe(false);
      expect(putPlayerPayload.tokens.some(t => t.id === charTok.id)).toBe(true);
    });

    it('SEC-AUDIT-02: Non-GM player gets 403 when attempting to PUT or DELETE a GM-layer token even if linked to their sheet', async () => {
      // 1. GM creates RPG map
      const mapRes = await agent.post('/api/maps').send({ name: 'Audit Map 2', map_type: 'rpg' });
      const mapId = mapRes.body.id;

      // 2. Register Player and log in
      await agent.post('/api/auth/register').send({ username: 'auditPlayer', password: 'password123', role: 'Player' });
      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'auditPlayer', password: 'password123' });

      // 3. Player creates a character sheet
      const charRes = await playerAgent.post('/api/characters').send({
        name: 'Audit Hero',
        race: 'Human',
        sta: 50,
      });
      const charId = charRes.body.id;

      // 4. GM creates a token linked to Player's character sheet, but on the 'gm' layer
      const gmTokenRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        character_id: charId,
        name: 'Audit Hero (GM Hidden)',
        layer: 'gm',
        x: 10,
        y: 10,
      });
      expect(gmTokenRes.status).toBe(201);
      expect(gmTokenRes.body.layer).toBe('gm');
      const gmTokenId = gmTokenRes.body.id;

      // 5. Player attempts PUT /api/tokens/:id -> MUST get 403 Access denied
      const putRes = await playerAgent.put(`/api/tokens/${gmTokenId}`).send({
        x: 50,
        y: 50,
      });
      expect(putRes.status).toBe(403);
      expect(putRes.body.error).toBe('Access denied');

      // Verify token coordinates did not change in DB
      const checkRow = db.prepare('SELECT x, y, layer FROM tokens WHERE id = ?').get(gmTokenId);
      expect(checkRow.x).toBe(10);
      expect(checkRow.y).toBe(10);
      expect(checkRow.layer).toBe('gm');

      // 6. Player attempts DELETE /api/tokens/:id -> MUST get 403 Access denied
      const delRes = await playerAgent.delete(`/api/tokens/${gmTokenId}`);
      expect(delRes.status).toBe(403);
      expect(delRes.body.error).toBe('Access denied');

      // Verify token was not deleted
      const stillExists = db.prepare('SELECT id FROM tokens WHERE id = ?').get(gmTokenId);
      expect(stillExists).toBeDefined();

      // 7. GM CAN still move and delete the GM layer token
      const gmMoveRes = await agent.put(`/api/tokens/${gmTokenId}`).send({ x: 15, y: 15 });
      expect(gmMoveRes.status).toBe(200);
      expect(gmMoveRes.body.x).toBe(15);

      const gmDelRes = await agent.delete(`/api/tokens/${gmTokenId}`);
      expect(gmDelRes.status).toBe(200);
      expect(gmDelRes.body.ok).toBe(true);
    });

    it('emits token:deleted to non-GM sockets when hiding a token and token:created to non-GM sockets when revealing a token', async () => {
      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Stealth Scout',
        layer: 'character',
        x: 3,
        y: 3,
      });
      expect(createRes.status).toBe(201);
      const tokenId = createRes.body.id;

      const gmRoomEmitter = { emit: vi.fn() };
      const playerBroadcastEmitter = { emit: vi.fn() };
      const toSpy = vi.spyOn(io, 'to').mockImplementation((room) => {
        if (room === 'role:GameMaster') return gmRoomEmitter;
        return { emit: vi.fn() };
      });
      const exceptSpy = vi.spyOn(io, 'except').mockImplementation((room) => {
        if (room === 'role:GameMaster') return playerBroadcastEmitter;
        return { emit: vi.fn() };
      });

      try {
        // 1. Hide token (character -> gm)
        const hideRes = await agent.put(`/api/tokens/${tokenId}`).send({ layer: 'gm' });
        expect(hideRes.status).toBe(200);
        expect(hideRes.body.layer).toBe('gm');
        expect(gmRoomEmitter.emit).toHaveBeenCalledWith('token:updated', expect.objectContaining({
          token: expect.objectContaining({ id: tokenId, layer: 'gm' }),
        }));
        expect(playerBroadcastEmitter.emit).toHaveBeenCalledWith('token:deleted', { id: tokenId });

        gmRoomEmitter.emit.mockClear();
        playerBroadcastEmitter.emit.mockClear();

        // 2. Reveal token (gm -> character)
        const revealRes = await agent.put(`/api/tokens/${tokenId}`).send({ layer: 'character' });
        expect(revealRes.status).toBe(200);
        expect(revealRes.body.layer).toBe('character');
        expect(gmRoomEmitter.emit).toHaveBeenCalledWith('token:updated', expect.objectContaining({
          token: expect.objectContaining({ id: tokenId, layer: 'character' }),
        }));
        expect(playerBroadcastEmitter.emit).toHaveBeenCalledWith('token:created', expect.objectContaining({
          token: expect.objectContaining({ id: tokenId, layer: 'character' }),
        }));
      } finally {
        toSpy.mockRestore();
        exceptSpy.mockRestore();
      }
    });

    it('supports spawning adversaries with layer: "gm" via POST /api/adversaries/spawn', async () => {
      db.prepare(`
        INSERT INTO adversary_templates (id, name, category, threat_tier, hp_max)
        VALUES ('tpl_hidden_test', 'Hidden Sathar Agent', 'npc', 2, 40)
      `).run();

      const spawnRes = await agent.post('/api/adversaries/spawn').send({
        mapId,
        templateId: 'tpl_hidden_test',
        count: 2,
        layer: 'gm',
      });
      expect(spawnRes.status).toBe(201);
      expect(spawnRes.body.tokens.length).toBe(2);
      expect(spawnRes.body.tokens[0].layer).toBe('gm');
      expect(spawnRes.body.tokens[1].layer).toBe('gm');
    });
  });
});
