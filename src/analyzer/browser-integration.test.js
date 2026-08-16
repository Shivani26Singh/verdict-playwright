"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { compute } = require("./stats");
const { compare, OUTCOMES } = require("./engine");

// ─── Helpers ──────────────────────────────────────────────────

function makeReporterReport(configProjects, testDefs) {
  return {
    schemaVersion: "1.0.0",
    reporter: { name: "json", version: "1.0.0" },
    metadata: {
      generatedAt: "2025-08-15T10:00:00Z",
      framework: "playwright",
      configFile: "playwright.config.js",
    },
    timing: {
      startTime: "2025-08-15T10:00:00Z",
      endTime: "2025-08-15T10:01:00Z",
      durationMs: 60000,
    },
    summary: {
      total: testDefs.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      interrupted: 0,
    },
    config: {
      configFile: "playwright.config.js",
      projects: configProjects,
    },
    tests: testDefs.map(function (td) {
      return {
        id: td.id,
        title: td.title,
        titlePath: td.titlePath || [td.title, td.browser],
        location: { file: td.file || "test.spec.js", line: 10, column: 4 },
        tags: td.tags || [],
        status: td.status,
        results: td.results || [{ retry: 0, status: td.status, duration: 100, errors: [] }],
      };
    }),
  };
}

function makePassTest(id, title, browser) {
  return {
    id: id,
    title: title,
    browser: browser,
    titlePath: [title, browser],
    file: "test.spec.js",
    tags: ["@smoke"],
    status: "passed",
    results: [{ retry: 0, status: "passed", duration: 100, errors: [] }],
  };
}

function makeFailTest(id, title, browser) {
  return {
    id: id,
    title: title,
    browser: browser,
    titlePath: [title, browser],
    file: "test.spec.js",
    tags: [],
    status: "failed",
    results: [
      {
        retry: 0,
        status: "failed",
        duration: 200,
        errors: [{ message: "Test failed", stack: "at test.spec.js:10:4" }],
      },
    ],
  };
}

function makeFlakyTest(id, title, browser) {
  return {
    id: id,
    title: title,
    browser: browser,
    titlePath: [title, browser],
    file: "test.spec.js",
    tags: [],
    status: "flaky",
    results: [
      { retry: 0, status: "failed", duration: 300, errors: [{ message: "first fail" }] },
      { retry: 1, status: "passed", duration: 200, errors: [] },
    ],
  };
}

// ─── Single-Browser: Chromium Only ────────────────────────────

