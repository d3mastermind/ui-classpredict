// Shared motion language: one easing, one entrance, one stagger rhythm.
export const ease = [0.22, 1, 0.36, 1];
export const spring = { type: "spring", stiffness: 420, damping: 36, mass: 0.8 };
export const softSpring = { type: "spring", stiffness: 220, damping: 28 };

export const stagger = (gap = 0.06, delay = 0.02) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

// Elements rise, sharpen and fade in.
export const rise = {
  hidden: { opacity: 0, y: 18, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.75, ease } },
};

export const fade = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease } },
};

export const pop = {
  hidden: { opacity: 0, scale: 0.96, filter: "blur(6px)" },
  show: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.5, ease } },
};

export const page = {
  initial: { opacity: 0, y: 10, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease } },
  exit: { opacity: 0, y: -6, filter: "blur(6px)", transition: { duration: 0.22, ease } },
};

export const popover = {
  initial: { opacity: 0, scale: 0.96, y: -6, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.28, ease } },
  exit: { opacity: 0, scale: 0.97, y: -4, filter: "blur(4px)", transition: { duration: 0.16, ease } },
};
