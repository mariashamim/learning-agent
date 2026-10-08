"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { useAppState } from "@/components/app/AppState";
import { Garden } from "@/components/app/Garden";
import { ClockIcon, FlameIcon, StarIcon } from "@/components/Icons";
import { learningStats } from "@/components/stats";
import type { Course } from "@/components/types";

const noSubscribe = () => () => {};
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default function ProgressPage() {
  const { courses, loaded } = useAppState();
  const stats = learningStats(courses);
  const coursesDone = courses.filter((c) => c.status === "completed").length;
  const minutes = courses.reduce(
    (n, c) => n + c.modules.reduce((m, mod) => m + (mod.lesson?.completed ? mod.lesson.data.estimatedMinutes : 0), 0),
    0
  );

  return (
    <main className="mx-auto max-w-5xl px-4 pt-10 pb-24 sm:px-6 lg:px-10">
      <p className="text-xs font-medium tracking-[0.25em] text-gold uppercase">Progress</p>
      <h1 className="font-display mt-2 text-5xl text-sand sm:text-6xl">Your knowledge garden</h1>
      <p className="mt-3 max-w-xl text-taupe">Every course is a plant. Finish modules to help it grow, and a finished course blooms.</p>

      <section className="mt-10">
        <Garden courses={courses} />
      </section>

      {/* Bars */}
      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <ProgressBar label="Modules completed" value={stats.doneModules} total={stats.totalModules} loading={!loaded} />
        <ProgressBar label="Courses completed" value={coursesDone} total={courses.length} loading={!loaded} />
      </section>

      {/* Stat tiles */}
      <section className="mt-5 grid gap-5 sm:grid-cols-3">
        <StatTile icon={<FlameIcon size={22} />} value={stats.streak ? `${stats.streak} day${stats.streak === 1 ? "" : "s"}` : "—"} label={stats.streak ? "learning streak" : "Start your streak today"} />
        <StatTile icon={<StarIcon size={22} />} value={stats.accuracy === null ? "—" : `${stats.accuracy}%`} label="first-try quiz accuracy" />
        <StatTile icon={<ClockIcon size={22} />} value={`${minutes} min`} label="spent learning" />
      </section>

      <WeekStrip courses={courses} />
      <Milestones courses={courses} streak={stats.streak} />
    </main>
  );
}

function ProgressBar({ label, value, total, loading }: { label: string; value: number; total: number; loading: boolean }) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-beige bg-paper p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-sand">{label}</p>
        <p className="font-display text-2xl text-gold tabular-nums">{loading ? "…" : `${value} / ${total}`}</p>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-sand/10">
        <div className="progress-fill h-full rounded-full bg-gradient-to-r from-violet via-magenta to-gold" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-right text-xs text-taupe tabular-nums">{percent}%</p>
    </div>
  );
}

function StatTile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-beige bg-paper p-5">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/15 text-gold">{icon}</span>
      <span>
        <span className="font-display block text-2xl text-sand">{value}</span>
        <span className="block text-xs text-taupe">{label}</span>
      </span>
    </div>
  );
}

/** The last seven days: a filled dot for each day with a finished module. */
function WeekStrip({ courses }: { courses: Course[] }) {
  // Browser-only: "today" is the learner's local day.
  const today = useSyncExternalStore(noSubscribe, () => dayKey(new Date()), () => "");
  if (!today) return null;
  const active = new Set(
    courses.flatMap((c) => c.modules.flatMap((m) => (m.lesson?.completedAt ? [dayKey(new Date(m.lesson.completedAt))] : [])))
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: "short" }) };
  });
  return (
    <section className="mt-10 rounded-2xl border border-beige bg-paper p-6">
      <p className="text-sm font-medium text-sand">Your week</p>
      <div className="mt-4 flex justify-between gap-2">
        {days.map((d) => {
          const on = active.has(d.key);
          return (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
              <span className={`week-dot flex h-10 w-10 items-center justify-center rounded-full ${on ? "bg-gold text-ink" : "border border-beige text-taupe"}`}>
                {on ? "✓" : ""}
              </span>
              <span className={`text-xs ${d.key === today ? "font-semibold text-gold" : "text-taupe"}`}>{d.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Badges unlocked by real progress. */
function Milestones({ courses, streak }: { courses: Course[]; streak: number }) {
  const done = courses.flatMap((c) => c.modules.filter((m) => m.lesson?.completed));
  const perfect = done.some((m) => m.lesson?.quiz && m.lesson.quiz.correct === m.lesson.quiz.total);
  const list = [
    { icon: "🌱", title: "First sprout", text: "Finish your first module", on: done.length >= 1 },
    { icon: "🎯", title: "Sharp shooter", text: "Ace a quiz first try", on: perfect },
    { icon: "🔥", title: "On a roll", text: "Keep a 3-day streak", on: streak >= 3 },
    { icon: "📚", title: "Curious mind", text: "Start 3 courses", on: courses.length >= 3 },
    { icon: "🌸", title: "First bloom", text: "Finish a whole course", on: courses.some((c) => c.status === "completed") },
    { icon: "🏆", title: "Ten down", text: "Finish 10 modules", on: done.length >= 10 },
  ];
  return (
    <section className="mt-10">
      <p className="font-display text-2xl text-sand">Milestones</p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {list.map((m) => (
          <div key={m.title} className={`milestone rounded-2xl border p-5 ${m.on ? "is-on border-gold/60 bg-gold/10" : "border-beige bg-paper/60"}`}>
            <span className={`text-3xl ${m.on ? "" : "opacity-30 grayscale"}`} aria-hidden>
              {m.icon}
            </span>
            <p className={`mt-2 font-semibold ${m.on ? "text-gold" : "text-sand/70"}`}>{m.title}</p>
            <p className="text-xs text-taupe">{m.on ? "Unlocked" : m.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
