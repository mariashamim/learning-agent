"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ArrowRightIcon,
  BrainIcon,
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  ChessIcon,
  DocIcon,
  FlameIcon,
  LeafIcon,
  LibraryIcon,
  OrbitIcon,
  ScaleIcon,
  SparkleIcon,
  StarIcon,
} from "./Icons";
import type { learningStats } from "./stats";
import type { Course, LessonRow } from "./types";

// ---------- Start something new ----------

const STARTERS = [
  { topic: "Philosophy", blurb: "Big questions, sharper thinking.", Icon: BrainIcon, tint: "from-blue/15 to-blue/5 text-blue" },
  { topic: "Game Theory", blurb: "Strategy, incentives and choices.", Icon: ChessIcon, tint: "from-violet/15 to-violet/5 text-violet" },
  { topic: "Stoicism", blurb: "Calm in a chaotic world.", Icon: ScaleIcon, tint: "from-mint/15 to-mint/5 text-mint" },
  { topic: "Photosynthesis", blurb: "How plants turn light into food.", Icon: LeafIcon, tint: "from-amber/15 to-amber/5 text-amber" },
  { topic: "Black holes", blurb: "Where gravity wins.", Icon: OrbitIcon, tint: "from-rose/15 to-rose/5 text-rose" },
];

