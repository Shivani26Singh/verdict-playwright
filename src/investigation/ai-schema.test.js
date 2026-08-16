"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const {
  PROMPT_VERSION,
  validateAiInvestigation,
  normalizeAiInvestigation,
  hasContent,
} = require("./ai-schema");

function fullOverlay() {
  return {
    executiveSummary: "s",
    suiteHealth: "h",
    flakyTests: [{ name: "n", issue: "i", fix: "f" }],
    consistentFailures: [],
    browserAnalysis: "b",
    failureTrends: "t",
    rootCauseAnalysis: [{ name: "n", issue: "i", fix: "f" }],
    confidenceAssessment: "c",
    recommendedActions: ["a"],
    debuggingPlan: ["p"],
  };
}

test("PROMPT_VERSION is a semver-ish string", () => {
  assert.match(PROMPT_VERSION, /^\d+\.\d+\.\d+$/);
});

test("validate accepts a full, well-typed overlay", () => {
  assert.deepStrictEqual(validateAiInvestigation(fullOverlay()), []);
});

test("validate accepts empty content (empty strings / arrays)", () => {
  const empty = {
    executiveSummary: "",
    suiteHealth: "",
    flakyTests: [],
    consistentFailures: [],
    browserAnalysis: "",
    failureTrends: "",
    rootCauseAnalysis: [],
    confidenceAssessment: "",
    recommendedActions: [],
    debuggingPlan: [],
  };
  assert.deepStrictEqual(validateAiInvestigation(empty), []);
});

test("validate rejects non-object", () => {
  assert.strictEqual(validateAiInvestigation(null).length, 1);
  assert.strictEqual(validateAiInvestigation([]).length, 1);
  assert.strictEqual(validateAiInvestigation("x").length, 1);
});

test("validate reports missing and mistyped keys", () => {
  const bad = fullOverlay();
  delete bad.executiveSummary;
  bad.recommendedActions = "not-an-array";
  bad.flakyTests = [{ name: 1, issue: "i", fix: "f" }];
  const errs = validateAiInvestigation(bad);
  assert.ok(errs.some((e) => e.includes("executiveSummary")));
  assert.ok(errs.some((e) => e.includes("recommendedActions")));
  assert.ok(errs.some((e) => e.includes("flakyTests[0].name")));
});

test("normalize fills defaults and drops malformed list items", () => {
  const n = normalizeAiInvestigation({
    flakyTests: [{ name: "n" }, "junk", null],
    recommendedActions: ["ok", 5],
  });
  assert.strictEqual(n.executiveSummary, "");
  assert.deepStrictEqual(n.flakyTests, [{ name: "n", issue: "", fix: "" }]);
  assert.deepStrictEqual(n.recommendedActions, ["ok"]);
  assert.deepStrictEqual(n.consistentFailures, []);
});

test("normalize never throws on garbage input", () => {
  assert.doesNotThrow(() => normalizeAiInvestigation(null));
  assert.doesNotThrow(() => normalizeAiInvestigation(42));
});

test("hasContent distinguishes empty from populated", () => {
  assert.strictEqual(hasContent(null), false);
  assert.strictEqual(hasContent(normalizeAiInvestigation({})), false);
  assert.strictEqual(hasContent(fullOverlay()), true);
  assert.strictEqual(hasContent({ recommendedActions: ["do a thing"] }), true);
});
