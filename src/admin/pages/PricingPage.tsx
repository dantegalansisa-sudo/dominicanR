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

/** Zonas de un recargo antiguo, como pastillas que se marcan y desmarcan. */
function ZonesInput({ value, zones, onChange }: { value: string; zones: ZoneRow[]; onChange: (v: string[]) => void }) {
  const ids = parseJson<string[]>(value, []);
  const toggle = (id: string) => onChange(ids.includes(id) ? ids.filter((z) => z !== id) : [...ids, id]);
  return (
    <details>
      <summary style={{ cursor: 'pointer', fontSize: 13.5 }}>
        {ids.length ? ids.map((id) => zones.find((z) => z.id === id)?.label ?? id).join(', ') : 'Elegir zonas…'}
      </summary>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, maxWidth: 360 }}>
        {zones.map((z) => (
          <button
            key={z.id}
            type="button"
            className={`adm-pill${ids.includes(z.id) ? ' adm-pill--on' : ''}`}
            style={{ cursor: 'pointer', border: 0 }}
            onClick={() => toggle(z.id)}
          >
            {z.label}
          </button>
        ))}
      </div>
    </details>
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

  const VehicleHeads = () => (
    <>
      {fleet.map((v) => (
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
            Aquí se revisa, corrige y borra. Para añadir tramos o rutas nuevas, ve a{' '}
            <Link to="/admin/nueva-tarifa">Nueva tarifa</Link>. Todo en US$; una casilla vacía = a cotizar.
          </p>
        </div>
        <Link className="adm-btn adm-btn--primary" to="/admin/nueva-tarifa">
          + Nueva tarifa
        </Link>
      </div>

      {/* ------------------------------------------------------ rutas fijas */}
      <section className="adm__card">
        <h2 className="adm__card-title">Rutas con precio cerrado</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
          Origen y destino concretos (elegidos con Google) con precio total por vehículo. Tienen prioridad sobre el
          cálculo por kilómetros y valen en los dos sentidos.
        </p>
        {routes.length === 0 ? (
          <p className="adm-empty">
            Todavía no hay rutas cerradas. <Link to="/admin/nueva-tarifa">Añade la primera</Link>.
          </p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Ruta</th>
                <th>Km</th>
                <VehicleHeads />
                <th />
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => {
                const prices = routeDrafts[r.id] ?? {};
                return (
                  <tr key={r.id} className={r.visible ? '' : 'is-off'}>
                    <td style={{ minWidth: 220 }}>
                      <strong>{r.label}</strong>
                      <div className="adm__sub" style={{ marginTop: 2, fontSize: 12.5 }}>
                        {r.a_text.split(',')[0]} ↔ {r.b_text.split(',')[0]}
                      </div>
                    </td>
                    <td>{r.km != null ? Math.round(r.km) : '—'}</td>
                    {fleet.map((v) => (
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
                {fleet.map((v) => (
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

      {/* -------------------------------------------------- recargos por zona */}
      <section className="adm__card">
        <h2 className="adm__card-title">Recargos por zona</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
          Los recargos heredados de la web anterior: se suman al tramo cuando el viaje une una zona del grupo A con una
          del grupo B. Para rutas nuevas conviene usar las rutas cerradas de arriba, que son más precisas.
        </p>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Zonas A</th>
              <th>Zonas B</th>
              <VehicleHeads />
              <th />
            </tr>
          </thead>
          <tbody>
            {surcharges.map((s, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={s.label}
                    style={{ minWidth: 170 }}
                    onChange={(e) => setSurcharges(surcharges.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  />
                </td>
                <td>
                  <ZonesInput value={s.zones_a} zones={zones} onChange={(v) => setSurcharges(surcharges.map((x, j) => (j === i ? { ...x, zones_a: JSON.stringify(v) } : x)))} />
                </td>
                <td>
                  <ZonesInput value={s.zones_b} zones={zones} onChange={(v) => setSurcharges(surcharges.map((x, j) => (j === i ? { ...x, zones_b: JSON.stringify(v) } : x)))} />
                </td>
                {fleet.map((v) => (
                  <td key={v.slug}>
                    <PriceCell
                      value={s.prices[v.slug]}
                      onChange={(val) => setSurcharges(surcharges.map((x, j) => (j === i ? { ...x, prices: setPrice(x.prices, v.slug, val) } : x)))}
                    />
                  </td>
                ))}
                <td>
                  <button
                    className="adm-btn adm-btn--icon adm-btn--danger"
                    type="button"
                    aria-label="Quitar recargo"
                    onClick={() => setSurcharges(surcharges.filter((_, j) => j !== i))}
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
            disabled={saving === 'surcharges'}
            onClick={() => run('surcharges', () => api.put('/pricing/surcharges', { surcharges }), 'Recargos guardados.')}
          >
            {saving === 'surcharges' ? 'Guardando…' : 'Guardar recargos'}
          </button>
        </div>
      </section>
    </>
  );
}
