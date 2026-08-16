const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { compare, OUTCOMES, collectAllTestIds } = require("./engine");
const { normalizeReport } = require("./extractor");

function makeReport(reportId, tests) {
  return {
    schemaVersion: "1.0.0",
    reporter: { name: "test", version: "1.0.0" },
    metadata: {
      generatedAt: `2025-08-${14 + reportId}T10:00:00Z`,
      framework: "playwright",
      configFile: "playwright.config.js",
    },
    timing: {
      startTime: `2025-08-${14 + reportId}T10:00:00Z`,
      endTime: `2025-08-${14 + reportId}T10:01:00Z`,
      durationMs: 60000,
    },
    summary: { total: tests.length, passed: 0, failed: 0, skipped: 0, flaky: 0, interrupted: 0 },
    tests,
  };
}

function makeTest(id, title, status, results, overrides = {}) {
  return {
    id,
    title,
    titlePath: title.split(" > "),
    location: { file: `${title.split(" > ")[0]}.spec.js`, line: 10, column: 4 },
    tags: [],
    status,
    results: results || [{ retry: 0, status, duration: 100, errors: [] }],
    ...overrides,
  };
}

// ─── Two-run comparisons ──────────────────────────────────────

describe("engine — 2 runs", () => {
  it("detects stable_pass across two runs", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2]);
    assert.equal(result.results[0].classification, OUTCOMES.STABLE_PASS);
    assert.equal(result.summary.stable_pass, 1);
  });

  it("detects stable_failure across two runs", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "fail" }] },
        { retry: 1, status: "failed", duration: 100, errors: [{ message: "fail again" }] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "still fails" }] },
      ]),
    ]);

    const result = compare([run1, run2]);
    assert.equal(result.results[0].classification, OUTCOMES.STABLE_FAILURE);
    assert.equal(result.summary.stable_failure, 1);
  });

  it("detects newly_failed (was passing, now failing)", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "new failure" }] },
      ]),
    ]);

    const result = compare([run1, run2]);
    assert.equal(result.results[0].classification, OUTCOMES.NEWLY_FAILED);
    assert.equal(result.summary.newly_failed, 1);
    assert.equal(result.results[0].errors.length, 1);
    assert.equal(result.results[0].errors[0].message, "new failure");
  });

  it("detects fixed (was failing, now passing)", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "old fail" }] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2]);
    assert.equal(result.results[0].classification, OUTCOMES.FIXED);
    assert.equal(result.summary.fixed, 1);
    assert.ok(result.results[0].errors.length > 0);
    assert.equal(result.results[0].errors[0].message, "old fail");
  });
});

// ─── config.analyzer.minFailures wiring ────────────────────────

describe("engine — config.analyzer.minFailures", () => {
  it("uses the default threshold (2) when no config is passed", () => {
    const run1 = makeReport(1, [makeTest("a", "test a", "passed")]);
    const run2 = makeReport(2, [makeTest("a", "test a", "failed")]);
    const run3 = makeReport(3, [makeTest("a", "test a", "passed")]);

    const result = compare([run1, run2, run3]);
    assert.equal(result.results[0].classification, OUTCOMES.FLAKY);
  });

  it("a stricter config.analyzer.minFailures changes the classification", () => {
    const run1 = makeReport(1, [makeTest("a", "test a", "passed")]);
    const run2 = makeReport(2, [makeTest("a", "test a", "failed")]);
    const run3 = makeReport(3, [makeTest("a", "test a", "passed")]);

    const result = compare([run1, run2, run3], { analyzer: { minFailures: 3 } });
    assert.notEqual(result.results[0].classification, OUTCOMES.FLAKY);
    assert.equal(result.results[0].classification, OUTCOMES.FIXED);
  });
});

// ─── Passing on retry ──────────────────────────────────────────

