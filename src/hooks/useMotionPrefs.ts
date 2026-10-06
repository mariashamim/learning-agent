"use client";

import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}

/**
 * reducedMotion: the user asked for less motion.
 * finePointer:   a real mouse/trackpad that can hover (not touch).
 * richPointer:   both conditions for cursor effects, magnetism and tilt.
 */
export function useMotionPrefs() {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  return { reducedMotion, finePointer, richPointer: finePointer && !reducedMotion };
}
