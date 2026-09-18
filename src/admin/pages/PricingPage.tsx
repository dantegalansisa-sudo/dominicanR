import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, parseJson } from '../api';
import type { BracketRow, RouteRow, SurchargeRow, VehicleRow, ZoneRow } from '../api';
import { useToast } from '../ui';

type Prices = Record<string, number>;

/** Lo que se edita en pantalla: precios ya abiertos y por slug. */
interface BracketDraft {
  up_to: number | null;
  prices: Prices;
}
interface SurchargeDraft {
  label: string;
  zones_a: string;
  zones_b: string;
  prices: Prices;
}

const legacy = (r: { sedan: number; minivan: number; minibus: number; vip: number }): Prices => ({
  sedan: r.sedan,
  minivan: r.minivan,
  minibus: r.minibus,
  'vip-luxury': r.vip,
});

/** Una casilla de precio: vacía = a cotizar. */
function PriceCell({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      value={value ?? ''}
      placeholder="—"
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
    />
  );
}

const setPrice = (prices: Prices, slug: string, v: number | undefined): Prices => {
  const next = { ...prices };
  if (v === undefined) delete next[slug];
  else next[slug] = v;
  return next;
};

/**
 * Zonas de un recargo antiguo. Se ven como fichas ordenadas; el lápiz abre el
 * selector con todas las zonas para marcar y desmarcar.
 */
