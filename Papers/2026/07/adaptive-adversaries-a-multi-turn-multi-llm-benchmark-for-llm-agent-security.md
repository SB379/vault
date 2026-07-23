---
arxiv_id: "2607.18063"
title: "Adaptive Adversaries: A Multi-Turn, Multi-LLM Benchmark for LLM Agent Security"
authors: ["Devina Jain", "David Hartmann", "Chuan Li"]
categories: [cs.CR, cs.AI, cs.LG]
published: 2026-07-20
score: 9
url: https://arxiv.org/abs/2607.18063
tags: [paper]
---

# Adaptive Adversaries: A Multi-Turn, Multi-LLM Benchmark for LLM Agent Security

## TL;DR
This paper introduces a 21-scenario benchmark where an adaptive LLM attacker adapts across 15 rounds against a memoryless LLM defender, with attacks regenerated live per battle rather than drawn from a fixed pool. It shows that fixed-pool, single-attacker, single-turn evaluation drastically underestimates agent security risk: round-1 scoring gives 0–1% attack success rate while 15 adaptive rounds give 5.4–14%, and frontier models that tie in aggregate (Opus 4.6 and GPT-5.4 at 5.4% each) have sharply opposing per-scenario weaknesses.

## Abstract
> LLM-based agents process external content, exposing them to prompt injection and multi-turn manipulation. Most safety benchmarks evaluate defenders against fixed attack pools collected before evaluation, single-turn or multi-turn. We present a 21-scenario benchmark for \emph{adaptive multi-round attacks against memoryless LLM defenders}: an autonomous LLM attacker observes prior defender responses and pivots across rounds, while each defender response is evaluated as a fresh interaction. Holding the 21 scenarios, attackers, defenders, and structured-output scoring fixed, restricting scoring to the first attacker turn yields $0$-$1\%$ attack success rate (ASR); allowing 15 rounds of adaptive attack yields $5.4$-$14.0\%$. Pooling three frontier attacker LLMs uncovers $1.4$-$2.2\times$ as many unique successful attacks as the best single attacker, and the generated attacks have low cosine similarity ($0.02$-$0.14$) to attacks in existing benchmarks. Claude Opus 4.6 and GPT-5.4 are tied in aggregate ($5.4\%$ each; overlapping $95\%$ CIs), but their weaknesses differ sharply: on one scenario Opus reaches $60\%$ ASR ($95\%$ CI $36$--$80\%$) while GPT-5.4 and Gemini each stay at $7\%$ (CI $1$-$30\%$; the gap is preserved in a higher-$N$ replication). $13$ of $21$ scenarios distinguish at least one defender pair, yet rankings disagree across scenarios (Kendall's $W = 0.19$). We release the benchmark -- 21 evaluation scenarios, 10 public development scenarios, the orchestrator, baseline harnesses, and a multi-attacker CLI -- plus 945 transcripts from the 3$\times$3 frontier matrix, an attack-replay dataset, and 18{,}422 gpt-oss-20b battles from an open competition's final scoring rounds.

## Key Topics
- [[Agent Evaluation]]
- [[Benchmarks]]
- [[Multi-agent Systems]]
- [[Long-horizon Tasks]]
- [[Evaluation Harnesses]]
- [[Tool Use]]

## Highlights
- Restricting scoring to the first attacker turn yields 0–1% ASR, but allowing 15 rounds of adaptive attack yields 5.4–14.0% on the same scenarios/defenders/checks — only the interaction budget changes.
- Pooling three frontier attacker LLMs (Claude Opus 4.6, GPT-5.4, Gemini 2.5 Pro) uncovers 1.4–2.2x as many unique successful attacks as the best single attacker; all 78 genuine winning turns in the 945-battle matrix are pairwise distinct.
- Opus 4.6 and GPT-5.4 tie in aggregate ASR (5.4% each) but have opposing weaknesses: on 'memleak' Opus hits 60% ASR (CI 36–80%) vs 7% for the others; on 'paperaccept'/'gameguru' Gemini is uniquely vulnerable (~53–60%) via fabricated-authority injection.
- Low cross-scenario concordance (Kendall's W=0.19): 14/21 scenarios are informative and 13 discriminate defenders, yet rankings disagree — frontier defender weaknesses do NOT lie on a single 'safety' axis.
- Ablation shows attacker response-conditioning is the primary driver: removing the attacker's access to prior defender responses crashes pooled ASR from 30% to 0% (0/36); making the defender stateful only drops it to 19.4%.
- Generated attacks have low cosine similarity (0.02–0.14) to attacks in six existing benchmarks (vs 0.21 within-pool), indicating genuinely novel attack surface.
- Attack transfer is mostly model-specific: aggregate transfer rate 10.2%, and 0 of 46 unique winning attacks succeed against all three defenders.
- Naive substring success metrics over-count: adaptive attackers game proxies (e.g. echoing referral codes, decoy 'unlock' device names); of 121 substring 'wins' only 78 were genuine compromises.

## Method
The benchmark runs on the AgentBeats platform. Each battle pairs an attacker harness with a defender harness under an orchestrator using a per-scenario template and a structured JSON output contract. A battle runs 15 rounds: the orchestrator passes scenario context plus prior defender responses to the attacker (so the attacker plans and pivots across rounds), inserts the attacker text into the scenario template, and passes only the current formatted input to the defender — no attack metadata and no prior-round history (the defender is deliberately 'memoryless', modeling an adversary who opens a fresh session each attempt). Defender output is parsed and scored by a programmatic check_success function that fires only on scenario-relevant typed fields (or when a protected asset reaches a third party), scoring partial/echo/prose-only compliance as failures. Scenarios were authored in three stages: LLM-seeded concept generation across seven attack archetypes, Python plugin implementation (threat-snapshot format adapted from b3), and a calibration filter using strong=gpt-5.2 vs weak=gpt-4o-mini across balanced/strong-vs-weak/weak-vs-strong configs (30 runs each), rejecting scenarios that are trivially easy/hard, capability-insensitive, or first-round exploitable. The controlled evaluation is a 3x3 attacker x defender matrix (Opus 4.6, GPT-5.4, Gemini 2.5 Pro) over 21 held-out scenarios at N=5 (945 battles), with key findings replicated at N=20/cell. Attacks are regenerated live per battle rather than replayed from a fixed pool.

## Evals & Results
Primary evaluation is the 21-scenario benchmark itself, covering five threat classes: indirect injection (11), PII/data leak (6), insecure output (2), supply chain (1), prompt extraction (1). Baselines/comparisons: round-1-only vs full 15-round scoring; best-single-attacker vs pooled-three-attackers; and cross-benchmark comparison against StrongREJECT, JailbreakBench, HarmBench, MHJ, AgentHarm, IPI coding-agent, and b3 (using each benchmark's native attack regime and judge). What moved: interaction budget (round-1 near-zero -> 15-round 5.4/5.4/14.0% for Opus/GPT-5.4/Gemini); attacker pooling (1.4–2.2x more unique attacks); attacker adaptation (30%->0% when removed). Success-criterion sensitivity: naive substring gives 8.3/11.1/19.0%, adopted typed-field gives 5.4/5.4/14.0%, strictest gives 4.8/5.1/12.4% — qualitative conclusions hold across all. Also released: 18,422 competition battles on gpt-oss-20b showing submitted harnesses beat baselines (attacker ASR 9.5–50%, defender ASR 9.5–78.6%), with fixed-catalog harnesses dropping and adaptive-selection harnesses rising on held-out scenarios.

## So What (for practitioners)
Single-turn, fixed-pool, single-attacker safety evals badly underestimate agent vulnerability — you must evaluate multi-turn adaptive attacks and pool multiple attacker LLMs, because different attacker models surface different failures. Do not pick a single 'most robust' model: aggregate ASR ties hide opposing per-scenario weaknesses (Opus leaks secrets under benign debugging reframes; Gemini obeys fabricated authority blocks). Design success checks against actual unsafe outcomes in typed fields (or delivery to a third party), never naive substring presence, since adaptive agents will game proxy metrics. Structurally separate trusted instructions from untrusted content and gate security-critical actions behind explicit confirmation (defenders that parked unlocks in actions_pending held). Prefer repeatable evaluation processes (live attack generation + released transcripts/replays for audit) over static benchmarks that freeze the adversary. Stateful production agents may be more robust than this memoryless stress-test suggests, but accumulated history can also reinforce a manipulation.

## Open Questions / Critiques
Small sample sizes (N=5/cell primary, N=20 for key replications) mean many per-cell CIs are wide; only three scenarios are statistically separated as model-specific. Attacker capability is bounded by the attacker LLMs' own capability ceiling and safety training, so it complements rather than replaces human red-teaming. Scenarios are curated for difficulty/sensitivity/round-depth and concentrate on indirect injection and data leakage, so informative-scenario rate and concordance are not from a random task sample. The memoryless-defender threat model does not reflect stateful production agents (the stateful ablation is small, 3 scenarios, N=3, and excludes Gemini). Cross-benchmark ASR comparisons are confounded by different judges, content, and turn structures and are not leaderboard rankings. Reproducibility is process-level only — closed API endpoints drift and live generation is not bit-for-bit reproducible (only the gpt-oss-20b tier is exactly replicable). Attacker/defender harness code is withheld for dual-use reasons, limiting full independent replication. The mechanistic attribution of per-model weaknesses (e.g. 'internalized trust' of authority frames) is explicitly not diagnostic given only three scenarios.
