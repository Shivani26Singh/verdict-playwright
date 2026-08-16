"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "http-403",
  code: "RC-016",
  priority: 4,
  pattern: "403",
  category: "Authentication",
  match: function (test) {
    return matchesErrorPattern(test, /\b403\b/);
  },
  result: function () {
    return {
      likelyCause: "Authorization denied — the authenticated user lacks required permissions",
      confidence: 85,
      severity: "high",
      evidenceDescription: "Server returned HTTP 403 Forbidden",
      suggestedChecks: [
        "Verify the test user has the required role/permissions for this endpoint",
        "Check if permissions were recently changed or the user was deactivated",
        "Review the authorization middleware or RBAC configuration",
        "Verify the correct test user is being used (not a lower-privilege account)",
        "Check if multi-factor authentication is required for this action",
      ],
      explanation:
        "The server accepted the authentication but denied access. The test user has insufficient permissions or the resource has access controls that the test does not satisfy.",
      requiresHumanReview: false,
    };
  },
};
