---
arxiv_id: "2607.17531"
title: "Oracle Gap and Signal Fidelity: A Fixed-Pool Diagnostic for Test-Time Collaboration"
authors: ["Jie Hu"]
categories: [cs.CL, cs.AI]
published: 2026-07-20
score: 9
url: https://arxiv.org/abs/2607.17531
tags: [paper]
---

# Oracle Gap and Signal Fidelity: A Fixed-Pool Diagnostic for Test-Time Collaboration

## TL;DR
The paper introduces OracleGap, a fixed-pool diagnostic that decomposes the net gain of training-free test-time collaboration (self-consistency, best-of-N, LLM critics/selectors, test-based verifiers) into four measurable factors: recoverable mass (oracle gap), signal coverage, conditional selection quality, and harm to already-correct outputs. The central claim is that collaboration gains are a property of the candidate pool and signal fidelity — not of agent count or topology — and it yields a practical pre-deployment rule: estimate the oracle gap first, then audit coverage, fidelity, and harm before spending compute.

## Abstract
> Test-time collaboration, including self-consistency, best-of-N selection, critic models, and verifier pipelines, is often credited with broadly improving LLM reasoning, yet its gains are uneven and sometimes negative. We ask when training-free collaboration should be expected to help. For a fixed candidate pool, we decompose a selector or verifier's net gain into measurable factors: recoverable mass, verification-signal coverage, conditional selection quality, and harm to already-correct outputs. This reframes collaboration as a candidate-selection problem rather than as an intrinsic property of a multi-agent topology. Across LiveCodeBench, MATH Level-5 hard subjects, and GPQA-Diamond, gains are bounded first by the oracle gap and then by signal fidelity, which we measure directly as candidate-level agreement between verifier verdicts and official labels. On LiveCodeBench, a public-test verifier (MCC 0.825) gains +8.14 percentage points (pp) over a first-sample baseline; a generated-test verifier (MCC 0.248) improves by +2.70pp and is not statistically distinguishable from an LLM selector, but operates at near-zero harm versus the selector's 4.69% harm rate. On MATH, a symbolic answer-equivalence selector beats self-consistency by +4.67pp, while LLM selectors are negative. On GPQA-Diamond, recoverable mass is only 3.03% and 87.54% of candidate pools are answer-identical; a weaker model's pools shrink both further, suggesting that oracle gap is a joint property of task, model, and sampling configuration. Our framework yields a practical pre-deployment diagnostic: estimate the oracle gap, then measure coverage, signal fidelity, and harm before investing in collaboration.

## Key Topics
- [[Agent Evaluation]]
- [[Multi-agent Systems]]
- [[Tool Use]]
- [[LLM-as-judge]]
- [[Benchmarks]]
- [[Coding Agents]]

## Highlights
- On LiveCodeBench (k=5 pools, ~72.3% first-sample baseline), a public-test verifier (MCC 0.825, 92.98% candidate accuracy) gained +8.14pp with 0% harm, while a generated-test verifier (MCC 0.248, 53.05% accuracy) gained only +2.70pp — the gap is a fidelity gap between two test signals, not 'tests help.'
- The generated-test verifier (L4-gen) was statistically indistinguishable from an LLM selector (L1) but operated at near-zero harm (0.10%) vs. the LLM selector's 4.69% harm rate; L4-gen's low harm is structural (tests exist for only 77.22% of rows, active on only 35.77%, frequent fallback to first sample).
- On MATH L5 hard, a symbolic answer-equivalence selector beat self-consistency by +4.67pp, while natural-language LLM selectors were net-negative (L1: -3.20pp, L3: -1.87pp vs. SC).
- On GPQA-Diamond, the oracle gap was only 3.03pp (18/594 recoverable) because 87.54% of pools were answer-identical; LLM selectors were net-negative (L1: -1.68pp) since harm cost (~2.53pp) exceeded recoverable gains.
- Oracle gap is a joint property of task, model, and sampling: a weaker Qwen3.5-9B pool shrank GPQA recoverable mass to 0.67% with 94.44% identical pools.
- A separate weakly-grounded MATH verifier (L4-grounded) failed to beat SC (-0.13pp), showing that an arbitrary extra verifier does not help — only high-fidelity signals convert recoverable mass into gain.
- Routing-η analysis showed worker routing obeys different constraints than candidate selection (e.g., MATH logistic router η=0.909, but LCB logistic router degenerated to η=0).

