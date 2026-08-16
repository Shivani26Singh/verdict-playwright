"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { generateFingerprint, djb2Hex } = require("../reporter/dashboard-json");

describe("dashboard-json — generateFingerprint", function () {
  it("produces a FP-XXXXXX string", function () {
    var fp = generateFingerprint(
      "regression",
      "timeout",
      "TimeoutError",
      "Page or API response too slow"
    );
    assert.ok(fp.startsWith("FP-"), "Expected FP- prefix, got: " + fp);
    assert.equal(fp.length, 9, "Expected 9 chars (FP-XXXXXX), got: " + fp);
    assert.ok(/^FP-[0-9A-F]{6}$/.test(fp), "Expected FP-XXXXXX format, got: " + fp);
  });

  it("is deterministic — same inputs produce same output", function () {
    var a = generateFingerprint("flaky", "locator", "locator", "Element not found");
    var b = generateFingerprint("flaky", "locator", "locator", "Element not found");
    assert.equal(a, b);
  });

  it("produces different fingerprints for different inputs", function () {
    var a = generateFingerprint("flaky", "timeout", "TimeoutError", "slow");
    var b = generateFingerprint("regression", "timeout", "TimeoutError", "slow");
    assert.notEqual(a, b);
  });

  it("handles null/undefined inputs gracefully", function () {
    var fp = generateFingerprint(null, null, null, null);
    assert.ok(fp.startsWith("FP-"));
    assert.equal(fp.length, 9);
  });

  it("does not include stack trace info", function () {
    // Fingerprint is based on classification + category + pattern + rootCause only
    var fp = generateFingerprint("flaky", "timeout", "TimeoutError", "slow");
    assert.ok(!fp.includes(".spec.js"));
    assert.ok(!fp.includes(".spec.ts"));
  });
});

describe("dashboard-json — djb2Hex", function () {
  it("returns a 6-character hex string", function () {
    var h = djb2Hex("hello");
    assert.equal(h.length, 6);
    assert.ok(/^[0-9A-F]{6}$/.test(h));
  });

  it("is deterministic", function () {
    assert.equal(djb2Hex("hello"), djb2Hex("hello"));
  });

  it("empty string produces valid hex", function () {
    var h = djb2Hex("");
    assert.equal(h.length, 6);
  });
});