describe("engine — passingOnRetry", () => {
  it("flags a stable_pass test that needed a retry in the latest run", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "flaked" }] },
        { retry: 1, status: "passed", duration: 90, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2]);
    assert.equal(result.results[0].classification, OUTCOMES.STABLE_PASS);
    assert.equal(result.results[0].passedOnRetry, true);
    assert.equal(result.results[0].retriesToPass, 1);
    assert.equal(result.summary.passingOnRetry, 1);
  });

  it("captures the first-attempt error and category for a passing-on-retry test", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "passed", [
        {
          retry: 0,
          status: "failed",
          duration: 100,
          errors: [{ message: "Timeout 30000ms exceeded" }],
        },
        { retry: 1, status: "passed", duration: 90, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2]);
    assert.equal(result.results[0].retryFailureErrors.length, 1);
    assert.equal(result.results[0].retryFailureErrors[0].message, "Timeout 30000ms exceeded");
    assert.equal(result.results[0].retryFailureCategory, "timeout");
  });

  it("retryFailureErrors is empty for a test that never needed a retry", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2]);
    assert.deepEqual(result.results[0].retryFailureErrors, []);
  });

  it("surfaces evidence (e.g. a screenshot) captured on the failed attempt of a passing-on-retry run", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "passed", [
        {
          retry: 0,
          status: "failed",
          duration: 100,
          errors: [{ message: "flaked" }],
          attachments: [{ name: "screenshot", contentType: "image/png", path: "attempt-0.png" }],
        },
        { retry: 1, status: "passed", duration: 90, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2]);
    assert.ok(result.results[0].evidence);
    assert.deepEqual(result.results[0].evidence.screenshots, ["attempt-0.png"]);
  });

  it("defaults evidence to the MOST RECENT failing run, not the oldest one", () => {
    const failingRun = (n, screenshot) =>
      makeReport(n, [
        makeTest("a", "test a", "failed", [
          {
            retry: 0,
            status: "failed",
            duration: 100,
            errors: [{ message: "boom" }],
            attachments: [
              { name: "screenshot", contentType: "image/png", path: screenshot },
              { name: "trace", contentType: "application/zip", path: `trace-${screenshot}.zip` },
              { name: "video", contentType: "video/webm", path: `video-${screenshot}.webm` },
            ],
          },
        ]),
      ]);

    const result = compare([failingRun(1, "run1.png"), failingRun(2, "run2.png"), failingRun(3, "run3.png")]);
    const t = result.results[0];
    assert.deepEqual(t.evidence.screenshots, ["run3.png"]);
    assert.equal(t.evidence.trace, "trace-run3.png.zip");
    assert.equal(t.evidence.video, "video-run3.png.webm");
  });

  it("preserves per-run evidence in evidenceByRun, aligned with history, for runs without evidence too", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "failed", [
        {
          retry: 0,
          status: "failed",
          duration: 100,
          errors: [{ message: "boom" }],
          attachments: [{ name: "screenshot", contentType: "image/png", path: "run2.png" }],
        },
      ]),
    ]);
    const run3 = makeReport(3, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2, run3]);
    const t = result.results[0];
    assert.equal(t.evidenceByRun.length, 3);
    assert.equal(t.evidenceByRun[0], null);
    assert.deepEqual(t.evidenceByRun[1].screenshots, ["run2.png"]);
    assert.equal(t.evidenceByRun[2], null);
  });

  it("does not flag a test that passed cleanly on the first attempt", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2]);
    assert.equal(result.results[0].passedOnRetry, false);
    assert.equal(result.results[0].retriesToPass, 0);
    assert.equal(result.summary.passingOnRetry, 0);
  });

  it("does not count a currently-failing test even if earlier runs recovered on retry", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "flaked" }] },
        { retry: 1, status: "passed", duration: 90, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "still fails" }] },
      ]),
    ]);

    const result = compare([run1, run2]);
    assert.equal(result.results[0].classification, OUTCOMES.NEWLY_FAILED);
    assert.equal(result.results[0].passedOnRetry, false);
    assert.equal(result.summary.passingOnRetry, 0);
  });
});

// ─── Three-run comparisons ────────────────────────────────────

