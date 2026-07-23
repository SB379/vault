import { getAllBacklog } from "@/lib/vault";
import { MarkdownLite } from "@/components/markdown-lite";
import type { BacklogItem, BacklogStatus } from "@/lib/parse";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Backlog" };

const STATUS_META: Record<BacklogStatus, { label: string; sub: string; badge: string }> = {
  proposed: {
    label: "Proposed",
    sub: "awaiting a spec — run arxiv-pipeline --backlog-spec",
    badge: "border-border text-muted-foreground",
  },
  specced: {
    label: "Specced",
    sub: "spec + build plan ready for an async coding session",
    badge: "border-primary/40 bg-primary/10 text-primary",
  },
  done: {
    label: "Done",
    sub: "shipped",
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
};

function ItemCard({ item }: { item: BacklogItem }) {
  const meta = STATUS_META[item.status];
  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg leading-snug">
          <span className="mr-2 font-mono text-xs text-muted-foreground tabular-nums">
            {String(item.seq).padStart(3, "0")}
          </span>
          {item.title}
        </h3>
        <span
          className={cn(
            "rounded-sm border px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase",
            meta.badge
          )}
        >
          {meta.label}
        </span>
      </div>
      <p className="mt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
        {item.source} · {item.created}
      </p>
      {item.description && (
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-foreground/85">
          {item.description}
        </p>
      )}
      {(item.spec || item.buildPlan) && (
        <details className="mt-4 group">
          <summary className="cursor-pointer font-mono text-[11px] tracking-[0.14em] uppercase text-primary/80 transition-colors hover:text-primary">
            spec + build plan
          </summary>
          <div className="mt-3 space-y-6 border-t border-border pt-4">
            {item.spec && (
              <section>
                <h4 className="mb-2 font-display text-base italic">Spec</h4>
                <div className="text-sm leading-relaxed text-foreground/85">
                  <MarkdownLite text={item.spec} links={{}} />
                </div>
              </section>
            )}
            {item.buildPlan && (
              <section>
                <h4 className="mb-2 font-display text-base italic">Build plan</h4>
                <div className="text-sm leading-relaxed text-foreground/85">
                  <MarkdownLite text={item.buildPlan} links={{}} />
                </div>
              </section>
            )}
          </div>
        </details>
      )}
    </article>
  );
}

export default async function BacklogPage() {
  const items = await getAllBacklog();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="kicker">no backlog yet</p>
        <h1 className="font-display text-3xl italic">Nothing queued.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Add items with <code>arxiv-pipeline --backlog-add</code> or import the
          latest pipeline improvements with{" "}
          <code>arxiv-pipeline --backlog-import</code>.
        </p>
      </div>
    );
  }

  const statuses: BacklogStatus[] = ["proposed", "specced", "done"];

  return (
    <div className="space-y-10">
      <header>
        <p className="kicker">improvement queue</p>
        <h1 className="mt-1 font-display text-4xl italic tracking-tight">Backlog</h1>
        <p className="mt-2 font-mono text-xs tracking-[0.12em] uppercase text-muted-foreground">
          {items.length} items · proposed → specced → done
        </p>
      </header>

      {statuses.map((status) => {
        const group = items.filter((i) => i.status === status);
        if (group.length === 0) return null;
        const meta = STATUS_META[status];
        return (
          <section key={status} className="space-y-4">
            <div>
              <h2 className="font-display text-2xl italic">{meta.label}</h2>
              <p className="kicker mt-0.5">{meta.sub}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {group.map((item) => (
                <ItemCard key={item.slug} item={item} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
