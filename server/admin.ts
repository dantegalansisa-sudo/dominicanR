import { Router } from 'express';
import type { Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { db, audit, setSetting } from './db.ts';
import {
  verifyPassword,
  issueToken,
  setSessionCookie,
  clearSessionCookie,
  requireAdmin,
  hashPassword,
  type AdminRequest,
} from './auth.ts';
import { UPLOADS } from './paths.ts';

export const adminRouter = Router();

const json = (v: unknown) => JSON.stringify(v ?? []);
const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/* ------------------------------------------------------------------ sesión */

/**
 * Un intento por segundo y como mucho diez seguidos por IP. Sin esto, una
 * contraseña se prueba entera con un script en una tarde.
 */
const attempts = new Map<string, { n: number; until: number }>();

adminRouter.post('/login', (req, res) => {
  const ip = req.ip ?? 'desconocida';
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.until > now && rec.n >= 10) {
    res.status(429).json({ ok: false, error: 'Demasiados intentos. Espera un minuto.' });
    return;
  }

  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const user = db.prepare('SELECT email, password_hash FROM users WHERE email = ?').get(email) as
    | { email: string; password_hash: string }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    attempts.set(ip, { n: (rec && rec.until > now ? rec.n : 0) + 1, until: now + 60_000 });
    // El mismo mensaje para usuario inexistente y contraseña mala: decir cuál
    // de los dos falla regala la mitad del trabajo.
    res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos.' });
    return;
  }

  attempts.delete(ip);
  setSessionCookie(res, issueToken(user.email));
  res.json({ ok: true, email: user.email });
});

adminRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

adminRouter.get('/me', (req: AdminRequest, res) => {
  requireAdmin(req, res, () => res.json({ ok: true, email: req.admin }));
});

// A partir de aquí, todo exige sesión.
adminRouter.use(requireAdmin);

/* -------------------------------------------------------------- excursiones */

adminRouter.get('/excursions', (_req, res) => {
  const rows = db.prepare('SELECT * FROM excursions ORDER BY position').all();
  const photos = db
    .prepare('SELECT slug, id, path FROM excursion_photos ORDER BY slug, position')
    .all() as { slug: string; id: number; path: string }[];
  res.json({ ok: true, excursions: rows, photos });
});

adminRouter.post('/excursions', (req: AdminRequest, res) => {
  const name = String(req.body?.name ?? '').trim();
  if (!name) {
    res.status(400).json({ ok: false, error: 'La excursión necesita un nombre.' });
    return;
  }
  let slug = slugify(name);
  // Dos excursiones con nombre parecido generarían el mismo identificador y la
  // segunda pisaría a la primera.
  if (db.prepare('SELECT 1 FROM excursions WHERE slug = ?').get(slug)) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }
  const maxPos =
    (db.prepare('SELECT MAX(position) AS m FROM excursions').get() as { m: number | null }).m ?? -1;

  db.prepare(
    `INSERT INTO excursions (slug, name, category, position, child_price, cash_allowed) VALUES (?, ?, ?, ?, 65, 1)`,
  ).run(slug, name, String(req.body?.category ?? 'islas'), maxPos + 1);

  audit(req.admin!, 'crear', `excursion:${slug}`);
  res.json({ ok: true, slug });
});

const EXCURSION_FIELDS = [
  'name',
  'category',
  'price',
  'rating',
  'reviews',
  'duration',
  'description',
  'child_price',
  'name_en',
  'duration_en',
  'description_en',
] as const;

