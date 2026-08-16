"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "element-not-visible",
  code: "RC-008",
  priority: 2,
  pattern: "element is not visible",
  category: "Locator",
  match: function (test) {
    return matchesErrorPattern(test, /element\s+is\s+not\s+visible/);
  },
  result: function () {
    return {
      likelyCause: "Element exists in the DOM but is not visible — timing or rendering issue",
      confidence: 80,
      severity: "medium",
      evidenceDescription:
        "Playwright found the element but it was not visible when the test tried to interact with it",
      suggestedChecks: [
        "Verify the element's visibility before interaction (waitForSelector with visible:true)",
        "Review CSS animations or transitions that delay visibility",
        "Check if the element is inside a hidden parent container",
        "Use Playwright's auto-waiting — ensure assertions use locator-based methods",
        "Consider using toBeVisible() assertion before interaction",
      ],
      explanation:
        "Playwright located the element in the DOM but it was hidden (display:none, visibility:hidden, zero dimensions, or outside viewport). This is typically a timing issue where the element hasn't finished rendering.",
      requiresHumanReview: false,
    };
  },
};
