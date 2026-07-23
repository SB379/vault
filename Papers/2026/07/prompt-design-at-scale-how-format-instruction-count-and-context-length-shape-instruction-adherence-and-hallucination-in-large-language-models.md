---
arxiv_id: "2607.19257"
title: "Prompt Design at Scale: How Format, Instruction Count, and Context Length Shape Instruction Adherence and Hallucination in Large Language Models"
authors: ["Netanel Eliav"]
categories: [cs.CL, cs.AI]
published: 2026-07-21
score: 9
url: https://arxiv.org/abs/2607.19257
tags: [paper]
---

# Prompt Design at Scale: How Format, Instruction Count, and Context Length Shape Instruction Adherence and Hallucination in Large Language Models

## TL;DR
A controlled study crossing prompt format (markdown, plain, prose, table) against two scale axes—instruction count (10–160) and context length (2k–512k tokens)—on a contamination-free synthetic corpus across five models. The headline: no format wins consistently, instruction-following collapses to zero by N=80 regardless of format, and the real long-context failure mode is refusal (up to ~90%), not hallucination or sycophancy.

## Abstract
> Practitioners make three prompt-design decisions with almost no controlled evidence behind them: how to format instructions and context (markdown, plain text, prose, or tabular), how many simultaneous instructions a system prompt can carry before compliance degrades, and how much context a model can hold before recall and honesty degrade. We report two controlled experiments crossing all three factors on one held, contamination-free synthetic corpus (the "Book of Veyra," 8,780 uniquely-named entities, deterministically regenerable from a fixed seed), evaluated across five models. Experiment 1 (960 calls/model) measures instruction-following decay as rule count N grows from 10 to 160, crossed with four formats and system-prompt vs. user-turn placement. Perfect-response rate collapses to zero by N=80 for every model, format, and placement. Placement produces effects at least as large as format at N=160 in most models, but the direction is model-specific. No model shows a reliable markdown advantage; one 35B model favors plain text instead. Experiment 2 (5,520 calls/model) measures recall accuracy, false-premise sycophancy, and absent-fact fabrication across a 2k-to-512k-token context ladder in the same four formats. Recall stays near ceiling through 64-128k tokens, then degrades sharply and format-dependently: one model's accuracy spread reaches 48 points at 128k tokens. Fabrication never occurs (0/5,760 probes), and sycophancy stays negligible (<=8.3%). What rises sharply near each model's context ceiling is outright refusal to answer (0% to 79-90%), distinct from sycophancy or fabrication. Neither pre-registered format ordering holds, and token overhead (+22% to +37% over plain text) further changes which format is preferable where accuracy spread is genuine. We release the full harness, corpus generator, and raw results (VeyraBench): https://github.com/iNetanel/veyrabench

## Key Topics
- [[Prompt Engineering]]
- [[Benchmarks]]
- [[Hallucination]]
- [[Context Management]]
- [[Synthetic Data]]
- [[RAG]]

## Highlights
- Perfect-response rate on multi-instruction prompts collapses to zero by N=80 for every model, every format, and both placements—a hard floor, not a gradual asymptote (steep decline already by N=40).
- No format has a reliable winner: no consistent markdown advantage; one 35B open-weight Qwen model reliably favored plain text (gap widening to 4.8pp at N=160).
- Prompt placement (system vs. user turn) produced effects as large or larger than format in 4/5 models, but direction is model-specific: user-turn helped 2 models (+6.6pp, +5.1pp), hurt 2 (−8.7pp, −1.8pp), null for 1.
- Recall stays near ceiling through ~64–128k tokens then degrades format-dependently; Claude Haiku hit a 48.4pp format spread at 128k (plain collapsed to 38.3% while other formats sat at 82–87%).
- Fabrication never occurred (0/5,760 absent-fact probes); sycophancy stayed negligible (≤8.3%). What rose sharply near each model's context ceiling was outright refusal (0%→79–90%).
- Neither pre-registered structure hypothesis held: 'prose' (predicted worst) was best/tied-best in 3 of 5 illustrative cells; the same format is best for one model/rung and worst for another.
- Format token overhead is +22–37% over plain (markdown 1.258×, prose 1.221×, table 1.367×); cost-adjustment can reverse format rankings where genuine accuracy gaps exist.

