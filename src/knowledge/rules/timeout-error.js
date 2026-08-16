"use strict";

var { matchesErrorPattern, hasCategory } = require("./helpers");

module.exports = {
  id: "timeout-error",
  code: "RC-001",
  priority: 1,
  pattern: "TimeoutError",
  category: "Timeout",
  match: function (test) {
    return (
      matchesErrorPattern(test, /timeout|timed\s*out|exceeded/i) || hasCategory(test, "timeout")
    );
  },
  result: function () {
    return {
      likelyCause: "Page or API response too slow",
      confidence: 90,
      severity: "high",
      evidenceDescription: "TimeoutError detected in Playwright error output",
      suggestedChecks: [
        "Check backend response time for the failing operation",
        "Verify timeout configuration in playwright.config.js",
        "Review network latency between test runner and application",
        "Check if the element relies on an async API call before rendering",
        "Inspect Playwright trace for the exact operation that timed out",
      ],
      explanation:
        "Playwright timed out waiting for a condition — the page, element, or network request did not complete within the configured timeout.",
      requiresHumanReview: false,
    };
  },
};
