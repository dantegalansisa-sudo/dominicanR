import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import RevealText from './RevealText';
import ExcursionCard, { ArrowIcon } from './ExcursionCard';
import { EXCURSIONS, FEATURED_EXCURSIONS } from '../data/excursions';
import type { Excursion } from '../data/excursions';

/**
 * Home section: only the six the client sells most, laid out 3 + 3 so nothing
 * is ever half-cut the way a carousel leaves the trailing card. The full
 * catalogue lives on its own page.
 */
export default function Excursions({
  onSelect,
}: {
  onSelect: (e: Excursion) => void;
}) {
  return (
    <section className="section excursions" id="excursiones">
      <div className="container">
        <div className="excursions__head">
          <div>
            <p className="eyebrow">Las más solicitadas</p>
            <RevealText tag="h2" className="h2 excursions__title">
              {['Vive', 'la', 'isla', <em key="verdad">de verdad</em>]}
            </RevealText>
            <p className="excursions__sub">
              Las seis experiencias que más nos piden. Tenemos{' '}
              {EXCURSIONS.length} en total.
            </p>
          </div>
        </div>

        <motion.div
          className="excursions__grid excursions__grid--six"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {FEATURED_EXCURSIONS.map((item, i) => (
            <ExcursionCard key={item.slug} item={item} index={i} onSelect={onSelect} />
          ))}
        </motion.div>

        <div className="excursions__foot excursions__foot--center">
          <Link className="btn btn--ghost-dark" to="/excursiones">
            Ver las {EXCURSIONS.length} excursiones
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
