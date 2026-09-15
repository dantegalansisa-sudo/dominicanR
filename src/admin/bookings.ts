import { parseJson } from './api';
import type { BookingRow } from './api';
import { placeMapsUrl } from '../data/places';
import type { PlaceValue } from '../data/places';

/**
 * Lectura del `payload` de una reserva. Lo manda el formulario tal cual, así
 * que aquí se le da forma con cuidado: cualquier campo puede faltar.
 */

export interface TransferPayload {
  origin?: PlaceValue;
  destination?: PlaceValue;
  date?: string;
  time?: string;
  flight?: string;
  round?: boolean;
  returnDate?: string;
  returnTime?: string;
  party?: { adults: number; children: number; infants: number };
  vehicle?: { slug: string; name: string; chosen: boolean } | null;
  km?: number | null;
  billableKm?: number | null;
  quote?: { base: number; total: number; surcharge: { label: string; amount: number } | null; route?: string } | null;
  extras?: { seats: Record<string, number>; drinks: Record<string, number>; stop: string | null };
  extrasTotal?: number;
  notes?: string;
}

export interface ExcursionPayload {
  excursion?: { slug: string | null; name: string };
  date?: string;
  departure?: string;
  ticket?: { name: string; price: number } | null;
  pickup?: PlaceValue;
  room?: string;
  party?: { adults: number; children: number; infants: number };
  adultsOnly?: boolean;
  adultPrice?: number | null;
  childPrice?: number | null;
  estimate?: number | null;
  notes?: string;
}

export const STATUS_LABEL: Record<BookingRow['status'], string> = {
  nueva: 'Nueva',
  contestada: 'Contestada',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};

export const KIND_LABEL: Record<BookingRow['kind'], string> = {
  traslado: 'Traslado',
  excursion: 'Excursión',
  contacto: 'Contacto',
};

export const payloadOf = (b: BookingRow) => parseJson<Record<string, unknown>>(b.payload, {});

/** Una línea que diga de qué va: la ruta, la excursión o el asunto. */
export function bookingSummary(b: BookingRow): string {
  const p = payloadOf(b);
  if (b.kind === 'traslado') {
    const t = p as TransferPayload;
    const o = t.origin?.text || '—';
    const d = t.destination?.text || '—';
    return `${o} → ${d}${t.round ? ' (ida y vuelta)' : ''}`;
  }
  if (b.kind === 'excursion') {
    const e = p as ExcursionPayload;
    return e.excursion?.name || '—';
  }
  return b.message.length > 70 ? `${b.message.slice(0, 70)}…` : b.message;
}

/** El importe que la web calculó, si lo hubo. */
export function bookingPrice(b: BookingRow): number | null {
  const p = payloadOf(b);
  if (b.kind === 'traslado') {
    const t = p as TransferPayload;
    if (!t.quote) return null;
    return t.quote.total + (t.extrasTotal ?? 0);
  }
  if (b.kind === 'excursion') {
    const e = p as ExcursionPayload;
    if (typeof e.estimate === 'number') return e.estimate;
    if (!e.ticket) return null;
    const n = (e.party?.adults ?? 0) + (e.party?.children ?? 0);
    return e.ticket.price * (n || 1);
  }
  return null;
}

/** Enlace a Google Maps del punto, si el visitante lo eligió en la lista. */
export const mapsOf = (p?: PlaceValue) => (p ? placeMapsUrl(p) : null);

export const partyText = (p?: { adults: number; children: number; infants: number }) =>
  p ? `${p.adults} adultos · ${p.children} niños · ${p.infants} infantes` : '—';
