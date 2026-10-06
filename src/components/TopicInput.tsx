"use client";

/** Topic field: taupe border + peach glow on focus, underline once typing. */
export function TopicInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="topic" className="sr-only">
        Topic
      </label>
      <input
        id="topic"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Stoicism, game theory, the French Revolution…"
        autoComplete="off"
        className="topic-input w-full px-4 py-3.5 text-base text-espresso"
      />
      <span className="topic-underline" data-on={value.length > 0} aria-hidden />
    </div>
  );
}
