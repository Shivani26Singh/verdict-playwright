"use strict";

/**
 * Build a complete AI investigation prompt for the full analysis report.
 *
 * @param {Object} analysis - Full analyzer result from analyzer/engine.js compare()
 *   { summary, results, statistics, runs, schemaVersion, analyzerVersion }
 * @returns {string} Complete prompt string ready for an LLM
 */
function buildInvestigationPrompt(analysis) {
  var evidence = buildEvidenceJson(analysis);
  var evidenceJson = JSON.stringify(evidence, null, 2);

  var prompt = [
    "You are a Senior QA Engineer specializing in Playwright test reliability.",

    "",
    "## Context",
    "",
    "The deterministic analysis has already been completed by the Playwright Flaky",
    "Reporter. Do NOT repeat or recompute it. Your responsibility is to interpret",
    "the evidence and provide engineering insights.",
    "",
    "The reporter has already performed:",
    "- Flaky detection (pass/fail pattern analysis across multiple CI runs)",
    "- Failure classification (timeout, locator, assertion, network, auth, etc.)",
    "- Retry analysis (which tests recovered on retry)",
    "- Browser analysis (per-browser pass/fail/flaky rates)",
    "- Stability scoring (how consistent each test's outcome is)",
    "- Historical trends (pass rate trajectory over runs)",
    "- Rule-based investigation (matching known failure patterns)",

    "",
    "## Your Task",
    "",
    "Perform a Root Cause Analysis (RCA) on this test suite's failures. You are NOT",
    "analyzing the raw test results — you are interpreting the deterministic analysis",
    "that has already been computed.",

    "",
    "## Rules",
    "",
    "1. Base every conclusion ONLY on the supplied evidence. Never invent facts.",
    "2. If the evidence is insufficient to determine a root cause, say so explicitly.",
    "3. Always explain WHY — connect observations to conclusions with reasoning.",
    "4. Think like an experienced QA Lead investigating a flaky CI failure.",
    '5. Avoid vague statements like "investigate further," "check logs," "review code,"',
    '   or "possible timing issue" — instead explain specifically what to investigate and why.',
    "6. Reference specific tests, error patterns, and statistical trends from the evidence.",

    "",
    "## Output Format",
    "",
    "Respond with the following sections:",

    "",
    "### Executive Summary",
    "A concise overview of the test suite's health. Summarize the key findings:",
    "how many tests, pass rate, flaky count, regression count, and the dominant",
    "failure patterns. This should read like the opening paragraph of an incident report.",

    "",
    "### Suite Health",
    "Assess the overall health of the test suite. Consider the pass rate, the flaky",
    "rate, the retry rate, and how these have changed across runs. Is the suite",
    "trending healthier or more unstable?",

    "",
    "### Flaky Tests",
    "List the flaky tests and for each one, explain the most likely explanation for",
    "the intermittent behavior based on the failure category, history pattern, and",
    "error messages. Be specific about WHY each test is likely flaky.",

    "",
    "### Consistent Failures",
    "For tests that fail consistently (stable failures or regressions), explain what",
    "the evidence suggests about the root cause. These are not flaky — they are broken.",
    "Distinguish between tests that have always failed and tests that regressed after",
    "being fixed.",

    "",
    "### Browser Analysis",
    "Compare failure patterns across browsers. Are certain failures browser-specific?",
    "Is one browser significantly less stable than others? What does this suggest about",
    "the root cause?",

    "",
    "### Failure Trends",
    "Analyze how the failure rates and patterns have changed across runs. Is the suite",
    "improving or degrading? Are there specific runs where things got worse? What might",
    "explain those shifts?",

    "",
    "### Root Cause Analysis",
    "For each significant failure type (by category), identify the most likely root cause.",
    "Connect specific evidence — error messages, failure frequency, patterns across runs —",
    "to your conclusions. This is the core of the investigation.",

    "",
    "### Confidence Assessment",
    "For each major finding, explain your confidence level (High/Medium/Low) and WHY.",
    "Reference specific evidence that increases or decreases confidence. Note where",
    "additional data (traces, screenshots, git history) would improve confidence.",

    "",
    "### Recommended Actions",
    "Prioritized, concrete recommendations with clear justifications. Each action should",
    "address a specific finding from the analysis. Include both immediate fixes and",
    "long-term process improvements.",

    "",
    "### Debugging Plan",
    "An ordered list of investigation steps for the engineering team. Each step should",
    "be actionable, specific, and explain what it will reveal. Start with the highest",
    "impact, lowest effort steps.",

    "",
    "---",
    "",
    "## Deterministic Analysis",
    "",
    "```json",
    evidenceJson,
    "```",
  ].join("\n");

  return prompt;
}

