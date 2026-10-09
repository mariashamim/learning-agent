"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { CountUp } from "../motion/primitives";
import { spring } from "../motion/presets";
import type { Activity } from "@/lib/activities";
import { ActivityFrame } from "./ActivityFrame";

type ChartData = Extract<Activity, { type: "chart" }>;

const fmt = (n: number) => (Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(Math.round(n * 100) / 100));

/** Infographic: guess which bar is biggest, then watch the data reveal itself. */
export function ChartActivity({ a, onDone }: { a: ChartData; onDone: () => void }) {
  const [guess, setGuess] = useState<number | null>(null);
  const max = Math.max(...a.bars.map((b) => b.value));
  const top = a.bars.findIndex((b) => b.value === max);
  const revealed = guess !== null;

  return (
    <ActivityFrame type="chart" title={a.title} prompt={a.prompt} reveal={a.reveal} done={revealed}>
      {!revealed && <p className="mb-3 text-xs text-taupe">First, guess: which one is the biggest? Tap it.</p>}
      <div className="space-y-3">
        {a.bars.map((b, i) => {
          const share = revealed ? Math.max(0.02, b.value / max) : 0;
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => {
                setGuess(i);
                onDone();
              }}
              className={`chart-row block w-full rounded-xl p-2 text-left ${!revealed ? "hover:bg-gold/10" : ""} ${guess === i ? "ring-1 ring-gold/60" : ""}`}
            >
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-sand">
                  {b.label}
                  {revealed && i === top && <span className="ml-2 text-xs text-gold">★ biggest</span>}
                </span>
                <span className="font-display text-gold tabular-nums">
                  {revealed ? (
                    <>
                      <CountUp value={b.value} active={revealed} format={fmt} />
                      {a.unit ? ` ${a.unit}` : ""}
                    </>
                  ) : (
                    "?"
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-sand/10">
                <motion.div
                  className="h-full origin-left rounded-full bg-gradient-to-r from-violet via-magenta to-gold"
                  initial={false}
                  animate={{ scaleX: share }}
                  transition={{ ...spring.gentle, delay: revealed ? i * 0.12 : 0 }}
                />
              </div>
              {revealed && b.note && <p className="mt-1 text-xs text-taupe">{b.note}</p>}
            </button>
          );
        })}
      </div>
      {revealed && (
        <p className={`mt-4 text-sm font-semibold ${guess === top ? "text-sage" : "text-sand"}`}>
          {guess === top ? "You called it." : `Surprise: it's ${a.bars[top].label}.`}
        </p>
      )}
    </ActivityFrame>
  );
}
