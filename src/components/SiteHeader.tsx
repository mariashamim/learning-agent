"use client";

import { useEffect, useState } from "react";
import { copyText } from "./copyText";
import { Toast } from "./Toast";

export function SiteHeader({ learnerId, lessonCount }: { learnerId: string; lessonCount: number }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const shortId = learnerId.replace(/^learner-/, "");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  async function copy() {
    const ok = await copyText(learnerId);
    setToast({ id: Date.now(), message: ok ? "Copied" : "Couldn’t copy" });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-beige/50 bg-cream/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="#" className="group flex items-center gap-3">
          <span className="font-display flex h-9 w-9 items-center justify-center rounded-[10px] bg-espresso text-lg text-peach italic shadow-sm transition-transform duration-300 group-hover:-rotate-6">
            L
          </span>
          <span className="leading-tight">
            <span className="font-display block text-[17px] font-medium text-espresso">
              Learning Agent
            </span>
            <span className="hidden text-[11px] tracking-wide text-taupe sm:block">
              a tutor with a memory
            </span>
          </span>
        </a>

        {learnerId && (
          <div className="group/pill relative">
            <button
              type="button"
              onClick={copy}
              aria-describedby="learner-tip"
              className="learner-pill animate-fade-in flex items-center gap-2.5 rounded-full border border-beige bg-paper/80 py-1 pr-3 pl-1 text-left hover:border-taupe hover:bg-paper hover:pr-4 hover:pl-2"
            >
              <span className="font-display flex h-7 w-7 items-center justify-center rounded-full bg-peach text-sm text-coffee uppercase">
                {shortId.charAt(0) || "·"}
              </span>
              <span className="leading-tight">
                <span className="block text-[10px] uppercase tracking-[0.14em] text-taupe">
                  {lessonCount ? `${lessonCount} lesson${lessonCount === 1 ? "" : "s"}` : "Learner"}
                </span>
                <span className="block max-w-[9rem] truncate font-mono text-xs text-coffee">
                  {shortId}
                </span>
              </span>
            </button>
            <span
              id="learner-tip"
              role="tooltip"
              className="learner-tip pointer-events-none absolute top-full right-0 mt-2 w-max max-w-[15rem] rounded-lg bg-espresso px-3 py-1.5 text-xs text-peach shadow-md"
            >
              Your browser identity — stored locally
            </span>
          </div>
        )}
      </div>
      {toast && <Toast key={toast.id} message={toast.message} />}
    </header>
  );
}
