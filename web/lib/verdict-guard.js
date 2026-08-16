/**
 * Verdict Guard — G1..G10. Pure JavaScript, deterministic.
 * NO LLM. NO network. Imports only verdict-schema.js and confidence.js.
 */

import { VerdictSchema } from "./verdict-schema.js";
import { confidenceBand, downgradeBand } from "./confidence.js";

const EVIDENCE_ID_PATTERN = /^E([1-9]|1[01])$/;
const PROSE_LEAKAGE_PATTERN =
  /\bE(1[01]|[1-9])\b|\bRC-\d{3}\b|\bFP-[0-9A-F]{6}\b|\bA[1-9]\b/;
const EVIDENCE_LABELS = {
  E1: "Execution history",
  E2: "Likely cause",
  E3: "Failure type",
  E4: "Error",
  E5: "Code location",
  E6: "Retry behaviour",
  E7: "Similar failures",
  E8: "Browser",
  E9: "Why this confidence",
  E10: "When it started",
  E11: "Available evidence",
};

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function isEvidenceId(id) {
  return EVIDENCE_ID_PATTERN.test(id);
}

function stripInternalToken(text) {
  const globalPattern = new RegExp(PROSE_LEAKAGE_PATTERN.source, "g");
  return String(text).replace(globalPattern, "").replace(/\s{2,}/g, " ").trim();
}

function synthesizedInsufficient(evidenceGaps) {
  return {
    category: "INSUFFICIENT_EVIDENCE",
    headline: "There is not enough evidence to determine the cause of this failure.",
    rootCause: {
      statement: "The available evidence does not distinguish between product, test, and environment causes.",
      citedEvidence: [],
    },
    reasoning: [
      { step: "Only a limited execution history is available for this failure.", citedEvidence: [] },
    ],
    contradictingEvidence: [],
    confidenceBand: "LOW",
    confidenceRationale: "Insufficient evidence was available to support a reliable attribution.",
    recommendedAction: {
      owner: "NEEDS_TRIAGE",
      action: "Re-run this test with tracing enabled, then investigate again.",
      urgency: "P3",
      ticketDraft: "Re-run the failing test with screenshots, tracing, and video enabled to collect more evidence.",
    },
    evidenceGaps: evidenceGaps && evidenceGaps.length ? evidenceGaps : ["More execution history"],
  };
}

function humanizedLabel(id) {
  return EVIDENCE_LABELS[id] || id;
}

function makeAgreement(pack) {
  const det = pack && pack.deterministic;
  const detBand = det && det.band ? det.band : confidenceBand(det && det.confidence);
  return {
    deterministicConfidence: det ? det.confidence : 0,
    deterministicBand: detBand,
    aiBand: null,
    status: null,
    humanReviewRecommended: false,
  };
}

function reconcileAgreement(agreement, aiBand) {
  agreement.aiBand = aiBand;
  const d = agreement.deterministicBand;
  if (d === aiBand) {
    agreement.status = "AGREE";
    agreement.humanReviewRecommended = false;
  } else if (
    (d === "HIGH" && aiBand === "LOW") ||
    (d === "LOW" && aiBand === "HIGH")
  ) {
    agreement.status = "DISAGREE";
    agreement.humanReviewRecommended = true;
  } else {
    agreement.status = "SOFT_DISAGREE";
    agreement.humanReviewRecommended = false;
  }
  return agreement;
}

function requiredSignalsFor(category) {
  switch (category) {
    case "PRODUCT_DEFECT":
      return ["E4", "E2"];
    case "TEST_DEFECT":
      return ["E2", "E4"];
    case "FLAKY_TIMING":
      return ["E1", "E6", "E2"];
    case "ENVIRONMENT_INFRA":
      return ["E3", "E2"];
    default:
      return [];
  }
}

function checkCoherence(category, pack) {
  const det = pack && pack.deterministic;
  const items = (pack && pack.items) || [];
  const byId = {};
  for (const it of items) byId[it.id] = it;

  if (category === "PRODUCT_DEFECT") {
    const e4 = byId.E4;
    const e4Hit = e4 && e4.present && /\b5\d\d\b/.test(e4.value || "");
    const rule = det && det.ruleCode;
    const ruleHit = ["RC-003", "RC-012", "RC-013", "RC-018", "RC-020"].includes(rule);
    return e4Hit || ruleHit;
  }
  if (category === "TEST_DEFECT") {
    const rule = det && det.ruleCode;
    const ruleHit = ["RC-002", "RC-008", "RC-010", "RC-011"].includes(rule);
    const e4 = byId.E4;
    const locatorHit = e4 && e4.present && e4.raw && e4.raw.locator;
    return ruleHit || locatorHit;
  }
  if (category === "FLAKY_TIMING") {
    const rule = det && det.ruleCode;
    const ruleHit = ["RC-001", "RC-006", "RC-009"].includes(rule);
    const e1 = byId.E1;
    const transition = e1 && e1.raw && /transitions/.test(e1.value || "");
    const e6 = byId.E6;
    const retryHit = e6 && e6.present;
    return transition || retryHit || ruleHit;
  }
  if (category === "ENVIRONMENT_INFRA") {
    const rule = det && det.ruleCode;
    const ruleHit = ["RC-004", "RC-005", "RC-014", "RC-015", "RC-019"].includes(rule);
    const e3 = byId.E3;
    const catHit = e3 && e3.present && ["network", "backend", "environment", "authentication"].includes(e3.value);
    return ruleHit || catHit;
  }
  return true;
}

