import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import RevealText from './RevealText';
import HeroWord from './HeroWord';
import HeroLettering from './HeroLettering';
import SearchBar from './SearchBar';
import { EASINGS } from '../utils/easings';
import { useLang } from '../i18n';

export default function Hero() {
  // Pixel-driven so the parallax behaves before the page is tall enough to
  // produce a meaningful scroll progress.
  const [vh, setVh] = useState(900);
  const { scrollY } = useScroll();
  const { t } = useLang();

  useEffect(() => {
    const measure = () => setVh(window.innerHeight);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
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
              <HeroWord key={`open-${t.code}`} text={t.hero.open} delay={0.3} />
            </span>

            <HeroLettering style={{ y: letterY, scale: letterScale }} />

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
