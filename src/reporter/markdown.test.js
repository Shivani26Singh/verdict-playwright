"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { generate } = require("./markdown");

function makeResult(overrides = {}) {
  return {
    summary: {
      runsAnalyzed: 3,
      totalTests: 5,
      stable_pass: 1,
      stable_failure: 1,
      flaky: 1,
      newly_failed: 1,
      fixed: 0,
      regression: 1,
      ...overrides.summary,
    },
    results: [
      {
        id: "test-1",
        title: "Login > should show error for invalid credentials",
        file: "login.spec.js",
        tags: ["@smoke", "@login"],
        history: ["failed", "passed", "failed"],
        classification: "regression",
        lastOutcome: "failed",
        previousOutcomes: ["failed", "passed"],
        firstSeenRun: 0,
        lastSeenRun: 2,
        stabilityScore: 0.33,
        errors: [{ message: "expect(received).toBe(expected)" }],
        failureCategory: "assertion",
        classifiedErrors: [
          {
            message: "expect(received).toBe(expected)\nExpected: true\nReceived: false",
            category: "assertion",
            stack: null,
          },
        ],
        runCount: 3,
      },
      {
        id: "test-2",
        title: "Dashboard > should load metrics",
        file: "dashboard.spec.js",
        tags: [],
        history: ["failed", "failed", "failed"],
        classification: "stable_failure",
        lastOutcome: "failed",
        previousOutcomes: ["failed", "failed"],
        firstSeenRun: 0,
        lastSeenRun: 2,
        stabilityScore: 1.0,
        errors: [{ message: "Timeout 30000ms exceeded." }],
        failureCategory: "timeout",
        classifiedErrors: [
          {
            message: "Timeout 30000ms exceeded while waiting for element",
            category: "timeout",
            stack: "at Object.waitForSelector (node_modules/playwright/lib/client/page.js:123:10)",
          },
        ],
        runCount: 3,
      },
      {
        id: "test-3",
        title: "Search > returns results",
        file: "search.spec.js",
        tags: ["@search"],
        history: ["passed", "passed", "failed"],
        classification: "newly_failed",
        lastOutcome: "failed",
        previousOutcomes: ["passed", "passed"],
        firstSeenRun: 0,
        lastSeenRun: 2,
        stabilityScore: 0.33,
        errors: [
          {
            message: "Error: selector input[data-testid='search-input'] not found",
          },
        ],
        failureCategory: "locator",
        classifiedErrors: [
          {
            message: "Error: selector input[data-testid='search-input'] not found",
            category: "locator",
            stack: null,
          },
        ],
        runCount: 3,
      },
      {
        id: "test-4",
        title: "Profile > should update avatar",
        file: "profile.spec.js",
        tags: ["@profile"],
        history: ["passed", "failed", "passed"],
        classification: "flaky",
        lastOutcome: "passed",
        previousOutcomes: ["passed", "failed"],
        firstSeenRun: 0,
        lastSeenRun: 2,
        stabilityScore: 0.33,
        errors: [],
        failureCategory: "unknown",
        classifiedErrors: [],
        runCount: 3,
      },
      {
        id: "test-5",
        title: "Home > should render title",
        file: "home.spec.js",
        tags: ["@home"],
        history: ["passed", "passed", "passed"],
        classification: "stable_pass",
        lastOutcome: "passed",
        previousOutcomes: ["passed", "passed"],
        firstSeenRun: 0,
        lastSeenRun: 2,
        stabilityScore: 1.0,
        errors: [],
        failureCategory: "unknown",
        classifiedErrors: [],
        runCount: 3,
      },
      ...(overrides.results || []),
    ],
    statistics: {
      runs: 3,
      perRun: [
        {
          runIndex: 0,
          runLabel: "Run 1",
          generatedAt: "2025-08-14T10:00:00Z",
          total: 5,
          passed: 2,
          failed: 3,
          skipped: 0,
          flaky: 0,
          passRate: 40,
          failRate: 60,
          avgDuration: 250,
          minDuration: 100,
          maxDuration: 500,
          totalDuration: 1250,
          totalRetries: 1,
          avgRetries: 0.2,
        },
        {
          runIndex: 1,
          runLabel: "Run 2",
          generatedAt: "2025-08-15T10:00:00Z",
          total: 5,
          passed: 3,
          failed: 2,
          skipped: 0,
          flaky: 0,
          passRate: 60,
          failRate: 40,
          avgDuration: 200,
          minDuration: 80,
          maxDuration: 450,
          totalDuration: 1000,
          totalRetries: 0,
          avgRetries: 0,
        },
        {
          runIndex: 2,
          runLabel: "Run 3",
          generatedAt: "2025-08-16T10:00:00Z",
          total: 5,
          passed: 1,
          failed: 4,
          skipped: 0,
          flaky: 0,
          passRate: 20,
          failRate: 80,
          avgDuration: 300,
          minDuration: 120,
          maxDuration: 600,
          totalDuration: 1500,
          totalRetries: 2,
          avgRetries: 0.4,
        },
      ],
      aggregate: {
        totalTests: 15,
        totalPassed: 6,
        totalFailed: 9,
        totalSkipped: 0,
        totalFlaky: 0,
        overallPassRate: 40,
        overallFailRate: 60,
        avgDurationAcrossRuns: 250,
        avgRetriesAcrossRuns: 0.2,
        bestRunPassRate: 60,
        worstRunPassRate: 20,
      },
      slowestTests: [
        {
          title: "Login > should show error for invalid credentials",
          totalDuration: 5000,
          maxDuration: 3000,
          retries: 2,
        },
        {
          title: "Dashboard > should load metrics",
          totalDuration: 3200,
          maxDuration: 2000,
          retries: 1,
        },
      ],
      failureFrequency: [
        {
          title: "Dashboard > should load metrics",
          failureCount: 3,
          totalRuns: 3,
          failureRate: 100,
        },
        {
          title: "Login > should show error for invalid credentials",
          failureCount: 2,
          totalRuns: 3,
          failureRate: 66.67,
        },
        { title: "Search > returns results", failureCount: 1, totalRuns: 3, failureRate: 33.33 },
      ],
      failureCategories: {
        total: 5,
        counts: {
          timeout: 2,
          locator: 1,
          assertion: 1,
          network: 1,
          authentication: 0,
          environment: 0,
          data: 0,
          unknown: 0,
        },
        errors: [],
      },
      browserStats: [
        {
          browser: "chromium",
          totalTests: 10,
          totalFailures: 6,
          totalFlaky: 1,
          totalRetries: 3,
          failRate: 60,
          flakyRate: 10,
        },
        {
          browser: "firefox",
          totalTests: 5,
          totalFailures: 3,
          totalFlaky: 0,
          totalRetries: 1,
          failRate: 60,
          flakyRate: 0,
        },
      ],
      schemaVersion: "1.0.0",
    },
    runs: [
      {
        generatedAt: "2025-08-14T10:00:00Z",
        framework: "playwright",
        configFile: "playwright.config.js",
        durationMs: 60000,
        totalTests: 5,
      },
      {
        generatedAt: "2025-08-15T10:00:00Z",
        framework: "playwright",
        configFile: "playwright.config.js",
        durationMs: 55000,
        totalTests: 5,
      },
      {
        generatedAt: "2025-08-16T10:00:00Z",
        framework: "playwright",
        configFile: "playwright.config.js",
        durationMs: 65000,
        totalTests: 5,
      },
    ],
    schemaVersion: "1.0.0",
    analyzerVersion: "1.0.0",
    ...overrides,
  };
}

