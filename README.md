# Playwright Flaky Test Analyzer

[![npm version](https://img.shields.io/npm/v/playwright-flaky-analyzer)](https://www.npmjs.com/package/playwright-flaky-analyzer)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen)](https://nodejs.org)

**Website:** [playwright-flaky-analyzer.vercel.app](https://playwright-flaky-analyzer.vercel.app) · **npm:** [playwright-flaky-analyzer](https://www.npmjs.com/package/playwright-flaky-analyzer) · **Docs/usage:** this README and [STEPS.md](./STEPS.md) · **Example report:** [demo-project/](https://github.com/shivani26singh/playwright-flaky-analyzer/tree/main/demo-project)

**Analyze Playwright test reports across multiple runs to detect flaky tests, track how flaky-test and retry counts trend over time, and enforce a CI quality gate.** Deterministic classification and root-cause rules — all offline, zero network calls, no AI required. Generates an interactive HTML Dashboard, JSON, and Markdown.

## Why This Exists

Flaky tests erode trust in a test suite. They cause false CI failures, waste developer time chasing phantom breaks, and quietly teach teams to ignore test results altogether. Playwright's own reporters describe **one run** well — but they can't answer the question that actually matters: *is this test broken, or is it just flaky?* Answering that requires comparing **multiple** runs, deterministically, with no external service required.

| | Playwright's built-in reporters | playwright-flaky-analyzer |
|---|---|---|
| Scope | One run at a time | Compares 2+ runs |
| Flaky detection | None — a passing retry just looks like a pass | Classifies every test as passing, flaky, fixed, newly failing, or consistently failing — a fixed-then-broke-again test is still flagged as newly failing, with that history preserved in its reasons |
| Root cause | Raw error message only | 20 deterministic rules, each with a plain-language explanation |
| Grouping across runs | None | Deterministic failure fingerprints |
| Flaky-test trend | Not measured | Flaky Tests Trend chart across the same runs already loaded by this analysis |
| CI enforcement | Pass/fail per test only | Optional `--max-flaky` quality gate — fails the build when the flaky-test count exceeds your threshold |
| Output | Console / HTML for a single run | HTML Dashboard, JSON, or Markdown — across your whole run history |

- **Time saved** — stop manually diffing CI logs across runs to tell "broken" from "flaky."
- **Trust restored** — a suite where flaky tests are visible and tracked is one people stop ignoring.
- **Zero adoption friction** — no account, no API key, no service to stand up. `npm install` and one reporter config line.

## Key Features

- **Cross-run comparison** — classifies every test as passing, flaky, fixed, newly failing, or consistently failing across 2+ runs, plus a separate Skipped bucket for tests that didn't run in the latest run at all
- **Rule-based investigation** — deterministic root-cause analysis for timeout, locator, assertion, network, auth, and race-condition failures, with a plain-language explanation for every classification
- **Flaky Tests Trend** — always-on chart showing the flaky-test count across the same runs already loaded by this analysis, one bar per run plus a connected trend line, aligned on the same Run 1...N axis as Retries Per Run Trend so you can compare the two directly, with a plain-language interpretation ("Flaky tests increased from 4 to 28 across the 20 analyzed runs.")
- **Retries Per Run Trend** — always-on chart showing how many tests needed a retry to pass, run over run, with a trend line over the bars and a takeaway sentence
- **CI quality gate** — optional `--max-flaky <n>` flag fails the build when the flaky-test count exceeds your threshold; no gate unless you set one — see [DESIGN_DECISIONS.md § CI Quality Gate](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/DESIGN_DECISIONS.md#ci-quality-gate-flaky-test-count-not-a-generic-score)
- **Failure fingerprinting** — groups related failures without relying on stack traces or line numbers, so grouping survives refactors
- **Evidence run picker** — every failing test's Evidence field defaults to its most recent screenshot/trace/video, with a dropdown to switch to any other run that also captured evidence — no need to dig through old artifacts by hand
- **Numbered run-history tiles** — each test's pass/fail history strip shows its run number directly on the tile (not just on hover), so a long run of same-colored tiles is still easy to read at a glance
- **Interactive HTML Dashboard** — self-contained, offline, light/dark theme, search, and drill-down history
- **Three output formats** — HTML, JSON, and Markdown
- **Custom Playwright reporter** — drop-in, produces a standardized, framework-independent JSON schema
- **Browser-aware** — tracks flaky tests per browser project (chromium, firefox, webkit, or any custom project name)
- **CI/CD ready** — a CLI step in any pipeline; two production dependencies, zero runtime network calls

### Dashboard Feature Summary

| Feature | What it provides |
|---|---|
| Suite Summary | 7 headline tiles for the current window: Total Tests, Passing, Passing on Retry, Flaky, Newly Failing, Consistently Failing, Skipped |
| Flaky Tests Trend | Flaky-test count per analyzed run, bar+line chart, plain-language first-vs-last interpretation |
| Retries Per Run Trend | Retry count per analyzed run, bar+line chart, up/down/flat takeaway sentence |
| Run Highlights | Plain-English bullet summary of the analyzed window (latest-run breakdown, top failure category, retry concentration, slowest test, etc.) |
| Failed Tests | One investigation card per failing test — root cause, evidence, confidence (when below threshold), classification reasons, suggested checks; searchable and filterable |
| Passing on Retry — Details | Tests currently passing that needed ≥1 retry in the latest run, with the same investigation detail as Failed Tests |
| Skipped Tests — Details | Tests skipped in the latest run |
| Root Cause Summary | Compact triage table — one row per failing test, with pattern/category/confidence |
| Browser Statistics | Executions, failures, and fail % per browser project, toggle between Latest Run and All Runs |
| Failure Categories | Error counts by category (timeout, locator, assertion, network, backend, authentication, environment, data, unknown), same Latest Run/All Runs toggle |
| Failure Frequency | Tests ranked by how often they've failed across the analyzed runs |
| Slowest Tests | The 5 slowest tests by average duration (including retry attempts) |
| Evidence run picker | Screenshot/trace/video per failing test, defaulting to the most recent run with evidence, switchable to any other run that also has some |

> Full feature detail lives in [FEATURES.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/FEATURES.md); classification/rule codes are in [CHANGELOG.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/CHANGELOG.md); the reasoning behind these choices is in [DESIGN_DECISIONS.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/DESIGN_DECISIONS.md).

## Example Report

[`demo-project/`](https://github.com/shivani26singh/playwright-flaky-analyzer/tree/main/demo-project) is a realistic ~70-test Playwright suite (Meridian, a fictional B2B SaaS) with a committed 20-run CI history, real evidence (screenshots/videos/traces), and a pre-generated dashboard. Clone the repo and open `demo-project/flaky-report/index.html` directly in a browser — no install or build step required. See [demo-project/README.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/demo-project/README.md) to regenerate it yourself or run the live suite.

## How It Works

```
Playwright
    ↓
Flaky Analyzer (2+ runs)
    ↓
Historical Analysis
    ↓
Classification  (stable / flaky / fixed / newly failing / consistently failing)
    ↓
Deterministic Rules → Root Cause → Evidence
    ↓
HTML / JSON / Markdown  (Flaky Tests Trend + Retries Per Run Trend, same runs, same axis)
    ↓
Optional CI Gate (--max-flaky)
```

Every stage above is fully deterministic — no AI, no LLMs, no external APIs; the same input always produces the same output. See [docs/architecture/ARCHITECTURE.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/architecture/ARCHITECTURE.md) for the full component breakdown and data-flow diagram.

## Installation

```bash
npm install -D playwright-flaky-analyzer
```

Or run without installing:

```bash
npx playwright-flaky-analyzer analyze ./test-results
```

**Requirements:** Node.js >= 18.0.0, Playwright >= 1.30.0 (for the custom reporter — see [KNOWN_LIMITATIONS.md § Compatibility](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/KNOWN_LIMITATIONS.md#compatibility)).

## Quick Start

**1. Add the reporter** to `playwright.config.js`:

```js
module.exports = {
  reporter: [
    ['list'],
    ['playwright-flaky-analyzer/reporter', {
      outputFile: './flaky-results/results.json'
    }],
  ],
};
```

> Keep analyzer result files outside Playwright's `outputDir` (default: `test-results`) because Playwright may clean that directory before each test run — writing into a separate folder like `flaky-results/` (shown above) keeps your accumulated history intact across runs.

**2. Run your suite multiple times** (locally or in CI) so more than one report accumulates:

```bash
npx playwright test
```

Each run writes a numbered file: `flaky-results/results-run1.json`, `results-run2.json`, `results-run3.json`, ...

**3. Analyze the results:**

```bash
npx playwright-flaky-analyzer analyze ./flaky-results --format html
```

This produces a **self-contained, portable report bundle** — a `flaky-analysis/` folder with `index.html` and an `assets/` folder holding copies of every screenshot, video, and trace. Open `index.html` in any browser (no server), or **zip the whole folder and send it** — screenshots, inline video playback, and trace downloads keep working even if the original Playwright output is gone. This is what makes it robust in CI (Azure DevOps / GitHub Actions / Jenkins / GitLab), where the Playwright report and this report are published as separate artifacts.

> Prefer a single `.html` file with `file://` evidence links (the old behavior)? Pass `--no-copy-evidence`. Add `--also-json` to also emit the underlying dashboard data as JSON.

**Try it without your own data first:** the repository ships sample reports for exactly this —

```bash
npx playwright-flaky-analyzer analyze ./examples/sample-results --format html -o demo.html
```

**4. (Optional) Enforce a CI quality gate:**

```bash
npx playwright-flaky-analyzer analyze ./flaky-results --format html --max-flaky 5
```

Both the Flaky Tests Trend and Retries Per Run Trend charts are shown in the dashboard whether or not you use this flag — they're always computed from the runs in this analysis, with no separate history file or extra flag needed. `--max-flaky` is opt-in: it exits non-zero when the flaky-test count exceeds your threshold (the report is still generated first). Omitting it changes nothing for existing users.

## Custom Reporter

The snippet above is the only supported integration path — see [docs/architecture/REPORTER.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/architecture/REPORTER.md) for every option, lifecycle hook, and the full output schema. Quick reference for the options:

```js
['playwright-flaky-analyzer/reporter', {
  outputFile: './flaky-results/results.json', // default if omitted: ./test-results/results.json — override it (as shown) to avoid Playwright's own outputDir cleanup, see note above
  includeConfig: true,        // default: true — embed the Playwright config in the report
  includeErrors: true,        // default: true — embed error messages/stacks
  includeAttachments: true,   // default: true — embed screenshot/video/trace paths
  maxErrorLength: 5000,       // default: 5000 — truncate error messages longer than this
}]
```

Each test run writes a numbered `results-run<N>.json` file plus an always-overwritten `latest.json`, both in the same directory as `outputFile`.

**Evidence is archived automatically, per run.** As each test attempt finishes, the reporter copies its Playwright attachments (screenshots, videos, traces, and any other captured attachment) into a run-scoped evidence directory next to that run's `results-run<N>.json`, and points `attachments[].path` at the archived copy rather than the original Playwright output path. This is what lets evidence for an earlier flaky failure stay available even after a later run passes the same test and Playwright cleans its own shared output directory — no extra configuration needed on your end. Because evidence is kept per historical run rather than only the latest one, disk usage grows accordingly as your `results-run<N>.json` history accumulates.

The analyzer also accepts Playwright's native JSON reporter output directly, if you'd rather not add a custom reporter.

## Input Data Format

The analyzer reads whichever of these two JSON shapes a file matches — you don't need to tell it which:

1. **This package's own reporter format** (recommended) — the flat `{ schemaVersion, reporter, metadata, timing, summary, tests: [...] }` shape written by `playwright-flaky-analyzer/reporter` above. Full schema: [docs/architecture/REPORTER.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/architecture/REPORTER.md).
2. **Playwright's native JSON reporter output** — the nested `{ config, suites: [...] }` shape from Playwright's built-in `json` reporter. Accepted directly, no conversion step.

Either way, the analyzer needs **2 or more report files** in the results directory to compare against each other — a single-run directory produces a "Need at least 2 valid reports for comparison" message, not an analysis. Files named `results-run1.json`, `results-run2.json`, ... are read in numeric run order; otherwise every non-dotfile `*.json` in the directory is read in sorted-filename order.

## CLI

```bash
playwright-flaky-analyzer analyze ./test-results --format html -o dashboard.html
playwright-flaky-analyzer analyze ./test-results --format html --also-json   # also write dashboard.json alongside
playwright-flaky-analyzer analyze ./test-results --format json -o dashboard.json
playwright-flaky-analyzer analyze ./test-results --format markdown --verbose
playwright-flaky-analyzer analyze ./test-results --max-flaky 5  # opt-in CI quality gate
playwright-flaky-analyzer init   # scaffolds flaky.config.json
```

Full flag reference, `flaky.config.json` schema, and troubleshooting: [STEPS.md](./STEPS.md).

## Programmatic API

```js
const { loadConfig, run } = require('playwright-flaky-analyzer');

const config = loadConfig(); // fills in every default, same as the CLI does
config.input.resultsDir = './test-results';
config.output.format = 'html';

run(config);
```

`run()` expects a fully-shaped config object (all of `input`/`output`/`analyzer`/`logging`) — always start from `loadConfig()` rather than passing a partial object directly. Full API surface (`compare`, `compute`, `PlaywrightReporter`, format generators, etc.): [API.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/API.md).

## Output Formats

| Format | Use case |
|---|---|
| **HTML** (default) | Self-contained, **portable** dashboard bundle (`index.html` + `assets/` with copied screenshots/videos/traces) — open in a browser, or zip the folder and share; works with no server and no dependency on the original Playwright output |
| **JSON** | Machine-readable, for CI/CD integrations or other consumers |
| **Markdown** | PR comments, Slack, any text-based workflow |

The HTML Dashboard includes a Suite Summary (Passing / Passing on Retry / Flaky / Newly Failing / Consistently Failing / Skipped), then two aligned trend charts over the same analyzed runs, grouped together near the top as the high-level stability picture — **Flaky Tests Trend** (bar+line chart of flaky-test count per run, plus a first-vs-last interpretation sentence) and **Retries Per Run Trend** (bar+line chart of retry count per run, with its own takeaway sentence) — followed by Run Highlights, rule-based investigation cards for every failing test (search, filter chips, a run-by-run pass/fail history strip with visible run numbers on each tile, and an Evidence field whose screenshot/trace/video defaults to the most recent run but can be switched to any earlier run that also captured evidence), Passing on Retry and Skipped Tests details, and an Additional Metrics panel with Root Cause Summary, Browser Statistics and Failure Categories (toggle between "Latest Run" and "All Runs" scope), Failure Frequency, and Slowest Tests — see [FEATURES.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/FEATURES.md) for what each section shows and [docs/architecture/ARCHITECTURE.md § HTML Generator](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/architecture/ARCHITECTURE.md#html-generator-srcreporterhtmljs) for the full section-by-section breakdown.

## Documentation

Only README.md and STEPS.md ship inside the npm package (see `files` in `package.json`) — they're written to work standalone, offline, from inside `node_modules/`. Everything else below is deeper project/contributor documentation that lives on GitHub; those links go to the repository rather than a local path so they never 404 for someone reading this from an installed package.

| Document | Purpose |
|----------|---------|
| [README](./README.md) | Project overview and quick start (you are here) |
| [FEATURES](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/FEATURES.md) | Every dashboard feature in detail — purpose, data source, calculation, interaction, example, limitations |
| [STEPS](./STEPS.md) | Full CLI reference, configuration schema, contributor setup |
| [API](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/API.md) | Full programmatic API reference |
| [ARCHITECTURE](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/architecture/ARCHITECTURE.md) | Internal architecture, components, data flow |
| [REPORTER](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/architecture/REPORTER.md) | Custom reporter internals, lifecycle hooks, output schema |
| [DESIGN_DECISIONS](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/DESIGN_DECISIONS.md) | Why key architectural choices were made |
| [DEVELOPMENT_JOURNEY](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/DEVELOPMENT_JOURNEY.md) | Engineering case study — origin, bugs found, lessons learned |
| [KNOWN_LIMITATIONS](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/KNOWN_LIMITATIONS.md) | What the tool doesn't do (yet), and why |
| [CHANGELOG](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/CHANGELOG.md) | Release history — source of truth for what shipped when |
| [ROADMAP](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/ROADMAP.md) | Completed in v1.0, planned for v1.1, future ideas |
| [CONTRIBUTING](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/CONTRIBUTING.md) | Contributor workflow and code style |
| [RELEASE_CHECKLIST](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/RELEASE_CHECKLIST.md) | Everything required before publishing a release |
| [SECURITY](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/SECURITY.md) | Reporting vulnerabilities |
| [CODE_OF_CONDUCT](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/CODE_OF_CONDUCT.md) | Community standards |

## Technology Stack

- **Runtime:** Node.js ≥ 18.0.0, plain CommonJS — no bundler, no compile step (`npm run build` just prints a confirmation message).
- **Production dependencies (2 total):** [`commander`](https://www.npmjs.com/package/commander) for CLI parsing, [`winston`](https://www.npmjs.com/package/winston) for structured logging. No database, no server, no frontend framework.
- **HTML Dashboard:** a single self-contained file — inline CSS/JS, the dashboard model embedded as a JSON literal, zero runtime dependencies of its own. Opens directly from the filesystem in any modern browser.
- **Dev tooling:** `eslint` + `prettier` for linting/formatting, Node's built-in `node --test` runner (no separate test framework).

## Project Structure

```
src/
├── cli/            # run-analysis.js — the `analyze`/`init` commands
├── analyzer/        # extractor, classifier, engine (compare), stats, failure-classifier, orchestrator (index.js)
├── reporter/         # PlaywrightReporter, dashboard-json, html, markdown, schema
├── investigation/    # rule-engine — deterministic root-cause investigation
├── knowledge/rules/   # the 20 deterministic root-cause rules (RC-001–RC-020)
├── evidence/         # collector, copier, path-rewriter — the portable-bundle pipeline
└── utils/            # config-loader, validator, fs, logger
examples/sample-results/  # sample Playwright reports ships with the package, for `analyze` without your own data
docs/architecture/         # ARCHITECTURE.md, REPORTER.md
```

Every `src/**/*.js` file has a co-located `*.test.js`; the package excludes test files from what's published (see `files` in `package.json`).

## Current Limitations

The short list — see [KNOWN_LIMITATIONS.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/KNOWN_LIMITATIONS.md) for the full, categorized version with reasoning.

### Currently Supported
- Cross-run comparison, deterministic classification, and root-cause investigation for **any** JSON matching the expected schema (Playwright-native or this package's reporter format)
- A portable, self-contained HTML dashboard with evidence (screenshots/traces/videos) bundled in
- An opt-in CI quality gate on flaky-test count

### Not Currently Supported
- **Single-run analysis** — at least 2 reports are required; there's nothing to compare against with one
- **Multi-repo/monorepo aggregation** — each analysis compares runs from one results directory only
- **Cross-invocation history** — the Flaky Tests Trend chart is scoped to the runs loaded by the *current* analysis (`analyzer.lookbackRuns`), not a database that survives between separate `analyze` invocations (a file-based version of this was built and deliberately removed — see [DESIGN_DECISIONS.md § Local Flaky Tests Trend](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/DESIGN_DECISIONS.md#local-flaky-tests-trend-cross-invocation-file----tried-then-reversed))
- **In-run retry flakiness reflected in classification** — a test that fails then passes on retry *within* a run still counts as a clean pass for cross-run classification (the "Passing on Retry" tile surfaces this for the latest run only)
- **Server-side filtering** for very large datasets — the HTML Dashboard is single-page and client-rendered; all search/filter happens in the browser against the embedded data

### Potential Future Enhancements
Directional ideas only, not committed or scheduled — see [ROADMAP.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/ROADMAP.md) for the full list: a hosted/cross-machine trend store, reflecting in-run retry flakiness in classification itself, additional AI provider adapters (Copilot/Gemini/OpenAI/etc.), multi-repo aggregation, a native GitHub Actions annotation output format.

## FAQ

**How many runs do I need?**
At least 2 for comparison. 5–10 give the most accurate flaky detection.

**Does it work with any test runner?**
The analysis engine accepts any JSON matching the expected schema; the bundled custom reporter is Playwright-specific.

**Can I run it in CI?**
Yes — add a step after your test matrix, and optionally enforce a flaky-count gate:
```yaml
- name: Analyze flaky tests
  run: npx playwright-flaky-analyzer analyze ./test-results --format html --max-flaky 5
```
The gate is opt-in (omit the flag for today's default behavior) and is evaluated *after* the report is written, so a failing gate never prevents the report from being published. `--max-flaky` is the recommended gate rather than a newly-failing or consistently-failing threshold, because a flaky test typically *passes* on Playwright's own retry — so Playwright's own exit code stays green even as the suite degrades; a newly-failing or consistently-failing test already fails that exit code on its own. A worked Azure DevOps example (Playwright → history → analyzer → flaky-count threshold → published HTML artifact) is in [docs/azure-pipelines.example.yml](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/azure-pipelines.example.yml).

**What counts as a flaky test?**
A test that has both passed and failed across runs, alternating (2+ transitions) — a run where the test was skipped, interrupted, or didn't run at all doesn't count toward this either way, so a test skipped once amid otherwise-consistent passes isn't flagged as flaky.

More in [STEPS.md § Troubleshooting](./STEPS.md#troubleshooting) and [KNOWN_LIMITATIONS.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/KNOWN_LIMITATIONS.md).

## Roadmap

**Available now, in the current 1.0.3 release:** the full cross-run comparison engine, investigation/fingerprinting, and three output formats (HTML, JSON, Markdown) from the initial release, plus everything added since — an opt-in CI quality gate (`--max-flaky`), an always-on Flaky Tests Trend chart (aligned with Retries Per Run Trend on the same analyzed runs), automatic per-run/per-attempt evidence archiving, a merged Regression/Newly-Failing classification, and a Skipped bucket. All of it is deterministic and additive; none of it requires AI or a generic suite-health score. Exactly what shipped in which version: [CHANGELOG.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/CHANGELOG.md).

**Planned next (not yet shipped):** category filtering in Failed Tests, finer-grained failure categories, timeout/locator disambiguation, a progress indicator for large suites, and CI workflow hardening. Longer-range, unscoped ideas (cross-machine trend storage, more AI provider adapters, multi-repo aggregation, a native GitHub Actions output format) live further out. Full list: [ROADMAP.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/ROADMAP.md).

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/CONTRIBUTING.md) for the development workflow, code style, and how to run the test suite locally. Please also review the [CODE_OF_CONDUCT.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](./LICENSE)

## Author

Shivani Singh

Senior QA Engineer passionate about AI-powered Software Testing, Playwright automation, and increasing productivity.

- LinkedIn: www.linkedin.com/in/shivani-singh-alwaysreadytolearn