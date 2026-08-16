"use strict";

/**
 * Build-time suite data generator.
 *
 * Runs the UNCHANGED deterministic analyzer over demo-project/ci-runs and
 * writes the committed view models the web layer reads:
 *
 *   web/public/suite/dashboard.json   — suite health for the Overview
 *   web/public/suite/rules.json       — the 20 detection rules + their matches
 *   web/public/failures/index.json    — every analysed failure, as a list row
 *   web/public/failures/<id>.json     — one failure's investigation + evidence
 *                                       pack, so AI can be run on ANY of them
 *
 * Every number is derived from analyzer output. Nothing is hardcoded,
 * estimated, or hand-written. Like scripts/build-scenarios.js this is a plain
 * CommonJS script at the repo root; it does not modify src/.
 *
 * Usage:  node scripts/build-suite-data.js
 */

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { compare } = require("../src/analyzer/engine");
const { buildDashboardJson } = require("../src/reporter/dashboard-json");
const { redactDeep } = require("../src/utils/redact");
const RULES = require("../src/knowledge/rules");

const REPO_ROOT = path.resolve(__dirname, "..");
const CI_DIR = path.join(REPO_ROOT, "demo-project", "ci-runs");
const EVIDENCE_DIR = path.join(REPO_ROOT, "demo-project", "evidence");
const OUT_DIR = path.join(REPO_ROOT, "web", "public", "suite");
const SCENARIO_DIR = path.join(REPO_ROOT, "web", "public", "scenarios");
const FAILURE_DIR = path.join(REPO_ROOT, "web", "public", "failures");
const ASSET_DIR = path.join(REPO_ROOT, "web", "public", "demo-assets", "screenshots");

/** Suite composition slices, in the order a QA lead reads them. */
const COMPOSITION = [
  { key: "stable", label: "Passing consistently", tone: "emerald" },
  { key: "flaky", label: "Flaky", tone: "amber" },
  { key: "stableFail", label: "Consistently failing", tone: "rose" },
  { key: "newlyFailed", label: "Newly failing", tone: "orange" },
  { key: "fixed", label: "Recently fixed", tone: "sky" },
  { key: "skipped", label: "Skipped", tone: "slate" },
];

const CATEGORY_LABELS = {
  timeout: "Timeout",
  locator: "Element / selector",
  assertion: "Assertion",
  network: "Network",
  backend: "Backend / API",
  authentication: "Authentication",
  environment: "Environment",
  data: "Test data",
  unknown: "Unclassified",
};

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/**
 * A stable, URL-safe id for one analysed failure. Test name plus browser is
 * the analyzer's own identity for a row, so the same failure keeps the same
 * URL across rebuilds.
 */
function failureId(inv) {
  return `${slugify(inv.testName)}--${slugify(inv.browser || "unknown")}`;
}

function basenameFromUrl(url) {
  if (!url) return null;
  const base = String(url).replace(/\\/g, "/").split("/").pop();
  return base || null;
}

/** Point evidence at the copies served from web/public. */
function rewriteEvidence(evidence) {
  if (!evidence) return null;
  const out = JSON.parse(JSON.stringify(evidence));
  const rewrite = (u) => {
    const base = basenameFromUrl(u);
    return base ? `/demo-assets/screenshots/${base}` : null;
  };
  if (Array.isArray(out.screenshots)) {
    out.screenshots = out.screenshots.map(rewrite).filter(Boolean);
    if (out.screenshots.length === 0) out.screenshots = null;
  }
  if (out.trace) out.trace = rewrite(out.trace);
  if (out.video) out.video = rewrite(out.video);
  return out;
}

/**
 * Trim a dashboard investigation to the shape buildEvidencePack() consumes.
 * Mirrors scripts/build-scenarios.js so a failure opened from the Flaky
 * Analysis list produces the same evidence pack a curated scenario does.
 */
