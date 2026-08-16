"use strict";

var { buildEvidenceJson } = require("./investigation-prompt");

/**
 * Build an investigation prompt that instructs the AI to return ONLY valid JSON.
 * Reuses the evidence extraction from investigation-prompt.js.
 *
 * @param {Object} analysis - Full analyzer result from analyzer/engine.js compare()
 * @returns {string} Complete prompt string ready for an LLM
 */
function buildInvestigationJsonPrompt(analysis) {
  var evidence = buildEvidenceJson(analysis);
  var evidenceStr = JSON.stringify(evidence, null, 2);

  var prompt = [
    "You are a Senior QA Engineer specializing in Playwright test reliability.",

    "",
    "## Critical Instruction",
    "",
    "You MUST respond with ONLY valid JSON. No markdown. No code fences. No",
    "explanations before or after the JSON. Your entire response must be parseable",
    "by JSON.parse().",

    "",
    "## Context",
    "",
    "The deterministic analysis has already been completed by the Playwright Flaky",
    "Reporter. Do NOT repeat or recompute it. Your responsibility is to interpret",
    "the evidence and provide engineering insights.",

    "",
    "## Rules",
    "",
    "1. Base every conclusion ONLY on the supplied evidence. Never invent facts.",
    "2. If the evidence is insufficient to determine a root cause, say so explicitly.",
    "3. Always explain WHY — connect observations to conclusions with reasoning.",
    "4. Think like an experienced QA Lead investigating a flaky CI failure.",
    '5. Avoid vague statements like "investigate further," "check logs," "review code,"',
    '   or "possible timing issue" — instead explain specifically what to investigate and why.',
    "6. Reference specific tests, error patterns, and statistical trends from the evidence.",

    "",
    "## JSON Output Schema",
    "",
    "Return a single JSON object with EXACTLY these keys. All keys are required.",
    "Use empty strings for sections with no content. Use empty arrays for lists.",
    "",
    "{",
    '  "executiveSummary": "String — one paragraph summarizing the suite health and key findings.",',
    '  "suiteHealth": "String — detailed assessment of overall suite health, trends, and stability.",',
    '  "flakyTests": [',
    "    {",
    '      "name": "String — test title",',
    '      "issue": "String — explanation of why this test is flaky",',
    '      "fix": "String — recommended fix"',
    "    }",
    "  ],",
    '  "consistentFailures": [',
    "    {",
    '      "name": "String — test title",',
    '      "issue": "String — explanation of the failure pattern",',
    '      "fix": "String — recommended fix"',
    "    }",
    "  ],",
    '  "browserAnalysis": "String — comparison of failure patterns across browsers.",',
    '  "failureTrends": "String — analysis of how failure rates changed across runs.",',
    '  "rootCauseAnalysis": [',
    "    {",
    '      "name": "String — descriptive label for this root cause category",',
    '      "issue": "String — detailed explanation of the root cause",',
    '      "fix": "String — recommended fix for this root cause"',
    "    }",
    "  ],",
    '  "confidenceAssessment": "String — narrative confidence assessment with reasoning.",',
    '  "recommendedActions": ["String — actionable recommendation 1", "String — recommendation 2", "..."],',
    '  "debuggingPlan": ["String — step 1", "String — step 2", "..."]',
    "}",

    "",
    "## Example JSON Output",
    "",
    "Here is the exact structure your response must follow:",
    "",
    "{",
    '  "executiveSummary": "The test suite of 8 tests across 3 runs has a 72% pass rate with 1 flaky test. Timeout errors dominate the failure landscape.",',
    '  "suiteHealth": "Health Score: 50/100. The pass rate declined from 85.7% to 62.5% across 3 runs, indicating active instability.",',
    '  "flakyTests": [',
    '    { "name": "Checkout › purchase", "issue": "Timeout on button#submit-payment. PASS → FAIL → PASS. Retry succeeded.", "fix": "Increase waitForSelector timeout from 5s to 15s." }',
    "  ],",
    '  "consistentFailures": [',
    '    { "name": "Login › invalid credentials", "issue": "REGRESSION: FAILED → PASSED → FAILED. Both failures are timeout-related.", "fix": "Add waitForResponse on login API call before asserting error message." }',
    "  ],",
    '  "browserAnalysis": "Chromium: 26.7% fail rate. Firefox: 33.3%. Failures are not browser-specific.",',
    '  "failureTrends": "Pass rate dropped from 85.7% to 62.5%. Run 2 had a 3x duration spike suggesting CI resource contention.",',
    '  "rootCauseAnalysis": [',
    '    { "name": "Timeout failures (3 tests)", "issue": "Default Playwright timeouts are too aggressive for this CI environment. Duration spike in Run 2 corroborates environment instability.", "fix": "Increase global CI timeout from 30s to 45s." }',
    "  ],",
    '  "confidenceAssessment": "Medium confidence. Timeout pattern is clear but exact trigger needs a Playwright trace to confirm.",',
    '  "recommendedActions": ["Increase default CI timeouts from 30s to 45s", "Replace fixed waitForTimeout with assertion-based waits"],',
    '  "debuggingPlan": ["Review Playwright trace for the failing checkout run", "Inspect network waterfall for checkout API call", "Compare CI machine metrics between passing and failing runs"]',
    "}",

    "",
    "## Deterministic Analysis",
    "",
    "```json",
    evidenceStr,
    "```",

    "",
    "Remember: Respond with ONLY the JSON object. No markdown. No code fences.",
    "No backticks. Just the raw JSON starting with { and ending with }.",
  ].join("\n");

  return prompt;
}

module.exports = { buildInvestigationJsonPrompt };
