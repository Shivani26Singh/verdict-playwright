const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const { run, compare, compute } = require("./index");

const TEST_DIR = path.join(__dirname, "..", "..", "test-output", "analyzer-index");

describe("analyzer/index — run", () => {
  before(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  it("returns null when no JSON files found", () => {
    const result = run({
      input: { resultsDir: path.join(TEST_DIR, "empty-dir") },
      analyzer: { lookbackRuns: 10 },
      output: { format: "json" },
    });
    assert.strictEqual(result, null);
  });

  it("returns null with fewer than 2 valid reports", () => {
    const singleRunDir = path.join(TEST_DIR, "single-run");
    fs.mkdirSync(singleRunDir, { recursive: true });
    const report = {
      config: {},
      suites: [
        {
          title: "suite",
          specs: [
            {
              title: "test",
              tests: [
                {
                  title: "passing test",
                  results: [
                    {
                      status: "passed",
                      duration: 100,
                      retry: 0,
                      startTime: "2024-01-01T00:00:00Z",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    fs.writeFileSync(path.join(singleRunDir, "results-run1.json"), JSON.stringify(report));
    const result = run({
      input: { resultsDir: singleRunDir },
      analyzer: { lookbackRuns: 10 },
      output: { format: "json" },
    });
    assert.strictEqual(result, null);
  });

  it("compares two valid reports successfully", () => {
    const multiRunDir = path.join(TEST_DIR, "multi-run");
    fs.mkdirSync(multiRunDir, { recursive: true });
    const makeReport = (status) => ({
      config: {},
      suites: [
        {
          title: "suite",
          specs: [
            {
              title: "test",
              tests: [
                {
                  title: "my test",
                  results: [
                    {
                      status,
                      duration: 100,
                      retry: 0,
                      startTime: "2024-01-01T00:00:00Z",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    fs.writeFileSync(
      path.join(multiRunDir, "results-run1.json"),
      JSON.stringify(makeReport("passed"))
    );
    fs.writeFileSync(
      path.join(multiRunDir, "results-run2.json"),
      JSON.stringify(makeReport("passed"))
    );
    const result = run({
      input: { resultsDir: multiRunDir },
      analyzer: { lookbackRuns: 10 },
      output: { format: "json" },
    });
    assert.ok(result);
    assert.ok(result.summary);
    assert.strictEqual(result.summary.runsAnalyzed, 2);
    assert.strictEqual(result.summary.stable_pass, 1);
  });

  it("html format does NOT write a companion .json file by default", () => {
    const dir = path.join(TEST_DIR, "html-no-json");
    fs.mkdirSync(dir, { recursive: true });
    const makeReport = (status) => ({
      config: {},
      suites: [
        {
          title: "suite",
          specs: [
            {
              title: "test",
              tests: [
                {
                  title: "my test",
                  results: [{ status, duration: 100, retry: 0, startTime: "2024-01-01T00:00:00Z" }],
                },
              ],
            },
          ],
        },
      ],
    });
    fs.writeFileSync(path.join(dir, "results-run1.json"), JSON.stringify(makeReport("passed")));
    fs.writeFileSync(path.join(dir, "results-run2.json"), JSON.stringify(makeReport("passed")));
    const outputFile = path.join(dir, "dashboard.html");
    run({
      input: { resultsDir: dir },
      analyzer: { lookbackRuns: 10 },
      output: { format: "html", outputFile, copyEvidence: false },
    });
    assert.ok(fs.existsSync(outputFile), "html file should be written");
    assert.ok(
      !fs.existsSync(path.join(dir, "dashboard.json")),
      "json companion should NOT be written without alsoJson"
    );
  });

  it("html format writes the companion .json file when alsoJson is set", () => {
    const dir = path.join(TEST_DIR, "html-with-json");
    fs.mkdirSync(dir, { recursive: true });
    const makeReport = (status) => ({
      config: {},
      suites: [
        {
          title: "suite",
          specs: [
            {
              title: "test",
              tests: [
                {
                  title: "my test",
                  results: [{ status, duration: 100, retry: 0, startTime: "2024-01-01T00:00:00Z" }],
                },
              ],
            },
          ],
        },
      ],
    });
    fs.writeFileSync(path.join(dir, "results-run1.json"), JSON.stringify(makeReport("passed")));
    fs.writeFileSync(path.join(dir, "results-run2.json"), JSON.stringify(makeReport("passed")));
    const outputFile = path.join(dir, "dashboard.html");
    run({
      input: { resultsDir: dir },
      analyzer: { lookbackRuns: 10 },
      output: { format: "html", outputFile, alsoJson: true, copyEvidence: false },
    });
    assert.ok(fs.existsSync(outputFile), "html file should be written");
    assert.ok(
      fs.existsSync(path.join(dir, "dashboard.json")),
      "json companion should be written when alsoJson is true"
    );
  });

  it("html format writes a portable bundle (index.html + assets/) by default", () => {
    const dir = path.join(TEST_DIR, "html-bundle");
    fs.mkdirSync(dir, { recursive: true });
    const makeReport = (status) => ({
      config: {},
      suites: [
        {
          title: "suite",
          specs: [
            {
              title: "a test",
              tests: [{ projectName: "chromium", results: [{ status }] }],
            },
          ],
        },
      ],
    });
    fs.writeFileSync(path.join(dir, "results-run1.json"), JSON.stringify(makeReport("passed")));
    fs.writeFileSync(path.join(dir, "results-run2.json"), JSON.stringify(makeReport("failed")));
    const outputFile = path.join(dir, "report.html");
    run({
      input: { resultsDir: dir },
      analyzer: { lookbackRuns: 10 },
      output: { format: "html", outputFile }, // copyEvidence defaults on
    });
    // Bundle mode: the report is <name>/index.html, not a single <name>.html.
    assert.ok(
      fs.existsSync(path.join(dir, "report", "index.html")),
      "portable bundle index.html should be written"
    );
    assert.ok(
      !fs.existsSync(outputFile),
      "single-file report.html should NOT be written in bundle mode"
    );
  });

  it("skips invalid JSON files", () => {
    const invalidDir = path.join(TEST_DIR, "mixed-validity");
    fs.mkdirSync(invalidDir, { recursive: true });
    const validReport = {
      config: {},
      suites: [
        {
          title: "suite",
          specs: [
            {
              title: "test",
              tests: [
                {
                  title: "test1",
                  results: [
                    {
                      status: "passed",
                      duration: 100,
                      retry: 0,
                      startTime: "2024-01-01T00:00:00Z",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    fs.writeFileSync(path.join(invalidDir, "results-run1.json"), JSON.stringify(validReport));
    fs.writeFileSync(path.join(invalidDir, "results-run2.json"), JSON.stringify(validReport));
    fs.writeFileSync(path.join(invalidDir, "bad.json"), '{"not": "a report"}');
    const result = run({
      input: { resultsDir: invalidDir },
      analyzer: { lookbackRuns: 10 },
      output: { format: "json" },
    });
    assert.ok(result);
    assert.strictEqual(result.summary.runsAnalyzed, 2);
  });

  after(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });
});

describe("analyzer/index — exports", () => {
  it("exports run, compare, and compute", () => {
    assert.strictEqual(typeof run, "function");
    assert.strictEqual(typeof compare, "function");
    assert.strictEqual(typeof compute, "function");
  });
});

describe("analyzer/index — run ordering (regression for numeric run-file order)", () => {
  const ORDER_DIR = path.join(__dirname, "..", "..", "test-output", "analyzer-index-ordering");

  const RESULT = (status) => ({
    status,
    duration: 100,
    retry: 0,
    startTime: "2024-01-01T00:00:00Z",
  });
  const reportWith = (tests) => ({
    config: {},
    suites: [
      {
        title: "suite",
        specs: tests.map((t) => ({
          title: t.title,
          tests: [{ title: t.title, results: [RESULT(t.status)] }],
        })),
      },
    ],
  });
  const makeReport = (status) => reportWith([{ title: "my test", status }]);

  const writeRuns = (dir, statuses) => {
    fs.mkdirSync(dir, { recursive: true });
    statuses.forEach((status, i) => {
      fs.writeFileSync(
        path.join(dir, `results-run${i + 1}.json`),
        JSON.stringify(makeReport(status))
      );
    });
    return dir;
  };

  const analyze = (dir, lookbackRuns = 10) =>
    run({ input: { resultsDir: dir }, analyzer: { lookbackRuns }, output: { format: "json" } });

  const myTest = (result) => result.results.find((r) => r.title === "my test");

  before(() => {
    fs.rmSync(ORDER_DIR, { recursive: true, force: true });
    fs.mkdirSync(ORDER_DIR, { recursive: true });
  });
  after(() => {
    fs.rmSync(ORDER_DIR, { recursive: true, force: true });
  });

  it("10 runs: newest run detected, pass×9 then fail-in-latest → newly_failed", () => {
    const dir = writeRuns(path.join(ORDER_DIR, "ten"), [...Array(9).fill("passed"), "failed"]);
    const result = analyze(dir, 10);
    const t = myTest(result);
    assert.strictEqual(result.summary.runsAnalyzed, 10);
    assert.strictEqual(t.history.length, 10);
    assert.deepStrictEqual(t.history, [...Array(9).fill("passed"), "failed"]);
    assert.strictEqual(t.lastOutcome, "failed");
    assert.strictEqual(t.classification, "newly_failed");
  });

  it("10 runs: newest run detected, fail×9 then pass-in-latest → fixed", () => {
    const dir = writeRuns(path.join(ORDER_DIR, "ten-fixed"), [
      ...Array(9).fill("failed"),
      "passed",
    ]);
    const t = myTest(analyze(dir, 10));
    assert.strictEqual(t.lastOutcome, "passed");
    assert.strictEqual(t.classification, "fixed");
  });

  it("11 runs: default lookback keeps the newest 10 in numeric order", () => {
    const dir = writeRuns(path.join(ORDER_DIR, "eleven"), [...Array(10).fill("passed"), "failed"]);
    const result = analyze(dir, 10);
    const t = myTest(result);
    assert.strictEqual(result.summary.runsAnalyzed, 10);
    assert.strictEqual(t.history.length, 10);
    assert.strictEqual(t.lastOutcome, "failed");
    assert.strictEqual(t.classification, "newly_failed");
  });

  it("15 runs: run15 is correctly identified as newest despite lexical ordering traps", () => {
    const dir = writeRuns(path.join(ORDER_DIR, "fifteen"), [...Array(14).fill("passed"), "failed"]);
    const result = analyze(dir, 10);
    const t = myTest(result);
    assert.strictEqual(result.summary.runsAnalyzed, 10);
    assert.strictEqual(t.lastOutcome, "failed");
    assert.strictEqual(t.classification, "newly_failed");
  });

  it("12 runs: history preserves strict numeric run order (run1→run12), not lexical", () => {
    // run k (1-based): even → failed, odd → passed
    const statuses = Array.from({ length: 12 }, (_, i) =>
      (i + 1) % 2 === 0 ? "failed" : "passed"
    );
    const dir = writeRuns(path.join(ORDER_DIR, "order"), statuses);
    const t = myTest(analyze(dir, 12));
    // Under the old lexicographic sort this would be scrambled to run1,run10,run11,run12,run2,...
    assert.deepStrictEqual(t.history, statuses);
  });

  it("lookback selects the newest N and drops the numerically-oldest runs", () => {
    const dir = path.join(ORDER_DIR, "drop-oldest");
    fs.mkdirSync(dir, { recursive: true });
    // "old-only" exists ONLY in run1 and run2 (numerically-oldest — must be dropped when lookback=10)
    const withOldOnly = reportWith([
      { title: "my test", status: "passed" },
      { title: "old-only", status: "passed" },
    ]);
    fs.writeFileSync(path.join(dir, "results-run1.json"), JSON.stringify(withOldOnly));
    fs.writeFileSync(path.join(dir, "results-run2.json"), JSON.stringify(withOldOnly));
    for (let i = 3; i <= 11; i++) {
      fs.writeFileSync(
        path.join(dir, `results-run${i}.json`),
        JSON.stringify(makeReport("passed"))
      );
    }
    fs.writeFileSync(path.join(dir, "results-run12.json"), JSON.stringify(makeReport("failed")));

    const result = analyze(dir, 10); // 12 files → keep newest 10 (runs 3..12)
    assert.strictEqual(result.summary.runsAnalyzed, 10);
    // Numeric order drops run1 AND run2, so "old-only" is absent.
    // (Under the buggy lexical order run2 survives and "old-only" would wrongly appear.)
    assert.strictEqual(
      result.results.some((r) => r.title === "old-only"),
      false
    );
    const t = myTest(result);
    assert.strictEqual(t.history.length, 10);
    assert.strictEqual(t.lastOutcome, "failed");
  });

  it("custom lookback of 5 over 20 runs analyzes only the newest 5", () => {
    const dir = writeRuns(path.join(ORDER_DIR, "lookback5"), [
      ...Array(19).fill("passed"),
      "failed",
    ]);
    const result = analyze(dir, 5);
    const t = myTest(result);
    assert.strictEqual(result.summary.runsAnalyzed, 5);
    assert.strictEqual(t.history.length, 5);
    assert.strictEqual(t.lastOutcome, "failed");
    assert.strictEqual(t.classification, "newly_failed");
  });

  it("lookback larger than the available run count uses all runs", () => {
    const dir = writeRuns(path.join(ORDER_DIR, "few"), ["passed", "passed", "failed"]);
    const result = analyze(dir, 10);
    assert.strictEqual(result.summary.runsAnalyzed, 3);
    assert.strictEqual(myTest(result).history.length, 3);
  });
});
