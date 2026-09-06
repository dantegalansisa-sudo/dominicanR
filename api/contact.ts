// La extension es .js a proposito: el proyecto es ESM con nodenext y
// TypeScript no reescribe el especificador al compilar. Con './_x.ts' el
// modulo no carga en Vercel y la funcion devuelve 500 antes de ejecutar
// nada. Con .js, tsc resuelve el .ts y el runtime encuentra el .js.
import { handleContact } from './_contact.js';

// Vercel Function using the Web-standard signature, so no @vercel/node types
// or SDK are needed. Deployed automatically from the api/ directory.
export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Solicitud inválida.' }, { status: 400 });
  }

  const { status, body } = await handleContact(payload);
  return Response.json(body, { status });
}

export function GET(): Response {
  return Response.json({ ok: false, error: 'Método no permitido.' }, { status: 405 });
}
