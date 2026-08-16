# Roadmap

This roadmap tracks where the project has been and where it's realistically headed. It is not a commitment to dates — see [CHANGELOG.md](./CHANGELOG.md) for what has actually shipped.

## Completed in v1.0

- Cross-run comparison engine with 6 classification outcomes (CLS-001–CLS-006: passing, consistently failing, flaky, newly failing, regression, fixed)
- 20 deterministic investigation rules (RC-001–RC-020) covering timeout, locator, assertion, network, auth, HTTP, and race-condition patterns
- Deterministic DJB2 failure fingerprinting (`FP-XXXXXX`)
- 8-category failure classification (locator, timeout, data, assertion, network, backend, authentication, environment)
- Self-contained, offline HTML Dashboard (light/dark theme, search, filtering, accessibility)
- JSON, Markdown, and Copilot-ready output formats
- Custom Playwright reporter with a stable public export path (`playwright-flaky-analyzer/reporter`)
- Browser-aware statistics (chromium, firefox, webkit, and dynamic project names)
- CLI (`analyze`, `init`) built on Commander
- 587 automated tests, zero runtime dependencies beyond `commander` and `winston`

## Completed Since v1.0 (Unreleased)

Driven by running the analyzer against real, messy multi-project data rather than synthetic fixtures — full details in [CHANGELOG.md](./CHANGELOG.md):

- **Evidence population in investigation cards** — was tracked below as a v1.1 item; turned out to be two separate, real bugs (an evidence field pulling the wrong run's error, and raw filesystem paths that weren't clickable `file://` URLs) — both fixed.
- Regression classification folded into Newly Failing; a "Skipped" bucket added; confidence hidden from the UI (kept as an internal review signal, with its user-configurable threshold retired); a real HTML card-nesting bug fixed; Browser Statistics/Failure Categories gained a Latest Run/All Runs toggle; `--also-json` made the companion JSON opt-in for HTML output.
- **AI Investigation (enrichment layer) — prototyped, not yet integrated into a release.** An additive AI interpretation layer over the deterministic analysis was built in a working branch (offline file-feedback plus an opt-in network reference adapter); it is not part of this or any released version yet — tracked as a future idea below.
- **Reliability Score — shipped internally, then removed before release.** A single, always-computed 0-100 suite-stability score was built and then deliberately removed after review found it didn't add enough actionable value over the existing classification breakdown; it was not replaced by another generic score. See [DESIGN_DECISIONS.md § Reliability Score — Tried, Then Removed](./DESIGN_DECISIONS.md#reliability-score--tried-then-removed-observable-metrics-instead).
- **Flaky Tests Trend** — always-on chart (no flag), one bar per run plus a connected trend line, aligned with Retries Per Run on the same Run 1...N axis, with a plain-language first-vs-last interpretation, for the same runs already loaded by this analysis. Built from cross-run flaky-test **classification** (`engine.js`'s `buildFlakyTrend()`, the same `classify()` logic and per-test `history` arrays that produce every test's final classification) — an earlier implementation sourced it from `statistics.perRun[].flaky` (Playwright's own in-run retry signal) instead, which was corrected in 1.0.2 (see [CHANGELOG.md](./CHANGELOG.md)). A separate cross-invocation `--history-file` version was also tried first and reversed — see [DESIGN_DECISIONS.md § Flaky Tests Trend and Retries Per Run](./DESIGN_DECISIONS.md#flaky-tests-trend-and-retries-per-run-observable-metrics-not-a-generic-score) and [§ Local Flaky Tests Trend](./DESIGN_DECISIONS.md#local-flaky-tests-trend-cross-invocation-file----tried-then-reversed).
- **Retries Per Run trend line** — the existing within-analysis chart now draws a connected trend line over its bars, alongside its existing takeaway sentence.
- **CI quality gate** — opt-in `--max-flaky <n>` (fail when the flaky-test count exceeds this number), evaluated after the report is written so a failing gate never blocks the report. No gate unless configured; exit-code behavior is otherwise unchanged. Chosen over a newly-failing or consistently-failing threshold because those are already enforced by Playwright's own CI exit code — see [DESIGN_DECISIONS.md § CI Quality Gate](./DESIGN_DECISIONS.md#ci-quality-gate-flaky-test-count-not-a-generic-score).

## Planned for v1.1

These are still-open findings identified during pre-release validation — not new feature ideas:

- **Category filtering in Failed Tests — not done.** Clicking a category chip (Locator, Network, Timeout, ...) in the Failed Tests toolbar narrows the card list to just that category, combinable with the existing classification filter and search. What's still missing: a grouped/sorted view of the *full* list by category (all tests visible, same-category tests adjacent) without having to filter others out one category at a time.
- **Finer-grained failure categories** — split HTTP 5xx ("backend") from connection-level network errors more consistently, and give element-detached/stale-element failures their own sub-classification instead of folding into generic "stability" (R2/R3)
- **Timeout vs. locator disambiguation** — adjust rule priority so a locator-not-found error containing the word "timeout" isn't misclassified as a pure timeout (R5)
- **Progress indicator for large suites** — CLI feedback for multi-thousand-test analyses beyond the current "Comparing N runs..." line (R6)
- **CI workflow hardening** — extend `.github/workflows/ci.yml` with lint/format checks and a published coverage summary

## Future Ideas (v2+)

Directional only — not scoped, not committed:

- **Cross-invocation / cross-machine historical trend database** — a local flat-file version of this (`--history-file`) was tried in v1.1 and deliberately reversed in favor of a within-analysis trend built from `statistics.perRun` — see [DESIGN_DECISIONS.md § Local Flaky Tests Trend](./DESIGN_DECISIONS.md#local-flaky-tests-trend-cross-invocation-file----tried-then-reversed). The analyzer itself still ships nothing that persists flaky/retry counts across separate CI builds — that responsibility sits entirely with the caller's CI pipeline now (e.g. an Azure Pipelines cache step keeping the reporter's own `results-run<N>.json` files around between builds — see [docs/azure-pipelines.example.yml](./docs/azure-pipelines.example.yml) and [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)), which is deliberately just "more ordinary input on disk," not a second history mechanism. What remains here as a genuinely separate idea is a server-backed store (e.g. SQLite behind a small service, or a hosted option) that aggregates trends across machines/CI agents without the caller managing file persistence themselves
- **In-run retry flakiness reflected in classification** — the HTML Dashboard's Passing on Retry tile now surfaces, for the latest run, which currently-passing tests only passed because of a retry (see [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)). What's still open: detecting when this pattern repeats *consistently run-over-run* and reflecting that in the classification itself (e.g. flagging it distinctly from a clean `stable_pass`), rather than only a latest-run snapshot (R4)
- **AI investigation providers** — a pluggable provider registry with an offline mock/file provider plus a network reference adapter (`anthropic`), each vendor an adapter file + one `register()` call, no core change
- **Multi-repo / monorepo aggregation** — compare flaky trends across multiple Playwright projects in one dashboard
- **Native GitHub Actions annotation output** — a fifth output format that emits `::warning::`/`::error::` workflow commands directly

## How This Roadmap Is Maintained

Roadmap items move to `CHANGELOG.md` when they ship, not before. If you'd like to propose an item, open an issue — see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Related Documentation

[← README](./README.md) · [CHANGELOG](./CHANGELOG.md) · [KNOWN_LIMITATIONS](./KNOWN_LIMITATIONS.md) · [DEVELOPMENT_JOURNEY](./DEVELOPMENT_JOURNEY.md) · [CONTRIBUTING](./CONTRIBUTING.md)
