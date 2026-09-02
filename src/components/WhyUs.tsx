import { motion } from 'framer-motion';
import RevealText from './RevealText';
import { EASINGS } from '../utils/easings';

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const REASONS = [
  {
    title: 'Puntualidad garantizada',
    copy: 'Cumplimos los horarios acordados. Si tu vuelo se adelanta o se retrasa, el conductor ya lo sabe.',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" {...s} />
        <path d="M12 7v5l3.2 1.9" {...s} />
      </>
    ),
  },
  {
    title: 'Seguridad total',
    copy: 'Vehículos en perfecto estado y conductores profesionales certificados, sin excepción.',
    icon: (
      <>
        <path d="M12 3.2l7 3v5.4c0 4.5-3 8-7 9.4-4-1.4-7-4.9-7-9.4V6.2l7-3Z" {...s} />
        <path d="m9 12 2.1 2.1L15.2 10" {...s} />
      </>
    ),
  },
  {
    title: 'Trato de anfitrión',
    copy: 'Personal capacitado que conoce la isla y responde en tu idioma, no solo alguien al volante.',
    icon: (
      <>
        <circle cx="12" cy="8.2" r="3.6" {...s} />
        <path d="M5 20.2a7 7 0 0 1 14 0" {...s} />
        <path d="M18.5 4.4l.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7Z" {...s} />
      </>
    ),
  },
  {
    title: 'Precio cerrado',
    copy: 'Tarifas competitivas sin cargos sorpresa al final. Lo que cotizamos es lo que pagas.',
    icon: (
      <>
        <path d="M20.2 12.6 12.6 20.2a1.8 1.8 0 0 1-2.5 0l-6.3-6.3a1.8 1.8 0 0 1-.5-1.3V5a1.8 1.8 0 0 1 1.8-1.8h7.6c.5 0 .9.2 1.3.5l6.2 6.3a1.8 1.8 0 0 1 0 2.6Z" {...s} />
        <circle cx="8" cy="8" r="1.4" {...s} />
      </>
    ),
  },
];

export default function WhyUs() {
  return (
    <section className="section whyus" id="nosotros">
      <div className="container">
        <p className="eyebrow">La diferencia</p>
        <RevealText tag="h2" className="h2 whyus__title">
          {['Comprometidos', 'con', 'tu', <em key="exp">experiencia</em>]}
        </RevealText>

        <motion.div
          className="whyus__grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
          }}
        >
          {REASONS.map((r) => (
            <motion.article
              key={r.title}
              className="reason"
              variants={{
                hidden: { opacity: 0, y: 44, scale: 0.97 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.62, ease: EASINGS.premium },
                },
              }}
            >
              <span className="reason__icon">
                <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
                  {r.icon}
                </svg>
              </span>
              <h3 className="reason__title">{r.title}</h3>
              <p className="reason__copy">{r.copy}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
