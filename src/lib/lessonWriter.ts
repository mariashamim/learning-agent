// The quality gate. Writes one module lesson, scores it with a separate
// evaluator call, revises once if it falls short, and returns the best
// *evaluated* version. This is deterministic code: the tutor agent decides
// what to write and why, but cannot skip these checks.

import { z } from "zod";
import { callStructured, type Deadline } from "./model";

export const LessonSchema = z.object({
  title: z.string(),
  objective: z.string(),
  estimatedMinutes: z.number(),
  concepts: z.array(
    z.object({
      name: z.string(),
      explanation: z.string(),
      example: z.string(),
    })
  ),
  // Every lesson must carry a usable quiz: 2-4 questions, 4 options each,
  // and the correct answer must be one of the options.
  questions: z
    .array(
      z
        .object({
          question: z.string(),
          options: z.array(z.string()).length(4),
          correctAnswer: z.string(),
          explanation: z.string(),
        })
        .refine((q) => q.options.includes(q.correctAnswer), {
          message: "correctAnswer must exactly match one of the options",
        })
    )
    .min(2)
    .max(4),
});

export type Lesson = z.infer<typeof LessonSchema>;

const EvaluationSchema = z.object({
  score: z.number(),
  approved: z.boolean(),
  problems: z.array(z.string()),
  suggestions: z.array(z.string()),
});

type Evaluation = z.infer<typeof EvaluationSchema>;

export type TraceEntry = { step: string; [key: string]: unknown };

/** What the tutor agent asks the writer for. */
export type LessonBrief = {
  topic: string;
  courseTitle: string;
  moduleIndex: number;
  moduleCount: number;
  module: { title: string; goal: string };
  /** Titles of the modules before this one, for continuity. */
  previousModules: string[];
  /** The agent's instructions, e.g. what to recap given past mistakes. */
  focus: string;
};

const lessonJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    objective: { type: "string" },
    estimatedMinutes: { type: "number" },
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          explanation: { type: "string" },
          example: { type: "string" },
        },
        required: ["name", "explanation", "example"],
        additionalProperties: false,
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctAnswer: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["question", "options", "correctAnswer", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "objective", "estimatedMinutes", "concepts", "questions"],
  additionalProperties: false,
};

const evaluationJsonSchema = {
  type: "object",
  properties: {
    score: { type: "number", minimum: 0, maximum: 10 },
    approved: { type: "boolean" },
    problems: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
  },
  required: ["score", "approved", "problems", "suggestions"],
  additionalProperties: false,
};

// Shared by generate and revise so a first draft gets the same quiz rules.
const LESSON_REQUIREMENTS = `REQUIREMENTS:
- 2-3 concepts, each with a clear explanation and a concrete real-world example
- EXACTLY 3 multiple-choice questions (never fewer than 2, never more than 4)
- Each question must have EXACTLY 4 options
- The correctAnswer field must be an EXACT string match of one of the options
- Each question needs a 1-2 sentence explanation of why the answer is correct
- Total lesson time: 5-10 minutes

Return only JSON matching the schema. The questions array MUST NOT be empty.`;

function describeBrief(b: LessonBrief) {
  const before = b.previousModules.length
    ? `Modules already covered: ${b.previousModules.map((t, i) => `${i + 1}. ${t}`).join("; ")}.`
    : "This is the first module.";
  return `Course: ${b.courseTitle} (topic: ${b.topic})
Module ${b.moduleIndex + 1} of ${b.moduleCount}: ${b.module.title}
Module goal: ${b.module.goal}
${before}
Tutor's instructions for this module: ${b.focus || "none"}`;
}

// Reasoning effort, measured on DeepSeek V4.1 Flash (see HARNESS.md):
// - writing at "medium": ~10s vs ~20s at the default, same quality and
//   quiz validity; with reasoning off, lessons scored lower.
// - scoring at "low": same scores as the default, a fraction of the time.
const WRITER_OPTIONS = { reasoningEffort: "medium" } as const;
const EVALUATOR_OPTIONS = { reasoningEffort: "low" } as const;

// The model occasionally ignores the quiz rules. Retry once on a validation
// failure (bounded), then give up with a clear error.
const MAX_LESSON_ATTEMPTS = 2;

async function requestValidLesson(request: () => Promise<unknown>): Promise<Lesson> {
  let lastError: z.ZodError | undefined;
  for (let attempt = 1; attempt <= MAX_LESSON_ATTEMPTS; attempt++) {
    const result = LessonSchema.safeParse(await request());
    if (result.success) return result.data;
    lastError = result.error;
  }
  throw new Error(
    `Model did not return a valid lesson with a quiz after ${MAX_LESSON_ATTEMPTS} attempts: ${lastError?.message}`
  );
}