function trimInvestigation(inv, engineResult) {
  const eng = engineResult || {};
  return {
    testName: inv.testName,
    file: eng.file || null,
    browser: inv.browser || null,
    classification: inv.classification || null,
    history: inv.history || [],
    retriesPerRun: inv.retriesPerRun || [],
    runCount: inv.runCount || 0,
    passedOnRetry: !!eng.passedOnRetry,
    retriesToPass: typeof eng.retriesToPass === "number" ? eng.retriesToPass : 0,
    firstSeenRun: typeof eng.firstSeenRun === "number" ? eng.firstSeenRun : null,
    lastSeenRun: typeof eng.lastSeenRun === "number" ? eng.lastSeenRun : null,
    matchedRuleCode: inv.matchedRuleCode || null,
    matchedRule: inv.matchedRule || null,
    category: inv.category || null,
    likelyCause: inv.likelyCause || null,
    explanation: inv.explanation || null,
    confidence: typeof inv.confidence === "number" ? inv.confidence : 0,
    severity: inv.severity || "medium",
    fingerprint: inv.fingerprint || null,
    fingerprintGroupCount: Number(inv.fingerprintGroupCount) || 0,
    classificationReasons: inv.classificationReasons || [],
    confidenceExplain: inv.confidenceExplain || null,
    evidence: rewriteEvidence(inv.evidence),
  };
}

/** Copy every referenced artifact once, so any failure's evidence resolves. */
function copyEvidenceAssets(investigations) {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const wanted = new Set();
  for (const inv of investigations) {
    const e = inv.evidence || {};
    for (const s of e.screenshots || []) wanted.add(basenameFromUrl(s));
    if (e.trace) wanted.add(basenameFromUrl(e.trace));
    if (e.video) wanted.add(basenameFromUrl(e.video));
  }
  let copied = 0;
  for (const base of wanted) {
    if (!base) continue;
    const src = path.join(EVIDENCE_DIR, base);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(ASSET_DIR, base));
    copied += 1;
  }
  return copied;
}

function readAllRuns() {
  const files = fs
    .readdirSync(CI_DIR)
    .filter((f) => /^results-run\d+\.json$/.test(f))
    .sort((a, b) => {
      const n = (x) => Number(x.match(/run(\d+)/)[1]);
      return n(a) - n(b);
    });
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(CI_DIR, f), "utf8")));
}

function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function round(n, places) {
  const f = Math.pow(10, places || 0);
  return Math.round(Number(n || 0) * f) / f;
}

/**
 * Executions = every test-browser combination, every run. Summed from the
 * analyzer's own per-run totals rather than multiplied out, so a run with a
 * different test count stays accurate.
 */
function countExecutions(perRun) {
  return perRun.reduce((n, r) => n + (Number(r.total) || 0), 0);
}

function buildTrend(perRun, retryTimeline) {
  const retriesByLabel = {};
  for (const t of retryTimeline || []) retriesByLabel[t.run] = t;
  return perRun.map((r) => {
    const rt = retriesByLabel[r.runLabel] || {};
    return {
      index: r.runIndex + 1,
      label: r.runLabel,
      generatedAt: r.generatedAt || null,
      total: r.total,
      passed: r.passed,
      failed: r.failed,
      skipped: r.skipped,
      passRate: round(r.passRate, 1),
      failRate: round(r.failRate, 1),
      flaky: Number(rt.flaky) || 0,
      retries: Number(r.totalRetries) || 0,
      durationMs: Number(r.totalDuration) || 0,
    };
  });
}

function buildBrowsers(dashboard) {
  const latestByName = {};
  for (const b of dashboard.browserStatsLatest || []) latestByName[b.browser] = b;
  return (dashboard.browserStats || []).map((b) => {
    const latest = latestByName[b.browser] || {};
    return {
      browser: b.browser,
      executions: b.totalTests,
      failures: b.totalFailures,
      failRate: round(b.failRate, 1),
      flaky: b.totalFlaky,
      retries: b.totalRetries,
      latestTests: latest.totalTests || 0,
      latestFailures: latest.totalFailures || 0,
      latestFailRate: round(latest.failRate, 1),
    };
  });
}

function buildCategories(counts) {
  const total = Object.values(counts || {}).reduce((a, b) => a + b, 0);
  return Object.entries(counts || {})
    .filter(([, n]) => n > 0)
    .map(([key, n]) => ({
      key,
      label: CATEGORY_LABELS[key] || key,
      count: n,
      pct: pct(n, total),
    }))
    .sort((a, b) => b.count - a.count);
}

