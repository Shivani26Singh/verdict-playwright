const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { PlaywrightReporter } = require("./PlaywrightReporter");
const { defineSchema, validateReport, SCHEMA_VERSION } = require("./schema");

const TMP_DIR = path.join(__dirname, "..", "..", ".tmp-test-results");
const SRC_DIR = path.join(__dirname, "..", "..", ".tmp-evidence-src");

function makeConfig(overrides = {}) {
  return {
    configFile: "playwright.config.js",
    rootDir: "/project/tests",
    workers: 4,
    globalTimeout: 30000,
    projects: [{ name: "chromium" }, { name: "firefox" }],
    rootSuite: null,
    ...overrides,
  };
}

function makeTestCase(id, title, overrides = {}) {
  return {
    id,
    title,
    titlePath() {
      return [title];
    },
    location: { file: `/tests/${title}.spec.js`, line: 10, column: 4 },
    tags: ["@smoke", "@critical"],
    parent: { title: "Login Suite" },
    results: [],
    ...overrides,
  };
}

function makeResult(status, retry = 0, overrides = {}) {
  return {
    retry,
    workerIndex: 0,
    parallelIndex: 0,
    status,
    duration: 1500,
    startTime: new Date("2025-08-15T10:00:00Z"),
    errors: [],
    attachments: [],
    stdout: [],
    stderr: [],
    ...overrides,
  };
}

afterEach(() => {
  // Evidence-archiving tests nest subdirectories (evidence/run-N/<id>/attempt-N/)
  // under TMP_DIR, which the old flat unlinkSync loop can't clean up — recurse.
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.rmSync(SRC_DIR, { recursive: true, force: true });
});

function writeSourceFile(name, content = "fake-bytes") {
  fs.mkdirSync(SRC_DIR, { recursive: true });
  const p = path.join(SRC_DIR, name);
  fs.writeFileSync(p, content);
  return p;
}

// ─── PlaywrightReporter ────────────────────────────────────────

