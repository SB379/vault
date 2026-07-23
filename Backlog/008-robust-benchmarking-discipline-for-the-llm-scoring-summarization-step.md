---
title: "Robust benchmarking discipline for the LLM scoring/summarization step"
status: proposed
source: ideas:2026-07-22
created: 2026-07-23
---

When comparing scoring prompts, models, or summarization configs, run repeated independent invocations and report confidence intervals rather than crowning a winner on a single run. Similarly, empirically A/B both prompt format and placement (system vs user turn) for your specific models rather than assuming markdown or a fixed format is best, and treat ~40 simultaneous scoring instructions as a redesign point.

*Why:* The reward-model systems study shows single runs regularly crown the wrong winner; the prompt-design-at-scale paper shows format effects are small/inconsistent/model-specific, placement can move adherence up to ~8.7pp, and instruction-following collapses toward zero past N=40–80.
