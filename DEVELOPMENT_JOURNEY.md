# Development Journey

A chronological account of how this project got to v1.0.0 and beyond — including the mistakes, not just the milestones. If you're evaluating whether to depend on this tool, this document is meant to show our work.

## Why This Project Exists

Playwright's built-in reporters describe a single run well but don't answer the question that actually erodes trust in a test suite: *"is this test broken, or is it just flaky?"* Answering that requires comparing multiple runs, not just reading one — and doing it in a way that's deterministic enough to trust in CI, cheap enough to run on every build, and clear enough that a triaging engineer gets a reason, not just a verdict. That gap is what `playwright-flaky-analyzer` was built to close.

## Evolution

### Phase 0 — Core Engine
The foundational decision was made early and never revisited: **fully deterministic, offline, zero external services** (see [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md)). The extractor, classifier (6 outcomes), and statistics engine were built first, because without a reliable cross-run comparison, nothing downstream — investigation, fingerprinting, dashboards — has anything real to work with.

### Phase 1–3 — Investigation Intelligence
On top of the core engine: the 20-rule investigation engine (RC-001–RC-020), DJB2 fingerprinting (`FP-XXXXXX`), and the 9-adjustment confidence model (A1–A9). Each was added as a self-contained layer — the knowledge layer (rule *data*) stays separate from the rule engine (rule *execution*), specifically so new failure patterns don't require touching orchestration logic.

### Phase 4 — Reporting Surface
Four output formats were built against one shared dashboard-JSON model: HTML (interactive, self-contained), JSON (machine-readable), Markdown (PR/Slack-friendly), and AI Assistant (workspace context + prompts for an AI coding assistant such as GitHub Copilot, Claude Code, or Gemini). The custom Playwright reporter was added to close the loop — a way to produce the standardized report schema directly from a Playwright run, rather than relying only on Playwright's native JSON reporter.

### Phase 5 — Pre-Release Validation
Before calling this v1.0.0, the project was tested against six generated scenarios (small-mixed, medium-retry, large-stable, mixed-categories, fingerprint-test, single-run) covering diverse classifications, failure categories, and suite sizes up to 4500 test instances. Findings: 100% classification accuracy on verified scenarios, collision-free fingerprints, and one real gap — an empty evidence array in investigation cards despite classified errors existing internally.

### Phase 6 — Internal Audits
Three internal readiness documents were produced in the run-up to release: `FINAL_AUDIT.md`, `PRODUCTION_READINESS.md`, and `RELEASE_READINESS.md`. They caught real issues — a stale `chalk` dependency reference in setup docs, an `ARCHITECTURE.md` limitations section describing the engine as an unfinished stub (false by that point), and a stale `FINAL_AUDIT.md` referencing the wrong version. All were fixed at the time.

**The lesson that came later:** these internal audits were snapshots, not living checks — and one of them turned out to be wrong in a way that mattered (see below).

## The Biggest Bug: A Passing Audit That Was Wrong

`RELEASE_READINESS.md` — one of the pre-release audits — asserted:

> `npm pack clean ✅ — 76 files, 456 KB unpacked — only src/, templates/, docs`

This was false on two counts, and neither was caught until an independent fresh-install verification was run against the actual published tarball:

1. **`templates/` never existed as a directory.** The claim was aspirational, not verified.
2. **The tarball shipped 24 test files** (`*.test.js`) that `.npmignore` was *supposed* to exclude. The root cause: once `package.json` defines a `"files"` allowlist, npm stops consulting `.npmignore` entirely — a real, easy-to-miss npm behavior. The old `"files": ["src/", ...]` included every file under `src/`, tests included, and `.npmignore`'s `*.test.js` line silently did nothing.

**Compounding it:** `examples/` — referenced directly in the README's own demo command — was never in the `files` allowlist either, so the README's own "try the demo" instructions failed on a real fresh install.

**The most serious issue, however, was in the custom reporter itself.** `src/reporter/PlaywrightReporter.js` exported:

```js
module.exports = { PlaywrightReporter, SCHEMA_VERSION };
```

Playwright's reporter loader, when given a string module path (exactly as the README's own Quick Start recommends), does the equivalent of:

```js
const ReporterClass = require(path).default || require(path);
new ReporterClass(options);
```

Since the export was an object, not the class itself, this threw `TypeError: ReporterClass is not a constructor` — meaning **the README's own primary integration example was broken**, for every user who followed it exactly as written. This had shipped past three internal "release readiness" documents, all marked ✅, because none of them ran the actual integration end-to-end from a clean install.

## The Biggest Fix: Verify From Zero, Not From the Repo

The fix wasn't just changing the export shape (`module.exports = PlaywrightReporter` with `.default`/`.PlaywrightReporter`/`.SCHEMA_VERSION` attached for backward compatibility) and correcting the `files` allowlist. It was changing *how* readiness got verified:

1. Pack a real tarball (`npm pack`), install it into a genuinely empty project (`npm install ./tarball.tgz`) — not just running commands inside the repo, where `node_modules` symlinks and relative paths can hide packaging bugs.
2. Reproduce the reporter bug exactly as Playwright's loader would trigger it, before touching any code — confirming the failure independently rather than trusting the earlier audit's ✅.
3. After the fix, run a **real Playwright test suite** (`@playwright/test` installed fresh, `npx playwright install chromium`, an actual `playwright.config.js` using the documented reporter snippet) through two real runs, then generate all four output formats from the result.
4. Add regression tests that assert the *export shape* directly (`new (require('.../PlaywrightReporter').default || require(...))(options)`), so this specific failure mode can't silently regress — a unit test that only imports and calls the class would not have caught it, since the class itself was correct; only the module's export shape was wrong.

