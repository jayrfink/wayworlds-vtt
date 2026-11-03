import { describe, it, expect, afterEach } from 'vitest';
import { createTestDb, createDb } from '../src/db.js';
import fs from 'fs';
import path from 'path';

describe('Database', () => {
  let db;

  afterEach(() => {
    if (db) {
      db.close();
      db = null;
    }
  });

  it('creates users table with correct columns', () => {
    db = createTestDb();
    const columns = db.pragma('table_info(users)');
    const colNames = columns.map(c => c.name);
    expect(colNames).toEqual(['id', 'username', 'password_hash', 'role', 'created_at']);
  });

  it('defaults role to Player', () => {
    db = createTestDb();
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('testuser', 'hash');
    const user = db.prepare('SELECT role FROM users WHERE username = ?').get('testuser');
    expect(user.role).toBe('Player');
  });

  it('enforces unique username constraint', () => {
    db = createTestDb();
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('dupe', 'hash', 'Player');
    expect(() => {
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('dupe', 'hash2', 'Player');
    }).toThrow();
  });

  it('enforces role check constraint', () => {
    db = createTestDb();
    expect(() => {
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('bad', 'hash', 'Admin');
    }).toThrow();
  });

  it('createDb creates file database with WAL mode and users table', () => {
    const tmpDbPath = path.join('/tmp', `test-${Date.now()}.db`);
    try {
      db = createDb(tmpDbPath);
      const pragma = db.pragma('journal_mode');
      expect(pragma[0].journal_mode).toBe('wal');
      const columns = db.pragma('table_info(users)');
      expect(columns.length).toBe(5);
    } finally {
      if (db) {
        db.close();
        db = null;
      }
      if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
      if (fs.existsSync(`${tmpDbPath}-wal`)) fs.unlinkSync(`${tmpDbPath}-wal`);
      if (fs.existsSync(`${tmpDbPath}-shm`)) fs.unlinkSync(`${tmpDbPath}-shm`);
    }
  });

  it('preserves custom character_sheets sort_order across multiple createDb calls (server restart)', () => {
    const tmpDbPath = path.join('/tmp', `test-chars-reorder-${Date.now()}.db`);
    try {
      db = createDb(tmpDbPath);
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('gm', 'hash', 'GameMaster');
      db.prepare('INSERT INTO character_sheets (user_id, name, race, sort_order) VALUES (?, ?, ?, ?)').run(1, 'Alpha', 'Human', 1);
      db.prepare('INSERT INTO character_sheets (user_id, name, race, sort_order) VALUES (?, ?, ?, ?)').run(1, 'Beta', 'Vrusk', 2);
      db.prepare('INSERT INTO character_sheets (user_id, name, race, sort_order) VALUES (?, ?, ?, ?)').run(1, 'Gamma', 'Yazirian', 3);

      // Reorder: Gamma (0), Alpha (1), Beta (2)
      db.prepare('UPDATE character_sheets SET sort_order = 0 WHERE id = 3').run();
      db.prepare('UPDATE character_sheets SET sort_order = 1 WHERE id = 1').run();
      db.prepare('UPDATE character_sheets SET sort_order = 2 WHERE id = 2').run();

      const beforeRestart = db.prepare('SELECT id, name, sort_order FROM character_sheets ORDER BY sort_order ASC, id ASC').all();
      expect(beforeRestart.map(c => c.name)).toEqual(['Gamma', 'Alpha', 'Beta']);
      db.close();

      // Simulate server restart by reopening the database with createDb
      db = createDb(tmpDbPath);
      const afterRestart = db.prepare('SELECT id, name, sort_order FROM character_sheets ORDER BY sort_order ASC, id ASC').all();
      expect(afterRestart.map(c => c.name)).toEqual(['Gamma', 'Alpha', 'Beta']);
    } finally {
      if (db) {
        db.close();
        db = null;
      }
      if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
      if (fs.existsSync(`${tmpDbPath}-wal`)) fs.unlinkSync(`${tmpDbPath}-wal`);
      if (fs.existsSync(`${tmpDbPath}-shm`)) fs.unlinkSync(`${tmpDbPath}-shm`);
    }
  });

  it('creates the world_markers table with marker_type constraint and cascades on map delete', () => {
    db = createTestDb();
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('gm', 'hash', 'GameMaster');
    const map = db.prepare("INSERT INTO maps (user_id, name, map_type) VALUES (1, 'Realm', 'world')").run();
    const mapId = Number(map.lastInsertRowid);

    for (const type of ['party', 'battle', 'faction', 'poi', 'hazard']) {
      db.prepare('INSERT INTO world_markers (map_id, marker_type, name) VALUES (?, ?, ?)').run(mapId, type, `m-${type}`);
    }
    expect(() => db.prepare("INSERT INTO world_markers (map_id, marker_type, name) VALUES (?, 'ship', 'bad')").run(mapId)).toThrow();
    expect(db.prepare('SELECT COUNT(*) AS c FROM world_markers').get().c).toBe(5);
    expect(db.prepare('SELECT hex_miles FROM maps WHERE id = ?').get(mapId).hex_miles).toBe(6);

    db.prepare('DELETE FROM maps WHERE id = ?').run(mapId);
    expect(db.prepare('SELECT COUNT(*) AS c FROM world_markers').get().c).toBe(0);
  });

  it('removes legacy ship_sheets and space maps on startup after writing a JSON backup', async () => {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'legacy-space-'));
    const tmpDbPath = path.join(tmpDir, 'app.db');
    try {
      db = createDb(tmpDbPath);
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('gm', 'hash', 'GameMaster');
      db.exec(`
        CREATE TABLE ship_sheets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, ship_type TEXT NOT NULL);
        INSERT INTO ship_sheets (user_id, name, ship_type) VALUES (1, 'Old Scout', 'Scout');
      `);
      const spaceMap = db.prepare("INSERT INTO maps (user_id, name, map_type) VALUES (1, 'Deep Space', 'space')").run();
      db.prepare("INSERT INTO maps (user_id, name, map_type) VALUES (1, 'Dungeon', 'rpg')").run();
      db.prepare("INSERT INTO tokens (map_id, name) VALUES (?, 'Scout Token')").run(spaceMap.lastInsertRowid);
      db.close();

      db = createDb(tmpDbPath);
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ship_sheets'").get()).toBeUndefined();
      expect(db.prepare("SELECT COUNT(*) AS c FROM maps WHERE map_type = 'space'").get().c).toBe(0);
      expect(db.prepare("SELECT COUNT(*) AS c FROM maps WHERE map_type = 'rpg'").get().c).toBe(1);
      expect(db.prepare('SELECT COUNT(*) AS c FROM tokens').get().c).toBe(0);

      const backups = fs.readdirSync(path.join(tmpDir, 'backups'));
      expect(backups.length).toBe(1);
      const backup = JSON.parse(fs.readFileSync(path.join(tmpDir, 'backups', backups[0]), 'utf8'));
      expect(backup.ship_sheets.map(s => s.name)).toEqual(['Old Scout']);
      expect(backup.maps.map(m => m.name)).toEqual(['Deep Space']);
      expect(backup.tokens.map(t => t.name)).toEqual(['Scout Token']);
    } finally {
      if (db) {
        db.close();
        db = null;
      }
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('migrates a legacy roll_logs table with mode space to world, dropping space rolls', () => {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'legacy-rolls-'));
    const tmpDbPath = path.join(tmpDir, 'app.db');
    try {
      db = createDb(tmpDbPath);
      db.exec(`
        DROP TABLE roll_logs;
        CREATE TABLE roll_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mode TEXT NOT NULL CHECK(mode IN ('rpg', 'space')),
          user_id INTEGER NOT NULL, username TEXT NOT NULL, role TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('percentile', 'damage', 'initiative')),
          label TEXT NOT NULL, total INTEGER NOT NULL, breakdown TEXT NOT NULL, roll_summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO roll_logs (mode, user_id, username, role, type, label, total, breakdown) VALUES ('rpg', 1, 'a', 'Player', 'damage', 'x', 5, '5');
        INSERT INTO roll_logs (mode, user_id, username, role, type, label, total, breakdown) VALUES ('space', 1, 'a', 'Player', 'damage', 'y', 6, '6');
      `);
      db.close();

      db = createDb(tmpDbPath);
      expect(db.prepare('SELECT mode FROM roll_logs').all().map(r => r.mode)).toEqual(['rpg']);
      db.prepare("INSERT INTO roll_logs (mode, user_id, username, role, type, label, total, breakdown) VALUES ('world', 1, 'a', 'Player', 'damage', 'z', 7, '7')").run();
      expect(() => db.prepare("INSERT INTO roll_logs (mode, user_id, username, role, type, label, total, breakdown) VALUES ('space', 1, 'a', 'Player', 'damage', 'z', 7, '7')").run()).toThrow();
    } finally {
      if (db) {
        db.close();
        db = null;
      }
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
