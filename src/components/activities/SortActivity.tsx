"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Activity } from "@/lib/activities";
import { ActivityFrame, seededShuffle } from "./ActivityFrame";

type SortData = Extract<Activity, { type: "sort" }>;
type Drag = { index: number; x: number; y: number; dx: number; dy: number; moved: boolean };

/**
 * Drag items into the right group. Works with mouse and touch (pointer drag),
 * and by tapping: tap an item, then tap a group.
 */
export function SortActivity({ a, onDone }: { a: SortData; onDone: () => void }) {
  const [order] = useState(() => seededShuffle(a.items.map((_, i) => i), a.title));
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const allPlaced = a.items.every((_, i) => placed[i]);
  const correct = a.items.filter((it, i) => placed[i] === it.bucket).length;
  const solved = checked && correct === a.items.length;

  function place(index: number, bucket: string | null) {
    setChecked(false);
    setPlaced((p) => {
      const next = { ...p };
      if (bucket) next[index] = bucket;
      else delete next[index];
      return next;
    });
    setSelected(null);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>, index: number) {
    if (solved) return;
    const r = e.currentTarget.getBoundingClientRect();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not a capturable pointer (e.g. synthetic); dragging still works within the element */
    }
    setDrag({ index, x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false });
  }
  function onPointerMove(e: ReactPointerEvent) {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  }
  function onPointerUp(e: ReactPointerEvent, index: number) {
    if (!drag) return;
    if (drag.moved) {
      const target = document.elementsFromPoint(e.clientX, e.clientY).find((el) => (el as HTMLElement).dataset?.bucket !== undefined) as HTMLElement | undefined;
      if (target && root.current?.contains(target)) place(index, target.dataset.bucket || null);
    } else {
      setSelected((s) => (s === index ? null : index)); // a tap selects
    }
    setDrag(null);
  }

  function check() {
    setChecked(true);
    if (correct === a.items.length) onDone();
  }
  function retry() {
    // Send only the wrong ones back to the tray.
    setPlaced((p) => Object.fromEntries(Object.entries(p).filter(([i, b]) => a.items[Number(i)].bucket === b)));
    setChecked(false);
  }

  const chip = (index: number) => {
    const where = placed[index];
    const state = checked && where ? (a.items[index].bucket === where ? "good" : "bad") : selected === index ? "selected" : "idle";
    const dragging = drag?.index === index && drag.moved;
    return (
      <button
        key={index}
        type="button"
        onPointerDown={(e) => onPointerDown(e, index)}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => onPointerUp(e, index)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(index))}
        data-state={state}
        aria-pressed={selected === index}
        className={`sort-chip touch-none rounded-xl border px-3 py-2 text-left text-sm select-none ${dragging ? "opacity-30" : ""}`}
      >
        {a.items[index].text}
      </button>
    );
  };

  const tray = order.filter((i) => !placed[i]);

  return (
    <ActivityFrame type="sort" title={a.title} prompt={a.prompt} reveal={a.reveal} done={solved}>
      <div ref={root}>
        <p className="mb-3 text-xs text-taupe">Drag each card into a group, or tap a card and then tap a group.</p>
        <div
          data-bucket=""
          onClick={() => selected !== null && place(selected, null)}
          className="sort-tray flex min-h-[56px] flex-wrap gap-2 rounded-2xl border border-dashed border-beige p-3"
        >
          {tray.length ? tray.map(chip) : <span className="self-center text-xs text-taupe">All placed. Check your sorting.</span>}
        </div>
        <div className={`mt-3 grid gap-3 ${a.buckets.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {a.buckets.map((b) => (
            <div
              key={b}
              data-bucket={b}
              role="button"
              tabIndex={0}
              onClick={() => selected !== null && place(selected, b)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && selected !== null && place(selected, b)}
              className={`sort-bucket min-h-[120px] rounded-2xl border-2 p-3 ${selected !== null ? "border-gold/60 bg-gold/5" : "border-beige bg-well/30"}`}
            >
              <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-gold uppercase">{b}</p>
              <div className="flex flex-wrap gap-2">{order.filter((i) => placed[i] === b).map(chip)}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!solved && (
            <button type="button" disabled={!allPlaced} onClick={check} className="btn-primary rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-40">
              Check
            </button>
          )}
          {checked && !solved && (
            <>
              <span className="text-sm text-sand">
                {correct} of {a.items.length} right.
              </span>
              <button type="button" onClick={retry} className="text-sm text-gold underline">
                Send the wrong ones back
              </button>
            </>
          )}
          {solved && <span className="text-sm font-semibold text-sage">All sorted correctly!</span>}
        </div>
      </div>
      {drag?.moved && (
        <div
          className="sort-ghost pointer-events-none fixed z-50 rounded-xl border border-gold bg-paper px-3 py-2 text-sm text-sand shadow-2xl"
          style={{ left: drag.x - drag.dx, top: drag.y - drag.dy }}
        >
          {a.items[drag.index].text}
        </div>
      )}
    </ActivityFrame>
  );
}