describe("Browser Integration — Chromium Only", function () {
  it("shows only chromium in browser stats", function () {
    var report = makeReporterReport(
      [{ name: "chromium" }],
      [
        makePassTest("t1", "test A", "chromium"),
        makeFailTest("t2", "test B", "chromium"),
        makeFlakyTest("t3", "test C", "chromium"),
      ]
    );

    var result = compute([report]);
    assert.equal(result.browserStats.length, 1);
    assert.equal(result.browserStats[0].browser, "chromium");
    assert.equal(result.browserStats[0].totalTests, 3);
    assert.equal(result.browserStats[0].totalFailures, 1);
    assert.equal(result.browserStats[0].totalFlaky, 1);
    assert.equal(result.browserStats[0].failRate, 33.33);
    assert.equal(result.browserStats[0].flakyRate, 33.33);
  });

  it("calculates per-run stats correctly for chromium only", function () {
    var report = makeReporterReport(
      [{ name: "chromium" }],
      [
        makePassTest("t1", "stable pass", "chromium"),
        makePassTest("t2", "also pass", "chromium"),
        makeFailTest("t3", "fail one", "chromium"),
      ]
    );

    var result = compute([report]);
    assert.equal(result.perRun[0].total, 3);
    assert.equal(result.perRun[0].passed, 2);
    assert.equal(result.perRun[0].failed, 1);
    assert.equal(result.perRun[0].passRate, 66.67);
    assert.equal(result.perRun[0].failRate, 33.33);
    assert.equal(result.perRun[0].flaky, 0);
  });

  it("computes overall aggregate correctly for chromium only", function () {
    var run1 = makeReporterReport(
      [{ name: "chromium" }],
      [makePassTest("t1", "test A", "chromium"), makeFailTest("t2", "test B", "chromium")]
    );
    var run2 = makeReporterReport(
      [{ name: "chromium" }],
      [makePassTest("t1", "test A", "chromium"), makePassTest("t2", "test B", "chromium")]
    );

    var result = compute([run1, run2]);
    assert.equal(result.aggregate.totalTests, 4);
    assert.equal(result.aggregate.totalPassed, 3);
    assert.equal(result.aggregate.totalFailed, 1);
    assert.equal(result.aggregate.overallPassRate, 75);
    assert.equal(result.aggregate.overallFailRate, 25);
  });

  it("engine classifies tests correctly across two chromium runs", function () {
    var run1 = makeReporterReport(
      [{ name: "chromium" }],
      [
        makePassTest("a", "stable pass test", "chromium"),
        makeFailTest("b", "should be flaky", "chromium"),
        makePassTest("c", "will become fail", "chromium"),
      ]
    );
    var run2 = makeReporterReport(
      [{ name: "chromium" }],
      [
        makePassTest("a", "stable pass test", "chromium"),
        makePassTest("b", "should be flaky", "chromium"),
        makeFailTest("c", "will become fail", "chromium"),
      ]
    );

    var result = compare([run1, run2]);
    assert.equal(result.summary.runsAnalyzed, 2);
    assert.equal(result.summary.totalTests, 3);

    var byId = {};
    result.results.forEach(function (r) {
      byId[r.id] = r;
    });

    assert.equal(byId["a"].classification, OUTCOMES.STABLE_PASS);
    assert.equal(byId["b"].classification, OUTCOMES.FIXED);
    assert.equal(byId["c"].classification, OUTCOMES.NEWLY_FAILED);

    assert.equal(result.summary.stable_pass, 1);
    assert.equal(result.summary.fixed, 1);
    assert.equal(result.summary.newly_failed, 1);
    assert.equal(result.summary.stable_failure, 0);
    assert.equal(result.summary.flaky, 0);
  });
});

// ─── Single-Browser: Firefox Only ─────────────────────────────

describe("Browser Integration — Firefox Only", function () {
  it("shows only firefox in browser stats", function () {
    var report = makeReporterReport(
      [{ name: "firefox" }],
      [
        makePassTest("f1", "firefox test A", "firefox"),
        makePassTest("f2", "firefox test B", "firefox"),
        makeFlakyTest("f3", "firefox flaky", "firefox"),
        makeFailTest("f4", "firefox fail", "firefox"),
      ]
    );

    var result = compute([report]);
    assert.equal(result.browserStats.length, 1);
    assert.equal(result.browserStats[0].browser, "firefox");
    assert.equal(result.browserStats[0].totalTests, 4);
    assert.equal(result.browserStats[0].totalFailures, 1);
    assert.equal(result.browserStats[0].totalFlaky, 1);
    assert.equal(result.browserStats[0].failRate, 25);
    assert.equal(result.browserStats[0].flakyRate, 25);
  });

  it("engine detects stable failure across two firefox runs", function () {
    var run1 = makeReporterReport(
      [{ name: "firefox" }],
      [makeFailTest("sf", "stable fail ff", "firefox")]
    );
    var run2 = makeReporterReport(
      [{ name: "firefox" }],
      [makeFailTest("sf", "stable fail ff", "firefox")]
    );

    var result = compare([run1, run2]);
    assert.equal(result.summary.stable_failure, 1);
    assert.equal(result.summary.stable_pass, 0);
  });
});

// ─── Single-Browser: WebKit Only ──────────────────────────────

