# Hybrid search PoC — comparison

- Generated: 2026-08-09T21:31:11.997Z
- Dataset: `/Users/mitchell/software/Symvolia/frontend/scripts/eval/datasets/topic-clusters`
- Embedding model: `Xenova/all-MiniLM-L6-v2`
- Retrieval limit: 100
- Queries scored: 200

| Engine | P@5 | nDCG@10 | Recall@10 | MRR | MAP |
| --- | --- | --- | --- | --- | --- |
| MiniSearch (lexical) | 52.3% | 49.1% | 28.1% | 76.6% | 36.2% |
| Orama hybrid (0.5/0.5) | 84.1% | 81.0% | 49.2% | 94.9% | 72.9% |

Δ vs MiniSearch: nDCG@10 +31.8 pts, MRR +18.2 pts.
