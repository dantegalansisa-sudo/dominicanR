import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { EASINGS } from '../utils/easings';

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';

// The scroll trigger has to live on the container, never on the sliding word:
// each word starts translated 110% down, fully outside its overflow-hidden
// mask, so an IntersectionObserver on the word itself reports 0% forever and
// the reveal deadlocks — hidden because it never fires, never firing because
// it is hidden.
const MOTION_TAGS = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  span: motion.span,
  div: motion.div,
} as const;

const wordVariants: Variants = {
  hidden: { y: '110%', rotate: 2 },
  visible: {
    y: 0,
    rotate: 0,
    transition: { duration: 0.85, ease: EASINGS.premium },
  },
};

interface RevealTextProps {
  /** Plain string, or an array of nodes where each entry is one "word". */
  children: string | ReactNode[];
  className?: string;
  delay?: number;
  stagger?: number;
  tag?: Tag;
  /** Fire on mount instead of on scroll — used for above-the-fold copy. */
  immediate?: boolean;
}

/**
 * Word-by-word mask reveal (Taste Skill level 2). Each word sits inside an
 * overflow-hidden span so it slides up from behind its own baseline; the
 * padding / negative-margin pair keeps descenders from being clipped.
 */
export default function RevealText({
  children,
  className = '',
  delay = 0,
  stagger = 0.07,
  tag = 'h2',
  immediate = false,
}: RevealTextProps) {
  const words = typeof children === 'string' ? children.split(' ') : children;
  const MotionTag = MOTION_TAGS[tag];

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: { delayChildren: delay, staggerChildren: stagger },
    },
  };

  const trigger = immediate
    ? { animate: 'visible' as const }
    : {
        whileInView: 'visible' as const,
        viewport: { once: true, amount: 0.4 as const },
      };

  return (
    <MotionTag
      className={className}
      variants={containerVariants}
      initial="hidden"
      {...trigger}
    >
      {words.map((word, i) => (
        <Fragment key={i}>
          <span
            style={{
              overflow: 'hidden',
              display: 'inline-block',
              verticalAlign: 'bottom',
              paddingBottom: '0.14em',
              marginBottom: '-0.14em',
            }}
          >
            <motion.span style={{ display: 'inline-block' }} variants={wordVariants}>
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 && ' '}
        </Fragment>
      ))}
    </MotionTag>
  );
}
