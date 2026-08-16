# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3] — 2026-08-12

### Added — Public product website
- A public product website at [playwright-flaky-analyzer.vercel.app](https://playwright-flaky-analyzer.vercel.app) (built with Vite + React, under `website/`) covering Overview, Why, Features, How It Works, Install, CLI Reference, Reports, and CI/CD — deployed separately from the npm package and excluded from the npm tarball.
- The website's npm-version badge reads `https://registry.npmjs.org/playwright-flaky-analyzer/latest` at runtime rather than hard-coding a version, so it stays current across future releases without a rebuild.

### Changed — Documentation
- README.md and STEPS.md now link to the public website.
- `package.json`'s `homepage` field now points to the public website instead of the GitHub README.

## [1.0.2] — 2026-08-12

### Fixed — Flaky Tests Trend now reflects cross-run classification
- The Flaky Tests Trend chart is now built from cross-run flaky-test **classification**: for each analyzed run *N*, how many tests `classify()` would call `flaky` using only the outcomes observed in runs `1..N` — the exact same `classify()` logic that produces every test's own final classification elsewhere in the report. Previously this chart read `statistics.perRun[].flaky`, which is Playwright's own **in-run** retry-flakiness signal (a test that both passed and failed among its retry attempts within a single Playwright invocation) — a different, narrower metric that could disagree with the report's own Flaky count.
- Because both numbers now share the same per-test `history` arrays and the same `minTransitions` threshold, the trend's final data point is guaranteed to equal the overall Flaky count reported elsewhere in the same analysis.

### Unchanged — Retries Per Run Trend
- Retries Per Run Trend continues to represent retries actually consumed **within each individual Playwright run** (`statistics.perRun[].totalRetries`) — an independent, in-run metric that the Flaky Tests Trend fix above does not touch. The two charts remain intentionally distinct signals, shown side by side on the same Run 1...N axis so they can be compared directly.

### Added — Automatic, per-attempt evidence archiving
- `PlaywrightReporter` now archives evidence automatically: as each test attempt finishes, its Playwright attachments (screenshots, videos, traces, and any other captured attachment) are copied into a run-scoped, per-test, per-attempt directory (`evidence/run-<N>/<testId>/attempt-<retry>/`) next to that run's `results-run<N>.json`, and `attachments[].path` is rewritten to point at the archived copy rather than the original Playwright output path.
- This lets evidence for a failure recorded in an earlier run stay available even after a later `playwright test` invocation reuses and cleans Playwright's own shared `outputDir` — a subsequent multi-run analysis can still show that failure's screenshot/video/trace.
- Fully automatic: no additional configuration is required in the consuming project beyond the existing reporter setup in `playwright.config.js`.

## [1.0.0] — 2026-08-12

First public release.

### Classification Engine (6 Outcome Codes)
- **CLS-001** — Passing: passed consistently across all analyzed runs
- **CLS-002** — Consistently Failing: failed consistently across all analyzed runs
- **CLS-003** — Flaky: alternates between pass and fail (2+ pass/fail transitions)
- **CLS-004** — Newly Failing: previously passing, now failing
- **CLS-005** — Regression pattern (fixed, then failed again): folded into Newly Failing rather than its own summary bucket — the "previously fixed, broke again" context is preserved in the test's classification reasons, and the card still gets the stronger red "critical" border
- **CLS-006** — Fixed: previously failing, now passing
- **Skipped** — tracked as its own bucket outside the six outcome codes above (header chip, Suite Summary card, and a "Skipped Tests — Details" table): a test with no observed pass or fail in the analyzed window. Included in Total; excluded from Passing/Flaky/Failed.

### Investigation Engine (20 Deterministic Rules)
- RC-001 to RC-020 covering: timeout, locator, assertion, network, authentication, HTTP 401/403/404/500, ECONNRESET, rapid alternation, always-fails, element detached, strict mode violation, target closed, element not visible, net::ERR_, generic failure
- Priority-driven rule ordering for multi-pattern error messages (first match wins)
- Suggested Checks — investigation guidance rather than prescriptive fixes

### Fingerprinting (DJB2)
- Deterministic 6-character hex fingerprints (`FP-XXXXXX`) from stable characteristics (classification + failure category + error pattern + root cause)
- Groups related failures without relying on stack traces or line numbers — grouping survives refactors
- Stable across environments — no dependency on file paths or line numbers

### Confidence Scoring
- 9 evidence-based adjustment rules (A1–A9): history-consistency, transition-count noise penalty, retry-recovery signal, fingerprint corroboration, limited-data penalty, stable-pattern bonus — clamped between 10 and 99
- **Quiet by default on investigation cards** — a card's confidence bar/percentage only renders when a diagnosis falls below the fixed 70% review threshold, alongside a "Needs Review" flag, with a plain-language tooltip explaining how the number was reached
- The **Root Cause Summary** table keeps a per-row Confidence % column for every test (a compact triage list where the number is worth scanning), with below-threshold rows flagged
- `analyzer.confidenceThreshold` is not user-configurable — the review threshold is a fixed internal constant

### Failure Classification (8 Categories)
- locator, timeout, data, assertion, network, backend, authentication, environment
- Score-based pattern matching with priority ordering
- Backend errors (HTTP 5xx) separated from network/connection-level errors

### Interactive HTML Dashboard
- Self-contained, offline, single-file HTML — zero external runtime dependencies, light/dark theme via `prefers-color-scheme`
- **Suite Summary** — 7 headline tiles for the analyzed window: Total Tests, Passing, Passing on Retry, Flaky, Newly Failing, Consistently Failing, Skipped
- **Flaky Tests Trend** — always-on (no flag): the number of test cases classified `flaky` as of each analyzed run, using the same cross-run `classify()` logic as every test's final classification (not Playwright's own in-run retry signal) — bar+line chart with a connected trend line, plain-language first-vs-last interpretation
- **Retries Per Run Trend** — always-on, retry count per analyzed run, its own trend line and takeaway sentence, aligned with Flaky Tests Trend on the same Run 1...N axis
- **Run Highlights** — plain-English bullet summary (latest-run breakdown, top failure category, retry concentration, slowest test, shared-incident detection when 70%+ of flaky tests share one history pattern)
- **Failed Tests** — one investigation card per failing test: root cause, evidence, confidence (only when below threshold), classification reasons, suggested checks; searchable, filterable, with a numbered run-by-run pass/fail history strip
- **Passing on Retry — Details** and **Skipped Tests — Details** — same investigation-card detail as Failed Tests
- **Evidence run picker** — every failing test's Evidence field defaults to its most recent run with a screenshot/trace/video, switchable to any other analyzed run that also captured evidence
- **Additional Metrics** panel — Root Cause Summary (triage table), Browser Statistics and Failure Categories (Latest Run/All Runs toggle), Failure Frequency, Slowest Tests
- Search with highlighting, filter chips, Expand All/Collapse All, sortable columns, keyboard navigation and ARIA attributes

