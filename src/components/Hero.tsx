import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import RevealText from './RevealText';
import SearchBar from './SearchBar';
import { EASINGS } from '../utils/easings';
import { EXCURSIONS } from '../data/excursions';
import { FLEET } from '../data/fleet';

// Derived from the real catalogue — nothing here is a made-up figure.
const AVG_RATING =
  EXCURSIONS.reduce((sum, e) => sum + e.rating, 0) / EXCURSIONS.length;

const TOTAL_REVIEWS = EXCURSIONS.reduce(
  (sum, e) => sum + Number(e.reviews.replace(/[^0-9]/g, '')),
  0,
).toLocaleString('es-DO') + '+';

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8L12 3Z" />
  </svg>
);

const RouteIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="6" cy="18" r="2.6" />
    <circle cx="18" cy="6" r="2.6" />
    <path d="M8.6 18h5.4a3.4 3.4 0 0 0 0-6.8h-4a3.4 3.4 0 0 1 0-6.8h5.4" />
  </svg>
);

export default function Hero() {
  // Pixel-driven so the parallax behaves before the page is tall enough to
  // produce a meaningful scroll progress.
  const [vh, setVh] = useState(900);
  const [still, setStill] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    const measure = () => setVh(window.innerHeight);
    measure();
    window.addEventListener('resize', measure);

    // Hold the poster frame instead of looping the landscape.
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setStill(motionQuery.matches);
    syncMotion();
    motionQuery.addEventListener('change', syncMotion);

    return () => {
      window.removeEventListener('resize', measure);
      motionQuery.removeEventListener('change', syncMotion);
    };
  }, []);

  // Taste Skill level 3 — the lettering drifts and swells as you leave the hero.
  // NOTE: the no-mask fallback leans on mix-blend-mode, so nothing on the
  // lettering's ancestor chain may animate opacity — that isolates the blend
  // group and the artwork's white plate reappears.
  const letterY = useTransform(scrollY, [0, vh], [0, -64]);
  const letterScale = useTransform(scrollY, [0, vh], [1, 1.07]);
  const closeY = useTransform(scrollY, [0, vh], [0, 34]);

  return (
    <div className="hero-shell">
      <section className="hero" id="inicio">
        <div className="hero__glow" aria-hidden="true" />

        <div className="container hero__inner">
          <motion.div
            className="hero__top"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASINGS.premium }}
          >
            <p className="eyebrow hero__eyebrow">
              Punta Cana · República Dominicana
            </p>

            <div className="hero__chips">
              <span className="chip">
                <StarIcon />
                <strong>{AVG_RATING.toFixed(1)}</strong> de 5 · {TOTAL_REVIEWS} reseñas
              </span>
              <span className="chip">
                <RouteIcon />
                <strong>{EXCURSIONS.length}</strong> excursiones · {FLEET.length} vehículos
              </span>
            </div>
          </motion.div>

          <h1 className="hero__headline">
            <span className="hero__row hero__row--open">
              <RevealText
                tag="span"
                className="hero__word"
                immediate
                delay={0.3}
              >
                Descubre
              </RevealText>

              <motion.span
                className="hero__sub"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2, ease: EASINGS.premium }}
              >
                Traslados privados y excursiones diseñadas para que solo te
                preocupes por disfrutar.
              </motion.span>
            </span>

            <motion.span
              className="hero__lettering"
              style={{ y: letterY, scale: letterScale }}
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 1.35, delay: 0.42, ease: EASINGS.premium }}
            >
              {/* Sets the box size, and is the visible layer if the browser
                  has no mask support. Otherwise it is hidden and the masked
                  video takes over. */}
              <img
                className="hero__lettering-still"
                src="/images/punta-cana-lettering.webp"
                alt="Punta Cana"
                width={1718}
                height={482}
                fetchPriority="high"
              />

              <span className="hero__lettering-video" aria-hidden="true">
                <video
                  autoPlay={!still}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/images/punta-cana-poster.jpg"
                >
                  <source
                    src="/video/punta-cana-sm.mp4"
                    type="video/mp4"
                    media="(max-width: 760px)"
                  />
                  <source src="/video/punta-cana-lg.mp4" type="video/mp4" />
                </video>
              </span>
            </motion.span>

            <motion.span className="hero__row hero__row--close" style={{ y: closeY }}>
              <RevealText
                tag="span"
                className="hero__word"
                immediate
                delay={1.05}
              >
                como se debe vivir
              </RevealText>
            </motion.span>
          </h1>
        </div>
      </section>

      <SearchBar />
    </div>
  );
}
