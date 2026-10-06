"use client";

import { useState, useEffect } from "react";

type Lesson = {
  title: string;
  objective: string;
  estimatedMinutes: number;
  concepts: { name: string; explanation: string; example: string }[];
  questions: { question: string; options: string[]; correctAnswer: string; explanation: string }[];
};

type LessonRow = {
  id: number;
  topic: string;
  score: number | null;
  created_at: string;
  lesson_data: Lesson;
};

function getOrCreateLearnerId(): string {
  if (typeof window === "undefined") return "demo-user";
  let id = localStorage.getItem("learner_id");
  if (!id) {
    id = "learner-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("learner_id", id);
  }
  return id;
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [learnerId, setLearnerId] = useState<string>("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [trace, setTrace] = useState<any[]>([]);
  const [library, setLibrary] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLearnerId(getOrCreateLearnerId());
  }, []);

  useEffect(() => {
    if (learnerId) loadLibrary(learnerId);
  }, [learnerId]);

  async function loadLibrary(id: string) {
    try {
      const res = await fetch(`/api/lessons?learnerId=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (res.ok) setLibrary(data.lessons ?? []);
    } catch (e) {
      console.error("Failed to load library", e);
    }
  }

  async function createLesson() {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setLesson(null);
    try {
      const response = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, learnerId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error);
      setLesson(data.lesson);
      setTrace(data.trace);
      loadLibrary(learnerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function openPastLesson(row: LessonRow) {
    setLesson(row.lesson_data);
    setTrace([{ step: "loaded_from_library", lessonId: row.id, topic: row.topic }]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen bg-[#faf5ef] text-[#3a2a1e]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#664930] font-bold text-[#FFDBBB] shadow-sm">
              L
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#3a2a1e]">Learning Agent</h1>
              <p className="text-xs text-[#997E67]">agentic tutor · persistent memory</p>
            </div>
          </div>
          {learnerId && (
            <span className="rounded-full border border-[#CCBEB1] bg-white/70 px-3 py-1 text-xs text-[#664930]">
              {learnerId}
            </span>
          )}
        </header>

        {/* Hero */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold tracking-tight text-[#3a2a1e]">
            What do you want to learn?
          </h2>
          <p className="mt-2 text-sm text-[#664930]">
            Enter any topic. The agent will design a 5–10 minute interactive lesson and remember
            it for next time.
          </p>
        </div>

        {/* Input */}
        <div className="mt-6 flex gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createLesson()}
            placeholder="e.g. Stoicism, Epistemology, Game Theory…"
            className="flex-1 rounded-xl border border-[#CCBEB1] bg-white px-4 py-3 text-[#3a2a1e] placeholder-[#997E67] outline-none transition focus:border-[#997E67] focus:ring-2 focus:ring-[#FFDBBB]"
          />
          <button
            onClick={createLesson}
            disabled={loading}
            className="rounded-xl bg-[#664930] px-6 py-3 font-medium text-[#FFDBBB] shadow-sm transition hover:bg-[#553c27] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Working…" : "Learn"}
          </button>
        </div>

        {loading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-[#664930]">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#997E67] animate-dot-1" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#997E67] animate-dot-2" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#997E67] animate-dot-3" />
            </span>
            generating · evaluating · saving
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}

        {/* Library */}
        {library.length > 0 && (
          <section className="mt-12">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-medium uppercase tracking-wider text-[#997E67]">
                My Lessons
              </h3>
              <span className="text-xs text-[#997E67]">{library.length} saved</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {library.map((row) => (
                <button
                  key={row.id}
                  onClick={() => openPastLesson(row)}
                  className="group rounded-xl border border-[#CCBEB1] bg-white p-4 text-left transition hover:border-[#997E67] hover:bg-[#FFDBBB]/30"
                >
                  <div className="font-medium capitalize text-[#3a2a1e]">{row.topic}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[#997E67]">
                    <span>{new Date(row.created_at).toLocaleDateString()}</span>
                    {row.score != null && (
                      <>
                        <span>·</span>
                        <span className="rounded-md bg-[#FFDBBB] px-1.5 py-0.5 text-[#664930]">
                          score {row.score}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Lesson display */}
        {lesson && (
          <article className="mt-12 animate-fade-in space-y-8">
            <header>
              <p className="text-xs uppercase tracking-wider text-[#997E67]">
                {lesson.estimatedMinutes} minute lesson
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#3a2a1e]">
                {lesson.title}
              </h2>
              <p className="mt-3 text-[#664930]">{lesson.objective}</p>
            </header>

            {lesson.concepts.map((c) => (
              <section
                key={c.name}
                className="rounded-2xl border border-[#CCBEB1] bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-[#3a2a1e]">{c.name}</h3>
                <p className="mt-3 leading-relaxed text-[#3a2a1e]">{c.explanation}</p>
                <div className="mt-4 rounded-xl border border-[#CCBEB1] bg-[#FFDBBB]/40 p-4 text-sm">
                  <span className="font-medium text-[#664930]">Example · </span>
                  <span className="text-[#3a2a1e]">{c.example}</span>
                </div>
              </section>
            ))}

            {lesson.questions.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold text-[#3a2a1e]">
                  Check your understanding
                </h3>
                <div className="mt-4 space-y-4">
                  {lesson.questions.map((q, i) => (
                    <QuizQuestion key={i} index={i} question={q} />
                  ))}
                </div>
              </section>
            )}

            <details className="rounded-2xl border border-[#CCBEB1] bg-white p-5 shadow-sm">
              <summary className="cursor-pointer text-sm font-medium text-[#664930] hover:text-[#3a2a1e]">
                Harness trace
              </summary>
              <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-[#3a2a1e] p-4 text-xs text-[#FFDBBB]">
                {JSON.stringify(trace, null, 2)}
              </pre>
            </details>
          </article>
        )}
      </div>
    </main>
  );
}

function QuizQuestion({
  question,
  index,
}: {
  question: { question: string; options: string[]; correctAnswer: string; explanation: string };
  index: number;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === question.correctAnswer;

  return (
    <div className="rounded-2xl border border-[#CCBEB1] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#FFDBBB] text-xs font-semibold text-[#664930]">
          {index + 1}
        </span>
        <p className="font-medium text-[#3a2a1e]">{question.question}</p>
      </div>
      <div className="mt-4 space-y-2">
        {question.options.map((o) => {
          const isPicked = picked === o;
          const isCorrect = o === question.correctAnswer;
          let cls =
            "block w-full rounded-xl border px-4 py-3 text-left text-sm transition ";
          if (picked === null) {
            cls +=
              "border-[#CCBEB1] bg-[#faf5ef] text-[#3a2a1e] hover:border-[#997E67] hover:bg-[#FFDBBB]/30";
          } else if (isCorrect) {
            cls += "border-emerald-500 bg-emerald-50 text-emerald-800";
          } else if (isPicked) {
            cls += "border-red-400 bg-red-50 text-red-800";
          } else {
            cls += "border-[#CCBEB1] bg-[#faf5ef] text-[#997E67] opacity-60";
          }
          return (
            <button
              key={o}
              disabled={picked !== null}
              onClick={() => setPicked(o)}
              className={cls}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div
          className={`mt-4 rounded-xl border p-4 text-sm ${
            correct
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          <div className="font-medium">{correct ? "✓ Correct" : "✗ Not quite"}</div>
          <p className="mt-1 text-[#3a2a1e]">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}