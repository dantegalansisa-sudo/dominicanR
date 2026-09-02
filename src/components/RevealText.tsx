import { Fragment } from 'react';
import type { ElementType, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { EASINGS } from '../utils/easings';

interface RevealTextProps {
  /** Plain string, or an array of nodes where each entry is one "word". */
  children: string | ReactNode[];
  className?: string;
  delay?: number;
  stagger?: number;
  tag?: ElementType;
  /** Fire on mount instead of on scroll — used for above-the-fold copy. */
  immediate?: boolean;
}

/**
 * Word-by-word mask reveal. Each word sits inside an overflow-hidden span so it
 * slides up from behind its own baseline (Taste Skill level 2). The padding /
 * negative-margin pair keeps descenders from being clipped by that mask.
 */
export default function RevealText({
  children,
  className = '',
  delay = 0,
  stagger = 0.07,
  tag: Tag = 'h2',
  immediate = false,
}: RevealTextProps) {
  const words = typeof children === 'string' ? children.split(' ') : children;

  const animateProps = immediate
    ? { animate: { y: 0, rotate: 0 } }
    : {
        whileInView: { y: 0, rotate: 0 },
        viewport: { once: true, amount: 0.6 as const },
      };

  return (
    <Tag className={className}>
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
            <motion.span
              style={{ display: 'inline-block' }}
              initial={{ y: '110%', rotate: 2 }}
              {...animateProps}
              transition={{
                duration: 0.85,
                delay: delay + i * stagger,
                ease: EASINGS.premium,
              }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 && ' '}
        </Fragment>
      ))}
    </Tag>
  );
}
