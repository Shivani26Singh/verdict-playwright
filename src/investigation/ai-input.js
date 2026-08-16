"use strict";

/**
 * Builders for the offline AI workflow's two exported artifacts:
 *   - AI_INPUT.json  — the curated evidence JSON (what the model reasons over)
 *   - AI_PROMPT.md   — a human-readable, paste-ready prompt that embeds the
 *                      evidence and asks for the AI-investigation JSON schema
 *
 * These are the input side of the offline loop; the model's response is saved
 * as ai-investigation.json and fed back via `--ai-investigation`.
 */
var { buildEvidenceJson } = require("../prompts/investigation-prompt");
var { buildInvestigationJsonPrompt } = require("../prompts/investigation-json-prompt");
var { PROMPT_VERSION } = require("./ai-schema");

/** The curated evidence object sent to (or exported for) the AI. */
function buildAiInput(analysis) {
  return buildEvidenceJson(analysis);
}

/**
 * The self-contained AI_PROMPT.md: workflow instructions + the JSON-output
 * prompt (which embeds the evidence). Reuses the existing, tested prompt
 * builder so the offline and network paths ask for the identical schema.
 */
function buildAiPromptMarkdown(analysis) {
  var lines = [
    "# AI Investigation — Prompt (offline workflow)",
    "",
    "_Prompt version: " + PROMPT_VERSION + "_",
    "",
    "This file pairs with **AI_INPUT.json** (the same evidence, standalone). To enrich",
    "the deterministic analysis with AI interpretation, without the analyzer making any",
    "network call:",
    "",
    "1. Copy the prompt inside the code block below into your LLM (Claude, Copilot, Gemini, ...).",
    "2. Save the model's JSON response as `ai-investigation.json`.",
    "3. Re-run the analyzer with `--ai-investigation ai-investigation.json`.",
    "",
    "The response must be a single JSON object matching the schema described in the prompt.",
    "It enriches the report — it never changes the deterministic classification, rules, or confidence.",
    "",
    "---",
    "",
    "```",
    buildInvestigationJsonPrompt(analysis),
    "```",
    "",
  ];
  return lines.join("\n");
}

module.exports = { buildAiInput, buildAiPromptMarkdown };
