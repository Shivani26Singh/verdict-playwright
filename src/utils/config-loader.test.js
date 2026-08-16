"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { loadConfig } = require("./config-loader");
const fs = require("fs");
const path = require("path");

describe("config-loader — loadConfig", function () {
  it("returns default config when no config file exists", function () {
    var cfg = loadConfig(null); // null = no custom path, will fall back to defaults if CWD has no config
    assert.ok(cfg, "Expected a config object");
    assert.equal(cfg.analyzer.minFailures, 2);
    assert.equal(cfg.output.format, "html");
  });

  it("merges user config with defaults", function () {
    var tmpFile = path.join(__dirname, "..", "..", ".tmp-cfg-test.json");
    fs.writeFileSync(tmpFile, JSON.stringify({ analyzer: { minFailures: 5 } }));
    try {
      var cfg = loadConfig(tmpFile);
      assert.equal(cfg.analyzer.minFailures, 5);
      assert.equal(cfg.analyzer.lookbackRuns, 10);
      assert.equal(cfg.output.format, "html");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("throws for nonexistent custom path", function () {
    assert.throws(function () {
      loadConfig("/nonexistent/absolute/path/config.json");
    }, /not found/);
  });

  it("preserves nested defaults when partially overridden", function () {
    var tmpFile = path.join(__dirname, "..", "..", ".tmp-cfg2.json");
    fs.writeFileSync(tmpFile, JSON.stringify({ logging: { level: "debug" } }));
    try {
      var cfg = loadConfig(tmpFile);
      assert.equal(cfg.logging.level, "debug");
      assert.equal(cfg.logging.file, "./logs/analyzer.log");
      assert.equal(cfg.logging.console, true);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("falls back to defaults on invalid JSON", function () {
    var tmpFile = path.join(__dirname, "..", "..", ".tmp-bad.json");
    fs.writeFileSync(tmpFile, "not valid json {{{");
    try {
      var cfg = loadConfig(tmpFile);
      assert.ok(cfg, "Expected a config object even with bad JSON");
      assert.equal(cfg.analyzer.minFailures, 2);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

describe("config-loader — deepMerge", function () {
  // deepMerge is not exported but loadConfig tests exercise it.
  // We test via loadConfig to avoid testing internals.

  it("non-object overrides replace values", function () {
    var tmpFile = path.join(__dirname, "..", "..", ".tmp-str.json");
    fs.writeFileSync(tmpFile, JSON.stringify({ output: { format: "markdown" } }));
    try {
      var cfg = loadConfig(tmpFile);
      assert.equal(cfg.output.format, "markdown");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("unknown keys in user config are preserved", function () {
    var tmpFile = path.join(__dirname, "..", "..", ".tmp-extra.json");
    fs.writeFileSync(tmpFile, JSON.stringify({ customField: "hello" }));
    try {
      var cfg = loadConfig(tmpFile);
      assert.equal(cfg.customField, "hello");
      assert.equal(cfg.analyzer.minFailures, 2);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

describe("config-loader — DEFAULT_CONFIG", function () {
  var DEFAULT_CONFIG = require("./config-loader").DEFAULT_CONFIG;
  it("DEFAULT_CONFIG has all required sections", function () {
    assert.ok(DEFAULT_CONFIG.analyzer);
    assert.ok(DEFAULT_CONFIG.input);
    assert.ok(DEFAULT_CONFIG.output);
    assert.ok(DEFAULT_CONFIG.logging);
  });

  it("CI gate is additive and disabled by default; no historyFile key exists", function () {
    assert.ok(DEFAULT_CONFIG.ci);
    assert.equal(DEFAULT_CONFIG.ci.maxFlaky, null);
    assert.equal(DEFAULT_CONFIG.output.historyFile, undefined);
  });
});

describe("config-loader — ci merging", function () {
  it("a user config can set ci.maxFlaky without needing every ci key", function () {
    var tmpFile = path.join(__dirname, "..", "..", ".tmp-cfg-ci.json");
    fs.writeFileSync(tmpFile, JSON.stringify({ ci: { maxFlaky: 5 } }));
    try {
      var cfg = loadConfig(tmpFile);
      assert.equal(cfg.ci.maxFlaky, 5);
      // Untouched defaults survive the merge.
      assert.equal(cfg.analyzer.minFailures, 2);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});
