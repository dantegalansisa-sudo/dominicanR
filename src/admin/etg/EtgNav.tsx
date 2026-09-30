import { NavLink } from 'react-router-dom';

/** Pestañas de la sección ETG para el equipo (el soporte de ETG no las ve). */
export default function EtgNav() {
  const items = [
    { to: '/admin/etg/orders', label: 'Órdenes' },
    { to: '/admin/etg/ajustes', label: 'Ajustes y flota' },
    { to: '/admin/etg/logs', label: 'Logs de la API' },
  ];
  return (
    <div className="adm-tabs" style={{ marginBottom: 18 }}>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
          {i.label}
        </NavLink>
      ))}
    </div>
  );
}
