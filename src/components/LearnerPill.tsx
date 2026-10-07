"use client";

import { useEffect, useId, useState } from "react";
import { copyText } from "./copyText";
import { Toast } from "./Toast";

/**
 * The learner's browser identity, shown as "Learner · N lessons saved". The
 * raw ID only appears in the tooltip; clicking copies it.
 */
export function LearnerPill({
  learnerId,
  lessonCount,
  tipPlacement = "below",
  wide = false,
  compact = false,
}: {
  learnerId: string;
  lessonCount: number;
  tipPlacement?: "above" | "below";
  wide?: boolean;
  /** Avatar only (small screens). */
  compact?: boolean;
}) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const tipId = useId();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  async function copy() {
    const ok = await copyText(learnerId);
    setToast({ id: Date.now(), message: ok ? "Learner ID copied" : "Couldn’t copy" });
  }

  if (!learnerId) return null;

  return (
    <div className={`group/pill relative ${wide ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={copy}
        aria-describedby={tipId}
        className={`learner-pill animate-fade-in flex items-center gap-3 rounded-2xl border border-beige bg-paper py-1.5 text-left shadow-sm hover:border-coffee/40 ${
          compact ? "px-1.5" : "pr-3 pl-1.5 hover:pr-4 hover:pl-2"
        } ${
          wide ? "w-full" : ""
        }`}
      >
        <span className="font-display flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-peach text-base text-coffee italic">
          L
        </span>
        <span className={`min-w-0 leading-tight ${compact ? "sr-only" : ""}`}>
          <span className="block text-[13px] font-semibold text-espresso">Learner</span>
          <span className="block text-xs text-taupe">
            {lessonCount ? `${lessonCount} lesson${lessonCount === 1 ? "" : "s"} saved` : "No lessons saved yet"}
          </span>
        </span>
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={`learner-tip pointer-events-none absolute z-30 w-max max-w-[15rem] rounded-lg bg-espresso px-3 py-1.5 text-xs text-paper shadow-md ${
          tipPlacement === "above" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2"
        }`}
      >
        Your browser identity, stored locally. Click to copy.
        <span className="mt-1 block font-mono text-[10px] break-all text-peach/80">{learnerId}</span>
      </span>
      {toast && <Toast key={toast.id} message={toast.message} />}
    </div>
  );
}
