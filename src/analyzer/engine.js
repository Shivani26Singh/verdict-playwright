const { normalizeReport } = require("./extractor");
const { classify, OUTCOMES } = require("./classifier");
const { compute } = require("./stats");
const { classifyErrors } = require("./failure-classifier");

function compare(reports, config) {
  if (!Array.isArray(reports) || reports.length < 2) {
    throw new Error(`compare requires at least 2 reports, got ${reports ? reports.length : 0}`);
  }

  const minTransitions =
    config && config.analyzer && typeof config.analyzer.minFailures === "number"
      ? config.analyzer.minFailures
      : 2;

  const runMaps = reports.map((report, i) => ({
    index: i,
    metadata: extractMetadata(report),
    tests: normalizeReport(report),
  }));

  const allTestIds = collectAllTestIds(runMaps);

  const results = [];

  for (const id of allTestIds) {
    const history = [];
    // Retries needed to pass, per run (same index as `history`) — `null` for
    // a run where the test is missing/didn't pass. Unlike passedOnRetry/
    // retriesToPass below (which only reflect the LATEST run), this lets the
    // UI show "passed on retry" for any run in the window, not just the last.
    const retriesPerRun = [];
    let primaryFile = null;
    let primaryTitle = "";
    let primaryTags = [];
    let lastErrors = [];
    let allFailedErrors = [];
    // Overwritten on every failing run (never reset to [] by a later pass,
    // unlike lastErrors) — so after the loop it holds the MOST RECENT
    // failing run's errors. Used only to pick a display-primary error below;
    // never fed into classifyErrors (that still reads allFailedErrors/
    // lastErrors exactly as before).
    let latestFailingRunErrors = [];
    let primaryBrowser = "";
    // Per-run evidence, same index as `history` — `null` for a run with no
    // captured evidence (passed cleanly, or missing). Preserved per-run
    // (rather than aggregated) so the UI can offer a "view this run's
    // screenshots/trace/video" picker instead of only ever showing one run's
    // worth of evidence.
    const evidenceByRun = [];
    let lastRunRetriesToPass = 0;
    let lastRunPassedOnRetry = false;
    let lastRunRetryFailureErrors = [];

    for (const run of runMaps) {
      const test = run.tests.get(id);
      if (test) {
        history.push(test.outcome);
        retriesPerRun.push(test.outcome === "passed" ? test.retriesUsedToPass || 0 : null);
        primaryFile = primaryFile || test.file;
        primaryTitle = primaryTitle || test.title;
        primaryBrowser =
          primaryBrowser || test.browser || (test.titlePath && test.titlePath[1]) || "";
        primaryTags = mergeTags(primaryTags, test.tags);
        lastRunRetriesToPass = test.retriesUsedToPass || 0;
        lastRunPassedOnRetry = test.outcome === "passed" && lastRunRetriesToPass > 0;
        lastRunRetryFailureErrors = test.retryFailureErrors || [];
        if (test.outcome === "failed") {
          lastErrors = test.errors;
          if (test.errors && test.errors.length > 0) {
            allFailedErrors = allFailedErrors.concat(test.errors);
            latestFailingRunErrors = test.errors;
          }
        } else {
          lastErrors = [];
        }
        // Evidence for THIS run only — either the run's final outcome failed,
        // or it failed once and then passed on retry. extractEvidence()
        // already scopes to failed attempts internally, so this is never
        // populated for a run that passed cleanly on the first try.
        evidenceByRun.push(test.evidence || null);
      } else {
        history.push("missing");
        retriesPerRun.push(null);
        evidenceByRun.push(null);
      }
    }

    const classificationResult = classify(history, { minTransitions });

    const previousOutcomes = history.slice(0, -1);
    const lastOutcome = history[history.length - 1];
    const stabilityScore = computeStabilityScore(history);

    const errorsForClassification = allFailedErrors.length > 0 ? allFailedErrors : lastErrors;
    const failureClass = classifyErrors(errorsForClassification);
    const retryFailureClass = classifyErrors(lastRunRetryFailureErrors);

    // DISPLAY-ONLY: which error the report should headline as "the" error
    // for this test. allFailedErrors is oldest-failing-run-first, so
    // allFailedErrors[0] (what the report used to show) is often a stale,
    // less-informative error from an earlier failure rather than what's
    // actually happening now. Prefer the most recent failing run's first
    // error instead; never affects errorsForClassification/failureClass above.
    const primaryError =
      latestFailingRunErrors.length > 0
        ? latestFailingRunErrors[0]
        : allFailedErrors.length > 0
          ? allFailedErrors[allFailedErrors.length - 1]
          : null;

    // Default evidence shown on the card: the MOST RECENT run that has any
    // (not the oldest, and not every run's screenshots concatenated together)
    // — a user investigating a still-failing test wants to see what it looks
    // like now, not what it looked like N runs ago. Older runs remain
    // available individually via `evidenceByRun` (see the evidence run picker
    // in html.js).
    var evidence = null;
    for (let ei = evidenceByRun.length - 1; ei >= 0; ei--) {
      if (evidenceByRun[ei]) {
        const latest = evidenceByRun[ei];
        evidence = { stackTrace: null };
        if (latest.screenshots) evidence.screenshots = latest.screenshots;
        if (latest.trace) evidence.trace = latest.trace;
        if (latest.video) evidence.video = latest.video;
        break;
      }
    }

    results.push({
      id,
      title: primaryTitle,
      browser: primaryBrowser,
      file: primaryFile,
      tags: primaryTags,
      history,
      retriesPerRun,
      classification: classificationResult.outcome,
      classificationReasons: classificationResult.reasons || [],
      classificationRuleId: classificationResult.ruleId || null,
      lastOutcome,
      previousOutcomes,
      firstSeenRun: runIndexLabel(history.findIndex((o) => o !== "missing")),
      lastSeenRun: runIndexLabel(
        history.length - 1 - [...history].reverse().findIndex((o) => o !== "missing")
      ),
      stabilityScore,
      errors: allFailedErrors.length > 0 ? allFailedErrors : lastErrors,
      primaryError: primaryError,
      failureCategory: failureClass.category,
      classifiedErrors: failureClass.errors,
      runCount: runMaps.length,
      evidence: evidence,
      evidenceByRun: evidenceByRun,
      passedOnRetry: lastRunPassedOnRetry,
      retriesToPass: lastRunRetriesToPass,
      retryFailureErrors: lastRunRetryFailureErrors,
      retryFailureCategory: retryFailureClass.category,
      classifiedRetryFailureErrors: retryFailureClass.errors,
    });
  }

  results.sort((a, b) => {
    // classify() never emits OUTCOMES.REGRESSION anymore — a fail->pass->fail
    // pattern is reported as NEWLY_FAILED (see classifier.js) — so it has no
    // slot of its own here.
    const order = [
      OUTCOMES.STABLE_FAILURE,
      OUTCOMES.NEWLY_FAILED,
      OUTCOMES.FLAKY,
      OUTCOMES.FIXED,
      OUTCOMES.STABLE_PASS,
    ];
    return order.indexOf(a.classification) - order.indexOf(b.classification);
  });

  const summary = buildSummary(results, runMaps);
  const statistics = compute(reports);
  const flakyTrend = buildFlakyTrend(results, runMaps, minTransitions);

  return {
    summary,
    results,
    statistics,
    flakyTrend,
    runs: runMaps.map((r) => r.metadata),
    schemaVersion: "1.0.0",
    analyzerVersion: require("../../package.json").version,
  };
}

