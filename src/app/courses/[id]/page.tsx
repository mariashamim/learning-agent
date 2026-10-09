"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useAppState } from "@/components/app/AppState";
import { StarButton, courseProgress } from "@/components/app/CourseCards";
import { TopicArt } from "@/components/app/TopicArt";
import { ArrowRightIcon, CheckIcon } from "@/components/Icons";
import { Reveal } from "@/components/Reveal";
import { levelsOf, moduleLabel } from "@/lib/courseHierarchy";

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

  const levels = levelsOf(course);
  const hasLevels = !levels.every((l) => l.legacy);
  const label = (i: number) => moduleLabel(levels, i);
  const cta = finished
    ? { label: "Review from the start", href: `/courses/${course.id}/1` }
    : currentReady
      ? { label: `${done ? "Continue" : "Start"} ${label(current)}`, href: `/courses/${course.id}/${current + 1}` }
      : { label: `Start ${label(current)}`, onClick: () => learn(course.topic) };

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
            {hasLevels && <span className="rounded-full bg-ink/40 px-3 py-1.5">{levels.length} levels</span>}
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
        <div className="mt-8 space-y-12">
          {levels.map((level, n) => {
            const levelDone = level.modules.filter((i) => course.modules[i].lesson?.completed).length;
            return (
              <section key={level.id} aria-labelledby={`level-${level.id}`} data-level-status={level.status}>
                {!level.legacy && (
                  <header className="mb-5">
                    <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                      Level {n + 1}
                      <span className="ml-2 font-normal tracking-normal text-taupe normal-case">
                        {level.status === "done"
                          ? "· finished"
                          : level.status === "current"
                            ? "· you are here"
                            : level.prerequisite
                              ? `· unlocks after Level ${n}`
                              : ""}
                      </span>
                    </p>
                    <h3 id={`level-${level.id}`} className="font-display mt-1 text-2xl text-sand sm:text-3xl">
                      {level.title}
                    </h3>
                    {level.description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-sand/80">{level.description}</p>}
                    <p className="mt-2 text-sm text-taupe">
                      {level.objective && <>You&rsquo;ll be able to: {level.objective} · </>}
                      <span className="tabular-nums">
                        {levelDone}/{level.modules.length} modules
                      </span>
                    </p>
                  </header>
                )}
                <ol
                  className="module-path relative"
                  style={{ "--path-progress": `${level.modules.length > 1 ? (levelDone / (level.modules.length - 1)) * 100 : 0}%` } as CSSProperties}
                >
                  {level.modules.map((i, li) => {
                    const m = course.modules[i];
                    const isDone = !!m.lesson?.completed;
                    const isCurrent = !finished && i === current;
                    const locked = !isDone && !isCurrent;
                    const state = isDone ? "done" : isCurrent ? "current" : "locked";
                    const href = m.lesson ? `/courses/${course.id}/${i + 1}` : null;
                    const action = isDone ? "Review" : isCurrent ? (m.lesson && done > 0 ? "Continue" : "Start") : "Locked";
                    const inner = (
                      <>
                        <span className="path-node" data-state={state} aria-hidden>
                          {isDone ? <CheckIcon size={18} strokeWidth={2.6} /> : hasLevels ? li + 1 : i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-medium tracking-[0.16em] text-taupe uppercase">{label(i)}</span>
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
                        <Reveal group="path" delay={li * 90} stagger={90}>
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
            );
          })}
        </div>
      </section>
    </main>
  );
}
