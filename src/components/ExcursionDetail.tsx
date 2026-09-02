import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ImagePlaceholder from './ImagePlaceholder';
import MagneticButton from './MagneticButton';
import { CATEGORIES } from '../data/excursions';
import type { Excursion } from '../data/excursions';
import { EASINGS } from '../utils/easings';

const WHATSAPP = 'https://wa.me/18292191573';

const GUARANTEES = [
  'Confirmación por correo el mismo día',
  'Cancelación gratuita hasta 24 horas antes',
  'Guía profesional certificado',
  'Recogida y regreso a tu hotel incluidos',
];

const Ico = ({ d }: { d: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

export default function ExcursionDetail({
  item,
  onClose,
  onReserve,
}: {
  item: Excursion | null;
  onClose: () => void;
  onReserve: (e: Excursion) => void;
}) {
  const [pax, setPax] = useState(2);
  const [date, setDate] = useState('');

  // Lock the page behind the panel and wire up Escape.
  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [item, onClose]);

  const categoryLabel = item
    ? (CATEGORIES.find((c) => c.id === item.category)?.label ?? '')
    : '';

  const total = item?.price != null ? item.price * pax : null;

  const waHref = item
    ? `${WHATSAPP}?text=${encodeURIComponent(
        `Hola, quiero reservar "${item.name}" para ${pax} ${
          pax === 1 ? 'persona' : 'personas'
        }${date ? ` el ${date}` : ''}.`,
      )}`
    : WHATSAPP;

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            className="sheet__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          <motion.aside
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={item.name}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.55, ease: EASINGS.premium }}
          >
            <button
              type="button"
              className="sheet__close"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <Ico d="M6 6l12 12M18 6L6 18" />
            </button>

            <div className="sheet__scroll">
              <div className="sheet__media">
                <ImagePlaceholder category={item.category} />
              </div>

              <div className="sheet__body">
                <p className="eyebrow">{categoryLabel}</p>
                <h2 className="sheet__title">{item.name}</h2>

                <div className="sheet__facts">
                  <span className="sheet__fact">
                    <Ico d="M12 7.5V12l3 1.8M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z" />
                    {item.duration}
                  </span>
                  <span className="sheet__fact">
                    <Ico d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8L12 3Z" />
                    {item.rating.toFixed(1)} · {item.reviews} reseñas
                  </span>
                  <span className="sheet__fact">
                    <Ico d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    Punta Cana
                  </span>
                </div>

                <p className="sheet__desc">{item.description}</p>

                <h3 className="sheet__sub">Lo que siempre está incluido</h3>
                <ul className="sheet__list">
                  {GUARANTEES.map((g, i) => (
                    <motion.li
                      key={g}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.06, duration: 0.4 }}
                    >
                      {g}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="sheet__foot">
              <div className="sheet__booking">
                <label className="sheet__field">
                  <span>Fecha</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>

                <div className="sheet__field">
                  <span>Pasajeros</span>
                  <div className="sheet__stepper">
                    <button
                      type="button"
                      onClick={() => setPax((p) => Math.max(1, p - 1))}
                      disabled={pax <= 1}
                      aria-label="Quitar pasajero"
                    >
                      –
                    </button>
                    <strong aria-live="polite">{pax}</strong>
                    <button
                      type="button"
                      onClick={() => setPax((p) => Math.min(30, p + 1))}
                      disabled={pax >= 30}
                      aria-label="Agregar pasajero"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="sheet__total">
                <span>{total === null ? 'Precio' : 'Total estimado'}</span>
                <strong>
                  {total === null ? 'A cotizar' : `$${total.toLocaleString('es-DO')}`}
                </strong>
              </div>

              <MagneticButton
                className="btn btn--primary btn--block"
                block
                magnetStrength={0.16}
                onClick={() => onReserve(item)}
              >
                Solicitar esta reserva
                <Ico d="M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5" />
              </MagneticButton>

              <p className="sheet__alt">
                Te confirmamos por correo. ¿Prefieres WhatsApp?{' '}
                <a href={waHref} target="_blank" rel="noopener noreferrer">
                  Escríbenos
                </a>
                .
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
