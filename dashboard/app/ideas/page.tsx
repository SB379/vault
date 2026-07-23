import Link from "next/link";
import { getAllIdeas, getAllPapers } from "@/lib/vault";
import type { Idea } from "@/lib/parse";
import { GenerateIdeasButton } from "@/components/generate-ideas-button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function slugTitle(slug: string): string {
  return slug.length > 48 ? slug.slice(0, 48) + "…" : slug;
}

function IdeaCard({ idea, paperSlugs }: { idea: Idea; paperSlugs: Set<string> }) {
  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <h3 className="font-display text-lg leading-snug">{idea.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        {idea.description}
      </p>
      {idea.rationale && (
        <p className="mt-3 text-sm italic leading-relaxed text-muted-foreground">
          <span className="not-italic font-mono text-[10px] tracking-[0.14em] uppercase text-primary/80">
            why{" "}
          </span>
          {idea.rationale}
        </p>
      )}
      {idea.sourceSlugs.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {idea.sourceSlugs.map((slug) =>
            paperSlugs.has(slug) ? (
              <Link
                key={slug}
                href={`/papers/${slug}`}
                className="rounded-sm border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[10px] tracking-wide text-primary transition-colors hover:bg-primary/15"
                title={slug}
              >
                {slugTitle(slug)}
              </Link>
            ) : (
              <span
                key={slug}
                className="rounded-sm border border-border px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground"
                title={slug}
              >
                {slugTitle(slug)}
              </span>
            )
          )}
        </div>
      )}
    </article>
  );
}

function IdeaSection({
  title,
  sub,
  ideas,
  paperSlugs,
}: {
  title: string;
  sub: string;
  ideas: Idea[];
  paperSlugs: Set<string>;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl italic">{title}</h2>
        <p className="kicker mt-0.5">{sub}</p>
      </div>
      {ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing in this section.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {ideas.map((idea) => (
            <IdeaCard key={idea.title} idea={idea} paperSlugs={paperSlugs} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const [notes, papers] = await Promise.all([getAllIdeas(), getAllPapers()]);
  const paperSlugs = new Set(papers.map((p) => p.slug));

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="kicker">no ideas yet</p>
        <h1 className="font-display text-3xl italic">Nothing generated.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The pipeline distills recent papers into pipeline improvements and
          build ideas. Hit the button to generate today&apos;s note — it takes
          about a minute.
        </p>
        <GenerateIdeasButton />
      </div>
    );
  }

  const note = notes.find((n) => n.date === date) ?? notes[0];

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">synthesis</p>
          <h1 className="mt-1 font-display text-4xl italic tracking-tight">
            What to build next
          </h1>
          <p className="mt-2 font-mono text-xs tracking-[0.12em] uppercase text-muted-foreground">
            {note.date} · {note.pipelineImprovements.length + note.buildIdeas.length}{" "}
            ideas
          </p>
        </div>
        <GenerateIdeasButton />
      </header>

      {notes.length > 1 && (
        <nav className="flex flex-wrap items-center gap-2">
          <span className="kicker">notes</span>
          {notes.map((n) => (
            <Link
              key={n.date}
              href={`/ideas?date=${n.date}`}
              className={cn(
                "rounded-sm px-2.5 py-1 font-mono text-[11px] tabular-nums transition-colors",
                n.date === note.date
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {n.date}
            </Link>
          ))}
        </nav>
      )}

      <IdeaSection
        title="Pipeline improvements"
        sub="ways to make the ingestion pipeline smarter"
        ideas={note.pipelineImprovements}
        paperSlugs={paperSlugs}
      />
      <IdeaSection
        title="Build ideas"
        sub="things worth building, distilled from the papers"
        ideas={note.buildIdeas}
        paperSlugs={paperSlugs}
      />
    </div>
  );
}
