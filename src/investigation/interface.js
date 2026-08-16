"use strict";

var VALID_SEVERITIES = ["critical", "high", "medium", "low", "info"];

function InvestigationResult(fields) {
  if (!fields || typeof fields !== "object") {
    throw new Error("InvestigationResult requires an object with required fields");
  }

  var required = [
    "likelyCause",
    "confidence",
    "severity",
    "evidence",
    "possibleFixes",
    "explanation",
    "requiresHumanReview",
  ];
  for (var i = 0; i < required.length; i++) {
    if (!(required[i] in fields)) {
      throw new Error("InvestigationResult missing required field: " + required[i]);
    }
  }

  if (typeof fields.likelyCause !== "string" || fields.likelyCause.trim().length === 0) {
    throw new Error("likelyCause must be a non-empty string");
  }
  if (typeof fields.confidence !== "number" || fields.confidence < 0 || fields.confidence > 100) {
    throw new Error("confidence must be a number between 0 and 100");
  }
  if (!VALID_SEVERITIES.includes(fields.severity)) {
    throw new Error("severity must be one of: " + VALID_SEVERITIES.join(", "));
  }
  if (typeof fields.evidence !== "string") {
    throw new Error("evidence must be a string");
  }
  if (
    !Array.isArray(fields.possibleFixes) ||
    !fields.possibleFixes.every(function (f) {
      return typeof f === "string";
    })
  ) {
    throw new Error("possibleFixes must be an array of strings");
  }
  if (typeof fields.explanation !== "string") {
    throw new Error("explanation must be a string");
  }
  if (typeof fields.requiresHumanReview !== "boolean") {
    throw new Error("requiresHumanReview must be a boolean");
  }

  var result = {
    likelyCause: fields.likelyCause,
    confidence: fields.confidence,
    severity: fields.severity,
    evidence: fields.evidence,
    possibleFixes: fields.possibleFixes,
    explanation: fields.explanation,
    requiresHumanReview: fields.requiresHumanReview,
  };

  // Optional extended fields for pattern-based rules
  if (fields.suggestedChecks) {
    result.suggestedChecks = fields.suggestedChecks;
  }
  if (fields.errorPattern) {
    result.errorPattern = fields.errorPattern;
  }
  if (fields.category) {
    result.category = fields.category;
  }
  if (fields.evidenceDescription) {
    result.evidence = fields.evidenceDescription;
  }

  return result;
}

function withProvider(providerName, result) {
  return { provider: providerName, result: result };
}

module.exports = { InvestigationResult, withProvider, VALID_SEVERITIES };
