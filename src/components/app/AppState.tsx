"use client";

// App-wide state shared by every page: who the learner is, their courses,
// the tutor request (with background prefetch), quiz saving, and bookmarks.

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Answer, Course, Lesson, LessonRow, LessonStatus, PrefetchState, QuizResult, TraceStep } from "../types";
import { levelsOf, moduleLabel } from "@/lib/courseHierarchy";

// ---------- learner identity (browser-local) ----------

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

/** Same normalization as the server's topicKey, so prefetches and bookmarks match. */
export const topicKey = (topic: string) => topic.trim().replace(/\s+/g, " ").toLowerCase();

// ---------- API shapes ----------

// What /api/learn returns (see TutorResult in src/lib/harness.ts).
export type LearnResponse =
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

/** What the last tutor run said about a module (shown on its page). */
export type ModuleRun = {
  lesson: Lesson;
  lessonId: number | null;
  score: number | null;
  status: LessonStatus;
  tutorNote: string | null;
  trace: TraceStep[];
};

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

/** The learner's courses and single lessons. A failed half comes back undefined. */
async function fetchLibrary(learnerId: string): Promise<{ courses?: Course[]; lessons?: LessonRow[] }> {
  const q = `learnerId=${encodeURIComponent(learnerId)}`;
  try {
    const [coursesRes, lessonsRes] = await Promise.all([fetch(`/api/courses?${q}`), fetch(`/api/lessons?${q}`)]);
    const [coursesData, lessonsData] = await Promise.all([readJson(coursesRes), readJson(lessonsRes)]);
    return {
      courses: coursesRes.ok ? (coursesData.courses ?? []) : undefined,
      lessons: lessonsRes.ok ? (lessonsData.lessons ?? []) : undefined,
    };
  } catch (e) {
    console.error("Failed to load courses", e);
    return {};
  }
}

// ---------- bookmarks (browser-local, per learner) ----------

export type Bookmark = { key: string; topic: string };
// Storage key keeps the app's old name on purpose: renaming it would lose
// bookmarks already saved in learners' browsers.
const BOOKMARK_EVENT = "studybuddy-bookmarks";
const bookmarkStorageKey = (learnerId: string) => `studybuddy:bookmarks:${learnerId}`;

