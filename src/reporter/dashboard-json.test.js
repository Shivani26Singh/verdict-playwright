"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildDashboardJson } = require("./dashboard-json");

function makeResult(overrides) {
  overrides = overrides || {};
  return {
    summary: {
      runsAnalyzed: 3,
      totalTests: 5,
      stable_pass: 2,
      stable_failure: 1,
      flaky: 1,
      newly_failed: 1,
      fixed: 0,
      regression: 0,
      ...(overrides.summary || {}),
    },
    results: [
      {
        id: "t1",
        title: "Login > should show error",
        browser: "chromium",
        history: ["failed", "passed", "failed"],
        classification: "regression",
        stabilityScore: 0.33,
        failureCategory: "assertion",
      },
      {
        id: "t2",
        title: "Dashboard > loads metrics",
        browser: "chromium",
        history: ["failed", "failed", "failed"],
        classification: "stable_failure",
        stabilityScore: 1.0,
        failureCategory: "timeout",
      },
      {
        id: "t3",
        title: "Search > flaky results",
        browser: "chromium",
        history: ["passed", "failed", "passed"],
        classification: "flaky",
        stabilityScore: 0.33,
        failureCategory: "locator",
      },
      {
        id: "t4",
        title: "Home > renders",
        browser: "firefox",
        history: ["passed", "passed", "passed"],
        classification: "stable_pass",
        stabilityScore: 1.0,
        failureCategory: "unknown",
      },
      ...(overrides.results || []),
    ],
    // Derived, for this fixture's own results[].history, the same way
    // engine.js's buildFlakyTrend() derives it: classify() on each test's
    // history truncated to its first N runs. t3 (["passed","failed","passed"])
    // is the only one that ever reaches 2 transitions, and only once all 3
    // runs are in view — hence [0, 0, 1], not a copy of the final count into
    // every run.
    flakyTrend: overrides.flakyTrend || [
      { runIndex: 0, runLabel: "Run 1", flaky: 0 },
      { runIndex: 1, runLabel: "Run 2", flaky: 0 },
      { runIndex: 2, runLabel: "Run 3", flaky: 1 },
    ],
    statistics: {
      runs: 3,
      perRun: [
        {
          runLabel: "Run 1",
          passRate: 40,
          failRate: 60,
          failed: 3,
          flaky: 0,
          totalRetries: 1,
          totalDuration: 1200,
        },
        {
          runLabel: "Run 2",
          passRate: 60,
          failRate: 40,
          failed: 2,
          flaky: 1,
          totalRetries: 0,
          totalDuration: 1000,
        },
        {
          runLabel: "Run 3",
          passRate: 20,
          failRate: 80,
          failed: 4,
          flaky: 0,
          totalRetries: 2,
          totalDuration: 1500,
        },
      ],
      aggregate: {
        overallPassRate: 40,
        overallFailRate: 60,
        avgDurationAcrossRuns: 1233.33,
        avgRetriesAcrossRuns: 1.0,
        bestRunPassRate: 60,
        worstRunPassRate: 20,
        totalTests: 15,
        totalPassed: 6,
        totalFailed: 9,
        totalSkipped: 0,
        totalFlaky: 1,
      },
      slowestTests: [
        { title: "Login > should show error", totalDuration: 5000, retries: 2 },
        { title: "Dashboard > loads metrics", totalDuration: 3200, retries: 1 },
      ],
      failureFrequency: [
        { title: "Login > should show error", failureCount: 2, totalRuns: 3, failureRate: 66.67 },
        { title: "Dashboard > loads metrics", failureCount: 3, totalRuns: 3, failureRate: 100 },
        { title: "Home > renders", failureCount: 0, totalRuns: 3, failureRate: 0 },
      ],
      failureCategories: {
        total: 4,
        counts: {
          timeout: 2,
          locator: 1,
          assertion: 1,
          network: 0,
          authentication: 0,
          environment: 0,
          data: 0,
          unknown: 0,
        },
        errors: [
          { message: "Timeout 30000ms exceeded", category: "timeout" },
          { message: "selector not found", category: "locator" },
          { message: "expect(received).toBe(expected)", category: "assertion" },
          { message: "Page crashed", category: "timeout" },
          { message: "error five", category: "unknown" },
          { message: "error six", category: "unknown" },
        ],
      },
      browserStats: [
        {
          browser: "chromium",
          totalTests: 10,
          totalFailures: 6,
          totalFlaky: 1,
          totalRetries: 3,
          failRate: 60,
          flakyRate: 10,
        },
        {
          browser: "firefox",
          totalTests: 5,
          totalFailures: 3,
          totalFlaky: 0,
          totalRetries: 1,
          failRate: 60,
          flakyRate: 0,
        },
      ],
      schemaVersion: "1.0.0",
    },
    runs: [],
    schemaVersion: "1.0.0",
    analyzerVersion: "1.6.0",
    ...(overrides._raw || {}),
  };
}