function buildRecommendations(recs) {
  const out = [];
  for (const level of ["critical", "high", "medium", "low"]) {
    for (const r of (recs && recs[level]) || []) {
      out.push({ level, icon: r.icon || null, message: r.message });
    }
  }
  return out;
}

/**
 * The most-failing tests, joined to the analyzer's own root-cause finding for
 * the same test/browser so the dashboard row can say WHY as well as how often.
 */
function buildTopFailing(dashboard, limit) {
  const invByKey = {};
  for (const inv of dashboard.investigations || []) {
    invByKey[`${inv.testName}::${inv.browser}`] = inv;
  }
  return (dashboard.failureFrequency || [])
    .slice(0, limit)
    .map((f) => {
      const inv = invByKey[`${f.testName}::${f.browser}`] || {};
      return {
        testName: f.testName,
        browser: f.browser,
        failureCount: f.failureCount,
        totalRuns: f.totalRuns,
        failureRate: round(f.failureRate, 1),
        classification: inv.classification || null,
        classificationLabel: inv.classificationLabel || null,
        category: inv.category || null,
        likelyCause: inv.likelyCause || null,
        confidence: typeof inv.confidence === "number" ? inv.confidence : null,
        requiresHumanReview: !!inv.requiresHumanReview,
      };
    });
}

/**
 * Direction of a series, judged on its own last-vs-first movement. Returns the
 * facts; the label is chosen by the caller because "up" is good for pass rate
 * and bad for flakiness.
 */
function seriesShape(values) {
  const nums = values.map((v) => Number(v) || 0);
  const first = nums[0];
  const current = nums[nums.length - 1];
  const total = nums.reduce((a, b) => a + b, 0);
  return {
    current,
    first,
    previous: nums.length > 1 ? nums[nums.length - 2] : current,
    min: Math.min(...nums),
    max: Math.max(...nums),
    average: Math.round((total / nums.length) * 10) / 10,
    total,
    delta: current - first,
  };
}

/**
 * The two stability series a QA lead reads together: how many tests the
 * analyzer flags as flaky per run, and how many retries each run needed.
 * They separate test instability from retry/recovery behaviour.
 */
function buildStability(trend) {
  const flaky = seriesShape(trend.map((t) => t.flaky));
  const retries = seriesShape(trend.map((t) => t.retries));

  const flatFlaky = flaky.max - flaky.min <= 1;
  const flakyInterpretation = flatFlaky
    ? `Flat at ${flaky.current} flaky test${flaky.current === 1 ? "" : "s"} — a persistent set, not a spreading problem.`
    : flaky.delta > 0
      ? `Up ${flaky.delta} since the first run — instability is spreading to more tests.`
      : flaky.delta < 0
        ? `Down ${Math.abs(flaky.delta)} since the first run — fewer tests are alternating.`
        : `Ends where it started, at ${flaky.current}, after moving in between.`;

  const spread = retries.max - retries.min;
  const retryInterpretation =
    spread > retries.average * 0.4
      ? `Swings between ${retries.min} and ${retries.max} per run — retry load is uneven, so some runs are recovering far more than others.`
      : `Steady around ${retries.average} per run — retry behaviour is consistent across the window.`;

  return {
    flaky: {
      ...flaky,
      series: trend.map((t) => ({ label: t.label, value: t.flaky })),
      interpretation: flakyInterpretation,
    },
    retries: {
      ...retries,
      series: trend.map((t) => ({ label: t.label, value: t.retries })),
      interpretation: retryInterpretation,
    },
  };
}

/**
 * Failure Intelligence — the analysed failures grouped by the strongest
 * deterministic signal the engine found.
 *
 * Deliberately NOT called "root cause": when the engine matched only the
 * generic fallback, or the rule asks for a human, that is reported honestly as
 * needing manual investigation rather than dressed up as a determination.
 */
