"use strict";

module.exports = {
  id: "always-fails",
  code: "RC-005",
  priority: 5,
  pattern: "consistent failure",
  category: "Stability",
  match: function (test) {
    if (!test || !test.history || test.history.length === 0) return false;
    var fails = (test.history || []).filter(function (h) {
      return h === "failed";
    }).length;
    return fails >= test.history.length * 0.9;
  },
  result: function () {
    return {
      likelyCause: "Test is consistently broken — not flaky, genuinely failing",
      confidence: 95,
      severity: "critical",
      evidenceDescription:
        "Test fails in 90% or more of runs — this is a real failure, not instability",
      suggestedChecks: [
        "Investigate the root cause — this is not flakiness, it's a deterministic failure",
        "Review recent code changes in the feature or shared dependencies",
        "Run the test locally with Playwright trace viewer to inspect the failure",
        "Check if the test environment is misconfigured (wrong URL, missing services)",
        "Verify the test data setup — the data the test depends on may no longer exist",
      ],
      explanation:
        "This test fails in almost every run. It is not flaky — it has a real, consistent bug or the test itself is broken.",
      requiresHumanReview: true,
    };
  },
};
