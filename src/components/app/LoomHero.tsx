"use client";

import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";
import { WovenThreads } from "../motion/WovenThreads";

/**
 * The home page's backdrop: woven threads in layered depth. Layers drift
 * apart a little as you scroll, and (with a mouse) lean toward the pointer.
 * Decorative only: pointer-events off, hidden from assistive tech.
 */
export function LoomHero() {
  const { richPointer } = useMotionPrefs();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 20 });
  const sy = useSpring(py, { stiffness: 60, damping: 20 });
  const { scrollY } = useScroll();
  const backY = useTransform(scrollY, (v) => v * 0.12);
  const frontY = useTransform(scrollY, (v) => v * -0.08);
  const backX = useTransform(sx, (v) => v * -10);
  const frontX = useTransform(sx, (v) => v * 18);
  const backTilt = useTransform(sy, (v) => v * -6);
  const frontTilt = useTransform(sy, (v) => v * 10);
  const back = { x: backX, y: useTransform([backY, backTilt], ([a, b]: number[]) => a + b) };
  const front = { x: frontX, y: useTransform([frontY, frontTilt], ([a, b]: number[]) => a + b) };

  useEffect(() => {
    if (!richPointer) return;
    const onMove = (e: PointerEvent) => {
      px.set(e.clientX / window.innerWidth - 0.5);
      py.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [richPointer, px, py]);

  return (
    <div className="loom-hero pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden" aria-hidden>
      <motion.div className="absolute -top-10 -right-24 h-[420px] w-[620px] opacity-45 blur-[1px]" style={back}>
        <WovenThreads className="h-full w-full" shuttles={false} />
      </motion.div>
      <motion.div className="absolute top-24 -right-10 h-[360px] w-[520px] opacity-80 sm:right-0" style={front}>
        <WovenThreads className="h-full w-full" strands={4} />
      </motion.div>
    </div>
  );
}
