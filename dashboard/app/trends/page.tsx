import Link from "next/link";
import { getAllPapers, getAllDigests, getConcepts } from "@/lib/vault";
import {
  conceptFrequencyOverTime,
  categoryMix,
  scoreDistribution,
  papersPerDay,
  emergingConcepts,
} from "@/lib/trends";
import { ConceptFrequencyChart } from "@/components/charts/concept-frequency";
import { CategoryMixChart } from "@/components/charts/category-mix";
import { ScoreHistogram } from "@/components/charts/score-histogram";
import { PapersPerDayChart } from "@/components/charts/papers-per-day";
import { Badge } from "@/components/ui/badge";
import { conceptHref } from "@/lib/links";

export const dynamic = "force-dynamic";

function Panel({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-display text-lg">{title}</h2>
      <p className="kicker mt-0.5 mb-4">{sub}</p>
      {children}
    </section>
  );
}

export default async function TrendsPage() {
  const [papers, digests, vocab] = await Promise.all([
    getAllPapers(),
    getAllDigests(),
    getConcepts(),
  ]);

  if (papers.length === 0 && digests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="kicker">no data yet</p>
        <h1 className="font-display text-3xl italic">Nothing to chart.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Trends appear once the pipeline has ingested papers.
        </p>
        <Link
          href="/papers"
          className="font-mono text-xs tracking-[0.14em] uppercase text-primary underline underline-offset-4"
        >
          browse papers →
        </Link>
      </div>
    );
  }

  const freq = conceptFrequencyOverTime(papers, 8);
  const freqConcepts = freq.length > 0 ? Object.keys(freq[0].counts) : [];
  const freqData = freq.map(({ date, counts }) => ({ date, ...counts }));

  const mix = categoryMix(papers);
  const dist = scoreDistribution(papers);
  const perDay = papersPerDay(digests);
  const emerging = emergingConcepts(digests, vocab).sort((a, b) =>
    b.firstSeen.localeCompare(a.firstSeen) || a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="kicker">market intelligence</p>
        <h1 className="mt-1 font-display text-4xl italic tracking-tight">
          Where the research is heading
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          title="Concept frequency over time"
          sub={`top ${freqConcepts.length} concepts · mentions per publish day`}
        >
          {freqData.length > 0 ? (
            <ConceptFrequencyChart data={freqData} concepts={freqConcepts} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No dated papers yet.
            </p>
          )}
        </Panel>

        <Panel title="Category mix" sub="papers per arXiv category">
          {mix.length > 0 ? (
            <CategoryMixChart data={mix} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No categories yet.
            </p>
          )}
        </Panel>

        <Panel title="Score distribution" sub="relevance scores, fixed 0–10 domain">
          <ScoreHistogram data={dist} />
        </Panel>

        <Panel title="Papers per day" sub="ingested per daily digest">
          {perDay.length > 0 ? (
            <PapersPerDayChart data={perDay} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No digests yet.
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title="Emerging concepts"
        sub="proposed by the pipeline · approved = present in the concept vocabulary"
      >
        {emerging.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No proposed concepts yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
            {emerging.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 sm:[&:nth-last-child(2)]:border-0"
              >
                <span className="min-w-0 flex-1">
                  {c.approved ? (
                    <Link
                      href={conceptHref(c.name)}
                      className="text-sm hover:text-primary transition-colors"
                    >
                      {c.name}
                    </Link>
                  ) : (
                    <span className="text-sm text-foreground/85">{c.name}</span>
                  )}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {c.firstSeen}
                </span>
                {c.approved ? (
                  <Badge className="text-[10px]">approved</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    pending
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
