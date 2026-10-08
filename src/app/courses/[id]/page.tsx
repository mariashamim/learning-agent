"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useAppState } from "@/components/app/AppState";
import { StarButton, courseProgress } from "@/components/app/CourseCards";
import { TopicArt } from "@/components/app/TopicArt";
import { ArrowRightIcon, CheckIcon } from "@/components/Icons";
import { Reveal } from "@/components/Reveal";

export default function CourseWelcomePage() {
  const { id } = useParams<{ id: string }>();
  const { courses, loaded, learn, busy } = useAppState();
  const course = courses.find((c) => String(c.id) === id);

  if (!course) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        {loaded ? (
          <>
            <p className="font-display text-3xl text-sand">We couldn&rsquo;t find that course.</p>
            <Link href="/courses" className="mt-4 inline-block text-gold underline">
              Back to your courses
            </Link>
          </>
        ) : (
          <div className="skeleton mx-auto h-64 rounded-3xl" />
        )}
      </main>
    );
  }

  const { total, done, percent } = courseProgress(course);
  const finished = course.status === "completed";
  const current = Math.min(course.currentModule, total - 1);
  const currentReady = !!course.modules[current]?.lesson;
  const minutes = course.modules.reduce((n, m) => n + (m.lesson?.data.estimatedMinutes ?? 8), 0);

  const cta = finished
    ? { label: "Review from Module 1", href: `/courses/${course.id}/1` }
    : currentReady
      ? { label: `${done ? "Continue" : "Start"} Module ${current + 1}`, href: `/courses/${course.id}/${current + 1}` }
      : { label: `Start Module ${current + 1}`, onClick: () => learn(course.topic) };

  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 pb-24 sm:px-6 lg:px-10">
      <Link href="/courses" className="text-sm text-taupe hover:text-gold">
        ← All courses
      </Link>

      {/* Welcome hero */}
      <section className="course-hero relative mt-5 grid items-center gap-8 overflow-hidden rounded-[2rem] border border-beige bg-gradient-to-br from-violet/70 via-paper to-magenta/60 p-6 sm:p-10 md:grid-cols-[260px_minmax(0,1fr)]">
        <div className="hero-art relative mx-auto flex h-56 w-56 items-center justify-center rounded-full bg-ink/40">
          <span className="hero-ring" aria-hidden />
          <TopicArt topic={course.topic} className="h-40 w-40" />
        </div>
        <div>
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-medium tracking-[0.2em] text-gold uppercase">Welcome to your course</p>
            <StarButton topic={course.topic} />
          </div>
          <h1 className="font-display mt-2 text-4xl leading-tight text-sand sm:text-5xl">{course.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-sand/80">{course.description}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-sand">
            <span className="rounded-full bg-ink/40 px-3 py-1.5">{total} modules</span>
            <span className="rounded-full bg-ink/40 px-3 py-1.5">≈ {minutes} min</span>
            <span className="rounded-full bg-ink/40 px-3 py-1.5">
              {done} done · {percent}%
            </span>
          </div>
          <div className="mt-7">
            {"href" in cta ? (
              <Link href={cta.href!} className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold">
                {cta.label} <ArrowRightIcon size={16} />
              </Link>
            ) : (
              <button type="button" disabled={!!busy} onClick={cta.onClick} className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold">
                {cta.label} <ArrowRightIcon size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Module path */}
      <section className="mt-14" aria-labelledby="modules">
        <h2 id="modules" className="font-display text-3xl text-sand">
          Your path
        </h2>
        <ol className="module-path relative mt-8" style={{ "--path-progress": `${total > 1 ? (done / (total - 1)) * 100 : 0}%` } as CSSProperties}>
          {course.modules.map((m, i) => {
            const isDone = !!m.lesson?.completed;
            const isCurrent = !finished && i === current;
            const locked = !isDone && !isCurrent;
            const state = isDone ? "done" : isCurrent ? "current" : "locked";
            const href = m.lesson ? `/courses/${course.id}/${i + 1}` : null;
            const action = isDone ? "Review" : isCurrent ? (m.lesson && done > 0 ? "Continue" : "Start") : "Locked";
            const inner = (
              <>
                <span className="path-node" data-state={state} aria-hidden>
                  {isDone ? <CheckIcon size={18} strokeWidth={2.6} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-medium tracking-[0.16em] text-taupe uppercase">Module {i + 1}</span>
                  <span className="font-display block text-xl text-sand">{m.title}</span>
                  <span className="mt-1 block text-sm text-taupe">{m.goal}</span>
                  {m.lesson?.quiz && (
                    <span className="mt-2 inline-block rounded-full bg-gold/15 px-2.5 py-0.5 text-xs text-gold">
                      Quiz {m.lesson.quiz.correct}/{m.lesson.quiz.total}
                    </span>
                  )}
                </span>
                <span className={`flex-shrink-0 text-sm font-semibold ${locked ? "text-taupe/60" : "text-gold"}`}>
                  {action} {!locked && "→"}
                </span>
              </>
            );
            const cls = `path-item flex w-full items-start gap-5 rounded-2xl border p-5 text-left ${
              isCurrent ? "border-gold/60 bg-paper" : "border-beige bg-paper/60"
            } ${locked ? "opacity-70" : "hover:border-gold/60"}`;
            return (
              <li key={i} className="relative pb-4 pl-0">
                <Reveal group="path" delay={i * 90} stagger={90}>
                  {href ? (
                    <Link href={href} className={cls}>
                      {inner}
                    </Link>
                  ) : isCurrent ? (
                    <button type="button" disabled={!!busy} onClick={() => learn(course.topic)} className={cls}>
                      {inner}
                    </button>
                  ) : (
                    <div className={cls} aria-disabled>
                      {inner}
                    </div>
                  )}
                </Reveal>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
