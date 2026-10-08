"use client";

import { useId, type ReactNode } from "react";

// Animated SVG illustrations, picked by keywords in the topic. Every motion is
// a CSS class (see "Topic art" in globals.css), so reduced-motion turns it off.

type Kind =
  | "space"
  | "plant"
  | "strategy"
  | "mind"
  | "history"
  | "music"
  | "code"
  | "market"
  | "math"
  | "chemistry"
  | "language"
  | "art"
  | "orbit";

const RULES: [Kind, RegExp][] = [
  ["space", /black hole|space|astro|galax|planet|cosmo|star|universe|gravity|physic|quantum|relativ/],
  ["plant", /photosynth|plant|leaf|botan|biolog|ecolog|cell|garden|tree|nature|evolution|gene/],
  ["strategy", /game theory|strateg|chess|decision|negotiat|poker|war game/],
  ["market", /supply|demand|econom|market|financ|money|invest|trade|business/],
  ["code", /machine learning|\bai\b|artificial|neural|code|program|computer|software|data|algorithm|web/],
  ["music", /music|jazz|sound|song|rhythm|harmon|guitar|piano|audio/],
  ["history", /histor|revolution|war\b|empire|ancient|civiliz|medieval|renaissance|dynasty/],
  ["math", /math|geometr|calculus|algebra|statistic|probab|number|trigonom/],
  ["chemistry", /chemi|molecul|atom|element|reaction|periodic/],
  ["language", /language|writing|literat|poetr|grammar|english|spanish|french|story|novel/],
  ["art", /\bart\b|design|paint|color|colour|drawing|photograph|architect/],
  ["mind", /philosoph|stoic|ethic|logic|epistem|mind|psycholog|meditat|thinking|wisdom/],
];