describe("engine — 3 runs", () => {
  it("reports a regression pattern (fail->pass->fail) as newly_failed across three runs", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "initial fail" }] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run3 = makeReport(3, [
      makeTest("a", "test a", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "regression" }] },
      ]),
    ]);

    const result = compare([run1, run2, run3]);
    assert.equal(result.results[0].classification, OUTCOMES.NEWLY_FAILED);
    assert.equal(result.summary.newly_failed, 1);
    assert.deepEqual(result.results[0].history, ["failed", "passed", "failed"]);
  });

  it("five-run stable pass", () => {
    const makeRun = (id) =>
      makeReport(id, [
        makeTest("a", "test a", "passed", [
          { retry: 0, status: "passed", duration: 100, errors: [] },
        ]),
      ]);

    const result = compare([makeRun(1), makeRun(2), makeRun(3), makeRun(4), makeRun(5)]);
    assert.equal(result.results[0].classification, OUTCOMES.STABLE_PASS);
    assert.equal(result.summary.runsAnalyzed, 5);
  });

  it("excludes a test skipped in the latest run from every classification count, but keeps it in totalTests", () => {
    // classify() still reports "newly_failed" for failed->skipped->skipped
    // (it looks past the skips to the last real signal, see classifier.js),
    // but the test isn't actually failing right now — it didn't run in the
    // latest run. buildSummary must not count it toward newly_failed (that
    // would double-count it alongside "Skipped"), but it's still one of the
    // totalTests — Skipped is its own bucket within Total, not an exclusion.
    const run1 = makeReport(1, [
      makeTest("a", "test a", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "x" }] },
      ]),
      makeTest("b", "test b", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "skipped", []),
      makeTest("b", "test b", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run3 = makeReport(3, [
      makeTest("a", "test a", "skipped", []),
      makeTest("b", "test b", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2, run3]);
    const testA = result.results.find((r) => r.id === "a");
    assert.equal(testA.classification, OUTCOMES.NEWLY_FAILED);
    assert.equal(testA.lastOutcome, "skipped");

    assert.equal(result.summary.totalTests, 2); // both "a" and "b" — "a" just isn't in a pass/fail bucket
    assert.equal(result.summary.newly_failed, 0);
    assert.equal(result.summary.stable_pass, 1);
  });
});

// ─── Multi-test comparisons ───────────────────────────────────

describe("engine — multi-test reports", () => {
  it("classifies each test independently", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
      makeTest("b", "test b", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
      makeTest("c", "test c", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "fail" }] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
      makeTest("b", "test b", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "new fail" }] },
      ]),
      makeTest("c", "test c", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2]);

    const byId = {};
    for (const r of result.results) byId[r.id] = r.classification;

    assert.equal(byId["a"], OUTCOMES.STABLE_PASS);
    assert.equal(byId["b"], OUTCOMES.NEWLY_FAILED);
    assert.equal(byId["c"], OUTCOMES.FIXED);

    assert.equal(result.summary.stable_pass, 1);
    assert.equal(result.summary.newly_failed, 1);
    assert.equal(result.summary.fixed, 1);
  });

  it("handles a test appearing in only one run", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("b", "test b", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2]);
    assert.equal(result.results.length, 2);

    const byId = {};
    for (const r of result.results) byId[r.id] = r.classification;

    assert.equal(byId["a"], OUTCOMES.STABLE_PASS);
    assert.equal(byId["b"], OUTCOMES.STABLE_PASS);
  });
});

// ─── Sorting ──────────────────────────────────────────────────

describe("engine — result sorting", () => {
  it("sorts by severity: stable_failure > newly_failed (incl. regression pattern) > flaky > fixed > stable_pass", () => {
    const run1 = makeReport(1, [
      makeTest("sp", "stable pass", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
      makeTest("sf", "stable failure", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "x" }] },
      ]),
      makeTest("nf", "new fail", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
      makeTest("fx", "fixed", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "x" }] },
      ]),
      makeTest("reg", "regression", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "x" }] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("sp", "stable pass", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
      makeTest("sf", "stable failure", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "x" }] },
      ]),
      makeTest("nf", "new fail", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "new" }] },
      ]),
      makeTest("fx", "fixed", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
      makeTest("reg", "regression", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run3 = makeReport(3, [
      makeTest("sp", "stable pass", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
      makeTest("sf", "stable failure", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "x" }] },
      ]),
      makeTest("nf", "new fail", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "x" }] },
      ]),
      makeTest("fx", "fixed", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
      makeTest("reg", "regression", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "regressed!" }] },
      ]),
    ]);

    const result = compare([run1, run2, run3]);
    const classifications = result.results.map((r) => r.classification);

    assert.deepEqual(classifications, [
      OUTCOMES.STABLE_FAILURE,
      OUTCOMES.NEWLY_FAILED, // "nf"
      OUTCOMES.NEWLY_FAILED, // "reg" — regression pattern (fail->pass->fail), merged into newly_failed
      OUTCOMES.FIXED,
      OUTCOMES.STABLE_PASS,
    ]);
  });
});

