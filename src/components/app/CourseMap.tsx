"use client";

import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { levelsOf, moduleLabel } from "@/lib/courseHierarchy";
import { CheckIcon } from "../Icons";
import { Burst, Expand, ProgressFill } from "../motion/primitives";
import { EASE_OUT, duration, inViewOnce, rise, spring, staggerParent } from "../motion/presets";
import type { Course, CourseLevel, CourseModule } from "../types";

// The journey map: each level is a section, its modules a winding path of
// nodes. Every state shown comes from saved progress: a node is "done" only
// if its lesson was completed, "current" only if it's the course's current
// module, otherwise locked. The gold trail only runs out of done nodes.

type NodeState = "done" | "current" | "locked";

/** Horizontal position (% of the path's width) of the k-th node in a level. */
const X = [50, 74, 50, 26];
const xAt = (k: number) => X[k % X.length];

const ROW = 76; // node row height (px)
const LINK = 58; // connector height (px)

function nodeState(course: Course, i: number): NodeState {
  if (course.modules[i].lesson?.completed) return "done";
  if (course.status === "active" && i === course.currentModule) return "current";
  return "locked";
}

export function CourseMap({ course, onStart, busy }: { course: Course; onStart: () => void; busy: boolean }) {
  const levels = levelsOf(course);
  const hasLevels = !levels.every((l) => l.legacy);
  const [selected, setSelected] = useState<number | null>(() =>
    course.status === "active" ? Math.min(course.currentModule, course.modules.length - 1) : null
  );

  return (
    <div className="space-y-6">
      {levels.map((level, n) => (
        <LevelSection
          key={level.id}
          course={course}
          level={level}
          number={n + 1}
          showHeader={hasLevels}
          labelOf={(i) => moduleLabel(levels, i)}
          selected={selected}
          onSelect={(i) => setSelected((s) => (s === i ? null : i))}
          onStart={onStart}
          busy={busy}
        />
      ))}
    </div>
  );
}

// ---------- a level ----------

const celebratedKey = (courseId: number, levelId: string) => `weavr:level-celebrated:${courseId}:${levelId}`;
const noSubscribe = () => () => {};

