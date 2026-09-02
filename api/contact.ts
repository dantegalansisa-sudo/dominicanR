import { handleContact } from './_contact.ts';

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