describe("dashboard-json — buildDashboardJson", function () {
  it("builds all top-level sections", function () {
    var d = buildDashboardJson(makeResult());
    assert.ok(d.project);
    assert.ok(d.version);
    assert.ok(d.generatedAt);
    assert.ok(d.schemaVersion);
    assert.ok(d.summary);
    assert.ok(d.suiteSummary);
    assert.ok(d.health);
    assert.ok(d.browserStats);
    assert.ok(d.slowestTests);
    assert.ok(d.failureFrequency);
    assert.ok(d.failureCategories);
    assert.ok(d.flakyTests);
    assert.ok(d.retryTimeline);
    assert.ok(d.recommendations);
    assert.ok(d.runSummary);
    assert.ok("hasFailures" in d);
    assert.ok("hasFlaky" in d);
  });

  it("calculates correct summary fields", function () {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.summary.runs, 3);
    assert.equal(d.summary.totalTests, 5);
    assert.equal(d.summary.stablePass, 2);
    assert.equal(d.summary.stableFail, 1);
    assert.equal(d.summary.flaky, 1);
    assert.equal(d.summary.newlyFailed, 1);
    assert.equal(d.summary.fixed, 0);
    assert.equal(d.summary.regression, 0);
  });

  it("excludes a test whose actual latest-run outcome is 'skipped' from flakyTests/investigations even if classify() still labels it flaky/newly_failed", function () {
    var d = buildDashboardJson(
      makeResult({
        results: [
          {
            id: "t5",
            title: "Checkout > payment step",
            browser: "chromium",
            history: ["failed", "skipped", "skipped"],
            classification: "newly_failed",
            lastOutcome: "skipped",
            stabilityScore: 0,
            failureCategory: "unknown",
          },
          {
            id: "t6",
            title: "Checkout > confirmation",
            browser: "chromium",
            history: ["passed", "failed", "skipped"],
            classification: "flaky",
            lastOutcome: "skipped",
            stabilityScore: 0,
            failureCategory: "unknown",
          },
        ],
      })
    );

    assert.ok(
      !d.flakyTests.some(function (t) {
        return t.title === "Checkout > confirmation";
      })
    );
    assert.ok(
      !d.investigations.some(function (i) {
        return i.testName === "Checkout > payment step" || i.testName === "Checkout > confirmation";
      })
    );
  });

  it("calculates health score", function () {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.summary.healthScore, 40);

    var allPass = makeResult({ summary: { totalTests: 4, stable_pass: 4 } });
    var da = buildDashboardJson(allPass);
    assert.equal(da.summary.healthScore, 100);

    var allFail = makeResult({ summary: { totalTests: 4, stable_pass: 0 } });
    var df = buildDashboardJson(allFail);
    assert.equal(df.summary.healthScore, 0);
  });

  it("no longer exposes a flakyTrend field — the Flaky Tests Trend is derived from retryTimeline/statistics.perRun", () => {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.flakyTrend, undefined);
    // healthScore is a different, pre-existing formula (stable_pass/totalTests)
    // and remains unaffected.
    assert.equal(d.summary.healthScore, 40);
    assert.equal(d.health.passRate, 40);
  });

  it("no longer exposes a reliability field on the dashboard JSON", () => {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.reliability, undefined);
  });

  it("calculates health rates", function () {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.health.passRate, 40);
    assert.equal(d.health.failRate, 60);
    assert.equal(d.health.flakyRate, 20);
    assert.equal(d.health.retryRate, 1);
    assert.equal(d.health.avgDurationMs, 1233.33);
  });

  it("filters failureFrequency to only failures > 0", function () {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.failureFrequency.length, 2);
    d.failureFrequency.forEach(function (f) {
      assert.ok(f.failureCount > 0);
    });
  });

  it("maps slowest tests with rank", function () {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.slowestTests.length, 2);
    assert.equal(d.slowestTests[0].rank, 1);
    assert.equal(d.slowestTests[0].title, "Login > should show error");
    assert.equal(d.slowestTests[0].durationMs, 5000);
    assert.equal(d.slowestTests[1].rank, 2);
  });

  it("maps browser stats", function () {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.browserStats.length, 2);
    assert.equal(d.browserStats[0].browser, "chromium");
    assert.equal(d.browserStats[0].failRate, 60);
  });

  it("maps timeline entries", function () {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.retryTimeline.length, 3);
    assert.equal(d.retryTimeline[0].run, "Run 1");
    assert.equal(d.retryTimeline[0].retries, 1);
    assert.equal(d.retryTimeline[0].durationMs, 1200);
  });

  it("retryTimeline carries the cross-run flaky trend (result.flakyTrend), not statistics.perRun's in-run flaky signal", function () {
    var d = buildDashboardJson(makeResult());
    assert.deepEqual(
      d.retryTimeline.map((r) => r.flaky),
      [0, 0, 1]
    );
    // statistics.perRun[].flaky (in-run retry flakiness, [0,1,0] in this
    // fixture) must NOT be what retryTimeline[].flaky reflects — proves the
    // two sources actually differ here, not just that some number renders.
    assert.notDeepEqual(
      d.retryTimeline.map((r) => r.flaky),
      makeResult().statistics.perRun.map((r) => r.flaky)
    );
  });

  it("falls back to 0 per run when result.flakyTrend is absent, rather than silently reusing statistics.perRun's in-run flaky count", function () {
    var result = makeResult();
    delete result.flakyTrend;
    var d = buildDashboardJson(result);
    assert.deepEqual(
      d.retryTimeline.map((r) => r.flaky),
      [0, 0, 0]
    );
  });

  it("includes suiteSummary with all categories", function () {
    var d = buildDashboardJson(makeResult());
    var ss = d.suiteSummary;
    assert.equal(ss.total, 5);
    assert.equal(ss.stable, 2);
    assert.equal(ss.flaky, 1);
    assert.equal(ss.regression, 0);
    assert.equal(ss.failed, 2);
    assert.equal(ss.stablePct, 40);
    assert.equal(ss.flakyPct, 20);
    assert.equal(ss.regressionPct, 0);
    assert.equal(ss.failedPct, 40);
  });

  it("includes passingOnRetry from summary", function () {
    var d = buildDashboardJson(makeResult({ summary: { passingOnRetry: 2 } }));
    assert.equal(d.suiteSummary.passingOnRetry, 2);
    assert.equal(d.suiteSummary.passingOnRetryPct, 40);
  });

  it("defaults passingOnRetry to 0 when summary omits it", function () {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.suiteSummary.passingOnRetry, 0);
    assert.equal(d.suiteSummary.passingOnRetryPct, 0);
  });

  it("extracts flaky tests from results", function () {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.flakyTests.length, 1);
    assert.equal(d.flakyTests[0].title, "Search > flaky results");
    assert.equal(d.flakyTests[0].flakyRate, 33);
    assert.ok(d.flakyTests[0].history);
    assert.ok(Array.isArray(d.flakyTests[0].history));
    assert.ok(Number.isFinite(d.flakyTests[0].passes));
    assert.ok(Number.isFinite(d.flakyTests[0].fails));
  });

  it("truncates sample errors to 5", function () {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.failureCategories.sampleErrors.length, 5);
  });

  it("sets hasFailures and hasFlaky correctly", function () {
    var d = buildDashboardJson(makeResult());
    assert.equal(d.hasFailures, true);
    assert.equal(d.hasFlaky, true);
  });

  it("sets hasFailures false when no failures", function () {
    var clean = makeResult({
      summary: { stable_failure: 0, flaky: 0, newly_failed: 0, regression: 0 },
    });
    var d = buildDashboardJson(clean);
    assert.equal(d.hasFailures, false);
  });

  it("sets hasFlaky false when no flaky tests", function () {
    var res = makeResult();
    res.results = res.results.filter(function (r) {
      return r.classification !== "flaky";
    });
    var d = buildDashboardJson(res);
    assert.equal(d.hasFlaky, false);
  });

  it("generates recommendations for poor pass rate", function () {
    var d = buildDashboardJson(makeResult());
    assert.ok(d.recommendations.critical && d.recommendations.critical.length > 0);
    assert.ok(
      d.recommendations.critical.some(function (r) {
        return r.message.includes("below 50%");
      })
    );
  });

  it("generates recommendations for flaky tests", function () {
    var d = buildDashboardJson(makeResult());
    var all = [].concat(
      d.recommendations.critical || [],
      d.recommendations.high || [],
      d.recommendations.medium || [],
      d.recommendations.low || []
    );
    assert.ok(
      all.some(function (r) {
        return r.message.includes("flaky");
      })
    );
  });

  it("generates recommendations for timeouts", function () {
    var d = buildDashboardJson(makeResult());
    var all = [].concat(
      d.recommendations.critical || [],
      d.recommendations.high || [],
      d.recommendations.medium || [],
      d.recommendations.low || []
    );
    assert.ok(
      all.some(function (r) {
        return r.message.includes("Timeout");
      })
    );
  });

  it("generates excellent stability when all pass", function () {
    var clean = makeResult({
      summary: {
        totalTests: 4,
        stable_pass: 4,
        stable_failure: 0,
        flaky: 0,
        newly_failed: 0,
        regression: 0,
      },
    });
    clean.statistics.aggregate.overallPassRate = 100;
    clean.statistics.aggregate.overallFailRate = 0;
    clean.statistics.aggregate.avgRetriesAcrossRuns = 0;
    clean.statistics.failureCategories = {
      total: 0,
      counts: {
        timeout: 0,
        locator: 0,
        assertion: 0,
        network: 0,
        authentication: 0,
        environment: 0,
        data: 0,
        unknown: 0,
      },
      errors: [],
    };
    var d = buildDashboardJson(clean);
    assert.equal(d.hasFailures, false);
    var all = [].concat(
      d.recommendations.critical || [],
      d.recommendations.high || [],
      d.recommendations.medium || [],
      d.recommendations.low || []
    );
    assert.ok(
      all.some(function (r) {
        return r.message.includes("Excellent");
      })
    );
  });

  it("handles missing statistics", function () {
    var partial = makeResult();
    delete partial.statistics;
    var d = buildDashboardJson(partial);
    assert.equal(d.browserStats.length, 0);
    assert.equal(d.slowestTests.length, 0);
    assert.equal(d.failureFrequency.length, 0);
    assert.equal(d.retryTimeline.length, 0);
    assert.equal(d.failureCategories.total, 0);
  });

  it("handles empty results array", function () {
    var empty = makeResult({
      summary: {
        totalTests: 0,
        stable_pass: 0,
        stable_failure: 0,
        flaky: 0,
        newly_failed: 0,
        regression: 0,
      },
    });
    empty.results = [];
    var d = buildDashboardJson(empty);
    assert.equal(d.flakyTests.length, 0);
    assert.equal(d.hasFailures, false);
    assert.equal(d.hasFlaky, false);
    assert.equal(d.summary.healthScore, 100);
  });
});

