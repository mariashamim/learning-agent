// Records a finished quiz and moves the course forward. Grading happens here,
// against the stored lesson, never trusting the browser's idea of "correct".

import * as db from "./db";
import { toCourseView, type CourseView } from "./courseView";
import { topicKey } from "./harness";

export type Answer = { questionIndex: number; chosen: string };

export class QuizError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404
  ) {
    super(message);
  }
}

export async function recordQuiz(
  learnerId: string,
  lessonId: number,
  answers: Answer[]
): Promise<{ correct: number; total: number; firstCompletion: boolean; course: CourseView | null }> {
  const lesson = await db.getLessonForLearner(lessonId, learnerId);
  if (!lesson) throw new QuizError("Lesson not found", 404);

  const questions = lesson.lesson_data.questions;
  const seen = new Set<number>();
  for (const a of answers) {
    const q = questions[a.questionIndex];
    if (!q || seen.has(a.questionIndex) || !q.options.includes(a.chosen)) {
      throw new QuizError("Answers don't match this lesson's questions", 400);
    }
    seen.add(a.questionIndex);
  }
  if (seen.size !== questions.length) throw new QuizError("Answer every question first", 400);

  const graded = answers.map((a) => ({
    question_index: a.questionIndex,
    chosen: a.chosen,
    correct: questions[a.questionIndex].correctAnswer === a.chosen,
  }));
  const correct = graded.filter((g) => g.correct).length;

  // Only the first completion counts toward progress; retakes are just practice.
  const firstCompletion = await db.markLessonCompleted(lesson.id);
  if (firstCompletion) await db.insertAttempts(learnerId, lesson.id, graded);

  let course: CourseView | null = null;
  if (lesson.course_id !== null) {
    let row = await db.getCourseById(lesson.course_id, learnerId);
    if (row && firstCompletion && lesson.module_index === row.current_module) {
      const next = row.current_module + 1;
      if (next >= row.modules.length) {
        await db.updateCourse(row.id, { current_module: row.modules.length, status: "completed" });
        await db.upsertProgress(learnerId, topicKey(row.topic), "completed", lesson.id);
      } else {
        await db.updateCourse(row.id, { current_module: next });
      }
      row = await db.getCourseById(lesson.course_id, learnerId);
    }
    if (row) course = toCourseView(row);
  }

  return { correct, total: questions.length, firstCompletion, course };
}
