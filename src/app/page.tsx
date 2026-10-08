"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { LogoMark, Wordmark } from "@/components/app/AppShell";
import { useAppState } from "@/components/app/AppState";
import { TopicArt } from "@/components/app/TopicArt";
import { ArrowRightIcon, ArrowUpRightIcon, SparkleIcon } from "@/components/Icons";
import { MagneticButton } from "@/components/MagneticButton";
import { SplitHeading, charCount } from "@/components/SplitHeading";
import { greeting } from "@/components/stats";
import { TopicInput } from "@/components/TopicInput";

const SUGGESTIONS = ["Stoicism", "Black holes", "Game theory", "Jazz harmony"];

// Entrance timeline (ms): headline types in, then the paragraph, then the search bar.
const HEADING = "What do you want to learn today?";
const HEADING_END = 50 + (charCount(HEADING) - 1) * 25 + 300;
const intro = (ms: number) => ({ "--intro-delay": `${ms}ms` }) as CSSProperties;
const noSubscribe = () => () => {};

export default function Home() {
  const { learn, busy, courses } = useAppState();
  const [topic, setTopic] = useState("");
  // Client-only: the server doesn't know the learner's local hour.
  const hello = useSyncExternalStore(noSubscribe, () => greeting(new Date().getHours()), () => "Welcome");

  // The one course worth surfacing here: the most recently active, unfinished one.
  const current = courses.find((c) => c.status === "active");
  const done = current ? current.modules.filter((m) => m.lesson?.completed).length : 0;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center px-4 py-14 sm:px-6 lg:min-h-screen">
      {/* Logo and title */}
      <div className="intro flex items-center gap-4" style={intro(0)}>
        <LogoMark size={64} />
        <div className="leading-tight">
          <p>
            <Wordmark className="text-4xl" />
          </p>
          <p className="text-sm text-taupe">an AI tutor with a memory</p>
        </div>
      </div>

      {/* Welcome */}
      <p className="intro mt-14 text-sm font-medium tracking-[0.2em] text-gold uppercase" style={intro(80)}>
        {hello}
      </p>
      <SplitHeading
        text={HEADING}
        italicWords={["learn"]}
        className="font-display mt-4 text-[44px] leading-[1.04] font-medium tracking-tight text-sand sm:text-6xl"
      />
      <p className="intro mt-5 max-w-xl text-base leading-relaxed text-taupe" style={intro(HEADING_END)}>
        Name any topic. Your tutor plans a short course, writes each ten-minute module, checks it
        before you see it, and remembers where you left off.
      </p>

      {/* Search bar */}
      <form
        className="intro ask-card mt-9 rounded-2xl border border-beige bg-paper/90 p-2.5"
        style={intro(HEADING_END + 120)}
        onSubmit={(e) => {
          e.preventDefault();
          learn(topic);
        }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <SparkleIcon size={18} />
          </span>
          <TopicInput value={topic} onChange={setTopic} bare />
          <MagneticButton
            type="submit"
            disabled={!!busy || !topic.trim()}
            className="inline-flex h-11 flex-shrink-0 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
          >
            Learn
            <ArrowUpRightIcon size={16} strokeWidth={2.2} className="btn-arrow" />
          </MagneticButton>
        </div>
      </form>

      <div className="intro mt-4 flex flex-wrap items-center gap-2" style={intro(HEADING_END + 200)}>
        <span className="text-xs text-taupe">Try</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTopic(s)}
            className="chip rounded-full border border-beige bg-ink/30 px-3 py-1.5 text-xs text-sand/85 hover:border-gold/60 hover:text-gold"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Pick up where you left off */}
      {current && (
        <Link
          href={`/courses/${current.id}`}
          className="intro continue-card group mt-12 flex items-center gap-4 rounded-2xl border border-beige bg-paper/70 p-4 hover:border-gold/50"
          style={intro(HEADING_END + 280)}
        >
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet to-magenta">
            <TopicArt topic={current.topic} className="h-11 w-11" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-taupe">Pick up where you left off</span>
            <span className="font-display block truncate text-lg text-sand">{current.title}</span>
            <span className="mt-1.5 flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand/15">
                <span className="block h-full rounded-full bg-gold" style={{ width: `${(done / current.modules.length) * 100}%` }} />
              </span>
              <span className="text-xs text-taupe tabular-nums">
                {done}/{current.modules.length}
              </span>
            </span>
          </span>
          <ArrowRightIcon size={18} className="text-gold transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </main>
  );
}
