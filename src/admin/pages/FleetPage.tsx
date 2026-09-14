import { useCallback, useEffect, useState } from 'react';
import { api, parseJson } from '../api';
import type { VehicleRow } from '../api';
import { Check, Field, LinesField, Tabs, UploadButton, numOrNull, useToast } from '../ui';

interface Draft {
  name: string;
  type: string;
  minPax: number;
  maxPax: number;
  price: number | null;
  photo: string | null;
  summary: string;
  features: string[];
  featured: boolean;
  standard: boolean;
  visible: boolean;
  name_en: string;
  type_en: string;
  summary_en: string;
  features_en: string[];
}

const toDraft = (v: VehicleRow): Draft => ({
  name: v.name,
  type: v.type,
  minPax: v.min_pax,
  maxPax: v.max_pax,
  price: v.price,
  photo: v.photo,
  summary: v.summary,
  features: parseJson<string[]>(v.features, []),
  featured: Boolean(v.featured),
  standard: Boolean(v.standard),
  visible: Boolean(v.visible),
  name_en: v.name_en ?? '',
  type_en: v.type_en ?? '',
  summary_en: v.summary_en ?? '',
  features_en: parseJson<string[]>(v.features_en, []),
});

function VehicleCard({ row, onSaved }: { row: VehicleRow; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(row));
  const [tab, setTab] = useState<'es' | 'en'>('es');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => setDraft(toDraft(row)), [row]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/vehicles/${row.slug}`, draft);
      await onSaved();
      toast('Guardado.');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  const upload = async (files: File[]) => {
    setUploading(true);
    try {
      const r = await api.upload(files[0]!, { ratio: 'fleet' });
      await api.put(`/vehicles/${row.slug}`, { photo: r.path });
      await onSaved();
      toast('Foto cambiada.');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className={`adm__card${row.visible ? '' : ' is-off'}`}>
      <div className="adm-bar" style={{ justifyContent: 'space-between' }}>
        <div className="adm-bar">
          {row.photo ? (
            <img src={row.photo} alt="" style={{ width: 96, height: 48, objectFit: 'cover', borderRadius: 8 }} />
          ) : (
            <span className="adm-pill">sin foto</span>
          )}
          <div>
            <strong style={{ fontSize: 16 }}>{row.name}</strong>
            <div className="adm__sub" style={{ marginTop: 2 }}>
              {row.type} · {row.min_pax}–{row.max_pax} pasajeros ·{' '}
              {row.price === null ? 'a cotizar' : `desde $${row.price}`}
            </div>
          </div>
        </div>
        <div className="adm-bar">
          {row.featured ? <span className="adm-pill adm-pill--on">Principal</span> : null}
          {!row.visible && <span className="adm-pill">Oculto</span>}
          <button className="adm-btn adm-btn--sm" type="button" onClick={() => setOpen((o) => !o)}>
            {open ? 'Cerrar' : 'Editar'}
          </button>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 18 }}>
          <div className="adm-bar" style={{ marginBottom: 14 }}>
            <UploadButton label="Cambiar foto (se recorta a 2:1)" onFile={upload} busy={uploading} />
          </div>

          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'es', label: 'Español' },
              { id: 'en', label: 'English' },
            ]}
          />

          {tab === 'es' ? (
            <div className="adm-grid adm-grid--3">
              <Field label="Nombre">
                <input value={draft.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Tipo" hint='Por ejemplo "Van familiar".'>
                <input value={draft.type} onChange={(e) => set('type', e.target.value)} />
              </Field>
              <Field label="Precio desde (US$)" hint="Vacío = a cotizar.">
                <input type="number" min={0} value={draft.price ?? ''} onChange={(e) => set('price', numOrNull(e.target.value))} />
              </Field>
              <Field label="Pasajeros mínimo">
                <input type="number" min={1} value={draft.minPax} onChange={(e) => set('minPax', Number(e.target.value))} />
              </Field>
              <Field label="Pasajeros máximo">
                <input type="number" min={1} value={draft.maxPax} onChange={(e) => set('maxPax', Number(e.target.value))} />
              </Field>
              <div />
              <Field label="Descripción" full>
                <textarea rows={2} value={draft.summary} onChange={(e) => set('summary', e.target.value)} />
              </Field>
              <LinesField label="Características" value={draft.features} onChange={(v) => set('features', v)} rows={3} />
              <div className="adm-field--full">
                <Check label="Entre los 4 principales de la portada" checked={draft.featured} onChange={(v) => set('featured', v)} />
                <Check
                  label="Se puede sugerir automáticamente por número de pasajeros"
                  checked={draft.standard}
                  onChange={(v) => set('standard', v)}
                />
                <Check label="Visible en la web" checked={draft.visible} onChange={(v) => set('visible', v)} />
              </div>
            </div>
          ) : (
            <div className="adm-grid">
              <Field label="Name">
                <input value={draft.name_en} placeholder={draft.name} onChange={(e) => set('name_en', e.target.value)} />
              </Field>
              <Field label="Type">
                <input value={draft.type_en} placeholder={draft.type} onChange={(e) => set('type_en', e.target.value)} />
              </Field>
              <Field label="Description" full>
                <textarea rows={2} value={draft.summary_en} placeholder={draft.summary} onChange={(e) => set('summary_en', e.target.value)} />
              </Field>
              <LinesField label="Features" value={draft.features_en} onChange={(v) => set('features_en', v)} rows={3} hint="One per line." />
            </div>
          )}

          <div className="adm-bar adm-bar--end">
            <button className="adm-btn adm-btn--primary" type="button" onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function FleetPage() {
  const [rows, setRows] = useState<VehicleRow[] | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    const r = await api.get<{ vehicles: VehicleRow[] }>('/vehicles');
    setRows(r.vehicles);
  }, []);

  useEffect(() => {
    load().catch((e) => toast(e.message, true));
  }, [load, toast]);

  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">Flota</h1>
          <p className="adm__sub">
            Los precios por distancia y por ruta de cada vehículo se editan en Tarifas.
          </p>
        </div>
      </div>
      {!rows ? (
        <p className="adm-empty">Cargando…</p>
      ) : (
        rows.map((v) => <VehicleCard key={v.slug} row={v} onSaved={load} />)
      )}
    </>
  );
}
