"use strict";

/**
 * Schema + validator for the AI Investigation ENRICHMENT object.
 *
 * This is the exact contract the `--export-ai-input` prompt asks an LLM to
 * return, and the shape `--ai-investigation <file>` reads back in. It is an
 * ENRICHMENT layer only: it never changes classification, rule matching,
 * confidence, or statistics — those remain fully deterministic. Validation
 * happens here so a malformed or partial AI response can be caught and
 * downgraded to a clear "unavailable" status rather than crashing a report.
 */

// Bump when the input evidence shape or the expected output schema changes,
// so a stored ai-investigation.json can be checked against the prompt that
// produced it. Surfaced in provenance metadata.
var PROMPT_VERSION = "1.0.0";

var STRING_KEYS = [
  "executiveSummary",
  "suiteHealth",
  "browserAnalysis",
  "failureTrends",
  "confidenceAssessment",
];

// Arrays of { name, issue, fix }
var TEST_LIST_KEYS = ["flakyTests", "consistentFailures", "rootCauseAnalysis"];

// Arrays of plain strings
var STRING_LIST_KEYS = ["recommendedActions", "debuggingPlan"];

function isString(v) {
  return typeof v === "string";
}

/**
 * Validate a candidate AI investigation object against the schema.
 * Returns an array of human-readable error strings (empty === valid).
 * Intentionally strict on TYPES but tolerant of empty content (an LLM is
 * allowed to return "" / [] for a section it has nothing to say about).
 */
function validateAiInvestigation(obj) {
  var errors = [];

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return ["AI investigation must be a non-null JSON object"];
  }

  STRING_KEYS.forEach(function (k) {
    if (!(k in obj)) {
      errors.push('Missing required key: "' + k + '"');
    } else if (!isString(obj[k])) {
      errors.push('"' + k + '" must be a string');
    }
  });

  TEST_LIST_KEYS.forEach(function (k) {
    if (!(k in obj)) {
      errors.push('Missing required key: "' + k + '"');
      return;
    }
    if (!Array.isArray(obj[k])) {
      errors.push('"' + k + '" must be an array');
      return;
    }
    obj[k].forEach(function (item, i) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push('"' + k + "[" + i + ']" must be an object with name/issue/fix');
        return;
      }
      ["name", "issue", "fix"].forEach(function (f) {
        if (!isString(item[f])) {
          errors.push('"' + k + "[" + i + "]." + f + '" must be a string');
        }
      });
    });
  });

  STRING_LIST_KEYS.forEach(function (k) {
    if (!(k in obj)) {
      errors.push('Missing required key: "' + k + '"');
      return;
    }
    if (!Array.isArray(obj[k])) {
      errors.push('"' + k + '" must be an array');
      return;
    }
    obj[k].forEach(function (item, i) {
      if (!isString(item)) {
        errors.push('"' + k + "[" + i + ']" must be a string');
      }
    });
  });

  return errors;
}

/**
 * Coerce a (possibly partial) AI investigation object into the full schema
 * shape with safe defaults, so renderers never have to null-check every
 * field. Unknown extra keys are dropped. Never throws.
 */
function normalizeAiInvestigation(obj) {
  var src = obj && typeof obj === "object" ? obj : {};
  var out = {};

  STRING_KEYS.forEach(function (k) {
    out[k] = isString(src[k]) ? src[k] : "";
  });

  TEST_LIST_KEYS.forEach(function (k) {
    out[k] = Array.isArray(src[k])
      ? src[k]
          .filter(function (it) {
            return it && typeof it === "object";
          })
          .map(function (it) {
            return {
              name: isString(it.name) ? it.name : "",
              issue: isString(it.issue) ? it.issue : "",
              fix: isString(it.fix) ? it.fix : "",
            };
          })
      : [];
  });

  STRING_LIST_KEYS.forEach(function (k) {
    out[k] = Array.isArray(src[k]) ? src[k].filter(isString) : [];
  });

  return out;
}

/** True when the object carries at least one non-empty section worth rendering. */
function hasContent(obj) {
  if (!obj) return false;
  var n = normalizeAiInvestigation(obj);
  var anyString = STRING_KEYS.some(function (k) {
    return n[k].trim().length > 0;
  });
  var anyList = TEST_LIST_KEYS.concat(STRING_LIST_KEYS).some(function (k) {
    return n[k].length > 0;
  });
  return anyString || anyList;
}

module.exports = {
  PROMPT_VERSION,
  STRING_KEYS,
  TEST_LIST_KEYS,
  STRING_LIST_KEYS,
  validateAiInvestigation,
  normalizeAiInvestigation,
  hasContent,
};
