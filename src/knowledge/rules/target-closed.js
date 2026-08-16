"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "target-closed",
  code: "RC-020",
  priority: 4,
  pattern: "Target closed",
  category: "Environment",
  match: function (test) {
    return matchesErrorPattern(test, /target\s+closed|browser\s+has\s+been\s+closed|page\.close/i);
  },
  result: function () {
    return {
      likelyCause: "The browser or page was unexpectedly closed during test execution",
      confidence: 80,
      severity: "high",
      evidenceDescription:
        "Playwright detected that the browser target was closed before the test completed",
      suggestedChecks: [
        "Review browser crash logs or console output for the run",
        "Check CI runner memory usage — low memory can force browser termination",
        "Verify that no test code explicitly calls page.close() or browser.close() prematurely",
        "Check if tests running in parallel are interfering with each other's browser contexts",
        "Review for uncaught exceptions in page event handlers that might crash the page",
      ],
      explanation:
        "The browser page or context was closed before Playwright finished interacting with it. This can happen due to memory pressure, crashes, or incorrect test cleanup.",
      requiresHumanReview: false,
    };
  },
};