## Method
Two controlled experiments on the 'Book of Veyra,' a deterministic, LLM-free synthetic corpus of 8,780 uniquely-named fictional entities (systems, guilds, creatures) regenerable byte-identically from seed 42 (verified via MD5), rendered in four content-identical formats (markdown, plain, prose, table). Experiment 1: a block of N∈{10,20,40,80,120,160} programmatically verifiable rules (word-count ranges, required/forbidden words, exact opening/closing text, paragraph counts) placed in system prompt or user turn; scored by regex/word-boundary matching (no LLM-as-judge), 20 trials per cell, 960 calls/model. Primary metric is perfect-response rate (all rules satisfied). Experiment 2: corpus sliced into a 2k–512k token ladder (six rungs), probed with recall (unguessable facts), false-premise (sycophancy test), and absent-fact (fabrication test) questions at three needle depths (10/50/90%), 3 repeats per question at provider-default temperature. A fixed 20-question anchor set drawn from the 2k rung is re-asked unchanged at every rung to enable valid apples-to-apples cross-rung comparison. Token counts measured with the o200k_base tokenizer. Five models: Claude Sonnet 5, Claude Haiku, Gemini Flash, Qwen 27B, Qwen 35B (reasoning disabled on Qwen). Chance baseline for recall confirmed ~zero by using only unguessable facts.

## Evals & Results
Custom benchmark (VeyraBench). Experiment 1 (4,800 scored trials across models): all five models at zero perfect-response by N=80; markdown-minus-plain deltas ≤2.1pp and not reliably signed for 4/5 models; Qwen 35B favored plain 5/6 N-levels. Placement effect statistically distinguishable (Wilson CIs) in 4/5 models; Gemini Flash knee shifted N≈82→46 under user placement (harmful), Haiku N≈98→104 (mildly helpful). Gemini Flash showed a model-specific prose/table collapse at N≥40 (−13 to −18pp) traced to hidden-reasoning leakage. Experiment 2 (30,480 scored responses): recall at ceiling (0.98–1.00) through 64k; separation emerges at 128k+. Fabrication 0/5,760; peak sycophancy 8.3% (Qwen 35B). Refusal on false-premise probes climbed to 89.6% (Haiku@128k) and 78.8% (Sonnet 5@512k). Format spread tracks proximity to each model's effective ceiling, not absolute tokens (Sonnet spread doubled 256k→512k while Gemini stayed flat, despite same 1M ceiling). Anchor set caught composition artifacts (e.g., Gemini's apparent 256k→512k markdown improvement was spurious).

## So What (for practitioners)
Do not default to markdown (or any format) without testing your specific model—format effects are small, inconsistent, and reverse across models and scales. Treat ~40 simultaneous instructions as a redesign point: past this, splitting instructions across turns, tools, or a validation pass beats adding formatting polish, since compliance floors by N=80 regardless of format. Test both system-prompt and user-turn placement empirically—it's a free lever moving adherence up to ~8.7pp with model-specific direction. Near a model's advertised context ceiling, monitor for refusal (silent 'insufficient information' non-answers), not just wrong or sycophantic answers—refusal is the dominant failure mode there. Run cost-adjusted accuracy checks only where a real accuracy gap exists, since format overhead (22–37%) can flip which format is the better value.

## Open Questions / Critiques
Single fictional domain only—unclear whether findings transfer to code, legal, or numerical business data. Only five models across three families and two tiers (not randomly sampled); specific thresholds (N=80, 89.6% refusal) are model-specific and shouldn't be assumed portable. Small tail samples (20 trials/cell in Exp 1, 60 questions/cell in Exp 2). Rules and facts are programmatically verifiable by design—softer, real-world instructions and knowledge untested. JSON/YAML machine formats not tested. The zero-fabrication result is confounded with rising refusal: the absent-probe null cannot distinguish genuine verification of absence from reflexive abstention, and the paper cannot determine whether near-zero fabrication reflects real capability or alignment-trained reluctance (would require base vs. instruction-tuned comparison). Gemini's prose/table collapse documented behaviorally but not diagnosed at token/attention level. Standardized o200k_base tokenizer may not match provider billing/context counts.
