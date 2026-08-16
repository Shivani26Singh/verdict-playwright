"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { investigate } = require("./investigate-engine");

describe("investigation — investigate-engine", function () {
  var flakyTest = {
    title: "test",
    classifiedErrors: [{ category: "timeout" }],
    history: ["failed", "passed", "failed"],
    fails: 0,
  };

  it("returns { ruleBased, providerResult, timestamp }", async function () {
    var r = await investigate(flakyTest);
    assert.ok("ruleBased" in r);
    assert.ok("providerResult" in r);
    assert.ok("timestamp" in r);
  });

  it("ruleBased is populated by rule engine", async function () {
    var r = await investigate(flakyTest);
    assert.ok(r.ruleBased);
    assert.equal(r.ruleBased.provider, "rule-engine");
    assert.ok(r.ruleBased.result.likelyCause.length > 0);
  });

  it("providerResult is null when no provider", async function () {
    var r = await investigate(flakyTest);
    assert.equal(r.providerResult, null);
  });

  it("providerResult is populated when provider specified", async function () {
    var r = await investigate(flakyTest, { provider: "mock" });
    assert.ok(r.providerResult);
    assert.equal(r.providerResult.provider, "mock");
    assert.ok(r.providerResult.result);
  });

  it("returns fallback when provider throws", async function () {
    var r = await investigate(flakyTest, { provider: "bad-provider" });
    assert.ok(r.providerResult);
    assert.ok(r.providerResult.result.requiresHumanReview);
  });

  it("timestamp is valid ISO string", async function () {
    var r = await investigate(flakyTest);
    var d = new Date(r.timestamp);
    assert.ok(!isNaN(d.getTime()));
  });

  it("ruleBased is null for empty input", async function () {
    var r = await investigate(null);
    assert.equal(r.ruleBased, null);
    assert.equal(r.providerResult, null);
  });
});
