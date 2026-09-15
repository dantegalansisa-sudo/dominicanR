import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import RevealText from './RevealText';
import SearchBar from './SearchBar';
import { EASINGS } from '../utils/easings';
import { useLang } from '../i18n';

export default function Hero() {
  // Pixel-driven so the parallax behaves before the page is tall enough to
  // produce a meaningful scroll progress.
  const [vh, setVh] = useState(900);
  const [still, setStill] = useState(false);
  const { scrollY } = useScroll();
  const { t } = useLang();

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
            {/* Los chips de cifras y la frase de apoyo se fueron al pie, a
                peticion del cliente: el hero se queda con las tres lineas. */}
            <p className="eyebrow hero__eyebrow">{t.hero.eyebrow}</p>
          </motion.div>

          <h1 className="hero__headline">
            <span className="hero__row hero__row--open">
              <RevealText
                key={`open-${t.code}`}
                tag="span"
                className="hero__word"
                immediate
                delay={0.3}
              >
                {t.hero.open}
              </RevealText>
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
                key={`close-${t.code}`}
                tag="span"
                className="hero__word"
                immediate
                delay={1.05}
              >
                {t.hero.close}
              </RevealText>
            </motion.span>
          </h1>
        </div>
      </section>

      <SearchBar />
    </div>
  );
}