adminRouter.put('/excursions/:slug', (req: AdminRequest, res) => {
  const slug = req.params.slug;
  const before = db.prepare('SELECT * FROM excursions WHERE slug = ?').get(slug);
  if (!before) {
    res.status(404).json({ ok: false, error: 'Esa excursión no existe.' });
    return;
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  for (const f of EXCURSION_FIELDS) {
    if (req.body?.[f] !== undefined) {
      sets.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }
  for (const [field, key] of [
    ['includes', 'includes'],
    ['activities', 'activities'],
    ['departures', 'departures'],
    ['tickets', 'tickets'],
    ['includes_en', 'includes_en'],
    ['activities_en', 'activities_en'],
    ['tickets_en', 'tickets_en'],
  ] as const) {
    if (req.body?.[key] !== undefined) {
      sets.push(`${field} = ?`);
      values.push(json(req.body[key]));
    }
  }
  for (const [field, key] of [
    ['adults_only', 'adultsOnly'],
    ['featured', 'featured'],
    ['visible', 'visible'],
    ['cash_allowed', 'cashAllowed'],
  ] as const) {
    if (req.body?.[key] !== undefined) {
      sets.push(`${field} = ?`);
      values.push(req.body[key] ? 1 : 0);
    }
  }

  if (sets.length === 0) {
    res.json({ ok: true, sinCambios: true });
    return;
  }

  values.push(slug);
  db.prepare(`UPDATE excursions SET ${sets.join(', ')} WHERE slug = ?`).run(...values);
  audit(req.admin!, 'editar', `excursion:${slug}`, before);
  res.json({ ok: true });
});

adminRouter.delete('/excursions/:slug', async (req: AdminRequest, res) => {
  const slug = req.params.slug;
  const before = db.prepare('SELECT * FROM excursions WHERE slug = ?').get(slug);
  if (!before) {
    res.status(404).json({ ok: false, error: 'Esa excursión no existe.' });
    return;
  }
  const photos = db
    .prepare('SELECT path FROM excursion_photos WHERE slug = ?')
    .all(slug) as { path: string }[];

  db.prepare('DELETE FROM excursions WHERE slug = ?').run(slug);
  audit(req.admin!, 'borrar', `excursion:${slug}`, { ...before, photos });

  // Solo se borran del disco las que subió el cliente. Las que vinieron en el
  // proyecto pueden estar compartidas y no son nuestras para tirarlas.
  await Promise.all(
    photos
      .filter((p) => p.path.startsWith('/uploads/'))
      .map((p) => unlink(resolve(UPLOADS, p.path.replace('/uploads/', ''))).catch(() => {})),
  );
  res.json({ ok: true });
});

/* --------------------------------------------------------------- ordenar */

const reorder = (table: string, key: string) => (req: AdminRequest, res: Response) => {
  const order = req.body?.order;
  if (!Array.isArray(order)) {
    res.status(400).json({ ok: false, error: 'Falta el orden.' });
    return;
  }
  const stmt = db.prepare(`UPDATE ${table} SET position = ? WHERE ${key} = ?`);
  db.transaction(() => order.forEach((id, i) => stmt.run(i, id)))();
  audit(req.admin!, 'reordenar', table);
  res.json({ ok: true });
};

adminRouter.put('/excursions-order', reorder('excursions', 'slug'));
adminRouter.put('/vehicles-order', reorder('vehicles', 'slug'));
adminRouter.put('/photos-order', reorder('excursion_photos', 'id'));

/* ----------------------------------------------------------------- fotos */

/**
 * En memoria y con tope: un fichero enorme escrito a disco antes de validarlo
 * llena el VPS. 12 MB cubre cualquier foto de móvil.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

const RATIOS: Record<string, { w: number; h: number }> = {
  // Las tarjetas de excursión son 3:2 y las de flota 2:1. Recortar al subir
  // evita que una foto vertical descuadre la rejilla.
  excursion: { w: 3, h: 2 },
  fleet: { w: 2, h: 1 },
};

adminRouter.post('/upload', upload.single('file'), async (req: AdminRequest, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'No llegó ninguna imagen.' });
    return;
  }
  const ratio = RATIOS[String(req.body?.ratio ?? 'excursion')] ?? RATIOS.excursion!;
  const name = `${randomUUID()}.webp`;

  try {
    const img = sharp(req.file.buffer, { failOn: 'none' });
    const meta = await img.metadata();
    if (!meta.width || !meta.height) {
      res.status(400).json({ ok: false, error: 'Ese archivo no es una imagen.' });
      return;
    }

    // Nunca se amplía: estirar una foto pequeña solo engorda el fichero.
    const targetW = Math.min(meta.width, 1400);
    await img
      .resize({
        width: targetW,
        height: Math.round((targetW * ratio.h) / ratio.w),
        fit: 'cover',
        position: 'attention',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toFile(resolve(UPLOADS, name));
  } catch {
    res.status(400).json({ ok: false, error: 'No pudimos procesar esa imagen.' });
    return;
  }

  const path = `/uploads/${name}`;
  const slug = String(req.body?.slug ?? '');

  if (slug && db.prepare('SELECT 1 FROM excursions WHERE slug = ?').get(slug)) {
    const max =
      (db.prepare('SELECT MAX(position) AS m FROM excursion_photos WHERE slug = ?').get(slug) as {
        m: number | null;
      }).m ?? -1;
    db.prepare('INSERT INTO excursion_photos (slug, path, position) VALUES (?, ?, ?)').run(
      slug,
      path,
      max + 1,
    );
  }

  audit(req.admin!, 'subir foto', slug || 'suelta');
  res.json({ ok: true, path });
});

adminRouter.delete('/photos/:id', async (req: AdminRequest, res) => {
  const row = db.prepare('SELECT * FROM excursion_photos WHERE id = ?').get(req.params.id) as
    | { id: number; slug: string; path: string }
    | undefined;
  if (!row) {
    res.status(404).json({ ok: false, error: 'Esa foto no existe.' });
    return;
  }
  db.prepare('DELETE FROM excursion_photos WHERE id = ?').run(row.id);
  audit(req.admin!, 'borrar foto', `${row.slug}:${row.path}`, row);
  if (row.path.startsWith('/uploads/')) {
    await unlink(resolve(UPLOADS, row.path.replace('/uploads/', ''))).catch(() => {});
  }
  res.json({ ok: true });
});

/* ---------------------------------------------------------------- flota */

adminRouter.get('/vehicles', (_req, res) => {
  res.json({ ok: true, vehicles: db.prepare('SELECT * FROM vehicles ORDER BY position').all() });
});

adminRouter.put('/vehicles/:slug', (req: AdminRequest, res) => {
  const slug = req.params.slug;
  const before = db.prepare('SELECT * FROM vehicles WHERE slug = ?').get(slug);
  if (!before) {
    res.status(404).json({ ok: false, error: 'Ese vehículo no existe.' });
    return;
  }
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [field, key] of [
    ['name', 'name'],
    ['type', 'type'],
    ['min_pax', 'minPax'],
    ['max_pax', 'maxPax'],
    ['price', 'price'],
    ['photo', 'photo'],
    ['summary', 'summary'],
    ['name_en', 'name_en'],
    ['type_en', 'type_en'],
    ['summary_en', 'summary_en'],
  ] as const) {
    if (req.body?.[key] !== undefined) {
      sets.push(`${field} = ?`);
      values.push(req.body[key]);
    }
  }
  if (req.body?.features !== undefined) {
    sets.push('features = ?');
    values.push(json(req.body.features));
  }
  if (req.body?.features_en !== undefined) {
    sets.push('features_en = ?');
    values.push(json(req.body.features_en));
  }
  for (const [field, key] of [
    ['featured', 'featured'],
    ['standard', 'standard'],
    ['visible', 'visible'],
  ] as const) {
    if (req.body?.[key] !== undefined) {
      sets.push(`${field} = ?`);
      values.push(req.body[key] ? 1 : 0);
    }
  }
  if (sets.length === 0) {
    res.json({ ok: true, sinCambios: true });
    return;
  }
  values.push(slug);
  db.prepare(`UPDATE vehicles SET ${sets.join(', ')} WHERE slug = ?`).run(...values);
  audit(req.admin!, 'editar', `vehiculo:${slug}`, before);
  res.json({ ok: true });
});

/* --------------------------------------------------------------- tarifas */

adminRouter.get('/pricing', (_req, res) => {
  res.json({
    ok: true,
    brackets: db.prepare('SELECT * FROM price_brackets ORDER BY position').all(),
    surcharges: db.prepare('SELECT * FROM route_surcharges ORDER BY position').all(),
    zones: db.prepare('SELECT * FROM zones ORDER BY id').all(),
    routes: db.prepare('SELECT * FROM fixed_routes ORDER BY position, id').all(),
  });
});

/**
 * Precios por vehículo tal como llegan del panel: {slug: importe}. Solo se
 * guardan números; una casilla vacía es "a cotizar" y no entra. Las cuatro
 * columnas antiguas se rellenan por compatibilidad.
 */
function cleanPrices(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v === '' || v === null || v === undefined) continue;
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) out[k] = n;
    }
  }
  return out;
}
const legacyCols = (p: Record<string, number>) => [
  p.sedan ?? 0,
  p.minivan ?? 0,
  p.minibus ?? 0,
  p['vip-luxury'] ?? p.vip ?? 0,
];

