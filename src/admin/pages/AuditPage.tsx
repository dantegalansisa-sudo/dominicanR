import { useEffect, useState } from 'react';
import { api } from '../api';
import type { AuditRow } from '../api';
import { fmtDR, useToast } from '../ui';

const when = (at: string) => fmtDR(at);

export default function AuditPage() {
  const toast = useToast();
  const [rows, setRows] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    api
      .get<{ entries: AuditRow[] }>('/audit')
      .then((r) => setRows(r.entries))
      .catch((e) => toast(e.message, true));
  }, [toast]);

  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">Historial</h1>
          <p className="adm__sub">Los últimos 100 cambios hechos desde el panel: quién, cuándo y qué.</p>
        </div>
      </div>
      <div className="adm__card">
        {!rows ? (
          <p className="adm-empty">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="adm-empty">Todavía no hay cambios.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Quién</th>
                <th>Acción</th>
                <th>Sobre</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{when(r.at)}</td>
                  <td>{r.who}</td>
                  <td>{r.action}</td>
                  <td>
                    <code>{r.target}</code>
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
