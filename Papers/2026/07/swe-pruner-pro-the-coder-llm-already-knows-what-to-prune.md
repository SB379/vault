---
arxiv_id: "2607.18213"
title: "SWE-Pruner Pro: The Coder LLM Already Knows What to Prune"
authors: ["Yuhang Wang", "Yuling Shi", "Shaoqiu Zhang", "Jialiang Liang", "Shilin He", "Siyu Ye", "Yuting Chen", "Kai Cai", "Xiaodong Gu"]
categories: [cs.CL, cs.SE]
published: 2026-07-20
score: 9
url: https://arxiv.org/abs/2607.18213
tags: [paper]
---

# SWE-Pruner Pro: The Coder LLM Already Knows What to Prune

## TL;DR
SWE-Pruner Pro shows that a coding agent's own frozen backbone hidden states already encode which lines of tool output are worth keeping, so a tiny in-server head can prune tool responses without a separate scoring model or explicit goal-hint query. Across two open-weight MoE backbones and four multi-turn benchmarks it cuts up to 39% of tokens while preserving (and sometimes improving) task quality, with ~15% bounded inference overhead.

## Abstract
> Pruning long context for coding agents has been a vital technology for efficient context management. While existing context pruning methods such as SWE-Pruner realize this by attaching a separate code classifier, we find the agent itself encodes internal representations indicating the relevance of code context when reading tool output. Based on this finding, we propose SWE-Pruner Pro, which prunes tool outputs directly inside the agent. Concretely, a small head turns the agent's own internal representations into a keep-or-prune label for each line, with a length-aware embedding keyed to each tool output's line count. Across two open-weight backbones and four multi-turn benchmarks, SWE-Pruner Pro saves up to 39% of prompt and completion tokens while preserving task quality, with bounded inference overhead. Notably, on MiMo-V2-Flash SWE-Pruner Pro additionally raises the SWE-Bench Verified resolve rate by +3.8% and the long-context Oolong accuracy by +2.2 points.

## Key Topics
- [[Context Management]]
- [[Coding Agents]]
- [[Agent Evaluation]]
- [[LLM-as-judge]]
- [[Serving & Inference]]
- [[Synthetic Data]]

## Highlights
- A linear probe on frozen Qwen3-Coder-Next last-layer hidden states separates keep vs. prune lines at AUC 0.83 and best-F1 0.63, well above the 0.46 majority-class F1 upper bound at ~30% keep rate — evidence the pruning signal is already inside the backbone.
- SWE-Pruner Pro is the only pruner (of 7) that reduces end-to-end tokens in every read-only benchmark cell: up to 39.4% on SWE-QA-Pro (Qwen3-Coder-Next) and 30.1% on Oolong (MiMo-V2-Flash).
- On MiMo-V2-Flash it raises SWE-Bench Verified resolve rate by +3.8% (345/500 vs 326/500) and Oolong accuracy by +2.2 points, while cutting tokens — beating SWE-Pruner which got +4.2% resolve at nearly double the token overhead.
- Per-sample balanced focal loss beats BCE by +1.13 judge and +0.16 F1; it rebalances keep/prune classes per-sample so extreme keep-ratio examples aren't diluted.
- Length-aware embedding lifts judge score from 6.86 to 7.08 at identical F1 (0.636 vs 0.635) by redistributing mistakes toward long responses where mis-pruning one line is cheap.
- In-engine (colocated) head adds only 15.0% aggregate wall time over generation (p50=14.7%, p95=34.8%), down from 19.3% off-engine; payload serialization fixes gave a ~20x reduction (1-3GB JSON to 85MiB fp16 binary).
- F1 and LLM-judge diverge sharply: Dice/Tversky match F1 (~0.59) but judge collapses to 5.30/3.03 because a precise-but-narrow skeleton (signatures only, no bodies) scores high on F1 but is operationally useless to the agent.

