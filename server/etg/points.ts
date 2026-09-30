import { createRequire } from 'node:module';
import tzlookup from '@photostructure/tz-lookup';
import { etgConfig } from './config.ts';
import { EtgError as PointError } from './errors.ts';

const require = createRequire(import.meta.url);

/**
 * Aeropuertos del mundo (OpenFlights): IATA → [lat, lon, zona horaria, nombre,
 * país]. Hace falta aunque solo se cubra RD: los autotests de ETG buscan desde
 * Yakarta, Bali, Honolulu o Culiacán y exigen el desfase correcto de ese punto
 * de recogida aunque no haya ofertas.
 */
const AIRPORTS = require('./data/airports.json') as Record<string, [number, number, string | null, string, string]>;

/** La zona horaria de RD, la de toda la cobertura actual. */
export const COVERAGE_TZ = 'America/Santo_Domingo';

/**
 * Nombre con el que la tarifa de la web reconoce cada aeropuerto de RD: las
 * zonas se identifican por palabras ("puj", "las americas", "samana"…).
 */
const RD_AIRPORT_TEXT: Record<string, string> = {
  PUJ: 'Aeropuerto Internacional de Punta Cana (PUJ)',
  SDQ: 'Aeropuerto Internacional Las Americas (SDQ) Santo Domingo',
  STI: 'Aeropuerto Internacional del Cibao (STI) Santiago',
  POP: 'Aeropuerto Internacional Gregorio Luperon (POP) Puerto Plata',
  LRM: 'Aeropuerto Internacional La Romana (LRM) Casa de Campo',
  AZS: 'Aeropuerto Internacional Samana El Catey (AZS)',
  JBQ: 'Aeropuerto Internacional La Isabela (JBQ) Santo Domingo',
};

/**
 * Centros aproximados de las zonas de tarifa de la web (tabla `zones`). ETG a
 * menudo manda solo el nombre del hotel y las coordenadas: sin esto, un
 * "Hotel X" en Samaná no activaría el recargo de zona que sí cobra la web.
 * [lat, lon, radio km, palabra que la zona reconoce]
 */
const ZONE_CENTERS: [number, number, number, string][] = [
  [18.98, -69.04, 14, 'miches'],
  [18.37, -68.84, 9, 'bayahibe'],
  [18.43, -69.43, 9, 'juan dolio'],
  [19.28, -69.2, 7, 'las galeras'],
  [19.205, -69.336, 9, 'samana'],
  [19.315, -69.54, 9, 'las terrenas'],
  [18.56, -68.39, 13, 'punta cana'],
  [18.68, -68.45, 11, 'bavaro'],
  [18.21, -71.1, 16, 'barahona'],
  [18.805, -71.23, 16, 'san juan de la maguana'],
  [18.45, -71.6, 22, 'lago enriquillo'],
  [18.04, -71.74, 16, 'pedernales'],
  [18.49, -71.85, 10, 'jimani'],
  [17.9, -71.66, 10, 'cabo rojo'],
  [18.88, -71.7, 16, 'elias pina'],
  [19.64, -70.08, 10, 'rio san juan'],
  [19.79, -70.69, 13, 'puerto plata'],
  [19.76, -70.52, 6, 'sosua'],
  [19.75, -70.41, 6, 'cabarete'],
  [19.55, -71.71, 12, 'dajabon'],
  [18.42, -68.94, 12, 'la romana'],
  [18.615, -68.71, 10, 'higuey'],
  [18.8, -68.58, 9, 'uvero alto'],
  [19.06, -69.39, 10, 'sabana de la mar'],
  [18.48, -69.93, 16, 'santo domingo'],
];

export interface ResolvedPoint {
  kind: 'iata' | 'coordinates';
  iata?: string;
  lat: number;
  lon: number;
  tz: string;
  /** Texto para la tarifa: dirección o aeropuerto + palabras de su zona. */
  text: string;
  /** Lo que se muestra al equipo: la dirección tal cual o el aeropuerto. */
  label: string;
  isAirport: boolean;
  /** Dentro de lo que cubre Dominican Routes. */
  covered: boolean;
}



const inRange = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;

const safeTz = (lat: number, lon: number) => {
  try {
    return tzlookup(lat, lon);
  } catch {
    return 'UTC';
  }
};

function zoneWords(lat: number, lon: number): string {
  const words: string[] = [];
  for (const [zLat, zLon, r, word] of ZONE_CENTERS) {
    if (haversine(lat, lon, zLat, zLon) <= r) words.push(word);
  }
  return words.join(' ');
}

export function haversine(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Valida y resuelve un punto de ETG. Un punto mal formado es un error (500
 * con el campo exacto); un punto válido fuera de cobertura no: se marca
 * `covered: false` y la búsqueda responde sin ofertas.
 */
export function resolvePoint(raw: unknown, field: 'start_point' | 'end_point'): ResolvedPoint {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new PointError('INVALID_REQUEST', `${field} is required`);
  }
  const p = raw as Record<string, unknown>;
  const type = p.type;
  if (type == null || type === '') throw new PointError('INVALID_REQUEST', `${field}.type is required`);
  if (type !== 'iata' && type !== 'coordinates') {
    throw new PointError('INVALID_REQUEST', `${field}.type must be "iata" or "coordinates"`);
  }

  if (type === 'iata') {
    const iata = typeof p.iata === 'string' ? p.iata.trim().toUpperCase() : '';
    if (!iata) throw new PointError('INVALID_REQUEST', `${field}.iata is required`);
    if (!/^[A-Z0-9]{3}$/.test(iata)) throw new PointError('INVALID_REQUEST', `${field}.iata must be a 3-letter IATA code`);
    const a = AIRPORTS[iata];
    if (!a) {
      // Código con formato válido pero desconocido: sin cobertura, no error.
      return { kind: 'iata', iata, lat: 0, lon: 0, tz: 'UTC', text: iata, label: iata, isAirport: true, covered: false };
    }
    const [lat, lon, tzFromData, name] = a;
    const tz = tzFromData || safeTz(lat, lon);
    const covered = tz === COVERAGE_TZ && etgConfig().airports.includes(iata);
    const text = RD_AIRPORT_TEXT[iata] ?? `${name} (${iata})`;
    return { kind: 'iata', iata, lat, lon, tz, text: `${text} ${zoneWords(lat, lon)}`.trim(), label: `${name} (${iata})`, isAirport: true, covered };
  }

  const c = p.coordinates as Record<string, unknown> | undefined;
  if (c == null || typeof c !== 'object') throw new PointError('INVALID_REQUEST', `${field}.coordinates is required`);
  if (c.lat == null) throw new PointError('INVALID_REQUEST', `${field}.coordinates.lat is required`);
  if (c.lon == null) throw new PointError('INVALID_REQUEST', `${field}.coordinates.lon is required`);
  if (!inRange(c.lat, -90, 90)) throw new PointError('INVALID_REQUEST', `${field}.coordinates.lat must be a number between -90 and 90`);
  if (!inRange(c.lon, -180, 180)) throw new PointError('INVALID_REQUEST', `${field}.coordinates.lon must be a number between -180 and 180`);
  const lat = c.lat;
  const lon = c.lon;
  const address = typeof p.address === 'string' ? p.address : '';
  const tz = safeTz(lat, lon);
  return {
    kind: 'coordinates',
    lat,
    lon,
    tz,
    text: `${address} ${zoneWords(lat, lon)}`.trim(),
    label: address || `${lat}, ${lon}`,
    isAirport: false,
    covered: tz === COVERAGE_TZ,
  };
}
