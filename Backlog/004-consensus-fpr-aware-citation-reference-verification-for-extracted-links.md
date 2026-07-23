---
title: "Consensus + FPR-aware citation/reference verification for extracted links"
status: proposed
source: ideas:2026-07-22
created: 2026-07-23
---

When the pipeline resolves paper references, DOIs, or wikilink concept targets, never flag a reference as invalid on a single-source no-match. Query multiple sources (CrossRef, OpenAlex, arXiv) and only flag on consensus-absence plus contradiction. Rank verification by false-positive rate rather than recall, and explicitly distrust LLM-based verification for papers newer than the model's training cutoff (over-flagging of unfamiliar recent work).

*Why:* HALLMARK shows any-single-source no-match inflates FPR ~5x (fixable ~15x by consensus), that at low base rates FPR governs whether flags are worth attention, and that LLMs over-flag post-cutoff papers — directly relevant since this pipeline ingests brand-new preprints daily.
