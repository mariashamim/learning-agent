// The quality gate. Writes one module lesson, scores it with a separate
// evaluator call, revises once if it falls short, and returns the best
// *evaluated* version. This is deterministic code: the tutor agent decides
// what to write and why, but cannot skip these checks.

import { z } from "zod";
import type { Lesson } from "./lessonBlocks";
import { LESSON_GUIDE, lessonJsonSchema, lintStructure, normalizeLesson, toModelFormat, type NormalizeReport } from "./lessonDesign";
import { callStructured, type Deadline } from "./model";

export type { Lesson } from "./lessonBlocks";

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
  module: { title: string; goal: string; description?: string };
  /** Where the module sits in the course's levels; absent for courses planned before levels. */
  level?: { number: number; count: number; title: string; objective: string; moduleNumber: number; moduleCount: number };
  /** Titles of the modules before this one, for continuity. */
  previousModules: string[];
  /** Teaching approaches earlier modules used, so a course doesn't repeat one shape. */
  previousApproaches?: string[];
  /** The agent's instructions, e.g. what to recap given past mistakes. */
  focus: string;
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

// Shared by generate and revise so a first draft gets the same rules.
const LESSON_REQUIREMENTS = `${LESSON_GUIDE}

Return only JSON matching the schema. The blocks and questions arrays MUST NOT be empty.`;

function describeBrief(b: LessonBrief) {
  const before = b.previousModules.length
    ? `Modules already covered: ${b.previousModules.map((t, i) => `${i + 1}. ${t}`).join("; ")}.`
    : "This is the first module.";
  return `Course: ${b.courseTitle} (topic: ${b.topic})
${
    b.level
      ? `Level ${b.level.number} of ${b.level.count}: ${b.level.title} (level objective: ${b.level.objective})
Module ${b.level.moduleNumber} of ${b.level.moduleCount} in this level (${b.moduleIndex + 1} of ${b.moduleCount} in the course): ${b.module.title}`
      : `Module ${b.moduleIndex + 1} of ${b.moduleCount}: ${b.module.title}`
  }
Module goal: ${b.module.goal}${b.module.description ? `
Module covers: ${b.module.description}` : ""}
${before}
${b.previousApproaches?.length ? `Approaches used in earlier modules: ${b.previousApproaches.join(", ")}.\n` : ""}Tutor's instructions for this module: ${b.focus || "none"}`;
}

// Reasoning effort, measured on DeepSeek V4.1 Flash (see HARNESS.md):
// - writing at "medium": ~10s vs ~20s at the default, same quality and
//   quiz validity; with reasoning off, lessons scored lower.
// - scoring at "low": same scores as the default, a fraction of the time.
const WRITER_OPTIONS = { reasoningEffort: "medium" } as const;
const EVALUATOR_OPTIONS = { reasoningEffort: "low" } as const;

// The model occasionally ignores the rules. Retry once on a validation
// failure (bounded), then give up with a clear error.
const MAX_LESSON_ATTEMPTS = 2;

type Written = { lesson: Lesson; report: Record<string, unknown> };

/** What the trace records about a written lesson: its shape and what validation dropped. */
const describeWritten = (lesson: Lesson, r: NormalizeReport) => ({
  approach: lesson.approach,
  blocks: lesson.blocks?.map((b) => b.kind).join(" > "),
  ...r,
});

async function requestValidLesson(request: () => Promise<unknown>): Promise<Written> {
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_LESSON_ATTEMPTS; attempt++) {
    const result = normalizeLesson(await request());
    if (result.ok) return { lesson: result.lesson, report: describeWritten(result.lesson, result.report) };
    lastError = result.error;
  }
  throw new Error(`Model did not return a valid lesson after ${MAX_LESSON_ATTEMPTS} attempts: ${lastError}`);
}

function generateLesson(brief: LessonBrief, deadline: Deadline): Promise<Written> {
  return requestValidLesson(() =>
    callStructured(
      `You are an expert instructional designer writing one module of an interactive course,
in the spirit of Brilliant: the learner DOES things, not just reads. Design the lesson the way a
great teacher of THIS subject would teach THIS idea: choose the approach first, then the sequence.
Build on earlier modules without repeating them, and don't teach later modules' material.

${LESSON_REQUIREMENTS}`,
      `${describeBrief(brief)}\n\nWrite this module's lesson.`,
      lessonJsonSchema,
      deadline,
      WRITER_OPTIONS
    )
  );
}

async function evaluateLesson(brief: LessonBrief, lesson: Lesson, deadline: Deadline): Promise<Evaluation> {
  // Structural problems code can detect are handed to the evaluator as facts.
  const issues = lintStructure(lesson);
  const result = await callStructured(
    `You are a strict educational quality evaluator. Evaluate the lesson on a 0-10 scale.
Use the FULL range: 3 = poor, 5 = mediocre, 7 = good, 8-9 = excellent, 10 = perfect.
The lesson is an ordered list of blocks; "activity" and "check" blocks point (by ref) into the
activities and questions arrays. Evaluate for:
- accuracy of every fact and number; for code, the stated output, bug fix and trace must be exactly
  what the code really does
- fit: does the chosen approach suit this subject and idea? Would a great teacher of it teach it this way?
- structure: a coherent path from exploration to understanding to application, not a generic
  template; knowledge checks right after the ideas they test, getting harder; no filler
- interactivity: hands-on blocks that make the learner think, varied, never decorative
- checks: scenario-based questions, hints that help without giving the answer away, and an
  alternative explanation that is genuinely different
- clarity, fit to the module goal, and time (5-10 min).
Code-detected structural issues are listed with the lesson; each one should lower the score.
Be critical, but score honestly. Return only JSON.`,
    `${describeBrief(brief)}\n\nLesson:\n${JSON.stringify(lesson, null, 2)}\n\nCode-detected structural issues:${
      issues.length ? issues.map((i) => `\n- ${i}`).join("") : " none"
    }`,
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
): Promise<Written> {
  return requestValidLesson(() =>
    callStructured(
      `You are an expert instructional designer. Revise the lesson to fix the evaluator's feedback.
It is shown in the same format you write: keep what works, fix what the feedback names, and
return the whole lesson.

${LESSON_REQUIREMENTS}`,
      `${describeBrief(brief)}\n\nLesson:\n${JSON.stringify(toModelFormat(lesson), null, 2)}\n\nFeedback:\n${JSON.stringify(
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
  const first = await generateLesson(brief, deadline);
  let candidate = first.lesson;
  trace.push({
    step: "lesson.generate",
    module: brief.moduleIndex + 1,
    ms: Date.now() - t,
    ...first.report,
  });

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
      structureIssues: lintStructure(candidate),
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
      const revised = await reviseLesson(brief, candidate, evaluation, deadline);
      candidate = revised.lesson;
      trace.push({
        step: "lesson.revise",
        iteration,
        ms: Date.now() - t,
        ...revised.report,
      });
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
