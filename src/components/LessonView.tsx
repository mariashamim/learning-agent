"use client";

import { useState, type ReactNode } from "react";
import { CoursePath } from "./CoursePath";
import { HarnessTrace } from "./HarnessTrace";
import { QuizQuestion } from "./QuizQuestion";
import { Reveal } from "./Reveal";
import { ScoreBadge } from "./ScoreBadge";
import type { Answer, Course, PrefetchState, QuizResult, View } from "./types";

// Entrance timeline (ms): header → concepts (120ms apart) → quiz heading →
// quiz cards (80ms apart). About one second for a typical lesson.
const PASS_SCORE = 8;
const CONCEPT_START = 120;
const CONCEPT_STAGGER = 120;
const QUIZ_STAGGER = 80;
const DURATION = 400;

type Submission =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "done"; result: QuizResult }
  | { state: "error"; message: string };

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
  const [answers, setAnswers] = useState<Record<number, { chosen: string; correct: boolean }>>({});
  const [submission, setSubmission] = useState<Submission>({ state: "idle" });
  const answered = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((a) => a.correct).length;
  const total = lesson.questions.length;
  const quizHeadingAt = CONCEPT_START + lesson.concepts.length * CONCEPT_STAGGER;
  const currentMod = course && moduleIndex !== null ? course.modules[moduleIndex] : null;
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

  function handleAnswer(i: number, chosen: string, correct: boolean) {
    const next = { ...answers, [i]: { chosen, correct } };
    setAnswers(next);
    if (Object.keys(next).length === total) submit(next);
  }

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
                Module {moduleIndex + 1} of {course.modules.length}
              </span>
              <span className="h-1 w-1 rounded-full bg-beige" aria-hidden />
            </>
          )}
          <span className="uppercase tracking-[0.18em] text-taupe">
            {lesson.estimatedMinutes} min · {lesson.concepts.length} ideas · {total} questions
          </span>
          {score != null && <ScoreBadge score={score} />}
        </div>
        <h2 className="font-display mt-4 text-3xl leading-tight font-medium tracking-tight text-espresso sm:text-5xl">
          {lesson.title}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-coffee sm:text-lg">
          {lesson.objective}
        </p>

        {tutorNote && (
          <div className="mt-6 flex gap-3 rounded-2xl border border-beige bg-paper px-5 py-4">
            <span className="font-display flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-espresso text-sm text-peach italic">
              T
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-taupe">Your tutor</p>
              <p className="mt-1 text-[15px] leading-relaxed text-espresso">{tutorNote}</p>
            </div>
          </div>
        )}
        {status.resumed && (
          <Notice>Picking up where you left off: you haven&rsquo;t finished this module&rsquo;s quiz yet.</Notice>
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

      <div className="mt-10 space-y-6">
        {lesson.concepts.map((c, i) => (
          <Reveal
            key={c.name}
            group="concepts"
            delay={CONCEPT_START + i * CONCEPT_STAGGER}
            stagger={CONCEPT_STAGGER}
            duration={DURATION}
          >
            <section className="concept-card rounded-3xl border border-beige/80 bg-paper p-6 sm:p-8">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-sm text-taupe tabular-nums italic">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-xl font-medium text-espresso sm:text-2xl">{c.name}</h3>
              </div>
              <p className="mt-4 text-[15.5px] leading-[1.75] text-espresso/90 sm:pl-9">
                {c.explanation}
              </p>
              <div className="mt-5 rounded-2xl border-l-[3px] border-taupe/70 bg-peach/35 px-5 py-4 text-[15px] leading-relaxed sm:ml-9">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-coffee">
                  For example
                </span>
                <span className="font-display text-espresso italic">{c.example}</span>
              </div>
            </section>
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
        <section className="mt-16">
          <Reveal delay={quizHeadingAt} duration={DURATION} className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-taupe">Practice</p>
              <h3 className="font-display mt-1 text-2xl font-medium text-espresso sm:text-3xl">
                Check your understanding
              </h3>
            </div>
            <QuizProgress answered={answered} correct={correctCount} total={total} />
          </Reveal>
          <div className="mt-6 space-y-4">
            {lesson.questions.map((q, i) => (
              <Reveal
                key={i}
                group="quiz"
                delay={quizHeadingAt + QUIZ_STAGGER * (i + 1)}
                stagger={QUIZ_STAGGER}
                duration={DURATION}
              >
                <QuizQuestion
                  index={i}
                  question={q}
                  onAnswer={(chosen, correct) => handleAnswer(i, chosen, correct)}
                />
              </Reveal>
            ))}
          </div>
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

  return (
    <div className="animate-fade-in mt-6 rounded-2xl bg-espresso px-6 py-5 text-peach">
      <p className="font-display text-lg">{scoreLine}</p>

      {submission.state === "saving" && <p className="mt-2 text-sm text-peach/70">Saving your progress…</p>}

      {submission.state === "error" && (
        <p className="mt-2 text-sm text-peach/80">
          {submission.message}{" "}
          <button type="button" onClick={onRetry} className="underline underline-offset-2 hover:text-white">
            Try again
          </button>
        </p>
      )}

      {submission.state === "done" && latest && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {finishedCourse ? (
            <>
              <p className="text-sm text-peach/85">You&rsquo;ve finished the whole course.</p>
              <button type="button" onClick={() => onContinue(latest.topic)} className="btn-on-dark">
                See your course →
              </button>
            </>
          ) : next && nextIndex !== null ? (
            <>
              <p className="text-sm text-peach/85">
                {nextIndex === moduleIndex
                  ? "This module is still open."
                  : `Up next: Module ${nextIndex + 1}, ${next.title}.`}
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
              <button type="button" onClick={() => onContinue(latest.topic)} className="btn-on-dark">
                {next.lesson ? `Go to Module ${nextIndex + 1} →` : `Start Module ${nextIndex + 1} →`}
              </button>
            </>
          ) : null}
        </div>
      )}

      {submission.state === "done" && !latest && (
        <p className="mt-2 text-sm text-peach/80">Search another topic to keep going.</p>
      )}
    </div>
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
    <p className="mt-5 rounded-xl border border-beige bg-peach/30 px-4 py-3 text-sm leading-relaxed text-coffee">
      {children}
    </p>
  );
}
