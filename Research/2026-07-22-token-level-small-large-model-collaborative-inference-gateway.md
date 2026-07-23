---
idea_title: "Token-level small/large model collaborative inference gateway"
date: 2026-07-22
sources: [pyrodash-cost-efficient-token-level-small-large-language-model-collaborative-inference, how-fast-can-reward-models-score-a-systems-study-of-c-and-pytorch-inference-runtimes-for-rlhf]
---

# Token-level small/large model collaborative inference gateway

I'll research this space to understand the competitive landscape for token-level SLM/LLM collaborative inference gateways.
Good, finding relevant work. Let me dig deeper into the specific mechanisms and commercial products.
I found the PyroDash paper itself. Let me examine it and the closest competitors (CITER, xRouter) to understand differentiation.
Let me wait and retry with fewer calls.
I've hit the search limit. Let me get details from the sources I already found by fetching a couple of key pages, then check remaining capacity.
The search tool has a hard limit that's been exhausted. I have gathered substantial evidence across the key categories. Let me compile the report from the results collected, which cover the closest academic work (CITER, PyroDash itself, xRouter, G-Boost), commercial routers (Martian, NotDiamond, OpenRouter), open-source frameworks (RouteLLM, LiteLLM, Portkey), and speculative decoding.

Let me do one more retry after a longer wait to fill any gaps on commercial products.
The search budget is fully exhausted. I have collected enough evidence across all the relevant categories to write a well-supported report. Let me retrieve sentence-level content from the key results I already have for proper citations.
The search tool budget is fully exhausted for this session and I cannot retrieve additional sentence-indexed content. I'll write the report based on the search results I successfully gathered. Since I have titles and URLs but limited sentence-level indexed content that would support precise `<cite>` tags, I'll present the evidence with the sources found while being careful not to fabricate citation indices.

Based on my research, here is the market research report:

---

## Verdict

**CROWDED (with a defensible sub-niche)** — The broad "route between cheap and expensive models to save cost" space is heavily contested by well-funded startups (Martian, Not Diamond), open-source frameworks (RouteLLM, LiteLLM, Portkey, OpenRouter), and a growing academic literature. However, the *specific* mechanism proposed here — token-level SLM-driven handoff via a self-emitted control token, GRPO-trained against real billed cost, with exactly-one context-preserving handoff for stateless generation-only APIs — is essentially the PyroDash paper itself, and no *commercial product* was found shipping this exact design. So the concept is validated but under-productized: the idea is defensible, but you are entering a field crowded with adjacent approaches, and PyroDash's own novelty claims are your closest prior art.

## Existing players

**Academic / closest prior art (token- and trace-level collaboration):**
- **PyroDash** — The paper underpinning this idea itself: cost-efficient token-level small–large model collaborative inference (arXiv 2607.20327). This is prior art, not a competitor product.
- **CITER (COLM 2025)** — Collaborative Inference for Efficient LLM Decoding with **Token-Level Routing**; routes individual tokens between a small and large model. The single closest technical analog; open-source on GitHub (aiming-lab/CITER).
- **xRouter** — Trains a **cost-aware LLM orchestration** system via reinforcement learning (arXiv 2510.08439). Directly overlaps the "RL-trained routing against cost" angle.
- **G-Boost** — Boosting private SLMs with general LLMs (arXiv 2503.10367); SLM-primary, LLM-assist collaboration.
- **Speculative Thinking / Speculative Decoding** — Small model drafts, large model verifies/guides; adjacent mechanism but latency-focused and typically requires logit access.

**Commercial LLM routers / gateways (request-level, cost-quality):**
- **Martian** — SF startup marketed as the "first LLM router," reportedly nearing a ~$1.3B valuation; enterprise model routing/gateway.
- **Not Diamond** — Intelligent request-level model router optimizing for cost/quality.
- **OpenRouter** — Unified API with model routing, fallbacks, and an "Auto Router."
- **LiteLLM / Portkey** — LLM gateway/proxy layers with routing, fallback, and cost controls.
- **RouteLLM (LMSYS)** — Open-source framework for training/serving routers that route between a strong and weak model to cut cost without compromising quality.

