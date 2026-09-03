import { useEffect, useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

const HREF =
  'https://wa.me/18292191573?text=' +
  encodeURIComponent('Hola, quiero reservar un traslado o una excursión.');

/**
 * Quick line to a person. The structured requests go through the form — every
 * section CTA feeds it — but this one is the "quiero hablar ya" shortcut, so it
 * opens WhatsApp and carries its icon to say so before you tap.
 */
export default function FloatingCta() {
  const [pastHero, setPastHero] = useState(false);
  const [atForm, setAtForm] = useState(false);
  const { scrollY } = useScroll();

  // Hold it back until the hero is behind you — the hero has its own search bar.
  useMotionValueEvent(scrollY, 'change', (v) => setPastHero(v > 600));

  // Once the form is on screen the button is both redundant and in the way.
  useEffect(() => {
    const target = document.getElementById('contacto');
    if (!target) {
      setAtForm(false);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setAtForm(entry!.isIntersecting),
      { threshold: 0.12 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  const shown = pastHero && !atForm;

  return (
    <motion.a
      className="fab"
      href={HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      initial={false}
      animate={{
        y: shown ? 0 : 90,
        opacity: shown ? 1 : 0,
        pointerEvents: shown ? 'auto' : 'none',
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      whileHover={{ scale: 1.04 }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a12 12 0 0 1-3.2-1.5 12 12 0 0 1-3.4-4c-.4-.7-.7-1.5-.7-2.3 0-.8.4-1.5.8-1.9.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.3.5.9 1.4 1.7 2 .9.8 1.7 1.1 2 1.2.2.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.4.1.2.1.9-.1 1.5Z" />
      </svg>
      Reservar ahora
    </motion.a>
  );
}
