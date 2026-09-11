import { db, migrate, isSeeded, setSetting } from './db.ts';
import { hashPassword } from './auth.ts';
import { EXCURSIONS, FEATURED_SLUGS } from '../src/data/excursions.ts';
import { FLEET } from '../src/data/fleet.ts';
import { SEATS, DRINKS, STOPS } from '../src/data/passengers.ts';
import { BRACKETS, RULES, ZONES } from '../src/data/pricing.ts';

/**
 * Pasa a la base de datos lo que hoy vive en src/data. Se ejecuta una sola vez:
 * a partir de ahí manda la base, porque es lo que el cliente edita desde el
 * panel y volver a sembrar le borraría los cambios.
 */

const json = (v: unknown) => JSON.stringify(v);

function seedExcursions() {
  const ins = db.prepare(`
    INSERT INTO excursions
      (slug, name, category, price, rating, reviews, duration, description,
       adults_only, includes, activities, departures, tickets, featured, position)
    VALUES
      (@slug, @name, @category, @price, @rating, @reviews, @duration, @description,
       @adults_only, @includes, @activities, @departures, @tickets, @featured, @position)
  `);
  const insPhoto = db.prepare(
    'INSERT INTO excursion_photos (slug, path, position) VALUES (?, ?, ?)',
  );

  EXCURSIONS.forEach((e, i) => {
    ins.run({
      slug: e.slug,
      name: e.name,
      category: e.category,
      price: e.price,
      rating: e.rating,
      reviews: e.reviews,
      duration: e.duration,
      description: e.description,
      adults_only: e.adultsOnly ? 1 : 0,
      includes: json(e.includes),
      activities: json(e.activities),
      departures: json(e.departures ?? []),
      tickets: json(e.tickets ?? []),
      featured: (FEATURED_SLUGS as readonly string[]).includes(e.slug) ? 1 : 0,
      position: i,
    });
    e.photos.forEach((path, j) => insPhoto.run(e.slug, path, j));
  });
}

function seedFleet() {
  const ins = db.prepare(`
    INSERT INTO vehicles
      (slug, name, type, min_pax, max_pax, price, photo, summary, features,
       featured, standard, position)
    VALUES
      (@slug, @name, @type, @min_pax, @max_pax, @price, @photo, @summary, @features,
       @featured, @standard, @position)
  `);
  FLEET.forEach((v, i) =>
    ins.run({
      slug: v.slug,
      name: v.name,
      type: v.type,
      min_pax: v.minPax,
      max_pax: v.maxPax,
      price: v.price,
      photo: v.photo,
      summary: v.summary,
      features: json(v.features),
      featured: v.featured ? 1 : 0,
      standard: v.standard ? 1 : 0,
      position: i,
    }),
  );
}

function seedPricing() {
  const insBracket = db.prepare(
    'INSERT INTO price_brackets (up_to, sedan, minivan, minibus, vip, position) VALUES (?, ?, ?, ?, ?, ?)',
  );
  BRACKETS.forEach((b, i) =>
    // El tramo abierto del final se guarda como NULL: Infinity no existe en SQL.
    insBracket.run(
      Number.isFinite(b.upTo) ? b.upTo : null,
      b.prices.sedan,
      b.prices.minivan,
      b.prices.minibus,
      b.prices.vip,
      i,
    ),
  );

  const insZone = db.prepare('INSERT INTO zones (id, label, needles) VALUES (?, ?, ?)');
  for (const [id, needles] of Object.entries(ZONES)) {
    // La etiqueta visible se saca del identificador: "lasTerrenas" -> "Las Terrenas".
    const label = id.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
    insZone.run(id, label.trim(), json(needles));
  }

  const insRule = db.prepare(`
    INSERT INTO route_surcharges (label, zones_a, zones_b, sedan, minivan, minibus, vip, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  RULES.forEach((r, i) =>
    insRule.run(r.label, json(r.a), json(r.b), r.add.sedan, r.add.minivan, r.add.minibus, r.add.vip, i),
  );
}

function seedExtras() {
  const ins = db.prepare(
    'INSERT INTO extras (id, kind, label, price, minutes, position) VALUES (?, ?, ?, ?, ?, ?)',
  );
  SEATS.forEach((s, i) => ins.run(s.id, 'seat', s.label, s.price, null, i));
  DRINKS.forEach((d, i) => ins.run(d.id, 'drink', d.label, d.price, null, i));
  STOPS.forEach((s, i) => ins.run(s.id, 'stop', s.label, s.price, s.minutes, i));
}

function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log(
      '  · sin ADMIN_EMAIL/ADMIN_PASSWORD: no se crea usuario. Créalo con "npm run admin:user".',
    );
    return;
  }
  db.prepare(
    'INSERT INTO users (email, password_hash) VALUES (?, ?) ON CONFLICT(email) DO NOTHING',
  ).run(email, hashPassword(password));
  console.log(`  · usuario del panel: ${email}`);
}

function seedSettings() {
  setSetting('whatsapp', '18292191573');
  setSetting('email', 'dominicanroutes@gmail.com');
  setSetting('phone', '+1 (829) 219-1573');
  setSetting('location', 'Punta Cana, La Altagracia');
}

export function seed() {
  migrate();
  if (isSeeded()) {
    console.log('La base ya tiene datos; no se siembra nada.');
    seedAdmin();
    return;
  }
  // Todo o nada: una siembra a medias dejaría precios sin excursiones.
  db.transaction(() => {
    seedExcursions();
    seedFleet();
    seedPricing();
    seedExtras();
    seedSettings();
  })();
  seedAdmin();

  const n = (t: string) =>
    (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
  console.log('Sembrado:');
  for (const t of ['excursions', 'excursion_photos', 'vehicles', 'price_brackets', 'zones', 'route_surcharges', 'extras']) {
    console.log(`  · ${t}: ${n(t)}`);
  }
}

// Ejecutado directamente (npm run db:seed), no importado.
if (process.argv[1]?.includes('seed')) seed();
