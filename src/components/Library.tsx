"use client";

import { useRef } from "react";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";
import { useTilt } from "@/hooks/useTilt";
import { Reveal } from "./Reveal";
import type { LessonRow } from "./types";

const CARD_STAGGER = 60;

export function Library({
  library,
  onOpen,
  introDelay,
}: {
  library: LessonRow[];
  onOpen: (row: LessonRow) => void;
  /** Remaining time (ms) before the page entrance reaches the library. Must be stable. */
  introDelay: () => number;
}) {
  return (
    <section className="mt-16">
      <Reveal delayOffset={introDelay} className="flex items-baseline justify-between border-b border-beige/70 pb-3">
        <h3 className="font-display text-2xl font-medium text-espresso">Single lessons</h3>
        <span className="text-xs text-taupe">{library.length} saved</span>
      </Reveal>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {library.map((row, i) => (
          <Reveal
            key={row.id}
            group="library"
            delayOffset={introDelay}
            delay={(i + 1) * CARD_STAGGER}
            stagger={CARD_STAGGER}
          >
            <LibraryCard row={row} onOpen={onOpen} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function LibraryCard({ row, onOpen }: { row: LessonRow; onOpen: (row: LessonRow) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const { richPointer } = useMotionPrefs();
  useTilt(ref, { enabled: richPointer });

  return (
    <button
      ref={ref}
      onClick={() => onOpen(row)}
      className="tilt-card group flex h-full w-full flex-col rounded-2xl border border-beige/80 bg-paper p-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-display text-lg leading-snug font-medium text-espresso capitalize">
          {row.topic}
        </span>
        {row.score != null && (
          <span className="score-pill rounded-full bg-peach px-2 py-0.5 text-[11px] font-medium text-coffee tabular-nums">
            ★ {row.score}/10
          </span>
        )}
      </div>
      {row.lesson_data?.title && (
        <span className="mt-1 line-clamp-2 text-sm text-coffee/85">{row.lesson_data.title}</span>
      )}
      <span className="mt-4 flex items-center justify-between text-xs text-taupe">
        <span>
          {new Date(row.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <span className="open-hint">Open →</span>
      </span>
    </button>
  );
}