describe("markdown — generate", () => {
  it("produces a non-empty markdown string", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(typeof md === "string");
    assert.ok(md.length > 100);
  });

  it("includes the header with title", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.startsWith("# Playwright Flaky Test Analysis"));
  });

  it("includes the analyzer version", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("**Analyzer Version:** 1.0.0"));
  });

  it("includes executive summary", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("## Executive Summary"));
    assert.ok(md.includes("Runs Analyzed"));
    assert.ok(md.includes("| 3 |"));
  });

  it("includes test health percentage", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("**Test Health**"));
    assert.ok(md.includes("20%"));
  });

  it("includes regression section with test details", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("## 🔄 Regression ("));
    assert.ok(md.includes("should show error for invalid credentials"));
  });

  it("includes stable failure section", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("## 🔴 Stable Failure ("));
    assert.ok(md.includes("should load metrics"));
  });

  it("includes flaky section", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("## ⚠️ Flaky ("));
    assert.ok(md.includes("should update avatar"));
  });

  it("includes newly_failed section", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("## 🆕 New Failure ("));
    assert.ok(md.includes("returns results"));
  });

  it("does not include stable_pass section", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(!md.includes("## 🟢 Stable Pass"));
  });

  it("includes history with visual badges", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("🔴"));
    assert.ok(md.includes("🟢"));
  });

  it("includes stability score bar", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("Stability Score"));
    assert.ok(md.includes("100%") || md.includes("33%"));
  });

  it("includes failure category labels", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("**Assertion**"));
    assert.ok(md.includes("**Timeout**"));
    assert.ok(md.includes("**Locator**"));
  });

  it("includes classified errors in collapsible sections", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("<details>"));
    assert.ok(md.includes("<summary>Errors ("));
    assert.ok(md.includes("</details>"));
  });

  it("includes statistics summary header", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("## Statistics"));
  });

  it("includes per-run breakdown table", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("### Per-Run Breakdown"));
    assert.ok(md.includes("| Run | Tests | Passed | Failed"));
    assert.ok(md.includes("Run 1"));
    assert.ok(md.includes("Run 3"));
  });

  it("includes failure categories breakdown", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("### Failure Categories"));
    assert.ok(md.includes("Timeout | 2"));
    assert.ok(md.includes("Locator | 1"));
    assert.ok(md.includes("Network | 1"));
    assert.ok(md.includes("Assertion | 1"));
  });

  it("hides categories with zero count", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(!md.includes("Authentication | 0"));
    assert.ok(!md.includes("Environment | 0"));
  });

  it("includes slowest tests table", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("### Slowest Tests"));
    assert.ok(md.includes("5000ms"));
    assert.ok(md.includes("3200ms"));
  });

  it("includes most frequent failures", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("### Most Frequent Failures"));
    assert.ok(md.includes("should load metrics"));
    assert.ok(md.includes("100%"));
  });

  it("includes browser breakdown", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("### Browser Breakdown"));
    assert.ok(md.includes("chromium"));
    assert.ok(md.includes("firefox"));
  });

  it("includes recommendations section", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("## Recommendations"));
    assert.ok(md.includes("regression"));
    assert.ok(md.includes("flaky"));
  });

  it("includes footer with version", () => {
    const result = makeResult();
    const md = generate(result);
    assert.ok(md.includes("playwright-flaky-analyzer"));
    assert.ok(md.includes("v1.0.0"));
  });
});

