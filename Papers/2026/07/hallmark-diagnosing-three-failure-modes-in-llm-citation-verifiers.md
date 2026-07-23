---
arxiv_id: "2607.18360"
title: "HALLMARK: Diagnosing Three Failure Modes in LLM Citation Verifiers"
authors: ["Patrik Reizinger", "Wieland Brendel"]
categories: [cs.CR, cs.AI, cs.LG]
published: 2026-07-20
score: 9
url: https://arxiv.org/abs/2607.18360
tags: [paper]
---

# HALLMARK: Diagnosing Three Failure Modes in LLM Citation Verifiers

## TL;DR
HALLMARK is a benchmark of 2,526 BibTeX entries across 14 hallucination types, 3 difficulty tiers, and 6 diagnostic sub-tests, used to evaluate citation-verification tools (DOI lookup, 12 zero-shot LLMs, agentic harnesses, and a co-designed rule-based tool). The central finding: false-positive rate (FPR), not recall, decides whether a citation verifier is deployable, and this manifests as three concrete failure modes—agentic FPR inflation, base-rate precision collapse, and post-training-cutoff over-flagging.

## Abstract
> Large language models (LLMs) now routinely draft literature reviews and assist with academic writing, which means a higher risk of fabricated references: GPTZero found 53 papers with hallucinated citations among NeurIPS 2025's accepted set. Rule- and LLM-based verifiers are emerging, but no shared benchmark compares them and gives detailed failure diagnostics. We close that gap with HALLMARK (Hallucination benchmark): 2,526 BibTeX entries spanning 14 hallucination types, three difficulty tiers, six diagnostic sub-tests per entry, and a contamination-resistant held-out split. On it we evaluate a DOI-lookup baseline, frontier LLMs zero-shot, tool-augmented agents, and our own rule-based, co-designed verifier bibtex-updater. Across the benchmark one result is consistent: the false-positive rate, not recall, decides whether a verifier is deployable. HALLMARK makes it concrete through three failure modes: agentic lookups buy recall but inflate false positives; at a venue-realistic base rate, the order-of-magnitude spread in false-positive rates (FPRs) -- not recall -- governs whether a verifier's flags are mostly true catches or mostly noise; and most LLMs over-flag papers published past their training cutoff, where only the two latest-cutoff models hold their false-positive rate near in-distribution levels (a signal we report as descriptive, since it is confounded with possible recall of those entries). Thus FPR is the deployment bottleneck, but an undetected fabrication remains the costlier error for the scientific record.

## Key Topics
- [[Benchmarks]]
- [[Agent Evaluation]]
- [[Hallucination]]
- [[Tool Use]]
- [[LLM-as-judge]]
- [[Evaluation Harnesses]]

## Highlights
- Zero-shot LLMs span a wide recall–precision spectrum: DR 48–91% with FPR ranging an order of magnitude (0.050 to 0.702); a DOI-only baseline catches only 27% (Tier-1 concentrated).
- Failure mode (i): agentic 5-call lookups push recall to 0.97–0.99 but inflate FPR to 0.43–0.48 (~5x the rule-based reference) because the model flags on any single database's no-match; switching from any-no-match to consensus flagging cuts FPR from 0.73 to 0.05 (~15x reduction).
- Failure mode (ii): at a venue-realistic ~2% hallucination base rate, the best verifier reaches only ~18% PPV (1 true hallucination per 6–9 flags) while high-FPR open-weight models fall to <1 in 35; PPV ordering is prevalence-invariant, governed by FPR via Bayes' rule.
- Failure mode (iii): on a 448-entry 2024–2025 supplement, 8 of 12 LLMs over-flag sharply (FPR 0.59–0.89); only the two latest-cutoff Anthropic models hold (Opus 4.7 0.073, Sonnet 4.6 0.120), but this is confounded with possible training-data recall.
- Claude Opus 4.7 and Sonnet 4.6 form the best-calibrated low-FPR frontier (ECE 0.112, 0.066); the co-designed bibtex-updater is cheapest and most cross-split stable (FPR shifts only +2.4pp), with a two-stage cascade reaching DR ~0.99 at FPR ~0.11.
- Findings replicate on authentic multidisciplinary ChatGPT citations (Walters–Wilder supplement): subtle corruptions (swapped_authors DR ≤0.25) remain the hard class and FPR spans 0.029–0.860.
- A metadata-only logistic classifier beats majority baseline by just 4.6pp (below 5pp shortcut bar), and no model emitted canary tokens, supporting contamination resistance.

