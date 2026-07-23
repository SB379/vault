import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

let tmp: string;

const PAPER = `---
arxiv_id: "1234.5678"
title: "Test Paper"
authors: ["A"]
categories: [cs.AI]
published: 2026-07-20
score: 8
url: https://arxiv.org/abs/1234.5678
tags: [paper]
---

# Test Paper

## TL;DR
Short.

## Key Topics
- [[RAG]]
`;

const DIGEST = `# Daily papers — 2026-07-20

## Ingested
- [[test-paper]] — score 8: good stuff.
`;

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vault-test-"));
  await fs.mkdir(path.join(tmp, "Papers/2026/07"), { recursive: true });
  await fs.mkdir(path.join(tmp, "Daily"), { recursive: true });
  await fs.mkdir(path.join(tmp, "_system"), { recursive: true });
  await fs.mkdir(path.join(tmp, "Concepts"), { recursive: true });
  await fs.writeFile(path.join(tmp, "Papers/2026/07/test-paper.md"), PAPER);
  await fs.writeFile(path.join(tmp, "Papers/2026/07/broken.md"), "---\nbad: [\n---\nx");
  await fs.writeFile(path.join(tmp, "Daily/2026-07-20.md"), DIGEST);
  await fs.writeFile(path.join(tmp, "_system/concepts.md"), "- RAG\n- Tool Use\n");
  await fs.writeFile(path.join(tmp, "Concepts/RAG.md"), "# RAG\n");
  process.env.VAULT_ROOT = tmp;
});

afterAll(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("vault.ts integration", () => {
  it("reads the temp vault end to end", async () => {
    const vault = await import("../lib/vault");
    expect(vault.VAULT_ROOT).toBe(tmp);

    const papers = await vault.getAllPapers();
    expect(papers).toHaveLength(1); // broken.md skipped
    expect(papers[0].slug).toBe("test-paper");
    expect(papers[0].sections.keyTopics).toEqual(["RAG"]);

    expect((await vault.getPaper("test-paper"))?.title).toBe("Test Paper");
    expect(await vault.getPaper("nope")).toBeNull();

    const digests = await vault.getAllDigests();
    expect(digests).toHaveLength(1);
    expect(digests[0].ingested[0]).toEqual({
      slug: "test-paper",
      score: 8,
      reason: "good stuff.",
    });
    expect((await vault.getLatestDigest())?.date).toBe("2026-07-20");

    expect(await vault.getConcepts()).toEqual(["RAG", "Tool Use"]);
    expect(await vault.getConceptPageNames()).toEqual(["RAG"]);

    const forConcept = await vault.getPapersForConcept("rag");
    expect(forConcept.map((p) => p.slug)).toEqual(["test-paper"]);

    const reasons = await vault.getScoreReasons();
    expect(reasons.get("test-paper")).toBe("good stuff.");
  });
});
