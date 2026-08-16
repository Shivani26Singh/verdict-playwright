# HTML Report Feature → Test Map

Where to see each analyzer dashboard capability in the generated `flaky-report/index.html`.

| Dashboard feature | Demonstrated by |
|-------------------|-----------------|
| **Stable Pass** | 42 passing tests across every module (e.g. `Authentication > signs in with email and password`) |
| **Stable Fail** | `Billing > generates the monthly invoice for an enterprise plan` and `Billing > loads the subscription summary card` |
| **Newly Failed** | `User Management > opens the invite dialog from the members toolbar`, `Authentication > lands on the workspace after the SSO callback` |
| **Fixed Tests** | `Analytics > reconciles funnel totals against the source dataset` (green again in the latest run) |
| **Flaky Tests** | `Billing > confirms a declined card after the customer re-enters CVC`, `Dashboard > updates the live metrics widget on each tick` |
| **Regression** | `Analytics > keeps cohort retention stable after a data backfill` (green mid-history, failing again now) |
| **Retry Timeline** | All 20 runs — retries per run rise on the flaky-heavy sprints, with a trend line over the bars |
| **Retry Statistics — recovers** | `Billing > confirms a declined card after the customer re-enters CVC` (fails first attempt, passes on retry) |
| **Retry Statistics — exhausted** | `Billing > generates the monthly invoice for an enterprise plan` (2 retries, all fail) |
| **Browser Comparison** | `Tasks > reorders a task via drag and drop` _(webkit only)_ and `Dashboard > formats the revenue tile as localized currency` _(firefox only)_ |
| **Failure Categories** | All 9 categories populated: timeout, locator, assertion, network, backend, authentication, environment, data, unknown |
| **Failure Frequency** | `Billing > loads the subscription summary card` (fails in every run — top of the list) |
| **Flaky Tests Trend** | Always on, no flag — flaky count per run across all 20 analyzed runs, aligned with Retries Per Run on the same axis |
| **Slowest Tests** | `Reports > delivers the PDF export within the 30s SLA`, `Reports > builds a report from the query editor` |
| **Evidence — Screenshots** | `Billing > confirms a declined card after the customer re-enters CVC`, `Reports > delivers the PDF export within the 30s SLA` |
| **Evidence — Videos** | `Billing > confirms a declined card after the customer re-enters CVC` |
| **Evidence — Trace Viewer links** | `Billing > confirms a declined card after the customer re-enters CVC`, `Reports > delivers the PDF export within the 30s SLA` |
| **Root Cause Analysis** | Every failing/flaky card — 20 distinct RC rules (see RULE_MAP.md) |
| **Suggested Fixes** | Each investigation lists 5 concrete, rule-specific checks |
| **Investigation Summary** | Header counts of regressions / flaky / newly-failed with the dominant root cause |
| **Search** | Type `billing` or `timeout` to filter the investigation list live |
| **Filter** | Filter chips: All / Regression / Flaky / New Failure |
| **Expand / Collapse** | Expand All / Collapse All, or click any investigation card header |
| **Evidence Preview** | Click a screenshot thumbnail on `Billing > confirms a declined card after the customer re-enters CVC` to open the inline preview |
