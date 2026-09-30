import { randomUUID } from 'node:crypto';
import { brotliCompressSync, brotliDecompressSync, constants as zc } from 'node:zlib';
import { db } from '../db.ts';
import { buildCatalog } from '../catalog.ts';
import { quote } from '../../src/data/pricing.ts';
import type { PricingTables } from '../../src/data/pricing.ts';
import { etgConfig, etgEnv } from './config.ts';
import { EtgError } from './errors.ts';
import { haversine, resolvePoint, type ResolvedPoint } from './points.ts';
import { instantToRfc, parseWall, wallToInstant, withOffset, type LocalDateTime } from './time.ts';

/** Categorías válidas de ETG y el rango de plazas que admite cada una. */
export const ETG_CATEGORIES: Record<string, [number, number]> = {
  micro: [2, 3],
  economy: [3, 4],
  economy_mpv_new: [4, 4],
  economy_mpv: [3, 4],
  economy_van: [4, 7],
  minibus: [7, 20],
  business: [2, 3],
  business_mpv: [3, 4],
  business_van: [4, 7],
  first: [2, 3],
  bus: [20, 100],
  electro_micro: [2, 3],
  electro_economy: [3, 4],
  electro_economy_mpv: [4, 6],
  electro_comfort: [3, 4],
  electro_economy_van: [4, 7],
  electro_minibus: [8, 20],
  electro_business: [2, 3],
  electro_business_mpv: [3, 4],
  electro_business_van: [4, 7],
  electro_first: [2, 3],
  electro_bus: [20, 100],
};

export interface EtgVehicle {
  slug: string;
  category: string;
  carModel: string;
  seats: number;
  luggage: number;
}

export interface Upsell {
  id: string;
  type: string;
  price: number;
  count: number;
  max_count: number;
}

export interface Offer {
  id: string;
  estimated_duration_minutes: number;
  distance: number;
  service_type: 'transfer';
  transfer_category: string;
  car_model: string;
  included_waiting_time_minutes: number;
  luggage_places: number;
  seats: number;
  children_seat_0: number;
  children_seat_1: number;
  children_seat_2: number;
  children_seat_3: number;
  price: { amount: number; currency: string };
  upsells: Upsell[];
  tolls_included: boolean;
  gratuity_included: boolean;
  free_cancel_until: string;
}

/** Lo que se guarda de cada oferta además de lo que ve ETG. */
export interface StoredOffer {
  offer: Offer;
  vehicleSlug: string;
  startWall: string;
  tz: string;
  startInstant: number;
  freeCancelInstant: number;
  pickupIsAirport: boolean;
  searchPrice: number;
}

/* ------------------------------------------------------------ cachés */

let cache: { at: number; tables: PricingTables; vehicles: EtgVehicle[]; seatPrice: number } | null = null;

/** Tarifas y flota, releídas cada 30 s: el search no toca la base para esto. */
function pricingData() {
  if (cache && Date.now() - cache.at < 30_000) return cache;
  const cat = buildCatalog();
  const rows = db
    .prepare(
      `SELECT slug, etg_category, etg_car_model, etg_seats, etg_luggage FROM vehicles
       WHERE visible = 1 AND etg_enabled = 1 AND etg_category IS NOT NULL ORDER BY position`,
    )
    .all() as { slug: string; etg_category: string; etg_car_model: string | null; etg_seats: number | null; etg_luggage: number | null }[];
  const vehicles: EtgVehicle[] = rows
    .filter((r) => ETG_CATEGORIES[r.etg_category] && r.etg_car_model && (r.etg_seats ?? 0) > 0)
    .map((r) => ({
      slug: r.slug,
      category: r.etg_category,
      carModel: r.etg_car_model!,
      seats: r.etg_seats!,
      luggage: Math.max(1, r.etg_luggage ?? r.etg_seats!),
    }));
  // Silla de niño: el precio de la web (tabla extras), el mismo para los 4
  // tipos. Si la web no las cobra, 0.
  const seats = (cat.extras.seats as { price: number }[]) ?? [];
  const seatPrice = seats.length ? Math.min(...seats.map((s) => s.price)) : 0;
  cache = { at: Date.now(), tables: cat.pricing as unknown as PricingTables, vehicles, seatPrice };
  return cache;
}

export const resetPricingCache = () => {
  cache = null;
};

