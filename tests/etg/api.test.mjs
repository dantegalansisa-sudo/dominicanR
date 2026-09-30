// Pruebas de casos borde de la API de ETG (sección 13 del informe).
//
//   ETG_URL=http://localhost:3100/etg-api ETG_USER=… ETG_PASSWORD=… \
//   ADMIN_URL=http://localhost:3100 ADMIN_EMAIL=… ADMIN_PASS=… \
//   node --test tests/etg/
//
// Las que necesitan el panel (asignar chofer, modificar) se saltan si no se
// pasan ADMIN_EMAIL/ADMIN_PASS.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const URL = process.env.ETG_URL ?? 'http://localhost:3100/etg-api';
const AUTH = 'Basic ' + Buffer.from(`${process.env.ETG_USER}:${process.env.ETG_PASSWORD}`).toString('base64');
const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:3100';

async function call(path, body, auth = AUTH) {
  const res = await fetch(URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: JSON.parse(text), raw: text };
}

/** Hora de reloj "local" dentro de X horas, con la Z que manda ETG. */
const inHours = (h) => new Date(Date.now() + h * 3600_000).toISOString().slice(0, 19) + 'Z';

const PUJ = { type: 'iata', iata: 'PUJ' };
const SDQ = { type: 'iata', iata: 'SDQ' };
const BAVARO = { type: 'coordinates', coordinates: { lat: 18.6892, lon: -68.4486 }, address: 'Hotel Riu Palace Bávaro' };
const LAS_TERRENAS = { type: 'coordinates', coordinates: { lat: 19.3117, lon: -69.5428 }, address: 'Hotel Playa Colibrí, Las Terrenas' };

const searchBody = (over = {}) => ({
  passengers: 2,
  children_seat_0: 0,
  children_seat_1: 0,
  children_seat_2: 0,
  children_seat_3: 0,
  start_date_time: inHours(24 * 7),
  start_point: PUJ,
  end_point: BAVARO,
  ...over,
});

const passenger = { first_name: 'Harry', last_name: 'Potter', phone: '+1 809 555 0000', email: 'support@example.com' };
const bookBody = (offer, over = {}) => ({
  offer_id: offer.id,
  passengers: 2,
  luggage_places: 2,
  children_seat_0: 0,
  children_seat_1: 0,
  children_seat_2: 0,
  children_seat_3: 0,
  flight_number: 'No flight',
  shield_text: 'Harry Potter',
  comment: '',
  main_passenger: passenger,
  start_point: PUJ,
  end_point: BAVARO,
  ...over,
});

async function firstOffer(over = {}) {
  const r = await call('/search', searchBody(over));
  assert.equal(r.status, 200, r.raw);
  assert.ok(r.body.offers.length > 0, 'se esperaban ofertas');
  return { search: r.body, offer: r.body.offers[0] };
}

/* ------------------------------------------------------------- search */

test('la "Z" no es UTC: misma hora con -04:00', async () => {
  const when = '2027-02-10T14:00:00Z';
  const r = await call('/search', searchBody({ start_date_time: when }));
  assert.equal(r.body.start_date_time, '2027-02-10T14:00:00-04:00');
});

test('huso del punto de recogida fuera de RD (sin ofertas)', async () => {
  for (const [iata, off] of [['CGK', '+07:00'], ['HNL', '-10:00'], ['CUL', '-07:00']]) {
    const r = await call('/search', searchBody({ start_point: { type: 'iata', iata }, start_date_time: '2027-01-15T10:00:00Z' }));
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.offers, []);
    assert.equal(r.body.start_date_time, `2027-01-15T10:00:00${off}`);
  }
});

test('las 4 combinaciones de ruta dan ofertas', async () => {
  for (const [a, b] of [
    [PUJ, BAVARO],
    [PUJ, SDQ],
    [BAVARO, SDQ],
    [BAVARO, LAS_TERRENAS],
  ]) {
    const r = await call('/search', searchBody({ start_point: a, end_point: b }));
    assert.equal(r.status, 200, r.raw);
    assert.ok(r.body.offers.length > 0, `${JSON.stringify(a)} → ${JSON.stringify(b)}`);
  }
});

