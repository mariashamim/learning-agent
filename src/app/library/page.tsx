"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppState } from "@/components/app/AppState";
import { CATALOG, CatalogTile, CourseTile } from "@/components/app/CourseCards";
import { CreamSection, PageHero } from "@/components/app/PageHero";
import { DocIcon } from "@/components/Icons";
import { LessonView } from "@/components/LessonView";
import { Reveal } from "@/components/Reveal";
import type { LessonRow } from "@/components/types";

export default function LibraryPage() {
  const { bookmarks, courseFor, library, loaded, submitQuiz } = useAppState();
  const [open, setOpen] = useState<LessonRow | null>(null);

  return (
    <main>
      <PageHero
        kicker="Library"
        aside={`${bookmarks.length} saved`}
        title={
          <>
            Courses you <span className="accent-word">kept</span>
          </>
        }
        lead="Tap the ☆ on any course to keep it here."
      />
      <CreamSection>

      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-beige p-12 text-center">
          <span className="empty-star text-6xl text-gold" aria-hidden>
            ☆
          </span>
          <p className="font-display mt-4 text-2xl text-sand">Nothing saved yet</p>
          <p className="mt-2 text-taupe">Star the courses you want to keep close.</p>
          <Link href="/courses" className="btn-primary mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold">
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((b, i) => {
            const course = courseFor(b.topic);
            const blurb = CATALOG.find((c) => c.topic.toLowerCase() === b.key)?.blurb ?? "Saved for later.";
            return (
              <Reveal key={b.key} group="library" delay={i * 70} stagger={70}>
                {course ? <CourseTile course={course} /> : <CatalogTile topic={b.topic} blurb={blurb} />}
              </Reveal>
            );
          })}
        </div>
      )}

      {/* Older single lessons, from before courses existed */}
      {loaded && library.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl text-sand">Single lessons</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {library.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setOpen(row)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${open?.id === row.id ? "border-gold/60 bg-paper" : "border-beige bg-paper/60 hover:border-gold/50"}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
                    <DocIcon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-sand capitalize">{row.topic}</span>
                    <span className="block truncate text-xs text-taupe">{row.lesson_data.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {open && (
            <div className="mx-auto max-w-3xl">
              <LessonView
                key={open.id}
                view={{
                  kind: "lesson",
                  key: open.id,
                  lesson: open.lesson_data,
                  lessonId: open.id,
                  score: open.score,
                  status: {},
                  course: null,
                  moduleIndex: null,
                  tutorNote: null,
                  trace: [{ step: "loaded_from_library", lessonId: open.id, topic: open.topic }],
                }}
                onSubmitQuiz={submitQuiz}
                onContinue={() => {}}
                onOpenModule={() => {}}
              />
            </div>
          )}
        </section>
      )}
      </CreamSection>
    </main>
  );
}
