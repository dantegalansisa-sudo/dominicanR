import { db } from './db.ts';
import type { BookingStore, NewBooking } from '../api/_contact.ts';

/**
 * Guarda cada solicitud en la tabla `bookings` antes de que salga el correo.
 * El correo sigue siendo como trabaja el cliente; esto es el respaldo: si
 * Resend falla o la key no está, la reserva queda aquí en vez de perderse.
 */
export const bookingStore: BookingStore = {
  save(b: NewBooking) {
    const r = db
      .prepare(
        `INSERT INTO bookings (kind, name, email, phone, lang, date, message, payload, payment_status, amount, paypal_order_id, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        b.kind,
        b.name,
        b.email,
        b.phone,
        b.lang,
        b.date,
        b.message,
        b.payload === undefined ? null : JSON.stringify(b.payload),
        b.payment?.status ?? 'pendiente',
        b.payment?.amount ?? null,
        b.payment?.orderId ?? null,
        b.payment?.method ?? null,
      );
    return Number(r.lastInsertRowid);
  },
  reuse(id: number, b: NewBooking) {
    const prev = db
      .prepare('SELECT id, email, payment_status, email_sent FROM bookings WHERE id = ?')
      .get(id) as { id: number; email: string; payment_status: string; email_sent: number } | undefined;
    if (!prev || prev.email !== b.email || prev.payment_status === 'pagada') return null;
    db.prepare(
      `UPDATE bookings SET name = ?, phone = ?, lang = ?, date = ?, message = ?, payload = ?,
         payment_status = ?, amount = COALESCE(?, amount), payment_method = ?
       WHERE id = ?`,
    ).run(
      b.name,
      b.phone,
      b.lang,
      b.date,
      b.message,
      b.payload === undefined ? null : JSON.stringify(b.payload),
      b.payment?.status ?? 'pendiente',
      b.payment?.amount ?? null,
      b.payment?.method ?? null,
      id,
    );
    return { id: prev.id, emailSent: prev.email_sent === 1 };
  },
  markEmail(id: number, sent: boolean, error?: string) {
    db.prepare('UPDATE bookings SET email_sent = ?, email_error = ? WHERE id = ?').run(
      sent ? 1 : 0,
      error ?? null,
      id,
    );
  },
};
