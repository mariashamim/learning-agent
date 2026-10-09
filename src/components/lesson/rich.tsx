import type { ReactNode } from "react";

/** Lesson text with `inline code` rendered as code. Everything else stays plain text. */
export function rich(text: string): ReactNode {
  if (!text.includes("`")) return text;
  return text.split(/`([^`\n]+)`/).map((part, i) =>
    i % 2 ? (
      <code key={i} className="inline-code font-mono">
        {part}
      </code>
    ) : (
      part
    )
  );
}
