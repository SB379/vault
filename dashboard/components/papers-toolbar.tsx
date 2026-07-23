"use client";

import { useRouter, useSearchParams } from "next/navigation";

const selectCls =
  "h-8 rounded-sm border border-border bg-card px-2 font-mono text-xs text-foreground outline-none focus:border-primary/50 max-w-48";

export function PapersToolbar({
  categories,
  concepts,
}: {
  categories: string[];
  concepts: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `/papers?${qs}` : "/papers");
  };

  const sort = sp.get("sort") ?? "date";
  const category = sp.get("category") ?? "";
  const concept = sp.get("concept") ?? "";
  const hasFilters = category !== "" || concept !== "" || sort !== "date";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="kicker">sort</label>
      <select
        className={selectCls}
        value={sort}
        onChange={(e) => set("sort", e.target.value === "date" ? "" : e.target.value)}
      >
        <option value="date">Newest first</option>
        <option value="score">Score, high → low</option>
      </select>
      <label className="kicker ml-2">category</label>
      <select
        className={selectCls}
        value={category}
        onChange={(e) => set("category", e.target.value)}
      >
        <option value="">All</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <label className="kicker ml-2">concept</label>
      <select
        className={selectCls}
        value={concept}
        onChange={(e) => set("concept", e.target.value)}
      >
        <option value="">All</option>
        {concepts.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {hasFilters && (
        <button
          type="button"
          onClick={() => router.replace("/papers")}
          className="ml-2 font-mono text-[11px] tracking-[0.1em] uppercase text-primary underline underline-offset-2 hover:opacity-80"
        >
          reset
        </button>
      )}
    </div>
  );
}
