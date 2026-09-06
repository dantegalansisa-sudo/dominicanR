import type { PlaceValue } from '../data/places';

/**
 * Cliente del proxy /api/places. La API key vive en el servidor: desde aquí
 * solo se habla con nuestro propio endpoint.
 */

export interface Suggestion {
  placeId: string;
  main: string;
  secondary: string;
}

/**
 * Google factura por sesión, no por pulsación: todas las teclas de una búsqueda
 * comparten token y el detalle final lo cierra. Sin esto, cada letra sería una
 * llamada facturable.
 */
export function newSessionToken(): string {
  const c = globalThis.crypto;
  if (c && 'randomUUID' in c) return c.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function call(payload: Record<string, unknown>, signal?: AbortSignal) {
  const res = await fetch('/api/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) throw new Error('places');
  return res.json() as Promise<Record<string, unknown>>;
}

export async function fetchSuggestions(
  input: string,
  session: string,
  signal?: AbortSignal,
): Promise<Suggestion[]> {
  const body = await call({ op: 'autocomplete', input, session }, signal);
  return (body.suggestions as Suggestion[]) ?? [];
}

/**
 * Segunda mitad de la sesión: convierte el resultado elegido en coordenadas.
 * Si falla, devolvemos el lugar solo con texto — es peor para el conductor,
 * pero no bloquea la reserva.
 */
export async function fetchPlace(
  placeId: string,
  session: string,
  fallbackText: string,
): Promise<PlaceValue> {
  try {
    const body = await call({ op: 'details', placeId, session });
    const p = body.place as
      | { placeId: string; address: string; lat: number | null; lng: number | null }
      | undefined;
    if (!p) return { text: fallbackText, placeId };
    return {
      text: fallbackText,
      placeId: p.placeId,
      address: p.address || undefined,
      lat: p.lat ?? undefined,
      lng: p.lng ?? undefined,
    };
  } catch {
    return { text: fallbackText, placeId };
  }
}
