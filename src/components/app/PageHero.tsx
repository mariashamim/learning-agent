"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "../motion/presets";

/**
 * The ink header every browsing page opens with: a meta line, a large
 * headline (put an <span className="accent-word"> inside for the serif
 * accent), a lead, and optional extras such as stat chips.
 */
export function PageHero({
  kicker,
  aside,
  title,
  lead,
  children,
  backdrop,
}: {
  /** Left of the meta line, e.g. "Courses". */
  kicker: string;
  /** Right of the meta line, e.g. a count. */
  aside?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  /** Something drawn behind the text (e.g. an interactive dot field). */
  backdrop?: ReactNode;
}) {
  const show = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: EASE_OUT, delay },
  });
  return (
    <section className="surface-ink hero-ink relative overflow-hidden">
      {backdrop}
      <div className="relative mx-auto max-w-7xl px-4 pt-6 pb-14 sm:px-6 lg:px-10 lg:pb-20">
        <motion.div className="meta-line" {...show(0)}>
          <span>{kicker}</span>
          <span className="rule" />
          {aside && <span>{aside}</span>}
        </motion.div>
        <motion.h1 className="font-display mt-10 max-w-5xl text-[clamp(44px,6.6vw,96px)] leading-[0.95] text-sand" {...show(0.08)}>
          {title}
        </motion.h1>
        {lead && (
          <motion.p className="mt-6 max-w-xl text-[17px] leading-relaxed text-taupe" {...show(0.18)}>
            {lead}
          </motion.p>
        )}
        {children && <motion.div className="mt-8" {...show(0.26)}>{children}</motion.div>}
      </div>
    </section>
  );
}

/** A full-width cream section holding page content. */
export function CreamSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`surface-cream ${className}`}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-20">{children}</div>
    </section>
  );
}