/** One-click course starters (same as typing the topic and pressing Learn). */
export function StartCards({ onStart, disabled }: { onStart: (topic: string) => void; disabled: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {STARTERS.map(({ topic, blurb, Icon, tint }) => (
        <button
          key={topic}
          type="button"
          disabled={disabled}
          onClick={() => onStart(topic)}
          className={`start-card group flex flex-col rounded-3xl border border-beige/80 bg-gradient-to-b p-4 text-left disabled:cursor-wait disabled:opacity-60 ${tint}`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper shadow-sm">
            <Icon size={22} />
          </span>
          <span className="font-display mt-4 text-[15px] font-bold text-espresso">{topic}</span>
          <span className="mt-1 flex-1 text-xs leading-relaxed text-taupe">{blurb}</span>
          <span className="mt-3 flex h-7 w-7 items-center justify-center rounded-full bg-paper shadow-sm transition-transform duration-200 group-hover:translate-x-1">
            <ArrowRightIcon size={14} />
          </span>
        </button>
      ))}
    </div>
  );
}

// ---------- Right rail ----------

const noSubscribe = () => () => {};

function Card({
  id,
  title,
  icon,
  aside,
  children,
}: {
  id?: string;
  title: string;
  icon: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="rail-card scroll-mt-24 rounded-3xl border border-beige/80 bg-paper/90 p-5 shadow-[0_10px_30px_-18px_rgba(76,61,180,0.25)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-[15px] font-bold text-espresso">
          <span className="text-coffee">{icon}</span>
          {title}
        </h3>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Today's finished modules, then the next module of each active course. */
export function UpNextCard({
  courses,
  doneToday,
  onContinue,
  disabled,
}: {
  courses: Course[];
  doneToday: ReturnType<typeof learningStats>["doneToday"];
  onContinue: (topic: string) => void;
  disabled: boolean;
}) {
  const upcoming = courses
    .filter((c) => c.status === "active")
    .map((c) => ({ course: c, moduleIndex: c.currentModule }))
    .slice(0, 4);
  // Browser-only: the server's locale and time zone may differ from the learner's.
  const today = useSyncExternalStore(
    noSubscribe,
    () => new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    () => ""
  );

  return (
    <Card title="Up next" icon={<CalendarIcon size={18} />} aside={<span className="text-xs text-coffee">{today}</span>}>
      {doneToday.length + upcoming.length === 0 ? (
        <p className="text-sm leading-relaxed text-taupe">Start a course and your next modules will line up here.</p>
      ) : (
        <ol className="timeline relative space-y-1">
          {doneToday.map(({ course, moduleIndex }) => (
            <li key={`done-${course.id}-${moduleIndex}`} className="flex items-start gap-3 rounded-xl p-2">
              <span className="relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-coffee text-white">
                <CheckIcon size={14} strokeWidth={2.5} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-espresso/60 line-through decoration-taupe/40">
                  {course.modules[moduleIndex].title}
                </span>
                <span className="block truncate text-xs text-taupe">{course.title} · done today</span>
              </span>
            </li>
          ))}
          {upcoming.map(({ course, moduleIndex }) => (
            <li key={`next-${course.id}`}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onContinue(course.topic)}
                className="up-next-item flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-peach/40 disabled:cursor-wait"
              >
                <span className="relative z-10 h-6 w-6 flex-shrink-0 rounded-full border-2 border-beige bg-paper" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-espresso">
                    {course.modules[moduleIndex]?.title}
                  </span>
                  <span className="block truncate text-xs text-taupe">
                    {course.title} · Module {moduleIndex + 1} of {course.modules.length}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/** Modules done across all courses, streak, and first-try quiz accuracy. */
export function ProgressCard({ stats }: { stats: ReturnType<typeof learningStats> }) {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  return (
    <Card id="progress" title="Your progress" icon={<ChartIcon size={18} />}>
      <div className="flex items-center gap-5">
        <div className="relative h-[88px] w-[88px] flex-shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden>
            <defs>
              <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#4f8cff" />
              </linearGradient>
            </defs>
            <circle cx="40" cy="40" r={r} fill="none" stroke="var(--beige)" strokeWidth="8" />
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="url(#ring-grad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - stats.percent / 100)}
              className="progress-ring"
            />
          </svg>
          <span className="font-display absolute inset-0 flex items-center justify-center text-xl font-bold text-coffee">
            {stats.percent}%
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-espresso">Overall progress</p>
          <p className="mt-0.5 text-sm text-taupe">
            {stats.doneModules} / {stats.totalModules} modules
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-beige/70 pt-4">
        <Stat icon={<FlameIcon size={18} />} tone="bg-amber/15 text-amber" value={stats.streak} label="Day streak" />
        <Stat
          icon={<StarIcon size={18} />}
          tone="bg-violet/15 text-violet"
          value={stats.accuracy === null ? "—" : `${stats.accuracy}%`}
          label="Quiz accuracy"
        />
      </div>
    </Card>
  );
}

function Stat({ icon, tone, value, label }: { icon: ReactNode; tone: string; value: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
      <span className="leading-tight">
        <span className="font-display block text-lg font-bold text-espresso">{value}</span>
        <span className="block text-[11px] text-taupe">{label}</span>
      </span>
    </div>
  );
}

const THINKING_STEPS = ["Reading", "Planning", "Writing", "Checking"];

/**
 * Shown while the tutor works: either the request you're waiting on, or a
 * next module being written in the background.
 */
export function ThinkingCard({ mode, label }: { mode: "foreground" | "background"; label: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  // Background work is already past planning; foreground walks through steps.
  const active = mode === "background" ? 2 : Math.min(THINKING_STEPS.length - 1, Math.floor(elapsed / 6));

  return (
    <section className="thinking-card animate-fade-in rounded-3xl border border-coffee/20 bg-gradient-to-br from-peach/80 via-paper to-blue/10 p-5" aria-live="polite">
      <div className="flex items-center gap-3">
        <SparkleIcon size={20} className="thinking-sparkle text-coffee" />
        <p className="text-[15px] font-semibold text-coffee">AI is thinking…</p>
        <span className="thinking-wave ml-auto flex items-end gap-0.5" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </span>
      </div>
      <p className="mt-2 text-xs text-taupe">{label}</p>
      <ol className="mt-4 flex flex-wrap items-center gap-1.5">
        {THINKING_STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-300 ${
                i < active
                  ? "bg-coffee/10 text-coffee"
                  : i === active
                    ? "bg-paper text-coffee shadow-sm ring-1 ring-coffee/30"
                    : "bg-paper/60 text-taupe"
              }`}
            >
              {i < active ? "✓ " : i === active ? "• " : ""}
              {step}
            </span>
            {i < THINKING_STEPS.length - 1 && <ArrowRightIcon size={12} className="text-taupe/60" />}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Single lessons made before courses existed. */
export function LibraryCard({ lessons, onOpen }: { lessons: LessonRow[]; onOpen: (row: LessonRow) => void }) {
  return (
    <Card id="library" title="Library" icon={<LibraryIcon size={18} />} aside={<span className="text-xs text-taupe">{lessons.length} single</span>}>
      {lessons.length === 0 ? (
        <p className="text-sm leading-relaxed text-taupe">Single lessons you made before courses existed appear here.</p>
      ) : (
        <ul className="-mx-2 max-h-72 space-y-0.5 overflow-y-auto">
          {lessons.map((row, i) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onOpen(row)}
                className="library-item flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-peach/40"
              >
                <span
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                    ["bg-rose/10 text-rose", "bg-blue/10 text-blue", "bg-mint/10 text-mint"][i % 3]
                  }`}
                >
                  <DocIcon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-espresso capitalize">{row.topic}</span>
                  <span className="block text-[11px] text-taupe">
                    {new Date(row.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    {row.score != null && ` · ★ ${row.score}/10`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
