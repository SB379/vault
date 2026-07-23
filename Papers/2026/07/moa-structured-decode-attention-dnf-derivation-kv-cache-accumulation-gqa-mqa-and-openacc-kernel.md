---
arxiv_id: "2607.19456"
title: "MoA-Structured Decode Attention DNF Derivation, KV-Cache Accumulation, GQA/MQA, and OpenACC Kernel"
authors: ["Lenore Mulin", "Gaetan Hains"]
categories: [cs.LG, cs.AI]
published: 2026-07-21
score: 9
url: https://arxiv.org/abs/2607.19456
tags: [paper]
---

# MoA-Structured Decode Attention DNF Derivation, KV-Cache Accumulation, GQA/MQA, and OpenACC Kernel

## TL;DR
This paper applies the Mathematics of Arrays (MoA) formalism to autoregressive transformer decode attention, algebraically proving four memory-optimal inference artifacts (decode DNF, GPU kernel, KV-cache append, GQA/MQA) that eliminate the K-transpose buffer and n×n score matrix before any code is written. The claimed value is provable minimal DRAM traffic (via a Storage Theorem) rather than empirically-tuned kernels like FlashAttention, with correctness verified against PyTorch's scaled_dot_product_attention.

## Abstract
> We derive four memory-optimal inference artifacts for transformer attention using the Mathematics of Arrays (MoA), each following directly from the forward-pass Denotational Normal Form (DNF) of with the query-row index fixed to the current decode step. The artifacts are: (1)~a single-query decode DNF in which the $ψ$-reduction eliminates the $K^\top$ buffer algebraically, achieving $(d_k + nd_k+ nd_v+ d_v)\times4\,{B}$ Dynamic Random Access Memory (DRAM) traffic result numerically verified to $\|{err}\|_\leq2\times10^{-7}$; (2)~a C/OpenACC Graphics Processing Unit (GPU) kernel with Operational Normal Form (ONF) stride arithmetic and hardware-coalesced memory access, verified to $\|\mathrm{err}\|_\infty=0$ (exact IEEE-754 floating-point arithmetic); (3)~a multi-step KV-cache with $O(d_k+d_v)$ per-step append via MoA concatenation $\#$; and (4)~Grouped-Query Attention (GQA) and Multi-Query Attention (MQA) derived via $ψ$-selection, achieving a proven $\frac {h_q} { h_{kv} }$ reduction in KV traffic. All programs are verified against PyTorch scaled_dot_product_attention.

## Key Topics
- [[Serving & Inference]]
- [[Context Management]]

