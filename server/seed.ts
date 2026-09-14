import { db, migrate, isSeeded, setSetting } from './db.ts';
import { hashPassword } from './auth.ts';
import { EXCURSIONS, FEATURED_SLUGS } from '../src/data/excursions.ts';
import { FLEET } from '../src/data/fleet.ts';
import { SEATS, DRINKS, STOPS } from '../src/data/passengers.ts';
import { BRACKETS, RULES, ZONES } from '../src/data/pricing.ts';
import { EXCURSIONS_EN } from '../src/i18n/excursions.en.ts';
import { FLEET_EN } from '../src/i18n/fleet.en.ts';

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
    'INSERT INTO price_brackets (up_to, sedan, minivan, minibus, vip, prices, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  BRACKETS.forEach((b, i) =>
    // El tramo abierto del final se guarda como NULL: Infinity no existe en SQL.
    insBracket.run(
      b.upTo != null && Number.isFinite(b.upTo) ? b.upTo : null,
      b.prices.sedan ?? 0,
      b.prices.minivan ?? 0,
      b.prices.minibus ?? 0,
      b.prices['vip-luxury'] ?? 0,
      json(b.prices),
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
    INSERT INTO route_surcharges (label, zones_a, zones_b, sedan, minivan, minibus, vip, prices, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  RULES.forEach((r, i) =>
    insRule.run(
      r.label,
      json(r.a),
      json(r.b),
      r.add.sedan ?? 0,
      r.add.minivan ?? 0,
      r.add.minibus ?? 0,
      r.add['vip-luxury'] ?? 0,
      json(r.add),
      i,
    ),
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

/**
 * Rellena los textos en inglés que falten con la traducción que trae el
 * proyecto. Se ejecuta en cada arranque: una base sembrada antes de que
 * existieran estas columnas las tiene vacías, y una excursión que el cliente
 * cree desde el panel sin inglés se queda como está (no hay de dónde sacarlo).
 */
function backfillEnglish() {
  const updEx = db.prepare(`
    UPDATE excursions SET
      name_en = COALESCE(name_en, @name_en),
      duration_en = COALESCE(duration_en, @duration_en),
      description_en = COALESCE(description_en, @description_en),
      includes_en = COALESCE(includes_en, @includes_en),
      activities_en = COALESCE(activities_en, @activities_en),
      tickets_en = COALESCE(tickets_en, @tickets_en)
    WHERE slug = @slug
  `);
  const exRows = db.prepare('SELECT slug, name, tickets FROM excursions').all() as {
    slug: string;
    name: string;
    tickets: string;
  }[];
  let n = 0;
  for (const row of exRows) {
    const tr = EXCURSIONS_EN[row.slug];
    if (!tr) continue;
    let tickets: { name: string; includes: string }[] = [];
    try {
      tickets = JSON.parse(row.tickets) as { name: string; includes: string }[];
    } catch {
      tickets = [];
    }
    const r = updEx.run({
      slug: row.slug,
      name_en: tr.name ?? row.name,
      duration_en: tr.duration,
      description_en: tr.description,
      includes_en: json(tr.includes),
      activities_en: json(tr.activities),
      tickets_en: json(
        tickets.map((t, i) => ({
          name: tr.tickets?.[i]?.name ?? t.name,
          includes: tr.tickets?.[i]?.includes ?? t.includes,
        })),
      ),
    });
    n += r.changes;
  }

  const updV = db.prepare(`
    UPDATE vehicles SET
      name_en = COALESCE(name_en, @name_en),
      type_en = COALESCE(type_en, @type_en),
      summary_en = COALESCE(summary_en, @summary_en),
      features_en = COALESCE(features_en, @features_en)
    WHERE slug = @slug
  `);
  const vRows = db.prepare('SELECT slug, name FROM vehicles').all() as { slug: string; name: string }[];
  for (const row of vRows) {
    const tr = FLEET_EN[row.slug];
    if (!tr) continue;
    updV.run({
      slug: row.slug,
      name_en: tr.name ?? row.name,
      type_en: tr.type,
      summary_en: tr.summary,
      features_en: json(tr.features),
    });
  }
  console.log(`  · textos en inglés revisados (${n} excursiones)`);
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
    backfillEnglish();
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
  backfillEnglish();
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
