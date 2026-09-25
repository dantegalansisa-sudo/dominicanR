import { Router } from 'express';
import { db, audit } from './db.ts';
import { buildCatalog } from './catalog.ts';
import { bookingStore } from './bookings.ts';
import { withTax, fmtUsd } from '../src/data/tax.ts';
import { handleContact, sendEmail, escapeHtml, BRAND, str } from '../api/_contact.ts';
import { roadDistanceKm } from '../api/_places.ts';
import { quote } from '../src/data/pricing.ts';
import type { PricingTables } from '../src/data/pricing.ts';

/**
 * Cobro de reservas con PayPal (Checkout, órdenes v2).
 *
 * El navegador nunca dice cuánto se cobra: el importe se recalcula aquí con
 * las tarifas, los kilómetros (pedidos a Google otra vez) y los extras de la
 * base, igual que la web lo muestra. La reserva se guarda antes de crear la
 * orden, así que si el visitante cierra PayPal a medias queda como pendiente
 * con sus datos de contacto; y solo pasa a pagada cuando PayPal confirma la
 * captura con el mismo importe.
 */

const cfg = () => ({
  clientId: process.env.PAYPAL_CLIENT_ID ?? '',
  secret: process.env.PAYPAL_CLIENT_SECRET ?? '',
  mode: process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox',
});
const apiBase = () =>
  cfg().mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
export const paypalEnabled = () => Boolean(cfg().clientId && cfg().secret);

/* ------------------------------------------------------------ PayPal API */

let token: { value: string; until: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && token.until > Date.now() + 30_000) return token.value;
  const { clientId, secret } = cfg();
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal no dio token: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: data.access_token, until: Date.now() + data.expires_in * 1000 };
  return token.value;
}

async function paypal(path: string, body?: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, data };
}

/* --------------------------------------------------- importe en el servidor */


interface Priced {
  /** Subtotal (lo que se paga en efectivo); online se le suma el impuesto. */
  amount: number;
  description: string;
  /** Si esta reserva admite pagarse en efectivo el día del servicio. */
  cashAllowed: boolean;
}

/**
 * Recalcula el total de un traslado o una excursión a partir de lo que el
 * formulario describe (lugares, vehículo, pasajeros, extras, entrada), con
 * los precios de la base. Devuelve null si no hay precio cerrado: entonces
 * no se puede pagar online y la web tampoco ofrece el botón.
 */
async function priceOf(kind: string, raw: unknown): Promise<Priced | null> {
  const b = (raw ?? {}) as Record<string, unknown>;
  const cat = buildCatalog();

  if (kind === 'traslado') {
    const origin = (b.origin ?? {}) as Record<string, unknown>;
    const destination = (b.destination ?? {}) as Record<string, unknown>;
    const vehicle = (b.vehicle ?? {}) as { slug?: string; name?: string };
    if (!vehicle.slug || !str(origin.text) || !str(destination.text)) return null;

    const km = await roadDistanceKm(origin, destination);
    const round = Boolean(b.round);
    const tables = cat.pricing as unknown as PricingTables;
    const q = quote(
      km == null ? null : round ? km * 2 : km,
      vehicle.slug,
      { text: str(origin.text), lat: num(origin.lat), lng: num(origin.lng) },
      { text: str(destination.text), lat: num(destination.lat), lng: num(destination.lng) },
      tables,
    );
    if (!q) return null;

    // Extras con los precios de la base, no con los que diga el navegador.
    const ex = (b.extras ?? {}) as {
      seats?: Record<string, number>;
      drinks?: Record<string, number>;
      stop?: string | null;
    };
    let extras = 0;
    for (const s of cat.extras.seats) extras += s.price * clampInt(ex.seats?.[s.id], 6);
    for (const d of cat.extras.drinks) extras += d.price * clampInt(ex.drinks?.[d.id], 40);
    const stop = cat.extras.stops.find((s) => s.id === ex.stop);
    if (stop) extras += stop.price;

    return {
      amount: money(q.total + extras),
      description: `Traslado ${str(origin.text)} → ${str(destination.text)} (${vehicle.name ?? vehicle.slug})`.slice(0, 127),
      cashAllowed: true,
    };
  }

  if (kind === 'excursion') {
    const exc = (b.excursion ?? {}) as { slug?: string | null };
    const e = cat.excursions.find((x) => x.slug === exc.slug);
    if (!e) return null;
    const party = (b.party ?? {}) as { adults?: number; children?: number };
    const adults = clampInt(party.adults, 50) || 1;
    const children = e.adultsOnly ? 0 : clampInt(party.children, 50);

    const sent = (b.ticket ?? null) as { index?: number; name?: string } | null;
    const ticketName = str(sent?.name);
    const tickets = (e.tickets ?? []) as { name: string; price: number }[];
    // Por posición: puede haber varias opciones con el mismo nombre y precio
    // distinto. Por nombre solo si no llega la posición (reservas antiguas).
    const idx = Number(sent?.index);
    const ticket =
      Number.isInteger(idx) && idx >= 0 && idx < tickets.length
        ? tickets[idx]!
        : (tickets.find((t) => t.name === ticketName) ?? null);
    // Sin opción elegida: el precio propio de la excursión, y si no tiene
    // (o es 0), la opción más barata. Igual que fromPrice() en la web.
    const own = e.price != null && e.price > 0 ? e.price : null;
    const adultUnit = ticket
      ? ticket.price
      : own != null
        ? own
        : tickets.length
          ? Math.min(...tickets.map((t) => t.price))
        : e.price;
    if (adultUnit == null) return null;
    if (children > 0 && e.childPrice == null) return null;

    return {
      amount: money(adultUnit * adults + (e.childPrice ?? 0) * children),
      description: `${e.name}${ticket ? ` · ${ticket.name}` : ''} · ${adults} adultos${children ? `, ${children} niños` : ''}`.slice(0, 127),
      cashAllowed: e.cashAllowed !== false,
    };
  }

  return null;
}

