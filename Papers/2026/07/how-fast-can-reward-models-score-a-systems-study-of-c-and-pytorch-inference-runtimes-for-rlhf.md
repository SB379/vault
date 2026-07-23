---
arxiv_id: "2607.19712"
title: "How Fast Can Reward Models Score? A Systems Study of C++ and PyTorch Inference Runtimes for RLHF"
authors: ["Venkata Naga Sai Vishnu Rohit Pulipaka", "Anish Katta", "Deva Rohit Reddy Peddireddy"]
categories: [cs.LG]
published: 2026-07-22
score: 9
url: https://arxiv.org/abs/2607.19712
tags: [paper]
---

# How Fast Can Reward Models Score? A Systems Study of C++ and PyTorch Inference Runtimes for RLHF

## TL;DR
A systems study benchmarking reward-model inference for RLHF, comparing a custom C++ ONNX Runtime engine against PyTorch eager, torch.compile, and FastAPI. On CPU the ONNX-based engine wins decisively (1.7-1.9x), but the speedup comes from ONNX Runtime (graph execution) not C++ itself; on GPU torch.compile actually beats the C++ engine at both median and p95. Batching strategy (length-bucketing vs naive padding) matters more than runtime choice, and it only helps on GPU.

## Abstract
> In RLHF pipelines, reward scoring blocks policy updates. Slow scoring bottlenecks the entire loop, since no update runs until every rollout gets a score. And yet most setups just default to PyTorch eager mode or torch.compile, no one checks if that's actually fastest. Scoring itself is small. Rollout generation eats far more of a typical RLHF step. But scoring and generation fight over the same CPU and GPU resources, so a faster scoring engine doesn't shrink step time on its own. It mainly frees up capacity generation can use instead. We built a native C++ inference engine on ONNX Runtime. First step: confirm correctness. Output matched the PyTorch reference to 5.7 x 10^-6 on CPU and 4.2 x 10^-3 on GPU, close enough to trust. Then we tested it against PyTorch eager mode, torch.compile, and FastAPI, on both CPU and GPU. CPU was decisive. Our engine beat every baseline, confidence intervals didn't even overlap. GPU gave a different view: we beat PyTorch and FastAPI, but torch.compile came out ahead. Further testing traced the speedup to ONNX Runtime itself, not C++ as a language. And batching strategy mattered more than either the language or the runtime choice, more than we expected. The results are from repeated, independent runs, since single runs just aren't reliable enough to trust.

## Key Topics
- [[Reward Models]]
- [[Reinforcement Learning]]
- [[Serving & Inference]]
- [[Benchmarks]]

## Highlights
- On CPU the C++ ONNX Runtime engine hit 335.9ms p50 vs 581.6-628.8ms for PyTorch baselines (1.7-1.9x faster), with non-overlapping confidence intervals.
- On GPU torch.compile won: 19.0ms p50 vs the C++ engine's 27.4ms, and the tail gap widened at p95 (25.6ms vs 116.2ms). Plain PyTorch eager (57.2ms) and FastAPI (62.8ms) both lost to the C++ engine.
- The CPU advantage came from ONNX Runtime, NOT C++: calling the identical ONNX session from Python cost ~349ms, statistically tied with the C++ engine's 335.9ms. Native C++ tokenization was 3.8x faster (64.3us vs 245.8us) but negligible next to the forward pass.
- Naive batch padding actively hurt throughput: 5-8x worse on CPU and 3.5-4x worse on GPU vs batch=1. Length-aware bucketing recovered the loss ONLY on GPU (~35% gain over batch=1); on CPU bucketed throughput never beat the batch=1 baseline because ONNX Runtime's CPU backend serializes the batch dimension.
- Concurrency did not scale: a shared engine instance serialized requests (only ~11% throughput gain from concurrency 2 to 8), and giving each request its own instance was worse, dropping to ~40% of shared on CPU and OOM-ing on the 6GiB GPU at concurrency 8 (real ceiling ~4-5 sessions).
- Zero-copy tensor construction and buffer preallocation showed no measurable effect once tested with repeated runs; an early apparent 10% win was just run-to-run noise.
- Reward scoring is likely a minor slice of RLHF step time (external estimates put generation at ~85% of step time), so these are component-level optimizations, not guaranteed wall-clock training wins.

