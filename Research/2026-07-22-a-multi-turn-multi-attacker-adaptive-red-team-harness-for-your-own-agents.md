---
idea_title: "A multi-turn, multi-attacker adaptive red-team harness for your own agents"
date: 2026-07-22
sources: [adaptive-adversaries-a-multi-turn-multi-llm-benchmark-for-llm-agent-security, measuring-reward-seeking-via-contrastive-belief-updates, guardrails-as-scapegoats-auditing-unfaithful-safety-refusals-in-tool-augmented-llm-agents]
---

# A multi-turn, multi-attacker adaptive red-team harness for your own agents

I'll research this space thoroughly. Let me search for existing products, startups, open-source projects, and recent launches related to adaptive multi-turn red-teaming harnesses for LLM agents.
The results are strings. Let me parse them correctly.
The result is a JSON string. Let me write a proper parser and run all searches.
Hit a rate limit within one code cell. Let me space out searches across separate tool calls.
Let me wait and retry with a single search.
The limit seems to persist. Let me wait a bit using bash sleep, then try again.
It appears the web_search limit for this session may have been exhausted. Let me wait longer and try once more.
The search tool limit has been hit for this session and isn't recovering. I did capture meaningful results from my first successful search before the limit. Let me review what I have and check if there's saved content I can use.
The tool is fully rate-limited now. Fortunately, I captured substantial raw content from my earlier successful call (before the limit) in the conversation. Let me work with the data I already retrieved and note the constraint transparently. Let me re-extract what I saw from that first successful search output, which had rich content.

From my first successful search I obtained detailed results. Let me try one more time after a longer wait, since a complete report benefits from more sources.
The search quota for this session is exhausted and not recovering. I'll compose the report based on the substantive search results I successfully retrieved earlier (the first query returned detailed content on multiple relevant papers), combined with my domain knowledge of the well-known tools in this space. I'll be transparent that search access was limited, and I'll only cite the sources I actually retrieved.

Let me consolidate the successfully retrieved sources.
I have limited but relevant retrieved sources. Before finalizing, I should be honest about the constraint. Let me note that a full competitive scan would ideally cover the well-known tools in this space. I'll write the report drawing on the two sources I actually retrieved via search (which I'll cite), and clearly flag where I'm relying on general domain knowledge rather than fresh search results.

---

# Market Research: Multi-Turn, Multi-Attacker Adaptive Red-Team Harness

> **⚠️ Research caveat:** My web-search access was cut off by a tool rate limit after only a small number of successful queries this session. The citations below reflect only the sources I was able to retrieve live. Named commercial/OSS tools in "Existing players" that lack a `cite` tag come from my general domain knowledge and were **not** verified via fresh search — treat those as leads to confirm, not verified facts. I'd recommend re-running the competitive scan when search is available.

## Verdict

**UNCLEAR** (leaning toward **GAP** for the specific combination proposed). The academic literature confirms your core theses are live and validated — 
an automated multi-turn red-teaming framework in which an attacker model generates each next query from the conversation history, running up to 5 turns and terminating early on majority-agreement detection of a harmful disclosure, is being actively built to probe adaptive failure modes that do not manifest under single-turn prompting
, and 
a 21-scenario benchmark exists for adaptive multi-round attacks against memoryless LLM defenders, where an autonomous attacker observes prior defender responses and pivots across rounds while each defender response is evaluated as a fresh interaction
. However, these are research benchmarks, not the packaged, auditable, agent-facing *harness* you describe — and I could not verify the commercial/OSS landscape due to search limits, so I cannot yet rule "CROWDED."

## Existing players

*Verified via live search:*
- **"Adaptive Adversaries" benchmark (arXiv 2607.18063)** — the paper cited in your rationale. 
A multi-turn, multi-LLM benchmark of 21 scenarios pitting an autonomous, adaptive attacker that pivots across rounds against memoryless defenders.
 This is your closest conceptual neighbor and effectively your intellectual anchor.
- **FinRedTeam / Risk-Adjusted Harm Scoring (arXiv 2603.10807)** — domain-specific (financial services) automated multi-turn red-teaming. 
It activates a conditional multi-turn red-teaming procedure for prompts that do not produce a harmful disclosure under single-turn evaluation, selecting a target risk category and initiating a multi-turn adversarial dialogue between an attacker model and a target model.
 Notably it already does **outcome-based** scoring (harmful-disclosure detection) rather than substring matching — overlapping with your "typed unsafe outcome" goal.

