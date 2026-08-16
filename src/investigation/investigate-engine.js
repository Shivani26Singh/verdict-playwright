"use strict";

const { runRules } = require("./rule-engine");
const { getProvider } = require("../providers");

async function investigate(flakyTest, options) {
  options = options || {};

  const ruleResult = runRules(flakyTest);

  var providerResult = null;
  if (options.provider) {
    const provider = getProvider(options.provider);
    try {
      providerResult = await provider.investigate({
        test: flakyTest,
        context: options.context || {},
        ruleResult: ruleResult ? ruleResult.result : null,
      });
    } catch (err) {
      providerResult = {
        provider: options.provider,
        result: {
          likelyCause: "Investigation provider error",
          confidence: 0,
          severity: "low",
          evidence: err.message,
          possibleFixes: ["Try again or use a different provider"],
          explanation: "The investigation provider encountered an error.",
          requiresHumanReview: true,
        },
      };
    }
  }

  return {
    ruleBased: ruleResult,
    providerResult: providerResult,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { investigate };
