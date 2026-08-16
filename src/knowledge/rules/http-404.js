"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "http-404",
  code: "RC-017",
  priority: 4,
  pattern: "404",
  category: "Network",
  match: function (test) {
    return matchesErrorPattern(test, /\b404\b/);
  },
  result: function () {
    return {
      likelyCause: "The requested endpoint or page was not found",
      confidence: 85,
      severity: "medium",
      evidenceDescription: "Server returned HTTP 404 Not Found",
      suggestedChecks: [
        "Verify the URL or API endpoint is correct",
        "Check if the resource was removed or renamed in a recent deployment",
        "Verify that the route exists in the application's routing configuration",
        "Check if the resource ID in the URL is valid and exists in the database",
        "Confirm the deployment includes the expected route/endpoint",
      ],
      explanation:
        "The server could not find the requested resource. This could be a broken URL, a removed endpoint, or a resource that doesn't exist in the test data.",
      requiresHumanReview: false,
    };
  },
};
