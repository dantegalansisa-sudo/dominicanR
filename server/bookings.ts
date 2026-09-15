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
        `INSERT INTO bookings (kind, name, email, phone, lang, date, message, payload, payment_status, amount, paypal_order_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      );
    return Number(r.lastInsertRowid);
  },
  markEmail(id: number, sent: boolean, error?: string) {
    db.prepare('UPDATE bookings SET email_sent = ?, email_error = ? WHERE id = ?').run(
      sent ? 1 : 0,
      error ?? null,
      id,
    );
  },
};
