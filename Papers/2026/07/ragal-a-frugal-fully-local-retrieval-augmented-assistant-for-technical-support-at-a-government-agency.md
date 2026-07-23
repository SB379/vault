---
arxiv_id: "2607.18756"
title: "RAGAL: A Frugal, Fully Local Retrieval-Augmented Assistant for Technical Support at a Government Agency"
authors: ["Dan Musetoiu"]
categories: [cs.IR, cs.CL]
published: 2026-07-21
score: 9
url: https://arxiv.org/abs/2607.18756
tags: [paper]
---

# RAGAL: A Frugal, Fully Local Retrieval-Augmented Assistant for Technical Support at a Government Agency

## TL;DR
An experience report on RAGAL, a fully on-premise Romanian-language RAG assistant for government technical support, built under three hard constraints: zero data egress, read-only mandate, and a single 8 GB consumer laptop. The core lesson is that retrieval engineering and retriever fine-tuning (not a bigger generator) delivered the biggest gains, and that most apparent 'model inadequacy' was actually recoverable system/config engineering.

## Abstract
> Public institutions hold large volumes of sensitive documents and support tickets that cannot leave the premises, ruling out cloud-hosted language models entirely. We report on RAGAL, a retrieval-augmented assistant for the technical-support team of AFIR, the Romanian Agency for Financing Rural Investments, built and operated under three hard constraints: zero data egress (no external API calls, even for synthetic data), a read-only mandate (the assistant drafts, humans execute), and a single 8 GB consumer laptop as the only development and training machine. Over a Romanian-language corpus of ~25,000 chunks -- 15,073 resolved support tickets and internal normative documents -- we show that the highest-leverage investments were retrieval engineering and retriever fine-tuning rather than a larger generator: hybrid dense-sparse retrieval with intent routing raised our internal evaluation from 62% to 81%, and fine-tuning the bge-m3 embedder on real ticket data improved recall@10 from 0.663 to 0.850 (MRR 0.489 to 0.684) after 72 minutes of training. We document a general pitfall: single-domain fine-tuning silently degraded retrieval on the untouched document domain below the stock baseline, detected only after building a per-domain evaluation set and repaired with locally generated queries (GenQ). We report two counter-intuitive findings -- PII masking improved generation quality, and a structural "anchor distillation" scheme made SQL hallucination impossible by construction -- along with a reproducible recipe for full embedder fine-tuning in 8 GB of VRAM. Finally, since zero egress also rules out a cloud judge, we describe a substitute: a 744B-parameter model run on CPU, too slow to serve interactively but affordable in overnight batch, used as a second opinion whose limits we quantify. We release the sanitized pipeline scripts for institutions facing similar data-locality constraints.

## Key Topics
- [[RAG]]
- [[Fine-tuning]]
- [[Agent Evaluation]]
- [[LLM-as-judge]]
- [[Serving & Inference]]
- [[Synthetic Data]]

