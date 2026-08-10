# Experiment: Expanded stop-words

- Id: `expanded-stopwords`
- Hypothesis: Drop neutral civic filler ('public', 'federal', 'United States', ...) so matches rest on topic-bearing words.

## Parameters

```json
{
  "similarityOptions": "default (combineWith: OR, fuzzy: 0.1)",
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
| P@5 | 51.5% |
| nDCG@10 | 48.3% |
| Recall@10 | 28.0% |
| MRR | 74.3% |
| MAP | 36.5% |

## Per topic

| Topic | P@5 | nDCG@10 | Recall@10 | MRR | Queries |
| --- | --- | --- | --- | --- | --- |
| political-reform | 29.3% | 25.6% | 13.3% | 59.5% | 15 |
| climate | 37.1% | 27.0% | 18.7% | 48.6% | 14 |
| budget | 35.0% | 30.6% | 12.6% | 70.6% | 20 |
| church-state | 35.7% | 35.9% | 28.0% | 53.6% | 14 |
| us-canada | 31.4% | 36.5% | 25.3% | 68.2% | 14 |
| ukraine | 40.0% | 37.6% | 27.5% | 61.9% | 14 |
| guns | 56.0% | 51.9% | 23.9% | 85.1% | 20 |
| iran | 62.0% | 57.0% | 27.4% | 84.2% | 20 |
| space | 61.0% | 57.6% | 27.6% | 85.0% | 20 |
| processed-foods | 61.4% | 59.9% | 42.9% | 87.5% | 14 |
| healthcare | 68.0% | 63.1% | 32.9% | 74.9% | 20 |
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