### Output Formats
- **HTML** (default) — the interactive dashboard above, as a portable bundle (see Evidence Packaging)
- **JSON** — machine-readable dashboard data, for CI/CD integrations
- **Markdown** — human-readable report for PR comments, Slack, or any text-based workflow

### Evidence Packaging
- The HTML report is a **self-contained, portable bundle** by default: every referenced screenshot, video, and trace is copied into the report's own `assets/` folder (deduped, deterministic suffix on filename collisions) and all links rewritten to relative paths — producing an `index.html` + `assets/` folder that keeps working even if the original Playwright output is cleaned, and can be zipped and shared as-is
- Screenshots open in a lightbox, videos play inline, traces download for the Playwright Trace Viewer
- `--no-copy-evidence` (or `output.copyEvidence: false`) restores the single-`.html`-with-`file://`-links behavior
- Missing evidence files degrade to a disabled "unavailable" control with a logged warning — report generation never fails because of missing evidence

### Custom Playwright Reporter
- Drop-in reporter accessible via the `playwright-flaky-analyzer/reporter` package export — no path into `node_modules` needed
- Writes a numbered `results-run<N>.json` (auto-incremented by scanning the output directory) plus an always-overwritten `latest.json`
- Captures Playwright config, timing, test results, errors, and attachments; options: `outputFile`, `includeConfig`, `includeErrors`, `includeAttachments`, `maxErrorLength`
- Also accepts Playwright's own native JSON reporter output directly, with no conversion step
- **Per-run evidence archiving.** As each test attempt completes, the reporter automatically copies its Playwright attachments (screenshots, videos, traces, and any other captured attachment) into a run-scoped evidence directory alongside `results-run<N>.json`, and rewrites that attempt's `attachments[].path` to point at the archived copy — not the original Playwright output path. This is what lets evidence for an earlier flaky failure stay available even after a later run passes the same test and Playwright cleans its own shared output directory. Happens automatically whenever the reporter is configured — no additional consumer-project setup. Because evidence is retained per historical run rather than only for the latest one, disk usage grows accordingly as `results-run<N>.json` files accumulate. Distinct from the analyze-time HTML evidence bundling described above: this reporter-side archiving preserves evidence *before* analysis ever runs; `--format html`'s bundling separately copies whatever evidence is still reachable at analysis time into the report itself.

