"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CustomCursor } from "../CustomCursor";
import { BookIcon, ChartIcon, HomeIcon, LibraryIcon } from "../Icons";
import { LearnerPill } from "../LearnerPill";
import { TopProgressBar } from "../LoadingIndicator";
import { spring } from "../motion/presets";
import { WovenThreads } from "../motion/WovenThreads";
import { AppStateProvider, useAppState } from "./AppState";

const NAV = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/courses", label: "Courses", Icon: BookIcon },
  { href: "/progress", label: "Progress", Icon: ChartIcon },
  { href: "/library", label: "Library", Icon: LibraryIcon },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/**
 * The Weavr mark (bird and woven loops) on a transparent background. Uses the
 * dark-background variant: the same artwork with the loops lifted to lavender
 * and orchid and the bird brightened, so it reads on deep purple.
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span className="logo-mark flex flex-shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      <Image src="/brand/weavr-mark-dark.webp" alt="" width={size} height={size} className="h-full w-full object-contain" priority />
    </span>
  );
}

/** "Weavr" in two tones, echoing the logo's wordmark. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-sans font-bold tracking-tight text-sand ${className}`}>
      Wea<span className="text-gold">vr</span>
    </span>
  );
}

export function Brand() {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span className="transition-transform duration-300 group-hover:-rotate-6">
        <LogoMark />
      </span>
      <span className="leading-tight">
        <Wordmark className="block text-2xl leading-none" />
        <span className="block text-[11px] text-taupe">an AI tutor with a memory</span>
      </span>
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { learnerId, courses, library } = useAppState();
  const lessonCount = courses.reduce((n, c) => n + c.modules.filter((m) => m.lesson).length, 0) + library.length;

  return (
    <aside className="sidebar sticky top-0 hidden h-screen w-[248px] flex-shrink-0 flex-col border-r border-beige/60 bg-ink/40 px-5 py-7 lg:flex">
      <Brand />
      <nav className="mt-10 space-y-1.5" aria-label="Main">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`nav-link flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium ${
                active ? "nav-active bg-gold/15 text-gold" : "text-sand/80 hover:bg-sand/10 hover:text-sand"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <LearnerPill learnerId={learnerId} lessonCount={lessonCount} tipPlacement="above" wide />
      </div>
    </aside>
  );
}

/** Phones: brand on top, tabs along the bottom. */
function MobileNav() {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-beige/60 bg-ink/80 px-4 py-3 lg:hidden">
        <Brand />
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-beige/60 bg-ink/95 pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Main"
      >
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-gold" : "text-sand/70"}`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// What a run does, in order. Shown as a description, not as progress: the
// API reports nothing until the run is finished, so nothing here ticks off.
const RUN_STEPS = {
  plan: [
    "Plans the course as levels of short modules",
    "Writes the first module's lesson",
    "A second model checks it, and it's revised if it falls short",
  ],
  module: [
    "Looks at how your earlier checks went",
    "Writes this module's lesson",
    "A second model checks it, and it's revised if it falls short",
  ],
};
const USUAL_SECONDS = 120;

function useElapsedSeconds(since: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.floor((now - since) / 1000));
}

/**
 * Full-screen "tutor is working" state. Honest about what it knows: the kind
 * of run, how long it has taken, and that you can stop waiting.
 */
function BusyOverlay() {
  const { busy } = useAppState();
  return <AnimatePresence>{busy && <BusyDialog key={busy.startedAt} busy={busy} />}</AnimatePresence>;
}

function BusyDialog({ busy }: { busy: NonNullable<ReturnType<typeof useAppState>["busy"]> }) {
  const { cancelLearn } = useAppState();
  const elapsed = useElapsedSeconds(busy.startedAt);
  const stopRef = useRef<HTMLButtonElement>(null);
  // Move focus into the dialog, and give it back to where it was on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    stopRef.current?.focus();
    return () => previous?.focus?.();
  }, []);
  const minutes = Math.floor(elapsed / 60);
  const clock = `${minutes}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <motion.div
      className="busy-overlay fixed inset-0 z-50 flex items-center justify-center bg-ink/75 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="busy-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancelLearn();
      }}
    >
      <motion.div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-beige bg-paper shadow-2xl"
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: spring.gentle }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
      >
        <div className="relative h-36 bg-gradient-to-br from-violet/40 via-ink/60 to-magenta/30">
          <WovenThreads className="absolute inset-0 h-full w-full" />
        </div>
        <div className="p-7">
          <p id="busy-title" className="font-display text-2xl leading-snug text-sand">
            {busy.label}
          </p>
          <p className="mt-1 text-sm text-taupe">Your tutor is working on it. This usually takes one to two minutes.</p>
          <ol className="mt-5 space-y-2 text-sm text-sand/85">
            {RUN_STEPS[busy.kind].map((step, i) => (
              <motion.li
                key={step}
                className="flex gap-3"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.15 + i * 0.08, ...spring.gentle } }}
              >
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-gold/40 text-[10px] text-gold">
                  {i + 1}
                </span>
                {step}
              </motion.li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-beige/60 pt-4">
            <span className="text-xs text-taupe" aria-live="off">
              <span className="font-mono tabular-nums text-sand">{clock}</span>
              {elapsed > USUAL_SECONDS ? " · taking longer than usual" : " elapsed"}
            </span>
            <button
              ref={stopRef}
              type="button"
              onClick={cancelLearn}
              className="rounded-full border border-beige px-4 py-1.5 text-xs font-medium text-sand/85 hover:border-gold/60 hover:text-gold"
            >
              Stop waiting
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-taupe/80">
            Stopping only stops the wait here. Your tutor may still finish, and the module will be ready when you come back.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ErrorBanner() {
  const { error, clearError, retryLearn } = useAppState();
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          role="alert"
          className="mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0, transition: spring.gentle }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
        >
          <span aria-hidden className="font-bold">!</span>
          <div className="flex-1">
            <p className="font-semibold">The lesson couldn&rsquo;t be prepared.</p>
            <p className="mt-1 text-red-100/80">{error}</p>
          </div>
          <div className="flex flex-shrink-0 gap-1">
            {retryLearn && (
              <button type="button" onClick={retryLearn} className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-50 hover:bg-red-500/30">
                Try again
              </button>
            )}
            <button type="button" onClick={clearError} className="rounded-lg px-2 py-1 text-xs text-red-100 hover:bg-red-500/20">
              Dismiss
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { busy } = useAppState();
  return (
    <>
      <CustomCursor />
      {busy && <TopProgressBar />}
      <div className="relative z-[1] flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1 pb-20 lg:pb-0">
          <MobileNav />
          <div className="px-4 sm:px-6 lg:px-10">
            <ErrorBanner />
          </div>
          {children}
        </div>
      </div>
      <BusyOverlay />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    // reducedMotion="user": with the OS setting on, Motion drops transform and
    // layout animation app-wide (opacity still fades); CSS has its own rule.
    <MotionConfig reducedMotion="user">
      <AppStateProvider>
        <Shell>{children}</Shell>
      </AppStateProvider>
    </MotionConfig>
  );
}