function buildFailureIntelligence(investigations) {
  const groups = new Map();

  for (const inv of investigations) {
    const key = inv.matchedRuleCode || "unmatched";
    if (!groups.has(key)) {
      groups.set(key, {
        ruleCode: inv.matchedRuleCode || null,
        pattern: inv.likelyCause || "Cause could not be identified",
        category: inv.category || "Unknown",
        severity: inv.severity || "medium",
        requiresHumanReview: !!inv.requiresHumanReview,
        tests: 0,
        browsers: new Set(),
        confidences: [],
        classifications: new Set(),
        examples: [],
      });
    }
    const g = groups.get(key);
    g.tests += 1;
    if (inv.browser) g.browsers.add(inv.browser);
    if (typeof inv.confidence === "number") g.confidences.push(inv.confidence);
    if (inv.classification) g.classifications.add(inv.classification);
    if (g.examples.length < 3) {
      g.examples.push({ testName: inv.testName, browser: inv.browser, id: failureId(inv) });
    }
  }

  return [...groups.values()]
    .map((g) => {
      const confidence = g.confidences.length
        ? Math.round(g.confidences.reduce((a, b) => a + b, 0) / g.confidences.length)
        : null;
      // Low confidence or an explicit escalation both mean the same thing to a
      // QA engineer: the engine is not claiming to know.
      const needsManual = g.requiresHumanReview || (confidence !== null && confidence < 50);
      return {
        pattern: needsManual && confidence !== null && confidence < 50
          ? "Needs manual investigation"
          : g.pattern,
        detail: g.pattern,
        category: g.category,
        severity: g.severity,
        tests: g.tests,
        browsers: [...g.browsers].sort(),
        confidence,
        needsManualInvestigation: needsManual,
        requiresHumanReview: g.requiresHumanReview,
        classifications: [...g.classifications],
        examples: g.examples,
      };
    })
    .sort((a, b) => b.tests - a.tests || (b.confidence || 0) - (a.confidence || 0));
}

/**
 * Run highlights, rebuilt as structured facts rather than the analyzer's own
 * prose paragraph. Every figure is read off the analyzer output.
 */
function buildHighlights(dashboard, perRun, investigations) {
  const summary = dashboard.summary || {};
  const suite = dashboard.suiteSummary || {};
  const latest = perRun[perRun.length - 1] || {};
  const categories = buildCategories(
    dashboard.failureCategories && dashboard.failureCategories.counts
  );
  const topCategory = categories[0];
  const browsers = buildBrowsers(dashboard);
  const worstBrowser = [...browsers].sort((a, b) => b.failRate - a.failRate)[0];
  const bestBrowser = [...browsers].sort((a, b) => a.failRate - b.failRate)[0];
  const totalRetries = perRun.reduce((n, r) => n + (Number(r.totalRetries) || 0), 0);
  const manual = investigations.filter((i) => i.requiresHumanReview).length;

  const items = [
    {
      key: "scope",
      label: "Suite scope",
      value: `${summary.totalTests} tests · ${summary.runs} runs`,
      detail: `${suite.stable} passed in every run.`,
      tone: "neutral",
    },
    {
      key: "latest",
      label: `Latest run (${latest.runLabel || "—"})`,
      value: `${round(latest.passRate, 1)}% pass rate`,
      detail: `${latest.passed} passed, ${latest.failed} failed${latest.skipped ? `, ${latest.skipped} skipped` : ""}.`,
      tone: latest.passRate >= 80 ? "good" : "warn",
    },
    {
      key: "flaky",
      label: "Flaky tests",
      value: `${suite.flaky} detected`,
      detail: `Outcomes alternate between pass and fail across the window.`,
      tone: suite.flaky > 0 ? "warn" : "good",
    },
    {
      key: "newly",
      label: "Newly failing",
      value: `${suite.newlyFailed} tests`,
      detail: `Passed earlier in the window and are failing now.`,
      tone: suite.newlyFailed > 0 ? "bad" : "good",
    },
    {
      key: "stablefail",
      label: "Consistently failing",
      value: `${suite.stableFail} tests`,
      detail: `Failed in every run — reproducible, not intermittent.`,
      tone: suite.stableFail > 0 ? "bad" : "good",
    },
  ];

  if (topCategory) {
    items.push({
      key: "category",
      label: "Dominant failure category",
      value: topCategory.label,
      detail: `${topCategory.count} of the classified failures (${topCategory.pct}%) — the largest single concentration.`,
      tone: "warn",
    });
  }

  items.push({
    key: "retries",
    label: "Retry behaviour",
    value: `${totalRetries.toLocaleString("en-GB")} retries`,
    detail: `${(dashboard.passingOnRetryTests || []).length} test(s) recovered on retry; the rest failed again.`,
    tone: "neutral",
  });

  if (worstBrowser && bestBrowser) {
    items.push({
      key: "browser",
      label: "Browser spread",
      value: `${worstBrowser.browser} worst at ${worstBrowser.failRate}%`,
      detail:
        worstBrowser.browser === bestBrowser.browser
          ? `Only one browser analysed.`
          : `${bestBrowser.browser} is lowest at ${bestBrowser.failRate}% — a ${round(worstBrowser.failRate - bestBrowser.failRate, 1)} point spread.`,
      tone: "neutral",
    });
  }

  items.push({
    key: "manual",
    label: "Awaiting human review",
    value: `${manual} failures`,
    detail: `The engine declined to name a cause and routed these to a person.`,
    tone: manual > 0 ? "warn" : "good",
  });

  return items;
}

