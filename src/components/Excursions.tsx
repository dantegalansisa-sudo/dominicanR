import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import RevealText from './RevealText';
import MagneticButton from './MagneticButton';
import ImagePlaceholder from './ImagePlaceholder';
import { CATEGORIES, EXCURSIONS } from '../data/excursions';
import type { CategoryId, Excursion } from '../data/excursions';
import { EASINGS } from '../utils/easings';

const StarIcon = ({ half = false }: { half?: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
    {half && (
      <defs>
        <linearGradient id="half-star">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.25" />
        </linearGradient>
      </defs>
    )}
    <path
      d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8L12 3Z"
      fill={half ? 'url(#half-star)' : 'currentColor'}
    />
  </svg>
);

const ClockIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </svg>
);

const ArrowIcon = ({ dir = 'right' }: { dir?: 'left' | 'right' }) => (
  <svg
    className="btn__arrow"
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    style={dir === 'left' ? { transform: 'rotate(180deg)' } : undefined}
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

const PERKS = ['Cancelación gratuita', 'Confirmación inmediata', 'Guía profesional'];

// A plain staggerChildren would queue all 38 cards and take 3.4s to finish,
// leaving the far end of the rail mid-animation if you scroll fast. Only the
// first handful need staggering — the rest are off-canvas anyway.
const railCardVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, delay: Math.min(i, 6) * 0.08, ease: EASINGS.premium },
  }),
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = rating - i;
        if (filled >= 0.75) return <StarIcon key={i} />;
        if (filled >= 0.25) return <StarIcon key={i} half />;
        return (
          <span key={i} className="stars__empty">
            <StarIcon />
          </span>
        );
      })}
    </span>
  );
}

function ExcursionCard({
  item,
  index,
  onSelect,
}: {
  item: Excursion;
  index: number;
  onSelect: (e: Excursion) => void;
}) {
  return (
    <motion.article className="exc-card" variants={railCardVariants} custom={index}>
      <div className="exc-card__media">
        <ImagePlaceholder category={item.category} />
        <div className="exc-card__price">
          <span className="exc-card__price-from">Desde</span>
          <strong>{item.price === null ? 'Consultar' : `$${item.price}`}</strong>
          {item.price !== null && (
            <span className="exc-card__price-unit">por persona</span>
          )}
        </div>
      </div>

      <div className="exc-card__body">
        <div className="exc-card__rating">
          <Stars rating={item.rating} />
          <strong>{item.rating.toFixed(1)}</strong>
          <span>{item.reviews}</span>
        </div>

        <h3 className="exc-card__title">{item.name}</h3>

        <p className="exc-card__meta">
          <ClockIcon />
          {item.duration}
        </p>

        <p className="exc-card__desc">{item.description}</p>

        <ul className="exc-card__perks">
          {PERKS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>

        <div className="exc-card__cta">
          <MagneticButton
            className="btn btn--navy btn--block"
            block
            magnetStrength={0.18}
            onClick={() => onSelect(item)}
            ariaLabel={`Ver la experiencia ${item.name}`}
          >
            Ver experiencia
            <ArrowIcon />
          </MagneticButton>
        </div>
      </div>
    </motion.article>
  );
}

export default function Excursions({
  onSelect,
}: {
  onSelect: (e: Excursion) => void;
}) {
  const [active, setActive] = useState<CategoryId>('todas');
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });
  const railRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () =>
      active === 'todas'
        ? EXCURSIONS
        : EXCURSIONS.filter((e) => e.category === active),
    [active],
  );

  const readRail = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 4 ? el.scrollLeft / max : 0);
    setEdges({ start: el.scrollLeft <= 4, end: max <= 4 || el.scrollLeft >= max - 4 });
  }, []);

  // Re-measure when the filter or the layout swaps the rail's contents out.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    el.scrollTo({ left: 0 });
    readRail();
  }, [active, expanded, readRail]);

  useEffect(() => {
    readRail();
    window.addEventListener('resize', readRail);
    return () => window.removeEventListener('resize', readRail);
  }, [readRail]);

  const nudge = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector('.exc-card');
    const step = card ? card.getBoundingClientRect().width + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const cards = items.map((item, i) => (
    <div key={item.slug} className="excursions__cell">
      <ExcursionCard item={item} index={i} onSelect={onSelect} />
    </div>
  ));

  return (
    <section className="section excursions" id="excursiones">
      <div className="container">
        <div className="excursions__head">
          <div>
            <p className="eyebrow">Aventuras</p>
            <RevealText tag="h2" className="h2 excursions__title">
              {['Vive', 'la', 'isla', <em key="verdad">de verdad</em>]}
            </RevealText>
            <p className="excursions__sub">
              {EXCURSIONS.length} experiencias por toda la isla, desde medio día
              hasta escapadas de dos días.
            </p>
          </div>

          {!expanded && (
            <div className="excursions__nav">
              <button
                type="button"
                className="round-btn"
                onClick={() => nudge(-1)}
                disabled={edges.start}
                aria-label="Excursiones anteriores"
              >
                <ArrowIcon dir="left" />
              </button>
              <button
                type="button"
                className="round-btn"
                onClick={() => nudge(1)}
                disabled={edges.end}
                aria-label="Siguientes excursiones"
              >
                <ArrowIcon />
              </button>
            </div>
          )}
        </div>

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
                    layoutId="filter-pill"
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
      </div>

      {/* Keyed by filter and layout so the stagger replays on every change.
          Without the remount the new cards inherit the container's finished
          "visible" state, mount as hidden and never animate in. */}
      {expanded ? (
        <motion.div
          key={`grid-${active}`}
          className="container excursions__grid"
          initial="hidden"
          animate="visible"
        >
          {cards}
        </motion.div>
      ) : (
        <div className="excursions__rail-wrap">
          <motion.div
            key={`rail-${active}`}
            className="excursions__rail container"
            ref={railRef}
            onScroll={readRail}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.05 }}
          >
            {cards}
          </motion.div>
        </div>
      )}

      <div className="container excursions__foot">
        {!expanded && (
          <div className="excursions__progress" aria-hidden="true">
            <motion.span
              className="excursions__progress-bar"
              animate={{ scaleX: Math.max(0.06, progress || 0.06) }}
              transition={{ duration: 0.25, ease: EASINGS.snappy }}
            />
          </div>
        )}

        <MagneticButton
          className="btn btn--ghost-dark"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Volver al carrusel' : `Ver el catálogo completo (${items.length})`}
          <ArrowIcon />
        </MagneticButton>
      </div>
    </section>
  );
}
