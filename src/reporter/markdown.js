"use strict";

const CLASSIFICATION_ORDER = [
  "regression",
  "stable_failure",
  "newly_failed",
  "flaky",
  "fixed",
  "stable_pass",
];

const CLASSIFICATION_LABELS = {
  regression: "Regression",
  stable_failure: "Stable Failure",
  newly_failed: "New Failure",
  flaky: "Flaky",
  fixed: "Fixed",
  stable_pass: "Stable Pass",
};

const FAILURE_LABELS = {
  timeout: "Timeout",
  locator: "Locator",
  assertion: "Assertion",
  network: "Network",
  authentication: "Authentication",
  environment: "Environment",
  data: "Data",
  unknown: "Unknown",
};

function generate(result) {
  const sections = [
    buildHeader(result),
    buildExecutiveSummary(result),
    buildFlakyTrend(result),
    buildTestsByCategory(result),
    buildStatistics(result),
    buildRecommendations(result),
  ];

  sections.push(buildFooter(result));

  return sections.filter(Boolean).join("\n\n");
}

// Flaky Tests Trend — cross-run flaky classification as of each analyzed run
// (result.flakyTrend, built in engine.js from the same classify() calls that
// produce every test's final classification — see buildFlakyTrend there),
// aligned run-for-run with the Per-Run Breakdown table below so the two can
// be compared directly. NOT statistics.perRun[].flaky, which is Playwright's
// own in-run retry flakiness within a single invocation — a different,
// still-valid metric that the Per-Run Breakdown table below continues to show
// under its own "Flaky" column.
function buildFlakyTrend(result) {
  const trend = result.flakyTrend;
  if (!trend || trend.length === 0) return "";

  const lines = ["## Flaky Tests Trend"];

  if (trend.length < 2) {
    lines.push("Trend requires multiple analyzed runs.");
    return lines.join("\n");
  }

  lines.push("| Run | Flaky Count |");
  lines.push("|-----|-------------|");
  trend.forEach((run) => {
    lines.push(`| ${run.runLabel} | ${run.flaky} |`);
  });
  lines.push("");
  lines.push(describeFlakyTrend(trend));

  return lines.join("\n");
}

// Describes only what the analyzed runs show — no invented causes.
function describeFlakyTrend(trend) {
  const n = trend.length;
  const first = trend[0].flaky || 0;
  const last = trend[n - 1].flaky || 0;
  const diff = last - first;

  if (Math.abs(diff) < 1) {
    return `Flaky test count remained relatively stable across the ${n} analyzed runs.`;
  }
  const verb = diff > 0 ? "increased" : "decreased";
  return `Flaky tests ${verb} from ${first} to ${last} across the ${n} analyzed runs.`;
}

function buildHeader(result) {
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);
  return [
    `# Playwright Flaky Test Analysis`,
    `\n**Generated:** ${now}`,
    `**Analyzer Version:** ${result.analyzerVersion}`,
  ].join("\n");
}

