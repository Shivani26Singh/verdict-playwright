"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "http-500",
  code: "RC-018",
  priority: 4,
  pattern: "500",
  category: "Network",
  match: function (test) {
    return matchesErrorPattern(test, /\b500\b/);
  },
  result: function () {
    return {
      likelyCause: "Internal server error — the backend encountered an unexpected condition",
      confidence: 85,
      severity: "high",
      evidenceDescription: "Server returned HTTP 500 Internal Server Error",
      suggestedChecks: [
        "Review backend logs for the error stack trace",
        "Verify the service is running and healthy in the target environment",
        "Check if a recent deployment introduced a regression",
        "Verify database connectivity and query performance",
        "Check downstream service dependencies that may have failed",
      ],
      explanation:
        "The backend server threw an unhandled error. This is a server-side issue that requires investigation of backend logs and service health.",
      requiresHumanReview: false,
    };
  },
};