## Highlights
- The decode DNF eliminates the K-transpose buffer algebraically: instead of q @ K.T, the psi-reduction reads K row-by-row in natural row-major layout (equivalent to scale*(K@q)), achieving proven traffic of (d_k + n*d_k + n*d_v + d_v)*4 bytes.
- Python MoA decode verified against PyTorch SDPA with max error <= 2e-7 (float32 round-off only); the C/OpenACC kernel matches the sequential reference exactly (||err||_inf = 0) due to identical IEEE-754 operation order.
- KV-cache append via MoA concatenation (#) writes one row at a precomputed gamma offset with O(d_k + d_v) per-step traffic, constant in t, avoiding torch.cat's full-cache copy. At T=1024 the MoA total (~270 MB) is 5.3x less than the n^2 score-matrix cost (1434 MB).
- GQA/MQA via psi-selection maps each query head to its KV slab without materializing the repeat_interleave broadcast, giving an exact h_q/h_kv traffic reduction; MQA (h_kv=1) cuts KV traffic 32x (16.78 MB to 0.52 MB) at h_q=32.
- GPU coalescing is framed as a gamma-difference criterion: adjacent vector threads must have gamma difference = 1; naive layout gives difference d_v=64 (256 bytes apart, breaking coalescing), fixed by hoisting the d-loop as the inner vectorized axis so Pi_v=d_v.
- The paper positions itself against FlashAttention, claiming similar traffic via tiling but 'no algebraic proof' — MoA's claim is 'proven before code,' with the same DNF portable to CPU/GPU/FPGA without re-derivation.
- Reported energy framing: ~14,700 kWh/day per deployed model at n=4096, L=96, 10^9 requests/day, arguing MoA minimizes every byte transferred.

## Method
Starting from standard attention A=softmax(QK^T/sqrt(d_k)), the authors apply MoA primitives (psi-selection, rho for shape, gamma for linear offset, Omega inner products, # concatenation). The core move is fixing the query-row index i' to the current decode step, collapsing Q to a single rank-1 vector q so the psi-reduction over query rows disappears. The score step becomes s = scale*(q (+.x Omega<1,2>) K), which reads K row-by-row so K^T is never materialized; softmax operates on the rank-1 score vector s (no n×n Jacobian, all O(n) on-stack); the weighted sum reads V once in row-major order. The Operational Normal Form (ONF) fixes memory layout via gamma stride arithmetic (K offset = l*d_k+j, V offset = l*d_v+d) that appear verbatim as C array indices. For the GPU kernel, dimension-lifting maps flat index spaces to gang/vector/register hierarchies and proves coalescing via the gamma-difference=1 criterion, annotated with OpenACC pragmas (parallel loop gang, loop vector, atomic for the weighted-sum accumulation). KV-cache append uses # concatenation writing at precomputed gamma offsets into a pre-allocated buffer. GQA/MQA uses partial-index psi-selection <g_kv> psi K to grab a whole KV slab (g_kv = floor(g*h_kv/h_q)). All artifacts are claimed to follow from the Storage Theorem 2.7 of a companion paper, which asserts minimal DRAM traffic.

## Evals & Results
Verification is correctness-only against PyTorch scaled_dot_product_attention (SDPA) as ground truth, not throughput/latency benchmarking. Decode: max error 1.79e-7 to 2.98e-8 across n=4 to 4096 (d_k=d_v=64, float32). C/OpenACC kernel: ||err||_inf = 0 (exact IEEE-754 match to sequential reference) on CPU; memory reported as 2.10 MB (MoA) vs 67.11 MB (n^2) at n=4096, a 32x reduction. Multi-step KV-cache: errors ~1.19e-7 to 5.96e-7 for T up to 64; traffic table shows MoA total beating n^2 cost for T>=256. GQA/MQA: errors <=1.79e-7 across MHA/GQA/MQA configs; KV traffic tables show the exact h_q/h_kv reduction (up to 32x for MQA at h_q=32). No wall-clock speedup, no GPU execution numbers (GPU compile commands given but only CPU verification shown), and no comparison against FlashAttention runtime.

## So What (for practitioners)
The concrete engineering insight is that decode attention should compute scale*(K@q) directly (reading K in its stored row-major layout) rather than q@K.T, avoiding an explicit transpose buffer — a pattern already implicit in optimized kernels but here justified formally. The KV-cache should pre-allocate to max_len and write each new row at offset t*d_k without concatenating/copying (avoiding torch.cat's O(t) copy). GQA/MQA should use index-slicing of KV slabs rather than repeat_interleave to avoid materializing the broadcast, saving h_q/h_kv KV bandwidth. The GPU coalescing rule (make the inner vectorized axis the contiguous feature dimension so adjacent threads stride by 1) is a practical layout guideline. Overall the paper is a formal/theoretical framing of optimizations that production inference stacks (FlashAttention, PagedAttention) already exploit; the differentiator claimed is provability and architecture-portability of the derivation.

## Open Questions / Critiques
Be skeptical: there are no performance benchmarks (no latency, throughput, or actual GPU runs — only CPU correctness and analytic byte counts), so the practical advantage over FlashAttention/Flash-Decoding is unquantified. The energy figures (40/80 kWh per training run, 14,700 kWh/day) are back-of-envelope estimates, not measured. The 'proven minimal before code' claim rests entirely on the companion paper's Storage Theorem 2.7, which is not reproduced or scrutinized here. The methods described (avoiding transpose, avoiding cache copies, slab-slicing GQA, coalesced layouts) are already standard practice in optimized inference libraries, so the novelty is the algebraic formalism rather than new capability. The atomic-based Pass-3 accumulation in the OpenACC kernel may be a performance bottleneck in practice, and the paper claims O(n)^2 unavoidable growth but does not address windowed/sparse attention. Verification uses small n and T (T<=64 for KV-cache), and the paper is dated 2026 with speculative hardware targets (B200, MI300X, Aurora).
