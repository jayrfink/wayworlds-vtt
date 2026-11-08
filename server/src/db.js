import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = path.join(__dirname, '../../data');
const DEFAULT_DB_PATH = path.join(DEFAULT_DATA_DIR, 'app.db');

// Remove the retired Starship / Space VTT data. Anything that is deleted is first written to a
// JSON backup under <dataDir>/backups so it can be recovered.
function removeLegacySpaceData(db, dataDir) {
  const hasShips = Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='ship_sheets'").get());
  const spaceMaps = db.prepare("SELECT * FROM maps WHERE map_type = 'space'").all();
  const rollSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='roll_logs'").get()?.sql || '';
  const rollsNeedRebuild = rollSql.includes("'space'");
  if (!hasShips && spaceMaps.length === 0 && !rollsNeedRebuild) return;

  const backup = {
    created_at: new Date().toISOString(),
    ship_sheets: hasShips ? db.prepare('SELECT * FROM ship_sheets').all() : [],
    maps: spaceMaps,
    tokens: spaceMaps.length
      ? db.prepare(`SELECT * FROM tokens WHERE map_id IN (${spaceMaps.map(() => '?').join(',')})`).all(...spaceMaps.map(m => m.id))
      : [],
    roll_logs: rollsNeedRebuild ? db.prepare("SELECT * FROM roll_logs WHERE mode = 'space'").all() : [],
  };
  const hasData = backup.ship_sheets.length || backup.maps.length || backup.tokens.length || backup.roll_logs.length;
  if (hasData && dataDir) {
    const backupDir = path.join(dataDir, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const file = path.join(backupDir, `legacy-space-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  }

  db.pragma('foreign_keys = OFF');
  const tx = db.transaction(() => {
    for (const m of spaceMaps) {
      db.prepare('DELETE FROM tokens WHERE map_id = ?').run(m.id);
      db.prepare('DELETE FROM maps WHERE id = ?').run(m.id);
    }
    if (hasShips) db.exec('DROP TABLE ship_sheets');
    if (rollsNeedRebuild) {
      db.exec(`
        CREATE TABLE roll_logs_world_tmp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mode TEXT NOT NULL CHECK(mode IN ('rpg', 'world')),
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          role TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('percentile', 'damage', 'initiative')),
          label TEXT NOT NULL,
          total INTEGER NOT NULL,
          breakdown TEXT NOT NULL,
          roll_summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO roll_logs_world_tmp (id, mode, user_id, username, role, type, label, total, breakdown, roll_summary, created_at)
        SELECT id, mode, user_id, username, role, type, label, total, breakdown, roll_summary, created_at
        FROM roll_logs WHERE mode = 'rpg';
        DROP TABLE roll_logs;
        ALTER TABLE roll_logs_world_tmp RENAME TO roll_logs;
        CREATE INDEX IF NOT EXISTS idx_roll_logs_mode_created ON roll_logs(mode, created_at DESC);
      `);
    }
  });
  tx();
  db.pragma('foreign_keys = ON');
}

function migrate(db, dataDir = null) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Player' CHECK(role IN ('Player', 'GameMaster')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      preferences TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS character_sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      race TEXT NOT NULL CHECK(length(trim(race)) > 0),
      psa TEXT NOT NULL DEFAULT 'Martial' CHECK(psa IN ('Martial', 'Mystic', 'Theurgy', 'Combat', 'Magic', 'Military', 'Technological', 'Biosocial')),
      gender TEXT,
      height TEXT,
      weight TEXT,
      str INTEGER NOT NULL DEFAULT 50,
      sta INTEGER NOT NULL DEFAULT 50,
      current_sta INTEGER NOT NULL DEFAULT 50,
      max_ess INTEGER NOT NULL DEFAULT 50,
      current_ess INTEGER NOT NULL DEFAULT 50,
      current_xp INTEGER NOT NULL DEFAULT 0,
      dex INTEGER NOT NULL DEFAULT 50,
      rs INTEGER NOT NULL DEFAULT 50,
      int_stat INTEGER NOT NULL DEFAULT 50,
      log_stat INTEGER NOT NULL DEFAULT 50,
      per INTEGER NOT NULL DEFAULT 50,
      ldr INTEGER NOT NULL DEFAULT 50,
      racial_abilities TEXT DEFAULT '{}',
      skills TEXT DEFAULT '[]',
      inventory TEXT DEFAULT '[]',
      grimoire TEXT DEFAULT '[]',
      color_theme TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      map_type TEXT DEFAULT 'rpg',
      hex_miles REAL NOT NULL DEFAULT 6,
      background_url TEXT DEFAULT '',
      preset_bg TEXT DEFAULT 'grid_only',
      width INTEGER NOT NULL DEFAULT 20,
      height INTEGER NOT NULL DEFAULT 20,
      grid_size INTEGER NOT NULL DEFAULT 40,
      grid_color TEXT DEFAULT '#333333',
      grid_line_width REAL NOT NULL DEFAULT 1,
      grid_visible INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 0,
      fog_enabled INTEGER NOT NULL DEFAULT 0,
      fog_data TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS world_markers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      map_id INTEGER NOT NULL,
      marker_type TEXT NOT NULL DEFAULT 'poi' CHECK(marker_type IN ('party', 'battle', 'faction', 'poi', 'hazard')),
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#4fc3f7',
      avatar_url TEXT DEFAULT '',
      x_miles REAL NOT NULL DEFAULT 0,
      y_miles REAL NOT NULL DEFAULT 0,
      hex_q INTEGER NOT NULL DEFAULT 0,
      hex_r INTEGER NOT NULL DEFAULT 0,
      linked_map_id INTEGER,
      owner_user_id INTEGER,
      hidden INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
      FOREIGN KEY (linked_map_id) REFERENCES maps(id) ON DELETE SET NULL,
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_world_markers_map ON world_markers(map_id);

    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      map_id INTEGER NOT NULL,
      character_id INTEGER,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#666666',
      avatar_url TEXT DEFAULT '',
      x INTEGER NOT NULL DEFAULT 0,
      y INTEGER NOT NULL DEFAULT 0,
      size INTEGER NOT NULL DEFAULT 1,
      current_hp INTEGER,
      max_hp INTEGER,
      status_effects TEXT DEFAULT '[]',
      layer TEXT NOT NULL DEFAULT 'character',
      rotation INTEGER DEFAULT 0,
      current_speed INTEGER DEFAULT 0,
      template_id TEXT,
      conditions TEXT DEFAULT '[]',
      ess_current INTEGER,
      vehicle_data TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES adversary_templates(id)
    );

    CREATE TABLE IF NOT EXISTS vehicle_templates (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Ground',
      cost INTEGER NOT NULL DEFAULT 5000,
      top_speed_kph INTEGER NOT NULL DEFAULT 100,
      top_speed_m_turn INTEGER NOT NULL DEFAULT 175,
      cruise_speed_kph INTEGER NOT NULL DEFAULT 60,
      accel INTEGER NOT NULL DEFAULT 60,
      decel INTEGER NOT NULL DEFAULT 40,
      turn_speed INTEGER NOT NULL DEFAULT 80,
      passengers INTEGER NOT NULL DEFAULT 4,
      cargo_kg INTEGER NOT NULL DEFAULT 150,
      cargo_m3 REAL NOT NULL DEFAULT 1.0,
      battery_type TEXT NOT NULL DEFAULT 'Type 2 (100 ESS)',
      max_ess INTEGER NOT NULL DEFAULT 100,
      token_size INTEGER NOT NULL DEFAULT 2,
      avatar_url TEXT DEFAULT '',
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS adversary_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('npc', 'creature')),
      threat_tier INTEGER NOT NULL CHECK(threat_tier BETWEEN 1 AND 5),
      token_image_path TEXT NOT NULL DEFAULT '',
      token_size INTEGER NOT NULL DEFAULT 1,
      hp_max INTEGER NOT NULL,
      defense_summary TEXT NOT NULL DEFAULT '',
      movement TEXT NOT NULL DEFAULT '12 m/s',
      initiative_mod INTEGER NOT NULL DEFAULT 0,
      actions TEXT NOT NULL DEFAULT '[]',
      traits TEXT NOT NULL DEFAULT '[]',
      system_data TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS roll_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK(mode IN ('rpg', 'world')),
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('percentile', 'damage', 'initiative')),
      label TEXT NOT NULL,
      total INTEGER NOT NULL,
      breakdown TEXT NOT NULL,
      roll_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_roll_logs_mode_created ON roll_logs(mode, created_at DESC);

    CREATE TABLE IF NOT EXISTS gm_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT 'Session 1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gm_note_panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT 'New Note',
      content TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES gm_sessions(id) ON DELETE CASCADE
    );
  `);

  // Rename legacy SEU columns to ESS on existing databases (preserves data).
  for (const [table, from, to] of [
    ['character_sheets', 'max_seu', 'max_ess'],
    ['character_sheets', 'current_seu', 'current_ess'],
    ['tokens', 'seu_current', 'ess_current'],
    ['vehicle_templates', 'max_seu', 'max_ess'],
  ]) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (cols.includes(from) && !cols.includes(to)) {
      db.exec(`ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to}`);
    }
  }

  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('preferences')) {
    db.exec("ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}'");
  }

  const mapCols = db.prepare("PRAGMA table_info(maps)").all().map(c => c.name);
  
  if (!mapCols.includes('fog_enabled')) {
    db.exec('ALTER TABLE maps ADD COLUMN fog_enabled INTEGER NOT NULL DEFAULT 0');
  }
