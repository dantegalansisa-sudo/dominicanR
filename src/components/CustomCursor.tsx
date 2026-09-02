import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const INTERACTIVE_SELECTOR =
  'a, button, input, [role="button"], [data-cursor-hover]';

/**
 * Two-layer cursor: an instant dot plus a ring that trails on a spring.
 * Disabled on coarse pointers and when the user asks for reduced motion.
 */
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [light, setLight] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const ringX = useSpring(cursorX, { damping: 25, stiffness: 250 });
  const ringY = useSpring(cursorY, { damping: 25, stiffness: 250 });

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const allowed = finePointer.matches && !reduced.matches;
    setEnabled(allowed);
    if (!allowed) return;

    document.body.classList.add('custom-cursor');

    const onMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (typeof target?.closest !== 'function') return;
      setHovering(Boolean(target.closest(INTERACTIVE_SELECTOR)));
      setLight(Boolean(target.closest('[data-cursor="light"]')));
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });

    return () => {
      document.body.classList.remove('custom-cursor');
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
    };
  }, [cursorX, cursorY]);

  if (!enabled) return null;

  const tone = light ? ' cursor--light' : '';

  return (
    <>
      <motion.div
        className={`cursor-dot${tone}`}
        style={{ x: cursorX, y: cursorY }}
        animate={{ scale: hovering ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        aria-hidden="true"
      />
      <motion.div
        className={`cursor-ring${tone}`}
        style={{ x: ringX, y: ringY }}
        animate={{
          scale: hovering ? 1.6 : 1,
          opacity: hovering ? 1 : 0.55,
          backgroundColor: hovering
            ? 'rgba(226, 101, 63, 0.12)'
            : 'rgba(226, 101, 63, 0)',
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        aria-hidden="true"
      />
    </>
  );
}