test('ofertas válidas: sin duplicados, car_model limpio, sillas y upsells', async () => {
  const r = await call('/search', searchBody({ passengers: 1 }));
  const seen = new Set();
  for (const o of r.body.offers) {
    const key = `${o.transfer_category}|${o.seats}`;
    assert.ok(!seen.has(key), `duplicada ${key}`);
    seen.add(key);
    assert.match(o.car_model, /^[A-Za-z0-9 ,\-]+$/);
    assert.doesNotMatch(o.car_model, /similar|possible/i);
    assert.ok(o.price.amount > 0 && o.included_waiting_time_minutes > 0 && o.luggage_places > 0 && o.seats >= 1);
    for (const t of [0, 1, 2, 3]) {
      const u = o.upsells.find((x) => x.type === `children_seat_${t}`);
      assert.ok(u, `falta silla ${t}`);
      assert.equal(u.count, 0);
      assert.ok(u.max_count > 0 && u.max_count <= o.seats - 1);
    }
    assert.ok(o.upsells.some((u) => !u.type.startsWith('children_seat') && u.count === 0 && u.max_count > 0));
    assert.ok(Date.parse(o.free_cancel_until) < Date.parse(r.body.start_date_time));
  }
});

test('sillas pedidas: en el precio, en el upsell y en children_seat_N', async () => {
  const base = (await call('/search', searchBody())).body.offers;
  const withSeat = (await call('/search', searchBody({ children_seat_2: 1 }))).body.offers;
  for (const o of withSeat) {
    const plain = base.find((b) => b.transfer_category === o.transfer_category && b.seats === o.seats);
    const seat = o.upsells.find((u) => u.type === 'children_seat_2');
    assert.equal(o.children_seat_2, 1);
    assert.equal(seat.count, 1);
    assert.equal(o.price.amount, plain.price.amount + seat.price);
  }
});

test('sin ofertas: pasado, ahora, dentro de la anticipación, capacidad, sillas', async () => {
  const cases = [
    { start_date_time: inHours(-48) },
    { start_date_time: inHours(0) },
    { start_date_time: inHours(6) },
    { passengers: 40 },
    { passengers: 2, children_seat_0: 12 },
    { start_point: { type: 'iata', iata: 'JFK' } },
    { end_point: { type: 'coordinates', coordinates: { lat: 40.7, lon: -74 }, address: 'New York' } },
  ];
  for (const c of cases) {
    const r = await call('/search', searchBody(c));
    assert.equal(r.status, 200, JSON.stringify(c));
    assert.deepEqual(r.body.offers, [], JSON.stringify(c));
    assert.match(r.body.start_date_time, /[+-]\d{2}:\d{2}$/);
  }
});

test('fecha lejana (1,4 años) sí tiene ofertas', async () => {
  const r = await call('/search', searchBody({ start_date_time: inHours(24 * 510) }));
  assert.ok(r.body.offers.length > 0);
});

test('request inválido: 500 con el campo en el mensaje', async () => {
  const cases = [
    [{ start_date_time: '' }, 'start_date_time'],
    [{ passengers: 0 }, 'passengers'],
    [{ passengers: null }, 'passengers'],
    [{ start_point: { iata: 'PUJ' } }, 'start_point.type'],
    [{ end_point: { type: 'coordinates' } }, 'end_point.coordinates'],
  ];
  for (const [over, field] of cases) {
    const r = await call('/search', searchBody(over));
    assert.equal(r.status, 500, JSON.stringify(over));
    assert.ok(r.body.code && r.body.error.includes(field), r.raw);
  }
  const bad = await call('/search', '{not json');
  assert.equal(bad.status, 500);
  assert.equal(bad.body.code, 'INVALID_JSON');
});

test('Basic Auth inválido: 401 con code/error', async () => {
  const r = await call('/search', searchBody(), 'Basic ' + Buffer.from('x:y').toString('base64'));
  assert.equal(r.status, 401);
  assert.ok(r.body.code && r.body.error);
});

/* --------------------------------------------------------------- book */

const UNICODE = 'Παρακαλούμε ünster Gießen Şişli العربية 소형차 🚐 «»`’”@#№$%^&*()_+-=[]{};|\\<>';

test('book: textos idénticos (UTF-8 sin escapar), idempotencia y order_id corto', async () => {
  const { search, offer } = await firstOffer();
  const body = bookBody(offer, { comment: UNICODE, shield_text: UNICODE, start_point: PUJ, end_point: { ...BAVARO, address: UNICODE } });
  const a = await call('/book', body);
  assert.equal(a.status, 200, a.raw);
  assert.equal(a.body.comment, UNICODE);
  assert.equal(a.body.shield_text, UNICODE);
  assert.ok(!a.raw.includes('\\u'), 'no debe escapar a \\uXXXX');
  assert.equal(a.body.start_time, search.start_date_time);
  assert.equal(a.body.price.amount, offer.price.amount);
  assert.ok(a.body.order_id.length <= 15 && a.body.order_id !== offer.id);
  assert.ok(a.body.supplier_link.endsWith(a.body.order_id));
  for (const k of ['sport_luggage_places', 'animals', 'wheelchairs_places']) assert.equal(a.body[k], 0);
  assert.ok(!('upsells' in a.body) || a.body.upsells.length === 0);
  const b = await call('/book', body);
  assert.equal(b.body.order_id, a.body.order_id);
});

