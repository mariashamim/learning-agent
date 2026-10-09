"use client";

import type { ReactNode } from "react";
import { rich } from "./rich";

/** The frame for hands-on blocks: label, title, prompt, then the block, then the takeaway once done. */
export function BlockFrame({
  icon,
  label,
  title,
  prompt,
  done,
  takeaway,
  takeawayLabel = "Key insight",
  kind,
  children,
}: {
  icon: string;
  label: string;
  title: string;
  prompt?: string;
  done: boolean;
  takeaway?: ReactNode;
  takeawayLabel?: string;
  kind: string;
  children: ReactNode;
}) {
  return (
    <section className="activity-card relative overflow-hidden rounded-3xl border border-gold/30 bg-paper p-5 sm:p-7" data-type={kind} data-done={done || undefined}>
      <div className="activity-glow" aria-hidden />
      <div className="relative flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/20 text-sm text-gold" aria-hidden>
          {icon}
        </span>
        <span className="text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">{label}</span>
        {done && (
          <span className="activity-done ml-auto rounded-full bg-sage/15 px-2.5 py-0.5 text-[11px] font-semibold text-sage">✓ Done</span>
        )}
      </div>
      {title && <h3 className="font-display relative mt-3 text-2xl leading-snug text-sand">{title}</h3>}
      {prompt && <p className="relative mt-2 text-[15px] leading-relaxed whitespace-pre-line text-sand/85">{rich(prompt)}</p>}
      <div className="relative mt-5">{children}</div>
      {done && takeaway && (
        <div className="activity-reveal relative mt-5 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-gold uppercase">{takeawayLabel}</p>
          <div className="mt-1 text-sm leading-relaxed whitespace-pre-line text-sand">{takeaway}</div>
        </div>
      )}
    </section>
  );
}

/** Splits text on blank lines into paragraphs. */
export function Paragraphs({ text, className = "" }: { text: string; className?: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className={`${i > 0 ? "mt-3" : ""} ${className}`}>
            {rich(p)}
          </p>
        ))}
    </>
  );
}
