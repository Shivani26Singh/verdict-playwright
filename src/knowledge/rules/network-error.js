"use strict";

var { hasCategory, matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "network-error",
  code: "RC-004",
  priority: 4,
  pattern: "network",
  category: "Network",
  match: function (test) {
    return (
      hasCategory(test, "network") ||
      matchesErrorPattern(test, /ECONNREFUSED|ECONNRESET|ERR_CONNECTION|fetch\s*failed|net::err/i)
    );
  },
  result: function () {
    return {
      likelyCause: "A network request failed — API unreachable, timeout, or DNS failure",
      confidence: 75,
      severity: "medium",
      evidenceDescription: "One or more network-level errors detected in Playwright output",
      suggestedChecks: [
        "Verify the API or service is reachable from the test environment",
        "Check for rate limiting or throttling on the endpoint",
        "Add retry logic with exponential backoff for flaky network calls",
        "Verify DNS resolution and network routing from the CI environment",
        "Check if the endpoint requires authentication or has IP restrictions",
      ],
      explanation:
        "A network call failed during the test. This could be a transient infrastructure issue, rate limiting, or the target service being unavailable.",
      requiresHumanReview: false,
    };
  },
};
