import { useState } from 'react';
import { motion } from 'framer-motion';
import MagneticButton from './MagneticButton';
import { EASINGS } from '../utils/easings';

const TABS = ['Traslado', 'Excursiones'] as const;
type Tab = (typeof TABS)[number];

const ico = {
  width: 13,
  height: 13,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const PinIcon = () => (
  <svg {...ico} aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

const FlagIcon = () => (
  <svg {...ico} aria-hidden="true">
    <path d="M5 21V4m0 0h11l-2 3.5L16 11H5" />
  </svg>
);

const CalendarIcon = () => (
  <svg {...ico} aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 10h17M8 3v4m8-4v4" />
  </svg>
);

const ClockIcon = () => (
  <svg {...ico} aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </svg>
);

const UsersIcon = () => (
  <svg {...ico} aria-hidden="true">
    <circle cx="9" cy="8" r="3.4" />
    <path d="M3 20a6 6 0 0 1 12 0M16.5 5.2a3.4 3.4 0 0 1 0 5.6M18 20a6 6 0 0 0-2.2-4.6" />
  </svg>
);

const ShieldIcon = () => (
  <svg {...ico} width="14" height="14" aria-hidden="true">
    <path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6l7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const ArrowIcon = () => (
  <svg
    className="btn__arrow"
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Horizontal search rail that straddles the hero's bottom edge — the same
 * fields the live site collects, in a completely different shape.
 */
export default function SearchBar() {
  const [tab, setTab] = useState<Tab>('Traslado');
  const [pax, setPax] = useState(2);
  const [round, setRound] = useState(false);

  const isTransfer = tab === 'Traslado';

  return (
    <motion.div
      className="container search"
      initial={{ opacity: 0, y: 44 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.95, delay: 0.85, ease: EASINGS.premium }}
    >
      <div className="search__tabs" role="tablist" aria-label="Tipo de reserva">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`search__tab${tab === t ? ' is-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {tab === t && (
              <motion.span
                layoutId="search-tab-pill"
                className="search__tab-pill"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            {t}
          </button>
        ))}
      </div>

      <div className="search__bar">
        <div className="search__field">
          <label className="search__label" htmlFor="sb-origin">
            <PinIcon />
            {isTransfer ? 'Origen' : 'Punto de encuentro'}
          </label>
          <input
            id="sb-origin"
            placeholder={isTransfer ? 'Aeropuerto (PUJ)' : 'Tu hotel en Bávaro'}
          />
        </div>

        <div className="search__field">
          <label className="search__label" htmlFor="sb-dest">
            <FlagIcon />
            {isTransfer ? 'Destino' : 'Excursión'}
          </label>
          <input
            id="sb-dest"
            placeholder={isTransfer ? 'Hotel o resort' : 'Montaña Redonda…'}
          />
        </div>

        <div className="search__field">
          <label className="search__label" htmlFor="sb-date">
            <CalendarIcon />
            Fecha
          </label>
          <input id="sb-date" placeholder="dd / mm / aaaa" />
        </div>

        <div className="search__field">
          <label className="search__label" htmlFor="sb-time">
            <ClockIcon />
            Hora
          </label>
          <input id="sb-time" placeholder="10:30" />
        </div>

        <div className="search__field">
          <span className="search__label">
            <UsersIcon />
            Pasajeros
          </span>
          <div className="search__stepper">
            <button
              type="button"
              className="search__stepper-btn"
              onClick={() => setPax((p) => Math.max(1, p - 1))}
              disabled={pax <= 1}
              aria-label="Quitar pasajero"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <span className="search__stepper-value" aria-live="polite">
              {pax} {pax === 1 ? 'pasajero' : 'pasajeros'}
            </span>
            <button
              type="button"
              className="search__stepper-btn"
              onClick={() => setPax((p) => Math.min(16, p + 1))}
              disabled={pax >= 16}
              aria-label="Agregar pasajero"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="search__submit">
          <MagneticButton className="btn btn--primary" magnetStrength={0.22}>
            {isTransfer ? 'Buscar Traslado' : 'Buscar Excursión'}
            <ArrowIcon />
          </MagneticButton>
        </div>
      </div>

      <div className="search__foot">
        <button
          type="button"
          className="search__return"
          onClick={() => setRound((v) => !v)}
          aria-pressed={round}
        >
          <span className={`switch${round ? ' is-on' : ''}`}>
            <motion.span
              className="switch__knob"
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            />
          </span>
          Agregar regreso
        </button>

        <p className="search__note">
          <ShieldIcon />
          Confirmación inmediata · Cancelación gratuita · Pago al llegar
        </p>
      </div>
    </motion.div>
  );
}
