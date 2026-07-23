---
arxiv_id: "2607.19913"
title: "JANUS: Foreseeing Latent Risk for Long-Horizon Agent Safety"
authors: ["Yuan Xiong", "Linji Hao", "Shizhu He", "Yequan Wang", "Lijun Li"]
categories: [cs.AI, cs.CL, cs.CR]
published: 2026-07-22
score: 9
url: https://arxiv.org/abs/2607.19913
tags: [paper]
---

# JANUS: Foreseeing Latent Risk for Long-Horizon Agent Safety

## TL;DR
Janus trains predictive agent guardrails that anticipate delayed risks from partial trajectories rather than reacting after unsafe actions occur. The resulting guard model, Vanguard, couples a future-anticipation task with a safety-adjudication task via RL, cutting average attack success rate from ~0.23 (baseline guards) to 0.071 across four benchmarks while preserving benign task utility.

## Abstract
> Agent safety is moving from content moderation toward preventing operational failures before tool-using agents act. We propose Janus, a foresight-oriented framework for long-horizon agent safety that trains guards to anticipate delayed risks from partial trajectories. Janus synthesizes diverse agent trajectories via multi-agent simulation and learns a shared policy with two coupled tasks: an anticipation task that forecasts safety-relevant futures and an adjudication task that decides safety from both the observed prefix and anticipated future. The two tasks are jointly optimized with CoAA-RL, which rewards forecasts by their utility for downstream safety judgment. The resulting guard model, Vanguard, blocks unsafe actions before execution. Across four agent-safety benchmarks, Vanguard improves average protection by 15.9 percentage points over baseline guards while increasing benign task completion by 5.1 percentage points.

## Key Topics
- [[Agent Evaluation]]
- [[Reinforcement Learning]]
- [[Tool Use]]
- [[Long-horizon Tasks]]
- [[Synthetic Data]]
- [[Multi-agent Systems]]

## Highlights
- Vanguard achieves an average ASR of 0.071 across four benchmarks vs 0.230 for six guard baselines and 0.397 for no-guard — a 15.9 percentage point improvement in average protection rate (1-ASR).
- On AgentDojo benign tasks, Vanguard matches the no-guard reference at 0.680 utility, 5.1 points above the guard-baseline average of 0.629, showing protection without over-blocking.
- Biggest gains on long-horizon planning safety: LPS-Bench ASR dropped from 0.323 (best baseline) to 0.075; large improvements also on AgentLAB (0.122→0.087) and Agent-SafetyBench (0.102→0.068).
- Ablations show anticipation is critical: removing the anticipation task raised average ASR from 0.072 to 0.148; removing inference-time future summaries raised it to 0.123. An oracle (ground-truth) future summary lowered ASR to 0.052 (upper bound).
- The coupled reward is essential: Sim-only, Util-only, and Decoupled variants all degraded sharply (Decoupled raised avg ASR from 0.072 to 0.254, worst on LPS-Bench).
- Balanced reward mixing (λ_A=0.5) gives the best safety-utility trade-off; λ_A=0.75 gives lowest ASR (0.034) but over-blocks (utility drops to 0.464).
- Early-prefix prediction works: even with only 25% of the trajectory visible, Vanguard already leads on AgentDojo and AgentLAB; ASR falls monotonically as more prefix is seen (0.280→0.072 avg from 25%→100%).

