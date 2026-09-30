import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Check, Field, useToast } from '../ui';
import EtgNav from './EtgNav';

interface Cfg {
  currency: string;
  markupPercent: number;
  minAdvanceHours: number;
  freeCancelHours: number;
  latePenaltyPercent: number;
  waitAirport: number;
  waitOther: number;
  offerTtlHours: number;
  flightTracking: 'full' | 'partial' | 'none';
  bufferMinutes: number;
  tollsIncluded: boolean;
  gratuityIncluded: boolean;
  airports: string[];
  meetingInstructions: string;
  meetingImages: string[];
  roadFactor: number;
  avgSpeedKmh: number;
  publicUrl: string;
  logSearchBodies: boolean;
}

interface VehicleMap {
  slug: string;
  name: string;
  type: string;
  max_pax: number;
  visible: number;
  etg_enabled: number;
  etg_category: string | null;
  etg_car_model: string | null;
  etg_seats: number | null;
  etg_luggage: number | null;
}

interface SettingsResponse {
  config: Cfg;
  fromEnv: Record<string, boolean>;
  vehicles: VehicleMap[];
  categories: Record<string, [number, number]>;
  api: { env: string; configured: boolean; user: string | null; hosts: string[]; pathFallback: string };
  partners: { email: string; created_at: string }[];
}

const RD_AIRPORTS: [string, string][] = [
  ['PUJ', 'Punta Cana'],
  ['SDQ', 'Las Américas (Santo Domingo)'],
  ['STI', 'Cibao (Santiago)'],
  ['POP', 'Puerto Plata'],
  ['LRM', 'La Romana'],
  ['AZS', 'Samaná El Catey'],
  ['JBQ', 'La Isabela (Santo Domingo)'],
];

