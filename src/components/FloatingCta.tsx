import { useEffect, useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

/**
 * Booking is the goal, so the persistent floating action points at the form.
 * WhatsApp stays available in the contact section and the footer, but it is a
 * secondary channel: the client prefers requests to arrive by email.
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
    if (!target) return;
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
      href="#contacto"
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
      <span className="fab__dot" aria-hidden="true" />
      Reservar ahora
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.a>
  );
}
