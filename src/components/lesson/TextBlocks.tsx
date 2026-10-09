"use client";

import type { Block } from "@/lib/lessonBlocks";
import { Paragraphs } from "./BlockFrame";
import { rich } from "./rich";

type Of<K extends Block["kind"]> = Extract<Block, { kind: K }>;

export function ExplainBlock({ b }: { b: Of<"explain"> }) {
  return (
    <section className="concept-card rounded-3xl border border-beige/80 bg-paper p-6 sm:p-8">
      {b.heading && <h3 className="font-display text-xl font-medium text-espresso sm:text-2xl">{b.heading}</h3>}
      <div className={`text-[15.5px] leading-[1.75] text-espresso/90 ${b.heading ? "mt-3" : ""}`}>
        <Paragraphs text={b.body} />
      </div>
      {b.example && (
        <div className="mt-5 rounded-2xl border-l-[3px] border-gold/70 bg-gold/10 px-5 py-4 text-[15px] leading-relaxed">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-coffee">For example</span>
          <span className="font-display text-espresso italic">{rich(b.example)}</span>
        </div>
      )}
    </section>
  );
}

/** Two things side by side. A table on wide screens; paired cards on phones. */
export function CompareBlock({ b }: { b: Of<"compare"> }) {
  const [left, right] = b.columns;
  return (
    <section className="rounded-3xl border border-beige/80 bg-paper p-6 sm:p-8">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">Compare</p>
      {b.heading && <h3 className="font-display mt-2 text-xl font-medium text-espresso sm:text-2xl">{b.heading}</h3>}
      {b.intro && <p className="mt-2 text-[15px] leading-relaxed text-espresso/85">{rich(b.intro)}</p>}
      <div className="compare-grid mt-5" role="table" aria-label={b.heading || `${left} compared with ${right}`}>
        <div className="compare-head" role="row">
          <span role="columnheader" />
          <span role="columnheader" className="compare-col-a">{left}</span>
          <span role="columnheader" className="compare-col-b">{right}</span>
        </div>
        {b.rows.map((r, i) => (
          <div key={i} className="compare-row" role="row">
            <span role="rowheader" className="compare-label">{r.label}</span>
            <span role="cell" className="compare-cell" data-col={left}>{rich(r.a)}</span>
            <span role="cell" className="compare-cell" data-col={right}>{rich(r.b)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SummaryBlock({ b }: { b: Of<"summary"> }) {
  return (
    <section className="rounded-3xl border border-sage/30 bg-sage/[0.07] p-6 sm:p-8">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-sage uppercase">{b.heading || "What to take away"}</p>
      <ul className="mt-3 space-y-2.5">
        {b.points.map((p, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-espresso">
            <span aria-hidden className="mt-0.5 text-sage">✓</span>
            <span>{rich(p)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