// Cross-run flaky count AS OF each analyzed run — for run N, how many tests
// classify() would call FLAKY using only the outcomes observed in runs 1..N.
// Reuses the exact same classify() function and per-test `history` arrays
// already built above (the same ones classificationResult came from) — there
// is no second definition of "flaky," and this is NOT statistics.perRun[].flaky
// (Playwright's own in-run retry flakiness within a single invocation; see
// stats.js's isFlaky). A test whose outcome at run N itself is "skipped" is
// excluded from run N's count, mirroring buildSummary()'s skip-latest
// exclusion — applied here to each prefix's own latest run, not just the
// final one, so an intermediate point behaves the same way the final point
// already does today.
function buildFlakyTrend(results, runMaps, minTransitions) {
  return runMaps.map((run, i) => {
    const n = i + 1;
    let flakyCount = 0;
    for (const r of results) {
      const prefix = r.history.slice(0, n);
      if (prefix[prefix.length - 1] === "skipped") continue;
      if (classify(prefix, { minTransitions }).outcome === OUTCOMES.FLAKY) {
        flakyCount++;
      }
    }
    return { runIndex: i, runLabel: `Run ${n}`, flaky: flakyCount };
  });
}

function collectAllTestIds(runMaps) {
  const ids = new Set();
  for (const run of runMaps) {
    for (const id of run.tests.keys()) {
      ids.add(id);
    }
  }
  return [...ids];
}

