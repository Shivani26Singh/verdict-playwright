"use strict";

var fs = require("fs");
var path = require("path");

/**
 * Offline "file" provider — the flagship path.
 *
 * The user runs `--export-ai-input` to get AI_INPUT.json + AI_PROMPT.md, feeds
 * them to the LLM of their choice, saves the response as ai-investigation.json,
 * and passes it back via `--ai-investigation <file>`. This provider reads and
 * parses that file. It makes NO network call — nothing leaves the machine — so
 * the analyzer stays fully offline while still gaining AI enrichment.
 *
 * Reading a file is synchronous, so `loadFromFile` is exported for the
 * synchronous enrichment path used by the existing sync `run()`; the async
 * `investigate` wraps it for the uniform provider contract.
 */
function loadFromFile(filePath) {
  if (!filePath) {
    throw new Error("file provider requires a path (use --ai-investigation <file>)");
  }
  var resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error("AI investigation file not found: " + resolved);
  }
  var raw;
  try {
    raw = fs.readFileSync(resolved, "utf-8");
  } catch (err) {
    throw new Error("Could not read AI investigation file: " + err.message);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error("AI investigation file is not valid JSON (" + resolved + "): " + err.message);
  }
}

module.exports = {
  name: "file",
  mode: "offline",
  loadFromFile: loadFromFile,
  async investigate(ctx) {
    var options = (ctx && ctx.options) || {};
    return loadFromFile(options.filePath);
  },
};
