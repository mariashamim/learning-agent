"use client";

import type { ReactNode } from "react";
import type { ActivityType } from "@/lib/activities";

export const ACTIVITY_META: Record<ActivityType, { label: string; icon: string }> = {
  predict: { label: "Predict first", icon: "?" },
  scenario: { label: "Scenario", icon: "⚑" },
  sort: { label: "Sort it", icon: "⇄" },
  order: { label: "Put it in order", icon: "↕" },
  story: { label: "Story", icon: "❝" },
  timeline: { label: "Timeline", icon: "⟶" },
  chart: { label: "Infographic", icon: "▥" },
  simulation: { label: "Simulation", icon: "◐" },
  diagram: { label: "Interactive diagram", icon: "✳" },
  listen: { label: "Listen", icon: "♪" },
  sound: { label: "Play it", icon: "♫" },
};

/** The shared frame: type badge, title, prompt, the activity, then the insight once done. */
export function ActivityFrame({
  type,
  title,
  prompt,
  reveal,
  done,
  children,
}: {
  type: ActivityType;
  title: string;
  prompt: string;
  reveal: string;
  done: boolean;
  children: ReactNode;
}) {
  const meta = ACTIVITY_META[type];
  return (
    <section className="activity-card relative overflow-hidden rounded-3xl border border-gold/30 bg-paper p-5 sm:p-7" data-type={type} data-done={done || undefined}>
      <div className="activity-glow" aria-hidden />
      <div className="relative flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/20 text-sm text-gold" aria-hidden>
          {meta.icon}
        </span>
        <span className="text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">{meta.label}</span>
        {done && (
          <span className="activity-done ml-auto rounded-full bg-sage/15 px-2.5 py-0.5 text-[11px] font-semibold text-sage">✓ Done</span>
        )}
      </div>
      <h3 className="font-display relative mt-3 text-2xl leading-snug text-sand">{title}</h3>
      {prompt && <p className="relative mt-2 text-[15px] leading-relaxed text-sand/85">{prompt}</p>}
      <div className="relative mt-5">{children}</div>
      {done && reveal && (
        <div className="activity-reveal relative mt-5 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-gold uppercase">Key insight</p>
          <p className="mt-1 text-sm leading-relaxed text-sand">{reveal}</p>
        </div>
      )}
    </section>
  );
}

/** Deterministic shuffle (same on server and client), never returning the original order. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.length > 1 && out.every((x, i) => x === items[i])) out.push(out.shift()!);
  return out;
}