const money = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const clampInt = (v: unknown, max: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};

/* ------------------------------------------------------------- correos */

async function sendPaidEmails(booking: {
  id: number;
  name: string;
  email: string;
  lang: string;
  kind: string;
  message: string;
}, amount: number, captureId: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const to = process.env.CONTACT_TO || 'dominicanroutes@gmail.com';
  const from = process.env.CONTACT_FROM || 'Dominican Routes <onboarding@resend.dev>';
  const en = booking.lang === 'en';
  const first = escapeHtml(booking.name.split(' ')[0]!);

  await sendEmail({
    apiKey,
    from,
    to,
    replyTo: booking.email,
    subject: `PAGADA · ${fmtUsd(amount)} · reserva #${booking.id} — ${booking.name}`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:${BRAND.ink};max-width:560px">
        <h2 style="margin:0 0 4px">Pago recibido por PayPal</h2>
        <p style="margin:0 0 16px;color:${BRAND.soft}">Reserva #${booking.id} · ${escapeHtml(booking.name)} · ${escapeHtml(booking.email)}</p>
        <p style="margin:0 0 18px;padding:12px 16px;background:#e6f4ec;border-radius:12px;font-size:18px;font-weight:700">${fmtUsd(amount)} cobrados · captura ${escapeHtml(captureId)}</p>
        <p style="margin:0 0 6px;color:${BRAND.soft}">Lo que reservó</p>
        <p style="margin:0;padding:16px;background:${BRAND.cream};border-radius:12px;white-space:pre-wrap">${escapeHtml(booking.message)}</p>
      </div>`,
    text: [`Pago recibido por PayPal: ${fmtUsd(amount)} (captura ${captureId})`, `Reserva #${booking.id} · ${booking.name} · ${booking.email}`, '', booking.message].join('\n'),
  });

  await sendEmail({
    apiKey,
    from,
    to: booking.email,
    replyTo: to,
    subject: en ? `Payment received — Dominican Routes booking #${booking.id}` : `Pago recibido — reserva #${booking.id} Dominican Routes`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:${BRAND.ink};max-width:560px">
        <h2 style="margin:0 0 6px">${en ? `Thank you, ${first}` : `Gracias, ${first}`}</h2>
        <p style="margin:0 0 18px;padding:12px 16px;background:#e6f4ec;border-radius:12px;font-weight:600">
          ${en ? `We received your payment of ${fmtUsd(amount)} via PayPal. Your booking #${booking.id} is confirmed.` : `Recibimos tu pago de ${fmtUsd(amount)} por PayPal. Tu reserva #${booking.id} queda confirmada.`}
        </p>
        <p style="margin:0 0 8px;color:${BRAND.soft}">${en ? 'Booking details' : 'Detalle de la reserva'}</p>
        <p style="margin:0 0 22px;padding:16px;background:${BRAND.cream};border-radius:12px;white-space:pre-wrap">${escapeHtml(booking.message)}</p>
        <p style="margin:0 0 24px;font-size:15px">${en ? 'Questions? Reply to this email or call' : '¿Dudas? Responde a este correo o llama al'} +1 (829) 219-1573</p>
        <p style="margin:0;padding-top:18px;border-top:1px solid #E2DACD;font-size:13px;color:${BRAND.soft}">Dominican Routes · Punta Cana, La Altagracia${en ? ', Dominican Republic' : ', República Dominicana'}</p>
      </div>`,
    text: [
      en ? `Thank you, ${booking.name.split(' ')[0]}` : `Gracias, ${booking.name.split(' ')[0]}`,
      '',
      en
        ? `We received your payment of ${fmtUsd(amount)} via PayPal. Your booking #${booking.id} is confirmed.`
        : `Recibimos tu pago de ${fmtUsd(amount)} por PayPal. Tu reserva #${booking.id} queda confirmada.`,
      '',
      booking.message,
    ].join('\n'),
  });
  return true;
}

