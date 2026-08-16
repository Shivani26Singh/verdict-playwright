/**
 * Statistics engine for Playwright Flaky Test Analyzer.
 *
 * Operates on reporter-format reports (the same ones the comparison engine
 * consumes) and produces structured stats: pass/fail rates, durations,
 * retry counts, browser breakdowns, and failure frequency.
 */

function compute(reports) {
  if (!Array.isArray(reports) || reports.length === 0) {
    throw new Error(`compute requires at least 1 report, got ${reports ? reports.length : 0}`);
  }

  const { classifyError } = require("./failure-classifier");

  const perRun = reports.map((report, i) => computePerRun(report, i));
  const aggregate = computeAggregate(perRun);
  const slowestTests = computeSlowestTests(reports, 10);
  const failureFrequency = computeFailureFrequency(reports);
  const browserStats = computeBrowserStats(reports);
  const failureCategories = computeFailureCategoryBreakdown(reports, classifyError);

  // Same computations, scoped to only the most recent report — "across all
  // runs" numbers blur together a bad run with clean ones and can't tell you
  // what's failing right now vs. what happened once, several runs ago.
  const latestReport = [reports[reports.length - 1]];
  const browserStatsLatest = computeBrowserStats(latestReport);
  const failureCategoriesLatest = computeFailureCategoryBreakdown(latestReport, classifyError);

  return {
    runs: perRun.length,
    perRun,
    aggregate,
    slowestTests,
    failureFrequency,
    failureCategories,
    failureCategoriesLatest,
    browserStats,
    browserStatsLatest,
    schemaVersion: "1.0.0",
  };
}

function computePerRun(report, runIndex) {
  const tests = extractAllTestMetrics(report);

  const statuses = tests.map((t) => t.lastStatus);
  const total = tests.length;
  const passed = statuses.filter((s) => s === "passed" || s === "expected").length;
  const failed = statuses.filter(
    (s) => s === "failed" || s === "timedOut" || s === "unexpected"
  ).length;
  const skipped = statuses.filter((s) => s === "skipped").length;
  const flakyCount = countFlakyTests(tests);

  const durations = tests
    .map((t) => t.totalDuration)
    .filter((d) => typeof d === "number" && d >= 0);

  const retries = tests.map((t) => t.retryCount).filter((r) => typeof r === "number");

  return {
    runIndex,
    runLabel: `Run ${runIndex + 1}`,
    generatedAt: report.metadata?.generatedAt || report.timing?.startTime || null,
    total,
    passed,
    failed,
    skipped,
    flaky: flakyCount,
    passRate: safePercent(passed, total),
    failRate: safePercent(failed, total),
    avgDuration: safeAverage(durations),
    minDuration: durations.length > 0 ? Math.min(...durations) : 0,
    maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
    totalDuration: sum(durations),
    totalRetries: sum(retries),
    avgRetries: safeAverage(retries),
  };
}

function countFlakyTests(testMetrics) {
  return testMetrics.filter((t) => t.isFlaky).length;
}

/**
 * Flattens every test attempt's result object (status + errors) out of a
 * report, regardless of which reporter format produced it — Playwright's
 * built-in `json` reporter nests them under `suites[].specs[].tests[]`,
 * while this package's own PlaywrightReporter puts them in a flat top-level
 * `tests[]`. Callers that only checked `report.tests` (like the failure
 * category breakdown used to) silently returned zero results for any run
 * stored in the native `suites[]` format.
 */
function collectAllResults(report) {
  if (report.tests) {
    return (report.tests || []).flatMap((t) => t.results || []);
  }
  if (report.suites) {
    const out = [];
    const walk = (suite) => {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          for (const r of test.results || []) out.push(r);
        }
      }
      for (const child of suite.suites || []) walk(child);
    };
    for (const suite of report.suites) walk(suite);
    return out;
  }
  return [];
}

/**
 * Older PlaywrightReporter output (before the onTestBegin dedup fix) can
 * contain a second, permanently-empty ("results": []) top-level entry for
 * any test that retried — Playwright calls onTestBegin once per attempt,
 * and the reporter used to push a fresh record every time. Collapse those
 * back down to one entry per id so per-run test counts reflect actual
 * distinct tests, not attempts.
 */
