"use strict";

var RULES = require("../knowledge/rules");
var { withProvider, InvestigationResult } = require("./interface");

function runRules(flakyTest) {
  if (!flakyTest) return null;

  for (var i = 0; i < RULES.length; i++) {
    var rule = RULES[i];
    if (rule.match(flakyTest)) {
      var rf = rule.result();
      // Map evidenceDescription → evidence if needed
      if (!rf.evidence && rf.evidenceDescription) {
        rf.evidence = rf.evidenceDescription;
      }
      rf.possibleFixes = rf.possibleFixes || rf.suggestedChecks || [];
      var result = InvestigationResult(rf);
      return withProvider("rule-engine", {
        likelyCause: result.likelyCause,
        confidence: calculateConfidence(
          rf.confidence,
          flakyTest.history || [],
          flakyTest.fingerprintCount || 0,
          flakyTest.runCount || 0
        ),
        severity: result.severity,
        evidence: result.evidence,
        possibleFixes: result.possibleFixes,
        suggestedChecks: rf.suggestedChecks || [],
        explanation: result.explanation,
        requiresHumanReview: result.requiresHumanReview,
        category: rf.category || rule.category || null,
        errorPattern: rf.pattern || rule.pattern || null,
        ruleId: rule.id || null,
        ruleCode: rule.code || null,
        baseConfidence: rf.confidence,
      });
    }
  }

  return null;
}

/**
 * Calculate dynamic confidence from base confidence + evidence adjustments.
 *
 * Formula: finalConfidence = clamp(baseConfidence + adjustments, 10, 99)
 *
 * Adjustment rules:
 *   A1: +5  — history consistent (all same outcome)
 *   A2: -10 — 3+ transitions in history (high noise)
 *   A3: +3  — at least one retry succeeded (recovery evidence)
 *   A4: -5  — all retries failed (no recovery)
 *   A5: +8  — 3+ other tests share same fingerprint (corroborated)
 *   A6: +4  — 1-2 other tests share same fingerprint (some corroboration)
 *   A7: -3  — only test with this fingerprint (isolated)
 *   A8: -5  — 2 or fewer runs analyzed (limited data)
 *   A9: +5  — 5+ runs and pattern is stable (strong statistical basis)
 *
 * @param {number} baseConfidence — rule author's base assessment (0-100)
 * @param {Array<string>} history — ["passed", "failed", ...]
 * @param {number} fingerprintCount — how many other tests share same fingerprint
 * @param {number} totalRuns — total runs analyzed
 * @returns {number} — clamped between 10 and 99
 */
/**
 * Evaluate A1-A9 against this test's evidence and return the list of
 * adjustments that actually fired — each with its rule code, delta, and a
 * plain-language reason. Shared by calculateConfidence() (numeric result)
 * and explainConfidence() (numeric result + the reasons behind it).
 */
function computeAdjustments(history, fingerprintCount, totalRuns) {
  var adjustments = [];

  // A1: History consistent — all same outcome
  var outcomes = (history || []).filter(function (o) {
    return o !== "missing";
  });
  var allSame =
    outcomes.length > 1 &&
    outcomes.every(function (o) {
      return o === outcomes[0];
    });
  if (allSame) {
    adjustments.push({
      code: "A1",
      delta: 5,
      reason: "History is fully consistent — every run had the same outcome",
    });
  }

  // A2: 3+ transitions — high noise
  var transitions = 0;
  for (var i = 1; i < outcomes.length; i++) {
    if (
      (outcomes[i - 1] === "passed" && outcomes[i] === "failed") ||
      (outcomes[i - 1] === "failed" && outcomes[i] === "passed")
    ) {
      transitions++;
    }
  }
  if (transitions >= 3) {
    adjustments.push({
      code: "A2",
      delta: -10,
      reason: transitions + " pass/fail transitions in history (high noise)",
    });
  }

  // A3/A4: Retry behavior — approximated from history patterns
  // In the current data model, history shows final outcome per run (after retries).
  // If a failure appears in history, retries didn't recover for that run.
  var failCount = outcomes.filter(function (o) {
    return o === "failed";
  }).length;
  if (transitions > 0 && failCount > 0) {
    // Mixed: some runs recovered, some didn't — retries helped sometimes
    adjustments.push({
      code: "A3",
      delta: 3,
      reason: "Mixed results — recovered on retry in at least one run",
    });
  } else if (failCount === outcomes.length && outcomes.length > 0) {
    // All failed: retries never recovered
    adjustments.push({ code: "A4", delta: -5, reason: "Every run failed — no recovery observed" });
  }

  // A5/A6/A7: Fingerprint corroboration
  if (fingerprintCount >= 3) {
    adjustments.push({
      code: "A5",
      delta: 8,
      reason: fingerprintCount + " other tests share this exact failure fingerprint (corroborated)",
    });
  } else if (fingerprintCount >= 1) {
    adjustments.push({
      code: "A6",
      delta: 4,
      reason:
        fingerprintCount + " other test(s) share this failure fingerprint (some corroboration)",
    });
  } else {
    adjustments.push({
      code: "A7",
      delta: -3,
      reason: "No other test shares this failure fingerprint (isolated)",
    });
  }

  // A8: Limited data — 2 or fewer runs
  if (totalRuns <= 2) {
    adjustments.push({
      code: "A8",
      delta: -5,
      reason: "Only " + totalRuns + " run(s) analyzed (limited data)",
    });
  }

  // A9: Strong statistical basis — 5+ runs and stable
  if (totalRuns >= 5 && allSame) {
    adjustments.push({
      code: "A9",
      delta: 5,
      reason: totalRuns + "+ runs analyzed with a consistent pattern (strong statistical basis)",
    });
  }

  return adjustments;
}

function calculateConfidence(baseConfidence, history, fingerprintCount, totalRuns) {
  var adjustments = computeAdjustments(history, fingerprintCount, totalRuns);
  var adj = adjustments.reduce(function (sum, a) {
    return sum + a.delta;
  }, 0);

  var final = baseConfidence + adj;
  if (final < 10) final = 10;
  if (final > 99) final = 99;
  return final;
}

/**
 * Same calculation as calculateConfidence(), but returns the full breakdown
 * (base + each adjustment that fired + whether clamping kicked in) so a UI
 * can explain *why* a test landed at a given confidence percentage.
 */
function explainConfidence(baseConfidence, history, fingerprintCount, totalRuns) {
  var adjustments = computeAdjustments(history, fingerprintCount, totalRuns);
  var adjTotal = adjustments.reduce(function (sum, a) {
    return sum + a.delta;
  }, 0);
  var rawFinal = baseConfidence + adjTotal;
  var finalConfidence = Math.max(10, Math.min(99, rawFinal));

  return {
    baseConfidence: baseConfidence,
    adjustments: adjustments,
    adjustmentTotal: adjTotal,
    finalConfidence: finalConfidence,
    clamped: finalConfidence !== rawFinal,
  };
}

module.exports = { runRules, calculateConfidence, explainConfidence };
