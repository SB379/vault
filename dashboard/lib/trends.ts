import type { PaperNote, Digest } from "./parse";

export function conceptFrequencyOverTime(
  papers: PaperNote[],
  topN = 8
): { date: string; counts: Record<string, number> }[] {
  // Determine topN concepts overall.
  const totals = new Map<string, number>();
  for (const p of papers) {
    for (const t of p.sections.keyTopics) {
      totals.set(t, (totals.get(t) ?? 0) + 1);
    }
  }
  const top = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name]) => name);
  const topSet = new Set(top);

  const byDate = new Map<string, Record<string, number>>();
  for (const p of papers) {
    if (!p.published) continue;
    let counts = byDate.get(p.published);
    if (!counts) {
      counts = {};
      for (const name of top) counts[name] = 0;
      byDate.set(p.published, counts);
    }
    for (const t of p.sections.keyTopics) {
      if (topSet.has(t)) counts[t] += 1;
    }
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, counts]) => ({ date, counts }));
}

export function categoryMix(papers: PaperNote[]): { category: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of papers) {
    for (const c of new Set(p.categories)) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));
}

export function scoreDistribution(papers: PaperNote[]): { score: number; count: number }[] {
  const dist = Array.from({ length: 11 }, (_, score) => ({ score, count: 0 }));
  for (const p of papers) {
    if (Number.isInteger(p.score) && p.score >= 0 && p.score <= 10) {
      dist[p.score].count += 1;
    }
  }
  return dist;
}

export function papersPerDay(digests: Digest[]): { date: string; count: number }[] {
  return [...digests]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ date: d.date, count: d.ingested.length }));
}

export function emergingConcepts(
  digests: Digest[],
  approved: string[]
): { name: string; firstSeen: string; approved: boolean }[] {
  const approvedLower = new Set(approved.map((a) => a.toLowerCase()));
  const firstSeen = new Map<string, string>();
  for (const d of [...digests].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const name of d.proposedConcepts) {
      if (!firstSeen.has(name)) firstSeen.set(name, d.date);
    }
  }
  return [...firstSeen.entries()].map(([name, date]) => ({
    name,
    firstSeen: date,
    approved: approvedLower.has(name.toLowerCase()),
  }));
}
