import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ExcursionCard, { ArrowIcon } from '../components/ExcursionCard';
import { CATEGORIES, EXCURSIONS } from '../data/excursions';
import type { CategoryId, Excursion } from '../data/excursions';

/** The full catalogue, on its own URL. Filters live here, not on the home page. */
export default function ExcursionsPage({
  onSelect,
}: {
  onSelect: (e: Excursion) => void;
}) {
  const [active, setActive] = useState<CategoryId>('todas');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Excursiones en Punta Cana — Dominican Routes';
  }, []);

  const items = useMemo(
    () =>
      active === 'todas'
        ? EXCURSIONS
        : EXCURSIONS.filter((e) => e.category === active),
    [active],
  );

  return (
    <section className="section catalogue">
      <div className="container">
        <Link className="catalogue__back" to="/">
          <ArrowIcon dir="left" />
          Volver al inicio
        </Link>

        <p className="eyebrow catalogue__eyebrow">Catálogo completo</p>
        <h1 className="h1 catalogue__title">
          {EXCURSIONS.length} excursiones por toda la isla
        </h1>
        <p className="catalogue__sub">
          Desde medio día hasta escapadas de dos días. Filtra por lo que te
          interesa y pídenos la que quieras: te cotizamos por correo el mismo día.
        </p>

        <div className="filters" role="tablist" aria-label="Categorías de excursiones">
          {CATEGORIES.map((c) => {
            const count =
              c.id === 'todas'
                ? EXCURSIONS.length
                : EXCURSIONS.filter((e) => e.category === c.id).length;
            const on = active === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={on}
                className={`filter${on ? ' is-active' : ''}`}
                onClick={() => setActive(c.id)}
              >
                {on && (
                  <motion.span
                    layoutId="catalogue-pill"
                    className="filter__pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                {c.label}
                <span className="filter__count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Keyed by filter so the stagger replays: without the remount the new
            cards inherit the container's finished "visible" state and mount
            hidden. */}
        <motion.div
          key={active}
          className="excursions__grid"
          initial="hidden"
          animate="visible"
        >
          {items.map((item, i) => (
            <ExcursionCard key={item.slug} item={item} index={i} onSelect={onSelect} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
