---
arxiv_id: "2607.17525"
title: "FailureAtlas: A Taxonomy of Failure Modes in Multi-Provider LLM Serving Infrastructure"
authors: ["Vishal Pandey", "Gopal Singh"]
categories: [cs.LG, cs.SE]
published: 2026-07-20
score: 9
url: https://arxiv.org/abs/2607.17525
tags: [paper]
---

# FailureAtlas: A Taxonomy of Failure Modes in Multi-Provider LLM Serving Infrastructure

## TL;DR
FailureAtlas introduces a two-axis taxonomy (Layer × Detectability) for classifying failures in multi-provider LLM gateways (reverse proxies like LiteLLM, Portkey, OpenRouter), backed by an evidence-grounded catalog of five verified failure modes. Its central claim is that the most operationally severe failures are silent — they return HTTP 200, pass every health check, but corrupt conversation state or tool-call payloads, requiring semantic-level observability to detect.

## Abstract
> Multi-provider LLM gateways reverse proxies that route, load-balance, and rate-limit requests across foundation-model APIs have become critical production infrastructure. Yet the failure modes specific to this architectural layer remain undocumented, scattered across issue trackers and post-mortems with no unifying framework. We introduce \fa{}, a two-axis taxonomy that classifies failures by their \emph{origin layer} (Network/Transport, Streaming/Protocol, State/Session, Model~Behavior, Governance/Cost) and their \emph{detectability} (Loud vs.\ Silent). We populate this taxonomy with five verified catalog entries sourced from public bug reports and first-hand stress testing, each accompanied by a mechanistic root-cause analysis. Three entries include standalone reproduction scripts. Our principal finding is that the most operationally severe failures are \emph{silent}: they return HTTP~200, pass every standard health check, and corrupt application state in ways that require semantic-level observability to detect. Two such silent failures a concurrency race condition causing history loss and a streaming index collision corrupting tool-call payloads were discovered first-hand during \cb{} evaluation campaigns.

## Key Topics
- [[Agent Evaluation]]
- [[Serving & Inference]]
- [[Tool Use]]
- [[Evaluation Harnesses]]
- [[Benchmarks]]
- [[Multi-agent Systems]]

## Highlights
- Central finding: the most dangerous failures are SILENT — they return HTTP 200, pass all health checks, and corrupt semantic payloads invisible to latency/error-rate/uptime monitoring.
- Concurrency race condition (State/Session, Silent): under C=100 concurrent sessions, Continuity Preservation Rate collapsed from ~near-perfect (at C=5) to ~28% (a 72% drop) because a shared conversation-history cache was mutated across an async yield without locking, causing turns to vanish and context to bleed across tenants.
- Failover retry storm / thundering herd (Governance/Cost, Loud): 100 agents retrying at a fixed 1s interval synchronized into waves that saturated provider rate limits, causing ~25% of requests to fail permanently plus runaway billing for partial completions.
- Parallel tool-call index collision in SSE streams (Streaming/Protocol, Silent): a proxy resetting its chunk index counter to index=0 caused independent tool-call argument strings to be concatenated into malformed JSON, surfacing later as a misleading JSONDecodeError on the next turn.
- Redis semaphore leak (Governance/Cost, Loud): a missing decrement on the error path stranded in-flight counters, eventually hitting max_parallel_requests and permanently rejecting all requests with 429s until a manual Redis flush.
- The Model Behavior layer (L4) is entirely empty — no evidence-grade reproducible bug reports could be found, which authors argue is itself a finding about where observability tooling is weakest.
- Both silent failures were only caught by ContinuityBench's semantic continuity metrics, not by any infrastructure monitoring.

## Method
The authors built a 5×2 taxonomy: Layer axis (L1 Network/Transport, L2 Streaming/Protocol, L3 State/Session, L4 Model Behavior, L5 Governance/Cost) crossed with Detectability (Loud vs Silent). They populated it from two evidence streams: (1) first-hand stress testing during ContinuityBench Phase 2 campaigns running hundreds of parallel agents against a mock provider gateway simulating latency, rate limits, and transient 502s; and (2) structured GitHub issue-tracker surveys of LiteLLM, Portkey, and OpenRouter using scoped queries (e.g., SSE 'truncated', 'malformed JSON' streaming, 'connection timeout' failover, asyncio block). Candidate reports had to pass three inclusion criteria: concrete/specific, independently verifiable provenance (persistent URL to issue/PR), and mechanistically explainable (root cause traced through the codebase and confirmed against the merged fix). Three of five entries include standalone minimal reproduction scripts; the other two require external infra (Kubernetes probes, running Redis) documented via README setup. The catalog is published as machine-readable YAML in an open repository for community pull-request extension.

## Evals & Results
This is a taxonomy/systematization paper, not a benchmarking paper — there are no model benchmark scores or baselines in the usual sense. The quantitative evidence: Continuity Preservation Rate dropping to ~28% at C=100 (72% drop) for the race condition; ~25% permanent request failure under the retry storm; the demonstrated contrast of fixed-interval retries failing vs exponential backoff with jitter succeeding in a 100-agent-vs-15-req/min mock. Three entries derive from verified LiteLLM issues (#33678 index collision, #20256 semaphore leak, #24788 event-loop block). No metric moved in a training sense; the point is that standard APM/transport-layer metrics (latency, error rate, saturation, uptime) fail to move at all when silent semantic failures occur.

## So What (for practitioners)
Treat your LLM gateway layer as a distinct failure surface that inherits both classical distributed-systems faults and LLM-specific ones. Concrete mitigations: use exponential backoff with jitter plus a global circuit breaker on all provider calls to prevent failover from becoming self-inflicted DoS; wrap request execution in strict try/finally (or Redis TTLs) so rate-limit counters always decrement on error paths; maintain stateful cross-chunk counters when proxying SSE tool-call streams; enforce per-session deep-copy isolation or async locks on any cached conversation history to avoid context bleeding across tenants; and offload synchronous I/O off the asyncio event loop via run_in_executor, especially in frequent health probes. Most importantly, HTTP 200 + healthy pods does NOT mean success — build continuous semantic observability (conversation-state integrity, tool-call payload correctness, continuity/persona metrics) as a first-class signal, since standard monitoring is structurally blind to the silent, most damaging failures.

## Open Questions / Critiques
The catalog has only five entries and is explicitly non-exhaustive; the entire Model Behavior layer is empty. There is strong self-sourcing bias — two of the five (and the most rigorously characterized) came from the authors' own ContinuityBench harness, which was specifically designed to stress state management and retries, so it naturally surfaced exactly those two failures. Three surveyed entries come almost entirely from a single vendor's (LiteLLM) issue tracker, reflecting its transparency rather than proving other gateways are safe. Evidence quality varies (controlled experiments vs single bug reports). The two-axis taxonomy is a pragmatic, non-orthogonal, non-provably-exhaustive design choice — layer boundaries and the absence of a recovery-time axis are debatable. The '28% CPR' and '25% failure' figures come from a mock/simulated provider environment, not production traffic, so real-world magnitudes are unvalidated. Finally, the paper argues silent failures are common (not rare) but by its own admission cannot quantify their prevalence precisely because the tooling to detect them doesn't exist.
