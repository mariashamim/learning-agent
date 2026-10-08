"use client";

import Link from "next/link";
import type { Course } from "../types";
import { courseProgress } from "./CourseCards";

/**
 * The Knowledge Garden: one plant per course, grown by finished modules.
 * Seed (0%) → sprout → leaves → more leaves → bud → bloom (100%).
 */
export function Garden({ courses }: { courses: Course[] }) {
  return (
    <div className="garden relative overflow-hidden rounded-[2rem] border border-beige bg-gradient-to-b from-violet/70 via-violet/30 to-magenta/40">
      {/* sky: sun and drifting fireflies */}
      <div className="garden-sun absolute top-8 right-10 h-16 w-16 rounded-full bg-gold" aria-hidden />
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="firefly"
          aria-hidden
          style={{ left: `${(i * 37) % 100}%`, top: `${15 + ((i * 23) % 55)}%`, animationDelay: `${(i % 5) * 0.9}s` }}
        />
      ))}

      <div className="relative flex min-h-[420px] items-end gap-2 overflow-x-auto px-6 pt-24 pb-0 sm:gap-6 sm:px-10">
        {courses.length === 0 ? (
          <div className="flex w-full flex-col items-center pb-10 text-center">
            <Plant percent={0} label="Your first seed" />
            <p className="mt-2 text-sand/80">Plant your first seed: start a course and finish a module.</p>
            <Link href="/courses" className="btn-primary mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold">
              Find a course
            </Link>
          </div>
        ) : (
          courses.map((c) => {
            const { percent } = courseProgress(c);
            return (
              <Link key={c.id} href={`/courses/${c.id}`} className="plant-link group flex min-w-[140px] flex-1 flex-col items-center" title={`${c.title}: ${percent}%`}>
                <Plant percent={percent} label={c.topic} />
              </Link>
            );
          })
        )}
      </div>
      <div className="h-5 bg-ink/60" aria-hidden />
    </div>
  );
}

function Plant({ percent, label }: { percent: number; label: string }) {
  const stage = percent >= 100 ? 5 : percent >= 75 ? 4 : percent >= 50 ? 3 : percent >= 25 ? 2 : percent > 0 ? 1 : 0;
  const stem = [0, 28, 52, 76, 96, 104][stage];
  const top = 150 - stem;

  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 120 190" className="h-56 w-36 overflow-visible sm:h-64 sm:w-40" aria-hidden>
        <g className={stage ? "plant-sway" : ""} style={{ transformOrigin: "60px 150px" }}>
          {stage >= 1 && <path d={`M60 150 C60 ${150 - stem * 0.5} 58 ${150 - stem * 0.8} 60 ${top}`} stroke="#6cc08a" strokeWidth="4" fill="none" strokeLinecap="round" className="stem-grow" />}
          {stage >= 1 && <Leaf x={60} y={top + 6} dir={-1} size={stage === 1 ? 0.6 : 1} color="#6cc08a" />}
          {stage >= 1 && <Leaf x={60} y={top + 10} dir={1} size={stage === 1 ? 0.6 : 1} color="#7a5498" />}
          {stage >= 3 && <Leaf x={60} y={150 - stem * 0.45} dir={-1} size={1.1} color="#7a5498" />}
          {stage >= 3 && <Leaf x={60} y={150 - stem * 0.3} dir={1} size={1.1} color="#6cc08a" />}
          {stage === 4 && <ellipse cx="60" cy={top - 6} rx="8" ry="11" fill="#ad2f70" className="bud-pop" style={{ transformOrigin: `60px ${top}px` }} />}
          {stage === 5 && (
            <g className="bloom" style={{ transformOrigin: `60px ${top - 10}px` }}>
              {[0, 60, 120, 180, 240, 300].map((r) => (
                <ellipse key={r} cx="60" cy={top - 24} rx="8" ry="15" fill="#ad2f70" transform={`rotate(${r} 60 ${top - 10})`} />
              ))}
              <circle cx="60" cy={top - 10} r="8" fill="#c88b00" />
              <circle cx="60" cy={top - 10} r="20" fill="#c88b00" opacity="0.25" className="art-breathe" style={{ transformOrigin: `60px ${top - 10}px` }} />
            </g>
          )}
        </g>
        {/* seed + pot */}
        {stage === 0 && <ellipse cx="60" cy="146" rx="7" ry="5" fill="#c88b00" className="seed-wiggle" style={{ transformOrigin: "60px 146px" }} />}
        <path d="M30 150 H90 L84 186 H36 Z" fill="#150a1e" stroke="#573a6c" strokeWidth="2" />
        <path d="M26 146 H94 V156 H26 Z" fill="#2a1539" stroke="#573a6c" strokeWidth="2" />
      </svg>
      <figcaption className="mt-1 max-w-[9rem] truncate pb-3 text-center text-xs text-sand/90 capitalize">
        {label}
        <span className="block text-[11px] text-gold">{percent}%</span>
      </figcaption>
    </figure>
  );
}

function Leaf({ x, y, dir, size, color }: { x: number; y: number; dir: 1 | -1; size: number; color: string }) {
  const w = 26 * size * dir;
  const h = 12 * size;
  return (
    <path
      d={`M${x} ${y} C${x + w * 0.4} ${y - h} ${x + w} ${y - h} ${x + w} ${y - h * 0.3} C${x + w * 0.7} ${y + h * 0.3} ${x + w * 0.3} ${y + h * 0.2} ${x} ${y}Z`}
      fill={color}
      className="leaf-grow"
      style={{ transformOrigin: `${x}px ${y}px` }}
    />
  );
}
