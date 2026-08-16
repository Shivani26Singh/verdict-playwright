# Playwright Flaky Test Analyzer — CLI Reference

[![npm version](https://img.shields.io/npm/v/playwright-flaky-analyzer)](https://www.npmjs.com/package/playwright-flaky-analyzer)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen)](https://nodejs.org)

**Analyze Playwright test reports across multiple runs to detect flaky tests, track how flaky-test and retry counts trend over time, and enforce a CI quality gate.** Deterministic classification and root-cause rules — all offline, zero network calls, no AI required. Generates an interactive HTML Dashboard, JSON, and Markdown.

This document is the CLI reference for the underlying analyzer package. The
VERDICT web app lives in [`web/`](../web) and uses this package only at build
time.

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

## Installation

```bash
npm install -D playwright-flaky-analyzer
```

Or run without installing:

```bash
npx playwright-flaky-analyzer analyze ./test-results
```

**Requirements:** Node.js >= 18.0.0, Playwright >= 1.30.0 (for the custom reporter).

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

> Keep analyzer result files outside Playwright's `outputDir` (default: `test-results`) because Playwright may clean that directory before each test run.

**2. Run your suite multiple times:**

```bash
npx playwright test
```

Each run writes `flaky-results/results-run1.json`, `results-run2.json`, ...

**3. Analyze the results:**

```bash
npx playwright-flaky-analyzer analyze ./flaky-results --format html
```

**4. (Optional) Enforce a CI quality gate:**

```bash
npx playwright-flaky-analyzer analyze ./flaky-results --format html --max-flaky 5
```

## Custom Reporter

```js
['playwright-flaky-analyzer/reporter', {
  outputFile: './flaky-results/results.json', // default if omitted: ./test-results/results.json
  includeConfig: true,        // default: true
  includeErrors: true,        // default: true
  includeAttachments: true,   // default: true
  maxErrorLength: 5000,       // default: 5000
}]
```

## Input Data Format

The analyzer reads either this package's reporter format or Playwright's native
JSON reporter output. It needs **2 or more report files** to compare.

## CLI

```bash
playwright-flaky-analyzer analyze ./test-results --format html -o dashboard.html
playwright-flaky-analyzer analyze ./test-results --format html --also-json
playwright-flaky-analyzer analyze ./test-results --format json -o dashboard.json
playwright-flaky-analyzer analyze ./test-results --format markdown --verbose
playwright-flaky-analyzer analyze ./test-results --max-flaky 5
playwright-flaky-analyzer init
```

## Programmatic API

```js
const { loadConfig, run } = require('playwright-flaky-analyzer');

const config = loadConfig();
config.input.resultsDir = './test-results';
config.output.format = 'html';

run(config);
```

## Output Formats

| Format | Use case |
|---|---|
| **HTML** (default) | Self-contained, portable dashboard bundle |
| **JSON** | Machine-readable, for CI/CD integrations |
| **Markdown** | PR comments, Slack, any text-based workflow |

## Troubleshooting

**How many runs do I need?**
At least 2 for comparison. 5–10 give the most accurate flaky detection.

**Can I run it in CI?**
Yes — add a step after your test matrix, and optionally enforce a flaky-count gate.

```yaml
- name: Analyze flaky tests
  run: npx playwright-flaky-analyzer analyze ./test-results --format html --max-flaky 5
```

**What counts as a flaky test?**
A test that has both passed and failed across runs, alternating (2+ transitions).
