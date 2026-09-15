import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { EASINGS } from '../utils/easings';

/**
 * La palabra de apertura del hero ("Descubre"). Entra letra a letra, cada
 * una subiendo desde detrás de una máscara y enderezándose, y cuando termina
 * un trazo coral a mano alzada se dibuja debajo. Después se queda quieta: es
 * la puerta al rótulo grande, no compite con él.
 */

const container: Variants = {
  hidden: {},
  visible: (delay: number) => ({
    transition: { delayChildren: delay, staggerChildren: 0.05 },
  }),
};

const letter: Variants = {
  hidden: { y: '115%', rotate: 8, opacity: 0 },
  visible: {
    y: 0,
    rotate: 0,
    opacity: 1,
    transition: { duration: 0.8, ease: EASINGS.premium },
  },
};

export default function HeroWord({ text, delay = 0.3 }: { text: string; delay?: number }) {
  const letters = Array.from(text);
  // El trazo arranca cuando la última letra ya está casi en su sitio.
  const strokeDelay = delay + letters.length * 0.05 + 0.35;

  return (
    <motion.span
      className="hero__word hero__word--open"
      variants={container}
      custom={delay}
      initial="hidden"
      animate="visible"
      aria-label={text}
    >
      {letters.map((ch, i) => (
        <span className="hero__letter-mask" key={i} aria-hidden="true">
          <motion.span className="hero__letter" variants={letter}>
            {ch === ' ' ? ' ' : ch}
          </motion.span>
        </span>
      ))}

      <svg
        className="hero__stroke"
        viewBox="0 0 300 24"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <motion.path
          d="M4 16 C 70 4, 150 22, 296 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.75, delay: strokeDelay, ease: EASINGS.premium },
            opacity: { duration: 0.2, delay: strokeDelay },
          }}
        />
      </svg>
    </motion.span>
  );
}
