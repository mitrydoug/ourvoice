# Experiment: BM25 b=1.0

- Id: `bm25-b-high`
- Hypothesis: Full length normalization; penalize long docs that share only common words.

## Parameters

```json
{
  "similarityOptions": {
    "combineWith": "OR",
    "fuzzy": 0.1,
    "bm25": {
      "k": 1.2,
      "b": 1,
      "d": 0.5
    }
  },
  "extraStopWords": [],
  "minTermLength": 2
}
```

## Overall

| Metric | Value |
| --- | --- |
| P@5 | 52.6% |
| nDCG@10 | 49.3% |
| Recall@10 | 28.3% |
| MRR | 76.1% |
| MAP | 36.2% |

## Per topic

| Topic | P@5 | nDCG@10 | Recall@10 | MRR | Queries |
| --- | --- | --- | --- | --- | --- |
| climate | 31.4% | 25.0% | 17.0% | 49.3% | 14 |
| political-reform | 32.0% | 28.2% | 15.7% | 63.4% | 15 |
| church-state | 32.9% | 35.9% | 26.4% | 59.1% | 14 |
| ukraine | 41.4% | 36.4% | 26.4% | 61.9% | 14 |
| us-canada | 50.0% | 41.0% | 25.3% | 78.7% | 14 |
| guns | 55.0% | 49.2% | 22.9% | 78.9% | 20 |
| budget | 50.0% | 51.6% | 25.5% | 80.4% | 20 |
| space | 59.0% | 52.4% | 25.0% | 78.8% | 20 |
| iran | 60.0% | 56.6% | 26.3% | 92.5% | 20 |
| processed-foods | 60.0% | 58.2% | 41.8% | 85.7% | 14 |
| healthcare | 62.0% | 59.5% | 30.8% | 73.7% | 20 |
| world-cup | 86.7% | 86.7% | 60.5% | 100.0% | 15 |

## Worst 10 queries by nDCG@10

| Query id | Topic | nDCG@10 | P@5 | Statement |
| --- | --- | --- | --- | --- |
| 28 | guns | 0.0000 | 0.0000 | Concealed carry rules should balance personal defense with public safety in crowded spaces. |
| 96 | budget | 0.0000 | 0.0000 | Entitlement reform should protect current retirees and avoid pushing seniors into poverty. |
| 138 | ukraine | 0.0000 | 0.0000 | Ukraine's civilian infrastructure needs air defense, repair funding, and international protection. |
| 168 | political-reform | 0.0000 | 0.0000 | Public financing of campaigns could help ordinary citizens compete with wealthy donors. |
| 169 | political-reform | 0.0000 | 0.0000 | The Electoral College should be reformed or replaced so every presidential vote carries equal weight. |
| 175 | us-canada | 0.0000 | 0.0000 | The Great Lakes require joint protection because their water, ecosystems, and economies are shared. |
| 163 | political-reform | 0.0636 | 0.0000 | Term limits for committee leadership could reduce entrenched power without discarding experienced lawmakers. |
| 10 | healthcare | 0.0663 | 0.0000 | Healthcare should be treated as public infrastructure, like roads, schools, and clean water. |
| 161 | political-reform | 0.0694 | 0.0000 | Congress should ban stock trading by members and strengthen conflict-of-interest rules. |
| 116 | climate | 0.0784 | 0.0000 | Clean energy investment can reduce emissions while creating durable jobs in every region. |
