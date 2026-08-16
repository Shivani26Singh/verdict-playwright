"use strict";

var { matchesErrorPattern } = require("./helpers");

module.exports = {
  id: "strict-mode-violation",
  code: "RC-011",
  priority: 2,
  pattern: "strict mode violation",
  category: "Locator",
  match: function (test) {
    return matchesErrorPattern(
      test,
      /strict\s+mode\s+violation|locator\s+resolved\s+to\s+\d+\s+elements|multiple\s+elements/i
    );
  },
  result: function () {
    return {
      likelyCause:
        "The locator matched multiple elements — Playwright's strict mode requires a single match",
      confidence: 90,
      severity: "medium",
      evidenceDescription:
        "Playwright's strict mode rejected the locator because it resolved to more than one element",
      suggestedChecks: [
        "Use a more specific locator that uniquely identifies the target element",
        "Prefer getByRole, getByLabel, or getByTestId over generic text/CSS selectors",
        "Use .first() or .nth() if multiple matches are expected but only one should be targeted",
        "Check if the page conditionally renders duplicate elements (e.g. mobile + desktop versions)",
        "Verify the locator string for typos or overly broad selectors",
      ],
      explanation:
        "Playwright's strict mode requires locators to resolve to exactly one element. When multiple elements match, it throws this error to prevent accidental interaction with the wrong element.",
      requiresHumanReview: false,
    };
  },
};