describe("Browser Integration — WebKit Only", function () {
  it("shows only webkit in browser stats", function () {
    var report = makeReporterReport(
      [{ name: "webkit" }],
      [
        makePassTest("w1", "webkit test A", "webkit"),
        makePassTest("w2", "webkit test B", "webkit"),
        makePassTest("w3", "webkit test C", "webkit"),
      ]
    );

    var result = compute([report]);
    assert.equal(result.browserStats.length, 1);
    assert.equal(result.browserStats[0].browser, "webkit");
    assert.equal(result.browserStats[0].totalTests, 3);
    assert.equal(result.browserStats[0].totalFailures, 0);
    assert.equal(result.browserStats[0].totalFlaky, 0);
    assert.equal(result.browserStats[0].failRate, 0);
    assert.equal(result.browserStats[0].flakyRate, 0);
  });

  it("all passing tests = 100% pass rate for webkit", function () {
    var run1 = makeReporterReport(
      [{ name: "webkit" }],
      [makePassTest("w1", "wk test A", "webkit"), makePassTest("w2", "wk test B", "webkit")]
    );
    var run2 = makeReporterReport(
      [{ name: "webkit" }],
      [makePassTest("w1", "wk test A", "webkit"), makePassTest("w2", "wk test B", "webkit")]
    );

    var result = compute([run1, run2]);
    assert.equal(result.aggregate.overallPassRate, 100);
    assert.equal(result.aggregate.overallFailRate, 0);
    assert.equal(result.browserStats[0].failRate, 0);
    assert.equal(result.browserStats[0].flakyRate, 0);
  });

  it("engine reports a regression pattern (fail->pass->fail) as newly_failed across three webkit runs", function () {
    var run1 = makeReporterReport(
      [{ name: "webkit" }],
      [makeFailTest("r1", "regression test", "webkit")]
    );
    var run2 = makeReporterReport(
      [{ name: "webkit" }],
      [makePassTest("r1", "regression test", "webkit")]
    );
    var run3 = makeReporterReport(
      [{ name: "webkit" }],
      [makeFailTest("r1", "regression test", "webkit")]
    );

    var result = compare([run1, run2, run3]);
    assert.equal(result.summary.newly_failed, 1);
    assert.deepEqual(result.results[0].history, ["failed", "passed", "failed"]);
  });
});

// ─── Multi-Browser: Chromium + Firefox ────────────────────────

