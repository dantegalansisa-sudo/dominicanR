// Shared contact-form logic. Both the Vercel function (api/contact.ts) and the
// dev middleware in vite.config.ts call this, so what runs locally is the same
// code that runs in production — only the transport differs.
//
// Two emails go out per submission: the request to Dominican Routes, and a
// receipt to the visitor. That double confirmation is the same shape the
// payment gateway will need later, so the plumbing is already in place.

export const TOPICS = [
  'Traslado',
  'Excursión',
  'Grupo o evento',
  'Otro',
] as const;

/** El tipo de solicitud, en inglés, para el acuse de recibo. */
const TOPIC_EN: Record<string, string> = {
  Traslado: 'transfer',
  Excursión: 'excursion',
  'Grupo o evento': 'group or event',
  Otro: 'general',
};

export type Topic = (typeof TOPICS)[number];

export interface ContactResult {
  status: number;
  body: { ok: boolean; error?: string; bookingId?: number };
}

/** Estado del cobro que acompaña a la solicitud, si la web lo gestiona. */
export interface PaymentInfo {
  status: 'pendiente' | 'pagada';
  amount: number;
  orderId?: string;
  method?: 'paypal' | 'efectivo';
}

/** Lo que se guarda de cada solicitud, además del texto del correo. */
export interface NewBooking {
  kind: 'traslado' | 'excursion' | 'contacto';
  name: string;
  email: string;
  phone: string;
  lang: 'es' | 'en';
  date: string;
  message: string;
  /** Los campos sueltos que manda el formulario, tal cual, para el panel. */
  payload?: unknown;
  /** Importe a cobrar y orden de PayPal, cuando la reserva se paga online. */
  payment?: PaymentInfo;
}

/**
 * Dónde guardar la solicitud. Lo pone el servidor Express (base de datos);
 * en Vercel y en el servidor de desarrollo de Vite no hay ninguno y el
 * formulario funciona como siempre, solo por correo.
 */
export interface BookingStore {
  save(b: NewBooking): number;
  markEmail(id: number, sent: boolean, error?: string): void;
}

const KIND_BY_TOPIC: Record<string, NewBooking['kind']> = {
  Traslado: 'traslado',
  Excursión: 'excursion',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export const BRAND = {
  ink: '#1C1814',
  soft: '#5B5147',
  cream: '#F7F3EC',
  coral: '#E2653F',
  navy: '#0B1E33',
};

interface SendArgs {
  apiKey: string;
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(args: SendArgs): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: args.from,
        to: [args.to],
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });
    if (!res.ok) {
      console.error('Resend rechazó el envío a', args.to, res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Fallo al contactar Resend para', args.to, err);
    return false;
  }
}

