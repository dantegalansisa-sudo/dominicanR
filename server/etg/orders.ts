import { randomInt } from 'node:crypto';
import { db } from '../db.ts';
import { sendEmail, escapeHtml, BRAND } from '../../api/_contact.ts';
import { etgConfig, etgEnv } from './config.ts';
import { EtgError } from './errors.ts';
import { findOffer, type StoredOffer, type Upsell } from './search.ts';
import { instantToRfc, parseWall, wallToInstant, withOffset } from './time.ts';

/* ---------------------------------------------------------------- tipos */

export interface OrderRow {
  order_code: string;
  offer_id: string;
  env: string;
  created_at: string;
  updated_at: string;
  status: 'confirmed' | 'cancelled';
  internal_status: string;
  start_wall: string;
  tz: string;
  start_point: string;
  end_point: string;
  passengers: number;
  luggage_places: number;
  sport_luggage: number;
  wheelchairs: number;
  animals: number;
  children_seats: string;
  flight_number: string;
  comment: string | null;
  shield_text: string | null;
  main_passenger: string;
  upsells: string;
  offer: string;
  transfer_category: string;
  vehicle_slug: string | null;
  distance: number | null;
  duration_min: number | null;
  waiting_min: number | null;
  buffer_min: number;
  price: number;
  currency: string;
  free_cancel_until: string;
  penalty: number | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  pin_code: string | null;
  driver_first_name: string | null;
  driver_last_name: string | null;
  driver_phone: string | null;
  carrier_company: string | null;
  car_model: string | null;
  car_plate: string | null;
  car_color: string | null;
  notes: string | null;
}

export const getOrder = (code: string) =>
  db.prepare('SELECT * FROM etg_orders WHERE order_code = ?').get(code) as OrderRow | undefined;

/* ----------------------------------------------------------- utilidades */

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const round2 = (n: number) => Math.round(n * 100) / 100;

function intField(body: Record<string, unknown>, key: string, required = false): number {
  const v = body[key];
  if (v === undefined || v === null || v === '') {
    if (required) throw new EtgError('INVALID_REQUEST', `${key} is required`);
    return 0;
  }
  if (typeof v !== 'number' || !Number.isInteger(v)) throw new EtgError('INVALID_REQUEST', `${key} must be an integer`);
  if (v < 0) throw new EtgError('INVALID_REQUEST', `${key} must be zero or greater`);
  return v;
}

/** Código corto y fácil de dictar: "DR" + 6 caracteres sin 0/O ni 1/I/L. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function newOrderCode(): string {
  for (let i = 0; i < 20; i++) {
    let code = 'DR';
    for (let j = 0; j < 6; j++) code += ALPHABET[randomInt(ALPHABET.length)];
    if (!getOrder(code)) return code;
  }
  throw new EtgError('INTERNAL_ERROR', 'could not allocate an order id, please retry');
}

export const supplierLink = (code: string) => `${etgConfig().publicUrl}/admin/etg/orders/${encodeURIComponent(code)}`;

const isAirportPickup = (o: OrderRow) => {
  try {
    return Boolean((JSON.parse(o.start_point) as { isAirport?: boolean }).isAirport);
  } catch {
    return false;
  }
};

/** Con seguimiento de vuelo y recogida en aeropuerto hay margen; si no, 0. */
function bufferFor(pickupIsAirport: boolean, flightNumber: string, comment: string): number {
  const cfg = etgConfig();
  if (!pickupIsAirport || cfg.flightTracking === 'none') return 0;
  if (cfg.flightTracking === 'full' && flightNumber === 'No flight') return 0;
  if (cfg.flightTracking === 'partial' && comment.includes('NO FLIGHT TRACKING')) return 0;
  return cfg.bufferMinutes;
}

/* ------------------------------------------------------------------ book */

