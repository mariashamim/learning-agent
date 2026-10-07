"use client";

import { useState, useEffect, useRef, useSyncExternalStore, type CSSProperties } from "react";
import { CourseList } from "@/components/CourseList";
import { CourseOverview } from "@/components/CourseOverview";
import { CustomCursor } from "@/components/CustomCursor";
import { LibraryCard, ProgressCard, StartCards, ThinkingCard, UpNextCard, matchStarters } from "@/components/Dashboard";
import { ArrowUpRightIcon, SparkleIcon } from "@/components/Icons";
import { LessonView } from "@/components/LessonView";
import { LessonSkeleton, OrbitDots, StatusCycle, TopProgressBar } from "@/components/LoadingIndicator";
import { MagneticButton } from "@/components/MagneticButton";
import { Sidebar } from "@/components/Sidebar";
import { SplitHeading, charCount } from "@/components/SplitHeading";
import { greeting, learningStats } from "@/components/stats";
import { TopBar } from "@/components/TopBar";
import { TopicInput } from "@/components/TopicInput";
import type {
  Answer,
  Course,
  Lesson,
  LessonRow,
  PrefetchState,
  QuizResult,
  TraceStep,
  View,
} from "@/components/types";

const SUGGESTIONS = ["The French Revolution", "Machine learning", "Jazz theory"];

// Page entrance timeline (ms). The heading types in character by character,
// then subtitle → input row → library follow 100ms apart. ~1.4s in total.
const HEADING = "What do you want to learn today?";
const CHAR_START = 50;
const CHAR_STAGGER = 25;
const CHAR_DURATION = 300;
const HEADING_END = CHAR_START + (charCount(HEADING) - 1) * CHAR_STAGGER + CHAR_DURATION;
const SUBTITLE_AT = HEADING_END + 25;
const INPUT_AT = SUBTITLE_AT + 100;
const LIBRARY_AT = INPUT_AT + 100;

const intro = (ms: number) => ({ "--intro-delay": `${ms}ms` }) as CSSProperties;
// Library rows arrive after a fetch; only wait for whatever is left of the intro.
const libraryIntroDelay = () => Math.max(0, LIBRARY_AT - performance.now());

// 128 random bits. getRandomValues works on plain-HTTP origins too, unlike
// crypto.randomUUID, which needs a secure context.
function newLearnerId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return "learner-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Cached so useSyncExternalStore always sees the same value, and so the app
// still works (for this tab) if localStorage is blocked.
let cachedLearnerId: string | null = null;

function getOrCreateLearnerId(): string {
  if (cachedLearnerId) return cachedLearnerId;
  let id: string | null = null;
  try {
    id = localStorage.getItem("learner_id");
    if (!id) {
      id = newLearnerId();
      localStorage.setItem("learner_id", id);
    }
  } catch {
    id ??= newLearnerId();
  }
  cachedLearnerId = id;
  return id;
}
const noSubscribe = () => () => {};

// What /api/learn returns (see TutorResult in src/lib/harness.ts).
type LearnResponse =
  | {
      kind: "lesson";
      course: Course;
      moduleIndex: number;
      lessonId: number | null;
      lesson: Lesson;
      score: number | null;
      passed: boolean;
      saved: boolean;
      resumed: boolean;
      tutorNote: string | null;
      trace: TraceStep[];
    }
  | { kind: "course_complete"; course: Course; trace: TraceStep[] };

/** Reads an API response, turning non-JSON failures (e.g. a gateway timeout page) into readable errors. */
async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new Error(
      response.ok
        ? "The server sent an unreadable response. Please try again."
        : `The server didn't respond in time (HTTP ${response.status}). Please try again.`
    );
  }
}

/** Same normalization as the server's topicKey, so prefetches match requests. */
const topicKey = (topic: string) => topic.trim().replace(/\s+/g, " ").toLowerCase();

