"use strict";

/**
 * AI enrichment orchestrator.
 *
 * ENRICHMENT, never replacement: this attaches an interpretive overlay
 * (result.aiInvestigation) plus provenance (result.aiInvestigationMeta) to the
 * deterministic result. It NEVER mutates classifications, rules, confidence, or
 * statistics. It is also non-throwing — any provider/validation/network failure
 * is downgraded to a clear status so the report still generates.
 *
 * Two entry points preserve backward compatibility:
 *   - enrichOffline(result, config)  — synchronous; file/mock providers only.
 *     Used inside the existing synchronous run() so `--ai-investigation` and
 *     `--investigate mock` need no API change and stay fully offline.
 *   - enrichAsync(result, config)    — asynchronous; any provider incl. network.
 *     Used by runWithAi() when a network provider is selected.
 */
var {
  PROMPT_VERSION,
  validateAiInvestigation,
  normalizeAiInvestigation,
  hasContent,
} = require("./ai-schema");
var { buildInvestigationJsonPrompt } = require("../prompts/investigation-json-prompt");
var { redactString } = require("../utils/redact");

var NETWORK_DEFAULT_MODEL = "claude-opus-4-8";

/**
 * Work out which provider (if any) to run, and with what options, from config.
 * `--investigate <name>` selects a named provider; `--ai-investigation <file>`
 * alone implies the offline `file` provider. Returns null when no AI is asked for.
 */
function resolveAiSpec(config) {
  var out = (config && config.output) || {};
  var providerName = out.investigationProvider || null;
  var filePath = out.aiInvestigationFile || null;

  if (!providerName && filePath) providerName = "file";
  if (!providerName) return null;

  return {
    providerName: providerName,
    filePath: filePath,
    model: out.aiModel || process.env.FLAKY_AI_MODEL || null,
    // Redaction is on by default for network providers; --no-redact clears it.
    redact: out.aiRedact !== false,
  };
}

function nowIso() {
  return new Date().toISOString();
}

/** Attach a (possibly imperfect) overlay + provenance. Best-effort, honest status. */
function attachOverlay(result, raw, metaBase) {
  var errors = validateAiInvestigation(raw);
  var normalized = normalizeAiInvestigation(raw);
  var meta = {
    provider: metaBase.provider,
    model: metaBase.model || null,
    generatedAt: nowIso(),
    promptVersion: PROMPT_VERSION,
    status: errors.length ? "invalid" : "ok",
    redacted: !!metaBase.redacted,
  };
  if (typeof metaBase.redactionCount === "number") meta.redactionCount = metaBase.redactionCount;
  if (errors.length) meta.validationErrors = errors.slice(0, 5);

  result.aiInvestigation = hasContent(normalized) ? normalized : null;
  result.aiInvestigationMeta = meta;
  return result;
}

/** Attach an "unavailable" provenance record; report still generates. */
function attachUnavailable(result, spec, err) {
  result.aiInvestigation = null;
  result.aiInvestigationMeta = {
    provider: spec ? spec.providerName : null,
    model: spec ? spec.model : null,
    generatedAt: nowIso(),
    promptVersion: PROMPT_VERSION,
    status: "error",
    redacted: false,
    message: err && err.message ? err.message : String(err),
  };
  return result;
}

// ── Synchronous (offline) path ─────────────────────────────────
function enrichOffline(result, config) {
  var spec = resolveAiSpec(config);
  if (!spec) return result;

  if (spec.providerName !== "file" && spec.providerName !== "mock") {
    return attachUnavailable(
      result,
      spec,
      new Error(
        'Provider "' +
          spec.providerName +
          '" needs the async entry (runWithAi); the CLI routes network providers there automatically'
      )
    );
  }

  try {
    var evidence = require("./ai-input").buildAiInput(result);
    var raw;
    if (spec.providerName === "file") {
      raw = require("./ai-providers/file").loadFromFile(spec.filePath);
    } else {
      raw = require("./ai-providers/mock").buildOverlay(evidence);
    }
    return attachOverlay(result, raw, {
      provider: spec.providerName,
      model: null,
      redacted: false,
    });
  } catch (err) {
    return attachUnavailable(result, spec, err);
  }
}

// ── Asynchronous (any provider, incl. network) path ────────────
async function enrichAsync(result, config, deps) {
  deps = deps || {};
  var spec = resolveAiSpec(config);
  if (!spec) return result;

  var registry = require("./ai-providers");
  var provider;
  try {
    provider = registry.ensureLoaded(spec.providerName);
  } catch (err) {
    return attachUnavailable(result, spec, err);
  }
  if (!provider) {
    return attachUnavailable(
      result,
      spec,
      new Error('Unknown AI provider "' + spec.providerName + '"')
    );
  }

  try {
    var evidence = require("./ai-input").buildAiInput(result);
    var prompt = null;
    var redacted = false;
    var redactionCount = 0;
    var model = spec.model || (provider.mode === "network" ? NETWORK_DEFAULT_MODEL : null);

    if (provider.mode === "network") {
      prompt = buildInvestigationJsonPrompt(result);
      if (spec.redact !== false) {
        var r = redactString(prompt);
        prompt = r.value;
        redactionCount = r.count;
        redacted = true;
      }
    }

    var raw = await provider.investigate({
      evidence: evidence,
      prompt: prompt,
      options: Object.assign({}, spec, { model: model }),
      signal: deps.signal,
    });
    return attachOverlay(result, raw, {
      provider: spec.providerName,
      model: model,
      redacted: redacted,
      redactionCount: redactionCount,
    });
  } catch (err) {
    return attachUnavailable(result, spec, err);
  }
}

/**
 * Build exactly what a network provider WOULD transmit (post-redaction), for
 * `--ai-dry-run`. Returns null for offline providers (nothing leaves the box).
 */
function previewNetworkPayload(result, config) {
  var spec = resolveAiSpec(config);
  if (!spec) return null;
  var registry = require("./ai-providers");
  var provider;
  try {
    provider = registry.ensureLoaded(spec.providerName);
  } catch {
    provider = null;
  }
  if (!provider || provider.mode !== "network") return null;

  var prompt = buildInvestigationJsonPrompt(result);
  var redacted = false;
  var redactionCount = 0;
  if (spec.redact !== false) {
    var r = redactString(prompt);
    prompt = r.value;
    redactionCount = r.count;
    redacted = true;
  }
  return {
    provider: spec.providerName,
    model: spec.model || NETWORK_DEFAULT_MODEL,
    redacted: redacted,
    redactionCount: redactionCount,
    prompt: prompt,
  };
}

/** Is the configured provider a network one? (Drives the CLI's sync/async choice.) */
function usesNetworkProvider(config) {
  var spec = resolveAiSpec(config);
  if (!spec) return false;
  var registry = require("./ai-providers");
  try {
    var p = registry.ensureLoaded(spec.providerName);
    return !!p && p.mode === "network";
  } catch {
    // An unknown provider name: treat as network so it goes through the async
    // path, where the "unknown provider" status is reported cleanly.
    return spec.providerName !== "file" && spec.providerName !== "mock";
  }
}

module.exports = {
  PROMPT_VERSION,
  resolveAiSpec,
  enrichOffline,
  enrichAsync,
  previewNetworkPayload,
  usesNetworkProvider,
};