function LevelSection({
  course,
  level,
  number,
  showHeader,
  labelOf,
  selected,
  onSelect,
  onStart,
  busy,
}: {
  course: Course;
  level: CourseLevel;
  number: number;
  showHeader: boolean;
  labelOf: (i: number) => string;
  selected: number | null;
  onSelect: (i: number) => void;
  onStart: () => void;
  busy: boolean;
}) {
  const done = level.modules.filter((i) => course.modules[i].lesson?.completed).length;
  const finished = level.status === "done";
  const headerRef = useRef<HTMLElement>(null);
  const headerSeen = useInView(headerRef, { once: true, amount: 0.6 });
  const key = celebratedKey(course.id, level.id);
  // A finished level celebrates once per browser, the first time it's seen finished.
  const alreadyCelebrated = useSyncExternalStore(
    noSubscribe,
    () => {
      try {
        return localStorage.getItem(key) === "1";
      } catch {
        return true;
      }
    },
    () => true
  );
  const celebrate = finished && headerSeen && !alreadyCelebrated;
  useEffect(() => {
    if (!celebrate) return;
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* storage blocked: it may celebrate again, harmlessly */
    }
  }, [celebrate, key]);

  return (
    <section
      aria-labelledby={showHeader ? `level-${level.id}` : undefined}
      aria-label={showHeader ? undefined : "Your path"}
      data-level-status={level.status}
      className={showHeader ? "level-section relative overflow-hidden rounded-[2rem] border border-beige/70 px-4 pt-7 pb-4 sm:px-8" : ""}
      data-tone={number % 2 ? "violet" : "magenta"}
    >
      {showHeader && (
        <motion.header
          ref={headerRef}
          className="relative mb-6"
          variants={staggerParent(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={inViewOnce}
        >
          <motion.div variants={rise} className="flex flex-wrap items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center">
              <motion.span
                className={`level-badge flex h-11 w-11 items-center justify-center rounded-2xl font-display text-lg ${
                  finished ? "bg-gold-fill text-ink" : level.status === "current" ? "bg-gold/20 text-gold" : "bg-sand/10 text-taupe"
                }`}
                animate={celebrate ? { scale: [1, 1.18, 1], rotate: [0, -6, 0] } : undefined}
                transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.25 }}
              >
                {finished ? <CheckIcon size={20} strokeWidth={2.6} /> : number}
              </motion.span>
              <Burst trigger={celebrate ? level.id : null} />
            </span>
            <span className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
              Level {number}
              <span className="ml-2 font-normal tracking-normal text-taupe normal-case">
                {finished ? "· complete" : level.status === "current" ? "· you are here" : level.prerequisite ? `· unlocks after Level ${number - 1}` : ""}
              </span>
            </span>
          </motion.div>
          <motion.h3 variants={rise} id={`level-${level.id}`} className="font-display mt-3 text-2xl text-sand sm:text-3xl">
            {level.title}
          </motion.h3>
          {level.description && (
            <motion.p variants={rise} className="mt-2 max-w-2xl text-[15px] leading-relaxed text-sand/80">
              {level.description}
            </motion.p>
          )}
          <motion.div variants={rise} className="mt-3 max-w-md">
            {level.objective && <p className="text-sm text-taupe">You&rsquo;ll be able to: {level.objective}</p>}
            <div className="mt-3 flex items-center gap-3">
              <ProgressFill value={done / level.modules.length} className="flex-1" label={`Level ${number} progress`} />
              <span className="text-xs tabular-nums text-taupe">
                {done}/{level.modules.length}
              </span>
            </div>
          </motion.div>
        </motion.header>
      )}

      <ol className="relative mx-auto max-w-md">
        {level.modules.map((i, k) => {
          const last = k === level.modules.length - 1;
          return (
            <li key={course.modules[i].id ?? i}>
              <ModuleRow
                course={course}
                index={i}
                k={k}
                state={nodeState(course, i)}
                label={labelOf(i)}
                selected={selected === i}
                onSelect={() => onSelect(i)}
                onStart={onStart}
                busy={busy}
                prevLabel={i > 0 ? labelOf(i - 1) : null}
              />
              {!last && <Connector from={xAt(k)} to={xAt(k + 1)} reached={nodeState(course, i) === "done"} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------- the path between two nodes ----------

/**
 * One curved segment from a node to the next. The dim trail draws itself in
 * as it scrolls into view; the gold trail on top is drawn only when the
 * module it leaves from is done, i.e. the learner has really walked it.
 */
function Connector({ from, to, reached }: { from: number; to: number; reached: boolean }) {
  const reduce = useReducedMotion();
  const d = `M ${from} 0 C ${from} ${LINK * 0.55}, ${to} ${LINK * 0.45}, ${to} ${LINK}`;
  const draw = (delay: number) =>
    reduce
      ? { initial: { pathLength: 1 }, whileInView: { pathLength: 1 } }
      : {
          initial: { pathLength: 0 },
          whileInView: { pathLength: 1 },
          transition: { duration: duration.draw, ease: EASE_OUT, delay },
        };
  return (
    <svg className="block w-full" height={LINK} viewBox={`0 0 100 ${LINK}`} preserveAspectRatio="none" aria-hidden focusable="false">
      <motion.path d={d} className="map-trail" vectorEffect="non-scaling-stroke" viewport={{ once: true, margin: "0px 0px -10% 0px" }} {...draw(0)} />
      {reached && (
        <motion.path d={d} className="map-trail-done" vectorEffect="non-scaling-stroke" viewport={{ once: true, margin: "0px 0px -10% 0px" }} {...draw(0.35)} />
      )}
    </svg>
  );
}

// ---------- a module node and its details ----------

function ModuleRow({
  course,
  index,
  k,
  state,
  label,
  selected,
  onSelect,
  onStart,
  busy,
  prevLabel,
}: {
  course: Course;
  index: number;
  k: number;
  state: NodeState;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onStart: () => void;
  busy: boolean;
  prevLabel: string | null;
}) {
  const m = course.modules[index];
  const x = xAt(k);
  const panelId = useId();
  // Titles sit on whichever side of the node has more room.
  const titleOnLeft = x > 50;

  return (
    <>
      <div className="relative" style={{ height: ROW }}>
        <motion.button
          type="button"
          onClick={onSelect}
          aria-expanded={selected}
          aria-controls={panelId}
          aria-label={`${label}: ${m.title} (${state === "done" ? "done" : state === "current" ? "up next" : "locked"})`}
          className="map-node absolute top-1/2 flex h-16 w-16 items-center justify-center rounded-full"
          data-state={state}
          data-selected={selected || undefined}
          style={{ left: `${x}%`, x: "-50%", y: "-50%" }}
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: selected ? 1.08 : 1 }}
          animate={{ scale: selected ? 1.08 : 1 }}
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          whileTap={{ scale: 0.92 }}
          transition={spring.bouncy}
        >
          {state === "current" && <span className="map-node-ring" aria-hidden />}
          <span className="relative font-display text-lg">
            {state === "done" ? <CheckIcon size={22} strokeWidth={2.6} /> : state === "locked" ? <LockGlyph /> : k + 1}
          </span>
        </motion.button>
        <span
          className={`pointer-events-none absolute top-1/2 w-[calc(50%-48px)] -translate-y-1/2 text-sm leading-snug ${titleOnLeft ? "text-right" : ""} ${
            state === "locked" ? "text-taupe/70" : "text-sand"
          }`}
          // Clear of the 64px node by a fixed gap at any width.
          style={titleOnLeft ? { right: `calc(${100 - x}% + 42px)` } : { left: `calc(${x}% + 42px)` }}
          aria-hidden
        >
          <span className="block text-[10px] font-semibold tracking-[0.14em] text-taupe uppercase">{label.replace(/^Level \d+ · /, "")}</span>
          <span className="line-clamp-2">{m.title}</span>
        </span>
      </div>
      <div id={panelId}>
        <Expand open={selected}>
          <ModuleDetails course={course} index={index} state={state} label={label} m={m} onStart={onStart} busy={busy} prevLabel={prevLabel} />
        </Expand>
      </div>
    </>
  );
}

function ModuleDetails({
  course,
  index,
  state,
  label,
  m,
  onStart,
  busy,
  prevLabel,
}: {
  course: Course;
  index: number;
  state: NodeState;
  label: string;
  m: CourseModule;
  onStart: () => void;
  busy: boolean;
  prevLabel: string | null;
}) {
  const href = m.lesson ? `/courses/${course.id}/${index + 1}` : null;
  return (
    <div className="pt-1 pb-3">
      <div className="rounded-2xl border border-gold/30 bg-paper/95 p-5 shadow-xl">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-gold uppercase">{label}</p>
        <p className="font-display mt-1 text-xl text-sand">{m.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-sand/80">{m.goal}</p>
        {m.description && <p className="mt-1 text-sm leading-relaxed text-taupe">{m.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {m.lesson?.quiz && (
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs text-gold">
              Checks {m.lesson.quiz.correct}/{m.lesson.quiz.total}
            </span>
          )}
          {state === "locked" ? (
            <span className="text-sm text-taupe">{prevLabel ? `Finish ${prevLabel} to unlock this.` : "Locked"}</span>
          ) : href ? (
            <motion.span whileTap={{ scale: 0.96 }} transition={spring.snappy} className="inline-block">
              <Link href={href} className="btn-primary inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold">
                {state === "done" ? "Review" : "Continue"} →
              </Link>
            </motion.span>
          ) : (
            <motion.button
              type="button"
              disabled={busy}
              onClick={onStart}
              whileTap={{ scale: 0.96 }}
              transition={spring.snappy}
              className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              Start →
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" strokeLinecap="round" />
    </svg>
  );
}
