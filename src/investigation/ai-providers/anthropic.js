"use strict";

/**
 * Network reference adapter — Anthropic / Claude.
 *
 * The single opt-in network provider bundled in v1.0.0, proving the pluggable
 * seam. It calls the Claude Messages API over Node's built-in fetch (no SDK
 * dependency — the two-dependency footprint is preserved) with the API key
 * read ONLY from the ANTHROPIC_API_KEY environment variable (never from config
 * files). The orchestrator has already built and (by default) redacted the
 * prompt string, so this adapter neither builds the payload nor scrubs it — it
 * transmits the exact prompt it is handed and returns the parsed JSON overlay
 * for the orchestrator to validate.
 *
 * NOTE: this is the only provider that sends data off the machine. It runs
 * only when the user explicitly selects `--investigate anthropic`.
 */
var DEFAULT_MODEL = "claude-opus-4-8";
var API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Pull the first balanced JSON object out of an LLM response, tolerating any
 * stray prose the model may add despite the "JSON only" instruction.
 */
function extractJsonObject(text) {
  if (typeof text !== "string") throw new Error("Empty model response");
  var start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in model response");
  var depth = 0;
  var inStr = false;
  var esc = false;
  for (var i = start; i < text.length; i++) {
    var ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') {
      inStr = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("Unterminated JSON object in model response");
}

module.exports = {
  name: "anthropic",
  mode: "network",
  async investigate(ctx) {
    ctx = ctx || {};
    var options = ctx.options || {};
    var prompt = ctx.prompt;
    if (typeof fetch !== "function") {
      throw new Error(
        "Global fetch is unavailable — Node.js >= 18 is required for the anthropic provider"
      );
    }
    var apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    if (!prompt) {
      throw new Error("anthropic provider received no prompt to send");
    }
    var model = options.model || DEFAULT_MODEL;

    var res;
    try {
      // globalThis.fetch — built in on Node 18+; referenced via globalThis so
      // no lint global declaration is needed.
      res = await globalThis.fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        // No temperature/top_p/top_k — those return 400 on Opus 4.8.
        body: JSON.stringify({
          model: model,
          max_tokens: 16000,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: ctx.signal,
      });
    } catch (err) {
      throw new Error("Request to Anthropic API failed: " + err.message);
    }

    if (!res.ok) {
      var errText = "";
      try {
        errText = await res.text();
      } catch {
        /* ignore — surface the status code below regardless */
      }
      throw new Error("Anthropic API returned " + res.status + ": " + errText.slice(0, 500));
    }

    var data = await res.json();
    var text = (data.content || [])
      .filter(function (b) {
        return b.type === "text";
      })
      .map(function (b) {
        return b.text;
      })
      .join("");

    return JSON.parse(extractJsonObject(text));
  },
  extractJsonObject: extractJsonObject,
  DEFAULT_MODEL: DEFAULT_MODEL,
};
