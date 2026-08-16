const OUTCOMES = {
  STABLE_PASS: "stable_pass",
  STABLE_FAILURE: "stable_failure",
  FLAKY: "flaky",
  NEWLY_FAILED: "newly_failed",
  FIXED: "fixed",
  REGRESSION: "regression",
};

function classify(previousOutcomes, options) {
  if (!previousOutcomes || previousOutcomes.length === 0) {
    throw new Error("classify requires at least one outcome per run.");
  }

  const minTransitions =
    options && typeof options.minTransitions === "number" ? options.minTransitions : 2;

  const outcomes = previousOutcomes.map((o) => resolveOutcome(o));
  // "missing" (test not present in that run) and "skipped"/"interrupted"
  // (test present but never actually attempted a pass/fail) carry no
  // pass/fail signal — both must be excluded from classification the same
  // way, or a single skipped run gets treated as flakiness evidence even
  // when the test never failed once.
  const activeOutcomes = outcomes.filter((o) => o === "passed" || o === "failed");

  if (activeOutcomes.length === 0) {
    // Nothing but missing/skipped/interrupted across every run — never
    // executed a pass/fail attempt. Not flaky (flaky requires observed
    // passes AND failures).
    return {
      outcome: OUTCOMES.STABLE_FAILURE,
      reasons: [
        "Test never executed a pass/fail attempt across " +
          outcomes.length +
          " run(s) (missing/skipped/interrupted only)",
      ],
      ruleId: "CLS-007",
    };
  }

  if (activeOutcomes.length === 1) {
    if (activeOutcomes[0] === "passed")
      return {
        outcome: OUTCOMES.STABLE_PASS,
        reasons: ["All " + activeOutcomes.length + " active run passed"],
        ruleId: "CLS-001",
      };
    return {
      outcome: OUTCOMES.NEWLY_FAILED,
      reasons: [
        "Failed in single observed run (Run " +
          (previousOutcomes.indexOf(activeOutcomes[0]) + 1) +
          ")",
      ],
      ruleId: "CLS-004",
    };
  }

  const allPassed = activeOutcomes.every((o) => o === "passed");
  const allFailed = activeOutcomes.every((o) => o === "failed");

  if (activeOutcomes.length >= 2) {
    if (allPassed)
      return {
        outcome: OUTCOMES.STABLE_PASS,
        reasons: buildStablePassReasons(activeOutcomes, outcomes, previousOutcomes),
        ruleId: "CLS-001",
      };
    if (allFailed)
      return {
        outcome: OUTCOMES.STABLE_FAILURE,
        reasons: buildStableFailureReasons(activeOutcomes, outcomes, previousOutcomes),
        ruleId: "CLS-002",
      };
  }

  if (activeOutcomes.length === 2) {
    return classifyTwoRuns(activeOutcomes[0], activeOutcomes[1], outcomes, previousOutcomes);
  }

  return classifyManyRuns(activeOutcomes, outcomes, previousOutcomes, minTransitions);
}

function buildStablePassReasons(activeOutcomes, outcomes, original) {
  return [
    "All " +
      activeOutcomes.length +
      " runs passed" +
      (original.length !== activeOutcomes.length
        ? " (" +
          original.length +
          " total, " +
          (original.length - activeOutcomes.length) +
          " missing)"
        : ""),
  ];
}

function buildStableFailureReasons(activeOutcomes, outcomes, original) {
  return [
    "All " +
      activeOutcomes.length +
      " runs failed" +
      (original.length !== activeOutcomes.length
        ? " (" +
          original.length +
          " total, " +
          (original.length - activeOutcomes.length) +
          " missing)"
        : ""),
    "Failure reproduced consistently — not flaky",
  ];
}

function classifyTwoRuns(prev, curr, outcomes, original) {
  if (prev === "passed" && curr === "passed")
    return {
      outcome: OUTCOMES.STABLE_PASS,
      reasons: buildStablePassReasons(outcomes, outcomes, original),
      ruleId: "CLS-001",
    };
  if (prev === "failed" && curr === "failed")
    return {
      outcome: OUTCOMES.STABLE_FAILURE,
      reasons: buildStableFailureReasons(outcomes, outcomes, original),
      ruleId: "CLS-002",
    };
  if (prev === "passed" && curr === "failed")
    return {
      outcome: OUTCOMES.NEWLY_FAILED,
      reasons: ["Failed in latest run (Run 2)", "Passed in previous run (Run 1)"],
      ruleId: "CLS-004",
    };
  if (prev === "failed" && curr === "passed")
    return {
      outcome: OUTCOMES.FIXED,
      reasons: ["Passed in latest run (Run 2)", "Failed in previous run (Run 1)"],
      ruleId: "CLS-006",
    };
  if (prev !== "passed" && curr !== "passed") {
    // Neither run passed (e.g. failed+skipped, skipped+skipped) — no pass was
    // ever observed, so this isn't flaky, it's a consistent (non-)failure.
    return {
      outcome: OUTCOMES.STABLE_FAILURE,
      reasons: ["No pass observed across active runs"],
      ruleId: "CLS-007",
    };
  }
  return { outcome: OUTCOMES.FLAKY, reasons: [], ruleId: "CLS-003" };
}

