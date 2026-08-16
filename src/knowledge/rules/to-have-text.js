"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "to-have-text",
  code: "RC-012",
  priority: 3,
  pattern: "toHaveText",
  category: "Assertion",
  match: function (test) {
    return matchesErrorPattern(test, /toHaveText/);
  },
  result: function () {
    return {
      likelyCause: "Expected text does not match actual text on the page",
      confidence: 85,
      severity: "medium",
      evidenceDescription:
        "toHaveText assertion failed — the element's text content did not match the expected value",
      suggestedChecks: [
        "Verify the expected text matches the current UI",
        "Confirm the application data that populates the element",
        "Check if localization or i18n changed the rendered text",
        "Review recent UI changes that may have updated labels or content",
        "Use getByRole or getByTestId for more resilient text assertions",
      ],
      explanation:
        "The test expected specific text content but the element contained different text. This is often a UI update that wasn't reflected in the test.",
      requiresHumanReview: false,
    };
  },
};
