# Design Decisions

This document explains *why* the project is built the way it is, not just what it does. For the *what*, see [docs/architecture/ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md).

## Deterministic Rule Engine (No LLM in the Core Path)

**Decision:** Root-cause investigation (RC-001–RC-020) is implemented as pattern-matching rules against error messages, not as calls to an LLM.

**Why:** A flaky-test analyzer's core value is trust — a team needs to believe the tool's classification before they'll act on it. A rule engine is:
- **Reproducible** — the same report always produces the same investigation, which matters when a CI dashboard is compared run-over-run.
- **Auditable** — every rule has an `id`, `code` (RC-XXX), and explicit `pattern`, so "why did it say this was a timeout" has a one-line answer.
- **Free to run** — no API key, no per-analysis cost, no network dependency, no rate limit — important for a tool that runs on every CI build.

**Alternatives considered:**
- *LLM-based root-cause analysis* — richer, more flexible explanations, but non-deterministic (the same failure could get a different explanation between runs) and introduces cost, latency, and an external dependency for a tool whose main pitch is CI-friendliness.
- *Hybrid* — deterministic rules for the common cases, LLM fallback for unmatched patterns. This is explicitly left open via the pluggable provider interface (`src/providers/`) — the mock provider ships today, and the door is open for a GitHub Copilot/Claude/Azure OpenAI-backed provider later (see [ROADMAP.md](./ROADMAP.md)) without changing the deterministic core.

## Deterministic Fingerprinting (DJB2, Not Stack-Trace Hashing)

**Decision:** Related failures are grouped using a DJB2 hash of `classification + failureCategory + errorPattern + rootCauseKey` — not a hash of the stack trace or file/line location.

**Why:** Stack traces and line numbers change every time the test file is refactored, even if the underlying failure is identical. A fingerprint built from *stable characteristics* survives refactors, CI runner differences, and path differences (Windows vs. Linux CI). DJB2 specifically was chosen over cryptographic hashes (SHA-256, etc.) because fingerprint collision resistance at this scale doesn't need cryptographic guarantees — DJB2 is fast, has no dependency, and a 6-character hex output (`FP-XXXXXX`) is short enough to scan visually in a dashboard.

**Alternatives considered:**
- *Stack-trace hashing* — rejected: brittle across refactors and environments, exactly the instability this tool exists to filter out.
- *Cryptographic hash (SHA-256 truncated)* — would work, but adds no real value over DJB2 for this use case and available Node.js built-ins (`crypto`) would still need truncation logic; DJB2 needed no dependency at all.

## Dynamic Confidence Scoring (Evidence-Based Adjustments, Not a Black Box)

**Decision:** Confidence is `clamp(baseConfidence + Σ adjustments, 10, 99)`, where each adjustment (A1–A9) is a named, independently understandable rule (history consistency, transition noise, retry recovery, fingerprint corroboration, data volume).

**Why:** A single opaque "confidence: 73%" number invites the question "says who?". Building it from named, additive adjustments means a user can see *why* a newly-failed test with a corroborating fingerprint across three runs scores higher than an isolated single-run failure — and a maintainer can tune or extend adjustments later without redesigning the scoring model.

**Alternatives considered:**
- *Statistical/ML confidence model* — would require training data this project doesn't have (every user's test suite is different), and would reintroduce the non-determinism the rule engine was designed to avoid.
- *No confidence score, boolean flaky/not-flaky only* — simpler, but discards information a team needs to triage: an isolated one-off failure and a well-corroborated recurring one shouldn't be presented identically.

## Reliability Score — Tried, Then Removed (Observable Metrics Instead)

**Update:** an earlier v1.1 iteration shipped a single, always-computed, 0-100 "Reliability Score" (weighted classification credit: stable/fixed = 1.0, flaky = 0.5, newly-failing/stable-failure = 0.0). After reviewing the actual dashboard, it was removed before release: a single synthesized suite-health number didn't provide enough actionable value to justify existing alongside the classification breakdown it was computed from — a user could already see the same signal (stable/flaky/newly-failing/consistently-failing counts) without a derived score on top. It was **not replaced by another generic score** (no "Health Score Trend," no "Stability Score," nothing FlakeScore-shaped). See [Flaky Tests Trend and Retries Per Run](#flaky-tests-trend-and-retries-per-run-observable-metrics-not-a-generic-score) below for what replaced it, and [CHANGELOG.md](./CHANGELOG.md) for the removal entry. `summary.healthScore` and markdown's `healthPct` — two pre-existing, unrelated formulas — are untouched by either the addition or the removal.

