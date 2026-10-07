"use client";

import { BookIcon, ChartIcon, HomeIcon, LibraryIcon } from "./Icons";
import { LearnerPill } from "./LearnerPill";
import { recentLessons, timeAgo } from "./stats";
import type { Course } from "./types";

const NAV = [
  { href: "#top", label: "Home", Icon: HomeIcon },
  { href: "#courses", label: "Courses", Icon: BookIcon },
  { href: "#progress", label: "Progress", Icon: ChartIcon },
  { href: "#library", label: "Library", Icon: LibraryIcon },
];

const RECENT_TINTS = ["bg-peach/60 text-coffee", "bg-amber/15 text-amber", "bg-sage/15 text-sage", "bg-beige/40 text-coffee"];

export function Brand() {
  return (
    <a href="#top" className="group flex items-center gap-2.5 sm:gap-3">
      <span className="font-display flex h-9 w-9 items-center justify-center rounded-xl bg-coffee text-lg text-peach italic transition-transform duration-300 group-hover:-rotate-6 sm:h-10 sm:w-10 sm:text-xl">
        S
      </span>
      <span className="leading-tight">
        <span className="font-display block text-lg font-semibold text-espresso sm:text-xl">StudyBuddy</span>
        <span className="hidden text-[11px] text-taupe sm:block">an AI tutor with a memory</span>
      </span>
    </a>
  );
}

/** Left navigation: sections, recently opened lessons, and the learner. */
export function Sidebar({
  courses,
  learnerId,
  lessonCount,
  activeSection,
  onOpenModule,
}: {
  courses: Course[];
  learnerId: string;
  /** Lessons saved for this learner (course modules + single lessons). */
  lessonCount: number;
  activeSection: string;
  onOpenModule: (course: Course, moduleIndex: number) => void;
}) {
  const recent = recentLessons(courses);

  return (
    <aside className="sidebar sticky top-0 hidden h-screen w-[264px] flex-shrink-0 flex-col border-r border-beige/70 bg-background px-5 py-6 lg:flex">
      <Brand />

      <nav className="mt-8 space-y-1" aria-label="Sections">
        {NAV.map(({ href, label, Icon }) => {
          const active = activeSection === href.slice(1);
          return (
            <a
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`nav-link flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium ${
                active ? "bg-peach text-coffee" : "text-espresso/80 hover:bg-peach/40 hover:text-espresso"
              }`}
            >
              <Icon size={20} />
              {label}
            </a>
          );
        })}
      </nav>

      <div className="mt-8 min-h-0 flex-1 overflow-y-auto border-t border-beige/70 pt-6">
        <p className="flex items-center gap-2 px-1 text-[13px] font-semibold text-espresso/80">Recent lessons</p>
        {recent.length === 0 ? (
          <p className="mt-3 px-1 text-xs leading-relaxed text-taupe">
            Lessons you open will show up here, so you can jump back in.
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {recent.map(({ course, moduleIndex, lesson, at }, i) => (
              <li key={lesson.id}>
                <button
                  type="button"
                  onClick={() => onOpenModule(course, moduleIndex)}
                  className="recent-item flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left hover:bg-peach/40"
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${RECENT_TINTS[i % RECENT_TINTS.length]}`}
                  >
                    {moduleIndex + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-espresso">{lesson.data.title}</span>
                    <span className="block truncate text-xs text-taupe">{course.title}</span>
                    <span className="block text-[11px] text-taupe/80">
                      {lesson.completed ? "Done" : "In progress"} · {timeAgo(at)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 border-t border-beige/70 pt-4">
        <LearnerPill learnerId={learnerId} lessonCount={lessonCount} tipPlacement="above" wide />
        <p className="font-display mt-4 px-1 text-sm text-taupe/80 italic">Better learning, brighter future ♡</p>
      </div>
    </aside>
  );
}
