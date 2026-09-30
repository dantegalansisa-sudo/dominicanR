import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../ui';
import EtgNav from './EtgNav';
import { etgText } from './i18n';

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
export const fmtLocal = (rfc: string, iso = false) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})(?::\d{2})?(.*)$/.exec(rfc);
  if (!m) return rfc;
  const tz = m[5] && m[5] !== '-04:00' ? ` (${m[5]})` : '';
  // En inglés, AAAA-MM-DD: el orden día/mes se lee al revés en EE. UU.
  return iso ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}${tz}` : `${m[3]}/${m[2]}/${m[1]} ${m[4]}${tz}`;
};

export default function EtgOrdersPage({ partner }: { partner: boolean }) {
  const toast = useToast();
  const t = etgText(partner);
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
          <h1 className="adm__title">{t.listTitle}</h1>
          <p className="adm__sub">{partner ? t.listLeadPartner : t.listLeadTeam}</p>
        </div>
      </div>
      {!partner && <EtgNav />}

      {data && (
        <div className="adm-etg-stats">
          <span>
            <strong>{data.counts.confirmed ?? 0}</strong> {t.active}
          </span>
          <span>
            <strong>{data.counts.cancelled ?? 0}</strong> {t.cancelledN}
          </span>
          {!partner && (
            <span className={(data.counts.without_driver ?? 0) > 0 ? 'is-warn' : ''}>
              <strong>{data.counts.without_driver ?? 0}</strong> {t.withoutDriver}
            </span>
          )}
        </div>
      )}

      <section className="adm__card">
        <div className="adm-bar" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <select value={when} onChange={(e) => { setWhen(e.target.value); setPage(1); }}>
            <option value="upcoming">{t.upcoming}</option>
            <option value="past">{t.past}</option>
            <option value="">{t.all}</option>
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t.anyStatus}</option>
            <option value="confirmed">{t.onlyActive}</option>
            <option value="cancelled">{t.onlyCancelled}</option>
          </select>
          <input
            type="search"
            placeholder={t.searchPh}
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            style={{ minWidth: 220 }}
          />
        </div>

        {!data ? (
          <p className="adm-empty">{t.loading}</p>
        ) : data.orders.length === 0 ? (
          <p className="adm-empty">{t.noOrders}</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t.colOrder}</th>
                <th>{t.colPickup}</th>
                <th>{t.colRoute}</th>
                <th>{t.colPassenger}</th>
                <th>{t.colCategory}</th>
                <th>{t.colPrice}</th>
                <th>{t.colStatus}</th>
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
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtLocal(o.start_time, partner)}</td>
                  <td style={{ minWidth: 220 }}>
                    {o.from}
                    <div className="adm__sub" style={{ fontSize: 12.5 }}>→ {o.to}</div>
                  </td>
                  <td>
                    {o.passenger}
                    <div className="adm__sub" style={{ fontSize: 12.5 }}>{o.passengers} {t.pax}</div>
                  </td>
                  <td>{o.transfer_category}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {o.currency} {o.price}
                  </td>
                  <td>
                    <span className={`adm-pill${o.status === 'confirmed' ? ' adm-pill--on' : ''}`}>
                      {o.status === 'confirmed' ? t.statusActive : t.statusCancelled}
                    </span>
                    {!partner && o.status === 'confirmed' && !o.has_driver && (
                      <div className="adm__sub" style={{ fontSize: 12 }}>{t.noDriver}</div>
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
              {t.prev}
            </button>
            <span className="adm__sub">{t.pageOf(page, Math.ceil(data.total / data.size))}</span>
            <button className="adm-btn adm-btn--sm" disabled={page * data.size >= data.total} onClick={() => setPage(page + 1)}>
              {t.next}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
