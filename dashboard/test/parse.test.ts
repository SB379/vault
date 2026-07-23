import { describe, it, expect } from "vitest";
import { parsePaper, parseDigest, parseConceptsVocab } from "../lib/parse";

// Fixture copied from the real vault: Papers/2026/07/janus-...md (trimmed bodies)
const PAPER_RAW = `---
arxiv_id: "2607.19913"
title: "JANUS: Foreseeing Latent Risk for Long-Horizon Agent Safety"
authors: ["Yuan Xiong", "Linji Hao", "Shizhu He", "Yequan Wang", "Lijun Li"]
categories: [cs.AI, cs.CL, cs.CR]
published: 2026-07-22
score: 9
url: https://arxiv.org/abs/2607.19913
tags: [paper]
---

# JANUS: Foreseeing Latent Risk for Long-Horizon Agent Safety

## TL;DR
Janus trains predictive agent guardrails that anticipate delayed risks.

## Abstract
> Agent safety is moving from content moderation toward preventing operational failures.
> We propose Janus, a foresight-oriented framework.

## Key Topics
- [[Agent Evaluation]]
- [[Reinforcement Learning]]
- [[Tool Use]]

## Highlights
- Vanguard achieves an average ASR of 0.071 across four benchmarks.
- On AgentDojo benign tasks, Vanguard matches the no-guard reference.

## Method
Janus has two parts.

## Evals & Results
Evaluated on four agent-safety benchmarks.

## So What (for practitioners)
Reactive, step-level content guards are insufficient.

## Open Questions / Critiques
Training data is entirely from multi-agent simulation.

## Bonus Notes
Some unknown section.
`;

describe("parsePaper", () => {
  const p = parsePaper(PAPER_RAW, "janus", "/vault/Papers/2026/07/janus.md")!;

  it("parses frontmatter", () => {
    expect(p).not.toBeNull();
    expect(p.arxivId).toBe("2607.19913");
    expect(p.title).toMatch(/^JANUS/);
    expect(p.authors).toHaveLength(5);
    expect(p.categories).toEqual(["cs.AI", "cs.CL", "cs.CR"]);
    expect(p.published).toBe("2026-07-22");
    expect(p.score).toBe(9);
    expect(typeof p.score).toBe("number");
    expect(p.url).toBe("https://arxiv.org/abs/2607.19913");
    expect(p.slug).toBe("janus");
  });

  it("maps known sections", () => {
    expect(p.sections.tldr).toMatch(/^Janus trains/);
    expect(p.sections.abstract).toMatch(/^Agent safety is moving/);
    expect(p.sections.abstract).not.toContain(">");
    expect(p.sections.abstract).toContain("We propose Janus");
    expect(p.sections.highlights).toContain("Vanguard achieves");
    expect(p.sections.method).toBe("Janus has two parts.");
    expect(p.sections.evals).toBe("Evaluated on four agent-safety benchmarks.");
    expect(p.sections.soWhat).toMatch(/^Reactive/);
    expect(p.sections.openQuestions).toMatch(/^Training data/);
  });

  it("extracts key topics from wikilinks", () => {
    expect(p.sections.keyTopics).toEqual([
      "Agent Evaluation",
      "Reinforcement Learning",
      "Tool Use",
    ]);
  });

  it("puts unknown headings into other", () => {
    expect(p.sections.other["Bonus Notes"]).toBe("Some unknown section.");
  });

  it("handles wikilinks with aliases", () => {
    const raw = PAPER_RAW.replace("[[Tool Use]]", "[[Tool Use|tools]]");
    expect(parsePaper(raw, "x", "x")!.sections.keyTopics).toContain("Tool Use");
  });

  it("returns null on malformed frontmatter", () => {
    expect(parsePaper("---\ntitle: [unclosed\n---\nbody", "x", "x")).toBeNull();
    expect(parsePaper("no frontmatter at all", "x", "x")).toBeNull();
  });

  it("defaults missing lists to [] and coerces score", () => {
    const raw = `---\narxiv_id: "1"\ntitle: "T"\nscore: "7"\n---\n\n# T\n`;
    const q = parsePaper(raw, "t", "t")!;
    expect(q.authors).toEqual([]);
    expect(q.categories).toEqual([]);
    expect(q.score).toBe(7);
    expect(q.sections.keyTopics).toEqual([]);
  });
});

// Fixture copied from the real vault: Daily/2026-07-22.md (trimmed)
const DIGEST_RAW = `# Daily papers — 2026-07-22

## Ingested
- [[openskillrisk-benchmarking-agent-safety-when-using-real-world-risky-third-party-skills]] — score 9: Comprehensive safety benchmark for LLM agents using third-party skills.
- [[janus-foreseeing-latent-risk-for-long-horizon-agent-safety]] — score 9: Directly addresses agent safety evaluation.
- [[weird-entry-without-score]] some trailing text

## Proposed new concepts (approve by adding to \`_system/concepts.md\`)
- Agent Safety Guard Models
- Calibrated Abstention

## Failures (will retry next run)
- 2607.18110: {'type': 'error', 'error': {'message': 'Overloaded'}}
`;

describe("parseDigest", () => {
  const d = parseDigest(DIGEST_RAW, "2026-07-22");

  it("parses ingested entries", () => {
    expect(d.date).toBe("2026-07-22");
    expect(d.ingested).toHaveLength(3);
    expect(d.ingested[0].slug).toMatch(/^openskillrisk/);
    expect(d.ingested[0].score).toBe(9);
    expect(d.ingested[0].reason).toMatch(/^Comprehensive safety/);
  });

  it("lenient fallback for non-matching wikilink bullets", () => {
    const w = d.ingested[2];
    expect(w.slug).toBe("weird-entry-without-score");
    expect(w.score).toBeNull();
    expect(w.reason).toBe("some trailing text");
  });

  it("parses proposed concepts and failures", () => {
    expect(d.proposedConcepts).toEqual(["Agent Safety Guard Models", "Calibrated Abstention"]);
    expect(d.failures).toHaveLength(1);
    expect(d.failures[0]).toMatch(/^2607\.18110/);
  });
});

describe("parseConceptsVocab", () => {
  it("parses bullet list", () => {
    const raw = "# Concept vocabulary\n\n- Agent Evaluation\n- RAG\n- Tool Use\n";
    expect(parseConceptsVocab(raw)).toEqual(["Agent Evaluation", "RAG", "Tool Use"]);
  });
});
