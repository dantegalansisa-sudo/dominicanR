// Proxy a Google Places API (New). Lo llaman la función de Vercel
// (api/places.ts) y el middleware de vite.config.ts, así que en local corre el
// mismo código que en producción.
//
// La razón de existir de este módulo es que la API key jamás llegue al
// navegador. Una key en el bundle es visible aunque se restrinja por dominio, y
// la restricción por Referer se falsifica mandando la cabecera a mano.

const ENDPOINT = 'https://places.googleapis.com/v1';

/** El cliente solo opera en República Dominicana. */
const REGION = 'do';

/**
 * Solo campos del tramo Essentials, el más barato de Place Details. displayName
 * está en el tramo Pro y no lo necesitamos: el texto ya viene del autocompletado.
 */
const DETAIL_FIELDS = 'id,location,formattedAddress';

/** Por debajo de esto el autocompletado devuelve ruido y se paga igual. */
const MIN_INPUT = 3;

export interface PlacesResult {
  status: number;
  body: Record<string, unknown>;
}

export interface Suggestion {
  placeId: string;
  main: string;
  secondary: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const fail = (status: number, error: string): PlacesResult => ({
  status,
  body: { ok: false, error },
});

interface GoogleSuggestion {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
}

async function autocomplete(
  key: string,
  input: string,
  session: string,
): Promise<PlacesResult> {
  // No es un error: es una búsqueda demasiado corta para gastar una llamada.
  if (input.length < MIN_INPUT) return { status: 200, body: { ok: true, suggestions: [] } };

  const res = await fetch(`${ENDPOINT}/places:autocomplete`, {
    method: 'POST',
    headers: { 'X-Goog-Api-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input,
      includedRegionCodes: [REGION],
      languageCode: 'es',
      ...(session ? { sessionToken: session } : {}),
    }),
  });

  if (!res.ok) return fail(502, 'No pudimos consultar los lugares.');

  const data = (await res.json()) as { suggestions?: GoogleSuggestion[] };
  const suggestions: Suggestion[] = (data.suggestions ?? [])
    .map((s) => {
      const p = s.placePrediction;
      if (!p?.placeId) return null;
      const full = p.text?.text ?? '';
      const main = p.structuredFormat?.mainText?.text ?? full;
      // Sin structuredFormat el texto viene entero en main; recortarlo evita
      // repetir la misma línea dos veces en el desplegable.
      const secondary =
        p.structuredFormat?.secondaryText?.text ??
        (full.startsWith(main) ? full.slice(main.length).replace(/^,\s*/, '') : '');
      return { placeId: p.placeId, main, secondary };
    })
    .filter((s): s is Suggestion => s !== null);

  return { status: 200, body: { ok: true, suggestions } };
}

async function details(
  key: string,
  placeId: string,
  session: string,
): Promise<PlacesResult> {
  if (!placeId) return fail(400, 'Falta el lugar.');

  const url = new URL(`${ENDPOINT}/places/${encodeURIComponent(placeId)}`);
  // El token cierra la sesión: las pulsaciones de teclado y este detalle se
  // facturan como una sola búsqueda en lugar de una por tecla.
  if (session) url.searchParams.set('sessionToken', session);

  const res = await fetch(url, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': DETAIL_FIELDS },
  });

  if (!res.ok) return fail(502, 'No pudimos obtener la ubicación.');

  const data = (await res.json()) as {
    id?: string;
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  };

  return {
    status: 200,
    body: {
      ok: true,
      place: {
        placeId: data.id ?? placeId,
        address: data.formattedAddress ?? '',
        lat: data.location?.latitude ?? null,
        lng: data.location?.longitude ?? null,
      },
    },
  };
}

export async function handlePlaces(payload: unknown): Promise<PlacesResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  // Sin key la web sigue funcionando con la lista fija de aeropuertos y zonas,
  // así que esto se responde en silencio y el campo no se rompe.
  if (!key) return { status: 200, body: { ok: true, suggestions: [], disabled: true } };

  const p = (payload ?? {}) as Record<string, unknown>;
  const session = str(p.session);

  switch (str(p.op)) {
    case 'autocomplete':
      return autocomplete(key, str(p.input), session);
    case 'details':
      return details(key, str(p.placeId), session);
    default:
      return fail(400, 'Operación no válida.');
  }
}