## Highlights
- Hybrid dense-sparse retrieval + intent routing raised internal golden eval from 62% to 81% before any fine-tuning — the cheapest gain in the project.
- Fine-tuning bge-m3 (568M) on real ticket data improved recall@10 from 0.663 to 0.850 and MRR from 0.489 to 0.684 after only 72 minutes of training on an 8 GB laptop.
- Single-domain fine-tuning (tickets only, ft-v1) silently regressed the untouched document domain below stock baseline (R@10 0.881→0.849, MRR −5.1 pts); detected only via a per-domain eval set and repaired with locally-generated GenQ queries (ft-v2).
- PII masking counterintuitively improved generation: golden eval rose from 20/27 to 23/27, with masked placeholders teaching the model to emit parameterized SQL templates instead of copying real values.
- 'Anchor distillation' (copy medoid ticket's SQL verbatim, LLM writes only prose, splice-guard strips generated SQL) made SQL hallucination impossible by construction — naive distillation had produced 23/41 playbooks with fabricated destructive DELETE/COMMIT statements.
- A 3-bit (Q3_K_M, 5.7 GB) generator fully in VRAM beat the same 12B model in full precision with CPU spill: 42 tok/s decode, hard-case latency dropped from minutes to 12.6s, scoring 48/48 on the gate.
- A parent-document expansion fix raised coverage of ground-truth identifiers from 46% to 83% and complete transactional SQL skeletons from 19/27 to 23/27, found via slow-judge campaign forensics.

## Method
RAGAL is a conventional RAG stack (FastAPI, Streamlit, PostgreSQL+pgvector, Redis, Ollama) over ~25K Romanian chunks (15,073 resolved tickets + 815 document chunks). Retrieval fuses bge-m3 dense (1024-d) with Romanian full-text sparse search via reciprocal rank fusion, plus lightweight intent routing that boosts documentary classes for procedure questions and restricts to SQL-bearing chunks for DB-modification questions. Escalation tiers (T0 templated, T1 single-shot RAG, T2 larger local model for SQL drafting, T3 human handoff) use retrieval similarity as the free router signal. Rule-based interceptors deterministically handle identity and live-data lookups before the LLM. Corpus construction fetches ticket notes (not just resolution fields), raising SQL coverage from ~0.7% to ~9%; two-pass PII masking replaces identifiers with typed placeholders using regex families plus a document-frequency-capped harvested name dictionary. Embedder fine-tuning uses full fine-tuning of bge-m3 in 8 GB VRAM via 8-bit AdamW (bnb) + non-reentrant gradient checkpointing (~117 s/step, no PCIe spill), CachedMultipleNegativesRanking loss (effective batch 64), lr 2e-5, one epoch, 2 hard negatives/query, diacritics stripped at embedding time to fix NaN crashes. Zero-egress synthetic query generation (GenQ) uses local gemma3:12b via Ollama to repair the document domain. Evaluation splits deterministic (blocking) from generative (non-blocking) assertions to handle GPU non-determinism. A zero-egress LLM-as-judge uses a 744B MoE (GLM-5.2 int4) run on CPU with experts streamed from NVMe (0.2–0.3 tok/s decode) in overnight batch.

## Evals & Results
IR eval: 300 held-out ticket queries against a 4,000-ticket pool, and 126 synthetic (GenQ) document queries against 815 chunks. Embedder bake-off showed bge-m3 (R@10 0.663) beat Qwen3-Embedding-0.6B (0.580), EmbeddingGemma (0.627), and fp16 vs quantized was within noise — so swapping models was the wrong lever. ft-v1 (tickets-only) hit ticket R@10 0.850 but regressed documents to 0.849; ft-v2 (tickets+GenQ) kept ticket gains (0.850) and repaired documents to at/above stock (R@20 0.913→0.952) — ft-v2 is the served model. Golden eval (27 machine-checkable assertions on 21 real questions) tracked 74%→85%→100% as retrieval, masking, serving config, and prompt guards were fixed, reaching 48/48 with anti-leak invariants. Serving: 3-bit build scored 48/48 vs citation-misses/timeouts for full-precision CPU-spill. Slow-judge campaign: 151 verdicts over one weekend (~9 min each), 96% of tickets rated at least partially aligned, mean grade 4.17/5, per-application means separating (target portal app lowest at 3.00). Human meta-audit of 45/151 verdicts found ~76% sound with both scale extremes unreliable.

## So What (for practitioners)
Spend engineering effort where measurement says it matters: retrieval (hybrid + routing) and retriever fine-tuning beat upgrading the generator. Always build per-domain eval sets before fine-tuning a shared embedder — single-domain fine-tuning silently damages sibling domains. Treat hallucination structurally (interceptors, verbatim anchor distillation) rather than via prompts, which are fragile on small models. PII masking is a quality feature that curbs copy-paste of real values. Audit serving defaults (context-window, chat-template CoT budget, zombie processes holding VRAM) — config omissions produce failures indistinguishable from model weakness. On consumer GPUs watch for silent VRAM spill (growing step-times, per-process shared-memory counter), not OOM; 8-bit optimizer + gradient checkpointing is the cure. Quantize to fit VRAM and validate the quant against your own eval gate rather than perplexity folklore. Zero-egress deployments are fully workable, including local synthetic data generation and a slow batch LLM-as-judge. Replay real incidents — the cheapest red-teaming, each yielding a permanent guard. Use judge aggregates to prioritize, never act on individual verdicts without human confirmation.

## Open Questions / Critiques
Results come from a single corpus, single language (Romanian), and single institution, with modest IR test sets (300 and 126 queries). Document-domain numbers use synthetic in-distribution GenQ queries and are admittedly optimistic (only same-set model comparisons are valid). There is no formal user study. The generator is used off-the-shelf; generator fine-tuning for factual discipline remains future work. The 744B judge is only a second opinion — human meta-audit found ~76% verdicts sound with unreliable behavior at both scale extremes, and its rubric was highly sensitive (a role-mismatch manufactured a phantom 60% hallucination rate). Key improvements were measured by exact-match string metrics rather than the judge, so generative quality claims rest partly on limited/imperfect judgment. Overall this is an experience report with practical rather than algorithmic novelty and limited generalizability guarantees.
