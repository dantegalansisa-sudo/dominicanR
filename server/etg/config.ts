import { setting } from '../db.ts';

/**
 * Configuración de la integración con ETG. Cada valor sale, por orden, de la
 * variable de entorno, de Ajustes (tabla settings, clave `etg_*`, editable en
 * el panel) y, si no hay nada, del valor por defecto del informe (sección 15).
 * Las decisiones están explicadas en docs/etg/DECISIONES.md.
 */

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) ? n : fallback;
};

const get = (key: string, env: string, fallback: string) =>
  process.env[env] ?? setting(`etg_${key}`, fallback);

export type FlightTracking = 'full' | 'partial' | 'none';

export interface EtgConfig {
  /** Moneda del contrato (ISO 4217). Nunca cambia entre métodos. */
  currency: string;
  /** Ajuste sobre el precio de la web, en %. 0 = mismo precio. */
  markupPercent: number;
  /** Horas mínimas entre la búsqueda y la recogida. */
  minAdvanceHours: number;
  /** Cancelación gratis hasta estas horas antes de la recogida. */
  freeCancelHours: number;
  /** Penalidad fuera de plazo, en % del precio (máximo 100). */
  latePenaltyPercent: number;
  waitAirport: number;
  waitOther: number;
  /** Vida de una oferta desde la búsqueda (mínimo 24 h por contrato). */
  offerTtlHours: number;
  flightTracking: FlightTracking;
  bufferMinutes: number;
  tollsIncluded: boolean;
  gratuityIncluded: boolean;
  /** Aeropuertos con servicio (IATA). */
  airports: string[];
  meetingInstructions: string;
  meetingImages: string[];
  /** Distancia en carretera ≈ línea recta × factor. */
  roadFactor: number;
  avgSpeedKmh: number;
  /** Base pública para el enlace de cada orden (supplier_link). */
  publicUrl: string;
  /** Guardar el cuerpo completo de /search en los logs (pesa mucho). */
  logSearchBodies: boolean;
}

let cached: { at: number; value: EtgConfig } | null = null;

/** Se relee cada 30 s: cambiar un ajuste en el panel no exige reiniciar. */
export function etgConfig(): EtgConfig {
  if (cached && Date.now() - cached.at < 30_000) return cached.value;
  const value: EtgConfig = {
    currency: get('currency', 'ETG_CURRENCY', 'USD').toUpperCase(),
    markupPercent: num(get('markup_percent', 'ETG_PRICE_MARKUP_PERCENT', '0'), 0),
    minAdvanceHours: num(get('min_advance_hours', 'ETG_MIN_ADVANCE_HOURS', '12'), 12),
    freeCancelHours: num(get('free_cancel_hours', 'ETG_FREE_CANCEL_HOURS', '24'), 24),
    latePenaltyPercent: Math.min(100, Math.max(0, num(get('late_penalty_percent', 'ETG_LATE_PENALTY_PERCENT', '100'), 100))),
    waitAirport: num(get('wait_airport', 'ETG_WAIT_AIRPORT_MIN', '60'), 60),
    waitOther: num(get('wait_other', 'ETG_WAIT_OTHER_MIN', '15'), 15),
    offerTtlHours: Math.max(24, num(get('offer_ttl_hours', 'ETG_OFFER_TTL_HOURS', '26'), 26)),
    flightTracking: (get('flight_tracking', 'ETG_FLIGHT_TRACKING', 'full') as FlightTracking) || 'full',
    bufferMinutes: num(get('buffer_minutes', 'ETG_BUFFER_MINUTES', '0'), 0),
    tollsIncluded: get('tolls_included', 'ETG_TOLLS_INCLUDED', '1') !== '0',
    gratuityIncluded: get('gratuity_included', 'ETG_GRATUITY_INCLUDED', '0') === '1',
    airports: get('airports', 'ETG_AIRPORTS', 'PUJ,SDQ,STI,POP,LRM,AZS,JBQ')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
    meetingInstructions: get(
      'meeting_instructions',
      'ETG_MEETING_INSTRUCTIONS',
      "Meeting point is at the arrival hall after baggage claim and customs. The driver will hold a sign with the passenger's name.",
    ),
    meetingImages: get('meeting_images', 'ETG_MEETING_IMAGES', '')
      .split(/\s*[,\n]\s*/)
      .filter((u) => /^https?:\/\//.test(u)),
    roadFactor: num(get('road_factor', 'ETG_ROAD_FACTOR', '1.3'), 1.3),
    avgSpeedKmh: num(get('avg_speed_kmh', 'ETG_AVG_SPEED_KMH', '50'), 50),
    publicUrl: (process.env.ETG_PUBLIC_URL ?? setting('etg_public_url', 'https://dominicanroutes.com')).replace(/\/+$/, ''),
    logSearchBodies: get('log_search_bodies', 'ETG_LOG_SEARCH_BODIES', '0') === '1',
  };
  cached = { at: Date.now(), value };
  return value;
}

export const resetEtgConfigCache = () => {
  cached = null;
};

/**
 * Credenciales de Basic Auth para la API. Solo por entorno (nunca en la base
 * ni en el panel), distintas en staging y en producción. Sin ellas la API no
 * responde: así, desplegar este código no abre nada por sí solo.
 */
export function apiCredentials(): { user: string; password: string } | null {
  const user = process.env.ETG_API_USER;
  const password = process.env.ETG_API_PASSWORD;
  if (!user || !password) return null;
  return { user, password };
}

/** "staging" o "production", para los logs y el panel. */
export const etgEnv = () => process.env.ETG_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development');