/* --------------------------------------------------------------- rutas */

export const payRouter = Router();

/** Lo único que el navegador necesita saber: el client id (público) y el modo. */
payRouter.get('/config', (_req, res) => {
  if (!paypalEnabled()) {
    res.json({ ok: true, enabled: false });
    return;
  }
  res.json({ ok: true, enabled: true, clientId: cfg().clientId, mode: cfg().mode, currency: 'USD' });
});

/**
 * Crea la orden. Recibe lo mismo que /api/contact; guarda la reserva (con el
 * importe calculado aquí, sin correo todavía) y devuelve el id de la orden
 * para que el botón de PayPal siga.
 */
payRouter.post('/create', async (req, res) => {
  if (!paypalEnabled()) {
    res.status(503).json({ ok: false, error: 'El pago online no está disponible ahora mismo.' });
    return;
  }
  const data = (req.body ?? {}) as Record<string, unknown>;
  const kind = str(data.topic) === 'Excursión' ? 'excursion' : str(data.topic) === 'Traslado' ? 'traslado' : '';

  let priced: Priced | null = null;
  try {
    priced = await priceOf(kind, data.booking);
  } catch (err) {
    console.error('No se pudo calcular el importe:', err);
  }
  if (!priced || priced.amount <= 0) {
    res.status(400).json({ ok: false, error: 'Esta reserva no tiene precio cerrado; te la cotizamos por correo.' });
    return;
  }
  // Online se cobra con el impuesto; en efectivo (/cash) no.
  const total = withTax(priced.amount).total;

  // La reserva se registra ya (con el importe calculado aquí) pero sin
  // correos: abrir el formulario de PayPal no es pagar. Los avisos salen en
  // /capture cuando el cobro se completa; si el visitante lo deja a medias,
  // la reserva queda en el panel como pendiente sin correo. Si ya lo intentó
  // (cerró PayPal y vuelve), handleContact reutiliza su reserva por bookingId.
  const saved = await handleContact(
    data,
    bookingStore,
    { status: 'pendiente', amount: total, method: 'paypal' },
    { saveOnly: true },
  );
  if (!saved.body.ok || saved.body.bookingId == null) {
    res.status(saved.status === 200 ? 500 : saved.status).json({
      ok: false,
      error: saved.body.error ?? 'No se pudo registrar la reserva.',
    });
    return;
  }
  const bookingId = saved.body.bookingId;

  try {
    const { status, data: order } = await paypal('/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: String(bookingId),
          custom_id: String(bookingId),
          description: priced.description,
          amount: { currency_code: 'USD', value: total.toFixed(2) },
        },
      ],
      application_context: { shipping_preference: 'NO_SHIPPING', brand_name: 'Dominican Routes' },
    });
    const orderId = str(order.id);
    if (status >= 300 || !orderId) {
      console.error('PayPal no creó la orden:', status, order);
      res.status(502).json({ ok: false, error: 'PayPal no respondió. Tu reserva quedó registrada; puedes intentarlo de nuevo.', bookingId });
      return;
    }
    db.prepare('UPDATE bookings SET paypal_order_id = ?, amount = ? WHERE id = ?').run(orderId, total, bookingId);
    res.json({ ok: true, orderID: orderId, bookingId, amount: total });
  } catch (err) {
    console.error('Error creando la orden de PayPal:', err);
    res.status(502).json({ ok: false, error: 'PayPal no respondió. Tu reserva quedó registrada; puedes intentarlo de nuevo.', bookingId });
  }
});

/**
 * Reserva con pago en efectivo el día del servicio. El importe se calcula
 * igual que para PayPal y queda anotado; el operador la marca como pagada
 * desde el panel cuando cobra. Las excursiones que no lo admiten se rechazan
 * aquí aunque el navegador lo pidiera.
 */
