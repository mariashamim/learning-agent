"use client";

import { levelsOf } from "@/lib/courseHierarchy";
import type { Course } from "./types";

/**
 * The course's module path, grouped by level: done modules (reopenable), the
 * current one, and what's still ahead. `activeIndex` is the module being viewed.
 */
export function CoursePath({
  course,
  activeIndex,
  onOpenModule,
}: {
  course: Course;
  activeIndex: number | null;
  onOpenModule: (course: Course, moduleIndex: number) => void;
}) {
  const done = course.modules.filter((m) => m.lesson?.completed).length;
  const levels = levelsOf(course);
  const hasLevels = !levels.every((l) => l.legacy);

  return (
    <nav aria-label="Course modules" className="rounded-2xl border border-beige/80 bg-paper/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-lg leading-snug font-medium text-espresso">{course.title}</p>
        <p className="text-xs tabular-nums text-taupe">
          {done} of {course.modules.length} modules done
        </p>
      </div>
      <div className={hasLevels ? "mt-3 space-y-2.5" : "mt-3"}>
        {levels.map((level, n) => (
          <div key={level.id} className={hasLevels ? "flex flex-wrap items-center gap-x-2 gap-y-1.5" : ""}>
            {hasLevels && (
              <span
                className={`w-full text-[11px] font-semibold tracking-[0.14em] uppercase sm:w-auto ${level.status === "upcoming" ? "text-taupe/70" : "text-gold"}`}
                title={level.objective}
              >
                L{n + 1} · <span className="normal-case tracking-normal">{level.title}</span>
              </span>
            )}
            <ol className="flex flex-wrap gap-1.5" aria-label={hasLevels ? `Level ${n + 1}: ${level.title}` : undefined}>
              {level.modules.map((i, k) => {
                const m = course.modules[i];
                const completed = !!m.lesson?.completed;
                const openable = !!m.lesson && i !== activeIndex;
                const isActive = i === activeIndex;
                const isNext = i === course.currentModule && course.status === "active";
                const number = hasLevels ? k + 1 : i + 1;
                const tone = isActive
                  ? "border-gold bg-gold text-ink"
                  : completed
                    ? "border-gold/40 bg-gold/15 text-gold"
                    : isNext
                      ? "border-dashed border-taupe text-coffee"
                      : "border-beige/80 text-taupe/80";
                return (
                  <li key={m.id ?? i}>
                    <button
                      type="button"
                      disabled={!openable}
                      onClick={() => onOpenModule(course, i)}
                      title={`${hasLevels ? `Level ${n + 1}, module ${number}` : `Module ${number}`}: ${m.title}${completed ? " (done)" : isNext ? " (up next)" : ""}`}
                      aria-current={isActive ? "step" : undefined}
                      className={`path-step flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${tone} ${
                        openable ? "hover:border-coffee hover:text-espresso" : "cursor-default"
                      }`}
                    >
                      <span className="tabular-nums font-semibold">{number}</span>
                      <span className="hidden max-w-[11rem] truncate sm:inline">{m.title}</span>
                      {completed && <span aria-label="done">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </nav>
  );
}