test('book con upsells: id y count del request, type y precio de la oferta', async () => {
  const { offer } = await firstOffer({ children_seat_1: 1 });
  const r = await call('/book', bookBody(offer, { children_seat_1: 1, upsells: [{ id: 'children_seat_1', count: 1 }, { id: 'water_bottle', count: 2 }] }));
  assert.equal(r.status, 200, r.raw);
  assert.equal(r.body.children_seat_1, 1);
  assert.deepEqual(
    r.body.upsells.map((u) => [u.id, u.count]),
    [['children_seat_1', 1], ['water_bottle', 2]],
  );
  assert.equal(r.body.price.amount, offer.price.amount);
});

test('book: oferta inexistente o vacía → 500 claro', async () => {
  const a = await call('/book', { ...bookBody({ id: 'no-existe.1' }) });
  assert.equal(a.status, 500);
  assert.equal(a.body.code, 'OFFER_NOT_FOUND');
  const b = await call('/book', { ...bookBody({ id: '' }) });
  assert.equal(b.status, 500);
  assert.match(b.body.error, /offer_id is required/);
});

/* ------------------------------------------------------ status / cancel */

test('status y cancel: completed → cancelled, penalidad 0 en plazo, idempotente', async () => {
  const { offer } = await firstOffer();
  const order = (await call('/book', bookBody(offer))).body;
  const s1 = await call('/status', { order_id: order.order_id });
  assert.equal(s1.body.status, 'completed');
  assert.ok(!('driver_info' in s1.body) && !('car_info' in s1.body));
  const c1 = await call('/cancel', { order_id: order.order_id });
  assert.deepEqual(c1.body.penalty, { amount: 0, currency: order.price.currency });
  const c2 = await call('/cancel', { order_id: order.order_id });
  assert.deepEqual(c2.body, c1.body);
  const s2 = await call('/status', { order_id: order.order_id });
  assert.equal(s2.body.status, 'cancelled');
});

test('cancel fuera de plazo: penalidad = precio (nunca más)', async () => {
  const { offer } = await firstOffer({ start_date_time: inHours(14) });
  const order = (await call('/book', bookBody(offer))).body;
  const c = await call('/cancel', { order_id: order.order_id });
  assert.ok(c.body.penalty.amount > 0 && c.body.penalty.amount <= order.price.amount);
});

test('status/cancel de una orden que no existe → ORDER_NOT_FOUND', async () => {
  for (const path of ['/status', '/cancel']) {
    const r = await call(path, { order_id: 'DRXXXXXX' });
    assert.equal(r.status, 500);
    assert.equal(r.body.code, 'ORDER_NOT_FOUND');
  }
});

/* ------------------------------------------- panel: chofer y cambios */

const ADMIN = process.env.ADMIN_EMAIL && process.env.ADMIN_PASS;

test('panel: chofer asignado y cambio de precio se ven en /status', { skip: !ADMIN }, async () => {
  const login = await fetch(ADMIN_URL + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASS }),
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const { offer } = await firstOffer();
  const order = (await call('/book', bookBody(offer))).body;
  const put = await fetch(`${ADMIN_URL}/api/admin/etg/orders/${order.order_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      driver_first_name: 'Juan',
      driver_last_name: 'Perez',
      driver_phone: '+1 809 555 1234',
      car_model: 'Toyota Corolla',
      car_plate: 'A123456',
      car_color: 'white',
      price: order.price.amount + 15,
      start_wall: '2027-03-01T09:30',
    }),
  });
  assert.equal(put.status, 200, await put.text());
  const s = (await call('/status', { order_id: order.order_id })).body;
  assert.equal(s.driver_info.phone, '+1 809 555 1234');
  assert.equal(s.car_info.plate_number, 'A123456');
  assert.equal(s.price.amount, order.price.amount + 15);
  assert.equal(s.price.currency, order.price.currency);
  assert.equal(s.start_time, '2027-03-01T09:30:00-04:00');
});
