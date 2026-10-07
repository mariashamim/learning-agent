"use client";

import { useEffect, useRef } from "react";
import { FlameIcon, SearchIcon } from "./Icons";
import { LearnerPill } from "./LearnerPill";
import { Brand } from "./Sidebar";

/** Search (filters topic tiles, courses and the library) plus the learning streak. */
export function TopBar({
  query,
  onQuery,
  streak,
  learnerId,
  lessonCount,
}: {
  query: string;
  onQuery: (q: string) => void;
  streak: number;
  learnerId: string;
  lessonCount: number;
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
    <header className="sticky top-0 z-20 border-b border-beige/60 bg-background">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <Brand />
        </div>

        <label className="search-box ml-auto hidden max-w-xl flex-1 items-center gap-3 rounded-xl border border-beige bg-paper px-4 py-2.5 md:flex lg:ml-0">
          <SearchIcon size={18} className="text-taupe" />
          <span className="sr-only">Search topics, courses and lessons</span>
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onQuery("")}
            placeholder="Search topics, courses and lessons…"
            className="min-w-0 flex-1 bg-transparent text-sm text-espresso placeholder-taupe outline-none"
          />
          <kbd className="rounded-md border border-beige bg-background px-1.5 py-0.5 font-sans text-[11px] text-taupe">
            Ctrl K
          </kbd>
        </label>

        <div className="ml-auto flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <div
            className="flex items-center gap-1.5 rounded-xl border border-beige bg-background px-1.5 py-1 sm:gap-2.5 sm:px-3 sm:py-1.5"
            title="Days in a row with at least one finished module"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber/15 text-amber sm:h-8 sm:w-8">
              <FlameIcon size={18} />
            </span>
            <span className="pr-0.5 text-xs font-semibold text-espresso sm:text-[13px]">
              {streak > 0 ? (
                <>
                  <span className="sm:hidden" aria-label={`${streak} day streak`}>
                    {streak}
                  </span>
                  <span className="hidden sm:inline">{streak} day streak</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">Start today</span>
                  <span className="hidden sm:inline">Start your streak today</span>
                </>
              )}
            </span>
          </div>
          <div className="lg:hidden">
            <LearnerPill learnerId={learnerId} lessonCount={lessonCount} compact />
          </div>
        </div>
      </div>
    </header>
  );
}