function dedupeReporterTests(tests) {
  const byId = new Map();
  for (const t of tests) {
    const id = t.id || (t.titlePath && t.titlePath.join(" > ")) || t.title;
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, t);
    } else if (
      (!existing.results || existing.results.length === 0) &&
      t.results &&
      t.results.length > 0
    ) {
      byId.set(id, t);
    }
  }
  return [...byId.values()];
}

function extractAllTestMetrics(report) {
  if (report.tests) {
    return extractReporterFormatMetrics(report);
  }
  if (report.suites) {
    return extractLegacyFormatMetrics(report);
  }
  return [];
}

function extractReporterFormatMetrics(report) {
  const tests = dedupeReporterTests(report.tests || []);

  return tests.map((test) => {
    const results = test.results || [];
    const projectName = test.titlePath?.[1] || "unknown";
    const fullTitle = test.title + (projectName ? " | " + projectName : "");
    const id = test.id || (test.titlePath && test.titlePath.join(" > ")) || fullTitle;

    return {
      id: id,
      title: test.title,
      fullTitle: fullTitle,
      totalDuration: results.reduce((s, r) => s + (r.duration || 0), 0),
      retryCount: Math.max(results.length - 1, 0),
      lastStatus: normalizeStatus(test.status, results),
      isFlaky:
        results.some((r) => r.status === "passed") &&
        results.some((r) => r.status === "failed" || r.status === "timedOut"),
      projectName: projectName,
      resultCount: results.length,
    };
  });
}

function extractLegacyFormatMetrics(report) {
  const metrics = [];
  const suites = report.suites || [];

  for (const suite of suites) {
    if (!suite.specs) continue;
    for (const spec of suite.specs) {
      if (!spec.tests) continue;
      for (const test of spec.tests) {
        const results = test.results || [];
        const projectName = test.projectName || "unknown";
        const title = spec.title;
        const fullTitle = title + " | " + projectName;
        const id = spec.titlePath ? spec.titlePath.join(" > ") : title;

        metrics.push({
          id: id,
          title: title,
          fullTitle: fullTitle,
          totalDuration: results.reduce((s, r) => s + (r.duration || 0), 0),
          retryCount: Math.max(results.length - 1, 0),
          lastStatus: normalizeLegacyStatus(test.status, results),
          isFlaky:
            results.some((r) => r.status === "passed") &&
            results.some((r) => r.status === "failed" || r.status === "timedOut"),
          projectName: projectName,
          resultCount: results.length,
        });
      }
    }
  }

  return metrics;
}

function normalizeLegacyStatus(status, results) {
  if (status === "expected" || status === "passed") return "passed";
  if (status === "unexpected") return "failed";
  if (status === "skipped") return "skipped";
  if (status === "flaky" && results.length > 0) {
    const lastResult = results[results.length - 1];
    return lastResult.status === "passed" ? "passed" : "failed";
  }
  if (results.length > 0) {
    return results[results.length - 1].status;
  }
  return status || "unknown";
}

function normalizeStatus(status, results) {
  if (status === "expected" || status === "passed") return "passed";
  if (status === "unexpected") return "failed";
  if (status === "skipped") return "skipped";
  if (status === "flaky" && results.length > 0) {
    return results[results.length - 1].status;
  }
  if (results.length > 0) {
    return results[results.length - 1].status;
  }
  return status || "unknown";
}

function computeAggregate(perRunStats) {
  if (perRunStats.length === 0) return null;

  const totals = {
    totalTests: sum(perRunStats.map((r) => r.total)),
    totalPassed: sum(perRunStats.map((r) => r.passed)),
    totalFailed: sum(perRunStats.map((r) => r.failed)),
    totalSkipped: sum(perRunStats.map((r) => r.skipped)),
    totalFlaky: sum(perRunStats.map((r) => r.flaky)),
  };

  const avgDurations = perRunStats.map((r) => r.avgDuration).filter((d) => d > 0);
  const avgRetries = perRunStats.map((r) => r.avgRetries).filter((r) => r > 0);

  return {
    ...totals,
    overallPassRate: safePercent(totals.totalPassed, totals.totalTests),
    overallFailRate: safePercent(totals.totalFailed, totals.totalTests),
    avgDurationAcrossRuns: safeAverage(avgDurations),
    avgRetriesAcrossRuns: safeAverage(avgRetries),
    bestRunPassRate: perRunStats.length > 0 ? Math.max(...perRunStats.map((r) => r.passRate)) : 0,
    worstRunPassRate: perRunStats.length > 0 ? Math.min(...perRunStats.map((r) => r.passRate)) : 0,
  };
}