function ZonesInput({ value, zones, onChange }: { value: string; zones: ZoneRow[]; onChange: (v: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const ids = parseJson<string[]>(value, []);
  const label = (id: string) => zones.find((z) => z.id === id)?.label ?? id;
  const toggle = (id: string) => onChange(ids.includes(id) ? ids.filter((z) => z !== id) : [...ids, id]);
  return (
    <div className="adm-zones">
      <div className="adm-zones__list">
        {ids.length === 0 && <span className="adm__sub">Sin zonas</span>}
        {ids.map((id) => (
          <span key={id} className="adm-chip">
            {label(id)}
          </span>
        ))}
        <button
          type="button"
          className={`adm-chip adm-chip--edit${editing ? ' is-on' : ''}`}
          onClick={() => setEditing((e) => !e)}
          aria-label={editing ? 'Cerrar' : 'Editar zonas'}
        >
          {editing ? '✓' : '✎'}
        </button>
      </div>
      {editing && (
        <div className="adm-zones__picker">
          {zones.map((z) => (
            <button
              key={z.id}
              type="button"
              className={`adm-chip${ids.includes(z.id) ? ' is-on' : ''}`}
              onClick={() => toggle(z.id)}
            >
              {z.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Los cuatro principales o el resto: ocho columnas de precio no caben. */
function FleetToggle({ value, onChange, fleet }: { value: 'main' | 'rest'; onChange: (v: 'main' | 'rest') => void; fleet: VehicleRow[] }) {
  const rest = fleet.filter((v) => !v.featured).length;
  return (
    <div className="adm-tabs" style={{ marginBottom: 0 }}>
      <button type="button" className={value === 'main' ? 'is-active' : ''} onClick={() => onChange('main')}>
        Flota principal
      </button>
      <button type="button" className={value === 'rest' ? 'is-active' : ''} onClick={() => onChange('rest')}>
        Más flota ({rest})
      </button>
    </div>
  );
}

export default function PricingPage() {
  const toast = useToast();
  const [fleet, setFleet] = useState<VehicleRow[]>([]);
  const [brackets, setBrackets] = useState<BracketDraft[] | null>(null);
  const [surcharges, setSurcharges] = useState<SurchargeDraft[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [routeDrafts, setRouteDrafts] = useState<Record<number, Prices>>({});
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [group, setGroup] = useState<'main' | 'rest'>('main');

  const load = useCallback(async () => {
    const [p, v] = await Promise.all([
      api.get<{ brackets: BracketRow[]; surcharges: SurchargeRow[]; zones: ZoneRow[]; routes: RouteRow[] }>('/pricing'),
      api.get<{ vehicles: VehicleRow[] }>('/vehicles'),
    ]);
    setFleet(v.vehicles);
    setBrackets(p.brackets.map((b) => ({ up_to: b.up_to, prices: parseJson<Prices>(b.prices, legacy(b)) })));
    setSurcharges(
      p.surcharges.map((s) => ({ label: s.label, zones_a: s.zones_a, zones_b: s.zones_b, prices: parseJson<Prices>(s.prices, legacy(s)) })),
    );
    setRoutes(p.routes);
    setRouteDrafts(Object.fromEntries(p.routes.map((r) => [r.id, parseJson<Prices>(r.prices, {})])));
    setZones(p.zones);
  }, []);

  useEffect(() => {
    load().catch((e) => toast(e.message, true));
  }, [load, toast]);

  if (!brackets) return <p className="adm-empty">Cargando…</p>;

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setSaving(key);
    try {
      await fn();
      await load();
      toast(ok);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(null);
    }
  };

  // Las columnas que se ven; los precios de las otras siguen en memoria y se
  // guardan igual, solo que no se muestran.
  const shown = fleet.filter((v) => (group === 'main' ? v.featured : !v.featured));

  const VehicleHeads = () => (
    <>
      {shown.map((v) => (
        <th key={v.slug} title={v.type}>
          {v.name}
        </th>
      ))}
    </>
  );

  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">Tarifas de traslado</h1>
          <p className="adm__sub">
            Aquí se revisa, corrige y borra. Para añadir rutas, recargos o tramos nuevos, ve a{' '}
            <Link to="/admin/nueva-tarifa">Nueva tarifa</Link>. Todo en US$; una casilla vacía = a cotizar.
          </p>
        </div>
        <div className="adm-bar">
          <FleetToggle value={group} onChange={setGroup} fleet={fleet} />
          <Link className="adm-btn adm-btn--primary" to="/admin/nueva-tarifa">
            + Nueva tarifa
          </Link>
        </div>
      </div>

      {/* ------------------------------------ rutas y recargos, una sola lista */}
      <section className="adm__card">
        <h2 className="adm__card-title">Rutas y recargos por zona</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
          Todo lo que cambia el precio de un viaje concreto, en una sola lista. <strong>Precio cerrado</strong>: origen y
          destino elegidos con Google y precio total por vehículo (manda sobre el cálculo por km). <strong>Recargo</strong>:
          se suma al tramo por km cuando el viaje une una zona del grupo A con una del grupo B. Las dos valen en ambos
          sentidos. Para añadir, ve a <Link to="/admin/nueva-tarifa">Nueva tarifa</Link>.
        </p>
        {routes.length === 0 && surcharges.length === 0 ? (
          <p className="adm-empty">
            Todavía no hay rutas ni recargos. <Link to="/admin/nueva-tarifa">Añade la primera</Link>.
          </p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Ruta</th>
                <th>Tipo</th>
                <th>Km</th>
                <VehicleHeads />
                <th />
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => {
                const prices = routeDrafts[r.id] ?? {};
                return (
                  <tr key={`r-${r.id}`} className={r.visible ? '' : 'is-off'}>
                    <td style={{ minWidth: 220 }}>
                      <strong>{r.label}</strong>
                      <div className="adm__sub" style={{ marginTop: 2, fontSize: 12.5 }}>
                        {r.a_text.split(',')[0]} ↔ {r.b_text.split(',')[0]}
                      </div>
                    </td>
                    <td>
                      <span className="adm-pill adm-pill--on">Precio cerrado</span>
                    </td>
                    <td>{r.km != null ? Math.round(r.km) : '—'}</td>
                    {shown.map((v) => (
                      <td key={v.slug}>
                        <PriceCell
                          value={prices[v.slug]}
                          onChange={(val) => setRouteDrafts({ ...routeDrafts, [r.id]: setPrice(prices, v.slug, val) })}
                        />
                      </td>
                    ))}
                    <td>
                      <div className="adm-table__actions">
                        <button
                          className="adm-btn adm-btn--sm"
                          type="button"
                          disabled={saving === `route-${r.id}`}
                          onClick={() => run(`route-${r.id}`, () => api.put(`/pricing/routes/${r.id}`, { prices }), 'Ruta guardada.')}
                        >
                          Guardar
                        </button>
                        <button
                          className="adm-btn adm-btn--icon adm-btn--danger"
                          type="button"
                          aria-label="Borrar ruta"
                          onClick={() => {
                            if (window.confirm(`¿Borrar la ruta "${r.label}"?`))
                              run(`del-${r.id}`, () => api.del(`/pricing/routes/${r.id}`), 'Ruta borrada.');
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {surcharges.map((s, i) => (
                <tr key={`s-${i}`}>
                  <td style={{ minWidth: 220 }}>
                    <input
                      value={s.label}
                      style={{ minWidth: 160 }}
                      onChange={(e) => setSurcharges(surcharges.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    />
                    <div className="adm-zones-pair">
                      <ZonesInput value={s.zones_a} zones={zones} onChange={(v) => setSurcharges(surcharges.map((x, j) => (j === i ? { ...x, zones_a: JSON.stringify(v) } : x)))} />
                      <span className="adm-zones-pair__arrow" aria-hidden="true">↔</span>
                      <ZonesInput value={s.zones_b} zones={zones} onChange={(v) => setSurcharges(surcharges.map((x, j) => (j === i ? { ...x, zones_b: JSON.stringify(v) } : x)))} />
                    </div>
                  </td>
                  <td>
                    <span className="adm-pill">Recargo</span>
                  </td>
                  <td>—</td>
                  {shown.map((v) => (
                    <td key={v.slug}>
                      <PriceCell
                        value={s.prices[v.slug]}
                        onChange={(val) => setSurcharges(surcharges.map((x, j) => (j === i ? { ...x, prices: setPrice(x.prices, v.slug, val) } : x)))}
                      />
                    </td>
                  ))}
                  <td>
                    <div className="adm-table__actions">
                      <button
                        className="adm-btn adm-btn--sm"
                        type="button"
                        disabled={saving === 'surcharges'}
                        onClick={() => run('surcharges', () => api.put('/pricing/surcharges', { surcharges }), 'Recargo guardado.')}
                      >
                        Guardar
                      </button>
                      <button
                        className="adm-btn adm-btn--icon adm-btn--danger"
                        type="button"
                        aria-label="Quitar recargo"
                        onClick={() => {
                          if (window.confirm(`¿Borrar el recargo "${s.label}"?`)) {
                            const rest = surcharges.filter((_, j) => j !== i);
                            run('surcharges', () => api.put('/pricing/surcharges', { surcharges: rest }), 'Recargo borrado.');
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ---------------------------------------------------------- tramos */}
      <section className="adm__card">
        <h2 className="adm__card-title">Tramos por distancia</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
          Para cualquier viaje sin ruta cerrada: se mira cuántos km hay por carretera y se cobra el tramo. "Hasta km"
          vacío en el último = abierto. Un tramo no puede cobrar menos que el anterior.
        </p>
        <table className="adm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Hasta km</th>
              <VehicleHeads />
              <th />
            </tr>
          </thead>
          <tbody>
            {brackets.map((b, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>
                  <input
                    type="number"
                    min={1}
                    value={b.up_to ?? ''}
                    placeholder="abierto"
                    onChange={(e) =>
                      setBrackets(brackets.map((x, j) => (j === i ? { ...x, up_to: e.target.value === '' ? null : Number(e.target.value) } : x)))
                    }
                  />
                </td>
                {shown.map((v) => (
                  <td key={v.slug}>
                    <PriceCell
                      value={b.prices[v.slug]}
                      onChange={(val) => setBrackets(brackets.map((x, j) => (j === i ? { ...x, prices: setPrice(x.prices, v.slug, val) } : x)))}
                    />
                  </td>
                ))}
                <td>
                  <button
                    className="adm-btn adm-btn--icon adm-btn--danger"
                    type="button"
                    aria-label="Quitar tramo"
                    onClick={() => setBrackets(brackets.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="adm-bar adm-bar--end">
          <button
            className="adm-btn adm-btn--primary"
            type="button"
            disabled={saving === 'brackets'}
            onClick={() => run('brackets', () => api.put('/pricing/brackets', { brackets }), 'Tramos guardados.')}
          >
            {saving === 'brackets' ? 'Guardando…' : 'Guardar tramos'}
          </button>
        </div>
      </section>

    </>
  );
}
