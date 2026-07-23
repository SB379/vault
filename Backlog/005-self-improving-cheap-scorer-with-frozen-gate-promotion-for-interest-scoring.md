---
title: "Self-improving cheap scorer with frozen-gate promotion for interest scoring"
status: proposed
source: ideas:2026-07-22
created: 2026-07-23
---

Replace the pure-LLM interest scoring with a cascade: a cheap CPU classifier (e.g. SPLADE + LightGBM) scores most papers, escalating only low-confidence borderline papers to the Opus/LLM judge. Write LLM verdicts back as labeled training rows, retrain the cheap model on a schedule, and gate any promotion behind (a) a per-slice regression check on your highest-interest categories and (b) a frozen golden set of hand-picked papers the model is never trained on.

*Why:* SIFT demonstrates this teacher/student cascade drives marginal labeling cost toward zero while the frozen-gate + golden-set design makes autonomous retraining safe against silently regressing the categories you care most about — matching this pipeline's daily scoring against a personal interest profile.
