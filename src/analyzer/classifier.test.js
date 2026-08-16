const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { classify, OUTCOMES, resolveOutcome } = require("./classifier");

// Helper to get just the outcome string from classify result
function cls(history) {
  return classify(history).outcome;
}

// ─── resolveOutcome ───────────────────────────────────────────

describe("classifier — resolveOutcome", () => {
  it('maps "passed" to "passed"', () => assert.equal(resolveOutcome("passed"), "passed"));
  it('maps "expected" to "passed"', () => assert.equal(resolveOutcome("expected"), "passed"));
  it('maps "failed" to "failed"', () => assert.equal(resolveOutcome("failed"), "failed"));
  it('maps "timedOut" to "failed"', () => assert.equal(resolveOutcome("timedOut"), "failed"));
  it('maps "unexpected" to "failed"', () => assert.equal(resolveOutcome("unexpected"), "failed"));
  it('maps "skipped" to "skipped"', () => assert.equal(resolveOutcome("skipped"), "skipped"));
  it('maps "interrupted" to "interrupted"', () =>
    assert.equal(resolveOutcome("interrupted"), "interrupted"));
  it('maps "missing" to "missing"', () => assert.equal(resolveOutcome("missing"), "missing"));
  it("returns failed for unrecognized values", () =>
    assert.equal(resolveOutcome("weird"), "failed"));
});

// ─── 2-run classifications ────────────────────────────────────

describe("classifier — 2 runs", () => {
  it("passed + passed = stable_pass", () => {
    var r = classify(["passed", "passed"]);
    assert.equal(r.outcome, OUTCOMES.STABLE_PASS);
    assert.equal(r.ruleId, "CLS-001");
    assert.ok(r.reasons.length > 0);
  });

  it("failed + failed = stable_failure", () => {
    var r = classify(["failed", "failed"]);
    assert.equal(r.outcome, OUTCOMES.STABLE_FAILURE);
    assert.equal(r.ruleId, "CLS-002");
    assert.ok(r.reasons.length > 0);
  });

  it("passed + failed = newly_failed", () => {
    var r = classify(["passed", "failed"]);
    assert.equal(r.outcome, OUTCOMES.NEWLY_FAILED);
    assert.equal(r.ruleId, "CLS-004");
    assert.ok(
      r.reasons.some(function (rs) {
        return rs.includes("latest run");
      })
    );
  });

  it("failed + passed = fixed", () => {
    var r = classify(["failed", "passed"]);
    assert.equal(r.outcome, OUTCOMES.FIXED);
    assert.equal(r.ruleId, "CLS-006");
  });

  it("skipped + passed = stable_pass (skip carries no fail signal)", () => {
    assert.equal(cls(["skipped", "passed"]), OUTCOMES.STABLE_PASS);
  });

  it("missing + passed = stable_pass", () => {
    assert.equal(cls(["missing", "passed"]), OUTCOMES.STABLE_PASS);
  });

  it("missing + failed = newly_failed", () => {
    assert.equal(cls(["missing", "failed"]), OUTCOMES.NEWLY_FAILED);
  });

  it("passed + missing = stable_pass", () => {
    assert.equal(cls(["passed", "missing"]), OUTCOMES.STABLE_PASS);
  });
});

// ─── 3-run classifications ────────────────────────────────────

describe("classifier — 3 runs", () => {
  it("passed + passed + passed = stable_pass", () => {
    assert.equal(cls(["passed", "passed", "passed"]), OUTCOMES.STABLE_PASS);
  });

  it("failed + failed + failed = stable_failure", () => {
    assert.equal(cls(["failed", "failed", "failed"]), OUTCOMES.STABLE_FAILURE);
  });

  it("passed + passed + failed = newly_failed", () => {
    assert.equal(cls(["passed", "passed", "failed"]), OUTCOMES.NEWLY_FAILED);
  });

  it("failed + failed + passed = fixed", () => {
    assert.equal(cls(["failed", "failed", "passed"]), OUTCOMES.FIXED);
  });

  it("passed + failed + passed = flaky (2 transitions)", () => {
    assert.equal(cls(["passed", "failed", "passed"]), OUTCOMES.FLAKY);
  });

  it("failed + passed + failed = newly_failed (regression pattern, merged bucket)", () => {
    assert.equal(cls(["failed", "passed", "failed"]), OUTCOMES.NEWLY_FAILED);
  });

  it("failed + passed + passed + failed = newly_failed (regression pattern, 4 runs)", () => {
    assert.equal(cls(["failed", "passed", "passed", "failed"]), OUTCOMES.NEWLY_FAILED);
  });

  it("missing + failed + passed = fixed", () => {
    assert.equal(cls(["missing", "failed", "passed"]), OUTCOMES.FIXED);
  });

  it("missing + passed + failed = newly_failed", () => {
    assert.equal(cls(["missing", "passed", "failed"]), OUTCOMES.NEWLY_FAILED);
  });
});

// ─── N-run classifications ────────────────────────────────────

