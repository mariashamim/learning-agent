"use client";

import { useEffect, useId, useState } from "react";
import { copyText } from "./copyText";
import { Toast } from "./Toast";

/** The learner's browser identity. Click copies it; hover explains it. */
export function LearnerPill({
  learnerId,
  courseCount,
  tipPlacement = "below",
  wide = false,
  compact = false,
}: {
  learnerId: string;
  courseCount: number;
  tipPlacement?: "above" | "below";
  wide?: boolean;
  /** Avatar only (small screens). */
  compact?: boolean;
}) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const tipId = useId();
  const shortId = learnerId.replace(/^learner-/, "");

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
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-sm font-semibold text-white uppercase">
          {shortId.charAt(0) || "·"}
        </span>
        <span className={`min-w-0 leading-tight ${compact ? "sr-only" : ""}`}>
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-espresso">
            Learner
            <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden />
          </span>
          <span className="block max-w-[9.5rem] truncate font-mono text-[11px] text-taupe">
            {courseCount ? `${courseCount} course${courseCount === 1 ? "" : "s"} · ` : ""}
            {shortId}
          </span>
        </span>
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={`learner-tip pointer-events-none absolute z-30 w-max max-w-[15rem] rounded-lg bg-espresso px-3 py-1.5 text-xs text-white shadow-md ${
          tipPlacement === "above" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2"
        }`}
      >
        Your browser identity — stored locally
      </span>
      {toast && <Toast key={toast.id} message={toast.message} />}
    </div>
  );
}
