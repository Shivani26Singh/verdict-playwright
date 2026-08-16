"use strict";

module.exports = {
  id: "generic-failure",
  code: "RC-007",
  priority: 100,
  pattern: "Unknown",
  category: "Unknown",
  match: function (test) {
    return !!test;
  },
  result: function () {
    return {
      likelyCause:
        "Could not confidently determine a specific root cause — this failure needs a manual look",
      confidence: 20,
      severity: "medium",
      evidenceDescription: "Test failed but did not match any specific Playwright failure pattern",
      suggestedChecks: [
        "Review the complete stack trace for clues about the failure origin",
        "Inspect the Playwright trace for the failing run",
        "Review screenshots captured during the failure",
        "Check the test runner logs for warnings or errors before the failure",
        "Compare the passing and failing runs side by side",
      ],
      explanation:
        "This test failed with an error that doesn't match any known Playwright pattern. Manual investigation with traces and screenshots is the best next step.",
      requiresHumanReview: true,
    };
  },
};
