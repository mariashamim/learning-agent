"use client";

import { useState, useEffect, useSyncExternalStore, type CSSProperties } from "react";
import { CustomCursor } from "@/components/CustomCursor";
import { LessonView } from "@/components/LessonView";
import { Library } from "@/components/Library";
import { LessonSkeleton, OrbitDots, StatusCycle, TopProgressBar } from "@/components/LoadingIndicator";
import { MagneticButton } from "@/components/MagneticButton";
import { SiteHeader } from "@/components/SiteHeader";
import { SplitHeading, charCount } from "@/components/SplitHeading";
import { TopicInput } from "@/components/TopicInput";
import type { Lesson, LessonRow, LessonStatus, TraceStep } from "@/components/types";

const SUGGESTIONS = ["Stoicism", "Game Theory", "Epistemology", "Photosynthesis"];

// Page entrance timeline (ms). The heading types in character by character,
// then subtitle → input row → library follow 100ms apart. ~1.4s in total.
const HEADING = "What do you want to learn?";
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

export default function Home() {
  const [topic, setTopic] = useState("");
  // localStorage-backed; empty during SSR, filled in on hydration.
  const learnerId = useSyncExternalStore(noSubscribe, getOrCreateLearnerId, () => "");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonScore, setLessonScore] = useState<number | null>(null);
  const [lessonStatus, setLessonStatus] = useState<LessonStatus>({});
  const [lessonKey, setLessonKey] = useState(0);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [library, setLibrary] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (learnerId) loadLibrary(learnerId);
  }, [learnerId]);

  async function loadLibrary(id: string) {
    try {
      const res = await fetch(`/api/lessons?learnerId=${encodeURIComponent(id)}`);
      const data = await readJson(res);
      if (res.ok) setLibrary(data.lessons ?? []);
    } catch (e) {
      console.error("Failed to load library", e);
    }
  }

  async function createLesson() {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError("");
    setLesson(null);
    try {
      const response = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, learnerId }),
      });
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(data.details ? `${data.error} (${data.details})` : data.error);
      }
      setLesson(data.lesson);
      setTrace(data.trace);
      setLessonScore(typeof data.score === "number" ? data.score : null);
      setLessonStatus({ passed: data.passed, saved: data.saved });
      setLessonKey((k) => k + 1);
      loadLibrary(learnerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function openPastLesson(row: LessonRow) {
    setError("");
    setLesson(row.lesson_data);
    setLessonScore(row.score);
    setLessonStatus({});
    setLessonKey((k) => k + 1);
    setTrace([{ step: "loaded_from_library", lessonId: row.id, topic: row.topic }]);
    requestAnimationFrame(() =>
      document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  return (
    <>
      <CustomCursor />
      {loading && <TopProgressBar />}

      <main className="relative z-[1] min-h-screen text-espresso">
        <SiteHeader learnerId={learnerId} lessonCount={library.length} />

        <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
          {/* Hero */}
          <section className="pt-12 sm:pt-20">
            <p className="intro text-xs font-medium uppercase tracking-[0.2em] text-taupe" style={intro(0)}>
              A lesson in ten minutes or less
            </p>
            <SplitHeading
              text={HEADING}
              italicWords={["learn?"]}
              className="font-display mt-4 text-4xl leading-[1.08] font-medium tracking-tight text-espresso sm:text-6xl"
            />
            <p
              className="intro mt-5 max-w-xl text-[15px] leading-relaxed text-coffee sm:text-base"
              style={intro(SUBTITLE_AT)}
            >
              Name any topic. The agent drafts a short lesson, has it reviewed before you see it, and
              remembers what you&rsquo;ve studied for next time.
            </p>

            <div className="intro" style={intro(INPUT_AT)}>
              {/* Orbiting dots sit above the input while the harness runs. */}
              <div className="mt-6 flex h-6 items-center">{loading && <OrbitDots />}</div>

              <form
                className="mt-1 flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  createLesson();
                }}
              >
                <TopicInput value={topic} onChange={setTopic} />
                <MagneticButton
                  type="submit"
                  disabled={loading || !topic.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-[14px] px-7 py-3.5 font-medium"
                >
                  <span>{loading ? "Working…" : "Learn"}</span>
                  {!loading && (
                    <span aria-hidden className="btn-arrow">
                      →
                    </span>
                  )}
                </MagneticButton>
              </form>

              {loading ? (
                <StatusCycle />
              ) : (
                !lesson && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-taupe">Try</span>
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTopic(s)}
                        className="rounded-full border border-beige/80 bg-paper/60 px-3 py-1 text-xs text-coffee transition-colors duration-200 hover:border-taupe hover:bg-peach/50 hover:text-espresso"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </section>

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

          {lesson && <LessonView
              key={lessonKey}
              lesson={lesson}
              score={lessonScore}
              status={lessonStatus}
              trace={trace}
            />}

          {library.length > 0 && (
            <Library library={library} onOpen={openPastLesson} introDelay={libraryIntroDelay} />
          )}
        </div>

        <footer className="border-t border-beige/60 py-8 text-center text-xs text-taupe">
          Every lesson is scored by a second pass before it reaches you.
        </footer>
      </main>
    </>
  );
}
