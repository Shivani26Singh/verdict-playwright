"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { runRules } = require("./rule-engine");

describe("investigation — rule-engine", function () {
  it("detects timeout errors", function () {
    var t = {
      classifiedErrors: [{ category: "timeout" }],
      history: ["passed", "failed"],
      fails: 0,
    };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.provider, "rule-engine");
    assert.equal(r.result.likelyCause.includes("slow"), true);
    // Confidence is now dynamic — base 90, 0 transitions, limited data, isolated = 90 -5 -3 = 82
    assert.ok(r.result.confidence >= 70 && r.result.confidence <= 99);
    assert.equal(r.result.severity, "high");
    assert.equal(r.result.ruleCode, "RC-001");
  });

  it("detects locator errors", function () {
    var t = { classifiedErrors: [{ category: "locator" }], history: ["failed"], fails: 1 };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.result.likelyCause.includes("locator"), true);
  });

  it("detects assertion errors", function () {
    var t = { classifiedErrors: [{ category: "assertion" }], history: ["failed"], fails: 0 };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.result.likelyCause.includes("Expected"), true);
  });

  it("detects network errors", function () {
    var t = { classifiedErrors: [{ category: "network" }], history: ["failed"], fails: 0 };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.result.likelyCause.includes("network request"), true);
  });

  it("detects always-fails pattern", function () {
    var t = {
      classifiedErrors: [{ category: "unknown" }],
      history: [
        "failed",
        "failed",
        "failed",
        "failed",
        "failed",
        "failed",
        "failed",
        "failed",
        "failed",
        "passed",
      ],
      fails: 0,
    };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.result.likelyCause.includes("consistently broken"), true);
    assert.equal(r.result.severity, "critical");
  });

  it("detects rapid alternation", function () {
    var t = {
      classifiedErrors: [{ category: "unknown" }],
      history: ["passed", "failed", "passed", "failed"],
      fails: 0,
    };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.result.likelyCause.includes("Race condition"), true);
  });

  it("prioritizes timeout over locator", function () {
    var t = {
      classifiedErrors: [{ category: "locator" }, { category: "timeout" }],
      history: ["failed"],
      fails: 1,
    };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.result.likelyCause.includes("slow"), true);
  });

  it("prioritizes locator over assertion", function () {
    var t = {
      classifiedErrors: [{ category: "assertion" }, { category: "locator" }],
      history: ["failed"],
      fails: 0,
    };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.result.likelyCause.includes("locator"), true);
  });

  it("returns fallback result for no rule match", function () {
    var t = { classifiedErrors: [], history: ["passed", "passed"], fails: 0 };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.provider, "rule-engine");
    assert.equal(r.result.severity, "medium");
  });

  it("returns null for null input", function () {
    assert.equal(runRules(null), null);
  });

  it("returns null for undefined input", function () {
    assert.equal(runRules(undefined), null);
  });

  it("wraps result with provider 'rule-engine' and includes extended fields", function () {
    var t = { classifiedErrors: [{ category: "timeout" }], history: ["failed"], fails: 0 };
    var r = runRules(t);
    assert.equal(r.provider, "rule-engine");
    assert.ok(r.result);
    assert.equal(typeof r.result.likelyCause, "string");
    assert.ok(Array.isArray(r.result.suggestedChecks));
    assert.equal(typeof r.result.ruleId, "string");
    assert.equal(typeof r.result.errorPattern, "string");
    assert.equal(typeof r.result.category, "string");
    assert.equal(typeof r.result.requiresHumanReview, "boolean");
  });

  // ── Regex accuracy: element-not-visible ──
  it("matches Playwright 'element is not visible' error", function () {
    var t = {
      classifiedErrors: [{ category: "unknown" }],
      errors: [{ message: "locator.click: Error: element is not visible" }],
      history: ["failed"],
      fails: 0,
    };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.result.ruleId, "element-not-visible");
  });

  it("does NOT match 'not visible' in unrelated context", function () {
    // e.g. assertion about text that happens to contain "not visible"
    var t = {
      classifiedErrors: [{ category: "unknown" }],
      errors: [
        { message: "AssertionError: expected text 'not visible in mobile view' to be present" },
      ],
      history: ["failed"],
      fails: 0,
    };
    var r = runRules(t);
    // Should fall through to generic-failure, NOT element-not-visible
    assert.notEqual(r.result.ruleId, "element-not-visible");
  });

  it("does NOT match 'selector is not visible' (locator-not-found territory)", function () {
    var t = {
      classifiedErrors: [{ category: "unknown" }],
      errors: [{ message: "Error: locator.click: selector is not visible" }],
      history: ["failed"],
      fails: 0,
    };
    var r = runRules(t);
    // 'selector is not visible' is not Playwright's phrasing for element-not-visible
    // Playwright says "element is not visible" — this should fall to locator-not-found or generic
    assert.notEqual(r.result.ruleId, "element-not-visible");
  });

  // ── Regex accuracy: locator-not-found ──
  it("matches Playwright 'locator not found' error", function () {
    var t = {
      classifiedErrors: [{ category: "unknown" }],
      errors: [{ message: "locator.click: Error: locator not found" }],
      history: ["failed"],
      fails: 0,
    };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.result.ruleId, "locator-not-found");
  });

  it("matches Playwright 'no such element' error", function () {
    var t = {
      classifiedErrors: [{ category: "unknown" }],
      errors: [{ message: "Error: no such element: Unable to locate element" }],
      history: ["failed"],
      fails: 0,
    };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.result.ruleId, "locator-not-found");
  });

  it("matches Playwright 'locator was not found' variation", function () {
    var t = {
      classifiedErrors: [{ category: "unknown" }],
      errors: [{ message: "locator.fill: Error: locator was not found in the current page" }],
      history: ["failed"],
      fails: 0,
    };
    var r = runRules(t);
    assert.ok(r);
    assert.equal(r.result.ruleId, "locator-not-found");
  });

  it("does NOT match bare 'selector' in unrelated context", function () {
    // e.g. a TypeError involving a property called 'selector'
    var t = {
      classifiedErrors: [{ category: "unknown" }],
      errors: [{ message: "TypeError: Cannot read properties of undefined (reading 'selector')" }],
      history: ["failed"],
      fails: 0,
    };
    var r = runRules(t);
    assert.notEqual(r.result.ruleId, "locator-not-found");
  });

  it("does NOT match 'element not found' in assertion context", function () {
    // e.g. React Testing Library assertion about element
    var t = {
      classifiedErrors: [{ category: "unknown" }],
      errors: [
        { message: "TestingLibraryElementError: Unable to find an element with the text: Submit" },
      ],
      history: ["failed"],
      fails: 0,
    };
    var r = runRules(t);
    assert.notEqual(r.result.ruleId, "locator-not-found");
  });
});

