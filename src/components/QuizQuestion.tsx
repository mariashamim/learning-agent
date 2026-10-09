"use client";

import { useState } from "react";
import type { Question } from "./types";
import { rich } from "./lesson/rich";

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 flex-shrink-0" fill="none" aria-hidden>
      <path
        d="M3 8.5l3.2 3.2L13 4.8"
        pathLength={1}
        className="check-draw"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * One graded question. The first choice is the answer (the server grades it),
 * so hints come before answering, one at a time, and a wrong answer gets both
 * the explanation and, when the lesson has one, a different way to see it.
 */
export function QuizQuestion({
  question,
  index,
  label,
  hints = [],
  retry = "",
  onAnswer,
}: {
  question: Question;
  index: number;
  /** e.g. "Check 2 of 3"; shown above the question when set. */
  label?: string;
  hints?: string[];
  /** An alternative explanation for a learner who got it wrong. */
  retry?: string;
  onAnswer: (chosen: string, correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const correct = picked === question.correctAnswer;

  function pick(o: string) {
    if (picked !== null) return;
    setPicked(o);
    onAnswer(o, o === question.correctAnswer);
  }

  return (
    <div className="rounded-3xl border border-beige/80 bg-paper p-5 sm:p-7">
      {label && <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">{label}</p>}
      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            picked === null
              ? "bg-gold/20 text-gold"
              : correct
                ? "animate-badge bg-sage text-ink"
                : "animate-badge bg-red-400 text-ink"
          }`}
        >
          {picked === null ? index + 1 : correct ? "✓" : "✗"}
        </span>
        <p className="pt-0.5 text-[15.5px] leading-snug font-medium text-espresso">
          {rich(question.question)}
        </p>
      </div>

      {picked === null && hints.length > 0 && (
        <div className="mt-4 space-y-2 sm:pl-10">
          {hints.slice(0, hintsShown).map((h, i) => (
            <p key={i} className="hint-reveal rounded-xl border border-gold/25 bg-gold/10 px-4 py-2.5 text-sm leading-relaxed text-sand">
              <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-gold uppercase">Hint {i + 1}</span>
              {rich(h)}
            </p>
          ))}
          {hintsShown < hints.length && (
            <button
              type="button"
              onClick={() => setHintsShown((n) => n + 1)}
              className="rounded-full border border-gold/40 px-3 py-1 text-xs font-medium text-gold hover:bg-gold/10"
            >
              {hintsShown === 0 ? "Need a hint?" : "Another hint"}
            </button>
          )}
        </div>
      )}

      <div className="mt-5 space-y-2 sm:pl-10">
        {question.options.map((o, oi) => {
          const isPicked = picked === o;
          const isCorrect = o === question.correctAnswer;
          const state =
            picked === null ? "idle" : isCorrect ? "correct" : isPicked ? "wrong" : "dimmed";
          return (
            <button
              key={o}
              type="button"
              disabled={picked !== null}
              onClick={() => pick(o)}
              data-state={state}
              data-picked={isPicked || undefined}
              className="quiz-option group/opt flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm"
            >
              <span className="quiz-letter flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold">
                {String.fromCharCode(65 + oi)}
              </span>
              <span className="flex-1">{rich(o)}</span>
              {state === "correct" && <CheckIcon />}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div
          role="status"
          className={`quiz-explain mt-4 rounded-xl border p-4 text-sm sm:ml-10 ${
            correct ? "border-sage/30 bg-sage/10" : "border-red-400/40 bg-red-500/10"
          }`}
        >
          <div className={`font-semibold ${correct ? "text-sage" : "text-red-300"}`}>
            {correct ? (hintsShown > 0 ? "✓ Correct, with a hint" : "✓ Correct") : "✗ Not quite"}
          </div>
          <p className="mt-1 leading-relaxed text-espresso/85">{rich(question.explanation)}</p>
          {!correct && retry && (
            <div className="mt-3 border-t border-red-400/20 pt-3">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-gold uppercase">Another way to see it</p>
              <p className="mt-1 leading-relaxed text-espresso/90">{rich(retry)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
