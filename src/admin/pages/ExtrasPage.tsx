import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { ExtraRow } from '../api';
import { useToast } from '../ui';

const KINDS: { kind: ExtraRow['kind']; title: string; hint: string }[] = [
  { kind: 'seat', title: 'Sillas para niños', hint: 'Precio por silla y traslado.' },
  { kind: 'drink', title: 'A bordo', hint: 'Precio por unidad.' },
  { kind: 'stop', title: 'Paradas adicionales', hint: 'Precio por bloque de tiempo de espera.' },
];

export default function ExtrasPage() {
  const toast = useToast();
  const [rows, setRows] = useState<ExtraRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await api.get<{ extras: ExtraRow[] }>('/extras');
    setRows(r.extras);
  }, []);

  useEffect(() => {
    load().catch((e) => toast(e.message, true));
  }, [load, toast]);

  if (!rows) return <p className="adm-empty">Cargando…</p>;

  const set = (kind: string, id: string, patch: Partial<ExtraRow>) =>
    setRows(rows.map((r) => (r.kind === kind && r.id === id ? { ...r, ...patch } : r)));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/extras', { extras: rows });
      await load();
      toast('Adicionales guardados.');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">Adicionales del traslado</h1>
          <p className="adm__sub">Lo que el cliente puede sumar al pedir un traslado. Todo en US$.</p>
        </div>
        <button className="adm-btn adm-btn--primary" type="button" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {KINDS.map(({ kind, title, hint }) => (
        <section className="adm__card" key={kind}>
          <h2 className="adm__card-title">{title}</h2>
          <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
            {hint}
          </p>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>US$</th>
                {kind === 'stop' && <th>Minutos</th>}
                <th>Visible</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => r.kind === kind)
                .map((r) => (
                  <tr key={r.id} className={r.visible ? '' : 'is-off'}>
                    <td>
                      <input value={r.label} onChange={(e) => set(kind, r.id, { label: e.target.value })} />
                    </td>
                    <td>
                      <input type="number" min={0} value={r.price} onChange={(e) => set(kind, r.id, { price: Number(e.target.value) })} />
                    </td>
                    {kind === 'stop' && (
                      <td>
                        <input type="number" min={0} value={r.minutes ?? ''} onChange={(e) => set(kind, r.id, { minutes: Number(e.target.value) })} />
                      </td>
                    )}
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(r.visible)}
                        onChange={(e) => set(kind, r.id, { visible: e.target.checked ? 1 : 0 })}
                        style={{ width: 17, height: 17, accentColor: 'var(--coral)' }}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}

      <div className="adm-bar adm-bar--end">
        <button className="adm-btn adm-btn--primary" type="button" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </>
  );
}