function buildRetrySummary(perRun, dashboard) {
  const totalRetries = perRun.reduce((n, r) => n + (Number(r.totalRetries) || 0), 0);
  const recovered = (dashboard.passingOnRetryTests || []).length;
  const runsWithRetries = perRun.filter((r) => (Number(r.totalRetries) || 0) > 0).length;
  return {
    totalRetries,
    recoveredTests: recovered,
    runsWithRetries,
    totalRuns: perRun.length,
    retryRate: round(dashboard.health && dashboard.health.retryRate, 2),
  };
}

/** Featured investigations — the curated scenarios, linked by their real ids. */
function buildFeatured(dashboard) {
  let index = [];
  try {
    index = JSON.parse(fs.readFileSync(path.join(SCENARIO_DIR, "index.json"), "utf8"));
  } catch {
    return [];
  }
  return index.map((s) => {
    const failed = (s.history || []).filter((h) => h === "failed").length;
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      classification: s.classification,
      category: s.category,
      runCount: s.runCount,
      failedCount: failed,
      transitions: s.transitions,
      history: s.history || [],
      failureRate: pct(failed, s.runCount),
    };
  });
}

function buildDashboard(result, dashboard) {
  const perRun = (result.statistics && result.statistics.perRun) || [];
  const trend = buildTrend(perRun, dashboard.retryTimeline);
  const latest = perRun[perRun.length - 1] || {};
  const summary = dashboard.summary || {};
  const suite = dashboard.suiteSummary || {};
  const invSummary = dashboard.investigationSummary || {};

  const composition = COMPOSITION.map((c) => ({
    ...c,
    count: Number(suite[c.key]) || 0,
    pct: pct(Number(suite[c.key]) || 0, suite.total || 0),
  })).filter((c) => c.count > 0);

  const humanReview = (dashboard.investigations || []).filter((i) => i.requiresHumanReview).length;
  const matchedRules = new Set(
    (dashboard.investigations || []).map((i) => i.matchedRuleCode).filter(Boolean)
  );

  return {
    generatedAt: dashboard.generatedAt,
    analyzerVersion: dashboard.version,
    schemaVersion: dashboard.schemaVersion,

    dataset: {
      runs: summary.runs || perRun.length,
      tests: summary.totalTests || suite.total || 0,
      executions: countExecutions(perRun),
      browsers: (dashboard.browserStats || []).length,
      firstRunAt: (perRun[0] && perRun[0].generatedAt) || null,
      lastRunAt: latest.generatedAt || null,
    },

    health: {
      score: Number(summary.healthScore) || 0,
      passRate: round(dashboard.health && dashboard.health.passRate, 1),
      failRate: round(dashboard.health && dashboard.health.failRate, 1),
      flakyRate: round(dashboard.health && dashboard.health.flakyRate, 1),
      avgDurationMs: Math.round(Number(dashboard.health && dashboard.health.avgDurationMs) || 0),
    },

    headline: {
      total: suite.total || 0,
      passing: suite.stable || 0,
      passingOnRetry: suite.passingOnRetry || 0,
      flaky: suite.flaky || 0,
      failing: suite.failed || 0,
      newlyFailing: suite.newlyFailed || 0,
      consistentlyFailing: suite.stableFail || 0,
      fixed: suite.fixed || 0,
      skipped: suite.skipped || 0,
    },

    composition,

    latestRun: {
      label: latest.runLabel || null,
      index: perRun.length,
      generatedAt: latest.generatedAt || null,
      total: latest.total || 0,
      passed: latest.passed || 0,
      failed: latest.failed || 0,
      skipped: latest.skipped || 0,
      passRate: round(latest.passRate, 1),
    },

    trend,
    stability: buildStability(trend),
    failureIntelligence: buildFailureIntelligence(dashboard.investigations || []),
    highlights: buildHighlights(dashboard, perRun, dashboard.investigations || []),
    browsers: buildBrowsers(dashboard),
    categories: buildCategories(dashboard.failureCategories && dashboard.failureCategories.counts),
    categoriesLatest: buildCategories(
      dashboard.failureCategoriesLatest && dashboard.failureCategoriesLatest.counts
    ),
    retry: buildRetrySummary(perRun, dashboard),

    rules: {
      total: RULES.length,
      matched: matchedRules.size,
      humanReview,
      investigations: invSummary.totalFailing || (dashboard.investigations || []).length,
      uniqueFingerprints: invSummary.uniqueFingerprints || 0,
      topCategory: invSummary.topCategory || null,
    },

    recommendations: buildRecommendations(dashboard.recommendations),
    runSummary: dashboard.runSummary || [],
    topFailing: buildTopFailing(dashboard, 8),
    featured: buildFeatured(dashboard),
  };
}

