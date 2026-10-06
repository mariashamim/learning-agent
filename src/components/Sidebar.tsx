"use client";

import { BookIcon, ChartIcon, HomeIcon, LibraryIcon, SparkleIcon } from "./Icons";
import { LearnerPill } from "./LearnerPill";
import { recentLessons, timeAgo } from "./stats";
import type { Course } from "./types";

const NAV = [
  { href: "#top", label: "Home", Icon: HomeIcon },
  { href: "#courses", label: "Courses", Icon: BookIcon },
  { href: "#progress", label: "Progress", Icon: ChartIcon },
  { href: "#library", label: "Library", Icon: LibraryIcon },
];

const RECENT_TINTS = ["bg-blue/10 text-blue", "bg-violet/10 text-violet", "bg-mint/10 text-mint", "bg-amber/10 text-amber", "bg-rose/10 text-rose"];

export function Brand() {
  return (
    <a href="#top" className="group flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow-[0_8px_20px_-8px_rgba(108,92,231,0.7)] transition-transform duration-300 group-hover:rotate-12">
        <SparkleIcon size={22} strokeWidth={2} />
      </span>
      <span className="leading-tight">
        <span className="font-display block text-lg font-bold text-espresso">StudyBuddy</span>
        <span className="hidden text-[11px] text-taupe sm:block">an AI tutor with a memory</span>
      </span>
    </a>
  );
}

/** Left navigation: sections, recently opened lessons, and the learner. */
export function Sidebar({
  courses,
  learnerId,
  activeSection,
  onOpenModule,
}: {
  courses: Course[];
  learnerId: string;
  activeSection: string;
  onOpenModule: (course: Course, moduleIndex: number) => void;
}) {
  const recent = recentLessons(courses);

  return (
    <aside className="sidebar sticky top-0 hidden h-screen w-[264px] flex-shrink-0 flex-col border-r border-beige/70 bg-paper/70 px-5 py-6 backdrop-blur-xl lg:flex">
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
                active ? "bg-peach/80 text-coffee" : "text-espresso/80 hover:bg-peach/50 hover:text-espresso"
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
        <LearnerPill learnerId={learnerId} courseCount={courses.length} tipPlacement="above" wide />
        <p className="font-display mt-4 px-1 text-sm text-taupe/80 italic">Better learning, brighter future ♡</p>
      </div>
    </aside>
  );
}
