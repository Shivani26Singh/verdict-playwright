"use strict";

/**
 * Offline "mock" provider.
 *
 * Produces a deterministic, schema-valid AI investigation object derived from
 * the curated evidence — no network, no key. Its purpose is to exercise the
 * end-to-end enrichment + rendering path (tests, demos, CI smoke) without a
 * real LLM. It labels itself so its output is never mistaken for real analysis.
 *
 * `buildOverlay` is synchronous and exported for the sync enrichment path; the
 * async `investigate` wraps it for the uniform provider contract.
 */
function buildOverlay(evidence) {
  evidence = evidence || {};
  var summary = evidence.summary || {};
  var health = evidence.health || {};
  var problematic = evidence.problematicTests || [];
  var categories = (evidence.failureCategories && evidence.failureCategories.counts) || {};

  var topCategory =
    Object.keys(categories)
      .filter(function (k) {
        return categories[k] > 0;
      })
      .sort(function (a, b) {
        return categories[b] - categories[a];
      })[0] || null;

  var flaky = problematic
    .filter(function (t) {
      return t.classification === "flaky";
    })
    .map(function (t) {
      return {
        name: t.title,
        issue:
          "Alternates pass/fail across runs (" + (t.failureCategory || "unknown") + " category).",
        fix: "Replace fixed waits with assertion-based waits and isolate shared test state.",
      };
    });

  var consistent = problematic
    .filter(function (t) {
      return t.classification === "stable_failure" || t.classification === "newly_failed";
    })
    .map(function (t) {
      return {
        name: t.title,
        issue:
          "Fails consistently in recent runs (" + (t.failureCategory || "unknown") + " category).",
        fix: "Reproduce locally with the Playwright trace and fix the underlying defect.",
      };
    });

  return {
    executiveSummary:
      "[mock provider] " +
      (summary.totalTests || 0) +
      " tests across " +
      (summary.runsAnalyzed || 0) +
      " runs; " +
      problematic.length +
      " need attention. This is a canned, offline enrichment for demonstration — not real model output.",
    suiteHealth:
      "Pass rate " +
      (health.overallPassRate || 0) +
      "%. The deterministic classification, rules, and confidence shown elsewhere are authoritative; this narrative only interprets them.",
    flakyTests: flaky,
    consistentFailures: consistent,
    browserAnalysis: "No browser-specific pattern asserted by the mock provider.",
    failureTrends:
      "See the deterministic per-run timeline; the mock provider does not infer a trend.",
    rootCauseAnalysis: topCategory
      ? [
          {
            name: topCategory.charAt(0).toUpperCase() + topCategory.slice(1) + " failures",
            issue: topCategory + " is the most common failure category in the evidence.",
            fix:
              "Address the dominant " +
              topCategory +
              " pattern first for the biggest reliability gain.",
          },
        ]
      : [],
    confidenceAssessment: "Illustrative only — the mock provider performs no real reasoning.",
    recommendedActions: problematic.length
      ? ["Triage the " + problematic.length + " problematic test(s), highest-severity first."]
      : ["No action required — the suite is stable."],
    debuggingPlan: problematic.length
      ? [
          "Open the Playwright trace for the top failing test",
          "Compare a passing vs. failing run side by side",
        ]
      : [],
  };
}

module.exports = {
  name: "mock",
  mode: "offline",
  buildOverlay: buildOverlay,
  async investigate(ctx) {
    return buildOverlay((ctx && ctx.evidence) || {});
  },
};
