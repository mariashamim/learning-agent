"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useAppState } from "@/components/app/AppState";
import { HeroCollage } from "@/components/app/HeroCollage";
import { TopicArt } from "@/components/app/TopicArt";
import { ArrowRightIcon, ArrowUpRightIcon } from "@/components/Icons";
import { inViewOnce, rise, spring, staggerParent } from "@/components/motion/presets";
import { SplitHeading, charCount } from "@/components/SplitHeading";
import { greeting } from "@/components/stats";
import { TopicInput } from "@/components/TopicInput";

const SUGGESTIONS = ["Stoicism", "Black holes", "Game theory", "Jazz harmony"];

// What Weavr actually does, in three lines.
const BENEFITS = [
  { title: "A path, not a pile", body: "Your topic becomes a course in levels, each a few short modules that build on the last." },
  { title: "Lessons built for the topic", body: "Trace code, reshape a curve, weigh evidence: each lesson teaches the way its subject is learned." },
  { title: "It remembers you", body: "Checks are graded as you go, and the next module adapts to what you got wrong." },
];

// Entrance timeline (ms): headline types in, then the paragraph, then the topic box.
const HEADING = "What do you want to learn today?";
const HEADING_END = 50 + (charCount(HEADING) - 1) * 25 + 300;
const intro = (ms: number) => ({ "--intro-delay": `${ms}ms` }) as CSSProperties;
const noSubscribe = () => () => {};

