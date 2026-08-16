# Meridian Demo — Presentation Script

A step-by-step walkthrough for demos, screen recordings, and conference talks. Each step says
what to open, what to point at, and what to say. Generate the report first:

```bash
npm run report        # writes flaky-report/index.html
```

Then open **`flaky-report/index.html`** and follow along. Total runtime ≈ 6–8 minutes.

Data context to mention up front: *"This is twenty nightly CI runs of a ~70-test suite across
Chromium, Firefox, and WebKit — about 231 executions per run."*

---

## Step 1 — Suite Summary (overall health)

**Open:** top of the page.
**Point at:** the health score (~62%) and the classification tiles — Passing, Passing on Retry,
Flaky, Newly Failing, Consistently Failing, Skipped.
**Say:** *"In one screen I know the suite's health and exactly how failures break down. This isn't
just pass/fail — the analyzer separates genuinely broken tests from flaky ones, catches tests that
just broke, and calls out ones that only pass because of a retry."*

## Step 2 — Retry Timeline (trend + flaky detection)

**Open:** the **Retry Timeline** section (Additional Metrics → Retries Per Run).
**Point at:** the twenty run bars, the trend line connecting them, and the retry counts.
**Say:** *"Each bar is a nightly run, and the line shows whether retries are trending up or down.
The analyzer looked across all twenty runs to decide what's flaky — a test that flips between pass
and fail over time, not one bad run. Retries that recovered show up here too, so you can see
instability the single-run report hides."*

## Step 3 — Browser Statistics (browser comparison)

**Open:** **Browser Statistics**.
**Point at:** the per-browser fail/flaky rates.
**Say:** *"Same tests, three engines. WebKit carries a failure the others don't —
`Tasks > reorders a task via drag and drop` is flaky only on WebKit — and
`Dashboard > formats the revenue tile as localized currency` fails only on Firefox because of
locale number formatting. Browser-specific bugs are obvious instead of buried."*

## Step 4 — Investigation & Root Cause Analysis

**Open:** the **Investigation** section (the heart of the tool).
**Point at:** any card — e.g. `Billing > confirms a declined card after the customer re-enters CVC`.
**Say:** *"For every failing or flaky test the analyzer names the likely root cause, gives a
confidence score, and lists concrete next steps — no guessing. This one is a **click timeout**
(RC-009): the confirm button stayed disabled, so the fix suggestions talk about waiting for the
element to become enabled."*
**Then:** scroll a few cards and call out the variety of root causes — a backend **500** on
`Billing > generates the monthly invoice for an enterprise plan`, a **strict-mode violation** on
`Projects > opens the editor for a single selected row`, a **race condition** on
`Dashboard > updates the live metrics widget on each tick`.
**Say:** *"All 20 built-in rules (RC-001 … RC-020) are represented here — see `docs/RULE_MAP.md`."*

## Step 5 — Suggested Fixes

**Open:** expand one investigation card.
**Point at:** the **Suggested Checks / Fixes** list.
**Say:** *"Each root cause comes with five specific, actionable checks written for that failure
type — not generic advice. A network drop suggests different things than an assertion mismatch."*

## Step 6 — Evidence (screenshots, traces, videos)

**Open:** a card with evidence, e.g. `Billing > confirms a declined card…` or
`Analytics > keeps the realtime metrics stream connected`.
**Point at:** the screenshot thumbnail, **Open Trace**, and **Open Video** buttons.
**Do:** click the screenshot thumbnail to open the inline preview; click it again (or the overlay)
to close it.
**Say:** *"Evidence is attached right to the failure. Screenshots preview inline; the trace opens in
Playwright's trace viewer; the video plays the run. Everything an engineer needs to debug is one
click away, no digging through CI artifacts."*

## Step 7 — Search

**Open:** the search box in the investigation toolbar.
**Do:** type `billing`, then `timeout`.
**Say:** *"Live search across test names, errors, and root causes — great for large suites when you
want just the payment failures or every timeout."*

## Step 8 — Filter

**Point at:** the filter chips — **All / Consistently Failing / Newly Failing / Flaky**.
**Do:** click **Flaky**, then **Newly Failing**, then **All**.
**Say:** *"Triage by classification. Flaky when you're stabilizing; Newly Failing when you're
chasing what a release just broke — that bucket also catches a test that was fixed and broke
again, which is exactly what happened to the cohort-retention test we'll see in a minute."*

## Step 9 — Expand All / Collapse All

**Do:** click **Expand All**, then **Collapse All**; then expand a single card.
**Say:** *"Skim everything at once, or focus on one test. Keyboard-accessible too."*

## Step 10 — Failure Categories

**Open:** **Failure Categories** (Advanced Metrics).
**Point at:** the nine categories with counts.
**Say:** *"The analyzer classifies every error — timeout, locator, assertion, network, backend,
authentication, environment, data, and unknown. This tells a team where to invest: mostly backend
errors is an infrastructure conversation; mostly locator errors is a test-maintenance one."*

## Step 11 — Failure Frequency

**Open:** **Failure Frequency**.
**Point at:** the top entry, `Billing > loads the subscription summary card`.
**Say:** *"Ranked by how often each test fails across the history. The subscription card fails in
every run — that's the ledger service being down, flagged as **consistently broken, not flaky**
(RC-005). Fix that first."*

## Step 12 — Slowest Tests

**Open:** **Slowest Tests**.
**Point at:** `Reports > delivers the PDF export within the 30s SLA` and the query-editor report.
**Say:** *"Performance regressions hide here. The PDF export is bumping its 30-second SLA — worth
watching before it becomes a timeout failure."*

## Step 13 — Historical Insights (regression pattern / fixed / newly failing)

**Open:** the historical/narrative section.
**Point at:** `Analytics > keeps cohort retention stable after a data backfill` — was green,
broke, was fixed, then broke again — surfaced as **Newly Failing** with that "previously fixed"
context preserved in its reasons, not a separate bucket; a **fixed** test
(`Analytics > reconciles funnel totals…`, green again in the latest run); and a **newly failed**
test (`User Management > opens the invite dialog…`).
**Say:** *"Trend-awareness is the payoff: the analyzer knows a test was green, went red, or came
back — so you can tie failures to the change that caused them."*

## Step 14 — Investigation Summary (the closer)

**Open:** the Investigation summary header.
**Say:** *"To wrap up: from twenty raw CI runs the analyzer produced a triaged, explained, evidence-
backed picture of suite health — root causes, fixes, trends, and browser breakdowns — in a single
shareable HTML file. That's the difference between 'some tests failed' and 'here's what's broken,
why, and what to do about it.'"*

---

### Cheat sheet: one test per headline feature

| Feature | Point at |
|---|---|
| Click timeout | `Billing > confirms a declined card after the customer re-enters CVC` |
| Backend 500 | `Billing > generates the monthly invoice for an enterprise plan` |
| Network failure | `Notifications > reconnects the live feed after a socket drop` |
| Consistently broken | `Billing > loads the subscription summary card` |
| Race condition (flaky) | `Dashboard > updates the live metrics widget on each tick` |
| Regression pattern (shown as Newly Failing) | `Analytics > keeps cohort retention stable after a data backfill` |
| Browser-only failure | `Tasks > reorders a task via drag and drop` (WebKit) |
| Screenshot + trace + video | `Billing > confirms a declined card…` |

See `docs/FEATURE_MAP.md` and `docs/RULE_MAP.md` for the complete mapping.