## Method
At each turn the agent's frozen backbone prefills [history, tool_call, tool_response] into the KV cache; only the new tool-response tokens are forwarded, and the head reads their last-layer hidden states off that existing prefill (no extra forward pass on the response). The head adds a learned length-aware embedding e(N) — indexed by 8 log-spaced line-count buckets, zero-initialized — additively to each hidden state, then passes through LayerNorm + two Linear-GELU-Dropout blocks (hidden width = backbone dim, dropout 0.4) to a per-token keep logit. Per-line decisions are made by majority vote of binarized token decisions at threshold 0.5; pruned lines are removed from the response before it enters the next turn's history (so the agent's own turn-t generation still sees the full response, but turn t+1 sees the pruned version). Training uses 22,609 (history, tool_call, tool_response) samples from 6,252 real trajectories across 5 public HuggingFace datasets, per-line labeled keep/prune by Claude Sonnet 4.6 (with 'skeleton' outputs fully kept). The loss is a per-sample class-balanced focal loss (gamma=2): focal BCE averaged separately over keep and prune tokens within each sample, then combined 0.5/0.5, so each sample's minority class carries equal weight regardless of its keep rate. The backbone is fully frozen; hidden states are cached once per dataset x backbone and the head trains in ~15 min on one 8xH200 node. Serving is on a patched SGLang stack (fixes for batch alignment, chunked-prefill accumulation, prefix-cache exemption of hidden states, plus a base64 binary fp16 payload envelope), with an optional in-engine colocated head returning per-token logits instead of full hidden-state tensors.

## Evals & Results
Backbones: MiMo-V2-Flash (309B MoE, 15B active) and Qwen3-Coder-Next (80B MoE, 3B active), both 256K context. Benchmarks: SWE-Bench Verified (500 patch issues, Mini-SWE-Agent harness, resolve rate), SWE-QA (144 QA) and SWE-QA-Pro (260 QA with executable envs, GPT-5.4-mini judge on 1-10 rubric), and Oolong (280 long-context aggregation, re-cast as multi-turn bash agent, rule-based exact-match). Six baselines swapped in under matched config: LLMLingua2, Selective Context, RAG (sliding-window + bge-reranker-v2-m3), Self-Prune, LongCodeZip, and SWE-Pruner. Key results: SWE-Pruner Pro is the only method reducing tokens in every read-only cell while keeping quality within a narrow band (e.g. +0.02/+0.24/-1.4pp on Qwen3 SWE-QA/Pro/Oolong at 34.7%/39.4%/13.9% savings). Four of six baselines inflate tokens somewhere (LLMLingua2 hit +190% on Oolong). On SWE-Bench Verified the picture is backbone-asymmetric: on MiMo all pruners help (SWE-Pruner Pro +3.8% resolve at +7.4% tokens), on Qwen3 all pruners lose resolves but SWE-Pruner Pro degrades least (-1.2pts) with the largest input-token cut (-13.5%). Note it increased API-call counts on both backbones. Ablations confirm per-sample balanced focal and length-aware embedding each contribute.

## So What (for practitioners)
If you serve open-weight (hidden-state-exposing) coding agents, you can compress tool outputs by reading a relevance signal the backbone already computes — no second scorer model, no agent-authored goal-hint query, and no backbone fine-tuning (head is ~18M params, trainable in minutes from cached features). Pruning at the agent-environment boundary (incoming observations) is complementary to history summarization/truncation. Measure pruning value end-to-end in tokens AND API calls, not per-call latency: pruning changes future context so it can raise call counts even as it cuts input tokens; report both separately. Do not trust per-line F1 as your only pruner metric — it rewards narrow high-precision skeletons that are useless to the agent; pair it with an LLM-as-judge on downstream usability. Length-conditioning matters because the cost of mis-pruning is highly non-uniform (fatal on 5-line outputs, negligible on 300-line ones). Production serving requires care: hidden-state extraction paths in inference engines can silently break on batch alignment, chunked prefill, and prefix caching, and naive JSON serialization of tensors is 1-3GB per request — use binary fp16 envelopes and prefer in-engine head colocation.

## Open Questions / Critiques
Only evaluated on open-weight models that expose hidden states; the approach cannot apply to closed API models without vendor support, and each new backbone needs its own head retrained. Benchmarks are Python/CLI-centric (~83% of training data is Python or shell), so cross-language generalization is asserted but not demonstrated. Results are backbone-asymmetric — every pruner (including this one) loses resolves on Qwen3-Coder-Next for SWE-Bench, so 'preserves quality' is not universal. The keep/prune labels are LLM-generated (Claude Sonnet 4.6) and admittedly fuzzy, and the LLM judge (GPT-5.4-mini) is itself the primary quality metric on 3 of 4 benchmarks, raising circularity/judge-bias concerns. The 15% overhead is the in-engine best case measured on a 16-trajectory replay; the off-engine, engine-agnostic path is higher (19.3%) and the authors note it is a hand-tuned baseline. Aggressive pruning could remove information whose value only appears many turns later — not fully captured by these benchmarks, and the paper itself flags this for safety-critical use. Some cited works and model names (MiMo-V2-Flash, Claude Sonnet 4.6, GPT-5.4-mini, a 2026-dated arXiv ID) suggest this is a forward-dated/possibly synthetic paper, so treat specific numbers with caution.