function subscribeBookmarks(onChange: () => void) {
  window.addEventListener(BOOKMARK_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(BOOKMARK_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function readBookmarksRaw(learnerId: string) {
  if (!learnerId) return "[]";
  try {
    return localStorage.getItem(bookmarkStorageKey(learnerId)) ?? "[]";
  } catch {
    return "[]";
  }
}

// ---------- context ----------

/**
 * A tutor run in progress. The API reports nothing until it finishes, so the
 * UI knows only what kind of run it is and how long it has taken: no stages.
 */
type Busy = { topic: string; label: string; kind: "plan" | "module"; startedAt: number };

/** Rejects with an AbortError when `signal` aborts, without cancelling `promise` itself. */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Stopped waiting", "AbortError"));
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

type AppStateValue = {
  learnerId: string;
  loaded: boolean;
  courses: Course[];
  library: LessonRow[];
  refresh: () => Promise<void>;
  busy: Busy | null;
  error: string;
  clearError: () => void;
  /** Stops waiting for the current tutor run (the server may still finish it). */
  cancelLearn: () => void;
  /** Re-runs the request that last failed, if any. */
  retryLearn: (() => void) | null;
  /** Runs the tutor for a topic, then opens the module (or the course page). */
  learn: (topic: string, landing?: "module" | "course") => Promise<void>;
  submitQuiz: (lessonId: number, answers: Answer[]) => Promise<QuizResult>;
  prefetchState: (topic: string) => PrefetchState | undefined;
  /** The course whose next module is being written in the background, if any. */
  backgroundCourse: Course | undefined;
  moduleRun: (courseId: number, moduleIndex: number) => ModuleRun | undefined;
  bookmarks: Bookmark[];
  isBookmarked: (topic: string) => boolean;
  toggleBookmark: (topic: string) => void;
  courseFor: (topic: string) => Course | undefined;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside <AppStateProvider>");
  return value;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // localStorage-backed; empty during SSR, filled in on hydration.
  const learnerId = useSyncExternalStore(noSubscribe, getOrCreateLearnerId, () => "");
  const [courses, setCourses] = useState<Course[]>([]);
  const [library, setLibrary] = useState<LessonRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState<{ topic: string; landing: "module" | "course" } | null>(null);
  const runAbort = useRef<AbortController | null>(null);
  const [runs, setRuns] = useState<Record<string, ModuleRun>>({});
  // Next modules being written in the background, keyed by topic. A click on
  // "Start Module N" awaits the same request instead of starting a second one.
  const prefetches = useRef(new Map<string, Promise<LearnResponse>>());
  const [prefetching, setPrefetching] = useState<Record<string, PrefetchState>>({});

  const applyLibrary = useCallback((data: Awaited<ReturnType<typeof fetchLibrary>>) => {
    if (data.courses) setCourses(data.courses);
    if (data.lessons) setLibrary(data.lessons);
    setLoaded(true);
  }, []);

  const refresh = useCallback(async () => {
    if (learnerId) applyLibrary(await fetchLibrary(learnerId));
  }, [learnerId, applyLibrary]);

  // Initial load; state is set only once the fetch resolves.
  useEffect(() => {
    if (!learnerId) return;
    let cancelled = false;
    fetchLibrary(learnerId).then((data) => {
      if (!cancelled) applyLibrary(data);
    });
    return () => {
      cancelled = true;
    };
  }, [learnerId, applyLibrary]);

  const requestLearn = useCallback(
    async (topic: string): Promise<LearnResponse> => {
      const response = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, learnerId }),
      });
      const data = await readJson(response);
      if (!response.ok) {
        const extra = data.details ?? data.hint;
        throw new Error(extra ? `${data.error} ${extra}` : data.error);
      }
      return data;
    },
    [learnerId]
  );

  const setPrefetch = (key: string, state: PrefetchState | null) =>
    setPrefetching((s) => {
      const next = { ...s };
      if (state) next[key] = state;
      else delete next[key];
      return next;
    });

  const rememberRun = (data: LearnResponse) => {
    if (data.kind !== "lesson") return;
    setRuns((r) => ({
      ...r,
      [`${data.course.id}:${data.moduleIndex}`]: {
        lesson: data.lesson,
        lessonId: data.lessonId,
        score: typeof data.score === "number" ? data.score : null,
        status: { passed: data.passed, saved: data.saved, resumed: data.resumed },
        tutorNote: data.tutorNote,
        trace: data.trace,
      },
    }));
  };

  /** Starts writing a course's next module in the background. */
  const prefetchNext = (courseTopic: string) => {
    const key = topicKey(courseTopic);
    if (prefetches.current.has(key)) return;
    const request = requestLearn(courseTopic);
    prefetches.current.set(key, request);
    setPrefetch(key, "pending");
    request.then(
      (data) => {
        rememberRun(data);
        setPrefetch(key, "ready");
        refresh();
      },
      () => {
        // Forget a failed prefetch; clicking "Start" will simply try again.
        prefetches.current.delete(key);
        setPrefetch(key, null);
      }
    );
  };

  const courseFor = (topic: string) => courses.find((c) => topicKey(c.topic) === topicKey(topic));

  const learn = async (topic: string, landing: "module" | "course" = "module") => {
    if (!topic.trim() || busy) return;
    const key = topicKey(topic);
    const existing = courseFor(topic);
    setBusy({
      topic,
      kind: existing ? "module" : "plan",
      startedAt: Date.now(),
      label: existing
        ? `Preparing ${moduleLabel(levelsOf(existing), Math.min(existing.currentModule, existing.modules.length - 1))} of ${existing.title}`
        : `Planning a course on ${topic.trim()}`,
    });
    setError("");
    setFailed(null);
    const abort = new AbortController();
    runAbort.current = abort;
    const prefetched = prefetches.current.get(key);
    prefetches.current.delete(key);
    setPrefetch(key, null);
    try {
      const request = prefetched ? prefetched.catch(() => requestLearn(topic)) : requestLearn(topic);
      const data = await untilAborted(request, abort.signal);
      rememberRun(data);
      await refresh();
      if (data.kind === "course_complete" || landing === "course") {
        router.push(`/courses/${data.course.id}`);
      } else {
        router.push(`/courses/${data.course.id}/${data.moduleIndex + 1}`);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // The server keeps going: whatever it finishes is saved and shows up
        // on the next visit (an unfinished module resumes without new work).
        setTimeout(() => refresh(), 30_000);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setFailed({ topic, landing });
      }
    } finally {
      runAbort.current = null;
      setBusy(null);
    }
  };

  const submitQuiz = async (lessonId: number, answers: Answer[]): Promise<QuizResult> => {
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
    refresh();
    return result;
  };

  // Bookmarks live in localStorage per learner; the raw string is the snapshot
  // (stable between changes), parsed once per change.
  const bookmarksRaw = useSyncExternalStore(
    subscribeBookmarks,
    () => readBookmarksRaw(learnerId),
    () => "[]"
  );
  const bookmarks = useMemo<Bookmark[]>(() => {
    try {
      const parsed = JSON.parse(bookmarksRaw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [bookmarksRaw]);

  const toggleBookmark = (topic: string) => {
    const key = topicKey(topic);
    const next = bookmarks.some((b) => b.key === key)
      ? bookmarks.filter((b) => b.key !== key)
      : [...bookmarks, { key, topic: topic.trim() }];
    try {
      localStorage.setItem(bookmarkStorageKey(learnerId), JSON.stringify(next));
    } catch {
      /* storage blocked: bookmarks just won't persist */
    }
    window.dispatchEvent(new Event(BOOKMARK_EVENT));
  };

  const pendingKey = Object.entries(prefetching).find(([, s]) => s === "pending")?.[0];

  const value: AppStateValue = {
    learnerId,
    loaded,
    courses,
    library,
    refresh,
    busy,
    error,
    clearError: () => {
      setError("");
      setFailed(null);
    },
    cancelLearn: () => runAbort.current?.abort(),
    retryLearn: failed && !busy ? () => learn(failed.topic, failed.landing) : null,
    learn,
    submitQuiz,
    prefetchState: (topic) => prefetching[topicKey(topic)],
    backgroundCourse: pendingKey ? courses.find((c) => topicKey(c.topic) === pendingKey) : undefined,
    moduleRun: (courseId, moduleIndex) => runs[`${courseId}:${moduleIndex}`],
    bookmarks,
    isBookmarked: (topic) => bookmarks.some((b) => b.key === topicKey(topic)),
    toggleBookmark,
    courseFor,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
