import { useCallback, useEffect, useState } from 'react';
import { api, parseJson } from '../api';
import type { BracketRow, SurchargeRow, ZoneRow } from '../api';
import { useToast } from '../ui';

const KEYS = [
  ['sedan', 'Sedán'],
  ['minivan', 'Miniván'],
  ['minibus', 'Minibús'],
  ['vip', 'VIP'],
] as const;

/** Lista de zonas editable como texto con comas: "puj, bavaro, bayahibe". */
function ZonesInput({
  value,
  zones,
  onChange,
}: {
  value: string;
  zones: ZoneRow[];
  onChange: (v: string[]) => void;
}) {
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
  const [brackets, setBrackets] = useState<BracketRow[] | null>(null);
  const [surcharges, setSurcharges] = useState<SurchargeRow[]>([]);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [saving, setSaving] = useState<'brackets' | 'surcharges' | null>(null);

  const load = useCallback(async () => {
    const r = await api.get<{ brackets: BracketRow[]; surcharges: SurchargeRow[]; zones: ZoneRow[] }>('/pricing');
    setBrackets(r.brackets);
    setSurcharges(r.surcharges);
    setZones(r.zones);
  }, []);

  useEffect(() => {
    load().catch((e) => toast(e.message, true));
  }, [load, toast]);

  if (!brackets) return <p className="adm-empty">Cargando…</p>;

  const setBracket = (i: number, patch: Partial<BracketRow>) =>
    setBrackets(brackets.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const setSurcharge = (i: number, patch: Partial<SurchargeRow>) =>
    setSurcharges(surcharges.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const saveBrackets = async () => {
    setSaving('brackets');
    try {
      await api.put('/pricing/brackets', { brackets });
      await load();
      toast('Tramos guardados.');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(null);
    }
  };

  const saveSurcharges = async () => {
    setSaving('surcharges');
    try {
      await api.put('/pricing/surcharges', { surcharges });
      await load();
      toast('Recargos guardados.');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">Tarifas de traslado</h1>
          <p className="adm__sub">
            El precio de un traslado = tramo por kilómetros de carretera + recargo de ruta si la hay. Todo en US$.
          </p>
        </div>
      </div>

      <section className="adm__card">
        <h2 className="adm__card-title">Tramos por distancia</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
          "Hasta km" es el límite de cada tramo; déjalo vacío en el último para que sea abierto. Un tramo no puede
          cobrar menos que el anterior.
        </p>
        <table className="adm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Hasta km</th>
              {KEYS.map(([k, label]) => (
                <th key={k}>{label}</th>
              ))}
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
                    onChange={(e) => setBracket(i, { up_to: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </td>
                {KEYS.map(([k]) => (
                  <td key={k}>
                    <input type="number" min={0} value={b[k]} onChange={(e) => setBracket(i, { [k]: Number(e.target.value) })} />
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
            className="adm-btn adm-btn--sm"
            type="button"
            onClick={() => {
              const last = brackets[brackets.length - 1];
              setBrackets([...brackets, { ...(last ?? { sedan: 0, minivan: 0, minibus: 0, vip: 0 }), up_to: null, id: undefined }]);
            }}
          >
            + Añadir tramo
          </button>
          <button className="adm-btn adm-btn--primary" type="button" onClick={saveBrackets} disabled={saving === 'brackets'}>
            {saving === 'brackets' ? 'Guardando…' : 'Guardar tramos'}
          </button>
        </div>
      </section>

      <section className="adm__card">
        <h2 className="adm__card-title">Recargos por ruta</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
          Se suma cuando el origen está en una zona del grupo A y el destino en una del grupo B, o al revés. Gana el
          primero que coincide, de arriba abajo.
        </p>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Zonas A</th>
              <th>Zonas B</th>
              {KEYS.map(([k, label]) => (
                <th key={k}>{label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {surcharges.map((s, i) => (
              <tr key={i}>
                <td>
                  <input value={s.label} onChange={(e) => setSurcharge(i, { label: e.target.value })} style={{ minWidth: 170 }} />
                </td>
                <td>
                  <ZonesInput value={s.zones_a} zones={zones} onChange={(v) => setSurcharge(i, { zones_a: JSON.stringify(v) })} />
                </td>
                <td>
                  <ZonesInput value={s.zones_b} zones={zones} onChange={(v) => setSurcharge(i, { zones_b: JSON.stringify(v) })} />
                </td>
                {KEYS.map(([k]) => (
                  <td key={k}>
                    <input type="number" min={0} value={s[k]} onChange={(e) => setSurcharge(i, { [k]: Number(e.target.value) })} />
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
            className="adm-btn adm-btn--sm"
            type="button"
            onClick={() =>
              setSurcharges([...surcharges, { label: '', zones_a: '[]', zones_b: '[]', sedan: 0, minivan: 0, minibus: 0, vip: 0 }])
            }
          >
            + Añadir recargo
          </button>
          <button className="adm-btn adm-btn--primary" type="button" onClick={saveSurcharges} disabled={saving === 'surcharges'}>
            {saving === 'surcharges' ? 'Guardando…' : 'Guardar recargos'}
          </button>
        </div>
      </section>
    </>
  );
}
