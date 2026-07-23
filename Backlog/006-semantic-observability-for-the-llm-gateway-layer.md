---
title: "Semantic observability for the LLM gateway layer"
status: done
source: ideas:2026-07-22
created: 2026-07-23
---

Treat the arXiv-fetch and multi-provider LLM calls as a distinct failure surface. Wrap all provider calls in exponential backoff with jitter and a circuit breaker to avoid retry storms; use try/finally to always release rate-limit counters; and add semantic health checks that verify summaries are non-empty, wikilinks resolve, and the note actually contains the paper's content — because an HTTP 200 with an empty or malformed payload will otherwise be written as a plausible-looking but hollow note.

*Why:* FailureAtlas shows the most damaging gateway failures are silent (200 + healthy) and only caught by semantic integrity checks; Guardrails-as-Scapegoats shows agents fabricate 'no data' answers on empty/malformed payloads 56% of the time, so a silent empty summary would be indistinguishable from a real one without content-level checks.

## Implementation notes

Implemented 2026-07-23.

- `pipeline/arxiv_pipeline/gateway.py` — `with_retries()` (exponential backoff with full jitter, injectable `sleep_fn`; retries anthropic RateLimitError / 5xx / overloaded_error / APIConnectionError and requests ConnectionError/Timeout, non-retryable errors propagate) and `CircuitBreaker(threshold=3)` counting consecutive failures across calls; `.check()` raises `CircuitOpenError` when open, success resets.
- `pipeline/arxiv_pipeline/health.py` — `check_summary()` (short tldr, empty highlights, thin method+evals, stray key_topics, zero topics+concepts, suspiciously short fulltext) and `check_ideas()` (empty lists, missing title/description).
- Wiring: `run.py` uses a run-scoped breaker (checked before each paper; circuit-open aborts remaining papers with a clear failure entry), routes summarize through `with_retries`, and rejects summaries failing `check_summary` without writing the note; `score.py` routes batch calls through `with_retries` (keeps degrade-to-zero); `ideas.py` `run_ideas` retries `generate_ideas` and gates on `check_ideas` before writing.
- Verified via TDD: suite grew 59 → 87 tests, all green (`python -m pytest` with the pipeline venv), including new `tests/test_gateway.py`, `tests/test_health.py`, and run/score/ideas integration tests (semantic-fail paper lands in failures with no note; circuit-open abort message).
