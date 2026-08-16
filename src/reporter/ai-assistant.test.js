"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { generate } = require("./ai-assistant");

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
            stack: "at test/login.spec.js:28:30",
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
            message: "Timeout 30000ms exceeded",
            category: "timeout",
            stack: "at page.waitForSelector (page.js:123:10)",
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
        errors: [{ message: "selector not found" }],
        failureCategory: "locator",
        classifiedErrors: [
          {
            message: "selector input[data-testid='search-input'] not found",
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
        {
          title: "Profile > should update avatar",
          failureCount: 1,
          totalRuns: 3,
          failureRate: 33.33,
        },
      ],
      failureCategories: {
        total: 4,
        counts: {
          timeout: 1,
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
    runs: [],
    schemaVersion: "1.0.0",
    analyzerVersion: "1.0.0",
    ...overrides,
  };
}

describe("ai-assistant — generate", () => {
  it("returns an object with analysisMd and promptsMd", () => {
    const result = makeResult();
    const output = generate(result);
    assert.ok(typeof output === "object");
    assert.ok(typeof output.analysisMd === "string");
    assert.ok(typeof output.promptsMd === "string");
  });

  it("analysis.md starts with workspace context header", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.startsWith("# Flaky Test Analysis"));
  });

  it("includes summary table in analysis.md", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.includes("Runs Analyzed"));
    assert.ok(output.analysisMd.includes("Stable Pass"));
    assert.ok(output.analysisMd.includes("Regression"));
  });

  it("includes overall pass/fail rates when statistics exist", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.includes("Overall Pass Rate"));
    assert.ok(output.analysisMd.includes("40%"));
    assert.ok(output.analysisMd.includes("Overall Fail Rate"));
    assert.ok(output.analysisMd.includes("60%"));
  });

  it("omits overall rates when statistics are missing", () => {
    const result = makeResult();
    delete result.statistics;
    const output = generate(result);
    assert.ok(!output.analysisMd.includes("Overall Pass Rate"));
  });

  it("includes regression test context with badge", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.includes("[REGRESSION]"));
    assert.ok(output.analysisMd.includes("should show error for invalid credentials"));
    assert.ok(output.analysisMd.includes("login.spec.js"));
    assert.ok(output.analysisMd.includes("FAIL → PASS → FAIL"));
  });

  it("includes stable failure test context", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.includes("[STABLE FAILURE]"));
    assert.ok(output.analysisMd.includes("should load metrics"));
    assert.ok(output.analysisMd.includes("Timeout"));
  });

  it("includes newly failed test context", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.includes("[NEW FAILURE]"));
    assert.ok(output.analysisMd.includes("returns results"));
  });

  it("includes flaky test context", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.includes("[FLAKY]"));
    assert.ok(output.analysisMd.includes("should update avatar"));
  });

  it("excludes stable_pass tests from analysis context", () => {
    const output = generate(makeResult());
    assert.ok(!output.analysisMd.includes("should render title"));
  });

  it("includes stability score in each test section", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.includes("Stability Score"));
    assert.ok(output.analysisMd.includes("100%"));
    assert.ok(output.analysisMd.includes("33%"));
  });

  it("includes failure category in test sections", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.includes("**Failure Category:** assertion"));
    assert.ok(output.analysisMd.includes("**Failure Category:** timeout"));
    assert.ok(output.analysisMd.includes("**Failure Category:** locator"));
  });

  it("includes classified errors with message and stack", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.includes("expect(received).toBe(expected)"));
    assert.ok(output.analysisMd.includes("test/login.spec.js:28:30"));
  });

  it("includes statistics context with slowest tests", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.includes("## Statistics"));
    assert.ok(output.analysisMd.includes("Slowest Tests"));
    assert.ok(output.analysisMd.includes("5000ms"));
  });

  it("includes failure categories in statistics", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.includes("Failure Categories"));
    assert.ok(output.analysisMd.includes("timeout"));
    assert.ok(output.analysisMd.includes("locator"));
    assert.ok(output.analysisMd.includes("network"));
    assert.ok(output.analysisMd.includes("assertion"));
  });

  it("hides zero-count failure categories", () => {
    const output = generate(makeResult());
    assert.ok(!output.analysisMd.includes("authentication: 0"));
  });

  it("includes browser breakdown", () => {
    const output = generate(makeResult());
    assert.ok(output.analysisMd.includes("Browser Breakdown"));
    assert.ok(output.analysisMd.includes("chromium"));
    assert.ok(output.analysisMd.includes("firefox"));
  });

  it("AI_PROMPTS.md starts with header", () => {
    const output = generate(makeResult());
    assert.ok(output.promptsMd.startsWith("# AI Assistant Prompts"));
  });

  it("includes Chat Prompts section", () => {
    const output = generate(makeResult());
    assert.ok(output.promptsMd.includes("## Chat Prompts"));
    assert.ok(output.promptsMd.includes("General Investigation"));
  });

  it("excludes 'fixed' tests and skip-latest tests from the problematic-test count", () => {
    // "fixed" tests are currently PASSING — counting them toward "N
    // problematic test(s)" overstates how much is actually broken. A test
    // whose real latest-run outcome is "skipped" isn't a live problem either
    // (see engine.js/dashboard-json.js, which already apply this same rule).
    const res = makeResult();
    res.results.push(
      {
        id: "fixed-1",
        title: "Fixed test",
        file: "x.spec.js",
        tags: [],
        history: ["failed", "passed", "passed"],
        classification: "fixed",
        lastOutcome: "passed",
        stabilityScore: 1,
        errors: [],
        failureCategory: "unknown",
        runCount: 3,
      },
      {
        id: "skip-latest-1",
        title: "Skip-latest test",
        file: "x.spec.js",
        tags: [],
        history: ["failed", "skipped", "skipped"],
        classification: "newly_failed",
        lastOutcome: "skipped",
        stabilityScore: 0,
        errors: [],
        failureCategory: "unknown",
        runCount: 3,
      }
    );
    const output = generate(res);
    // Base fixture has 3 problematic (regression, stable_failure, flaky,
    // newly_failed — 4 entries per makeResult's default results array minus
    // stable_pass) — assert neither of the two newly-added tests inflate it.
    assert.ok(!output.promptsMd.includes("Fixed test"));
    assert.ok(!output.promptsMd.includes("Skip-latest test"));
    assert.ok(!output.analysisMd.includes("[FIXED] Fixed test"));
    assert.ok(!output.analysisMd.includes("Skip-latest test"));
  });

  it("includes regression-specific chat prompts", () => {
    const output = generate(makeResult());
    assert.ok(output.promptsMd.includes("Regression Investigation"));
    assert.ok(output.promptsMd.includes("was fixed then broke again"));
  });

  it("includes stable failure chat prompts", () => {
    const output = generate(makeResult());
    assert.ok(output.promptsMd.includes("Stable Failure Investigation"));
    assert.ok(output.promptsMd.includes("fails consistently"));
  });

  it("includes flaky test chat prompts", () => {
    const output = generate(makeResult());
    assert.ok(output.promptsMd.includes("Flaky Test Investigation"));
    assert.ok(output.promptsMd.includes("passes and fails intermittently"));
    assert.ok(output.promptsMd.includes("Stability score: 33%"));
  });

  it("includes new failure chat prompts", () => {
    const output = generate(makeResult());
    assert.ok(output.promptsMd.includes("New Failure Investigation"));
    assert.ok(output.promptsMd.includes("was passing before but failed"));
  });

  it("includes Agent Mode section", () => {
    const output = generate(makeResult());
    assert.ok(output.promptsMd.includes("## Agent Mode Prompts"));
    assert.ok(output.promptsMd.includes("Full Investigation & Fix"));
    assert.ok(output.promptsMd.includes("Batch Fix by Category"));
  });

  it("includes Git Bisect prompt when regressions exist", () => {
    const output = generate(makeResult());
    assert.ok(output.promptsMd.includes("Git Bisect for Regressions"));
  });

  it("includes Workspace Prompts section", () => {
    const output = generate(makeResult());
    assert.ok(output.promptsMd.includes("## Workspace Prompts"));
    assert.ok(output.promptsMd.includes("Test Stability Rules"));
    assert.ok(output.promptsMd.includes("Flaky Test Triage Workflow"));
  });
});

