import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import MagneticButton from './MagneticButton';
import ImagePlaceholder from './ImagePlaceholder';
import type { Excursion } from '../data/excursions';
import { EASINGS } from '../utils/easings';

const PERKS = ['Cancelación gratuita', 'Confirmación inmediata', 'Guía profesional'];

// Cap the stagger: on the full catalogue a plain staggerChildren would queue
// all 38 cards and leave the tail mid-animation while you scroll.
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, delay: Math.min(i, 6) * 0.08, ease: EASINGS.premium },
  }),
};

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

export const ArrowIcon = ({ dir = 'right' }: { dir?: 'left' | 'right' }) => (
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

export default function ExcursionCard({
  item,
  index,
  onSelect,
}: {
  item: Excursion;
  index: number;
  onSelect: (e: Excursion) => void;
}) {
  return (
    <motion.article className="exc-card" variants={cardVariants} custom={index}>
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
