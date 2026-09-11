import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import RevealText from './RevealText';
import MagneticButton from './MagneticButton';
import ImagePlaceholder from './ImagePlaceholder';
import { cardVariants } from './ExcursionCard';
import { FEATURED_FLEET, OTHER_FLEET } from '../data/fleet';
import type { Vehicle } from '../data/fleet';
import { EASINGS } from '../utils/easings';

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

function FleetCard({
  vehicle,
  index,
  onRequest,
}: {
  vehicle: Vehicle;
  index: number;
  onRequest: (slug: string) => void;
}) {
  return (
    <motion.article className="fleet-card" variants={cardVariants} custom={index}>
      <div className="fleet-card__media">
        {vehicle.photo ? (
          <img
            src={vehicle.photo}
            alt={`${vehicle.name} — ${vehicle.type}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <ImagePlaceholder category="vehiculo" label="Foto próximamente" />
        )}
        <span className="fleet-card__badge">
          {vehicle.price === null ? (
            'Cotizar'
          ) : (
            <>
              Desde <strong>${vehicle.price}</strong>
            </>
          )}
        </span>
      </div>

      <div className="fleet-card__body">
        <h3 className="fleet-card__name">{vehicle.name}</h3>
        <p className="fleet-card__type">{vehicle.type}</p>
        <p className="fleet-card__pax">
          <UsersIcon />
          {vehicle.minPax}–{vehicle.maxPax} pasajeros
        </p>
        <p className="fleet-card__summary">{vehicle.summary}</p>
        <ul className="fleet-card__features">
          {vehicle.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <div className="fleet-card__cta">
          <MagneticButton
            className="btn btn--primary btn--block"
            block
            magnetStrength={0.18}
            onClick={() => onRequest(vehicle.slug)}
            ariaLabel={`Pedir traslado en ${vehicle.name}`}
          >
            Pedir este traslado
            <ArrowIcon />
          </MagneticButton>
        </div>
      </div>
    </motion.article>
  );
}

/**
 * Cuatro tarjetas con los modelos principales, del mismo corte que las de
 * excursiones. "Ver más flota" cambia las cuatro por las otras cuatro en el
 * mismo sitio: el cliente no quiere ocho tarjetas apiladas ocupando media
 * pantalla. Antes había una lista con una ficha grande al lado.
 */
export default function Fleet({
  onRequest,
}: {
  onRequest: (vehicleSlug: string) => void;
}) {
  const [showRest, setShowRest] = useState(false);
  const shown = showRest ? OTHER_FLEET : FEATURED_FLEET;

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
        </div>

        {/* El grupo entero es un solo hijo con clave: sale uno, entra el otro
            en el mismo hueco, y las tarjetas heredan el escalonado. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={showRest ? 'rest' : 'featured'}
            className="fleet__grid"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: 12, transition: { duration: 0.2 } }}
          >
            {shown.map((v, i) => (
              <FleetCard key={v.slug} vehicle={v} index={i} onRequest={onRequest} />
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="fleet__foot">
          <button
            type="button"
            className="fleet__more"
            onClick={() => setShowRest((r) => !r)}
          >
            {showRest ? 'Ver flota principal' : `Ver más flota (${OTHER_FLEET.length} más)`}
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
        </div>
      </div>
    </section>
  );
}
