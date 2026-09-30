import { copyFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, DB_PATH } from '../db.ts';
import { DATA_DIR } from '../paths.ts';

/**
 * Tablas de la integración con ETG. Solo cambios aditivos: tablas nuevas y
 * columnas nuevas (nullable o con default) en `vehicles`. Nada existente se
 * borra, se renombra ni cambia de tipo.
 */

function addColumns(table: string, cols: Record<string, string>) {
  const have = new Set((db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name));
  for (const [name, type] of Object.entries(cols)) {
    if (!have.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }
}

const hasTable = (name: string) =>
  Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));

/**
 * Copia de la base antes de la primera migración de ETG (y solo entonces):
 * data/backups/pre-etg-<fecha>.db. Con WAL activo se fuerza un checkpoint para
 * que el archivo copiado tenga todo.
 */
function backupBeforeFirstMigration() {
  if (hasTable('etg_orders')) return;
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    const dir = resolve(DATA_DIR, 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    copyFileSync(DB_PATH, resolve(dir, `pre-etg-${stamp}.db`));
    console.log(`ETG: copia de seguridad en data/backups/pre-etg-${stamp}.db`);
  } catch (err) {
    console.error('ETG: no se pudo hacer la copia previa a la migración:', err);
  }
}

export function migrateEtg() {
  backupBeforeFirstMigration();

  db.exec(`
    -- Una fila por búsqueda: el request y todas sus ofertas. El id de cada
    -- oferta es "<id de búsqueda>.<n>", así que se encuentra por prefijo sin
    -- guardar una fila por oferta (80 000 búsquedas al día).
    CREATE TABLE IF NOT EXISTS etg_searches (
      id          TEXT PRIMARY KEY,
      created_at  INTEGER NOT NULL,
      expires_at  INTEGER NOT NULL,
      env         TEXT NOT NULL DEFAULT '',
      request     TEXT NOT NULL,
      response    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS etg_searches_expires ON etg_searches(expires_at);

    -- Órdenes que llegan de ETG. El código corto es el order_id que ve ETG.
    CREATE TABLE IF NOT EXISTS etg_orders (
      order_code        TEXT PRIMARY KEY,
      offer_id          TEXT NOT NULL UNIQUE,
      source            TEXT NOT NULL DEFAULT 'etg',
      env               TEXT NOT NULL DEFAULT '',
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
      status            TEXT NOT NULL DEFAULT 'confirmed',
      internal_status   TEXT NOT NULL DEFAULT 'confirmed',
      start_wall        TEXT NOT NULL,
      tz                TEXT NOT NULL,
      start_point       TEXT NOT NULL,
      end_point         TEXT NOT NULL,
      passengers        INTEGER NOT NULL,
      luggage_places    INTEGER NOT NULL DEFAULT 0,
      sport_luggage     INTEGER NOT NULL DEFAULT 0,
      wheelchairs       INTEGER NOT NULL DEFAULT 0,
      animals           INTEGER NOT NULL DEFAULT 0,
      children_seats    TEXT NOT NULL DEFAULT '[0,0,0,0]',
      flight_number     TEXT NOT NULL,
      comment           TEXT,
      shield_text       TEXT,
      main_passenger    TEXT NOT NULL,
      upsells           TEXT NOT NULL DEFAULT '[]',
      offer             TEXT NOT NULL,
      transfer_category TEXT NOT NULL,
      vehicle_slug      TEXT,
      distance          REAL,
      duration_min      INTEGER,
      waiting_min       INTEGER,
      buffer_min        INTEGER NOT NULL DEFAULT 0,
      price             REAL NOT NULL,
      currency          TEXT NOT NULL,
      free_cancel_until TEXT NOT NULL,
      penalty           REAL,
      cancelled_at      TEXT,
      cancelled_by      TEXT,
      pin_code          TEXT,
      driver_first_name TEXT,
      driver_last_name  TEXT,
      driver_phone      TEXT,
      carrier_company   TEXT,
      car_model         TEXT,
      car_plate         TEXT,
      car_color         TEXT,
      notes             TEXT
    );
    CREATE INDEX IF NOT EXISTS etg_orders_created ON etg_orders(created_at);

    -- Historial de cambios hechos por soporte (ETG) o por el equipo.
    CREATE TABLE IF NOT EXISTS etg_order_changes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code  TEXT NOT NULL,
      at          TEXT NOT NULL DEFAULT (datetime('now')),
      who         TEXT NOT NULL,
      changes     TEXT NOT NULL,
      old_price   REAL,
      new_price   REAL
    );
    CREATE INDEX IF NOT EXISTS etg_order_changes_code ON etg_order_changes(order_code);

    -- Cada llamada a la API, para el visor del panel.
    CREATE TABLE IF NOT EXISTS etg_api_logs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      at           TEXT NOT NULL DEFAULT (datetime('now')),
      env          TEXT NOT NULL DEFAULT '',
      endpoint     TEXT NOT NULL,
      status_code  INTEGER NOT NULL,
      duration_ms  INTEGER NOT NULL,
      order_code   TEXT,
      request      TEXT,
      response     TEXT
    );
    CREATE INDEX IF NOT EXISTS etg_api_logs_at ON etg_api_logs(at);
  `);

  // Datos de ETG sobre la flota existente. Sin tocar nada de lo que ya hay.
  addColumns('vehicles', {
    etg_enabled: 'INTEGER NOT NULL DEFAULT 0',
    etg_category: 'TEXT',
    etg_car_model: 'TEXT',
    etg_seats: 'INTEGER',
    etg_luggage: 'INTEGER',
  });

  // Primer mapeo de la flota (una sola vez; después manda el panel). Ver
  // DECISIONES.md: capacidades según la tabla de categorías de ETG y modelos
  // de referencia hasta que el cliente confirme los reales.
  if (!db.prepare("SELECT 1 FROM settings WHERE key = 'etg_vehicles_seeded'").get()) {
    const set = db.prepare(
      'UPDATE vehicles SET etg_enabled = ?, etg_category = ?, etg_car_model = ?, etg_seats = ?, etg_luggage = ? WHERE slug = ?',
    );
    db.transaction(() => {
      set.run(1, 'economy', 'Toyota Corolla, Hyundai Elantra', 3, 2, 'sedan');
      set.run(1, 'economy_van', 'Toyota Sienna, Honda Odyssey', 6, 6, 'minivan');
      set.run(1, 'minibus', 'Toyota Hiace, Hyundai H1', 11, 11, 'minibus');
      set.run(1, 'business_mpv', 'Chevrolet Suburban, GMC Yukon', 4, 4, 'vip-luxury');
      set.run(0, 'bus', 'Mercedes Sprinter', 22, 22, 'bus');
      set.run(0, 'bus', 'Volvo 9700', 50, 50, 'autobus');
      set.run(0, null, null, null, null, 'limusina');
      set.run(0, null, null, null, null, 'minivan-accesible');
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('etg_vehicles_seeded', '1')").run();
    })();
  }
}

