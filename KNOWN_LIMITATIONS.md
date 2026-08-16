# Known Limitations

What's true about this tool today — not a bug list, and not a promise of what's changing. For planned work addressing some of these, see [ROADMAP.md](./ROADMAP.md). For *why* some of these are deliberate trade-offs rather than oversights, see [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md).

## Analysis Scope

- **Requires 2+ runs.** A single-run results directory produces a clear "Need at least 2 valid reports for comparison" message rather than an analysis — there's nothing to compare against yet. 5–10 runs give the most reliable flaky detection.
- **Single-project analysis only.** No multi-repo or monorepo aggregation — each analysis compares runs from one results directory.
- **Stateless across invocations — the analyzer itself has no persistence mechanism.** The tool only knows about the report files present in the results directory at analysis time; there's no server-side or hosted trend database, and no analyzer-managed history file. The Flaky Tests Trend chart is scoped to the runs loaded by the current analysis (`analyzer.lookbackRuns`, e.g. the last 20 runs) — it shows how the flaky-test count moved across that window, not a persisted history that survives between separate `analyze` invocations by itself. A cross-invocation history file was tried and deliberately removed — see [DESIGN_DECISIONS.md § Local Flaky Tests Trend](./DESIGN_DECISIONS.md#local-flaky-tests-trend-cross-invocation-file----tried-then-reversed) — because it introduced a second data source that could drift out of sync with the runs actually being analyzed. **If you want the trend to span separate CI builds, the persistence has to live in your CI pipeline, not the analyzer**: keep the reporter writing into the same directory across builds (e.g., an Azure Pipelines `Cache@2` step restoring/saving that directory — see [docs/azure-pipelines.example.yml](./docs/azure-pipelines.example.yml)), so a later `analyze --lookback 20` simply has more of the reporter's own ordinary `results-run<N>.json` files to compare — no new mechanism inside the analyzer, just more of its normal input on disk.

## Flaky Detection

- **In-run retry flakiness isn't reflected in classification (partially surfaced in the UI).** If a test fails, retries, and passes within a run, its *per-run* outcome still looks like a clean pass — cross-run classification (`stable_pass`/`flaky`/etc.) doesn't account for in-run retries and won't flag such a test as flaky, even though Playwright's retry mechanism is doing real work underneath. The HTML Dashboard's **Passing on Retry** suite-summary tile does now surface this — it flags currently-passing tests that only passed because of a retry — but it reflects the *latest run only*, not a run-over-run pattern, and it has no effect on the classification itself. Fully accounting for this in classification remains tracked in [ROADMAP.md](./ROADMAP.md).
- **Rule engine is first-match, not multi-rule.** Investigation rules (RC-001–RC-020) are priority-ordered, and the first matching rule wins — a failure with two plausible contributing causes only surfaces the higher-priority one, not both.
- **Fingerprints group by stable characteristics, not forensic uniqueness.** DJB2 fingerprints (`FP-XXXXXX`) are deterministic but not cryptographically collision-resistant, and are built from classification + failure category + error pattern + root cause — not suitable as a forensic/security-grade deduplication mechanism.

## Reporter

