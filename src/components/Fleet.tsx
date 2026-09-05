import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import RevealText from './RevealText';
import MagneticButton from './MagneticButton';
import ImagePlaceholder from './ImagePlaceholder';
import { FEATURED_FLEET, FLEET, FLEET_NOTE, OTHER_FLEET } from '../data/fleet';
import type { Vehicle } from '../data/fleet';
import { EASINGS } from '../utils/easings';

const MAX_PAX = 50;

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

const UsersIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="9" cy="8" r="3.4" />
    <path d="M3 20a6 6 0 0 1 12 0M16.5 5.2a3.4 3.4 0 0 1 0 5.6M18 20a6 6 0 0 0-2.2-4.6" />
  </svg>
);

function FleetItem({
  vehicle,
  active,
  onPick,
}: {
  vehicle: Vehicle;
  active: boolean;
  onPick: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`fleet__item${active ? ' is-active' : ''}`}
      onClick={() => onPick(vehicle.slug)}
    >
      {active && (
        <motion.span
          layoutId="fleet-marker"
          className="fleet__marker"
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        />
      )}
      <span className="fleet__item-name">{vehicle.name}</span>
      <span className="fleet__item-pax">
        {vehicle.minPax}–{vehicle.maxPax}
      </span>
    </button>
  );
}

export default function Fleet({
  onRequest,
}: {
  onRequest: (vehicleSlug: string) => void;
}) {
  const [activeSlug, setActiveSlug] = useState(FLEET[1]!.slug);
  const [collapsed, setCollapsed] = useState(true);

  // Below 980px the list is a horizontal scroller, never a tall column, so
  // collapsing buys nothing and would push the toggle off-screen to the right.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(max-width: 980px)');
    const sync = () => setNarrow(q.matches);
    sync();
    q.addEventListener('change', sync);
    return () => q.removeEventListener('change', sync);
  }, []);

  const showRest = narrow || !collapsed;
  const active = FLEET.find((v) => v.slug === activeSlug) ?? FLEET[0];

  // Collapsing while one of the hidden vehicles is selected would leave the
  // panel showing something with no matching row in the list, so the selection
  // falls back to the first featured one.
  const toggleRest = () => {
    setCollapsed((wasCollapsed) => {
      if (!wasCollapsed && OTHER_FLEET.some((v) => v.slug === activeSlug)) {
        setActiveSlug(FEATURED_FLEET[0]!.slug);
      }
      return !wasCollapsed;
    });
  };

  return (
    <section className="section fleet" id="traslados">
      <div className="container">
        <div className="fleet__head">
          <div>
            <p className="eyebrow">Transporte privado</p>
            <RevealText tag="h2" className="h2 fleet__title">
              {['Un', 'vehículo', 'para', <em key="cada">cada viaje</em>]}
            </RevealText>
          </div>
          <p className="fleet__note">
            <span className="fleet__swatch fleet__swatch--white" />
            <span className="fleet__swatch fleet__swatch--black" />
            {FLEET_NOTE}
          </p>
        </div>

        <div className="fleet__layout">
          <div className="fleet__list" role="tablist" aria-label="Vehículos disponibles">
            <p className="fleet__group">Principales</p>
            {FEATURED_FLEET.map((v) => (
              <FleetItem
                key={v.slug}
                vehicle={v}
                active={v.slug === activeSlug}
                onPick={setActiveSlug}
              />
            ))}

            <AnimatePresence initial={false}>
              {showRest && (
                <motion.div
                  className="fleet__rest"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.38, ease: EASINGS.premium }}
                >
                  <p className="fleet__group fleet__group--rest">Resto de la flota</p>
                  {OTHER_FLEET.map((v) => (
                    <FleetItem
                      key={v.slug}
                      vehicle={v}
                      active={v.slug === activeSlug}
                      onPick={setActiveSlug}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {!narrow && (
              <button type="button" className="fleet__more" onClick={toggleRest}>
              {showRest ? 'Ver menos' : `Ver el resto de la flota (${OTHER_FLEET.length})`}
              <motion.span
                className="fleet__more-chevron"
                animate={{ rotate: showRest ? 180 : 0 }}
                transition={{ duration: 0.28, ease: EASINGS.smooth }}
                aria-hidden="true"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  </svg>
                </motion.span>
              </button>
            )}
          </div>

          <div className="fleet__stage">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.slug}
                className="fleet__panel"
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.42, ease: EASINGS.premium }}
              >
                <div className="fleet__media">
                  {active.photo ? (
                    <img
                      className="fleet__photo"
                      src={active.photo}
                      alt={`${active.name} — ${active.type}`}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <ImagePlaceholder category="vehiculo" label="Foto próximamente" />
                  )}
                  <span className="fleet__badge">
                    {active.price === null ? (
                      'Cotizar'
                    ) : (
                      <>
                        Desde <strong>${active.price}</strong>
                      </>
                    )}
                  </span>
                </div>

                <div className="fleet__info">
                  <div className="fleet__head-block">
                    <h3 className="fleet__name">{active.name}</h3>
                    <p className="fleet__model">{active.type}</p>

                    <div className="fleet__capacity">
                      <span className="fleet__capacity-label">
                        <UsersIcon />
                        {active.minPax}–{active.maxPax} pasajeros
                      </span>
                      <span className="fleet__capacity-track">
                        <motion.span
                          className="fleet__capacity-bar"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: active.maxPax / MAX_PAX }}
                          transition={{ duration: 0.7, ease: EASINGS.premium }}
                        />
                      </span>
                    </div>

                    <p className="fleet__summary">{active.summary}</p>
                  </div>

                  <div className="fleet__side-block">
                    <ul className="fleet__features">
                      {active.features.map((f, i) => (
                        <motion.li
                          key={f}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.12 + i * 0.07, duration: 0.4 }}
                        >
                          {f}
                        </motion.li>
                      ))}
                    </ul>

                    <div className="fleet__cta">
                      <MagneticButton
                        className="btn btn--primary"
                        onClick={() => onRequest(active.slug)}
                      >
                        Pedir este traslado
                        <ArrowIcon />
                      </MagneticButton>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