function generateLesson(brief: LessonBrief, deadline: Deadline): Promise<Lesson> {
  return requestValidLesson(() =>
    callStructured(
      `You are an expert instructional designer writing one module of a course.
Teach this module's goal clearly with concrete examples. Build on earlier modules
without repeating them, and don't teach later modules' material.

${LESSON_REQUIREMENTS}`,
      `${describeBrief(brief)}\n\nWrite this module's lesson.`,
      lessonJsonSchema,
      deadline,
      WRITER_OPTIONS
    )
  );
}

async function evaluateLesson(brief: LessonBrief, lesson: Lesson, deadline: Deadline): Promise<Evaluation> {
  const result = await callStructured(
    `You are a strict educational quality evaluator. Evaluate the lesson on a 0-10 scale.
Use the FULL range: 3 = poor, 5 = mediocre, 7 = good, 8-9 = excellent, 10 = perfect.
Evaluate for: accuracy, clarity, fit to the module goal, difficulty, examples,
active learning, and time fit (5-10 min). Be critical, but score honestly. Return only JSON.`,
    `${describeBrief(brief)}\n\nLesson:\n${JSON.stringify(lesson, null, 2)}`,
    evaluationJsonSchema,
    deadline,
    EVALUATOR_OPTIONS
  );
  return EvaluationSchema.parse(result);
}

function reviseLesson(
  brief: LessonBrief,
  lesson: Lesson,
  evaluation: Evaluation,
  deadline: Deadline
): Promise<Lesson> {
  return requestValidLesson(() =>
    callStructured(
      `You are an expert instructional designer. Revise the lesson to fix the evaluator's feedback.

${LESSON_REQUIREMENTS}`,
      `${describeBrief(brief)}\n\nLesson:\n${JSON.stringify(lesson, null, 2)}\n\nFeedback:\n${JSON.stringify(
        evaluation,
        null,
        2
      )}`,
      lessonJsonSchema,
      deadline,
      WRITER_OPTIONS
    )
  );
}

// A lesson must score at least this to count as passing evaluation.
export const PASS_SCORE = 8;
// Bounded iteration: at most this many evaluations (so at most one revision).
const MAX_ITERATIONS = 2;

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Writes a lesson for `brief`. Only evaluated versions can be returned; a
 * revision that fails or can't be evaluated is discarded. No revision starts
 * after `reviseDeadline`, and no model call runs past `deadline` (epoch ms).
 */
export async function writeLesson(
  brief: LessonBrief,
  { reviseDeadline, deadline, trace }: { reviseDeadline: number; deadline: Deadline; trace: TraceEntry[] }
): Promise<{ lesson: Lesson; score: number; passed: boolean }> {
  let t = Date.now();
  let candidate = await generateLesson(brief, deadline);
  trace.push({ step: "lesson.generate", module: brief.moduleIndex + 1, ms: Date.now() - t });

  let best: { lesson: Lesson; score: number } | null = null;

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    let evaluation: Evaluation;
    t = Date.now();
    try {
      evaluation = await evaluateLesson(brief, candidate, deadline);
    } catch (e) {
      // Nothing evaluated yet means nothing we're allowed to show.
      if (!best) throw e;
      trace.push({ step: "lesson.evaluate_failed", iteration, error: errorMessage(e) });
      break;
    }

    trace.push({
      step: "lesson.evaluate",
      iteration,
      score: evaluation.score,
      ms: Date.now() - t,
      problems: evaluation.problems,
    });
    if (!best || evaluation.score > best.score) {
      best = { lesson: candidate, score: evaluation.score };
    }

    if (evaluation.score >= PASS_SCORE || iteration === MAX_ITERATIONS) break;
    if (Date.now() > reviseDeadline) {
      trace.push({ step: "lesson.revise_skipped", iteration, reason: "time budget" });
      break;
    }

    t = Date.now();
    try {
      candidate = await reviseLesson(brief, candidate, evaluation, deadline);
      trace.push({ step: "lesson.revise", iteration, ms: Date.now() - t });
    } catch (e) {
      trace.push({ step: "lesson.revise_failed", iteration, error: errorMessage(e) });
      break;
    }
  }

  // The loop always evaluates at least once or throws, so best is set.
  const { lesson, score } = best!;
  const passed = score >= PASS_SCORE;
  trace.push({ step: "lesson.select", score, passed });
  return { lesson, score, passed };
}
