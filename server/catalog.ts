import { db } from './db.ts';

/**
 * Lo que la web pública lee. Devuelve el catálogo con la misma forma que hoy
 * tienen los archivos de src/data, para que el front no note de dónde viene.
 */

const parse = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Un JSON roto en una fila no puede tumbar el catálogo entero: esa
    // excursión se queda sin esa lista y las demás siguen.
    return fallback;
  }
};

interface ExcursionRow {
  slug: string;
  name: string;
  category: string;
  price: number | null;
  rating: number;
  reviews: string;
  duration: string;
  description: string;
  adults_only: number;
  includes: string;
  activities: string;
  departures: string;
  tickets: string;
  featured: number;
}

interface VehicleRow {
  slug: string;
  name: string;
  type: string;
  min_pax: number;
  max_pax: number;
  price: number | null;
  photo: string | null;
  summary: string;
  features: string;
  featured: number;
  standard: number;
}

export function buildCatalog() {
  const photos = db
    .prepare('SELECT slug, path FROM excursion_photos ORDER BY slug, position')
    .all() as { slug: string; path: string }[];
  const bySlug = new Map<string, string[]>();
  for (const p of photos) {
    const list = bySlug.get(p.slug) ?? [];
    list.push(p.path);
    bySlug.set(p.slug, list);
  }

  const excursions = (
    db
      .prepare('SELECT * FROM excursions WHERE visible = 1 ORDER BY position')
      .all() as ExcursionRow[]
  ).map((e) => ({
    slug: e.slug,
    name: e.name,
    category: e.category,
    price: e.price,
    rating: e.rating,
    reviews: e.reviews,
    duration: e.duration,
    description: e.description,
    ...(e.adults_only ? { adultsOnly: true } : {}),
    includes: parse<string[]>(e.includes, []),
    activities: parse<string[]>(e.activities, []),
    departures: parse<string[]>(e.departures, []),
    tickets: parse<unknown[]>(e.tickets, []),
    photos: bySlug.get(e.slug) ?? [],
  }));

  const featured = (
    db
      .prepare('SELECT slug FROM excursions WHERE featured = 1 AND visible = 1 ORDER BY position')
      .all() as { slug: string }[]
  ).map((r) => r.slug);

  const fleet = (
    db.prepare('SELECT * FROM vehicles WHERE visible = 1 ORDER BY position').all() as VehicleRow[]
  ).map((v) => ({
    slug: v.slug,
    name: v.name,
    type: v.type,
    minPax: v.min_pax,
    maxPax: v.max_pax,
    price: v.price,
    photo: v.photo,
    summary: v.summary,
    features: parse<string[]>(v.features, []),
    featured: Boolean(v.featured),
    standard: Boolean(v.standard),
  }));

  const brackets = (
    db.prepare('SELECT * FROM price_brackets ORDER BY position').all() as {
      up_to: number | null;
      sedan: number;
      minivan: number;
      minibus: number;
      vip: number;
    }[]
  ).map((b) => ({
    // Se manda null, no Infinity: JSON no sabe representar el infinito y lo
    // convertiria en null igualmente, pero por el camino pareceria un fallo.
    // Quien lo consume traduce null a "sin limite".
    upTo: b.up_to,
    prices: { sedan: b.sedan, minivan: b.minivan, minibus: b.minibus, vip: b.vip },
  }));

  const zones = Object.fromEntries(
    (db.prepare('SELECT id, needles FROM zones').all() as { id: string; needles: string }[]).map(
      (z) => [z.id, parse<string[]>(z.needles, [])],
    ),
  );

  const rules = (
    db.prepare('SELECT * FROM route_surcharges ORDER BY position').all() as {
      label: string;
      zones_a: string;
      zones_b: string;
      sedan: number;
      minivan: number;
      minibus: number;
      vip: number;
    }[]
  ).map((r) => ({
    label: r.label,
    a: parse<string[]>(r.zones_a, []),
    b: parse<string[]>(r.zones_b, []),
    add: { sedan: r.sedan, minivan: r.minivan, minibus: r.minibus, vip: r.vip },
  }));

  const extrasOf = (kind: string) =>
    db
      .prepare('SELECT id, label, price, minutes FROM extras WHERE kind = ? AND visible = 1 ORDER BY position')
      .all(kind) as { id: string; label: string; price: number; minutes: number | null }[];

  const settings = Object.fromEntries(
    (db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]).map(
      (s) => [s.key, s.value],
    ),
  );

  return {
    excursions,
    featured,
    fleet,
    pricing: { brackets, zones, rules },
    extras: {
      seats: extrasOf('seat'),
      drinks: extrasOf('drink'),
      stops: extrasOf('stop').map((s) => ({ ...s, minutes: s.minutes ?? 0 })),
    },
    settings,
  };
}
