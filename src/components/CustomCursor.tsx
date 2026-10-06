"use client";

import { useRef } from "react";
import { useCustomCursor } from "@/hooks/useCustomCursor";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";

/** Peach dot + trailing ring + cursor-following background glow. */
export function CustomCursor() {
  const { richPointer } = useMotionPrefs();
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);

  useCustomCursor({ dot, ring, glow }, richPointer);

  if (!richPointer) return null;
  return (
    <>
      <div ref={glow} className="cursor-glow" aria-hidden />
      <div ref={ring} className="cursor-ring" data-state="bg" aria-hidden>
        <span className="cursor-ring-inner" />
      </div>
      <div ref={dot} className="cursor-dot" aria-hidden />
    </>
  );
}
