/** Evaluator score, tinted by quality. Used in the lesson header. */
export function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 8
      ? "border-emerald-500/30 bg-emerald-50 text-emerald-800"
      : score >= 6
        ? "border-taupe/40 bg-peach/60 text-coffee"
        : "border-red-400/40 bg-red-50 text-red-800";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums ${tone}`}
      title="Evaluator score"
    >
      <span aria-hidden>★</span>
      {score}
      <span className="opacity-60">/10</span>
    </span>
  );
}
