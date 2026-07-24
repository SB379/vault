---
arxiv_id: "2607.19794"
title: "TriAgent: Divergence-Aware Multi-Agent Committees for Cost-Efficient Financial Sentiment Analysis"
authors: ["Isabel Xu", "Cynthia Xu", "Rachel Ren", "Cong Guo", "Jiacheng Ding"]
categories: [cs.CL, cs.CE, cs.DB, cs.LG]
published: 2026-07-22
score: 9
url: https://arxiv.org/abs/2607.19794
tags: [paper]
---

# TriAgent: Divergence-Aware Multi-Agent Committees for Cost-Efficient Financial Sentiment Analysis

## TL;DR
TriAgent is a three-tier financial sentiment committee stratified by contextual granularity (VADER word-level, FinBERT sentence-level, Qwen cross-sentence reasoner), gated by a Semantic Divergence Index (SDI) that measures pairwise agent disagreement to route queries cost-efficiently. The central finding is a 'critic plateau': re-tasking a small LLM as a conflict resolver over cheaper agents reaches F1≈0.87 regardless of LLM size (1.5B–7B), while same-size persona voting collapses to F1=0.66—proving granularity diversity, not multi-agent voting, is what matters. At 10M-user scale it claims $9.3M/year savings vs GPT-4o-mini.

## Abstract
> Production LLM-based financial sentiment analysis faces a structural cost trap: most queries are trivially classifiable, yet expensive cloud reasoners process them all, and the bill scales linearly with user count. We present TriAgent, a multi-agent committee stratified by contextual granularity -- a word-level lexicon (VADER), a sentence-level domain transformer (FinBERT), and a cross-sentence reasoner (Qwen2.5, 0.5B-14B-4bit, with Mistral-7B and Phi-3.5-mini cross-family checks). A three-way Semantic Divergence Index (SDI) measures pairwise disagreement across granularities and routes each query accordingly. Our central finding is the critic plateau: when the LLM is re-tasked as a critic over the smaller agents' outputs, F1 plateaus at ~0.87 across 1.5B-7B Qwen (bootstrap 95% CIs overlap), while a same-size 3-persona vote drops to F1=0.66, which is driven by granularity-stratified diversity. Three corollaries follow from the same SDI signal: (i) a Shared Consensus Dictionary on multilingual sentence-BERT answers 95% of Chinese queries from an English cache at F1=0.99 -- cross-border canonicalization at zero marginal cost; (ii) SDI doubles as a post-hoc LLM-hallucination detector at AUC=0.90; (iii) the SDI single-stage strategy attains the best risk-adjusted return (Sharpe=3.50) on a 20-ticker back-test, dominating both always-FinBERT (1.36) and always-LLM (0.11). At 10M-user scale, TriAgent saves $9.3M/year vs. a GPT-4o-mini baseline. Code, lexicons, and the SCD are released.

## Key Topics
- [[Multi-agent Systems]]
- [[LLM-as-judge]]
- [[Agent Architectures]]
- [[Hallucination]]
- [[Serving & Inference]]
- [[Benchmarks]]

