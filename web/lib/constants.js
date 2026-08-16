/**
 * Shared constants for the VERDICT web layer.
 * These are pure data — no side effects.
 */

export const PACK_VERSION = "1.0.0";
export const PROMPT_VERSION = "1.1.0";

export const EVIDENCE_IDS = [
  "E1",
  "E2",
  "E3",
  "E4",
  "E5",
  "E6",
  "E7",
  "E8",
  "E9",
  "E10",
  "E11",
];

export const EVIDENCE_LABELS = {
  E1: "Execution history",
  E2: "Matched deterministic rule",
  E3: "Failure category",
  E4: "Parsed primary error",
  E5: "Stack trace & code frame",
  E6: "Retry behaviour",
  E7: "Fingerprint corroboration",
  E8: "Browser scope",
  E9: "Confidence explanation",
  E10: "Regression boundary",
  E11: "Available artifacts",
};

export const RULE_MEANINGS = {
  "RC-001": "Operation timed out",
  "RC-002": "Element not found on the page",
  "RC-003": "Assertion failed — values did not match",
  "RC-004": "Network connection failed",
  "RC-005": "Consistently failing — not intermittent",
  "RC-006": "Race condition / timing instability",
  "RC-007": "Cause could not be identified",
  "RC-008": "Element was present but not visible",
  "RC-009": "Element never became clickable",
  "RC-010": "Element was removed from the page mid-action",
  "RC-011": "Selector matched more than one element",
  "RC-012": "Text did not match the expected value",
  "RC-013": "Page title did not match",
  "RC-014": "Browser-level network or certificate failure",
  "RC-015": "Authentication expired or was rejected",
  "RC-016": "Permission denied",
  "RC-017": "Resource not found",
  "RC-018": "Backend/API failure",
  "RC-019": "Connection dropped mid-request",
  "RC-020": "Browser tab or page crashed",
};

export const CATEGORY_MEANINGS = {
  timeout: "Timeout",
  locator: "Element / selector",
  assertion: "Assertion",
  network: "Network",
  backend: "Backend / API",
  authentication: "Authentication",
  environment: "Environment",
  data: "Test data",
  unknown: "Unclassified",
  stability: "Unclassified",
};

export const VERDICT_CATEGORIES = {
  PRODUCT_DEFECT: {
    title: "Product defect",
    subline: "Likely a bug in the application",
  },
  TEST_DEFECT: {
    title: "Test issue",
    subline: "Likely a problem with the test itself",
  },
  FLAKY_TIMING: {
    title: "Flaky / timing issue",
    subline: "Intermittent — not consistently reproducible",
  },
  ENVIRONMENT_INFRA: {
    title: "Environment issue",
    subline: "Infrastructure or dependency problem",
  },
  INSUFFICIENT_EVIDENCE: {
    title: "Not enough evidence",
    subline: "Cannot reliably determine the cause",
  },
};

export const OWNER_MEANINGS = {
  DEV_TEAM: "Development team",
  QA_TEAM: "QA / test automation",
  PLATFORM_TEAM: "Platform / infrastructure",
  NEEDS_TRIAGE: "Needs triage",
};

export const EVIDENCE_ID_PATTERN = /^E([1-9]|1[01])$/;
export const PROSE_LEAKAGE_PATTERN =
  /\bE(1[01]|[1-9])\b|\bRC-\d{3}\b|\bFP-[0-9A-F]{6}\b|\bA[1-9]\b/;