export async function handleContact(
  raw: unknown,
  store?: BookingStore,
  payment?: PaymentInfo,
): Promise<ContactResult> {
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
  // Idioma en que el visitante usó la web: el acuse de recibo va en ese
  // idioma, y al operador se le avisa para que conteste en el mismo.
  const lang = str(data.lang) === 'en' ? 'en' : 'es';

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

  // Primero se guarda, después se envía: si el correo falla, la solicitud
  // sigue existiendo. Y al revés: un fallo al guardar no frena el correo.
  let bookingId: number | null = null;
  if (store) {
    try {
      bookingId = store.save({
        kind: KIND_BY_TOPIC[topic] ?? 'contacto',
        name,
        email,
        phone,
        lang,
        date,
        message,
        payload: data.booking,
        payment,
      });
    } catch (err) {
      console.error('No se pudo guardar la solicitud en la base:', err);
    }
  }
  const noteEmail = (sent: boolean, error?: string) => {
    if (bookingId == null || !store) return;
    try {
      store.markEmail(bookingId, sent, error);
    } catch (err) {
      console.error('No se pudo anotar el estado del correo:', err);
    }
  };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO || 'dominicanroutes@gmail.com';
  const from = process.env.CONTACT_FROM || 'Dominican Routes <onboarding@resend.dev>';

  if (!apiKey) {
    noteEmail(false, 'Sin RESEND_API_KEY');
    // Guardada aunque sin correo: el visitante no tiene que volver a escribir.
    if (bookingId != null) return { status: 200, body: { ok: true, bookingId } };
    return {
      status: 503,
      body: {
        ok: false,
        error:
          'El formulario todavía no está conectado al correo. Llámanos al +1 (829) 219-1573 mientras tanto.',
      },
    };
  }

  const rows: Array<[string, string]> = [
    ['Nombre', name],
    ['Correo', email],
    ['Teléfono', phone || '—'],
    ['Solicitud', topic],
    ['Fecha de viaje', date || '—'],
    ['Idioma', lang === 'en' ? 'Inglés (contestar en inglés)' : 'Español'],
    ...(payment
      ? ([
          [
            'Pago',
            payment.method === 'efectivo'
              ? `EN EFECTIVO · US$${payment.amount} pendiente, se cobra el día del servicio`
              : payment.status === 'pagada'
                ? `PAGADA · US$${payment.amount} por PayPal`
                : `Pendiente · US$${payment.amount} por PayPal (el cliente está en la pasarela)`,
          ],
        ] as Array<[string, string]>)
      : []),
  ];

  // Lo que se le dice al visitante sobre el cobro, en su idioma.
  const payLine = payment
    ? payment.method === 'efectivo'
      ? lang === 'en'
        ? `Payment in cash: US$${payment.amount}, paid on the day of the service. We will confirm your booking by email.`
        : `Pago en efectivo: US$${payment.amount}, se paga el día del servicio. Te confirmamos la reserva por correo.`
      : lang === 'en'
        ? payment.status === 'pagada'
          ? `Payment received: US$${payment.amount} via PayPal. Your booking is confirmed.`
          : `Amount: US$${payment.amount}. If the PayPal payment did not go through, you can pay later or contact us.`
        : payment.status === 'pagada'
          ? `Pago recibido: US$${payment.amount} por PayPal. Tu reserva queda confirmada.`
          : `Importe: US$${payment.amount}. Si el pago por PayPal no se completó, puedes pagar más tarde o escribirnos.`
    : '';
  const payHtml = payLine
    ? `<p style="margin:0 0 18px;padding:12px 16px;background:${payment?.status === 'pagada' ? '#e6f4ec' : BRAND.cream};border-radius:12px;font-weight:600">${escapeHtml(payLine)}</p>`
    : '';

  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:${BRAND.soft};width:150px">${k}</td>
             <td style="padding:8px 0;font-weight:600">${escapeHtml(v)}</td></tr>`,
    )
    .join('');

  // 1) The request itself, to Dominican Routes.
  const internalOk = await sendEmail({
    apiKey,
    from,
    to,
    replyTo: email,
    subject: `Solicitud de ${topic.toLowerCase()} — ${name}`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:${BRAND.ink};max-width:560px">
        <h2 style="margin:0 0 4px">Nueva solicitud desde la web</h2>
        <p style="margin:0 0 20px;color:${BRAND.soft}">dominicanroutes.com · formulario de contacto</p>
        <table style="width:100%;border-collapse:collapse;font-size:15px">${table}</table>
        <p style="margin:22px 0 6px;color:${BRAND.soft}">Mensaje</p>
        <p style="margin:0;padding:16px;background:${BRAND.cream};border-radius:12px;white-space:pre-wrap">${escapeHtml(message)}</p>
        <p style="margin:22px 0 0;font-size:13px;color:${BRAND.soft}">
          Responde a este correo para contestarle directamente a ${escapeHtml(name)}.
        </p>
      </div>`,
    text: [...rows.map(([k, v]) => `${k}: ${v}`), '', 'Mensaje:', message].join('\n'),
  });

  // 2) The receipt, to the visitor. A failure here must not lose the request —
  //    the business already has it, so the form still reports success.
  const first = escapeHtml(name.split(' ')[0]!);
  const receiptOk = lang === 'en'
    ? await sendEmail({
        apiKey,
        from,
        to: email,
        replyTo: to,
        subject: 'We received your request — Dominican Routes',
        html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:${BRAND.ink};max-width:560px">
        <h2 style="margin:0 0 6px">Thank you, ${first}</h2>
        <p style="margin:0 0 20px;color:${BRAND.soft};line-height:1.6">
          We received your <strong>${escapeHtml(TOPIC_EN[topic] ?? topic.toLowerCase())}</strong> request.
          We reply to this same email, usually the same day.
        </p>
        ${payHtml}
        <p style="margin:0 0 8px;color:${BRAND.soft}">This is what you sent us:</p>
        <p style="margin:0 0 22px;padding:16px;background:${BRAND.cream};border-radius:12px;white-space:pre-wrap">${escapeHtml(message)}</p>
        <p style="margin:0 0 6px;color:${BRAND.soft};font-size:14px">Need something urgently?</p>
        <p style="margin:0 0 24px;font-size:16px;font-weight:600">+1 (829) 219-1573 · available 24/7</p>
        <p style="margin:0;padding-top:18px;border-top:1px solid #E2DACD;font-size:13px;color:${BRAND.soft}">
          Dominican Routes · Punta Cana, La Altagracia, Dominican Republic
        </p>
      </div>`,
        text: [
          `Thank you, ${name.split(' ')[0]}`,
          '',
          `We received your ${TOPIC_EN[topic] ?? topic.toLowerCase()} request. We reply to this same email, usually the same day.`,
          ...(payLine ? ['', payLine] : []),
          '',
          'This is what you sent us:',
          message,
          '',
          'Need something urgently? +1 (829) 219-1573 · available 24/7',
          'Dominican Routes · Punta Cana, La Altagracia, Dominican Republic',
        ].join('\n'),
      })
    : await sendEmail({
    apiKey,
    from,
    to: email,
    replyTo: to,
    subject: 'Recibimos tu solicitud — Dominican Routes',
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:${BRAND.ink};max-width:560px">
        <h2 style="margin:0 0 6px">Gracias, ${escapeHtml(name.split(' ')[0]!)}</h2>
        <p style="margin:0 0 20px;color:${BRAND.soft};line-height:1.6">
          Recibimos tu solicitud de <strong>${escapeHtml(topic.toLowerCase())}</strong>.
          Te respondemos a este mismo correo, normalmente el mismo día.
        </p>
        ${payHtml}
        <p style="margin:0 0 8px;color:${BRAND.soft}">Esto fue lo que nos enviaste:</p>
        <p style="margin:0 0 22px;padding:16px;background:${BRAND.cream};border-radius:12px;white-space:pre-wrap">${escapeHtml(message)}</p>
        <p style="margin:0 0 6px;color:${BRAND.soft};font-size:14px">¿Necesitas algo urgente?</p>
        <p style="margin:0 0 24px;font-size:16px;font-weight:600">+1 (829) 219-1573 · atención 24/7</p>
        <p style="margin:0;padding-top:18px;border-top:1px solid #E2DACD;font-size:13px;color:${BRAND.soft}">
          Dominican Routes · Punta Cana, La Altagracia, República Dominicana
        </p>
      </div>`,
    text: [
      `Gracias, ${name.split(' ')[0]}`,
      '',
      `Recibimos tu solicitud de ${topic.toLowerCase()}. Te respondemos a este mismo correo, normalmente el mismo día.`,
      ...(payLine ? ['', payLine] : []),
      '',
      'Esto fue lo que nos enviaste:',
      message,
      '',
      '¿Necesitas algo urgente? +1 (829) 219-1573 · atención 24/7',
      'Dominican Routes · Punta Cana, La Altagracia, República Dominicana',
    ].join('\n'),
  });

  noteEmail(internalOk, internalOk ? undefined : 'Resend rechazó el envío al negocio');

  if (!internalOk) {
    // Con la solicitud guardada no se pide reintentar: repetirla solo crearía
    // un duplicado en la base. Sin guardar, sí hace falta que lo intente.
    if (bookingId != null) {
      console.warn('Solicitud', bookingId, 'guardada pero el correo al negocio no salió.');
      return { status: 200, body: { ok: true, bookingId } };
    }
    return {
      status: 502,
      body: { ok: false, error: 'No pudimos enviar tu mensaje. Intenta de nuevo.' },
    };
  }

  if (!receiptOk) {
    console.warn('La solicitud llegó al negocio pero el acuse a', email, 'no salió.');
  }

  return { status: 200, body: { ok: true, ...(bookingId != null ? { bookingId } : {}) } };
}
