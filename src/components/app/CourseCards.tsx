"use client";

import Link from "next/link";
import { useRef } from "react";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";
import { useTilt } from "@/hooks/useTilt";
import type { Course } from "../types";
import { useAppState } from "./AppState";
import { TopicArt } from "./TopicArt";

/** Topics to explore before the learner has a course on them. */
export const CATALOG = [
  { topic: "Stoicism", blurb: "Calm, clear thinking in a chaotic world." },
  { topic: "Black holes", blurb: "Where gravity bends light and time." },
  { topic: "Game theory", blurb: "Strategy, incentives and smart choices." },
  { topic: "Photosynthesis", blurb: "How plants turn sunlight into life." },
  { topic: "Jazz harmony", blurb: "Why some chords sound like longing." },
  { topic: "Machine learning", blurb: "How computers learn from examples." },
  { topic: "The French Revolution", blurb: "Bread, ideas and a falling crown." },
  { topic: "Supply and demand", blurb: "The invisible tug-of-war behind prices." },
];

/** ★ toggle that saves a course (or topic) to the Library. */
export function StarButton({ topic, className = "" }: { topic: string; className?: string }) {
  const { isBookmarked, toggleBookmark } = useAppState();
  const on = isBookmarked(topic);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Remove ${topic} from your library` : `Save ${topic} to your library`}
      title={on ? "Saved to Library" : "Save to Library"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleBookmark(topic);
      }}
      className={`star-btn flex h-9 w-9 items-center justify-center rounded-full border ${
        on ? "border-gold-fill bg-gold-fill text-ink" : "border-sand/30 bg-well/40 text-sand hover:border-gold-fill hover:text-gold"
      } ${className}`}
      data-on={on || undefined}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function courseProgress(course: Course) {
  const total = course.modules.length;
  const done = course.modules.filter((m) => m.lesson?.completed).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** A course the learner has: art, title, progress, star. Links to its welcome page. */
export function CourseTile({ course }: { course: Course }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const { richPointer } = useMotionPrefs();
  useTilt(ref, { enabled: richPointer });
  const { total, done, percent } = courseProgress(course);
  const finished = course.status === "completed";

  // The star is a sibling of the link (a button can't live inside a link).
  return (
    <div className="relative h-full">
      <Link
        ref={ref}
        href={`/courses/${course.id}`}
        className="tilt-card course-tile group flex h-full flex-col overflow-hidden rounded-3xl border border-beige bg-paper"
      >
        <div className="art-panel relative flex h-40 items-center justify-center bg-gradient-to-br from-violet to-magenta">
          <TopicArt
            topic={course.topic}
            className="h-28 w-28 transition-transform duration-500 group-hover:scale-110"
          />
          <span className="absolute bottom-3 left-3 rounded-full bg-well/50 px-2.5 py-1 text-[11px] font-medium text-sand">
            {finished ? "Completed ✓" : done ? "In progress" : "Just started"}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <p className="text-[11px] font-medium tracking-[0.16em] text-gold uppercase">{course.topic}</p>
          <h3 className="font-display mt-1 text-xl leading-snug text-sand">{course.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-taupe">{course.description}</p>
          <div className="mt-auto pt-5">
            <div className="flex items-center justify-between text-xs text-taupe">
              <span>
                {done} of {total} modules
              </span>
              <span className="font-semibold text-sand tabular-nums">{percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand/10">
              <div
                className="course-bar h-full rounded-full bg-gradient-to-r from-gold to-sand"
                style={{ width: `${Math.max(percent, 3)}%` }}
              />
            </div>
          </div>
        </div>
      </Link>
      <StarButton topic={course.topic} className="absolute top-3 right-3 z-10" />
    </div>
  );
}

/** A topic to explore. Opens the learner's course if they have one, else starts it. */
export function CatalogTile({ topic, blurb }: { topic: string; blurb: string }) {
  const { courseFor, learn, busy } = useAppState();
  const course = courseFor(topic);
  const body = (
    <>
      <div className="art-panel relative flex h-32 items-center justify-center bg-gradient-to-br from-violet/80 to-magenta/80">
        <TopicArt topic={topic} className="h-24 w-24 transition-transform duration-500 group-hover:scale-110" />
      </div>
      <div className="p-4 text-left">
        <h3 className="font-display text-lg text-sand">{topic}</h3>
        <p className="mt-1 text-xs leading-relaxed text-taupe">{blurb}</p>
        <p className="mt-3 text-xs font-semibold text-gold">{course ? "Open your course →" : "Start this course →"}</p>
      </div>
    </>
  );
  const className =
    "catalog-tile group block overflow-hidden rounded-2xl border border-beige bg-paper/80 hover:border-gold/50 disabled:cursor-wait";
  return (
    <div className="relative">
      {course ? (
        <Link href={`/courses/${course.id}`} className={className}>
          {body}
        </Link>
      ) : (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => learn(topic, "course")}
          className={`${className} w-full`}
        >
          {body}
        </button>
      )}
      <StarButton topic={topic} className="absolute top-3 right-3 z-10" />
    </div>
  );
}