adminRouter.put('/pricing/brackets', (req: AdminRequest, res) => {
  const raw = req.body?.brackets;
  if (!Array.isArray(raw) || raw.length === 0) {
    res.status(400).json({ ok: false, error: 'Hacen falta los tramos.' });
    return;
  }
  const rows = raw.map((b: Record<string, unknown>) => ({
    up_to: b.up_to === null || b.up_to === '' || b.up_to === undefined ? null : Number(b.up_to),
    prices: cleanPrices(b.prices),
  }));

  // Ordenados por kilómetros: el abierto (sin límite) siempre al final. Así
  // el tramo añadido desde "Nueva tarifa" cae en su sitio sin más.
  rows.sort((a, b) => (a.up_to ?? Infinity) - (b.up_to ?? Infinity));
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]!.up_to != null && rows[i]!.up_to === rows[i - 1]!.up_to) {
      res.status(400).json({ ok: false, error: `Hay dos tramos hasta ${rows[i]!.up_to} km.` });
      return;
    }
  }

  // Un tramo cuyo precio baje respecto al anterior haría que un viaje más
  // largo saliera más barato. Es el fallo que ya venía del código del cliente,
  // asi que aqui se bloquea en vez de repetirse.
  const names = new Map(
    (db.prepare('SELECT slug, name FROM vehicles').all() as { slug: string; name: string }[]).map(
      (v) => [v.slug, v.name],
    ),
  );
  for (let i = 1; i < rows.length; i++) {
    for (const [k, v] of Object.entries(rows[i]!.prices)) {
      const prev = rows[i - 1]!.prices[k];
      if (prev !== undefined && v < prev) {
        res.status(400).json({
          ok: false,
          error: `El tramo ${i + 1} (hasta ${rows[i]!.up_to ?? '∞'} km) cobra menos que el anterior en ${names.get(k) ?? k}. Un viaje más largo no puede salir más barato.`,
        });
        return;
      }
    }
  }

  const before = db.prepare('SELECT * FROM price_brackets ORDER BY position').all();
  db.transaction(() => {
    db.prepare('DELETE FROM price_brackets').run();
    const ins = db.prepare(
      'INSERT INTO price_brackets (up_to, sedan, minivan, minibus, vip, prices, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    rows.forEach((b, i) => ins.run(b.up_to, ...legacyCols(b.prices), json(b.prices), i));
  })();
  audit(req.admin!, 'editar tarifas', 'tramos', before);
  res.json({ ok: true });
});