describe("Browser Integration — Chromium + Firefox", function () {
  it("shows both chromium and firefox in browser stats", function () {
    var report = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [
        makePassTest("c1", "chrome test A", "chromium"),
        makeFailTest("c2", "chrome test B", "chromium"),
        makePassTest("f1", "ff test A", "firefox"),
        makePassTest("f2", "ff test B", "firefox"),
        makeFlakyTest("f3", "ff flaky", "firefox"),
      ]
    );

    var result = compute([report]);
    assert.equal(result.browserStats.length, 2);

    var chrome = result.browserStats.find(function (b) {
      return b.browser === "chromium";
    });
    assert.ok(chrome, "chromium should be present");
    assert.equal(chrome.totalTests, 2);
    assert.equal(chrome.totalFailures, 1);
    assert.equal(chrome.totalFlaky, 0);
    assert.equal(chrome.failRate, 50);
    assert.equal(chrome.flakyRate, 0);

    var ff = result.browserStats.find(function (b) {
      return b.browser === "firefox";
    });
    assert.ok(ff, "firefox should be present");
    assert.equal(ff.totalTests, 3);
    assert.equal(ff.totalFailures, 0);
    assert.equal(ff.totalFlaky, 1);
    assert.equal(ff.failRate, 0);
    assert.equal(ff.flakyRate, 33.33);
  });

  it("sorts browsers by fail rate descending", function () {
    var report = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [
        makePassTest("c1", "chrome pass", "chromium"),
        makeFailTest("c2", "chrome fail 1", "chromium"),
        makeFailTest("c3", "chrome fail 2", "chromium"),
        makePassTest("f1", "ff pass", "firefox"),
      ]
    );

    var result = compute([report]);
    assert.equal(result.browserStats.length, 2);
    assert.ok(
      result.browserStats[0].failRate >= result.browserStats[1].failRate,
      "browsers should be sorted by fail rate descending"
    );
    assert.equal(result.browserStats[0].browser, "chromium");
  });

  it("aggregates browser stats across multiple runs for both browsers", function () {
    var run1 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [
        makePassTest("shared", "shared test", "chromium"),
        makeFailTest("shared-ff", "shared test", "firefox"),
      ]
    );
    var run2 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [
        makeFailTest("shared", "shared test", "chromium"),
        makePassTest("shared-ff", "shared test", "firefox"),
      ]
    );

    var result = compute([run1, run2]);

    var chrome = result.browserStats.find(function (b) {
      return b.browser === "chromium";
    });
    assert.equal(chrome.totalTests, 2);
    assert.equal(chrome.totalFailures, 1);

    var ff = result.browserStats.find(function (b) {
      return b.browser === "firefox";
    });
    assert.equal(ff.totalTests, 2);
    assert.equal(ff.totalFailures, 1);
  });

  it("engine independently tracks test history per browser", function () {
    // Same test name but different IDs per browser -> independent tracking
    var run1 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [
        {
          id: "tc-chromium",
          title: "login test",
          browser: "chromium",
          titlePath: ["login test", "chromium"],
          status: "passed",
          results: [{ retry: 0, status: "passed", duration: 100, errors: [] }],
        },
        {
          id: "tc-firefox",
          title: "login test",
          browser: "firefox",
          titlePath: ["login test", "firefox"],
          status: "failed",
          results: [
            { retry: 0, status: "failed", duration: 100, errors: [{ message: "ff fail" }] },
          ],
        },
      ]
    );
    var run2 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [
        {
          id: "tc-chromium",
          title: "login test",
          browser: "chromium",
          titlePath: ["login test", "chromium"],
          status: "passed",
          results: [{ retry: 0, status: "passed", duration: 100, errors: [] }],
        },
        {
          id: "tc-firefox",
          title: "login test",
          browser: "firefox",
          titlePath: ["login test", "firefox"],
          status: "passed",
          results: [{ retry: 0, status: "passed", duration: 100, errors: [] }],
        },
      ]
    );

    var result = compare([run1, run2]);

    var byId = {};
    result.results.forEach(function (r) {
      byId[r.id] = r;
    });

    assert.equal(byId["tc-chromium"].classification, OUTCOMES.STABLE_PASS);
    assert.equal(byId["tc-firefox"].classification, OUTCOMES.FIXED);

    assert.equal(result.summary.stable_pass, 1);
    assert.equal(result.summary.fixed, 1);
  });

  it("engine handles missing tests in a browser across runs", function () {
    // Test only appears in chromium in run1, appears in both in run2
    var run1 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [makePassTest("only-cr", "browser-specific", "chromium")]
    );
    var run2 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [
        makePassTest("only-cr", "browser-specific", "chromium"),
        makePassTest("new-ff", "new ff test", "firefox"),
      ]
    );

    var result = compare([run1, run2]);

    var byId = {};
    result.results.forEach(function (r) {
      byId[r.id] = r;
    });

    assert.equal(byId["only-cr"].classification, OUTCOMES.STABLE_PASS);
    assert.deepEqual(byId["only-cr"].history, ["passed", "passed"]);
    assert.equal(byId["new-ff"].classification, OUTCOMES.STABLE_PASS);
    assert.deepEqual(byId["new-ff"].history, ["missing", "passed"]);
  });
});

// ─── Multi-Browser: Chromium + Firefox + WebKit ───────────────

