const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { compute } = require("./stats");

function makeReport(overrides = {}) {
  return {
    config: {
      configFile: "playwright.config.js",
      projects: [{ name: "chromium" }],
    },
    tests: [],
    ...overrides,
  };
}

function makeTest(title, status, results, projectName) {
  return {
    title,
    status,
    titlePath: [title, projectName || "chromium"],
    results: results || [{ status, duration: 100, errors: [], retry: 0 }],
    location: { file: "test.spec.js", line: 1, column: 1 },
  };
}

// ─── Per-run stats ────────────────────────────────────────────

describe("stats — perRun", () => {
  it("calculates pass rate for a clean run", () => {
    const report = makeReport({
      tests: [
        makeTest("test A", "expected", [{ status: "passed", duration: 200, errors: [], retry: 0 }]),
        makeTest("test B", "expected", [{ status: "passed", duration: 300, errors: [], retry: 0 }]),
      ],
    });

    const result = compute([report]);
    assert.equal(result.perRun.length, 1);
    assert.equal(result.perRun[0].total, 2);
    assert.equal(result.perRun[0].passed, 2);
    assert.equal(result.perRun[0].failed, 0);
    assert.equal(result.perRun[0].passRate, 100);
    assert.equal(result.perRun[0].failRate, 0);
  });

  it("calculates fail rate for a failing run", () => {
    const report = makeReport({
      tests: [
        makeTest("test A", "expected", [{ status: "passed", duration: 200, errors: [], retry: 0 }]),
        makeTest("test B", "unexpected", [
          { status: "failed", duration: 300, errors: [{ message: "fail" }], retry: 0 },
        ]),
        makeTest("test C", "unexpected", [
          { status: "failed", duration: 500, errors: [{ message: "fail" }], retry: 0 },
        ]),
      ],
    });

    const result = compute([report]);
    assert.equal(result.perRun[0].total, 3);
    assert.equal(result.perRun[0].passed, 1);
    assert.equal(result.perRun[0].failed, 2);
    assert.equal(result.perRun[0].flaky, 0);
    assert.equal(result.perRun[0].passRate, 33.33);
    assert.equal(result.perRun[0].failRate, 66.67);
  });

  it("counts flaky tests in a run", () => {
    const report = makeReport({
      tests: [
        makeTest("flaky test", "flaky", [
          { status: "failed", duration: 300, errors: [], retry: 0 },
          { status: "passed", duration: 200, errors: [], retry: 1 },
        ]),
      ],
    });

    const result = compute([report]);
    assert.equal(result.perRun[0].flaky, 1);
  });

  it("collapses a duplicate ghost record (empty results) left by an older reporter bug", () => {
    // Older PlaywrightReporter versions could write a second top-level entry
    // for a retried test with "results": [] (onTestBegin firing again on
    // retry, before the dedup fix). Same id, one real entry + one ghost —
    // this should count as ONE test, not two.
    const report = makeReport({
      tests: [
        Object.assign(
          makeTest("retried test", "flaky", [
            { status: "failed", duration: 300, errors: [], retry: 0 },
            { status: "passed", duration: 200, errors: [], retry: 1 },
          ]),
          { id: "abc123" }
        ),
        {
          id: "abc123",
          title: "retried test",
          titlePath: ["retried test", "chromium"],
          results: [],
        },
        makeTest("clean test", "expected", [
          { status: "passed", duration: 100, errors: [], retry: 0 },
        ]),
      ],
    });

    const result = compute([report]);
    assert.equal(result.perRun[0].total, 2);
    assert.equal(result.perRun[0].passed, 2);
    assert.equal(result.perRun[0].failed, 0);
    assert.equal(result.perRun[0].flaky, 1);
  });
});

// ─── Duration stats ───────────────────────────────────────────

describe("stats — durations", () => {
  it("calculates average, min, max durations", () => {
    const report = makeReport({
      tests: [
        makeTest("fast test", "expected", [
          { status: "passed", duration: 100, errors: [], retry: 0 },
        ]),
        makeTest("slow test", "expected", [
          { status: "passed", duration: 500, errors: [], retry: 0 },
        ]),
        makeTest("mid test", "expected", [
          { status: "passed", duration: 300, errors: [], retry: 0 },
        ]),
      ],
    });

    const result = compute([report]);
    assert.equal(result.perRun[0].avgDuration, 300);
    assert.equal(result.perRun[0].minDuration, 100);
    assert.equal(result.perRun[0].maxDuration, 500);
    assert.equal(result.perRun[0].totalDuration, 900);
  });

  it("sums durations across retries", () => {
    const report = makeReport({
      tests: [
        makeTest("retried test", "flaky", [
          { status: "failed", duration: 200, errors: [], retry: 0 },
          { status: "failed", duration: 150, errors: [], retry: 1 },
          { status: "passed", duration: 100, errors: [], retry: 2 },
        ]),
      ],
    });

    const result = compute([report]);
    assert.equal(result.perRun[0].totalDuration, 450);
    assert.equal(result.perRun[0].totalRetries, 2);
    assert.equal(result.perRun[0].avgRetries, 2);
  });
});

