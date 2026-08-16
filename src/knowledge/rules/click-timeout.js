"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "click-timeout",
  code: "RC-009",
  // Must run before the broad timeout-error rule (priority 1); its regex matches "timeout"/
  // "exceeded" and would otherwise shadow this more specific click-timeout rule. The narrow
  // regex below only matches click-related timeouts, so evaluating it first is safe.
  priority: 0,
  pattern: "locator.click timeout",
  category: "Locator",
  match: function (test) {
    return matchesErrorPattern(test, /locator\.click.*timeout|\.click.*timed\s*out/i);
  },
  result: function () {
    return {
      likelyCause: "Element was present but not ready for interaction when clicked",
      confidence: 85,
      severity: "high",
      evidenceDescription:
        "Playwright timed out waiting for the element to become actionable before clicking",
      suggestedChecks: [
        "Wait for the element to be enabled before clicking (locator.isEnabled)",
        "Review loading indicators or spinners that block interaction",
        "Check if the element is covered by another element (overlay, modal, toast)",
        "Verify the element is not animating when the click is attempted",
        "Use { force: true } temporarily to diagnose if an overlay is blocking",
      ],
      explanation:
        "Playwright auto-waits for elements to be stable, visible, enabled, and not covered. The click timed out because one of these conditions was not met within the timeout.",
      requiresHumanReview: false,
    };
  },
};
