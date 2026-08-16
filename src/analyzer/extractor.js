function normalizeReport(report) {
  const tests = new Map();

  const testList = report.tests || extractTestsFromLegacy(report);

  for (const test of testList) {
    const id = test.id || buildTestId(test);
    const outcome = determineOutcome(test);
    const existing = tests.get(id);

    if (existing) {
      // Duplicate ID: merge, preferring entries with data
      if (!existing.outcome || existing.outcome === "unknown") {
        existing.outcome = outcome;
      }
      if (!existing.evidence) {
        existing.evidence = extractEvidence(test);
      }
      if (!existing.browser && test.browser) {
        existing.browser = test.browser;
      }
      var newErrors = extractErrors(test, outcome);
      if (newErrors.length > 0 && existing.errors.length === 0) {
        existing.errors = newErrors;
      }
      if (test.tags && test.tags.length > 0 && (!existing.tags || existing.tags.length === 0)) {
        existing.tags = test.tags;
      }
      continue;
    }

    tests.set(id, {
      id,
      title: test.title || "",
      titlePath: test.titlePath || [],
      browser: test.browser || null,
      file: extractFile(test),
      location: test.location || null,
      tags: test.tags || [],
      outcome,
      errors: extractErrors(test, outcome),
      evidence: extractEvidence(test),
      retriesUsedToPass: computeRetriesUsedToPass(test.results, outcome),
      retryFailureErrors: extractRetryFailureErrors(test.results, outcome),
    });
  }

  return tests;
}

function extractTestsFromLegacy(report) {
  const tests = [];
  if (!report.suites) return tests;

  for (const suite of report.suites) {
    walkSuite(suite, suite.file || null, tests);
  }

  return tests;
}

/**
 * Recursively walks a suite and its nested suites (created by test.describe()
 * blocks), collecting specs at every depth. Playwright's JSON reporter nests
 * describe blocks as child suites rather than flat specs, so a non-recursive
 * walk silently drops any test inside a describe().
 */
function walkSuite(suite, inheritedFile, tests) {
  const file = suite.file || inheritedFile;

  for (const spec of suite.specs || []) {
    if (!spec.tests) continue;
    for (const test of spec.tests) {
      const results = test.results || [];
      const allStatuses = results.map((r) => r.status);
      const hasPassed = allStatuses.some((s) => s === "passed" || s === "expected");
      const hasFailed = allStatuses.some(
        (s) => s === "failed" || s === "timedOut" || s === "unexpected"
      );

      let outcome = "unknown";
      const lastResult = results[results.length - 1];
      if (hasPassed && hasFailed) {
        outcome = lastResult ? lastResult.status : "failed";
      } else if (test.status === "expected" || test.status === "passed") {
        outcome = "passed";
      } else if (test.status === "unexpected") {
        outcome = "failed";
      } else if (test.status === "flaky") {
        outcome = lastResult ? lastResult.status : "failed";
      } else if (test.status === "skipped") {
        outcome = "skipped";
      } else if (lastResult) {
        outcome = lastResult.status;
      }

      tests.push({
        // Prefer Playwright's own stable spec id (shared across the legacy
        // `json` reporter and this package's custom reporter) so the same
        // physical test never ends up tracked under two different ids just
        // because different runs used different reporter formats.
        id: spec.id || buildTestId({ title: spec.title, titlePath: spec.titlePath }),
        title: spec.title,
        titlePath: spec.titlePath || [],
        browser: test.projectName || null,
        location: {
          file: file || null,
          line: spec.line || null,
          column: spec.column || null,
        },
        tags: spec.tags || [],
        results,
        status: outcome,
      });
    }
  }

  for (const childSuite of suite.suites || []) {
    walkSuite(childSuite, file, tests);
  }
}

function buildTestId(test) {
  if (test.titlePath && Array.isArray(test.titlePath)) {
    return test.titlePath.join(" > ");
  }
  return test.title || "unknown";
}