adminRouter.put('/pricing/surcharges', (req: AdminRequest, res) => {
  const rows = req.body?.surcharges;
  if (!Array.isArray(rows)) {
    res.status(400).json({ ok: false, error: 'Faltan los recargos.' });
    return;
  }
  const before = db.prepare('SELECT * FROM route_surcharges ORDER BY position').all();
  db.transaction(() => {
    db.prepare('DELETE FROM route_surcharges').run();
    const ins = db.prepare(
      'INSERT INTO route_surcharges (label, zones_a, zones_b, sedan, minivan, minibus, vip, prices, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    rows.forEach((r: Record<string, unknown>, i: number) => {
      // Acepta tanto el objeto nuevo como las cuatro columnas de antes.
      const prices = cleanPrices(
        r.prices ?? { sedan: r.sedan, minivan: r.minivan, minibus: r.minibus, 'vip-luxury': r.vip },
      );
      ins.run(
        String(r.label ?? ''),
        typeof r.zones_a === 'string' ? r.zones_a : json(r.zones_a),
        typeof r.zones_b === 'string' ? r.zones_b : json(r.zones_b),
        ...legacyCols(prices),
        json(prices),
        i,
      );
    });
  })();
  audit(req.admin!, 'editar tarifas', 'recargos', before);
  res.json({ ok: true });
});

/* ------------------------------------------------- rutas con precio cerrado */

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

