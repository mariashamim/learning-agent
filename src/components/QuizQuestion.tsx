"use client";

import { useState } from "react";
import type { Question } from "./types";

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

export function QuizQuestion({
  question,
  index,
  onAnswer,
}: {
  question: Question;
  index: number;
  onAnswer: (chosen: string, correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === question.correctAnswer;

  function pick(o: string) {
    if (picked !== null) return;
    setPicked(o);
    onAnswer(o, o === question.correctAnswer);
  }

  return (
    <div className="rounded-3xl border border-beige/80 bg-paper p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            picked === null
              ? "bg-peach text-coffee"
              : correct
                ? "animate-badge bg-sage text-paper"
                : "animate-badge bg-red-400 text-paper"
          }`}
        >
          {picked === null ? index + 1 : correct ? "✓" : "✗"}
        </span>
        <p className="pt-0.5 text-[15.5px] leading-snug font-medium text-espresso">
          {question.question}
        </p>
      </div>

      <div className="mt-5 space-y-2 sm:pl-10">
        {question.options.map((o, oi) => {
          const isPicked = picked === o;
          const isCorrect = o === question.correctAnswer;
          const state =
            picked === null ? "idle" : isCorrect ? "correct" : isPicked ? "wrong" : "dimmed";
          return (
            <button
              key={o}
              disabled={picked !== null}
              onClick={() => pick(o)}
              data-state={state}
              data-picked={isPicked || undefined}
              className="quiz-option group/opt flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm"
            >
              <span className="quiz-letter flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold">
                {String.fromCharCode(65 + oi)}
              </span>
              <span className="flex-1">{o}</span>
              {state === "correct" && <CheckIcon />}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div
          role="status"
          className={`quiz-explain mt-4 rounded-xl border p-4 text-sm sm:ml-10 ${
            correct ? "border-sage/30 bg-sage/10" : "border-red-400/40 bg-red-50"
          }`}
        >
          <div className={`font-semibold ${correct ? "text-sage" : "text-red-700"}`}>
            {correct ? "✓ Correct" : "✗ Not quite"}
          </div>
          <p className="mt-1 leading-relaxed text-espresso/85">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