/* ----------------------------------------------------------- utilidades */

/**
 * Las búsquedas se guardan comprimidas (≈ 4 KB → 0,7 KB): con 80 000 al día y
 * 26 h de vida, la diferencia son ~400 MB frente a ~60 MB en disco.
 */
const pack = (v: unknown) =>
  brotliCompressSync(Buffer.from(JSON.stringify(v)), { params: { [zc.BROTLI_PARAM_QUALITY]: 4 } });
const unpack = <T>(v: string | Buffer): T =>
  JSON.parse(typeof v === 'string' ? v : brotliDecompressSync(v).toString('utf8')) as T;

const round2 = (n: number) => Math.round(n * 100) / 100;

function intField(body: Record<string, unknown>, key: string, { required = false, min = 0 } = {}): number {
  const v = body[key];
  if (v === undefined || v === null || v === '') {
    if (required) throw new EtgError('INVALID_REQUEST', `${key} is required`);
    return 0;
  }
  if (typeof v !== 'number' || !Number.isInteger(v)) throw new EtgError('INVALID_REQUEST', `${key} must be an integer`);
  if (v < min) throw new EtgError('INVALID_REQUEST', `${key} must be ${min === 0 ? 'zero or greater' : `at least ${min}`}`);
  return v;
}

export interface SearchInput {
  passengers: number;
  seats: [number, number, number, number];
  local: LocalDateTime;
  start: ResolvedPoint;
  end: ResolvedPoint;
}

/** Valida el request. Cualquier fallo de forma es un error 500 con el campo. */
export function parseSearch(raw: unknown): SearchInput {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new EtgError('INVALID_REQUEST', 'request body must be a JSON object');
  }
  const body = raw as Record<string, unknown>;
  const passengers = intField(body, 'passengers', { required: true, min: 1 });
  const seats = [0, 1, 2, 3].map((i) => intField(body, `children_seat_${i}`)) as [number, number, number, number];
  if (body.start_date_time == null || body.start_date_time === '') throw new EtgError('INVALID_REQUEST', 'start_date_time is required');
  const local = parseWall(body.start_date_time);
  if (!local) throw new EtgError('INVALID_REQUEST', 'start_date_time must be a valid RFC3339 date-time');
  if (body.start_point == null) throw new EtgError('INVALID_REQUEST', 'start_point is required');
  if (body.end_point == null) throw new EtgError('INVALID_REQUEST', 'end_point is required');
  const start = resolvePoint(body.start_point, 'start_point');
  const end = resolvePoint(body.end_point, 'end_point');
  return { passengers, seats, local, start, end };
}

/* --------------------------------------------------------------- search */

export interface SearchResult {
  start_date_time: string;
  offers: Offer[];
}

