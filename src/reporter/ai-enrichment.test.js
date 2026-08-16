"use strict";

const { test } = require("node:test");
const assert = require("node:assert");

const { buildDashboardJson } = require("./dashboard-json");
const { generate: generateHtml } = require("./html");
const { generate: generateMarkdown } = require("./markdown");
const { enrichOffline } = require("../investigation/ai-investigation");

function makeResult() {
  return {
    summary: {
      runsAnalyzed: 2,
      totalTests: 1,
      stable_pass: 0,
      stable_failure: 0,
      flaky: 1,
      newly_failed: 0,
      fixed: 0,
      regression: 0,
      passingOnRetry: 0,
    },
    results: [
      {
        id: "checkout",
        title: "Checkout flow",
        file: "checkout.spec.js",
        browser: "chromium",
        tags: [],
        history: ["passed", "failed"],
        retriesPerRun: [0, null],
        classification: "flaky",
        classificationReasons: ["2 transitions"],
        classificationRuleId: "CLS-003",
        lastOutcome: "failed",
        stabilityScore: 0.5,
        failureCategory: "timeout",
        runCount: 2,
        classifiedErrors: [{ message: "Timeout 30000ms exceeded", category: "timeout" }],
        errors: [{ message: "Timeout 30000ms exceeded" }],
        evidence: null,
        passedOnRetry: false,
        retriesToPass: 0,
        retryFailureErrors: [],
        classifiedRetryFailureErrors: [],
      },
    ],
    statistics: {
      aggregate: {
        overallPassRate: 50,
        overallFailRate: 50,
        avgDurationAcrossRuns: 0,
        avgRetriesAcrossRuns: 0,
        bestRunPassRate: 50,
        worstRunPassRate: 50,
      },
      perRun: [],
      failureCategories: { total: 1, counts: { timeout: 1 }, errors: [] },
      failureCategoriesLatest: { total: 1, counts: { timeout: 1 }, errors: [] },
      failureFrequency: [],
      browserStats: [],
      browserStatsLatest: [],
      slowestTests: [],
    },
    runs: [],
    analyzerVersion: "1.0.0",
    schemaVersion: "1.0.0",
  };
}

function divBalance(html) {
  return {
    open: (html.match(/<div/g) || []).length,
    close: (html.match(/<\/div>/g) || []).length,
  };
}

test("dashboard model passes through the AI overlay + provenance when present", () => {
  const r = makeResult();
  enrichOffline(r, { output: { investigationProvider: "mock" } });
  const dash = buildDashboardJson(r);
  assert.ok(dash.aiInvestigation);
  assert.strictEqual(dash.aiInvestigationMeta.status, "ok");
  assert.strictEqual(dash.aiInvestigationMeta.provider, "mock");
});

test("dashboard model carries null AI fields when no enrichment ran", () => {
  const dash = buildDashboardJson(makeResult());
  assert.strictEqual(dash.aiInvestigation, null);
  assert.strictEqual(dash.aiInvestigationMeta, null);
});

test("HTML embeds the AI panel + provenance and keeps <div> tags balanced (with AI)", () => {
  const r = makeResult();
  enrichOffline(r, { output: { investigationProvider: "mock" } });
  const html = generateHtml(buildDashboardJson(r));
  assert.ok(html.includes('id="section-ai"'));
  assert.ok(html.includes('"provider":"mock"'));
  assert.ok(html.includes("AI Insight"));
  const b = divBalance(html);
  assert.strictEqual(b.open, b.close, `divs must balance (${b.open} open / ${b.close} close)`);
});

test("HTML <div> tags stay balanced without AI too", () => {
  const html = generateHtml(buildDashboardJson(makeResult()));
  const b = divBalance(html);
  assert.strictEqual(b.open, b.close);
});

test("Markdown appends the AI Investigation section only when present", () => {
  const withAi = makeResult();
  enrichOffline(withAi, { output: { investigationProvider: "mock" } });
  const md = generateMarkdown(withAi);
  assert.ok(md.includes("AI Investigation"));
  assert.ok(md.includes("Provider: mock"));

  const withoutAi = generateMarkdown(makeResult());
  assert.ok(!withoutAi.includes("AI Investigation"));
});

test("Markdown surfaces an 'unavailable' note when the provider errored", () => {
  const r = makeResult();
  enrichOffline(r, { output: { aiInvestigationFile: "/no/such/file.json" } });
  const md = generateMarkdown(r);
  assert.ok(md.includes("AI Investigation"));
  assert.ok(md.toLowerCase().includes("unavailable"));
});
