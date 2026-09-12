import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { ExcursionRow, PhotoRow } from '../api';
import { useToast } from '../ui';
import { CATEGORIES } from '../../data/excursions';

const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export default function ExcursionsPage() {
  const [rows, setRows] = useState<ExcursionRow[] | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const r = await api.get<{ excursions: ExcursionRow[]; photos: PhotoRow[] }>('/excursions');
    setRows(r.excursions);
    setPhotos(r.photos);
  }, []);

  useEffect(() => {
    load().catch((e) => toast(e.message, true));
  }, [load, toast]);

  const patch = async (slug: string, body: Record<string, unknown>) => {
    try {
      await api.put(`/excursions/${slug}`, body);
      await load();
      toast('Guardado.');
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const move = async (index: number, delta: number) => {
    if (!rows) return;
    const to = index + delta;
    if (to < 0 || to >= rows.length) return;
    const order = rows.map((r) => r.slug);
    [order[index], order[to]] = [order[to]!, order[index]!];
    setRows(order.map((s) => rows.find((r) => r.slug === s)!));
    try {
      await api.put('/excursions-order', { order });
    } catch (e) {
      toast((e as Error).message, true);
      load();
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const r = await api.post<{ slug: string }>('/excursions', { name: newName.trim() });
      navigate(`/admin/excursiones/${r.slug}`);
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const cover = (slug: string) => photos.find((p) => p.slug === slug)?.path;

  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">Excursiones</h1>
          <p className="adm__sub">
            {rows ? `${rows.length} en total · ${rows.filter((r) => r.visible).length} publicadas` : '…'}
          </p>
        </div>
        <form className="adm-bar" onSubmit={create}>
          <input
            className="adm-field-inline"
            style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, minWidth: 240 }}
            placeholder="Nombre de la nueva excursión"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="adm-btn adm-btn--primary" type="submit" disabled={busy || !newName.trim()}>
            + Nueva excursión
          </button>
        </form>
      </div>

      <div className="adm__card">
        {!rows ? (
          <p className="adm-empty">Cargando…</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>Orden</th>
                <th style={{ width: 90 }}>Foto</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.slug} className={r.visible ? '' : 'is-off'}>
                  <td>
                    <div className="adm-table__actions" style={{ justifyContent: 'flex-start' }}>
                      <button className="adm-btn adm-btn--icon" type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                        ↑
                      </button>
                      <button className="adm-btn adm-btn--icon" type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Bajar">
                        ↓
                      </button>
                    </div>
                  </td>
                  <td>
                    {cover(r.slug) ? (
                      <img src={cover(r.slug)} alt="" style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <span className="adm-pill">sin foto</span>
                    )}
                  </td>
                  <td>
                    <Link to={`/admin/excursiones/${r.slug}`} style={{ fontWeight: 600 }}>
                      {r.name}
                    </Link>
                    {r.adults_only ? <span className="adm-pill" style={{ marginLeft: 8 }}>18+</span> : null}
                  </td>
                  <td>{catLabel(r.category)}</td>
                  <td>{r.price === null ? 'Consultar' : `$${r.price}`}</td>
                  <td>
                    <span className={`adm-pill${r.visible ? ' adm-pill--on' : ''}`}>
                      {r.visible ? 'Publicada' : 'Oculta'}
                    </span>{' '}
                    {r.featured ? <span className="adm-pill adm-pill--on">Portada</span> : null}
                  </td>
                  <td>
                    <div className="adm-table__actions">
                      <button className="adm-btn adm-btn--sm" type="button" onClick={() => patch(r.slug, { featured: !r.featured })}>
                        {r.featured ? 'Quitar de portada' : 'A portada'}
                      </button>
                      <button className="adm-btn adm-btn--sm" type="button" onClick={() => patch(r.slug, { visible: !r.visible })}>
                        {r.visible ? 'Ocultar' : 'Publicar'}
                      </button>
                      <Link className="adm-btn adm-btn--sm adm-btn--primary" to={`/admin/excursiones/${r.slug}`}>
                        Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
