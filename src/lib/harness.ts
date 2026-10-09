// The tutor harness. Each run prepares the learner's next module for a topic.
//
//   1. Load state (course, progress). If the answer is already known, return
//      it without calling a model (resume an unfinished module, or report a
//      finished course).
//   2. Otherwise run a bounded agent loop: the model sees the learner's state,
//      calls tools (plan a course, inspect quiz mistakes, write a module), and
//      finishes with a short note to the learner.
//   3. The harness validates every tool call, enforces the rules the model
//      can't be trusted with (one course per topic, exactly one module per
//      run, only the current module), and routes all lesson writing through
//      the quality gate in lessonWriter.ts.

import { z } from "zod";
import * as db from "./db";
import { groupLevels, modulePlace } from "./courseHierarchy";
import { PLANNING_GUIDE, coursePlanToolParameters, parseCoursePlan } from "./coursePlan";
import { latestLessonForModule, toCourseView, type CourseView } from "./courseView";
import { PASS_SCORE, writeLesson, type Lesson, type TraceEntry } from "./lessonWriter";
import { callWithTools, type ChatMessage, type ToolCall, type ToolDefinition } from "./model";

export type { TraceEntry };

// Bounded iteration: the agent gets at most this many model turns per run.
const MAX_AGENT_STEPS = 6;
// The lesson writer won't start a revision after this point in the run...
const REVISE_DEADLINE_MS = 120_000;
// ...and the agent loop won't start a new turn after this one.
const RUN_BUDGET_MS = 200_000;
// Hard stop for every model call in the run (incl. retries). The route allows
// 300s; the rest is headroom for database writes.
const HARD_DEADLINE_MS = 280_000;

/** Case- and whitespace-insensitive key, so "Stoicism" and " stoicism" are one course. */
export function topicKey(topic: string) {
  return topic.trim().replace(/\s+/g, " ").toLowerCase();
}

export type TutorResult =
  | {
      kind: "lesson";
      course: CourseView;
      moduleIndex: number;
      lessonId: number | null;
      lesson: Lesson;
      score: number | null;
      passed: boolean;
      saved: boolean;
      /** True when an unfinished module was returned without new generation. */
      resumed: boolean;
      tutorNote: string | null;
      trace: TraceEntry[];
    }
  | { kind: "course_complete"; course: CourseView; trace: TraceEntry[] };

// ---------- Tools the agent can call ----------

const WriteModuleArgs = z.object({
  focus: z.string().max(800),
});

const TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "create_course",
      description:
        "Plan a new course for this topic: levels (stages of learning), each grouping a few modules, each module a 5-10 minute lesson. Only allowed when the learner has no course for the topic.",
      parameters: coursePlanToolParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "get_quiz_mistakes",
      description:
        "List the quiz questions the learner got wrong in this course so far, with what they chose and the right answer.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "write_module",
      description:
        "Write the lesson for the course's current module. A separate evaluator scores it and it is revised if needed. Call exactly once per run.",
      parameters: {
        type: "object",
        properties: {
          focus: {
            type: "string",
            description:
              "Instructions for the lesson writer: what to emphasize, what earlier idea to connect to, what misconception to recap. Under 80 words.",
          },
        },
        required: ["focus"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are the tutor agent of a learning app where anyone can learn anything through short interactive modules (5-10 minutes each). Each run, you prepare the learner's next module.

How to work:
1. If the learner has no course for this topic, call create_course. Use their history: don't re-teach basics they covered in related topics.
2. If the course state shows wrong quiz answers, call get_quiz_mistakes and use what you learn in the module's focus (for example, open with a short recap of the misunderstood idea).
3. Call write_module exactly once. Give a concrete focus for the lesson writer.
4. Then reply, without tool calls, with a short note to the learner: 1-2 warm sentences in second person on what this module covers and why it's next. Plain text only, no markdown, under 60 words.

Rules: one module per run; only the current module can be written; never claim progress the learner hasn't made.

${PLANNING_GUIDE}`;

type RunState = {
  learnerId: string;
  topic: string;
  key: string;
  course: db.CourseWithLessons | null;
  written: {
    moduleIndex: number;
    lessonId: number | null;
    lesson: Lesson;
    score: number;
    passed: boolean;
  } | null;
  startedAt: number;
  trace: TraceEntry[];
};

type ToolResult = Record<string, unknown>;

async function runTool(call: ToolCall, state: RunState): Promise<ToolResult> {
  let rawArgs: unknown;
  try {
    rawArgs = JSON.parse(call.function.arguments || "{}");
  } catch {
    return { error: "Arguments were not valid JSON." };
  }

  switch (call.function.name) {
    case "create_course": {
      if (state.course) return { error: "This learner already has a course for this topic. Use write_module." };
      const parsed = parseCoursePlan(rawArgs);
      if (!parsed.ok) return { error: `Invalid course plan: ${parsed.error}. Fix it and call create_course again.` };
      const row = await db.createCourse({
        learnerId: state.learnerId,
        topic: state.topic,
        topicKey: state.key,
        ...parsed.plan,
      });
      state.course = { ...row, lessons: [] };
      return {
        ok: true,
        levels: groupLevels(row.modules).length,
        modules: row.modules.length,
        next: "Call write_module to write the first module of level 1.",
      };
    }

    case "get_quiz_mistakes": {
      if (!state.course) return { mistakes: [], note: "No course yet, so no quiz history." };
      const lessons = await db.getCourseAttempts(state.course.id);
      const mistakes = lessons.flatMap((l) =>
        l.attempts
          .filter((a) => !a.correct)
          .map((a) => ({
            module: (l.module_index ?? 0) + 1,
            question: l.lesson_data.questions[a.question_index]?.question,
            chose: a.chosen,
            correctAnswer: l.lesson_data.questions[a.question_index]?.correctAnswer,
          }))
      );
      return { mistakes: mistakes.slice(0, 10) };
    }

    case "write_module": {
      if (!state.course) return { error: "Create the course first with create_course." };
      if (state.written) return { error: "A module was already written this run. Finish with your note." };
      if (state.course.status === "completed") return { error: "This course is already complete." };
      const args = WriteModuleArgs.safeParse(rawArgs);
      if (!args.success) return { error: `Invalid arguments: ${args.error.message}` };

      const course = state.course;
      const moduleIndex = course.current_module;
      const levels = groupLevels(course.modules);
      const place = modulePlace(levels, moduleIndex);
      const level = place.legacy ? null : levels[place.level];
      const { lesson, score, passed } = await writeLesson(
        {
          topic: course.topic,
          courseTitle: course.title,
          moduleIndex,
          moduleCount: course.modules.length,
          module: course.modules[moduleIndex],
          level: level
            ? {
                number: level.index + 1,
                count: levels.length,
                title: level.title,
                objective: level.objective,
                moduleNumber: place.number,
                moduleCount: level.modules.length,
              }
            : undefined,
          previousModules: course.modules.slice(0, moduleIndex).map((m) => m.title),
          previousApproaches: course.modules
            .slice(0, moduleIndex)
            .map((_, i) => latestLessonForModule(course, i)?.lesson_data.approach)
            .filter((a): a is NonNullable<typeof a> => !!a),
          focus: args.data.focus,
        },
        {
          reviseDeadline: state.startedAt + REVISE_DEADLINE_MS,
          deadline: state.startedAt + HARD_DEADLINE_MS,
          trace: state.trace,
        }
      );

      const lessonId = await db.saveLesson(state.learnerId, course.topic, lesson, score, {
        courseId: course.id,
        moduleIndex,
      });
      state.trace.push({ step: "save_lesson", lessonId });
      const progressSaved = await db.upsertProgress(state.learnerId, state.key, "started", lessonId ?? undefined);
      state.trace.push({ step: "save_progress", saved: progressSaved });
      await db.updateCourse(course.id, {}); // bump updated_at so it sorts first

      state.written = { moduleIndex, lessonId, lesson, score, passed };
      return { ok: true, module: moduleIndex + 1, lessonTitle: lesson.title, score, passed };
    }

    default:
      return { error: `Unknown tool: ${call.function.name}` };
  }
}

// ---------- Context the agent starts with ----------

async function describeState(state: RunState) {
  const history = (await db.getLearnerHistory(state.learnerId)) as { topic: string; status: string }[];
  const others = history.filter((h) => h.topic !== state.key);
  const historyLine = others.length
    ? `Other topics this learner has studied: ${others.map((h) => `${h.topic} (${h.status})`).join(", ")}.`
    : "The learner hasn't studied other topics here yet.";

  if (!state.course) {
    return `Learner wants to learn: "${state.topic}"\n${historyLine}\nCourse state: no course for this topic yet.`;
  }

  const course = state.course;
  const attempts = await db.getCourseAttempts(course.id);
  const levels = groupLevels(course.modules);
  const lines = course.modules.map((m, i) => {
    const lesson = latestLessonForModule(course, i);
    const quiz = attempts.find((a) => a.id === lesson?.id)?.attempts ?? [];
    const right = quiz.filter((a) => a.correct).length;
    const status =
      i < course.current_module
        ? `done${quiz.length ? `, quiz ${right}/${quiz.length} correct` : ""}`
        : i === course.current_module
          ? "NEXT — write this one"
          : "not started";
    const place = modulePlace(levels, i);
    const line = `  ${place.legacy ? i + 1 : `${place.level + 1}.${place.number}`}. ${m.title} — ${status}`;
    const level = levels[place.level];
    // Head each level with what it's for, so the agent sees where the learner is in the journey.
    return !place.legacy && place.number === 1
      ? `Level ${level.index + 1}: ${level.title} (objective: ${level.objective})\n${line}`
      : line;
  });
  return `Learner wants to continue: "${state.topic}"
${historyLine}
Course: "${course.title}" — ${course.description}
Modules:
${lines.join("\n")}`;
}

/** The note is shown as plain text: strip markdown the model adds anyway. */
function cleanNote(text: string | null) {
  const note = (text ?? "")
    .replace(/\*\*|__|`/g, "")
    .replace(/^#+\s*/gm, "")
    .trim();
  return note ? note.slice(0, 400) : null;
}

// ---------- The run ----------

export async function runTutor(topic: string, learnerId: string): Promise<TutorResult> {
  const state: RunState = {
    learnerId,
    topic: topic.trim(),
    key: topicKey(topic),
    course: null,
    written: null,
    startedAt: Date.now(),
    trace: [],
  };
  try {
    return await run(state);
  } catch (e) {
    // The trace never reaches the browser on failure, so keep it in the logs:
    // it shows which turn, tool or lesson step broke and how long each took.
    console.error("Tutor run failed", {
      topic: state.topic,
      elapsedMs: Date.now() - state.startedAt,
      trace: state.trace,
    });
    throw e;
  }
}

async function run(state: RunState): Promise<TutorResult> {
  const { trace, learnerId } = state;

  state.course = await db.getCourse(learnerId, state.key);
  trace.push({
    step: "load_course",
    found: !!state.course,
    currentModule: state.course ? state.course.current_module + 1 : null,
  });

  // Fast paths: no model call needed.
  if (state.course?.status === "completed") {
    trace.push({ step: "fast_path", reason: "course already complete" });
    return { kind: "course_complete", course: toCourseView(state.course), trace };
  }
  if (state.course) {
    const unfinished = latestLessonForModule(state.course, state.course.current_module);
    if (unfinished && !unfinished.completed_at) {
      trace.push({ step: "fast_path", reason: "resume unfinished module", lessonId: unfinished.id });
      return {
        kind: "lesson",
        course: toCourseView(state.course),
        moduleIndex: state.course.current_module,
        lessonId: unfinished.id,
        lesson: unfinished.lesson_data,
        score: unfinished.score,
        passed: (unfinished.score ?? 0) >= PASS_SCORE,
        saved: true,
        resumed: true,
        tutorNote: null,
        trace,
      };
    }
  }

  // The agent loop.
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: await describeState(state) },
  ];
  let tutorNote: string | null = null;
  let nudged = false;

  for (let step = 1; step <= MAX_AGENT_STEPS; step++) {
    if (Date.now() - state.startedAt > RUN_BUDGET_MS) {
      trace.push({ step: "agent.stop", reason: "time budget" });
      break;
    }

    const turnStarted = Date.now();
    const reply = await callWithTools(messages, TOOLS, state.startedAt + HARD_DEADLINE_MS);
    messages.push(reply);
    trace.push({
      step: "agent.turn",
      turn: step,
      ms: Date.now() - turnStarted,
      toolCalls: reply.tool_calls?.map((c) => c.function.name) ?? [],
    });

    if (reply.tool_calls?.length) {
      for (const call of reply.tool_calls) {
        let result: ToolResult;
        try {
          result = await runTool(call, state);
        } catch (e) {
          // Infrastructure failures (DB, lesson writer) end the run.
          trace.push({ step: "agent.tool", turn: step, tool: call.function.name, ok: false });
          throw e;
        }
        trace.push({
          step: "agent.tool",
          turn: step,
          tool: call.function.name,
          ok: !("error" in result),
          ...("error" in result ? { error: result.error } : {}),
        });
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
      continue;
    }

    // A reply without tool calls means the agent thinks it's done.
    if (state.written) {
      tutorNote = cleanNote(reply.content);
      trace.push({ step: "agent.finish", turn: step });
      break;
    }
    if (nudged) break;
    nudged = true;
    trace.push({ step: "agent.nudge", turn: step, reason: "finished without writing a module" });
    messages.push({
      role: "user",
      content: "You haven't written the module yet. Call write_module (after create_course if needed), then reply with your note.",
    });
  }

  if (!state.written || !state.course) {
    throw new Error("The tutor agent stopped without writing a module.");
  }

  // Reload so the response reflects exactly what was saved.
  const saved = await db.getCourse(learnerId, state.key);
  const w = state.written;
  return {
    kind: "lesson",
    course: toCourseView(saved ?? state.course),
    moduleIndex: w.moduleIndex,
    lessonId: w.lessonId,
    lesson: w.lesson,
    score: w.score,
    passed: w.passed,
    saved: w.lessonId !== null,
    resumed: false,
    tutorNote,
    trace,
  };
}
