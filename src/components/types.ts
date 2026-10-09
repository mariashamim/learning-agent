// The stored lesson shape is shared with the server (type-only import).
export type { Block, Lesson, Question } from "@/lib/lessonBlocks";
import type { Lesson } from "@/lib/lessonBlocks";

/** A standalone lesson (made before courses existed). */
export type LessonRow = {
  id: number;
  topic: string;
  score: number | null;
  created_at: string;
  lesson_data: Lesson;
};

// Mirrors CourseView in src/lib/courseView.ts.
export type CourseModule = {
  title: string;
  goal: string;
  lesson: {
    id: number;
    score: number | null;
    completed: boolean;
    createdAt: string;
    completedAt: string | null;
    quiz: { correct: number; total: number } | null;
    data: Lesson;
  } | null;
};

export type Course = {
  id: number;
  topic: string;
  title: string;
  description: string;
  status: "active" | "completed";
  currentModule: number;
  updatedAt: string;
  modules: CourseModule[];
};

// Shape of a harness trace entry; extra fields vary by step.
export type TraceStep = { step?: string; score?: number; [key: string]: unknown };

/** What the harness reported about a freshly generated lesson. Empty for reopened lessons. */
export type LessonStatus = { passed?: boolean; saved?: boolean; resumed?: boolean };

export type Answer = { questionIndex: number; chosen: string };

/** A next module being written in the background, or done and waiting. */
export type PrefetchState = "pending" | "ready";

/** Server's verdict on a finished quiz. */
export type QuizResult = { correct: number; total: number; firstCompletion: boolean; course: Course | null };

/** What the page is showing below the hero. */
export type View =
  | {
      kind: "lesson";
      key: number;
      lesson: Lesson;
      lessonId: number | null;
      score: number | null;
      status: LessonStatus;
      course: Course | null;
      moduleIndex: number | null;
      tutorNote: string | null;
      trace: TraceStep[];
    }
  | { kind: "course_complete"; key: number; course: Course; trace: TraceStep[] };
