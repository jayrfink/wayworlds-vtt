import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';
import {
  generatePrompt,
  resolveFragment,
  resetTwistCounter,
  getTwistCounter,
  setTwistCounter,
} from '../services/oracleService.js';

describe('Narrative Oracle & Arc Engine (Server)', () => {
  let db, app, server, gmAgent, playerAgent;

  beforeEach(async () => {
    resetTwistCounter();
    db = createTestDb();
    const result = createApp(db, ':memory:');
    app = result.app;
    server = result.server;

    // Register first user as GameMaster
    gmAgent = request.agent(app);
    await gmAgent.post('/api/auth/register').send({ username: 'gm_oracle_user', password: 'password123' });
    await gmAgent.post('/api/auth/login').send({ username: 'gm_oracle_user', password: 'password123' });

    // Register second user as Player
    playerAgent = request.agent(app);
    await gmAgent.post('/api/auth/register').send({ username: 'player_oracle_user', password: 'password123' });
    await playerAgent.post('/api/auth/login').send({ username: 'player_oracle_user', password: 'password123' });
  });

  afterEach(() => {
    resetTwistCounter();
    if (db) db.close();
    if (server && server.close) server.close();
  });

  describe('Database Seeding & Schema Integrity', () => {
    it('seeds 3 default environments and 6 preloaded narrative arcs', () => {
      const envs = db.prepare('SELECT * FROM oracle_environments ORDER BY id ASC').all();
      expect(envs).toHaveLength(3);
      expect(envs.map(e => e.name)).toEqual([
        'UlvWylde: The Rime Wastes',
        'UlvWylde: The Ice Mire',
        'UlvWylde: Ironhold Citadels',
      ]);

      const arcs = db.prepare('SELECT * FROM oracle_arcs ORDER BY id ASC').all();
      expect(arcs).toHaveLength(6);
      expect(arcs.every(a => a.is_custom === 0)).toBe(true);

      const rimeArcs = arcs.filter(a => a.environment_id === envs[0].id);
      expect(rimeArcs.map(a => a.title)).toEqual([
        'The Blood-Rime Conspiracy',
        'Sanctum of the Warg-King',
      ]);
    });

    it('seeds a minimum of 120 rich oracle fragments across valid categories', () => {
      const fragments = db.prepare('SELECT * FROM oracle_fragments').all();
      expect(fragments.length).toBeGreaterThanOrEqual(120);

      const categories = new Set(fragments.map(f => f.category));
      expect(categories.has('scene_template')).toBe(true);
      expect(categories.has('location')).toBe(true);
      expect(categories.has('npc')).toBe(true);
      expect(categories.has('threat')).toBe(true);
      expect(categories.has('action_trigger')).toBe(true);
      expect(categories.has('sensory_detail')).toBe(true);
      expect(categories.has('twist')).toBe(true);
      expect(categories.has('tradition_hook')).toBe(true);
    });
  });

  describe('Oracle Service Engine', () => {
    it('prioritizes arc-specific fragments when arcId is specified', () => {
      const rimeEnv = db.prepare("SELECT id FROM oracle_environments WHERE name LIKE '%Rime%'").get();
      const bloodArc = db.prepare("SELECT id FROM oracle_arcs WHERE title LIKE '%Blood-Rime%'").get();

      // Resolve a threat for this specific arc
      const threat = resolveFragment({
        db,
        environmentId: rimeEnv.id,
        arcId: bloodArc.id,
        category: 'threat',
      });

      // Blood-Rime specific threats mention Golem or Sanguinist
      expect(
        threat.includes('Blood-Gilded Frost Golem') || threat.includes('Crimson Sanguinist')
      ).toBe(true);

      // When no arcId is passed, resolves general environment threat
      const generalThreat = resolveFragment({
        db,
        environmentId: rimeEnv.id,
        arcId: null,
        category: 'threat',
      });
      expect(generalThreat).toBeDefined();
      expect(generalThreat.length).toBeGreaterThan(0);
    });

    it('overrides primary threat or action_trigger with directiveText', () => {
      const rimeEnv = db.prepare("SELECT id FROM oracle_environments WHERE name LIKE '%Rime%'").get();
      const directive = 'Giant Frost Ambush on the Cliffside';

      const log = generatePrompt({
        db,
        environmentId: rimeEnv.id,
        directiveText: directive,
      });

      expect(log.text_content).toContain(directive);
      expect(log.text_content).not.toContain('#threat#');
      expect(log.text_content).not.toContain('#location#');
      expect(log.source).toBe('engine');
    });

    it('triggers a twist and sets source="twist" every 5th generation', () => {
      const rimeEnv = db.prepare("SELECT id FROM oracle_environments WHERE name LIKE '%Rime%'").get();

      setTwistCounter(0);

      // Generations 1 to 4 should be 'engine'
      for (let i = 1; i <= 4; i++) {
        const log = generatePrompt({
          db,
          environmentId: rimeEnv.id,
        });
        expect(log.source).toBe('engine');
        expect(log.text_content).not.toContain('[TWIST]:');
        expect(getTwistCounter()).toBe(i);
      }

      // Generation 5 triggers the twist!
      const twistLog = generatePrompt({
        db,
        environmentId: rimeEnv.id,
      });
      expect(twistLog.source).toBe('twist');
      expect(twistLog.text_content).toContain('[TWIST]:');
      expect(getTwistCounter()).toBe(5);
    });
  });

  describe('Strict GM-Only Access Control & API Endpoints', () => {
    it('denies unauthenticated requests with 401', async () => {
      const unauthInit = await request(app).get('/api/oracle/init');
      expect(unauthInit.status).toBe(401);

      const unauthGen = await request(app).post('/api/oracle/generate').send({ environmentId: 1 });
      expect(unauthGen.status).toBe(401);

      const unauthLog = await request(app).post('/api/oracle/log').send({ textContent: 'Secret' });
      expect(unauthLog.status).toBe(401);

      const unauthDel = await request(app).delete('/api/oracle/logs');
      expect(unauthDel.status).toBe(401);
    });

    it('denies Player accounts with 403 Forbidden', async () => {
      const playerInit = await playerAgent.get('/api/oracle/init');
      expect(playerInit.status).toBe(403);

      const playerGen = await playerAgent.post('/api/oracle/generate').send({ environmentId: 1 });
      expect(playerGen.status).toBe(403);

      const playerLog = await playerAgent.post('/api/oracle/log').send({ textContent: 'Player test' });
      expect(playerLog.status).toBe(403);

      const playerArc = await playerAgent.post('/api/oracle/arcs').send({ environmentId: 1, title: 'Test' });
      expect(playerArc.status).toBe(403);

      const playerDel = await playerAgent.delete('/api/oracle/logs');
      expect(playerDel.status).toBe(403);
    });

    it('allows GameMaster to fetch init data on GET /api/oracle/init', async () => {
      const res = await gmAgent.get('/api/oracle/init');
      expect(res.status).toBe(200);
      expect(res.body.environments).toHaveLength(3);
      expect(res.body.environments[0].arcs).toHaveLength(2);
      expect(res.body.arcs).toHaveLength(6);
      expect(Array.isArray(res.body.logs)).toBe(true);
    });

    it('allows GameMaster to generate narrative prompt on POST /api/oracle/generate', async () => {
      const initRes = await gmAgent.get('/api/oracle/init');
      const envId = initRes.body.environments[0].id;
      const arcId = initRes.body.environments[0].arcs[0].id;

      const genRes = await gmAgent.post('/api/oracle/generate').send({
        environmentId: envId,
        arcId: arcId,
        contextType: 'combat',
        resolutionOutcome: 'failure',
        directiveText: 'Urkai Dreadnought Ambush',
      });

      expect(genRes.status).toBe(201);
      expect(genRes.body.text_content).toContain('Urkai Dreadnought Ambush');
      expect(genRes.body.environment_id).toBe(envId);
      expect(genRes.body.arc_id).toBe(arcId);
      expect(genRes.body.context_type).toBe('combat');
    });

    it('allows GameMaster to log manual narrative note on POST /api/oracle/log', async () => {
      const res = await gmAgent.post('/api/oracle/log').send({
        environmentId: 1,
        textContent: 'The party entered the high citadel under heavy blizzard cover.',
        contextType: 'lore',
      });

      expect(res.status).toBe(201);
      expect(res.body.source).toBe('gm_manual');
      expect(res.body.text_content).toBe('The party entered the high citadel under heavy blizzard cover.');
    });

    it('allows GameMaster to author a custom Narrative Arc on POST /api/oracle/arcs', async () => {
      const res = await gmAgent.post('/api/oracle/arcs').send({
        environmentId: 1,
        title: 'The Howling Rift of the Ancients',
        synopsis: 'A deep fissure tearing through the permafrost, unleashing primeval entities.',
        fragments: [
          { category: 'threat', text_value: 'a Tier 3 Rift Weaver crawling on crystalline ice legs' },
          { category: 'location', text_value: 'the abyssal lip of the Howling Rift' },
        ],
      });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('The Howling Rift of the Ancients');
      expect(res.body.is_custom).toBe(1);

      // Verify fragments inserted
      const savedFragments = db.prepare('SELECT * FROM oracle_fragments WHERE arc_id = ?').all(res.body.id);
      expect(savedFragments).toHaveLength(2);
    });

    it('allows GameMaster to clear logs on DELETE /api/oracle/logs', async () => {
      // Add a log
      await gmAgent.post('/api/oracle/log').send({
        environmentId: 1,
        textContent: 'Temporary log to clear',
      });

      const delRes = await gmAgent.delete('/api/oracle/logs');
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const initRes = await gmAgent.get('/api/oracle/init');
      expect(initRes.body.logs).toHaveLength(0);
    });

    it('allows GameMaster to share narrative entry to Public Chat on POST /api/oracle/share', async () => {
      const shareRes = await gmAgent.post('/api/oracle/share').send({
        textContent: 'A massive frost shadow looms over the valley!',
        source: 'engine',
      });

      expect(shareRes.status).toBe(200);
      expect(shareRes.body.success).toBe(true);
      expect(shareRes.body.shared.text).toBe('A massive frost shadow looms over the valley!');
      expect(shareRes.body.shared.sender).toBe('Game Master');
    });
  });
});
