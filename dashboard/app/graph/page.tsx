import { getAllPapers, getConcepts } from "@/lib/vault";
import { GraphView, type GraphNode, type GraphLink } from "@/components/graph-view";

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const [papers, vocab] = await Promise.all([getAllPapers(), getConcepts()]);

  const mentions = new Map<string, number>();
  const links: GraphLink[] = [];
  for (const p of papers) {
    for (const topic of p.sections.keyTopics) {
      mentions.set(topic, (mentions.get(topic) ?? 0) + 1);
      links.push({ source: p.slug, target: `concept:${topic}` });
    }
  }
  for (const name of vocab) {
    if (!mentions.has(name)) mentions.set(name, 0);
  }

  const nodes: GraphNode[] = [
    ...papers.map((p) => ({
      id: p.slug,
      type: "paper" as const,
      label: p.title,
      score: p.score,
      published: p.published,
    })),
    ...[...mentions.entries()].map(([name, count]) => ({
      id: `concept:${name}`,
      type: "concept" as const,
      label: name,
      mentions: count,
    })),
  ];

  const linked = nodes.filter(
    (n) => n.type === "paper" || (n.mentions ?? 0) > 0
  ).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">link topology</p>
        <h1 className="mt-1 font-display text-4xl italic tracking-tight">
          The shape of the vault
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Every paper wired to the concepts it mentions. Click a node to open
          its note; hover to trace its neighborhood.
        </p>
      </header>
      {nodes.length === 0 ? (
        <p className="py-24 text-center text-sm text-muted-foreground">
          Nothing to graph yet — the vault is empty.
        </p>
      ) : (
        <GraphView nodes={nodes} links={links} linkedNodeCount={linked} />
      )}
    </div>
  );
}