function computeSlowestTests(reports, limit) {
  const testMap = new Map();

  for (const report of reports) {
    const metrics = extractAllTestMetrics(report);
    for (const metric of metrics) {
      const key = metric.id || metric.fullTitle;
      const existing = testMap.get(key);
      if (!existing || metric.totalDuration > existing.totalDuration) {
        testMap.set(key, {
          title: metric.fullTitle,
          totalDuration: metric.totalDuration,
          maxDuration: metric.totalDuration,
          retries: metric.retryCount,
        });
      }
    }
  }

  return [...testMap.values()].sort((a, b) => b.totalDuration - a.totalDuration).slice(0, limit);
}

function computeFailureFrequency(reports) {
  const failCounts = new Map();
  const allKeys = new Set();
  const allInfo = new Map();
  const totalRuns = reports.length;

  for (const report of reports) {
    const tests = extractAllTestMetrics(report);
    const failedInThisRun = new Set();

    for (const test of tests) {
      const key = test.id;
      allKeys.add(key);
      if (!allInfo.has(key)) allInfo.set(key, test.fullTitle);

      if (
        test.lastStatus === "failed" ||
        test.lastStatus === "timedOut" ||
        test.lastStatus === "unexpected"
      ) {
        failedInThisRun.add(key);
      }
    }

    for (const key of failedInThisRun) {
      failCounts.set(key, (failCounts.get(key) || 0) + 1);
    }
  }

  return [...allKeys]
    .map((key) => ({
      title: allInfo.get(key) || key,
      failureCount: failCounts.get(key) || 0,
      totalRuns,
      failureRate: safePercent(failCounts.get(key) || 0, totalRuns),
    }))
    .sort((a, b) => b.failureCount - a.failureCount);
}

function computeBrowserStats(reports) {
  const browserMap = new Map();

  for (const report of reports) {
    const projects = report.config?.projects || [];

    const tests = extractAllTestMetrics(report);
    const failures = tests.filter(
      (t) =>
        t.lastStatus === "failed" || t.lastStatus === "timedOut" || t.lastStatus === "unexpected"
    );

    for (const project of projects) {
      const name = project.name || "unknown";
      const projTests = tests.filter((t) => t.projectName === name);
      const projFailures = failures.filter((t) => t.projectName === name);

      const existing = browserMap.get(name);
      if (existing) {
        existing.totalTests += projTests.length;
        existing.totalFailures += projFailures.length;
        existing.totalFlaky += projTests.filter((t) => t.isFlaky).length;
        existing.totalRetries += sum(projTests.map((t) => t.retryCount));
      } else {
        browserMap.set(name, {
          browser: name,
          totalTests: projTests.length,
          totalFailures: projFailures.length,
          totalFlaky: projTests.filter((t) => t.isFlaky).length,
          totalRetries: sum(projTests.map((t) => t.retryCount)),
        });
      }
    }
  }

  return [...browserMap.values()]
    .map((entry) => ({
      ...entry,
      failRate: safePercent(entry.totalFailures, entry.totalTests),
      flakyRate: safePercent(entry.totalFlaky, entry.totalTests),
    }))
    .sort((a, b) => b.failRate - a.failRate);
}

function computeFailureCategoryBreakdown(reports, classifyError) {
  const counts = {
    timeout: 0,
    locator: 0,
    assertion: 0,
    network: 0,
    backend: 0,
    authentication: 0,
    environment: 0,
    data: 0,
    unknown: 0,
  };
  const errors = [];

  for (const report of reports) {
    for (const result of collectAllResults(report)) {
      if (result.status === "failed" || result.status === "timedOut") {
        for (const err of result.errors || []) {
          const category = classifyError(err);
          if (counts[category] !== undefined) {
            counts[category]++;
          } else {
            counts.unknown++;
          }
          errors.push({
            message: typeof err === "string" ? err : err.message || "",
            category,
          });
        }
      }
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    total,
    counts,
    errors,
  };
}

// ─── Math helpers ─────────────────────────────────────────────

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function safeAverage(arr) {
  if (arr.length === 0) return 0;
  return Math.round((sum(arr) / arr.length) * 100) / 100;
}

function safePercent(numerator, denominator) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

module.exports = { compute };
