"use strict";

/**
 * Turns data/catalog.js into a realistic captured CI history: RUNS runs of the Meridian
 * suite in the analyzer's report schema (results-run1.json … results-run<RUNS>.json).
 *
 * This is how any real project feeds the analyzer — the analyzer compares the JSON
 * emitted by its Playwright reporter across CI runs. Here we ship a curated multi-run
 * history so anyone can `npm run report` and get the full dashboard without standing
 * up the Meridian app. The tests/*.spec.js files show the live suite these runs model.
 */
const fs = require("fs");
const path = require("path");
const { BROWSERS, RUNS, FAILING, PASSING, SKIPPED } = require("../data/catalog");

const OUT = path.join(__dirname, "..", "ci-runs");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// deterministic jitter so runs are reproducible (no Math.random)
function fnv(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function between(seed, lo, hi) { return Math.round(lo + (hi - lo) * ((fnv(seed) % 1000) / 1000)); }

// stable_pass/stable_failure/flaky are uniform/alternating shapes that stay correct under
// modulo-cycling (see patternFor/outcome lookup below) regardless of RUNS, so they're left as
// fixed 8-run units. newly_failed/fixed/regression are ENDING-sensitive — cycling an 8-char
// unit would reintroduce the "break"/"fix" event partway through a longer history and flip
// the classification (e.g. a cycled "newly_failed" unit ends up passing again, reclassifying
// as flaky) — so those three are sized to RUNS directly, preserving the same story at any length.
const DEFAULT_PATTERN = {
  stable_pass: "PPPPPPPP", stable_failure: "FFFFFFFF", flaky: "PFPPFPFP",
  newly_failed: "P".repeat(RUNS - 1) + "F",
  fixed: "F".repeat(RUNS - 1) + "P",
  regression: "F" + "P".repeat(RUNS - 2) + "F",
};
const BASE_DAY = Date.UTC(2026, 0, 19, 6, 0, 0); // Mon 19 Jan 2026 06:00 UTC — nightly CI

function titlePath(project, file, suite, title) { return ["", project, "tests/" + file, suite, title]; }
function testId(project, file, title) { return project + " | tests/" + file + " | " + title; }

function failDuration(test, project, run) {
  const m = test.error.message;
  if (/30000ms/.test(m)) return between(project + run + test.title, 28000, 30000);
  if (/15000ms/.test(m)) return between(project + run + test.title, 14000, 15000);
  return between(project + run + test.title, 2500, 9000);
}
function attachmentsFor(test) {
  const ev = test.evidence || {};
  const a = [];
  if (ev.shot) a.push({ name: "screenshot", contentType: "image/png", path: "evidence/" + ev.shot + ".png" });
  // On a real failure, Playwright retains a trace alongside the screenshot — pair them so every
  // failing test that captured a screenshot also has a trace.
  const traceName = ev.trace || (ev.shot ? ev.shot : null);
  if (traceName) a.push({ name: "trace", contentType: "application/zip", path: "evidence/" + traceName + ".trace.zip" });
  if (ev.video) a.push({ name: "video", contentType: "video/webm", path: "evidence/" + ev.video + ".webm" });
  return a;
}
function errorObj(test) { return { message: test.error.message, stack: test.error.stack, snippet: null, location: null }; }

// Build the results[] array for one (test, project, run) given the run's outcome char.
function buildResults(test, project, run, outcome) {
  const startBase = BASE_DAY + (run - 1) * 86400000 + between(project + test.title, 0, 5400) * 1000;
  const iso = (offsetMs) => new Date(startBase + offsetMs).toISOString();
  const pass = (retry, dur) => ({ retry, workerIndex: fnv(project) % 6, parallelIndex: fnv(test.title) % 6, status: "passed", duration: dur, startTime: iso(retry * dur), errors: [], attachments: [], stdout: null, stderr: null });
  const fail = (retry, dur, withEvidence) => ({ retry, workerIndex: fnv(project) % 6, parallelIndex: fnv(test.title) % 6, status: /Timeout|30000ms|15000ms/.test(test.error.message) ? "timedOut" : "failed", duration: dur, startTime: iso(retry * dur), errors: [errorObj(test)], attachments: withEvidence ? attachmentsFor(test) : [], stdout: null, stderr: run % 3 === 0 ? "[console] " + test.suite.toLowerCase() + ": request failed, see trace" : null });

  const retries = test.retries || { attempts: 0, recovered: false };
  if (outcome === "P") {
    // A recovered-flaky test shows a failed first attempt then a passing retry on ~half its green runs.
    if (retries.recovered && retries.attempts >= 1 && run % 2 === 0) {
      const d = between(project + run + test.title, 1500, 6000);
      return [fail(0, d, true), pass(1, between(project + run + test.title + "r", 600, 2500))];
    }
    const slow = PASSING.find((p) => p.title === test.title && p.slow);
    return [pass(0, slow ? between(project + run + test.title, 8000, 15000) : between(project + run + test.title, 700, 3500))];
  }
  // outcome === "F": one attempt per (attempts+1), all failing; evidence on the last.
  const n = (retries.attempts || 0) + 1;
  const out = [];
  for (let k = 0; k < n; k++) out.push(fail(k, failDuration(test, project, run), k === n - 1));
  return out;
}

function patternFor(test, project) {
  const pp = test.perProject && test.perProject[project];
  const cls = (pp && pp.cls) || test.cls;
  const pattern = (pp && pp.pattern) || test.pattern || DEFAULT_PATTERN[cls];
  return pattern;
}

function passingResults(t, project, run) {
  const d = t.slow ? between(project + run + t.title, 8000, 15000) : between(project + run + t.title, 700, 3500);
  const iso = new Date(BASE_DAY + (run - 1) * 86400000 + between(project + t.title, 0, 5400) * 1000).toISOString();
  return [{ retry: 0, workerIndex: fnv(project) % 6, parallelIndex: fnv(t.title) % 6, status: "passed", duration: d, startTime: iso, errors: [], attachments: [], stdout: null, stderr: null }];
}

// A skipped test executes nothing — Playwright records a single result with status "skipped".
function skippedResults(project, run) {
  const iso = new Date(BASE_DAY + (run - 1) * 86400000 + between(project + run, 0, 5400) * 1000).toISOString();
  return [{ retry: 0, workerIndex: fnv(project) % 6, parallelIndex: 0, status: "skipped", duration: 0, startTime: iso, errors: [], attachments: [], stdout: null, stderr: null }];
}

function summarize(tests) {
  const s = { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0, interrupted: 0 };
  for (const t of tests) {
    s.total++;
    const statuses = t.results.map((r) => r.status);
    const hasPass = statuses.some((x) => x === "passed");
    const hasFail = statuses.some((x) => x === "failed" || x === "timedOut");
    if (hasPass && hasFail) { s.flaky++; continue; }
    const last = t.results[t.results.length - 1].status;
    if (last === "passed") s.passed++;
    else if (last === "failed" || last === "timedOut") s.failed++;
    else if (last === "skipped") s.skipped++;
  }
  return s;
}

for (let run = 1; run <= RUNS; run++) {
  const tests = [];
  for (const project of BROWSERS) {
    for (const t of PASSING) {
      if (t.projects && !t.projects.includes(project)) continue;
      tests.push({ id: testId(project, t.file, t.title), title: t.title, titlePath: titlePath(project, t.file, t.suite, t.title), location: { file: "tests/" + t.file, line: 1, column: 1 }, tags: [], status: "passed", results: passingResults(t, project, run) });
    }
    for (const t of FAILING) {
      if (t.projects && !t.projects.includes(project)) continue;
      const pattern = patternFor(t, project);
      const outcome = pattern[(run - 1) % pattern.length];
      const results = buildResults(t, project, run, outcome);
      const status = results[results.length - 1].status;
      tests.push({ id: testId(project, t.file, t.title), title: t.title, titlePath: titlePath(project, t.file, t.suite, t.title), location: { file: "tests/" + t.file, line: 1, column: 1 }, tags: ["@" + t.suite.toLowerCase().replace(/\s+/g, "-")], status, results });
    }
    for (const t of SKIPPED || []) {
      if (t.projects && !t.projects.includes(project)) continue;
      const pattern = t.pattern || "P".repeat(RUNS - 1) + "S";
      const outcome = pattern[(run - 1) % pattern.length];
      const results = outcome === "S" ? skippedResults(project, run) : passingResults({ title: t.title }, project, run);
      const status = results[results.length - 1].status;
      tests.push({ id: testId(project, t.file, t.title), title: t.title, titlePath: titlePath(project, t.file, t.suite, t.title), location: { file: "tests/" + t.file, line: 1, column: 1 }, tags: ["@" + t.suite.toLowerCase().replace(/\s+/g, "-")], status, results });
    }
  }
  const start = new Date(BASE_DAY + (run - 1) * 86400000).toISOString();
  const end = new Date(BASE_DAY + (run - 1) * 86400000 + between("dur" + run, 380000, 520000)).toISOString();
  const report = {
    schemaVersion: "1.0.0",
    reporter: { name: "playwright-flaky-analyzer", version: "1.0.0" },
    metadata: { generatedAt: start, framework: "playwright", configFile: "playwright.config.js", rootDir: "/ci/meridian-e2e" },
    config: { framework: "playwright", configFile: "playwright.config.js", workers: 6, timeout: 30000, projects: BROWSERS.map((name) => ({ name })) },
    timing: { startTime: start, endTime: end, durationMs: new Date(end) - new Date(start) },
    summary: summarize(tests),
    tests,
  };
  fs.writeFileSync(path.join(OUT, `results-run${run}.json`), JSON.stringify(report, null, 2), "utf-8");
}

const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".json"));
const last = JSON.parse(fs.readFileSync(path.join(OUT, "results-run" + RUNS + ".json"), "utf-8"));
console.log(`Wrote ${files.length} CI runs to ${OUT}`);
console.log(`Latest run: ${last.tests.length} test executions across ${BROWSERS.length} browsers — summary`, last.summary);