describe("ai-assistant — all stable", () => {
  it("shows all-stable message and minimal content", () => {
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
      ],
      statistics: {
        runs: 2,
        perRun: [],
        aggregate: null,
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

    const output = generate(result);
    assert.ok(output.analysisMd.includes("All Tests Stable"));
    assert.ok(output.analysisMd.includes("No issues to investigate"));
  });

  it("generates prompts even when all tests pass", () => {
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
      ],
      statistics: {
        runs: 2,
        perRun: [],
        aggregate: {
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

    const output = generate(result);
    assert.ok(output.promptsMd.includes("Agent Mode Prompts"));
    assert.ok(output.promptsMd.includes("Workspace Prompts"));
    assert.ok(output.promptsMd.includes("Test Stability Rules"));
  });
});

describe("ai-assistant — edge cases", () => {
  it("handles errors without classifiedErrors but with raw errors", () => {
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
          id: "test-x",
          title: "test x",
          file: "x.spec.js",
          tags: [],
          history: ["failed", "failed"],
          classification: "stable_failure",
          lastOutcome: "failed",
          previousOutcomes: ["failed"],
          firstSeenRun: 0,
          lastSeenRun: 1,
          stabilityScore: 1.0,
          errors: [{ message: "raw error message", stack: "at line 10" }],
          failureCategory: "unknown",
          classifiedErrors: [],
          runCount: 2,
        },
      ],
      statistics: {
        runs: 2,
        perRun: [],
        aggregate: null,
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

    const output = generate(result);
    assert.ok(output.analysisMd.includes("raw error message"));
    assert.ok(output.analysisMd.includes("at line 10"));
  });

  it("handles string errors in classifiedErrors", () => {
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
          id: "test-y",
          title: "test y",
          file: "y.spec.js",
          tags: [],
          history: ["failed", "failed"],
          classification: "stable_failure",
          lastOutcome: "failed",
          previousOutcomes: ["failed"],
          firstSeenRun: 0,
          lastSeenRun: 1,
          stabilityScore: 1.0,
          errors: [{ message: "string error" }],
          failureCategory: "network",
          classifiedErrors: [{ message: "network error", category: "network", stack: null }],
          runCount: 2,
        },
      ],
      statistics: {
        runs: 2,
        perRun: [],
        aggregate: null,
        slowestTests: [],
        failureFrequency: [],
        failureCategories: {
          total: 1,
          counts: {
            timeout: 0,
            locator: 0,
            assertion: 0,
            network: 1,
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

    const output = generate(result);
    assert.ok(output.analysisMd.includes("network error"));
    assert.ok(output.analysisMd.includes("**Failure Category:** network"));
  });

  it("handles missing failure categories in statistics", () => {
    const result = makeResult();
    result.statistics.failureCategories = null;

    const output = generate(result);
    assert.ok(!output.analysisMd.includes("### Failure Categories"));
  });

  it("handles missing browser stats", () => {
    const result = makeResult();
    result.statistics.browserStats = [];

    const output = generate(result);
    assert.ok(!output.analysisMd.includes("### Browser Breakdown"));
  });

  it("handles missing slowest tests", () => {
    const result = makeResult();
    result.statistics.slowestTests = [];

    const output = generate(result);
    assert.ok(!output.analysisMd.includes("### Slowest Tests"));
  });

  it("does not include regression prompts when no regressions exist", () => {
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
          id: "test-z",
          title: "test z",
          file: "z.spec.js",
          tags: [],
          history: ["failed", "failed"],
          classification: "stable_failure",
          lastOutcome: "failed",
          previousOutcomes: ["failed"],
          firstSeenRun: 0,
          lastSeenRun: 1,
          stabilityScore: 1.0,
          errors: [{ message: "fail" }],
          failureCategory: "timeout",
          classifiedErrors: [{ message: "fail", category: "timeout", stack: null }],
          runCount: 2,
        },
      ],
      statistics: {
        runs: 2,
        perRun: [],
        aggregate: null,
        slowestTests: [],
        failureFrequency: [],
        failureCategories: {
          total: 1,
          counts: {
            timeout: 1,
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

    const output = generate(result);
    assert.ok(!output.promptsMd.includes("Regression Investigation"));
    assert.ok(!output.promptsMd.includes("Git Bisect"));
    assert.ok(output.promptsMd.includes("Stable Failure Investigation"));
  });
});