## Method
For each input, a fixed pool of k=5 candidates C(x) is generated; the first candidate is the baseline. Training-free mechanisms then select one candidate or supply a verification signal without repair (selectors/verifiers cannot create new answers, only capture existing improvement). Net gain is decomposed as gain = P(recoverable ∧ signal-defined)·q − P(reference-correct ∧ signal-defined)·h, where recoverable = reference wrong but some pool candidate correct, q = conditional selection quality on recoverable defined rows, h = harm rate turning correct references into wrong selections. The any-of-k oracle defines recoverable mass and the oracle-gap upper bound. Coverage = P(signal defined), and effective capture/harm (including fallback/no-op) close an accounting identity. Verifier fidelity is measured separately as candidate-level agreement with official labels (accuracy, FPR, FNR, MCC). A 'selector ladder' compares tiers: sample0 (first candidate), L1 (same-family LLM selector), L3 (cross-family/size selector), L4-gen (generated-test filtering), L4-public (public/visible-test filtering), and Oracle (any correct candidate). Predictions were preregistered. Reporting used three seeds, hierarchical (task-cluster) bootstrap confidence intervals, and a five-part provenance tuple (benchmark, task set, reference, label source, model source) to prevent mismatched comparisons. Main model was Qwen3.6-35B-A3B-BF16.

## Evals & Results
Benchmarks: LiveCodeBench (1,055 tasks, main code benchmark, execution signals), MATH L5 hard (250 tasks/seed, symbolic checks), GPQA-Diamond (198/seed, low-recoverable boundary), HumanEval+ (164, saturated anchor with only 4–6 recoverable per seed). Baselines: first-sample, self-consistency/majority voting, and the any-of-k oracle upper bound. What moved: on LiveCodeBench the ladder ranked L4-public (+8.14pp) > L1 (+3.50pp) ≈ L4-gen (+2.70pp) > L3 (+1.97pp), against an 11.74pp oracle gap. Preregistered scorecard was mixed — public>generated held, generated>natural-language did NOT (CI overlapped 0). On MATH, symbolic equivalence beat SC (+4.67pp) but LLM selectors went negative. On GPQA, all LLM selectors and SC were net-negative against a tiny 3.03pp oracle gap. Fidelity was the explanatory variable for the two code verifiers (MCC 0.825 vs 0.248).

## So What (for practitioners)
Before deploying a critic, verifier, or multi-agent selector, run a small labeled development audit: (1) estimate the oracle gap / recoverable mass — if it's small (e.g., homogeneous pools with near-identical answers, like GPQA), stop, because no selector can help and LLM judges will likely cause net harm; (2) measure the deployed signal's coverage (how often it's even active), fidelity (candidate-level agreement with true labels via MCC), and harm rate. Do not attribute gains to 'adding an agent' or topology — gains come from high-fidelity, low-harm signals over a pool with recoverable mass. Execution/public tests are far stronger than self-generated tests; self-generated tests may be safe (low harm from conservative fallback) but capture little. For math, symbolic answer-equivalence clustering beats surface self-consistency, but adding a natural-language LLM judge is often net-negative. Distinguish selection from repair (repair can exceed the oracle gap) and candidate selection from worker routing (different constraints). Compare verifier calls against simply sampling more candidates.

## Open Questions / Critiques
The diagnostic is not label-free — it requires a labeled dev-set audit (though the authors argue it can be sample-efficient). L4-public uses task-visible tests and is a partial-oracle upper bound, not fully deployable; the non-overlap audit covered only 50 of 1,055 tasks. Candidate-level fidelity was measured only for test-based verifiers, not for the L1/L3 natural-language selectors, so cross-mechanism fidelity comparison is incomplete. Results rest largely on a single main model (Qwen3.6-35B) at k=5 with fixed sampling; the oracle gap is explicitly a joint property of task/model/prompt/temperature, so more diverse sampling could change conclusions (especially GPQA's low recoverable mass). No compute-optimality claim is made — verifier cost vs. larger-k sampling was not fully matched. A data/harness inconsistency (one task-seed) and incomplete seed-45 traces required exclusions. The routing extension is descriptive and not integrated into the provenance/CI pipeline. Note the arXiv ID and dates appear implausible (2026/2027 references), so treat provenance with some skepticism.
