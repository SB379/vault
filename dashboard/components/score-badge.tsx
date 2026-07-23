import { cn } from "@/lib/utils";

/** Color-scaled 0–10 relevance score chip. Amber intensity tracks the score. */
export function ScoreBadge({
  score,
  className,
}: {
  score: number | null;
  className?: string;
}) {
  if (score === null || Number.isNaN(score)) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-sm border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground",
          className
        )}
      >
        —
      </span>
    );
  }
  const tier =
    score >= 9
      ? "border-primary/60 bg-primary/15 text-primary"
      : score >= 7
        ? "border-primary/30 bg-primary/8 text-primary/85"
        : score >= 5
          ? "border-border bg-secondary text-secondary-foreground"
          : "border-border bg-transparent text-muted-foreground";
  return (
    <span
      title={`Relevance score ${score}/10`}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-xs tabular-nums",
        tier,
        className
      )}
    >
      {score}
      <span className="opacity-50">/10</span>
    </span>
  );
}
