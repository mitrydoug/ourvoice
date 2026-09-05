# Search tuning — experiment comparison

- Generated: 2026-08-09T20:27:09.220Z
- Dataset: `/Users/mitchell/software/Symvolia/frontend/scripts/eval/datasets/topic-clusters`
- Baseline: `baseline` (production config)

Sorted by nDCG@10. Δ columns are absolute percentage-point changes vs baseline.

| Experiment | P@5 | nDCG@10 | ΔnDCG | Recall@10 | MRR | MAP | ΔMAP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BM25 b=1.0 (`bm25-b-high`) | 52.6% | 49.3% | +0.2 | 28.3% | 76.1% | 36.2% | +0.0 |
| Baseline (production) (`baseline`) | 52.3% | 49.1% | +0.0 | 28.1% | 76.6% | 36.2% | +0.0 |
| BM25 b=0.3 (`bm25-b-low`) | 52.1% | 49.0% | -0.2 | 28.0% | 76.7% | 36.2% | -0.0 |
| BM25 k=0.6 (`bm25-k-low`) | 52.0% | 49.0% | -0.2 | 28.0% | 76.7% | 36.2% | -0.0 |
| Fuzzy down-weighted (`fuzzy-weight-low`) | 52.1% | 48.9% | -0.2 | 28.0% | 76.1% | 36.1% | -0.1 |
| Expanded stop-words (`expanded-stopwords`) | 51.5% | 48.3% | -0.8 | 28.0% | 74.3% | 36.5% | +0.3 |
| Fuzzy off (`no-fuzzy`) | 51.0% | 48.1% | -1.0 | 27.6% | 76.0% | 34.9% | -1.4 |
| Fuzzy off + expanded stop-words (`no-fuzzy-stopwords`) | 49.9% | 47.0% | -2.1 | 27.2% | 73.3% | 34.9% | -1.4 |
| combineWith AND (no fuzzy) (`and-combine`) | 0.0% | 0.0% | -49.1 | 0.0% | 0.0% | 0.0% | -36.2 |