adminRouter.post('/pricing/routes', (req: AdminRequest, res) => {
  const b = req.body ?? {};
  const aText = String(b.a?.text ?? '').trim();
  const bText = String(b.b?.text ?? '').trim();
  if (!aText || !bText) {
    res.status(400).json({ ok: false, error: 'Hacen falta el origen y el destino.' });
    return;
  }
  const prices = cleanPrices(b.prices);
  if (Object.keys(prices).length === 0) {
    res.status(400).json({ ok: false, error: 'Pon el precio de al menos un vehículo.' });
    return;
  }
  const label = String(b.label ?? '').trim() || `${aText.split(',')[0]} ↔ ${bText.split(',')[0]}`;
  const max =
    (db.prepare('SELECT MAX(position) AS m FROM fixed_routes').get() as { m: number | null }).m ?? -1;
  const r = db
    .prepare(
      `INSERT INTO fixed_routes (label, a_text, a_lat, a_lng, b_text, b_lat, b_lng, km, radius_km, prices, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      label,
      aText,
      num(b.a?.lat),
      num(b.a?.lng),
      bText,
      num(b.b?.lat),
      num(b.b?.lng),
      num(b.km),
      num(b.radiusKm) ?? 8,
      json(prices),
      max + 1,
    );
  audit(req.admin!, 'crear ruta', label);
  res.json({ ok: true, id: Number(r.lastInsertRowid) });
});

adminRouter.put('/pricing/routes/:id', (req: AdminRequest, res) => {
  const before = db.prepare('SELECT * FROM fixed_routes WHERE id = ?').get(req.params.id);
  if (!before) {
    res.status(404).json({ ok: false, error: 'Esa ruta no existe.' });
    return;
  }
  const b = req.body ?? {};
  const sets: string[] = [];
  const values: unknown[] = [];
  if (b.label !== undefined) {
    sets.push('label = ?');
    values.push(String(b.label));
  }
  if (b.prices !== undefined) {
    sets.push('prices = ?');
    values.push(json(cleanPrices(b.prices)));
  }
  if (b.radiusKm !== undefined) {
    sets.push('radius_km = ?');
    values.push(num(b.radiusKm) ?? 8);
  }
  if (b.visible !== undefined) {
    sets.push('visible = ?');
    values.push(b.visible ? 1 : 0);
  }
  if (sets.length) {
    values.push(req.params.id);
    db.prepare(`UPDATE fixed_routes SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    audit(req.admin!, 'editar ruta', `ruta:${req.params.id}`, before);
  }
  res.json({ ok: true });
});

adminRouter.delete('/pricing/routes/:id', (req: AdminRequest, res) => {
  const before = db.prepare('SELECT * FROM fixed_routes WHERE id = ?').get(req.params.id);
  if (!before) {
    res.status(404).json({ ok: false, error: 'Esa ruta no existe.' });
    return;
  }
  db.prepare('DELETE FROM fixed_routes WHERE id = ?').run(req.params.id);
  audit(req.admin!, 'borrar ruta', `ruta:${req.params.id}`, before);
  res.json({ ok: true });
});

/* ------------------------------------------------------------ adicionales */

adminRouter.get('/extras', (_req, res) => {
  res.json({ ok: true, extras: db.prepare('SELECT * FROM extras ORDER BY kind, position').all() });
});

adminRouter.put('/extras', (req: AdminRequest, res) => {
  const rows = req.body?.extras;
  if (!Array.isArray(rows)) {
    res.status(400).json({ ok: false, error: 'Faltan los adicionales.' });
    return;
  }
  const before = db.prepare('SELECT * FROM extras').all();
  const upd = db.prepare(
    'UPDATE extras SET label = ?, price = ?, minutes = ?, visible = ? WHERE kind = ? AND id = ?',
  );
  db.transaction(() =>
    rows.forEach((e: Record<string, unknown>) =>
      upd.run(
        String(e.label ?? ''),
        Number(e.price ?? 0),
        e.minutes === null || e.minutes === undefined ? null : Number(e.minutes),
        e.visible ? 1 : 0,
        String(e.kind),
        String(e.id),
      ),
    ),
  )();
  audit(req.admin!, 'editar adicionales', 'extras', before);
  res.json({ ok: true });
});

/* -------------------------------------------------------------- ajustes */

adminRouter.get('/settings', (_req, res) => {
  res.json({ ok: true, settings: db.prepare('SELECT * FROM settings').all() });
});

adminRouter.put('/settings', (req: AdminRequest, res) => {
  const entries = req.body?.settings;
  if (!entries || typeof entries !== 'object') {
    res.status(400).json({ ok: false, error: 'Faltan los ajustes.' });
    return;
  }
  const before = db.prepare('SELECT * FROM settings').all();
  for (const [k, v] of Object.entries(entries)) setSetting(k, String(v));
  audit(req.admin!, 'editar ajustes', 'settings', before);
  res.json({ ok: true });
});

