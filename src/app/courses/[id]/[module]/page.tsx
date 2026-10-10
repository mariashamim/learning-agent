"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppState } from "@/components/app/AppState";
import { LessonView } from "@/components/LessonView";
import type { View } from "@/components/types";
import { levelsOf, moduleLabel } from "@/lib/courseHierarchy";

export default function ModulePage() {
  const { id, module } = useParams<{ id: string; module: string }>();
  const router = useRouter();
  const { courses, loaded, learn, busy, submitQuiz, moduleRun, prefetchState } = useAppState();
  const course = courses.find((c) => String(c.id) === id);
  const index = Number(module) - 1;

  if (!course || !(index >= 0 && index < course.modules.length)) {
    return (
      <main className="surface-cream min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        {loaded ? (
          <>
            <p className="font-display text-3xl text-sand">That module doesn&rsquo;t exist.</p>
            <Link href="/courses" className="mt-4 inline-block text-gold underline">
              Back to your courses
            </Link>
          </>
        ) : (
          <div className="skeleton mx-auto h-64 rounded-3xl" />
        )}
        </div>
      </main>
    );
  }

  const saved = course.modules[index].lesson;
  const run = moduleRun(course.id, index);
  const lesson = saved?.data ?? run?.lesson;

  // Not written yet: offer to write it if it's the current module.
  if (!lesson) {
    const isCurrent = index === course.currentModule;
    return (
      <main className="surface-cream min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Link href={`/courses/${course.id}`} className="text-sm text-taupe hover:text-gold">
          ← {course.title}
        </Link>
        <div className="mt-8 rounded-3xl border border-beige bg-paper p-10 text-center">
          <p className="text-xs tracking-[0.2em] text-gold uppercase">{moduleLabel(levelsOf(course), index)}</p>
          <p className="font-display mt-2 text-3xl text-sand">{course.modules[index].title}</p>
          <p className="mt-3 text-taupe">
            {isCurrent ? "This module hasn’t been written yet." : "Finish the earlier modules to unlock this one."}
          </p>
          {isCurrent && (
            <button type="button" disabled={!!busy} onClick={() => learn(course.topic)} className="btn-primary mt-6 rounded-xl px-6 py-3 font-semibold">
              Write this module
            </button>
          )}
        </div>
        </div>
      </main>
    );
  }

  const lessonId = saved?.id ?? run?.lessonId ?? null;
  const view: Extract<View, { kind: "lesson" }> = {
    kind: "lesson",
    key: lessonId ?? index,
    lesson,
    lessonId,
    score: saved?.score ?? run?.score ?? null,
    status: run?.status ?? {},
    course,
    moduleIndex: index,
    tutorNote: run?.tutorNote ?? null,
    trace: run?.trace ?? [{ step: "opened_module", courseId: course.id, module: index + 1, lessonId }],
  };

  return (
    // Lessons read on a calm cream page; code and graphs keep their dark windows.
    <main className="lesson-page surface-cream min-h-screen">
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-24 sm:px-6">
      <Link href={`/courses/${course.id}`} className="text-sm text-taupe hover:text-gold">
        ← {course.title}
      </Link>
      <LessonView
        key={view.key}
        view={view}
        onSubmitQuiz={submitQuiz}
        nextModuleState={prefetchState(course.topic)}
        onContinue={(topic) => learn(topic)}
        onOpenModule={(c, i) => router.push(`/courses/${c.id}/${i + 1}`)}
      />
      </div>
    </main>
  );
}
