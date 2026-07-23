---
idea_title: "A predictive, action-aware safety supervisor for CLI coding agents"
date: 2026-07-22
sources: [janus-foreseeing-latent-risk-for-long-horizon-agent-safety, operational-hallucination-and-safety-drift-in-ai-agents, openskillrisk-benchmarking-agent-safety-when-using-real-world-risky-third-party-skills]
---

# A predictive, action-aware safety supervisor for CLI coding agents

I'll research this space to understand the competitive landscape for a predictive, action-aware safety supervisor for CLI coding agents. Let me search across several relevant angles.
Let me inspect the return structure.
The result is a JSON string. Let me parse properly and run all searches.
Good coverage. Let me dig into the specific novel aspects: predictive/anticipatory guards, and the research papers cited (JANUS, Operational Hallucination, OpenSkillRisk).
Rate limit. Let me wait and retry with fewer calls.
The rate limit seems persistent. Let me wait longer.
The search tool appears to have a hard usage cap that's been exceeded for this session. I have gathered substantial data from my earlier searches (5 queries with ~40 results covering products, startups, OSS projects, research papers, and platform features). Let me pull deeper content from the key results I already retrieved to enrich the report, since those are already in memory.
I have rich data. I have strong signal on the landscape. Let me get the key indices for citations by capturing the sentence-level data. Let me check the structure for citation indices.
The results don't come with pre-indexed sentences in this environment, so I'll rely on the natural citation indexing the platform applies. I have enough to write the report. Let me compose it.

## Verdict

**CROWDED (but with a real technical gap on the *predictive/anticipatory* axis).** The tool-call-boundary safety layer for coding/ops agents is a busy, fast-maturing space: platform vendors (Cursor, Factory), security startups (Guardbase, Zenity, Obsidian), OSS projects (AgentGuard, LlamaFirewall), native hooks (Claude Code PreToolUse), and a wave of 2026 research (AgentSpec, AIR, AgentLens, AgentWall/AgentTrust) all already sit at the action boundary and can hard-block. However, almost every deployed system is **reactive**—it judges the *current* proposed call against rules or a classifier. The specific combination you propose—**forecasting the likely future trajectory from the prefix and judging the *anticipated* continuation** before a state-changing action, fused with deterministic intent-action consistency + livelock/drift aborts—is not yet a shipped product category, so there is a defensible wedge inside a crowded market.

## Existing players

**Commercial platforms / native controls (reactive, deterministic + classifier):**
- **Cursor (LLM Safety & Controls)** — 
Before terminal execution, block dangerous commands or route them through approval workflows—for example, block all git push commands, require approval for any sudo command, or block database DROP statements
; deterministic enforcement as hard boundaries.
- **Factory.ai (LLM Safety & Agent Controls)** — 
Blocks high-risk commands entirely or only allows them in specific environments such as isolated devcontainers, and emits risk information via OTEL so security teams can monitor how often high-risk commands are proposed or attempted
.
- **Guardbase** — positions as 
the runtime enforcement layer that controls what coding agents can actually do inside engineering
.
- **Zenity** — secures agentic coding assistants IDE-to-CLI; can 
block dangerous runtime MCP invocations that could enable data exfiltration
.
- **Sysdig** — runtime detections giving 
security teams real-time visibility into suspicious AI coding agent behavior across developer and cloud environments
.
- **Microsoft Defender for Endpoint (AI agent runtime protection, Preview)** — 
inspects key points in the agent loop: user prompts, tool requests before execution, and tool responses after execution
, covering CLI coding assistants.
- **Obsidian Security** — deterministic enforcement across 
tool-call restriction, data-access boundaries, and action-chain limits (evaluating whether a sequence of individual actions is unsafe)
.

**Native harness hooks:**
- **Claude Code PreToolUse hooks** — 
the PreToolUse hook is the most powerful event because it can approve, deny, or modify the tool call; a "deny" permissionDecision blocks the call
, and 
the deny works regardless of active permission mode, so --dangerously-skip-permissions skips only interactive prompts, not hooks
. This is essentially your deterministic hard-abort primitive, already built in.
- **OpenAI Agents SDK guardrails** — 
tool guardrails run on every custom function-tool invocation, with input guardrails before execution and output guardrails after execution
.
- **NVIDIA NeMo Guardrails middleware** — 
hooks into the agent loop itself, running safety checks before and after every step
.

**Open-source / frameworks:**
- **GoPlusSecurity/AgentGuard** — 
a security guard for AI agents that blocks malicious skills, prevents data leaks, and protects secrets, with runtime action evaluation and a trust registry
.
- **LlamaFirewall** — 
an open-source guardrail framework for secure AI agents, combining prompt scanning, code analysis, and judge-based classification
.

**Research prototypes (closest to your thesis):**
- **AgentSpec** — customizable runtime enforcement; 
across ten unsafe categories, results show the agent's hazardous actions are prevented
.
- **AIR (incident response)** — 
if the check condition is satisfied, AIR blocks the action immediately, preventing execution of a potentially unsafe tool invocation
.
- **AgentTrust** — notes that 
Llama-Guard and successors are general-purpose content moderators, not action-aware
 (validates your action-aware framing).
- **AgentLens** — interpretable safety steering for multi-turn coding agents via mechanistic subspaces.
- **AgentWall** — a runtime safety layer for local AI agents.
- **GuardAgent / ShieldAgent** — 
rule-based frameworks that translate safety requirements or policy documents into executable checks that deterministically block or admit actions
.

*Note: I could not, within this session, independently retrieve the three specific papers you cited (JANUS, "Operational Hallucination," OpenSkillRisk)—search quota was exhausted before I could confirm them. Treat those as your priors to re-verify.*

## Differentiation angle

