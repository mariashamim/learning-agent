"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CustomCursor } from "../CustomCursor";
import { BookIcon, ChartIcon, HomeIcon, LibraryIcon } from "../Icons";
import { LearnerPill } from "../LearnerPill";
import { OrbitDots, StatusCycle, TopProgressBar } from "../LoadingIndicator";
import { AppStateProvider, useAppState } from "./AppState";

const NAV = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/courses", label: "Courses", Icon: BookIcon },
  { href: "/progress", label: "Progress", Icon: ChartIcon },
  { href: "/library", label: "Library", Icon: LibraryIcon },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/**
 * The Weavr mark (bird and woven loops) on a light tile. The tile keeps the
 * logo's dark-purple strands visible against the app's dark background.
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="logo-mark flex flex-shrink-0 items-center justify-center rounded-xl bg-[#fbf5ec]"
      style={{ width: size, height: size, padding: size * 0.09 }}
      aria-hidden
    >
      <Image src="/brand/weavr-mark.webp" alt="" width={size} height={size} className="h-full w-full object-contain" priority />
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

/** Full-screen "tutor is working" state while a course or module is prepared. */
function BusyOverlay() {
  const { busy } = useAppState();
  if (!busy) return null;
  return (
    <div className="busy-overlay fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4" role="dialog" aria-modal="true" aria-label="Preparing your lesson">
      <div className="animate-fade-in w-full max-w-md rounded-3xl border border-beige bg-paper p-8 text-center shadow-2xl">
        <div className="busy-orb mx-auto mb-6" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <p className="font-display text-2xl text-sand">{busy.label}</p>
        <p className="mt-2 text-sm text-taupe">Your tutor writes it, a second pass checks it, then it&rsquo;s yours.</p>
        <div className="mt-6 flex items-center justify-center gap-3 text-left">
          <OrbitDots />
          <div className="min-w-0 [&>div]:mt-0">
            <StatusCycle />
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner() {
  const { error, clearError } = useAppState();
  if (!error) return null;
  return (
    <div role="alert" className="animate-fade-in mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
      <span aria-hidden className="font-bold">!</span>
      <div className="flex-1">
        <p className="font-semibold">The lesson couldn&rsquo;t be prepared.</p>
        <p className="mt-1 text-red-100/80">{error}</p>
      </div>
      <button type="button" onClick={clearError} className="rounded-lg px-2 py-1 text-xs text-red-100 hover:bg-red-500/20">
        Dismiss
      </button>
    </div>
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
    <AppStateProvider>
      <Shell>{children}</Shell>
    </AppStateProvider>
  );
}