export default function EtgSettingsPage() {
  const toast = useToast();
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [vehicles, setVehicles] = useState<VehicleMap[]>([]);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [newAccess, setNewAccess] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(() => {
    api
      .get<SettingsResponse>('/etg/settings')
      .then((r) => {
        setData(r);
        setCfg(r.config);
        setVehicles(r.vehicles);
      })
      .catch((e) => toast(e.message, true));
  }, [toast]);
  useEffect(load, [load]);

  if (!data || !cfg) return <p className="adm-empty">Cargando…</p>;
  const setC = <K extends keyof Cfg>(k: K, v: Cfg[K]) => setCfg({ ...cfg, [k]: v });

  const saveCfg = async () => {
    try {
      await api.put('/etg/settings', {
        currency: cfg.currency,
        markup_percent: cfg.markupPercent,
        min_advance_hours: cfg.minAdvanceHours,
        free_cancel_hours: cfg.freeCancelHours,
        late_penalty_percent: cfg.latePenaltyPercent,
        wait_airport: cfg.waitAirport,
        wait_other: cfg.waitOther,
        offer_ttl_hours: cfg.offerTtlHours,
        flight_tracking: cfg.flightTracking,
        buffer_minutes: cfg.bufferMinutes,
        tolls_included: cfg.tollsIncluded ? '1' : '0',
        gratuity_included: cfg.gratuityIncluded ? '1' : '0',
        airports: cfg.airports,
        meeting_instructions: cfg.meetingInstructions,
        meeting_images: cfg.meetingImages.join('\n'),
        road_factor: cfg.roadFactor,
        avg_speed_kmh: cfg.avgSpeedKmh,
        public_url: cfg.publicUrl,
        log_search_bodies: cfg.logSearchBodies ? '1' : '0',
      });
      toast('Ajustes de ETG guardados.');
      load();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const saveVehicle = async (v: VehicleMap) => {
    try {
      await api.put(`/etg/vehicles/${v.slug}`, v);
      toast(`${v.name}: guardado.`);
      load();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const createPartner = async () => {
    try {
      const r = await api.post<{ email: string; password: string }>('/etg/partners', { email: partnerEmail });
      setNewAccess(r);
      setPartnerEmail('');
      load();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const removePartner = async (email: string) => {
    if (!window.confirm(`¿Quitar el acceso de ${email}?`)) return;
    await api.del(`/etg/partners/${encodeURIComponent(email)}`).catch((e) => toast(e.message, true));
    load();
  };

  const origin = window.location.origin;

  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">ETG · Ajustes</h1>
          <p className="adm__sub">Reglas con las que la API responde a ETG. Los precios salen de las Tarifas de la web.</p>
        </div>
      </div>
      <EtgNav />

      <section className="adm__card">
        <h2 className="adm__card-title">Estado de la API</h2>
        <dl className="adm-kvs">
          <div className="adm-kv">
            <dt>Entorno</dt>
            <dd>{data.api.env}</dd>
          </div>
          <div className="adm-kv">
            <dt>Credenciales</dt>
            <dd>
              {data.api.configured ? (
                <>
                  Configuradas · usuario <code>{data.api.user}</code> (la contraseña está en las variables del servidor)
                </>
              ) : (
                <span className="adm-warn">Sin ETG_API_USER / ETG_API_PASSWORD: la API está apagada en este servidor.</span>
              )}
            </dd>
          </div>
          <div className="adm-kv">
            <dt>URL para ETG</dt>
            <dd>
              {data.api.hosts.map((h) => (
                <div key={h}>
                  <code>https://{h}</code>
                </div>
              ))}
              <div className="adm__sub" style={{ fontSize: 12.5 }}>
                Alternativa sin subdominio: <code>{origin}{data.api.pathFallback}</code>
              </div>
            </dd>
          </div>
        </dl>
      </section>

      <section className="adm__card">
        <h2 className="adm__card-title">Reglas comerciales</h2>
        <div className="adm-grid adm-grid--3">
          <Field label="Moneda (ISO 4217)" hint={data.fromEnv.currency ? 'Fijada por variable de entorno.' : 'La del contrato con ETG.'}>
            <input value={cfg.currency} disabled={data.fromEnv.currency} maxLength={3} onChange={(e) => setC('currency', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Ajuste sobre el precio web (%)" hint="0 = mismo precio que la web.">
            <input type="number" step="0.5" value={cfg.markupPercent} disabled={data.fromEnv.markup_percent} onChange={(e) => setC('markupPercent', Number(e.target.value))} />
          </Field>
          <Field label="Anticipación mínima (h)" hint="Antes de esto no se ofrece el viaje.">
            <input type="number" min={0} value={cfg.minAdvanceHours} onChange={(e) => setC('minAdvanceHours', Number(e.target.value))} />
          </Field>
          <Field label="Cancelación gratis hasta (h antes)">
            <input type="number" min={0} value={cfg.freeCancelHours} onChange={(e) => setC('freeCancelHours', Number(e.target.value))} />
          </Field>
          <Field label="Penalidad fuera de plazo (%)" hint="Nunca más del precio.">
            <input type="number" min={0} max={100} value={cfg.latePenaltyPercent} onChange={(e) => setC('latePenaltyPercent', Number(e.target.value))} />
          </Field>
          <Field label="Vida de una oferta (h)" hint="Mínimo 24 por contrato.">
            <input type="number" min={24} value={cfg.offerTtlHours} onChange={(e) => setC('offerTtlHours', Number(e.target.value))} />
          </Field>
          <Field label="Espera incluida aeropuerto (min)">
            <input type="number" min={1} max={180} value={cfg.waitAirport} onChange={(e) => setC('waitAirport', Number(e.target.value))} />
          </Field>
          <Field label="Espera incluida otros puntos (min)">
            <input type="number" min={1} max={180} value={cfg.waitOther} onChange={(e) => setC('waitOther', Number(e.target.value))} />
          </Field>
          <Field label="Seguimiento de vuelo">
            <select value={cfg.flightTracking} onChange={(e) => setC('flightTracking', e.target.value as Cfg['flightTracking'])}>
              <option value="full">Completo (vuelo o "No flight")</option>
              <option value="partial">Parcial ("NO FLIGHT TRACKING" en el comentario)</option>
              <option value="none">Sin seguimiento</option>
            </select>
          </Field>
          <Field label="Margen tras aterrizar (min)" hint="Solo con seguimiento y recogida en aeropuerto.">
            <input type="number" min={0} value={cfg.bufferMinutes} onChange={(e) => setC('bufferMinutes', Number(e.target.value))} />
          </Field>
          <Field label="Distancia: factor carretera" hint="Línea recta × este factor.">
            <input type="number" step="0.05" min={1} value={cfg.roadFactor} onChange={(e) => setC('roadFactor', Number(e.target.value))} />
          </Field>
          <Field label="Velocidad media (km/h)" hint="Para la duración estimada.">
            <input type="number" min={10} value={cfg.avgSpeedKmh} onChange={(e) => setC('avgSpeedKmh', Number(e.target.value))} />
          </Field>
        </div>
        <Check label="Peajes incluidos en el precio" checked={cfg.tollsIncluded} onChange={(v) => setC('tollsIncluded', v)} />
        <Check label="Propina incluida en el precio" checked={cfg.gratuityIncluded} onChange={(v) => setC('gratuityIncluded', v)} />

        <h3 className="adm-etg-h3">Aeropuertos con servicio</h3>
        <div className="adm-zone-picker">
          {RD_AIRPORTS.map(([code, name]) => {
            const on = cfg.airports.includes(code);
            return (
              <button
                key={code}
                type="button"
                className={`adm-pill adm-pill--btn${on ? ' adm-pill--on' : ''}`}
                onClick={() => setC('airports', on ? cfg.airports.filter((a) => a !== code) : [...cfg.airports, code])}
              >
                {code} · {name}
              </button>
            );
          })}
        </div>

        <div className="adm-grid">
          <Field label="Instrucciones de encuentro (en inglés)" hint="Sin mencionar a la empresa. Se envían en recogidas en aeropuerto." full>
            <textarea rows={3} value={cfg.meetingInstructions} onChange={(e) => setC('meetingInstructions', e.target.value)} />
          </Field>
          <Field label="Fotos del punto de encuentro (URLs, una por línea)" full>
            <textarea rows={2} value={cfg.meetingImages.join('\n')} onChange={(e) => setC('meetingImages', e.target.value.split('\n'))} />
          </Field>
          <Field label="Dirección pública del panel" hint="Base del enlace de cada orden que recibe ETG.">
            <input value={cfg.publicUrl} disabled={data.fromEnv.public_url} onChange={(e) => setC('publicUrl', e.target.value)} />
          </Field>
        </div>
        <Check
          label="Guardar el cuerpo completo de cada búsqueda en los logs (ocupa mucho; solo para depurar)"
          checked={cfg.logSearchBodies}
          onChange={(v) => setC('logSearchBodies', v)}
        />
        <div className="adm-bar adm-bar--end">
          <button className="adm-btn adm-btn--primary" type="button" onClick={saveCfg}>
            Guardar reglas
          </button>
        </div>
      </section>

      <section className="adm__card">
        <h2 className="adm__card-title">Flota para ETG</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
          Cada vehículo se ofrece en una categoría de ETG. Modelo: marca y modelo reales de la flota (sin «or similar»), varios
          separados por coma. Las plazas deben estar en el rango de la categoría. El precio es el de Tarifas.
        </p>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Vehículo</th>
              <th>En ETG</th>
              <th>Categoría</th>
              <th>Modelos</th>
              <th>Plazas</th>
              <th>Maletas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v, i) => {
              const upd = (patch: Partial<VehicleMap>) => setVehicles(vehicles.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              const range = v.etg_category ? data.categories[v.etg_category] : null;
              return (
                <tr key={v.slug} className={v.etg_enabled ? '' : 'is-off'}>
                  <td>
                    <strong>{v.name}</strong>
                    <div className="adm__sub" style={{ fontSize: 12 }}>
                      {v.type} · web hasta {v.max_pax} pax
                    </div>
                  </td>
                  <td>
                    <input type="checkbox" checked={Boolean(v.etg_enabled)} onChange={(e) => upd({ etg_enabled: e.target.checked ? 1 : 0 })} />
                  </td>
                  <td>
                    <select value={v.etg_category ?? ''} onChange={(e) => upd({ etg_category: e.target.value || null })}>
                      <option value="">—</option>
                      {Object.entries(data.categories).map(([c, [a, b]]) => (
                        <option key={c} value={c}>
                          {c} ({a}–{b})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input value={v.etg_car_model ?? ''} style={{ minWidth: 200 }} onChange={(e) => upd({ etg_car_model: e.target.value })} />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={range?.[0] ?? 1}
                      max={range?.[1] ?? 100}
                      value={v.etg_seats ?? ''}
                      onChange={(e) => upd({ etg_seats: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input type="number" min={1} value={v.etg_luggage ?? ''} onChange={(e) => upd({ etg_luggage: e.target.value === '' ? null : Number(e.target.value) })} />
                  </td>
                  <td>
                    <button className="adm-btn adm-btn--sm" type="button" onClick={() => saveVehicle(v)}>
                      Guardar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="adm__card">
        <h2 className="adm__card-title">Acceso para el soporte de ETG</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
          Entran por este mismo panel y solo ven las órdenes de ETG (ver, modificar, cancelar). La contraseña se muestra una sola
          vez: pásasela a ETG por un canal seguro.
        </p>
        {newAccess && (
          <div className="adm-etg-access">
            <strong>Acceso creado</strong>
            <div>
              Panel: <code>{origin}/admin/etg/orders</code>
            </div>
            <div>
              Usuario: <code>{newAccess.email}</code>
            </div>
            <div>
              Contraseña: <code>{newAccess.password}</code>
            </div>
          </div>
        )}
        {data.partners.length > 0 && (
          <table className="adm-table" style={{ marginBottom: 12 }}>
            <tbody>
              {data.partners.map((p) => (
                <tr key={p.email}>
                  <td>{p.email}</td>
                  <td className="adm__sub">desde {p.created_at}</td>
                  <td>
                    <div className="adm-table__actions">
                      <button className="adm-btn adm-btn--sm" type="button" onClick={async () => {
                        const r = await api.post<{ email: string; password: string }>('/etg/partners', { email: p.email });
                        setNewAccess(r);
                      }}>
                        Nueva contraseña
                      </button>
                      <button className="adm-btn adm-btn--icon adm-btn--danger" type="button" aria-label="Quitar acceso" onClick={() => removePartner(p.email)}>
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="adm-bar">
          <input type="email" placeholder="correo@etg…" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} style={{ minWidth: 260 }} />
          <button className="adm-btn adm-btn--primary" type="button" onClick={createPartner} disabled={!partnerEmail}>
            Crear acceso
          </button>
        </div>
      </section>
    </>
  );
}
