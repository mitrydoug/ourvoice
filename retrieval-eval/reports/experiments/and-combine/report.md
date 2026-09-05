# Experiment: combineWith AND (no fuzzy)

- Id: `and-combine`
- Hypothesis: Require every query term. Expect much higher precision but lower recall — a reference extreme.

## Parameters

```json
{
  "similarityOptions": {
    "combineWith": "AND",
    "fuzzy": 0
  },
  "extraStopWords": [],
  "minTermLength": 2
}
```

## Overall

| Metric | Value |
| --- | --- |
| P@5 | 0.0% |
| nDCG@10 | 0.0% |
| Recall@10 | 0.0% |
| MRR | 0.0% |
| MAP | 0.0% |

## Per topic

| Topic | P@5 | nDCG@10 | Recall@10 | MRR | Queries |
| --- | --- | --- | --- | --- | --- |
| healthcare | 0.0% | 0.0% | 0.0% | 0.0% | 20 |
| guns | 0.0% | 0.0% | 0.0% | 0.0% | 20 |
| iran | 0.0% | 0.0% | 0.0% | 0.0% | 20 |
| space | 0.0% | 0.0% | 0.0% | 0.0% | 20 |
| budget | 0.0% | 0.0% | 0.0% | 0.0% | 20 |
| processed-foods | 0.0% | 0.0% | 0.0% | 0.0% | 14 |
| climate | 0.0% | 0.0% | 0.0% | 0.0% | 14 |
| ukraine | 0.0% | 0.0% | 0.0% | 0.0% | 14 |
| church-state | 0.0% | 0.0% | 0.0% | 0.0% | 14 |
| political-reform | 0.0% | 0.0% | 0.0% | 0.0% | 15 |
| us-canada | 0.0% | 0.0% | 0.0% | 0.0% | 14 |
| world-cup | 0.0% | 0.0% | 0.0% | 0.0% | 15 |

## Worst 10 queries by nDCG@10

| Query id | Topic | nDCG@10 | P@5 | Statement |
| --- | --- | --- | --- | --- |
| 0 | healthcare | 0.0000 | 0.0000 | Everyone should have access to affordable universal healthcare regardless of income or job status. |
| 1 | healthcare | 0.0000 | 0.0000 | Universal healthcare would give families more freedom to change jobs without losing medical coverage. |
| 2 | healthcare | 0.0000 | 0.0000 | A national healthcare system should guarantee basic care while still allowing private supplemental insurance. |
| 3 | healthcare | 0.0000 | 0.0000 | Universal healthcare is a moral obligation in a country with the resources to treat preventable illness. |
| 4 | healthcare | 0.0000 | 0.0000 | The United States should expand Medicare eligibility until every resident can access public health coverage. |
| 5 | healthcare | 0.0000 | 0.0000 | Healthcare reform should focus on lower drug prices, fewer billing surprises, and universal basic coverage. |
| 6 | healthcare | 0.0000 | 0.0000 | No person should delay cancer treatment, insulin, or emergency care because they cannot afford a bill. |
| 7 | healthcare | 0.0000 | 0.0000 | Universal healthcare would strengthen small businesses by removing health insurance from payroll negotiations. |
| 8 | healthcare | 0.0000 | 0.0000 | A public option is a practical path toward universal healthcare without eliminating every private plan. |
| 9 | healthcare | 0.0000 | 0.0000 | Preventive care should be free at the point of service because early treatment saves lives and money. |