describe("Browser Integration — Chromium + Firefox + WebKit", function () {
  it("shows all three browsers in browser stats", function () {
    var report = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }, { name: "webkit" }],
      [
        makePassTest("c1", "cr test", "chromium"),
        makeFailTest("c2", "cr fail", "chromium"),
        makePassTest("f1", "ff test", "firefox"),
        makeFlakyTest("f2", "ff flaky", "firefox"),
        makePassTest("w1", "wk test", "webkit"),
        makeFailTest("w2", "wk fail", "webkit"),
      ]
    );

    var result = compute([report]);
    assert.equal(result.browserStats.length, 3);

    var names = result.browserStats
      .map(function (b) {
        return b.browser;
      })
      .sort();
    assert.deepEqual(names, ["chromium", "firefox", "webkit"]);

    var chrome = result.browserStats.find(function (b) {
      return b.browser === "chromium";
    });
    assert.equal(chrome.totalTests, 2);
    assert.equal(chrome.totalFailures, 1);
    assert.equal(chrome.failRate, 50);

    var ff = result.browserStats.find(function (b) {
      return b.browser === "firefox";
    });
    assert.equal(ff.totalTests, 2);
    assert.equal(ff.totalFlaky, 1);
    assert.equal(ff.failRate, 0);

    var wk = result.browserStats.find(function (b) {
      return b.browser === "webkit";
    });
    assert.equal(wk.totalTests, 2);
    assert.equal(wk.totalFailures, 1);
    assert.equal(wk.failRate, 50);
  });

  it("calculates per-run pass/fail rates across all three browsers", function () {
    var report = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }, { name: "webkit" }],
      [
        makePassTest("c1", "cr pass", "chromium"),
        makePassTest("c2", "cr pass 2", "chromium"),
        makePassTest("f1", "ff pass", "firefox"),
        makeFailTest("w1", "wk fail", "webkit"),
        makeFailTest("w2", "wk fail 2", "webkit"),
      ]
    );

    var result = compute([report]);
    assert.equal(result.perRun[0].total, 5);
    assert.equal(result.perRun[0].passed, 3);
    assert.equal(result.perRun[0].failed, 2);
    assert.equal(result.perRun[0].passRate, 60);
    assert.equal(result.perRun[0].failRate, 40);
  });

  it("computes failure frequency with browser-aware test IDs", function () {
    var run1 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [makeFailTest("cr-fail", "test X", "chromium"), makePassTest("ff-pass", "test X", "firefox")]
    );
    var run2 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [makeFailTest("cr-fail", "test X", "chromium"), makePassTest("ff-pass", "test X", "firefox")]
    );

    var result = compute([run1, run2]);

    var crFreq = result.failureFrequency.find(function (f) {
      return f.title === "test X | chromium";
    });
    var ffFreq = result.failureFrequency.find(function (f) {
      return f.title === "test X | firefox";
    });

    assert.ok(crFreq, "chromium test should be tracked");
    assert.ok(ffFreq, "firefox test should be tracked");
    assert.equal(crFreq.failureCount, 2);
    assert.equal(crFreq.failureRate, 100);
    assert.equal(ffFreq.failureCount, 0);
    assert.equal(ffFreq.failureRate, 0);
  });

  it("engine handles full three-browser classification correctly", function () {
    var run1 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }, { name: "webkit" }],
      [
        makePassTest("sp", "stable pass", "chromium"),
        makeFailTest("sf", "stable fail", "chromium"),
        makePassTest("nf", "newly failed", "firefox"),
        makeFailTest("fx", "fixed test", "firefox"),
      ]
    );
    var run2 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }, { name: "webkit" }],
      [
        makePassTest("sp", "stable pass", "chromium"),
        makeFailTest("sf", "stable fail", "chromium"),
        makeFailTest("nf", "newly failed", "firefox"),
        makePassTest("fx", "fixed test", "firefox"),
      ]
    );

    var result = compare([run1, run2]);
    assert.equal(result.summary.runsAnalyzed, 2);
    assert.equal(result.summary.totalTests, 4);
    assert.equal(result.summary.stable_pass, 1);
    assert.equal(result.summary.stable_failure, 1);
    assert.equal(result.summary.newly_failed, 1);
    assert.equal(result.summary.fixed, 1);
    assert.equal(result.summary.flaky, 0);
    assert.equal(result.summary.regression, 0);
  });
});

// ─── Dynamic Browser Handling ─────────────────────────────────

