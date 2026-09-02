import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import RevealText from './RevealText';
import MagneticButton from './MagneticButton';
import SearchBar from './SearchBar';
import { EASINGS } from '../utils/easings';

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
  const { scrollY } = useScroll();

  useEffect(() => {
    const measure = () => setVh(window.innerHeight);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Taste Skill level 3 — the lettering drifts and swells as you leave the hero.
  // NOTE: nothing on the lettering's ancestor chain may animate opacity — that
  // isolates the blend group and the plate's white background reappears.
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
                <strong>4.9</strong> de 5 · +5.000 viajeros
              </span>
              <span className="chip">
                <RouteIcon />
                <strong>12.000+</strong> traslados completados
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
              <img
                src="/images/punta-cana-lettering.webp"
                alt="Punta Cana"
                width={1718}
                height={482}
                fetchPriority="high"
              />
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

              <motion.span
                className="hero__actions"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.32, ease: EASINGS.premium }}
              >
                <MagneticButton href="#excursiones" className="btn btn--primary">
                  Ver Excursiones
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
                </MagneticButton>

                <MagneticButton href="#traslados" className="btn btn--ghost-dark">
                  Ver Traslados
                </MagneticButton>
              </motion.span>
            </motion.span>
          </h1>
        </div>
      </section>

      <SearchBar />
    </div>
  );
}
