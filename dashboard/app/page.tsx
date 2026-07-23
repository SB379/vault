import Link from "next/link";
import {
  getAllPapers,
  getLatestDigest,
  getScoreReasons,
  getConcepts,
  getConceptPageNames,
} from "@/lib/vault";
import type { PaperNote } from "@/lib/parse";
import { ScoreBadge } from "@/components/score-badge";
import { Badge } from "@/components/ui/badge";
import { conceptHref, paperHref } from "@/lib/links";

export const dynamic = "force-dynamic";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function TodayPage() {
  const [digest, papers, reasons, vocab, conceptPages] = await Promise.all([
    getLatestDigest(),
    getAllPapers(),
    getScoreReasons(),
    getConcepts(),
    getConceptPageNames(),
  ]);

  if (!digest) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="kicker">no daily digests yet</p>
        <h1 className="font-display text-3xl italic">The vault is quiet.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          No digest notes were found in <code className="font-mono">Daily/</code>.
          Once the pipeline runs, today&apos;s signal appears here.
        </p>
        <Link
          href="/papers"
          className="mt-2 font-mono text-xs tracking-[0.14em] uppercase text-primary underline underline-offset-4"
        >
          browse all papers →
        </Link>
      </div>
    );
  }

  const conceptSet = new Set(
    [...vocab, ...conceptPages].map((c) => c.toLowerCase())
  );
  const bySlug = new Map(papers.map((p) => [p.slug, p]));

  type Row = {
    slug: string;
    digestScore: number | null;
    reason: string;
    paper: PaperNote | null;
  };
  const rows: Row[] = digest.ingested.map((e) => ({
    slug: e.slug,
    digestScore: e.score,
    reason: reasons.get(e.slug) ?? e.reason,
    paper: bySlug.get(e.slug) ?? null,
  }));
  rows.sort(
    (a, b) =>
      (b.paper?.score ?? b.digestScore ?? -1) -
      (a.paper?.score ?? a.digestScore ?? -1)
  );

  const resolved = rows.filter((r) => r.paper !== null);
  const scores = rows
    .map((r) => r.paper?.score ?? r.digestScore)
    .filter((s): s is number => s !== null);
  const avgScore = scores.length
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : "—";
  const catCounts = new Map<string, number>();
  for (const r of resolved) {
    for (const c of new Set(r.paper!.categories)) {
      catCounts.set(c, (catCounts.get(c) ?? 0) + 1);
    }
  }
  const topCategory =
    [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const isToday = digest.date === todayISO();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">daily signal · {digest.date}</p>
          <h1 className="mt-1 font-display text-4xl italic tracking-tight">
            {isToday ? "Today’s intake" : "Latest intake"}
          </h1>
        </div>
        {!isToday && (
          <p className="rounded-sm border border-primary/30 bg-primary/8 px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] uppercase text-primary/90">
            showing latest digest — {digest.date}
          </p>
        )}
      </header>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {[
          { label: "papers ingested", value: String(rows.length) },
          { label: "avg score", value: avgScore },
          { label: "top category", value: topCategory },
        ].map((t) => (
          <div key={t.label} className="bg-card px-5 py-4">
            <p className="kicker">{t.label}</p>
            <p className="mt-1 font-mono text-3xl tabular-nums text-foreground">
              {t.value}
            </p>
          </div>
        ))}
      </div>

      {/* Paper cards */}
      <section className="space-y-3">
        {rows.map((r) =>
          r.paper ? (
            <article
              key={r.slug}
              className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-display text-xl leading-snug">
                  <Link
                    href={paperHref(r.slug)}
                    className="hover:text-primary transition-colors"
                  >
                    {r.paper.title}
                  </Link>
                </h2>
                <ScoreBadge score={r.paper.score} className="mt-1 shrink-0" />
              </div>
              {r.reason && (
                <p className="mt-2 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
                  {r.reason}
                </p>
              )}
              {r.paper.sections.tldr && (
                <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                  {r.paper.sections.tldr}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {r.paper.categories.map((c) => (
                  <Badge key={c} variant="secondary" className="font-mono text-[10px]">
                    {c}
                  </Badge>
                ))}
                {r.paper.categories.length > 0 &&
                  r.paper.sections.keyTopics.length > 0 && (
                    <span className="mx-1 text-border">·</span>
                  )}
                {r.paper.sections.keyTopics.map((t) =>
                  conceptSet.has(t.toLowerCase()) ? (
                    <Badge
                      key={t}
                      variant="outline"
                      className="text-[10px]"
                      render={<Link href={conceptHref(t)}>{t}</Link>}
                    />
                  ) : (
                    <Badge key={t} variant="ghost" className="text-[10px] text-muted-foreground">
                      {t}
                    </Badge>
                  )
                )}
              </div>
            </article>
          ) : (
            <article
              key={r.slug}
              className="rounded-lg border border-dashed border-border bg-card/50 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-mono text-sm text-muted-foreground">{r.slug}</h2>
                <ScoreBadge score={r.digestScore} className="shrink-0" />
              </div>
              {r.reason && (
                <p className="mt-2 text-sm italic text-muted-foreground/70">{r.reason}</p>
              )}
              <p className="mt-2 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground/60">
                note not found in vault — listed in digest only
              </p>
            </article>
          )
        )}
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            The digest for {digest.date} lists no ingested papers.
          </p>
        )}
      </section>

      {/* Failures */}
      {digest.failures.length > 0 && (
        <details className="rounded-lg border border-border bg-card/50 px-5 py-3">
          <summary className="cursor-pointer font-mono text-xs tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground">
            {digest.failures.length} pipeline failure
            {digest.failures.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-3 space-y-1.5 pl-1">
            {digest.failures.map((f, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                <span className="mr-2 text-destructive">×</span>
                {f}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
