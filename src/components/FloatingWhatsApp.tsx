import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const HREF =
  'https://wa.me/18292191573?text=' +
  encodeURIComponent('Hola, necesito información sobre traslados y excursiones.');

export default function FloatingWhatsApp() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(q.matches);
    sync();
    q.addEventListener('change', sync);
    return () => q.removeEventListener('change', sync);
  }, []);

  return (
    <motion.a
      className="wa"
      href={HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 1.5 }}
      whileHover={{ scale: 1.08 }}
    >
      {!reduced && <span className="wa__pulse" aria-hidden="true" />}
      <span className="wa__tip">¿Necesitas ayuda?</span>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a12 12 0 0 1-3.2-1.5 12 12 0 0 1-3.4-4c-.4-.7-.7-1.5-.7-2.3 0-.8.4-1.5.8-1.9.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.3.5.9 1.4 1.7 2 .9.8 1.7 1.1 2 1.2.2.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.4.1.2.1.9-.1 1.5Z" />
      </svg>
    </motion.a>
  );
}
