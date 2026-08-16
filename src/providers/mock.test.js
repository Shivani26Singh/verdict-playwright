"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const mockProvider = require("./mock");

describe("providers — mock", function () {
  it("has a name property", function () {
    assert.equal(mockProvider.name, "mock");
  });

  it("has an investigate function", function () {
    assert.equal(typeof mockProvider.investigate, "function");
  });

  it("returns { provider, result } wrapper", async function () {
    var r = await mockProvider.investigate({ test: {}, context: {}, ruleResult: null });
    assert.equal(r.provider, "mock");
    assert.ok(r.result);
    assert.equal(typeof r.result.likelyCause, "string");
  });

  it("returns confidence 0", async function () {
    var r = await mockProvider.investigate({ test: {}, context: {}, ruleResult: null });
    assert.equal(r.result.confidence, 0);
  });

  it("returns requiresHumanReview true", async function () {
    var r = await mockProvider.investigate({ test: {}, context: {}, ruleResult: null });
    assert.equal(r.result.requiresHumanReview, true);
  });

  it("receives ruleResult parameter", async function () {
    var ruleResult = {
      likelyCause: "test cause",
      confidence: 85,
      severity: "high",
      evidence: "test",
      possibleFixes: [],
      explanation: "test",
      requiresHumanReview: false,
    };
    var r = await mockProvider.investigate({ test: {}, context: {}, ruleResult: ruleResult });
    assert.ok(r);
    assert.equal(r.provider, "mock");
  });

  it("does not throw on any input", async function () {
    var r = await mockProvider.investigate({});
    assert.ok(r);
    assert.equal(r.provider, "mock");
  });

  it("returns valid InvestigationResult shape", async function () {
    var r = await mockProvider.investigate({
      test: { title: "Test" },
      context: {},
      ruleResult: null,
    });
    assert.ok(Array.isArray(r.result.possibleFixes));
    assert.equal(typeof r.result.severity, "string");
    assert.equal(typeof r.result.evidence, "string");
    assert.equal(typeof r.result.explanation, "string");
  });
});
