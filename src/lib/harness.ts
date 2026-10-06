import { z } from "zod";
import { getLearnerHistory, saveLesson, upsertProgress } from "./db";

const LessonSchema = z.object({
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

const MODEL = process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4.1-flash";

// A single model call may not hang the request: abort after this long.
const MODEL_TIMEOUT_MS = 60_000;

async function callModel(
  system: string,
  user: string,
  schema: Record<string, unknown>
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "response",
            strict: true,
            schema,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Model returned no content");
  return JSON.parse(content);
}

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

// Shared by generate and revise so a first draft gets the same quiz rules.
const LESSON_REQUIREMENTS = `REQUIREMENTS:
- 2-3 concepts, each with a clear explanation and a concrete real-world example
- EXACTLY 3 multiple-choice questions (never fewer than 2, never more than 4)
- Each question must have EXACTLY 4 options
- The correctAnswer field must be an EXACT string match of one of the options
- Each question needs a 1-2 sentence explanation of why the answer is correct
- Total lesson time: 5-10 minutes

Return only JSON matching the schema. The questions array MUST NOT be empty.`;

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

async function generateLesson(
  topic: string,
  history: HistoryEntry[] = []
): Promise<Lesson> {
  const historyContext =
    history.length === 0
      ? "This learner is brand new. No prior lessons."
      : `This learner has already studied these topics:\n${history
          .map((h) => `- ${h.topic} (${h.status})`)
          .join(
            "\n"
          )}\n\nWhen relevant, connect the new lesson to what they already know. Avoid repeating introductory material they've already covered.`;

  return requestValidLesson(() =>
    callModel(
      `You are an expert instructional designer. Create a short interactive lesson.
Teach concepts clearly with concrete examples.

${LESSON_REQUIREMENTS}`,
      `${historyContext}\n\nCreate a beginner-friendly lesson about: ${topic}`,
      lessonJsonSchema
    )
  );
}

async function evaluateLesson(topic: string, lesson: Lesson): Promise<Evaluation> {
  const result = await callModel(
    `You are a strict educational quality evaluator. Evaluate the lesson on a 0-10 scale.
Use the FULL range: 3 = poor, 5 = mediocre, 7 = good, 8-9 = excellent, 10 = perfect.
Evaluate for: accuracy, clarity, difficulty, examples, active learning, and time fit (5-10 min).
Be critical, but score honestly. Return only JSON.`,
    `Topic: ${topic}\n\nLesson:\n${JSON.stringify(lesson, null, 2)}`,
    evaluationJsonSchema
  );
  return EvaluationSchema.parse(result);
}

async function reviseLesson(
  topic: string,
  lesson: Lesson,
  evaluation: Evaluation
): Promise<Lesson> {
  return requestValidLesson(() =>
    callModel(
      `You are an expert instructional designer. Create a short interactive lesson.

${LESSON_REQUIREMENTS}`,
      `Topic: ${topic}\n\nLesson:\n${JSON.stringify(
        lesson,
        null,
        2
      )}\n\nFeedback:\n${JSON.stringify(evaluation, null, 2)}`,
      lessonJsonSchema
    )
  );
}

// ---------- The agent loop ----------

// A lesson must score at least this to count as passing evaluation.
const PASS_SCORE = 8;
// Bounded iteration: at most this many evaluations (so at most one revision).
const MAX_ITERATIONS = 2;
// Don't start a revision this late: a revision plus its re-evaluation can
// take ~3 minutes in the worst case, and the route allows 5.
const REVISE_DEADLINE_MS = 100_000;

export type TraceEntry = { step: string; [key: string]: unknown };
type HistoryEntry = { topic: string; status: string };

/** Case- and whitespace-insensitive key, so "Stoicism" and " stoicism" are one topic. */
export function topicKey(topic: string) {
  return topic.trim().replace(/\s+/g, " ").toLowerCase();
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function runLearningHarness(topic: string, learnerId: string) {
  const startedAt = Date.now();
  const trace: TraceEntry[] = [];
  const key = topicKey(topic);

  const history = (await getLearnerHistory(learnerId)) as HistoryEntry[];
  trace.push({
    step: "load_history",
    entries: history.length,
    topics: history.map((h) => h.topic),
  });

  let candidate = await generateLesson(topic, history);
  trace.push({ step: "generate", result: "Lesson generated" });

  // Only lessons that have been evaluated may be shown. Track the best one;
  // a revision that fails or can't be re-evaluated is discarded.
  let best: { lesson: Lesson; score: number } | null = null;

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    let evaluation: Evaluation;
    try {
      evaluation = await evaluateLesson(topic, candidate);
    } catch (e) {
      // Nothing evaluated yet means nothing we're allowed to show.
      if (!best) throw e;
      trace.push({ step: "evaluate_failed", iteration, error: errorMessage(e) });
      break;
    }

    trace.push({
      step: "evaluate",
      iteration,
      score: evaluation.score,
      approved: evaluation.approved,
      problems: evaluation.problems,
    });
    if (!best || evaluation.score > best.score) {
      best = { lesson: candidate, score: evaluation.score };
    }

    if (evaluation.score >= PASS_SCORE || iteration === MAX_ITERATIONS) break;
    if (Date.now() - startedAt > REVISE_DEADLINE_MS) {
      trace.push({ step: "revise_skipped", iteration, reason: "time budget" });
      break;
    }

    try {
      candidate = await reviseLesson(topic, candidate, evaluation);
      trace.push({ step: "revise", iteration, result: "Lesson revised" });
    } catch (e) {
      trace.push({ step: "revise_failed", iteration, error: errorMessage(e) });
      break;
    }
  }

  // The loop always evaluates at least once or throws, so best is set.
  const { lesson, score } = best!;
  const passed = score >= PASS_SCORE;
  trace.push({ step: "select", score, passed });

  const lessonId = await saveLesson(learnerId, topic.trim(), lesson, score);
  trace.push({ step: "save_lesson", lessonId });

  const progressSaved = await upsertProgress(learnerId, key, "started", lessonId ?? undefined);
  trace.push({ step: "save_progress", saved: progressSaved });

  return {
    lesson,
    score,
    passed,
    saved: lessonId !== null,
    trace,
    history,
  };
}
