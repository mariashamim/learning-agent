"use client";

import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { APPROACHES, isInteractive, lessonBlocks } from "@/lib/lessonBlocks";
import { CoursePath } from "./CoursePath";
import { HarnessTrace } from "./HarnessTrace";
import { LessonBlock } from "./lesson/LessonBlock";
import { Burst, ProgressFill } from "./motion/primitives";
import { spring } from "./motion/presets";
import { Reveal } from "./Reveal";
import { ScoreBadge } from "./ScoreBadge";
import type { Answer, Course, PrefetchState, QuizResult, View } from "./types";
import { levelsOf, moduleLabel } from "@/lib/courseHierarchy";

// Entrance timing (ms): the header, then each block as it scrolls into view.
const PASS_SCORE = 8;
const BLOCK_START = 120;
const BLOCK_STAGGER = 90;
const DURATION = 400;

type Submission =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "done"; result: QuizResult }
  | { state: "error"; message: string };

/** "Mystery first: open with…" → "Mystery first". */
const approachLabel = (key?: string) =>
  key && key in APPROACHES ? APPROACHES[key as keyof typeof APPROACHES].split(":")[0] : null;

export function LessonView({
  view,
  onSubmitQuiz,
  nextModuleState,
  onContinue,
  onOpenModule,
}: {
  view: Extract<View, { kind: "lesson" }>;
  onSubmitQuiz: (lessonId: number, answers: Answer[]) => Promise<QuizResult>;
  /** Whether the next module is being written in the background. */
  nextModuleState?: PrefetchState;
  onContinue: (topic: string) => void;
  onOpenModule: (course: Course, moduleIndex: number) => void;
}) {
  const { lesson, lessonId, score, status, course, moduleIndex, tutorNote, trace } = view;
  // The ordered teaching blocks; older lessons are rebuilt in their original order.
  const blocks = lessonBlocks(lesson);
  const [answers, setAnswers] = useState<Record<number, { chosen: string; correct: boolean }>>({});
  const [doneBlocks, setDoneBlocks] = useState<Set<number>>(() => new Set());
  const markDone = (i: number) => setDoneBlocks((s) => (s.has(i) ? s : new Set(s).add(i)));
  const [submission, setSubmission] = useState<Submission>({ state: "idle" });

  const answered = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((a) => a.correct).length;
  const total = lesson.questions.length;
  const checkOrder = blocks.flatMap((b) => (b.kind === "check" ? [b.ref] : []));
  const practice = blocks.map((b, i) => ({ b, i })).filter(({ b }) => isInteractive(b) && b.kind !== "check");
  const sessionSteps = practice.length + total;
  const sessionDone = practice.filter(({ i }) => doneBlocks.has(i)).length + answered;
  const approach = approachLabel(lesson.approach);
  const currentMod = course && moduleIndex !== null ? course.modules[moduleIndex] : null;
  const level = course && currentMod ? levelsOf(course)[currentMod.level] : null;
  const levelTitle = level && !level.legacy ? level.title : null;
  // After the quiz is saved, show the server's updated course (e.g. this module ticked off).
  const pathCourse =
    submission.state === "done" && submission.result.course ? submission.result.course : course;

  async function submit(all: typeof answers) {
    if (lessonId === null) return;
    setSubmission({ state: "saving" });
    try {
      const result = await onSubmitQuiz(
        lessonId,
        Object.entries(all).map(([i, a]) => ({ questionIndex: Number(i), chosen: a.chosen }))
      );
      setSubmission({ state: "done", result });
    } catch (e) {
      setSubmission({ state: "error", message: e instanceof Error ? e.message : "Couldn't save your quiz." });
    }
  }

  // Checks sit through the lesson; the module is saved once the last one is answered.
  function handleAnswer(i: number, chosen: string, correct: boolean) {
    if (answers[i]) return;
    const next = { ...answers, [i]: { chosen, correct } };
    setAnswers(next);
    if (Object.keys(next).length === total) submit(next);
  }

  const unanswered = checkOrder.filter((q) => !answers[q]);

  return (
    <article id="lesson" className="mt-16 scroll-mt-24">
      {pathCourse && (
        <Reveal y={10} duration={DURATION} className="mb-8">
          <CoursePath course={pathCourse} activeIndex={moduleIndex} onOpenModule={onOpenModule} />
        </Reveal>
      )}

      <Reveal as="header" y={10} duration={DURATION} className="border-b border-beige/70 pb-8">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {currentMod && moduleIndex !== null && course && (
            <>
              <span className="font-medium uppercase tracking-[0.18em] text-coffee">
                {moduleLabel(levelsOf(course), moduleIndex)}
                {levelTitle && <span className="ml-1.5 normal-case tracking-normal text-taupe">{levelTitle}</span>}
              </span>
              <span className="h-1 w-1 rounded-full bg-beige" aria-hidden />
            </>
          )}
          <span className="uppercase tracking-[0.18em] text-taupe">
            {lesson.estimatedMinutes} min{total > 0 && ` · ${total} ${total === 1 ? "check" : "checks"}`}
          </span>
          {score != null && <ScoreBadge score={score} />}
        </div>
        <h2 className="font-display mt-4 text-3xl leading-tight font-medium tracking-tight text-espresso sm:text-5xl">
          {lesson.title}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-coffee sm:text-lg">
          {lesson.objective}
        </p>
        {approach && (
          <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-taupe">
            <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-0.5 text-xs font-semibold text-gold">
              {approach}
            </span>
            {lesson.approachReason && <span className="leading-relaxed">{lesson.approachReason}</span>}
          </p>
        )}

        {tutorNote && (
          <div className="mt-6 flex gap-3 rounded-2xl border border-beige bg-paper px-5 py-4">
            <span className="font-display flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gold text-sm text-ink italic">
              T
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-taupe">Your tutor</p>
              <p className="mt-1 text-[15px] leading-relaxed text-espresso">{tutorNote}</p>
            </div>
          </div>
        )}
        {status.resumed && (
          <Notice>Picking up where you left off: you haven&rsquo;t finished this module&rsquo;s checks yet.</Notice>
        )}
        {status.passed === false && score != null && (
          <Notice>
            This is the agent&rsquo;s best attempt: it scored {score}/10, below the {PASS_SCORE}/10
            quality bar, after revision.
          </Notice>
        )}
        {status.saved === false && (
          <Notice>
            This lesson couldn&rsquo;t be saved, so your progress on it won&rsquo;t be kept. You can
            still study it now.
          </Notice>
        )}
      </Reveal>

      {sessionSteps > 0 && (
        <div className="activity-progress sticky top-16 z-20 mt-6 flex items-center gap-3 rounded-full border border-gold/30 bg-ink/85 px-4 py-2 text-xs text-sand lg:top-4">
          <span className="font-semibold text-gold">Your session</span>
          <span className="flex flex-1 gap-1" aria-hidden>
            {blocks.map((b, i) =>
              b.kind === "check" ? (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${answers[b.ref] ? (answers[b.ref].correct ? "bg-sage" : "bg-red-400") : "bg-sand/15 ring-1 ring-gold/30"}`} />
              ) : isInteractive(b) ? (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${doneBlocks.has(i) ? "bg-gold" : "bg-sand/15"}`} />
              ) : null
            )}
          </span>
          <span className="tabular-nums">
            {sessionDone}/{sessionSteps}
          </span>
        </div>
      )}

      <div className="mt-10 space-y-6">
        {blocks.map((b, i) => (
          <Reveal key={i} group="blocks" delay={BLOCK_START} stagger={BLOCK_STAGGER} duration={DURATION}>
            <LessonBlock
              block={b}
              lesson={lesson}
              checkNumber={b.kind === "check" ? checkOrder.indexOf(b.ref) + 1 : 0}
              checkCount={checkOrder.length}
              onDone={() => markDone(i)}
              onAnswer={handleAnswer}
            />
          </Reveal>
        ))}
      </div>

      {total === 0 && (
        <p className="mt-12 text-sm text-taupe">
          This lesson was saved before quizzes were required, so it has no questions. Search the
          topic again for a course with quizzes.
        </p>
      )}

      {total > 0 && (
        <section className="mt-14" aria-label="Finish the module">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-taupe">Module checks</p>
              <h3 className="font-display mt-1 text-2xl font-medium text-espresso">
                {answered === total ? "Module finished" : "Finish the module"}
              </h3>
            </div>
            <QuizProgress answered={answered} correct={correctCount} total={total} />
          </div>
          {answered < total && (
            <div className="mt-4 rounded-2xl border border-beige bg-paper px-5 py-4 text-sm text-sand">
              <p>
                {unanswered.length === 1 ? "One check is" : `${unanswered.length} checks are`} still open. Your
                progress is saved once every check is answered.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {unanswered.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => document.getElementById(`check-${q}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                    className="rounded-full border border-gold/40 px-3 py-1 text-xs font-medium text-gold hover:bg-gold/10"
                  >
                    Go to check {checkOrder.indexOf(q) + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
          {answered === total && (
            <QuizOutcome
              correct={correctCount}
              total={total}
              submission={submission}
              moduleIndex={moduleIndex}
              course={course}
              nextModuleState={nextModuleState}
              onRetry={() => submit(answers)}
              onContinue={onContinue}
            />
          )}
        </section>
      )}

      <HarnessTrace trace={trace} />
    </article>
  );
}

function QuizOutcome({
  correct,
  total,
  submission,
  moduleIndex,
  course,
  nextModuleState,
  onRetry,
  onContinue,
}: {
  correct: number;
  total: number;
  submission: Submission;
  moduleIndex: number | null;
  course: Course | null;
  nextModuleState?: PrefetchState;
  onRetry: () => void;
  onContinue: (topic: string) => void;
}) {
  const scoreLine =
    correct === total ? "A clean sweep. Well done." : `You got ${correct} of ${total}.`;
  // Prefer the server's updated course once the quiz is saved.
  const latest = submission.state === "done" ? (submission.result.course ?? course) : course;
  const finishedCourse = latest?.status === "completed";
  const nextIndex = latest?.currentModule ?? null;
  const next = latest && nextIndex !== null && !finishedCourse ? latest.modules[nextIndex] : null;
  const saved = submission.state === "done";
  // Levels the server now reports finished that weren't before this save.
  const before = course ? levelsOf(course) : [];
  const finishedLevels =
    saved && latest && course
      ? levelsOf(latest)
          .map((l, i) => ({ l, n: i + 1 }))
          .filter(({ l }) => !l.legacy && l.status === "done" && before.find((b) => b.id === l.id)?.status !== "done")
      : [];
  const doneModules = latest ? latest.modules.filter((m) => m.lesson?.completed).length : 0;

  return (
    <motion.div
      className="relative mt-6 rounded-2xl border border-gold/30 bg-ink px-6 py-5 text-sand"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring.gentle}
    >
      <Burst trigger={saved && submission.result.firstCompletion ? "saved" : null} />
      <p className="font-display text-lg">{scoreLine}</p>
      {finishedLevels.map(({ l, n }) => (
        <motion.div
          key={l.id}
          className="relative mt-3 flex items-center gap-3 rounded-xl border border-gold/50 bg-gold/15 px-4 py-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring.bouncy, delay: 0.3 }}
          role="status"
        >
          <Burst trigger={l.id} />
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gold font-display text-ink">{n}</span>
          <span>
            <span className="block text-xs font-semibold tracking-[0.16em] text-gold uppercase">Level {n} complete</span>
            <span className="block text-sm text-sand">{l.title}</span>
          </span>
        </motion.div>
      ))}
      {saved && latest && (
        <div className="mt-3 flex items-center gap-3">
          <ProgressFill value={doneModules / latest.modules.length} className="flex-1" label="Course progress" />
          <span className="text-xs tabular-nums text-peach/70">
            {doneModules}/{latest.modules.length} modules
          </span>
        </div>
      )}

      {submission.state === "saving" && <p className="mt-2 text-sm text-peach/70">Saving your progress…</p>}

      {submission.state === "error" && (
        <p className="mt-2 text-sm text-peach/80">
          {submission.message}{" "}
          <button type="button" onClick={onRetry} className="underline underline-offset-2 hover:text-gold">
            Try again
          </button>
        </p>
      )}

      {submission.state === "done" && latest && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {finishedCourse ? (
            <>
              <p className="text-sm text-peach/85">You&rsquo;ve finished the whole course.</p>
              <button type="button" onClick={() => onContinue(latest.topic)} className="btn-primary rounded-full px-4 py-2 text-sm font-semibold">
                See your course →
              </button>
            </>
          ) : next && nextIndex !== null ? (
            <>
              <p className="text-sm text-peach/85">
                {nextIndex === moduleIndex
                  ? "This module is still open."
                  : `Up next: ${moduleLabel(levelsOf(latest), nextIndex)}, ${next.title}.`}
                {nextModuleState === "pending" && (
                  <span className="mt-1 flex items-center gap-2 text-xs text-peach/65">
                    <span className="inline-flex gap-1" aria-hidden>
                      <span className="h-1 w-1 rounded-full bg-peach animate-dot-1" />
                      <span className="h-1 w-1 rounded-full bg-peach animate-dot-2" />
                      <span className="h-1 w-1 rounded-full bg-peach animate-dot-3" />
                    </span>
                    Your tutor is writing it now
                  </span>
                )}
                {nextModuleState === "ready" && (
                  <span className="mt-1 block text-xs text-peach/65">Ready when you are.</span>
                )}
              </p>
              <button type="button" onClick={() => onContinue(latest.topic)} className="btn-primary rounded-full px-4 py-2 text-sm font-semibold">
                {next.lesson ? "Go to the next module →" : "Start the next module →"}
              </button>
            </>
          ) : null}
        </div>
      )}

      {submission.state === "done" && !latest && (
        <p className="mt-2 text-sm text-peach/80">Search another topic to keep going.</p>
      )}
    </motion.div>
  );
}

function QuizProgress({ answered, correct, total }: { answered: number; correct: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full transition-colors duration-500 ${
              i < answered ? "bg-coffee" : "bg-beige/70"
            }`}
          />
        ))}
      </div>
      <span className="text-xs tabular-nums text-taupe">
        {answered}/{total}
        {answered > 0 && <> · {correct} right</>}
      </span>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-sand">
      {children}
    </p>
  );
}
