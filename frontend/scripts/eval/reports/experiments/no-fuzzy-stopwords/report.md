# Experiment: Fuzzy off + expanded stop-words

- Id: `no-fuzzy-stopwords`
- Hypothesis: Combine the two most promising single levers.

## Parameters

```json
{
  "similarityOptions": {
    "combineWith": "OR",
    "fuzzy": 0
  },
  "extraStopWords": [
    "public",
    "federal",
    "government",
    "national",
    "united",
    "states",
    "state",
    "america",
    "american",
    "americans",
    "people",
    "every",
    "country",
    "nation",
    "policy",
    "program",
    "programs",
    "system",
    "systems",
    "rules"
  ],
  "minTermLength": 2
}
```

## Overall

| Metric | Value |
| --- | --- |
| P@5 | 49.9% |
| nDCG@10 | 47.0% |
| Recall@10 | 27.2% |
| MRR | 73.3% |
| MAP | 34.9% |

## Per topic

| Topic | P@5 | nDCG@10 | Recall@10 | MRR | Queries |
| --- | --- | --- | --- | --- | --- |
| political-reform | 29.3% | 25.4% | 13.3% | 58.9% | 15 |
| budget | 28.0% | 26.2% | 10.3% | 70.6% | 20 |
| climate | 37.1% | 27.0% | 18.7% | 48.6% | 14 |
| church-state | 34.3% | 34.9% | 28.0% | 48.9% | 14 |
| us-canada | 31.4% | 36.7% | 25.3% | 67.9% | 14 |
| ukraine | 40.0% | 37.6% | 27.5% | 61.9% | 14 |
| guns | 52.0% | 50.5% | 23.7% | 82.3% | 20 |
| processed-foods | 57.1% | 52.9% | 36.3% | 87.5% | 14 |
| space | 62.0% | 56.2% | 27.4% | 81.7% | 20 |
| iran | 62.0% | 57.0% | 27.4% | 84.2% | 20 |
| healthcare | 66.0% | 62.6% | 32.6% | 74.9% | 20 |
| world-cup | 89.3% | 88.2% | 61.4% | 100.0% | 15 |

## Worst 10 queries by nDCG@10

| Query id | Topic | nDCG@10 | P@5 | Statement |
| --- | --- | --- | --- | --- |
| 10 | healthcare | 0.0000 | 0.0000 | Healthcare should be treated as public infrastructure, like roads, schools, and clean water. |
| 90 | budget | 0.0000 | 0.0000 | The federal budget should invest in children because early support saves money later. |
| 96 | budget | 0.0000 | 0.0000 | Entitlement reform should protect current retirees and avoid pushing seniors into poverty. |
| 118 | climate | 0.0000 | 0.0000 | Extreme heat should be treated as a public health emergency in city planning and labor rules. |
| 138 | ukraine | 0.0000 | 0.0000 | Ukraine's civilian infrastructure needs air defense, repair funding, and international protection. |
| 149 | church-state | 0.0000 | 0.0000 | Prayer should be voluntary and personal, not organized or pressured by public institutions. |
| 161 | political-reform | 0.0000 | 0.0000 | Congress should ban stock trading by members and strengthen conflict-of-interest rules. |
| 163 | political-reform | 0.0000 | 0.0000 | Term limits for committee leadership could reduce entrenched power without discarding experienced lawmakers. |
| 166 | political-reform | 0.0000 | 0.0000 | Ethics rules should apply to Supreme Court justices with the same seriousness expected elsewhere in government. |
| 168 | political-reform | 0.0000 | 0.0000 | Public financing of campaigns could help ordinary citizens compete with wealthy donors. |
