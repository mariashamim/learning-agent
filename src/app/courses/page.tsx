"use client";

import Link from "next/link";
import { useAppState } from "@/components/app/AppState";
import { CATALOG, CourseTile } from "@/components/app/CourseCards";
import { CourseFan } from "@/components/app/CourseFan";
import { DotField } from "@/components/app/DotField";
import { Scrollytelling } from "@/components/app/Scrollytelling";
import { Reveal } from "@/components/Reveal";
import { CreamSection, PageHero } from "@/components/app/PageHero";

export default function CoursesPage() {
  const { courses, loaded } = useAppState();
  const started = new Set(courses.map((c) => c.topic.trim().toLowerCase()));
  const explore = CATALOG.filter((c) => !started.has(c.topic.toLowerCase()));
  const modulesDone = courses.reduce((n, c) => n + c.modules.filter((m) => m.lesson?.completed).length, 0);

  return (
    <main>
      <PageHero
        kicker="Courses"
        aside={`${courses.length} course${courses.length === 1 ? "" : "s"} · ${modulesDone} module${modulesDone === 1 ? "" : "s"} finished`}
        title={
          <>
            Learn anything, <span className="accent-word">one level</span> at a time.
          </>
        }
        lead="Pick up a course you've started, or choose something new. Move your cursor (or a finger) across the field."
        backdrop={<DotField />}
      />
      <CreamSection>
      {/* Your courses */}
      <section aria-labelledby="yours">
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

      </CreamSection>

      {/* Explore: a fan of course cards on a wheel (ink) */}
      {explore.length > 0 && (
        <section className="surface-ink hero-ink" aria-labelledby="explore">
          <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-10 lg:pt-20">
            <div className="meta-line">
              <span>[ Explore ]</span>
              <span className="rule" />
              <span>Drag, or use the arrows</span>
            </div>
            <h2 id="explore" className="font-display mt-8 text-[clamp(36px,4.6vw,64px)] leading-[0.98] text-sand">
              Explore something <span className="accent-word">new</span>
            </h2>
            <p className="mt-3 max-w-lg text-taupe">Choosing one plans your course and opens its welcome page.</p>
          </div>
          <div className="pb-16 lg:pb-20">
            <CourseFan items={explore} title="Courses to explore" />
          </div>
        </section>
      )}

      <CreamSection>
      <Scrollytelling />
      </CreamSection>
    </main>
  );
}
