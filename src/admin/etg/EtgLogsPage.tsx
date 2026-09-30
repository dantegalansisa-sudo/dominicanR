import { Fragment, useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../ui';
import EtgNav from './EtgNav';

interface Log {
  id: number;
  at: string;
  env: string;
  endpoint: string;
  status_code: number;
  duration_ms: number;
  order_code: string | null;
  request: string | null;
  response: string | null;
}

interface Perf {
  endpoint: string;
  n: number;
  avg_ms: number;
  max_ms: number;
  errors: number;
}

const pretty = (s: string | null) => {
  if (!s) return '—';
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
};

export default function EtgLogsPage() {
  const toast = useToast();
  const [endpoint, setEndpoint] = useState('');
  const [errors, setErrors] = useState(false);
  const [order, setOrder] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const [data, setData] = useState<{ total: number; size: number; logs: Log[]; perf: Perf[] } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ endpoint, errors: errors ? '1' : '', order, page: String(page) });
    api
      .get<NonNullable<typeof data>>(`/etg/logs?${params}`)
      .then(setData)
      .catch((e) => toast(e.message, true));
  }, [endpoint, errors, order, page, toast]);

  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">ETG · Logs de la API</h1>
          <p className="adm__sub">
            Cada llamada de ETG. Las búsquedas guardan solo el request y cuántas ofertas salieron (salvo errores). Se borran a
            los 30 días.
          </p>
        </div>
      </div>
      <EtgNav />

      {data && data.perf.length > 0 && (
        <section className="adm__card">
          <h2 className="adm__card-title">Últimas 24 horas</h2>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Método</th>
                <th>Llamadas</th>
                <th>Media</th>
                <th>Máximo</th>
                <th>Errores</th>
              </tr>
            </thead>
            <tbody>
              {data.perf.map((p) => (
                <tr key={p.endpoint}>
                  <td>{p.endpoint}</td>
                  <td>{p.n}</td>
                  <td>{p.avg_ms} ms</td>
                  <td>{p.max_ms} ms</td>
                  <td>{p.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="adm__card">
        <div className="adm-bar" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <select value={endpoint} onChange={(e) => { setEndpoint(e.target.value); setPage(1); }}>
            <option value="">Todos los métodos</option>
            <option value="/search">/search</option>
            <option value="/book">/book</option>
            <option value="/status">/status</option>
            <option value="/cancel">/cancel</option>
          </select>
          <label className="adm-check" style={{ margin: 0 }}>
            <input type="checkbox" checked={errors} onChange={(e) => { setErrors(e.target.checked); setPage(1); }} />
            Solo errores
          </label>
          <input placeholder="Orden" value={order} onChange={(e) => { setOrder(e.target.value.trim()); setPage(1); }} />
        </div>
        {!data ? (
          <p className="adm-empty">Cargando…</p>
        ) : data.logs.length === 0 ? (
          <p className="adm-empty">Sin llamadas con estos filtros.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Cuándo (UTC)</th>
                <th>Método</th>
                <th>Código</th>
                <th>Tiempo</th>
                <th>Orden</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (
                <Fragment key={l.id}>
                  <tr>
                    <td style={{ whiteSpace: 'nowrap' }}>{l.at}</td>
                    <td>{l.endpoint}</td>
                    <td>
                      <span className={`adm-pill${l.status_code === 200 ? '' : ' adm-pill--on'}`}>{l.status_code}</span>
                    </td>
                    <td>{l.duration_ms} ms</td>
                    <td>{l.order_code ?? '—'}</td>
                    <td>
                      <button className="adm-btn adm-btn--sm" type="button" onClick={() => setOpen(open === l.id ? null : l.id)}>
                        {open === l.id ? 'Ocultar' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                  {open === l.id && (
                    <tr>
                      <td colSpan={6}>
                        <div className="adm-grid">
                          <div>
                            <strong>Request</strong>
                            <pre className="adm-pre" style={{ fontSize: 12 }}>{pretty(l.request)}</pre>
                          </div>
                          <div>
                            <strong>Response</strong>
                            <pre className="adm-pre" style={{ fontSize: 12 }}>{pretty(l.response)}</pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
        {data && data.total > data.size && (
          <div className="adm-bar adm-bar--end">
            <button className="adm-btn adm-btn--sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Anterior
            </button>
            <span className="adm__sub">
              Página {page} de {Math.ceil(data.total / data.size)}
            </span>
            <button className="adm-btn adm-btn--sm" disabled={page * data.size >= data.total} onClick={() => setPage(page + 1)}>
              Siguiente
            </button>
          </div>
        )}
      </section>
    </>
  );
}
