"use strict";

function generate(result) {
  return {
    analysisMd: buildAnalysisMd(result),
    promptsMd: buildPromptsMd(result),
  };
}

/**
 * "Problematic" means actually needs attention right now — NOT simply
 * "classification isn't stable_pass". Two things `!== "stable_pass"` alone
 * gets wrong, matching the same rules dashboard-json.js/engine.js already
 * apply elsewhere:
 *   - "fixed" tests are currently PASSING (they just needed a run to recover
 *     in) — counting them as problematic overstates how much is broken.
 *   - A test whose actual latest-run outcome is "skipped" didn't run this
 *     time; classify() can still report a stale classification for it by
 *     looking past the skip to an older signal, but it isn't a live problem
 *     right now and is already tracked separately as skipped.
 */
function isProblematic(t) {
  return (
    t.classification !== "stable_pass" &&
    t.classification !== "fixed" &&
    t.lastOutcome !== "skipped"
  );
}

function buildAnalysisMd(result) {
  const s = result.summary;
  const problematic = result.results.filter(isProblematic);

  const sections = [
    `# Flaky Test Analysis — Workspace Context`,
    ``,
    `> This file provides structured context for an AI coding assistant (GitHub Copilot, Claude Code, Gemini, or similar). Keep it open as workspace context when investigating test failures.`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Runs Analyzed | ${s.runsAnalyzed} |`,
    `| Total Tests | ${s.totalTests} |`,
    `| Stable Pass | ${s.stable_pass} |`,
    `| Stable Failure | ${s.stable_failure} |`,
    `| Flaky | ${s.flaky} |`,
    `| Newly Failed | ${s.newly_failed} |`,
    `| Fixed | ${s.fixed} |`,
    `| Regression | ${s.regression} |`,
  ];

  if (result.statistics && result.statistics.aggregate) {
    const a = result.statistics.aggregate;
    sections.push(
      `| Overall Pass Rate | ${a.overallPassRate}% |`,
      `| Overall Fail Rate | ${a.overallFailRate}% |`,
      `| Best Run Pass Rate | ${a.bestRunPassRate}% |`,
      `| Worst Run Pass Rate | ${a.worstRunPassRate}% |`
    );
  }

  sections.push(``);

  if (problematic.length === 0) {
    sections.push(`## All Tests Stable`, ``);
    sections.push(
      `All ${s.totalTests} tests pass consistently across all runs. No issues to investigate.`
    );
    return sections.join("\n");
  }

  for (const test of problematic) {
    sections.push(buildTestContext(test, result.statistics));
  }

  if (result.statistics) {
    sections.push(buildStatsContext(result.statistics));
  }

  return sections.join("\n");
}

function buildTestContext(test, stats) {
  const lines = [];

  const badge =
    test.classification === "regression"
      ? "REGRESSION"
      : test.classification === "stable_failure"
        ? "STABLE FAILURE"
        : test.classification === "flaky"
          ? "FLAKY"
          : test.classification === "newly_failed"
            ? "NEW FAILURE"
            : test.classification === "fixed"
              ? "FIXED"
              : test.classification.toUpperCase();

  lines.push(`## [${badge}] ${test.title}`);
  lines.push(``);
  lines.push(`- **File:** \`${test.file || "unknown"}\``);
  lines.push(
    `- **History:** ${test.history.map((h) => outcomeLabel(h)).join(" → ")} (${test.runCount} runs)`
  );
  lines.push(`- **Stability Score:** ${Math.round(test.stabilityScore * 100)}%`);
  lines.push(`- **Last Outcome:** ${outcomeLabel(test.lastOutcome)}`);
  lines.push(``);

  if (test.tags && test.tags.length > 0) {
    lines.push(`**Tags:** ${test.tags.join(", ")}`);
    lines.push(``);
  }

  if (test.failureCategory && test.failureCategory !== "unknown") {
    lines.push(`**Failure Category:** ${test.failureCategory}`);
    lines.push(``);
  }

  if (stats && stats.failureFrequency) {
    const freq = stats.failureFrequency.find((f) => f.title === test.title);
    if (freq) {
      lines.push(
        `**Failure Frequency:** ${freq.failureCount}/${freq.totalRuns} runs (${freq.failureRate}%)`
      );
      lines.push(``);
    }
  }

  if (test.classifiedErrors && test.classifiedErrors.length > 0) {
    lines.push(`### Errors`);
    lines.push(``);

    for (let i = 0; i < test.classifiedErrors.length; i++) {
      const err = test.classifiedErrors[i];
      lines.push(`**Error ${i + 1}** — ${err.category || "unknown"}`);
      lines.push(``);
      lines.push(`\`\`\``);
      lines.push(err.message || "(no message)");
      if (err.stack) {
        lines.push(``);
        lines.push(err.stack);
      }
      lines.push(`\`\`\``);
      lines.push(``);
    }
  } else if (test.errors && test.errors.length > 0) {
    lines.push(`### Errors`);
    lines.push(``);

    for (let i = 0; i < test.errors.length; i++) {
      const err = test.errors[i];
      lines.push(`**Error ${i + 1}**`);
      lines.push(``);
      lines.push(`\`\`\``);
      lines.push(typeof err === "string" ? err : err.message || "(no message)");
      if (typeof err === "object" && err.stack) {
        lines.push(``);
        lines.push(err.stack);
      }
      lines.push(`\`\`\``);
      lines.push(``);
    }
  }

  lines.push(`---`);
  lines.push(``);

  return lines.join("\n");
}

