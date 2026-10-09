"use client";

import { useState } from "react";
import type { Block } from "@/lib/lessonBlocks";
import { BlockFrame } from "./BlockFrame";
import { rich } from "./rich";

type CodeData = Extract<Block, { kind: "code" }>;

const MODE = {
  predict: { icon: "▷", label: "Predict the output" },
  bug: { icon: "✎", label: "Find the fix" },
  trace: { icon: "⇣", label: "Step through it" },
} as const;

// Light, dependency-free tinting: strings, comments, numbers, common keywords.
const TOKEN = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|#.*$|\/\/.*$|\b\d+(?:\.\d+)?\b|\b(?:def|return|for|while|in|if|elif|else|and|or|not|print|range|len|import|from|class|function|const|let|var|true|false|True|False|None|null|break|continue|lambda|with|as|try|except|catch)\b)/;

function tint(line: string) {
  return line.split(TOKEN).map((part, i) => {
    if (i % 2 === 0 || !part) return part;
    const kind = /^["']/.test(part) ? "str" : /^(#|\/\/)/.test(part) ? "com" : /^\d/.test(part) ? "num" : "kw";
    return (
      <span key={i} className={`tok-${kind}`}>
        {part}
      </span>
    );
  });
}

function CodeWindow({ code, language, active }: { code: string; language: string; active?: number }) {
  const lines = code.split("\n");
  return (
    <div className="code-window" role="figure" aria-label={`${language} code, ${lines.length} lines`}>
      <div className="code-bar" aria-hidden>
        <span />
        <span />
        <span />
        <em>{language}</em>
      </div>
      <pre className="font-mono">
        {lines.map((l, i) => (
          <div key={i} className="code-line" data-active={active === i + 1 || undefined} aria-current={active === i + 1 ? "step" : undefined}>
            <span className="code-no" aria-hidden>
              {i + 1}
            </span>
            <code>{l ? tint(l) : " "}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}

/** Real code to read: predict its output, pick the fix for its bug, or step through it line by line. */
export function CodeBlock({ b, onDone }: { b: CodeData; onDone: () => void }) {
  return b.mode === "trace" ? <TraceCode b={b} onDone={onDone} /> : <ChoiceCode b={b} onDone={onDone} />;
}

function ChoiceCode({ b, onDone }: { b: CodeData; onDone: () => void }) {
  // Practice, not graded: a wrong pick explains itself and the learner tries again.
  const [tried, setTried] = useState<number[]>([]);
  const [hints, setHints] = useState(0);
  const solved = tried.some((i) => b.options[i].correct);
  const last = tried[tried.length - 1];

  function pick(i: number) {
    if (solved || tried.includes(i)) return;
    setTried((t) => [...t, i]);
    if (b.options[i].correct) onDone();
  }

  return (
    <BlockFrame
      kind="code"
      icon={MODE[b.mode].icon}
      label={MODE[b.mode].label}
      title={b.heading}
      prompt={b.prompt}
      done={solved}
      takeaway={b.explanation ? rich(b.explanation) : undefined}
      takeawayLabel="Why"
    >
      <CodeWindow code={b.code} language={b.language} />
      <div className="mt-4 grid gap-2.5">
        {b.options.map((o, i) => {
          const chosen = tried.includes(i);
          const state = chosen ? (o.correct ? "good" : "bad") : "idle";
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={solved || chosen}
              data-state={state}
              className={`choice-option rounded-2xl border px-4 py-3 text-left text-sm leading-snug ${b.mode === "predict" ? "font-mono whitespace-pre-wrap" : ""}`}
            >
              <span className="mr-2 font-sans font-semibold text-gold">{String.fromCharCode(65 + i)}</span>
              {o.text}
              {chosen && <span className="ml-1 font-sans">{o.correct ? " ✓" : " ✗"}</span>}
            </button>
          );
        })}
      </div>
      {last !== undefined && (
        <div key={last} role="status" className="activity-feedback mt-4 rounded-2xl border border-beige bg-ink/40 p-4">
          <p className={`text-xs font-semibold tracking-[0.14em] uppercase ${b.options[last].correct ? "text-sage" : "text-red-300"}`}>
            {b.options[last].correct ? (tried.length === 1 ? "Exactly right" : "Got it") : "Not this one"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-sand/90">{rich(b.options[last].feedback)}</p>
          {!b.options[last].correct && <p className="mt-2 text-xs text-taupe">Read the code again and try another answer.</p>}
        </div>
      )}
      {!solved && b.hints.length > 0 && (
        <div className="mt-4 space-y-2">
          {b.hints.slice(0, hints).map((h, i) => (
            <p key={i} className="hint-reveal rounded-xl border border-gold/25 bg-gold/10 px-4 py-2.5 text-sm text-sand">
              <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-gold uppercase">Hint {i + 1}</span>
              {rich(h)}
            </p>
          ))}
          {hints < b.hints.length && (
            <button type="button" onClick={() => setHints((n) => n + 1)} className="rounded-full border border-gold/40 px-3 py-1 text-xs font-medium text-gold hover:bg-gold/10">
              {hints === 0 ? "Need a hint?" : "Another hint"}
            </button>
          )}
        </div>
      )}
    </BlockFrame>
  );
}

function TraceCode({ b, onDone }: { b: CodeData; onDone: () => void }) {
  // -1 = not started; otherwise the index of the step being shown.
  const [step, setStep] = useState(-1);
  const [finished, setFinished] = useState(false);
  const current = step >= 0 ? b.trace[step] : null;

  function go(next: number) {
    const clamped = Math.max(-1, Math.min(b.trace.length - 1, next));
    setStep(clamped);
    if (clamped === b.trace.length - 1 && !finished) {
      setFinished(true);
      onDone();
    }
  }

  return (
    <BlockFrame
      kind="code"
      icon={MODE.trace.icon}
      label={MODE.trace.label}
      title={b.heading}
      prompt={b.prompt}
      done={finished}
      takeaway={b.explanation ? rich(b.explanation) : undefined}
      takeawayLabel="What happened"
    >
      <CodeWindow code={b.code} language={b.language} active={current?.line} />
      <div className="trace-panel mt-4 rounded-2xl border border-beige bg-ink/40 p-4" aria-live="polite">
        {current ? (
          <>
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">
              Step {step + 1} of {b.trace.length} · line {current.line}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-sand">{rich(current.note)}</p>
            {current.state && (
              <div className="mt-3 flex flex-wrap gap-2">
                {current.state.split(/,\s*(?![^()[\]{}]*[)\]}])/).map((v, i) => (
                  <span key={i} className="font-mono rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs text-sand">
                    {v.trim()}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-taupe">Before you start: what do you expect each variable to be at the end? Then step through and check.</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => go(step - 1)} disabled={step < 0} className="rounded-full border border-beige px-4 py-2 text-sm text-sand hover:border-gold/60 disabled:opacity-40">
          ◀ Back
        </button>
        <button type="button" onClick={() => go(step + 1)} disabled={step === b.trace.length - 1} className="btn-primary rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40">
          {step < 0 ? "Run line by line ▶" : "Next step ▶"}
        </button>
        {step >= 0 && (
          <button type="button" onClick={() => setStep(-1)} className="ml-auto text-xs text-taupe underline-offset-2 hover:text-gold hover:underline">
            Restart
          </button>
        )}
      </div>
    </BlockFrame>
  );
}
