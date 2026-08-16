"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "element-detached",
  code: "RC-010",
  priority: 2,
  pattern: "element detached",
  category: "Locator",
  match: function (test) {
    return matchesErrorPattern(test, /element\s+is\s+detached|detached\s+from\s+the\s+DOM/i);
  },
  result: function () {
    return {
      likelyCause:
        "The element was removed from the DOM and re-rendered between location and interaction",
      confidence: 85,
      severity: "medium",
      evidenceDescription:
        "Playwright found the element but it was removed from the DOM before the action completed",
      suggestedChecks: [
        "Re-locate the element after DOM updates before interacting",
        "Check if React/Vue/Svelte is re-rendering the component during the test",
        "Use locator-based queries instead of element handles (elementHandle is stale after re-render)",
        "Add a waitForSelector after actions that trigger DOM updates",
        "Verify that state changes (loading → loaded) don't replace the target element",
      ],
      explanation:
        "The element was found in the DOM but a framework re-render replaced it before Playwright could complete the action. The element reference became stale.",
      requiresHumanReview: false,
    };
  },
};