describe("markdown — all stable", () => {
  it("shows positive recommendation when all tests pass", () => {
    const result = makeResult({
      summary: {
        runsAnalyzed: 2,
        totalTests: 2,
        stable_pass: 2,
        stable_failure: 0,
        flaky: 0,
        newly_failed: 0,
        fixed: 0,
        regression: 0,
      },
      results: [
        {
          id: "a",
          title: "test a",
          file: "a.spec.js",
          tags: [],
          history: ["passed", "passed"],
          classification: "stable_pass",
          lastOutcome: "passed",
          previousOutcomes: ["passed"],
          firstSeenRun: 0,
          lastSeenRun: 1,
          stabilityScore: 1.0,
          errors: [],
          failureCategory: "unknown",
          classifiedErrors: [],
          runCount: 2,
        },
        {
          id: "b",
          title: "test b",
          file: "b.spec.js",
          tags: [],
          history: ["passed", "passed"],
          classification: "stable_pass",
          lastOutcome: "passed",
          previousOutcomes: ["passed"],
          firstSeenRun: 0,
          lastSeenRun: 1,
          stabilityScore: 1.0,
          errors: [],
          failureCategory: "unknown",
          classifiedErrors: [],
          runCount: 2,
        },
      ],
      statistics: {
        runs: 2,
        perRun: [],
        aggregate: {
          totalTests: 4,
          totalPassed: 4,
          totalFailed: 0,
          totalSkipped: 0,
          totalFlaky: 0,
          overallPassRate: 100,
          overallFailRate: 0,
          avgDurationAcrossRuns: 100,
          avgRetriesAcrossRuns: 0,
          bestRunPassRate: 100,
          worstRunPassRate: 100,
        },
        slowestTests: [],
        failureFrequency: [],
        failureCategories: {
          total: 0,
          counts: {
            timeout: 0,
            locator: 0,
            assertion: 0,
            network: 0,
            authentication: 0,
            environment: 0,
            data: 0,
            unknown: 0,
          },
          errors: [],
        },
        browserStats: [],
        schemaVersion: "1.0.0",
      },
    });

    const md = generate(result);
    assert.ok(md.includes("## Recommendations"));
    assert.ok(md.includes("All tests are stable"));
    assert.ok(md.includes("100%"));
  });
});