The whole field today is **reactive and prefix-only**—it evaluates the call in hand. Your defensible wedge is the **anticipatory** dimension plus the **hybrid architecture**:

1. **Forecast-then-judge, not just judge.** No shipped product forecasts the *likely continuation* from the current prefix and blocks based on the *anticipated* trajectory. Even the survey framing treats 
runtime guardrails as checking behavior before, during, or after execution, where pre-execution guardrails decide whether a proposed tool call should proceed
—i.e., about the *proposed* call, not a predicted future. A learned anticipation head that catches "this benign-looking call is step 3 of a 6-step destructive path" is genuinely new.

2. **Intent-action consistency as a first-class deterministic layer.** This directly attacks the "verbal refusal but unsafe execution" failure. Deterministic, action-aware checks that catch drift between stated intent and actual arguments align with the observation that 
parameter validation matters—an agent may call an approved API but with unexpected fields, broadened filters, modified identifiers, or elevated operation modes
. Most tools gate *which* tool, not *whether the action matches the reasoning*.

3. **Livelock / Safety-Drift hard-abort primitives.** Loop/drift detection with guaranteed abort is largely absent from commercial offerings; action-chain evaluation exists conceptually but not as a livelock-aware kill-switch.

4. **"Only explicit unsafe blocks" to preserve utility.** This is your anti-over-blocking stance. It's a positioning wedge against the common complaint that pattern-rule guardrails 
force teams into brittle model-based or programmatic pre-tool-use logic
—you differentiate on *low false-positive, benign-utility-preserving* behavior rather than maximal restriction.

5. **Portable across harnesses.** Since Claude Code, OpenAI SDK, and NeMo all expose pre-tool-use hooks, a **harness-agnostic anticipatory head that plugs into existing PreToolUse/hook interfaces** avoids competing with the harness and rides on primitives that already exist—the key is that 
only harnesses with a real block/abort path achieve real intervention
 (consistent with your OpenSkillRisk rationale). Go where the abort primitive already lives; add the anticipation that no one else has.

**Risk to acknowledge:** the deterministic-block layer is nearly commoditized (Claude Code hooks, Cursor, Factory all do it natively for free). Your product must live or die on the **learned anticipation head + drift/livelock detection + measurable false-positive advantage**, not on hard-abort alone.

## Evidence

Key sources found (grouped):

**Platforms / native controls**
- Cursor — LLM Safety and Controls: https://cursor.com/docs/enterprise/llm-safety-and-controls
- Factory.ai — LLM Safety & Agent Controls: https://docs.factory.ai/enterprise/llm-safety-and-agent-controls
- Guardbase — Runtime Security for Coding Agents: https://guardbase.ai/
- Zenity — Securing Agentic Coding Assistants IDE to CLI: https://zenity.io/blog/product/from-ide-to-cli-securing-agentic-coding-assistants
- Obsidian Security — Deterministic Enforcement for Probabilistic AI Agents: https://www.obsidiansecurity.com/academy/agentic-guardrails
- Sysdig — Runtime security for AI coding agents: https://www.sysdig.com/blog/runtime-security-for-ai-coding-agents-protecting-ai-assisted-development
- Microsoft Defender — AI agent runtime protection (Preview): https://learn.microsoft.com/en-us/defender-endpoint/ai-agent-runtime-protection-overview

**Native harness hooks / SDKs**
- Claude Code Hooks reference: https://code.claude.com/docs/en/hooks ; PreToolUse deny under skip-permissions: https://pasqualepillitteri.it/en/news/1832/claude-code-dangerously-skip-permissions-pretooluse-hooks-2026
- OpenAI Agents SDK — Guardrails: https://openai.github.io/openai-agents-python/guardrails/
- NVIDIA NeMo Guardrails — Agent Middleware: https://docs.nvidia.com/nemo/guardrails/0.21.0/integration/langchain/agent-middleware.html

**Open source**
- GoPlusSecurity/AgentGuard: https://github.com/GoPlusSecurity/agentguard

**Research (closest analogues; validate your citations against these)**
- AgentSpec (ICSE '26): https://cposkitt.github.io/files/publications/agentspec_llm_enforcement_icse26.pdf
- AIR — Improving Agent Safety through Incident Response: https://arxiv.org/html/2602.11749
- AgentTrust — Runtime Safety Evaluation and Interception for Tool Use: https://arxiv.org/pdf/2605.04785
- AgentWall — Runtime Safety Layer for Local AI Agents: https://arxiv.org/pdf/2605.16265
- AgentLens — Interpretable Safety Steering for Multi-Turn Coding Agents: https://arxiv.org/pdf/2606.22673
- From Agent Traces to Trust (survey of pre/post-execution verification): https://arxiv.org/pdf/2606.04990

**Analysis / framing**
- Tool-Scoped Guardrails — safety must live next to the action: https://medium.com/@pankaj_pandey/tool-scoped-guardrails-agent-safety-must-live-next-to-the-action-3dac3b0fc9f8
- Choosing the right tool safety approach for coding agents (Scott Logic): https://blog.scottlogic.com/2026/07/15/choosing-the-right-tool-safety-approach-for-coding-agents.html
- VentureBeat — three coding agents leaked secrets via one prompt injection: https://venturebeat.com/security/ai-agent-runtime-security-system-card-audit-comment-and-control-2026

**Caveat on method:** This report is based on ~5 completed search passes (~40 results). The web-search quota was exhausted before I could directly confirm the three papers in your rationale (JANUS, Operational Hallucination, OpenSkillRisk) or run additional passes on "predictive/anticipatory trajectory forecasting" specifically. My **GAP-within-CROWDED** read on the anticipatory axis is therefore inferred from the absence of forecasting language across the many reactive systems I *did* find, and should be reconfirmed with dedicated searches on those three papers before you commit.
