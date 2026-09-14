import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DATA_DIR } from './paths.ts';

/**
 * Catálogo en SQLite. A esta escala —38 excursiones, 8 vehículos— una base de
 * datos aparte solo añadiría un servicio más que vigilar en el VPS: aquí todo
 * vive en un fichero, y la copia de seguridad es copiarlo.
 *
 * Las listas que se editan de una pieza (lo que incluye, actividades, horarios,
 * entradas, características) van como JSON en su columna. Sacarlas a tablas
 * propias obligaría a un join por cada una para no ganar nada: nunca se
 * consultan sueltas, siempre enteras.
 */

export const DB_PATH = resolve(DATA_DIR, 'dominican-routes.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

// WAL permite leer mientras se escribe, que es justo lo que pasa cuando el
// cliente guarda desde el panel y hay visitas en la web.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS excursions (
      slug        TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL,
      price       REAL,
      rating      REAL NOT NULL DEFAULT 0,
      reviews     TEXT NOT NULL DEFAULT '',
      duration    TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      adults_only INTEGER NOT NULL DEFAULT 0,
      includes    TEXT NOT NULL DEFAULT '[]',
      activities  TEXT NOT NULL DEFAULT '[]',
      departures  TEXT NOT NULL DEFAULT '[]',
      tickets     TEXT NOT NULL DEFAULT '[]',
      featured    INTEGER NOT NULL DEFAULT 0,
      position    INTEGER NOT NULL DEFAULT 0,
      -- Oculta en la web pero conservada: el cliente retira una excursión de
      -- temporada sin perder sus fotos ni sus textos.
      visible     INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS excursion_photos (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      slug     TEXT NOT NULL REFERENCES excursions(slug) ON DELETE CASCADE,
      path     TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_photos_slug ON excursion_photos(slug, position);

    CREATE TABLE IF NOT EXISTS vehicles (
      slug     TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      type     TEXT NOT NULL,
      min_pax  INTEGER NOT NULL DEFAULT 1,
      max_pax  INTEGER NOT NULL DEFAULT 1,
      price    REAL,
      photo    TEXT,
      summary  TEXT NOT NULL DEFAULT '',
      features TEXT NOT NULL DEFAULT '[]',
      featured INTEGER NOT NULL DEFAULT 0,
      standard INTEGER NOT NULL DEFAULT 1,
      position INTEGER NOT NULL DEFAULT 0,
      visible  INTEGER NOT NULL DEFAULT 1
    );

    -- Tramos de distancia. up_to NULL es el tramo abierto del final.
    CREATE TABLE IF NOT EXISTS price_brackets (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      up_to    REAL,
      sedan    REAL NOT NULL,
      minivan  REAL NOT NULL,
      minibus  REAL NOT NULL,
      vip      REAL NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS zones (
      id      TEXT PRIMARY KEY,
      label   TEXT NOT NULL,
      needles TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS route_surcharges (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      label    TEXT NOT NULL,
      zones_a  TEXT NOT NULL DEFAULT '[]',
      zones_b  TEXT NOT NULL DEFAULT '[]',
      sedan    REAL NOT NULL DEFAULT 0,
      minivan  REAL NOT NULL DEFAULT 0,
      minibus  REAL NOT NULL DEFAULT 0,
      vip      REAL NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0
    );

    -- Sillas, bebidas y paradas comparten forma, asi que comparten tabla.
    CREATE TABLE IF NOT EXISTS extras (
      id       TEXT NOT NULL,
      kind     TEXT NOT NULL,
      label    TEXT NOT NULL,
      price    REAL NOT NULL DEFAULT 0,
      minutes  INTEGER,
      position INTEGER NOT NULL DEFAULT 0,
      visible  INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (kind, id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      email         TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'admin',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Cada cambio del panel queda registrado: si algo desaparece, se sabe
    -- quién, cuándo y qué había antes.
    CREATE TABLE IF NOT EXISTS audit (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      at      TEXT NOT NULL DEFAULT (datetime('now')),
      who     TEXT NOT NULL,
      action  TEXT NOT NULL,
      target  TEXT NOT NULL,
      before  TEXT
    );
  `);

  // Columnas en inglés, añadidas después de la primera versión. ADD COLUMN
  // no admite IF NOT EXISTS en SQLite, así que se mira antes qué hay.
  addColumns('excursions', {
    name_en: 'TEXT',
    duration_en: 'TEXT',
    description_en: 'TEXT',
    includes_en: 'TEXT',
    activities_en: 'TEXT',
    tickets_en: 'TEXT',
  });
  addColumns('vehicles', {
    name_en: 'TEXT',
    type_en: 'TEXT',
    summary_en: 'TEXT',
    features_en: 'TEXT',
  });

  // Precios por vehículo como JSON {slug: importe}. Las cuatro columnas
  // fijas se quedan por compatibilidad y se copian a la nueva la primera vez.
  addColumns('price_brackets', { prices: 'TEXT' });
  addColumns('route_surcharges', { prices: 'TEXT' });
  db.exec(`
    UPDATE price_brackets SET prices = json_object(
      'sedan', sedan, 'minivan', minivan, 'minibus', minibus, 'vip-luxury', vip
    ) WHERE prices IS NULL;
    UPDATE route_surcharges SET prices = json_object(
      'sedan', sedan, 'minivan', minivan, 'minibus', minibus, 'vip-luxury', vip
    ) WHERE prices IS NULL;

    -- Cada solicitud que llega por la web (traslado, excursión o contacto),
    -- guardada antes de enviar el correo. email_sent dice si el aviso al
    -- negocio salió; NULL mientras no se haya intentado.
    CREATE TABLE IF NOT EXISTS bookings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      kind        TEXT NOT NULL,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL,
      phone       TEXT NOT NULL DEFAULT '',
      lang        TEXT NOT NULL DEFAULT 'es',
      date        TEXT NOT NULL DEFAULT '',
      message     TEXT NOT NULL,
      payload     TEXT,
      status      TEXT NOT NULL DEFAULT 'nueva',
      notes       TEXT NOT NULL DEFAULT '',
      email_sent  INTEGER,
      email_error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at DESC);

    -- Rutas con precio cerrado, creadas desde el panel con Google. Valen en
    -- los dos sentidos; el precio es el total por vehículo.
    CREATE TABLE IF NOT EXISTS fixed_routes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      label     TEXT NOT NULL,
      a_text    TEXT NOT NULL,
      a_lat     REAL,
      a_lng     REAL,
      b_text    TEXT NOT NULL,
      b_lat     REAL,
      b_lng     REAL,
      km        REAL,
      radius_km REAL NOT NULL DEFAULT 8,
      prices    TEXT NOT NULL DEFAULT '{}',
      position  INTEGER NOT NULL DEFAULT 0,
      visible   INTEGER NOT NULL DEFAULT 1
    );
  `);
}

function addColumns(table: string, cols: Record<string, string>) {
  const have = new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name),
  );
  for (const [name, type] of Object.entries(cols)) {
    if (!have.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }
}

export const isSeeded = () =>
  (db.prepare('SELECT COUNT(*) AS n FROM excursions').get() as { n: number }).n > 0;

export function setting(key: string, fallback = ''): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, value);
}

export function audit(who: string, action: string, target: string, before?: unknown) {
  db.prepare('INSERT INTO audit (who, action, target, before) VALUES (?, ?, ?, ?)').run(
    who,
    action,
    target,
    before === undefined ? null : JSON.stringify(before),
  );
}

export { existsSync };