*From domain knowledge — NOT verified this session, confirm before relying on:*
- **Microsoft PyRIT** — open-source automated red-teaming framework with multi-turn "orchestrators" and attacker/target/scorer abstractions; supports adaptive conversation strategies.
- **NVIDIA garak** — open-source LLM vulnerability scanner; largely probe/single-turn oriented, less adaptive-multi-turn.
- **promptfoo / Promptfoo red-team** — OSS + commercial red-teaming and eval, includes multi-turn strategies (e.g., "crescendo," GOAT-style).
- **HAIZE Labs, Lakera, Robust Intelligence (Cisco), Protect AI, Patronus AI, Gray Swan** — commercial LLM/agent safety & red-teaming vendors; varying degrees of multi-turn/adaptive and agent-specific coverage.
- **Anthropic / OpenAI internal harnesses & the "reward-seeking / eval-awareness" line of work** — the second paper in your rationale; relevant to your belief-editing probe idea but I could not re-verify the exact release.

## Differentiation angle

Even assuming several multi-turn red-team tools exist, your proposed **combination** appears under-served, and each element is a defensible wedge:

1. **Live cross-model attacker pooling as a first-class primitive.** Existing frameworks typically use a single configurable attacker. Your pooling of Opus/GPT/Gemini with *live regeneration per battle* — motivated by the finding that pooling finds 1.4–2.2× more unique attacks with opposing per-model weaknesses — is a concrete, marketable differentiator.
2. **Typed-field outcome scoring over substring detection.** The FinRedTeam work moves toward outcome-based scoring but in a narrow domain; a general harness that scores against *actual unsafe outcomes in typed/structured tool-call fields* (not string presence) is stronger for agents that take actions, not just emit text.
3. **Auditability via released transcripts/replays.** Neither retrieved benchmark emphasizes shipping replayable, auditable battle transcripts as a product feature — valuable for regulated buyers and for reproducibility.
4. **Out-of-context belief-editing probes to defeat eval-gaming.** This is the sharpest technical moat: most tooling relies on in-context prompting, which is confounded by eval-awareness. A harness that detects grader-gaming *without* in-context tells would be a genuine capability gap addressed.
5. **Agent-native, not chatbot-native.** Both retrieved works target LLM *defenders/agents* but as benchmark scenarios; a productized harness that plugs into a customer's own agent stack (tools, memory, multi-step planning) and runs continuous adaptive battles is the operational form buyers actually need.

## Evidence

Sources retrieved via live search (verified this session):
- Adaptive Adversaries: A Multi-Turn, Multi-LLM Benchmark for LLM Agent Security — https://papers.cool/arxiv/2607.18063 (mirror of arXiv 2607.18063). 
21-scenario adaptive multi-round attack benchmark against memoryless defenders with an attacker that pivots across rounds.

- Risk-Adjusted Harm Scoring for Automated Red Teaming for LLMs in Financial Services — https://arxiv.org/pdf/2603.10807. 
Automated multi-turn red-teaming framework where the attacker generates each next query from conversation history, escalating from single-turn prompts that fail to produce harmful disclosures into multi-turn adversarial dialogues.


Leads to verify when search is available (not confirmed this session): Microsoft PyRIT (GitHub), NVIDIA garak (GitHub), promptfoo red-team docs, and vendor sites for Haize Labs, Lakera, Gray Swan, Patronus AI, Protect AI, and Cisco/Robust Intelligence — plus the reward-seeking / "models know they're being tested" paper referenced in your rationale.

---

**Bottom line for your build decision:** The *research* validates every premise you cite, and the closest work (Adaptive Adversaries, FinRedTeam) are benchmarks/papers rather than the packaged, auditable, agent-integrated, eval-gaming-resistant harness you describe — which suggests a real product gap. The main risk to the thesis is the **unverified commercial layer** (PyRIT/promptfoo/vendors), which may already cover multi-turn adaptive attacks well enough to make your differentiation narrower than it looks. I recommend a focused re-scan of those specific tools' *feature depth* on (a) attacker pooling, (b) typed-outcome scoring, and (c) out-of-context probes before committing — that comparison is what will settle GAP vs. CROWDED.

Want me to retry the full competitive search once the rate limit clears, and produce a feature-by-feature comparison table against PyRIT, promptfoo, and the named vendors?