// ─── Stability score ──────────────────────────────────────────

describe("engine — stability score", () => {
  it("returns 1.0 when all runs have same outcome", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run3 = makeReport(3, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2, run3]);
    assert.equal(result.results[0].stabilityScore, 1);
  });

  it("returns < 1 when outcomes change over runs", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "fail" }] },
      ]),
    ]);
    const run3 = makeReport(3, [
      makeTest("a", "test a", "failed", [
        { retry: 0, status: "failed", duration: 100, errors: [{ message: "fail" }] },
      ]),
    ]);

    const result = compare([run1, run2, run3]);
    assert.ok(result.results[0].stabilityScore < 1);
  });
});

// ─── Error handling ───────────────────────────────────────────

describe("engine — error handling", () => {
  it("throws when given fewer than 2 reports", () => {
    assert.throws(() => compare([makeReport(1, [])]), /at least 2 reports/);
  });

  it("throws when given null", () => {
    assert.throws(() => compare(null), /at least 2 reports/);
  });

  it("throws when given non-array", () => {
    assert.throws(() => compare({}), /at least 2 reports/);
  });
});

// ─── Metadata ─────────────────────────────────────────────────

describe("engine — runs metadata", () => {
  it("includes metadata for each run", () => {
    const run1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const run2 = makeReport(2, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);

    const result = compare([run1, run2]);
    assert.equal(result.runs.length, 2);
    assert.ok(result.runs[0].generatedAt);
    assert.equal(result.runs[0].framework, "playwright");
  });
});

// ─── collectAllTestIds ────────────────────────────────────────

