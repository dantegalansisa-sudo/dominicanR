import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { api } from '../api';
import type { BookingRow } from '../api';
import { fmtDR, useToast } from '../ui';
import { EmailFlag, StatusPill } from './BookingsPage';
import {
  KIND_LABEL,
  STATUS_LABEL,
  bookingPrice,
  mapsOf,
  partyText,
  payloadOf,
} from '../bookings';
import type { ExcursionPayload, TransferPayload } from '../bookings';
import type { PlaceValue } from '../../data/places';
import { DRINKS, SEATS, STOPS } from '../../data/passengers';

const STATUSES = ['nueva', 'contestada', 'confirmada', 'cancelada'] as const;

/** Una fila de la ficha: etiqueta a la izquierda, valor a la derecha. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="adm-kv">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Un lugar con su enlace a Google Maps cuando se eligió en la lista. */
function Place({ p }: { p?: PlaceValue }) {
  if (!p?.text) return <>—</>;
  const url = mapsOf(p);
  return (
    <>
      {p.text}
      {p.address && p.address !== p.text && <div className="adm__sub" style={{ fontSize: 12.5, marginTop: 2 }}>{p.address}</div>}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="adm-maplink">
          Abrir en Google Maps ↗
        </a>
      )}
    </>
  );
}

const extraLines = (t: TransferPayload) => {
  const e = t.extras;
  if (!e) return [];
  const out: string[] = [];
  for (const s of SEATS) if ((e.seats?.[s.id] ?? 0) > 0) out.push(`${s.label} ×${e.seats[s.id]}`);
  for (const d of DRINKS) if ((e.drinks?.[d.id] ?? 0) > 0) out.push(`${d.label} ×${e.drinks[d.id]}`);
  const stop = STOPS.find((s) => s.id === e.stop);
  if (stop) out.push(`Parada de ${stop.label}`);
  return out;
};