function buildRules(dashboard) {
  const investigations = dashboard.investigations || [];

  const byCode = {};
  for (const inv of investigations) {
    const code = inv.matchedRuleCode;
    if (!code) continue;
    (byCode[code] = byCode[code] || []).push(inv);
  }

  const rules = RULES.map((rule) => {
    const meta = rule.result();
    const hits = byCode[rule.code] || [];
    const browsers = [...new Set(hits.map((h) => h.browser).filter(Boolean))].sort();
    const confidences = hits
      .map((h) => h.confidence)
      .filter((c) => typeof c === "number");
    const avgConfidence = confidences.length
      ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : null;

    return {
      code: rule.code,
      id: rule.id,
      name: meta.likelyCause,
      category: meta.category || rule.category || "Unknown",
      severity: meta.severity,
      baseConfidence: meta.confidence,
      pattern: typeof rule.pattern === "string" ? rule.pattern : String(rule.pattern || ""),
      explanation: meta.explanation,
      evidence: meta.evidenceDescription || meta.evidence || null,
      suggestedChecks: meta.suggestedChecks || [],
      requiresHumanReview: !!meta.requiresHumanReview,
      matches: {
        count: hits.length,
        browsers,
        avgConfidence,
        examples: hits.slice(0, 3).map((h) => ({
          testName: h.testName,
          browser: h.browser,
          classification: h.classification,
          classificationLabel: h.classificationLabel || null,
          confidence: h.confidence,
        })),
      },
    };
  });

  const categories = {};
  for (const r of rules) {
    const c = (categories[r.category] = categories[r.category] || {
      name: r.category,
      ruleCount: 0,
      matchCount: 0,
    });
    c.ruleCount += 1;
    c.matchCount += r.matches.count;
  }

  return {
    generatedAt: dashboard.generatedAt,
    analyzerVersion: dashboard.version,
    suite: {
      totalRules: rules.length,
      matchedRules: rules.filter((r) => r.matches.count > 0).length,
      totalInvestigations: investigations.length,
      humanReviewRules: rules.filter((r) => r.requiresHumanReview).length,
      humanReviewMatches: investigations.filter((i) => i.requiresHumanReview).length,
      totalChecks: rules.reduce((n, r) => n + r.suggestedChecks.length, 0),
    },
    categories: Object.values(categories).sort((a, b) => b.matchCount - a.matchCount),
    rules: rules.sort((a, b) => b.matches.count - a.matches.count || a.code.localeCompare(b.code)),
  };
}

/**
 * Which curated scenario, if any, an analysed failure corresponds to. Those
 * three already have a pre-generated verdict, so the UI can link straight to
 * the fast demo path instead of re-running the model.
 */