function cleanProse(verdict, violations) {
  const scalarFields = [
    ["headline", verdict, "headline"],
    ["rootCause.statement", verdict.rootCause, "statement"],
    ["confidenceRationale", verdict, "confidenceRationale"],
    ["recommendedAction.action", verdict.recommendedAction, "action"],
    ["recommendedAction.ticketDraft", verdict.recommendedAction, "ticketDraft"],
  ];

  for (const [field, obj, key] of scalarFields) {
    if (obj && typeof obj[key] === "string") {
      const before = obj[key];
      const after = stripInternalToken(before);
      if (after !== before) {
        obj[key] = after;
        violations.push({
          code: "G10",
          severity: "LOW",
          message: "Prose leakage stripped from user-visible text.",
          detail: `Removed internal identifier from ${field}.`,
        });
      }
    }
  }

  for (const step of verdict.reasoning || []) {
    if (typeof step.step === "string") {
      const before = step.step;
      const after = stripInternalToken(before);
      if (after !== before) {
        step.step = after;
        violations.push({
          code: "G10",
          severity: "LOW",
          message: "Prose leakage stripped from user-visible text.",
          detail: "Removed internal identifier from reasoning[].step.",
        });
      }
    }
  }

  for (const point of verdict.contradictingEvidence || []) {
    if (typeof point.point === "string") {
      const before = point.point;
      const after = stripInternalToken(before);
      if (after !== before) {
        point.point = after;
        violations.push({
          code: "G10",
          severity: "LOW",
          message: "Prose leakage stripped from user-visible text.",
          detail: "Removed internal identifier from contradictingEvidence[].point.",
        });
      }
    }
  }

  return verdict;
}

/**
 * Guard a raw model verdict against an evidence pack.
 * Returns { verdict, passed, forcedInsufficient, categoryCoherence,
 *           strippedCitations, violations, agreement }.
 */
