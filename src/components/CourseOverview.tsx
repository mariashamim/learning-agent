"use client";

import { HarnessTrace } from "./HarnessTrace";
import { Reveal } from "./Reveal";
import type { Course, TraceStep } from "./types";

/** Shown for a finished course: every module, reopenable for review. */
export function CourseOverview({
  course,
  trace,
  onOpenModule,
}: {
  course: Course;
  trace: TraceStep[];
  onOpenModule: (course: Course, moduleIndex: number) => void;
}) {
  return (
    <article id="lesson" className="mt-16 scroll-mt-24">
      <Reveal as="header" y={10} duration={400} className="border-b border-beige/70 pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-coffee">Course complete ✓</p>
        <h2 className="font-display mt-3 text-3xl leading-tight font-medium tracking-tight text-espresso sm:text-5xl">
          {course.title}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-coffee sm:text-lg">{course.description}</p>
      </Reveal>

      <div className="mt-8 space-y-3">
        {course.modules.map((m, i) => (
          <Reveal key={i} as="div" group="overview" delay={120 + i * 80} stagger={60} duration={400}>
              <button
                type="button"
                disabled={!m.lesson}
                onClick={() => onOpenModule(course, i)}
                className="tilt-card group flex w-full items-start gap-4 rounded-2xl border border-beige/80 bg-paper p-5 text-left disabled:cursor-default"
              >
                <span className="font-display text-sm text-taupe tabular-nums italic">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">
                  <span className="font-display block text-lg font-medium text-espresso">{m.title}</span>
                  <span className="mt-1 block text-sm text-coffee/85">{m.goal}</span>
                </span>
                {m.lesson && <span className="open-hint text-xs text-taupe">Review →</span>}
              </button>
          </Reveal>
        ))}
      </div>

      <p className="mt-8 text-sm text-taupe">
        Want to go further? Search a related topic and your tutor will build on what you&rsquo;ve
        learned here.
      </p>

      <HarnessTrace trace={trace} />
    </article>
  );
}