function mergeTags(existing, incoming) {
  const set = new Set(existing);
  for (const tag of incoming) {
    set.add(tag);
  }
  return [...set];
}

function extractMetadata(report) {
  return {
    generatedAt: report.metadata?.generatedAt || report.timing?.startTime || null,
    framework: report.metadata?.framework || "playwright",
    configFile: report.metadata?.configFile || report.config?.configFile || null,
    durationMs: report.timing?.durationMs || null,
    totalTests: report.summary?.total || 0,
  };
}

function runIndexLabel(index) {
  return index === -1 ? null : index;
}

function computeStabilityScore(history) {
  const outcomes = history.filter((o) => o !== "missing");
  if (outcomes.length === 0) return 0;

  let runsWithSameOutcome = 0;
  const lastOutcome = outcomes[outcomes.length - 1];

  for (let i = outcomes.length - 1; i >= 0; i--) {
    if (outcomes[i] === lastOutcome) {
      runsWithSameOutcome++;
    } else {
      break;
    }
  }

  return Math.round((runsWithSameOutcome / outcomes.length) * 100) / 100;
}

function buildSummary(results, runMaps) {
  // A test whose actual latest run is "skipped" didn't execute in that run —
  // classify() still reports a classification for it (by looking past the
  // skip to the last real pass/fail signal, so that signal isn't lost from
  // the test's history/reasons), but counting it toward stable_pass/flaky/
  // newly_failed/etc. here would claim a "right now" status the latest run
  // never actually confirmed. It's still part of Total — Skipped is its own
  // bucket, not an excluded one, so Passing + Flaky + Failed + Skipped always
  // sums back to Total — it just must not ALSO land in one of the other
  // buckets, or the same test gets double-counted.
  const trackedResults = results.filter((r) => r.lastOutcome !== "skipped");

  const counts = {
    totalTests: results.length,
    stable_pass: 0,
    stable_failure: 0,
    flaky: 0,
    newly_failed: 0,
    fixed: 0,
    regression: 0,
  };

  for (const r of trackedResults) {
    if (counts[r.classification] !== undefined) {
      counts[r.classification]++;
    }
  }

  // Currently passing (stable_pass or fixed) but only after 1+ retries in the
  // latest run — a softer flakiness signal that classification alone hides.
  const passingOnRetry = trackedResults.filter(
    (r) => (r.classification === "stable_pass" || r.classification === "fixed") && r.passedOnRetry
  ).length;

  return {
    runsAnalyzed: runMaps.length,
    ...counts,
    passingOnRetry,
  };
}

module.exports = { compare, OUTCOMES, collectAllTestIds };
