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
 * One graded question. The FIRST choice is the answer the server grades, so
 * hints come before answering, one at a time. A wrong first answer doesn't
 * give the right one away: the learner gets a different way to see the idea
 * and can try again (or ask for the answer); later tries are practice only.
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
  // Every option picked, in order; tried[0] is the graded answer.
  const [tried, setTried] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const first = tried[0] ?? null;
  const firstCorrect = first === question.correctAnswer;
  const foundIt = tried.includes(question.correctAnswer);
  const resolved = foundIt || revealed;
  const retrying = first !== null && !resolved;

  function pick(o: string) {
    if (resolved || tried.includes(o)) return;
    setTried((t) => [...t, o]);
    if (tried.length === 0) onAnswer(o, o === question.correctAnswer);
  }

  const badge = first === null ? "idle" : firstCorrect ? "right" : "wrong";

  return (
    <div className="rounded-3xl border border-beige/80 bg-paper p-5 sm:p-7">
      {label && <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">{label}</p>}
      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            badge === "idle" ? "bg-gold/20 text-gold" : badge === "right" ? "animate-badge bg-sage text-ink" : "animate-badge bg-red-400 text-ink"
          }`}
        >
          {badge === "idle" ? index + 1 : badge === "right" ? "✓" : "✗"}
        </span>
        <p className="pt-0.5 text-[15.5px] leading-snug font-medium text-espresso">
          {rich(question.question)}
        </p>
      </div>

      {!resolved && hints.length > 0 && (
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
          const wasTried = tried.includes(o);
          const isCorrect = o === question.correctAnswer;
          const state = resolved
            ? isCorrect
              ? "correct"
              : wasTried
                ? "wrong"
                : "dimmed"
            : wasTried
              ? "wrong"
              : "idle";
          return (
            <button
              key={o}
              type="button"
              disabled={resolved || wasTried}
              onClick={() => pick(o)}
              data-state={state}
              data-picked={wasTried || undefined}
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

      {retrying && (
        <div role="status" className="quiz-explain mt-4 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm sm:ml-10">
          <div className="font-semibold text-red-300">✗ Not quite{tried.length > 1 ? `, and not that one either` : ""}</div>
          {retry ? (
            <div className="mt-2">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-gold uppercase">Another way to see it</p>
              <p className="mt-1 leading-relaxed text-espresso/90">{rich(retry)}</p>
            </div>
          ) : (
            <p className="mt-1 leading-relaxed text-espresso/85">Think it through once more and pick again.</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs text-taupe">Have another go: your first answer is the one that counts.</span>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="rounded-full border border-beige px-3 py-1 text-xs font-medium text-sand/80 hover:border-gold/60 hover:text-gold"
            >
              Show the answer
            </button>
          </div>
        </div>
      )}

      {resolved && (
        <div
          role="status"
          className={`quiz-explain mt-4 rounded-xl border p-4 text-sm sm:ml-10 ${
            firstCorrect ? "border-sage/30 bg-sage/10" : "border-gold/30 bg-gold/10"
          }`}
        >
          <div className={`font-semibold ${firstCorrect ? "text-sage" : "text-gold"}`}>
            {firstCorrect
              ? hintsShown > 0
                ? "✓ Correct, with a hint"
                : "✓ Correct"
              : foundIt
                ? `✓ Got it on try ${tried.length}`
                : "Here's the answer"}
          </div>
          <p className="mt-1 leading-relaxed text-espresso/85">{rich(question.explanation)}</p>
          {!firstCorrect && <p className="mt-2 text-xs text-taupe">Your first answer is what counts toward this module.</p>}
        </div>
      )}
    </div>
  );
}
