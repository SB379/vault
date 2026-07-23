---
arxiv_id: "2607.20327"
title: "PyroDash: Cost-Efficient Token-Level Small-Large Language Model Collaborative Inference"
authors: ["Niqi Lyu", "Pengtao Shi", "Wei Qiu", "Jianlin Zhong", "Sicong Xia", "Jianyao Ma", "Yicheng Ding"]
categories: [cs.CL]
published: 2026-07-22
score: 8
url: https://arxiv.org/abs/2607.20327
tags: [paper]
---

# PyroDash: Cost-Efficient Token-Level Small-Large Language Model Collaborative Inference

## TL;DR
PyroDash lets a small language model decide, mid-generation, when to hand off its partial reasoning trace to a frozen large model via a single control token (τoff), with the routing policy trained directly against billed inference cost using GRPO. On five math benchmarks it exceeds an LLM-only baseline in accuracy (64.04% vs 57.68%) while cutting cost 20.4% at low λ, or matches routing baselines at 96.4% cost reduction ($49.36→$1.78) at high λ.

## Abstract
> Large language models (LLMs) provide strong reasoning capabilities but are expensive to serve at scale, whereas small language models (SLMs) are cheaper but less reliable on difficult problems. We introduce PyroDash, a cost-aware framework for token-level SLM-LLM collaborative inference. During generation, the SLM decides whether to request assistance by emitting a control token. A Collaborate Engine then sends the query and partial reasoning trace to a frozen LLM for completion through a single handoff. The policy is internalized in the SLM, requiring neither a separate router, LLM retraining, nor access to LLM logits. PyroDash trains the SLM in three stages: control-token embedding learning, offloading-oriented supervised fine-tuning, and cost-aware alignment with Group Relative Policy Optimization. Its reward balances answer accuracy against inference cost normalized by LLM-only inference. Across five mathematical reasoning benchmarks, PyroDash supports different accuracy-cost operating points. With $λ=0.05$, it achieves 64.04 percent average accuracy, 6.36 percentage points above the LLM-only baseline, while reducing cost by 20.4 percent. With $λ=0.6$, it achieves 54.55 percent accuracy with a 1.90 percent LLM token ratio and 0.012 LLM calls per example, reducing total cost from USD 49.36 to USD 1.78. These results show that learned token-level handoffs can reduce LLM use while preserving strong reasoning performance.

## Key Topics
- [[Serving & Inference]]
- [[Reinforcement Learning]]
- [[Reasoning Models]]
- [[Fine-tuning]]
- [[Benchmarks]]
- [[Reward Models]]

## Highlights
- At λ=0.05 (quality-oriented): 64.04% avg accuracy, +6.36 pts over LLM-only (GLM-5.2-FP8 at 57.68%), while reducing total cost 20.4%; highest accuracy on Minerva, OlympiadBench, AIME25, AIME24.
- At λ=0.6 (cost-oriented): 54.55% avg accuracy with only 1.90% LLM token ratio, 0.012 LLM calls/example, and $1.78 total cost vs $49.36 for LLM-only — a 96.4% cost reduction.
- GRPO alignment (Stage 3) adds large gains over SFT cold start: avg accuracy 46.25%→64.04% at λ=0.05, with AIME24 jumping 28.23%→63.75%.
- λ provides tunable control: raising from 0.05→0.1 drops LLM token ratio 95.34%→8.19% and cost $39.29→$4.71 while accuracy falls 64.04%→55.29%; for λ≥0.1 accuracy stays 54–55% as cost keeps dropping.
- Beats routing baselines: RouteLLM 52.74% at $44.62 and GlimpRouter 54.20% at $31.61, both allocating >75% of tokens to the LLM; PyroDash λ=0.6 hits 54.55% with 1.90% LLM tokens.
- Cost decomposition traces savings mainly to reduced LLM output tokens (17.08M→0.23M) plus fewer total output tokens (SLM output 27.86M→12.07M vs standalone SLM).

