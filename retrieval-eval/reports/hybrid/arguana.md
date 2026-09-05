# Hybrid search PoC — comparison

- Generated: 2026-08-09T21:46:03.433Z
- Dataset: `scripts/eval/datasets/arguana`
- Embedding model: `Xenova/all-MiniLM-L6-v2`
- Retrieval limit: 100
- Queries scored: 1401

| Engine | P@5 | nDCG@10 | Recall@10 | MRR | MAP |
| --- | --- | --- | --- | --- | --- |
| MiniSearch (lexical) | 8.1% | 33.3% | 56.4% | 27.6% | 27.6% |
| Orama hybrid (0.5/0.5) | 11.5% | 45.9% | 74.8% | 38.1% | 38.1% |

Δ vs MiniSearch: nDCG@10 +12.6 pts, MRR +10.5 pts.
