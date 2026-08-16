const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeReport } = require("./extractor");

function makeReporterReport(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    reporter: { name: "test-reporter", version: "1.0.0" },
    metadata: { generatedAt: "2025-08-15T10:00:00Z", framework: "playwright" },
    timing: {
      startTime: "2025-08-15T10:00:00Z",
      endTime: "2025-08-15T10:01:00Z",
      durationMs: 60000,
    },
    summary: { total: 1, passed: 1, failed: 0, skipped: 0, flaky: 0, interrupted: 0 },
    tests: [],
    ...overrides,
  };
}

function makeLegacyReport(overrides = {}) {
  return {
    config: { configFile: "playwright.config.js", rootDir: "/tests" },
    suites: [],
    stats: { expected: 0, unexpected: 0, flaky: 0, skipped: 0 },
    ...overrides,
  };
}

// ─── Reporter-format reports ─────────────────────────────────

describe("extractor — reporter-format reports", () => {
  it("normalizes a passed test", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-1",
          title: "should pass",
          titlePath: ["Suite", "should pass"],
          location: { file: "suite.spec.js", line: 10, column: 4 },
          tags: ["@smoke"],
          status: "passed",
          results: [{ retry: 0, status: "passed", duration: 100, errors: [] }],
        },
      ],
    });

    const map = normalizeReport(report);
    assert.equal(map.size, 1);
    const test = map.get("tc-1");
    assert.equal(test.title, "should pass");
    assert.equal(test.outcome, "passed");
    assert.equal(test.file, "suite.spec.js");
    assert.deepEqual(test.errors, []);
    assert.equal(test.retriesUsedToPass, 0);
  });

  it("records retriesUsedToPass when a test passes after retrying", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-retry",
          title: "should pass on retry",
          titlePath: ["Suite", "should pass on retry"],
          location: { file: "suite.spec.js", line: 20, column: 4 },
          tags: [],
          status: "flaky",
          results: [
            { retry: 0, status: "failed", duration: 100, errors: [{ message: "flaked" }] },
            { retry: 1, status: "passed", duration: 90, errors: [] },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    const test = map.get("tc-retry");
    assert.equal(test.outcome, "passed");
    assert.equal(test.retriesUsedToPass, 1);
  });

  it("captures retryFailureErrors from the failed attempt(s) preceding a pass", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-retry-err",
          title: "should pass on retry with an error captured",
          titlePath: ["Suite", "should pass on retry with an error captured"],
          location: { file: "suite.spec.js", line: 25, column: 4 },
          tags: [],
          status: "flaky",
          results: [
            {
              retry: 0,
              status: "failed",
              duration: 100,
              errors: [{ message: "Timeout 30000ms exceeded", stack: "at line 1" }],
            },
            { retry: 1, status: "passed", duration: 90, errors: [] },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    const test = map.get("tc-retry-err");
    assert.equal(test.retryFailureErrors.length, 1);
    assert.equal(test.retryFailureErrors[0].message, "Timeout 30000ms exceeded");
    assert.equal(test.retryFailureErrors[0].stack, "at line 1");
  });

  it("passes snippet/location through retryFailureErrors when Playwright provides them", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-retry-err-snippet",
          title: "should pass on retry with a code frame captured",
          titlePath: ["Suite", "should pass on retry with a code frame captured"],
          location: { file: "suite.spec.js", line: 25, column: 4 },
          tags: [],
          status: "flaky",
          results: [
            {
              retry: 0,
              status: "failed",
              duration: 100,
              errors: [
                {
                  message: "Timeout 30000ms exceeded",
                  stack: "at line 1",
                  snippet: "39 |   foo();\n> 40 |   bar();\n     |   ^",
                  location: { file: "suite.spec.js", line: 40, column: 3 },
                },
              ],
            },
            { retry: 1, status: "passed", duration: 90, errors: [] },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    const test = map.get("tc-retry-err-snippet");
    assert.equal(test.retryFailureErrors[0].snippet, "39 |   foo();\n> 40 |   bar();\n     |   ^");
    assert.deepEqual(test.retryFailureErrors[0].location, {
      file: "suite.spec.js",
      line: 40,
      column: 3,
    });
  });

  it("defaults retryFailureErrors' snippet/location to null (not undefined) when Playwright doesn't provide them", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-retry-err-no-snippet",
          title: "should pass on retry without a code frame",
          titlePath: ["Suite", "should pass on retry without a code frame"],
          location: { file: "suite.spec.js", line: 25, column: 4 },
          tags: [],
          status: "flaky",
          results: [
            {
              retry: 0,
              status: "failed",
              duration: 100,
              errors: [{ message: "Timeout 30000ms exceeded" }],
            },
            { retry: 1, status: "passed", duration: 90, errors: [] },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    const test = map.get("tc-retry-err-no-snippet");
    assert.equal(test.retryFailureErrors[0].snippet, null);
    assert.equal(test.retryFailureErrors[0].location, null);
  });

  it("retryFailureErrors is empty when the test passed on the first attempt", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-clean-pass",
          title: "clean pass",
          titlePath: ["Suite", "clean pass"],
          location: { file: "suite.spec.js", line: 26, column: 4 },
          tags: [],
          status: "passed",
          results: [{ retry: 0, status: "passed", duration: 100, errors: [] }],
        },
      ],
    });

    const map = normalizeReport(report);
    assert.deepEqual(map.get("tc-clean-pass").retryFailureErrors, []);
  });

  it("retryFailureErrors is empty when the test ultimately fails (that's extractErrors' job)", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-still-failing-2",
          title: "still failing",
          titlePath: ["Suite", "still failing"],
          location: { file: "suite.spec.js", line: 27, column: 4 },
          tags: [],
          status: "unexpected",
          results: [
            { retry: 0, status: "failed", duration: 100, errors: [{ message: "fail 1" }] },
            { retry: 1, status: "failed", duration: 90, errors: [{ message: "fail 2" }] },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    assert.deepEqual(map.get("tc-still-failing-2").retryFailureErrors, []);
  });

  it("retriesUsedToPass is 0 when the test ultimately fails despite retries", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-still-failing",
          title: "still failing after retries",
          titlePath: ["Suite", "still failing after retries"],
          location: { file: "suite.spec.js", line: 30, column: 4 },
          tags: [],
          status: "unexpected",
          results: [
            { retry: 0, status: "failed", duration: 100, errors: [{ message: "fail 1" }] },
            { retry: 1, status: "failed", duration: 90, errors: [{ message: "fail 2" }] },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    const test = map.get("tc-still-failing");
    assert.equal(test.outcome, "failed");
    assert.equal(test.retriesUsedToPass, 0);
  });

  it("normalizes a failed test with errors", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-2",
          title: "should fail",
          titlePath: ["Suite", "should fail"],
          location: { file: "fail.spec.js", line: 20, column: 4 },
          tags: [],
          status: "failed",
          results: [
            {
              retry: 0,
              status: "failed",
              duration: 500,
              errors: [{ message: "Assertion error", stack: "at fail.spec.js:20:4" }],
            },
            {
              retry: 1,
              status: "failed",
              duration: 400,
              errors: [{ message: "Still failing", stack: "at fail.spec.js:20:4" }],
            },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    const test = map.get("tc-2");
    assert.equal(test.outcome, "failed");
    assert.equal(test.errors.length, 1);
    assert.equal(test.errors[0].message, "Still failing");
  });

  it("passes snippet/location through extractErrors when Playwright provides them", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-2-snippet",
          title: "should fail with a code frame",
          titlePath: ["Suite", "should fail with a code frame"],
          location: { file: "fail.spec.js", line: 20, column: 4 },
          tags: [],
          status: "failed",
          results: [
            {
              retry: 0,
              status: "failed",
              duration: 500,
              errors: [
                {
                  message: "Assertion error",
                  stack: "at fail.spec.js:20:4",
                  snippet: "19 |   await x();\n> 20 |   await y();\n     |   ^",
                  location: { file: "fail.spec.js", line: 20, column: 4 },
                },
              ],
            },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    const test = map.get("tc-2-snippet");
    assert.equal(test.errors[0].snippet, "19 |   await x();\n> 20 |   await y();\n     |   ^");
    assert.deepEqual(test.errors[0].location, { file: "fail.spec.js", line: 20, column: 4 });
  });

  it("defaults extractErrors' snippet/location to null (not undefined) for old-shaped input with no snippet/location at all", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-2-no-snippet",
          title: "should fail without a code frame",
          titlePath: ["Suite", "should fail without a code frame"],
          location: { file: "fail.spec.js", line: 20, column: 4 },
          tags: [],
          status: "failed",
          results: [
            {
              retry: 0,
              status: "failed",
              duration: 500,
              errors: [{ message: "Assertion error", stack: "at fail.spec.js:20:4" }],
            },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    const test = map.get("tc-2-no-snippet");
    assert.equal(test.errors[0].snippet, null);
    assert.equal(test.errors[0].location, null);
  });

  it("marks a test as passed when last retry passes after failures", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-flaky",
          title: "flaky test",
          titlePath: ["Suite", "flaky test"],
          location: { file: "flaky.spec.js", line: 5, column: 4 },
          tags: [],
          status: "passed",
          results: [
            { retry: 0, status: "failed", duration: 300, errors: [{ message: "fail" }] },
            { retry: 1, status: "passed", duration: 200, errors: [] },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    assert.equal(map.get("tc-flaky").outcome, "passed");
    assert.deepEqual(map.get("tc-flaky").errors, []);
  });

  it("handles skipped test", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-skip",
          title: "skipped test",
          titlePath: ["Suite", "skipped test"],
          location: { file: "skip.spec.js" },
          tags: [],
          status: "skipped",
          results: [],
        },
      ],
    });

    const map = normalizeReport(report);
    assert.equal(map.get("tc-skip").outcome, "skipped");
  });

  it("uses titlePath to build id when id is missing", () => {
    const report = makeReporterReport({
      tests: [
        {
          title: "no id",
          titlePath: ["Root", "Child", "no id"],
          location: { file: "test.spec.js" },
          tags: [],
          status: "passed",
          results: [{ retry: 0, status: "passed", duration: 100, errors: [] }],
        },
      ],
    });

    const map = normalizeReport(report);
    assert.ok(map.has("Root > Child > no id"));
  });
});

