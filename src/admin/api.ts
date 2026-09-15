/**
 * Cliente de /api/admin. La sesión va en una cookie, así que aquí solo hay
 * que mandar JSON y traducir los fallos a un error con mensaje legible.
 */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const BASE = '/api/admin';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) {
    throw new ApiError(res.status, data.error || `Error ${res.status}`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
  /** Sube una imagen; el servidor la recorta y la convierte a webp. */
  upload: (file: File, opts: { ratio: 'excursion' | 'fleet'; slug?: string }) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('ratio', opts.ratio);
    if (opts.slug) fd.append('slug', opts.slug);
    return request<{ ok: true; path: string }>('POST', '/upload', fd);
  },
};

/* --------------------------------------------------------- formas de datos */

export interface ExcursionRow {
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
  includes: string;
  activities: string;
  departures: string;
  tickets: string;
  featured: number;
  position: number;
  visible: number;
  name_en: string | null;
  duration_en: string | null;
  description_en: string | null;
  includes_en: string | null;
  activities_en: string | null;
  tickets_en: string | null;
}

export interface PhotoRow {
  id: number;
  slug: string;
  path: string;
}

export interface VehicleRow {
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
  position: number;
  visible: number;
  name_en: string | null;
  type_en: string | null;
  summary_en: string | null;
  features_en: string | null;
}

export interface BracketRow {
  id?: number;
  up_to: number | null;
  sedan: number;
  minivan: number;
  minibus: number;
  vip: number;
  /** JSON {slug: importe}; manda sobre las cuatro columnas de arriba. */
  prices: string | null;
}

export interface SurchargeRow {
  id?: number;
  label: string;
  zones_a: string;
  zones_b: string;
  sedan: number;
  minivan: number;
  minibus: number;
  vip: number;
  prices: string | null;
}

export interface RouteRow {
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
  position: number;
  visible: number;
}

export interface ZoneRow {
  id: string;
  label: string;
  needles: string;
}

export interface ExtraRow {
  id: string;
  kind: 'seat' | 'drink' | 'stop';
  label: string;
  price: number;
  minutes: number | null;
  position: number;
  visible: number;
}

export interface BookingRow {
  id: number;
  created_at: string;
  kind: 'traslado' | 'excursion' | 'contacto';
  name: string;
  email: string;
  phone: string;
  lang: 'es' | 'en';
  date: string;
  message: string;
  payload: string | null;
  status: 'nueva' | 'contestada' | 'confirmada' | 'cancelada';
  notes: string;
  email_sent: number | null;
  email_error: string | null;
}

export interface AuditRow {
  id: number;
  at: string;
  who: string;
  action: string;
  target: string;
}

/** JSON de una columna, o un valor por defecto si viene roto. */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
