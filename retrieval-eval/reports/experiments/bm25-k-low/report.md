# Experiment: BM25 k=0.6

- Id: `bm25-k-low`
- Hypothesis: Faster term-frequency saturation so distinctive rare terms dominate less by repetition.

## Parameters

```json
{
  "similarityOptions": {
    "combineWith": "OR",
    "fuzzy": 0.1,
    "bm25": {
      "k": 0.6,
      "b": 0.7,
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
| P@5 | 52.0% |
| nDCG@10 | 49.0% |
| Recall@10 | 28.0% |
| MRR | 76.7% |
| MAP | 36.2% |

## Per topic

| Topic | P@5 | nDCG@10 | Recall@10 | MRR | Queries |
| --- | --- | --- | --- | --- | --- |
| climate | 31.4% | 25.0% | 17.0% | 49.3% | 14 |
| political-reform | 32.0% | 27.0% | 14.3% | 63.7% | 15 |
| church-state | 32.9% | 34.6% | 25.3% | 58.7% | 14 |
| ukraine | 37.1% | 35.3% | 25.3% | 61.6% | 14 |
| us-canada | 50.0% | 41.4% | 25.3% | 79.9% | 14 |
| guns | 54.0% | 48.3% | 22.4% | 78.8% | 20 |
| budget | 50.0% | 51.6% | 25.5% | 80.4% | 20 |
| space | 57.0% | 52.5% | 25.0% | 81.7% | 20 |
| iran | 60.0% | 56.9% | 26.6% | 92.5% | 20 |
| processed-foods | 60.0% | 57.7% | 40.7% | 89.3% | 14 |
| healthcare | 62.0% | 59.4% | 30.8% | 73.7% | 20 |
| world-cup | 86.7% | 86.7% | 60.5% | 100.0% | 15 |

## Worst 10 queries by nDCG@10

| Query id | Topic | nDCG@10 | P@5 | Statement |
| --- | --- | --- | --- | --- |
| 28 | guns | 0.0000 | 0.0000 | Concealed carry rules should balance personal defense with public safety in crowded spaces. |
| 96 | budget | 0.0000 | 0.0000 | Entitlement reform should protect current retirees and avoid pushing seniors into poverty. |
| 138 | ukraine | 0.0000 | 0.0000 | Ukraine's civilian infrastructure needs air defense, repair funding, and international protection. |
| 163 | political-reform | 0.0000 | 0.0000 | Term limits for committee leadership could reduce entrenched power without discarding experienced lawmakers. |
| 168 | political-reform | 0.0000 | 0.0000 | Public financing of campaigns could help ordinary citizens compete with wealthy donors. |
| 169 | political-reform | 0.0000 | 0.0000 | The Electoral College should be reformed or replaced so every presidential vote carries equal weight. |
| 175 | us-canada | 0.0000 | 0.0000 | The Great Lakes require joint protection because their water, ecosystems, and economies are shared. |
| 10 | healthcare | 0.0663 | 0.0000 | Healthcare should be treated as public infrastructure, like roads, schools, and clean water. |
| 146 | church-state | 0.0663 | 0.0000 | Taxpayer money should not fund programs that discriminate on the basis of religion. |
| 161 | political-reform | 0.0663 | 0.0000 | Congress should ban stock trading by members and strengthen conflict-of-interest rules. |