function buildStatsContext(stats) {
  const lines = [];

  lines.push(`## Statistics`);
  lines.push(``);

  if (stats.slowestTests && stats.slowestTests.length > 0) {
    lines.push(`### Slowest Tests`);
    lines.push(``);
    for (const t of stats.slowestTests.slice(0, 5)) {
      lines.push(
        `- **${t.title}**: ${t.totalDuration}ms total, ${t.maxDuration}ms max, ${t.retries} retries`
      );
    }
    lines.push(``);
  }

  if (stats.failureCategories && stats.failureCategories.total > 0) {
    lines.push(`### Failure Categories`);
    lines.push(``);
    const fc = stats.failureCategories;
    for (const cat of Object.keys(fc.counts).sort((a, b) => fc.counts[b] - fc.counts[a])) {
      if (fc.counts[cat] === 0) continue;
      lines.push(`- **${cat}**: ${fc.counts[cat]} error(s)`);
    }
    lines.push(``);
  }

  if (stats.browserStats && stats.browserStats.length > 0) {
    lines.push(`### Browser Breakdown`);
    lines.push(``);
    for (const b of stats.browserStats) {
      lines.push(
        `- **${b.browser}**: ${b.totalTests} tests, ${b.failRate}% fail rate, ${b.flakyRate}% flaky`
      );
    }
    lines.push(``);
  }

  return lines.join("\n");
}