// ─── Legacy-format reports ────────────────────────────────────

describe("extractor — legacy-format reports", () => {
  it("normalizes a legacy passed test", () => {
    const report = makeLegacyReport({
      suites: [
        {
          title: "login.spec.js",
          file: "login.spec.js",
          specs: [
            {
              title: "should login",
              tags: ["@login"],
              tests: [
                {
                  status: "expected",
                  results: [{ status: "passed", duration: 1000, errors: [], retry: 0 }],
                },
              ],
            },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    const test = map.get("should login");
    assert.ok(test);
    assert.equal(test.outcome, "passed");
    assert.equal(test.file, "login.spec.js");
  });

  it("normalizes a legacy failed test with no passing retries", () => {
    const report = makeLegacyReport({
      suites: [
        {
          title: "fail.spec.js",
          file: "fail.spec.js",
          specs: [
            {
              title: "should fail",
              tags: [],
              tests: [
                {
                  status: "unexpected",
                  results: [
                    { status: "failed", duration: 500, errors: [{ message: "boom" }], retry: 0 },
                    {
                      status: "failed",
                      duration: 400,
                      errors: [{ message: "boom again" }],
                      retry: 1,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    const test = map.get("should fail");
    assert.equal(test.errors[0].snippet, null);
    assert.equal(test.errors[0].location, null);
    assert.equal(test.outcome, "failed");
    assert.ok(test.errors.length > 0);
  });

  it("detects flaky tests in legacy format (failed then passed)", () => {
    const report = makeLegacyReport({
      suites: [
        {
          title: "flaky.spec.js",
          file: "flaky.spec.js",
          specs: [
            {
              title: "flaky test",
              tags: [],
              tests: [
                {
                  status: "flaky",
                  results: [
                    { status: "failed", duration: 300, errors: [], retry: 0 },
                    { status: "passed", duration: 200, errors: [], retry: 1 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    const test = map.get("flaky test");
    assert.equal(test.outcome, "passed");
  });

  it("handles multi-spec suites", () => {
    const report = makeLegacyReport({
      suites: [
        {
          title: "suite.spec.js",
          file: "suite.spec.js",
          specs: [
            {
              title: "test A",
              tags: [],
              tests: [
                {
                  status: "expected",
                  results: [{ status: "passed", duration: 100, errors: [], retry: 0 }],
                },
              ],
            },
            {
              title: "test B",
              tags: [],
              tests: [
                {
                  status: "expected",
                  results: [{ status: "passed", duration: 100, errors: [], retry: 0 }],
                },
              ],
            },
          ],
        },
      ],
    });

    const map = normalizeReport(report);
    assert.equal(map.size, 2);
    assert.ok(map.has("test A"));
    assert.ok(map.has("test B"));
  });

  it("handles suites with no specs gracefully", () => {
    const report = makeLegacyReport({
      suites: [{ title: "empty.spec.js", file: "empty.spec.js" }],
    });

    const map = normalizeReport(report);
    assert.equal(map.size, 0);
  });
});

// ─── Mixed edge cases ─────────────────────────────────────────

describe("extractor — edge cases", () => {
  it("handles empty tests array", () => {
    const report = makeReporterReport({ tests: [] });
    const map = normalizeReport(report);
    assert.equal(map.size, 0);
  });

  it("handles tests with no results array", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-no-results",
          title: "no results",
          titlePath: ["no results"],
          location: { file: "test.spec.js" },
          tags: [],
          status: "passed",
        },
      ],
    });

    const map = normalizeReport(report);
    assert.equal(map.get("tc-no-results").outcome, "passed");
  });

  it("determines outcome from status when results are empty", () => {
    const report = makeReporterReport({
      tests: [
        {
          id: "tc-empty-results",
          title: "test",
          titlePath: ["test"],
          location: { file: "test.spec.js" },
          tags: [],
          status: "interrupted",
          results: [],
        },
      ],
    });

    const map = normalizeReport(report);
    assert.equal(map.get("tc-empty-results").outcome, "interrupted");
  });
});

// ─── Duplicate test ID handling ────────────────────────────────

describe("extractor — duplicate IDs", () => {
  it("keeps evidence when duplicate entry has empty results", () => {
    var report = makeReporterReport({
      tests: [
        {
          id: "dup-1",
          title: "failing test",
          titlePath: ["failing test"],
          location: { file: "test.spec.js" },
          tags: ["@smoke"],
          status: "failed",
          results: [
            {
              retry: 0,
              status: "failed",
              duration: 500,
              errors: [{ message: "boom", stack: "at test.js:10" }],
              attachments: [
                { name: "screenshot", contentType: "image/png", path: "/tmp/screenshot.png" },
                { name: "trace", contentType: "application/zip", path: "/tmp/trace.zip" },
                { name: "video", contentType: "video/webm", path: "/tmp/video.webm" },
              ],
            },
          ],
        },
        // Duplicate — empty results (Playwright ghost record)
        {
          id: "dup-1",
          title: "failing test",
          titlePath: ["failing test"],
          location: { file: "test.spec.js" },
          tags: [],
          status: "failed",
          results: [],
        },
      ],
    });

    var map = normalizeReport(report);
    var test = map.get("dup-1");
    assert.ok(test, "test should exist");
    assert.equal(test.outcome, "failed");
    assert.ok(test.evidence, "evidence should not be null");
    assert.equal(test.evidence.screenshots.length, 1);
    assert.equal(test.evidence.screenshots[0], "/tmp/screenshot.png");
    assert.equal(test.evidence.trace, "/tmp/trace.zip");
    assert.equal(test.evidence.video, "/tmp/video.webm");
    assert.equal(test.errors.length, 1, "should keep errors from first entry");
    assert.equal(test.tags[0], "@smoke", "should keep tags from first entry");
  });

  it("keeps evidence when second entry has it", () => {
    var report = makeReporterReport({
      tests: [
        // First entry — empty results
        {
          id: "dup-2",
          title: "test B",
          titlePath: ["test B"],
          location: { file: "test.spec.js" },
          tags: [],
          status: "unknown",
          results: [],
        },
        // Second entry — has evidence
        {
          id: "dup-2",
          title: "test B",
          titlePath: ["test B"],
          location: { file: "test.spec.js" },
          tags: ["@important"],
          status: "failed",
          results: [
            {
              retry: 0,
              status: "failed",
              duration: 300,
              errors: [{ message: "error", stack: "at test.js:20" }],
              attachments: [{ name: "screenshot", contentType: "image/png", path: "/tmp/s2.png" }],
            },
          ],
        },
      ],
    });

    var map = normalizeReport(report);
    var test = map.get("dup-2");
    assert.ok(test);
    assert.equal(test.outcome, "failed");
    assert.ok(test.evidence, "evidence should be populated from second entry");
    assert.equal(test.evidence.screenshots[0], "/tmp/s2.png");
    assert.equal(test.errors.length, 1);
    assert.equal(test.tags[0], "@important");
  });

  it("merges partial information from both entries", () => {
    var report = makeReporterReport({
      tests: [
        {
          id: "dup-3",
          title: "partial A",
          titlePath: ["partial A"],
          location: { file: "test.spec.js" },
          tags: ["@tagA"],
          status: "failed",
          results: [
            {
              retry: 0,
              status: "failed",
              duration: 400,
              errors: [{ message: "error A", stack: "at a.js:1" }],
              attachments: [],
            },
          ],
        },
        {
          id: "dup-3",
          title: "partial A",
          titlePath: ["partial A"],
          location: { file: "test.spec.js" },
          tags: [],
          status: "failed",
          results: [
            {
              retry: 0,
              status: "failed",
              duration: 400,
              errors: [],
              attachments: [{ name: "trace", contentType: "application/zip", path: "/tmp/t.zip" }],
            },
          ],
        },
      ],
    });

    var map = normalizeReport(report);
    var test = map.get("dup-3");
    assert.ok(test);
    // First entry provides errors, tags
    assert.equal(test.errors.length, 1);
    assert.equal(test.errors[0].message, "error A");
    assert.equal(test.tags[0], "@tagA");
    // Second entry provides evidence (trace)
    assert.ok(test.evidence, "should have evidence from second entry");
    assert.equal(test.evidence.trace, "/tmp/t.zip");
  });

  it("does not break non-duplicate reports", () => {
    var report = makeReporterReport({
      tests: [
        {
          id: "unique-1",
          title: "test X",
          titlePath: ["test X"],
          location: { file: "test.spec.js" },
          tags: [],
          status: "passed",
          results: [],
        },
        {
          id: "unique-2",
          title: "test Y",
          titlePath: ["test Y"],
          location: { file: "test.spec.js" },
          tags: [],
          status: "failed",
          results: [
            {
              retry: 0,
              status: "failed",
              duration: 250,
              errors: [{ message: "fail", stack: "at y.js:5" }],
              attachments: [{ name: "screenshot", contentType: "image/png", path: "/tmp/y.png" }],
            },
          ],
        },
      ],
    });

    var map = normalizeReport(report);
    assert.equal(map.size, 2, "both unique tests should be present");
    var y = map.get("unique-2");
    assert.ok(y);
    assert.ok(y.evidence, "evidence for unique-2 should be intact");
    assert.equal(y.evidence.screenshots[0], "/tmp/y.png");
    assert.equal(y.errors[0].message, "fail");
  });
});
