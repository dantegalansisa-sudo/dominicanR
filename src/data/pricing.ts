/**
 * Tarifas de traslado: precio base por tramo de distancia y recargo por ruta.
 *
 * Portado del código que el cliente ya usa en su web. Se mantiene la lógica de
 * negocio —los tramos, los importes y los 19 recargos— y se corrigen cuatro
 * cosas que allí fallan; van señaladas una a una más abajo.
 */

/** Los cuatro con tarifa cerrada. El resto se cotiza a mano. */
export type PriceKey = 'sedan' | 'minivan' | 'minibus' | 'vip';

export type Prices = Record<PriceKey, number>;

/** Del slug de nuestra flota a la columna de la tabla. */
export const PRICE_KEY_BY_SLUG: Record<string, PriceKey> = {
  sedan: 'sedan',
  minivan: 'minivan',
  minibus: 'minibus',
  'vip-luxury': 'vip',
};

const p = (sedan: number, minivan: number, minibus: number, vip: number): Prices => ({
  sedan,
  minivan,
  minibus,
  vip,
});

/**
 * Tramos por kilómetros de carretera, en orden. `upTo` es el límite superior
 * inclusive; el último es abierto.
 *
 * CORRECCIÓN 1: en el original, por encima de 520 km los precios BAJABAN
 * (Sedán 300 frente a los 350 del tramo anterior), así que un viaje más largo
 * salía más barato. Aquí el último tramo queda abierto manteniendo la tarifa
 * más alta. En la práctica casi no se alcanza: el trayecto más largo del país
 * ronda los 500 km.
 */
export const BRACKETS: { upTo: number; prices: Prices }[] = [
  { upTo: 20, prices: p(25, 30, 50, 60) },
  { upTo: 32, prices: p(30, 35, 60, 70) },
  { upTo: 37, prices: p(40, 50, 70, 80) },
  { upTo: 45, prices: p(50, 60, 80, 85) },
  { upTo: 55, prices: p(60, 80, 110, 120) },
  { upTo: 80, prices: p(75, 90, 120, 160) },
  { upTo: 105, prices: p(100, 120, 150, 180) },
  { upTo: 135, prices: p(110, 120, 170, 260) },
  { upTo: 172, prices: p(110, 140, 180, 350) },
  { upTo: 210, prices: p(130, 160, 200, 380) },
  { upTo: 250, prices: p(180, 210, 280, 450) },
  { upTo: 290, prices: p(250, 280, 350, 500) },
  { upTo: 330, prices: p(270, 290, 360, 550) },
  { upTo: 380, prices: p(280, 300, 360, 550) },
  { upTo: 430, prices: p(290, 320, 380, 650) },
  { upTo: 460, prices: p(330, 370, 450, 800) },
  { upTo: Infinity, prices: p(350, 390, 490, 900) },
];

/** Sin acentos y en minúsculas, que es como se comparan los nombres de sitio. */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Cada zona con las formas en que puede aparecer escrita.
 *
 * CORRECCIÓN 2: el original repetía la misma cadena dos veces en nueve zonas
 * ('samana' || 'samana'). Eran restos de cuando se comparaba con acento, antes
 * de normalizar; una vez sin acentos las dos ramas son idénticas.
 */
