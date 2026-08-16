# Investigation Rule → Test Map

Every one of the analyzer's 20 root-cause rules (RC-001 … RC-020) is exercised by at least one
real test in this suite. Verify with `npm run verify`.

| Rule | Root cause | Demonstrated by |
|------|------------|-----------------|
| **RC-001** | Generic / wait / navigation timeout | `Reports > delivers the PDF export within the 30s SLA`<br>`Dashboard > animates the KPI counters on first paint` |
| **RC-002** | Locator not found | `User Management > opens the invite dialog from the members toolbar`<br>`Administration > opens the date-range picker in the audit log` |
| **RC-003** | Assertion failure (toBe / toEqual / toBeCloseTo) | `Analytics > reconciles funnel totals against the source dataset`<br>`Analytics > keeps cohort retention stable after a data backfill` |
| **RC-004** | Network error (connection refused / DNS) | `Notifications > reconnects the live feed after a socket drop`<br>`Analytics > loads the third-party benchmark feed` |
| **RC-005** | Consistently failing — not flaky | `Billing > loads the subscription summary card`<br>`Settings > loads feature flags from the environment config` |
| **RC-006** | Race condition / rapid alternation | `Dashboard > updates the live metrics widget on each tick` |
| **RC-007** | Generic failure (no known pattern) | `Settings > persists the selected theme across a reload`<br>`Dashboard > renders the header when the profile payload is partial`<br>`Notifications > bulk-marks 500 notifications as read` |
| **RC-008** | Element not visible | `Projects > shows the archived banner after archiving a project`<br>`Reports > keeps the export toolbar pinned while scrolling` |
| **RC-009** | Click timeout (element not actionable) | `Billing > confirms a declined card after the customer re-enters CVC`<br>`Billing > completes checkout with a saved card` |
| **RC-010** | Element detached from the DOM | `Tasks > reorders a task via drag and drop` _(webkit only)_<br>`Tasks > expands a nested subtask row` |
| **RC-011** | Strict-mode violation (locator matched many) | `Projects > opens the editor for a single selected row` |
| **RC-012** | toHaveText mismatch | `Dashboard > formats the revenue tile as localized currency` _(firefox only)_ |
| **RC-013** | toHaveTitle mismatch | `Authentication > lands on the workspace after the SSO callback` |
| **RC-014** | net::ERR_ navigation / TLS failure | `Reports > streams the CSV export from the CDN edge`<br>`Reports > downloads the signed audit report over TLS` |
| **RC-015** | HTTP 401 Unauthorized (session/token) | `Authentication > keeps the session valid across two open tabs`<br>`Administration > exports the audit log as the workspace owner` |
| **RC-016** | HTTP 403 Forbidden (permission) | `User Management > blocks a non-admin from opening the admin console` |
| **RC-017** | HTTP 404 Not Found | `Projects > shows a friendly page for a deleted project deep link` |
| **RC-018** | HTTP 500 Internal Server Error (backend) | `Billing > generates the monthly invoice for an enterprise plan` |
| **RC-019** | ECONNRESET (dropped connection) | `Analytics > keeps the realtime metrics stream connected` |
| **RC-020** | Target / browser closed (crash / OOM) | `Reports > renders a 50k-row report without crashing the tab` |