describe("dashboard-json — generateRunSummary", function () {
  it("produces an array of bullet strings", function () {
    var d = buildDashboardJson(makeResult());
    assert.ok(Array.isArray(d.runSummary));
    assert.ok(d.runSummary.length > 0);
    d.runSummary.forEach(function (b) {
      assert.ok(typeof b === "string");
    });
  });

  it("includes total tests and run count as first bullet", function () {
    var d = buildDashboardJson(makeResult());
    assert.ok(d.runSummary[0].includes("5 distinct tests tracked across 3 runs"));
  });

  it("includes stable test count when not all tests pass", function () {
    var d = buildDashboardJson(makeResult());
    var hasStable = d.runSummary.some(function (b) {
      return b.includes("tests passed consistently");
    });
    assert.ok(hasStable);
  });

  it("does not mention stable count when all tests pass", function () {
    var allPass = makeResult({
      summary: {
        totalTests: 4,
        stable_pass: 4,
        stable_failure: 0,
        flaky: 0,
        newly_failed: 0,
        regression: 0,
      },
    });
    allPass.results = allPass.results.filter(function (r) {
      return r.classification === "stable_pass";
    });
    allPass.statistics.aggregate.overallPassRate = 100;
    allPass.statistics.aggregate.overallFailRate = 0;
    allPass.statistics.failureCategories = {
      total: 0,
      counts: {
        timeout: 0,
        locator: 0,
        assertion: 0,
        network: 0,
        authentication: 0,
        environment: 0,
        data: 0,
        unknown: 0,
      },
      errors: [],
    };
    var d = buildDashboardJson(allPass);
    var hasStable = d.runSummary.some(function (b) {
      return b.includes("tests passed consistently");
    });
    assert.equal(hasStable, false);
  });

  it("mentions flaky tests when present", function () {
    var d = buildDashboardJson(makeResult());
    var hasFlaky = d.runSummary.some(function (b) {
      return b.includes("flaky test");
    });
    assert.ok(hasFlaky);
  });

  it("omits flaky bullet when no flaky tests", function () {
    var res = makeResult({ summary: { flaky: 0 } });
    res.results = res.results.filter(function (r) {
      return r.classification !== "flaky";
    });
    var d = buildDashboardJson(res);
    var hasFlaky = d.runSummary.some(function (b) {
      return b.includes("flaky");
    });
    assert.equal(hasFlaky, false);
  });

  it("splits flaky tests into currently-passing vs currently-failing", function () {
    var res = makeResult({ summary: { flaky: 3 } });
    res.results = res.results.filter(function (r) {
      return r.classification !== "flaky";
    });
    res.results.push(
      {
        id: "f1",
        title: "A",
        browser: "chromium",
        history: ["passed", "failed", "passed"],
        classification: "flaky",
        lastOutcome: "passed",
        stabilityScore: 0.5,
        failureCategory: "timeout",
      },
      {
        id: "f2",
        title: "B",
        browser: "chromium",
        history: ["passed", "failed", "passed"],
        classification: "flaky",
        lastOutcome: "passed",
        stabilityScore: 0.5,
        failureCategory: "timeout",
      },
      {
        id: "f3",
        title: "C",
        browser: "chromium",
        history: ["failed", "passed", "failed"],
        classification: "flaky",
        lastOutcome: "failed",
        stabilityScore: 0.5,
        failureCategory: "timeout",
      }
    );
    var d = buildDashboardJson(res);
    var flakyBullet = d.runSummary.find(function (b) {
      return b.indexOf("flaky test") !== -1;
    });
    assert.ok(flakyBullet);
    assert.ok(flakyBullet.includes("2 currently passing"));
    assert.ok(flakyBullet.includes("1 currently failing"));
  });

  it("calls out a shared incident when most flaky tests share the identical history pattern", function () {
    var res = makeResult({ summary: { flaky: 4 } });
    res.results = res.results.filter(function (r) {
      return r.classification !== "flaky";
    });
    ["f1", "f2", "f3", "f4"].forEach(function (id, idx) {
      res.results.push({
        id: id,
        title: "T" + idx,
        browser: "chromium",
        history: ["passed", "failed", "passed"],
        classification: "flaky",
        lastOutcome: "passed",
        stabilityScore: 0.5,
        failureCategory: "timeout",
      });
    });
    var d = buildDashboardJson(res);
    var flakyBullet = d.runSummary.find(function (b) {
      return b.indexOf("flaky test") !== -1;
    });
    assert.ok(flakyBullet.includes("4 of 4 share the identical"));
    assert.ok(flakyBullet.includes("shared incident"));
  });

  it("does not claim a shared incident when flaky tests have varied history patterns", function () {
    var res = makeResult({ summary: { flaky: 3 } });
    res.results = res.results.filter(function (r) {
      return r.classification !== "flaky";
    });
    res.results.push(
      {
        id: "f1",
        title: "A",
        browser: "chromium",
        history: ["passed", "failed", "passed"],
        classification: "flaky",
        lastOutcome: "passed",
        stabilityScore: 0.5,
        failureCategory: "timeout",
      },
      {
        id: "f2",
        title: "B",
        browser: "chromium",
        history: ["failed", "passed", "failed"],
        classification: "flaky",
        lastOutcome: "failed",
        stabilityScore: 0.5,
        failureCategory: "timeout",
      },
      {
        id: "f3",
        title: "C",
        browser: "chromium",
        history: ["passed", "failed", "passed", "failed"],
        classification: "flaky",
        lastOutcome: "failed",
        stabilityScore: 0.5,
        failureCategory: "timeout",
      }
    );
    var d = buildDashboardJson(res);
    var flakyBullet = d.runSummary.find(function (b) {
      return b.indexOf("flaky test") !== -1;
    });
    assert.ok(!flakyBullet.includes("shared incident"));
  });

  it("mentions regressions when present", function () {
    // Add a regression result
    var res = makeResult({ summary: { regression: 1 } });
    res.results.push({
      id: "rx",
      title: "A > B",
      browser: "chromium",
      history: ["passed", "failed", "failed"],
      classification: "regression",
      stabilityScore: 0.33,
      failureCategory: "timeout",
    });
    var d = buildDashboardJson(res);
    var hasReg = d.runSummary.some(function (b) {
      return b.includes("regression");
    });
    assert.ok(hasReg);
  });

  it("includes failure category when errors exist", function () {
    var d = buildDashboardJson(makeResult());
    var hasCat = d.runSummary.some(function (b) {
      return b.includes("-related failures were the most common");
    });
    assert.ok(hasCat, "Expected a category bullet but found: " + JSON.stringify(d.runSummary));
  });

  it("includes retry information when retries exist", function () {
    var d = buildDashboardJson(makeResult());
    var hasRetry = d.runSummary.some(function (b) {
      return b.includes("retr");
    });
    assert.ok(hasRetry);
  });

  it("includes browser-specific failure insight", function () {
    var d = buildDashboardJson(makeResult());
    var hasBrowser = d.runSummary.some(function (b) {
      return b.includes("failures") || b.includes("failure rate");
    });
    assert.ok(hasBrowser);
  });

  it("caps at maximum 9 bullets", function () {
    var d = buildDashboardJson(makeResult());
    assert.ok(d.runSummary.length <= 9);
  });

  it("includes runSummary key even when no failures", function () {
    var clean = makeResult({
      summary: {
        totalTests: 4,
        stable_pass: 4,
        stable_failure: 0,
        flaky: 0,
        newly_failed: 0,
        regression: 0,
      },
    });
    clean.results = clean.results.filter(function (r) {
      return r.classification === "stable_pass";
    });
    clean.statistics.aggregate.overallPassRate = 100;
    clean.statistics.aggregate.overallFailRate = 0;
    clean.statistics.failureCategories = {
      total: 0,
      counts: {
        timeout: 0,
        locator: 0,
        assertion: 0,
        network: 0,
        authentication: 0,
        environment: 0,
        data: 0,
        unknown: 0,
      },
      errors: [],
    };
    var d = buildDashboardJson(clean);
    assert.ok(Array.isArray(d.runSummary));
  });
});

