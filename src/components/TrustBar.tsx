import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';
import { EXCURSIONS } from '../data/excursions';
import { FLEET } from '../data/fleet';
import { EASINGS } from '../utils/easings';

// Every figure here is derived from the client's own catalogue rather than
// invented, so nothing on the page claims more than they can back up.
const AVG_RATING =
  EXCURSIONS.reduce((sum, e) => sum + e.rating, 0) / EXCURSIONS.length;

const TOTAL_REVIEWS = EXCURSIONS.reduce(
  (sum, e) => sum + Number(e.reviews.replace(/[^0-9]/g, '')),
  0,
);

const STATS = [
  {
    node: <AnimatedCounter target={EXCURSIONS.length} />,
    label: 'Excursiones en catálogo',
  },
  {
    node: <AnimatedCounter target={AVG_RATING} decimals={1} />,
    label: 'Calificación promedio',
  },
  {
    node: <AnimatedCounter target={TOTAL_REVIEWS} suffix="+" />,
    label: 'Reseñas de viajeros',
  },
  {
    node: <AnimatedCounter target={FLEET.length} />,
    label: 'Tipos de vehículo',
  },
];

export default function TrustBar() {
  return (
    <section className="trustbar" aria-label="Dominican Routes en cifras">
      <motion.div
        className="container trustbar__grid"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
      >
        {STATS.map((s) => (
          <motion.div
            key={s.label}
            className="trustbar__item"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, ease: EASINGS.premium },
              },
            }}
          >
            <span className="trustbar__value">{s.node}</span>
            <span className="trustbar__label">{s.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
