import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MagneticButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  /** Extra pull applied to the label itself, for a subtle parallax feel. */
  innerStrength?: number;
  magnetStrength?: number;
  block?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

/**
 * Wraps a CTA so it drifts toward the cursor while hovered, then springs back
 * (Taste Skill level 4). The wrapper listens rather than the button itself, so
 * the pull starts slightly outside the visual bounds.
 */
export default function MagneticButton({
  children,
  href,
  onClick,
  className = '',
  ariaLabel,
  innerStrength = 0.14,
  magnetStrength = 0.32,
  block = false,
  type = 'button',
  disabled = false,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || disabled) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    setPos({ x: dx * magnetStrength, y: dy * magnetStrength });
  };

  const reset = () => setPos({ x: 0, y: 0 });

  const spring = { type: 'spring' as const, stiffness: 200, damping: 20 };
  const inner = { x: pos.x * innerStrength, y: pos.y * innerStrength };

  const content = (
    <motion.span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
      animate={inner}
      transition={spring}
    >
      {children}
    </motion.span>
  );

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      style={{
        display: block ? 'block' : 'inline-block',
        padding: 6,
        margin: -6,
      }}
    >
      <motion.div
        animate={pos}
        transition={spring}
        style={{ display: block ? 'block' : 'inline-block' }}
      >
        {href ? (
          <a href={href} className={className} aria-label={ariaLabel}>
            {content}
          </a>
        ) : (
          <button
            type={type}
            onClick={onClick}
            className={className}
            aria-label={ariaLabel}
            disabled={disabled}
          >
            {content}
          </button>
        )}
      </motion.div>
    </div>
  );
}