describe("dashboard-json — evidence pipeline", function () {
  it("attaches confidenceExplain with a breakdown matching the final confidence", function () {
    var d = buildDashboardJson(makeResult());
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.ok(inv.confidenceExplain);
    assert.equal(inv.confidenceExplain.finalConfidence, inv.confidence);
    assert.ok(Array.isArray(inv.confidenceExplain.adjustments));
    inv.confidenceExplain.adjustments.forEach(function (a) {
      assert.equal(typeof a.code, "string");
      assert.equal(typeof a.delta, "number");
      assert.equal(typeof a.reason, "string");
    });
  });

  it("builds passingOnRetryTests from stable_pass/fixed tests flagged passedOnRetry", function () {
    var r = makeResult({
      results: [
        {
          id: "t5",
          title: "Checkout > completes purchase",
          browser: "chromium",
          history: ["passed", "passed", "passed"],
          classification: "stable_pass",
          passedOnRetry: true,
          retriesToPass: 2,
          retryFailureCategory: "timeout",
          retryFailureErrors: [{ message: "Timeout 30000ms exceeded" }],
          classifiedRetryFailureErrors: [
            { message: "Timeout 30000ms exceeded", category: "timeout" },
          ],
        },
      ],
    });
    var d = buildDashboardJson(r);
    assert.equal(d.passingOnRetryTests.length, 1);
    var t = d.passingOnRetryTests[0];
    assert.equal(t.testName, "Checkout > completes purchase");
    assert.equal(t.retriesToPass, 2);
    assert.equal(t.classifiedErrors[0].message, "Timeout 30000ms exceeded");
    // Same investigation shape as a real failure: root cause, confidence, evidence, suggested checks
    assert.equal(typeof t.likelyCause, "string");
    assert.ok(t.likelyCause.length > 0);
    assert.equal(typeof t.confidence, "number");
    assert.ok(Array.isArray(t.suggestedChecks));
    assert.equal(t.classificationLabel, "Recovered on Retry");
    assert.equal(t.classificationDataClass, "passing_on_retry");
  });

  it("excludes stable_pass tests that were not flagged passedOnRetry", function () {
    var d = buildDashboardJson(makeResult());
    // t4 (stable_pass) has no passedOnRetry flag in the base fixture
    assert.equal(d.passingOnRetryTests.length, 0);
  });

  it("excludes flaky/failing tests from passingOnRetryTests even if passedOnRetry were set", function () {
    var r = makeResult({
      results: [
        {
          id: "t6",
          title: "Search > flaky results 2",
          browser: "chromium",
          history: ["passed", "failed", "passed"],
          classification: "flaky",
          passedOnRetry: true,
          retriesToPass: 1,
        },
      ],
    });
    var d = buildDashboardJson(r);
    assert.equal(d.passingOnRetryTests.length, 0);
  });

  it("applies a fixed 70% review threshold to every investigation", function () {
    var d = buildDashboardJson(makeResult());
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.equal(inv.confidenceThresholdPct, 70);
  });

  it("flags belowConfidenceThreshold against the fixed 70% threshold and forces requiresHumanReview", function () {
    var d = buildDashboardJson(makeResult());
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.equal(inv.belowConfidenceThreshold, inv.confidence < 70);
    if (inv.belowConfidenceThreshold) assert.equal(inv.requiresHumanReview, true);
  });

  it("populates evidence.errorMessages from classifiedErrors when no visual evidence", function () {
    var r = makeResult();
    r.results[1].classifiedErrors = [
      { message: "Expected 'A' but got 'B'", stack: null, category: "assertion" },
      { message: "Timeout waiting for selector", stack: null, category: "timeout" },
    ];
    r.results[1].evidence = null;
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.ok(inv);
    assert.ok(inv.evidence);
    assert.ok(inv.evidence.errorMessages);
    assert.strictEqual(inv.evidence.errorMessages.length, 2);
    assert.ok(inv.evidence.errorMessages[0].includes("Expected 'A' but got 'B'"));
  });

  it("includes only unique error messages (deduplicates)", function () {
    var r = makeResult();
    r.results[1].classifiedErrors = [
      { message: "Same error", stack: null, category: "timeout" },
      { message: "Same error", stack: null, category: "timeout" },
      { message: "Same error", stack: null, category: "timeout" },
    ];
    r.results[1].evidence = null;
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.ok(inv.evidence.errorMessages);
    assert.strictEqual(inv.evidence.errorMessages.length, 1);
  });

  it("caps errorMessages at 3", function () {
    var r = makeResult();
    r.results[1].classifiedErrors = [
      { message: "Error A", stack: null },
      { message: "Error B", stack: null },
      { message: "Error C", stack: null },
      { message: "Error D", stack: null },
      { message: "Error E", stack: null },
    ];
    r.results[1].evidence = null;
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.ok(inv.evidence.errorMessages);
    assert.ok(inv.evidence.errorMessages.length <= 3);
  });

  it("still returns null when no errors and no visual evidence", function () {
    var r = makeResult();
    r.results[1].classifiedErrors = [];
    r.results[1].errors = [];
    r.results[1].evidence = null;
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.strictEqual(inv.evidence, null);
  });

  it("preserves stackTrace when available in classifiedErrors", function () {
    var r = makeResult();
    r.results[1].classifiedErrors = [
      { message: "Failed", stack: "at Object.<anonymous> (test.js:1:1)", category: "timeout" },
    ];
    r.results[1].evidence = null;
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.ok(inv.evidence);
    assert.ok(inv.evidence.stackTrace);
    assert.ok(inv.evidence.stackTrace.includes("Object.<anonymous>"));
  });

  it("handles string errors in classifiedErrors", function () {
    var r = makeResult();
    r.results[1].classifiedErrors = ["Plain string error"];
    r.results[1].evidence = null;
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.ok(inv.evidence);
    assert.ok(inv.evidence.errorMessages);
    assert.strictEqual(inv.evidence.errorMessages[0], "Plain string error");
  });

  it("never shows a DIFFERENT error's stack next to the Full Error message when errors[0] has no stack", function () {
    // errors accumulate failures from every failing run in the window (see
    // allFailedErrors in engine.js) — errors[0] is always the one shown as
    // "Full Error" (html.js's `_first`). If errors[0] has no .stack but a
    // later, unrelated error in the array does, evidence.stackTrace must
    // NOT fall back to that unrelated one — pairing an assertion error's
    // message with a network error's stack is actively misleading.
    var r = makeResult();
    r.results[1].classifiedErrors = [
      { message: "expect(locator).toBeVisible() failed", category: "assertion" }, // no .stack
      {
        message: "net::ERR_NAME_NOT_RESOLVED",
        stack: "Error: net::ERR_NAME_NOT_RESOLVED\n    at page.goto",
        category: "network",
      },
    ];
    r.results[1].evidence = null;
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.ok(inv.evidence);
    assert.equal(inv.evidence.stackTrace, null);
    assert.ok(inv.evidence.errorMessages);
    assert.equal(inv.evidence.errorMessages[0], "expect(locator).toBeVisible() failed");
  });

  it("evidence.codeFrame/codeFrameLocation/parsedError/stackTrace all come from primaryError when present, taking priority over classifiedErrors[0]", function () {
    var r = makeResult();
    r.results[1].primaryError = {
      message:
        "Error: expect(locator).toBeHidden() failed\n\nLocator:  locator('#x')\nExpected: hidden\nReceived: visible\nTimeout:  20000ms\n\nCall log:\n  - waiting for locator('#x')",
      stack: "at primary.spec.js:41:3",
      snippet: "39 |   x();\n> 41 |   y();\n     |   ^",
      location: { file: "primary.spec.js", line: 41, column: 3 },
    };
    // A different, unrelated error — must NOT be what evidence reflects.
    r.results[1].classifiedErrors = [
      { message: "net::ERR_NAME_NOT_RESOLVED", stack: "Error: net::ERR_NAME_NOT_RESOLVED" },
    ];
    r.results[1].evidence = null;
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.ok(inv.evidence.stackTrace.includes("primary.spec.js:41:3"));
    assert.equal(inv.evidence.codeFrame, "39 |   x();\n> 41 |   y();\n     |   ^");
    assert.deepEqual(inv.evidence.codeFrameLocation, {
      file: "primary.spec.js",
      line: 41,
      column: 3,
    });
    assert.equal(inv.evidence.parsedError.locator, "locator('#x')");
    assert.equal(inv.evidence.parsedError.expected, "hidden");
    assert.equal(inv.evidence.parsedError.received, "visible");
    assert.equal(inv.evidence.parsedError.timeout, "20000ms");
    assert.ok(inv.evidence.parsedError.callLog.includes("waiting for locator('#x')"));
  });

  it("falls back to classifiedErrors[0]/errors[0] when primaryError is absent (backward compatibility with older results)", function () {
    var r = makeResult();
    // No r.results[1].primaryError set at all — mirrors a result produced
    // before this field existed.
    r.results[1].classifiedErrors = [
      { message: "Failed", stack: "at Object.<anonymous> (test.js:1:1)", category: "timeout" },
    ];
    r.results[1].evidence = null;
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.ok(inv.evidence.stackTrace.includes("Object.<anonymous>"));
    assert.equal(inv.evidence.codeFrame, undefined);
    assert.equal(inv.evidence.parsedError.header, "Failed");
  });

  it("parsedError has only header populated for a plain one-line message, no fabricated Locator/Expected/Received/Timeout/Call log", function () {
    var r = makeResult();
    r.results[1].primaryError = { message: "Test timeout of 240000ms exceeded." };
    r.results[1].classifiedErrors = [];
    r.results[1].evidence = null;
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.equal(inv.evidence.parsedError.header, "Test timeout of 240000ms exceeded.");
    assert.equal(inv.evidence.parsedError.locator, null);
    assert.equal(inv.evidence.parsedError.expected, null);
    assert.equal(inv.evidence.parsedError.received, null);
    assert.equal(inv.evidence.parsedError.timeout, null);
    assert.equal(inv.evidence.parsedError.callLog, null);
  });

  it("codeFrame/codeFrameLocation are absent (not present, not 'undefined') when primaryError has no snippet/location", function () {
    var r = makeResult();
    r.results[1].primaryError = { message: "Failed", stack: "at x.js:1:1" };
    r.results[1].classifiedErrors = [];
    r.results[1].evidence = null;
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.equal(inv.evidence.codeFrame, undefined);
    assert.equal(inv.evidence.codeFrameLocation, undefined);
    assert.equal(JSON.stringify(inv.evidence).includes("undefined"), false);
  });

  it("buildInvestigationEntry exposes primaryError verbatim alongside evidence", function () {
    var r = makeResult();
    r.results[1].primaryError = { message: "Failed", stack: "at x.js:1:1", snippet: null, location: null };
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.deepEqual(inv.primaryError, {
      message: "Failed",
      stack: "at x.js:1:1",
      snippet: null,
      location: null,
    });
  });

  it("primaryError is null on the investigation entry when the result carries none", function () {
    var d = buildDashboardJson(makeResult());
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.equal(inv.primaryError, null);
  });

  it("prioritizes stackTrace over errorMessages when both available", function () {
    var r = makeResult();
    r.results[1].classifiedErrors = [
      { message: "Message text", stack: "Stack trace", category: "timeout" },
    ];
    r.results[1].evidence = null;
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.ok(inv.evidence.stackTrace);
    assert.ok(!inv.evidence.errorMessages);
  });

  it("builds evidenceByRun with one entry per run that actually captured evidence, labeled Run N", function () {
    var r = makeResult();
    r.results[1].evidenceByRun = [
      null, // run 1: no evidence
      { screenshots: ["run2.png"], trace: "run2.zip", video: null }, // run 2
      { screenshots: ["run3.png"], trace: "run3.zip", video: "run3.webm" }, // run 3
    ];
    var d = buildDashboardJson(r);
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.equal(inv.evidenceByRun.length, 2);
    assert.equal(inv.evidenceByRun[0].runIndex, 1);
    assert.equal(inv.evidenceByRun[0].runLabel, "Run 2");
    assert.ok(inv.evidenceByRun[0].evidence.screenshots[0].endsWith("run2.png"));
    assert.equal(inv.evidenceByRun[1].runIndex, 2);
    assert.equal(inv.evidenceByRun[1].runLabel, "Run 3");
    assert.ok(inv.evidenceByRun[1].evidence.video.endsWith("run3.webm"));
  });

  it("evidenceByRun is an empty array when the result carries no per-run evidence", function () {
    var d = buildDashboardJson(makeResult());
    var inv = d.investigations.find(function (i) {
      return i.classification === "stable_failure";
    });
    assert.deepEqual(inv.evidenceByRun, []);
  });
});

