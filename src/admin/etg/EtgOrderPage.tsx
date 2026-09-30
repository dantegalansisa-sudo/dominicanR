import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Field, useToast } from '../ui';
import { fmtLocal } from './EtgOrdersPage';
import { etgText } from './i18n';

interface Point {
  type?: string;
  iata?: string;
  address?: string;
  coordinates?: { lat: number; lon: number };
  resolved?: { label?: string; lat?: number; lon?: number };
}

interface OrderDetail {
  order_code: string;
  offer_id: string;
  env: string;
  created_at: string;
  updated_at: string;
  status: 'confirmed' | 'cancelled';
  internal_status: string;
  start_wall: string;
  start_time: string;
  tz: string;
  start_point: Point;
  end_point: Point;
  passengers: number;
  luggage_places: number;
  sport_luggage: number;
  wheelchairs: number;
  animals: number;
  children_seats: number[];
  flight_number: string;
  comment: string | null;
  shield_text: string | null;
  main_passenger: { first_name: string; last_name: string; middle_name?: string; phone: string; email: string };
  upsells: { id: string; type: string; count: number; price: number }[];
  transfer_category: string;
  vehicle_slug: string | null;
  distance: number | null;
  duration_min: number | null;
  waiting_min: number | null;
  price: number;
  currency: string;
  free_cancel_until: string;
  penalty: number | null;
  penalty_if_cancelled_now: number | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  driver_first_name: string | null;
  driver_last_name: string | null;
  driver_phone: string | null;
  carrier_company: string | null;
  car_model: string | null;
  car_plate: string | null;
  car_color: string | null;
  notes: string | null;
  supplier_link: string;
}

interface Change {
  id: number;
  at: string;
  who: string;
  changes: string;
  old_price: number | null;
  new_price: number | null;
}

const pointText = (p: Point) => p.address || p.resolved?.label || p.iata || '';
const mapLink = (p: Point) => {
  const lat = p.coordinates?.lat ?? p.resolved?.lat;
  const lon = p.coordinates?.lon ?? p.resolved?.lon;
  return lat != null && lon != null ? `https://www.google.com/maps?q=${lat},${lon}` : null;
};

const KV = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="adm-kv">
    <dt>{k}</dt>
    <dd>{children}</dd>
  </div>
);

/** El formulario: solo lo que cambió se manda. */
type Draft = Record<string, string>;