describe("markdown — edge cases", () => {
  it("handles missing statistics", () => {
    const result = makeResult();
    delete result.statistics;

    const md = generate(result);
    assert.ok(typeof md === "string");
    assert.ok(md.length > 50);
  });

  it("handles missing aggregate in statistics", () => {
    const result = makeResult();
    result.statistics.aggregate = null;

    const md = generate(result);
    assert.ok(typeof md === "string");
  });

  it("handles empty results array", () => {
    const result = makeResult({
      summary: {
        runsAnalyzed: 2,
        totalTests: 0,
        stable_pass: 0,
        stable_failure: 0,
        flaky: 0,
        newly_failed: 0,
        fixed: 0,
        regression: 0,
      },
      results: [],
    });

    const md = generate(result);
    assert.ok(md.includes("100%"));
  });

  it("handles empty slowest tests", () => {
    const result = makeResult();
    result.statistics.slowestTests = [];

    const md = generate(result);
    assert.ok(!md.includes("### Slowest Tests"));
  });

  it("handles empty failure frequency", () => {
    const result = makeResult();
    result.statistics.failureFrequency = [];

    const md = generate(result);
    assert.ok(!md.includes("### Most Frequent Failures"));
  });

  it("handles empty failure categories", () => {
    const result = makeResult();
    result.statistics.failureCategories = {
      total: 0,
      counts: {
        timeout: 0,
        locator: 0,
        assertion: 0,
        network: 0,
        authentication: 0,
        environment: 0,
        data: 0,
        unknown: 0,
      },
    };

    const md = generate(result);
    assert.ok(!md.includes("### Failure Categories"));
  });

  it("handles empty browser stats", () => {
    const result = makeResult();
    result.statistics.browserStats = [];

    const md = generate(result);
    assert.ok(!md.includes("### Browser Breakdown"));
  });

  it("handles test with no file property", () => {
    const result = makeResult();
    result.results[0].file = null;

    const md = generate(result);
    assert.ok(md.includes("unknown"));
  });

  it("handles special characters in test titles", () => {
    const result = makeResult({
      summary: {
        runsAnalyzed: 2,
        totalTests: 1,
        stable_pass: 0,
        stable_failure: 1,
        flaky: 0,
        newly_failed: 0,
        fixed: 0,
        regression: 0,
      },
      results: [
        {
          id: "x",
          title: "Test with | pipe * asterisk [brackets]",
          file: "x.spec.js",
          tags: [],
          history: ["failed", "failed"],
          classification: "stable_failure",
          lastOutcome: "failed",
          previousOutcomes: ["failed"],
          firstSeenRun: 0,
          lastSeenRun: 1,
          stabilityScore: 1.0,
          errors: [],
          failureCategory: "unknown",
          classifiedErrors: [],
          runCount: 2,
        },
      ],
    });

    const md = generate(result);
    assert.ok(md.includes("\\|"));
    assert.ok(md.includes("\\["));
  });
});

