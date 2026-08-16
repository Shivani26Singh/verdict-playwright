# FEATURES.md — Detailed Feature Reference

Everything below describes functionality that exists and works in the current codebase today, verified directly against the source (not against intent or planned work). Where a formula or calculation is described, it's cited to the file that implements it. If you find a mismatch between this document and actual behavior, that's a documentation bug — please report it (see [CONTRIBUTING.md](./CONTRIBUTING.md)).

For a one-page overview, see [README.md](./README.md). For internal architecture and data flow, see [docs/architecture/ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md). For exact CLI flags and config keys, see [STEPS.md](./STEPS.md).

---

## How "Latest Run" vs "All Runs" works (read this first)

Several dashboard cards (Browser Statistics, Failure Categories) offer a **Latest Run / All Runs** toggle. This is not a historical trend and not a database — both modes are computed fresh, in memory, from the same set of report files loaded for this one `analyze` invocation (`src/analyzer/stats.js`):

- **Latest Run** — statistics computed from only the single most-recently-analyzed report (the last file in the window after `--lookback`/`analyzer.lookbackRuns` is applied). Shows what's failing/passing *right now*.
- **All Runs** — statistics computed across every report in the analyzed window. Shows the aggregate picture over that window.

Switching the toggle re-renders the card client-side from data already embedded in the report — no server, no re-analysis, no new file read.

