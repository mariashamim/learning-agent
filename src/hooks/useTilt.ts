"use client";

import { useEffect, type RefObject } from "react";

/**
 * Subtle 3D tilt that follows the cursor across an element. Sets --rx/--ry
 * custom properties; the transform itself lives in CSS (.tilt-card).
 */
export function useTilt(
  ref: RefObject<HTMLElement | null>,
  { enabled, max = 2 }: { enabled: boolean; max?: number }
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.dataset.tilting = "true";
        el.style.setProperty("--rx", `${(-py * 2 * max).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${(px * 2 * max).toFixed(2)}deg`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      delete el.dataset.tilting;
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      onLeave();
    };
  }, [ref, enabled, max]);
}