## Method
The authors built HALLMARK from ~1,036 valid DBLP-scraped BibTeX entries (NeurIPS/ICML/ICLR/AAAI/CVPR, 2021–2023) plus 1,490 hallucinated entries generated four ways: deterministic field perturbation, LLM generation (GPT-5.1), adversarial hand-crafting, and real-world collection from documented incident audits (NeurIPS 2025, GhostCite, HalluCitation). Each entry carries 6 binary sub-tests (DOI resolves, title exists, authors match, venue correct, fields complete, cross-DB agreement) that localize why a verifier fails, plus a 3-tier difficulty taxonomy (Tier 1 single lookup, Tier 2 cross-referencing, Tier 3 semantic reasoning). Splits are deterministic (seed 8042), stratified, with a withheld test_hidden set, canary strings for contamination detection, and temporal segmentation à la LiveCodeBench. Evaluation uses prevalence-independent metrics (DR=recall, FPR, MCC) plus tier-weighted F1 and ECE calibration. Tools evaluated: DOI-only resolver, 12 zero-shot LLMs via native/OpenRouter APIs (temperature 0, seed 42, JSON output), 4 agentic harnesses (up to 5 tool calls against CrossRef/OpenAlex/arXiv or bibtex-updater), and the co-designed rule-based bibtex-updater (flagged as an upper-bound reference, excluded from ranking due to co-design). A shared pre-screening layer (DOI format, year bounds, author heuristics) runs before every tool. Statistics use stratified bootstrap CIs (10k resamples), paired bootstrap tests, and per-type MDE analysis (15–26pp at n≈30).

## Evals & Results
Main results on dev_public (1,119 entries) and cross-split test_public (831). Baselines: DOI-only (DR 0.27, FPR 0.19), zero-shot LLMs (Gemini 2.5 Pro conservative at DR 0.48/FPR 0.05; DeepSeek-V3.2 aggressive at DR 0.91/FPR 0.70). Best-calibrated low-FPR frontier: Opus 4.7 (DR 0.75/FPR 0.07), Sonnet 4.6 (DR 0.78/FPR 0.13). GPT-5.1 zero-shot DR 0.84/FPR 0.41. Agentic harnesses lift DR to 0.97–0.99 but FPR to 0.43–0.48. Co-designed bibtex-updater: DR 0.865/FPR 0.092, most cross-split stable. Stage-2 cascade (bibtex-updater + Sonnet 4.6 diagnoser) is the best config: DR 0.996 at FPR 0.108. Cross-split: precision-end LLMs move ≤1pp FPR, recall-aggressive models drift +6.9 to +8.2pp. Temporal supplement showed sharp degradation for 8/12 models past cutoff. External Walters–Wilder ChatGPT corpus (341 entries) replicated the swapped_authors hard-class and FPR-spread findings. Ranking survives paraphrase ablation (Spearman ρ=0.90) and all five tier-weighting schemes.

## So What (for practitioners)
Rank citation verifiers by FPR and calibration, not recall, in low-prevalence audit regimes: at ~2% base rate, a few points of FPR decide whether flags are worth reviewer attention (best case only ~18% PPV). Choose by regime (Table 6): use a cheap low-FPR rule-based tool (bibtex-updater) for pre-submission self-checks; use the two-stage cascade when recall must rise without inflating FPR; use high-recall agentic/aggressive tools only when misses are far costlier than false alarms or a downstream human filter absorbs them. For agentic retrieval verifiers, never flag on any-single-source no-match—use consensus-absence + contradiction checks (cuts FPR ~15x), since CrossRef/OpenAlex/arXiv have partial non-overlapping coverage. Distrust LLM verifiers on papers published after their training cutoff—they over-flag ('flag everything unfamiliar'); databases also lag weeks-to-months on new preprints. Subtle corruptions of real works (author swaps, near-miss titles) are the hard class for all standalone verifiers because tools resolve by title then accept without re-checking authorship. LLM verification costs ~2 orders of magnitude more than rule-based tools with agentic adding 2–5x more; open-weight model confidence scores are effectively uninformative for triage.

## Open Questions / Critiques
The synthetic–real equivalence is untested at scale (only 108 real-world entries, KS tests underpowered); whether rankings on synthetic hallucinations predict real-error performance is open. bibtex-updater is co-designed with the taxonomy, so its strong numbers are an upper-bound reference, not a fair head-to-head. The temporal 'later-cutoff resistance' finding is explicitly descriptive and confounded—low FPR on valid DBLP entries is indistinguishable from training-data recall; it rests on N=2 Anthropic models and a single third-party control, with no native-API replication and a model-self-reported recall probe. Endpoint drift is severe: Anthropic OpenRouter FPR roughly doubled in a later snapshot (>13pp divergence), coverage cells are unrecoverable, and floating model aliases make results reproducible only as dated snapshots. Absolute FPR is prompt-sensitive (10–37pp shift on wording alone), so only rankings are trusted. Coverage is limited to English ML-venue BibTeX 2021–2023; cross-domain FPR rises (biomedical FPR 0.375, partly a recency artifact). Only an automated LLM-rater reliability proxy (Fleiss κ=0.24, fair) exists—no human inter-annotator agreement. Compute caps prevented full evaluation of reasoning/extended-thinking modes, and rate limits excluded HaRC/verify-citations.
