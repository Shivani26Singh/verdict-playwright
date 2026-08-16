# Repository Audit — Playwright Flaky Test Analyzer v1.0.0

**Date:** 2026-07-28 | **Tests:** 460 pass, 0 fail | **Dependencies:** 2 (commander, winston)

## Project Overview

A deterministic, offline-first Playwright test analyzer that compares multiple test runs to detect flaky tests, regressions, and stability trends. Generates a self-contained interactive HTML dashboard with classification explanations, fingerprints, confidence scoring, and search/filter capabilities.

- **Language:** JavaScript (Node.js ≥ 18, CommonJS)
- **Testing:** Node.js native test runner (`--test`)
- **Build:** None required (pure JS)
- **Package:** `playwright-flaky-analyzer` v1.0.0

## Branch & Contributor Health

| Check | Status |
|-------|--------|
| Active branch | `main` |
| Branch count | 1 |
| Sole contributor | Shivani Singh |
| No bot/authors | ✅ |

## Repository Structure

```
src/
  analyzer/         — extractor, classifier, engine, stats, failure classifier, browser integration
  cli/              — Commander CLI (run-analysis.js)
  investigation/    — rule engine, confidence calculation, investigation interface
  knowledge/rules/  — 20 deterministic investigation rules
  providers/        — pluggable provider interface (mock)
  prompts/          — AI prompt generation
  reporter/         — HTML, Markdown, Copilot generators, Playwright reporter, JSON schema
  utils/            — config-loader, fs, logger, validator
examples/           — sample Playwright reports for demos
docs/               — extended documentation
```

## Test Coverage

| Module | Test File | Tests |
|--------|-----------|-------|
| classifier | classifier.test.js | ✅ |
| engine | engine.test.js | ✅ |
| extractor | extractor.test.js | ✅ |
| failure-classifier | failure-classifier.test.js | ✅ |
| stats | stats.test.js | ✅ |
| browser-integration | browser-integration.test.js | ✅ |
| cli | cli.test.js | ✅ |
| rule-engine | rule-engine.test.js | ✅ |
| investigate-engine | investigate-engine.test.js | ✅ |
| interface | interface.test.js | ✅ |
| mock | mock.test.js | ✅ |
| dashboard-json | dashboard-json.test.js | ✅ |
| html | html.test.js | ✅ |
| markdown | markdown.test.js | ✅ |
| copilot | copilot.test.js | ✅ |
| reporter | reporter.test.js | ✅ |
| **Total** | **19 test files** | **460 tests** |

## Key Features Verified

- 6 classification outcomes with explanations (CLS-001 to CLS-006)
- 20 deterministic investigation rules (RC-001 to RC-020)
- Fingerprinting (FP-XXXXXX, DJB2 hash)
- Dynamic confidence with 9 adjustment rules
- Suite Summary, Run Summary, Retry Timeline
- Search with highlighting, contextual empty states
- Evidence: screenshots, traces, videos, stack traces
- Self-contained HTML — no external dependencies
- Dark/light theme via `prefers-color-scheme`

## CI/CD Readiness

- `npm test` — 460 tests, zero failures
- `npm pack` — Includes only `src/`, `templates/`, docs, license
- Offline execution — no API calls, no Internet required
- Node.js ≥ 18, Windows/Linux/macOS