export const ZONES: Record<string, string[]> = {
  miches: ['miches', 'michez', 'el seibo', 'el seybo'],
  bayahibe: ['bayahibe', 'bayaibe', 'bayajibe', 'dominicus'],
  juanDolio: ['juan dolio', 'juandolio', 'guayacanes'],
  lasGaleras: ['las galeras', 'galeras', 'playa rincon'],
  samana: ['samana', 'santa barbara de samana'],
  lasTerrenas: ['las terrenas', 'terrenas', 'playa bonita'],
  puj: [
    'puj',
    'punta cana',
    'aeropuerto punta cana',
    'punta cana airport',
    'punta cana international',
    'aeropuerto internacional punta cana',
  ],
  bavaro: ['bavaro', 'los corales', 'cortecito'],
  barahona: ['barahona', 'santa cruz de barahona'],
  sanJuan: ['san juan de la maguana', 'san juan maguana'],
  lagoEnriquillo: ['lago enriquillo', 'enriquillo', 'isla cabritos'],
  pedernales: ['pedernales', 'bahia de las aguilas'],
  jimani: ['jimani'],
  caboRojo: ['cabo rojo', 'caborojo'],
  eliasPina: ['elias pina', 'comendador'],
  sdq: [
    'sdq',
    'aeropuerto santo domingo',
    'las americas',
    'santo domingo airport',
    'aeropuerto las americas',
    'aeropuerto internacional de las americas',
  ],
  rioSanJuan: ['rio san juan', 'laguna gri gri'],
  puertoPlata: ['puerto plata', 'playa dorada', 'costa dorada'],
  sosua: ['sosua', 'playa sosua'],
  cabarete: ['cabarete', 'kite beach'],
  dajabon: ['dajabon', 'frontera haiti'],
  laRomana: ['la romana', 'laromana', 'casa de campo'],
  higuey: ['higuey', 'basilica higuey'],
  uveroAlto: ['uvero alto', 'uvero-alto'],
  sabana: ['sabana de la mar', 'sabana del mar', 'sabanadelamar', 'cano hondo'],
  santoDomingo: ['santo domingo', 'zona colonial', 'gazcue', 'naco', 'piantini'],
};

/**
 * CORRECCIÓN 3: el original daba por buena la coincidencia de 'san juan' a
 * secas, así que "Río San Juan" —costa norte— se detectaba como San Juan de la
 * Maguana, en el suroeste, y un PUJ → Río San Juan cobraba el recargo del
 * suroeste. Ahora San Juan de la Maguana solo coincide con su nombre completo.
 *
 * Aparte, hay zonas que se solapan a propósito y el orden decide: el aeropuerto
 * de Santo Domingo también contiene "las americas", y Comendador pertenece a
 * Elías Piña aunque el original lo listaba además en Jimaní.
 */
function inZone(text: string, zone: string): boolean {
  // Santo Domingo ciudad no es el aeropuerto: si es SDQ, no cuenta como ciudad.
  if (zone === 'santoDomingo' && inZone(text, 'sdq')) return false;
  return ZONES[zone]!.some((needle) => text.includes(needle));
}

const inAny = (text: string, zones: string[]) => zones.some((z) => inZone(text, z));

const ZONA_ESTE = ['puj', 'bavaro', 'bayahibe', 'juanDolio', 'laRomana', 'higuey'];
const ZONA_PUNTA_CANA = ['puj', 'bavaro', 'bayahibe'];
const SUROESTE = ['barahona', 'sanJuan', 'lagoEnriquillo', 'pedernales', 'jimani'];
const SUROESTE_COMPLETO = [...SUROESTE, 'caboRojo', 'eliasPina'];
const ZONA_NORTE = [
  'puertoPlata',
  'sosua',
  'cabarete',
  'dajabon',
  'samana',
  'lasTerrenas',
  'lasGaleras',
  'rioSanJuan',
];
const CAPITAL = ['sdq', 'santoDomingo'];

interface Rule {
  /** Para poder explicar en el correo por qué se aplicó. */
  label: string;
  a: string[];
  b: string[];
  add: Prices;
}

/**
 * Recargos por ruta, en el mismo orden que en el original: gana el primero que
 * coincide. Todos valen en los dos sentidos.
 */