describe("investigation — calculateConfidence", function () {
  var calc = require("./rule-engine").calculateConfidence;

  it("returns base confidence when no adjustments apply", function () {
    // 1 run, isolated fingerprint — adjustments: A4 (-5), A7 (-3), A8 (-5) = -13
    // 90 - 13 = 77
    var c = calc(90, ["failed"], 0, 1);
    assert.ok(c >= 70 && c <= 85);
  });

  it("applies A1: history consistent (+5)", function () {
    var c = calc(80, ["failed", "failed", "failed"], 0, 3);
    // 80 + 5(A1) + 0(A4 all failed: -5) -3(A7 isolated) = 77
    assert.ok(c >= 70 && c <= 85);
  });

  it("applies A5: 3+ fingerprint (+8) and A7: isolated (-3)", function () {
    var c1 = calc(80, ["failed"], 3, 3);
    var c2 = calc(80, ["failed"], 0, 3);
    // c1 should be higher than c2
    assert.ok(c1 > c2);
  });

  it("clamps to min 10", function () {
    var c = calc(1, ["failed"], 0, 1);
    assert.equal(c, 10);
  });

  it("clamps to max 99", function () {
    var c = calc(95, ["passed", "passed", "passed"], 10, 10);
    assert.ok(c <= 99);
  });

  it("all fingerprints same = isolated (count 0)", function () {
    var c = calc(90, ["passed", "failed", "passed"], 0, 3);
    // 90 -3(A7 isolated) +3(A3 mixed) = 90
    assert.ok(c >= 85);
  });

  it("A8: limited data (-5 for <= 2 runs)", function () {
    var c2 = calc(90, ["failed"], 0, 2);
    var c5 = calc(90, ["failed"], 0, 5);
    assert.ok(c5 > c2);
  });
});