export default function BookingDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [b, setB] = useState<BookingRow | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api.get<{ booking: BookingRow }>(`/bookings/${id}`);
    setB(r.booking);
    setNotes(r.booking.notes);
  }, [id]);

  useEffect(() => {
    load().catch((e) => {
      toast(e.message, true);
      navigate('/admin/reservas');
    });
  }, [load, toast, navigate]);

  if (!b) return <p className="adm-empty">Cargando…</p>;

  const save = async (body: Record<string, unknown>, key: string, ok: string) => {
    setSaving(key);
    try {
      await api.put(`/bookings/${b.id}`, body);
      await load();
      toast(ok);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(null);
    }
  };

  const p = payloadOf(b);
  const price = bookingPrice(b);

  return (
    <>
      <div className="adm__head">
        <div>
          <Link to="/admin/reservas" style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
            ← Reservas
          </Link>
          <h1 className="adm__title" style={{ marginTop: 6 }}>
            {KIND_LABEL[b.kind]} · {b.name}
          </h1>
          <p className="adm__sub">
            Recibida el {fmtDR(b.created_at)} · #{b.id}
            {b.lang === 'en' && ' · el cliente usó la web en inglés: contestar en inglés'}
          </p>
        </div>
        <div className="adm-bar">
          <StatusPill status={b.status} />
          <EmailFlag b={b} />
        </div>
      </div>

      {b.email_sent === 0 && (
        <div className="adm-warn">
          El aviso por correo al negocio <strong>no salió</strong>
          {b.email_error ? ` (${b.email_error})` : ''}. Esta reserva solo existe aquí: contacta al cliente desde esta ficha.
        </div>
      )}

      <div className="adm-two">
        <div>
          {/* ------------------------------------------------------ cliente */}
          <section className="adm__card">
            <h2 className="adm__card-title">Cliente</h2>
            <dl className="adm-kvs">
              <Row label="Nombre">{b.name}</Row>
              <Row label="Correo">
                <a href={`mailto:${b.email}`}>{b.email}</a>
              </Row>
              <Row label="Teléfono">
                {b.phone ? (
                  <>
                    <a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`}>{b.phone}</a>
                    {' · '}
                    <a href={`https://wa.me/${b.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                      WhatsApp ↗
                    </a>
                  </>
                ) : (
                  '—'
                )}
              </Row>
              <Row label="Idioma">{b.lang === 'en' ? 'Inglés' : 'Español'}</Row>
            </dl>
          </section>

          {/* ------------------------------------------------------- viaje */}
          {b.kind === 'traslado' && (
            <section className="adm__card">
              <h2 className="adm__card-title">Traslado</h2>
              <dl className="adm-kvs">
                {(() => {
                  const t = p as TransferPayload;
                  const lines = extraLines(t);
                  return (
                    <>
                      <Row label="Origen">
                        <Place p={t.origin} />
                      </Row>
                      <Row label="Destino">
                        <Place p={t.destination} />
                      </Row>
                      <Row label="Fecha y hora">
                        {t.date || b.date || '—'} {t.time && `· ${t.time}`}
                      </Row>
                      {t.flight && <Row label="Vuelo">{t.flight}</Row>}
                      {t.round && (
                        <Row label="Regreso">
                          {t.returnDate || '(fecha por confirmar)'} {t.returnTime && `· ${t.returnTime}`}
                        </Row>
                      )}
                      <Row label="Pasajeros">{partyText(t.party)}</Row>
                      <Row label="Vehículo">
                        {t.vehicle ? `${t.vehicle.name} (${t.vehicle.chosen ? 'elegido por el cliente' : 'sugerido por la web'})` : '—'}
                      </Row>
                      {t.km != null && (
                        <Row label="Distancia">
                          {t.km} km{t.round && t.billableKm != null ? ` · ida y vuelta ${t.billableKm} km` : ''}
                        </Row>
                      )}
                      <Row label="Precio calculado">
                        {t.quote ? (
                          <>
                            US${t.quote.total}
                            {t.quote.route
                              ? ` · ruta cerrada: ${t.quote.route}`
                              : t.quote.surcharge
                                ? ` · base US$${t.quote.base} + recargo US$${t.quote.surcharge.amount} (${t.quote.surcharge.label})`
                                : ''}
                          </>
                        ) : (
                          'A cotizar'
                        )}
                      </Row>
                      <Row label="Adicionales">
                        {lines.length ? `${lines.join(' · ')} — US$${t.extrasTotal ?? 0}` : 'Ninguno'}
                      </Row>
                      {t.notes && <Row label="Notas del cliente">{t.notes}</Row>}
                    </>
                  );
                })()}
              </dl>
            </section>
          )}

          {b.kind === 'excursion' && (
            <section className="adm__card">
              <h2 className="adm__card-title">Excursión</h2>
              <dl className="adm-kvs">
                {(() => {
                  const e = p as ExcursionPayload;
                  return (
                    <>
                      <Row label="Excursión">
                        {e.excursion?.name || '—'}
                        {e.excursion?.slug && (
                          <>
                            {' · '}
                            <Link to={`/admin/excursiones/${e.excursion.slug}`}>ver ficha</Link>
                          </>
                        )}
                      </Row>
                      <Row label="Fecha">{e.date || b.date || '—'}</Row>
                      {e.departure && <Row label="Salida">{e.departure}</Row>}
                      {e.ticket && (
                        <Row label="Entrada">
                          {e.ticket.name} · US${e.ticket.price} por persona
                        </Row>
                      )}
                      <Row label="Punto de recogida">
                        <Place p={e.pickup} />
                      </Row>
                      {e.room && <Row label="Habitación">{e.room}</Row>}
                      <Row label="Pasajeros">
                        {partyText(e.party)}
                        {e.adultsOnly && ' · solo adultos'}
                      </Row>
                      {e.notes && <Row label="Notas del cliente">{e.notes}</Row>}
                    </>
                  );
                })()}
              </dl>
            </section>
          )}

          {price != null && (
            <p className="adm__sub" style={{ marginTop: -6, marginBottom: 18 }}>
              Total estimado por la web: <strong>US${price}</strong>. Es orientativo; el precio cerrado lo confirmas tú.
            </p>
          )}

          <section className="adm__card">
            <h2 className="adm__card-title">Mensaje tal como llegó</h2>
            <pre className="adm-pre">{b.message}</pre>
          </section>
        </div>

        {/* -------------------------------------------------------- gestión */}
        <aside>
          <section className="adm__card">
            <h2 className="adm__card-title">Estado</h2>
            <div className="adm-status-btns">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`adm-btn${b.status === s ? ' adm-btn--primary' : ''}`}
                  disabled={saving === `status-${s}` || b.status === s}
                  onClick={() => save({ status: s }, `status-${s}`, `Marcada como ${STATUS_LABEL[s].toLowerCase()}.`)}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </section>

          <section className="adm__card">
            <h2 className="adm__card-title">Notas internas</h2>
            <p className="adm__sub" style={{ marginTop: -8, marginBottom: 10 }}>
              Solo las ve quien entra al panel.
            </p>
            <label className="adm-field">
              <textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Precio cerrado, chofer asignado, lo que haga falta recordar…" />
            </label>
            <div className="adm-bar adm-bar--end" style={{ marginTop: 4 }}>
              <button
                className="adm-btn adm-btn--primary"
                type="button"
                disabled={saving === 'notes' || notes === b.notes}
                onClick={() => save({ notes }, 'notes', 'Notas guardadas.')}
              >
                {saving === 'notes' ? 'Guardando…' : 'Guardar notas'}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