## Method
PyroDash keeps the LLM frozen and internalizes routing in the SLM. During autoregressive decoding, the SLM either finishes independently or emits a dedicated control token τoff; a Collaborate Engine (CE) detects it, strips the token, packages the query plus the SLM's partial reasoning trace (Cs), and issues a single one-way handoff to the LLM via a standard text-generation API (no logits/weights/retraining needed). Training is three stages on the curated EasyHard-24k dataset (examples split into easy=base-SLM-correct vs hard=SLM-wrong-but-reconstructible; Corpus A has no τoff to preserve standalone behavior, Corpus B adds the offloading prompt Ps with 1–4 inserted τoff tokens on hard CoT traces reconstructed by the LLM). Stage 1: extend vocab with τoff, initialize its embeddings from the mean of anchor tokens (periods, newlines, EOS) plus Gaussian noise (σ=0.1), train embeddings/output head plus transient LoRA, then discard adapters keeping only τoff rows. Stage 2: LoRA SFT on Corpus A+B jointly to cold-start standalone reasoning and prompt-conditional offloading. Stage 3: GRPO where the training env replays the actual handoff during rollouts (G=8). Reward = accuracy − λ·(normalized cost), where normalized cost = actual collaborative cost / LLM-only cost baseline (precomputed per query). Cost accounting charges SLM prefix tokens as both SLM compute AND LLM prefill (since Cs becomes LLM context) plus LLM decode. Only SLM-generated tokens receive gradients; the LLM completion affects the update solely through the reward. Group-relative advantage normalization removes the need for a critic.

## Evals & Results
Benchmarks: GSM8K, Minerva, OlympiadBench (pass@1 greedy), AIME24, AIME25 (avg@32); aggregate = unweighted mean. Models: Qwen3.5-4B (SLM) + GLM-5.2-FP8 (LLM), served with vLLM, 8192 max tokens, thinking mode on. Baselines: standalone SLM, standalone LLM, SLM+SFT (stages 1-2 only), RouteLLM (request-level matrix-factorization router), and GlimpRouter (training-free first-token-entropy step-level routing). Results: PyroDash λ=0.05 = 64.04% avg (beats LLM-only 57.68%); λ=0.6 = 54.55% at $1.78; intermediate λ=0.1 = 55.29% at $4.71 (beats both routers on accuracy at far lower cost). SFT alone reaches 46.25%; standalone SLM 28.36%. Cost priced at listed rates ($0.05/$0.08 per M for SLM in/out, $0.90/$2.86 per M for LLM in/out). What moved: GRPO stage drives the biggest accuracy gains, and λ cleanly trades LLM reliance for cost.

## So What (for practitioners)
If you run a self-hosted SLM plus a proprietary LLM API, you can train the SLM to emit a stop-token that triggers a single context-preserving handoff — no separate router, no LLM retraining, no logit access, compatible with generation-only APIs. The single tunable knob λ lets you pick an accuracy-cost operating point at train time, giving a family of policies for different budgets. Reward the policy against actual billed cost (prefill + decode priced separately) rather than token-share or FLOPs, because the SLM prefix double-counts as LLM prefill and short LLM spans can hide prefill charges. Enforce exactly one handoff to avoid re-sending growing context on stateless APIs. The three-stage recipe (token embedding init from anchor tokens → SFT cold start → GRPO) is a reusable template; use base-model correctness (not static difficulty labels) to define easy/hard, and reconstruct valid CoT for hard examples so SFT doesn't reinforce failures.

## Open Questions / Critiques
Costs are computed from listed token prices, not actual provider bills. The method is validated only on math reasoning with one specific SLM-LLM pair (Qwen3.5-4B + GLM-5.2-FP8) and the EasyHard-24k curation; generalization to code, tool use, multimodal, or other model pairs is untested. No analysis verifies that handoffs actually occur at genuine capability boundaries (offloading-decision rationality unexamined). The normalized-cost reward is never ablated against a direct token-cost penalty, so the benefit of normalization isn't isolated. Only single-handoff, single-turn is supported — multi-turn or multi-handoff behavior is unexplored. Note the high-accuracy λ=0.05 policy offloads ~95% of tokens to the LLM (0.975 calls/example), so its accuracy gain comes largely from heavy LLM use with modest cost savings, not from the SLM doing much work.
