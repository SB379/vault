import { describe, it, expect } from "vitest";
import { parseIdeasNote } from "../lib/parse";

// Fixture copied from the real vault: Ideas/2026-07-22.md (trimmed to two ideas per section)
const IDEAS_RAW = `# Ideas — 2026-07-22

## Pipeline improvements

### Add an eval-gated promotion mechanism for the scoring/relevance model
When you retrain or update the LLM-based interest-scoring step, gate any change behind (a) a frozen golden set of hand-labeled papers you never train or tune prompts against, and (b) a per-category regression check.

*Why:* SIFT shows that a candidate improving aggregate accuracy can silently regress a business-critical class.
*Sources:* [[a-classifier-that-teaches-itself-self-improving-frozen-gate-training-sift-for-dynamic-document-classification]]

### Use a confidence cascade to reserve Opus for genuinely borderline papers
Replace uniform LLM scoring with a cheap first-pass classifier and only escalate low-confidence papers to the expensive LLM scorer.

*Why:* SIFT's cost cascade escalates only the 15-25% low-confidence minority to the LLM judge. PyroDash similarly shows small-model-first with escalation is cost-efficient.
*Sources:* [[a-classifier-that-teaches-itself-self-improving-frozen-gate-training-sift-for-dynamic-document-classification]], [[pyrodash-cost-efficient-token-level-small-large-language-model-collaborative-inference]]

## Build ideas

### A silent-failure fuzzing harness for tool-augmented agents
Build a middleware/proxy that injects empty, null, malformed, and index-collided payloads into an agent's tool responses.

*Why:* Guardrails-as-Scapegoats found 56.6% fabrication and safety-prompt-amplified fake refusals under silent failures.
*Sources:* [[guardrails-as-scapegoats-auditing-unfaithful-safety-refusals-in-tool-augmented-llm-agents]], [[failureatlas-a-taxonomy-of-failure-modes-in-multi-provider-llm-serving-infrastructure]]
`;

describe("parseIdeasNote", () => {
  const note = parseIdeasNote(IDEAS_RAW, "2026-07-22");

  it("parses date and section counts", () => {
    expect(note.date).toBe("2026-07-22");
    expect(note.pipelineImprovements).toHaveLength(2);
    expect(note.buildIdeas).toHaveLength(1);
  });

  it("parses idea title, description, rationale", () => {
    const first = note.pipelineImprovements[0];
    expect(first.title).toBe(
      "Add an eval-gated promotion mechanism for the scoring/relevance model"
    );
    expect(first.description).toMatch(/^When you retrain/);
    expect(first.description).not.toContain("*Why:*");
    expect(first.rationale).toMatch(/^SIFT shows/);
  });

  it("parses source slugs from wikilinks", () => {
    expect(note.pipelineImprovements[0].sourceSlugs).toEqual([
      "a-classifier-that-teaches-itself-self-improving-frozen-gate-training-sift-for-dynamic-document-classification",
    ]);
    expect(note.pipelineImprovements[1].sourceSlugs).toHaveLength(2);
    expect(note.buildIdeas[0].sourceSlugs).toEqual([
      "guardrails-as-scapegoats-auditing-unfaithful-safety-refusals-in-tool-augmented-llm-agents",
      "failureatlas-a-taxonomy-of-failure-modes-in-multi-provider-llm-serving-infrastructure",
    ]);
  });

  it("handles empty or malformed input", () => {
    const empty = parseIdeasNote("# Ideas — 2026-01-01\n", "2026-01-01");
    expect(empty.pipelineImprovements).toEqual([]);
    expect(empty.buildIdeas).toEqual([]);
  });
});