- **Stack traces depend on the error object having a `.stack` field.** Most Playwright error objects do; a third-party reporter or unusual error shape might not, in which case the evidence for that failure will be sparser.
- **Screenshot/trace/video capture depends on the *consuming* project's Playwright config, not this package.** The analyzer only surfaces whatever attachments Playwright actually wrote (e.g. `screenshot: 'retain-on-failure'`, `trace: 'retain-on-failure'`, `video: 'retain-on-failure'` in your own `playwright.config.js`). A suite run with `screenshot: 'off'` (or the literal string `'false'`, which Playwright treats as a truthy option value rather than disabling it) will never have screenshot evidence to show, regardless of analyzer version.
- **Evidence portability depends on the copy-evidence mode.** By default (`output.copyEvidence: true`), the HTML report is a **portable bundle**: screenshots/videos/traces are copied into `assets/` and linked with relative paths, so evidence survives even if the original `test-results/` directory is cleaned, and the whole folder can be zipped and shared. With `--no-copy-evidence`, the report is a single `.html` that references evidence via absolute `file://` URLs — those links **will 404** if the original files are moved, cleaned, or the report is opened on another machine.
- **Playwright traces can't open *inside* the browser, even in a bundle.** A `.zip` trace needs Playwright's Trace Viewer, not a plain browser tab. The report therefore ships the copied trace as a **downloadable asset** with instructions (drag onto `trace.playwright.dev`, or run `npx playwright show-trace <file>`); it can't auto-launch the viewer offline. Screenshots (lightbox) and videos (inline `<video>`) *do* work directly in the report.
- **Bundle size scales with evidence.** Copying evidence duplicates it next to the report (deduped so each unique file is copied once). A suite with many large videos/traces produces a correspondingly large bundle; use `--no-copy-evidence` if you need a tiny report and can guarantee the original artifacts stay put. Remote (`http(s)://`) evidence references are left as-is, not downloaded into the bundle.
- **Reporter-side evidence archiving also grows disk usage over time.** Separately from bundle size above, the reporter archives each attempt's attachments into a run-scoped evidence directory as it runs (see README § Custom Reporter), so that evidence for an earlier flaky failure survives later runs. Because this keeps a copy per historical run rather than only the latest one, the archive grows as your `results-run<N>.json` history accumulates — there's currently no built-in pruning of older runs' archived evidence.
- **Evidence run picker only offers runs that actually captured evidence.** A failing test's Evidence field defaults to its most recent run with a screenshot/trace/video and lets you switch to any *other* analyzed run that also captured some — but a run where the test passed cleanly on the first attempt never has evidence (Playwright itself doesn't produce any under a typical `retain-on-failure` config), so it's never offered as a picker option. This isn't a gap in the picker — there's genuinely nothing to show for those runs.

Two related issues from earlier validation passes were traced to root cause and fixed rather than remaining open: a ghost-duplicate test record from retried tests (`PlaywrightReporter.onTestBegin` firing once per attempt — see [REPORTER.md](./docs/architecture/REPORTER.md#lifecycle-hooks)), and evidence (stack trace, in particular) being pulled from the wrong run's error object. Reports generated with an older analyzer version and reused with a newer one are unaffected — dedup and re-extraction both happen at analysis time, not at report-generation time.

## Failure Categorization

- **Some category boundaries are approximate.** A locator-not-found error whose message happens to contain the word "timeout" can be classified under the timeout category instead of locator; HTTP 5xx and connection-level network errors are intentionally separated (backend vs. network) but the split relies on pattern matching against error text, which isn't foolproof for unusual error formats.

## HTML Dashboard

- **Single-page, client-rendered, no server.** By design (see [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md)) — this means no server-side filtering of very large datasets; all filtering/search happens in the browser against the embedded data.
- **No progress indicator for very large suites.** Analysis of a multi-thousand-test suite still completes in well under a second, but the CLI only logs "Comparing N runs..." with no incremental progress output.

## Terminology Consistency Across Formats

The HTML Dashboard is the canonical terminology used throughout this documentation ("Passing," "Consistently Failing," "Newly Failing"). The Markdown output format currently renders the same underlying classifications with slightly different label text in places (e.g., "Stable Failure," "Newly Failed"). Both describe the identical classification — this is a labeling inconsistency between output formats, not a difference in behavior, and is worth aligning in a future release.

## Compatibility

- **Custom reporter requires Playwright's Reporter API surface.** Documented as Playwright >= 1.30.0 — the reporter depends on `onBegin`/`onTestBegin`/`onTestEnd`/`onEnd`/`printsToStdio`, which has been stable across that range, but hasn't been exhaustively tested against every intermediate version.
- **The analysis engine itself is test-runner agnostic** (it accepts any JSON matching the expected schema), but the bundled custom reporter is Playwright-specific.

## Reporting a Limitation Not Listed Here

If you hit a gap not described above, please open an issue — see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Related Documentation

[← README](./README.md) · [ROADMAP](./ROADMAP.md) · [DESIGN_DECISIONS](./DESIGN_DECISIONS.md) · [ARCHITECTURE](./docs/architecture/ARCHITECTURE.md)