if (!mapCols.includes('grid_line_width')) {
    db.exec('ALTER TABLE maps ADD COLUMN grid_line_width REAL NOT NULL DEFAULT 1');
  }
if (!mapCols.includes('grid_visible')) {
    db.exec('ALTER TABLE maps ADD COLUMN grid_visible INTEGER NOT NULL DEFAULT 1');
  }
if (!mapCols.includes('hex_miles')) {
    db.exec('ALTER TABLE maps ADD COLUMN hex_miles REAL NOT NULL DEFAULT 6');
  }
if (!mapCols.includes('map_type')) {
    db.exec('ALTER TABLE maps ADD COLUMN map_type TEXT DEFAULT "rpg"');
  }

  
  const charCols = db.prepare("PRAGMA table_info(character_sheets)").all().map(c => c.name);
  if (!charCols.includes('avatar_url')) {
    db.exec('ALTER TABLE character_sheets ADD COLUMN avatar_url TEXT DEFAULT ""');
  }
  if (!charCols.includes('psa')) {
    db.exec('ALTER TABLE character_sheets ADD COLUMN psa TEXT NOT NULL DEFAULT "Martial"');
  }
  if (!charCols.includes('max_ess')) {
    db.exec('ALTER TABLE character_sheets ADD COLUMN max_ess INTEGER NOT NULL DEFAULT 50');
  }
  if (!charCols.includes('current_ess')) {
    db.exec('ALTER TABLE character_sheets ADD COLUMN current_ess INTEGER NOT NULL DEFAULT 50');
  }
  if (!charCols.includes('current_xp')) {
    db.exec('ALTER TABLE character_sheets ADD COLUMN current_xp INTEGER NOT NULL DEFAULT 0');
  }
  if (!charCols.includes('sort_order')) {
    db.exec('ALTER TABLE character_sheets ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
    db.exec('UPDATE character_sheets SET sort_order = id');
  }
  if (!charCols.includes('grimoire')) {
    db.exec("ALTER TABLE character_sheets ADD COLUMN grimoire TEXT DEFAULT '[]'");
  }
  if (!charCols.includes('color_theme')) {
    db.exec("ALTER TABLE character_sheets ADD COLUMN color_theme TEXT DEFAULT ''");
  }

  const charTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='character_sheets'").get();
  if (charTableInfo && charTableInfo.sql && (
    charTableInfo.sql.includes("CHECK(race IN ('Human', 'Dralasite', 'Vrusk', 'Yazirian'))") ||
    !charTableInfo.sql.includes("'Martial'")
  )) {
    db.pragma('foreign_keys = OFF');
    const migrateCharSheets = db.transaction(() => {
      db.exec(`
        CREATE TABLE character_sheets_dg_tmp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          race TEXT NOT NULL CHECK(length(trim(race)) > 0),
          psa TEXT NOT NULL DEFAULT 'Martial' CHECK(psa IN ('Martial', 'Mystic', 'Theurgy', 'Combat', 'Magic', 'Military', 'Technological', 'Biosocial')),
          gender TEXT,
          height TEXT,
          weight TEXT,
          str INTEGER NOT NULL DEFAULT 50,
          sta INTEGER NOT NULL DEFAULT 50,
          current_sta INTEGER NOT NULL DEFAULT 50,
          max_ess INTEGER NOT NULL DEFAULT 50,
          current_ess INTEGER NOT NULL DEFAULT 50,
          current_xp INTEGER NOT NULL DEFAULT 0,
          dex INTEGER NOT NULL DEFAULT 50,
          rs INTEGER NOT NULL DEFAULT 50,
          int_stat INTEGER NOT NULL DEFAULT 50,
          log_stat INTEGER NOT NULL DEFAULT 50,
          per INTEGER NOT NULL DEFAULT 50,
          ldr INTEGER NOT NULL DEFAULT 50,
          racial_abilities TEXT DEFAULT '{}',
          skills TEXT DEFAULT '[]',
          inventory TEXT DEFAULT '[]',
          notes TEXT DEFAULT '',
          avatar_url TEXT DEFAULT '',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT INTO character_sheets_dg_tmp (
          id, user_id, name, race, psa, gender, height, weight,
          str, sta, current_sta, max_ess, current_ess, current_xp, dex, rs, int_stat, log_stat, per, ldr,
          racial_abilities, skills, inventory, notes, avatar_url, sort_order, created_at, updated_at
        )
        SELECT
          id, user_id, name, race,
          CASE
            WHEN psa IN ('Military', 'Combat') THEN 'Martial'
            WHEN psa IN ('Technological', 'Magic') THEN 'Mystic'
            WHEN psa = 'Biosocial' THEN 'Theurgy'
            ELSE COALESCE(psa, 'Martial')
          END,
          gender, height, weight,
          str, sta, current_sta,
          COALESCE(max_ess, 50), COALESCE(current_ess, 50), COALESCE(current_xp, 0),
          dex, rs, int_stat, log_stat, per, ldr,
          racial_abilities, skills, inventory, notes, avatar_url, COALESCE(sort_order, id), created_at, updated_at
        FROM character_sheets;
        DROP TABLE character_sheets;
        ALTER TABLE character_sheets_dg_tmp RENAME TO character_sheets;
      `);
    });
    migrateCharSheets();
    db.pragma('foreign_keys = ON');
  }

  try {
    db.exec(`
      UPDATE character_sheets SET psa = 'Martial' WHERE psa IN ('Military', 'Combat');
      UPDATE character_sheets SET psa = 'Mystic' WHERE psa IN ('Technological', 'Magic');
      UPDATE character_sheets SET psa = 'Theurgy' WHERE psa = 'Biosocial';
    `);
  } catch (_e) {
    // Ignore if table check prevents update before migration
  }

  const tokensTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tokens'").get();
  if (tokensTableInfo && tokensTableInfo.sql && !tokensTableInfo.sql.includes('ON DELETE CASCADE')) {
    db.pragma('foreign_keys = OFF');
    const migrateTokens = db.transaction(() => {
      db.exec(`
        CREATE TABLE tokens_dg_tmp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          map_id INTEGER NOT NULL,
          character_id INTEGER,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#666666',
          avatar_url TEXT DEFAULT '',
          x INTEGER NOT NULL DEFAULT 0,
          y INTEGER NOT NULL DEFAULT 0,
          size INTEGER NOT NULL DEFAULT 1,
          current_hp INTEGER,
          max_hp INTEGER,
          status_effects TEXT DEFAULT '[]',
          layer TEXT NOT NULL DEFAULT 'character',
          rotation INTEGER DEFAULT 0,
          current_speed INTEGER DEFAULT 0,
          template_id TEXT,
          conditions TEXT DEFAULT '[]',
          ess_current INTEGER,
          vehicle_data TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
          FOREIGN KEY (template_id) REFERENCES adversary_templates(id)
        );
        INSERT INTO tokens_dg_tmp (
          id, map_id, character_id, name, color, avatar_url, x, y, size,
          current_hp, max_hp, status_effects, layer, rotation, current_speed,
          template_id, conditions, ess_current, vehicle_data, created_at, updated_at
        )
        SELECT
          id, map_id, character_id, name, color, avatar_url, x, y, size,
          current_hp, max_hp, status_effects, layer, rotation, current_speed,
          template_id, conditions, ess_current, vehicle_data, created_at, updated_at
        FROM tokens;
        DROP TABLE tokens;
        ALTER TABLE tokens_dg_tmp RENAME TO tokens;
      `);
    });
    migrateTokens();
    db.pragma('foreign_keys = ON');
  }

  const rollLogsTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='roll_logs'").get();
  if (rollLogsTableInfo && rollLogsTableInfo.sql && !rollLogsTableInfo.sql.includes('initiative')) {
    db.pragma('foreign_keys = OFF');
    const migrateRollLogs = db.transaction(() => {
      db.exec(`
        CREATE TABLE roll_logs_dg_tmp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mode TEXT NOT NULL CHECK(mode IN ('rpg', 'space')),
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          role TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('percentile', 'damage', 'initiative')),
          label TEXT NOT NULL,
          total INTEGER NOT NULL,
          breakdown TEXT NOT NULL,
          roll_summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO roll_logs_dg_tmp (id, mode, user_id, username, role, type, label, total, breakdown, roll_summary, created_at)
        SELECT id, mode, user_id, username, role, type, label, total, breakdown, roll_summary, created_at
        FROM roll_logs;
        DROP TABLE roll_logs;
        ALTER TABLE roll_logs_dg_tmp RENAME TO roll_logs;
        CREATE INDEX IF NOT EXISTS idx_roll_logs_mode_created ON roll_logs(mode, created_at DESC);
      `);
    });
    migrateRollLogs();
    db.pragma('foreign_keys = ON');
  }

  removeLegacySpaceData(db, dataDir);

  const tokenCols = db.prepare("PRAGMA table_info(tokens)").all().map(c => c.name);
  if (!tokenCols.includes('rotation')) {
    db.exec('ALTER TABLE tokens ADD COLUMN rotation INTEGER DEFAULT 0');
  }
  if (!tokenCols.includes('current_speed')) {
    db.exec('ALTER TABLE tokens ADD COLUMN current_speed INTEGER DEFAULT 0');
  }
  if (!tokenCols.includes('template_id')) {
    db.exec('ALTER TABLE tokens ADD COLUMN template_id TEXT REFERENCES adversary_templates(id)');
  }
  if (!tokenCols.includes('conditions')) {
    db.exec('ALTER TABLE tokens ADD COLUMN conditions TEXT DEFAULT "[]"');
  }
  if (!tokenCols.includes('ess_current')) {
    db.exec('ALTER TABLE tokens ADD COLUMN ess_current INTEGER');
  }
  if (!tokenCols.includes('vehicle_data')) {
    db.exec('ALTER TABLE tokens ADD COLUMN vehicle_data TEXT DEFAULT NULL');
  }
}

export function createDb(dbPath = DEFAULT_DB_PATH) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db, dir);
  return db;
}

export function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