describe("investigation — explainConfidence", function () {
  var explainConfidence = require("./rule-engine").explainConfidence;
  var calculateConfidence = require("./rule-engine").calculateConfidence;

  it("finalConfidence matches calculateConfidence's numeric result", function () {
    var exp = explainConfidence(80, ["failed", "failed", "failed"], 0, 3);
    var c = calculateConfidence(80, ["failed", "failed", "failed"], 0, 3);
    assert.equal(exp.finalConfidence, c);
  });

  it("lists only the adjustments that actually fired, each with a code and reason", function () {
    var exp = explainConfidence(80, ["failed", "failed", "failed"], 0, 3);
    var codes = exp.adjustments.map(function (a) {
      return a.code;
    });
    assert.ok(codes.includes("A1"));
    assert.ok(codes.includes("A4"));
    assert.ok(codes.includes("A7"));
    assert.ok(!codes.includes("A2"));
    exp.adjustments.forEach(function (a) {
      assert.equal(typeof a.reason, "string");
      assert.ok(a.reason.length > 0);
    });
  });

  it("flags clamped:true when the raw total falls outside 10-99", function () {
    var exp = explainConfidence(1, ["failed"], 0, 1);
    assert.equal(exp.finalConfidence, 10);
    assert.equal(exp.clamped, true);
  });

  it("flags clamped:false when the raw total is already in range", function () {
    var exp = explainConfidence(50, ["passed", "failed", "passed"], 1, 3);
    assert.equal(exp.clamped, false);
    assert.equal(exp.finalConfidence, exp.baseConfidence + exp.adjustmentTotal);
  });
});

describe("investigation — timeout rule specificity (Phase 6 regression)", function () {
  function ruleCodeFor(message, classifiedErrors) {
    var t = { errors: [{ message: message }], history: ["failed"] };
    if (classifiedErrors) t.classifiedErrors = classifiedErrors;
    var r = runRules(t);
    return r && r.result ? r.result.ruleCode : null;
  }

  it("generic timeout matches the generic timeout rule (RC-001)", function () {
    assert.equal(ruleCodeFor("Timeout 30000ms exceeded"), "RC-001");
  });

  it("click timeout matches the specific click-timeout rule (RC-009), not the generic rule", function () {
    // This is the shadowing regression: before the fix, the broad timeout-error rule (priority 1)
    // matched first and returned RC-001, so RC-009 was unreachable.
    assert.equal(ruleCodeFor("locator.click: Timeout 30000ms exceeded"), "RC-009");
  });

  it("navigation timeout falls back to the generic timeout rule (RC-001)", function () {
    assert.equal(ruleCodeFor("page.goto: Timeout 30000ms exceeded"), "RC-001");
  });

  it("locator (waitFor) timeout falls back to the generic timeout rule (RC-001)", function () {
    assert.equal(ruleCodeFor("locator.waitFor: Timeout 30000ms exceeded"), "RC-001");
  });

  it("API request timeout falls back to the generic timeout rule (RC-001)", function () {
    assert.equal(ruleCodeFor("apiRequestContext.get: Timeout 30000ms exceeded"), "RC-001");
  });

  it("slow response timeout falls back to the generic timeout rule (RC-001)", function () {
    assert.equal(ruleCodeFor("Timeout while waiting for response, server too slow"), "RC-001");
  });

  it("mixed message with multiple timeout keywords selects the most specific rule (RC-009)", function () {
    assert.equal(
      ruleCodeFor("locator.click: Timeout 30000ms exceeded; operation timed out"),
      "RC-009"
    );
  });

  it("a plain 'exceeded the timeout' message still matches the generic rule (RC-001)", function () {
    assert.equal(ruleCodeFor("Test exceeded the timeout of 30000ms"), "RC-001");
  });

  it("unrelated rules are unaffected by the timeout reorder", function () {
    assert.equal(ruleCodeFor("locator.click: Error: element is not visible"), "RC-008");
    assert.equal(ruleCodeFor("locator.click: Error: locator not found"), "RC-002");
    assert.equal(ruleCodeFor("net::ERR_CONNECTION_REFUSED"), "RC-014");
    assert.equal(ruleCodeFor("x", [{ category: "timeout" }]), "RC-001");
    assert.equal(ruleCodeFor("x", [{ category: "assertion" }]), "RC-003");
  });
});
