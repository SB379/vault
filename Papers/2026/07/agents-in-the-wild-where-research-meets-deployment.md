---
arxiv_id: "2607.19336"
title: "Agents in the Wild: Where Research Meets Deployment"
authors: ["Grace Hui Yang", "Pranav N. Venkit", "Hooman Sedghamiz", "Enrico Santus", "Victor Dibia", "Ioana Baldini"]
categories: [cs.AI, cs.CL]
published: 2026-07-21
score: 9
url: https://arxiv.org/abs/2607.19336
tags: [paper]
---

# Agents in the Wild: Where Research Meets Deployment

## TL;DR
This is a KDD 2026 tutorial (not a research paper) surveying the transition of LLM-based agentic systems from research prototypes to production deployment. It maps the evolution from single-model prompting agents to modular multi-agent systems, emphasizes evaluation beyond static benchmarks toward behavioral safety/robustness, and grounds the discussion in deployment case studies from pharma/life sciences and finance.

## Abstract
> Agentic systems large language model (LLM) based architectures capable of reasoning, planning, acting, and coordinating with tools and other agents are rapidly transitioning from research prototypes to production scale deployments across domains such as software engineering, scientific discovery, and finance. While academic work has emphasized benchmarks and algorithmic innovation, deployment raises new challenges around robustness, safety, and reliability. This tutorial brings together researchers and practitioners to explore advances in reasoning and planning, multi agent coordination, and evaluation, highlighting open challenges arising from deployment experience. Through applied case studies in pharmaceutical discovery and financial systems, we analyze common design patterns that make agentic systems successful, and discuss practical mitigation strategies for failure modes, such as verification pipelines, fallback mechanisms, and human in the loop supervision. Attendees will gain a comprehensive view of the field along with concrete design patterns, evaluation checklists, and templates for safe and reliable deployment across industries.

## Key Topics
- [[Agent Architectures]]
- [[Multi-agent Systems]]
- [[Agent Evaluation]]
- [[Benchmarks]]
- [[RAG]]
- [[Tool Use]]

## Highlights
- Frames three converging challenges for agents: making individual agents more capable (reasoning/planning), improving multi-agent coordination, and ensuring robustness/safety during deployment.
- Identifies concrete production failure modes — hallucination, deadlocks, drift, and cascading errors — with mitigations: cross-checking/verification pipelines, fallback mechanisms, and human-in-the-loop supervision.
- Notes a paradigm shift in evaluation from static benchmarks (SWE-bench, WebArena, WorkArena) to behavior-centric, safety/robustness-focused benchmarks (AgentSafetyBench, ST-WebAgentBench, Agent Security Bench, DeepTRACE, MobileSafetyBench, ScienceAgentBench, AGENTSAFE).
- Cites large-scale deployment evidence: Moderna's OpenAI partnership reports 750+ agentic applications across R&D; FutureHouse's ether0/Robin and Google's AI co-scientist demonstrate end-to-end scientific discovery.
- In finance, agents commonly adopt a planner–executor–verifier architecture (inspired by AutoGen); systems like FinAgent and FinRobot outperform single-step prompting on decision quality and explainability.
- Highlights RAG evolution from one-shot retrieval to iterative (interleaved reasoning/retrieval), adaptive (Self-RAG), and modular retrieval architectures for interactive tasks.

## Method
This is a tutorial/survey rather than an experimental paper, so there is no novel method or system. It is organized in two parts. Part I (Foundations) covers: (1) history and definitions of agentic systems, tracing from single-LLM ReAct-style prompting pipelines to modular multi-agent orchestration with interlocking reasoning, planning, execution, and memory components; (2) reasoning/planning techniques including task decomposition, multi-plan generation and selection, iterative reflection loops (Reflexion, Agent-R), and memory-augmented planning for long-horizon tasks, plus multi-agent topologies (peer-to-peer, hierarchical), communication protocols, negotiation/cooperation schemes, and fault tolerance; (3) retrieval-and-reasoning pipelines spanning iterative, adaptive, and modular RAG; and (4) evaluation beyond static benchmarks toward dynamic, behavior-centric, safety-focused frameworks. Part II (Applied) presents deployment case studies in pharma/life sciences (Coscientist, ChemCrow, Virtual Lab, PharmAgents, SciAgents, AI co-scientist) and finance (FinAgent, FinRobot, FinMem) built on planner-executor-verifier patterns.

## Evals & Results
No original experiments are run. The tutorial catalogs existing benchmarks: task-completion benchmarks (SWE-bench for GitHub issues, WebArena, BrowserGym, WorkArena/WorkArena++, CRMArena/CRMArena-Pro, MultiAgentBench) and a newer wave of safety/robustness/security benchmarks (AgentSafetyBench, ST-WebAgentBench, Agent Security Bench, DeepTRACE for citation/evidence reliability auditing, MobileSafetyBench, ScienceAgentBench, AGENTSAFE for embodied hazards). Reported deployment-level results are anecdotal/vendor-cited (e.g., Moderna's 750+ agentic apps; superhuman molecular design claims for ether0; multi-agent finance systems beating single-step prompting), not independently benchmarked in this document.

## So What (for practitioners)
Prefer modular multi-agent architectures (e.g., planner–executor–verifier) over monolithic single-prompt agents for complex, long-horizon tasks. Build explicit defenses against production failure modes: verification/cross-checking pipelines, fallback mechanisms, and human-in-the-loop supervision, especially in high-stakes domains like finance and biomedicine. Evaluate agents beyond task-success benchmarks — test for robustness under distribution shift, adversarial perturbations, cascading failures, recovery behavior, security, and citation/evidence reliability. Use iterative/adaptive/modular RAG rather than one-shot retrieval for interactive multi-step reasoning. Account for industrial constraints (latency, compute efficiency, monitoring) as first-class design considerations. The reference list itself is a useful map of current benchmarks and frameworks to adopt.

## Open Questions / Critiques
As a tutorial abstract it contains no new evidence, ablations, or quantitative comparisons — deployment claims (e.g., 750+ apps, superhuman performance) are secondhand and unverified here. It lists open challenges without resolving them: multi-agent scalability, lifelong adaptation, explainability of collective reasoning, secure inter-agent communication, and embodied/multimodal agents. Be skeptical of vendor-reported success metrics and of whether the many cited safety benchmarks actually correlate with real-world reliability. No concrete design templates, checklists, or numbers are provided in the text despite being promised as takeaways.
