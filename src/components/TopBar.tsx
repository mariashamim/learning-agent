"use client";

import { useEffect, useRef } from "react";
import { FlameIcon, SearchIcon } from "./Icons";
import { LearnerPill } from "./LearnerPill";
import { Brand } from "./Sidebar";

/** Search across your courses and lessons, plus the learning streak. */
export function TopBar({
  query,
  onQuery,
  streak,
  learnerId,
  courseCount,
}: {
  query: string;
  onQuery: (q: string) => void;
  streak: number;
  learnerId: string;
  courseCount: number;
}) {
  const input = useRef<HTMLInputElement>(null);

  // Ctrl/⌘+K focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-beige/50 bg-background/75 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <Brand />
        </div>

        <label className="search-box ml-auto hidden max-w-xl flex-1 items-center gap-3 rounded-2xl border border-beige bg-paper px-4 py-2.5 shadow-sm md:flex lg:ml-0">
          <SearchIcon size={18} className="text-taupe" />
          <span className="sr-only">Search your courses and lessons</span>
          <input
            ref={input}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onQuery("")}
            placeholder="Search your courses and lessons…"
            className="min-w-0 flex-1 bg-transparent text-sm text-espresso placeholder-taupe/80 outline-none"
          />
          <kbd className="rounded-md border border-beige bg-background px-1.5 py-0.5 font-sans text-[11px] text-taupe">
            Ctrl K
          </kbd>
        </label>

        <div className="ml-auto flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <div
            className="flex items-center gap-2 rounded-2xl border border-beige bg-paper px-2 py-1.5 shadow-sm sm:gap-2.5 sm:px-3"
            title="Days in a row with at least one finished module"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber/15 text-amber">
              <FlameIcon size={18} />
            </span>
            <span className="text-sm font-bold text-espresso sm:hidden" aria-label={`${streak} day streak`}>
              {streak}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[13px] font-semibold text-espresso">
                {streak ? `Day ${streak}` : "No streak yet"}
              </span>
              <span className="block text-[11px] text-taupe">
                {streak ? "Learning streak" : "Finish a module today"}
              </span>
            </span>
          </div>
          <div className="lg:hidden">
            <LearnerPill learnerId={learnerId} courseCount={courseCount} compact />
          </div>
        </div>
      </div>
    </header>
  );
}
