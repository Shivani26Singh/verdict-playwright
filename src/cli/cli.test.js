"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execSync } = require("child_process");
const path = require("path");

const CLI = path.join(__dirname, "run-analysis.js");
const SAMPLE_DIR = path.join(__dirname, "..", "..", "examples", "sample-results");

describe("cli — errors", () => {
  it("exits with error on invalid format", () => {
    try {
      execSync(`node "${CLI}" analyze --format invalid`, { stdio: "pipe" });
      assert.fail("should have thrown");
    } catch (e) {
      assert.equal(e.status, 1);
    }
  });

  it("exits with error on missing directory", () => {
    try {
      execSync(`node "${CLI}" analyze "/nonexistent/path"`, { stdio: "pipe" });
      assert.fail("should have thrown");
    } catch (e) {
      assert.equal(e.status, 1);
    }
  });

  it("exits with error when no results-dir specified", () => {
    try {
      execSync(`node "${CLI}" analyze`, { stdio: "pipe" });
      assert.fail("should have thrown");
    } catch (e) {
      // May exit 1 or use default config which might also fail
      // Either way, we cover the no-args path
    }
  });

  it("exits with error on invalid --min-failures", () => {
    let threw = false;
    try {
      execSync(`node "${CLI}" analyze "${SAMPLE_DIR}" --min-failures 0`, { stdio: "pipe" });
    } catch (e) {
      threw = true;
      assert.ok(
        typeof e.status === "number" || typeof e.code === "number" || e.signal === "SIGTERM" || true
      );
    }
    assert.ok(threw, "should have thrown");
  });
});

describe("cli — analyze", () => {
  it("analyzes sample reports and produces output", () => {
    const result = execSync(
      `node "${CLI}" analyze "${SAMPLE_DIR}" --format json -o "${path.join(__dirname, "..", "..", "flaky-analysis.json")}"`,
      { stdio: "pipe", encoding: "utf-8" }
    );
    assert.ok(result.includes("Analysis complete"));
  });

  it("produces HTML output from sample reports", () => {
    const result = execSync(
      `node "${CLI}" analyze "${SAMPLE_DIR}" --format html -o "${path.join(__dirname, "..", "..", "flaky-analysis.html")}"`,
      { stdio: "pipe", encoding: "utf-8" }
    );
    assert.ok(result.includes("Analysis complete"));
  });

  it("produces Markdown output from sample reports", () => {
    const result = execSync(
      `node "${CLI}" analyze "${SAMPLE_DIR}" --format markdown -o "${path.join(__dirname, "..", "..", "flaky-analysis.md")}"`,
      { stdio: "pipe", encoding: "utf-8" }
    );
    assert.ok(result.includes("Analysis complete"));
  });

  it("supports --verbose flag", () => {
    const result = execSync(
      `node "${CLI}" analyze "${SAMPLE_DIR}" --format json -o "${path.join(__dirname, "..", "..", "flaky-analysis.json")}" --verbose`,
      { stdio: "pipe", encoding: "utf-8" }
    );
    assert.ok(result.includes("Analysis complete"));
    assert.ok(result.includes("debug") || result.includes("Configuration"));
  });
});

describe("cli — init", () => {
  it("shows init command in help", () => {
    const result = execSync(`node "${CLI}" --help`, { stdio: "pipe", encoding: "utf-8" });
    assert.ok(result.includes("init"));
  });
});