function determineOutcome(test) {
  if (test.status === "skipped" || test.status === "interrupted") {
    return test.status;
  }

  const results = test.results || [];
  if (results.length === 0) {
    return test.status || "failed";
  }

  const allStatuses = results.map((r) => r.status);
  const hasPassedInRetries = allStatuses.some((s) => s === "passed");
  const hasFailedInRetries = allStatuses.some((s) => s === "failed" || s === "timedOut");

  const lastResult = results[results.length - 1];

  if (hasPassedInRetries && hasFailedInRetries) {
    return lastResult.status === "passed" ? "passed" : "failed";
  }

  if (lastResult.status === "passed") return "passed";
  if (lastResult.status === "failed" || lastResult.status === "timedOut") return "failed";
  if (lastResult.status === "skipped") return "skipped";
  if (lastResult.status === "interrupted") return "interrupted";

  return test.status || "failed";
}

/**
 * How many retries it took for this run to end in a pass — 0 if it passed
 * on the first attempt (or didn't pass at all). Playwright appends attempts
 * in order and stops as soon as one passes, so the final result's position
 * in `results` is the retry count.
 */
function computeRetriesUsedToPass(results, outcome) {
  if (outcome !== "passed") return 0;
  return Math.max((results || []).length - 1, 0);
}

/**
 * Errors from every failed attempt that happened before this run's final
 * pass — discarded by extractErrors() (which only looks at the final,
 * failing outcome). This is what lets a "Passing on Retry" test still show
 * why it failed on its first attempt(s) even though the run overall passed.
 */
function extractRetryFailureErrors(results, outcome) {
  if (outcome !== "passed") return [];

  const failedAttempts = (results || []).filter(
    (r) => r.status === "failed" || r.status === "timedOut"
  );

  const errors = [];
  for (const attempt of failedAttempts) {
    for (const e of attempt.errors || []) {
      errors.push({
        message: e.message || String(e),
        stack: e.stack || null,
        snippet: e.snippet || null,
        location: e.location || null,
      });
    }
  }
  return errors;
}

function extractFile(test) {
  if (test.location && test.location.file) {
    return test.location.file;
  }
  return test.file || null;
}

function extractErrors(test, outcome) {
  if (outcome !== "failed") return [];

  const results = test.results || [];
  const lastFailed = [...results]
    .reverse()
    .find((r) => r.status === "failed" || r.status === "timedOut");
  if (!lastFailed) return [];

  return (lastFailed.errors || []).map((e) => ({
    message: e.message || String(e),
    stack: e.stack || null,
    snippet: e.snippet || null,
    location: e.location || null,
  }));
}

/**
 * Extract evidence file paths from all failing results across retries.
 * Looks for screenshots, traces, and videos in result attachments.
 */
function extractEvidence(test) {
  var results = test.results || [];
  var allResults = test.tests ? [] : results; // handle both legacy and reporter format

  // For legacy format: iterate test.results
  // For reporter format: the test object itself has no .results — use the raw data
  var evidenceResults = results.length > 0 ? results : [];

  var screenshots = [];
  var traceFile = null;
  var videoFile = null;

  for (var i = 0; i < evidenceResults.length; i++) {
    var res = evidenceResults[i];
    if (res.status !== "failed" && res.status !== "timedOut" && res.status !== "unexpected")
      continue;
    var attachments = res.attachments || [];
    for (var j = 0; j < attachments.length; j++) {
      var a = attachments[j];
      if ((a.name === "screenshot" || /^image\//.test(a.contentType || "")) && a.path) {
        if (screenshots.indexOf(a.path) === -1) {
          screenshots.push(a.path);
        }
      }
      if ((a.name === "trace" || a.contentType === "application/zip") && a.path && !traceFile) {
        traceFile = a.path;
      }
      if (a.contentType === "video/webm" && a.path && !videoFile) {
        videoFile = a.path;
      }
    }
  }

  if (screenshots.length === 0 && !traceFile && !videoFile) return null;

  return {
    screenshots: screenshots.length > 0 ? screenshots : null,
    trace: traceFile,
    video: videoFile,
  };
}

module.exports = { normalizeReport, extractEvidence };
