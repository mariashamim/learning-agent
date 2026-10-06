/** Decorative tutor mascot: a glassy robot head with an orbit ring. */
export function Mascot({ className = "" }: { className?: string }) {
  return (
    <div className={`mascot relative ${className}`} aria-hidden>
      <svg viewBox="0 0 260 240" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="m-head" cx="38%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#eef0ff" />
            <stop offset="100%" stopColor="#c9c6ff" />
          </radialGradient>
          <linearGradient id="m-visor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2b2f6b" />
            <stop offset="100%" stopColor="#141733" />
          </linearGradient>
          <linearGradient id="m-ring" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#6c5ce7" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#4f8cff" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="m-gem" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5b4ff" />
            <stop offset="100%" stopColor="#4f8cff" />
          </linearGradient>
          <filter id="m-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* soft glow behind the head */}
        <ellipse cx="130" cy="120" rx="92" ry="86" fill="#b4a9ff" opacity="0.35" filter="url(#m-glow)" />

        {/* orbit ring, back half */}
        <ellipse cx="130" cy="128" rx="122" ry="34" fill="none" stroke="url(#m-ring)" strokeWidth="3" transform="rotate(-14 130 128)" />

        {/* head */}
        <circle cx="130" cy="118" r="76" fill="url(#m-head)" />
        <circle cx="130" cy="118" r="76" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2" />
        <ellipse cx="100" cy="72" rx="26" ry="12" fill="#ffffff" opacity="0.75" transform="rotate(-25 100 72)" />

        {/* visor + eyes */}
        <rect x="80" y="88" width="100" height="62" rx="28" fill="url(#m-visor)" />
        <path d="M100 126c0-8 5-13 11-13s11 5 11 13" fill="none" stroke="#7cc4ff" strokeWidth="6" strokeLinecap="round" className="mascot-eye" />
        <path d="M138 126c0-8 5-13 11-13s11 5 11 13" fill="none" stroke="#7cc4ff" strokeWidth="6" strokeLinecap="round" className="mascot-eye" />

        {/* orbit ring, front arc */}
        <path d="M14 150c40 22 180 4 232-42" fill="none" stroke="url(#m-ring)" strokeWidth="3" strokeLinecap="round" />

        {/* floating gems and sparkles */}
        <path d="M206 30l10 5-2 12-11 3-8-9z" fill="url(#m-gem)" opacity="0.85" className="mascot-float-a" />
        <path d="M200 196l16 6-3 17-16 4-10-13z" fill="url(#m-gem)" opacity="0.9" className="mascot-float-b" />
        <circle cx="52" cy="200" r="10" fill="#e3b8ff" opacity="0.6" className="mascot-float-a" />
        <path d="M58 44c1 7 4 10 11 11-7 1-10 4-11 11-1-7-4-10-11-11 7-1 10-4 11-11z" fill="#8b9cff" className="mascot-twinkle" />
        <path d="M232 70c.8 5 3 7 8 8-5 .8-7.2 3-8 8-.8-5-3-7.2-8-8 5-.8 7.2-3 8-8z" fill="#a78bfa" className="mascot-twinkle" />
        <path d="M30 120c.6 4 2.4 5.6 6 6.2-3.6.6-5.4 2.2-6 6.2-.6-4-2.4-5.6-6-6.2 3.6-.6 5.4-2.2 6-6.2z" fill="#7cc4ff" className="mascot-twinkle" />
      </svg>
    </div>
  );
}