export default function EtgOrderPage({ partner }: { partner: boolean }) {
  const { code = '' } = useParams();
  const toast = useToast();
  const t = etgText(partner);
  const [data, setData] = useState<{ order: OrderDetail; changes: Change[]; categories: string[]; status_preview: unknown } | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    api
      .get<NonNullable<typeof data>>(`/etg/orders/${encodeURIComponent(code)}`)
      .then((r) => {
        setData(r);
        const o = r.order;
        setDraft({
          start_wall: o.start_wall.slice(0, 16),
          passengers: String(o.passengers),
          luggage_places: String(o.luggage_places),
          sport_luggage: String(o.sport_luggage),
          wheelchairs: String(o.wheelchairs),
          animals: String(o.animals),
          first_name: o.main_passenger.first_name ?? '',
          last_name: o.main_passenger.last_name ?? '',
          phone: o.main_passenger.phone ?? '',
          flight_number: o.flight_number,
          shield_text: o.shield_text ?? '',
          comment: o.comment ?? '',
          transfer_category: o.transfer_category,
          price: String(o.price),
          driver_first_name: o.driver_first_name ?? '',
          driver_last_name: o.driver_last_name ?? '',
          driver_phone: o.driver_phone ?? '',
          carrier_company: o.carrier_company ?? '',
          car_model: o.car_model ?? '',
          car_plate: o.car_plate ?? '',
          car_color: o.car_color ?? '',
          internal_status: o.internal_status,
          notes: o.notes ?? '',
        });
      })
      .catch((e) => {
        if (e.status === 404) setNotFound(true);
        else toast(e.message, true);
      });
  }, [code, toast]);

  useEffect(load, [load]);

  if (notFound) {
    return (
      <p className="adm-empty">
        {t.notFound(code)} <Link to="/admin/etg/orders">{t.seeAll}</Link>
      </p>
    );
  }
  if (!data) return <p className="adm-empty">{t.loading}</p>;
  const o = data.order;
  const cancelled = o.status === 'cancelled';
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setDraft({ ...draft, [k]: e.target.value });

  const save = async (fields: string[]) => {
    const numeric = new Set(['passengers', 'luggage_places', 'sport_luggage', 'wheelchairs', 'animals', 'price']);
    const original: Record<string, string> = {
      start_wall: o.start_wall.slice(0, 16),
      passengers: String(o.passengers),
      luggage_places: String(o.luggage_places),
      sport_luggage: String(o.sport_luggage),
      wheelchairs: String(o.wheelchairs),
      animals: String(o.animals),
      first_name: o.main_passenger.first_name ?? '',
      last_name: o.main_passenger.last_name ?? '',
      phone: o.main_passenger.phone ?? '',
      flight_number: o.flight_number,
      shield_text: o.shield_text ?? '',
      comment: o.comment ?? '',
      transfer_category: o.transfer_category,
      price: String(o.price),
      driver_first_name: o.driver_first_name ?? '',
      driver_last_name: o.driver_last_name ?? '',
      driver_phone: o.driver_phone ?? '',
      carrier_company: o.carrier_company ?? '',
      car_model: o.car_model ?? '',
      car_plate: o.car_plate ?? '',
      car_color: o.car_color ?? '',
      internal_status: o.internal_status,
      notes: o.notes ?? '',
    };
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      if (draft[f] === original[f]) continue;
      body[f] = numeric.has(f) ? Number(draft[f]) : draft[f];
    }
    if (Object.keys(body).length === 0) {
      toast(t.noChanges);
      return;
    }
    setSaving(true);
    try {
      await api.put(`/etg/orders/${encodeURIComponent(o.order_code)}`, body);
      toast(t.saved);
      load();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  const doCancel = async () => {
    const pen = o.penalty_if_cancelled_now ?? 0;
    const msg = pen > 0 ? t.confirmCancelPenalty(o.order_code, o.currency, pen) : t.confirmCancelFree(o.order_code);
    if (!window.confirm(msg)) return;
    try {
      const r = await api.post<{ penalty: { amount: number; currency: string } }>(`/etg/orders/${encodeURIComponent(o.order_code)}/cancel`);
      toast(t.cancelled(r.penalty.currency, r.penalty.amount));
      load();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const seats = o.children_seats.map((n, i) => (n ? t.seatType(n, i) : '')).filter(Boolean);
  const startMap = mapLink(o.start_point);
  const endMap = mapLink(o.end_point);

  const tripFields = ['start_wall', 'passengers', 'luggage_places', 'sport_luggage', 'wheelchairs', 'animals', 'flight_number', 'transfer_category', 'price'];
  const paxFields = ['first_name', 'last_name', 'phone', 'shield_text', 'comment'];
  const driverFields = ['driver_first_name', 'driver_last_name', 'driver_phone', 'carrier_company', 'car_model', 'car_plate', 'car_color', 'internal_status', 'notes'];

  return (
    <>
      <div className="adm__head">
        <div>
          <Link to="/admin/etg/orders" className="adm__sub">
            {t.back}
          </Link>
          <h1 className="adm__title">
            {o.order_code}{' '}
            <span className={`adm-pill${cancelled ? '' : ' adm-pill--on'}`} style={{ verticalAlign: 'middle' }}>
              {cancelled ? t.statusCancelled : t.statusActive}
            </span>
          </h1>
          <p className="adm__sub">
            {t.pickupLine} {fmtLocal(o.start_time, partner)} ({t.localTime}) · {o.transfer_category} · {o.currency} {o.price}
            {o.env && o.env !== 'production' ? ` · ${t.env} ${o.env}` : ''}
          </p>
        </div>
        {!cancelled && (
          <button className="adm-btn adm-btn--danger" type="button" onClick={doCancel}>
            {t.cancelOrder}
          </button>
        )}
      </div>

      <div className="adm-two">
        <div>
          <section className="adm__card">
            <h2 className="adm__card-title">{t.itinerary}</h2>
            <dl className="adm-kvs">
              <KV k={t.kPickup}>{fmtLocal(o.start_time, partner)}</KV>
              <KV k={t.kFrom}>
                {pointText(o.start_point)}
                {o.start_point.iata && <div className="adm__sub">{t.airport} {o.start_point.iata}</div>}
                {startMap && (
                  <a className="adm-maplink" href={startMap} target="_blank" rel="noopener noreferrer">
                    {t.map}
                  </a>
                )}
              </KV>
              <KV k={t.kTo}>
                {pointText(o.end_point)}
                {o.end_point.iata && <div className="adm__sub">{t.airport} {o.end_point.iata}</div>}
                {endMap && (
                  <a className="adm-maplink" href={endMap} target="_blank" rel="noopener noreferrer">
                    {t.map}
                  </a>
                )}
              </KV>
              <KV k={t.kFlight}>{o.flight_number}</KV>
              <KV k={t.kPassengers}>
                {o.passengers} · {t.luggage} {o.luggage_places}
                {o.sport_luggage ? ` · ${t.sport} ${o.sport_luggage}` : ''}
                {o.wheelchairs ? ` · ${t.wheelchairs} ${o.wheelchairs}` : ''}
                {o.animals ? ` · ${t.animals} ${o.animals}` : ''}
              </KV>
              {seats.length > 0 && <KV k={t.kSeats}>{seats.join(', ')}</KV>}
              {o.upsells.length > 0 && (
                <KV k={t.kExtras}>{o.upsells.map((u) => `${u.count} × ${u.type} (${o.currency} ${u.price})`).join(', ')}</KV>
              )}
              <KV k={t.kSign}>{o.shield_text || '—'}</KV>
              <KV k={t.kComment}>
                <span style={{ whiteSpace: 'pre-wrap' }}>{o.comment || '—'}</span>
              </KV>
              <KV k={t.kDistance}>
                {t.distanceLine(String(o.distance ?? '—'), String(o.duration_min ?? '—'), String(o.waiting_min ?? '—'))}
              </KV>
            </dl>
          </section>

          {!cancelled && (
            <>
              <section className="adm__card">
                <h2 className="adm__card-title">{t.modifyTrip}</h2>
                <div className="adm-grid adm-grid--3">
                  <Field label={t.fDate}>
                    <input type="datetime-local" value={draft.start_wall} onChange={set('start_wall')} />
                  </Field>
                  <Field label={t.fPassengers}>
                    <input type="number" min={1} value={draft.passengers} onChange={set('passengers')} />
                  </Field>
                  <Field label={t.fLuggage}>
                    <input type="number" min={0} value={draft.luggage_places} onChange={set('luggage_places')} />
                  </Field>
                  <Field label={t.fSport}>
                    <input type="number" min={0} value={draft.sport_luggage} onChange={set('sport_luggage')} />
                  </Field>
                  <Field label={t.fWheelchairs}>
                    <input type="number" min={0} value={draft.wheelchairs} onChange={set('wheelchairs')} />
                  </Field>
                  <Field label={t.fAnimals}>
                    <input type="number" min={0} value={draft.animals} onChange={set('animals')} />
                  </Field>
                  <Field label={t.fFlight}>
                    <input value={draft.flight_number} onChange={set('flight_number')} />
                  </Field>
                  <Field label={t.fCategory}>
                    <select value={draft.transfer_category} onChange={set('transfer_category')}>
                      {data.categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t.fPrice(o.currency)} hint={t.fPriceHint}>
                    <input type="number" min={1} step="0.01" value={draft.price} onChange={set('price')} />
                  </Field>
                </div>
                <div className="adm-bar adm-bar--end">
                  <button className="adm-btn adm-btn--primary" type="button" disabled={saving} onClick={() => save(tripFields)}>
                    {t.saveTrip}
                  </button>
                </div>
              </section>

              <section className="adm__card">
                <h2 className="adm__card-title">{t.paxTitle}</h2>
                <div className="adm-grid">
                  <Field label={t.fFirst}>
                    <input value={draft.first_name} onChange={set('first_name')} />
                  </Field>
                  <Field label={t.fLast}>
                    <input value={draft.last_name} onChange={set('last_name')} />
                  </Field>
                  <Field label={t.fPhone}>
                    <input value={draft.phone} onChange={set('phone')} />
                  </Field>
                  <Field label={t.fSign}>
                    <input value={draft.shield_text} onChange={set('shield_text')} />
                  </Field>
                  <Field label={t.fComment} full>
                    <textarea rows={3} value={draft.comment} onChange={set('comment')} />
                  </Field>
                </div>
                <div className="adm-bar adm-bar--end">
                  <button className="adm-btn adm-btn--primary" type="button" disabled={saving} onClick={() => save(paxFields)}>
                    {t.savePax}
                  </button>
                </div>
              </section>

              {!partner && (
                <section className="adm__card">
                  <h2 className="adm__card-title">Chofer y vehículo</h2>
                  <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
                    ETG lo recibe en su consulta de estado. Nombre y apellido del chofer y el modelo, en letras latinas; el
                    color en inglés (white, black, silver…). Sin teléfono no se envía el chofer; sin modelo y placa, el coche.
                  </p>
                  <div className="adm-grid adm-grid--3">
                    <Field label="Nombre del chofer">
                      <input value={draft.driver_first_name} onChange={set('driver_first_name')} />
                    </Field>
                    <Field label="Apellido del chofer">
                      <input value={draft.driver_last_name} onChange={set('driver_last_name')} />
                    </Field>
                    <Field label="Teléfono del chofer" hint="Varios, separados por coma.">
                      <input value={draft.driver_phone} onChange={set('driver_phone')} />
                    </Field>
                    <Field label="Empresa (si no hay chofer aún)">
                      <input value={draft.carrier_company} onChange={set('carrier_company')} />
                    </Field>
                    <Field label="Coche (marca y modelo)">
                      <input value={draft.car_model} onChange={set('car_model')} placeholder="Toyota Corolla" />
                    </Field>
                    <Field label="Placa">
                      <input value={draft.car_plate} onChange={set('car_plate')} />
                    </Field>
                    <Field label="Color (en inglés)">
                      <input value={draft.car_color} onChange={set('car_color')} placeholder="white" />
                    </Field>
                    <Field label="Estado interno">
                      <select value={draft.internal_status} onChange={set('internal_status')}>
                        <option value="confirmed">Confirmada</option>
                        <option value="assigned">Chofer asignado</option>
                        <option value="in_progress">En curso</option>
                        <option value="done">Realizada</option>
                        <option value="no_show">No se presentó</option>
                      </select>
                    </Field>
                    <Field label="Notas internas" full>
                      <textarea rows={2} value={draft.notes} onChange={set('notes')} />
                    </Field>
                  </div>
                  <div className="adm-bar adm-bar--end">
                    <button className="adm-btn adm-btn--primary" type="button" disabled={saving} onClick={() => save(driverFields)}>
                      Guardar chofer y vehículo
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <aside>
          <section className="adm__card">
            <h2 className="adm__card-title">{t.priceTitle}</h2>
            <dl className="adm-kvs">
              <KV k={t.kPrice}>
                {o.currency} {o.price}
              </KV>
              <KV k={t.kFreeCancel}>{fmtLocal(o.free_cancel_until, partner)}</KV>
              {cancelled ? (
                <>
                  <KV k={t.kCancelledAt}>{o.cancelled_at} UTC</KV>
                  <KV k={t.kPenalty}>
                    {o.currency} {o.penalty ?? 0}
                  </KV>
                </>
              ) : (
                <KV k={t.kIfCancelNow}>
                  {o.currency} {o.penalty_if_cancelled_now ?? 0}
                </KV>
              )}
            </dl>
          </section>
          <section className="adm__card">
            <h2 className="adm__card-title">{t.mainPax}</h2>
            <dl className="adm-kvs">
              <KV k={t.kName}>
                {o.main_passenger.first_name} {o.main_passenger.middle_name ?? ''} {o.main_passenger.last_name}
              </KV>
              <KV k={t.kPhone}>{o.main_passenger.phone}</KV>
              <KV k={t.kEmail}>{o.main_passenger.email}</KV>
            </dl>
          </section>
          {data.changes.length > 0 && (
            <section className="adm__card">
              <h2 className="adm__card-title">{t.history}</h2>
              {data.changes.map((c) => (
                <div key={c.id} className="adm-etg-change">
                  <div className="adm__sub" style={{ fontSize: 12.5 }}>
                    {c.at} UTC · {c.who.replace(/^partner_etg:/, 'ETG · ').replace(/^admin:/, '')}
                  </div>
                  <ul>
                    {Object.entries(JSON.parse(c.changes) as Record<string, [unknown, unknown]>).map(([k, [a, b]]) => (
                      <li key={k}>
                        <strong>{k}</strong>: {String(a ?? '—')} → {String(b ?? '—')}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
          {!partner && (
            <section className="adm__card">
              <h2 className="adm__card-title">Lo que ETG ve en /status</h2>
              <pre className="adm-pre" style={{ fontSize: 12 }}>
                {JSON.stringify(data.status_preview, null, 2)}
              </pre>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
