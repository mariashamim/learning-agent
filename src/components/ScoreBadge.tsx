/** Evaluator score, tinted by quality. Used in the lesson header. */
export function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 8
      ? "border-coffee/30 bg-peach/50 text-coffee"
      : score >= 6
        ? "border-taupe/40 bg-paper text-taupe"
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
