import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
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
import './admin.css';

/**
 * Panel del cliente, en /admin. Solo en español: lo usa el operador. Vive en
 * la misma aplicación que la web pública pero con su propia hoja de estilos
 * y sin la cabecera ni el pie del sitio.
 */

type Session = { state: 'checking' } | { state: 'out' } | { state: 'in'; email: string };

const LINKS = [
  { to: '/admin/excursiones', label: 'Excursiones' },
  { to: '/admin/flota', label: 'Flota' },
  { to: '/admin/tarifas', label: 'Tarifas' },
  { to: '/admin/nueva-tarifa', label: 'Nueva tarifa' },
  { to: '/admin/adicionales', label: 'Adicionales' },
  { to: '/admin/ajustes', label: 'Ajustes' },
  { to: '/admin/historial', label: 'Historial' },
];

function Login({ onIn }: { onIn: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.post<{ ok: true; email: string }>('/login', { email, password });
      onIn(r.email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo entrar. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-login">
      <form className="adm-login__card" onSubmit={submit}>
        <img src="/images/logo.png" alt="Dominican Routes" />
        <h1>Panel de administración</h1>
        <label className="adm-field">
          <span>Correo</span>
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
          <span>Contraseña</span>
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
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default function AdminApp() {
  const [session, setSession] = useState<Session>({ state: 'checking' });

  useEffect(() => {
    document.title = 'Panel — Dominican Routes';
    api
      .get<{ ok: true; email: string }>('/me')
      .then((r) => setSession({ state: 'in', email: r.email }))
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
    return <Login onIn={(email) => setSession({ state: 'in', email })} />;
  }

  const logout = async () => {
    await api.post('/logout').catch(() => {});
    setSession({ state: 'out' });
  };

  return (
    <ToastProvider>
      <div className="adm">
        <aside className="adm__side">
          <a className="adm__brand" href="/admin/excursiones">
            <img src="/images/logo-dark.png" alt="Dominican Routes" />
            <span>Panel</span>
          </a>
          <nav className="adm__nav">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `adm__link${isActive ? ' is-active' : ''}`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="adm__side-foot">
            <span>{session.email}</span>
            <a href="/" target="_blank" rel="noopener noreferrer">
              Ver la web ↗
            </a>
            <button type="button" className="adm__logout" onClick={logout}>
              Salir
            </button>
          </div>
        </aside>

        <main className="adm__main">
          <Routes>
            <Route index element={<Navigate to="/admin/excursiones" replace />} />
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
        </main>
      </div>
    </ToastProvider>
  );
}