function curatedScenarioIndex() {
  const byKey = {};
  let index = [];
  try {
    index = JSON.parse(fs.readFileSync(path.join(SCENARIO_DIR, "index.json"), "utf8"));
  } catch {
    return byKey;
  }
  for (const entry of index) {
    try {
      const pack = JSON.parse(
        fs.readFileSync(path.join(SCENARIO_DIR, `${entry.id}.pack.json`), "utf8")
      );
      const subject = pack.subject || {};
      byKey[`${subject.testName}::${subject.browser}`] = entry.id;
    } catch {
      /* a scenario without a pack simply has no mapping */
    }
  }
  return byKey;
}

/**
 * Write one file per analysed failure containing the trimmed investigation AND
 * its evidence pack. This is what makes "Investigate with AI" work for any of
 * the analysed failures rather than only the three curated ones: the page
 * reads the pack, and the client posts the investigation to /api/investigate,
 * exactly as a curated scenario does.
 */
function buildFailures(result, dashboard, buildEvidencePack) {
  const investigations = dashboard.investigations || [];
  // Tests that failed at least once but recovered when retried. The analyzer
  // gives them the same shape as an investigation — matched rule, confidence,
  // parsed error, artifacts — so they get real evidence packs and the same
  // actions. They are kept in a separate list because they are not failures.
  const recovered = dashboard.passingOnRetryTests || [];
  const curated = curatedScenarioIndex();
  const engineResults = result.results || [];

  const siblingsFor = (testName, browser) => {
    const set = new Set();
    for (const inv of investigations) {
      if (inv.testName === testName && inv.browser && inv.browser !== browser) {
        set.add(inv.browser);
      }
    }
    return [...set];
  };

  fs.mkdirSync(FAILURE_DIR, { recursive: true });
  const rows = [];
  const recoveredRows = [];
  const seen = new Set();

  const emit = (inv, target, extra) => {
    let id = failureId(inv);
    while (seen.has(id)) id = `${id}-x`;
    seen.add(id);

    const engineResult =
      engineResults.find((r) => r.title === inv.testName && r.browser === inv.browser) || null;
    const trimmed = trimInvestigation(inv, engineResult);
    const redacted = redactDeep(trimmed);
    const investigation = redacted.data;

    const pack = buildEvidencePack(investigation, {
      siblingBrowsers: siblingsFor(inv.testName, inv.browser),
      redaction: { count: redacted.count },
    });

    const history = investigation.history || [];
    const failed = history.filter((h) => h === "failed").length;
    const transitions = history.reduce((n, h, i) => {
      if (i === 0) return n;
      const prev = history[i - 1];
      if ((prev === "passed" && h === "failed") || (prev === "failed" && h === "passed")) {
        return n + 1;
      }
      return n;
    }, 0);

    const evidence = investigation.evidence || {};
    const screenshots = Array.isArray(evidence.screenshots) ? evidence.screenshots.length : 0;
    const presentCount = (pack.presentIds || []).length;
    const parsedError = evidence.parsedError || {};

    fs.writeFileSync(
      path.join(FAILURE_DIR, `${id}.json`),
      JSON.stringify({ id, investigation, pack }, null, 2)
    );

    target.push({
      id,
      ...extra,
      scenarioId: curated[`${inv.testName}::${inv.browser}`] || null,
      testName: inv.testName,
      browser: inv.browser,
      file: investigation.file,
      classification: investigation.classification,
      classificationLabel: inv.classificationLabel || null,
      history,
      runCount: investigation.runCount,
      failedCount: failed,
      failureRate: pct(failed, investigation.runCount),
      transitions,
      pattern: investigation.likelyCause || "Cause could not be identified",
      ruleCode: investigation.matchedRuleCode,
      category: investigation.category || "Unknown",
      confidence: investigation.confidence,
      severity: investigation.severity,
      requiresHumanReview: !!inv.requiresHumanReview,
      fingerprintGroupCount: investigation.fingerprintGroupCount,
      errorHeader: parsedError.header || null,
      codeLocation: evidence.codeFrameLocation || null,
      artifacts: {
        screenshots,
        trace: !!evidence.trace,
        video: !!evidence.video,
        any: screenshots > 0 || !!evidence.trace || !!evidence.video,
      },
      // Evidence strength decides whether the UI warns before an AI call.
      // The action is never hidden — a sparse failure is still investigable,
      // the model is simply likely to answer "not enough evidence".
      evidencePresent: presentCount,
      evidenceTotal: (pack.items || []).length,
      sparse: presentCount < 6,
    });
  };

  for (const inv of investigations) emit(inv, rows, { kind: "failure" });

  for (const rec of recovered) {
    const retries = Array.isArray(rec.retriesPerRun) ? rec.retriesPerRun : [];
    emit(rec, recoveredRows, {
      kind: "recovered",
      retriedRuns: retries.filter((r) => Number(r) > 0).length,
      totalRetries: retries.reduce((n, r) => n + (Number(r) || 0), 0),
      retriesToPass: Number(rec.retriesToPass) || 0,
    });
  }

  rows.sort(
    (a, b) =>
      b.failureRate - a.failureRate ||
      b.confidence - a.confidence ||
      a.testName.localeCompare(b.testName)
  );

  recoveredRows.sort((a, b) => b.totalRetries - a.totalRetries || a.testName.localeCompare(b.testName));

  const index = {
    generatedAt: dashboard.generatedAt,
    total: rows.length,
    curated: rows.filter((r) => r.scenarioId).length,
    categories: [...new Set(rows.map((r) => r.category))].sort(),
    classifications: [...new Set(rows.map((r) => r.classification))].sort(),
    browsers: [...new Set(rows.map((r) => r.browser))].sort(),
    failures: rows,
    recoveredTotal: recoveredRows.length,
    recovered: recoveredRows,
    // Skipped tests never executed, so there is no evidence, no rule match and
    // nothing to investigate — they are listed for completeness only.
    skippedTotal: (dashboard.skippedTests || []).length,
    skipped: (dashboard.skippedTests || []).map((s) => ({
      testName: s.title,
      browser: s.browser,
      history: s.history || [],
      runCount: (s.history || []).length,
    })),
  };
  fs.writeFileSync(path.join(FAILURE_DIR, "index.json"), JSON.stringify(index, null, 2));

  return index;
}

