"use client";

import { useEffect, useState, type CSSProperties } from "react";

const PHRASES = [
  "Checking where you left off…",
  "Planning your course…",
  "Writing your next module…",
  "Checking its quality…",
  "Saving your progress…",
];

/** 2px indeterminate bar pinned to the top of the viewport. */
export function TopProgressBar() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden bg-beige" role="progressbar" aria-label="Preparing lesson">
      <div className="progress-indeterminate h-full w-1/3 bg-gold" />
    </div>
  );
}

/** Three peach dots orbiting an invisible centre. */
export function OrbitDots() {
  return (
    <span className="orbit" aria-hidden>
      {[0, 1, 2].map((k) => (
        <span key={k} style={{ "--k": k } as CSSProperties} />
      ))}
    </span>
  );
}

/** Status line that cross-fades through the harness phases every 3s. */
export function StatusCycle() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const active = Math.floor(elapsed / 3) % PHRASES.length;

  return (
    <div className="mt-3 flex items-center gap-3 text-sm text-coffee">
      <span className="grid flex-1" aria-live="polite">
        {PHRASES.map((p, i) => (
          <span
            key={p}
            className="status-phrase col-start-1 row-start-1"
            data-active={i === active}
            aria-hidden={i !== active}
          >
            {p}
          </span>
        ))}
      </span>
      <span className="font-mono text-xs tabular-nums text-taupe">{elapsed}s</span>
    </div>
  );
}

export function LessonSkeleton() {
  return (
    <div className="animate-fade-in mt-10 space-y-4 rounded-3xl border border-beige/70 bg-paper/70 p-6 sm:p-8" aria-hidden>
      <div className="skeleton h-3 w-24" />
      <div className="skeleton h-8 w-4/5" />
      <div className="skeleton h-4 w-3/5" />
      <div className="pt-4" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-11/12" />
      <div className="skeleton h-3 w-9/12" />
    </div>
  );
}
