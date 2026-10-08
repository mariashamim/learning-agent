"use client";

import { useState } from "react";
import type { Activity } from "@/lib/activities";
import { ActivityFrame } from "./ActivityFrame";

type DiagramData = Extract<Activity, { type: "diagram" }>;

/** An interactive concept map: tap a node to light up its links and read how it connects. */
export function DiagramActivity({ a, onDone }: { a: DiagramData; onDone: () => void }) {
  const [active, setActive] = useState<number | null>(null);
  const [visited, setVisited] = useState<Set<number>>(() => new Set());
  const need = Math.min(a.nodes.length, 3);
  const done = visited.size >= need;

  // Nodes on a circle (the first one in the centre when there are 5+).
  const n = a.nodes.length;
  const centred = n >= 5;
  const pos = a.nodes.map((_, i) => {
    if (centred && i === 0) return { x: 200, y: 150 };
    const k = centred ? i - 1 : i;
    const total = centred ? n - 1 : n;
    const ang = -Math.PI / 2 + (k / total) * Math.PI * 2;
    return { x: 200 + Math.cos(ang) * 145, y: 150 + Math.sin(ang) * 112 };
  });

  function open(i: number) {
    setActive(i);
    const next = new Set(visited).add(i);
    setVisited(next);
    if (next.size >= need) onDone();
  }

  const linked = (e: { from: number; to: number }) => active !== null && (e.from === active || e.to === active);
  const neighbours = active === null ? [] : a.edges.filter(linked);

  return (
    <ActivityFrame type="diagram" title={a.title} prompt={a.prompt} reveal={a.reveal} done={done}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <svg viewBox="0 0 400 300" className="diagram-svg w-full rounded-2xl bg-ink/40">
          <defs>
            <marker id={`arrow-${a.title.length}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10z" fill="#c88b00" />
            </marker>
          </defs>
          {a.edges.map((e, i) => {
            const p = pos[e.from];
            const q = pos[e.to];
            // Stop the line at the node's edge.
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const len = Math.hypot(dx, dy) || 1;
            const r = 30;
            const on = linked(e);
            return (
              <g key={i} className="diagram-edge" data-on={on || undefined} opacity={active === null || on ? 1 : 0.18}>
                <line
                  x1={p.x + (dx / len) * r}
                  y1={p.y + (dy / len) * r}
                  x2={q.x - (dx / len) * (r + 4)}
                  y2={q.y - (dy / len) * (r + 4)}
                  stroke={on ? "#c88b00" : "#7a5498"}
                  strokeWidth={on ? 2.5 : 1.6}
                  markerEnd={`url(#arrow-${a.title.length})`}
                />
                {on && e.label && (
                  <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 - 6} textAnchor="middle" fill="#e1b983" fontSize="11" className="diagram-label">
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}
          {a.nodes.map((node, i) => {
            const on = active === i;
            const near = neighbours.some((e) => e.from === i || e.to === i);
            return (
              <g
                key={i}
                role="button"
                tabIndex={0}
                aria-label={node.label}
                onClick={() => open(i)}
                onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && open(i)}
                className="diagram-node cursor-pointer"
                data-state={on ? "active" : near ? "near" : visited.has(i) ? "seen" : "idle"}
                style={{ transformOrigin: `${pos[i].x}px ${pos[i].y}px` }}
              >
                <circle cx={pos[i].x} cy={pos[i].y} r="30" />
                <foreignObject x={pos[i].x - 34} y={pos[i].y - 16} width="68" height="32" pointerEvents="none">
                  <div className="flex h-full items-center justify-center text-center text-[10px] leading-tight font-semibold">{node.label}</div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
        <div className="rounded-2xl border border-beige bg-ink/30 p-4">
          {active === null ? (
            <p className="text-sm text-taupe">Tap any node to see what it is and how it connects.</p>
          ) : (
            <div key={active} className="diagram-panel">
              <p className="font-display text-xl text-gold">{a.nodes[active].label}</p>
              <p className="mt-1 text-sm leading-relaxed text-sand/90">{a.nodes[active].detail}</p>
              {neighbours.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {neighbours.map((e, i) => {
                    const other = e.from === active ? e.to : e.from;
                    return (
                      <li key={i}>
                        <button type="button" onClick={() => open(other)} className="text-left text-sm text-sand hover:text-gold">
                          {e.from === active ? "→ " : "← "}
                          <span className="text-taupe">{e.label || "links to"}</span> <b>{a.nodes[other].label}</b>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          <p className="mt-4 text-xs text-taupe tabular-nums">
            Explored {visited.size}/{a.nodes.length}
          </p>
        </div>
      </div>
    </ActivityFrame>
  );
}
