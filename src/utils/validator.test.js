"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isValidPlaywrightReport, validateFilePaths, validateConfig } = require("./validator");

describe("validator — isValidPlaywrightReport", function () {
  it("rejects null", function () {
    assert.equal(isValidPlaywrightReport(null), false);
  });

  it("rejects non-object", function () {
    assert.equal(isValidPlaywrightReport("string"), false);
    assert.equal(isValidPlaywrightReport(42), false);
    assert.equal(isValidPlaywrightReport(undefined), false);
  });

  it("accepts native Playwright format with config + suites", function () {
    assert.equal(isValidPlaywrightReport({ config: {}, suites: [] }), true);
  });

  it("rejects object without config or suites", function () {
    assert.equal(isValidPlaywrightReport({}), false);
  });
});

describe("validator — validateFilePaths", function () {
  it("returns empty array for valid paths", function () {
    assert.deepEqual(validateFilePaths(["./a.json", "/b/results.json"]), []);
  });

  it("returns error for empty string", function () {
    var errors = validateFilePaths([""]);
    assert.ok(errors.length > 0);
  });

  it("returns error for whitespace-only string", function () {
    var errors = validateFilePaths(["   "]);
    assert.ok(errors.length > 0);
  });

  it("returns error for non-string", function () {
    var errors = validateFilePaths([42]);
    assert.ok(errors.length > 0);
  });
});

describe("validator — validateConfig", function () {
  it("returns error for null config", function () {
    var errors = validateConfig(null);
    assert.ok(errors.length > 0);
  });

  it("returns error for undefined config", function () {
    var errors = validateConfig(undefined);
    assert.ok(errors.length > 0);
  });

  it("returns empty for valid config", function () {
    var errors = validateConfig({ analyzer: { minFailures: 2, lookbackRuns: 10 } });
    assert.deepEqual(errors, []);
  });

  it("returns empty for empty config", function () {
    assert.deepEqual(validateConfig({}), []);
  });

  it("rejects minFailures < 1", function () {
    var errors = validateConfig({ analyzer: { minFailures: 0 } });
    assert.ok(errors.length > 0);
  });

  it("accepts ci.maxFlaky as null (gate disabled)", function () {
    assert.deepEqual(validateConfig({ ci: { maxFlaky: null } }), []);
  });

  it("accepts ci.maxFlaky as a non-negative integer", function () {
    assert.deepEqual(validateConfig({ ci: { maxFlaky: 0 } }), []);
    assert.deepEqual(validateConfig({ ci: { maxFlaky: 5 } }), []);
    assert.deepEqual(validateConfig({ ci: { maxFlaky: 1000 } }), []);
  });

  it("rejects an invalid ci.maxFlaky", function () {
    assert.ok(validateConfig({ ci: { maxFlaky: -1 } }).length > 0);
    assert.ok(validateConfig({ ci: { maxFlaky: 3.5 } }).length > 0);
    assert.ok(validateConfig({ ci: { maxFlaky: "5" } }).length > 0);
    assert.ok(validateConfig({ ci: { maxFlaky: NaN } }).length > 0);
  });

  it("no longer validates output.historyFile — the flag/mechanism was removed", function () {
    assert.deepEqual(validateConfig({ output: { historyFile: "./.flaky-history.json" } }), []);
  });
});
