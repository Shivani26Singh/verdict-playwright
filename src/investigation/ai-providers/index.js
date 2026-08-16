"use strict";

/**
 * Pluggable AI-investigation provider registry.
 *
 * No vendor is hardcoded into the analyzer core: providers register here and
 * are resolved by name. Adding a new provider (Copilot, Gemini, OpenAI, Azure,
 * Bedrock, ...) means adding one adapter file and one register() call — nothing
 * else in the pipeline changes.
 *
 * Every provider implements the SAME contract:
 *
 *   {
 *     name: string,
 *     mode: "offline" | "network",   // network providers trigger redaction + egress rules
 *     async investigate({ evidence, options, signal }): Promise<Object>
 *   }
 *
 * `investigate` receives the curated evidence JSON (never raw reports, never
 * binaries) and returns a raw AI-investigation object that the orchestrator
 * then validates against ai-schema.js. It may throw; the orchestrator catches.
 *
 * NOTE: this is distinct from the legacy per-test provider stub in
 * src/providers/ (used only by the unused investigate-engine); this registry
 * is the suite-level AI ENRICHMENT layer.
 */

var registry = new Map();

function register(name, provider) {
  if (!name || typeof name !== "string") {
    throw new Error("register(name, provider): name must be a non-empty string");
  }
  if (!provider || typeof provider.investigate !== "function") {
    throw new Error('Provider "' + name + '" must implement investigate()');
  }
  registry.set(name, provider);
}

function getProvider(name) {
  return registry.get(name) || null;
}

function hasProvider(name) {
  return registry.has(name);
}

function listProviders() {
  return [...registry.keys()];
}

function isNetworkProvider(name) {
  var p = registry.get(name);
  return !!p && p.mode === "network";
}

// ── Built-in providers ─────────────────────────────────────────
// Offline providers register eagerly (cheap, no side effects). The network
// adapter is lazy-required only when selected, so a default offline run never
// even loads its code path.
register("mock", require("./mock"));
register("file", require("./file"));

var LAZY = {
  anthropic: function () {
    return require("./anthropic");
  },
};

function ensureLoaded(name) {
  if (!registry.has(name) && LAZY[name]) {
    register(name, LAZY[name]());
  }
  return registry.get(name) || null;
}

module.exports = {
  register,
  getProvider,
  hasProvider,
  listProviders,
  isNetworkProvider,
  ensureLoaded,
};