export const RULES: Rule[] = [
  { label: 'Miches ↔ Bayahíbe/Juan Dolio', a: ['miches'], b: ['bayahibe', 'juanDolio'], add: p(40, 50, 80, 100) },
  { label: 'Zona Este ↔ Cabo Rojo/Pedernales', a: ZONA_ESTE, b: ['caboRojo', 'pedernales'], add: p(60, 60, 80, 100) },
  { label: 'Miches ↔ Samaná', a: ['miches'], b: ['lasGaleras', 'samana', 'lasTerrenas'], add: p(50, 50, 70, 80) },
  { label: 'Punta Cana ↔ Suroeste', a: ZONA_PUNTA_CANA, b: SUROESTE, add: p(60, 60, 80, 100) },
  { label: 'Norte ↔ Suroeste', a: ZONA_NORTE, b: SUROESTE_COMPLETO, add: p(100, 100, 120, 150) },
  { label: 'PUJ ↔ Miches', a: ['puj'], b: ['miches'], add: p(20, 20, 40, 50) },
  { label: 'Bávaro ↔ Miches', a: ['bavaro'], b: ['miches'], add: p(25, 30, 40, 50) },
  { label: 'Uvero Alto ↔ Miches', a: ['uveroAlto'], b: ['miches'], add: p(25, 30, 40, 50) },
  { label: 'PUJ ↔ Sabana de la Mar', a: ['puj'], b: ['sabana'], add: p(40, 40, 60, 80) },
  { label: 'Bávaro ↔ Sabana de la Mar', a: ['bavaro'], b: ['sabana'], add: p(40, 40, 60, 80) },
  { label: 'Santo Domingo ↔ Las Terrenas', a: CAPITAL, b: ['lasTerrenas'], add: p(30, 20, 40, 50) },
  { label: 'Santo Domingo ↔ Samaná', a: CAPITAL, b: ['samana'], add: p(30, 20, 40, 50) },
  { label: 'Santo Domingo ↔ Las Galeras', a: CAPITAL, b: ['lasGaleras'], add: p(30, 20, 50, 70) },
  { label: 'Santo Domingo ↔ Miches', a: CAPITAL, b: ['miches'], add: p(40, 40, 70, 90) },
  { label: 'Santo Domingo ↔ Sabana de la Mar', a: CAPITAL, b: ['sabana'], add: p(30, 40, 60, 80) },
  { label: 'Santo Domingo ↔ Cabo Rojo', a: CAPITAL, b: ['caboRojo'], add: p(20, 30, 50, 70) },
  { label: 'Santo Domingo ↔ Pedernales', a: CAPITAL, b: ['pedernales'], add: p(20, 30, 50, 70) },
  { label: 'Santo Domingo ↔ Barahona', a: CAPITAL, b: ['barahona'], add: p(30, 40, 60, 80) },
  { label: 'Santo Domingo ↔ Río San Juan', a: CAPITAL, b: ['rioSanJuan'], add: p(40, 40, 80, 80) },
];

export interface Surcharge {
  label: string;
  amount: number;
}

/** El recargo que corresponde a una ruta, o null si no hay ninguno. */
export function routeSurcharge(
  origin: string,
  destination: string,
  key: PriceKey,
): Surcharge | null {
  const o = fold(origin);
  const d = fold(destination);
  for (const rule of RULES) {
    const hit =
      (inAny(o, rule.a) && inAny(d, rule.b)) || (inAny(d, rule.a) && inAny(o, rule.b));
    if (hit) return { label: rule.label, amount: rule.add[key] };
  }
  return null;
}

export function bracketFor(km: number): Prices {
  return BRACKETS.find((b) => km <= b.upTo)!.prices;
}

export interface Quote {
  base: number;
  surcharge: Surcharge | null;
  total: number;
}

/**
 * Precio de un traslado. Devuelve null cuando el vehículo no tiene tarifa
 * cerrada —bus, autobús, limusina y van adaptada se cotizan a mano— o cuando
 * todavía no sabemos los kilómetros.
 *
 * CORRECCIÓN 4: en el original los importes se buscaban por el nombre visible
 * del vehículo ('Sedan', 'Minivan'). Los nuestros llevan tilde, así que esa
 * búsqueda habría devuelto 0 sin avisar y el recargo habría desaparecido. Aquí
 * se busca por el slug, que no cambia.
 */
export function quote(km: number | null, slug: string, origin: string, destination: string): Quote | null {
  const key = PRICE_KEY_BY_SLUG[slug];
  if (!key || km == null || !Number.isFinite(km) || km < 0) return null;

  const base = bracketFor(km)[key];
  const surcharge = routeSurcharge(origin, destination, key);
  return { base, surcharge, total: base + (surcharge?.amount ?? 0) };
}