export default function Home() {
  const [topic, setTopic] = useState("");
  // localStorage-backed; empty during SSR, filled in on hydration.
  const learnerId = useSyncExternalStore(noSubscribe, getOrCreateLearnerId, () => "");
  // Client-only (the server doesn't know the learner's local hour).
  const hello = useSyncExternalStore(noSubscribe, () => greeting(new Date().getHours()), () => "Hello");
  const dateline = useSyncExternalStore(
    noSubscribe,
    () => new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
    () => ""
  );
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("top");
  const [view, setView] = useState<View | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [library, setLibrary] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Next modules being written in the background, keyed by topic. A click on
  // "Start Module N" awaits the same request instead of starting a second one.
  const prefetches = useRef(new Map<string, Promise<LearnResponse>>());
  const [prefetchState, setPrefetchState] = useState<Record<string, PrefetchState>>({});

  useEffect(() => {
    if (learnerId) loadLibrary(learnerId);
  }, [learnerId]);

  // Highlight the sidebar link for the section last navigated to.
  useEffect(() => {
    const onHash = () => setActiveSection(window.location.hash.slice(1) || "top");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  async function loadLibrary(id: string) {
    const q = `learnerId=${encodeURIComponent(id)}`;
    try {
      const [coursesRes, lessonsRes] = await Promise.all([
        fetch(`/api/courses?${q}`),
        fetch(`/api/lessons?${q}`),
      ]);
      const [coursesData, lessonsData] = await Promise.all([readJson(coursesRes), readJson(lessonsRes)]);
      if (coursesRes.ok) setCourses(coursesData.courses ?? []);
      if (lessonsRes.ok) setLibrary(lessonsData.lessons ?? []);
    } catch (e) {
      console.error("Failed to load library", e);
    }
  }

  function show(next: View) {
    setView(next);
    requestAnimationFrame(() =>
      document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  async function requestLearn(requested: string): Promise<LearnResponse> {
    const response = await fetch("/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: requested, learnerId }),
    });
    const data = await readJson(response);
    if (!response.ok) {
      const extra = data.details ?? data.hint;
      throw new Error(extra ? `${data.error} ${extra}` : data.error);
    }
    return data;
  }

  function setPrefetch(key: string, state: PrefetchState | null) {
    setPrefetchState((s) => {
      const next = { ...s };
      if (state) next[key] = state;
      else delete next[key];
      return next;
    });
  }

  /** Starts writing a course's next module in the background. */
  function prefetchNext(courseTopic: string) {
    const key = topicKey(courseTopic);
    if (prefetches.current.has(key)) return;
    const request = requestLearn(courseTopic);
    prefetches.current.set(key, request);
    setPrefetch(key, "pending");
    request.then(
      () => setPrefetch(key, "ready"),
      () => {
        // Forget a failed prefetch; clicking "Start" will simply try again.
        prefetches.current.delete(key);
        setPrefetch(key, null);
      }
    );
  }

  /** Starts or continues a course: the tutor resumes, plans, or writes the next module. */
  async function learn(requested: string) {
    if (!requested.trim() || loading) return;
    setLoading(true);
    setError("");
    setView(null);
    const key = topicKey(requested);
    const prefetched = prefetches.current.get(key);
    prefetches.current.delete(key);
    setPrefetch(key, null);
    try {
      const data = prefetched
        ? await prefetched.catch(() => requestLearn(requested))
        : await requestLearn(requested);
      const viewKey = Date.now();
      if (data.kind === "course_complete") {
        show({ kind: "course_complete", key: viewKey, course: data.course, trace: data.trace });
      } else {
        show({
          kind: "lesson",
          key: viewKey,
          lesson: data.lesson,
          lessonId: data.lessonId,
          score: typeof data.score === "number" ? data.score : null,
          status: { passed: data.passed, saved: data.saved, resumed: data.resumed },
          course: data.course,
          moduleIndex: data.moduleIndex,
          tutorNote: data.tutorNote,
          trace: data.trace,
        });
      }
      setTopic("");
      loadLibrary(learnerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function submitQuiz(lessonId: number, answers: Answer[]): Promise<QuizResult> {
    const response = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerId, lessonId, answers }),
    });
    const data = await readJson(response);
    if (!response.ok) throw new Error(data.error ?? "Couldn't save your quiz.");
    const result = data as QuizResult;
    // If finishing this quiz unlocked a module that isn't written yet, start
    // writing it now; the tutor already sees these answers.
    const next = result.course?.status === "active" ? result.course.modules[result.course.currentModule] : null;
    if (result.course && next && !next.lesson) prefetchNext(result.course.topic);
    loadLibrary(learnerId);
    return result;
  }

  function openModule(course: Course, moduleIndex: number) {
    const lesson = course.modules[moduleIndex]?.lesson;
    if (!lesson) return;
    setError("");
    show({
      kind: "lesson",
      key: Date.now(),
      lesson: lesson.data,
      lessonId: lesson.id,
      score: lesson.score,
      status: {},
      course,
      moduleIndex,
      tutorNote: null,
      trace: [{ step: "opened_module", courseId: course.id, module: moduleIndex + 1, lessonId: lesson.id }],
    });
  }

  function openPastLesson(row: LessonRow) {
    setError("");
    show({
      kind: "lesson",
      key: Date.now(),
      lesson: row.lesson_data,
      lessonId: row.id,
      score: row.score,
      status: {},
      course: null,
      moduleIndex: null,
      tutorNote: null,
      trace: [{ step: "loaded_from_library", lessonId: row.id, topic: row.topic }],
    });
  }

  const stats = learningStats(courses);
  const q = query.trim().toLowerCase();
  const visibleCourses = q
    ? courses.filter((c) => [c.title, c.topic, ...c.modules.map((m) => m.title)].some((t) => t.toLowerCase().includes(q)))
    : courses;
  const visibleLibrary = q
    ? library.filter((l) => [l.topic, l.lesson_data?.title ?? ""].some((t) => t.toLowerCase().includes(q)))
    : library;
  // Everything saved for this learner: written course modules + single lessons.
  const lessonCount = courses.reduce((n, c) => n + c.modules.filter((m) => m.lesson).length, 0) + library.length;
  const matchingTiles = matchStarters(q).length;
  const pendingKey = Object.entries(prefetchState).find(([, state]) => state === "pending")?.[0];
  const pendingCourse = pendingKey ? courses.find((c) => topicKey(c.topic) === pendingKey) : undefined;

  return (
    <>
      <CustomCursor />
      {loading && <TopProgressBar />}

      <div className="relative z-[1] flex min-h-screen text-espresso">
        <Sidebar
          courses={courses}
          learnerId={learnerId}
          lessonCount={lessonCount}
          activeSection={activeSection}
          onOpenModule={openModule}
        />

        <div className="min-w-0 flex-1">
          <TopBar
            query={query}
            onQuery={setQuery}
            streak={stats.streak}
            learnerId={learnerId}
            lessonCount={lessonCount}
          />

          <div id="top" className="grid scroll-mt-24 gap-6 px-4 pb-20 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
            <main className="min-w-0 pt-8">
              {/* Hero */}
              <section className="max-w-3xl pt-4">
                <div>
                  <div className="intro flex items-center gap-3" style={intro(0)}>
                    <span className="h-[3px] w-10 rounded-full bg-peach" aria-hidden />
                    <p className="text-xs font-medium tracking-[0.18em] text-taupe uppercase">
                      {hello}
                      {dateline && <span className="text-taupe/70"> · {dateline}</span>}
                    </p>
                  </div>
                  <SplitHeading
                    text={HEADING}
                    italicWords={["learn"]}
                    className="font-display mt-5 text-[42px] leading-[1.04] font-medium tracking-tight text-espresso sm:text-6xl xl:text-[68px]"
                  />
                  <p
                    className="intro mt-4 max-w-xl text-[15px] leading-relaxed text-taupe"
                    style={intro(SUBTITLE_AT)}
                  >
                    I&rsquo;m your AI tutor. Name any topic and I&rsquo;ll plan a short course, write
                    each 5&ndash;10 minute module and check it before you see it, then pick up where
                    you left off whenever you come back.
                  </p>
                </div>
              </section>

              {/* Ask card */}
              <div className="intro" style={intro(INPUT_AT)}>
                <form
                  className="ask-card mt-6 rounded-3xl border border-beige/80 bg-paper p-3 sm:p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    learn(topic);
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-peach/70 text-coffee">
                      <SparkleIcon size={18} />
                    </span>
                    <TopicInput value={topic} onChange={setTopic} bare />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-1">
                    {loading ? (
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <OrbitDots />
                        <div className="min-w-0 flex-1 [&>div]:mt-0">
                          <StatusCycle />
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setTopic(s)}
                            className="chip rounded-full border border-beige bg-background px-3 py-1.5 text-xs font-medium text-espresso/80 hover:border-coffee/40 hover:bg-peach/60 hover:text-coffee"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    <MagneticButton
                      type="submit"
                      disabled={loading || !topic.trim()}
                      aria-label={loading ? "Working" : "Learn"}
                      className="ml-auto inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
                    >
                      <span>{loading ? "Working…" : "Learn"}</span>
                      {!loading && <ArrowUpRightIcon size={16} strokeWidth={2.2} className="btn-arrow" />}
                    </MagneticButton>
                  </div>
                </form>
              </div>

              <div className="intro mt-6 pb-4" style={intro(LIBRARY_AT)}>
                {q && (
                  <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-taupe" role="status">
                    <span>
                      Results for <span className="font-semibold text-espresso">&ldquo;{query.trim()}&rdquo;</span>:{" "}
                      {matchingTiles} topic{matchingTiles === 1 ? "" : "s"}, {visibleCourses.length} course
                      {visibleCourses.length === 1 ? "" : "s"}, {visibleLibrary.length} single lesson
                      {visibleLibrary.length === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="rounded-full border border-beige px-2.5 py-0.5 text-xs text-coffee hover:bg-peach/50"
                    >
                      Clear
                    </button>
                  </p>
                )}
                <StartCards onStart={learn} disabled={loading} query={q} />
              </div>

              {loading && <LessonSkeleton />}

              {error && (
                <div
                  role="alert"
                  className="animate-fade-in mt-8 flex gap-3 rounded-2xl border border-red-400/40 bg-red-50 p-4 text-sm text-red-800"
                >
                  <span aria-hidden className="mt-px font-semibold">
                    !
                  </span>
                  <div>
                    <p className="font-semibold">The lesson couldn&rsquo;t be prepared.</p>
                    <p className="mt-1 text-espresso/80">{error}</p>
                  </div>
                </div>
              )}

              {view?.kind === "lesson" && (
                <LessonView
                  key={view.key}
                  view={view}
                  onSubmitQuiz={submitQuiz}
                  nextModuleState={view.course ? prefetchState[topicKey(view.course.topic)] : undefined}
                  onContinue={learn}
                  onOpenModule={openModule}
                />
              )}
              {view?.kind === "course_complete" && (
                <CourseOverview key={view.key} course={view.course} trace={view.trace} onOpenModule={openModule} />
              )}

              {(courses.length > 0 || q) && (
                <CourseList
                  courses={visibleCourses}
                  onContinue={learn}
                  disabled={loading}
                  introDelay={libraryIntroDelay}
                  filtered={!!q}
                />
              )}
            </main>

            <aside className="space-y-5 pt-2 xl:sticky xl:top-[73px] xl:max-h-[calc(100vh-73px)] xl:self-start xl:overflow-y-auto xl:pt-8 xl:pb-6">
              {loading ? (
                <ThinkingCard mode="foreground" label="Your tutor is preparing your module." />
              ) : pendingCourse ? (
                <ThinkingCard
                  mode="background"
                  label={`Writing Module ${pendingCourse.currentModule + 1} of ${pendingCourse.title} in the background.`}
                />
              ) : null}
              <UpNextCard courses={courses} doneToday={stats.doneToday} onContinue={learn} disabled={loading} />
              <ProgressCard stats={stats} courseCount={courses.length} />
              <LibraryCard lessons={visibleLibrary} onOpen={openPastLesson} />
            </aside>
          </div>

          <footer className="border-t border-beige/60 px-8 py-6 text-center text-xs text-taupe">
            Every module is scored by a second pass before it reaches you.
          </footer>
        </div>
      </div>
    </>
  );
}