// ─── Slowest tests ────────────────────────────────────────────

describe("stats — slowestTests", () => {
  it("returns the top N slowest tests by total duration", () => {
    const report = makeReport({
      tests: [
        makeTest("fast", "expected", [{ status: "passed", duration: 100, errors: [], retry: 0 }]),
        makeTest("medium", "expected", [{ status: "passed", duration: 500, errors: [], retry: 0 }]),
        makeTest("slow", "unexpected", [
          { status: "failed", duration: 3000, errors: [], retry: 0 },
          { status: "failed", duration: 2800, errors: [], retry: 1 },
          { status: "passed", duration: 2000, errors: [], retry: 2 },
        ]),
        makeTest("xfast", "expected", [{ status: "passed", duration: 50, errors: [], retry: 0 }]),
      ],
    });

    const result = compute([report]);
    assert.ok(result.slowestTests.length >= 1);
    assert.equal(result.slowestTests[0].title, "slow | chromium");
    assert.equal(result.slowestTests[0].totalDuration, 7800);
    assert.equal(result.slowestTests[0].maxDuration, 7800);
  });

  it("de-duplicates tests across multiple runs by keeping the slowest occurrence", () => {
    const run1 = makeReport({
      config: { projects: [{ name: "chromium" }] },
      tests: [
        makeTest("test A", "expected", [{ status: "passed", duration: 100, errors: [], retry: 0 }]),
      ],
    });
    const run2 = makeReport({
      config: { projects: [{ name: "chromium" }] },
      tests: [
        makeTest("test A", "unexpected", [
          { status: "failed", duration: 3000, errors: [], retry: 0 },
        ]),
      ],
    });

    const result = compute([run1, run2]);
    const testA = result.slowestTests.find((t) => t.title === "test A | chromium");
    assert.ok(testA);
    assert.equal(testA.totalDuration, 3000);
  });
});

// ─── Failure frequency ────────────────────────────────────────

describe("stats — failureFrequency", () => {
  it("tracks how many runs each test failed in", () => {
    const run1 = makeReport({
      config: { projects: [{ name: "chromium" }] },
      tests: [
        makeTest("flaky A", "unexpected", [
          { status: "failed", duration: 300, errors: [], retry: 0 },
        ]),
        makeTest("stable B", "expected", [
          { status: "passed", duration: 100, errors: [], retry: 0 },
        ]),
      ],
    });
    const run2 = makeReport({
      config: { projects: [{ name: "chromium" }] },
      tests: [
        makeTest("flaky A", "unexpected", [
          { status: "failed", duration: 300, errors: [], retry: 0 },
        ]),
        makeTest("stable B", "expected", [
          { status: "passed", duration: 100, errors: [], retry: 0 },
        ]),
      ],
    });

    const result = compute([run1, run2]);
    const flakyA = result.failureFrequency.find((f) => f.title === "flaky A | chromium");
    const stableB = result.failureFrequency.find((f) => f.title === "stable B | chromium");

    assert.ok(flakyA);
    assert.equal(flakyA.failureCount, 2);
    assert.equal(flakyA.failureRate, 100);

    assert.ok(stableB);
    assert.equal(stableB.failureCount, 0);
    assert.equal(stableB.failureRate, 0);
  });

  it("counts each test once per run even if multiple retries fail", () => {
    const report = makeReport({
      tests: [
        makeTest("test X", "unexpected", [
          { status: "failed", duration: 300, errors: [], retry: 0 },
          { status: "failed", duration: 200, errors: [], retry: 1 },
          { status: "failed", duration: 400, errors: [], retry: 2 },
        ]),
      ],
    });

    const result = compute([report]);
    const testX = result.failureFrequency.find((f) => f.title === "test X | chromium");
    assert.equal(testX.failureCount, 1);
  });
});

// ─── Browser stats ────────────────────────────────────────────