describe("dashboard-json — backend failure category propagation (Phase 7 regression)", function () {
  it("propagates the backend count from statistics into the dashboard, not dropped", function () {
    var r = makeResult();
    r.statistics.failureCategories = {
      total: 7,
      counts: {
        timeout: 2,
        locator: 1,
        assertion: 1,
        network: 0,
        backend: 3,
        authentication: 0,
        environment: 0,
        data: 0,
        unknown: 0,
      },
      errors: [],
    };
    var d = buildDashboardJson(r);
    assert.ok(
      Object.prototype.hasOwnProperty.call(d.failureCategories.counts, "backend"),
      "counts must expose a backend key"
    );
    assert.equal(d.failureCategories.counts.backend, 3);
    assert.equal(d.failureCategories.total, 7);
    var sum = Object.values(d.failureCategories.counts).reduce(function (a, b) {
      return a + b;
    }, 0);
    assert.equal(sum, d.failureCategories.total, "sum of counts must equal total");
  });

  it("does not misclassify backend errors as unknown in the dashboard", function () {
    var r = makeResult();
    r.statistics.failureCategories = {
      total: 3,
      counts: {
        timeout: 0,
        locator: 0,
        assertion: 0,
        network: 0,
        backend: 3,
        authentication: 0,
        environment: 0,
        data: 0,
        unknown: 0,
      },
      errors: [],
    };
    var d = buildDashboardJson(r);
    assert.equal(d.failureCategories.counts.backend, 3);
    assert.equal(d.failureCategories.counts.unknown, 0);
  });
});
