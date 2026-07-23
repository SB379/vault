import { describe, it, expect } from "vitest";
import { parseResearchNote } from "../lib/parse";

const RESEARCH_RAW = `---
idea_title: "Eval harness for agents"
date: 2026-07-22
sources: [fresh-one, fresh-two]
---

# Eval harness for agents

## Verdict
**CROWDED** — several funded startups and mature OSS projects already target agent evaluation.

## Existing players
- LangSmith — tracing and eval platform from LangChain.
- Braintrust — eval and prompt-management SaaS.

## Differentiation angle
Focus on multi-turn adaptive adversaries rather than static datasets.

## Evidence
- https://example.com/langsmith
- https://example.com/braintrust
`;

describe("parseResearchNote", () => {
  const note = parseResearchNote(RESEARCH_RAW, "2026-07-22-eval-harness-for-agents.md");

  it("parses metadata", () => {
    expect(note.date).toBe("2026-07-22");
    expect(note.ideaTitle).toBe("Eval harness for agents");
    expect(note.slug).toBe("2026-07-22-eval-harness-for-agents");
  });

  it("extracts the verdict", () => {
    expect(note.verdict).toBe("CROWDED");
  });

  it("body strips frontmatter and the H1 title", () => {
    expect(note.body.startsWith("## Verdict")).toBe(true);
    expect(note.body).toContain("## Existing players");
    expect(note.body).not.toContain("idea_title");
  });

  it("returns null verdict when the section is missing or unrecognized", () => {
    const none = parseResearchNote("## Notes\nnothing here\n", "2026-01-01-x.md");
    expect(none.verdict).toBeNull();
    expect(none.date).toBe("2026-01-01");
    expect(none.ideaTitle).toBe("2026-01-01-x");
  });

  it("parses GAP verdicts", () => {
    const gap = parseResearchNote(
      "## Verdict\n**GAP** — nothing comparable found.\n",
      "2026-01-02-y.md"
    );
    expect(gap.verdict).toBe("GAP");
  });
});
