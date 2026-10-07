import { Fragment, type CSSProperties } from "react";

/**
 * Renders a heading one character at a time (CSS-staggered by --ci).
 * Words stay unbroken; screen readers get the plain text via aria-label.
 */
export function SplitHeading({
  text,
  italicWords = [],
  className = "",
}: {
  text: string;
  italicWords?: string[];
  className?: string;
}) {
  const words = text.split(" ");
  const offsets = words.map((_, i) => words.slice(0, i).join("").length);

  return (
    <h1 aria-label={text} className={className}>
      {words.map((word, wi) => (
        <Fragment key={wi}>
          <span
            aria-hidden
            className={`inline-block whitespace-nowrap ${
              italicWords.includes(word) ? "font-normal text-coffee italic" : ""
            }`}
          >
            {Array.from(word).map((ch, ci) => (
              <span
                key={ci}
                className="split-char"
                style={{ "--ci": offsets[wi] + ci } as CSSProperties}
              >
                {ch}
              </span>
            ))}
          </span>
          {wi < words.length - 1 && " "}
        </Fragment>
      ))}
    </h1>
  );
}

/** Total characters (spaces excluded) — used to time what follows the heading. */
export const charCount = (text: string) => text.replace(/\s/g, "").length;
