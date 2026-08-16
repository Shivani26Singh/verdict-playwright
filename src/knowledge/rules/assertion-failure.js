"use strict";

var { hasCategory } = require("./helpers");

module.exports = {
  id: "assertion-failure",
  code: "RC-003",
  priority: 3,
  pattern: "assertion",
  category: "Assertion",
  match: function (test) {
    return hasCategory(test, "assertion");
  },
  result: function () {
    return {
      likelyCause: "Expected value did not match actual value — test assertion failed",
      confidence: 80,
      severity: "medium",
      evidenceDescription: "One or more assertion errors detected in Playwright test output",
      suggestedChecks: [
        "Verify the expected value matches the current application behavior",
        "Check if the application state changed between the action and the assertion",
        "Add a wait condition before the assertion if the value depends on async operations",
        "Review recent application changes that may have altered the expected output",
        "Use Playwright's expect().toPass() for retry-able assertions on async values",
      ],
      explanation:
        "The test assertion failed. The application produced different output than expected — this could be a real application change or a timing issue where the value wasn't settled yet.",
      requiresHumanReview: false,
    };
  },
};
