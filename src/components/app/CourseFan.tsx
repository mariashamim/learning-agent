"use client";

import { motion, useInView, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRightIcon } from "../Icons";
import { spring } from "../motion/presets";
import { useAppState } from "./AppState";
import { StarButton } from "./CourseCards";
import { TopicArt } from "./TopicArt";

// Courses as a fan of cards on a wheel, after the editorial reference: the
// cards hang from a pivot far below the stage, so neighbours tilt away from
// the upright centre card. They arrive stacked and fan out as the section
// scrolls into view. Drag (or swipe), the arrows, or ←/→ turn the wheel;
// tapping a side card brings it to the centre; the centre card's button
// starts (or opens) that course.

export type FanItem = { topic: string; blurb: string };

/** Degrees between neighbouring cards, and the wheel's radius (px from card top to pivot). */
const STEP = 15;
const RADIUS = 1150;
/** Cards further than this from the centre are hidden. */
const VISIBLE = 3;
/** Pixels of drag that turn the wheel by one card. */
const DRAG_PER_CARD = 160;

const TONES = ["paper", "art", "gold", "berry"] as const;

export function CourseFan({ items, title }: { items: FanItem[]; title: string }) {
  const [active, setActive] = useState(Math.floor((items.length - 1) / 2));
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { once: true, amount: 0.35 });
  const reduce = useReducedMotion();
  // Live drag, in cards (fractional), added to every card's position while panning.
  const drag = useMotionValue(0);
  // When the pointer lifts at the end of a drag, the browser also fires a
  // click on the card underneath; that click must not override the drag.
  const draggedAt = useRef(0);
  const clamp = (i: number) => Math.max(0, Math.min(items.length - 1, i));
  const go = (i: number) => setActive(clamp(i));
  // Relative moves read the latest state, so quick repeated presses all count.
  const step = (delta: number) => setActive((a) => clamp(a + delta));

  return (
    <div
      className="course-fan surface-ink relative"
      role="region"
      aria-roledescription="carousel"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          step(1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          step(-1);
        }
      }}
    >
      <motion.div
        ref={stage}
        className="fan-stage relative mx-auto touch-pan-y select-none"
        onPan={(_, info) => drag.set(-info.offset.x / DRAG_PER_CARD)}
        onPanEnd={(_, info) => {
          draggedAt.current = Date.now();
          const moved = Math.round(-info.offset.x / DRAG_PER_CARD - info.velocity.x / 1500);
          drag.set(0);
          step(moved);
        }}
      >
        {items.map((item, i) => (
          <FanCard
            key={item.topic}
            item={item}
            index={i}
            active={active}
            drag={drag}
            open={inView || !!reduce}
            tone={TONES[i % TONES.length]}
            onFocusCard={() => {
              if (Date.now() - draggedAt.current > 250) go(i);
            }}
          />
        ))}
      </motion.div>

      <div className="mt-2 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={active === 0}
          aria-label="Previous course"
          className="fan-arrow flex h-11 w-11 items-center justify-center rounded-full border border-beige text-sand hover:border-gold hover:text-gold disabled:opacity-30"
        >
          <ArrowRightIcon size={18} className="rotate-180" />
        </button>
        <p className="min-w-[8rem] text-center text-sm text-taupe tabular-nums" aria-live="polite">
          <span className="text-sand">{items[active]?.topic}</span>
          <span className="block text-xs">
            {active + 1} / {items.length}
          </span>
        </p>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={active === items.length - 1}
          aria-label="Next course"
          className="fan-arrow flex h-11 w-11 items-center justify-center rounded-full border border-beige text-sand hover:border-gold hover:text-gold disabled:opacity-30"
        >
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}

function FanCard({
  item,
  index,
  active,
  drag,
  open,
  tone,
  onFocusCard,
}: {
  item: FanItem;
  index: number;
  active: number;
  drag: MotionValue<number>;
  open: boolean;
  tone: (typeof TONES)[number];
  onFocusCard: () => void;
}) {
  const { courseFor, learn, busy } = useAppState();
  const course = courseFor(item.topic);
  const offset = index - active;
  const isCenter = offset === 0;
  const hidden = Math.abs(offset) > VISIBLE;
  // While stacked (before the section is in view) every card sits upright in the middle.
  const base = open ? offset : 0;
  // The drag shifts the whole fan; it's added on top of the sprung base angle.
  const dragDeg = useTransform(drag, (d) => (open ? -d * STEP : 0));

  return (
    <motion.div
      className="fan-slot absolute top-0 left-1/2"
      style={{ rotate: dragDeg, transformOrigin: `50% ${RADIUS}px`, zIndex: 50 - Math.abs(offset) }}
    >
      <motion.div
        className="fan-card-wrap"
        style={{ transformOrigin: `50% ${RADIUS}px` }}
        initial={false}
        animate={{
          rotate: base * STEP,
          opacity: hidden ? 0 : 1,
          scale: open ? (isCenter ? 1 : 0.94) : 0.9,
        }}
        transition={{ ...spring.gentle, delay: open ? Math.abs(offset) * 0.06 : 0 }}
        aria-hidden={hidden || undefined}
      >
        <motion.div
          className={`fan-card fan-${tone} relative flex flex-col overflow-hidden rounded-[22px]`}
          whileHover={isCenter ? { y: -10 } : { y: -6 }}
          transition={spring.snappy}
          data-center={isCenter || undefined}
        >
          {/* Side cards: the whole card turns the wheel to it. */}
          {!isCenter && (
            <button
              type="button"
              className="absolute inset-0 z-10 cursor-pointer"
              aria-label={`Show ${item.topic}`}
              tabIndex={hidden ? -1 : 0}
              onClick={onFocusCard}
            />
          )}
          <div className="flex items-start justify-between gap-3 p-5 pb-0">
            <span className="fan-meta text-[10px] tracking-[0.18em] uppercase">
              Course {String(index + 1).padStart(2, "0")}
            </span>
            <StarButton topic={item.topic} className="relative z-20" />
          </div>
          <div className="fan-figure flex flex-1 items-center justify-center px-5">
            <TopicArt topic={item.topic} className="h-[46%] w-[46%] min-h-24 min-w-24" />
          </div>
          <div className="p-5 pt-0">
            <h3 className="fan-title font-serif text-[clamp(28px,3vw,38px)] leading-[0.98] italic">{item.topic}</h3>
            <p className="fan-blurb mt-2 text-[13px] leading-snug">{item.blurb}</p>
            <div className="mt-4 h-10">
              {isCenter &&
                (course ? (
                  <Link href={`/courses/${course.id}`} className="fan-cta inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
                    Open your course <ArrowRightIcon size={15} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => learn(item.topic, "course")}
                    className="fan-cta inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-wait"
                  >
                    Start this course <ArrowRightIcon size={15} />
                  </button>
                ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
