
export const ANIM_VARIANTS = {
  page: {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  modal: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
    transition: { type: 'spring', damping: 25, stiffness: 300 }
  },
  staggerContainer: {
    animate: { transition: { staggerChildren: 0.05 } }
  },
  staggerItem: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  },
  tap: {
    whileTap: { scale: 0.96 },
    transition: { type: 'spring', stiffness: 500, damping: 30 }
  }
};
