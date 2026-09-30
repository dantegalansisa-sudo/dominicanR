import { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api, ApiError } from './api';
import { ToastProvider } from './ui';
import ExcursionsPage from './pages/ExcursionsPage';
import ExcursionEditPage from './pages/ExcursionEditPage';
import FleetPage from './pages/FleetPage';
import PricingPage from './pages/PricingPage';
import NewPricingPage from './pages/NewPricingPage';
import ExtrasPage from './pages/ExtrasPage';
import SettingsPage from './pages/SettingsPage';
import AuditPage from './pages/AuditPage';
import BookingsPage from './pages/BookingsPage';
import BookingDetailPage from './pages/BookingDetailPage';
import EtgOrdersPage from './etg/EtgOrdersPage';
import EtgOrderPage from './etg/EtgOrderPage';
import EtgSettingsPage from './etg/EtgSettingsPage';
import EtgLogsPage from './etg/EtgLogsPage';
import './admin.css';

/**
 * Panel del cliente, en /admin. Solo en español: lo usa el operador. Vive en
 * la misma aplicación que la web pública pero con su propia hoja de estilos
 * y sin la cabecera ni el pie del sitio.
 */

type Session = { state: 'checking' } | { state: 'out' } | { state: 'in'; email: string; role: string };

/** Soporte de ETG: entra al mismo panel pero solo ve sus órdenes. */
const PARTNER = 'partner_etg';

const LINKS = [
  { to: '/admin/reservas', label: 'Reservas' },
  { to: '/admin/excursiones', label: 'Excursiones' },
  { to: '/admin/flota', label: 'Flota' },
  { to: '/admin/tarifas', label: 'Tarifas' },
  { to: '/admin/nueva-tarifa', label: 'Nueva tarifa' },
  { to: '/admin/adicionales', label: 'Adicionales' },
  { to: '/admin/ajustes', label: 'Ajustes' },
  { to: '/admin/historial', label: 'Historial' },
  { to: '/admin/etg/orders', label: 'ETG' },
];

const PARTNER_LINKS = [{ to: '/admin/etg/orders', label: 'ETG orders' }];

/**
 * El soporte de ETG llega por el enlace de una orden (/admin/etg/…): la
 * pantalla de entrada le sale en inglés. El resto del panel, en español.
 */
const LOGIN_TEXT = {
  es: { title: 'Panel de administración', email: 'Correo', password: 'Contraseña', enter: 'Entrar', entering: 'Entrando…', fail: 'No se pudo entrar. Intenta de nuevo.' },
  en: { title: 'Supplier backoffice', email: 'Email', password: 'Password', enter: 'Sign in', entering: 'Signing in…', fail: 'Could not sign in. Please try again.' },
};

function Login({ onIn }: { onIn: (email: string, role: string) => void }) {
  const lt = window.location.pathname.startsWith('/admin/etg') ? LOGIN_TEXT.en : LOGIN_TEXT.es;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post<{ ok: true; email: string }>('/login', { email, password });
      // El rol lo da /me: así el soporte de ETG cae directo en su sección.
      const me = await api.get<{ ok: true; email: string; role?: string }>('/me');
      onIn(me.email, me.role ?? 'admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : lt.fail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-login">
      <form className="adm-login__card" onSubmit={submit}>
        <img src="/images/logo.png" alt="Dominican Routes" />
        <h1>{lt.title}</h1>
        <label className="adm-field">
          <span>{lt.email}</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label className="adm-field">
          <span>{lt.password}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="adm-login__error">{error}</p>}
        <button className="adm-btn adm-btn--primary" type="submit" disabled={busy}>
          {busy ? lt.entering : lt.enter}
        </button>
      </form>
    </div>
  );
}