async function main() {
  const runs = readAllRuns();
  if (runs.length === 0) throw new Error(`No Playwright result files found in ${CI_DIR}`);

  const { buildEvidencePack } = await import(
    pathToFileURL(path.join(REPO_ROOT, "web", "lib", "evidence-pack.js")).href
  );

  const result = compare(runs, { analyzer: { minFailures: 2 } });
  const dashboard = buildDashboardJson(result);

  const suiteDashboard = buildDashboard(result, dashboard);
  const suiteRules = buildRules(dashboard);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "dashboard.json"),
    JSON.stringify(suiteDashboard, null, 2)
  );
  fs.writeFileSync(path.join(OUT_DIR, "rules.json"), JSON.stringify(suiteRules, null, 2));

  const failures = buildFailures(result, dashboard, buildEvidencePack);
  const copiedAssets = copyEvidenceAssets([
    ...(dashboard.investigations || []),
    ...(dashboard.passingOnRetryTests || []),
  ]);

  console.log(
    [
      "",
      `  Suite data written to web/public/suite/ and web/public/failures/`,
      "",
      `    runs             ${suiteDashboard.dataset.runs}`,
      `    tests            ${suiteDashboard.dataset.tests}`,
      `    executions       ${suiteDashboard.dataset.executions}`,
      `    health score     ${suiteDashboard.health.score}`,
      `    rules matched    ${suiteRules.suite.matchedRules}/${suiteRules.suite.totalRules}`,
      `    checks           ${suiteRules.suite.totalChecks}`,
      `    human review     ${suiteRules.suite.humanReviewMatches}`,
      "",
      `    failures         ${failures.total} (all AI-investigable)`,
      `    recovered        ${failures.recoveredTotal} passing-on-retry (same actions)`,
      `    curated demos    ${failures.curated}`,
      `    signal groups    ${suiteDashboard.failureIntelligence.length}`,
      `    artifacts copied ${copiedAssets}`,
      "",
    ].join("\n")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
