export const EASINGS = {
  premium: [0.76, 0, 0.24, 1],
  smooth: [0.25, 0.8, 0.25, 1],
  bounce: [0.34, 1.56, 0.64, 1],
  snappy: [0.4, 0, 0.2, 1],
  cinematic: [0.86, 0, 0.07, 1],
} as const;

/** Shared stagger variants for card grids (Taste Skill level 5). */
export const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.1,
    },
  },
};

export const cardVariants = {
  hidden: { opacity: 0, y: 48, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.65,
      ease: EASINGS.premium,
    },
  },
};
