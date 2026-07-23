import { describe, it, expect } from "vitest";
import { parseBacklogItem } from "../lib/parse";

const PROPOSED = `---
title: "Batch API for summaries"
status: proposed
source: manual
created: 2026-07-23
---

Route daily summarization through the Batches API.
Second line of the description.
`;

const SPECCED = `---
title: "Better parsing"
status: specced
source: ideas:2026-07-22
created: 2026-07-23
---

some pipeline thing

## Spec
The problem is X.

- bullet

## Build plan
1. do this
`;

describe("parseBacklogItem", () => {
  it("parses a proposed item", () => {
    const item = parseBacklogItem(PROPOSED, "002-batch-api-for-summaries.md");
    expect(item).not.toBeNull();
    expect(item!.seq).toBe(2);
    expect(item!.slug).toBe("002-batch-api-for-summaries");
    expect(item!.title).toBe("Batch API for summaries");
    expect(item!.status).toBe("proposed");
    expect(item!.source).toBe("manual");
    expect(item!.created).toBe("2026-07-23");
    expect(item!.description).toContain("Batches API");
    expect(item!.description).toContain("Second line");
    expect(item!.spec).toBe("");
    expect(item!.buildPlan).toBe("");
  });

  it("parses a specced item's Spec and Build plan sections", () => {
    const item = parseBacklogItem(SPECCED, "001-better-parsing.md");
    expect(item!.status).toBe("specced");
    expect(item!.source).toBe("ideas:2026-07-22");
    expect(item!.description).toBe("some pipeline thing");
    expect(item!.spec).toContain("The problem is X.");
    expect(item!.spec).toContain("- bullet");
    expect(item!.buildPlan).toContain("1. do this");
    expect(item!.spec).not.toContain("Build plan");
  });

  it("rejects malformed items", () => {
    expect(parseBacklogItem(PROPOSED, "no-seq-prefix.md")).toBeNull();
    const badStatus = PROPOSED.replace("status: proposed", "status: wat");
    expect(parseBacklogItem(badStatus, "003-x.md")).toBeNull();
  });
});