export function search(raw: unknown): SearchResult {
  const input = parseSearch(raw);
  const cfg = etgConfig();
  const { start, end, local, passengers, seats: wanted } = input;

  // La hora de reloj pedida, con el desfase del punto de recogida.
  const startDateTime = withOffset(local, start.tz);
  const empty: SearchResult = { start_date_time: startDateTime, offers: [] };

  // Cobertura: los dos puntos en RD y un trayecto con sentido.
  if (!start.covered || !end.covered) return empty;
  const straight = haversine(start.lat, start.lon, end.lat, end.lon);
  if (straight < 0.3 || straight > 450) return empty;

  // Anticipación mínima (y nada en el pasado).
  const startInstant = wallToInstant(local, start.tz);
  const now = Date.now();
  if (startInstant - now < cfg.minAdvanceHours * 3600_000) return empty;

  const { tables, vehicles, seatPrice } = pricingData();
  const distance = Math.max(1, Math.round(straight * cfg.roadFactor));
  const duration = Math.max(5, Math.round((distance / cfg.avgSpeedKmh) * 60));
  const waiting = start.isAirport ? cfg.waitAirport : cfg.waitOther;
  const wantedSeats = wanted.reduce((a, b) => a + b, 0);

  // Cancelación gratis hasta X h antes; si ya pasó ese momento, "ahora".
  const freeCancelInstant = Math.max(now, startInstant - cfg.freeCancelHours * 3600_000);
  const freeCancel = instantToRfc(freeCancelInstant, start.tz);

  const origin = { text: start.text, lat: start.lat, lng: start.lon };
  const destination = { text: end.text, lat: end.lat, lng: end.lon };

  const searchId = randomUUID();
  const byKey = new Map<string, StoredOffer>();
  let n = 0;
  for (const v of vehicles) {
    if (v.seats < passengers) continue;
    // Sillas: cada tipo cabe hasta plazas − 1 y entre todas también.
    const maxSeats = v.seats - 1;
    if (wantedSeats > maxSeats || wanted.some((w) => w > maxSeats)) continue;

    const q = quote(distance, v.slug, origin, destination, tables);
    if (!q || !(q.total > 0)) continue;
    const base = round2(q.total * (1 + cfg.markupPercent / 100));
    const amount = round2(base + wantedSeats * seatPrice);
    if (!(amount > 0)) continue;

    const upsells: Upsell[] = [0, 1, 2, 3].map((i) => ({
      id: `children_seat_${i}`,
      type: `children_seat_${i}`,
      price: seatPrice,
      count: wanted[i]!,
      max_count: maxSeats,
    }));
    upsells.push({ id: 'water_bottle', type: 'water_bottle', price: 0, count: 0, max_count: 10 });

    const offer: Offer = {
      id: `${searchId}.${++n}`,
      estimated_duration_minutes: duration,
      distance,
      service_type: 'transfer',
      transfer_category: v.category,
      car_model: v.carModel,
      included_waiting_time_minutes: waiting,
      luggage_places: v.luggage,
      seats: v.seats,
      children_seat_0: wanted[0],
      children_seat_1: wanted[1],
      children_seat_2: wanted[2],
      children_seat_3: wanted[3],
      price: { amount, currency: cfg.currency },
      upsells,
      tolls_included: cfg.tollsIncluded,
      gratuity_included: cfg.gratuityIncluded,
      free_cancel_until: freeCancel,
    };
    // Sin duplicados: misma categoría y mismas plazas → la más barata.
    const key = `${v.category}|${v.seats}`;
    const prev = byKey.get(key);
    if (!prev || amount < prev.offer.price.amount) {
      byKey.set(key, {
        offer,
        vehicleSlug: v.slug,
        startWall: local.wall,
        tz: start.tz,
        startInstant,
        freeCancelInstant,
        pickupIsAirport: start.isAirport,
        searchPrice: amount,
      });
    }
  }

  const stored = [...byKey.values()];
  if (stored.length === 0) return empty;

  // Vida de la oferta: al menos 24 h (offerTtlHours), salvo que el viaje esté
  // más cerca: entonces hasta el límite de anticipación mínima.
  const expiresAt = Math.min(now + cfg.offerTtlHours * 3600_000, startInstant - cfg.minAdvanceHours * 3600_000);
  db.prepare('INSERT INTO etg_searches (id, created_at, expires_at, env, request, response) VALUES (?, ?, ?, ?, ?, ?)').run(
    searchId,
    now,
    expiresAt,
    etgEnv(),
    pack(raw),
    pack({ start: pointSnapshot(start), end: pointSnapshot(end), offers: stored }),
  );

  return { start_date_time: startDateTime, offers: stored.map((s) => s.offer) };
}

export const pointSnapshot = (p: ResolvedPoint) => ({
  kind: p.kind,
  iata: p.iata,
  lat: p.lat,
  lon: p.lon,
  tz: p.tz,
  label: p.label,
  isAirport: p.isAirport,
});

/** Busca una oferta guardada por su id ("<búsqueda>.<n>"). */
export function findOffer(offerId: string): { stored: StoredOffer; expiresAt: number; request: unknown; points: { start: unknown; end: unknown } } | null {
  const dot = offerId.lastIndexOf('.');
  if (dot <= 0) return null;
  const row = db.prepare('SELECT request, response, expires_at FROM etg_searches WHERE id = ?').get(offerId.slice(0, dot)) as
    | { request: string | Buffer; response: string | Buffer; expires_at: number }
    | undefined;
  if (!row) return null;
  const data = unpack<{ start: unknown; end: unknown; offers: StoredOffer[] }>(row.response);
  const stored = data.offers.find((o) => o.offer.id === offerId);
  if (!stored) return null;
  return { stored, expiresAt: row.expires_at, request: unpack(row.request), points: { start: data.start, end: data.end } };
}
