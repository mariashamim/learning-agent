"use client";

import { createPortal } from "react-dom";

/**
 * Bottom-centre toast; plays its 1.5s in/hold/out animation once per mount.
 * Portaled to <body> so ancestors with backdrop-filter/transform can't
 * become its containing block.
 */
export function Toast({ message }: { message: string }) {
  return createPortal(
    <div
      role="status"
      className="toast surface-ink pointer-events-none fixed bottom-6 left-1/2 z-[60] rounded-full border border-gold/40 bg-ink px-4 py-2 text-sm text-sand shadow-lg"
    >
      {message}
    </div>,
    document.body
  );
}
