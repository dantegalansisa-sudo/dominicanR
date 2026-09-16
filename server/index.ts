import express from 'express';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { UPLOADS, DIST } from './paths.ts';
import { db, migrate } from './db.ts';
import { buildCatalog } from './catalog.ts';
import { adminRouter } from './admin.ts';
import { handleContact } from '../api/_contact.ts';
import { bookingStore } from './bookings.ts';
import { payRouter } from './payments.ts';
import { handlePlaces } from '../api/_places.ts';

/**
 * Servidor para el VPS. Sustituye a las funciones de Vercel sin tocar su
 * lógica: los manejadores de contacto y de Google ya recibían un objeto y
 * devolvían { status, body }, así que se montan tal cual.
 */

// En local las variables salen del .env de la raíz (copia de .env.example);
// en el VPS las pone Dokploy y no hay archivo, así que se ignora si falta.
// No pisa lo que ya venga en el entorno.
try {
  process.loadEnvFile();
} catch {
  // sin .env
}

const PORT = Number(process.env.PORT ?? 3000);

migrate();

const app = express();
app.disable('x-powered-by');
// Detras de Traefik (o Nginx) la peticion llega por HTTP aunque el visitante
// entre por HTTPS. Sin esto Express no se fia del X-Forwarded-Proto y la
// cookie "secure" del panel no se enviaria nunca.
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

/** Adapta un manejador de los que ya existían a Express. */
const mount = (handler: (payload: unknown) => Promise<{ status: number; body: unknown }>) =>
  async (req: express.Request, res: express.Response) => {
    try {
      const { status, body } = await handler(req.body);
      res.status(status).json(body);
    } catch (err) {
      console.error('Error en el endpoint:', err);
      res.status(500).json({ ok: false, error: 'Error del servidor.' });
    }
  };

app.post('/api/contact', mount((payload) => handleContact(payload, bookingStore)));
app.post('/api/places', mount(handlePlaces));

/** El catálogo que lee la web pública. */
app.get('/api/catalog', (_req, res) => {
  try {
    res.json({ ok: true, ...buildCatalog() });
  } catch (err) {
    console.error('No se pudo construir el catálogo:', err);
    res.status(500).json({ ok: false, error: 'No se pudo leer el catálogo.' });
  }
});

app.use('/api/pay', payRouter);
app.use('/api/admin', adminRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

// El sitemap sale de la base para incluir las excursiones que el cliente
// crea desde el panel, cada una con su URL /excursiones/<slug>.
app.get('/sitemap.xml', (_req, res) => {
  const site = 'https://dominicanroutes.com';
  const fixed: [string, string, string][] = [
    ['/', 'weekly', '1.0'],
    ['/excursiones', 'weekly', '0.9'],
    ['/reservar', 'monthly', '0.8'],
    ['/reservar-excursion', 'monthly', '0.7'],
    ['/privacidad', 'yearly', '0.3'],
    ['/terminos', 'yearly', '0.3'],
  ];
  let slugs: string[] = [];
  try {
    slugs = (db.prepare('SELECT slug FROM excursions ORDER BY slug').all() as { slug: string }[]).map((r) => r.slug);
  } catch (err) {
    console.error('Sitemap sin excursiones:', err);
  }
  const url = (path: string, freq: string, prio: string) =>
    `  <url><loc>${site}${path}</loc><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`;
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...fixed.map(([p, f, pr]) => url(p, f, pr)),
    ...slugs.map((s) => url(`/excursiones/${encodeURIComponent(s)}`, 'monthly', '0.8')),
    '</urlset>',
    '',
  ].join('\n');
  res.type('application/xml').send(body);
});

app.use(
  '/uploads',
  express.static(UPLOADS, { maxAge: '30d', fallthrough: true }),
);

app.use(express.static(DIST, { index: false, maxAge: '1y' }));

// Las URL internas (/reservar, /excursiones…) las resuelve React, no el
// servidor: cualquier ruta que no sea de API devuelve el index.
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const index = resolve(DIST, 'index.html');
  if (!existsSync(index)) {
    res.status(503).send('La web todavía no está compilada. Ejecuta: npm run build');
    return;
  }
  res.sendFile(index);
});

// 0.0.0.0 y no localhost: dentro del contenedor, localhost seria solo el
// propio contenedor y Traefik no podria llegar.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dominican Routes escuchando en http://0.0.0.0:${PORT}`);
});
