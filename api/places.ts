// La extension es .js a proposito: el proyecto es ESM con nodenext y
// TypeScript no reescribe el especificador al compilar. Con './_x.ts' el
// modulo no carga en Vercel y la funcion devuelve 500 antes de ejecutar
// nada. Con .js, tsc resuelve el .ts y el runtime encuentra el .js.
import { handlePlaces } from './_places.js';

// Vercel Function con la firma web estándar, igual que api/contact.ts.
// Una sola ruta atiende autocompletado y detalle: se distinguen por `op`.
export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Solicitud inválida.' }, { status: 400 });
  }

  const { status, body } = await handlePlaces(payload);
  return Response.json(body, { status });
}

export function GET(): Response {
  return Response.json({ ok: false, error: 'Método no permitido.' }, { status: 405 });
}
