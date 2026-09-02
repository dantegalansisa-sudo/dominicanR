import { motion } from 'framer-motion';
import { EASINGS } from '../utils/easings';

const NAV = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Excursiones', href: '#excursiones' },
  { label: 'Traslados', href: '#traslados' },
  { label: 'Quiénes Somos', href: '#nosotros' },
  { label: 'Contacto', href: '#contacto' },
];

const SOCIAL = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/dominicanroutes',
    path: 'M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.9-.1Zm0 3.1a6.7 6.7 0 1 0 0 13.4 6.7 6.7 0 0 0 0-13.4Zm0 11a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6Zm8.5-11.3a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0Z',
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/dominicanroutes',
    path: 'M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z',
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/18292191573',
    path: 'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a12 12 0 0 1-3.2-1.5 12 12 0 0 1-3.4-4c-.4-.7-.7-1.5-.7-2.3 0-.8.4-1.5.8-1.9.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.3.5.9 1.4 1.7 2 .9.8 1.7 1.1 2 1.2.2.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.4.1.2.1.9-.1 1.5Z',
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__glow" aria-hidden="true" />

      <motion.div
        className="container footer__grid"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
      >
        {[
          <div key="brand" className="footer__brand">
            <img src="/images/logo.png" alt="Dominican Routes" width={1066} height={385} />
            <p className="footer__tagline">Tu aventura comienza aquí.</p>
          </div>,

          <nav key="nav" aria-label="Pie de página">
            <h3 className="footer__head">Navegación</h3>
            <ul className="footer__links">
              {NAV.map((l) => (
                <li key={l.href}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>,

          <div key="contact">
            <h3 className="footer__head">Contacto</h3>
            <ul className="footer__links">
              <li>Punta Cana, La Altagracia</li>
              <li>
                <a href="tel:+18292191573">+1 (829) 219-1573</a>
              </li>
              <li>
                <a href="mailto:dominicanroutes@gmail.com">dominicanroutes@gmail.com</a>
              </li>
              <li>Atención 24/7</li>
            </ul>
          </div>,

          <div key="social">
            <h3 className="footer__head">Síguenos</h3>
            <div className="footer__social">
              {SOCIAL.map((sn) => (
                <a
                  key={sn.label}
                  href={sn.href}
                  aria-label={sn.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={sn.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>,
        ].map((child, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, y: 22 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, ease: EASINGS.premium },
              },
            }}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>

      <div className="container footer__bar">
        <span>© {new Date().getFullYear()} Dominican Routes</span>
        <span>
          Diseñado por{' '}
          <a href="https://nexixtechstudio.com" target="_blank" rel="noopener noreferrer">
            NEXIX Tech Studio
          </a>
        </span>
      </div>
    </footer>
  );
}
