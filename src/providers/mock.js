"use strict";

const { withProvider } = require("../investigation/interface");

const mockProvider = {
  name: "mock",
  investigate: async function ({ test, context, ruleResult }) {
    return withProvider("mock", {
      likelyCause: "Investigation pending (no investigation provider configured)",
      confidence: 0,
      severity: "low",
      evidence: "Configure an investigation provider for detailed analysis.",
      possibleFixes: [
        "Run tests locally with trace viewer",
        "Review Playwright trace for this test",
      ],
      explanation: "This is a placeholder. Rule engine results are displayed above.",
      requiresHumanReview: true,
    });
  },
};

module.exports = mockProvider;