export function book(raw: unknown) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new EtgError('INVALID_REQUEST', 'request body must be a JSON object');
  }
  const body = raw as Record<string, unknown>;
  const offerId = str(body.offer_id).trim();
  if (!offerId) throw new EtgError('INVALID_REQUEST', 'offer_id is required');

  // Idempotencia: la misma oferta reservada otra vez devuelve la misma orden.
  const existing = db.prepare('SELECT order_code FROM etg_orders WHERE offer_id = ?').get(offerId) as
    | { order_code: string }
    | undefined;
  if (existing) return bookResponse(getOrder(existing.order_code)!);

  const passengers = intField(body, 'passengers', true);
  if (passengers < 1) throw new EtgError('INVALID_REQUEST', 'passengers must be at least 1');
  const luggage = intField(body, 'luggage_places', true);
  const sport = intField(body, 'sport_luggage_places');
  const wheelchairs = intField(body, 'wheelchairs_places');
  const animals = intField(body, 'animals_places');
  const seats = [0, 1, 2, 3].map((i) => intField(body, `children_seat_${i}`));
  if (body.flight_number == null || body.flight_number === '') throw new EtgError('INVALID_REQUEST', 'flight_number is required');
  if (typeof body.flight_number !== 'string') throw new EtgError('INVALID_REQUEST', 'flight_number must be a string');
  if (body.shield_text == null) throw new EtgError('INVALID_REQUEST', 'shield_text is required');
  if (typeof body.shield_text !== 'string') throw new EtgError('INVALID_REQUEST', 'shield_text must be a string');
  if (body.comment != null && typeof body.comment !== 'string') throw new EtgError('INVALID_REQUEST', 'comment must be a string');
  const mp = body.main_passenger as Record<string, unknown> | undefined;
  if (mp == null || typeof mp !== 'object') throw new EtgError('INVALID_REQUEST', 'main_passenger is required');
  for (const k of ['first_name', 'last_name', 'phone', 'email']) {
    if (typeof mp[k] !== 'string' || !(mp[k] as string).trim()) throw new EtgError('INVALID_REQUEST', `main_passenger.${k} is required`);
  }
  if (body.start_point == null) throw new EtgError('INVALID_REQUEST', 'start_point is required');
  if (body.end_point == null) throw new EtgError('INVALID_REQUEST', 'end_point is required');

  const found = findOffer(offerId);
  if (!found) throw new EtgError('OFFER_NOT_FOUND', `offer_id ${offerId} not found`);
  if (found.expiresAt < Date.now()) throw new EtgError('OFFER_EXPIRED', `offer_id ${offerId} has expired, please search again`);
  const { stored } = found;
  const offer = stored.offer;

  // Upsells reservados: id y count del request; type y precio de la oferta.
  const reqUpsells = Array.isArray(body.upsells) ? (body.upsells as Record<string, unknown>[]) : [];
  const booked: Upsell[] = [];
  reqUpsells.forEach((u, i) => {
    const id = str(u?.id);
    if (!id) throw new EtgError('INVALID_REQUEST', `upsells[${i}].id is required`);
    const count = u?.count;
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
      throw new EtgError('INVALID_REQUEST', `upsells[${i}].count must be a non-negative integer`);
    }
    const def = offer.upsells.find((x) => x.id === id);
    if (!def) throw new EtgError('INVALID_REQUEST', `upsells[${i}].id ${id} is not available in this offer`);
    if (count > 0) booked.push({ id, type: def.type, price: def.price, count, max_count: def.max_count });
  });

  const code = newOrderCode();
  const startPoint = { ...(body.start_point as object), resolved: found.points.start, isAirport: stored.pickupIsAirport };
  const endPoint = { ...(body.end_point as object), resolved: found.points.end };
  const comment = typeof body.comment === 'string' ? body.comment : '';
  const flight = body.flight_number as string;

  db.prepare(
    `INSERT INTO etg_orders (
      order_code, offer_id, env, start_wall, tz, start_point, end_point, passengers, luggage_places,
      sport_luggage, wheelchairs, animals, children_seats, flight_number, comment, shield_text,
      main_passenger, upsells, offer, transfer_category, vehicle_slug, distance, duration_min, waiting_min,
      buffer_min, price, currency, free_cancel_until
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    code,
    offerId,
    etgEnv(),
    stored.startWall,
    stored.tz,
    JSON.stringify(startPoint),
    JSON.stringify(endPoint),
    passengers,
    luggage,
    sport,
    wheelchairs,
    animals,
    JSON.stringify(seats),
    flight,
    comment,
    body.shield_text as string,
    JSON.stringify(mp),
    JSON.stringify(booked),
    JSON.stringify(stored),
    offer.transfer_category,
    stored.vehicleSlug,
    offer.distance,
    offer.estimated_duration_minutes,
    offer.included_waiting_time_minutes,
    bufferFor(stored.pickupIsAirport, flight, comment),
    offer.price.amount,
    offer.price.currency,
    offer.free_cancel_until,
  );

  const order = getOrder(code)!;
  notifyTeam(order, 'nueva').catch((err) => console.error('ETG: aviso de orden nueva no enviado:', err));
  return bookResponse(order);
}

export function bookResponse(o: OrderRow) {
  const cfg = etgConfig();
  const seats = JSON.parse(o.children_seats) as number[];
  const upsells = JSON.parse(o.upsells) as Upsell[];
  const airport = isAirportPickup(o);
  return {
    supplier_link: supplierLink(o.order_code),
    order_id: o.order_code,
    start_time: withOffset(parseWall(o.start_wall)!, o.tz),
    distance: o.distance ?? 0,
    included_waiting_time_minutes: o.waiting_min ?? cfg.waitOther,
    buffer_time_minutes: o.buffer_min ?? 0,
    estimated_duration_minutes: o.duration_min ?? 0,
    passengers: o.passengers,
    luggage_places: o.luggage_places,
    sport_luggage_places: o.sport_luggage,
    animals: o.animals,
    wheelchairs_places: o.wheelchairs,
    children_seat_0: seats[0] ?? 0,
    children_seat_1: seats[1] ?? 0,
    children_seat_2: seats[2] ?? 0,
    children_seat_3: seats[3] ?? 0,
    comment: o.comment ?? '',
    flight_number: o.flight_number,
    shield_text: o.shield_text ?? '',
    price: { amount: o.price, currency: o.currency },
    ...(upsells.length ? { upsells: upsells.map((u) => ({ id: u.id, type: u.type, count: u.count, price: u.price })) } : {}),
    ...(airport && cfg.meetingInstructions ? { meeting_instructions: cfg.meetingInstructions } : {}),
    meeting_images: airport ? cfg.meetingImages : [],
  };
}

/* ---------------------------------------------------------------- status */

function orderCodeFrom(raw: unknown): string {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new EtgError('INVALID_REQUEST', 'request body must be a JSON object');
  }
  const v = (raw as Record<string, unknown>).order_id;
  if (v == null || v === '') throw new EtgError('INVALID_REQUEST', 'order_id is required');
  if (typeof v !== 'string') throw new EtgError('INVALID_REQUEST', 'order_id must be a string');
  return v.trim();
}

export function statusOf(raw: unknown) {
  const code = orderCodeFrom(raw);
  const o = getOrder(code);
  if (!o) throw new EtgError('ORDER_NOT_FOUND', `order_id ${code} not found`);
  return statusResponse(o);
}

export function statusResponse(o: OrderRow) {
  const cfg = etgConfig();
  const mp = JSON.parse(o.main_passenger) as Record<string, string>;
  const airport = isAirportPickup(o);
  const driverName = [o.driver_first_name, o.driver_last_name].filter(Boolean);
  return {
    status: o.status === 'cancelled' ? 'cancelled' : 'completed',
    order_id: o.order_code,
    start_time: withOffset(parseWall(o.start_wall)!, o.tz),
    price: { amount: o.price, currency: o.currency },
    // Solo con teléfono; nunca un objeto vacío.
    ...(o.driver_phone
      ? {
          driver_info: {
            ...(driverName.length === 2 ? { first_name: o.driver_first_name!, last_name: o.driver_last_name! } : {}),
            phone: o.driver_phone,
            ...(o.carrier_company ? { carrier_company_name: o.carrier_company } : {}),
          },
        }
      : {}),
    ...(o.car_model && o.car_plate
      ? { car_info: { car_model: o.car_model, plate_number: o.car_plate, ...(o.car_color ? { color: o.car_color } : {}) } }
      : {}),
    ...(airport && cfg.meetingInstructions
      ? { meeting_info: { instructions: cfg.meetingInstructions, images: cfg.meetingImages } }
      : {}),
    main_passenger: { first_name: mp.first_name ?? '', last_name: mp.last_name ?? '', phone: mp.phone ?? '' },
    included_waiting_time_minutes: o.waiting_min ?? cfg.waitOther,
    buffer_time_minutes: o.buffer_min ?? 0,
    passengers: o.passengers,
    luggage_places: o.luggage_places,
    sport_luggage_places: o.sport_luggage,
    animals: o.animals,
    comment: o.comment ?? '',
    shield_text: o.shield_text ?? '',
    transfer_category: o.transfer_category,
    free_cancel_until: o.free_cancel_until,
  };
}

/* ---------------------------------------------------------------- cancel */

/** Penalidad según la política: 0 dentro de plazo; si no, % del precio. */
export function penaltyFor(o: OrderRow, at = Date.now()): number {
  const fcu = Date.parse(o.free_cancel_until);
  if (Number.isFinite(fcu) && at <= fcu) return 0;
  return Math.min(o.price, round2((o.price * etgConfig().latePenaltyPercent) / 100));
}

/** Cancela siempre con éxito; dos veces seguidas devuelve la misma penalidad. */
export function cancelOrder(code: string, who: string) {
  const o = getOrder(code);
  if (!o) throw new EtgError('ORDER_NOT_FOUND', `order_id ${code} not found`);
  if (o.status !== 'cancelled') {
    const penalty = penaltyFor(o);
    db.prepare(
      `UPDATE etg_orders SET status = 'cancelled', internal_status = 'cancelled', penalty = ?, cancelled_at = datetime('now'),
       cancelled_by = ?, updated_at = datetime('now') WHERE order_code = ?`,
    ).run(penalty, who, code);
    const updated = getOrder(code)!;
    notifyTeam(updated, 'cancelada').catch((err) => console.error('ETG: aviso de cancelación no enviado:', err));
    return { penalty: { amount: penalty, currency: o.currency } };
  }
  return { penalty: { amount: o.penalty ?? 0, currency: o.currency } };
}

export const cancel = (raw: unknown) => cancelOrder(orderCodeFrom(raw), 'etg-api');

/* ---------------------------------------------------- cambios del portal */

export interface OrderChanges {
  start_wall?: string;
  passengers?: number;
  luggage_places?: number;
  sport_luggage?: number;
  animals?: number;
  wheelchairs?: number;
  first_name?: string;
  last_name?: string;
  phone?: string;
  comment?: string;
  shield_text?: string;
  flight_number?: string;
  transfer_category?: string;
  price?: number;
  driver_first_name?: string | null;
  driver_last_name?: string | null;
  driver_phone?: string | null;
  carrier_company?: string | null;
  car_model?: string | null;
  car_plate?: string | null;
  car_color?: string | null;
  internal_status?: string;
  notes?: string | null;
}

/**
 * Aplica cambios de soporte (ETG) o del equipo. Todo lo que se cambia aquí se
 * ve en /status en la siguiente consulta, precio incluido. Queda en el
 * historial con quién, qué y precio anterior/nuevo.
 */
export function modifyOrder(code: string, changes: OrderChanges, who: string) {
  const o = getOrder(code);
  if (!o) throw new EtgError('ORDER_NOT_FOUND', `order_id ${code} not found`);
  const sets: string[] = [];
  const values: unknown[] = [];
  const diff: Record<string, [unknown, unknown]> = {};
  const put = (col: keyof OrderRow, value: unknown) => {
    if (value === undefined || value === (o as unknown as Record<string, unknown>)[col]) return;
    sets.push(`${col} = ?`);
    values.push(value);
    diff[col] = [(o as unknown as Record<string, unknown>)[col], value];
  };

  if (changes.start_wall !== undefined) {
    const local = parseWall(changes.start_wall);
    if (!local) throw new EtgError('INVALID_REQUEST', 'start time must be YYYY-MM-DDTHH:MM');
    put('start_wall', local.wall);
    // La cancelación gratis se mueve con la hora del viaje.
    const cfg = etgConfig();
    const fcu = Math.max(Date.now(), wallToInstant(local, o.tz) - cfg.freeCancelHours * 3600_000);
    put('free_cancel_until', instantToRfc(fcu, o.tz));
  }
  for (const k of ['passengers', 'luggage_places', 'sport_luggage', 'animals', 'wheelchairs'] as const) {
    const v = changes[k];
    if (v === undefined) continue;
    if (!Number.isInteger(v) || v < (k === 'passengers' ? 1 : 0)) throw new EtgError('INVALID_REQUEST', `${k} is not valid`);
    put(k, v);
  }
  if (changes.first_name !== undefined || changes.last_name !== undefined || changes.phone !== undefined) {
    const mp = JSON.parse(o.main_passenger) as Record<string, string>;
    const next = {
      ...mp,
      ...(changes.first_name !== undefined ? { first_name: changes.first_name } : {}),
      ...(changes.last_name !== undefined ? { last_name: changes.last_name } : {}),
      ...(changes.phone !== undefined ? { phone: changes.phone } : {}),
    };
    if (!next.first_name || !next.last_name || !next.phone) throw new EtgError('INVALID_REQUEST', 'passenger name and phone are required');
    put('main_passenger', JSON.stringify(next));
  }
  for (const k of ['comment', 'shield_text', 'flight_number', 'transfer_category', 'internal_status', 'notes'] as const) {
    if (changes[k] !== undefined) put(k, changes[k]);
  }
  if (changes.price !== undefined) {
    if (!(typeof changes.price === 'number' && changes.price > 0)) throw new EtgError('INVALID_REQUEST', 'price must be greater than 0');
    put('price', round2(changes.price));
  }
  for (const k of ['driver_first_name', 'driver_last_name', 'driver_phone', 'carrier_company', 'car_model', 'car_plate', 'car_color'] as const) {
    if (changes[k] !== undefined) put(k, changes[k] === '' ? null : changes[k]);
  }

  if (sets.length === 0) return o;
  sets.push("updated_at = datetime('now')");
  db.transaction(() => {
    db.prepare(`UPDATE etg_orders SET ${sets.join(', ')} WHERE order_code = ?`).run(...values, code);
    db.prepare('INSERT INTO etg_order_changes (order_code, who, changes, old_price, new_price) VALUES (?, ?, ?, ?, ?)').run(
      code,
      who,
      JSON.stringify(diff),
      o.price,
      diff.price ? (diff.price[1] as number) : o.price,
    );
  })();
  return getOrder(code)!;
}

/* ------------------------------------------------------------ avisos */

/** Correo al equipo: orden nueva o cancelada. Sin RESEND_API_KEY, nada. */
async function notifyTeam(o: OrderRow, what: 'nueva' | 'cancelada') {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const to = process.env.CONTACT_TO || 'dominicanroutes@gmail.com';
  const from = process.env.CONTACT_FROM || 'Dominican Routes <onboarding@resend.dev>';
  const mp = JSON.parse(o.main_passenger) as Record<string, string>;
  const sp = JSON.parse(o.start_point) as { address?: string; iata?: string; resolved?: { label?: string } };
  const ep = JSON.parse(o.end_point) as { address?: string; iata?: string; resolved?: { label?: string } };
  const lines = [
    `Orden ETG ${o.order_code} (${what})${o.env && o.env !== 'production' ? ` · entorno ${o.env}` : ''}`,
    `Recogida: ${withOffset(parseWall(o.start_wall)!, o.tz)}`,
    `Desde: ${sp.resolved?.label ?? sp.address ?? sp.iata ?? ''}`,
    `Hasta: ${ep.resolved?.label ?? ep.address ?? ep.iata ?? ''}`,
    `Pasajero: ${mp.first_name ?? ''} ${mp.last_name ?? ''} · ${mp.phone ?? ''}`,
    `Pasajeros: ${o.passengers} · maletas: ${o.luggage_places} · vuelo: ${o.flight_number}`,
    `Categoría: ${o.transfer_category} (${o.vehicle_slug ?? ''}) · precio ${o.currency} ${o.price}`,
    ...(o.comment ? [`Comentario: ${o.comment}`] : []),
    ...(what === 'cancelada' ? [`Penalidad: ${o.currency} ${o.penalty ?? 0}`] : []),
    `Detalle: ${supplierLink(o.order_code)}`,
  ];
  await sendEmail({
    apiKey,
    from,
    to,
    subject: `ETG · orden ${what} ${o.order_code}`,
    html: `<div style="font-family:system-ui,sans-serif;color:${BRAND.ink}"><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(lines.join('\n'))}</pre></div>`,
    text: lines.join('\n'),
  });
}

export type { StoredOffer };