export default function Home() {
  const { learn, busy, courses } = useAppState();
  const [topic, setTopic] = useState("");
  const [focused, setFocused] = useState(false);
  const inputWrap = useRef<HTMLFormElement>(null);
  // Client-only: the server doesn't know the learner's local hour.
  const hello = useSyncExternalStore(noSubscribe, () => greeting(new Date().getHours()), () => "Welcome");

  // The top bar's "Start learning" links to /#ask: put the cursor in the box.
  useEffect(() => {
    const focusAsk = () => {
      if (window.location.hash === "#ask") inputWrap.current?.querySelector("input")?.focus({ preventScroll: false });
    };
    focusAsk();
    window.addEventListener("hashchange", focusAsk);
    return () => window.removeEventListener("hashchange", focusAsk);
  }, []);

  // The one course worth surfacing here: the most recently active, unfinished one.
  const current = courses.find((c) => c.status === "active");
  const done = current ? current.modules.filter((m) => m.lesson?.completed).length : 0;

  return (
    <main>
      {/* ---------- Hero (ink) ---------- */}
      <section className="surface-ink hero-ink relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pb-24">
          <div className="meta-line intro" style={intro(0)}>
            <span>An AI tutor with a memory</span>
            <span className="rule hidden sm:block" />
            <span className="hidden sm:inline">[ Learn anything, in levels ]</span>
            <span className="rule" />
            <span>{hello}</span>
          </div>

          <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-6">
            <div>
              <SplitHeading
                text={HEADING}
                italicWords={["learn"]}
                className="font-display text-[clamp(46px,7.2vw,104px)] leading-[0.94] text-sand"
              />
              <p className="intro mt-7 max-w-lg text-[17px] leading-relaxed text-taupe" style={intro(HEADING_END)}>
                Name any topic. Your tutor plans a course in levels, writes each ten-minute module for
                its subject, checks it before you see it, and remembers where you left off.
              </p>

              <motion.form
                ref={inputWrap}
                id="ask"
                className="intro ask-card mt-9 max-w-xl scroll-mt-28 rounded-full border border-beige bg-paper p-1.5 pl-5"
                style={intro(HEADING_END + 120)}
                data-focused={focused || undefined}
                animate={{ y: focused ? -3 : 0 }}
                transition={spring.gentle}
                onFocus={() => setFocused(true)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  learn(topic);
                }}
              >
                <div className="flex items-center gap-2">
                  <TopicInput value={topic} onChange={setTopic} bare />
                  <button
                    type="submit"
                    disabled={!!busy || !topic.trim()}
                    className="btn-primary inline-flex h-12 flex-shrink-0 items-center gap-2 rounded-full px-6 text-sm font-semibold"
                  >
                    Learn
                    <ArrowUpRightIcon size={16} strokeWidth={2.2} className="btn-arrow" />
                  </button>
                </div>
              </motion.form>

              <div className="intro mt-5 flex flex-wrap items-center gap-2" style={intro(HEADING_END + 200)}>
                <span className="text-xs text-taupe">Try</span>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTopic(s)}
                    className="chip rounded-full border border-beige px-3 py-1.5 text-xs text-sand/85 hover:border-gold/60 hover:text-gold"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <HeroCollage className="mx-auto aspect-square w-full max-w-[560px]" />
          </div>
        </div>
      </section>

      {/* ---------- What it is (cream) ---------- */}
      <section className="surface-cream">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="meta-line">
            <span>[ How Weavr teaches ]</span>
            <span className="rule" />
            <span>01 — 03</span>
          </div>
          <motion.p
            className="mt-12 max-w-4xl text-[clamp(26px,3.4vw,46px)] leading-[1.15] tracking-[-0.02em] text-sand"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={inViewOnce}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            A tutor with one goal: teaching you anything the way it&rsquo;s{" "}
            <span className="accent-word">best learned</span>.{" "}
            <span className="text-taupe">
              It plans the path, writes each lesson for its subject, and remembers what you got wrong.
            </span>
          </motion.p>

          <motion.ol
            className="mt-16 grid gap-8 sm:grid-cols-3"
            variants={staggerParent(0.12, 0.1)}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            {BENEFITS.map((b, i) => (
              <motion.li key={b.title} variants={rise} className="border-t border-beige pt-5">
                <span className="text-sm text-berry">({String(i + 1).padStart(2, "0")})</span>
                <p className="font-display mt-3 text-2xl text-sand">{b.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-taupe">{b.body}</p>
              </motion.li>
            ))}
          </motion.ol>

          {current && (
            <Link
              href={`/courses/${current.id}`}
              className="continue-card group mt-16 flex items-center gap-5 rounded-3xl border border-beige bg-paper p-5 hover:border-gold/60"
            >
              <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-ink">
                <TopicArt topic={current.topic} className="h-12 w-12" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs tracking-[0.14em] text-taupe uppercase">Pick up where you left off</span>
                <span className="font-display mt-1 block truncate text-2xl text-sand">{current.title}</span>
                <span className="mt-2 flex items-center gap-3">
                  <span className="h-1.5 max-w-xs flex-1 overflow-hidden rounded-full bg-well">
                    <span className="block h-full rounded-full bg-gold" style={{ width: `${(done / current.modules.length) * 100}%` }} />
                  </span>
                  <span className="text-xs text-taupe tabular-nums">
                    {done}/{current.modules.length} modules
                  </span>
                </span>
              </span>
              <ArrowRightIcon size={20} className="text-gold transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </section>

      {/* ---------- Closing band (ink) ---------- */}
      <section className="surface-ink">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
          <p className="font-display max-w-4xl text-[clamp(38px,5.6vw,80px)] leading-[0.98] text-sand">
            Let&rsquo;s learn something <span className="accent-word">worth</span> knowing.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href="#ask" className="btn-primary rounded-full px-6 py-3 text-sm font-semibold">
              Name a topic
            </a>
            <Link href="/courses" className="text-sm text-sand underline decoration-beige underline-offset-4 hover:decoration-gold">
              Browse courses
            </Link>
          </div>
          <div className="meta-line mt-16">
            <span>Weavr</span>
            <span className="rule" />
            <span>[ An AI tutor with a memory ]</span>
            <span className="rule" />
            <span>2026</span>
          </div>
        </div>
      </section>
    </main>
  );
}