function buildExecutiveSummary(result) {
  const s = result.summary;
  const stats = result.statistics;
  const agg = stats && stats.aggregate;
  const problematic = s.stable_failure + s.flaky + s.newly_failed + s.regression;
  const healthPct =
    s.totalTests > 0 ? Math.round(((s.totalTests - problematic) / s.totalTests) * 100) : 100;

  const lines = ["## Executive Summary"];

  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Runs Analyzed | ${s.runsAnalyzed} |`);
  lines.push(`| Total Tests | ${s.totalTests} |`);
  lines.push(`| Stable Pass | ${s.stable_pass} |`);
  lines.push(`| Stable Failure | ${s.stable_failure} |`);
  lines.push(`| Flaky | ${s.flaky} |`);
  lines.push(`| Newly Failed | ${s.newly_failed} |`);
  lines.push(`| Fixed | ${s.fixed} |`);
  lines.push(`| Regression | ${s.regression} |`);
  lines.push(`| **Test Health** | **${healthPct}%** (${s.stable_pass} / ${s.totalTests} stable) |`);

  if (agg) {
    lines.push(`| Overall Pass Rate | ${agg.overallPassRate}% |`);
    lines.push(`| Overall Fail Rate | ${agg.overallFailRate}% |`);
    lines.push(`| Best Run Pass Rate | ${agg.bestRunPassRate}% |`);
    lines.push(`| Worst Run Pass Rate | ${agg.worstRunPassRate}% |`);
    lines.push(`| Avg Duration / Run | ${agg.avgDurationAcrossRuns}ms |`);
  }

  return lines.join("\n");
}

function buildTestsByCategory(result) {
  const sections = [];

  for (const classification of CLASSIFICATION_ORDER) {
    if (classification === "stable_pass") continue;

    const tests = result.results.filter((t) => t.classification === classification);
    if (tests.length === 0) continue;

    sections.push(buildTestSection(classification, tests));
  }

  return sections.join("\n\n");
}

function buildTestSection(classification, tests) {
  const label = CLASSIFICATION_LABELS[classification];
  const icon = classificationIcon(classification);
  const lines = [];

  lines.push(`## ${icon} ${label} (${tests.length})`);

  for (const test of tests) {
    lines.push(`### ${escapeMarkdown(test.title)}`);

    lines.push(`| Property | Value |`);
    lines.push(`|----------|-------|`);
    lines.push(`| File | \`${test.file || "unknown"}\` |`);
    lines.push(`| History | ${test.history.map((h) => outcomeBadge(h)).join(" ")} |`);
    lines.push(`| Stability Score | ${scoreBar(test.stabilityScore)} |`);
    lines.push(`| Runs Present | ${test.runCount} |`);

    if (test.tags && test.tags.length > 0) {
      lines.push(`| Tags | ${test.tags.map((t) => `\`${t}\``).join(" ")} |`);
    }

    if (test.failureCategory && test.failureCategory !== "unknown") {
      lines.push(
        `| Failure Category | **${FAILURE_LABELS[test.failureCategory] || test.failureCategory}** |`
      );
    }

    if (test.classifiedErrors && test.classifiedErrors.length > 0) {
      lines.push(`\n<details>`);
      lines.push(`<summary>Errors (${test.classifiedErrors.length})</summary>`);
      lines.push(``);
      for (let i = 0; i < test.classifiedErrors.length; i++) {
        const err = test.classifiedErrors[i];
        const catLabel = FAILURE_LABELS[err.category] || err.category;
        lines.push(`**Error ${i + 1}** — *${catLabel}*`);
        lines.push(``);
        lines.push(`\`\`\``);
        lines.push(truncate(err.message, 500));
        if (err.stack) {
          lines.push(``);
          lines.push(truncate(err.stack, 1000));
        }
        lines.push(`\`\`\``);
        lines.push(``);
      }
      lines.push(`</details>`);
    }

    lines.push(``);
  }

  return lines.join("\n");
}

function buildStatistics(result) {
  const stats = result.statistics;
  if (!stats) return "";

  const lines = ["## Statistics"];

  if (stats.perRun && stats.perRun.length > 0) {
    lines.push(`### Per-Run Breakdown`);
    lines.push(``);
    lines.push(
      `| Run | Tests | Passed | Failed | Skipped | Flaky | Pass Rate | Duration (ms) | Retries |`
    );
    lines.push(
      `|-----|-------|--------|--------|---------|-------|-----------|---------------|---------|`
    );

    for (const run of stats.perRun) {
      lines.push(
        `| ${run.runLabel} | ${run.total} | ${run.passed} | ${run.failed} | ${run.skipped} | ${run.flaky} | ${run.passRate}% | ${run.totalDuration} | ${run.totalRetries} |`
      );
    }
    lines.push(``);
  }

  if (stats.failureCategories && stats.failureCategories.total > 0) {
    const fc = stats.failureCategories;
    lines.push(`### Failure Categories (${fc.total} total errors)`);
    lines.push(``);
    lines.push(`| Category | Count | Percentage |`);
    lines.push(`|----------|-------|------------|`);
    for (const cat of Object.keys(fc.counts)) {
      const count = fc.counts[cat];
      if (count === 0) continue;
      const pct = fc.total > 0 ? Math.round((count / fc.total) * 100) : 0;
      lines.push(`| ${FAILURE_LABELS[cat] || cat} | ${count} | ${pct}% |`);
    }
    lines.push(``);
  }

  if (stats.slowestTests && stats.slowestTests.length > 0) {
    lines.push(`### Slowest Tests (top ${Math.min(5, stats.slowestTests.length)})`);
    lines.push(``);
    lines.push(`| Test | Total Duration | Max Duration | Retries |`);
    lines.push(`|------|---------------|--------------|---------|`);
    for (const t of stats.slowestTests.slice(0, 5)) {
      lines.push(
        `| ${escapeMarkdown(t.title)} | ${t.totalDuration}ms | ${t.maxDuration}ms | ${t.retries} |`
      );
    }
    lines.push(``);
  }

  if (stats.failureFrequency && stats.failureFrequency.length > 0) {
    const top = stats.failureFrequency.filter((f) => f.failureCount > 0).slice(0, 5);
    if (top.length > 0) {
      lines.push(`### Most Frequent Failures`);
      lines.push(``);
      lines.push(`| Test | Failed Runs | Total Runs | Failure Rate |`);
      lines.push(`|------|-------------|------------|--------------|`);
      for (const f of top) {
        lines.push(
          `| ${escapeMarkdown(f.title)} | ${f.failureCount} | ${f.totalRuns} | ${f.failureRate}% |`
        );
      }
      lines.push(``);
    }
  }

  if (stats.browserStats && stats.browserStats.length > 0) {
    lines.push(`### Browser Breakdown`);
    lines.push(``);
    lines.push(`| Browser | Tests | Failures | Flaky | Fail Rate | Flaky Rate | Retries |`);
    lines.push(`|---------|-------|----------|-------|-----------|------------|---------|`);
    for (const b of stats.browserStats) {
      lines.push(
        `| ${b.browser} | ${b.totalTests} | ${b.totalFailures} | ${b.totalFlaky} | ${b.failRate}% | ${b.flakyRate}% | ${b.totalRetries} |`
      );
    }
    lines.push(``);
  }

  return lines.join("\n");
}