export function kindFor(topic: string): Kind {
  const t = topic.toLowerCase();
  return RULES.find(([, re]) => re.test(t))?.[0] ?? "orbit";
}

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function TopicArt({ topic, className = "" }: { topic: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  const kind = kindFor(topic);
  const g = { gold: `${id}-gold`, berry: `${id}-berry`, glow: `${id}-glow` };

  return (
    <svg viewBox="0 0 120 120" className={`topic-art overflow-visible ${className}`} role="img" aria-label={`${topic} illustration`}>
      <defs>
        <linearGradient id={g.gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3d29b" />
          <stop offset="100%" stopColor="#c88b00" />
        </linearGradient>
        <linearGradient id={g.berry} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7a5498" />
          <stop offset="100%" stopColor="#ad2f70" />
        </linearGradient>
        <radialGradient id={g.glow}>
          <stop offset="0%" stopColor="#c88b00" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c88b00" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill={`url(#${g.glow})`} className="art-breathe" />
      {ART[kind]({ gold: `url(#${g.gold})`, berry: `url(#${g.berry})`, seed: hash(topic) })}
    </svg>
  );
}

type Paint = { gold: string; berry: string; seed: number };

const ART: Record<Kind, (p: Paint) => ReactNode> = {
  space: ({ gold, berry }) => (
    <g>
      <g className="art-spin-slow" style={{ transformOrigin: "60px 60px" }}>
        <ellipse cx="60" cy="60" rx="46" ry="16" fill="none" stroke={gold} strokeWidth="3" opacity="0.9" transform="rotate(-20 60 60)" />
        <ellipse cx="60" cy="60" rx="36" ry="11" fill="none" stroke={berry} strokeWidth="2.5" opacity="0.8" transform="rotate(-20 60 60)" />
      </g>
      <circle cx="60" cy="60" r="15" fill="#150a1e" stroke={gold} strokeWidth="2" />
      <circle cx="96" cy="30" r="2" fill="#e1b983" className="art-twinkle" />
      <circle cx="22" cy="92" r="1.6" fill="#e1b983" className="art-twinkle art-delay-2" />
      <circle cx="28" cy="26" r="1.3" fill="#e1b983" className="art-twinkle art-delay-1" />
    </g>
  ),
  plant: ({ gold, berry }) => (
    <g>
      <circle cx="88" cy="30" r="12" fill={gold} className="art-pulse" style={{ transformOrigin: "88px 30px" }} />
      <g className="art-sway" style={{ transformOrigin: "52px 100px" }}>
        <path d="M52 100 C52 80 52 66 54 52" stroke="#6cc08a" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M54 56 C34 52 26 36 30 24 C46 26 58 40 54 56Z" fill={berry} />
        <path d="M53 72 C70 70 80 58 80 46 C66 46 54 58 53 72Z" fill="#6cc08a" opacity="0.9" />
      </g>
      <circle cx="74" cy="78" r="2.4" fill="#e1b983" className="art-rise" />
      <circle cx="66" cy="86" r="1.8" fill="#e1b983" className="art-rise art-delay-1" />
      <path d="M32 100 H76" stroke="#e1b983" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  strategy: ({ gold, berry }) => (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i % 2 ? 62 : 26}
          y={i < 2 ? 26 : 62}
          width="32"
          height="32"
          rx="7"
          fill={i === 0 || i === 3 ? gold : berry}
          className={`art-blink art-delay-${i}`}
        />
      ))}
      <path d="M60 18 V102 M18 60 H102" stroke="#150a1e" strokeWidth="4" />
    </g>
  ),
  market: ({ gold, berry }) => (
    <g>
      <path d="M20 96 H102 M20 96 V20" stroke="#e1b983" strokeOpacity="0.5" strokeWidth="2" />
      <path d="M26 34 C50 50 70 70 98 90" stroke={berry} strokeWidth="4" fill="none" strokeLinecap="round" className="art-draw" pathLength={1} />
      <path d="M26 90 C50 72 70 52 98 32" stroke={gold} strokeWidth="4" fill="none" strokeLinecap="round" className="art-draw art-delay-1" pathLength={1} />
      <circle cx="62" cy="61" r="5" fill="#e1b983" className="art-pulse" style={{ transformOrigin: "62px 61px" }} />
    </g>
  ),
  code: ({ gold, berry }) => {
    const nodes = [
      [26, 34], [26, 60], [26, 86], [60, 46], [60, 74], [94, 60],
    ];
    const edges = [[0, 3], [1, 3], [1, 4], [2, 4], [0, 4], [3, 5], [4, 5]];
    return (
      <g>
        {edges.map(([a, b], i) => (
          <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke={berry} strokeWidth="2" className={`art-blink art-delay-${i % 4}`} />
        ))}
        {nodes.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === 5 ? 9 : 6} fill={i === 5 ? gold : "#e1b983"} className={i === 5 ? "art-pulse" : ""} style={{ transformOrigin: `${x}px ${y}px` }} />
        ))}
      </g>
    );
  },
  music: ({ gold, berry }) => (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={24 + i * 15} y="30" width="9" height="60" rx="4.5" fill={i % 2 ? berry : gold} className={`art-eq art-delay-${i % 4}`} style={{ transformOrigin: `${28 + i * 15}px 90px` }} />
      ))}
    </g>
  ),
  history: ({ gold, berry }) => (
    <g>
      <path d="M38 22 H82 M38 98 H82" stroke="#e1b983" strokeWidth="4" strokeLinecap="round" />
      <path d="M42 24 C42 46 58 52 60 60 C62 52 78 46 78 24Z" fill={berry} />
      <path d="M42 96 C42 76 58 68 60 60 C62 68 78 76 78 96Z" fill="none" stroke={berry} strokeWidth="2" />
      <path d="M48 96 C52 84 68 84 72 96Z" fill={gold} className="art-fill-up" style={{ transformOrigin: "60px 96px" }} />
      <line x1="60" y1="62" x2="60" y2="86" stroke={gold} strokeWidth="2" strokeDasharray="2 4" className="art-flow" />
    </g>
  ),
  math: ({ gold, berry }) => (
    <g>
      <polygon points="60,20 96,82 24,82" fill="none" stroke={gold} strokeWidth="3.5" className="art-spin-slow" style={{ transformOrigin: "60px 62px" }} />
      <circle cx="60" cy="62" r="22" fill="none" stroke={berry} strokeWidth="3" />
      <path d="M16 100 C30 86 44 114 60 100 S90 86 104 100" stroke="#e1b983" strokeWidth="2.5" fill="none" className="art-draw" pathLength={1} />
    </g>
  ),
  chemistry: ({ gold, berry }) => (
    <g>
      {[0, 60, 120].map((r, i) => (
        <ellipse key={r} cx="60" cy="60" rx="44" ry="15" fill="none" stroke={i === 1 ? gold : berry} strokeWidth="2.5" transform={`rotate(${r} 60 60)`} />
      ))}
      <circle cx="60" cy="60" r="9" fill={gold} className="art-pulse" style={{ transformOrigin: "60px 60px" }} />
      <g className="art-spin" style={{ transformOrigin: "60px 60px" }}>
        <circle cx="104" cy="60" r="4.5" fill="#e1b983" />
      </g>
    </g>
  ),
  language: ({ gold, berry }) => (
    <g>
      <rect x="22" y="30" width="56" height="64" rx="8" fill={berry} />
      <path d="M32 46 H68 M32 58 H64 M32 70 H58" stroke="#e1b983" strokeWidth="3" strokeLinecap="round" className="art-draw" pathLength={1} />
      <g className="art-sway" style={{ transformOrigin: "84px 92px" }}>
        <path d="M84 92 L100 24 C108 34 104 52 96 62 Z" fill={gold} />
      </g>
    </g>
  ),
  art: ({ gold, berry }) => (
    <g>
      <path d="M60 20 C88 20 104 40 100 60 C96 76 82 72 76 80 C70 90 82 100 64 100 C36 100 18 82 18 60 C18 38 36 20 60 20Z" fill={berry} className="art-breathe" style={{ transformOrigin: "60px 60px" }} />
      <circle cx="44" cy="46" r="7" fill={gold} />
      <circle cx="66" cy="38" r="6" fill="#e1b983" />
      <circle cx="40" cy="70" r="6" fill="#6cc08a" />
      <circle cx="84" cy="54" r="5" fill="#150a1e" />
    </g>
  ),
  mind: ({ gold, berry }) => (
    <g>
      <path d="M36 96 H84 M40 90 H80 M40 34 H80 M36 28 H84" stroke="#e1b983" strokeWidth="4" strokeLinecap="round" />
      {[46, 56, 64, 74].map((x) => (
        <rect key={x} x={x - 2.5} y="36" width="5" height="52" rx="2.5" fill={berry} />
      ))}
      <g className="art-spin" style={{ transformOrigin: "60px 22px" }}>
        <circle cx="80" cy="22" r="5" fill={gold} />
      </g>
      <circle cx="60" cy="22" r="3" fill="#e1b983" className="art-twinkle" />
    </g>
  ),
  orbit: ({ gold, berry, seed }) => {
    const rings = 2 + (seed % 3);
    return (
      <g>
        {Array.from({ length: rings }).map((_, i) => (
          <g key={i} className={i % 2 ? "art-spin" : "art-spin-slow"} style={{ transformOrigin: "60px 60px" }}>
            <circle cx="60" cy="60" r={20 + i * 13} fill="none" stroke={i % 2 ? gold : berry} strokeWidth="2" strokeDasharray={`${4 + ((seed >> i) % 9)} 6`} />
            <circle cx={60 + 20 + i * 13} cy="60" r="4" fill={i % 2 ? berry : gold} />
          </g>
        ))}
        <circle cx="60" cy="60" r="10" fill={gold} className="art-pulse" style={{ transformOrigin: "60px 60px" }} />
      </g>
    );
  },
};
