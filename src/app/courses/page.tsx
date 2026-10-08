"use client";

import Link from "next/link";
import { useAppState } from "@/components/app/AppState";
import { CATALOG, CatalogTile, CourseTile } from "@/components/app/CourseCards";
import { DotField } from "@/components/app/DotField";
import { Scrollytelling } from "@/components/app/Scrollytelling";
import { Reveal } from "@/components/Reveal";

export default function CoursesPage() {
  const { courses, loaded } = useAppState();
  const started = new Set(courses.map((c) => c.topic.trim().toLowerCase()));
  const explore = CATALOG.filter((c) => !started.has(c.topic.toLowerCase()));
  const modulesDone = courses.reduce((n, c) => n + c.modules.filter((m) => m.lesson?.completed).length, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6 lg:px-10">
      {/* Hero: interactive dot field */}
      <section className="courses-hero relative overflow-hidden rounded-[2rem] border border-beige bg-gradient-to-br from-violet/60 via-ink/60 to-magenta/50 px-6 py-16 sm:px-12 sm:py-24">
        <DotField />
        <div className="relative">
          <p className="text-xs font-medium tracking-[0.25em] text-gold uppercase">Courses</p>
          <h1 className="font-display mt-3 max-w-2xl text-5xl leading-[1.02] text-sand sm:text-7xl">
            Learn anything, <em className="text-gold">one module</em> at a time.
          </h1>
          <p className="mt-5 max-w-lg text-base text-taupe">Move your cursor (or a finger) across the field. Then pick a course, or explore a new one below.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-sand/20 bg-ink/40 px-4 py-2 text-sand">
              <b className="text-gold">{courses.length}</b> course{courses.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border border-sand/20 bg-ink/40 px-4 py-2 text-sand">
              <b className="text-gold">{modulesDone}</b> module{modulesDone === 1 ? "" : "s"} finished
            </span>
          </div>
        </div>
      </section>

      {/* Your courses */}
      <section className="mt-16" aria-labelledby="yours">
        <div className="flex items-end justify-between gap-4">
          <h2 id="yours" className="font-display text-3xl text-sand sm:text-4xl">
            Your courses
          </h2>
          <Link href="/" className="text-sm font-medium text-gold hover:underline">
            + New topic
          </Link>
        </div>
        {!loaded ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-80 rounded-3xl" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-beige p-8 text-center text-taupe">
            No courses yet. Start one below, or name any topic on the{" "}
            <Link href="/" className="text-gold underline">
              Home
            </Link>{" "}
            page.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c, i) => (
              <Reveal key={c.id} group="courses" delay={i * 70} stagger={70}>
                <CourseTile course={c} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Explore */}
      {explore.length > 0 && (
        <section className="mt-20" aria-labelledby="explore">
          <h2 id="explore" className="font-display text-3xl text-sand sm:text-4xl">
            Explore something new
          </h2>
          <p className="mt-2 text-taupe">Choosing one plans your course and opens its welcome page.</p>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {explore.map((c, i) => (
              <Reveal key={c.topic} group="explore" delay={i * 60} stagger={60}>
                <CatalogTile topic={c.topic} blurb={c.blurb} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <Scrollytelling />
    </main>
  );
}
