"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "http-401",
  code: "RC-015",
  priority: 4,
  pattern: "401",
  category: "Authentication",
  match: function (test) {
    return matchesErrorPattern(test, /\b401\b/);
  },
  result: function () {
    return {
      likelyCause: "Authentication required — the request was not authenticated",
      confidence: 85,
      severity: "high",
      evidenceDescription: "Server returned HTTP 401 Unauthorized",
      suggestedChecks: [
        "Verify the login flow completed successfully before this request",
        "Check if the auth token or session cookie is valid and not expired",
        "Verify that the test's authentication setup (beforeEach, storageState) is working",
        "Check if the token refresh mechanism is functioning correctly",
        "Review the auth service logs for failed authentication attempts",
      ],
      explanation:
        "The server rejected the request as unauthenticated. The test's authentication state (tokens, cookies, storageState) may have expired or not been set up correctly.",
      requiresHumanReview: false,
    };
  },
};