payRouter.post('/cash', async (req, res) => {
  const data = (req.body ?? {}) as Record<string, unknown>;
  const kind = str(data.topic) === 'Excursión' ? 'excursion' : str(data.topic) === 'Traslado' ? 'traslado' : '';
  let priced: Priced | null = null;
  try {
    priced = await priceOf(kind, data.booking);
  } catch (err) {
    console.error('No se pudo calcular el importe:', err);
  }
  if (!priced || priced.amount <= 0) {
    res.status(400).json({ ok: false, error: 'Esta reserva no tiene precio cerrado; te la cotizamos por correo.' });
    return;
  }
  if (!priced.cashAllowed) {
    res.status(400).json({ ok: false, error: 'Esta excursión solo se puede pagar por adelantado.' });
    return;
  }
  // Con bookingId de un intento anterior, handleContact reutiliza la reserva
  // (y manda el correo, que en el intento con PayPal no salió).
  const saved = await handleContact(data, bookingStore, { status: 'pendiente', amount: priced.amount, method: 'efectivo' });
  if (!saved.body.ok) {
    res.status(saved.status).json({ ok: false, error: saved.body.error ?? 'No se pudo registrar la reserva.' });
    return;
  }
  res.json({ ok: true, bookingId: saved.body.bookingId ?? null, amount: priced.amount });
});

/**
 * Captura el pago de una orden aprobada y lo comprueba contra PayPal: estado
 * COMPLETED, moneda USD y el mismo importe que se guardó. Solo entonces la
 * reserva pasa a pagada.
 */
payRouter.post('/capture', async (req, res) => {
  const orderId = str((req.body ?? {}).orderID);
  const booking = orderId
    ? (db.prepare('SELECT * FROM bookings WHERE paypal_order_id = ?').get(orderId) as
        | { id: number; name: string; email: string; lang: string; kind: string; message: string; amount: number; payment_status: string; paid_amount: number | null; paypal_capture_id: string | null }
        | undefined)
    : undefined;
  if (!booking) {
    res.status(404).json({ ok: false, error: 'No encontramos esa reserva.' });
    return;
  }
  if (booking.payment_status === 'pagada') {
    res.json({ ok: true, paid: true, amount: booking.paid_amount, bookingId: booking.id, already: true });
    return;
  }

  let status = 0;
  let order: Record<string, unknown> = {};
  try {
    ({ status, data: order } = await paypal(`/v2/checkout/orders/${orderId}/capture`));
  } catch (err) {
    console.error('Error capturando en PayPal:', err);
    res.status(502).json({ ok: false, error: 'PayPal no respondió. Si el cargo aparece en tu cuenta, escríbenos.', bookingId: booking.id });
    return;
  }

  // Lo que PayPal dice que cobró, leído de su respuesta y no de la nuestra.
  const units = (order.purchase_units as { payments?: { captures?: { id?: string; status?: string; amount?: { value?: string; currency_code?: string } }[] } }[] | undefined) ?? [];
  const capture = units[0]?.payments?.captures?.[0];
  const captured = Number(capture?.amount?.value);
  const okStatus = order.status === 'COMPLETED' && capture?.status === 'COMPLETED';
  const okAmount = capture?.amount?.currency_code === 'USD' && Math.abs(captured - booking.amount) < 0.01;

  if (status >= 300 || !okStatus || !okAmount || !capture?.id) {
    const reason = String((order.details as { issue?: string }[] | undefined)?.[0]?.issue ?? order.status ?? status);
    console.warn('Captura no válida para la reserva', booking.id, reason, order);
    // Fallida solo si PayPal la rechazó de verdad; si aún no está aprobada,
    // sigue pendiente y el visitante puede volver a intentarlo.
    if (reason !== 'ORDER_NOT_APPROVED') {
      db.prepare("UPDATE bookings SET payment_status = 'fallida' WHERE id = ?").run(booking.id);
    }
    res.status(402).json({ ok: false, error: 'El pago no se completó. Tu reserva sigue registrada como pendiente.', bookingId: booking.id, reason });
    return;
  }

  db.prepare(
    "UPDATE bookings SET payment_status = 'pagada', paid_amount = ?, paid_at = datetime('now'), paypal_capture_id = ?, status = CASE WHEN status = 'nueva' THEN 'confirmada' ELSE status END WHERE id = ?",
  ).run(captured, capture.id, booking.id);
  audit('paypal', 'pago recibido', `reserva:${booking.id}`, { amount: captured, capture: capture.id });

  // El correo de esta reserva es el de pago; se anota aquí, no en /create.
  sendPaidEmails(booking, captured, capture.id)
    .then((sent) => bookingStore.markEmail(booking.id, sent, sent ? undefined : 'Sin RESEND_API_KEY'))
    .catch((err) => {
      console.error('Correo de pago no enviado:', err);
      bookingStore.markEmail(booking.id, false, String(err));
    });
  res.json({ ok: true, paid: true, amount: captured, bookingId: booking.id });
});
