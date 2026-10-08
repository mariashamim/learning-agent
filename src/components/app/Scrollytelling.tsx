"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  { title: "Name anything", body: "Philosophy, black holes, jazz harmony. If you can name it, your tutor can teach it." },
  { title: "Your tutor plans a path", body: "It maps a short course of three to six modules, each building on the last." },
  { title: "Learn in ten minutes", body: "Every module explains a few ideas with examples, then checks you understood. A second pass reviews it before you see it." },
  { title: "Watch it grow", body: "Finish modules to grow your garden, keep your streak, and come back right where you left off." },
];

/**
 * Scrollytelling: the text steps scroll past while one sticky illustration
 * changes to match the step in the middle of the screen.
 */
export function Scrollytelling() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="scrolly mt-24" aria-labelledby="scrolly-title">
      <p className="text-xs font-medium tracking-[0.2em] text-gold uppercase">How it works</p>
      <h2 id="scrolly-title" className="font-display mt-2 text-4xl text-sand sm:text-5xl">
        How a course unfolds
      </h2>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="sticky top-16 z-10 h-[260px] self-start lg:top-24 lg:order-2 lg:h-[440px]">
          <StoryStage step={active} />
        </div>
        <div className="lg:order-1">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-step={i}
              className={`story-step flex min-h-[55vh] flex-col justify-center py-10 ${active === i ? "is-active" : ""}`}
            >
              <span className="font-display text-6xl text-gold/80">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-display mt-3 text-3xl text-sand">{s.title}</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-taupe">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** One SVG whose layers fade, draw and grow according to the active step. */
function StoryStage({ step }: { step: number }) {
  return (
    <div className="story-stage relative h-full overflow-hidden rounded-3xl border border-beige bg-gradient-to-br from-violet/70 via-paper to-magenta/60" data-step={step}>
      <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden>
        {/* step 0: a topic being typed */}
        <g className="layer layer-0">
          <rect x="60" y="170" width="280" height="60" rx="30" fill="#150a1e" stroke="#c88b00" strokeWidth="2" />
          <text x="92" y="208" fill="#e1b983" fontSize="22" fontFamily="var(--font-serif)" className="typing">
            Black holes
          </text>
          <rect x="245" y="186" width="3" height="28" fill="#c88b00" className="caret" />
          <path d="M320 120 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6z" fill="#e1b983" className="art-twinkle" />
          <path d="M80 110 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4z" fill="#c88b00" className="art-twinkle art-delay-2" />
        </g>

        {/* step 1: the module path */}
        <g className="layer layer-1">
          <path d="M70 300 C120 300 120 220 180 220 S240 140 300 140 S330 90 340 80" fill="none" stroke="#e1b983" strokeOpacity="0.5" strokeWidth="3" strokeDasharray="1" pathLength={1} className="path-draw" />
          {[
            [70, 300],
            [180, 220],
            [300, 140],
            [340, 80],
          ].map(([x, y], i) => (
            <g key={i} className="node-pop" style={{ transitionDelay: `${200 + i * 180}ms`, transformOrigin: `${x}px ${y}px` }}>
              <circle cx={x} cy={y} r="20" fill={i === 0 ? "#c88b00" : "#2a1539"} stroke="#c88b00" strokeWidth="2" />
              <text x={x} y={y + 6} textAnchor="middle" fill={i === 0 ? "#150a1e" : "#e1b983"} fontSize="16" fontWeight="600">
                {i + 1}
              </text>
            </g>
          ))}
        </g>

        {/* step 2: a lesson card with quiz ticks */}
        <g className="layer layer-2">
          <rect x="90" y="70" width="220" height="260" rx="20" fill="#2a1539" stroke="#573a6c" strokeWidth="2" />
          <rect x="114" y="98" width="120" height="14" rx="7" fill="#c88b00" />
          {[130, 152, 174].map((y, i) => (
            <rect key={y} x="114" y={y} width={150 - i * 24} height="9" rx="4.5" fill="#e1b983" opacity="0.5" />
          ))}
          {[220, 258, 296].map((y, i) => (
            <g key={y} className="tick-in" style={{ transitionDelay: `${300 + i * 220}ms` }}>
              <rect x="114" y={y - 14} width="172" height="28" rx="10" fill={i === 1 ? "rgba(248,113,113,0.18)" : "rgba(108,192,138,0.18)"} />
              <text x="128" y={y + 5} fill={i === 1 ? "#fecaca" : "#c9f0d6"} fontSize="15" fontWeight="700">
                {i === 1 ? "✗" : "✓"}
              </text>
              <rect x="150" y={y - 4} width="110" height="8" rx="4" fill="#e1b983" opacity="0.45" />
            </g>
          ))}
        </g>

        {/* step 3: the garden grows, the ring fills */}
        <g className="layer layer-3">
          <circle cx="290" cy="130" r="58" fill="none" stroke="#e1b983" strokeOpacity="0.15" strokeWidth="12" />
          <circle cx="290" cy="130" r="58" fill="none" stroke="#c88b00" strokeWidth="12" strokeLinecap="round" pathLength={1} strokeDasharray="1" className="ring-fill" transform="rotate(-90 290 130)" />
          <text x="290" y="138" textAnchor="middle" fill="#e1b983" fontSize="24" fontFamily="var(--font-serif)">
            80%
          </text>
          <path d="M60 330 H220" stroke="#e1b983" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />
          <g className="grow" style={{ transformOrigin: "140px 330px" }}>
            <path d="M140 330 C140 290 140 260 142 220" stroke="#6cc08a" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M142 260 C110 254 98 230 104 214 C128 218 146 236 142 260Z" fill="#7a5498" />
            <path d="M141 285 C170 282 186 262 184 244 C160 244 142 264 141 285Z" fill="#6cc08a" />
            <circle cx="142" cy="210" r="16" fill="#ad2f70" />
            <circle cx="142" cy="210" r="7" fill="#c88b00" />
          </g>
        </g>
      </svg>
    </div>
  );
}
