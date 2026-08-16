"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ai = require("./ai-investigation");
const { validateAiInvestigation } = require("./ai-schema");

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
    },
    results: [
      {
        title: "Checkout flow",
        file: "checkout.spec.js",
        browser: "chromium",
        tags: [],
        history: ["passed", "failed"],
        classification: "flaky",
        stabilityScore: 0.5,
        failureCategory: "timeout",
        firstSeenRun: 0,
        lastSeenRun: 1,
        classifiedErrors: [{ message: "Timeout 30000ms exceeded", category: "timeout" }],
        errors: [],
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
      failureCategories: { total: 1, counts: { timeout: 1 } },
      failureFrequency: [],
      browserStats: [],
      slowestTests: [],
    },
    runs: [],
    analyzerVersion: "1.0.0",
    schemaVersion: "1.0.0",
  };
}

// Snapshot the deterministic fields so we can assert AI never touches them.
function deterministicSnapshot(r) {
  return JSON.stringify({ summary: r.summary, results: r.results, statistics: r.statistics });
}

test("resolveAiSpec: none / provider / file-only", () => {
  assert.strictEqual(ai.resolveAiSpec({ output: {} }), null);
  assert.strictEqual(
    ai.resolveAiSpec({ output: { investigationProvider: "mock" } }).providerName,
    "mock"
  );
  assert.strictEqual(
    ai.resolveAiSpec({ output: { aiInvestigationFile: "x.json" } }).providerName,
    "file"
  );
});

test("no AI configured leaves the result completely untouched", () => {
  const r = makeResult();
  const before = deterministicSnapshot(r);
  ai.enrichOffline(r, { output: {} });
  assert.strictEqual(r.aiInvestigation, undefined);
  assert.strictEqual(r.aiInvestigationMeta, undefined);
  assert.strictEqual(deterministicSnapshot(r), before);
});

test("enrichOffline(mock) attaches a valid overlay + provenance, deterministic fields unchanged", () => {
  const r = makeResult();
  const before = deterministicSnapshot(r);
  ai.enrichOffline(r, { output: { investigationProvider: "mock" } });
  assert.ok(r.aiInvestigation);
  assert.deepStrictEqual(validateAiInvestigation(r.aiInvestigation), []);
  assert.strictEqual(r.aiInvestigationMeta.status, "ok");
  assert.strictEqual(r.aiInvestigationMeta.provider, "mock");
  assert.strictEqual(r.aiInvestigationMeta.promptVersion, ai.PROMPT_VERSION);
  assert.strictEqual(deterministicSnapshot(r), before);
});

test("enrichOffline(file) round-trips a well-formed investigation file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pfa-ai-orch-"));
  const file = path.join(dir, "ai-investigation.json");
  const overlay = {
    executiveSummary: "From my LLM",
    suiteHealth: "",
    flakyTests: [],
    consistentFailures: [],
    browserAnalysis: "",
    failureTrends: "",
    rootCauseAnalysis: [],
    confidenceAssessment: "",
    recommendedActions: ["do X"],
    debuggingPlan: [],
  };
  fs.writeFileSync(file, JSON.stringify(overlay));
  const r = makeResult();
  ai.enrichOffline(r, { output: { aiInvestigationFile: file } });
  assert.strictEqual(r.aiInvestigationMeta.status, "ok");
  assert.strictEqual(r.aiInvestigation.executiveSummary, "From my LLM");
});

test("enrichOffline(file) marks a partial file 'invalid' but still renders what it can", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pfa-ai-partial-"));
  const file = path.join(dir, "partial.json");
  fs.writeFileSync(file, JSON.stringify({ executiveSummary: "only this key" }));
  const r = makeResult();
  ai.enrichOffline(r, { output: { aiInvestigationFile: file } });
  assert.strictEqual(r.aiInvestigationMeta.status, "invalid");
  assert.ok(Array.isArray(r.aiInvestigationMeta.validationErrors));
  assert.strictEqual(r.aiInvestigation.executiveSummary, "only this key");
});

test("enrichOffline(file) with a missing file → status error, report still intact", () => {
  const r = makeResult();
  const before = deterministicSnapshot(r);
  ai.enrichOffline(r, { output: { aiInvestigationFile: "/no/such/file.json" } });
  assert.strictEqual(r.aiInvestigation, null);
  assert.strictEqual(r.aiInvestigationMeta.status, "error");
  assert.match(r.aiInvestigationMeta.message, /not found/);
  assert.strictEqual(deterministicSnapshot(r), before);
});

test("enrichOffline routes a network provider to an error (needs async entry)", () => {
  const r = makeResult();
  ai.enrichOffline(r, { output: { investigationProvider: "anthropic" } });
  assert.strictEqual(r.aiInvestigationMeta.status, "error");
});

test("enrichAsync(mock) works and is awaitable", async () => {
  const r = makeResult();
  await ai.enrichAsync(r, { output: { investigationProvider: "mock" } });
  assert.strictEqual(r.aiInvestigationMeta.status, "ok");
  assert.ok(r.aiInvestigation);
});

test("enrichAsync unknown provider → status error (non-throwing)", async () => {
  const r = makeResult();
  await assert.doesNotReject(
    ai.enrichAsync(r, { output: { investigationProvider: "does-not-exist" } })
  );
  assert.strictEqual(r.aiInvestigationMeta.status, "error");
  assert.strictEqual(r.aiInvestigation, null);
});

test("enrichAsync(anthropic) without a key fails gracefully — report still generates", async () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const r = makeResult();
    const before = deterministicSnapshot(r);
    await ai.enrichAsync(r, { output: { investigationProvider: "anthropic" } });
    assert.strictEqual(r.aiInvestigationMeta.status, "error");
    assert.match(r.aiInvestigationMeta.message, /ANTHROPIC_API_KEY/);
    assert.strictEqual(deterministicSnapshot(r), before);
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  }
});

test("previewNetworkPayload: null for offline, redacted prompt for network", () => {
  const r = makeResult();
  assert.strictEqual(
    ai.previewNetworkPayload(r, { output: { investigationProvider: "mock" } }),
    null
  );
  const preview = ai.previewNetworkPayload(r, { output: { investigationProvider: "anthropic" } });
  assert.ok(preview);
  assert.strictEqual(preview.provider, "anthropic");
  assert.strictEqual(preview.redacted, true);
  assert.ok(preview.prompt.includes("JSON"));
});

test("usesNetworkProvider drives the sync/async routing choice", () => {
  assert.strictEqual(ai.usesNetworkProvider({ output: {} }), false);
  assert.strictEqual(ai.usesNetworkProvider({ output: { investigationProvider: "mock" } }), false);
  assert.strictEqual(ai.usesNetworkProvider({ output: { aiInvestigationFile: "x.json" } }), false);
  assert.strictEqual(
    ai.usesNetworkProvider({ output: { investigationProvider: "anthropic" } }),
    true
  );
});
