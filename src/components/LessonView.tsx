"use client";

import { useState, type ReactNode } from "react";
import { HarnessTrace } from "./HarnessTrace";
import { QuizQuestion } from "./QuizQuestion";
import { Reveal } from "./Reveal";
import { ScoreBadge } from "./ScoreBadge";
import type { Lesson, LessonStatus, TraceStep } from "./types";

// Entrance timeline (ms): header → concepts (120ms apart) → quiz heading →
// quiz cards (80ms apart). About one second for a typical lesson.
const PASS_SCORE = 8;
const CONCEPT_START = 120;
const CONCEPT_STAGGER = 120;
const QUIZ_STAGGER = 80;
const DURATION = 400;

export function LessonView({
  lesson,
  score,
  status,
  trace,
}: {
  lesson: Lesson;
  score: number | null;
  status: LessonStatus;
  trace: TraceStep[];
}) {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const answered = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter(Boolean).length;
  const total = lesson.questions.length;
  const quizHeadingAt = CONCEPT_START + lesson.concepts.length * CONCEPT_STAGGER;

  return (
    <article id="lesson" className="mt-16 scroll-mt-24">
      <Reveal as="header" y={10} duration={DURATION} className="border-b border-beige/70 pb-8">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="uppercase tracking-[0.18em] text-taupe">
            {lesson.estimatedMinutes} minute lesson
          </span>
          <span className="h-1 w-1 rounded-full bg-beige" aria-hidden />
          <span className="uppercase tracking-[0.18em] text-taupe">
            {lesson.concepts.length} ideas · {total} questions
          </span>
          {score != null && <ScoreBadge score={score} />}
        </div>
        <h2 className="font-display mt-4 text-3xl leading-tight font-medium tracking-tight text-espresso sm:text-5xl">
          {lesson.title}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-coffee sm:text-lg">
          {lesson.objective}
        </p>
        {status.passed === false && score != null && (
          <Notice>
            This is the agent&rsquo;s best attempt: it scored {score}/10, below the {PASS_SCORE}/10
            quality bar, after revision.
          </Notice>
        )}
        {status.saved === false && (
          <Notice>
            This lesson couldn&rsquo;t be saved, so it won&rsquo;t appear in your library. You can
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
          topic again for a version with a quiz.
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
                  onAnswer={(ok) => setAnswers((a) => ({ ...a, [i]: ok }))}
                />
              </Reveal>
            ))}
          </div>
          {answered === total && (
            <div className="animate-fade-in mt-6 rounded-2xl bg-espresso px-6 py-5 text-peach">
              <p className="font-display text-lg">
                {correctCount === total
                  ? "A clean sweep. Well done."
                  : `You got ${correctCount} of ${total}. Revisit the ideas above, then try a new topic.`}
              </p>
            </div>
          )}
        </section>
      )}

      <HarnessTrace trace={trace} />
    </article>
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
