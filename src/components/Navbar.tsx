import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { EASINGS } from '../utils/easings';
import { useLang } from '../i18n';
import type { Lang } from '../i18n';

const HREFS = ['/#inicio', '/#traslados', '/excursiones', '/#nosotros', '/#contacto'];

export default function Navbar() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const { lang, setLang, t } = useLang();
  const { scrollY } = useScroll();

  const LINKS = [t.nav.home, t.nav.transfers, t.nav.excursions, t.nav.about, t.nav.contact].map(
    (label, i) => ({ label, href: HREFS[i]! }),
  );

  useMotionValueEvent(scrollY, 'change', (v) => setSolid(v > 80));

  // Freeze the page behind the mobile overlay.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <motion.header
        className={`nav${open ? ' nav--open' : ''}`}
        initial={false}
        animate={{
          backgroundColor:
            solid && !open ? 'rgba(255,255,255,0.94)' : 'rgba(247,243,236,0)',
          boxShadow:
            solid && !open
              ? '0 6px 28px rgba(11,30,51,0.09)'
              : '0 0px 0px rgba(11,30,51,0)',
          backdropFilter: solid && !open ? 'blur(14px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.35, ease: EASINGS.smooth }}
      >
        <div className="container nav__inner">
          <a href="/#inicio" className="nav__brand" aria-label={t.nav.brand}>
            <img
              src="/images/logo.png"
              alt="Dominican Routes"
              width={1066}
              height={385}
            />
          </a>

          <nav className="nav__links" aria-label={t.nav.main}>
            {LINKS.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                className={`nav__link${i === 0 ? ' is-active' : ''}`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="nav__right">
            <div className="nav__lang" role="group" aria-label={t.nav.language}>
              {(['es', 'en'] as Lang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  lang={code}
                  className={lang === code ? 'is-active' : ''}
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Dice "Reservar", asi que lleva a la reserva de verdad y no al
                formulario de contacto generico. */}
            <a className="nav__cta" href="/reservar">
              {t.nav.book}
            </a>

            <button
              type="button"
              className="nav__burger"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
              aria-expanded={open}
            >
              <motion.span animate={{ rotate: open ? 45 : 0, y: open ? 6.5 : 0 }} />
              <motion.span animate={{ opacity: open ? 0 : 1 }} />
              <motion.span animate={{ rotate: open ? -45 : 0, y: open ? -6.5 : 0 }} />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="nav-overlay"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.6, ease: EASINGS.premium }}
          >
            <ul className="nav-overlay__list">
              {LINKS.map((l, i) => (
                <li key={l.href} style={{ overflow: 'hidden' }}>
                  <motion.a
                    href={l.href}
                    className="nav-overlay__item"
                    style={{ display: 'inline-block' }}
                    initial={{ y: '110%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '110%' }}
                    transition={{
                      duration: 0.7,
                      delay: 0.15 + i * 0.06,
                      ease: EASINGS.premium,
                    }}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </motion.a>
                </li>
              ))}
            </ul>

            <motion.div
              className="nav-overlay__foot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span>dominicanroutes@gmail.com</span>
              <span>+1 (829) 219-1573</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
