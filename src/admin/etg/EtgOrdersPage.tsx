import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../ui';
import EtgNav from './EtgNav';

export interface EtgListItem {
  order_code: string;
  created_at: string;
  env: string;
  status: 'confirmed' | 'cancelled';
  internal_status: string;
  start_time: string;
  from: string;
  to: string;
  passenger: string;
  passengers: number;
  transfer_category: string;
  price: number;
  currency: string;
  has_driver: boolean;
}

/** "2026-12-10T14:00:00-04:00" → "10/12/2026 14:00 (-04:00)", sin convertir. */
export const fmtLocal = (rfc: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})(?::\d{2})?(.*)$/.exec(rfc);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}${m[5] && m[5] !== '-04:00' ? ` (${m[5]})` : ''}` : rfc;
};

export default function EtgOrdersPage({ partner }: { partner: boolean }) {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [when, setWhen] = useState('upcoming');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    total: number;
    size: number;
    orders: EtgListItem[];
    counts: { confirmed: number | null; cancelled: number | null; without_driver: number | null };
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ status, when, q, page: String(page) });
    api
      .get<NonNullable<typeof data>>(`/etg/orders?${params}`)
      .then(setData)
      .catch((e) => toast(e.message, true));
  }, [status, when, q, page, toast]);

  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">Órdenes ETG</h1>
          <p className="adm__sub">
            {partner
              ? 'Traslados reservados a través de Emerging Travel Group. Abre una orden para ver el detalle, modificarla o cancelarla.'
              : 'Traslados que llegan por la API de ETG (RateHawk, ZenHotels…). Asigna chofer y coche: ETG lo ve en su consulta de estado.'}
          </p>
        </div>
      </div>
      {!partner && <EtgNav />}

      {data && (
        <div className="adm-etg-stats">
          <span>
            <strong>{data.counts.confirmed ?? 0}</strong> activas
          </span>
          <span>
            <strong>{data.counts.cancelled ?? 0}</strong> canceladas
          </span>
          {!partner && (
            <span className={(data.counts.without_driver ?? 0) > 0 ? 'is-warn' : ''}>
              <strong>{data.counts.without_driver ?? 0}</strong> sin chofer asignado
            </span>
          )}
        </div>
      )}

      <section className="adm__card">
        <div className="adm-bar" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <select value={when} onChange={(e) => { setWhen(e.target.value); setPage(1); }}>
            <option value="upcoming">Próximas</option>
            <option value="past">Pasadas</option>
            <option value="">Todas (recientes primero)</option>
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Activas y canceladas</option>
            <option value="confirmed">Activas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          <input
            type="search"
            placeholder="Código, pasajero o cartel"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            style={{ minWidth: 220 }}
          />
        </div>

        {!data ? (
          <p className="adm-empty">Cargando…</p>
        ) : data.orders.length === 0 ? (
          <p className="adm-empty">No hay órdenes con estos filtros.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Recogida (hora local)</th>
                <th>Trayecto</th>
                <th>Pasajero</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.order_code} className={o.status === 'cancelled' ? 'is-off' : ''}>
                  <td>
                    <Link className="adm-route-name" to={`/admin/etg/orders/${o.order_code}`}>
                      <strong>{o.order_code}</strong>
                    </Link>
                    {o.env && o.env !== 'production' && <div className="adm__sub" style={{ fontSize: 12 }}>{o.env}</div>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtLocal(o.start_time)}</td>
                  <td style={{ minWidth: 220 }}>
                    {o.from}
                    <div className="adm__sub" style={{ fontSize: 12.5 }}>→ {o.to}</div>
                  </td>
                  <td>
                    {o.passenger}
                    <div className="adm__sub" style={{ fontSize: 12.5 }}>{o.passengers} pax</div>
                  </td>
                  <td>{o.transfer_category}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {o.currency} {o.price}
                  </td>
                  <td>
                    <span className={`adm-pill${o.status === 'confirmed' ? ' adm-pill--on' : ''}`}>
                      {o.status === 'confirmed' ? 'Activa' : 'Cancelada'}
                    </span>
                    {!partner && o.status === 'confirmed' && !o.has_driver && (
                      <div className="adm__sub" style={{ fontSize: 12 }}>sin chofer</div>
                    )}
                  </td>
                </tr>
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
