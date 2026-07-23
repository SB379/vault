---
arxiv_id: "2607.18358"
title: "A Classifier That Teaches Itself: Self-Improving, Frozen-gate Training (SIFT) for Dynamic Document Classification"
authors: ["Bogdan Raduta", "Horia Velicu", "Alexandru Preda", "Serban Chiricescu"]
categories: [cs.CL, cs.LG]
published: 2026-07-20
score: 9
url: https://arxiv.org/abs/2607.18358
tags: [paper]
---

# A Classifier That Teaches Itself: Self-Improving, Frozen-gate Training (SIFT) for Dynamic Document Classification

## TL;DR
SIFT is a production document-classification service that removes the two real enterprise blockers—the upfront labeling project and fear of autonomous retraining—by combining a cheap CPU-bound classifier cascade (SPLADE + LightGBM) with an LLM judge that labels only low-confidence pages and writes verdicts back into a self-growing corpus. A two-part 'frozen gate' (critical-label F1 regression check + a never-trained-on golden set) makes scheduled autonomous retraining safe, so accuracy compounds with production traffic while marginal labeling cost trends toward zero.

## Abstract
> Document classification is a solved problem in the laboratory and an unsolved one in the enterprise. The blocker is rarely model architecture; it is the labeling project that must precede a model and the institutional fear of letting a model retrain itself once one exists. We present SIFT (Self-Improving, Frozen-gate Training), a dynamic classifier service, which attacks both. SIFT serves classification from a deliberately cheap, CPU-bound pipeline, a SPLADE sparse encoder feeding a LightGBM head, and escalates only the low-confidence minority of pages to an LLM judge. The judge's verdicts are written back into a labeled corpus, so the expensive model continuously teaches the cheap one: the escalation rate falls, the corpus grows from production traffic rather than from an up-front annotation effort, and accuracy compounds with use. Onboarding a new document family requires only a declarative bundle, label space, anchor phrases, and a judge glossary, not a labeling project. The harder problem is safety: an autonomously retraining classifier can silently regress. SIFT resolves this with a two-part promote gate, a critical-label F1 regression check plus a frozen golden regression set the model is never trained on, either of which vetoes promotion. This turns "retrain monthly without a human" from reckless into routine. We describe the architecture, the self-feeding corpus loop, the frozen-gate promotion mechanism, and an illustrative multi-domain deployment, and we discuss the economics of a classifier whose marginal labeling cost trends toward zero.

## Key Topics
- [[LLM-as-judge]]
- [[Agent Evaluation]]
- [[RAG]]
- [[Serving & Inference]]
- [[Synthetic Data]]

## Highlights
- Cost cascade escalates only the low-confidence minority to the LLM judge; on a well-specified domain roughly 15–25% of pages fall below the confidence threshold and escalate, each costing a fraction of a cent, with the escalation rate falling as the cheap model learns.
- The LLM judge's verdicts are written back into the corpus as labeled rows (tagged source=llm), so the expensive model continuously teaches the cheap one and marginal labeling cost trends toward zero.
- A two-part 'frozen gate' governs promotion: a per-class critical-label F1 regression check plus a frozen golden regression set the model is never trained on; either can veto promotion (returns a 409 with per-label deltas).
- Bootstrap path can produce a first corpus and first model from zero labeled data by running the judge over raw unlabeled pages with the bundle's allowed labels.
- New document families are onboarded as declarative YAML bundles (label space, anchor phrases, regex packs, judge glossary/policy, critical labels, frozen regression set) with no code and multi-tenant isolation.
- Retrains are auto-triggered by row-count, age, or drift (rolling confidence mean vs baseline); auto-triggered candidates land in a pending queue and only auto-promote on a clean gate pass meeting configured accuracy improvement.
- Illustrative NDA example: a candidate that improved overall accuracy but dropped NDA F1 by 2 points was blocked by the gate, sent to human review, and only a corrected next candidate auto-promoted—no regression shipped on the critical class.

## Method
SIFT runs one shared kernel serving/training a classifier per 'domain' (document family) defined as a declarative bundle. Serving path: each page is encoded by a SPLADE sparse lexical encoder, dotted against per-class anchor phrases, combined with regex hit counts and length features, fed to a LightGBM head that outputs a label and calibrated confidence—all CPU-bound at milliseconds/page. If confidence falls below a threshold, the page escalates to an LLM judge that receives the bundle's allowed-label enum, glossary, and policy. Judge verdicts clearing a minimum-confidence bar are persisted to a labeled corpus (source=llm); a bootstrap path labels raw pages from zero; an active-learning queue surfaces least-confident rows to human reviewers whose corrections become ground truth (source=human). A scheduler fires retrains per domain on row-count (e.g., min_new_rows_since_last_train), age, or drift (rolling confidence mean vs training baseline exceeding drift_threshold), blocking stacking of in-flight jobs. Each candidate produces a versioned artifact plus an eval report (confusion matrix, per-class precision/recall, confidence histogram). The promote gate then evaluates two independent checks: (1) critical_labels must not regress in F1 vs the current model, and (2) a frozen golden regression_set (immutable, never added to training) must not drop on critical-label F1 or overall accuracy. Only a clean pass moves the 'latest' serving pointer; failures stay in a per-domain pending queue for human review. Everything is multi-tenant isolated and audit-logged.

## Evals & Results
This is an architecture/position paper with no quantitative benchmark evaluation, baselines, or measured accuracy numbers. It provides a qualitative comparison table (one-time labeling+train, zero-shot LLM, LLM active-learning label set, vs SIFT) across cold-start cost, staying current, and safe auto-retrain, and a single illustrative (explicitly non-empirical) NDA/SUPPORTING/MISC deployment. Stated figures (15–25% escalation rate, a hypothetical 2-point NDA F1 drop) are described as illustrative, not experimental results. No public leaderboard or ablation numbers are reported.

## So What (for practitioners)
Treat the expensive LLM as a 'teacher hired by the hour' invoked only on hard, low-confidence cases, not on every request—capture its verdicts as training data so a cheap CPU model progressively absorbs the load and inference cost falls at steady state. For any self-improving or auto-retraining pipeline, add an eval-gated promotion mechanism with (a) a per-class regression ratchet on business-critical labels and (b) a frozen, held-out golden set never used for training, since a candidate that improves aggregate accuracy can silently regress the class that matters. Make domains data (declarative bundles) rather than code to eliminate labeling projects and enable multi-tenant onboarding. Use active learning to route only the least-confident rows to scarce human experts, so the corpus grows fastest where the model is weakest. The frozen-set + audit-trail + isolation design is what makes autonomous retraining acceptable to risk/compliance in regulated settings.

## Open Questions / Critiques
No empirical validation—claimed escalation rates, cost savings, and convergence behavior are illustrative rather than measured, so real-world accuracy and economics are unverified. Write-back trusts the judge above a confidence bar, so a systematically biased judge can teach the cheap model its bias, and a blind spot shared by both the judge and the frozen golden set would go undetected. The frozen set is only as good as its coverage: it cannot veto regressions on emerging sub-types it doesn't represent, which is a real risk under genuine distribution shift. It is text-only (OCR-derived), excluding layout/visual-dependent documents. Cold-start quality hinges entirely on human-authored bundle quality (anchor phrases, glossary, policy). Operational scaling is limited—training runs in-process unless queue mode is enabled, and multi-replica deployments need a shared artifact store/queue still on the roadmap.
