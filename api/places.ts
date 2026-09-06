import { handlePlaces } from './_places.ts';

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
