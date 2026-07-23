# Design: arXiv → Obsidian Daily Paper Pipeline (v1)

**Date:** 2026-07-22
**Status:** Approved design, pre-implementation

## Goal

Increase the velocity at which the user (an AI engineer) consumes technical papers. Each morning, 5–15 high-relevance new arXiv papers land in the Obsidian vault at `~/Desktop/vault` as structured, interlinked markdown notes that can be learned from in minutes each, with wikilinks that surface common threads across papers over time.

## Scope: arXiv categories

Fetch daily new submissions from:

- **cs.CL** — Computation and Language (LLMs, evals, prompting, RAG, agents, fine-tuning)
- **cs.LG** — Machine Learning (training methods, RLHF, scaling, efficiency)
- **cs.SE** — Software Engineering (LLMs for code, agent harnesses, production ML systems)
- **cs.AI** — Artificial Intelligence (broad AI: planning, reasoning, knowledge representation)
- **cs.IT** — Information Theory (compression, coding, information-theoretic views of learning)
- **cs.DB** — Databases (data systems, vector/retrieval infrastructure, data management for ML)

Cross-listed papers are deduplicated by arXiv ID. Categories are configuration, not code — adding one later is a one-line change. Deliberately deferred: cs.IR, stat.ML.

## Architecture

A local pipeline (language chosen in the technical-decisions phase: Python or TypeScript) scheduled daily via `launchd` on the user's Mac. Four stages:

### 1. Fetch
Pull the previous day's new submissions from the arXiv API for the three categories: title, abstract, authors, categories, links. Dedupe cross-listings by arXiv ID. Respect arXiv rate limits (~1 request / 3 seconds).

### 2. Score (LLM relevance filtering)
An LLM scores each abstract 0–10 against an **interest profile**: a plain markdown file at `_system/interest-profile.md` describing the user's interests (AI engineering, evaluations, agents, RAG, production LLM systems). Papers above a threshold, capped at top N (~5–15/day), proceed. Tuning the pipeline = editing the profile prose, not code.

### 3. Summarize (full text, tiered notes)
Download each selected paper's full text — arXiv HTML when available, PDF fallback — and generate a structured note deep enough to learn from without opening the paper.

### 4. Write
- Paper notes → `Papers/YYYY/MM/<slug>.md`
- Concept pages created/updated → `Concepts/<topic>.md`
- Daily digest → `Daily/YYYY-MM-DD.md`: lists ingested papers with scores and one-line rationale for each; the morning entry point. Also lists failures and newly proposed concepts.

## Per-paper note template

- **Frontmatter:** arXiv ID, categories, authors, date, relevance score, link, tags
- **TL;DR** — 2–3 sentences: the claim and why it matters
- **Abstract** — verbatim
- **Key topics** — `[[wikilinks]]` to concept pages
- **Highlights** — 3–7 most important findings/numbers
- **Method** — how they did it, at implementer depth
- **Evals & results** — benchmarks, baselines, what actually moved (first-class section given the user's evaluation focus)
- **So what for practitioners** — implications for building/evaluating systems
- **Open questions / critiques** — weaknesses, what to be skeptical of
- **Related** — links to previously ingested papers sharing concepts

## Linking & pattern-spotting

The Obsidian vault **is** the knowledge base for v1 — no separate vector index. Concept pages are the connective tissue. The summarizer links papers against a **controlled, slowly growing concept vocabulary**: a seeded list; the LLM may propose new concepts, which are flagged in the daily digest for user approval before becoming canonical. This prevents tag-spelling drift so the graph converges. Backlinks on a concept page = "every paper touching X" — the common-threads view.

## Error handling

- Download/summarization failures are recorded in the daily digest and retried the next run — never silently dropped.
- The pipeline is idempotent: re-running a day skips already-written notes, so reruns are always safe.
- arXiv API rate limits respected.

## Explicitly deferred (YAGNI)

Vector/embeddings index, web UI, HF Daily Papers blending, cloud execution, PDF figure extraction, multi-device sync. All addable later without rework.

## Success criteria

- Runs unattended daily; each morning `Daily/YYYY-MM-DD.md` exists with 5–15 papers.
- Notes are learnable-from standalone (method + evals depth), not abstract paraphrases.
- Within a few weeks, concept-page backlinks visibly cluster related papers.