describe("Browser Integration — Dynamic Browser Handling", function () {
  it("works with a single custom-named browser project", function () {
    var report = makeReporterReport(
      [{ name: "edge" }],
      [makePassTest("e1", "edge test A", "edge"), makeFailTest("e2", "edge test B", "edge")]
    );

    var result = compute([report]);
    assert.equal(result.browserStats.length, 1);
    assert.equal(result.browserStats[0].browser, "edge");
    assert.equal(result.browserStats[0].totalTests, 2);
    assert.equal(result.browserStats[0].failRate, 50);
  });

  it("works with mobile browser projects", function () {
    var report = makeReporterReport(
      [{ name: "Mobile Chrome" }, { name: "Mobile Safari" }],
      [
        makePassTest("mc1", "mobile chrome test", "Mobile Chrome"),
        makePassTest("ms1", "mobile safari test", "Mobile Safari"),
      ]
    );

    var result = compute([report]);
    assert.equal(result.browserStats.length, 2);
    var names = result.browserStats
      .map(function (b) {
        return b.browser;
      })
      .sort();
    assert.deepEqual(names, ["Mobile Chrome", "Mobile Safari"]);
  });

  it("handles future unknown browser names without changes", function () {
    var report = makeReporterReport(
      [{ name: "future-browser-v2" }],
      [
        makePassTest("fb1", "future test A", "future-browser-v2"),
        makePassTest("fb2", "future test B", "future-browser-v2"),
      ]
    );

    var result = compute([report]);
    assert.equal(result.browserStats.length, 1);
    assert.equal(result.browserStats[0].browser, "future-browser-v2");
    assert.equal(result.browserStats[0].totalTests, 2);
    assert.equal(result.browserStats[0].totalFailures, 0);
  });

  it("handles varying browser count across different runs", function () {
    var run1 = makeReporterReport([{ name: "chromium" }], [makePassTest("t1", "test", "chromium")]);
    var run2 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [makePassTest("t1", "test", "chromium"), makePassTest("t2", "test", "firefox")]
    );

    var result = compute([run1, run2]);
    var names = result.browserStats
      .map(function (b) {
        return b.browser;
      })
      .sort();
    assert.deepEqual(names, ["chromium", "firefox"]);
  });

  it("handles project with no name gracefully", function () {
    var report = makeReporterReport(
      [{}],
      [
        {
          id: "anon1",
          title: "anon test",
          browser: "unknown",
          titlePath: ["anon test", "unknown"],
          status: "passed",
          results: [{ retry: 0, status: "passed", duration: 100, errors: [] }],
        },
      ]
    );

    var result = compute([report]);
    assert.equal(result.browserStats.length, 1);
    assert.equal(result.browserStats[0].browser, "unknown");
  });

  it("sorts dynamically named browsers by fail rate", function () {
    var report = makeReporterReport(
      [{ name: "alpha" }, { name: "beta" }, { name: "gamma" }],
      [
        makePassTest("a1", "alpha pass", "alpha"),
        makeFailTest("a2", "alpha fail", "alpha"),
        makeFailTest("b1", "beta fail", "beta"),
        makeFailTest("b2", "beta fail 2", "beta"),
        makePassTest("g1", "gamma pass", "gamma"),
        makeFailTest("g2", "gamma fail", "gamma"),
      ]
    );

    var result = compute([report]);
    assert.equal(result.browserStats.length, 3);

    // beta: 2/2 = 100% fail, alpha: 1/2 = 50%, gamma: 1/2 = 50%
    assert.ok(result.browserStats[0].failRate >= result.browserStats[1].failRate);
    assert.ok(result.browserStats[1].failRate >= result.browserStats[2].failRate);
    assert.equal(result.browserStats[0].browser, "beta");
  });
});

// ─── Dashboard JSON — Browser Stats ───────────────────────────