## Highlights
- Critic plateau: a small LLM re-tasked as conflict resolver over VADER+FinBERT outputs reaches F1≈0.87 uniformly across Qwen 1.5B/3B/7B (bootstrap 95% CI [0.860,0.880] overlap), so interaction substitutes for parameters within a family.
- Critical negative result: three same-size Qwen-1.5B personas (bull/bear/neutral) voting drops to F1=0.66—below even a single 1.5B agent (0.69)—because personas of the same family/scale are near-degenerate (Cohen's κ=0.81, 81% agreement).
- Granularity diversity is the mechanism: heterogeneous committee has low pairwise agreement (κ(V,F)=0.27, κ(V,L)=0.19) and error-set Jaccard overlap of only 0.13–0.15.
- SDI doubles as a post-hoc hallucination detector: mean SDI_ER=0.17 when LLM is correct vs 0.71 when wrong, giving AUC=0.90 on FPB with no extra models or training.
- Shared Consensus Dictionary (SCD) over multilingual sentence-BERT answers 95% of Chinese queries from an English cache at F1=0.99 (τ=0.70)—zero-cost cross-lingual canonicalization.
- Token-economic Pareto: the 'Balanced' SDI operating point gives a 48× cost reduction over Always-L3 at the same reranker; at 10M users this is ~18 GPUs vs ~3,000 for always-LLM, saving $9.3M/year vs GPT-4o-mini.
- Backtest (20 tickers, 2 years): SDI-Single strategy Sharpe=3.50 beats always-FinBERT (1.36) and always-LLM (0.11); note this is a news-proxy, not a real-market prediction claim.

## Method
Three tiers correspond to contextual granularities: L1 VADER (word-level lexicon, ~0.03ms), L2 FinBERT (110M sentence transformer, ~1.5ms), L3 Qwen2.5-Instruct reasoner (0.5B–14B-4bit, plus Mistral-7B/Phi-3.5-mini cross-family checks). Each agent emits a polarity score in [-1,+1]; three pairwise SDIs are computed as absolute score differences (SDI_LE=|sV-sF|, SDI_LR=|sV-sL|, SDI_ER=|sF-sL|). Thresholding (SDI_LE, SDI_ER) at (0.3,0.7) partitions samples into four quadrants (consensus/domain-shift/ambiguous/mixed), each mapped to a routing action. A two-stage cascade uses thresholds θ_LE and θ_ER: if V and F agree, return VADER; else run the LLM, and if F and L disagree strongly, invoke an interaction protocol—vote (confidence-weighted majority), critic (LLM sees sentence + V/F predictions and returns final label), or debate (round-2 LLM call that sees all round-1 outputs including its own rationale). Thresholds sweep the Pareto frontier. An optional SCD caches committee decisions in 384-dim multilingual sentence-BERT space, returning cached labels on cosine-similarity kNN hit above τ. A deployable edge predictor (XGBoost, AUC=0.85) predicts high-disagreement (SDI_max>0.7) from VADER-stage features only (word/phrase/sentence granularity), enabling on-device routing before any expensive call. Experiments run on FPB sentences_allagree (4,838 sentences) on a single RTX A5000.

## Evals & Results
Primary benchmark: Financial PhraseBank (FPB) sentences_allagree (4,838 sentences); also TFNS Twitter Financial News (~12–16.8K tweets) and 1,500 Mandarin-translated FPB sentences. Baselines: single-agent VADER/FinBERT/Qwen at each scale, same-size 3-persona vote, and Always-L3. Single-agent scaling shows FinBERT beats every Qwen up to 7B (7B is -7pp under FinBERT; 3B non-monotone dip). Critic reaches F1≈0.87 across 1.5B–7B; debate ramps 0.69→0.87; cross-family critic is Qwen-specific in height (Mistral-7B critic 0.79, Phi-3.5-mini 0.86, debate@Mistral 0.82). Debate@7B is the only committee that strictly beats FinBERT on the hard negative class (F1=0.893 vs 0.879). Pareto points: Budget $0.0001/1k F1=0.665, Balanced $0.0006 F1=0.716 (48× cheaper than Always-L3), Premium $0.0054 F1=0.787, Always-L3 $0.0288 F1=0.809. SCD sweet spot at τ=0.85 gives 10% hit at -0.8pp F1. Cross-lingual: Qwen-7B holds F1=0.80 in Chinese (vs 0.81 English), beating finbert-tone-chinese (0.72)—specialist/LLM relationship inverts. Adversarial detection is only partial (AUC=0.71 on negation flips, ~0.5 on synonym/numeric/character attacks).

## So What (for practitioners)
Stacking heterogeneous, cheap models that fail on different granularities beats scaling one big model or running many copies of the same model with different prompts—run the cheap same-family persona-vote sanity check before committing to an LLM family, since same-family persona ensembles can regress below a single agent. A tiny critic LLM (1.5B) as a conflict resolver captures most of the accuracy of a 7B, so edge deployment is viable. If you already run a lexicon/specialist plus an LLM in parallel, wire their disagreement (SDI) as a free hallucination trust score (AUC=0.90) with no extra training. A committee-decision semantic cache using multilingual embeddings can serve cross-lingual traffic at near-zero marginal cost and enforce cross-border label consistency. Divergence-based routing gives operators a single threshold dial trading tokens-per-query against F1.

## Open Questions / Critiques
The critic plateau's height is Qwen-specific and does not transfer cleanly across families (Mistral-7B critic only 0.79), so the headline is fragile. Evaluation is largely confined to FPB's clean sentences_allagree subset; on noisy customer-style text (TFNS) FinBERT collapses and the critic regresses, so the whole specialist-scaffolding assumption breaks. The backtest is a news-proxy on only 20 tickers over 2 years with a tiny weekly signal (20 sentences)—authors explicitly disclaim real-market prediction, and Sharpe=3.50 should be treated as suggestive at best. Cost-savings figures rely on assumed pricing and query volumes. Adversarial robustness is weak (only negation flips detected). The SCD's high cross-lingual hit rate is on machine-translated FPB, not naturally-occurring Chinese financial text. The paper is authored partly by high-school students and dated 2026, so independent replication of the strong claims is warranted.