function classifyManyRuns(outcomes, allOutcomes, original, minTransitions) {
  const last = outcomes[outcomes.length - 1];
  const hasPass = outcomes.some((o) => o === "passed");
  const hasFail = outcomes.some((o) => o === "failed");

  let transitions = 0;
  for (let i = 1; i < outcomes.length; i++) {
    if (
      (outcomes[i - 1] === "passed" && outcomes[i] === "failed") ||
      (outcomes[i - 1] === "failed" && outcomes[i] === "passed")
    ) {
      transitions++;
    }
  }

  // "Regression" (failed → passed (was fixed) → failed again) is reported as
  // Newly Failing, not a separate bucket — both mean "this test is broken
  // right now and wasn't a moment ago." Guarded to one more transition than
  // the flaky threshold, so a "clean" re-break (low noise) still wins over
  // flaky, but noisier histories fall through to flaky instead. The reasons
  // still call out the "previously fixed" context so that signal isn't lost.
  if (hasPass && hasFail && transitions < minTransitions + 1 && hasRegressionPattern(outcomes)) {
    return {
      outcome: OUTCOMES.NEWLY_FAILED,
      reasons: buildRegressionReasons(outcomes, last, transitions),
      ruleId: "CLS-005",
    };
  }

  // Flaky: alternation pattern with minTransitions+ transitions = unstable
  if (hasPass && hasFail && transitions >= minTransitions) {
    return {
      outcome: OUTCOMES.FLAKY,
      reasons: [
        transitions + " transitions between pass and fail across " + outcomes.length + " runs",
        "Outcome alternates across runs — no stable pattern detected",
      ],
      ruleId: "CLS-003",
    };
  }

  if (last === "failed" && hasPass && hasFail) {
    return {
      outcome: OUTCOMES.NEWLY_FAILED,
      reasons: [
        "Failed in latest run (Run " + outcomes.length + ")",
        "Passed in " +
          outcomes.filter(function (o) {
            return o === "passed";
          }).length +
          " previous run(s)",
      ],
      ruleId: "CLS-004",
    };
  }

  if (last === "passed" && hasPass && hasFail) {
    var failCount = outcomes.filter(function (o) {
      return o === "failed";
    }).length;
    return {
      outcome: OUTCOMES.FIXED,
      reasons: [
        "Passed in latest run (Run " + outcomes.length + ")",
        "Failed in " + failCount + " previous run(s)",
      ],
      ruleId: "CLS-006",
    };
  }

  if (!hasPass) {
    return {
      outcome: OUTCOMES.STABLE_FAILURE,
      reasons: ["No pass observed across " + outcomes.length + " active runs"],
      ruleId: "CLS-007",
    };
  }

  return { outcome: OUTCOMES.FLAKY, reasons: [], ruleId: "CLS-003" };
}

function buildRegressionReasons(outcomes, last, transitions) {
  var reasons = [];
  reasons.push("Failed in latest run (Run " + outcomes.length + ")");

  // Find the last pass before the final failure
  for (var i = outcomes.length - 2; i >= 0; i--) {
    if (outcomes[i] === "passed") {
      reasons.push("Passed in previous run (Run " + (i + 1) + ")");
      break;
    }
  }

  // Check if there was a fix (fail → pass) before the regression
  var wasFixed = false;
  for (var j = 1; j < outcomes.length; j++) {
    if (outcomes[j - 1] === "failed" && outcomes[j] === "passed") {
      wasFixed = true;
      break;
    }
  }
  if (wasFixed) {
    reasons.push("Was previously fixed — had transitioned from fail to pass");
  }
  reasons.push("Pattern matches regression: fixed test failed again");
  return reasons;
}

function hasRegressionPattern(outcomes) {
  const last = outcomes[outcomes.length - 1];
  if (last !== "failed") return false;

  let wasFixed = false;

  for (let i = 1; i < outcomes.length; i++) {
    const prev = outcomes[i - 1];
    const curr = outcomes[i];

    if ((prev === "failed" || prev === "missing") && curr === "passed") {
      wasFixed = true;
      continue;
    }

    if (wasFixed && curr === "failed") {
      return true;
    }
  }

  return false;
}

function resolveOutcome(outcome) {
  if (outcome === "passed" || outcome === "expected") return "passed";
  if (outcome === "failed" || outcome === "timedOut" || outcome === "unexpected") return "failed";
  if (outcome === "skipped") return "skipped";
  if (outcome === "interrupted") return "interrupted";
  if (outcome === "missing") return "missing";
  if (outcome === "unknown") return "failed";
  return "failed";
}

module.exports = { classify, OUTCOMES, resolveOutcome };
