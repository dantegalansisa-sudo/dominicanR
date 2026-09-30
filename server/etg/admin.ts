import { Router } from 'express';
import type { NextFunction, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { db, setSetting, audit } from '../db.ts';
import { requireAdmin, hashPassword, PARTNER_ROLE, type AdminRequest } from '../auth.ts';
import { apiCredentials, etgConfig, etgEnv, resetEtgConfigCache } from './config.ts';
import { EtgError } from './errors.ts';
import { ETG_CATEGORIES, resetPricingCache } from './search.ts';
import { apiHosts } from './router.ts';
import {
  cancelOrder,
  getOrder,
  modifyOrder,
  penaltyFor,
  statusResponse,
  supplierLink,
  type OrderChanges,
  type OrderRow,
} from './orders.ts';
import { parseWall, withOffset } from './time.ts';

/**
 * Sección ETG del panel y portal del soporte de ETG. Los dos entran por el
 * mismo login; el rol partner_etg solo llega a estas rutas y solo a las
 * órdenes (ver, modificar, cancelar). Ajustes, flota, logs y usuarios son del
 * equipo (rol admin).
 */

export const etgAdminRouter = Router();
etgAdminRouter.use(requireAdmin);

const isPartner = (req: AdminRequest) => req.adminRole === PARTNER_ROLE;
/** El soporte de ETG ve el portal en inglés; el equipo, en español. */
const say = (req: AdminRequest, es: string, en: string) => (isPartner(req) ? en : es);

function adminOnly(req: AdminRequest, res: Response, next: NextFunction) {
  if (isPartner(req)) {
    res.status(403).json({ ok: false, error: say(req, 'Sin acceso.', 'Access denied.') });
    return;
  }
  next();
}

const fail = (req: AdminRequest, res: Response, err: unknown) => {
  if (err instanceof EtgError) {
    res.status(400).json({ ok: false, error: err.message });
    return;
  }
  console.error('ETG panel:', err);
  res.status(500).json({ ok: false, error: say(req, 'Error del servidor.', 'Server error, please try again.') });
};

/** Lo que la tabla del panel necesita de cada orden. */
function listItem(o: OrderRow) {
  const mp = JSON.parse(o.main_passenger) as Record<string, string>;
  const sp = JSON.parse(o.start_point) as { address?: string; iata?: string; resolved?: { label?: string } };
  const ep = JSON.parse(o.end_point) as { address?: string; iata?: string; resolved?: { label?: string } };
  return {
    order_code: o.order_code,
    created_at: o.created_at,
    env: o.env,
    status: o.status,
    internal_status: o.internal_status,
    start_time: withOffset(parseWall(o.start_wall)!, o.tz),
    from: sp.resolved?.label ?? sp.address ?? sp.iata ?? '',
    to: ep.resolved?.label ?? ep.address ?? ep.iata ?? '',
    passenger: `${mp.first_name ?? ''} ${mp.last_name ?? ''}`.trim(),
    passengers: o.passengers,
    transfer_category: o.transfer_category,
    price: o.price,
    currency: o.currency,
    has_driver: Boolean(o.driver_phone),
  };
}

/* ------------------------------------------------------------ órdenes */

etgAdminRouter.get('/orders', (req: AdminRequest, res) => {
  const where: string[] = [];
  const args: unknown[] = [];
  const status = String(req.query.status ?? '');
  if (status === 'confirmed' || status === 'cancelled') {
    where.push('status = ?');
    args.push(status);
  }
  const q = String(req.query.q ?? '').trim();
  if (q) {
    where.push('(order_code LIKE ? OR main_passenger LIKE ? OR shield_text LIKE ?)');
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const when = String(req.query.when ?? '');
  if (when === 'upcoming') where.push("start_wall >= strftime('%Y-%m-%dT%H:%M:%S', 'now', '-4 hours')");
  if (when === 'past') where.push("start_wall < strftime('%Y-%m-%dT%H:%M:%S', 'now', '-4 hours')");
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = 50;
  const sql = `FROM etg_orders ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`;
  const total = (db.prepare(`SELECT COUNT(*) AS n ${sql}`).get(...args) as { n: number }).n;
  const rows = db
    .prepare(`SELECT * ${sql} ORDER BY ${when === 'upcoming' ? 'start_wall ASC' : 'created_at DESC'} LIMIT ? OFFSET ?`)
    .all(...args, size, (page - 1) * size) as OrderRow[];
  const counts = db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
         SUM(CASE WHEN status = 'confirmed' AND driver_phone IS NULL THEN 1 ELSE 0 END) AS without_driver
       FROM etg_orders`,
    )
    .get();
  res.json({ ok: true, total, page, size, orders: rows.map(listItem), counts, role: req.adminRole });
});

etgAdminRouter.get('/orders/:code', (req: AdminRequest, res) => {
  const o = getOrder(String(req.params.code));
  if (!o) {
    res.status(404).json({ ok: false, error: say(req, 'Esa orden no existe.', 'This order does not exist.') });
    return;
  }
  const changes = db.prepare('SELECT * FROM etg_order_changes WHERE order_code = ? ORDER BY id DESC').all(o.order_code);
  res.json({
    ok: true,
    role: req.adminRole,
    order: {
      ...o,
      start_point: JSON.parse(o.start_point),
      end_point: JSON.parse(o.end_point),
      main_passenger: JSON.parse(o.main_passenger),
      upsells: JSON.parse(o.upsells),
      children_seats: JSON.parse(o.children_seats),
      offer: undefined,
      start_time: withOffset(parseWall(o.start_wall)!, o.tz),
      supplier_link: supplierLink(o.order_code),
      penalty_if_cancelled_now: o.status === 'cancelled' ? o.penalty : penaltyFor(o),
    },
    // Lo que ETG recibe ahora mismo en /status, para comprobarlo.
    status_preview: statusResponse(o),
    changes,
    categories: Object.keys(ETG_CATEGORIES),
  });
});

/** Campos que puede cambiar el soporte de ETG; el equipo, además, chofer y coche. */
const PARTNER_FIELDS: (keyof OrderChanges)[] = [
  'start_wall',
  'passengers',
  'luggage_places',
  'sport_luggage',
  'animals',
  'wheelchairs',
  'first_name',
  'last_name',
  'phone',
  'comment',
  'shield_text',
  'flight_number',
  'transfer_category',
  'price',
];
const TEAM_FIELDS: (keyof OrderChanges)[] = [
  ...PARTNER_FIELDS,
  'driver_first_name',
  'driver_last_name',
  'driver_phone',
  'carrier_company',
  'car_model',
  'car_plate',
  'car_color',
  'internal_status',
  'notes',
];

/** Nombres y modelo en alfabeto latino (lo exige ETG para /status). */
const LATIN = /^[\p{Script=Latin}0-9 .,'’()\-/&+]*$/u;

etgAdminRouter.put('/orders/:code', (req: AdminRequest, res) => {
  try {
    const allowed = isPartner(req) ? PARTNER_FIELDS : TEAM_FIELDS;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const changes: OrderChanges = {};
    for (const k of allowed) if (body[k] !== undefined) (changes as Record<string, unknown>)[k] = body[k];
    if (changes.transfer_category !== undefined && !ETG_CATEGORIES[changes.transfer_category]) {
      throw new EtgError('INVALID_REQUEST', say(req, 'Categoría no válida.', 'Invalid category.'));
    }
    for (const k of ['driver_first_name', 'driver_last_name', 'carrier_company', 'car_model'] as const) {
      const v = changes[k];
      if (typeof v === 'string' && !LATIN.test(v)) throw new EtgError('INVALID_REQUEST', `${k}: solo caracteres latinos.`);
    }
    if (typeof changes.driver_first_name === 'string' && changes.driver_first_name.trim().includes(' ')) {
      throw new EtgError('INVALID_REQUEST', 'Nombre del chofer: solo el nombre (sin apellidos).');
    }
    if ((changes.car_model || changes.car_plate) && !(changes.car_model ?? getOrder(String(req.params.code))?.car_model)) {
      throw new EtgError('INVALID_REQUEST', 'Pon el modelo del coche (marca y modelo).');
    }
    const o = modifyOrder(String(req.params.code), changes, `${req.adminRole}:${req.admin}`);
    res.json({ ok: true, order_code: o.order_code });
  } catch (err) {
    fail(req, res, err);
  }
});

etgAdminRouter.post('/orders/:code/cancel', (req: AdminRequest, res) => {
  try {
    const r = cancelOrder(String(req.params.code), `${req.adminRole}:${req.admin}`);
    audit(req.admin!, 'cancelar orden ETG', String(req.params.code));
    res.json({ ok: true, ...r });
  } catch (err) {
    fail(req, res, err);
  }
});

/* ---------------------------------------------------- ajustes (equipo) */

const SETTING_KEYS = [
  'currency',
  'markup_percent',
  'min_advance_hours',
  'free_cancel_hours',
  'late_penalty_percent',
  'wait_airport',
  'wait_other',
  'offer_ttl_hours',
  'flight_tracking',
  'buffer_minutes',
  'tolls_included',
  'gratuity_included',
  'airports',
  'meeting_instructions',
  'meeting_images',
  'road_factor',
  'avg_speed_kmh',
  'public_url',
  'log_search_bodies',
] as const;

etgAdminRouter.get('/settings', adminOnly, (_req, res) => {
  const vehicles = db
    .prepare(
      'SELECT slug, name, type, max_pax, visible, etg_enabled, etg_category, etg_car_model, etg_seats, etg_luggage FROM vehicles ORDER BY position',
    )
    .all();
  const creds = apiCredentials();
  res.json({
    ok: true,
    config: etgConfig(),
    // Qué viene fijado por variable de entorno (no se puede cambiar aquí).
    fromEnv: {
      currency: Boolean(process.env.ETG_CURRENCY),
      markup_percent: Boolean(process.env.ETG_PRICE_MARKUP_PERCENT),
      public_url: Boolean(process.env.ETG_PUBLIC_URL),
    },
    vehicles,
    categories: ETG_CATEGORIES,
    api: {
      env: etgEnv(),
      configured: Boolean(creds),
      user: creds?.user ?? null,
      hosts: apiHosts(),
      pathFallback: '/etg-api',
    },
    partners: db.prepare('SELECT email, created_at FROM users WHERE role = ? ORDER BY created_at').all(PARTNER_ROLE),
  });
});

etgAdminRouter.put('/settings', adminOnly, (req: AdminRequest, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  for (const k of SETTING_KEYS) {
    if (body[k] === undefined) continue;
    const v = Array.isArray(body[k]) ? (body[k] as unknown[]).join(',') : String(body[k]);
    setSetting(`etg_${k}`, v);
  }
  audit(req.admin!, 'ajustes ETG', 'settings', body);
  resetEtgConfigCache();
  res.json({ ok: true, config: etgConfig() });
});

etgAdminRouter.put('/vehicles/:slug', adminOnly, (req: AdminRequest, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const category = b.etg_category == null || b.etg_category === '' ? null : String(b.etg_category);
  if (category && !ETG_CATEGORIES[category]) {
    res.status(400).json({ ok: false, error: 'Categoría no válida.' });
    return;
  }
  const seats = b.etg_seats == null || b.etg_seats === '' ? null : Number(b.etg_seats);
  if (category && seats != null) {
    const [min, max] = ETG_CATEGORIES[category]!;
    if (seats < min || seats > max) {
      res.status(400).json({ ok: false, error: `ETG exige entre ${min} y ${max} plazas para ${category}.` });
      return;
    }
  }
  const model = b.etg_car_model == null ? null : String(b.etg_car_model).trim();
  if (model && (/\b(or similar|similar|possible)\b/i.test(model) || !LATIN.test(model))) {
    res.status(400).json({ ok: false, error: 'Modelo: marca y modelo reales, en latino y sin "or similar".' });
    return;
  }
  db.prepare(
    'UPDATE vehicles SET etg_enabled = ?, etg_category = ?, etg_car_model = ?, etg_seats = ?, etg_luggage = ? WHERE slug = ?',
  ).run(
    b.etg_enabled ? 1 : 0,
    category,
    model || null,
    seats,
    b.etg_luggage == null || b.etg_luggage === '' ? null : Number(b.etg_luggage),
    String(req.params.slug),
  );
  audit(req.admin!, 'flota ETG', String(req.params.slug), b);
  resetPricingCache();
  res.json({ ok: true });
});

/* ------------------------------------------------ accesos del soporte ETG */

etgAdminRouter.post('/partners', adminOnly, (req: AdminRequest, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ ok: false, error: 'Correo no válido.' });
    return;
  }
  const exists = db.prepare('SELECT role FROM users WHERE email = ?').get(email) as { role: string } | undefined;
  if (exists && exists.role !== PARTNER_ROLE) {
    res.status(400).json({ ok: false, error: 'Ese correo ya es un usuario del equipo.' });
    return;
  }
  // Contraseña generada: se muestra una sola vez para pasársela a ETG.
  const password = randomBytes(12).toString('base64url');
  if (exists) db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hashPassword(password), email);
  else db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, hashPassword(password), PARTNER_ROLE);
  audit(req.admin!, exists ? 'nueva contraseña acceso ETG' : 'crear acceso ETG', email);
  res.json({ ok: true, email, password });
});

etgAdminRouter.delete('/partners/:email', adminOnly, (req: AdminRequest, res) => {
  const r = db.prepare('DELETE FROM users WHERE email = ? AND role = ?').run(String(req.params.email), PARTNER_ROLE);
  audit(req.admin!, 'quitar acceso ETG', String(req.params.email));
  res.json({ ok: true, removed: r.changes });
});

/* ------------------------------------------------------ logs (equipo) */

etgAdminRouter.get('/logs', adminOnly, (req, res) => {
  const where: string[] = [];
  const args: unknown[] = [];
  const endpoint = String(req.query.endpoint ?? '');
  if (['/search', '/book', '/status', '/cancel'].includes(endpoint)) {
    where.push('endpoint = ?');
    args.push(endpoint);
  }
  if (req.query.errors === '1') where.push('status_code <> 200');
  const code = String(req.query.order ?? '').trim();
  if (code) {
    where.push('order_code = ?');
    args.push(code);
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = 50;
  const sql = `FROM etg_api_logs ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`;
  const total = (db.prepare(`SELECT COUNT(*) AS n ${sql}`).get(...args) as { n: number }).n;
  const logs = db.prepare(`SELECT * ${sql} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, size, (page - 1) * size);
  const perf = db
    .prepare(
      `SELECT endpoint, COUNT(*) AS n, ROUND(AVG(duration_ms)) AS avg_ms, MAX(duration_ms) AS max_ms,
         SUM(CASE WHEN status_code <> 200 THEN 1 ELSE 0 END) AS errors
       FROM etg_api_logs WHERE at >= datetime('now', '-1 day') GROUP BY endpoint`,
    )
    .all();
  res.json({ ok: true, total, page, size, logs, perf });
});
