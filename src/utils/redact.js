"use strict";

/**
 * PII / secret redaction for data leaving the machine to a NETWORK AI provider.
 *
 * The offline `file`/`mock` providers never send anything anywhere and do not
 * use this. For network providers it runs by default (opt out with
 * --no-redact) so tokens, credentials, emails, and IPs that can appear inside
 * Playwright error messages are not transmitted verbatim. It only rewrites
 * secret-/PII-shaped substrings; ordinary text (test titles, categories,
 * histories) is left intact.
 */

// Order matters — more specific patterns first so a bearer token isn't first
// eaten by the generic long-token rule.
var RULES = [
  // Consume the whole header value (to end of line), not just the first token —
  // otherwise "Authorization: Bearer <token>" leaves <token> behind.
  {
    name: "authorization",
    re: /\b(authorization|proxy-authorization)\s*[:=]\s*.+/gi,
    to: "$1: [REDACTED]",
  },
  { name: "bearer", re: /\bBearer\s+[A-Za-z0-9._~+/-]+=*/g, to: "Bearer [REDACTED]" },
  {
    name: "apiKey",
    re: /\b(sk|pk|rk|api|key|token|secret|password|passwd|pwd)[-_]?[A-Za-z0-9]*\s*[:=]\s*['"]?[A-Za-z0-9._~+/-]{6,}['"]?/gi,
    to: "$1=[REDACTED]",
  },
  { name: "openaiKey", re: /\bsk-[A-Za-z0-9]{16,}\b/g, to: "[REDACTED_KEY]" },
  { name: "jwt", re: /\beyJ[A-Za-z0-9._-]{10,}\b/g, to: "[REDACTED_JWT]" },
  {
    name: "email",
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    to: "[REDACTED_EMAIL]",
  },
  { name: "ipv4", re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, to: "[REDACTED_IP]" },
];

/**
 * Redact a single string. Returns { value, count } where count is how many
 * substitutions were made (used for dry-run/provenance reporting).
 */
function redactString(input) {
  if (typeof input !== "string" || input.length === 0) {
    return { value: input, count: 0 };
  }
  var value = input;
  var count = 0;
  for (var i = 0; i < RULES.length; i++) {
    var rule = RULES[i];
    value = value.replace(rule.re, function () {
      count++;
      // Support $1 backrefs in the replacement.
      var args = Array.prototype.slice.call(arguments);
      return rule.to.replace(/\$(\d)/g, function (_m, d) {
        return args[Number(d)] != null ? args[Number(d)] : "";
      });
    });
  }
  return { value: value, count: count };
}

/**
 * Deep-redact every string value in an arbitrary JSON-serializable structure.
 * Returns { data, count } — a redacted deep clone plus the total substitutions.
 * Never mutates the input.
 */
function redactDeep(data) {
  var total = 0;
  function walk(node) {
    if (typeof node === "string") {
      var r = redactString(node);
      total += r.count;
      return r.value;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      var out = {};
      Object.keys(node).forEach(function (k) {
        out[k] = walk(node[k]);
      });
      return out;
    }
    return node;
  }
  var cloned = walk(data);
  return { data: cloned, count: total };
}

module.exports = { redactString, redactDeep, RULES };
