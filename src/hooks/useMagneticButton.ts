"use client";

import { useEffect, type RefObject } from "react";

/**
 * Pulls an element up to `strength` px toward the cursor when the cursor is
 * within `radius` px of its edge. Uses the CSS `translate` property so it
 * composes with `scale` (press) and any transform set elsewhere.
 */
export function useMagneticButton(
  ref: RefObject<HTMLElement | null>,
  { enabled, radius = 80, strength = 4 }: { enabled: boolean; radius?: number; strength?: number }
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let raf = 0;
    let active = false;
    let offset = { x: 0, y: 0 };

    const set = (x: number, y: number) => {
      offset = { x, y };
      el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
    };
    const release = () => {
      if (!active) return;
      active = false;
      delete el.dataset.magnet;
      set(0, 0);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        // Measure from the resting position, not the pulled one.
        const cx = r.left + r.width / 2 - offset.x;
        const cy = r.top + r.height / 2 - offset.y;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const edgeX = Math.max(Math.abs(dx) - r.width / 2, 0);
        const edgeY = Math.max(Math.abs(dy) - r.height / 2, 0);
        const edgeDist = Math.hypot(edgeX, edgeY);

        if (edgeDist > radius || (el as HTMLButtonElement).disabled) return release();

        active = true;
        el.dataset.magnet = "active";
        const falloff = 1 - edgeDist / radius;
        const clamp = (v: number) => Math.max(-1, Math.min(1, v));
        let x = clamp(dx / (r.width / 2)) * strength * falloff;
        let y = clamp(dy / (r.height / 2)) * strength * falloff;
        const len = Math.hypot(x, y);
        if (len > strength) {
          x = (x / len) * strength;
          y = (y / len) * strength;
        }
        set(x, y);
      });
    };
    const onLeaveWindow = (e: MouseEvent) => {
      if (!e.relatedTarget) release();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onLeaveWindow);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onLeaveWindow);
      delete el.dataset.magnet;
      el.style.translate = "";
    };
  }, [ref, enabled, radius, strength]);
}