describe("classifier — N runs", () => {
  it("passed x5 = stable_pass", () => {
    assert.equal(cls(["passed", "passed", "passed", "passed", "passed"]), OUTCOMES.STABLE_PASS);
  });

  it("failed x5 = stable_failure", () => {
    assert.equal(cls(["failed", "failed", "failed", "failed", "failed"]), OUTCOMES.STABLE_FAILURE);
  });

  it("passed x4 + failed = newly_failed (5 runs)", () => {
    assert.equal(cls(["passed", "passed", "passed", "passed", "failed"]), OUTCOMES.NEWLY_FAILED);
  });

  it("failed x3 + passed + passed = fixed (5 runs)", () => {
    assert.equal(cls(["failed", "failed", "failed", "passed", "passed"]), OUTCOMES.FIXED);
  });

  it("failed + passed + failed = newly_failed (regression pattern, 3 runs, clear)", () => {
    assert.equal(cls(["failed", "passed", "failed"]), OUTCOMES.NEWLY_FAILED);
  });

  it("passed + failed + passed + failed = flaky (alternating pattern)", () => {
    assert.equal(cls(["passed", "failed", "passed", "failed"]), OUTCOMES.FLAKY);
  });

  it("failed + passed + passed + passed + failed = newly_failed (regression pattern, 5 runs)", () => {
    assert.equal(cls(["failed", "passed", "passed", "passed", "failed"]), OUTCOMES.NEWLY_FAILED);
  });

  it("passed + failed + passed = flaky (2 transitions, 3 runs)", () => {
    assert.equal(cls(["passed", "failed", "passed"]), OUTCOMES.FLAKY);
  });

  it("rapid alternation F/P/F/P across 4 runs = flaky", () => {
    assert.equal(cls(["failed", "passed", "failed", "passed"]), OUTCOMES.FLAKY);
  });

  it("rapid alternation P/F/P/F across 4 runs = flaky", () => {
    assert.equal(cls(["passed", "failed", "passed", "failed"]), OUTCOMES.FLAKY);
  });
});

// ─── Configurable minTransitions (from config.analyzer.minFailures) ───

describe("classifier — configurable minTransitions", () => {
  it("defaults to the same behavior as before when no options are passed", () => {
    assert.equal(cls(["passed", "failed", "passed"]), OUTCOMES.FLAKY);
  });

  it("a stricter threshold (3) demotes a 2-transition history out of flaky", () => {
    var r = classify(["passed", "failed", "passed"], { minTransitions: 3 });
    assert.notEqual(r.outcome, OUTCOMES.FLAKY);
    assert.equal(r.outcome, OUTCOMES.FIXED);
  });

  it("a looser threshold (1) promotes a 2-transition regression-shaped history to flaky", () => {
    // With the default threshold this exact history classifies as newly_failed (CLS-005, merged regression pattern).
    assert.equal(cls(["failed", "passed", "failed"]), OUTCOMES.NEWLY_FAILED);
    var r = classify(["failed", "passed", "failed"], { minTransitions: 1 });
    assert.equal(r.outcome, OUTCOMES.FLAKY);
    assert.equal(r.ruleId, "CLS-003");
  });

  it("a looser threshold (1) flags a single transition as flaky", () => {
    var r = classify(["passed", "passed", "failed"], { minTransitions: 1 });
    // last=failed, 1 transition >= minTransitions(1) => flaky, not newly_failed
    assert.equal(r.outcome, OUTCOMES.FLAKY);
  });
});

// ─── Edge cases ───────────────────────────────────────────────

describe("classifier — edge cases", () => {
  it("throws on empty array", () => {
    assert.throws(() => classify([]), /requires/);
  });

  it("all missing returns stable_failure (never observed a pass or fail)", () => {
    assert.equal(cls(["missing", "missing"]), OUTCOMES.STABLE_FAILURE);
  });

  it("single passed = stable_pass", () => {
    assert.equal(cls(["passed"]), OUTCOMES.STABLE_PASS);
  });

  it("single failed = newly_failed", () => {
    assert.equal(cls(["failed"]), OUTCOMES.NEWLY_FAILED);
  });

  it("skipped run alongside a pass does not count as flaky evidence", () => {
    assert.equal(cls(["skipped", "passed"]), OUTCOMES.STABLE_PASS);
  });

  it("handles interrupted with fail", () => {
    var r = classify(["failed", "interrupted", "failed"]);
    assert.ok(r);
  });

  it("handles retry-success scenario (fail then pass)", () => {
    assert.equal(cls(["failed", "passed"]), OUTCOMES.FIXED);
  });

  it("handles single missing as stable_pass", () => {
    assert.equal(cls(["missing", "passed"]), OUTCOMES.STABLE_PASS);
  });

  it("handles missing + passed + failed = flaky", () => {
    assert.equal(cls(["missing", "passed", "failed"]), OUTCOMES.NEWLY_FAILED);
  });

  it("classification reasons are present for regression", () => {
    var r = classify(["failed", "passed", "failed"]);
    assert.ok(r.reasons.length >= 3);
    assert.equal(r.ruleId, "CLS-005");
    assert.ok(
      r.reasons.some(function (rs) {
        return rs.includes("latest run");
      })
    );
  });

  it("classification reasons include transition count for flaky", () => {
    var r = classify(["passed", "failed", "passed", "failed"]);
    assert.equal(r.outcome, OUTCOMES.FLAKY);
    assert.equal(r.ruleId, "CLS-003");
    assert.ok(
      r.reasons.some(function (rs) {
        return rs.includes("transitions");
      })
    );
  });
});