describe("markdown — flaky tests trend (within-analysis, cross-run classification via result.flakyTrend)", () => {
  it("renders the Flaky Tests Trend section with a table and interpretation from result.flakyTrend — no --history-file", () => {
    const result = makeResult();
    result.flakyTrend = [
      { runLabel: "Run 1", flaky: 5 },
      { runLabel: "Run 2", flaky: 8 },
      { runLabel: "Run 3", flaky: 6 },
      { runLabel: "Run 4", flaky: 12 },
    ];
    const md = generate(result);
    assert.ok(md.includes("## Flaky Tests Trend"));
    assert.ok(md.includes("| Flaky Count |"));
    assert.ok(md.includes("| Run 4 | 12 |"));
    assert.ok(md.includes("Flaky tests increased from 5 to 12 across the 4 analyzed runs."));
    assert.ok(!md.includes("Reliability Score"));
  });

  it("shows a 'Trend requires multiple analyzed runs.' message with fewer than 2 analyzed runs", () => {
    const result = makeResult();
    result.flakyTrend = [{ runLabel: "Run 1", flaky: 5 }];
    const md = generate(result);
    assert.ok(md.includes("## Flaky Tests Trend"));
    assert.ok(md.includes("Trend requires multiple analyzed runs."));
  });

  it("shows all N analyzed runs, not a fixed count (8 runs available => 8 rows)", () => {
    const result = makeResult();
    result.flakyTrend = Array.from({ length: 8 }, (_, i) => ({
      runLabel: `Run ${i + 1}`,
      flaky: i + 1,
    }));
    const md = generate(result);
    const rows = md.split("\n").filter((l) => /^\| Run \d+ \| \d+ \|$/.test(l));
    assert.equal(rows.length, 8);
    assert.ok(md.includes("Flaky tests increased from 1 to 8 across the 8 analyzed runs."));
  });

  it("describes a decreasing flaky trend correctly, first vs last analyzed run", () => {
    const result = makeResult();
    result.flakyTrend = [
      { runLabel: "Run 1", flaky: 12 },
      { runLabel: "Run 2", flaky: 3 },
    ];
    const md = generate(result);
    assert.ok(md.includes("Flaky tests decreased from 12 to 3 across the 2 analyzed runs."));
  });

  it("describes a stable flaky trend correctly", () => {
    const result = makeResult();
    result.flakyTrend = [
      { runLabel: "Run 1", flaky: 4 },
      { runLabel: "Run 2", flaky: 4 },
    ];
    const md = generate(result);
    assert.ok(md.includes("Flaky test count remained relatively stable across the 2 analyzed runs."));
  });

  it("omits the section entirely when flakyTrend is absent", () => {
    const result = makeResult();
    delete result.flakyTrend;
    const md = generate(result);
    assert.ok(!md.includes("## Flaky Tests Trend"));
  });

  it("does not fall back to statistics.perRun's in-run flaky signal when flakyTrend is absent", () => {
    const result = makeResult();
    delete result.flakyTrend;
    // statistics.perRun still has its own unrelated "Flaky" column in the
    // separate Per-Run Breakdown table (buildStatistics) — untouched by this
    // fix — so the assertion is scoped to the Flaky Tests Trend section only,
    // not to every occurrence of a number in the whole document.
    result.statistics.perRun = result.statistics.perRun.map((r) => ({ ...r, flaky: 99 }));
    const md = generate(result);
    assert.ok(!md.includes("## Flaky Tests Trend"));
  });

  it("never mentions Reliability Score or --history-file anywhere in generated Markdown", () => {
    const result = makeResult();
    result.flakyTrend = [
      { runLabel: "Run 1", flaky: 2 },
      { runLabel: "Run 2", flaky: 2 },
    ];
    const md = generate(result);
    assert.ok(!md.includes("Reliability Score"));
    assert.ok(!md.includes("reliabilityScore"));
    assert.ok(!md.includes("history-file"));
  });
});
