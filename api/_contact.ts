// Shared contact-form logic. Both the Vercel function (api/contact.ts) and the
// dev middleware in vite.config.ts call this, so what runs locally is the same
// code that runs in production — only the transport differs.

export const TOPICS = [
  'Traslado',
  'Excursión',
  'Grupo o evento',
  'Otro',
] as const;

export type Topic = (typeof TOPICS)[number];

export interface ContactResult {
  status: number;
  body: { ok: boolean; error?: string };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export async function handleContact(raw: unknown): Promise<ContactResult> {
  const data = (raw ?? {}) as Record<string, unknown>;

  // Honeypot: a real person never fills a field they cannot see. Answer 200 so
  // bots get no signal about why the message went nowhere.
  if (str(data.company)) return { status: 200, body: { ok: true } };

  const name = str(data.name);
  const email = str(data.email);
  const phone = str(data.phone);
  const topic = str(data.topic);
  const date = str(data.date);
  const message = str(data.message);

  if (name.length < 2 || name.length > 80)
    return { status: 400, body: { ok: false, error: 'Escribe tu nombre.' } };
  if (!EMAIL_RE.test(email) || email.length > 160)
    return { status: 400, body: { ok: false, error: 'Revisa tu correo electrónico.' } };
  if (phone.length > 40)
    return { status: 400, body: { ok: false, error: 'Revisa tu teléfono.' } };
  if (!TOPICS.includes(topic as Topic))
    return { status: 400, body: { ok: false, error: 'Elige un tipo de solicitud.' } };
  if (message.length < 10 || message.length > 2000)
    return {
      status: 400,
      body: { ok: false, error: 'Cuéntanos un poco más (mínimo 10 caracteres).' },
    };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO || 'info@dominicanroutes.com';
  const from = process.env.CONTACT_FROM || 'Dominican Routes <onboarding@resend.dev>';

  if (!apiKey) {
    return {
      status: 503,
      body: {
        ok: false,
        error:
          'El formulario todavía no está conectado al correo. Escríbenos por WhatsApp mientras tanto.',
      },
    };
  }

  const rows: Array<[string, string]> = [
    ['Nombre', name],
    ['Correo', email],
    ['Teléfono', phone || '—'],
    ['Solicitud', topic],
    ['Fecha de viaje', date || '—'],
  ];

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;color:#1C1814;max-width:560px">
      <h2 style="margin:0 0 4px">Nueva solicitud desde la web</h2>
      <p style="margin:0 0 20px;color:#5B5147">dominicanroutes.com · formulario de contacto</p>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:8px 0;color:#5B5147;width:150px">${k}</td>
                   <td style="padding:8px 0;font-weight:600">${escapeHtml(v)}</td></tr>`,
          )
          .join('')}
      </table>
      <p style="margin:22px 0 6px;color:#5B5147">Mensaje</p>
      <p style="margin:0;padding:16px;background:#F7F3EC;border-radius:12px;white-space:pre-wrap">${escapeHtml(
        message,
      )}</p>
      <p style="margin:22px 0 0;font-size:13px;color:#5B5147">
        Responde a este correo para contestarle directamente a ${escapeHtml(name)}.
      </p>
    </div>`;

  const text = [
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Mensaje:',
    message,
  ].join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        // so the client can just hit Reply and land in the visitor's inbox
        reply_to: email,
        subject: `Solicitud de ${topic.toLowerCase()} — ${name}`,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Resend rechazó el envío:', res.status, detail);
      return {
        status: 502,
        body: { ok: false, error: 'No pudimos enviar tu mensaje. Intenta de nuevo.' },
      };
    }

    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error('Fallo al contactar Resend:', err);
    return {
      status: 502,
      body: { ok: false, error: 'No pudimos enviar tu mensaje. Intenta de nuevo.' },
    };
  }
}
