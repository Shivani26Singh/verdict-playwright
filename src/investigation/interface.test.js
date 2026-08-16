"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { InvestigationResult, withProvider, VALID_SEVERITIES } = require("./interface");

describe("investigation — interface", function () {
  describe("InvestigationResult", function () {
    var valid = {
      likelyCause: "Something went wrong",
      confidence: 85,
      severity: "high",
      evidence: "Errors were found",
      possibleFixes: ["Fix it", "Try harder"],
      explanation: "This is a detailed explanation.",
      requiresHumanReview: false,
    };

    it("returns an object with all fields", function () {
      var r = InvestigationResult(valid);
      assert.equal(r.likelyCause, "Something went wrong");
      assert.equal(r.confidence, 85);
      assert.equal(r.severity, "high");
      assert.equal(r.evidence, "Errors were found");
      assert.deepEqual(r.possibleFixes, ["Fix it", "Try harder"]);
      assert.equal(r.explanation, "This is a detailed explanation.");
      assert.equal(r.requiresHumanReview, false);
    });

    it("rejects missing likelyCause", function () {
      var v = Object.assign({}, valid);
      delete v.likelyCause;
      assert.throws(function () {
        InvestigationResult(v);
      }, /likelyCause/);
    });

    it("rejects missing confidence", function () {
      var v = Object.assign({}, valid);
      delete v.confidence;
      assert.throws(function () {
        InvestigationResult(v);
      }, /confidence/);
    });

    it("rejects confidence out of range (negative)", function () {
      var v = Object.assign({}, valid, { confidence: -1 });
      assert.throws(function () {
        InvestigationResult(v);
      }, /between 0 and 100/);
    });

    it("rejects confidence out of range (over 100)", function () {
      var v = Object.assign({}, valid, { confidence: 101 });
      assert.throws(function () {
        InvestigationResult(v);
      }, /between 0 and 100/);
    });

    it("rejects invalid severity", function () {
      var v = Object.assign({}, valid, { severity: "unknown-level" });
      assert.throws(function () {
        InvestigationResult(v);
      }, /severity must be one of/);
    });

    it("accepts all valid severities", function () {
      VALID_SEVERITIES.forEach(function (s) {
        var v = Object.assign({}, valid, { severity: s });
        var r = InvestigationResult(v);
        assert.equal(r.severity, s);
      });
    });

    it("rejects non-array possibleFixes", function () {
      var v = Object.assign({}, valid, { possibleFixes: "not an array" });
      assert.throws(function () {
        InvestigationResult(v);
      }, /possibleFixes/);
    });

    it("rejects possibleFixes with non-strings", function () {
      var v = Object.assign({}, valid, { possibleFixes: ["ok", 123] });
      assert.throws(function () {
        InvestigationResult(v);
      }, /possibleFixes/);
    });

    it("rejects non-boolean requiresHumanReview", function () {
      var v = Object.assign({}, valid, { requiresHumanReview: "yes" });
      assert.throws(function () {
        InvestigationResult(v);
      }, /requiresHumanReview/);
    });

    it("accepts empty evidence string", function () {
      var v = Object.assign({}, valid, { evidence: "" });
      var r = InvestigationResult(v);
      assert.equal(r.evidence, "");
    });
  });

  describe("withProvider", function () {
    it("wraps result with provider metadata", function () {
      var r = InvestigationResult({
        likelyCause: "A",
        confidence: 50,
        severity: "medium",
        evidence: "B",
        possibleFixes: [],
        explanation: "C",
        requiresHumanReview: false,
      });
      var wrapped = withProvider("rule-engine", r);
      assert.equal(wrapped.provider, "rule-engine");
      assert.deepEqual(wrapped.result, r);
    });
  });
});
