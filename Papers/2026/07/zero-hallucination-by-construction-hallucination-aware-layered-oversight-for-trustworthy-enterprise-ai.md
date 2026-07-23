---
arxiv_id: "2607.17883"
title: "Zero Hallucination, by Construction: Hallucination-Aware Layered Oversight for Trustworthy Enterprise AI"
authors: ["Bogdan Raduta", "Horia Velicu", "Alexandru Preda", "Serban Chiricescu"]
categories: [cs.CL, cs.AI]
published: 2026-07-20
score: 9
url: https://arxiv.org/abs/2607.17883
tags: [paper]
---

# Zero Hallucination, by Construction: Hallucination-Aware Layered Oversight for Trustworthy Enterprise AI

## TL;DR
HALO reframes 'zero hallucination' from an unachievable model property to an enforceable system property, presenting a six-layer defense-in-depth architecture that contains rather than eliminates hallucination. The key insight is that hallucination escape rate becomes the product of independent layers' miss rates, and that evidence-based confidence (verifying extracted values against source documents deterministically) breaks the correlated blind spots between an LLM generator and an LLM judge.

## Abstract
> Enterprises will not deploy AI agents they cannot trust, and the most-cited reason for distrust is hallucination: confident, fluent output that is simply not true. The common response is to wait for a model that does not hallucinate. We argue that this is the wrong target. Large language models are, by construction, capable of generating unsupported text, and no amount of scale removes the possibility; a faithfulness judge bolted onto a raw model catches some errors but still ships others, and even well-curated retrieval pipelines have been shown to fabricate citations. We reframe the goal: "zero hallucination" is not a property a model possesses but a property a system enforces. We present HALO (Hallucination-Aware Layered Oversight), an assurance architecture which treats hallucination as a containable failure mode rather than an eliminable one. HALO composes six layers of defense: grounded generation over retrieved, approved content; constrained, deterministic execution that bounds where the model can err; multi-signal verification that scores every output for groundedness and hallucination using both an LLM judge and evidence-based checks against the source text; calibrated abstention, so the system declines rather than guesses when grounding is insufficient; total traceability of every retrieval, tool call, and generation; and continuous oversight that detects drift, alerts on threshold breaches, and closes the loop by regenerating and statistically validating improved agents. We detail each layer, give particular attention to evidence-based confidence (which verifies extractions against the source document rather than trusting the model's self-reported certainty), and illustrate the architecture on a regulated claims-extraction workload

## Key Topics
- [[RAG]]
- [[Hallucination]]
- [[LLM-as-judge]]
- [[Agent Evaluation]]
- [[Agent Architectures]]
- [[Tool Use]]

## Highlights
- Core reframing: 'zero hallucination' is a property a system enforces, not one a model possesses; the model is allowed to be fallible, the harness is not allowed to pass fallibility through unseen.
- A single faithfulness judge with a 95% catch rate still ships 1 unsupported answer in 20 \u2014 thousands of unflagged errors monthly at production volume. Layered independent defenses make escape rate the product of individual misses.
- Evidence-based confidence verifies extracted values against the source document via exact/fuzzy/label-proximity matching plus cross-field arithmetic (line items sum to total, invoice date precedes due date) \u2014 catching confident fabrications an LLM judge is worst at, WITHOUT running through a model.
- Model self-reported confidence is explicitly rejected as a signal because it is poorly calibrated and often HIGH precisely when the model fabricated.
- Illustrative case study: claims-extraction agent scored hallucination 0.28 / correctness 0.72 (SLOs 0.20 / 0.90); the gate contained ungrounded extractions at request time, then a candidate fix (structured-output instruction + post-extraction validation) lifted correctness to 0.88 and cut hallucination to 0.08.
- Nine evaluation dimensions used: groundedness, hallucination, correctness (load-bearing trust signals) plus RAG coverage, tool use, refusal, toxicity, conciseness, helpfulness.
- Two-stage self-correction: offline experiments on golden datasets (paired test at 0.05 significance) gate what may ship; online canary (~10% traffic) with automatic rollback confirms it should ship.

## Method
HALO composes six layers around a generative core. Layer 1 (grounded generation): hybrid dense+BM25 retrieval, two-stage with cross-encoder reranking, plus agentic RAG that decomposes queries, grades candidates, and reformulates/retries. Layer 2 (constrained execution): agent workflows run as deterministic, checkpointed state machines (not open-ended loops) with hard limits on tool/model calls, PII redaction, and node-level guards to bound the blast radius and enable replay. Layer 3 (multi-signal verification): an LLM-as-judge scores groundedness/hallucination/correctness AND independent evidence-based checks match each extracted value against the source (exact/fuzzy/label-proximity) with field-specific weighted scorers and cross-field consistency (arithmetic, date ordering). Layer 4 (calibrated abstention): a verification gate routes below-threshold outputs to refusal, re-retrieval, or human escalation rather than answering. Layer 5 (total traceability): OpenTelemetry-native instrumentation logs every retrieval, tool call, prompt, and generation into one audit record. Layer 6 (continuous oversight): scores every run on nine dimensions, forms multi-metric baselines, runs statistical drift detection, and closes the loop by generating candidate fixes (structured-output instructions, validation nodes, temperature/model changes, negative examples), validating them offline on golden datasets then online via canary with auto-rollback. The document parser also grades OCR per page and escalates pages below 85% confidence to a stronger vision model.

## Evals & Results
The paper is an architecture description, not an empirical benchmark study \u2014 no standard public benchmarks are run. It cites RAGAS, FACTSCORE, and SelfCheckGPT as prior faithfulness/hallucination detection techniques it draws from. The only quantitative results are explicitly illustrative (chosen 'to expose the mechanism, not to report a customer result'): the Meridian Insurance claims-extraction case moving from hallucination 0.28/correctness 0.72 to 0.08/0.88 after a validated fix on a 50-case golden dataset, and a worked appendix example scoring a correct extraction at 1.00 weighted confidence versus a transposed-digit fabrication collapsing to ~0.30.

## So What (for practitioners)
Stop asking a vendor 'does your model hallucinate?' and instead ask: what grounds the answer, what independent signals verify it, what happens when it is unsure, can you show the trace, and how would you know if it degraded. Do NOT surface model self-reported confidence as a quality signal \u2014 it is high exactly when the model fabricates. For extraction/structured tasks, add deterministic source-anchored verification (string matching against source, arithmetic/consistency checks) as a signal independent of any LLM judge, since it catches plausible confident fabrications that an LLM judge misses and breaks the generator-judge correlation. Make abstention a first-class, monitored behavior with an explicit refusal metric. Run deterministic, checkpointed state machines rather than open agentic loops to bound failures and enable replay. Instrument everything (OpenTelemetry) for auditability. Treat faithfulness as continuously monitored, not certified once: baseline multiple metrics, detect drift, and gate fixes through offline golden-dataset experiments (with statistical significance) followed by online canary with automatic rollback. This byproduct-generates the documentation that NIST AI RMF, EU AI Act, and ISO/IEC 42001 increasingly require.

## Open Questions / Critiques
Containment is not elimination \u2014 a residual escape rate always remains, bounded by the product of layer miss rates, and no actual escape-rate numbers are reported. The whole approach depends on a checkable source; for genuinely generative or judgment tasks with no ground truth, it falls back to the weaker LLM-judge-plus-abstention combination whose blind spots remain correlated with the generator. Abstention trades coverage for safety and introduces a false-abstention rate whose right operating point is undetermined and domain-specific. Oversight, drift detection, and the self-correction loop are only as good as the representativeness of the golden datasets and baselines \u2014 an unrepresentative dataset can hide regressions or promote non-generalizing fixes. Crucially, there is NO empirical evaluation: all numbers are admittedly illustrative, so the actual real-world escape rate, cost of abstention, and correction-loop effectiveness are unvalidated. The nine-dimension eval and the claimed statistical significance are described but not demonstrated on any public benchmark.
