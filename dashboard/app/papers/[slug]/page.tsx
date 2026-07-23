import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPaper,
  getAllPapers,
  getConcepts,
  getConceptPageNames,
  getScoreReasons,
} from "@/lib/vault";
import { buildLinkMap, conceptHref } from "@/lib/links";
import { MarkdownLite } from "@/components/markdown-lite";
import { ScoreBadge } from "@/components/score-badge";
import { PdfEmbed } from "@/components/pdf-embed";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

const SECTION_ORDER: { key: "tldr" | "highlights" | "method" | "evals" | "soWhat" | "openQuestions"; label: string }[] = [
  { key: "tldr", label: "TL;DR" },
  { key: "highlights", label: "Highlights" },
  { key: "method", label: "Method" },
  { key: "evals", label: "Evals & Results" },
  { key: "soWhat", label: "So What (for practitioners)" },
  { key: "openQuestions", label: "Open Questions / Critiques" },
];

export default async function PaperPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const [paper, papers, vocab, conceptPages, reasons] = await Promise.all([
    getPaper(slug),
    getAllPapers(),
    getConcepts(),
    getConceptPageNames(),
    getScoreReasons(),
  ]);
  if (!paper) notFound();

  const conceptNames = [...new Set([...vocab, ...conceptPages])];
  const links = buildLinkMap(
    papers.map((p) => p.slug),
    conceptNames
  );
  const conceptSet = new Set(conceptNames.map((c) => c.toLowerCase()));
  const reason = reasons.get(paper.slug);

  const notes = (
    <div className="space-y-8">
      {SECTION_ORDER.map(({ key, label }) => {
        const text = paper.sections[key];
        if (!text) return null;
        return (
          <section key={key}>
            <h2 className="kicker mb-3">{label}</h2>
            <MarkdownLite text={text} links={links} />
          </section>
        );
      })}
      {Object.entries(paper.sections.other).map(([heading, text]) => (
        <section key={heading}>
          <h2 className="kicker mb-3">{heading}</h2>
          <MarkdownLite text={text} links={links} />
        </section>
      ))}
      {paper.sections.abstract && (
        <section>
          <h2 className="kicker mb-3">Abstract</h2>
          <blockquote className="border-l-2 border-primary/40 pl-4 font-display text-[15px] italic leading-relaxed text-foreground/80">
            <MarkdownLite
              text={paper.sections.abstract}
              links={links}
              className="space-y-3"
            />
          </blockquote>
        </section>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/papers"
          className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted-foreground hover:text-primary"
        >
          ← all papers
        </Link>
      </div>

      {/* Metadata header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="max-w-3xl font-display text-3xl leading-tight tracking-tight">
            {paper.title}
          </h1>
          <ScoreBadge score={paper.score} className="mt-2 text-sm" />
        </div>
        <p className="text-sm text-muted-foreground">
          {paper.authors.join(", ") || "Unknown authors"}
        </p>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="tabular-nums">{paper.published}</span>
          <span className="text-border">·</span>
          {paper.categories.map((c) => (
            <Badge key={c} variant="secondary" className="font-mono text-[10px]">
              {c}
            </Badge>
          ))}
          <span className="text-border">·</span>
          <a
            href={paper.url || `https://arxiv.org/abs/${paper.arxivId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:decoration-primary"
          >
            arXiv:{paper.arxivId} ↗
          </a>
        </div>
        {reason && (
          <p className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
            {reason}
          </p>
        )}
        {paper.sections.keyTopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {paper.sections.keyTopics.map((t) =>
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
        )}
      </header>

      <Separator />

      {/* Wide: two columns. Narrow: tabs. */}
      <div className="hidden gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>{notes}</div>
        <div className="sticky top-20 h-[calc(100vh-6rem)] self-start">
          <PdfEmbed arxivId={paper.arxivId} />
        </div>
      </div>
      <div className="lg:hidden">
        <Tabs defaultValue="notes">
          <TabsList className="w-full">
            <TabsTrigger value="notes" className="flex-1">
              Notes
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex-1">
              PDF
            </TabsTrigger>
          </TabsList>
          <TabsContent value="notes" className="pt-4">
            {notes}
          </TabsContent>
          <TabsContent value="pdf" className="pt-4">
            <PdfEmbed arxivId={paper.arxivId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