describe("stats — browserStats", () => {
  it("breaks down stats by browser/project", () => {
    const report = makeReport({
      config: {
        projects: [{ name: "chromium" }, { name: "firefox" }, { name: "webkit" }],
      },
      tests: [
        makeTest(
          "chrome pass",
          "expected",
          [{ status: "passed", duration: 100, errors: [], retry: 0 }],
          "chromium"
        ),
        makeTest(
          "chrome fail",
          "unexpected",
          [{ status: "failed", duration: 200, errors: [], retry: 0 }],
          "chromium"
        ),
        makeTest(
          "ff pass",
          "expected",
          [{ status: "passed", duration: 100, errors: [], retry: 0 }],
          "firefox"
        ),
        makeTest(
          "ff flaky",
          "flaky",
          [
            { status: "failed", duration: 300, errors: [], retry: 0 },
            { status: "passed", duration: 200, errors: [], retry: 1 },
          ],
          "firefox"
        ),
        makeTest(
          "wk pass",
          "expected",
          [{ status: "passed", duration: 100, errors: [], retry: 0 }],
          "webkit"
        ),
      ],
    });

    const result = compute([report]);
    assert.equal(result.browserStats.length, 3);

    const chrome = result.browserStats.find((b) => b.browser === "chromium");
    assert.ok(chrome);
    assert.equal(chrome.totalTests, 2);
    assert.equal(chrome.totalFailures, 1);
    assert.equal(chrome.totalFlaky, 0);
    assert.equal(chrome.failRate, 50);

    const ff = result.browserStats.find((b) => b.browser === "firefox");
    assert.ok(ff);
    assert.equal(ff.totalTests, 2);
    assert.equal(ff.totalFailures, 0);
    assert.equal(ff.totalFlaky, 1);
    assert.equal(ff.flakyRate, 50);

    const wk = result.browserStats.find((b) => b.browser === "webkit");
    assert.ok(wk);
    assert.equal(wk.totalTests, 1);
    assert.equal(wk.totalFailures, 0);
  });

  it("aggregates stats across multiple runs per browser", () => {
    const run1 = makeReport({
      config: { projects: [{ name: "chromium" }] },
      tests: [
        makeTest(
          "test A",
          "expected",
          [{ status: "passed", duration: 100, errors: [], retry: 0 }],
          "chromium"
        ),
      ],
    });
    const run2 = makeReport({
      config: { projects: [{ name: "chromium" }] },
      tests: [
        makeTest(
          "test A",
          "unexpected",
          [{ status: "failed", duration: 200, errors: [], retry: 0 }],
          "chromium"
        ),
      ],
    });

    const result = compute([run1, run2]);
    const chrome = result.browserStats.find((b) => b.browser === "chromium");
    assert.equal(chrome.totalTests, 2);
    assert.equal(chrome.totalFailures, 1);
    assert.equal(chrome.failRate, 50);
  });

  it("sorts browsers by fail rate descending", () => {
    const report = makeReport({
      config: { projects: [{ name: "chromium" }, { name: "firefox" }] },
      tests: [
        makeTest(
          "c1",
          "unexpected",
          [{ status: "failed", duration: 100, errors: [], retry: 0 }],
          "chromium"
        ),
        makeTest(
          "c2",
          "unexpected",
          [{ status: "failed", duration: 100, errors: [], retry: 0 }],
          "chromium"
        ),
      ],
    });

    const result = compute([report]);
    if (result.browserStats.length >= 2) {
      assert.ok(result.browserStats[0].failRate >= result.browserStats[1].failRate);
    }
  });
});

// ─── Aggregate stats ──────────────────────────────────────────

describe("stats — aggregate", () => {
  it("computes overall pass/fail rates across runs", () => {
    const run1 = makeReport({
      tests: [
        makeTest("test A", "expected", [{ status: "passed", duration: 100, errors: [], retry: 0 }]),
        makeTest("test B", "unexpected", [
          { status: "failed", duration: 100, errors: [], retry: 0 },
        ]),
      ],
    });
    const run2 = makeReport({
      tests: [
        makeTest("test A", "unexpected", [
          { status: "failed", duration: 100, errors: [], retry: 0 },
        ]),
        makeTest("test B", "expected", [{ status: "passed", duration: 100, errors: [], retry: 0 }]),
      ],
    });

    const result = compute([run1, run2]);
    assert.equal(result.aggregate.totalTests, 4);
    assert.equal(result.aggregate.totalPassed, 2);
    assert.equal(result.aggregate.totalFailed, 2);
    assert.equal(result.aggregate.overallPassRate, 50);
    assert.equal(result.aggregate.overallFailRate, 50);
  });

  it("tracks best and worst pass rates", () => {
    const run1 = makeReport({
      tests: [
        makeTest("t1", "expected", [{ status: "passed", duration: 100, errors: [], retry: 0 }]),
        makeTest("t2", "expected", [{ status: "passed", duration: 100, errors: [], retry: 0 }]),
      ],
    });
    const run2 = makeReport({
      tests: [
        makeTest("t1", "unexpected", [{ status: "failed", duration: 100, errors: [], retry: 0 }]),
        makeTest("t2", "unexpected", [{ status: "failed", duration: 100, errors: [], retry: 0 }]),
      ],
    });

    const result = compute([run1, run2]);
    assert.equal(result.aggregate.bestRunPassRate, 100);
    assert.equal(result.aggregate.worstRunPassRate, 0);
  });

  it("handles a single report", () => {
    const report = makeReport({
      tests: [
        makeTest("test A", "expected", [{ status: "passed", duration: 150, errors: [], retry: 0 }]),
      ],
    });

    const result = compute([report]);
    assert.equal(result.runs, 1);
    assert.equal(result.aggregate.overallPassRate, 100);
  });
});