/* --------------------------------------------------------------- reservas */

const BOOKING_STATUSES = ['nueva', 'contestada', 'confirmada', 'cancelada'] as const;
const BOOKING_KINDS = ['traslado', 'excursion', 'contacto'] as const;
const PAYMENT_STATUSES = ['pendiente', 'pagada', 'fallida'] as const;

/** Cuántas hay en cada estado: el menú lateral enseña las "nueva". */
adminRouter.get('/bookings/counts', (_req, res) => {
  const rows = db.prepare('SELECT status, COUNT(*) AS n FROM bookings GROUP BY status').all() as {
    status: string;
    n: number;
  }[];
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status] = r.n;
  res.json({ ok: true, counts });
});

adminRouter.get('/bookings', (req, res) => {
  const status = String(req.query.status ?? '');
  const kind = String(req.query.kind ?? '');
  const payment = String(req.query.payment ?? '');
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const page = Math.max(1, Number(req.query.page) || 1);

  const where: string[] = [];
  const args: unknown[] = [];
  if ((BOOKING_STATUSES as readonly string[]).includes(status)) {
    where.push('status = ?');
    args.push(status);
  }
  if ((BOOKING_KINDS as readonly string[]).includes(kind)) {
    where.push('kind = ?');
    args.push(kind);
  }
  if ((PAYMENT_STATUSES as readonly string[]).includes(payment)) {
    where.push('payment_status = ?');
    args.push(payment);
  }
  const sql = where.length ? ` WHERE ${where.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) AS n FROM bookings${sql}`).get(...args) as { n: number }).n;
  const bookings = db
    .prepare(`SELECT * FROM bookings${sql} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...args, limit, (page - 1) * limit);
  res.json({ ok: true, bookings, total, page, limit });
});

adminRouter.get('/bookings/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!row) {
    res.status(404).json({ ok: false, error: 'Esa reserva no existe.' });
    return;
  }
  res.json({ ok: true, booking: row });
});

adminRouter.put('/bookings/:id', (req: AdminRequest, res) => {
  const before = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!before) {
    res.status(404).json({ ok: false, error: 'Esa reserva no existe.' });
    return;
  }
  const sets: string[] = [];
  const values: unknown[] = [];
  if (req.body?.status !== undefined) {
    const status = String(req.body.status);
    if (!(BOOKING_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ ok: false, error: 'Estado no válido.' });
      return;
    }
    sets.push('status = ?');
    values.push(status);
  }
  if (req.body?.notes !== undefined) {
    sets.push('notes = ?');
    values.push(String(req.body.notes).slice(0, 4000));
  }
  // Cobro en efectivo anotado a mano por el operador (o deshecho).
  if (req.body?.paid !== undefined) {
    const paid = Boolean(req.body.paid);
    const amount = Number(req.body.paidAmount);
    sets.push('payment_status = ?', 'paid_amount = ?', "paid_at = CASE WHEN ? THEN datetime('now') ELSE NULL END");
    values.push(paid ? 'pagada' : 'pendiente', paid && Number.isFinite(amount) ? amount : null, paid ? 1 : 0);
  }
  if (sets.length === 0) {
    res.json({ ok: true, sinCambios: true });
    return;
  }
  values.push(req.params.id);
  db.prepare(`UPDATE bookings SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  audit(req.admin!, 'editar reserva', `reserva:${req.params.id}`, before);
  res.json({ ok: true });
});

/* -------------------------------------------------------------- historial */

adminRouter.get('/audit', (_req, res) => {
  res.json({
    ok: true,
    entries: db.prepare('SELECT id, at, who, action, target FROM audit ORDER BY id DESC LIMIT 100').all(),
  });
});

/* -------------------------------------------------------------- usuarios */

adminRouter.post('/users', (req: AdminRequest, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!email.includes('@') || password.length < 10) {
    res.status(400).json({ ok: false, error: 'Correo válido y contraseña de 10 caracteres o más.' });
    return;
  }
  db.prepare(
    'INSERT INTO users (email, password_hash) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash',
  ).run(email, hashPassword(password));
  audit(req.admin!, 'alta/cambio de usuario', email);
  res.json({ ok: true });
});
