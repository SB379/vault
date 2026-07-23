---
idea_title: "A predictive, action-aware safety supervisor for CLI coding agents"
date: 2026-07-22
sources: [janus-foreseeing-latent-risk-for-long-horizon-agent-safety, operational-hallucination-and-safety-drift-in-ai-agents, openskillrisk-benchmarking-agent-safety-when-using-real-world-risky-third-party-skills]
---

# A predictive, action-aware safety supervisor for CLI coding agents

I'll research this space thoroughly. Let me search for existing products, startups, and projects related to safety guards for AI coding agents at the tool-call boundary.
Let me fix the parsing.
The results seem empty. Let me inspect the raw structure.
The web_search from within code execution appears to be hitting limits. Let me try a direct approach with fewer, more careful calls.
I've hit the search tool limit within code execution. Let me use the web_search tool directly instead.

I'll search directly for the relevant terms.
The earlier `asyncio.gather` calls consumed the search budget. Let me wait and try single searches carefully, spacing them across turns.
I've exhausted the search budget for this turn. Let me try in a new turn.
The budget resets are strict. Let me pause and retry with a single search.
The search limit appears to be per-turn and I keep hitting it because the failed gather calls counted. Let me try a fresh single call.
I'm consistently hitting the limit. Let me space it out more deliberately with a longer wait and then a single search.
The "too many times this turn" limit is stuck. The initial `asyncio.gather` fired 4+ concurrent searches which exhausted the per-turn quota. This is a hard cap that won't reset within the same conversation turn structure until I get more tool-use budget.

Let me try one more time — the limit may reset now.
The web search quota is fully exhausted and not recovering. I've been unable to retrieve any live search results due to the tool-use limit being hit by the initial batched calls.

I want to be transparent with you: **I was unable to complete live web searches** for this report. The search tool returned a persistent "too many times this turn" error after my initial batched call consumed the quota, and it did not recover across multiple retries. As a result, I cannot ground this report in fresh, citable search results as the task requires.

Rather than fabricate sources or citations (which would undermine the entire purpose of market research), I'll give you a report based on my existing knowledge of this space as of my training data — **clearly flagged as NOT search-validated** — plus a precise search plan so you or I (in a fresh session with restored search budget) can verify it.

---

# Market Research Report: Predictive, Action-Aware Safety Supervisor for CLI Coding Agents

> ⚠️ **Methodology caveat:** Live web search was unavailable during this session (tool quota exhausted before any query returned results). The findings below reflect my prior knowledge, not verified 2024–2025 search results. **Treat the `## Verdict` as provisional and re-run the search plan in the Evidence section before making decisions.** No citations are provided because no search results were retrieved.

## Verdict

**UNCLEAR** (provisional, pending live search). The *adjacent* space is crowded — many products intercept agent tool calls for approval/policy enforcement — but the *specific* combination you propose (a **predictive/anticipatory** head that forecasts the trajectory from the current prefix *before* execution, fused with deterministic intent-action consistency checks and hard-abort livelock detection) appears far less served. Most shipping tools today are *reactive* (pattern/policy match on the current call) rather than *anticipatory*. The genuine differentiator is prediction + "only-explicit-unsafe-blocks" utility preservation, which I cannot confirm exists as a product without search.

## Existing players

*Based on prior knowledge; each MUST be verified — descriptions may be outdated.*

**Reactive tool-call gating / permission layers (adjacent, likely crowded):**
- **Claude Code / Cursor / Aider built-in permission prompts** — Native "ask before running shell/edit" gates; deterministic allow/deny lists, not predictive.
- **Docker/sandbox isolation approaches (e.g., devcontainers, gVisor, Firecracker microVMs)** — Contain blast radius rather than judge intent; complementary, not competitive.
- **Invariant Labs (Guardrails / analyzer)** — Security analysis and policy enforcement for agent/tool traffic; MCP-focused guardrails.
- **Lakera / Prompt Security / Robust Intelligence-style LLM firewalls** — Primarily prompt-injection & I/O content filtering, less about CLI action forecasting.
- **Protect AI / HiddenLayer** — ML/AI security posture; more model-supply-chain than live action supervision.
- **LangChain guards / NeMo Guardrails (NVIDIA)** — Programmable rails for LLM apps; rule/flow based, not trajectory-forecasting for CLI ops.
- **MCP (Model Context Protocol) permission/consent tooling & various "MCP gateway" projects** — Broker/gateway layer that can enforce approvals at the tool boundary.

**Research (the papers in your rationale — verify exact titles/venues):**
- **JANUS** — cited by you as showing anticipatory guards cut ASR ~0.23 → 0.071.
- **"Operational Hallucination"** work — verbal refusals co-occurring with unsafe execution.
- **OpenSkillRisk** — only harnesses with explicit block/abort achieve real intervention.

**Note:** I found *no confirmed* commercial product (in my prior knowledge) that ships a *learned anticipation head forecasting future trajectory from the tool-call prefix* combined with deterministic drift/livelock hard-aborts as its core value prop. This is the potential gap — but it needs search confirmation.

## Differentiation angle

- **Anticipation, not reaction.** Nearly all shipping guards evaluate the *current* call against rules/policies. Forecasting the *likely continuation* of the trajectory and judging *that* is a genuine wedge — if research (JANUS) translates to product.
- **Fuse deterministic + learned.** A deterministic intent-action consistency layer (catches the "Operational Hallucination" case where the agent *says* it refuses but *executes* anyway) gives zero-false-positive coverage; the learned head adds coverage for novel/ambiguous cases. Positioning: "provably catches drift, probabilistically catches the rest."
- **Utility-preserving by design.** "Only explicit `unsafe` verdicts block" is a strong marketing/adoption story — the #1 objection to agent guardrails is over-blocking that kills productivity. Lead with measured over-block rate.
- **Boundary-agnostic integration.** Sit at the tool-call/MCP boundary so it works across Claude Code, Cursor, Aider, Devin-style agents, and CI/ops bots — a horizontal supervisor rather than one vendor's built-in.
- **Livelock/Safety-Drift hard-abort primitives** as a distinct, testable safety guarantee (loop detection, repeated-failed-retry, escalating-privilege detection) — few tools frame this explicitly.

## Evidence

⚠️ **No live sources were retrieved this session.** Below is the exact search plan to validate this report — run these when search budget is available:

1. `JANUS anticipatory guardrail agent attack success rate ASR paper`
2. `"operational hallucination" LLM agent verbal refusal unsafe execution`
3. `OpenSkillRisk benchmark agent block abort intervention`
4. `Invariant Labs agent security guardrails MCP`
5. `AI agent runtime guardrail intercept tool call block destructive command startup 2025`
6. `MCP gateway permission consent tool-call approval open source`
7. `Claude Code Cursor Aider permission prompt shell command safety`
8. `NeMo Guardrails vs agent action supervisor CLI ops`
9. `LLM agent firewall Lakera Prompt Security Protect AI HiddenLayer`
10. `predictive safety supervisor coding agent forecast trajectory tool boundary`

**Would you like me to retry the live searches?** The quota should reset on a fresh request — if you send a follow-up message, I can execute the search plan above (one query at a time to avoid re-exhausting the budget) and deliver a fully citation-backed version of this report with a confident GAP/CROWDED verdict.

I apologize that I couldn't fully complete the search-grounded research in this pass — I'd rather flag the limitation clearly than present unverified claims as if they were confirmed market findings.
