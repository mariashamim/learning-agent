"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppState } from "@/components/app/AppState";
import { StarButton, courseProgress } from "@/components/app/CourseCards";
import { CourseMap } from "@/components/app/CourseMap";
import { TopicArt } from "@/components/app/TopicArt";
import { ArrowRightIcon } from "@/components/Icons";
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
    <main>
      {/* Welcome hero (ink) */}
      <section className="surface-ink hero-ink relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pb-20">
          <div className="meta-line">
            <Link href="/courses" className="hover:text-gold">
              ← All courses
            </Link>
            <span className="rule" />
            <span>
              {hasLevels ? `${levels.length} levels · ` : ""}
              {total} modules · ≈ {minutes} min
            </span>
          </div>
          <div className="mt-10 grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="flex items-center gap-4">
                <p className="text-xs tracking-[0.18em] text-gold uppercase">Welcome to your course</p>
                <StarButton topic={course.topic} />
              </div>
              <h1 className="font-display mt-4 text-[clamp(40px,5.6vw,80px)] leading-[0.96] text-sand">{course.title}</h1>
              <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-taupe">{course.description}</p>
              <div className="mt-6 flex max-w-md items-center gap-3">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand/15">
                  <span className="block h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
                </span>
                <span className="text-xs tabular-nums text-taupe">
                  {done}/{total} done · {percent}%
                </span>
              </div>
              <div className="mt-8">
                {"href" in cta ? (
                  <Link href={cta.href!} className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold">
                    {cta.label} <ArrowRightIcon size={16} />
                  </Link>
                ) : (
                  <button type="button" disabled={!!busy} onClick={cta.onClick} className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold">
                    {cta.label} <ArrowRightIcon size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="hero-art relative mx-auto flex aspect-square w-full max-w-[300px] items-center justify-center rounded-full bg-gradient-to-br from-violet/50 to-magenta/40">
              <span className="hero-ring" aria-hidden />
              <TopicArt topic={course.topic} className="h-3/5 w-3/5" />
            </div>
          </div>
        </div>
      </section>

      {/* The journey (cream) */}
      <section className="surface-cream" aria-labelledby="modules">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
          <div className="meta-line">
            <span>[ Your path ]</span>
            <span className="rule" />
            <span>
              {done}/{total}
            </span>
          </div>
          <h2 id="modules" className="font-display mt-6 text-4xl text-sand sm:text-5xl">
            The <span className="accent-word">journey</span>
          </h2>
          <div className="mt-10">
            <CourseMap course={course} onStart={() => learn(course.topic)} busy={!!busy} />
          </div>
        </div>
      </section>
    </main>
  );
}
