import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { createDb } from '../src/db.js';

describe('GET /api/equipment - Wayworlds Fantasy Equipment Catalog', () => {
  let db;
  let server;
  let response;
  const ALLOWED_CATEGORIES = ['Weapon', 'Armor', 'Shield', 'Kit'];

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
    for (const n of ['Leather Armor', 'Chainmail', 'Full Plate', 'Shield',
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

    const leather = itemMap.get('Leather Armor');
    expect(leather.category).toBe('Armor');
    expect(leather.armor_dr).toBe(2);
    expect(leather.weight_lbs).toBe(10);

    const plate = itemMap.get('Full Plate');
    expect(plate.armor_dr).toBe('half_all');
    expect(plate.weight_lbs).toBe(50);

    const shield = itemMap.get('Shield');
    expect(shield.category).toBe('Shield');
    expect(shield.attacker_pct_penalty).toBe(-5);

    const medic = itemMap.get('Medic Kit');
    expect(medic.category).toBe('Kit');
    expect(medic.weight_lbs).toBe(2);
  });
});
