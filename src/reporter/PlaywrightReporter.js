const path = require("path");
const fs = require("fs");

const { SCHEMA_VERSION } = require("./schema");
const REPORTER_VERSION = require("../../package.json").version;

class PlaywrightReporter {
  constructor(options = {}, writeFile) {
    this.options = {
      outputFile: options.outputFile || "./test-results/results.json",
      includeConfig: options.includeConfig !== false,
      includeErrors: options.includeErrors !== false,
      includeAttachments: options.includeAttachments !== false,
      maxErrorLength: options.maxErrorLength || 5000,
    };
    this._writeFile = writeFile || fs.writeFileSync;
    this._existsSync = options.existsSync || fs.existsSync;
    this._mkdirSync = options.mkdirSync || fs.mkdirSync;
    this._readdirSync = options.readdirSync || fs.readdirSync;
    this._copyFileSync = options.copyFileSync || fs.copyFileSync;
    this._warn = options.warn || defaultWarn;

    this._tests = [];
    this._config = null;
    this._startTime = null;
    this._endTime = null;
    // Run identity (output dir, run number, evidence root) is resolved once —
    // see _ensureRunIdentity() — and then held fixed for the lifetime of this
    // reporter instance, because onTestEnd() needs it (to archive evidence)
    // long before onEnd() would otherwise compute it.
    this._outputDir = null;
    this._runNumber = undefined;
    this._evidenceRunDir = null;
    this._summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      interrupted: 0,
    };
  }

  printsToStdio() {
    return false;
  }

  onBegin(config) {
    this._config = sanitizeConfig(config);
    this._startTime = new Date().toISOString();
    this._tests = [];
    this._summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      interrupted: 0,
    };

    // Resolved once, here, and never recomputed (see _ensureRunIdentity) — so
    // the run number onTestEnd() archives evidence under is guaranteed to be
    // the same number onEnd() names results-run<N>.json with.
    this._ensureRunIdentity();
  }

  onTestBegin(testCase) {
    // Playwright calls onTestBegin once per ATTEMPT, not once per logical
    // test — a test that fails and retries fires this twice (or more) for
    // the same testCase.id. Pushing unconditionally created a second,
    // permanently-empty ("results": []) top-level record for every retried
    // test, inflating this._tests.length beyond the actual number of
    // distinct tests without adding any data (onTestEnd's .find() only ever
    // updates the first record with that id).
    const id = testCase.id || generateTestId(testCase);
    if (this._tests.some((t) => t.id === id)) {
      return;
    }

    const record = {
      id,
      title: testCase.title,
      titlePath: testCase.titlePath ? [...testCase.titlePath()] : [testCase.title],
      location: extractLocation(testCase),
      tags: extractTags(testCase),
      parentTitle: testCase.parent ? testCase.parent.title : null,
      results: [],
    };

    this._tests.push(record);
  }

  onTestEnd(testCase, result) {
    const record = this._tests.find((t) => t.id === testCase.id);
    if (!record) {
      return;
    }

    const retry = result.retry || 0;
    const normalizedAttachments = this._normalizeAttachments(result.attachments || []);

    const testResult = {
      retry,
      workerIndex: result.workerIndex !== undefined ? result.workerIndex : null,
      parallelIndex: result.parallelIndex !== undefined ? result.parallelIndex : null,
      status: result.status || "unknown",
      duration: typeof result.duration === "number" ? result.duration : -1,
      startTime: result.startTime ? result.startTime.toISOString() : null,
      errors: this._normalizeErrors(result.errors || []),
      // Archived here — at the moment Playwright hands us this attempt's
      // attachments — because the file is only guaranteed to still exist
      // during THIS run. A later, separate `playwright test` invocation can
      // reuse/clean the same outputDir and delete it before anyone reads
      // results-run<N>.json again. See DESIGN_DECISIONS.md.
      attachments: this._archiveAttachments(normalizedAttachments, record.id, retry),
      stdout: extractStdout(result),
      stderr: extractStderr(result),
    };

    record.results.push(testResult);
    record.status = result.status;
    // The summary is computed once per logical test at build time (see _recomputeSummary),
    // not per attempt here — otherwise retries would inflate totals and a flaky test would be
    // counted as both failed and flaky.
  }

  onEnd() {
    this._endTime = new Date().toISOString();

    const report = this._buildReport();

    // Idempotent — normally already resolved in onBegin(). Only does real
    // work here if onEnd() is ever called without a preceding onBegin().
    this._ensureRunIdentity();

    if (!this._existsSync(this._outputDir)) {
      this._mkdirSync(this._outputDir, { recursive: true });
    }

    const runPath = path.join(this._outputDir, `results-run${this._runNumber}.json`);
    const latestPath = path.join(this._outputDir, "latest.json");

    this._writeFile(runPath, JSON.stringify(report, null, 2), "utf-8");
    this._writeFile(latestPath, JSON.stringify(report, null, 2), "utf-8");
    process.stdout.write(`\n[playwright-flaky-analyzer] Report written: ${runPath}\n`);
  }

  // ─── Private helpers ─────────────────────────────────────────

  // Resolves this reporter instance's output directory and run number exactly
  // once, then holds them fixed. Read-only (existsSync/readdirSync only — no
  // mkdirSync) so it's safe to call unconditionally from onBegin() without
  // creating directories as a side effect of, e.g., a test that never
  // archives anything or never calls onEnd().
  _ensureRunIdentity() {
    if (this._outputDir && this._runNumber !== undefined) return;

    const outputPath = path.resolve(this.options.outputFile);
    this._outputDir = path.dirname(outputPath);
    this._runNumber = getNextRunNumber(this._outputDir, this._readdirSync, this._existsSync);
    this._evidenceRunDir = path.join(this._outputDir, "evidence", `run-${this._runNumber}`);
  }

  // Copies each attachment's file into evidence/run-<N>/<testId>/attempt-<retry>/
  // — alongside this run's results-run<N>.json, not inside Playwright's
  // shared/reused outputDir — and rewrites attachments[].path to the copy.
  // Never throws: a failure to create the directory or copy a given file
  // just leaves that attachment's original (live Playwright) path in place,
  // exactly as if this archiving step didn't exist, so the existing
  // analyze-time evidence collector/copier still gets a fair shot at it.
  _archiveAttachments(attachments, testId, retry) {
    const list = attachments || [];
    if (!list.some((a) => a && a.path)) return list;

    this._ensureRunIdentity();

    const destDir = path.join(this._evidenceRunDir, sanitizeForPath(testId), `attempt-${retry}`);
    let dirReady = false;
    try {
      this._mkdirSync(destDir, { recursive: true });
      dirReady = true;
    } catch (e) {
      this._warn(
        `Could not create evidence archive directory for test ${testId} (attempt ${retry}): ${e.message}. Keeping original attachment path(s).`
      );
    }

    if (!dirReady) return list;

    return list.map((a) => {
      if (!a || !a.path) return a;
      const destPath = path.join(destDir, path.basename(a.path));
      try {
        this._copyFileSync(a.path, destPath);
        return Object.assign({}, a, { path: destPath });
      } catch (e) {
        this._warn(
          `Could not archive evidence file for test ${testId} (attempt ${retry}): ${e.message}. Keeping original path: ${a.path}`
        );
        return a;
      }
    });
  }

  _normalizeErrors(errors) {
    return errors.map((err) => {
      if (typeof err === "string") {
        return { message: err, stack: null, snippet: null, location: null };
      }

      let message = "";
      if (err.message) {
        message = err.message;
      } else if (err.value && err.value.message) {
        message = err.value.message;
      }

      if (message.length > this.options.maxErrorLength) {
        message = message.slice(0, this.options.maxErrorLength) + "... [truncated]";
      }

      return {
        message,
        stack: err.stack || err.value?.stack || null,
        snippet: err.snippet || null,
        location: err.location || null,
      };
    });
  }

  _normalizeAttachments(attachments) {
    return attachments.map((a) => ({
      name: a.name || "attachment",
      contentType: a.contentType || "application/octet-stream",
      path: typeof a.path === "string" ? a.path : null,
      hasBody: typeof a.body !== "undefined",
    }));
  }

  _updateSummary(testCase, result) {
    this._summary.total++;

    const allResults = testCase.results ? testCase.results.map((r) => r.status) : [];

    const hasPassedRetry = allResults.some((s) => s === "passed");
    const hasFailedRetry = allResults.some((s) => s === "failed" || s === "timedOut");

    if (hasPassedRetry && hasFailedRetry) {
      this._summary.flaky++;
      return;
    }

    const status = result.status;
    if (status === "passed") {
      this._summary.passed++;
    } else if (status === "failed" || status === "timedOut") {
      this._summary.failed++;
    } else if (status === "skipped") {
      this._summary.skipped++;
    } else if (status === "interrupted") {
      this._summary.interrupted++;
    }
  }

  // Compute the summary once per logical test from the collected records, so retries never
  // inflate totals and each test lands in exactly one bucket. Reuses the per-test
  // classification in _updateSummary, invoked once per test with its final result.
  _recomputeSummary() {
    this._summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      interrupted: 0,
    };
    for (const record of this._tests) {
      if (!record.results || record.results.length === 0) continue;
      const finalResult = record.results[record.results.length - 1];
      this._updateSummary(record, finalResult);
    }
  }

  _buildReport() {
    this._recomputeSummary();
    const generatedAt = this._endTime || new Date().toISOString();
    const endTime = this._endTime || new Date().toISOString();

    return {
      schemaVersion: SCHEMA_VERSION,
      reporter: {
        name: "playwright-flaky-analyzer",
        version: REPORTER_VERSION,
      },
      metadata: {
        generatedAt,
        framework: this._config?.framework || "playwright",
        configFile: this._config?.configFile || null,
        rootDir: this._config?.rootDir || null,
      },
      config: this.options.includeConfig ? this._config : undefined,
      timing: {
        startTime: this._startTime,
        endTime,
        durationMs: computeDuration(this._startTime, endTime),
      },
      summary: { ...this._summary },
      tests: this._tests,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function sanitizeConfig(config) {
  return {
    framework: "playwright",
    configFile: config.configFile || null,
    rootDir: config.rootDir || null,
    workers: config.workers ?? null,
    timeout: config.globalTimeout ?? null,
    projects: (config.projects || []).map((p) => ({
      name: p.name || "unnamed",
    })),
  };
}

function extractLocation(testCase) {
  return {
    file: testCase.location ? testCase.location.file : testCase.file || null,
    line: testCase.location ? testCase.location.line : null,
    column: testCase.location ? testCase.location.column : null,
  };
}

function extractTags(testCase) {
  const tags = testCase.tags || [];
  return tags.map((t) => (typeof t === "string" ? t : `@${t}`));
}

function extractStdout(result) {
  if (result.stdout && result.stdout.length > 0) {
    return result.stdout.map((s) => String(s)).join("\n");
  }
  return null;
}

function extractStderr(result) {
  if (result.stderr && result.stderr.length > 0) {
    return result.stderr.map((s) => String(s)).join("\n");
  }
  return null;
}

function generateTestId(testCase) {
  const parts = testCase.titlePath ? testCase.titlePath() : [testCase.title];
  return parts.join(" > ");
}

function computeDuration(start, end) {
  if (!start || !end) return -1;
  return new Date(end).getTime() - new Date(start).getTime();
}

function defaultWarn(message) {
  process.stderr.write(`[playwright-flaky-analyzer] WARNING: ${message}\n`);
}

// Test ids from real Playwright TestCase objects are already filesystem-safe
// hex/hyphen strings. This only matters for the generateTestId() fallback
// (titlePath joined with " > ") or a pathological title, which can contain
// characters Windows rejects in a path (<>:"|?*) — strip those and cap the
// length defensively so a run's evidence folder can never fail to create
// over a title, independent of whether the file copy itself succeeds.
function sanitizeForPath(id) {
  const cleaned = String(id).replace(/[<>:"|?*\\/]/g, "_").slice(0, 150);
  return cleaned || "test";
}

function getNextRunNumber(dir, readdirSync, existsSync) {
  readdirSync = readdirSync || fs.readdirSync;
  existsSync = existsSync || fs.existsSync;
  let maxRun = 0;
  if (existsSync(dir)) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const match = entry.match(/^results-run(\d+)\.json$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxRun) maxRun = n;
      }
    }
  }
  return maxRun + 1;
}

module.exports = PlaywrightReporter;
module.exports.default = PlaywrightReporter;
module.exports.PlaywrightReporter = PlaywrightReporter;
module.exports.SCHEMA_VERSION = SCHEMA_VERSION;
// Test-only export (underscore-prefixed to signal "internal, not public API").
module.exports.__sanitizeForPath = sanitizeForPath;
