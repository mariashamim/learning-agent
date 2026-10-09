"use client";

import type { CSSProperties } from "react";

// Threads of a loom: vertical warp threads, and weft threads that pass over
// and under them as gentle waves. A bright "shuttle" stroke travels along the
// weft. Pure SVG + CSS (transforms and stroke-dashoffset only), so it's cheap,
// and the global reduced-motion rule freezes it.

const W = 400;
const H = 300;

function weftPath(y: number, amp: number, phase: number) {
  const step = W / 8;
  let d = `M -20 ${y}`;
  for (let i = 0; i <= 8; i++) {
    const x = i * step;
    const up = (i + phase) % 2 === 0 ? -amp : amp;
    d += ` Q ${x - step / 2} ${y + up} ${x} ${y}`;
  }
  return d + ` L ${W + 20} ${y}`;
}

const WEFT = [
  { y: 70, amp: 14, phase: 0, tone: "var(--gold)", width: 2.2, speed: 7 },
  { y: 115, amp: 12, phase: 1, tone: "#d79bd0", width: 1.8, speed: 9 },
  { y: 160, amp: 16, phase: 0, tone: "var(--sand)", width: 2, speed: 8 },
  { y: 205, amp: 12, phase: 1, tone: "#b38be0", width: 1.8, speed: 10 },
  { y: 248, amp: 14, phase: 0, tone: "var(--gold)", width: 1.6, speed: 11 },
];

export function WovenThreads({
  className = "",
  shuttles = true,
  strands = WEFT.length,
}: {
  className?: string;
  /** The travelling highlight along each weft thread. */
  shuttles?: boolean;
  /** How many weft threads to draw (fewer for small sizes). */
  strands?: number;
}) {
  const weft = WEFT.slice(0, strands);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`woven ${className}`} aria-hidden focusable="false">
      <defs>
        <radialGradient id="woven-glow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#ad2f70" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#7a5498" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#7a5498" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={W / 2} cy={H / 2} rx={W * 0.55} ry={H * 0.55} fill="url(#woven-glow)" className="woven-glow" />
      {/* warp */}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={(i * W) / 8} y1={30} x2={(i * W) / 8} y2={H - 30} className="woven-warp" />
      ))}
      {/* weft */}
      {weft.map((t, i) => {
        const d = weftPath(t.y, t.amp, t.phase);
        return (
          <g key={i} className="woven-strand" style={{ "--strand-speed": `${t.speed}s`, "--strand-delay": `${-i * 1.3}s` } as CSSProperties}>
            <path d={d} stroke={t.tone} strokeWidth={t.width} className="woven-weft" />
            {shuttles && (
              <path
                d={d}
                stroke={t.tone}
                strokeWidth={t.width + 1.4}
                pathLength={100}
                className="woven-shuttle"
                style={{ "--shuttle-speed": `${t.speed * 0.7}s`, "--shuttle-delay": `${-i * 0.9}s` } as CSSProperties}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