function buildPromptsMd(result) {
  const s = result.summary;
  const problematic = result.results.filter(isProblematic);

  const regressions = problematic.filter((t) => t.classification === "regression");
  const stableFailures = problematic.filter((t) => t.classification === "stable_failure");
  const flakyTests = problematic.filter((t) => t.classification === "flaky");
  const newFailures = problematic.filter((t) => t.classification === "newly_failed");

  const sections = [
    `# AI Assistant Prompts — Flaky Test Investigation`,
    ``,
    `> Copy-paste these prompts into your AI coding assistant of choice (GitHub Copilot, Claude Code, Gemini, or similar) — chat mode, agent mode, or as workspace instructions.`,
    `> For best results, open \`analysis.md\` as workspace context first, then use the prompts below.`,
    ``,
    `---`,
    ``,
    `## Chat Prompts`,
    ``,
    `Use these in your assistant's chat panel after opening \`analysis.md\` as context.`,
    ``,
  ];

  if (problematic.length > 0) {
    sections.push(
      `### General Investigation`,
      ``,
      `\`\`\``,
      `I have a Playwright test suite with ${problematic.length} problematic test(s) across ${s.runsAnalyzed} runs. The analysis.md file in this workspace has the full context. Please help me understand the root causes and suggest fixes.`,
      `\`\`\``,
      ``
    );
  }

  if (regressions.length > 0) {
    sections.push(`### Regression Investigation`, ``);
    for (const test of regressions) {
      sections.push(
        `\`\`\``,
        `The test "${test.title}" in \`${test.file}\` is a regression — it was fixed then broke again. History: ${test.history.map(outcomeLabel).join(" → ")}. What could have caused this to regress, and how should I fix it?`,
        `\`\`\``,
        ``
      );
    }
  }

  if (stableFailures.length > 0) {
    sections.push(`### Stable Failure Investigation`, ``);
    for (const test of stableFailures) {
      sections.push(
        `\`\`\``,
        `The test "${test.title}" in \`${test.file}\` fails consistently — ${test.history.filter((h) => h === "failed").length}/${test.history.length} runs. Why is this test always failing, and what changes are needed to fix it?`,
        `\`\`\``,
        ``
      );
    }
  }

  if (flakyTests.length > 0) {
    sections.push(`### Flaky Test Investigation`, ``);
    for (const test of flakyTests) {
      const failCategory =
        test.failureCategory && test.failureCategory !== "unknown" ? test.failureCategory : null;
      sections.push(
        `\`\`\``,
        `The test "${test.title}" in \`${test.file}\` is flaky — it passes and fails intermittently. History: ${test.history.map(outcomeLabel).join(" → ")}. Stability score: ${Math.round(test.stabilityScore * 100)}%.${failCategory ? ` Failure category: ${failCategory}.` : ""} How can I stabilize this test?`,
        `\`\`\``,
        ``
      );
    }
  }

  if (newFailures.length > 0) {
    sections.push(`### New Failure Investigation`, ``);
    for (const test of newFailures) {
      sections.push(
        `\`\`\``,
        `The test "${test.title}" in \`${test.file}\` is newly failing — it was passing before but failed in the latest run. History: ${test.history.map(outcomeLabel).join(" → ")}. What changed that could have caused this, and how should I fix it?`,
        `\`\`\``,
        ``
      );
    }
  }

  sections.push(
    `---`,
    ``,
    `## Agent Mode Prompts`,
    ``,
    `Use these in your assistant's autonomous agent mode for hands-off investigation and fixes. Agent mode can read files, run commands, and make edits.`,
    ``
  );

  if (problematic.length > 0) {
    sections.push(
      `### Full Investigation & Fix`,
      ``,
      `\`\`\``,
      `Using the flaky test analysis in analysis.md, investigate all ${problematic.length} problematic tests. For each one:`,
      `1. Read the test file and understand what it does`,
      `2. Identify the root cause from the error message and stack trace`,
      `3. Propose a fix — update the test code, add waits, fix selectors, or adjust assertions`,
      `4. Explain your reasoning for each change`,
      ``
    );

    if (result.statistics && result.statistics.failureCategories) {
      const fc = result.statistics.failureCategories;
      const topCat = Object.entries(fc.counts)
        .filter(([, c]) => c > 0)
        .sort((a, b) => b[1] - a[1])[0];
      if (topCat) {
        sections.push(
          `Focus especially on ${topCat[0]}-related failures (${topCat[1]} errors) as that is the most common failure category.`
        );
      }
      sections.push(``);
    }

    sections.push(`\`\`\``, ``);
  }

  if (regressions.length > 0) {
    sections.push(
      `### Git Bisect for Regressions`,
      ``,
      `\`\`\``,
      `I have ${regressions.length} regression(s) — tests that were fixed and then broke again. The tests are:`,
      `${regressions.map((t) => `- ${t.title} (\`${t.file}\`)`).join("\n")}`,
      ``,
      `Look at recent git changes that might have caused these regressions. Check for:`,
      `- Reverted fixes`,
      `- Merge conflicts resolved incorrectly`,
      `- Side-effects from unrelated changes`,
      `- Shared fixtures or setup code that changed`,
      `\`\`\``,
      ``
    );
  }

  sections.push(
    `### Batch Fix by Category`,
    ``,
    `\`\`\``,
    `Group all problematic tests by failure category and fix them in batches:`,
    `- Timeout errors: Increase timeouts or break into smaller tests`,
    `- Locator errors: Fix selectors, add proper waiting strategies`,
    `- Assertion errors: Correct expected values or investigate why expectations changed`,
    `- Network errors: Add retry logic, check API stability`,
    `- Authentication errors: Fix login flow or token management`,
    `- Environment errors: Check CI configuration, env vars, and infrastructure`,
    `- Data errors: Fix test data setup and teardown`,
    ``,
    `Make the fixes and run the tests to verify.`,
    `\`\`\``,
    ``
  );

  sections.push(
    `---`,
    ``,
    `## Workspace Prompts`,
    ``,
    `Use these as workspace-level instructions for your AI assistant (e.g. \`.github/copilot-instructions.md\`, \`CLAUDE.md\`, \`GEMINI.md\`, or your assistant's equivalent project configuration).`,
    ``
  );

  sections.push(
    `### Test Stability Rules`,
    ``,
    `\`\`\``,
    `When working on Playwright tests in this project, follow these rules:`,
    ``,
    `1. Never hardcode waitForTimeout — use proper waitForSelector, waitForResponse, or waitForNavigation`,
    `2. Every locator must use data-testid attributes when available`,
    `3. Tests must be isolated — each test sets up its own data and cleans up after`,
    `4. Avoid depending on test execution order — use beforeEach hooks for shared setup`,
    `5. Network-dependent tests must handle timeouts gracefully with retry logic`,
    `6. Run all tests 3 times before merging to catch flakiness early`,
    `7. Tag flaky tests with @flaky and document the known failure pattern`,
    `8. When fixing a flaky test, add a comment explaining the fix and link to the issue`,
    `\`\`\``,
    ``
  );

  sections.push(
    `### Flaky Test Triage Workflow`,
    ``,
    `\`\`\``,
    `When a test fails in CI, follow this triage workflow:`,
    ``,
    `1. Check flaky-analysis.md for historical context`,
    `2. If the test is classified as a regression — investigate recent merges first`,
    `3. If the test is classified as flaky — re-run 3x to confirm, then tag @flaky`,
    `4. If the test is newly failing — check the diff of the most recent change`,
    `5. Classify the error: timeout, locator, assertion, network, auth, env, or data`,
    `6. Apply the fix based on the failure category (see Batch Fix by Category above)`,
    `7. Re-run the full suite 3x to verify the fix`,
    `8. Update the flaky analysis by running \`npm start\``,
    `\`\`\``,
    ``
  );

  return sections.join("\n");
}

function outcomeLabel(outcome) {
  if (outcome === "passed") return "PASS";
  if (outcome === "failed") return "FAIL";
  if (outcome === "missing") return "MISSING";
  return outcome.toUpperCase();
}

module.exports = { generate };