### CLI
- `analyze [reports-folder]` — full analysis with configurable output format (`-f/--format`), output path (`-o/--output`), config file (`-c/--config`), results directory (`-d/--results-dir`), lookback window (`--lookback`), flaky-transition threshold (`--min-failures`), verbose logging (`-v/--verbose`), companion JSON with HTML (`--also-json`), evidence bundling toggle (`--no-copy-evidence`)
- `init` — scaffolds `flaky.config.json`
- **CI quality gate — `--max-flaky <n>`** (opt-in): fails the build (non-zero exit code) when the flaky-test count exceeds `n`, evaluated *after* the report is written so a failing gate never blocks the report; no gate unless configured. Also configurable via `flaky.config.json`'s `ci.maxFlaky`.
- **AI-assisted investigation flags** *(optional, offline, no network calls)*: `--generate-ai-prompt` (writes `investigation-prompt.md`) and `--generate-ai-json` (writes `investigation-json-prompt.md`) produce a prompt for you to paste into any AI tool by hand; `--ai-investigation <file>` re-embeds that tool's saved JSON reply into the HTML dashboard; `--investigate <provider>` selects an investigation provider

### Programmatic API
- `run(config)` — full analysis pipeline
- `PlaywrightReporter` — custom reporter class, also usable for direct instantiation
- `loadConfig()`, `compare`, `compute`, format generators — see [API.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/API.md)

### Statistics Engine
- Per-run pass/fail rates, durations, retries
- Aggregate statistics across all analyzed runs
- Browser breakdowns (chromium, firefox, webkit, or any custom project name), with per-browser flaky tracking
- Failure frequency across runs; timeline with trend indicators

### Input Validation
- Graceful error handling for missing directories, invalid formats, bad parameters
- Accepts both this package's reporter format and Playwright's native JSON reporter format
- Config validation with helpful, specific error messages

### Testing
- 687 tests, 0 failures, across 121 suites
- Coverage includes classification, rule engine, fingerprinting, confidence scoring, evidence packaging, the CI quality gate (absent/pass/fail/boundary/invalid/zero-flaky paths), the Flaky Tests Trend and Retries Per Run Trend, the evidence run picker, HTML rendering (including a balanced-markup guard), and a package-contents regression test that fails the build if a shipped doc ever links to a non-shipped doc with a relative path

### Documentation
- [README.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/README.md) — project overview, installation, Quick Start
- [STEPS.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/STEPS.md) — full CLI/configuration reference and contributor setup
- [API.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/API.md) — full programmatic API reference
- [docs/architecture/ARCHITECTURE.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/architecture/ARCHITECTURE.md) — technical architecture with data-flow diagrams
- [docs/architecture/REPORTER.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/architecture/REPORTER.md) — custom reporter configuration and schema
- [KNOWN_LIMITATIONS.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/KNOWN_LIMITATIONS.md) — current, maintained limitations list
- [DESIGN_DECISIONS.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/DESIGN_DECISIONS.md) — why key architectural choices were made, including two designs tried and deliberately reversed before this release (a cross-invocation `--history-file` and a Reliability Score)

---

## Related Documentation

[← README](./README.md) · [ROADMAP](./ROADMAP.md) · [DEVELOPMENT_JOURNEY](./DEVELOPMENT_JOURNEY.md) · [RELEASE_CHECKLIST](./RELEASE_CHECKLIST.md)
