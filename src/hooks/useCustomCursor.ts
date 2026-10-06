"use client";

import { useEffect, type RefObject } from "react";

const INTERACTIVE =
  "button, a, input, textarea, select, label, summary, [role='button'], [data-cursor='interactive']";

// Time constants for the exponential follow. The ring trails the dot by
// roughly 120ms; the background glow by roughly 250ms.
const RING_TAU = 55;
const GLOW_TAU = 115;

type Refs = {
  dot: RefObject<HTMLDivElement | null>;
  ring: RefObject<HTMLDivElement | null>;
  glow: RefObject<HTMLDivElement | null>;
};

/**
 * Drives the custom cursor and the cursor-following background glow.
 * Writes transforms straight to the DOM inside one rAF loop (no React
 * re-renders) and stops the loop once everything has settled.
 */
export function useCustomCursor({ dot, ring, glow }: Refs, enabled: boolean) {
  useEffect(() => {
    const dotEl = dot.current;
    const ringEl = ring.current;
    const glowEl = glow.current;
    if (!enabled || !dotEl || !ringEl || !glowEl) return;

    const root = document.documentElement;
    root.classList.add("custom-cursor");

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...target };
    const glowPos = { ...target };
    let seen = false;
    let raf = 0;
    let last = 0;

    const place = (el: HTMLElement, p: { x: number; y: number }) => {
      el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    };
    place(glowEl, glowPos);

    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      const kr = 1 - Math.exp(-dt / RING_TAU);
      const kg = 1 - Math.exp(-dt / GLOW_TAU);
      ringPos.x += (target.x - ringPos.x) * kr;
      ringPos.y += (target.y - ringPos.y) * kr;
      glowPos.x += (target.x - glowPos.x) * kg;
      glowPos.y += (target.y - glowPos.y) * kg;
      place(ringEl, ringPos);
      place(glowEl, glowPos);

      const settled =
        Math.abs(target.x - glowPos.x) < 0.2 && Math.abs(target.y - glowPos.y) < 0.2;
      if (settled) {
        raf = 0;
        last = 0;
      } else {
        raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX;
      target.y = e.clientY;
      place(dotEl, target);
      if (!seen) {
        // First movement: snap everything to the pointer instead of sweeping in.
        seen = true;
        Object.assign(ringPos, target);
        Object.assign(glowPos, target);
      }
      root.classList.add("cursor-visible");

      const el = e.target instanceof Element ? e.target : null;
      const interactive = !!el?.closest(INTERACTIVE);
      const bare = !el || el === root || el === document.body || el.matches("main, [data-cursor-bg]");
      ringEl.dataset.state = interactive ? "hover" : bare ? "bg" : "content";

      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onDown = () => (ringEl.dataset.pressed = "true");
    const onUp = () => delete ringEl.dataset.pressed;
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) root.classList.remove("cursor-visible");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("mouseout", onOut);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseout", onOut);
      root.classList.remove("custom-cursor", "cursor-visible");
    };
  }, [dot, ring, glow, enabled]);
}
