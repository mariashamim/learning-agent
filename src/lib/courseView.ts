import type { CourseWithLessons } from "./db";
import type { Lesson } from "./lessonWriter";

/** The client-facing shape of a course: its plan plus each module's lesson. */
export type CourseView = {
  id: number;
  topic: string;
  title: string;
  description: string;
  status: "active" | "completed";
  currentModule: number;
  updatedAt: string;
  modules: {
    title: string;
    goal: string;
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
  return {
    id: course.id,
    topic: course.topic,
    title: course.title,
    description: course.description,
    status: course.status,
    currentModule: course.current_module,
    updatedAt: course.updated_at,
    modules: course.modules.map((m, i) => {
      const lesson = latestLessonForModule(course, i);
      return {
        title: m.title,
        goal: m.goal,
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
    }),
  };
}

export function latestLessonForModule(course: CourseWithLessons, moduleIndex: number) {
  return (
    course.lessons
      .filter((l) => l.module_index === moduleIndex)
      .sort((a, b) => b.id - a.id)[0] ?? null
  );
}
