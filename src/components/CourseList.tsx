"use client";

import { useRef } from "react";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";
import { useTilt } from "@/hooks/useTilt";
import { Reveal } from "./Reveal";
import type { Course } from "./types";

const CARD_STAGGER = 60;

/** The learner's courses: active ones to continue, finished ones to revisit. */
export function CourseList({
  courses,
  onContinue,
  disabled,
  introDelay,
}: {
  courses: Course[];
  onContinue: (topic: string) => void;
  disabled: boolean;
  /** Remaining time (ms) before the page entrance reaches this section. Must be stable. */
  introDelay: () => number;
}) {
  const active = courses.filter((c) => c.status === "active");
  const finished = courses.filter((c) => c.status === "completed");

  return (
    <section className="mt-20">
      <Reveal delayOffset={introDelay} className="flex items-baseline justify-between border-b border-beige/70 pb-3">
        <h3 className="font-display text-2xl font-medium text-espresso">
          {active.length ? "Continue learning" : "Your courses"}
        </h3>
        <span className="text-xs text-taupe">
          {active.length} in progress · {finished.length} finished
        </span>
      </Reveal>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[...active, ...finished].map((course, i) => (
          <Reveal
            key={course.id}
            group="courses"
            delayOffset={introDelay}
            delay={(i + 1) * CARD_STAGGER}
            stagger={CARD_STAGGER}
          >
            <CourseCard course={course} onContinue={onContinue} disabled={disabled} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function CourseCard({
  course,
  onContinue,
  disabled,
}: {
  course: Course;
  onContinue: (topic: string) => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { richPointer } = useMotionPrefs();
  useTilt(ref, { enabled: richPointer && !disabled });

  const total = course.modules.length;
  const done = course.modules.filter((m) => m.lesson?.completed).length;
  const finished = course.status === "completed";
  const next = finished ? null : course.modules[course.currentModule];

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={() => onContinue(course.topic)}
      className="tilt-card group flex h-full w-full flex-col rounded-2xl border border-beige/80 bg-paper p-5 text-left disabled:cursor-wait disabled:opacity-70"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-taupe">{course.topic}</span>
      <span className="font-display mt-1 text-lg leading-snug font-medium text-espresso">{course.title}</span>

      <span className="mt-4 flex items-center gap-3" aria-label={`${done} of ${total} modules done`}>
        <span className="flex flex-1 gap-1" aria-hidden>
          {course.modules.map((m, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${m.lesson?.completed ? "bg-coffee" : "bg-beige/70"}`}
            />
          ))}
        </span>
        <span className="text-xs tabular-nums text-taupe">
          {done}/{total}
        </span>
      </span>

      <span className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-coffee/90">
          {finished ? "Completed ✓" : next ? `Next: ${next.title}` : ""}
        </span>
        <span className="flex-shrink-0 text-xs font-medium text-coffee group-hover:text-espresso">
          {finished ? "Review →" : "Continue →"}
        </span>
      </span>
    </button>
  );
}
