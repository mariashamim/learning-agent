// A lesson is an ordered sequence of teaching blocks, designed around its
// topic, rather than one fixed template. This file is the shape of a stored
// lesson, shared by server and browser; lessonDesign.ts holds the writing
// guide and validation.
//
// Storage stays compatible with everything that reads lessons:
// - `questions` still holds the graded knowledge checks (2-4), so server-side
//   grading and course progress work unchanged. A "check" block places one
//   of them inline, at the point in the lesson where it belongs.
// - `activities` still holds the typed interactive activities; an "activity"
//   block places one.
// - Lessons saved before blocks existed have no `blocks`; lessonBlocks()
//   rebuilds their original order (concepts, activities, quiz at the end).

import type { Activity } from "./activities";

export const APPROACHES = {
  mystery: "Mystery first: open with a puzzle or surprising fact, then resolve it",
  discovery: "Guided discovery: the learner works the idea out through questions and experiments",
  visual: "Visual explanation: diagrams, charts and spatial models carry the idea",
  scenario: "Real-world scenario: one realistic situation the learner works through",
  worked_example: "Worked example: solve a problem step by step, then the learner tries one",
  misconception: "Misconception challenge: surface a common wrong belief, then dismantle it",
  simulation: "Interactive simulation: vary a quantity and watch what changes",
  case_study: "Case study: a real event or example examined closely",
  story: "Story: a narrative that carries the idea",
  socratic: "Socratic dialogue: a conversation of questions that leads to the idea",
  compare: "Compare and contrast: understand an idea by setting it against another",
  practice: "Practice-driven: short explanation, then many attempts with feedback",
  reflection: "Reflection and application: connect the idea to the learner's own life or work",
} as const;
export type Approach = keyof typeof APPROACHES;

export const BLOCK_KINDS = [
  "explain",
  "activity",
  "check",
  "worked",
  "code",
  "compare",
  "reflect",
  "dialogue",
  "summary",
] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

export type CodeOption = { text: string; correct: boolean; feedback: string };
export type TraceStep = { line: number; note: string; state: string };

export type Block =
  | { kind: "explain"; heading: string; body: string; example: string }
  /** Places lesson.activities[ref]. */
  | { kind: "activity"; ref: number }
  /** Places graded question lesson.questions[ref], with progressive hints and another way to explain it. */
  | { kind: "check"; ref: number; hints: string[]; retry: string }
  | { kind: "worked"; heading: string; problem: string; steps: { title: string; text: string; why: string }[]; answer: string }
  | {
      kind: "code";
      heading: string;
      prompt: string;
      language: string;
      code: string;
      /** predict: what does it print? bug: which change fixes it? trace: step through it. */
      mode: "predict" | "bug" | "trace";
      options: CodeOption[];
      trace: TraceStep[];
      explanation: string;
      hints: string[];
    }
  | { kind: "compare"; heading: string; intro: string; columns: [string, string]; rows: { label: string; a: string; b: string }[] }
  | { kind: "reflect"; heading: string; prompt: string; model: string }
  | { kind: "dialogue"; heading: string; turns: { speaker: string; text: string }[] }
  | { kind: "summary"; heading: string; points: string[] };

/** A graded knowledge check. Graded on the server against the stored lesson. */
export type Question = { question: string; options: string[]; correctAnswer: string; explanation: string };

/**
 * A stored lesson. New lessons have version 2, an approach and blocks; older
 * ones have concepts and (sometimes) activities, rendered via lessonBlocks().
 */
export type Lesson = {
  version?: 2;
  title: string;
  objective: string;
  estimatedMinutes: number;
  approach?: Approach;
  approachReason?: string;
  blocks?: Block[];
  concepts?: { name: string; explanation: string; example: string }[];
  activities?: Activity[];
  questions: Question[];
};

/**
 * The block sequence for any stored lesson. Lessons written before blocks
 * existed are rebuilt in their original order: activities placed before the
 * first concept, each concept followed by its activities, the quiz at the end.
 */
export function lessonBlocks(lesson: Lesson): Block[] {
  if (Array.isArray(lesson.blocks) && lesson.blocks.length > 0) return lesson.blocks;
  const blocks: Block[] = [];
  const activities = lesson.activities ?? [];
  const activitiesAt = (slot: number) =>
    activities.forEach((a, ref) => {
      if ((a.afterConcept ?? 0) === slot) blocks.push({ kind: "activity", ref });
    });
  activitiesAt(-1);
  (lesson.concepts ?? []).forEach((c, i) => {
    blocks.push({ kind: "explain", heading: c.name, body: c.explanation, example: c.example });
    activitiesAt(i);
  });
  (lesson.questions ?? []).forEach((_, ref) => blocks.push({ kind: "check", ref, hints: [], retry: "" }));
  return blocks;
}

/** Blocks the learner engages with (they count toward the session bar). */
export const isInteractive = (b: Block) => b.kind !== "explain" && b.kind !== "compare" && b.kind !== "summary";
