"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// The live instance, so programmatic scrolls can go through it (Lenis keeps
// its own scroll target and would undo a plain scrollIntoView).
let active: Lenis | null = null;

/** Scrolls an element to the middle of the screen, smoothly where allowed. */
export function scrollToElement(el: HTMLElement | null) {
  if (!el) return;
  if (active) active.scrollTo(el, { offset: -window.innerHeight / 2 + el.offsetHeight / 2 });
  else el.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** Lesson pages (/courses/[id]/[module]) keep native scrolling, so reading and jumping to checks stay exact. */
export const isLessonPath = (pathname: string) => /^\/courses\/\d+\/\d+/.test(pathname);

/**
 * Momentum ("smooth") scrolling for the browsing pages. Lenis honours
 * prefers-reduced-motion (scroll then tracks the wheel 1:1), and touch
 * devices keep their native scrolling. Recreated on each navigation and
 * torn down on lesson pages.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const off = isLessonPath(pathname);

  useEffect(() => {
    if (off) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.11, anchors: { offset: -80 }, stopInertiaOnNavigate: true });
    active = lenis;
    return () => {
      active = null;
      lenis.destroy();
    };
  }, [off]);

  return null;
}
