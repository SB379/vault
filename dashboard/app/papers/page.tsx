import Link from "next/link";
import { Suspense } from "react";
import { getAllPapers, getConcepts, getConceptPageNames } from "@/lib/vault";
import { PapersToolbar } from "@/components/papers-toolbar";
import { ScoreBadge } from "@/components/score-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { conceptHref, paperHref } from "@/lib/links";

export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function PapersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sort = first(sp.sort) === "score" ? "score" : "date";
  const category = first(sp.category);
  const concept = first(sp.concept)?.toLowerCase();

  const [papers, vocab, conceptPages] = await Promise.all([
    getAllPapers(),
    getConcepts(),
    getConceptPageNames(),
  ]);
  const conceptSet = new Set(
    [...vocab, ...conceptPages].map((c) => c.toLowerCase())
  );

  const allCategories = [...new Set(papers.flatMap((p) => p.categories))].sort();
  const allConcepts = [
    ...new Set(papers.flatMap((p) => p.sections.keyTopics)),
  ].sort((a, b) => a.localeCompare(b));

  let rows = papers;
  if (category) rows = rows.filter((p) => p.categories.includes(category));
  if (concept)
    rows = rows.filter((p) =>
      p.sections.keyTopics.some((t) => t.toLowerCase() === concept)
    );
  if (sort === "score") {
    rows = [...rows].sort(
      (a, b) => b.score - a.score || b.published.localeCompare(a.published)
    );
  } // else keep published desc default from getAllPapers

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">library</p>
        <h1 className="mt-1 font-display text-4xl italic tracking-tight">
          All papers
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {rows.length} of {papers.length} notes
        </p>
      </header>

      <Suspense fallback={<div className="h-8" />}>
        <PapersToolbar categories={allCategories} concepts={allConcepts} />
      </Suspense>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="font-display text-xl italic">Nothing matches.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No papers match the current filters. Try resetting them.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="kicker">Title</TableHead>
                <TableHead className="kicker w-20">Score</TableHead>
                <TableHead className="kicker hidden md:table-cell">Categories</TableHead>
                <TableHead className="kicker w-28">Published</TableHead>
                <TableHead className="kicker hidden lg:table-cell">Top concepts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.slug}>
                  <TableCell className="max-w-md whitespace-normal">
                    <Link
                      href={paperHref(p.slug)}
                      className="font-medium leading-snug hover:text-primary transition-colors"
                    >
                      {p.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={p.score} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {p.categories.map((c) => (
                        <Badge key={c} variant="secondary" className="font-mono text-[10px]">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {p.published}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {p.sections.keyTopics.slice(0, 3).map((t) =>
                        conceptSet.has(t.toLowerCase()) ? (
                          <Badge
                            key={t}
                            variant="outline"
                            className="text-[10px]"
                            render={<Link href={conceptHref(t)}>{t}</Link>}
                          />
                        ) : (
                          <Badge
                            key={t}
                            variant="ghost"
                            className="text-[10px] text-muted-foreground"
                          >
                            {t}
                          </Badge>
                        )
                      )}
                      {p.sections.keyTopics.length > 3 && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          +{p.sections.keyTopics.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
