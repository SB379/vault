---
title: "Completeness rubric for summaries instead of precision-only checks"
status: proposed
source: ideas:2026-07-22
created: 2026-07-23
---

Grade generated summaries with a two-level meta-rubric: author structured criteria (must mention: core method, headline metric, key ablation, limitations, comparison baselines) compiled into flat binary checks graded by an LLM judge, with 'missing' verdicts tracked separately from 'contradicts'. Use this as an explicit optimization target so summaries stop omitting the paper's key findings.

*Why:* GAMUT shows omission (not error) is the dominant failure mode of long-form generation and that precision-only evaluation is blind to it; even frontier models supply only ~55% of a complete answer, so summary completeness should be an explicit, monitored eval target.