describe("PlaywrightReporter", () => {
  describe("constructor", () => {
    it("sets default options", () => {
      const reporter = new PlaywrightReporter();
      assert.equal(reporter.options.outputFile, "./test-results/results.json");
      assert.equal(reporter.options.includeConfig, true);
      assert.equal(reporter.options.includeErrors, true);
      assert.equal(reporter.options.includeAttachments, true);
      assert.equal(reporter.options.maxErrorLength, 5000);
    });

    it("merges user options", () => {
      const reporter = new PlaywrightReporter({
        outputFile: "./custom/results.json",
        includeConfig: false,
        maxErrorLength: 200,
      });
      assert.equal(reporter.options.outputFile, "./custom/results.json");
      assert.equal(reporter.options.includeConfig, false);
      assert.equal(reporter.options.maxErrorLength, 200);
    });

    it("initializes empty internal state", () => {
      const reporter = new PlaywrightReporter();
      assert.deepEqual(reporter._tests, []);
      assert.equal(reporter._config, null);
      assert.equal(reporter._startTime, null);
    });
  });

  describe("module export shape", () => {
    // Playwright's reporter loader does `new (mod.default || mod)(options)` for a
    // reporter given as a string module path — the export itself must be the class.
    it("is directly constructable the way Playwright's reporter loader uses it", () => {
      const mod = require("./PlaywrightReporter");
      const ReporterClass = mod.default || mod;
      const reporter = new ReporterClass({ outputFile: "./results/results.json" });
      assert.ok(reporter instanceof PlaywrightReporter);
    });

    it("still exposes PlaywrightReporter and SCHEMA_VERSION as named properties", () => {
      const mod = require("./PlaywrightReporter");
      assert.equal(mod.PlaywrightReporter, PlaywrightReporter);
      assert.equal(typeof mod.SCHEMA_VERSION, "string");
    });
  });

  describe("printsToStdio", () => {
    it("returns false so Playwright doesn't intercept output", () => {
      const reporter = new PlaywrightReporter();
      assert.equal(reporter.printsToStdio(), false);
    });
  });

  describe("onBegin", () => {
    it("stores sanitized config and sets start time", () => {
      const reporter = new PlaywrightReporter();
      reporter.onBegin(makeConfig());

      assert.ok(reporter._config);
      assert.equal(reporter._config.framework, "playwright");
      assert.equal(reporter._config.configFile, "playwright.config.js");
      assert.equal(reporter._config.workers, 4);
      assert.deepEqual(reporter._config.projects, [{ name: "chromium" }, { name: "firefox" }]);
      assert.ok(reporter._startTime);
    });

    it("resets tests array and summary on subsequent calls", () => {
      const reporter = new PlaywrightReporter();
      reporter._tests.push({ id: "old-test" });
      reporter._summary.failed = 5;

      reporter.onBegin(makeConfig());

      assert.deepEqual(reporter._tests, []);
      assert.equal(reporter._summary.failed, 0);
      assert.equal(reporter._summary.total, 0);
    });
  });

  describe("onTestBegin", () => {
    it("creates a test record with required fields", () => {
      const reporter = new PlaywrightReporter();
      const tc = makeTestCase("tc-1", "should login");

      reporter.onTestBegin(tc);

      assert.equal(reporter._tests.length, 1);
      const record = reporter._tests[0];
      assert.equal(record.id, "tc-1");
      assert.equal(record.title, "should login");
      assert.deepEqual(record.titlePath, ["should login"]);
      assert.deepEqual(record.location, {
        file: "/tests/should login.spec.js",
        line: 10,
        column: 4,
      });
      assert.deepEqual(record.tags, ["@smoke", "@critical"]);
      assert.equal(record.parentTitle, "Login Suite");
      assert.deepEqual(record.results, []);
    });

    it("generates an id from titlePath when id is missing", () => {
      const reporter = new PlaywrightReporter();
      const tc = makeTestCase(undefined, "no id test", {
        titlePath() {
          return ["Suite", "no id test"];
        },
      });

      reporter.onTestBegin(tc);

      assert.equal(reporter._tests[0].id, "Suite > no id test");
    });
  });

  describe("onTestEnd", () => {
    it("appends a result to the matching test record", () => {
      const reporter = new PlaywrightReporter();
      const tc = makeTestCase("tc-1", "should login");
      reporter.onTestBegin(tc);

      const result = makeResult("passed");
      reporter.onTestEnd(tc, result);

      assert.equal(reporter._tests[0].results.length, 1);
      const r = reporter._tests[0].results[0];
      assert.equal(r.retry, 0);
      assert.equal(r.status, "passed");
      assert.equal(r.duration, 1500);
      assert.equal(r.workerIndex, 0);
      assert.deepEqual(r.errors, []);
      assert.deepEqual(r.attachments, []);
      assert.equal(r.stdout, null);
      assert.equal(r.stderr, null);
    });

    it("appends multiple retry results to the same record", () => {
      const reporter = new PlaywrightReporter();
      const tc = makeTestCase("tc-2", "flaky test");
      reporter.onTestBegin(tc);

      reporter.onTestEnd(tc, makeResult("failed", 0));
      reporter.onTestEnd(tc, makeResult("passed", 1));

      assert.equal(reporter._tests[0].results.length, 2);
      assert.equal(reporter._tests[0].results[0].status, "failed");
      assert.equal(reporter._tests[0].results[1].status, "passed");
    });

    it("does not create a duplicate ghost record when onTestBegin fires again for a retry", () => {
      // Playwright calls onTestBegin once per ATTEMPT, not once per logical
      // test — a real retry fires onTestBegin again with the same testCase.id
      // before the retry attempt runs. Simulate that here (unlike the
      // "appends multiple retry results" test above, which only calls
      // onTestBegin once and so never exercised this path).
      const reporter = new PlaywrightReporter();
      const tc = makeTestCase("tc-retry", "flaky test");

      reporter.onTestBegin(tc);
      reporter.onTestEnd(tc, makeResult("failed", 0));
      reporter.onTestBegin(tc); // retry attempt begins
      reporter.onTestEnd(tc, makeResult("passed", 1));

      assert.equal(reporter._tests.length, 1);
      assert.equal(reporter._tests[0].results.length, 2);
      assert.equal(reporter._tests[0].results[0].status, "failed");
      assert.equal(reporter._tests[0].results[1].status, "passed");
    });

    it("is a no-op when test id is not found", () => {
      const reporter = new PlaywrightReporter();
      reporter.onTestBegin(makeTestCase("tc-1", "test A"));

      reporter.onTestEnd(makeTestCase("tc-999", "nonexistent"), makeResult("passed"));

      assert.equal(reporter._tests[0].results.length, 0);
    });
  });

  describe("_normalizeErrors", () => {
    it("handles object errors with message and stack", () => {
      const reporter = new PlaywrightReporter();
      const errors = [
        {
          message: "expect(received).toBe(expected)",
          stack: "at LoginPage.login (login.spec.js:24:30)",
        },
      ];

      const result = reporter._normalizeErrors(errors);

      assert.equal(result.length, 1);
      assert.equal(result[0].message, "expect(received).toBe(expected)");
      assert.ok(result[0].stack);
    });

    it("handles string errors", () => {
      const reporter = new PlaywrightReporter();
      const result = reporter._normalizeErrors(["something went wrong"]);

      assert.equal(result.length, 1);
      assert.equal(result[0].message, "something went wrong");
      assert.equal(result[0].stack, null);
    });

    it("handles errors with nested value.message", () => {
      const reporter = new PlaywrightReporter();
      const result = reporter._normalizeErrors([{ value: { message: "nested error message" } }]);

      assert.equal(result[0].message, "nested error message");
    });

    it("truncates messages exceeding maxErrorLength", () => {
      const reporter = new PlaywrightReporter({ maxErrorLength: 20 });
      const longMsg = "A".repeat(200);

      const result = reporter._normalizeErrors([{ message: longMsg }]);

      assert.equal(result[0].message.length, 35); // 20 chars + "... [truncated]"
      assert.ok(result[0].message.endsWith("[truncated]"));
    });

    it("handles empty error arrays", () => {
      const reporter = new PlaywrightReporter();
      const result = reporter._normalizeErrors([]);
      assert.deepEqual(result, []);
    });
  });

  describe("_normalizeAttachments", () => {
    it("extracts attachment metadata without bodies", () => {
      const reporter = new PlaywrightReporter();
      const attachments = [
        {
          name: "screenshot",
          contentType: "image/png",
          path: "/tmp/screenshot.png",
          body: Buffer.from("fake-image-data"),
        },
      ];

      const result = reporter._normalizeAttachments(attachments);

      assert.equal(result.length, 1);
      assert.equal(result[0].name, "screenshot");
      assert.equal(result[0].contentType, "image/png");
      assert.equal(result[0].path, "/tmp/screenshot.png");
      assert.equal(result[0].hasBody, true);
    });

    it("handles attachments without bodies", () => {
      const reporter = new PlaywrightReporter();
      const result = reporter._normalizeAttachments([
        { name: "video", contentType: "video/webm", path: "/tmp/video.webm" },
      ]);

      assert.equal(result[0].hasBody, false);
    });

    it("fills defaults for missing fields", () => {
      const reporter = new PlaywrightReporter();
      const result = reporter._normalizeAttachments([{}]);

      assert.equal(result[0].name, "attachment");
      assert.equal(result[0].contentType, "application/octet-stream");
      assert.equal(result[0].path, null);
      assert.equal(result[0].hasBody, false);
    });
  });

  describe("_updateSummary", () => {
    let reporter;

    beforeEach(() => {
      reporter = new PlaywrightReporter();
    });

    it("counts passed tests", () => {
      reporter._updateSummary({}, makeResult("passed"));
      assert.equal(reporter._summary.total, 1);
      assert.equal(reporter._summary.passed, 1);
      assert.equal(reporter._summary.failed, 0);
      assert.equal(reporter._summary.flaky, 0);
    });

    it("counts straight failures (no retry that passed)", () => {
      const testCase = {
        results: [makeResult("failed", 0), makeResult("failed", 1)],
      };
      reporter._updateSummary(testCase, makeResult("failed", 1));
      assert.equal(reporter._summary.failed, 1);
      assert.equal(reporter._summary.flaky, 0);
    });

    it("counts flaky tests (failed then passed on retry)", () => {
      const testCase = {
        results: [{ status: "failed" }, { status: "passed" }],
      };
      reporter._updateSummary(testCase, makeResult("passed"));
      assert.equal(reporter._summary.flaky, 1);
      assert.equal(reporter._summary.failed, 0);
    });

    it("counts skipped tests", () => {
      reporter._updateSummary({}, makeResult("skipped"));
      assert.equal(reporter._summary.skipped, 1);
    });

    it("counts interrupted tests", () => {
      reporter._updateSummary({}, makeResult("interrupted"));
      assert.equal(reporter._summary.interrupted, 1);
    });

    it("counts timedOut as failed when no passing retries", () => {
      const testCase = {
        results: [{ status: "timedOut" }, { status: "timedOut" }],
      };
      reporter._updateSummary(testCase, makeResult("timedOut"));
      assert.equal(reporter._summary.failed, 1);
    });
  });

  describe("_buildReport", () => {
    it("builds a report matching the schema structure", () => {
      const reporter = new PlaywrightReporter();
      reporter.onBegin(makeConfig());
      reporter.onTestBegin(makeTestCase("tc-1", "login test"));
      reporter.onTestEnd(makeTestCase("tc-1", "login test"), makeResult("passed"));

      const report = reporter._buildReport();

      assert.equal(report.schemaVersion, "1.0.0");
      assert.ok(report.reporter);
      assert.equal(report.reporter.name, "playwright-flaky-analyzer");
      assert.ok(report.metadata.generatedAt);
      assert.equal(report.metadata.framework, "playwright");
      assert.ok(report.timing.startTime);
      assert.ok(report.timing.endTime);
      assert.ok(typeof report.timing.durationMs === "number");
      assert.equal(report.summary.total, 1);
      assert.equal(report.summary.passed, 1);
      assert.equal(report.tests.length, 1);
    });

    it("omits config when includeConfig is false", () => {
      const reporter = new PlaywrightReporter({ includeConfig: false });
      reporter.onBegin(makeConfig());
      reporter.onTestBegin(makeTestCase("tc-1", "test"));
      reporter.onTestEnd(makeTestCase("tc-1", "test"), makeResult("passed"));

      const report = reporter._buildReport();

      assert.equal(report.config, undefined);
    });
  });

  describe("onEnd", () => {
    it("writes a JSON file and prints confirmation to stdout", () => {
      const outputFile = path.join(TMP_DIR, "results.json");
      const reporter = new PlaywrightReporter({ outputFile });

      reporter.onBegin(makeConfig());
      reporter.onTestBegin(makeTestCase("tc-1", "test"));
      reporter.onTestEnd(makeTestCase("tc-1", "test"), makeResult("passed"));

      const stdoutLog = [];
      const origStdout = process.stdout.write;
      process.stdout.write = (msg) => {
        stdoutLog.push(msg);
        return true;
      };

      try {
        reporter.onEnd();

        const runFile = path.join(TMP_DIR, "results-run1.json");
        const latestFile = path.join(TMP_DIR, "latest.json");

        assert.ok(fs.existsSync(runFile));
        assert.ok(fs.existsSync(latestFile));

        const content = JSON.parse(fs.readFileSync(runFile, "utf-8"));
        assert.equal(content.schemaVersion, "1.0.0");
        assert.equal(content.tests.length, 1);

        const confirmation = stdoutLog.find((s) => s.includes("Report written"));
        assert.ok(confirmation);
      } finally {
        process.stdout.write = origStdout;
      }
    });
  });

  describe("evidence archiving", () => {
    it("A: archives video/trace/screenshot for a failed attempt and rewrites paths", () => {
      const outputFile = path.join(TMP_DIR, "results.json");
      const reporter = new PlaywrightReporter({ outputFile });
      reporter.onBegin(makeConfig());

      const tc = makeTestCase("tc-evidence-1", "evidence test");
      reporter.onTestBegin(tc);

      const videoPath = writeSourceFile("video.webm", "video-bytes");
      const tracePath = writeSourceFile("trace.zip", "trace-bytes");
      const shotPath = writeSourceFile("screenshot.png", "png-bytes");
      const ctxPath = writeSourceFile("error-context.md", "context-bytes");

      reporter.onTestEnd(
        tc,
        makeResult("failed", 0, {
          attachments: [
            { name: "video", contentType: "video/webm", path: videoPath },
            { name: "trace", contentType: "application/zip", path: tracePath },
            { name: "screenshot", contentType: "image/png", path: shotPath },
            { name: "error-context", contentType: "text/markdown", path: ctxPath },
          ],
        })
      );

      const attachments = reporter._tests[0].results[0].attachments;
      const expectedDir = path.join(TMP_DIR, "evidence", "run-1", "tc-evidence-1", "attempt-0");

      const video = attachments.find((a) => a.name === "video");
      const trace = attachments.find((a) => a.name === "trace");
      const shot = attachments.find((a) => a.name === "screenshot");
      const ctx = attachments.find((a) => a.name === "error-context");

      assert.equal(video.path, path.join(expectedDir, "video.webm"));
      assert.equal(trace.path, path.join(expectedDir, "trace.zip"));
      assert.equal(shot.path, path.join(expectedDir, "screenshot.png"));
      assert.equal(ctx.path, path.join(expectedDir, "error-context.md"));

      assert.equal(fs.readFileSync(video.path, "utf-8"), "video-bytes");
      assert.equal(fs.readFileSync(trace.path, "utf-8"), "trace-bytes");

      // Copy, not move — Playwright's own live outputDir copy is untouched.
      assert.ok(fs.existsSync(videoPath));

      reporter.onEnd();
      const written = JSON.parse(fs.readFileSync(path.join(TMP_DIR, "results-run1.json"), "utf-8"));
      const writtenVideo = written.tests[0].results[0].attachments.find((a) => a.name === "video");
      assert.equal(writtenVideo.path, path.join(expectedDir, "video.webm"));
    });

    it("B: creates no evidence directory for a passed attempt with no attachments", () => {
      const outputFile = path.join(TMP_DIR, "results.json");
      const reporter = new PlaywrightReporter({ outputFile });
      reporter.onBegin(makeConfig());
      const tc = makeTestCase("tc-evidence-2", "passing test");
      reporter.onTestBegin(tc);

      reporter.onTestEnd(tc, makeResult("passed", 0)); // attachments: [] by default

      assert.equal(fs.existsSync(path.join(TMP_DIR, "evidence")), false);
    });

    it("C: multiple retries archive to distinct attempt-N destinations without overwriting", () => {
      const outputFile = path.join(TMP_DIR, "results.json");
      const reporter = new PlaywrightReporter({ outputFile });
      reporter.onBegin(makeConfig());
      const tc = makeTestCase("tc-evidence-3", "flaky test");
      reporter.onTestBegin(tc);

      const video0 = writeSourceFile("video-attempt0.webm", "attempt-0-bytes");
      reporter.onTestEnd(
        tc,
        makeResult("failed", 0, {
          attachments: [{ name: "video", contentType: "video/webm", path: video0 }],
        })
      );

      const video1 = writeSourceFile("video-attempt1.webm", "attempt-1-bytes");
      reporter.onTestEnd(
        tc,
        makeResult("passed", 1, {
          attachments: [{ name: "video", contentType: "video/webm", path: video1 }],
        })
      );

      const [attempt0, attempt1] = reporter._tests[0].results;
      const path0 = attempt0.attachments[0].path;
      const path1 = attempt1.attachments[0].path;

      assert.notEqual(path0, path1);
      assert.ok(path0.includes(path.join("attempt-0", "video-attempt0.webm")));
      assert.ok(path1.includes(path.join("attempt-1", "video-attempt1.webm")));
      assert.equal(fs.readFileSync(path0, "utf-8"), "attempt-0-bytes");
      assert.equal(fs.readFileSync(path1, "utf-8"), "attempt-1-bytes");
    });

    it("D: run number is computed once in onBegin and matches results-run<N>.json and the evidence folder", () => {
      // Pre-seed an existing results-run1.json so the next run should be run 2.
      fs.mkdirSync(TMP_DIR, { recursive: true });
      fs.writeFileSync(path.join(TMP_DIR, "results-run1.json"), "{}");

      const outputFile = path.join(TMP_DIR, "results.json");
      const reporter = new PlaywrightReporter({ outputFile });
      reporter.onBegin(makeConfig());

      assert.equal(reporter._runNumber, 2);
      const runNumberAtBegin = reporter._runNumber;

      const tc = makeTestCase("tc-evidence-4", "test");
      reporter.onTestBegin(tc);
      const videoPath = writeSourceFile("v.webm", "bytes");
      reporter.onTestEnd(
        tc,
        makeResult("failed", 0, {
          attachments: [{ name: "video", contentType: "video/webm", path: videoPath }],
        })
      );

      // Run number must not drift between onBegin and archiving.
      assert.equal(reporter._runNumber, runNumberAtBegin);
      assert.ok(
        reporter._tests[0].results[0].attachments[0].path.includes(path.join("evidence", "run-2"))
      );

      reporter.onEnd();
      assert.ok(fs.existsSync(path.join(TMP_DIR, "results-run2.json")));
    });

    it("E: a copyFileSync failure does not throw, keeps the original path, and onEnd still writes valid JSON", () => {
      const outputFile = path.join(TMP_DIR, "results.json");
      const reporter = new PlaywrightReporter({
        outputFile,
        copyFileSync: () => {
          throw new Error("ENOSPC: no space left on device (simulated)");
        },
      });
      const warnings = [];
      reporter._warn = (msg) => warnings.push(msg);

      reporter.onBegin(makeConfig());
      const tc = makeTestCase("tc-evidence-5", "test");
      reporter.onTestBegin(tc);
      const videoPath = writeSourceFile("v.webm", "bytes");

      assert.doesNotThrow(() => {
        reporter.onTestEnd(
          tc,
          makeResult("failed", 0, {
            attachments: [{ name: "video", contentType: "video/webm", path: videoPath }],
          })
        );
      });

      const attachment = reporter._tests[0].results[0].attachments[0];
      assert.equal(attachment.path, videoPath); // unchanged — original live path kept
      assert.ok(warnings.some((w) => w.includes("Could not archive evidence file")));

      assert.doesNotThrow(() => reporter.onEnd());
      const written = JSON.parse(fs.readFileSync(path.join(TMP_DIR, "results-run1.json"), "utf-8"));
      assert.equal(written.tests[0].results[0].attachments[0].path, videoPath);
    });

    it("E2: an mkdirSync failure while preparing the archive directory does not throw and keeps all original paths", () => {
      const outputFile = path.join(TMP_DIR, "results.json");
      const reporter = new PlaywrightReporter({
        outputFile,
        mkdirSync: (dir, opts) => {
          if (dir.includes(path.join("evidence", "run-"))) {
            throw new Error("EACCES: permission denied (simulated)");
          }
          return fs.mkdirSync(dir, opts);
        },
      });
      const warnings = [];
      reporter._warn = (msg) => warnings.push(msg);

      reporter.onBegin(makeConfig());
      const tc = makeTestCase("tc-evidence-6", "test");
      reporter.onTestBegin(tc);
      const videoPath = writeSourceFile("v.webm", "bytes");

      assert.doesNotThrow(() => {
        reporter.onTestEnd(
          tc,
          makeResult("failed", 0, {
            attachments: [{ name: "video", contentType: "video/webm", path: videoPath }],
          })
        );
      });

      assert.equal(reporter._tests[0].results[0].attachments[0].path, videoPath);
      assert.ok(warnings.some((w) => w.includes("Could not create evidence archive directory")));

      assert.doesNotThrow(() => reporter.onEnd());
    });

    it("does not touch the filesystem at all when onBegin/onTestEnd never see a real attachment path", () => {
      // Regression guard: _ensureRunIdentity() must stay read-only from onBegin
      // so tests (and real runs with nothing to archive) never get a surprise
      // ./test-results/ directory created as a side effect.
      const reporter = new PlaywrightReporter(); // default outputFile, no overrides
      const beforeExisted = fs.existsSync(path.resolve("./test-results"));

      reporter.onBegin(makeConfig());
      const tc = makeTestCase("tc-no-fs", "test");
      reporter.onTestBegin(tc);
      reporter.onTestEnd(tc, makeResult("passed"));

      const afterExisted = fs.existsSync(path.resolve("./test-results"));
      assert.equal(afterExisted, beforeExisted);
    });
  });

  describe("sanitizeForPath (evidence archive folder naming)", () => {
    it("strips characters that are illegal in Windows paths", () => {
      const { __sanitizeForPath } = require("./PlaywrightReporter");
      const dirty = 'weird<>:"|?*id';
      const clean = __sanitizeForPath(dirty);
      assert.doesNotMatch(clean, /[<>:"|?*]/);
    });

    it("falls back to a safe default for an empty id", () => {
      const { __sanitizeForPath } = require("./PlaywrightReporter");
      assert.equal(__sanitizeForPath(""), "test");
    });

    it("caps length defensively", () => {
      const { __sanitizeForPath } = require("./PlaywrightReporter");
      const long = "a".repeat(500);
      assert.ok(__sanitizeForPath(long).length <= 150);
    });
  });
});

// ─── Schema ────────────────────────────────────────────────────

describe("schema", () => {
  describe("defineSchema", () => {
    it("returns a valid JSON Schema draft object", () => {
      const schema = defineSchema();
      assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
      assert.ok(schema.$id);
      assert.equal(schema.type, "object");
      assert.ok(schema.properties.schemaVersion);
      assert.ok(schema.properties.reporter);
      assert.ok(schema.properties.metadata);
      assert.ok(schema.properties.timing);
      assert.ok(schema.properties.summary);
      assert.ok(schema.properties.tests);
    });

    it("includes required fields", () => {
      const schema = defineSchema();
      assert.deepEqual(schema.required, [
        "schemaVersion",
        "reporter",
        "metadata",
        "timing",
        "summary",
        "tests",
      ]);
    });
  });

  describe("validateReport", () => {
    it("returns empty array for a valid report", () => {
      const report = makeMinimalReport();
      const errors = validateReport(report);
      assert.deepEqual(errors, []);
    });

    it("rejects null or non-object values", () => {
      assert.deepEqual(validateReport(null), ["Report must be a non-null object."]);
      assert.deepEqual(validateReport(42), ["Report must be a non-null object."]);
    });

    it("detects missing top-level fields", () => {
      const errors = validateReport({});
      assert.ok(errors.some((e) => e.includes("schemaVersion")));
      assert.ok(errors.some((e) => e.includes("reporter")));
      assert.ok(errors.some((e) => e.includes("metadata")));
      assert.ok(errors.some((e) => e.includes("timing")));
      assert.ok(errors.some((e) => e.includes("summary")));
      assert.ok(errors.some((e) => e.includes("tests")));
    });

    it("validates summary fields are numbers", () => {
      const report = makeMinimalReport();
      report.summary = { total: "not-a-number" };

      const errors = validateReport(report);
      assert.ok(errors.some((e) => e.includes("total")));
    });

    it("validates test array entries have required fields", () => {
      const report = makeMinimalReport();
      report.tests = [{ results: [{ retry: "bad", status: "passed", duration: 0 }] }];

      const errors = validateReport(report);
      assert.ok(errors.some((e) => e.includes("missing id")));
      assert.ok(errors.some((e) => e.includes("missing title")));
      assert.ok(errors.some((e) => e.includes("retry must be a number")));
    });

    it("validates nested result fields", () => {
      const report = makeMinimalReport();
      report.tests = [
        {
          id: "tc-1",
          title: "test",
          titlePath: ["test"],
          location: null,
          tags: [],
          results: [{ retry: 0 }],
        },
      ];

      const errors = validateReport(report);
      assert.ok(errors.some((e) => e.includes("missing status")));
      assert.ok(errors.some((e) => e.includes("duration")));
    });

    it("accepts zero-value summary fields", () => {
      const report = makeMinimalReport();
      report.summary = { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0, interrupted: 0 };
      const errors = validateReport(report);
      assert.deepEqual(errors, []);
    });
  });
});

// ─── Helpers ───────────────────────────────────────────────────

function makeMinimalReport() {
  return {
    schemaVersion: SCHEMA_VERSION,
    reporter: { name: "playwright-flaky-analyzer", version: "1.0.0" },
    metadata: {
      generatedAt: "2025-08-15T10:00:00.000Z",
      framework: "playwright",
    },
    timing: {
      startTime: "2025-08-15T10:00:00.000Z",
      endTime: "2025-08-15T10:01:00.000Z",
      durationMs: 60000,
    },
    summary: {
      total: 5,
      passed: 3,
      failed: 1,
      skipped: 0,
      flaky: 1,
      interrupted: 0,
    },
    tests: [
      {
        id: "tc-1",
        title: "should login",
        titlePath: ["Login", "should login"],
        location: { file: "login.spec.js", line: 10, column: 4 },
        tags: ["@smoke"],
        parentTitle: "Login",
        status: "passed",
        results: [
          {
            retry: 0,
            workerIndex: 0,
            parallelIndex: 0,
            status: "passed",
            duration: 1500,
            startTime: "2025-08-15T10:00:00.000Z",
            errors: [],
            attachments: [],
            stdout: null,
            stderr: null,
          },
        ],
      },
    ],
  };
}

describe("PlaywrightReporter — summary counts logical tests, not attempts (Phase 3 regression)", () => {
  // Drive the reporter exactly as Playwright does: onTestEnd fires once per ATTEMPT.
  // perTest is an array of tests, each an array of attempt statuses.
  function summaryFor(perTest) {
    const reporter = new PlaywrightReporter();
    reporter.onBegin(makeConfig());
    perTest.forEach((attempts, i) => {
      const tc = makeTestCase("tc-" + i, "test-" + i);
      reporter.onTestBegin(tc);
      attempts.forEach((status, attempt) => {
        reporter.onTestEnd(tc, makeResult(status, attempt));
      });
    });
    return reporter._buildReport().summary;
  }
  // The core invariant: every logical test lands in exactly one bucket.
  const assertInvariant = (s) =>
    assert.equal(s.passed + s.failed + s.skipped + s.flaky + s.interrupted, s.total);

  it("passing test counts once", () => {
    const s = summaryFor([["passed"]]);
    assert.equal(s.total, 1);
    assert.equal(s.passed, 1);
    assert.equal(s.failed, 0);
    assert.equal(s.flaky, 0);
    assertInvariant(s);
  });

  it("failing test counts once", () => {
    const s = summaryFor([["failed"]]);
    assert.equal(s.total, 1);
    assert.equal(s.failed, 1);
    assert.equal(s.passed, 0);
    assert.equal(s.flaky, 0);
    assertInvariant(s);
  });

  it("skipped test counts once", () => {
    const s = summaryFor([["skipped"]]);
    assert.equal(s.total, 1);
    assert.equal(s.skipped, 1);
    assertInvariant(s);
  });

  it("flaky test (fail -> pass) counts once as flaky, not as failed", () => {
    const s = summaryFor([["failed", "passed"]]);
    assert.equal(s.total, 1); // was 2 before the fix
    assert.equal(s.flaky, 1);
    assert.equal(s.failed, 0); // was 1 before the fix (double-counted)
    assert.equal(s.passed, 0);
    assertInvariant(s);
  });

  it("multiple retries do not inflate totals (fail, fail, pass -> one flaky)", () => {
    const s = summaryFor([["failed", "failed", "passed"]]);
    assert.equal(s.total, 1); // was 3 before the fix
    assert.equal(s.flaky, 1);
    assert.equal(s.failed, 0);
    assertInvariant(s);
  });

  it("consistent failure with retries counts once as failed", () => {
    const s = summaryFor([["failed", "failed", "failed"]]);
    assert.equal(s.total, 1); // was 3 before the fix
    assert.equal(s.failed, 1);
    assert.equal(s.flaky, 0);
    assertInvariant(s);
  });

  it("mixed suite: each logical test contributes exactly once", () => {
    const s = summaryFor([
      ["passed"], // passed
      ["passed"], // passed
      ["failed", "failed"], // failed (retried, still failing)
      ["failed", "passed"], // flaky
      ["skipped"], // skipped
      ["timedOut"], // failed (timedOut is bucketed as failed)
    ]);
    assert.equal(s.total, 6);
    assert.equal(s.passed, 2);
    assert.equal(s.failed, 2);
    assert.equal(s.flaky, 1);
    assert.equal(s.skipped, 1);
    assert.equal(s.interrupted, 0);
    assertInvariant(s); // 2 + 2 + 1 + 1 + 0 === 6
  });

  it("interrupted test is bucketed and included in total", () => {
    const s = summaryFor([["interrupted"], ["passed"]]);
    assert.equal(s.total, 2);
    assert.equal(s.interrupted, 1);
    assert.equal(s.passed, 1);
    assertInvariant(s);
  });

  it("_updateSummary is no longer called per attempt by onTestEnd (no inflation)", () => {
    // Guard against reintroducing per-attempt accumulation: three attempts, summary still counts one test.
    const reporter = new PlaywrightReporter();
    reporter.onBegin(makeConfig());
    const tc = makeTestCase("tc-x", "retry-test");
    reporter.onTestBegin(tc);
    reporter.onTestEnd(tc, makeResult("failed", 0));
    reporter.onTestEnd(tc, makeResult("failed", 1));
    reporter.onTestEnd(tc, makeResult("passed", 2));
    // Before _buildReport/onEnd, nothing has accumulated per attempt:
    assert.equal(reporter._summary.total, 0);
    // After building, exactly one flaky test:
    const s = reporter._buildReport().summary;
    assert.equal(s.total, 1);
    assert.equal(s.flaky, 1);
    assert.equal(s.failed, 0);
  });
});
