import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, parseJson } from '../api';
import type { ExcursionRow, PhotoRow } from '../api';
import { Check, Field, LinesField, Tabs, UploadButton, numOrNull, useToast } from '../ui';
import { CATEGORIES } from '../../data/excursions';

interface Ticket {
  name: string;
  price: number;
  includes: string;
}
interface TicketEn {
  name: string;
  includes: string;
}

/** Lo que se edita, ya con los JSON abiertos. */
interface Draft {
  name: string;
  category: string;
  price: number | null;
  child_price: number | null;
  rating: number;
  reviews: string;
  duration: string;
  description: string;
  adultsOnly: boolean;
  cashAllowed: boolean;
  ticketsAddon: boolean;
  featured: boolean;
  visible: boolean;
  includes: string[];
  activities: string[];
  departures: string[];
  tickets: Ticket[];
  name_en: string;
  duration_en: string;
  description_en: string;
  includes_en: string[];
  activities_en: string[];
  tickets_en: TicketEn[];
  tickets_title: string;
  tickets_lead: string;
  tickets_title_en: string;
  tickets_lead_en: string;
}

const toDraft = (r: ExcursionRow): Draft => ({
  name: r.name,
  category: r.category,
  price: r.price,
  child_price: r.child_price,
  rating: r.rating,
  reviews: r.reviews,
  duration: r.duration,
  description: r.description,
  adultsOnly: Boolean(r.adults_only),
  cashAllowed: r.cash_allowed !== 0,
  ticketsAddon: r.tickets_addon === 1,
  featured: Boolean(r.featured),
  visible: Boolean(r.visible),
  includes: parseJson<string[]>(r.includes, []),
  activities: parseJson<string[]>(r.activities, []),
  departures: parseJson<string[]>(r.departures, []),
  tickets: parseJson<Ticket[]>(r.tickets, []),
  name_en: r.name_en ?? '',
  duration_en: r.duration_en ?? '',
  description_en: r.description_en ?? '',
  includes_en: parseJson<string[]>(r.includes_en, []),
  activities_en: parseJson<string[]>(r.activities_en, []),
  tickets_en: parseJson<TicketEn[]>(r.tickets_en, []),
  tickets_title: r.tickets_title ?? '',
  tickets_lead: r.tickets_lead ?? '',
  tickets_title_en: r.tickets_title_en ?? '',
  tickets_lead_en: r.tickets_lead_en ?? '',
});

