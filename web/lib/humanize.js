/**
 * The presentation layer. Every string shown in the primary UI flows through
 * here so internal identifiers (E1-E11, RC-xxx, FP-xxxxxx, A1-A9) never leak.
 * Pure functions only — no React, no network.
 */

import {
  EVIDENCE_LABELS,
  RULE_MEANINGS,
  CATEGORY_MEANINGS,
  VERDICT_CATEGORIES,
  OWNER_MEANINGS,
  PROSE_LEAKAGE_PATTERN,
} from "./constants.js";

export const USER_EVIDENCE_LABELS = {
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

export function humanizeEvidenceLabel(id) {
  return USER_EVIDENCE_LABELS[id] || "Evidence";
}

/**
 * Turn one entry of verdict.evidenceGaps into something a QA engineer can read.
 *
 * The Guard strips internal identifiers from every prose field, but
 * evidenceGaps is a free-form list the model fills in itself, so an entry can
 * arrive as a bare "E8", as "Missing evidence: E8", or as a sentence with an
 * ID embedded in it. Any evidence ID found is swapped for its human label;
 * an entry that is nothing but an ID becomes just the label.
 */
export function humanizeEvidenceGap(gap) {
  const text = String(gap || "").replace(/^Missing evidence:\s*/i, "").trim();
  if (!text) return "";

  const bare = /^E(?:1[01]|[1-9])$/.exec(text);
  if (bare) return humanizeEvidenceLabel(text);

  return text.replace(/\bE(1[01]|[1-9])\b/g, (match) => humanizeEvidenceLabel(match));
}

/**
 * Human-safe value for an observed evidence item. Percentages and adjustment
 * codes are stripped from the primary UI.
 */
export function humanizeObservedValue(item) {
  if (!item) return "";
  if (item.kind === "confidence" && item.raw && Array.isArray(item.raw.adjustments)) {
    const reasons = item.raw.adjustments
      .map((a) => (a && a.reason ? a.reason : ""))
      .filter(Boolean);
    return reasons.length ? reasons.join(" · ") : "No confidence explanation available";
  }
  return item.value || "";
}

export function humanizeRule(code) {
  if (!code) return "Cause could not be identified";
  return RULE_MEANINGS[code] || "Cause could not be identified";
}

export function humanizeCategory(category) {
  if (!category) return "Unclassified";
  return CATEGORY_MEANINGS[category] || "Unclassified";
}

export function humanizeClassification(classification) {
  const map = {
    flaky: "Flaky",
    stable_failure: "Consistently failing",
    newly_failed: "Newly failing",
    regression: "Regression",
    fixed: "Fixed",
    stable_pass: "Passing",
  };
  return map[classification] || "Unclassified";
}

export function humanizeCorroboration(count) {
  const n = Number(count) || 0;
  if (n === 0) return "No other test shows this failure pattern";
  if (n === 1) return "1 other test shows a similar failure pattern";
  return `${n} other tests show a similar failure pattern`;
}

export function humanizeVerdictCategory(category) {
  const entry = VERDICT_CATEGORIES[category];
  if (!entry) return { title: "Not enough evidence", subline: "Cannot reliably determine the cause" };
  return entry;
}

export function humanizeOwner(owner) {
  return OWNER_MEANINGS[owner] || "Needs triage";
}

export function humanizeBand(band) {
  return band || "Low";
}

export function humanizeArtifactLabel(kind) {
  return {
    screenshot: "Screenshot",
    trace: "Trace",
    video: "Video",
  }[kind] || kind;
}

/**
 * Build the confidence bullets from the rule engine's own human-readable
 * adjustment reasons, with any A-codes stripped.
 */
export function humanizeConfidenceReasons(pack) {
  const explain = pack && pack.deterministic && pack.deterministic.confidenceExplain;
  if (!explain) return [];
  const adjustments = Array.isArray(explain.adjustments) ? explain.adjustments : [];
  return adjustments
    .map((a) => (a && a.reason ? a.reason : ""))
    .filter(Boolean);
}

/**
 * Build the human-readable observed rows from an evidence pack.
 * Returns present items only (primary UI requirement).
 */
export function humanizeObservedRows(pack) {
  const items = (pack && pack.items) || [];
  return items
    .filter((item) => item && item.present !== false)
    .map((item) => ({
      id: item.id,
      label: humanizeEvidenceLabel(item.id),
      value: humanizeObservedValue(item),
      kind: item.kind,
      raw: item.raw,
    }));
}

/**
 * Server-side safe view model for the Observed panel. Contains no internal IDs,
 * rule codes, fingerprints, A-codes, or percentages. `index` is a 0-based DOM
 * position, not an evidence ID.
 */
export function buildSafeObserved(pack) {
  const items = (pack && pack.items) || [];
  const rows = [];
  const absentLabels = [];
  let artifacts = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    if (item.id === "E11") {
      const raw = item.raw || {};
      artifacts = {
        screenshot: Array.isArray(raw.screenshots) && raw.screenshots.length > 0,
        trace: !!raw.trace,
        video: !!raw.video,
      };
      continue;
    }
    if (item.present === false) {
      absentLabels.push(humanizeEvidenceLabel(item.id).toLowerCase());
      continue;
    }
    rows.push({
      index: i,
      label: humanizeEvidenceLabel(item.id),
      value: humanizeObservedValue(item),
    });
  }

  return {
    rows,
    artifacts,
    absentSummary: absentLabels.length ? "Not captured: " + absentLabels.join(", ") : "",
  };
}

/**
 * Map an evidence citation ID to its 0-based DOM index without ever rendering
 * the ID. Used only for the ViewEvidenceLink scroll interaction.
 */
export function evidenceIndexById(pack, id) {
  const items = (pack && pack.items) || [];
  const index = items.findIndex((item) => item && item.id === id);
  return index === -1 ? null : index;
}

/**
 * Build the "not captured" summary for absent items. Muted line, never raw
 * NOT AVAILABLE strings.
 */
export function humanizeAbsentSummary(pack) {
  const items = (pack && pack.items) || [];
  const absent = items
    .filter((item) => item && item.present === false)
    .map((item) => humanizeEvidenceLabel(item.id).toLowerCase());
  if (absent.length === 0) return "";
  return "Not captured: " + absent.join(", ");
}

/**
 * True when a pack's humanized surface has no internal identifiers.
 * Used by the build-time assertion and tests.
 */
export function humanizeHasNoInternalIds(pack) {
  const rows = humanizeObservedRows(pack);
  const parts = [
    ...rows.map((r) => r.label),
    ...rows.map((r) => r.value),
    humanizeAbsentSummary(pack),
    humanizeRule(pack && pack.deterministic && pack.deterministic.ruleCode),
    humanizeCategory(pack && pack.deterministic && pack.deterministic.category),
    ...humanizeConfidenceReasons(pack),
  ].filter((s) => typeof s === "string");
  return !parts.some((s) => PROSE_LEAKAGE_PATTERN.test(s));
}