export function guardVerdict(raw, pack) {
  const violations = [];
  const agreement = makeAgreement(pack);
  const strippedCitations = [];

  // G1 — schema validation
  const parsed = VerdictSchema.safeParse(raw);
  if (!parsed.success || raw == null) {
    const gaps = synthesizedInsufficient([]).evidenceGaps;
    const synthesized = synthesizedInsufficient(gaps);
    violations.push({
      code: "G1",
      severity: "FATAL",
      message: "Schema validation failed.",
      detail: parsed.success ? "null input" : parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    });
    return {
      verdict: synthesized,
      passed: false,
      forcedInsufficient: false,
      categoryCoherence: "WEAK",
      strippedCitations,
      violations,
      agreement: reconcileAgreement(agreement, "LOW"),
    };
  }

  let verdict = parsed.data;
  verdict = clone(verdict);
  const itemsById = {};
  for (const it of pack.items || []) itemsById[it.id] = it;

  function stripCited(citedEvidence) {
    const valid = [];
    for (const id of citedEvidence) {
      if (!isEvidenceId(id) || !itemsById[id]) {
        strippedCitations.push(id);
        violations.push({
          code: "G2",
          severity: "HIGH",
          message: "Hallucinated citation stripped.",
          detail: `Cited evidence id "${id}" is not present in the pack.`,
        });
        continue;
      }
      if (itemsById[id].present === false) {
        strippedCitations.push(id);
        violations.push({
          code: "G3",
          severity: "HIGH",
          message: "Citation of absent evidence stripped.",
          detail: `Evidence id "${id}" is present:false.`,
        });
        continue;
      }
      valid.push(id);
    }
    return valid;
  }

  verdict.rootCause.citedEvidence = stripCited(verdict.rootCause.citedEvidence || []);

  // G4 — root cause support
  if (verdict.rootCause.citedEvidence.length === 0) {
    verdict.category = "INSUFFICIENT_EVIDENCE";
    verdict.headline = "There is not enough evidence to determine the cause of this failure.";
    verdict.rootCause.statement =
      "The available evidence does not distinguish between product, test, and environment causes.";
    verdict.confidenceBand = "LOW";
    verdict.recommendedAction.owner = "NEEDS_TRIAGE";
    verdict.recommendedAction.urgency = "P3";
    verdict.forcedInsufficient = true;
    violations.push({
      code: "G4",
      severity: "FATAL",
      message: "Root cause has no valid supporting citations; forced INSUFFICIENT_EVIDENCE.",
      detail: "All root-cause citations were stripped or missing.",
    });
  }

  // G5 — reasoning support
  const keptReasoning = [];
  for (const step of verdict.reasoning || []) {
    const valid = stripCited(step.citedEvidence || []);
    step.citedEvidence = valid;
    if (valid.length > 0) {
      keptReasoning.push(step);
    } else {
      violations.push({
        code: "G5",
        severity: "HIGH",
        message: "Reasoning step with no valid citations dropped.",
        detail: step.step,
      });
    }
  }
  verdict.reasoning = keptReasoning;
  if (verdict.reasoning.length === 0 && verdict.category !== "INSUFFICIENT_EVIDENCE") {
    verdict.category = "INSUFFICIENT_EVIDENCE";
    verdict.headline = "There is not enough evidence to determine the cause of this failure.";
    verdict.confidenceBand = "LOW";
    verdict.recommendedAction.owner = "NEEDS_TRIAGE";
    verdict.recommendedAction.urgency = "P3";
    verdict.forcedInsufficient = true;
    violations.push({
      code: "G5",
      severity: "FATAL",
      message: "All reasoning steps dropped; forced INSUFFICIENT_EVIDENCE.",
      detail: "No reasoning step had a valid citation.",
    });
  }

  // Contradicting evidence also gets citation stripping (no category change).
  for (const point of verdict.contradictingEvidence || []) {
    point.citedEvidence = stripCited(point.citedEvidence || []);
  }

  // G6 — category / evidence coherence
  const categoryCoherence = checkCoherence(verdict.category, pack) ? "SUPPORTED" : "WEAK";
  if (categoryCoherence === "WEAK") {
    verdict.confidenceBand = downgradeBand(verdict.confidenceBand);
    violations.push({
      code: "G6",
      severity: "MEDIUM",
      message: "Claimed category is weakly supported by the evidence.",
      detail: `No required signal found for ${verdict.category}; band downgraded.`,
    });
  }

  // G7 — confidence reconciliation (never mutates)
  reconcileAgreement(agreement, verdict.confidenceBand);
  if (agreement.status === "DISAGREE") {
    violations.push({
      code: "G7",
      severity: "HIGH",
      message: "Deterministic confidence and AI confidence disagree.",
      detail: `${agreement.deterministicBand} vs ${agreement.aiBand}`,
    });
  }

  // G8 — insufficient evidence consistency
  if (verdict.category === "INSUFFICIENT_EVIDENCE") {
    verdict.confidenceBand = "LOW";
    verdict.recommendedAction.owner = "NEEDS_TRIAGE";
    verdict.recommendedAction.urgency = "P3";
    if (!verdict.evidenceGaps || verdict.evidenceGaps.length === 0) {
      const fromAbsent = (pack.absentIds || []).map((id) => `Missing evidence: ${humanizedLabel(id)}`);
      verdict.evidenceGaps = fromAbsent.length ? fromAbsent : ["More execution history"];
      violations.push({
        code: "G8",
        severity: "MEDIUM",
        message: "Synthesized evidence gaps for INSUFFICIENT_EVIDENCE.",
        detail: `${verdict.evidenceGaps.length} gaps added.`,
      });
    }
  }

  // G9 — action sanity
  const owners = ["DEV_TEAM", "QA_TEAM", "PLATFORM_TEAM", "NEEDS_TRIAGE"];
  const urgencies = ["P1", "P2", "P3"];
  if (!owners.includes(verdict.recommendedAction.owner) || !urgencies.includes(verdict.recommendedAction.urgency)) {
    verdict.recommendedAction.owner = owners.includes(verdict.recommendedAction.owner)
      ? verdict.recommendedAction.owner
      : "NEEDS_TRIAGE";
    verdict.recommendedAction.urgency = urgencies.includes(verdict.recommendedAction.urgency)
      ? verdict.recommendedAction.urgency
      : "P3";
    violations.push({
      code: "G9",
      severity: "HIGH",
      message: "Action owner/urgency outside allowed values; coerced.",
      detail: "owner and urgency have been reset to safe defaults.",
    });
  } else if (verdict.category === "FLAKY_TIMING" && verdict.recommendedAction.owner === "DEV_TEAM" && verdict.recommendedAction.urgency === "P1") {
    violations.push({
      code: "G9",
      severity: "LOW",
      message: "Flaky/timing issue assigned to development team at P1 — note only.",
      detail: "Ownership may be mismatched for an intermittent issue.",
    });
  }

  // G10 — prose leakage
  verdict = cleanProse(verdict, violations);

  const fatal = violations.some((v) => v.severity === "FATAL");
  const passed = !fatal;

  return {
    verdict,
    passed,
    forcedInsufficient: !!verdict.forcedInsufficient,
    categoryCoherence,
    strippedCitations,
    violations,
    agreement,
  };
}

export const GUARD_RULES = ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10"];
