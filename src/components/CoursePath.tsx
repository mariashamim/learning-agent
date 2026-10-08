"use client";

import type { Course } from "./types";

/**
 * The course's module path: done modules (reopenable), the current one, and
 * what's still ahead. `activeIndex` is the module being viewed.
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

  return (
    <nav aria-label="Course modules" className="rounded-2xl border border-beige/80 bg-paper/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-lg leading-snug font-medium text-espresso">{course.title}</p>
        <p className="text-xs tabular-nums text-taupe">
          {done} of {course.modules.length} modules done
        </p>
      </div>
      <ol className="mt-3 flex flex-wrap gap-1.5">
        {course.modules.map((m, i) => {
          const completed = !!m.lesson?.completed;
          const openable = !!m.lesson && i !== activeIndex;
          const isActive = i === activeIndex;
          const isNext = i === course.currentModule && course.status === "active";
          const tone = isActive
            ? "border-gold bg-gold text-ink"
            : completed
              ? "border-gold/40 bg-gold/15 text-gold"
              : isNext
                ? "border-dashed border-taupe text-coffee"
                : "border-beige/80 text-taupe/80";
          return (
            <li key={i}>
              <button
                type="button"
                disabled={!openable}
                onClick={() => onOpenModule(course, i)}
                title={`Module ${i + 1}: ${m.title}${completed ? " (done)" : isNext ? " (up next)" : ""}`}
                aria-current={isActive ? "step" : undefined}
                className={`path-step flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${tone} ${
                  openable ? "hover:border-coffee hover:text-espresso" : "cursor-default"
                }`}
              >
                <span className="tabular-nums font-semibold">{i + 1}</span>
                <span className="hidden max-w-[11rem] truncate sm:inline">{m.title}</span>
                {completed && <span aria-label="done">✓</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
