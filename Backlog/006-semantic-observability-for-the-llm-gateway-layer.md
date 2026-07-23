---
title: "Semantic observability for the LLM gateway layer"
status: proposed
source: ideas:2026-07-22
created: 2026-07-23
---

Treat the arXiv-fetch and multi-provider LLM calls as a distinct failure surface. Wrap all provider calls in exponential backoff with jitter and a circuit breaker to avoid retry storms; use try/finally to always release rate-limit counters; and add semantic health checks that verify summaries are non-empty, wikilinks resolve, and the note actually contains the paper's content — because an HTTP 200 with an empty or malformed payload will otherwise be written as a plausible-looking but hollow note.

*Why:* FailureAtlas shows the most damaging gateway failures are silent (200 + healthy) and only caught by semantic integrity checks; Guardrails-as-Scapegoats shows agents fabricate 'no data' answers on empty/malformed payloads 56% of the time, so a silent empty summary would be indistinguishable from a real one without content-level checks.
