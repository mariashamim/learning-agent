"use client";

import { useId, useState } from "react";
import { checkProblem, parseNumber, type Block } from "@/lib/lessonBlocks";
import { Burst } from "../motion/primitives";
import { BlockFrame } from "./BlockFrame";
import { rich } from "./rich";

type ProblemData = Extract<Block, { kind: "problem" }>;

// After this many wrong tries the learner may look at the worked solution.
const SOLUTION_AFTER = 2;

/**
 * Work it out, type the answer, check it. Wrong answers get feedback aimed at
 * the likely mistake when the lesson anticipated it; hints come one at a
 * time; retries are unlimited. Practice only: nothing here is graded or saved.
 */
export function ProblemBlock({ b, onDone }: { b: ProblemData; onDone: () => void }) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [tries, setTries] = useState<{ input: string; feedback: string | null }[]>([]);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [hints, setHints] = useState(0);
  const finished = solved || revealed;
  const numeric = b.answers.every((a) => Number.isFinite(parseNumber(a)));
  const last = tries[tries.length - 1];

  function check() {
    const input = value.trim();
    if (!input || finished) return;
    const result = checkProblem(b, input);
    if (result.correct) {
      setSolved(true);
      onDone();
    } else {
      setTries((t) => [...t, { input, feedback: result.feedback }]);
    }
  }

  function reveal() {
    setRevealed(true);
    onDone();
  }

  return (
    <BlockFrame
      kind="problem"
      icon="✦"
      label="Work it out"
      title={b.heading}
      prompt={b.prompt}
      done={finished}
      takeaway={rich(b.solution)}
      takeawayLabel={solved ? "How it works" : "Worked solution"}
    >
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Your answer
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-beige bg-well/40 px-4 focus-within:border-gold/60">
          <input
            id={inputId}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={finished}
            inputMode={numeric ? "decimal" : "text"}
            autoComplete="off"
            placeholder="Your answer"
            className="min-w-0 flex-1 bg-transparent py-3 font-mono text-[15px] text-sand placeholder:text-taupe/60 focus:outline-none"
          />
          {b.unit && <span className="text-sm text-taupe">{b.unit}</span>}
        </div>
        <span className="relative">
          <Burst trigger={solved ? "solved" : null} />
          {!finished && (
            <button type="submit" disabled={!value.trim()} className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-40">
              Check
            </button>
          )}
        </span>
      </form>

      <div aria-live="polite">
        {solved && (
          <p className="step-reveal mt-4 text-sm font-semibold text-sage">
            ✓ Correct{tries.length > 0 ? ` after ${tries.length + 1} tries` : ""}{hints > 0 ? `, with ${hints === 1 ? "a hint" : "hints"}` : ""}.
          </p>
        )}
        {!finished && last && (
          <div key={tries.length} className="activity-feedback mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-red-300 uppercase">
              {last.input} isn&rsquo;t it{tries.length > 1 ? ` (try ${tries.length})` : ""}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-sand/90">
              {last.feedback ? rich(last.feedback) : "Check your working and try again."}
            </p>
          </div>
        )}
      </div>

      {!finished && (
        <div className="mt-4 space-y-2">
          {b.hints.slice(0, hints).map((h, i) => (
            <p key={i} className="hint-reveal rounded-xl border border-gold/25 bg-gold/10 px-4 py-2.5 text-sm text-sand">
              <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-gold uppercase">Hint {i + 1}</span>
              {rich(h)}
            </p>
          ))}
          <div className="flex flex-wrap gap-2">
            {hints < b.hints.length && (
              <button type="button" onClick={() => setHints((n) => n + 1)} className="rounded-full border border-gold/40 px-3 py-1 text-xs font-medium text-gold hover:bg-gold/10">
                {hints === 0 ? "Need a hint?" : "Another hint"}
              </button>
            )}
            {tries.length >= SOLUTION_AFTER && (
              <button type="button" onClick={reveal} className="rounded-full border border-beige px-3 py-1 text-xs font-medium text-sand/80 hover:border-gold/60 hover:text-gold">
                Show the solution
              </button>
            )}
          </div>
        </div>
      )}
    </BlockFrame>
  );
}
