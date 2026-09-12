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
    `INSERT INTO excursions (slug, name, category, position) VALUES (?, ?, ?, ?)`,
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
  });
});

adminRouter.put('/pricing/brackets', (req: AdminRequest, res) => {
  const rows = req.body?.brackets;
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ ok: false, error: 'Hacen falta los tramos.' });
    return;
  }
  // Un tramo cuyo precio baje respecto al anterior haría que un viaje más
  // largo saliera más barato. Es el fallo que ya venía del código del cliente,
  // asi que aqui se bloquea en vez de repetirse.
  const keys = ['sedan', 'minivan', 'minibus', 'vip'] as const;
  for (let i = 1; i < rows.length; i++) {
    for (const k of keys) {
      if (Number(rows[i][k]) < Number(rows[i - 1][k])) {
        res.status(400).json({
          ok: false,
          error: `El tramo ${i + 1} cobra menos que el anterior en ${k}. Un viaje más largo no puede salir más barato.`,
        });
        return;
      }
    }
  }

  const before = db.prepare('SELECT * FROM price_brackets ORDER BY position').all();
  db.transaction(() => {
    db.prepare('DELETE FROM price_brackets').run();
    const ins = db.prepare(
      'INSERT INTO price_brackets (up_to, sedan, minivan, minibus, vip, position) VALUES (?, ?, ?, ?, ?, ?)',
    );
    rows.forEach((b: Record<string, unknown>, i: number) =>
      ins.run(
        b.up_to === null || b.up_to === '' ? null : Number(b.up_to),
        Number(b.sedan),
        Number(b.minivan),
        Number(b.minibus),
        Number(b.vip),
        i,
      ),
    );
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
      'INSERT INTO route_surcharges (label, zones_a, zones_b, sedan, minivan, minibus, vip, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    rows.forEach((r: Record<string, unknown>, i: number) =>
      ins.run(
        String(r.label ?? ''),
        typeof r.zones_a === 'string' ? r.zones_a : json(r.zones_a),
        typeof r.zones_b === 'string' ? r.zones_b : json(r.zones_b),
        Number(r.sedan ?? 0),
        Number(r.minivan ?? 0),
        Number(r.minibus ?? 0),
        Number(r.vip ?? 0),
        i,
      ),
    );
  })();
  audit(req.admin!, 'editar tarifas', 'recargos', before);
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