describe("engine — collectAllTestIds", () => {
  it("collects unique IDs across all run maps", () => {
    const report1 = makeReport(1, [
      makeTest("a", "test a", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
      makeTest("b", "test b", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const report2 = makeReport(2, [
      makeTest("b", "test b", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
      makeTest("c", "test c", "passed", [
        { retry: 0, status: "passed", duration: 100, errors: [] },
      ]),
    ]);

    const runMaps = [
      { index: 0, metadata: {}, tests: normalizeReport(report1) },
      { index: 1, metadata: {}, tests: normalizeReport(report2) },
    ];

    const ids = collectAllTestIds(runMaps);
    assert.deepEqual(ids.sort(), ["a", "b", "c"]);
  });
});

// ─── Flaky Tests Trend (cross-run classification, not in-run retry) ──────
//
// result.flakyTrend[i].flaky must be the number of test CASES classify()
// calls FLAKY using only the outcomes observed in runs 1..(i+1) — the same
// classify() function and per-test history arrays that produce every test's
// final classification (results[].classification). It must NOT be Playwright's
// own in-run retry signal (statistics.perRun[].flaky), and must NOT simply
// copy the final overall flaky count into every run.

function passRun(reportId, testEntries) {
  // testEntries: [[id, title, status], ...] — one attempt per test, no
  // Playwright retries, so statistics.perRun[].flaky (which only fires on an
  // in-run failed-then-passed retry) stays 0 for all of these by construction.
  return makeReport(
    reportId,
    testEntries.map(([id, title, status]) =>
      makeTest(id, title, status, [{ retry: 0, status, duration: 100, errors: [] }])
    )
  );
}

describe("engine — Flaky Tests Trend (result.flakyTrend, cross-run classification)", () => {
  it("1: a test that changes passed -> failed -> passed becomes part of the flaky trend once the 2nd transition is observed, not before", () => {
    const runs = [
      passRun(1, [["a", "test a", "passed"]]),
      passRun(2, [["a", "test a", "failed"]]),
      passRun(3, [["a", "test a", "passed"]]),
    ];
    const result = compare(runs);
    assert.deepEqual(
      result.flakyTrend.map((r) => r.flaky),
      [0, 0, 1]
    );
    assert.equal(result.summary.flaky, 1);
  });

  it("2: a test that remains passed -> passed -> passed never contributes to the flaky count", () => {
    const runs = [
      passRun(1, [["a", "test a", "passed"]]),
      passRun(2, [["a", "test a", "passed"]]),
      passRun(3, [["a", "test a", "passed"]]),
    ];
    const result = compare(runs);
    assert.deepEqual(
      result.flakyTrend.map((r) => r.flaky),
      [0, 0, 0]
    );
  });

  it("3: a test that remains failed -> failed -> failed does not become flaky merely because it fails", () => {
    const runs = [
      passRun(1, [["a", "test a", "failed"]]),
      passRun(2, [["a", "test a", "failed"]]),
      passRun(3, [["a", "test a", "failed"]]),
    ];
    const result = compare(runs);
    assert.deepEqual(
      result.flakyTrend.map((r) => r.flaky),
      [0, 0, 0]
    );
    assert.equal(result.summary.flaky, 0);
  });

  it("4: multiple flaky tests produce the correct cumulative per-run trend, not a copy of the final count into every run", () => {
    // a: passed, failed, passed, failed — 2 transitions by run 3 (FLAKY from
    //    run 3 on; run 4 keeps 3 transitions, still FLAKY, not reclassified).
    // b: passed, passed, failed, passed — only 1 transition by run 3 (still
    //    NEWLY_FAILED, not flaky yet), reaching 2 transitions only at run 4.
    // d: passed, passed, passed, passed — never flaky, pure padding.
    const runs = [
      passRun(1, [
        ["a", "a", "passed"],
        ["b", "b", "passed"],
        ["d", "d", "passed"],
      ]),
      passRun(2, [
        ["a", "a", "failed"],
        ["b", "b", "passed"],
        ["d", "d", "passed"],
      ]),
      passRun(3, [
        ["a", "a", "passed"],
        ["b", "b", "failed"],
        ["d", "d", "passed"],
      ]),
      passRun(4, [
        ["a", "a", "failed"],
        ["b", "b", "passed"],
        ["d", "d", "passed"],
      ]),
    ];
    const result = compare(runs);
    assert.deepEqual(
      result.flakyTrend.map((r) => r.flaky),
      [0, 0, 1, 2]
    );
    // Not every run just echoes the final count (2) — run 3 is genuinely 1.
    assert.notEqual(result.flakyTrend[2].flaky, result.flakyTrend[3].flaky);
  });

  it("5: the final trend point agrees with the final suiteSummary.flaky count, derived from the same classify() calls — not forced to match", () => {
    const runs = [
      passRun(1, [
        ["a", "a", "passed"],
        ["b", "b", "failed"],
      ]),
      passRun(2, [
        ["a", "a", "failed"],
        ["b", "b", "failed"],
      ]),
      passRun(3, [
        ["a", "a", "passed"],
        ["b", "b", "failed"],
      ]),
    ];
    const result = compare(runs);
    const finalTrendPoint = result.flakyTrend[result.flakyTrend.length - 1];
    assert.equal(finalTrendPoint.flaky, result.summary.flaky);
    // a is flaky (passed/failed/passed, 2 transitions); b is stable_failure —
    // confirms the agreement isn't trivially 0-equals-0.
    assert.equal(result.summary.flaky, 1);
    assert.equal(finalTrendPoint.flaky, 1);
  });

  it("6: no Playwright retries are required — a single attempt per run is enough to build the flaky trend", () => {
    // Every makeTest() call below uses exactly one result entry (retry: 0) —
    // no test ever retries within a run — yet cross-run alternation still
    // produces a non-zero trend, proving in-run retries play no role here.
    const runs = [
      passRun(1, [["a", "a", "passed"]]),
      passRun(2, [["a", "a", "failed"]]),
      passRun(3, [["a", "a", "passed"]]),
    ];
    const result = compare(runs);
    assert.equal(result.flakyTrend[2].flaky, 1);
    assert.equal(result.statistics.aggregate.avgRetriesAcrossRuns, 0);
  });

  it("7: statistics.perRun[].flaky (in-run retry signal) is NOT the source — the two can disagree", () => {
    // Construct a run where a test PASSES on the very first attempt in every
    // run (so statistics.perRun[].flaky, which only fires on an in-run
    // failed-then-passed retry, is 0 for every run) while still alternating
    // pass/fail ACROSS runs (so the cross-run trend must be non-zero).
    const runs = [
      passRun(1, [["a", "a", "passed"]]),
      passRun(2, [["a", "a", "failed"]]),
      passRun(3, [["a", "a", "passed"]]),
    ];
    const result = compare(runs);
    assert.deepEqual(
      result.statistics.perRun.map((r) => r.flaky),
      [0, 0, 0]
    );
    assert.deepEqual(
      result.flakyTrend.map((r) => r.flaky),
      [0, 0, 1]
    );
  });

  it("8: Retries Per Run (statistics.perRun[].totalRetries) is untouched by this change", () => {
    const runWithRetry = makeReport(1, [
      makeTest("a", "a", "passed", [
        { retry: 0, status: "failed", duration: 100, errors: [] },
        { retry: 1, status: "passed", duration: 100, errors: [] },
      ]),
    ]);
    const runWithoutRetry = makeReport(2, [
      makeTest("a", "a", "passed", [{ retry: 0, status: "passed", duration: 100, errors: [] }]),
    ]);
    const result = compare([runWithRetry, runWithoutRetry]);
    assert.equal(result.statistics.perRun[0].totalRetries, 1);
    assert.equal(result.statistics.perRun[1].totalRetries, 0);
  });

  it("9: flakyTrend has exactly one entry per analyzed run — --lookback's window (applied upstream, before compare()) is what bounds this, not a separate limit here", () => {
    const runs = Array.from({ length: 5 }, (_, i) =>
      passRun(i + 1, [["a", "a", i % 2 === 0 ? "passed" : "failed"]])
    );
    const result = compare(runs);
    assert.equal(result.flakyTrend.length, 5);
    assert.deepEqual(
      result.flakyTrend.map((r) => r.runLabel),
      ["Run 1", "Run 2", "Run 3", "Run 4", "Run 5"]
    );
  });

  it("10: compare() still requires at least 2 reports — unchanged, single-run analysis is rejected upstream of flakyTrend, not silently miscomputed here", () => {
    const oneRun = [passRun(1, [["a", "a", "passed"]])];
    assert.throws(() => compare(oneRun), /requires at least 2 reports/);

    // The minimum viable case (exactly 2 reports) must not crash and produces
    // a sensible, non-empty trend.
    const twoRuns = [passRun(1, [["a", "a", "passed"]]), passRun(2, [["a", "a", "passed"]])];
    const result = compare(twoRuns);
    assert.deepEqual(
      result.flakyTrend.map((r) => r.flaky),
      [0, 0]
    );
  });

  it("a run where a test is skipped is excluded from that run's flaky count, matching buildSummary's skip-latest exclusion", () => {
    const runs = [
      passRun(1, [["a", "a", "passed"]]),
      passRun(2, [["a", "a", "failed"]]),
      makeReport(3, [
        makeTest("a", "a", "skipped", [{ retry: 0, status: "skipped", duration: 0, errors: [] }]),
      ]),
    ];
    const result = compare(runs);
    // At run 3, a's own outcome is "skipped" — excluded from that run's
    // count even though its prefix (passed, failed, skipped) would otherwise
    // still carry pass+fail signal from runs 1-2.
    assert.equal(result.flakyTrend[2].flaky, 0);
  });

  it("a test newly introduced partway through the window only affects later runs' counts, never earlier ones", () => {
    const runs = [
      passRun(1, [["a", "a", "passed"]]),
      passRun(2, [
        ["a", "a", "failed"],
        ["b", "b", "passed"],
      ]),
      passRun(3, [
        ["a", "a", "passed"],
        ["b", "b", "failed"],
      ]),
    ];
    const result = compare(runs);
    // b doesn't exist in run 1 at all — its prefix at n=1 is ["missing"],
    // which must not crash classify() or contribute to the count.
    assert.equal(result.flakyTrend[0].flaky, 0);
    assert.equal(result.flakyTrend[2].flaky, 1); // a is flaky by run 3
  });

  it("no flaky tests across the whole window produces an all-zero trend, not an empty or missing one", () => {
    const runs = [
      passRun(1, [["a", "a", "passed"]]),
      passRun(2, [["a", "a", "passed"]]),
      passRun(3, [["a", "a", "passed"]]),
    ];
    const result = compare(runs);
    assert.equal(result.flakyTrend.length, 3);
    assert.deepEqual(
      result.flakyTrend.map((r) => r.flaky),
      [0, 0, 0]
    );
  });
});