**What constitutes a "run"** is one Playwright JSON report file (either this package's own reporter format or Playwright's native `json` reporter format). **What constitutes a "failure"** is a test whose final attempt in a run ended `failed`/`timedOut`/`unexpected` — a test that failed on attempt 1 but passed on retry is NOT a failure for that run (see [Retries and "Passing on Retry"](#retries-and-passing-on-retry) below).

---

## Suite Summary

**Purpose**
A single-glance rollup of the current analyzed window's test health, before drilling into anything else.

**What it shows**
Seven tiles: Total Tests, Passing, Passing on Retry, Flaky, Newly Failing, Consistently Failing, Skipped. Each (except Total) also shows a percentage of Total.

**Data source**
`result.summary` / dashboard JSON's `suiteSummary` object, built in `src/analyzer/engine.js`'s `buildSummary()` from the per-test classification results.

**Calculation**
Every test lands in exactly one bucket based on its classification across the analyzed runs (see [Classification](#how-a-test-is-classified) below): `stable_pass`, `stable_failure`, `flaky`, `newly_failed`, `fixed`, or (if its *latest* run was skipped) `skipped`. "Passing" on the tile = `stable_pass + fixed` count. "Passing on Retry" is a sub-count within Passing — see below. Percentages are each bucket's count divided by Total Tests.

**User interaction**
Collapsible section (click the header), expanded by default. Each tile has a hover tooltip explaining exactly what it counts. No sorting/filtering here — this is a summary, not a table.

**Example**
A window of 5 analyzed runs with 100 tests total might show: Total Tests 100, Passing 82 (82%), Passing on Retry 6 (6%), Flaky 5 (5%), Newly Failing 8 (8%), Consistently Failing 5 (5%), Skipped 0 (0%). 82 + 5 + 8 + 5 + 0 = 100 — every test counted exactly once.

**Limitations**
"Passing on Retry" reflects the *latest* run only, not a pattern across the whole window (see the Flaky/Retries sections below for why).

---

## Flaky Tests Trend

**Purpose**
Answer "is the flaky-test count going up or down?" without manually comparing report files.

**What it shows**
One bar per analyzed run (in run order, oldest → newest), showing that run's flaky-test count, with a connected line across the bars and a plain-language sentence comparing the first and last run.

**Data source**
`retryTimeline[]` in the dashboard JSON — built once in `src/reporter/dashboard-json.js` from `statistics.perRun[]` (see [`src/analyzer/stats.js`](./src/analyzer/stats.js)). Each entry is `{ run, flaky, retries, durationMs, failed }`.

**Calculation**
Each bar's value is that specific run's own flaky count (`perRun[i].flaky` — Playwright's own within-run flaky signal: a test that failed on one attempt and passed on a later attempt *within that run*, distinct from the classifier's cross-run flaky classification used in Suite Summary). The interpretation sentence compares only the first and last bar: a difference of less than 1 is reported as "remained relatively stable"; otherwise "increased/decreased from X to Y across the N analyzed runs."

**User interaction**
Static chart — no toggle, no filter. It's one of the first two sections in the report (directly below Suite Summary), always visible, no flag required to see it.

**Example**
`"Flaky tests increased from 4 to 28 across the 20 analyzed runs."`

**Limitations**
Scoped strictly to the runs loaded by *this* `analyze` invocation (governed by `--lookback`/`analyzer.lookbackRuns`, default 10). This does **not** persist or accumulate across separate `analyze` invocations or CI builds — an earlier cross-invocation history-file design was built and deliberately removed (see [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md#local-flaky-tests-trend-cross-invocation-file----tried-then-reversed)) because it introduced a second data source that could drift out of sync with what was actually being analyzed. If you re-run `analyze` against the exact same files, you'll see the exact same trend — it is not a running log.

---

## Retries Per Run Trend

**Purpose**
Show whether the suite is needing more or fewer retries over time, and let you visually compare that against the Flaky Tests Trend directly above it.

**What it shows**
One bar per analyzed run showing how many retries happened in that run, a connected trend line, and a takeaway sentence.

**Data source**
The same `retryTimeline[]` array as Flaky Tests Trend (`perRun[i].totalRetries`) — both charts read one array, so they always show the same runs in the same order.

**Calculation**
A bar turns yellow if that run had any retries, grey otherwise. The takeaway sentence needs at least 4 runs to compute: it compares the average retry count in the first half of the window against the second half. A difference under 0.4 is reported as "stayed roughly flat"; otherwise "trending up"/"trending down" with the two averages shown. With fewer than 4 runs: "Need at least 4 runs to judge a trend reliably."

**User interaction**
Static chart, no toggle/filter. Directly below Flaky Tests Trend, same Run 1...N axis.

**Example**
`"▲ Retries are trending up (avg 1.2 → 3.4 per run) — the suite looks like it's getting flakier over time."`

**Limitations**
Same run-window scope as Flaky Tests Trend — no cross-invocation history.

---

## Run Highlights

**Purpose**
A narrative, plain-English summary of the analyzed window, for someone who wants the story in one paragraph rather than reading every chart.

**What it shows**
A capped list of bullet points (at most 9) covering: total tracked tests, the latest run's pass/fail breakdown, flaky and newly-failing counts (with a note if 70%+ of flaky tests share an identical history pattern — flagging a likely shared incident rather than many independent flaky tests), the most common failure category, where retries are concentrated (not just a flat average), a browser-specific note if one browser is notably worse, the slowest test, and the top root cause.

**Data source**
`runSummary[]` in the dashboard JSON, generated by `generateRunSummary()` in `src/reporter/dashboard-json.js` from the same statistics/classification data powering every other section — no new computation, just a narrative view of it.

**Calculation**
Each bullet has its own rule (e.g., the retry-concentration bullet names *which* run the retries clustered in, rather than an average that can hide an uneven distribution). See `src/reporter/dashboard-json.js` for the exact wording rules.

**User interaction**
Collapsible section, plain bulleted list — no toggle, no interactivity. Deliberately has no Latest Run/All Runs toggle since a "latest run" data point is already folded into the single list.

**Limitations**
Purely descriptive — it restates existing numbers in prose, it doesn't compute anything new.

---

## Failed Tests (Investigation Cards)

**Purpose**
The main triage workspace: one detailed card per currently-failing or flaky test, with root cause, evidence, and enough context to decide what to do next without leaving the report.

**What it shows** — per card:
- A run-by-run **pass/fail history strip**: one tile per analyzed run, colored green (passed)/red (failed)/grey (other), oldest to newest, **with the run number printed directly on each tile** (not just in the hover tooltip — with 20+ same-colored tiles in a row, that matters). Hovering a tile also shows whether that run passed on the first attempt or after N retries.
- **Root Cause** — the plain-language likely cause from the deterministic rule engine (see [Failure Analysis](#failure-analysis-root-cause-rules) below).
- **"Why is this {classification}?"** — an expandable list of the specific reasons the classifier reached this test's classification.
- **Confidence** — only shown when it falls *below* a fixed 70% review threshold (a "Needs Review" flag), with a tooltip breaking down exactly how the percentage was reached. Confident diagnoses (the common case) show no percentage at all, to avoid noise.
- **Full Error** — the error message merged with any additional stack-trace call frames not already present in the message text, in a collapsible block (auto-expanded if ≤25 lines).
- **Suggested Checks** — a short list of things to verify, in an expandable block.
- **Evidence** — see the dedicated section below.

**Data source**
`investigations[]` in the dashboard JSON, built per-test in `src/reporter/dashboard-json.js` (`buildInvestigationEntry`) from the classification/statistics results plus the rule engine's output.

**User interaction**
- **Search box** — matches against the whole card's text (title, error, root cause, etc.), debounced, highlights matches with `<mark>`, auto-expands a card if the match is inside its collapsed body.
- **Filter chips** — `All`, `Consistently Failing`, `Newly Failing`, `Flaky` (each with a live count).
- **Expand All / Collapse All** buttons.
- Cards are collapsed by default; clicking a header expands it (and collapses whichever other card was open).

**Example**
A test classified `flaky` with a history of `passed, failed, passed, failed, passed` across 5 runs shows 5 numbered tiles (green/red/green/red/green), a root cause like "Element became detached from the DOM before the action completed," and (if confidence is 62%, below the 70% threshold) a confidence bar with a "Needs Review" badge.

**Limitations**
The rule engine is first-match: if a failure has two plausible causes, only the higher-priority rule's explanation is shown, not both.

---

## Evidence (screenshots, trace, video) and the Run Picker

**Purpose**
Let you see exactly what a test looked like when it failed — and, since a test can fail across many runs, choose *which* run's evidence to look at instead of only ever seeing one fixed run.

**What it shows**
Screenshot thumbnails (click to open a full-size lightbox), an "Open Screenshot" button, a "Download Trace" link (with instructions, since a `.zip` trace needs Playwright's Trace Viewer, not a browser tab), and an inline `<video>` player — whichever of these were actually captured for the selected run.

**Data source**
Evidence is captured **per run**, not aggregated: `src/analyzer/extractor.js`'s `extractEvidence()` scans only failed/timed-out attempts within a single run's data for screenshot/trace/video attachments. `src/analyzer/engine.js` keeps this as `evidenceByRun[]` (one entry per analyzed run, `null` where nothing was captured — which is normal for a run the test passed cleanly).

**Calculation / default selection**
The evidence shown by default is from the **most recent run that captured any** — found by scanning `evidenceByRun` backward from the newest run (`src/analyzer/engine.js`). This is deliberate: earlier versions of this feature picked whichever run's evidence was found *first* (the oldest), which meant investigating a still-failing test could show a screenshot from weeks ago. Older runs remain available via the picker.

**User interaction**
A `<select>` run picker appears **only when 2 or more analyzed runs captured evidence** for that test — listing only those runs (a run the test passed cleanly in was never going to have evidence, so it's not offered as an option). Picking a different run re-renders just the Evidence field's contents; the rest of the card is untouched.

**Example**
A test that failed in runs 3, 7, and 20 shows a picker with exactly those three options ("Run 3", "Run 7", "Run 20"), defaulting to "Run 20." Selecting "Run 3" swaps in that run's own screenshot/trace/video.

**Limitations**
Only runs that actually captured evidence appear in the picker — a run where the test passed on the first attempt never has evidence to show, by design (Playwright itself doesn't capture screenshots/traces for a clean pass under the typical `retain-on-failure` config). Whether evidence exists at all depends entirely on the *consuming* project's own Playwright config (`screenshot`/`trace`/`video` settings) — this tool only surfaces what Playwright already wrote.

---

## Passing on Retry — Details

**Purpose**
Surface tests that are *currently* green but only got there after burning a retry — a softer flakiness signal that a hard pass/fail count alone hides.

**What it shows**
The same investigation-card treatment as Failed Tests (history strip, root cause, evidence, etc.), but for the **first, failed** attempt that preceded the eventual pass in the latest run — labeled "Recovered on Retry."

**Data source**
`passingOnRetryTests[]`, built in `src/reporter/dashboard-json.js` (`buildPassingOnRetryInvestigations`) from tests whose overall classification is `stable_pass`/`fixed` **and** whose latest run needed ≥1 retry to pass.

**User interaction**
Section is hidden entirely if the list is empty; otherwise expanded by default, no search/filter toolbar (that's specific to Failed Tests).

**Limitations**
Reflects the **latest run only** — it does not track whether this "needed a retry" pattern is repeating run over run; it has no effect on the test's cross-run classification.

---

## Skipped Tests — Details

**Purpose**
Account for tests that didn't run at all in the latest run, without folding them into pass/fail counts.

**What it shows**
A plain table (Test / Browser / History) with a compact dot-strip per row summarizing that test's recent history.

**Data source**
`skippedTests[]` in the dashboard JSON — tests whose most recent run outcome is `skipped`.

**User interaction**
Collapsed by default; hidden entirely if the list is empty. No search/filter/sort — it's a small reference table, not a workspace.

**Limitations**
Counted in Total Tests but excluded from every pass/fail/flaky bucket, since a skipped test is neither.

---

## Additional Metrics

A collapsed-by-default section holding five reference cards. All five share the same compact header treatment (bold uppercase title, thin divider, no filled background) except Root Cause Summary, which keeps its own distinct warning-flagged red styling since it's specifically about failures needing attention.

### Root Cause Summary

**Purpose** A compact, scannable triage table — every failing test in one place, without expanding each card individually.

**What it shows** Test, Status (Fail/Flaky badge), Pattern, Category, Confidence (plain % or a `⚠` badge if below the 70% review threshold).

**Data source** Reuses the same already-computed `investigations[]` entries as the Failed Tests cards — so the confidence percentage here always matches that test's card exactly (an earlier version recomputed confidence independently and could disagree with the card).

**Limitations** No search/filter/sort of its own; it's a reference table, and it only lists tests already covered as investigation cards (failing/flaky ones).

### Browser Statistics

**Purpose** Find out if one browser project is disproportionately unreliable.

**What it shows** Per browser (chromium/firefox/webkit, or any custom Playwright project name): Executions, Failed, Fail %.

**Data source** `browserStatsLatest`/`browserStats` in the dashboard JSON, from `src/analyzer/stats.js`'s `computeBrowserStats()`.

**Calculation** Counts are **per distinct test, not per execution/attempt** — a test that failed on attempt 1 and passed on retry counts once, as a pass, for that run (its retries are tracked separately as a retry count, not folded into the fail-rate numerator or denominator). Fail % = Failed ÷ Executions × 100.

**User interaction** **Latest Run / All Runs** toggle (see the explanation at the top of this document) plus a small info icon explaining which mode is active.

**Example** `chromium: 1540 executions, 285 failed, 18.5% fail rate` (Latest Run scope).

**Limitations** "Executions" here means distinct tests run under that browser project in the relevant scope, not literal Playwright attempt count.

### Failure Categories

**Purpose** See what *kind* of failure is dominating — is it mostly timeouts, or mostly backend errors?

**What it shows** Category → Occurrence count, for: **timeout, locator, assertion, network, backend, authentication, environment, data, unknown**.

**Data source** `failureCategoriesLatest`/`failureCategories`, from `src/analyzer/failure-classifier.js`'s pattern-matching classifier.

**Calculation** Every individual error is classified by matching its message+stack text against a priority-ordered list of regex pattern groups; the lowest-priority-score matching group wins (locator and timeout patterns are checked first). Counts here are **error occurrences**, not distinct tests — a test that failed 5 times with the same category contributes 5 to that category's count. `unknown` is the fallback when nothing matches.

**User interaction** Same Latest Run / All Runs toggle as Browser Statistics.

**Limitations** Category boundaries are approximate pattern matching, not semantic analysis — an unusual error message can land in the wrong bucket (e.g., a locator error whose text happens to contain the word "timeout").

### Failure Frequency

**Purpose** Find your worst repeat offenders — tests that fail again and again, not just once.

**What it shows** Test → `failureCount / totalRuns` (e.g., "18 / 20").

**Data source** `failureFrequency[]`, from `src/analyzer/stats.js`'s `computeFailureFrequency()`, sorted descending by failure count.

**User interaction** Static table, no toggle (no Latest/All distinction — it's inherently about frequency across the whole window). Compact single-line header, no wasted space.

### Slowest Tests

**Purpose** Spot performance regressions or tests approaching a timeout ceiling.

**What it shows** The 5 slowest tests by average duration.

**Data source** `slowestTests[]`, from `src/analyzer/stats.js`'s `computeSlowestTests()` (top 10 computed, the dashboard shows the top 5).

**Calculation** Duration is the **sum of all attempts for that test in that run** — so a test that needed 2 retries has its retry time included in the total, not just its final successful attempt's duration. The "slowest" value kept per test is the highest such total seen in any single analyzed run.

**Example** `"delivers the PDF export within the 30s SLA | webkit: 59.9s"` — a duration approaching Playwright's default per-test timeout is a real signal worth investigating, whether or not the test technically passed.

**Limitations** Retry time being included means a flaky test that needed 2 retries can appear "slow" even though each individual attempt was fast — the total reflects wall-clock time spent on that test in that run, including retries.

---

## How a test is classified

**Purpose** Turn a raw pass/fail/skip history across runs into one of a small set of meaningful buckets, deterministically — no ML, no fuzzy thresholds beyond one configurable number.

**Outcomes** (`src/analyzer/classifier.js`): **Passing** (`stable_pass`), **Consistently Failing** (`stable_failure`), **Flaky** (`flaky`), **Newly Failing** (`newly_failed`), **Fixed** (`fixed`). A sixth internal constant, `regression`, exists in the code but is never actually produced — see below.

**Calculation**
- Only `passed`/`failed` outcomes count as "active" signal; `skipped`/`interrupted`/`missing` runs are excluded from the comparison (though a skipped-in-the-latest-run test can still show a classification computed from its last real signal).
- All active outcomes `passed` → **Passing**. All `failed` → **Consistently Failing**.
- A mix of pass/fail, with the number of pass↔fail transitions **at or above** `analyzer.minFailures` (default 2, i.e. `--min-failures`) → **Flaky**.
- A "fixed, then broke again" pattern (an earlier failed→passed transition, followed later by a passed→failed transition, ending in a failure, with fewer transitions than the flaky threshold) → reported as **Newly Failing** with its own reason text noting the prior fix — this is the one case that used to have its own "Regression" bucket in v1.0 and was folded into Newly Failing (see [CHANGELOG.md](./CHANGELOG.md)).
- Passed → failed (not matching the pattern above) → **Newly Failing**. Failed → passed → **Fixed**.

**Limitations** `analyzer.minFailures`/`--min-failures` is the one tunable threshold in the whole classification system — raising it makes the classifier more tolerant of alternating results before calling something flaky; lowering it (minimum 1) makes it stricter.

---

## Retries and "Passing on Retry"

**Purpose** Distinguish "passed cleanly" from "passed, but only after Playwright retried it" — a softer instability signal a hard pass/fail count hides.

**Calculation** (`src/analyzer/extractor.js`, `src/analyzer/engine.js`) For a run where the test's final attempt passed, the retry count is `(number of attempts) − 1` — 0 if it passed on the first try. **"Passing on Retry"** = the test's classification is `stable_pass` or `fixed`, **and** its most recent run needed ≥1 retry to pass. This is tracked **per run** internally (so any run's retry count is knowable, not just the latest), but the Suite Summary's "Passing on Retry" tile and the "Passing on Retry — Details" section both reflect the **latest run only** — they do not currently track whether this pattern is repeating run over run.

**Limitations** In-run retry flakiness (fail then pass within one run) does not, by itself, change the test's cross-run classification — a test that always needs exactly 1 retry to pass in every run is still classified `stable_pass`, with "Passing on Retry" as the only surfaced signal that something's not clean.

---

## CI Quality Gate (`--max-flaky`)

**Purpose** Fail a CI build specifically when flaky-test count crosses a threshold — the one signal a normal Playwright CI run's own exit code doesn't already catch (a flaky test typically *passes* on Playwright's own retry, so the pipeline stays green while the suite quietly degrades).

**What it does** Opt-in via `--max-flaky <n>` or `flaky.config.json`'s `ci.maxFlaky`. Evaluated **after** the report is already written to disk, comparing `n` against the suite's cross-run flaky count (`result.summary.flaky` — the same number shown on the Suite Summary Flaky tile). Prints `Flaky test count: X` / `Allowed maximum: n` / `Result: PASSED|FAILED`, then exits non-zero on FAILED.

**Data source** `result.summary.flaky` — the deterministic classification count, not the within-run Playwright flaky signal used by the Flaky Tests Trend chart.

**Limitations** Omitting the flag leaves exit-code behavior completely unchanged from before this feature existed. There's no separate gate for newly-failing/consistently-failing counts — those already fail a normal `playwright test` run's own exit code, so gating on them again would be redundant.

---

## Output Formats

| Format | What it is | Notes |
|---|---|---|
| **HTML** (default) | The full interactive dashboard described above, as a self-contained portable bundle: `<output>/index.html` + an `assets/` folder with every referenced screenshot/video/trace copied in and re-linked to relative paths | Pass `--no-copy-evidence` for a single `.html` file using `file://` links to the original artifacts instead |
| **JSON** | The same underlying dashboard data model, machine-readable | Opt-in alongside HTML via `--also-json` |
| **Markdown** | A text report (executive summary, per-classification tables, Flaky Tests Trend, per-run statistics, recommendations) | For PR comments, Slack, or any text-based workflow |

---

## Custom Playwright Reporter

**Purpose** Produce the standardized JSON this analyzer reads, directly from your own Playwright run, without a separate conversion step.

**What it does** Drop into `playwright.config.js`'s `reporter` array. On every test run, writes a numbered `results-run<N>.json` (incrementing) and an always-overwritten `latest.json` into the configured output directory.

**Configuration** `outputFile` (default `./test-results/results.json` — override this to a directory outside Playwright's own `outputDir`, since Playwright cleans that directory before each run; see README § Quick Start), `includeConfig`, `includeErrors`, `includeAttachments` (all default `true`), `maxErrorLength` (default 5000, truncates long error messages).

**Limitations** Screenshot/trace/video capture depends entirely on the *consuming* project's own Playwright config (`screenshot`/`trace`/`video` settings) — the reporter only records whatever attachments Playwright itself already wrote.