/**
 * Build a structured evidence JSON from the full analyzer result.
 * Filters to the fields an LLM needs — no internal/redundant data.
 */
function buildEvidenceJson(analysis) {
  var summary = analysis.summary || {};
  var results = analysis.results || [];
  var statistics = analysis.statistics || {};
  var aggregate = statistics.aggregate || {};
  var fc = statistics.failureCategories || {};
  var runs = analysis.runs || [];

  // Filter to problematic tests only
  var problematic = results
    .filter(function (t) {
      return t.classification !== "stable_pass";
    })
    .map(function (t) {
      return {
        title: t.title,
        file: t.file || null,
        browser: t.browser || null,
        tags: t.tags || [],
        history: t.history,
        classification: t.classification,
        stabilityScore: t.stabilityScore,
        failureCategory: t.failureCategory || "unknown",
        firstSeenRun: t.firstSeenRun,
        lastSeenRun: t.lastSeenRun,
        errors: (t.classifiedErrors || t.errors || []).map(function (e) {
          if (typeof e === "string") return { message: e };
          return { message: e.message || "", category: e.category || "unknown" };
        }),
      };
    });

  // Timeline: per-run pass/fail rates
  var perRun = (statistics.perRun || []).map(function (r) {
    return {
      label: r.runLabel,
      passRate: r.passRate,
      failRate: r.failRate,
      failed: r.failed,
      flaky: r.flaky,
      totalRetries: r.totalRetries,
      totalDurationMs: r.totalDuration,
    };
  });

  return {
    meta: {
      analyzerVersion: analysis.analyzerVersion || "unknown",
      schemaVersion: analysis.schemaVersion || "unknown",
    },
    summary: {
      runsAnalyzed: summary.runsAnalyzed || 0,
      totalTests: summary.totalTests || 0,
      stablePass: summary.stable_pass || 0,
      stableFailure: summary.stable_failure || 0,
      flaky: summary.flaky || 0,
      newlyFailed: summary.newly_failed || 0,
      fixed: summary.fixed || 0,
      regression: summary.regression || 0,
    },
    health: {
      overallPassRate: aggregate.overallPassRate || 0,
      overallFailRate: aggregate.overallFailRate || 0,
      avgDurationMs: aggregate.avgDurationAcrossRuns || 0,
      avgRetries: aggregate.avgRetriesAcrossRuns || 0,
      bestRunPassRate: aggregate.bestRunPassRate || 0,
      worstRunPassRate: aggregate.worstRunPassRate || 0,
    },
    timeline: perRun,
    browserBreakdown: (statistics.browserStats || []).map(function (b) {
      return {
        browser: b.browser,
        totalTests: b.totalTests,
        totalFailures: b.totalFailures,
        totalFlaky: b.totalFlaky,
        totalRetries: b.totalRetries,
        failRate: b.failRate,
        flakyRate: b.flakyRate,
      };
    }),
    failureCategories: {
      total: fc.total || 0,
      counts: fc.counts || {},
    },
    failureFrequency: (statistics.failureFrequency || [])
      .filter(function (f) {
        return f.failureCount > 0;
      })
      .map(function (f) {
        return {
          title: f.title,
          failureCount: f.failureCount,
          totalRuns: f.totalRuns,
          failureRate: f.failureRate,
        };
      }),
    slowestTests: (statistics.slowestTests || []).slice(0, 5).map(function (t) {
      return {
        title: t.title,
        totalDurationMs: t.totalDuration,
        maxDurationMs: t.maxDuration,
        retries: t.retries,
      };
    }),
    problematicTests: problematic,
  };
}

module.exports = { buildInvestigationPrompt, buildEvidenceJson };
