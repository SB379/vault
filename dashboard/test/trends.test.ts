import { describe, it, expect } from "vitest";
import {
  conceptFrequencyOverTime,
  categoryMix,
  scoreDistribution,
  papersPerDay,
  emergingConcepts,
} from "../lib/trends";
import type { PaperNote, Digest } from "../lib/parse";

function paper(over: Partial<PaperNote> & { keyTopics?: string[] }): PaperNote {
  return {
    slug: "s",
    filePath: "f",
    arxivId: "1",
    title: "T",
    authors: [],
    categories: [],
    published: "2026-07-22",
    score: 5,
    url: "",
    ...over,
    sections: { keyTopics: over.keyTopics ?? [], other: {} },
  };
}

describe("trends", () => {
  const papers = [
    paper({ published: "2026-07-21", keyTopics: ["RAG", "Tool Use"], categories: ["cs.AI", "cs.AI"], score: 9 }),
    paper({ published: "2026-07-22", keyTopics: ["RAG"], categories: ["cs.CL"], score: 7 }),
    paper({ published: "2026-07-22", keyTopics: ["Hallucination"], categories: ["cs.AI"], score: 9 }),
  ];

  it("conceptFrequencyOverTime buckets by date with zero-filled topN", () => {
    const rows = conceptFrequencyOverTime(papers, 2);
    expect(rows.map((r) => r.date)).toEqual(["2026-07-21", "2026-07-22"]);
    expect(rows[0].counts["RAG"]).toBe(1);
    expect(rows[1].counts["RAG"]).toBe(1);
    expect(Object.keys(rows[0].counts)).toHaveLength(2);
  });

  it("categoryMix counts once per paper", () => {
    const mix = categoryMix(papers);
    expect(mix.find((m) => m.category === "cs.AI")!.count).toBe(2);
    expect(mix.find((m) => m.category === "cs.CL")!.count).toBe(1);
  });

  it("scoreDistribution is zero-filled 0-10", () => {
    const dist = scoreDistribution(papers);
    expect(dist).toHaveLength(11);
    expect(dist[9].count).toBe(2);
    expect(dist[7].count).toBe(1);
    expect(dist[0].count).toBe(0);
  });

  const digests: Digest[] = [
    {
      date: "2026-07-22",
      ingested: [
        { slug: "a", score: 9, reason: "r" },
        { slug: "b", score: 8, reason: "r" },
      ],
      proposedConcepts: ["RAG", "New Thing"],
      failures: [],
    },
    {
      date: "2026-07-21",
      ingested: [{ slug: "c", score: 7, reason: "r" }],
      proposedConcepts: ["New Thing"],
      failures: [],
    },
  ];

  it("papersPerDay sorts ascending", () => {
    expect(papersPerDay(digests)).toEqual([
      { date: "2026-07-21", count: 1 },
      { date: "2026-07-22", count: 2 },
    ]);
  });

  it("emergingConcepts tracks firstSeen and approval", () => {
    const out = emergingConcepts(digests, ["rag"]);
    expect(out).toContainEqual({ name: "New Thing", firstSeen: "2026-07-21", approved: false });
    expect(out).toContainEqual({ name: "RAG", firstSeen: "2026-07-22", approved: true });
  });
});
