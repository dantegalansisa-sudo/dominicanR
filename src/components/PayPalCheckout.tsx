import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLang } from '../i18n';

/**
 * Botón de PayPal del paso final de la reserva. La orden la crea y la captura
 * el servidor (/api/pay), que recalcula el importe: aquí solo se muestra el
 * total y se enlazan los tres momentos (crear, aprobar, cancelar/fallar).
 *
 * Si el servidor no tiene PayPal configurado, el componente no pinta nada y
 * la página se queda con "Enviar solicitud" como siempre.
 */

interface PayPalConfig {
  enabled: boolean;
  clientId?: string;
  currency?: string;
}

type PayPalButtons = {
  render: (el: HTMLElement) => Promise<void>;
  close?: () => void;
};
type PayPalNS = {
  Buttons: (opts: Record<string, unknown>) => PayPalButtons;
};

let configPromise: Promise<PayPalConfig> | null = null;
const loadConfig = () =>
  (configPromise ??= fetch('/api/pay/config')
    .then((r) => (r.ok ? r.json() : { enabled: false }))
    .catch(() => ({ enabled: false })));

let sdkPromise: Promise<PayPalNS | null> | null = null;
function loadSdk(clientId: string, currency: string, locale: string): Promise<PayPalNS | null> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve) => {
    const w = window as unknown as { paypal?: PayPalNS };
    if (w.paypal) return resolve(w.paypal);
    const s = document.createElement('script');
    // PayPal y tarjeta (el formulario de tarjeta lo pinta PayPal con su
    // estilo; no admite personalización). Sin "pagar después" ni
    // financiación, que no aplican a una reserva de viaje.
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&components=buttons&disable-funding=paylater,credit&locale=${locale}`;
    s.async = true;
    s.onload = () => resolve(w.paypal ?? null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export type PayOutcome =
  | { kind: 'paid'; amount: number; bookingId: number }
  | { kind: 'pending'; bookingId: number | null; error?: string };

export default function PayPalCheckout({
  amount,
  buildPayload,
  validate,
  onOutcome,
  onPlainSubmit,
  sending,
  fallback,
  bookingId,
  onReady,
  cashAllowed,
  cashAmount,
  onCash,
  busy,
}: {
  /** Total estimado por la web; el servidor lo recalcula, esto es solo lo que se ve. */
  amount: number;
  /** Lo mismo que se manda a /api/contact. */
  buildPayload: () => Record<string, unknown>;
  /** Comprueba los datos de contacto; devuelve el mensaje de error o null. */
  validate: () => string | null;
  onOutcome: (o: PayOutcome) => void;
  /** El camino de siempre: pedir presupuesto sin pagar. */
  onPlainSubmit: () => void;
  sending: boolean;
  /** Lo que se muestra mientras PayPal no está (o no está configurado). */
  fallback: ReactNode;
  /** Reserva ya registrada en un intento anterior: se reutiliza, no se duplica. */
  bookingId?: number | null;
  /** Avisa a la página de si el pago online está disponible. */
  onReady?: (on: boolean) => void;
  /** Segunda forma de pago: en efectivo el día del servicio. */
  cashAllowed: boolean;
  /** Lo que se paga en efectivo (sin impuestos). */
  cashAmount: number;
  onCash: () => void;
  busy?: boolean;
}) {
  const { t, lang } = useLang();
  const [ready, setReady] = useState<'checking' | 'off' | 'loading' | 'on'>('checking');
  const [error, setError] = useState('');
  const host = useRef<HTMLDivElement>(null);
  // Las funciones cambian en cada render; el botón de PayPal se crea una vez.
  const latest = useRef({ buildPayload, validate, onOutcome });
  latest.current = { buildPayload, validate, onOutcome };
  const bookingRef = useRef<number | null>(bookingId ?? null);

  useEffect(() => {
    let alive = true;
    loadConfig().then(async (cfg) => {
      if (!alive) return;
      if (!cfg.enabled || !cfg.clientId) {
        setReady('off');
        onReady?.(false);
        return;
      }
      setReady('loading');
      const paypal = await loadSdk(cfg.clientId, cfg.currency ?? 'USD', lang === 'en' ? 'en_US' : 'es_ES');
      if (!alive) return;
      if (!paypal || !host.current) {
        setReady('off');
        onReady?.(false);
        return;
      }
      host.current.innerHTML = '';
      const buttons = paypal.Buttons({
        style: { layout: 'vertical', shape: 'pill', color: 'black', label: 'pay', height: 48, tagline: false },
        onClick: (_data: unknown, actions: { reject: () => void; resolve: () => void }) => {
          const err = latest.current.validate();
          setError(err ?? '');
          return err ? actions.reject() : actions.resolve();
        },
        createOrder: async () => {
          setError('');
          const res = await fetch('/api/pay/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...latest.current.buildPayload(), bookingId: bookingRef.current }),
          });
          const body = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            orderID?: string;
            bookingId?: number;
            error?: string;
          };
          if (typeof body.bookingId === 'number') bookingRef.current = body.bookingId;
          if (!res.ok || !body.ok || !body.orderID) {
            setError(body.error || t.pay.error);
            throw new Error(body.error || 'create failed');
          }
          return body.orderID;
        },
        onApprove: async (data: { orderID: string }) => {
          const res = await fetch('/api/pay/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID }),
          });
          const body = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            paid?: boolean;
            amount?: number;
            bookingId?: number;
            error?: string;
          };
          if (res.ok && body.ok && body.paid && typeof body.amount === 'number' && typeof body.bookingId === 'number') {
            latest.current.onOutcome({ kind: 'paid', amount: body.amount, bookingId: body.bookingId });
          } else {
            latest.current.onOutcome({ kind: 'pending', bookingId: body.bookingId ?? bookingRef.current, error: body.error });
          }
        },
        onCancel: () => {
          latest.current.onOutcome({ kind: 'pending', bookingId: bookingRef.current });
        },
        onError: (err: unknown) => {
          // Un rechazo en onClick (datos incompletos) también pasa por aquí;
          // ese caso ya tiene su mensaje y no hay reserva que dar por pendiente.
          if (bookingRef.current != null) {
            latest.current.onOutcome({ kind: 'pending', bookingId: bookingRef.current, error: String(err) });
          }
        },
      });
      await buttons.render(host.current);
      if (alive) {
        setReady('on');
        onReady?.(true);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.pay.error, lang]);

  if (ready === 'off' || ready === 'checking') return <>{fallback}</>;

  return (
    <div className="paypal">
      <p className="paypal__title">{t.pay.title}</p>
      <p className="paypal__total">{t.pay.total(amount)}</p>
      <p className="paypal__lead">{t.pay.lead}</p>
      {ready === 'loading' && <p className="paypal__loading">{t.pay.loading}</p>}
      <div className="paypal__buttons" ref={host} />
      {error && (
        <p className="form__note form__note--bad paypal__error" role="alert">
          {error}
        </p>
      )}
      {cashAllowed ? (
        <div className="paypal__cash">
          <button type="button" className="btn btn--cash btn--block" onClick={onCash} disabled={sending || busy}>
            {t.pay.cash}
            <span className="btn--cash__amount">{t.pay.cashAmount(cashAmount)}</span>
          </button>
          <p className="paypal__lead">{t.pay.cashHint}</p>
        </div>
      ) : (
        <p className="paypal__lead paypal__prepaid">{t.pay.cashOnlyPrepaid}</p>
      )}
      <button type="button" className="paypal__plain" onClick={onPlainSubmit} disabled={sending || busy}>
        {t.pay.orPlain}
      </button>
    </div>
  );
}