describe("Dashboard JSON — Browser Stats Integration", function () {
  var { buildDashboardJson } = require("../reporter/dashboard-json");
  var { compare: engineCompare } = require("./engine");

  it("dashboard.json maps browser stats correctly for chromium only", function () {
    var run1 = makeReporterReport(
      [{ name: "chromium" }],
      [makePassTest("t1", "test A", "chromium"), makeFailTest("t2", "test B", "chromium")]
    );
    var run2 = makeReporterReport(
      [{ name: "chromium" }],
      [makePassTest("t1", "test A", "chromium"), makePassTest("t2", "test B", "chromium")]
    );

    var result = engineCompare([run1, run2]);
    var dashboard = buildDashboardJson(result);

    assert.equal(dashboard.browserStats.length, 1);
    assert.equal(dashboard.browserStats[0].browser, "chromium");
    // browserStats aggregate across runs: 2 tests × 2 runs = 4 totalTests
    assert.equal(dashboard.browserStats[0].totalTests, 4);
    assert.equal(dashboard.browserStats[0].totalFailures, 1);
    assert.equal(dashboard.browserStats[0].failRate, 25);
  });

  it("dashboard.json summary metrics are correct for multi-browser", function () {
    var run1 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [
        makePassTest("c1", "cr pass", "chromium"),
        makePassTest("c2", "cr pass 2", "chromium"),
        makeFailTest("f1", "ff fail", "firefox"),
      ]
    );
    var run2 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }],
      [
        makePassTest("c1", "cr pass", "chromium"),
        makePassTest("c2", "cr pass 2", "chromium"),
        makeFailTest("f1", "ff fail", "firefox"),
      ]
    );

    var result = engineCompare([run1, run2]);
    var dashboard = buildDashboardJson(result);

    assert.equal(dashboard.summary.runs, 2);
    assert.equal(dashboard.summary.totalTests, 3);
    assert.equal(dashboard.summary.stablePass, 2);
    assert.equal(dashboard.summary.stableFail, 1);
    assert.equal(dashboard.summary.flaky, 0);
    assert.equal(dashboard.browserStats.length, 2);
  });

  it("dashboard.json health score = (stablePass / totalTests) * 100", function () {
    var run1 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }, { name: "webkit" }],
      [
        makePassTest("s1", "pass 1", "chromium"),
        makePassTest("s2", "pass 2", "chromium"),
        makeFailTest("f1", "fail 1", "firefox"),
        makeFailTest("f2", "fail 2", "webkit"),
      ]
    );
    var run2 = makeReporterReport(
      [{ name: "chromium" }, { name: "firefox" }, { name: "webkit" }],
      [
        makePassTest("s1", "pass 1", "chromium"),
        makePassTest("s2", "pass 2", "chromium"),
        makeFailTest("f1", "fail 1", "firefox"),
        makeFailTest("f2", "fail 2", "webkit"),
      ]
    );

    var result = engineCompare([run1, run2]);
    var dashboard = buildDashboardJson(result);

    // 2 stable_pass / 4 total = 50
    assert.equal(dashboard.summary.healthScore, 50);
  });

  it("dashboard.json failure frequency tracks per-browser", function () {
    var run1 = makeReporterReport(
      [{ name: "chromium" }, { name: "webkit" }],
      [makeFailTest("cr-bug", "bug", "chromium"), makePassTest("wk-ok", "bug", "webkit")]
    );
    var run2 = makeReporterReport(
      [{ name: "chromium" }, { name: "webkit" }],
      [makeFailTest("cr-bug", "bug", "chromium"), makePassTest("wk-ok", "bug", "webkit")]
    );

    var result = engineCompare([run1, run2]);
    var dashboard = buildDashboardJson(result);

    var ff = dashboard.failureFrequency;
    // dashboard JSON uses testName/browser, not title
    assert.equal(ff.length, 1, "only chromium failure should appear in dashboard");
    assert.equal(ff[0].testName, "bug");
    assert.equal(ff[0].browser, "chromium");
    assert.equal(ff[0].failureCount, 2);
    assert.equal(ff[0].failureRate, 100);
  });
});
