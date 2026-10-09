import { groupLevels, moduleId } from "./courseHierarchy";
import type { CourseWithLessons } from "./db";
import type { Lesson } from "./lessonWriter";

export type LevelStatus = "done" | "current" | "upcoming";

/**
 * The client-facing shape of a course: levels, the ordered modules they
 * group (positions match lessons.module_index and currentModule), and each
 * module's lesson.
 */
export type CourseView = {
  id: number;
  topic: string;
  title: string;
  description: string;
  status: "active" | "completed";
  currentModule: number;
  updatedAt: string;
  levels: {
    id: string;
    title: string;
    description: string;
    objective: string;
    /** Positions in `modules`, in order. */
    modules: number[];
    /** Derived from saved completions only: done = every module's lesson completed. */
    status: LevelStatus;
    /** The level that must be finished first, if any. */
    prerequisite: string | null;
    /** A course planned before levels: one unlabelled group. */
    legacy: boolean;
  }[];
  modules: {
    id: string;
    title: string;
    goal: string;
    description: string;
    /** Index into `levels`. */
    level: number;
    lesson: {
      id: number;
      score: number | null;
      completed: boolean;
      createdAt: string;
      completedAt: string | null;
      /** First-attempt quiz result, once the module is done. */
      quiz: { correct: number; total: number } | null;
      data: Lesson;
    } | null;
  }[];
};

export function toCourseView(course: CourseWithLessons): CourseView {
  const groups = groupLevels(course.modules ?? []);
  const modules: CourseView["modules"] = course.modules.map((m, i) => {
    const lesson = latestLessonForModule(course, i);
    return {
      id: moduleId(m, i),
      title: m.title,
      goal: m.goal,
      description: typeof m.description === "string" ? m.description : "",
      level: groups.findIndex((g) => g.modules.includes(i)),
      lesson: lesson
        ? {
            id: lesson.id,
            score: lesson.score,
            completed: !!lesson.completed_at,
            createdAt: lesson.created_at,
            completedAt: lesson.completed_at,
            quiz: lesson.attempts?.length
              ? { correct: lesson.attempts.filter((a) => a.correct).length, total: lesson.attempts.length }
              : null,
            data: lesson.lesson_data,
          }
        : null,
    };
  });

  return {
    id: course.id,
    topic: course.topic,
    title: course.title,
    description: course.description,
    status: course.status,
    currentModule: course.current_module,
    updatedAt: course.updated_at,
    levels: groups.map((g, gi) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      objective: g.objective,
      modules: g.modules,
      status: g.modules.every((i) => modules[i].lesson?.completed)
        ? "done"
        : course.status === "active" && g.modules.includes(course.current_module)
          ? "current"
          : "upcoming",
      prerequisite: gi > 0 ? groups[gi - 1].id : null,
      legacy: g.legacy,
    })),
    modules,
  };
}

export function latestLessonForModule(course: CourseWithLessons, moduleIndex: number) {
  return (
    course.lessons
      .filter((l) => l.module_index === moduleIndex)
      .sort((a, b) => b.id - a.id)[0] ?? null
  );
}
