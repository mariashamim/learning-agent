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

// Each tile gets a faint tint from the palette; all share the light card,
// dusty-pink border and plum text, with a dusty-pink accent on hover.
export const STARTERS = [
  { topic: "Philosophy", blurb: "Big questions, sharper thinking.", Icon: BrainIcon, tint: "bg-peach/20" },
  { topic: "Game Theory", blurb: "Strategy, incentives and choices.", Icon: ChessIcon, tint: "bg-amber/[0.07]" },
  { topic: "Stoicism", blurb: "Calm in a chaotic world.", Icon: ScaleIcon, tint: "bg-beige/20" },
  { topic: "Photosynthesis", blurb: "How plants turn light into food.", Icon: LeafIcon, tint: "bg-peach/10" },
  { topic: "Black holes", blurb: "Where gravity wins.", Icon: OrbitIcon, tint: "bg-coffee/[0.04]" },
];

export const matchStarters = (q: string) =>
  STARTERS.filter((s) => !q || `${s.topic} ${s.blurb}`.toLowerCase().includes(q));

/** One-click course starters (same as typing the topic and pressing Learn). */
export function StartCards({
  onStart,
  disabled,
  query,
}: {
  onStart: (topic: string) => void;
  disabled: boolean;
  /** Lower-cased search text; filters the tiles. */
  query: string;
}) {
  const tiles = matchStarters(query);
  if (tiles.length === 0) {
    return <p className="rounded-2xl border border-dashed border-beige p-4 text-sm text-taupe">No starter topics match your search.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {tiles.map(({ topic, blurb, Icon, tint }) => (
        <button
          key={topic}
          type="button"
          disabled={disabled}
          onClick={() => onStart(topic)}
          className={`start-card group flex flex-col rounded-2xl border border-beige bg-paper p-4 text-left text-coffee disabled:cursor-wait disabled:opacity-60 ${tint}`}
        >
          <span className="start-icon flex h-10 w-10 items-center justify-center rounded-xl border border-beige/70 bg-paper">
            <Icon size={20} />
          </span>
          <span className="font-display mt-4 text-[17px] font-medium text-espresso">{topic}</span>
          <span className="mt-1 flex-1 text-xs leading-relaxed text-taupe">{blurb}</span>
          <span className="mt-3 flex h-7 w-7 items-center justify-center rounded-full border border-beige/70 bg-paper transition-transform duration-200 group-hover:translate-x-1">
            <ArrowRightIcon size={14} />
          </span>
        </button>
      ))}
    </div>
  );
}

// ---------- Right rail ----------
// Every rail card shares one style (Card) so they read as a set.

const noSubscribe = () => () => {};

function Card({
  id,
  title,
  icon,
  aside,
  accent = false,
  children,
}: {
  id?: string;
  title: string;
  icon: ReactNode;
  aside?: ReactNode;
  /** Peach left border, for the card that asks for action. */
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`rail-card scroll-mt-24 rounded-2xl border border-beige bg-paper p-5 ${
        accent ? "border-l-4 border-l-peach" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-sm font-semibold text-espresso">
          <span className="text-coffee">{icon}</span>
          {title}
        </h3>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Today's finished modules, then the next module of each active course. Hidden when empty. */
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

  if (doneToday.length + upcoming.length === 0) return null;

  return (
    <Card accent title="Up next" icon={<CalendarIcon size={18} />} aside={<span className="text-xs text-taupe">{today}</span>}>
      <ol className="timeline relative space-y-1">
        {doneToday.map(({ course, moduleIndex }) => (
          <li key={`done-${course.id}-${moduleIndex}`} className="flex items-start gap-3 rounded-xl p-2">
            <span className="relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-coffee text-paper">
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
    </Card>
  );
}

/**
 * Real progress from the database: finished course modules out of all modules
 * in the learner's courses, plus streak and first-try quiz accuracy.
 */
export function ProgressCard({
  stats,
  courseCount,
}: {
  stats: ReturnType<typeof learningStats>;
  courseCount: number;
}) {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  return (
    <Card id="progress" title="Your progress" icon={<ChartIcon size={18} />}>
      <div className="flex items-center gap-5">
        <div className="relative h-[88px] w-[88px] flex-shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="40" cy="40" r={r} fill="none" stroke="var(--peach)" strokeWidth="8" />
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="var(--coffee)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - stats.percent / 100)}
              className="progress-ring"
            />
          </svg>
          <span className="font-display absolute inset-0 flex items-center justify-center text-xl font-semibold text-coffee">
            {stats.percent}%
          </span>
        </div>
        <div>
          {courseCount ? (
            <>
              <p className="text-sm font-semibold text-espresso">
                {stats.doneModules} of {stats.totalModules} modules done
              </p>
              <p className="mt-0.5 text-xs text-taupe">
                across {courseCount} course{courseCount === 1 ? "" : "s"}
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-taupe">Start a course and your progress will show here.</p>
          )}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-beige/70 pt-4">
        {stats.streak > 0 ? (
          <Stat icon={<FlameIcon size={18} />} tone="bg-amber/15 text-amber" value={stats.streak} label="day streak" />
        ) : (
          <Stat icon={<FlameIcon size={18} />} tone="bg-amber/15 text-amber" label="Start your streak today" />
        )}
        <Stat
          icon={<StarIcon size={18} />}
          tone="bg-indigo/10 text-indigo"
          value={stats.accuracy === null ? undefined : `${stats.accuracy}%`}
          label={stats.accuracy === null ? "Quiz accuracy shows after your first quiz" : "quiz accuracy"}
        />
      </div>
    </Card>
  );
}

function Stat({ icon, tone, value, label }: { icon: ReactNode; tone: string; value?: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
      <span className="leading-tight">
        {value !== undefined && <span className="font-display block text-lg font-semibold text-espresso">{value}</span>}
        <span className={`block text-taupe ${value !== undefined ? "text-[11px]" : "text-xs"}`}>{label}</span>
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
    <section className="rail-card thinking-card animate-fade-in rounded-2xl border border-beige border-l-4 border-l-peach bg-paper p-5" aria-live="polite">
      <div className="flex items-center gap-3">
        <SparkleIcon size={18} className="thinking-sparkle text-coffee" />
        <p className="text-sm font-semibold text-coffee">Your tutor is working…</p>
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
                  ? "bg-peach/50 text-coffee"
                  : i === active
                    ? "bg-paper text-coffee ring-1 ring-coffee/30"
                    : "bg-background text-taupe"
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
                    ["bg-peach/60 text-coffee", "bg-amber/15 text-amber", "bg-indigo/10 text-indigo"][i % 3]
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