/**
 * Limpieza periódica: búsquedas caducadas y logs viejos. Las órdenes nunca se
 * borran (ETG exige poder consultarlas siempre).
 */
export function purgeEtg(logDays = 30) {
  const now = Date.now();
  db.prepare('DELETE FROM etg_searches WHERE expires_at < ?').run(now - 60 * 60 * 1000);
  db.prepare(`DELETE FROM etg_api_logs WHERE at < datetime('now', ?)`).run(`-${logDays} days`);
}

/**
 * Copia diaria de la base (API de copia en caliente de SQLite: no bloquea la
 * web) en data/backups/daily-AAAA-MM-DD.db, conservando las últimas 14. En el
 * VPS la carpeta está en el mismo volumen; conviene bajarla de vez en cuando
 * (ver docs/etg/DESPLIEGUE-ETG.md).
 */
export async function dailyBackup(keep = 14) {
  const dir = resolve(DATA_DIR, 'backups');
  mkdirSync(dir, { recursive: true });
  const name = `daily-${new Date().toISOString().slice(0, 10)}.db`;
  const files = readdirSync(dir).filter((f) => f.startsWith('daily-') && f.endsWith('.db')).sort();
  if (!files.includes(name)) {
    await db.backup(resolve(dir, name));
    files.push(name);
  }
  for (const old of files.sort().slice(0, Math.max(0, files.length - keep))) unlinkSync(resolve(dir, old));
}