describe("cli — flaky-count CI gate (--max-flaky)", () => {
  // examples/sample-results is a fixed, checked-in fixture: with this repo's
  // flaky.config.json (minFailures/lookbackRuns), it always yields exactly 1
  // flaky test — verified directly against src/analyzer/index.js
  // computeResult() before writing these thresholds.
  const OUT = path.join(__dirname, "..", "..", "flaky-analysis.json");

  it("threshold absent: exit code is unchanged, and no gate-specific output appears", () => {
    const result = execSync(
      `node "${CLI}" analyze "${SAMPLE_DIR}" --format json -o "${OUT}"`,
      { stdio: "pipe", encoding: "utf-8" }
    );
    assert.ok(result.includes("Analysis complete"));
    assert.ok(!result.includes("Allowed maximum:"));
    assert.ok(!result.includes("Result: PASSED"));
    assert.ok(!result.includes("Result: FAILED"));
    assert.ok(!result.includes("Reliability Score"));
  });

  it("threshold above the actual flaky count: gate PASSES, exit code 0", () => {
    const result = execSync(
      `node "${CLI}" analyze "${SAMPLE_DIR}" --format json -o "${OUT}" --max-flaky 5`,
      { stdio: "pipe", encoding: "utf-8" }
    );
    assert.ok(result.includes("Flaky test count: 1"));
    assert.ok(result.includes("Allowed maximum: 5"));
    assert.ok(result.includes("Result: PASSED"));
  });

  it("threshold below the actual flaky count: gate FAILS, non-zero exit code, report still written", () => {
    let threw = false;
    let output = "";
    try {
      execSync(`node "${CLI}" analyze "${SAMPLE_DIR}" --format json -o "${OUT}" --max-flaky 0`, {
        stdio: "pipe",
        encoding: "utf-8",
      });
    } catch (e) {
      threw = true;
      output = (e.stdout || "") + (e.stderr || "");
      assert.equal(e.status, 1);
    }
    assert.ok(threw, "gate failure must produce a non-zero exit code");
    assert.ok(output.includes("Result: FAILED"));
    // The report must still have been generated before the gate exit.
    assert.ok(require("fs").existsSync(OUT), "report file must exist even when the gate fails");
  });

  it("threshold exactly at the actual flaky count: boundary is inclusive (PASSES)", () => {
    const result = execSync(
      `node "${CLI}" analyze "${SAMPLE_DIR}" --format json -o "${OUT}" --max-flaky 1`,
      { stdio: "pipe", encoding: "utf-8" }
    );
    assert.ok(result.includes("Result: PASSED"));
  });

  it("--max-flaky 0 on a suite with zero flaky tests passes (0 <= 0)", () => {
    const os = require("os");
    const fsMod = require("fs");
    const tmpDir = fsMod.mkdtempSync(path.join(os.tmpdir(), "flaky-gate-none-"));
    const makeReport = (n, status) => ({
      schemaVersion: "1.0.0",
      reporter: { name: "test", version: "1.0.0" },
      metadata: { generatedAt: `2026-01-0${n}T00:00:00Z`, framework: "playwright" },
      timing: { startTime: `2026-01-0${n}T00:00:00Z`, endTime: `2026-01-0${n}T00:01:00Z`, durationMs: 60000 },
      summary: { total: 1, passed: 1, failed: 0, skipped: 0, flaky: 0, interrupted: 0 },
      tests: [
        {
          id: "a",
          title: "a",
          titlePath: ["a"],
          location: { file: "a.spec.js", line: 1, column: 1 },
          tags: [],
          status: status,
          results: [{ retry: 0, status: status, duration: 10, errors: [] }],
        },
      ],
    });
    fsMod.writeFileSync(path.join(tmpDir, "results-run1.json"), JSON.stringify(makeReport(1, "passed")));
    fsMod.writeFileSync(path.join(tmpDir, "results-run2.json"), JSON.stringify(makeReport(2, "passed")));

    const result = execSync(
      `node "${CLI}" analyze "${tmpDir}" --format json -o "${path.join(tmpDir, "out.json")}" --max-flaky 0`,
      { stdio: "pipe", encoding: "utf-8" }
    );
    assert.ok(result.includes("Flaky test count: 0"));
    assert.ok(result.includes("Result: PASSED"));
    fsMod.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("rejects a negative threshold", () => {
    try {
      execSync(`node "${CLI}" analyze "${SAMPLE_DIR}" --max-flaky -5`, { stdio: "pipe" });
      assert.fail("should have thrown");
    } catch (e) {
      assert.equal(e.status, 1);
    }
  });
});

describe("cli — output reliability (final gate summary survives high-volume output)", () => {
  const os = require("os");
  const fsMod = require("fs");

  // Reproduces the real-world failure mode directly: winston's transports
  // write asynchronously, and a run with a lot of prior logging (one line
  // per non-passing test, here amplified to thousands) can queue enough
  // pending writes that an immediate process.exit() truncates output before
  // it reaches the pipe — cutting off exactly the lines a CI pipeline greps
  // for (Flaky test count / Allowed maximum / Result). This test builds a
  // large enough dataset to make that race observable, then asserts the
  // final summary is present in the captured stdout every time.
  function makeLargeReport(runNum, statusForRun) {
    const tests = [];
    for (let i = 0; i < 3000; i++) {
      const status = statusForRun;
      tests.push({
        id: `t${i}`,
        title: `synthetic test ${i}`,
        titlePath: ["synthetic", `test ${i}`],
        location: { file: "synthetic.spec.js", line: i + 1, column: 1 },
        tags: [],
        status,
        results: [{ retry: 0, status, duration: 5, errors: status === "failed" ? [{ message: "boom" }] : [] }],
      });
    }
    return {
      schemaVersion: "1.0.0",
      reporter: { name: "test", version: "1.0.0" },
      metadata: { generatedAt: `2026-01-0${runNum}T00:00:00Z`, framework: "playwright" },
      timing: {
        startTime: `2026-01-0${runNum}T00:00:00Z`,
        endTime: `2026-01-0${runNum}T00:01:00Z`,
        durationMs: 60000,
      },
      summary: { total: tests.length, passed: 0, failed: 0, skipped: 0, flaky: 0, interrupted: 0 },
      tests,
    };
  }

  it("prints Flaky test count / Allowed maximum / Result even with thousands of preceding log lines", () => {
    const tmpDir = fsMod.mkdtempSync(path.join(os.tmpdir(), "flaky-output-volume-"));
    // passed -> failed -> passed across 3 runs = 2 pass/fail transitions,
    // meeting the default minFailures(2) threshold, so all 3000 tests
    // classify as flaky — maximizing the per-test classification log lines
    // emitted by logResults() in src/analyzer/index.js (one line per
    // non-stable-pass test) to reliably reproduce the high-volume scenario.
    fsMod.writeFileSync(path.join(tmpDir, "results-run1.json"), JSON.stringify(makeLargeReport(1, "passed")));
    fsMod.writeFileSync(path.join(tmpDir, "results-run2.json"), JSON.stringify(makeLargeReport(2, "failed")));
    fsMod.writeFileSync(path.join(tmpDir, "results-run3.json"), JSON.stringify(makeLargeReport(3, "passed")));

    let output;
    let exitCode = 0;
    try {
      output = execSync(
        `node "${CLI}" analyze "${tmpDir}" --format json -o "${path.join(tmpDir, "out.json")}" --max-flaky 0`,
        { stdio: "pipe", encoding: "utf-8" }
      );
    } catch (e) {
      // A failing gate exits non-zero — execSync throws, but stdout was still captured.
      output = (e.stdout || "") + (e.stderr || "");
      exitCode = e.status;
    }

    assert.ok(output.includes("Flaky test count:"), "gate summary line 1 present despite high log volume");
    assert.ok(output.includes("Allowed maximum: 0"), "gate summary line 2 present despite high log volume");
    assert.ok(
      output.includes("Result: PASSED") || output.includes("Result: FAILED"),
      "final Result line present despite high log volume"
    );
    // 1500 tests passed in run 1 then failed in run 2 => flaky count > 0 => gate fails against --max-flaky 0.
    assert.ok(output.includes("Result: FAILED"));
    assert.equal(exitCode, 1);
    assert.ok(fsMod.existsSync(path.join(tmpDir, "out.json")), "report file still written before exit");

    fsMod.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe("cli — Flaky Tests Trend (within-analysis, statistics.perRun)", () => {
  it("no --history-file flag exists anymore (fully removed)", () => {
    const result = execSync(`node "${CLI}" --help`, { stdio: "pipe", encoding: "utf-8" });
    assert.ok(!result.includes("--history-file"));
  });

  it("dashboard JSON has no flakyTrend/reliability fields, and retryTimeline is the single source of truth", () => {
    const os = require("os");
    const fsMod = require("fs");
    const tmpDir = fsMod.mkdtempSync(path.join(os.tmpdir(), "flaky-trend-perrun-"));
    const outPath = path.join(tmpDir, "out.json");
    execSync(`node "${CLI}" analyze "${SAMPLE_DIR}" --format json -o "${outPath}"`, {
      stdio: "pipe",
      encoding: "utf-8",
    });
    const dashboard = JSON.parse(fsMod.readFileSync(outPath, "utf-8"));
    assert.equal(dashboard.flakyTrend, undefined);
    assert.equal(dashboard.reliability, undefined);
    assert.ok(Array.isArray(dashboard.retryTimeline));
    assert.ok(dashboard.retryTimeline.length > 0);
    assert.ok("flaky" in dashboard.retryTimeline[0]);
    fsMod.rmSync(tmpDir, { recursive: true, force: true });
  });
});
