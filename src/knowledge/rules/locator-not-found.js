"use strict";

var { matchesErrorPattern, hasCategory } = require("./helpers");

module.exports = {
  id: "locator-not-found",
  code: "RC-002",
  priority: 2,
  pattern: "locator",
  category: "Locator",
  match: function (test) {
    return (
      hasCategory(test, "locator") ||
      matchesErrorPattern(test, /locator.*not\s+found|no\s+such\s+element/i)
    );
  },
  result: function () {
    return {
      likelyCause: "The locator did not match any element in the DOM",
      confidence: 85,
      severity: "high",
      evidenceDescription:
        "One or more locator errors detected — the target element could not be found",
      suggestedChecks: [
        "Verify the selector is correct and matches an element in the current page state",
        "Add explicit waitForSelector before interacting with dynamic elements",
        "Check if the element is rendered conditionally (e.g., after an API call completes)",
        "Use data-testid attributes for stable, framework-agnostic selectors",
        "Inspect a Playwright trace to see the DOM state when the locator was evaluated",
      ],
      explanation:
        "The element may load asynchronously, be conditionally rendered, or have a dynamic selector that changed between test runs.",
      requiresHumanReview: false,
    };
  },
};
