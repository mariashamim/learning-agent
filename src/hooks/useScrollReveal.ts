"use client";

import { useEffect, useRef } from "react";

type Pending = { group: string; reveal: (batchIndex: number) => void };

// One shared observer for the whole page. Elements that enter the viewport
// in the same callback are staggered by their order within their group.
const pending = new Map<Element, Pending>();
let observer: IntersectionObserver | null = null;

function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      const counts = new Map<string, number>();
      entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) =>
          a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        )
        .forEach((e) => {
          const item = pending.get(e.target);
          if (!item) return;
          observer?.unobserve(e.target);
          pending.delete(e.target);
          const k = counts.get(item.group) ?? 0;
          counts.set(item.group, k + 1);
          item.reveal(k);
        });
    },
    // The huge top margin makes everything *above* the viewport count as
    // intersecting, so an element a fast scroll jumps right past still
    // reveals instead of staying hidden.
    { threshold: 0, rootMargin: "100000px 0px -40px 0px" }
  );
  return observer;
}

// Anything that intersects within this window after mounting counts as part
// of the entrance sequence and uses its scripted `delay`.
const INITIAL_WINDOW_MS = 250;

export type RevealOptions = {
  /** Delay when the element is visible as soon as it mounts. */
  delay?: number;
  /** Extra entrance delay computed at reveal time. Must be a stable function. */
  delayOffset?: () => number;
  /** Per-element stagger when several elements scroll into view together. */
  stagger?: number;
  group?: string;
};

/**
 * Fades an element in once, when it first enters the viewport. Marks the
 * element with data-revealed (CSS does the animation); never re-hides it.
 */
export function useScrollReveal<T extends HTMLElement>({
  delay = 0,
  delayOffset,
  stagger = 0,
  group = "default",
}: RevealOptions = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.revealed) return;

    const show = (ms: number) => {
      el.style.setProperty("--reveal-delay", `${Math.max(0, Math.round(ms))}ms`);
      el.dataset.revealed = "true";
    };

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      show(0);
      return;
    }

    const mountedAt = performance.now();
    pending.set(el, {
      group,
      reveal: (k) => {
        const initial = performance.now() - mountedAt < INITIAL_WINDOW_MS;
        show(initial ? delay + (delayOffset?.() ?? 0) : k * stagger);
      },
    });
    const io = getObserver();
    io.observe(el);
    return () => {
      io.unobserve(el);
      pending.delete(el);
    };
  }, [delay, delayOffset, stagger, group]);

  return ref;
}