export default function AdminApp() {
  const [session, setSession] = useState<Session>({ state: 'checking' });
  const [newCount, setNewCount] = useState(0);
  const location = useLocation();

  // Reservas nuevas para el menú lateral: al entrar, al cambiar de página y
  // cada minuto, que es lo que tarda en enterarse si llega una mientras
  // trabaja en otra cosa.
  const refreshCount = useCallback(() => {
    api
      .get<{ counts: Record<string, number> }>('/bookings/counts')
      .then((r) => setNewCount(r.counts.nueva ?? 0))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (session.state !== 'in' || session.role === PARTNER) return;
    refreshCount();
    const t = window.setInterval(refreshCount, 60_000);
    return () => window.clearInterval(t);
  }, [session.state, location.pathname, refreshCount]);

  useEffect(() => {
    document.title = 'Panel — Dominican Routes';
    api
      .get<{ ok: true; email: string; role?: string }>('/me')
      .then((r) => setSession({ state: 'in', email: r.email, role: r.role ?? 'admin' }))
      .catch(() => setSession({ state: 'out' }));
  }, []);

  // Cualquier 401 en medio del trabajo (sesión de ocho horas caducada) vuelve
  // a la pantalla de entrada en lugar de dejar botones que no hacen nada.
  useEffect(() => {
    const onReject = (ev: PromiseRejectionEvent) => {
      if (ev.reason instanceof ApiError && ev.reason.status === 401) {
        setSession({ state: 'out' });
      }
    };
    window.addEventListener('unhandledrejection', onReject);
    return () => window.removeEventListener('unhandledrejection', onReject);
  }, []);

  if (session.state === 'checking') return <div className="adm-login" />;
  if (session.state === 'out') {
    return <Login onIn={(email, role) => setSession({ state: 'in', email, role })} />;
  }

  const partner = session.role === PARTNER;

  const logout = async () => {
    await api.post('/logout').catch(() => {});
    setSession({ state: 'out' });
  };

  return (
    <ToastProvider>
      <div className="adm">
        <aside className="adm__side">
          <a className="adm__brand" href={partner ? '/admin/etg/orders' : '/admin/reservas'}>
            <img src="/images/logo-dark-v2.png" alt="Dominican Routes" />
            <span>{partner ? 'Backoffice' : 'Panel'}</span>
          </a>
          <nav className="adm__nav">
            {(partner ? PARTNER_LINKS : LINKS).map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `adm__link${isActive ? ' is-active' : ''}`}
              >
                {l.label}
                {l.to === '/admin/reservas' && newCount > 0 && (
                  <span className="adm-badge" aria-label={`${newCount} nuevas`}>
                    {newCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="adm__side-foot">
            <span>{session.email}</span>
            {!partner && (
              <a href="/" target="_blank" rel="noopener noreferrer">
                Ver la web ↗
              </a>
            )}
            <button type="button" className="adm__logout" onClick={logout}>
              {partner ? 'Log out' : 'Salir'}
            </button>
          </div>
        </aside>

        <main className="adm__main">
          {partner ? (
            <Routes>
              <Route path="etg/orders" element={<EtgOrdersPage partner />} />
              <Route path="etg/orders/:code" element={<EtgOrderPage partner />} />
              <Route path="*" element={<Navigate to="/admin/etg/orders" replace />} />
            </Routes>
          ) : (
          <Routes>
            <Route index element={<Navigate to="/admin/reservas" replace />} />
            <Route path="etg" element={<Navigate to="/admin/etg/orders" replace />} />
            <Route path="etg/orders" element={<EtgOrdersPage partner={false} />} />
            <Route path="etg/orders/:code" element={<EtgOrderPage partner={false} />} />
            <Route path="etg/ajustes" element={<EtgSettingsPage />} />
            <Route path="etg/logs" element={<EtgLogsPage />} />
            <Route path="reservas" element={<BookingsPage />} />
            <Route path="reservas/:id" element={<BookingDetailPage />} />
            <Route path="excursiones" element={<ExcursionsPage />} />
            <Route path="excursiones/:slug" element={<ExcursionEditPage />} />
            <Route path="flota" element={<FleetPage />} />
            <Route path="tarifas" element={<PricingPage />} />
            <Route path="nueva-tarifa" element={<NewPricingPage />} />
            <Route path="adicionales" element={<ExtrasPage />} />
            <Route path="ajustes" element={<SettingsPage email={session.email} />} />
            <Route path="historial" element={<AuditPage />} />
            <Route path="*" element={<Navigate to="/admin/excursiones" replace />} />
          </Routes>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