## Method
Built a native C++ inference engine on ONNX Runtime 1.26.0 handling tokenization, batching, and postprocessing, running exported ONNX graphs (no PyTorch at inference). Tested two BERT-family encoder reward models: OpenAssistant DeBERTa-v3-large (SentencePiece) as primary and Electra-large-discriminator (WordPiece) as generalization check, with both tokenizers implemented natively in C++. First validated numerical parity (max abs diff 5.7e-6 CPU, 4.2e-3 GPU from CUDA fp32 accumulation order). Baselines: HF Transformers eager mode, torch.compile (default inductor), and a FastAPI HTTP service. All runs in fp32 on one machine (AMD Ryzen 7 5800H CPU, RTX 3060 Laptop 6GiB GPU). Methodology emphasized repeated independent process launches (5 on GPU, 3 on CPU) rather than internal trials, reporting mean and 95% CI of per-launch p50/p95 summary statistics; a result only counts if CIs don't overlap. Data: 60 rows from Anthropic hh-rlhf (fixed seed), validated against two alternate seeds and an independent 150-row set. Batching sweeps compared naive padding vs length-bucketing at batch sizes 1/2/4/8; concurrency sweeps compared shared vs multi-instance at levels 2/4/8. Welch's t-tests supplemented the CI analysis.

## Evals & Results
Benchmarks used latency (p50/p95) and throughput (rows/sec) on hh-rlhf prompts/responses. Baselines were HF eager, torch.compile, FastAPI, and Python-called ONNX Runtime. CPU: C++ engine 335.9ms beat all baselines with non-overlapping CIs and Welch p<.001. GPU: torch.compile beat the C++ engine at median (19.0 vs 27.4ms) and p95 (25.6 vs 116.2ms), both p<.001; the C++ engine still beat eager and FastAPI. Batching results (Tables 4-5) showed naive padding degrading throughput and bucketing helping only on GPU. Concurrency (Tables 6-7) showed flat scaling for shared instances and degradation/OOM for multi-instance. Findings reproduced on Electra and a 150-row dataset. One row (DeBERTa vs Electra HF-eager ratio, originally claimed 4.7x vs 1.7x) failed to reproduce on rerun and was flagged as untrustworthy.

## So What (for practitioners)
If scoring reward models on CPU, you don't need to write C++, just export to ONNX and serve via Python ONNX Runtime to capture nearly all the speedup over PyTorch eager; the win is graph execution vs eager mode, not the language. On GPU, if you're already in PyTorch and can tolerate compile/recompile overhead, torch.compile may beat a dedicated ONNX engine at both median and tail. Never batch by arrival order with fixed padding, it silently costs 5-8x throughput on CPU and 3.5-4x on GPU; sort/bucket by length instead, but know batching only pays off on GPU (CPU backends lack batch parallelism). Do not scale throughput by adding worker threads or per-request engine instances on constrained hardware; shared instances serialize and multi-instance can OOM your GPU. Most importantly: benchmark with repeated independent process launches and report confidence intervals, since single runs regularly crown the wrong winner (they saw torch.compile beating C++, naive batching harming, and zero-copy 'wins' vanishing only because of this discipline).

## Open Questions / Critiques
All results come from a single machine (one consumer CPU, one 6GiB laptop GPU) in fp32 only, so CPU/GPU dynamics and the torch.compile outcome may not hold on server-class hardware or with mixed precision. torch.compile's recompilation risk on out-of-distribution input shapes was never exercised, a rollout hitting an uncached length could trigger a large latency spike the study doesn't capture. Only two similar-sized BERT-family encoder reward models were tested; larger or differently-architected reward models may behave differently. Multi-instance was tested only as threads in one process, not separate OS processes. The GPU OOM ceiling was pinned with non-repeated single runs. Critically, the study never measures reward scoring's actual share of an end-to-end RLHF step (external estimates suggest generation dominates), so optimizing this component may not move training wall-clock. One generalization result (Electra vs DeBERTa eager ratio) explicitly failed to reproduce and is untrustworthy.
