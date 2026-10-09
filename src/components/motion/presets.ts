// Shared motion vocabulary. Every Motion animation in the app takes its
// timing from here, so movement feels like one system: quick, springy
// responses to the learner's hands; calmer, eased reveals for content.
//
// Simple entrances stay in CSS (Reveal + globals.css): they're cheaper and
// already batched by one shared IntersectionObserver. Motion is used where
// CSS falls short: springs, exit animations, height/layout changes, SVG path
// drawing and values that follow state.

import type { Transition, Variants } from "motion/react";

/** The CSS --ease-out-expo curve, so CSS and Motion reveals match. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const spring = {
  /** Taps, toggles, selected states: fast, a hint of overshoot. */
  snappy: { type: "spring", stiffness: 520, damping: 32, mass: 0.8 },
  /** Panels, cards and things that move across space. */
  gentle: { type: "spring", stiffness: 210, damping: 28 },
  /** Celebrations and things that pop into place. */
  bouncy: { type: "spring", stiffness: 380, damping: 18 },
  /** Values that follow input (sliders, progress): smooth, no overshoot. */
  follow: { type: "spring", stiffness: 140, damping: 26, restDelta: 0.001 },
} satisfies Record<string, Transition>;

export const duration = { fast: 0.18, base: 0.35, slow: 0.6, draw: 0.9 } as const;

/** Content that appears: rise a little and fade in. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, transition: { duration: duration.fast } },
};

/** A parent that staggers its children's `rise`. */
export const staggerParent = (gap = 0.07, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

/** Press feedback for anything tappable. */
export const press = {
  whileTap: { scale: 0.96 },
  transition: spring.snappy,
} as const;

/** Viewport options for scroll-triggered reveals: once, a little before fully in view. */
export const inViewOnce = { once: true, margin: "0px 0px -12% 0px" } as const;
