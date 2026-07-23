import Link from "next/link";
import {
  getPapersForConcept,
  getConcepts,
  getConceptPageNames,
} from "@/lib/vault";
import { MentionTrendChart } from "@/components/charts/mention-trend";
import { ScoreBadge } from "@/components/score-badge";
import { Badge } from "@/components/ui/badge";
import { paperHref } from "@/lib/links";

export const dynamic = "force-dynamic";

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);
  const [papers, vocab, conceptPages] = await Promise.all([
    getPapersForConcept(name),
    getConcepts(),
    getConceptPageNames(),
  ]);

  const known = [...vocab, ...conceptPages].some(
    (c) => c.toLowerCase() === name.toLowerCase()
  );
  // Canonical display casing from the vocabulary if available.
  const display =
    [...vocab, ...conceptPages].find(
      (c) => c.toLowerCase() === name.toLowerCase()
    ) ?? name;

  if (!known && papers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="kicker">unknown concept</p>
        <h1 className="font-display text-3xl italic">
          “{display}” isn’t in the vault yet.
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          It isn&apos;t in the concept vocabulary and no paper references it.
          It may be a proposed concept awaiting approval.
        </p>
        <Link
          href="/trends"
          className="font-mono text-xs tracking-[0.14em] uppercase text-primary underline underline-offset-4"
        >
          see emerging concepts →
        </Link>
      </div>
    );
  }

  // Mentions per published day.
  const byDate = new Map<string, number>();
  for (const p of papers) {
    if (!p.published) continue;
    byDate.set(p.published, (byDate.get(p.published) ?? 0) + 1);
  }
  const trend = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">concept</p>
          <h1 className="mt-1 font-display text-4xl italic tracking-tight">
            {display}
          </h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {papers.length} paper{papers.length === 1 ? "" : "s"} reference this
            concept
          </p>
        </div>
        {known && (
          <Badge className="text-[10px]">in vocabulary</Badge>
        )}
      </header>

      {trend.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-lg">Mentions over time</h2>
          <p className="kicker mt-0.5 mb-4">papers per publish day</p>
          <MentionTrendChart data={trend} />
        </section>
      )}

      <section className="space-y-3">
        {papers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="font-display text-xl italic">No papers yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This concept is in the vocabulary but nothing in the vault
              references it so far.
            </p>
          </div>
        ) : (
          papers.map((p) => (
            <article
              key={p.slug}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-lg leading-snug">
                  <Link
                    href={paperHref(p.slug)}
                    className="hover:text-primary transition-colors"
                  >
                    {p.title}
                  </Link>
                </h3>
                <ScoreBadge score={p.score} className="mt-1 shrink-0" />
              </div>
              {p.sections.tldr && (
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground/85">
                  {p.sections.tldr}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <span className="tabular-nums">{p.published}</span>
                <span className="text-border">·</span>
                {p.categories.map((c) => (
                  <Badge key={c} variant="secondary" className="font-mono text-[10px]">
                    {c}
                  </Badge>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