Result: package size dropped from 111.4 kB to 70.1 kB (76 files → 57), and the documented Quick Start now works end-to-end from `npm install` through all four output formats, independently re-verified rather than asserted.

## A Smaller but Real Second Bug

During documentation review for this release, a second doc-vs-implementation mismatch surfaced: `CHANGELOG.md` had **CLS-005 and CLS-006 swapped** — labeling CLS-005 as "Fixed" and CLS-006 as "Regression," backwards from what `src/analyzer/classifier.js` actually assigns (CLS-005 = regression, CLS-006 = fixed). `docs/architecture/ARCHITECTURE.md` had it right; `CHANGELOG.md` didn't. Caught by reading the classifier source directly rather than trusting either document — the same lesson as the reporter bug, applied at a smaller scale.

## Phase 7 — Real Data Finds What Synthetic Fixtures Can't

The Phase 5 validation scenarios were generated fixtures — clean, internally consistent by construction. Running the analyzer against a real multi-project QA suite (three separate Playwright projects, real CI history, a mix of Playwright's built-in `json` reporter and this package's own reporter across different runs) surfaced a cluster of bugs no synthetic fixture would have produced, because the fixtures never had the specific kind of mess real history accumulates:

- **Mixed reporter formats across runs of the same project.** A project whose 3 runs were captured with different reporters (one via Playwright's built-in `json` reporter, others via this package's own) tracked the *same* logical test under two different IDs — inflating totals and duplicating investigation cards. No single-reporter fixture would ever exercise this path.
- **A retry-driven ghost-record bug in the reporter itself.** `PlaywrightReporter.onTestBegin` fires once per attempt, not once per logical test; a retried test could get a second, permanently-empty record. Only visible once a suite with real retries (not a hand-written 2-attempt fixture) was analyzed.
- **A classifier edge case: skip-only and fail-then-skip histories.** `["skipped","skipped"]` and `["failed","skipped","skipped"]` both fell through every specific classification rule into the generic flaky fallback — because no fixture had ever modeled a test that gets conditionally skipped mid-window. Real CI history had several.
- **A confirmed-by-screenshot HTML rendering bug that code review alone would not have caught.** A user reported a stray red line running down the page and a "torn paper" visual artifact. Reading the generated HTML source found nothing wrong — the bug (`renderEvidence()` leaving one `<div>` unclosed, cascading every later card's markup inside the previous one) was only confirmed by *executing* the actual generated `<script>` in a live browser and inspecting real DOM node heights/nesting, not by reading the template strings that produced it. The same class of check — execute the generated script, assert balanced `<div>` tags — became a permanent regression test afterward.
- **Duplicated business logic across output formats.** `ai-assistant.js` had its own, independently-written "which tests are problematic" filter that predated (and didn't track) the same fix already applied in `dashboard-json.js`/`engine.js` — so the HTML dashboard and the AI Assistant `.md` output disagreed on a real dataset (41 vs. 47 "problematic" tests) even though both were supposedly describing the same analysis result.

None of these were found by writing more unit tests against hand-crafted inputs — they were found by pointing the tool at data nobody had designed to be clean, then treating every "that number looks off" from an actual user as a lead worth chasing to its root cause rather than a display quirk to explain away.

## Lessons Learned

1. **A document that says "verified ✅" is a claim, not a fact, until it's re-verified independently against a clean environment.** Three internal audits all missed the same packaging and reporter-export bugs because none of them tested a real fresh install.
2. **`npm pack --dry-run` output is not the same as testing the tarball.** The dry-run correctly listed test files that shouldn't have been there — the gap was in reading it, not in the tool.
3. **Once `package.json` has a `"files"` field, `.npmignore` is not a safety net for anything in that allowlist.** This is documented npm behavior but easy to miss when both files exist side by side.
4. **A reporter's module export shape matters as much as its class implementation.** A perfectly correct class wrapped in the wrong export shape fails exactly the way Playwright's loader consumes it — and only an integration test that mimics the actual consumer catches that.
5. **When two documents disagree with each other (or with the code), read the source, don't average the documents.** This resolved both the reporter bug and the CLS-005/006 mismatch.
6. **Synthetic fixtures validate the logic you thought to write a fixture for.** Real, messy multi-run history — mixed reporter formats, real retries, conditionally-skipped tests — found bugs no hand-written scenario modeled. Treat a real user's "that number looks wrong" as a lead, not a UI quirk, until it's traced to root cause.
7. **A visual bug reported from a screenshot deserves execution, not just code review.** Reading the HTML-generating source found nothing wrong; only running the actual generated script and inspecting live DOM structure did. When a report says "the code looks fine," that's a hypothesis, not a conclusion.
8. **The same computation used in two output formats needs one shared implementation, not two.** `dashboard-json.js` and `ai-assistant.js` independently filtered "problematic tests" and quietly drifted apart after only one of them got a later fix — a lesson that generalizes past this specific bug.

---

## Related Documentation

[← README](./README.md) · [DESIGN_DECISIONS](./DESIGN_DECISIONS.md) · [CHANGELOG](./CHANGELOG.md) · [ROADMAP](./ROADMAP.md)
