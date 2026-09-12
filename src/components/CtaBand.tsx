import { motion } from 'framer-motion';
import RevealText from './RevealText';
import MagneticButton from './MagneticButton';
import { EASINGS } from '../utils/easings';
import { useT } from '../i18n';
import { useSettings } from '../catalog/CatalogProvider';

export default function CtaBand() {
  const t = useT();
  const s = useSettings();
  const WHATSAPP = `https://wa.me/${s.whatsapp}?text=` + encodeURIComponent(t.cta.whatsapp);
  return (
    <section className="section cta-band">
      <div className="container">
        <motion.div
          className="cta-card"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: EASINGS.premium }}
        >
          <div className="cta-card__glow" aria-hidden="true" />

          <div className="cta-card__body">
            <p className="eyebrow cta-card__eyebrow">{t.cta.eyebrow}</p>
            <RevealText key={t.code} tag="h2" className="h2 cta-card__title">
              {t.cta.title}
            </RevealText>
            <p className="cta-card__sub">{t.cta.sub}</p>

            <div className="cta-card__actions">
              <MagneticButton className="btn btn--primary" href="#contacto">
                {t.cta.button}
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

              <a className="cta-card__phone" href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>
                <span>{t.cta.orCall}</span>
                <strong>{s.phone}</strong>
              </a>
            </div>

            <p className="cta-card__alt">
              {t.cta.also}{' '}
              <a href={`mailto:${s.email}`}>{s.email}</a>
              {' '}{t.cta.or}{' '}
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
              .
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