// ─── Edge cases ───────────────────────────────────────────────

describe("stats — edge cases", () => {
  it("throws on empty array", () => {
    assert.throws(() => compute([]), /at least 1 report/);
  });

  it("throws on null", () => {
    assert.throws(() => compute(null), /at least 1 report/);
  });

  it("handles empty tests gracefully", () => {
    const report = makeReport({ tests: [] });
    const result = compute([report]);
    assert.equal(result.perRun[0].total, 0);
    assert.equal(result.perRun[0].passRate, 0);
    assert.equal(result.perRun[0].failRate, 0);
    assert.equal(result.aggregate.overallPassRate, 0);
  });

  it("handles tests with no results array", () => {
    const report = makeReport({
      tests: [{ title: "test X", status: "skipped", titlePath: ["test X", "chromium"] }],
    });

    const result = compute([report]);
    assert.equal(result.perRun[0].total, 1);
    assert.equal(result.perRun[0].skipped, 1);
  });

  it("handles tests with no projectName", () => {
    const report = makeReport({
      config: { projects: [{ name: "chromium" }] },
      tests: [
        makeTest("test A", "expected", [{ status: "passed", duration: 100, errors: [], retry: 0 }]),
      ],
    });

    const result = compute([report]);
    assert.equal(result.browserStats.length, 1);
    assert.equal(result.browserStats[0].totalTests, 1);
  });

  it("safely divides by zero", () => {
    const report = makeReport({ tests: [] });
    const result = compute([report]);
    assert.equal(result.perRun[0].passRate, 0);
    assert.equal(result.perRun[0].avgDuration, 0);
    assert.equal(result.aggregate.overallPassRate, 0);
  });
});

describe("stats — failure category breakdown counts backend, not unknown (Phase 5 regression)", () => {
  const failedTest = (i, message) => ({
    id: "t" + i,
    title: "t" + i,
    titlePath: ["chromium", "s.spec.ts", "t" + i],
    results: [{ retry: 0, status: "failed", duration: 1, errors: [{ message }] }],
  });
  const reportWith = (messages) => ({ tests: messages.map((m, i) => failedTest(i, m)) });

  it("counts backend / HTTP 5xx errors under 'backend', not 'unknown'", () => {
    const fc = compute([
      reportWith(["Internal Server Error", "HTTP 502 Bad Gateway", "503 Service Unavailable"]),
    ]).failureCategories;
    assert.equal(fc.counts.backend, 3);
    assert.equal(fc.counts.unknown, 0);
  });

  it("exposes a 'backend' key in the counts object", () => {
    const fc = compute([reportWith(["some unrecognized failure text"])]).failureCategories;
    assert.ok(Object.prototype.hasOwnProperty.call(fc.counts, "backend"));
  });

  it("keeps every category bucket correct alongside backend (no regressions)", () => {
    const fc = compute([
      reportWith([
        "Internal Server Error", // backend
        "connect ECONNREFUSED 127.0.0.1:8080", // network
        "getaddrinfo ENOTFOUND api.example.com", // network (DNS)
        "page.waitForSelector: Timeout 5000ms exceeded", // timeout
        "locator.click: element is not visible", // locator (frontend)
        "%%% unexpected marker ###", // unknown
      ]),
    ]).failureCategories;
    assert.equal(fc.counts.backend, 1);
    assert.equal(fc.counts.network, 2);
    assert.equal(fc.counts.timeout, 1);
    assert.equal(fc.counts.locator, 1);
    assert.equal(fc.counts.unknown, 1);
    assert.equal(fc.counts.assertion, 0);
    assert.equal(fc.total, 6);
    const sum = Object.values(fc.counts).reduce((a, b) => a + b, 0);
    assert.equal(sum, fc.total);
  });
});