export default function ExcursionEditPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [tab, setTab] = useState<'es' | 'en'>('es');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Las fotos se recargan solas tras subir o quitar; la ficha solo al entrar,
  // porque si se recargara también pisaría lo que se esté escribiendo.
  const load = useCallback(
    async (withDraft: boolean) => {
      const r = await api.get<{ excursions: ExcursionRow[]; photos: PhotoRow[] }>('/excursions');
      const row = r.excursions.find((e) => e.slug === slug);
      if (!row) {
        toast('Esa excursión no existe.', true);
        navigate('/admin/excursiones');
        return;
      }
      if (withDraft) setDraft(toDraft(row));
      setPhotos(r.photos.filter((p) => p.slug === slug));
    },
    [slug, navigate, toast],
  );

  useEffect(() => {
    load(true).catch((e) => toast(e.message, true));
  }, [load, toast]);

  if (!draft) return <p className="adm-empty">Cargando…</p>;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const save = async () => {
    setSaving(true);
    try {
      // Las entradas en inglés van alineadas con las españolas por posición.
      const tickets_en = draft.tickets.map((t, i) => ({
        name: draft.tickets_en[i]?.name ?? t.name,
        includes: draft.tickets_en[i]?.includes ?? '',
      }));
      await api.put(`/excursions/${slug}`, { ...draft, tickets_en });
      toast('Guardado.');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`¿Borrar "${draft.name}" y sus fotos? No se puede deshacer.`)) return;
    try {
      await api.del(`/excursions/${slug}`);
      toast('Excursión borrada.');
      navigate('/admin/excursiones');
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const upload = async (files: File[]) => {
    setUploading(true);
    try {
      for (const f of files) await api.upload(f, { ratio: 'excursion', slug });
      await load(false);
      toast(files.length === 1 ? 'Foto subida.' : `${files.length} fotos subidas.`);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (id: number) => {
    if (!window.confirm('¿Quitar esta foto?')) return;
    try {
      await api.del(`/photos/${id}`);
      await load(false);
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const movePhoto = async (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    [next[index], next[to]] = [next[to]!, next[index]!];
    setPhotos(next);
    try {
      await api.put('/photos-order', { order: next.map((p) => p.id) });
    } catch (e) {
      toast((e as Error).message, true);
      load(false);
    }
  };

  const setTicket = (i: number, patch: Partial<Ticket>) =>
    set(
      'tickets',
      draft.tickets.map((t, j) => (j === i ? { ...t, ...patch } : t)),
    );
  const setTicketEn = (i: number, patch: Partial<TicketEn>) => {
    const next = draft.tickets.map((t, j) => ({
      name: draft.tickets_en[j]?.name ?? t.name,
      includes: draft.tickets_en[j]?.includes ?? '',
    }));
    next[i] = { ...next[i]!, ...patch };
    set('tickets_en', next);
  };

  return (
    <>
      <div className="adm__head">
        <div>
          <Link to="/admin/excursiones" style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
            ← Excursiones
          </Link>
          <h1 className="adm__title" style={{ marginTop: 6 }}>
            {draft.name || 'Excursión'}
          </h1>
          <p className="adm__sub">
            Identificador: <code>{slug}</code>
          </p>
        </div>
        <div className="adm-bar">
          <button className="adm-btn adm-btn--danger" type="button" onClick={remove}>
            Borrar
          </button>
          <button className="adm-btn adm-btn--primary" type="button" onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------- fotos */}
      <section className="adm__card">
        <h2 className="adm__card-title">Fotos</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
          La primera es la de la tarjeta. Se recortan a 3:2 y se convierten a webp al subir.
          Hasta 5 por excursión se ven bien en el carrusel.
        </p>
        <UploadButton label="+ Subir fotos" onFile={upload} busy={uploading} multiple />
        {photos.length > 0 && (
          <div className="adm-photos">
            {photos.map((p, i) => (
              <div className="adm-photo" key={p.id}>
                <img src={p.path} alt="" />
                {i === 0 && <span className="adm-photo__tag">Portada</span>}
                <div className="adm-photo__bar">
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="adm-btn adm-btn--icon" type="button" onClick={() => movePhoto(i, -1)} disabled={i === 0} aria-label="Mover antes">
                      ←
                    </button>
                    <button className="adm-btn adm-btn--icon" type="button" onClick={() => movePhoto(i, 1)} disabled={i === photos.length - 1} aria-label="Mover después">
                      →
                    </button>
                  </div>
                  <button className="adm-btn adm-btn--icon adm-btn--danger" type="button" onClick={() => deletePhoto(p.id)} aria-label="Quitar">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------- ficha */}
      <section className="adm__card">
        <h2 className="adm__card-title">Ficha</h2>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'es', label: 'Español' },
            { id: 'en', label: 'English' },
          ]}
        />

        {tab === 'es' ? (
          <div className="adm-grid">
            <Field label="Nombre" full>
              <input value={draft.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Categoría">
              <select value={draft.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.filter((c) => c.id !== 'todas').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duración" hint='Por ejemplo "8 horas" o "2 días".'>
              <input value={draft.duration} onChange={(e) => set('duration', e.target.value)} />
            </Field>
            <Field label="Precio por adulto (US$)" hint="Vacío = “Consultar”. Si hay entradas, manda la más barata.">
              <input type="number" min={0} value={draft.price ?? ''} onChange={(e) => set('price', numOrNull(e.target.value))} />
            </Field>
            <Field label="Precio por niño (US$)" hint="De 5 a 10 años. Vacío = a consultar. Los infantes (0 a 4) no pagan.">
              <input type="number" min={0} value={draft.child_price ?? ''} onChange={(e) => set('child_price', numOrNull(e.target.value))} disabled={draft.adultsOnly} />
            </Field>
            <Field label="Valoración (0 a 5)">
              <input type="number" min={0} max={5} step={0.1} value={draft.rating} onChange={(e) => set('rating', Number(e.target.value))} />
            </Field>
            <Field label="Reseñas" hint='Tal como se muestra: "1,250+".'>
              <input value={draft.reviews} onChange={(e) => set('reviews', e.target.value)} />
            </Field>
            <Field label="Descripción corta" full>
              <textarea rows={3} value={draft.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <LinesField label="Qué incluye" value={draft.includes} onChange={(v) => set('includes', v)} />
            <LinesField label="Actividades" value={draft.activities} onChange={(v) => set('activities', v)} />
            <LinesField
              label="Horarios de salida"
              value={draft.departures}
              onChange={(v) => set('departures', v)}
              hint='Uno por línea, por ejemplo "8:00 AM". Vacío = se coordina al cotizar.'
              rows={3}
            />
            <div className="adm-field--full">
              <Check label="Solo para adultos (18+)" checked={draft.adultsOnly} onChange={(v) => set('adultsOnly', v)} />
              <Check label="Acepta pago en efectivo el día del servicio (si no, solo PayPal por adelantado)" checked={draft.cashAllowed} onChange={(v) => set('cashAllowed', v)} />
              <Check label="En la portada (las 6 más solicitadas)" checked={draft.featured} onChange={(v) => set('featured', v)} />
              <Check label="Publicada en la web" checked={draft.visible} onChange={(v) => set('visible', v)} />
            </div>
          </div>
        ) : (
          <div className="adm-grid">
            <Field label="Name" full>
              <input value={draft.name_en} onChange={(e) => set('name_en', e.target.value)} placeholder={draft.name} />
            </Field>
            <Field label="Duration" full>
              <input value={draft.duration_en} onChange={(e) => set('duration_en', e.target.value)} placeholder={draft.duration} />
            </Field>
            <Field label="Short description" full>
              <textarea rows={3} value={draft.description_en} onChange={(e) => set('description_en', e.target.value)} placeholder={draft.description} />
            </Field>
            <LinesField label="What's included" value={draft.includes_en} onChange={(v) => set('includes_en', v)} hint="One per line, same order as the Spanish list." />
            <LinesField label="Activities" value={draft.activities_en} onChange={(v) => set('activities_en', v)} hint="One per line, same order as the Spanish list." />
            <p className="adm__sub adm-field--full">
              Lo que quede vacío se muestra en español en la versión inglesa de la web.
            </p>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------- entradas */}
      <section className="adm__card">
        <h2 className="adm__card-title">Entradas o paquetes</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
          Para excursiones con varios precios (Coco Bongo, Imagine). Si no hay, se usa el precio por adulto de arriba.
        </p>
        <Check
          label="Estas opciones son un vehículo privado: opcionales, se cobran UNA vez por grupo y se suman al precio por persona. Sin marcar, son entradas por persona que sustituyen el precio (Coco Bongo, Imagine)."
          checked={draft.ticketsAddon}
          onChange={(v) => set('ticketsAddon', v)}
        />
        <div className="adm-grid">
          <Field label="Título de la sección" hint="Lo que ve el cliente encima de las opciones, p. ej. «Elige tu traslado». Vacío = «Tu entrada».">
            <input value={draft.tickets_title} placeholder="Tu entrada" onChange={(e) => set('tickets_title', e.target.value)} />
          </Field>
          <Field label="Subtítulo" hint="Vacío = el texto por defecto.">
            <input value={draft.tickets_lead} placeholder="El precio es por persona y cambia según lo que incluye." onChange={(e) => set('tickets_lead', e.target.value)} />
          </Field>
          <Field label="Section title (EN)" hint="Vacío = «Your ticket».">
            <input value={draft.tickets_title_en} placeholder="Your ticket" onChange={(e) => set('tickets_title_en', e.target.value)} />
          </Field>
          <Field label="Subtitle (EN)">
            <input value={draft.tickets_lead_en} placeholder="Price is per person and depends on what is included." onChange={(e) => set('tickets_lead_en', e.target.value)} />
          </Field>
        </div>
        {draft.tickets.length > 0 && (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>US$</th>
                <th>Incluye</th>
                <th>Name (EN)</th>
                <th>Includes (EN)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {draft.tickets.map((t, i) => (
                <tr key={i}>
                  <td>
                    <input value={t.name} onChange={(e) => setTicket(i, { name: e.target.value })} />
                  </td>
                  <td>
                    <input type="number" min={0} value={t.price} onChange={(e) => setTicket(i, { price: Number(e.target.value) })} />
                  </td>
                  <td>
                    <input value={t.includes} onChange={(e) => setTicket(i, { includes: e.target.value })} />
                  </td>
                  <td>
                    <input value={draft.tickets_en[i]?.name ?? ''} placeholder={t.name} onChange={(e) => setTicketEn(i, { name: e.target.value })} />
                  </td>
                  <td>
                    <input value={draft.tickets_en[i]?.includes ?? ''} onChange={(e) => setTicketEn(i, { includes: e.target.value })} />
                  </td>
                  <td>
                    <button
                      className="adm-btn adm-btn--icon adm-btn--danger"
                      type="button"
                      aria-label="Quitar"
                      onClick={() => {
                        set('tickets', draft.tickets.filter((_, j) => j !== i));
                        set('tickets_en', draft.tickets_en.filter((_, j) => j !== i));
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="adm-bar" style={{ marginTop: 12 }}>
          <button
            className="adm-btn adm-btn--sm"
            type="button"
            onClick={() => set('tickets', [...draft.tickets, { name: '', price: 0, includes: '' }])}
          >
            + Añadir entrada
          </button>
        </div>
      </section>

      <div className="adm-bar adm-bar--end">
        <button className="adm-btn adm-btn--primary" type="button" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </>
  );
}
