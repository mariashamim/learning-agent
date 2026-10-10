"use client";

import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";

// The home hero: a paper collage of the things Weavr makes, built in code
// (no images): a course notebook, a graph you reshape, a code trace and a
// few stickers. Pieces drop in, drift, and lean toward a mouse pointer by
// their depth. Decorative: hidden from assistive tech.

type Piece = {
  /** Position and size in % of the collage box. */
  x: number;
  y: number;
  w: number;
  rotate: number;
  /** 0 (back) to 1 (front): how far it leans toward the pointer. */
  depth: number;
  delay: number;
  float: number;
  children: ReactNode;
};

function Layer({ p, mx, my }: { p: Piece; mx: MotionValue<number>; my: MotionValue<number> }) {
  const x = useTransform(mx, (v) => v * 26 * p.depth);
  const y = useTransform(my, (v) => v * 20 * p.depth);
  return (
    <motion.div className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, x, y }}>
      <motion.div
        initial={{ opacity: 0, y: -40, rotate: p.rotate - 14, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, rotate: p.rotate, scale: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 16, delay: p.delay }}
      >
        <div className="collage-float" style={{ "--float-delay": `${p.float}s` } as CSSProperties}>
          {p.children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Notebook() {
  return (
    <div className="collage-paper rounded-[18px] p-5 sm:p-6">
      <p className="text-[10px] tracking-[0.18em] text-[#6b5d70] uppercase">Course · Level 1</p>
      <p className="mt-2 font-serif text-[clamp(20px,2.6vw,30px)] leading-[1.02] text-[#1a0f24] italic">Python loops</p>
      <p className="mt-1 text-[12px] text-[#6b5d70]">Foundations</p>
      <ul className="mt-4 space-y-2">
        {["Why loops?", "range() and counting", "Accumulators"].map((t, i) => (
          <li key={t} className="flex items-center gap-2 text-[12px] text-[#1a0f24]">
            <span
              className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] ${
                i < 2 ? "bg-[#e0a300] text-[#1a0f24]" : "border border-dashed border-[#b9ab95]"
              }`}
            >
              {i < 2 ? "✓" : ""}
            </span>
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e6dccb]">
        <div className="h-full w-2/3 rounded-full bg-[#e0a300]" />
      </div>
    </div>
  );
}

function GraphCard() {
  return (
    <div className="collage-dark rounded-[18px] p-4">
      <p className="text-[10px] tracking-[0.18em] text-[#bfae9a] uppercase">Shape the curve</p>
      <svg viewBox="0 0 200 110" className="mt-2 w-full">
        <line x1="10" y1="100" x2="195" y2="100" stroke="rgba(246,241,231,0.25)" />
        <path d="M10 100 Q 75 -20 140 100" fill="none" stroke="rgba(215,155,208,0.5)" strokeDasharray="4 5" strokeWidth="1.5" />
        <path className="collage-draw" d="M10 100 Q 98 5 186 100" fill="none" stroke="#e0a300" strokeWidth="3" strokeLinecap="round" pathLength={1} />
      </svg>
      <div className="mt-1 flex items-center justify-between text-[11px] text-[#f6f1e7]">
        <span>Launch angle</span>
        <span className="font-mono text-[#e0a300]">45°</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-[rgba(246,241,231,0.15)]">
        <div className="relative h-full w-1/2 rounded-full bg-[#e0a300]">
          <span className="absolute -top-1 -right-1.5 h-3 w-3 rounded-full bg-[#f6f1e7]" />
        </div>
      </div>
    </div>
  );
}

function CodeCard() {
  const lines = ["total = 0", "for i in range(3):", "    total += i", "print(total)"];
  return (
    <div className="collage-code overflow-hidden rounded-[14px]">
      <div className="flex gap-1 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[rgba(246,241,231,0.25)]" />
        <span className="h-2 w-2 rounded-full bg-[rgba(246,241,231,0.25)]" />
        <span className="h-2 w-2 rounded-full bg-[rgba(246,241,231,0.25)]" />
      </div>
      <pre className="px-0 pb-3 font-mono text-[11px] leading-[1.7] text-[#eadcc8]">
        {lines.map((l, i) => (
          <div key={i} className={`px-3 ${i === 2 ? "border-l-2 border-[#e0a300] bg-[rgba(224,163,0,0.16)]" : "border-l-2 border-transparent"}`}>
            <span className="mr-3 text-[rgba(189,158,133,0.5)]">{i + 1}</span>
            {l}
          </div>
        ))}
      </pre>
      <div className="flex gap-2 border-t border-[rgba(246,241,231,0.1)] px-3 py-2 font-mono text-[10px]">
        <span className="rounded border border-[rgba(224,163,0,0.5)] bg-[rgba(224,163,0,0.12)] px-1.5 py-0.5 text-[#f6f1e7]">i = 2</span>
        <span className="rounded border border-[rgba(246,241,231,0.18)] px-1.5 py-0.5 text-[#f6f1e7]">total = 3</span>
      </div>
    </div>
  );
}

function Sticker({ children, tone }: { children: ReactNode; tone: "gold" | "berry" | "sage" | "cream" }) {
  return <div className={`collage-sticker collage-sticker-${tone}`}>{children}</div>;
}

const PIECES: Piece[] = [
  { x: 6, y: 10, w: 50, rotate: -8, depth: 0.35, delay: 0.15, float: 0, children: <Notebook /> },
  { x: 47, y: 4, w: 46, rotate: 7, depth: 0.6, delay: 0.3, float: -1.6, children: <GraphCard /> },
  { x: 36, y: 52, w: 52, rotate: -3, depth: 0.85, delay: 0.45, float: -3.1, children: <CodeCard /> },
  {
    x: 2,
    y: 66,
    w: 26,
    rotate: -12,
    depth: 1,
    delay: 0.65,
    float: -0.8,
    children: (
      <Sticker tone="gold">
        <span className="block text-[10px] tracking-[0.14em] uppercase">Level</span>
        <span className="block font-serif text-3xl leading-none italic">one</span>
      </Sticker>
    ),
  },
  {
    x: 68,
    y: 40,
    w: 30,
    rotate: 9,
    depth: 1,
    delay: 0.8,
    float: -2.2,
    children: <Sticker tone="sage">✓ got it on try 2</Sticker>,
  },
  {
    x: 74,
    y: 84,
    w: 22,
    rotate: -6,
    depth: 0.9,
    delay: 0.95,
    float: -1.2,
    children: <Sticker tone="berry">3/3 checks</Sticker>,
  },
];

export function HeroCollage({ className = "" }: { className?: string }) {
  const { richPointer } = useMotionPrefs();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const mx = useSpring(px, { stiffness: 70, damping: 18 });
  const my = useSpring(py, { stiffness: 70, damping: 18 });

  useEffect(() => {
    if (!richPointer) return;
    const onMove = (e: PointerEvent) => {
      px.set(e.clientX / window.innerWidth - 0.5);
      py.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [richPointer, px, py]);

  return (
    <div className={`hero-collage relative ${className}`} aria-hidden>
      {/* The organic blobs the pieces rest on. */}
      <svg viewBox="0 0 400 400" className="collage-blob absolute inset-[6%] h-[88%] w-[88%]">
        <path
          fill="#a3336d"
          d="M318 86c40 38 54 101 30 151-23 50-84 87-143 96-60 10-117-9-146-52-29-42-30-108 2-155 33-47 99-75 154-72 42 2 72 4 103 32z"
        />
        <path fill="#e0a300" d="M96 300c18-20 52-22 70-4 18 17 10 46-12 58-23 12-58 8-67-14-6-14-3-27 9-40z" />
      </svg>
      {PIECES.map((p, i) => (
        <Layer key={i} p={p} mx={mx} my={my} />
      ))}
    </div>
  );
}
