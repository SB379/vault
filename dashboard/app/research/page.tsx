import { getAllResearch } from "@/lib/vault";
import type { ResearchNote, ResearchVerdict } from "@/lib/parse";
import { MarkdownLite } from "@/components/markdown-lite";
import { RunResearchButton } from "@/components/run-research-button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VERDICT_ORDER: (ResearchVerdict | null)[] = ["GAP", "UNCLEAR", "CROWDED", null];

const VERDICT_STYLES: Record<string, string> = {
  GAP: "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  CROWDED: "border-border bg-secondary text-muted-foreground",
  UNCLEAR: "border-border bg-card text-foreground/80",
  none: "border-border bg-card text-muted-foreground",
};

function VerdictBadge({ verdict }: { verdict: ResearchVerdict | null }) {
  return (
    <span
      className={cn(
        "rounded-sm border px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase",
        VERDICT_STYLES[verdict ?? "none"]
      )}
    >
      {verdict ?? "no verdict"}
    </span>
  );
}

function verdictExcerpt(note: ResearchNote): string {
  const m = note.body.match(/(?:^|\n)## Verdict\n([\s\S]*?)(?=\n## |$)/);
  if (!m) return "";
  return m[1]
    .replace(/\*\*(GAP|CROWDED|UNCLEAR)\*\*/g, "")
    .replace(/^[\s—–\-:.]+/, "")
    .trim();
}

function ResearchCard({ note }: { note: ResearchNote }) {
  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg leading-snug">{note.ideaTitle}</h3>
        <VerdictBadge verdict={note.verdict} />
      </div>
      <p className="mt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
        {note.date}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-foreground/85">
        {verdictExcerpt(note)}
      </p>
      <details className="mt-4 group">
        <summary className="cursor-pointer font-mono text-[11px] tracking-[0.12em] uppercase text-primary/80 hover:text-primary">
          full report
        </summary>
        <MarkdownLite
          text={note.body}
          className="mt-3 space-y-3 text-sm text-foreground/90"
        />
      </details>
    </article>
  );
}

export default async function ResearchPage() {
  const notes = await getAllResearch();

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="kicker">no research yet</p>
        <h1 className="font-display text-3xl italic">Nothing researched.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Market research runs an agentic web search over each build idea in the
          latest Ideas note and writes a verdict per idea. Run it from here, or
          with <code className="font-mono">arxiv-pipeline --research</code> —
          it takes several minutes.
        </p>
        <RunResearchButton />
      </div>
    );
  }

  const groups = VERDICT_ORDER.map((v) => ({
    verdict: v,
    notes: notes.filter((n) => n.verdict === v),
  })).filter((g) => g.notes.length > 0);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">market research</p>
          <h1 className="mt-1 font-display text-4xl italic tracking-tight">
            Is there a gap?
          </h1>
          <p className="mt-2 font-mono text-xs tracking-[0.12em] uppercase text-muted-foreground">
            {notes.length} researched ideas
          </p>
        </div>
        <RunResearchButton />
      </header>

      {groups.map((g) => (
        <section key={g.verdict ?? "none"} className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl italic">
              {g.verdict === "GAP"
                ? "Open gaps"
                : g.verdict === "CROWDED"
                  ? "Crowded spaces"
                  : g.verdict === "UNCLEAR"
                    ? "Unclear"
                    : "No verdict"}
            </h2>
            <VerdictBadge verdict={g.verdict} />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {g.notes.map((note) => (
              <ResearchCard key={note.slug} note={note} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
