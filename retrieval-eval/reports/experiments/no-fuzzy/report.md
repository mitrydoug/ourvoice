# Experiment: Fuzzy off

- Id: `no-fuzzy`
- Hypothesis: Fuzzy 0.1 causes stem collisions (e.g. 'spaces'->'space') that pull in off-topic hits. Turning it off should raise precision.

## Parameters

```json
{
  "similarityOptions": {
    "combineWith": "OR",
    "fuzzy": 0
  },
  "extraStopWords": [],
  "minTermLength": 2
}
```

## Overall

| Metric | Value |
| --- | --- |
| P@5 | 51.0% |
| nDCG@10 | 48.1% |
| Recall@10 | 27.6% |
| MRR | 76.0% |
| MAP | 34.9% |

## Per topic

| Topic | P@5 | nDCG@10 | Recall@10 | MRR | Queries |
| --- | --- | --- | --- | --- | --- |
| climate | 31.4% | 25.6% | 17.6% | 49.5% | 14 |
| political-reform | 32.0% | 27.1% | 14.8% | 63.1% | 15 |
| ukraine | 38.6% | 35.8% | 25.8% | 61.9% | 14 |
| church-state | 35.7% | 36.2% | 26.9% | 59.5% | 14 |
| us-canada | 50.0% | 41.5% | 25.3% | 79.6% | 14 |
| guns | 51.0% | 47.5% | 22.1% | 79.1% | 20 |
| budget | 43.0% | 47.7% | 24.5% | 76.4% | 20 |
| space | 57.0% | 51.4% | 24.7% | 77.7% | 20 |
| processed-foods | 55.7% | 52.1% | 35.2% | 89.3% | 14 |
| iran | 61.0% | 57.4% | 26.8% | 92.5% | 20 |
| healthcare | 61.0% | 58.0% | 29.7% | 73.7% | 20 |
| world-cup | 86.7% | 86.7% | 60.5% | 100.0% | 15 |

## Worst 10 queries by nDCG@10

| Query id | Topic | nDCG@10 | P@5 | Statement |
| --- | --- | --- | --- | --- |
| 28 | guns | 0.0000 | 0.0000 | Concealed carry rules should balance personal defense with public safety in crowded spaces. |
| 77 | space | 0.0000 | 0.0000 | The United States should invest in reusable rockets, deep-space communication, and resilient satellite systems. |
| 96 | budget | 0.0000 | 0.0000 | Entitlement reform should protect current retirees and avoid pushing seniors into poverty. |
| 138 | ukraine | 0.0000 | 0.0000 | Ukraine's civilian infrastructure needs air defense, repair funding, and international protection. |
| 163 | political-reform | 0.0000 | 0.0000 | Term limits for committee leadership could reduce entrenched power without discarding experienced lawmakers. |
| 168 | political-reform | 0.0000 | 0.0000 | Public financing of campaigns could help ordinary citizens compete with wealthy donors. |
| 169 | political-reform | 0.0000 | 0.0000 | The Electoral College should be reformed or replaced so every presidential vote carries equal weight. |
| 175 | us-canada | 0.0000 | 0.0000 | The Great Lakes require joint protection because their water, ecosystems, and economies are shared. |
| 10 | healthcare | 0.0663 | 0.0000 | Healthcare should be treated as public infrastructure, like roads, schools, and clean water. |
| 161 | political-reform | 0.0694 | 0.0000 | Congress should ban stock trading by members and strengthen conflict-of-interest rules. |
