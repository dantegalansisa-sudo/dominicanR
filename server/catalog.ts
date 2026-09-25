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
  child_price: number | null;
  cash_allowed: number | null;
  tickets_addon: number | null;
  tickets_unit: number | null;
  includes: string;
  activities: string;
  departures: string;
  tickets: string;
  featured: number;
  name_en: string | null;
  duration_en: string | null;
  description_en: string | null;
  includes_en: string | null;
  activities_en: string | null;
  tickets_en: string | null;
  tickets_title: string | null;
  tickets_lead: string | null;
  tickets_title_en: string | null;
  tickets_lead_en: string | null;
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
  name_en: string | null;
  type_en: string | null;
  summary_en: string | null;
  features_en: string | null;
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
    childPrice: e.adults_only ? null : e.child_price,
    cashAllowed: e.cash_allowed !== 0,
    ...(e.tickets_addon ? { ticketsAddon: true } : {}),
    ...(e.tickets_unit ? { ticketsUnit: true } : {}),
    includes: parse<string[]>(e.includes, []),
    activities: parse<string[]>(e.activities, []),
    departures: parse<string[]>(e.departures, []),
    tickets: parse<unknown[]>(e.tickets, []),
    ...(e.tickets_title?.trim() ? { ticketsTitle: e.tickets_title.trim() } : {}),
    ...(e.tickets_lead?.trim() ? { ticketsLead: e.tickets_lead.trim() } : {}),
    photos: bySlug.get(e.slug) ?? [],
    // Lo que tenga en inglés; lo que falte lo suple el front con el español.
    en: {
      name: e.name_en,
      duration: e.duration_en,
      description: e.description_en,
      includes: e.includes_en ? parse<string[]>(e.includes_en, []) : null,
      activities: e.activities_en ? parse<string[]>(e.activities_en, []) : null,
      tickets: e.tickets_en ? parse<{ name: string; includes: string }[]>(e.tickets_en, []) : null,
      ticketsTitle: e.tickets_title_en?.trim() || null,
      ticketsLead: e.tickets_lead_en?.trim() || null,
    },
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
    en: {
      name: v.name_en,
      type: v.type_en,
      summary: v.summary_en,
      features: v.features_en ? parse<string[]>(v.features_en, []) : null,
    },
  }));

  const legacy = (r: { sedan: number; minivan: number; minibus: number; vip: number }) => ({
    sedan: r.sedan,
    minivan: r.minivan,
    minibus: r.minibus,
    'vip-luxury': r.vip,
  });

  const brackets = (
    db.prepare('SELECT * FROM price_brackets ORDER BY position').all() as {
      up_to: number | null;
      sedan: number;
      minivan: number;
      minibus: number;
      vip: number;
      prices: string | null;
    }[]
  ).map((b) => ({
    // Se manda null, no Infinity: JSON no sabe representar el infinito y lo
    // convertiria en null igualmente, pero por el camino pareceria un fallo.
    // Quien lo consume traduce null a "sin limite".
    upTo: b.up_to,
    prices: b.prices ? parse<Record<string, number>>(b.prices, legacy(b)) : legacy(b),
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
      prices: string | null;
    }[]
  ).map((r) => ({
    label: r.label,
    a: parse<string[]>(r.zones_a, []),
    b: parse<string[]>(r.zones_b, []),
    add: r.prices ? parse<Record<string, number>>(r.prices, legacy(r)) : legacy(r),
  }));

  const routes = (
    db.prepare('SELECT * FROM fixed_routes WHERE visible = 1 ORDER BY position, id').all() as {
      id: number;
      label: string;
      a_text: string;
      a_lat: number | null;
      a_lng: number | null;
      b_text: string;
      b_lat: number | null;
      b_lng: number | null;
      km: number | null;
      radius_km: number;
      prices: string;
    }[]
  ).map((r) => ({
    id: r.id,
    label: r.label,
    a: { text: r.a_text, lat: r.a_lat, lng: r.a_lng },
    b: { text: r.b_text, lat: r.b_lat, lng: r.b_lng },
    km: r.km,
    radiusKm: r.radius_km,
    prices: parse<Record<string, number>>(r.prices, {}),
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
    pricing: { brackets, zones, rules, routes },
    extras: {
      seats: extrasOf('seat'),
      drinks: extrasOf('drink'),
      stops: extrasOf('stop').map((s) => ({ ...s, minutes: s.minutes ?? 0 })),
    },
    settings,
  };
}