## Method
Janus has two parts. (1) A simulation-based multi-agent data pipeline: a Manager decomposes a risk-generation strategy into subtasks dispatched to specialized agents (Instructor writes the user instruction, ToolDesigner defines tool schemas, Grader writes eval criteria, EnvInjector defines environment-injection for external-content attacks, Decomposer splits multi-turn tasks). An Executor runs a ReAct loop while a Simulator returns synthetic tool observations (no real tools executed); a Reviewer does rejection sampling on task consistency, risk coverage, and completeness. Risks are taxonomized by origin: user (harmful intent disguised as benign work), environment (indirect prompt injection, goal hijack, tool-use steering, data exfiltration, memory poisoning, resource exhaustion), and agent (planning failures, over-literal instruction following, incorrect assumptions, scope expansion, preparation-to-execution escalation). Each trajectory is split at key decision points into a prefix and future continuation, labeled Safe/Unsafe/Potential Unsafe by GPT-5.5, plus a future summary — yielding 75,180 examples (34,100 Safe, 18,665 Unsafe, 22,415 Potential Unsafe). (2) CoAA-RL: a single shared policy (initialized from Qwen3-8B) trained on two coupled tasks toggled by a mode indicator. The anticipation task samples G_A future summaries from (instruction, prefix); the adjudication task samples G_D label rollouts conditioned on each summary. Adjudication reward mixes label correctness and format validity; anticipation reward mixes NLI-based similarity to the true continuation (Sim) with 'adjudication utility' (average downstream adjudication reward the summary produced), controlled by λ_A. Both tasks are optimized with GRPO group-relative advantages, with an η weight on the adjudication loss. At inference (two-stage), the model first anticipates a future summary from the prefix, then adjudicates conditioned on that summary; only an 'unsafe' label blocks execution (potential_unsafe and safe are non-blocking).

## Evals & Results
Evaluated on four agent-safety benchmarks: AgentDojo (97 benign / 949 adversarial prompt-injection tasks; reports utility and ASR), Agent-SafetyBench (2,000 examples, ShieldAgent judge, ASR), AgentLAB (400 multi-turn long-horizon attacks: tool_chaining and memory_poisoning, ASR), and LPS-Bench (570 computer-use long-horizon planning-safety instances, ASR). Execution agent backbone is Qwen3-32B. Baselines: guardrail models (Qwen3-8B, Llama-Guard-3-8B, Qwen3Guard-Gen-8B, TS-Guard) used as step-level monitors, and guardrail frameworks (Sandwich Defense, LlamaFirewall), plus a no-guard reference. Vanguard achieved the lowest ASR on all four benchmarks (0.054/0.068/0.087/0.075) while keeping AgentDojo utility at 0.680 (matching no-guard). Baselines like Qwen3Guard-Gen-8B kept utility but had high ASR (0.151 on AgentDojo); Sandwich Defense and LlamaFirewall left large residual risk on long-horizon benchmarks (up to 0.844 and 0.530 on LPS-Bench). At 100% prefix Vanguard reduced average ASR by 57.6% vs the strongest baseline.

## So What (for practitioners)
Reactive, step-level content guards are insufficient for long-horizon tool-using agents where a governing constraint appears early but the risky action surfaces many steps later; building guards that forecast likely future trajectories and judge on the anticipated continuation materially reduces attack success without over-blocking benign tasks. The intervention protocol is practical: query the guard at each step before executing a candidate action, treating only an explicit 'unsafe' verdict as blocking. Multi-agent simulation with rejection sampling is a viable, safe way to synthesize diverse high-risk trajectories (user/environment/agent-originated) without executing real tools. The coupling insight generalizes: an intermediate reasoning artifact (here, a future summary) should be rewarded by its downstream decision utility, not just its intrinsic fidelity — decoupling the two badly hurt long-horizon safety. Their three-origin risk taxonomy (Table 4) is a reusable checklist for designing agent-safety evaluations and red-team scenarios.

## Open Questions / Critiques
Training data is entirely from multi-agent simulation, not deployed systems, so it may not match real tool behavior, environment feedback, or user distributions — sim-to-real generalization is untested. Evaluation is limited to a fixed set of agent backbones, tools, and benchmark-defined risk scenarios; robustness to unseen tools, novel adaptive attacks, and different safety policies is uncharacterized. Labels and the future-continuation summaries were generated by GPT-5.5, so ground truth (and the NLI similarity signal) inherits that model's biases. The oracle-summary result (0.052 ASR) shows a real gap remains between anticipated and true futures. Two-stage inference (anticipate then adjudicate) adds latency/cost at every step, which the paper does not quantify for production serving. LPS-Bench remains hard at low prefix budgets (0.498 ASR at 25%), so early planning-risk detection is still weak. Reported numbers depend on benchmark-specific judges (e.g., ShieldAgent, official evaluators), and the arXiv date/model names (GPT-5.5, Qwen3.5) suggest a future-dated or synthetic preprint — treat absolute figures with caution.