function buildRecommendations(result) {
  const lines = ["## Recommendations"];
  const s = result.summary;
  const recommendations = [];

  if (s.regression > 0) {
    recommendations.push(
      `- **Investigate regressions immediately.** ${s.regression} test(s) that were previously fixed are failing again. These may indicate a bad merge, reverted fix, or side-effect of a recent change.`
    );
  }

  if (s.flaky > 0) {
    const flakyTests = result.results.filter((t) => t.classification === "flaky");
    const timeoutCount = flakyTests.filter((t) => t.failureCategory === "timeout").length;

    recommendations.push(
      `- **Stabilize ${s.flaky} flaky test(s).** Flaky tests erode confidence in the test suite. Consider:`
    );
    if (timeoutCount > 0) {
      recommendations.push(
        `  - Increase timeouts or break long-running tests into smaller units (${timeoutCount} timeout-related flaky tests)`
      );
    }
    recommendations.push(
      `  - Add explicit waits instead of relying on auto-waiting where possible`
    );
    recommendations.push(`  - Ensure test data isolation — flaky tests often share mutable state`);
  }

  if (s.stable_failure > 0) {
    recommendations.push(
      `- **Fix ${s.stable_failure} consistently failing test(s).** These always fail and may indicate broken functionality, missing test data, or environment issues.`
    );
  }

  if (s.newly_failed > 0) {
    recommendations.push(
      `- **Review ${s.newly_failed} newly failing test(s).** Determine if the failure is due to intentional behavior changes or bugs introduced recently.`
    );
  }

  const recentRuns = result.results.filter(
    (t) => t.stabilityScore < 0.5 && t.classification !== "stable_pass"
  );
  if (recentRuns.length > 0) {
    recommendations.push(
      `- **${recentRuns.length} test(s) have stability scores below 0.5.** These tests change outcomes frequently and need investigation.`
    );
  }

  if (result.statistics) {
    const agg = result.statistics.aggregate;
    if (agg && agg.overallPassRate < 80) {
      recommendations.push(
        `- **Pass rate is below 80%.** The overall pass rate of ${agg.overallPassRate}% indicates systemic issues. Review the failure categories breakdown above to identify patterns.`
      );
    }

    if (result.statistics.failureCategories) {
      const fc = result.statistics.failureCategories;
      const topCat = Object.entries(fc.counts)
        .filter(([, c]) => c > 0)
        .sort((a, b) => b[1] - a[1])[0];
      if (topCat) {
        recommendations.push(
          `- **Top failure category: ${FAILURE_LABELS[topCat[0]] || topCat[0]}** with ${topCat[1]} error(s). Focus investigation on this category.`
        );
      }
    }
  }

  if (recommendations.length === 0) {
    recommendations.push(`- All tests are stable. No immediate action required. Keep monitoring.`);
  }

  lines.push(recommendations.join("\n"));
  return lines.join("\n");
}

function buildFooter(result) {
  return [
    `---`,
    `\n*Report generated by [Playwright Flaky Test Analyzer](https://github.com/shivani26singh/playwright-flaky-analyzer) v${result.analyzerVersion}*`,
  ].join("\n");
}

function outcomeBadge(outcome) {
  if (outcome === "passed") return "🟢";
  if (outcome === "failed") return "🔴";
  if (outcome === "missing") return "⚪";
  return "⚪";
}

function classificationIcon(classification) {
  if (classification === "regression") return "🔄";
  if (classification === "stable_failure") return "🔴";
  if (classification === "flaky") return "⚠️";
  if (classification === "newly_failed") return "🆕";
  if (classification === "fixed") return "✅";
  return "🟢";
}

function scoreBar(score) {
  const pct = Math.round(score * 100);
  const filled = Math.round(score * 10);
  const empty = 10 - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `${bar} ${pct}%`;
}

function escapeMarkdown(text) {
  return text.replace(/[|\\`*_{}[\]()#+\-.!<>]/g, "\\$&");
}

function truncate(text, maxLen) {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + "\n... [truncated]";
}

module.exports = { generate };
