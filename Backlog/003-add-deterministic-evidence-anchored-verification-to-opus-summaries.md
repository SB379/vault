---
title: "Add deterministic evidence-anchored verification to Opus summaries"
status: proposed
source: ideas:2026-07-22
created: 2026-07-23
---

Before writing an Obsidian note, run a deterministic post-processing pass that checks every factual claim in the summary (numbers, author names, scores, dates, benchmark values) against the source arXiv text via exact/fuzzy string matching and simple arithmetic/consistency checks. Flag any summary claim that cannot be anchored to a source span, and surface the flag in the note frontmatter and dashboard rather than silently shipping it.

*Why:* HALO shows evidence-based confidence (deterministic value verification against source) catches confident fabrications that an LLM judge misses and breaks the generator-judge correlation; a single 95% judge still ships 1 error in 20. Summaries citing precise numbers (e.g. '34.22% MFU', '5.4% ASR') are exactly the fabrication-prone surface.
