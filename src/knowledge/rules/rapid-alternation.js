"use strict";

var { isRapidAlternation } = require("./helpers");

module.exports = {
  id: "rapid-alternation",
  code: "RC-006",
  priority: 6,
  pattern: "rapid alternation",
  category: "Stability",
  match: function (test) {
    return isRapidAlternation(test);
  },
  result: function () {
    return {
      likelyCause:
        "Race condition or async timing issue — the test outcome depends on execution order",
      confidence: 70,
      severity: "high",
      evidenceDescription:
        "Test alternates between PASS and FAIL across runs with no stable period (3+ transitions)",
      suggestedChecks: [
        "Add explicit waitForSelector before interacting with elements that may load asynchronously",
        "Use expect().toPass() for assertions on values that may take time to settle",
        "Check for unhandled promise rejections or floating promises in the test code",
        "Verify test isolation — this test may depend on state from a previous test",
        "Run the test in isolation 20 times to establish the true failure rate",
      ],
      explanation:
        "When a test flips between PASS and FAIL with no discernible pattern, the most common cause is a race condition between the test's actions and the application's async behavior.",
      requiresHumanReview: false,
    };
  },
};
