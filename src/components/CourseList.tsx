"use client";

import { useRef } from "react";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";
import { useTilt } from "@/hooks/useTilt";
import { BookIcon } from "./Icons";
import { Reveal } from "./Reveal";
import type { Course } from "./types";

const CARD_STAGGER = 60;
// Title colour and progress-bar gradient per card, cycling.
const ACCENTS = [
  { title: "text-espresso", bar: "from-blue to-violet" },
  { title: "text-coffee", bar: "from-violet to-coffee" },
  { title: "text-espresso", bar: "from-mint to-blue" },
  { title: "text-coffee", bar: "from-amber to-rose" },
];

/** The learner's courses: active ones to continue, finished ones to revisit. */
export function CourseList({
  courses,
  onContinue,
  disabled,
  introDelay,
  filtered,
}: {
  courses: Course[];
  onContinue: (topic: string) => void;
  disabled: boolean;
  /** Remaining time (ms) before the page entrance reaches this section. Must be stable. */
  introDelay: () => number;
  /** True when a search query is narrowing the list. */
  filtered: boolean;
}) {
  const active = courses.filter((c) => c.status === "active");
  const finished = courses.filter((c) => c.status === "completed");

  return (
    <section id="courses" className="mt-10 scroll-mt-24">
      <Reveal delayOffset={introDelay} className="flex items-center justify-between">
        <h3 className="flex items-center gap-2.5 text-[17px] font-bold text-espresso">
          <span className="text-coffee">
            <BookIcon size={20} />
          </span>
          {active.length ? "Continue learning" : "Your courses"}
        </h3>
        <span className="text-xs text-taupe">
          {active.length} in progress · {finished.length} finished
        </span>
      </Reveal>
      {courses.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-beige p-5 text-sm text-taupe">
          {filtered ? "No courses match your search." : "No courses yet. Pick a topic above to start one."}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {[...active, ...finished].map((course, i) => (
            <Reveal
              key={course.id}
              group="courses"
              delayOffset={introDelay}
              delay={(i + 1) * CARD_STAGGER}
              stagger={CARD_STAGGER}
            >
              <CourseCard course={course} accent={ACCENTS[i % ACCENTS.length]} onContinue={onContinue} disabled={disabled} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}

function CourseCard({
  course,
  accent,
  onContinue,
  disabled,
}: {
  course: Course;
  accent: (typeof ACCENTS)[number];
  onContinue: (topic: string) => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { richPointer } = useMotionPrefs();
  useTilt(ref, { enabled: richPointer && !disabled });

  const total = course.modules.length;
  const done = course.modules.filter((m) => m.lesson?.completed).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const finished = course.status === "completed";
  const next = finished ? null : course.modules[course.currentModule];

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={() => onContinue(course.topic)}
      className="tilt-card group flex h-full w-full flex-col rounded-3xl border border-beige/80 bg-paper p-5 text-left disabled:cursor-wait disabled:opacity-70"
    >
      <span className={`text-[15px] leading-snug font-bold ${accent.title}`}>{course.title}</span>
      <span className="mt-1 line-clamp-1 text-xs text-taupe">
        {finished ? "Completed ✓ · tap to review" : `Module ${course.currentModule + 1} of ${total} · ${next?.title ?? ""}`}
      </span>

      <span className="mt-auto flex items-center gap-3 pt-5" aria-label={`${done} of ${total} modules done`}>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-beige/70" aria-hidden>
          <span
            className={`course-bar block h-full rounded-full bg-gradient-to-r ${accent.bar}`}
            style={{ width: `${Math.max(percent, 4)}%` }}
          />
        </span>
        <span className="text-xs font-semibold tabular-nums text-espresso/80">{percent}%</span>
      </span>
    </button>
  );
}