## Differentiation angle

Given how crowded request-level routing is, a new entrant should lean hard into what those players *don't* do:

- **Own the "generation-only API" constraint as a product wedge.** Most routers assume they control both models or need logit/probability access. A serving layer that works purely against stateless, generation-only proprietary APIs (OpenAI/Anthropic-style) — with **exactly one context-preserving handoff** so the growing SLM trace isn't repeatedly re-billed as input tokens — is a genuinely under-served operational pain point. Input-token re-send cost is where naive cascades quietly bleed money; make that your headline metric.
- **No separate router model, no logit access.** The SLM emitting its own control token means no auxiliary classifier to train/host/version. Package this as "drop-in, zero extra infrastructure" vs. RouteLLM/Martian-style external routers.
- **Bill-accurate cost objective, not proxy metrics.** Train the policy (GRPO) against *actual billed cost* with a single tunable cost/quality knob, and expose that knob as a first-class dashboard control. Competitors optimize proxies (token counts, benchmark scores); a "set your dollar/quality dial" UX is concrete and CFO-legible.
- **Productize the research.** CITER, xRouter, and PyroDash are papers/repos, not deployable gateways. The gap is a hardened serving layer (observability, per-tenant cost accounting, fallback/failure handling, provider-agnostic adapters) — i.e., be the "LiteLLM of token-level SLM→LLM handoff."
- **Positioning risk to manage:** Martian/OpenRouter/Portkey could add a similar feature; and CITER already covers token-level routing academically. Move fast on the operational moat (context-preservation billing, multi-provider adapters) rather than the algorithm alone.

## Evidence

Key sources found during research:

- **PyroDash (the source paper):** https://arxiv.org/abs/2607.20327 — "Cost-Efficient Token-Level Small-Large Language Model Collaborative Inference"
- **CITER — closest technical analog:** https://arxiv.org/abs/2502.01976 (COLM'25); code: https://github.com/aiming-lab/citer
- **xRouter — RL-trained cost-aware orchestration:** https://arxiv.org/pdf/2510.08439
- **G-Boost — SLM boosted by general LLMs:** https://arxiv.org/pdf/2503.10367
- **RouteLLM (LMSYS) open-source router:** https://www.lmsys.org/blog/2024-07-01-routellm/ ; https://github.com/lm-sys/routellm
- **Martian (commercial LLM router, ~$1.3B valuation reporting):** https://medium.com/@sarawgiapoorvwork347/martian-the-san-francisco-based-startup-that-invented-the-first-llm-router... ; https://venturebeat.com/ai/why-accenture-and-martian-see-model-routing-as-key-to-enterprise-ai-success
- **Not Diamond (commercial router):** https://medium.com/@deepakda1972/the-real-llm-router-how-notdiamond-rewrites-the-rules-for-llm-routing-and-efficiency-d98e6d76e857
- **LLM gateway comparison (LiteLLM vs OpenRouter vs Portkey vs RouteLLM):** https://wavect.io/blog/llm-gateway-router-comparison-2026/
- **OpenRouter model routing / Auto Router:** https://openrouter.ai/blog/insights/model-routing/
- **Speculative decoding (adjacent draft/verify mechanism):** https://developer.nvidia.com/blog/an-introduction-to-speculative-decoding-for-reducing-latency-in-ai-inference/ ; Speculative Thinking: https://arxiv.org/html/2504.12329v1
- **Cascade cost-aware serving literature:** "Cluster, Route, Escalate" (arXiv 2606.27457); "Is Escalation Worth It? Decision-Theoretic Characterization of LLM Cascades" (arXiv 2605.06350)

---

**Methodology note:** My web-search budget was exhausted before I could pull sentence-level text to attach precise inline citations, so the claims above are attributed to the titled sources by URL rather than quoted directly. Two things worth verifying before you build: (1) confirm Martian's valuation figure against a primary source (the one I found is a secondary Medium post), and (2) check whether any of the commercial gateways have shipped a *token-level* (not request-level) handoff feature since late 2025 — that's the single fact that would flip this verdict from "defensible sub-niche" to "fully crowded."
