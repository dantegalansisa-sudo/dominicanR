import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import RevealText from './RevealText';
import ExcursionCard, { ArrowIcon } from './ExcursionCard';
import type { Excursion } from '../data/excursions';
import { useT } from '../i18n';
import { useExcursions, useFeaturedExcursions } from '../i18n/catalog';

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
  const t = useT();
  const featured = useFeaturedExcursions();
  const EXCURSIONS = useExcursions();
  return (
    <section className="section excursions" id="excursiones">
      <div className="container">
        <div className="excursions__head">
          <div>
            <p className="eyebrow">{t.excursions.eyebrow}</p>
            <RevealText key={t.code} tag="h2" className="h2 excursions__title">
              {t.excursions.title}
            </RevealText>
            <p className="excursions__sub">{t.excursions.sub(EXCURSIONS.length)}</p>
          </div>
        </div>

        <motion.div
          className="excursions__grid excursions__grid--six"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {featured.map((item, i) => (
            <ExcursionCard key={item.slug} item={item} index={i} onSelect={onSelect} eager />
          ))}
        </motion.div>

        <div className="excursions__foot excursions__foot--center">
          <Link className="btn btn--ghost-dark" to="/excursiones">
            {t.excursions.seeAll(EXCURSIONS.length)}
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
