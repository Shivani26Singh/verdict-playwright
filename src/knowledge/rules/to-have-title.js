"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "to-have-title",
  code: "RC-013",
  priority: 3,
  pattern: "toHaveTitle",
  category: "Assertion",
  match: function (test) {
    return matchesErrorPattern(test, /toHaveTitle/);
  },
  result: function () {
    return {
      likelyCause: "Expected title does not match actual page title",
      confidence: 85,
      severity: "medium",
      evidenceDescription:
        "toHaveTitle assertion failed — the page title did not match the expected value",
      suggestedChecks: [
        "Verify the expected title against the current page",
        "Review the application's document.title or <title> tag",
        "Check if a redirect changed the page before the title assertion",
        "Verify the title after navigation completes (use waitForURL first)",
        "Confirm no client-side routing changed the page title dynamically",
      ],
      explanation:
        "The browser's page title did not match what the test expected. This can happen after redirects, SPA navigation, or when the title is set asynchronously.",
      requiresHumanReview: false,
    };
  },
};
