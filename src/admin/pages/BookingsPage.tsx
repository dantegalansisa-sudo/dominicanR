import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { BookingRow } from '../api';
import { fmtDR, useToast } from '../ui';
import { KIND_LABEL, STATUS_LABEL, bookingPrice, bookingSummary } from '../bookings';

const STATUSES = ['', 'nueva', 'contestada', 'confirmada', 'cancelada'] as const;
const KINDS = ['', 'traslado', 'excursion', 'contacto'] as const;
const LIMIT = 25;

export function StatusPill({ status }: { status: BookingRow['status'] }) {
  return <span className={`adm-status adm-status--${status}`}>{STATUS_LABEL[status]}</span>;
}

/** Marca de correo: solo se enseña cuando el aviso al negocio no salió. */
export function EmailFlag({ b }: { b: BookingRow }) {
  if (b.email_sent !== 0) return null;
  return (
    <span className="adm-flag" title={b.email_error ?? 'El correo al negocio no salió'}>
      ✉ sin correo
    </span>
  );
}

export default function BookingsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('estado') ?? '';
  const kind = params.get('tipo') ?? '';
  const page = Math.max(1, Number(params.get('pagina')) || 1);

  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ status, kind, page: String(page), limit: String(LIMIT) });
    const r = await api.get<{ bookings: BookingRow[]; total: number }>(`/bookings?${q}`);
    setRows(r.bookings);
    setTotal(r.total);
  }, [status, kind, page]);

  useEffect(() => {
    load().catch((e) => toast(e.message, true));
  }, [load, toast]);

  const setFilter = (key: 'estado' | 'tipo', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('pagina');
    setParams(next);
  };
  const setPage = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set('pagina', String(p));
    else next.delete('pagina');
    setParams(next);
  };

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">Reservas</h1>
          <p className="adm__sub">
            Todo lo que llega desde la web, con o sin correo. Horas de República Dominicana.
          </p>
        </div>
      </div>

      <div className="adm-bar" style={{ marginBottom: 16 }}>
        <div className="adm-tabs" style={{ marginBottom: 0 }}>
          {STATUSES.map((s) => (
            <button key={s} type="button" className={status === s ? 'is-active' : ''} onClick={() => setFilter('estado', s)}>
              {s ? STATUS_LABEL[s] : 'Todas'}
            </button>
          ))}
        </div>
        <div className="adm-tabs" style={{ marginBottom: 0 }}>
          {KINDS.map((k) => (
            <button key={k} type="button" className={kind === k ? 'is-active' : ''} onClick={() => setFilter('tipo', k)}>
              {k ? KIND_LABEL[k] : 'Todo tipo'}
            </button>
          ))}
        </div>
      </div>

      <div className="adm__card">
        {!rows ? (
          <p className="adm-empty">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="adm-empty">No hay reservas con ese filtro.</p>
        ) : (
          <table className="adm-table adm-table--rows">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Ruta / excursión</th>
                <th>Precio</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const price = bookingPrice(b);
                return (
                  <tr key={b.id} className={b.status === 'nueva' ? 'is-new' : ''}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {fmtDR(b.created_at)}
                      {b.date && <div className="adm__sub" style={{ fontSize: 12, marginTop: 2 }}>viaje: {b.date}</div>}
                    </td>
                    <td>
                      {KIND_LABEL[b.kind]}
                      {b.lang === 'en' && <span className="adm-pill" style={{ marginLeft: 6 }}>EN</span>}
                    </td>
                    <td>
                      <strong>{b.name}</strong>
                      <div className="adm__sub" style={{ fontSize: 12.5, marginTop: 2 }}>{b.email}</div>
                    </td>
                    <td style={{ maxWidth: 300 }}>{bookingSummary(b)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{price == null ? '—' : `US$${price}`}</td>
                    <td>
                      <StatusPill status={b.status} />
                      <EmailFlag b={b} />
                    </td>
                    <td>
                      <div className="adm-table__actions">
                        <Link className="adm-btn adm-btn--sm adm-btn--primary" to={`/admin/reservas/${b.id}`}>
                          Ver
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {pages > 1 && (
          <div className="adm-bar adm-bar--end" style={{ alignItems: 'center' }}>
            <span className="adm__sub" style={{ marginTop: 0 }}>
              {total} en total · página {page} de {pages}
            </span>
            <button className="adm-btn adm-btn--sm" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              ← Anteriores
            </button>
            <button className="adm-btn adm-btn--sm" type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Siguientes →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