## Flaky Tests Trend and Retries Per Run (Observable Metrics, Not a Generic Score)

**Decision:** Instead of a synthesized score, the dashboard tracks two directly observable counts, both aligned on the same Run 1...N axis for the same N runs already loaded by this analysis (respecting `analyzer.lookbackRuns`, e.g. `--lookback 20`):

- **Flaky Tests Trend** (always on, no flag) — the number of test *cases* the comparison engine classifies as `flaky` as of each analyzed run (`engine.js`'s `buildFlakyTrend()`: for run N, `classify()` is called on each test's outcome history truncated to its first N runs, using the exact same `classify()` function and per-test `history` arrays that produce every test's final classification — not a second definition of flaky). This is cross-run classification, not Playwright's own within-run retry signal — see the correction note below.
- **Retries Per Run** (always on, unchanged in scope) — how many tests needed a retry to pass, for each of the same N runs (`statistics.perRun[i].totalRetries`), with its own connected trend line and takeaway sentence.

Both charts are exposed to the reporters through **one array** (`retryTimeline`, built once in `dashboard-json.js`) so they always show the same runs in the same order on the same Run 1...N axis — a user can visually line up a flaky-count spike in one chart against a retry spike in the other. `retryTimeline[i].retries` still comes from `statistics.perRun[i].totalRetries`; `retryTimeline[i].flaky` comes from the cross-run `flakyTrend` described above. There is still no separate `flakyTrend` field on the public dashboard JSON output and no cross-invocation state — `flakyTrend` is computed internally in the engine and folded into `retryTimeline` before the JSON is built. See [Local Flaky Tests Trend](#local-flaky-tests-trend-cross-invocation-file----tried-then-reversed) below for why a cross-invocation file was tried first and reversed.

**Correction (post-v1.0 development, pre-first-release):** an earlier implementation sourced the Flaky Tests Trend from `statistics.perRun[i].flaky` — Playwright's own within-run retry signal (a test that failed then passed via Playwright's retry mechanism inside one invocation), computed independently per run with no memory of any other run. That answers a different question ("did this run need a recovery on retry?") than what this chart is named for and than what `suiteSummary.flaky`/the Failed Tests cards mean by "flaky" (a test whose outcome alternates across *separate* analyzed runs). The two could disagree — e.g. a suite with zero in-run retries but three separate runs that alternate pass/fail would show an all-zero trend while `suiteSummary.flaky` reported real flaky tests. Fixed by deriving the trend from the same cross-run `classify()` calls as the rest of the report; `statistics.perRun[i].flaky` is untouched and keeps its original, valid meaning where it's still used (Browser Statistics' per-browser flaky counts, and the Markdown Per-Run Breakdown table's own "Flaky" column).

**Why not a score:** a weighted or normalized score adds a layer of interpretation between the user and the data — "why did the score move 3 points?" is a harder question to answer than "why did the flaky count go from 4 to 28?" A raw count tied directly to an existing, already-understood classification bucket is more actionable for the person triaging CI failures, which is this tool's core job.

**Interpretation text describes only observed data:** the "increased/decreased/remained relatively stable" wording compares only the first and last analyzed run's flaky count (`<1` difference is "stable") — a single, easy-to-audit comparison rather than an average over a growing history. It never speculates about *why* the count changed.

## CI Quality Gate: Flaky-Test Count, Not a Generic Score

**Decision:** `--max-flaky <n>` (`config.ci.maxFlaky`, default `null`) is the only CI-gating flag: fail the build when the flaky-test count exceeds `n`. It is evaluated **after** the report has already been generated and written to disk, so a failing gate fails the *build*, never the *report* — the HTML/JSON/Markdown output is always available for triage regardless of the gate's outcome. With no threshold configured, the exit code is unchanged from before this feature existed: `0` if analysis produced output, `1` on any error. A gate failure also exits `1` (not a distinct code) — deliberately kept simple rather than adding a second exit-code contract for callers to learn.

**Why flaky count, and not newly-failing or consistently-failing count:** those two candidates were evaluated and rejected. A newly-failing or consistently-failing test already fails the underlying `playwright test` command's own exit code in any normal CI setup that doesn't swallow it — gating on either would just duplicate a signal CI already has. A **flaky** test, by contrast, typically *passes* on Playwright's own retry, so Playwright's exit code stays green even as the suite degrades — that blind spot is this tool's entire reason to exist, making flaky count the one gate that adds genuinely new enforcement value.

**Why one flag, not several:** a second or third gate (newly-failing count, consistently-failing count) would give users multiple overlapping knobs to reconcile for a benefit the reasoning above shows is largely redundant with existing CI behavior. One threshold, tied to the one metric that isn't already enforced elsewhere, keeps the CLI surface small. This isn't a hard rule against ever adding more — see [ROADMAP.md](./ROADMAP.md) — but the bar is "does it add a signal Playwright/CI doesn't already provide," not "is it more data we have."

## Local Flaky Tests Trend: Cross-Invocation File — Tried, Then Reversed

**Update:** an earlier v1.1 iteration shipped `--history-file <path>` (`config.output.historyFile`), which appended each run's flaky-test count to a small local JSON file (`src/analyzer/history.js`) so the trend accumulated **across separate analyzer executions/CI builds** over time, capped at 50 entries. It was removed before release in favor of the within-analysis design described above.

**Why it was reversed:** the cross-invocation file introduced a second, independent data source alongside `statistics.perRun` — two things that both claim to describe "the flaky trend" but that can drift out of sync (different run windows, different machines, a missing/reset history file producing a misleadingly flat or empty trend, as observed when demoing against a fixed dataset re-analyzed multiple times with no new data). It also required the user to manage file persistence themselves (a cache step in CI) just to see a trend at all, and its own Run-axis had no natural correspondence to the Retries Per Run chart's Run-axis, so the two charts couldn't be visually compared. Rebuilding the Flaky Tests Trend on `statistics.perRun` — data already loaded and already rendered for Retries Per Run — removes the second data source entirely: one array, one Run 1...N axis, both charts always in agreement, no file I/O, no flag, nothing to configure.

**What this gives up, deliberately:** the trend no longer spans separate CI builds over time — it's scoped to whatever `analyzer.lookbackRuns` (or `--lookback`) loads for a single invocation. A genuine cross-build/cross-machine trend store remains a legitimate, separate v2+ idea — see [ROADMAP.md](./ROADMAP.md) — but it wasn't this feature, and conflating the two was the mistake being corrected here.

## Self-Contained HTML Dashboard (No Server, No Build Step)

**Decision:** The HTML Dashboard is one file — CSS and JS inlined, no CDN links, no bundler output, openable directly from the filesystem.

**Why:** The primary consumption context is CI artifacts — a file downloaded from a build and opened locally, or attached to a PR comment. A dashboard that needs a running server or network access to render its own styles would fail exactly in the environment it's meant for (an isolated CI runner, an offline review). Zero external dependencies also means the HTML file works unmodified five years from now — no dead CDN links.

**Alternatives considered:**
- *React/Vue SPA with a build step* — richer interactivity, but adds a build pipeline to a project that otherwise has none ("Build: nothing to compile" is a deliberate `npm run build` message), and a compiled bundle is harder to audit by reading the source directly.
- *Server-rendered dashboard (Express app)* — rejected outright: requires a running process, which doesn't fit a CI-artifact-first workflow.

## Offline-First, Zero External Services at Runtime

**Decision:** The analyzer makes no network calls. Two production dependencies total (`commander` for CLI parsing, `winston` for logging).

**Why:** A tool that analyzes CI test results needs to *itself* be trustworthy CI infrastructure — no flaky external API, no vendor outage taking down the flaky-test dashboard, no data leaving the CI environment (relevant for teams with strict data-egress policies). Minimizing dependencies also minimizes the supply-chain surface area for a tool that will run on every build.

**Alternatives considered:** None seriously — this was a founding constraint, not a later optimization. Every feature (investigation, fingerprinting, confidence, dashboard) was designed to fit within it rather than reaching for an external service and scoping down later.

## Package Architecture: Explicit `exports` Map Over Deep Imports

**Decision:** `package.json` exposes exactly two subpaths — `.` (main API) and `./reporter` (the Playwright reporter class) — via Node's `exports` field, rather than letting consumers `require()` any file under `src/`.

**Why:** An explicit export surface is a contract. Without it, any internal file reorganization is a breaking change for anyone who happened to `require('playwright-flaky-analyzer/src/reporter/dashboard-json')` directly. With it, internals can be refactored freely as long as the two public entry points keep working. This was tightened during v1.0 hardening after discovering the reporter's own export shape didn't match how Playwright's reporter loader consumes a string module path (see [DEVELOPMENT_JOURNEY.md](./DEVELOPMENT_JOURNEY.md)).

**Alternatives considered:**
- *No `exports` field, rely on `main` only* — simpler, but leaves every internal file implicitly public, which is what caused the confusion this decision fixes.
- *Export everything under `src/` via a wildcard* — considered, but re-opens the same problem: internal refactors become breaking changes for anyone using deep paths.

## Investigation Engine as a Layered System (Knowledge → Rules → Confidence → Dashboard)

**Decision:** Root-cause logic is split into a knowledge layer (`src/knowledge/rules/` — pure pattern/priority/category data, no orchestration logic) and an orchestration layer (`src/investigation/rule-engine.js` — runs rules, computes confidence, hands the result to the dashboard builder).

**Why:** Keeping rule *data* separate from rule *execution* means adding a new failure pattern (a new HTTP status code, a new framework's error format) is a matter of adding one file to `src/knowledge/rules/` and registering it — no changes to matching, prioritization, or confidence logic. This was a deliberate extension point (see [ARCHITECTURE.md § Extension Points](./docs/architecture/ARCHITECTURE.md#extension-points)).

**Alternatives considered:**
- *One monolithic rules file* — faster to write initially, harder to extend or test in isolation; ruled out once the rule count reached double digits.

## Regression Folded Into Newly Failing

**Decision:** A fail→pass→fail ("was fixed, broke again") pattern still matches rule `CLS-005`, but is reported under the `newly_failed` outcome rather than a separate `regression` outcome. The rule id is preserved (and still upgrades the card's border to the same red used for `stable_failure`), but there is no independent "Regression" count or card in the Suite Summary.

**Why:** In practice, "newly failing" and "regression" were answering the same question a triaging engineer actually asks — *is this currently broken, and did it use to work?* — with a distinction (whether the break happened once or is the *second* time) that added a card/count without changing what action anyone took. Splitting it out also fragmented an already-small failing-tests view into more buckets than the data usually justified. Keeping the rule id means the "this test was fixed once already" context isn't lost — it still shows up in the card's classification reasons and still gets the more severe border color — it's just not a fifth thing to count separately.

**Alternatives considered:**
- *Keep Regression as a fully separate outcome* — the original design; reverted after real dashboards showed it splitting a small number of already-rare cases into a bucket most users didn't act on differently from "newly failing."
- *Drop the CLS-005 rule entirely* — rejected: it would lose the "this broke, got fixed, broke again" signal in the card's reasons, which is useful context even without a dedicated count.

## Skipped Tests as Their Own Bucket, Excluded From Classification

**Decision:** A test whose true latest-run outcome is `skipped` gets its own "Skipped" bucket in the Suite Summary and header chips, and is excluded from every classification bucket (`stable_pass`/`flaky`/`newly_failed`/etc.) — but it's still counted inside the visible **Total**, not excluded from it.

**Why:** A skipped test carries no pass/fail signal for the run it was skipped in, so folding it into any classification bucket would misrepresent it — a test skipped once amid otherwise-consistent passes isn't "flaky," and a test that's skipped every run isn't "consistently failing." At the same time, hiding it from the Total entirely made the header chips not add up to what was visibly on screen (Passing + Flaky + Failed + Skipped must equal Total) — which is confusing on its own terms regardless of whether Skipped "counts" toward stability. `activeOutcomes` (in `classifier.js`) and the skip-exclusion in `engine.js`'s `buildSummary()` both treat `skipped`/`interrupted`/`missing` uniformly as no-signal runs, for the same reason.

**Alternatives considered:**
- *Exclude Skipped from Total* — the original implementation; reverted once it became clear the four visible chips (Passing, Flaky, Failed, Skipped) not summing to the visible Total number was confusing regardless of the underlying rationale.
- *Fold Skipped into Flaky or Stable Pass depending on other runs* — rejected: would require guessing intent behind a skip (conditional skip logic, environment gating, etc.) that the tool has no reliable signal for.

## Confidence Shown Only When Below Threshold (Quiet by Default)

**Decision:** An investigation *card's* confidence score is hidden by default — it's only rendered, with a "Needs Review" flag, when it falls below a fixed confidence threshold (70%). The **Root Cause Summary table** is the exception: because it's a compact, scannable triage list, it shows a plain per-row Confidence % for every row, with any row below the threshold flagged by a warning badge. Every confidence number (card or table) carries a plain-language tooltip explaining how it was reached.

> **Update:** confidence is now treated purely as an internal triage signal. The review threshold was originally a user-configurable `analyzer.confidenceThreshold` option; that knob has since been retired in favor of a fixed 70% constant, since the score is no longer a headline number a user tunes.

**Why:** A high-confidence classification (the common case) doesn't need to justify itself on every card — showing "94% confidence" next to every single investigation is noise that trains users to stop reading it. The number matters precisely when it's *low*, because that's the signal that a human should double-check the classification rather than trust it outright. Making it quiet-by-default and only surfacing it as an exception (rather than a number on every card) keeps the common case clean and puts attention exactly where it's needed.

**Alternatives considered:**
- *Always show the confidence score* — the original design; every card carrying a number regardless of whether it changed any triage decision, which just added visual noise to the majority of cards where confidence was already high.
- *Show confidence as a always-visible column but grey it out when high* — still occupies space and attention on every row; rejected in favor of only rendering it when it's actionable.

## Evidence Defaults to the Most Recent Run, With a Per-Run Picker

**Decision:** A failing test's Evidence field (screenshot/trace/video) defaults to whichever *analyzed run* most recently captured any, and offers a `<select>` picker to switch to any other analyzed run that also captured evidence. Evidence is tracked **per run** (`evidenceByRun[]` in `src/analyzer/engine.js`, index-aligned with the test's cross-run `history[]`), not aggregated across the whole window.

**Why the default changed:** the original implementation picked whichever run's trace/video was found *first* while walking the analyzed window in run order — which meant the oldest failing run's evidence won, not the newest. For a test that's still failing today, showing a screenshot from weeks ago is actively unhelpful. Scanning `evidenceByRun` backward and taking the first non-null entry fixes this with no new data model: it's the same per-run array, just read from the other end.

**Why per-run rather than one aggregated blob:** the earlier design concatenated every run's screenshots into one flat list and kept only one trace/video (whichever was found first) — so a test failing across 20 runs had no way to see *which* run a given screenshot belonged to, and no way to look at an older run's trace at all. Making evidence explicitly per-run, with a picker that only lists runs that actually have something to show, keeps the common case (one click, see the latest failure) unchanged while making history genuinely inspectable.

**Alternatives considered:**
- *Show all runs' evidence at once, stacked* — quickly becomes an unusable wall of thumbnails for a test failing across many runs; rejected in favor of one run at a time, chosen explicitly.
- *Keep the aggregated single evidence blob, just fix the "which run wins" default* — would have fixed the immediate defaulting bug but permanently closed off ever inspecting an older run's evidence; the per-run array was a small enough change to do properly instead.

## JSON Output Made Opt-In for HTML Format

**Decision:** `--format html` writes only the `.html` file by default. The companion `flaky-analysis.json` dashboard-data file is only written when `--also-json` is passed (or `output.alsoJson: true` is set in config).

**Why:** Most users open the HTML dashboard directly and never touch the JSON — it was previously written unconditionally alongside every HTML report, which meant every `analyze --format html` run left a second file on disk nobody asked for. Users who *do* need the raw dashboard JSON (e.g. a CI step that reads specific numbers back out, or `--format json` directly) still have a first-class way to get it — it just isn't a silent side effect of asking for HTML.

**Alternatives considered:**
- *Always write both* — the original behavior; simple, but violated the principle that a command should produce the output you asked for, not an extra file as a side effect.
- *Never write the JSON alongside HTML, require a separate `--format json` run* — rejected: would mean re-running the entire analysis a second time just to get both files from a single CI step, wasteful when the dashboard JSON is already fully computed in memory during the HTML run.

---

## Related Documentation

[← README](./README.md) · [ARCHITECTURE](./docs/architecture/ARCHITECTURE.md) · [DEVELOPMENT_JOURNEY](./DEVELOPMENT_JOURNEY.md) · [KNOWN_LIMITATIONS](./KNOWN_LIMITATIONS.md) · [ROADMAP](./ROADMAP.md)
