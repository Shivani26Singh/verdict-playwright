/**
 * Analyzer insight derivation.
 *
 * Turns an internal evidence pack (E1..E11) into a presentation view model for
 * the Overview and Evidence tabs. Every number here is derived from data the
 * deterministic analyzer already produced — nothing is invented or estimated.
 *
 * The returned object contains NO internal identifiers (E-ids, RC-codes,
 * fingerprints, A-codes). Those stay in Technical Details.
 *
 * Pure functions only — no React, no network.
 */

import { RULE_MEANINGS, CATEGORY_MEANINGS } from "./constants.js";

function itemsById(pack) {
  const map = {};
  const items = (pack && pack.items) || [];
  for (const item of items) {
    if (item && item.id) map[item.id] = item;
  }
  return map;
}

function present(item) {
  return !!(item && item.present !== false);
}

function countTransitions(history) {
  return history.reduce((n, h, i) => {
    if (i === 0) return n;
    const prev = history[i - 1];
    if ((prev === "passed" && h === "failed") || (prev === "failed" && h === "passed")) return n + 1;
    return n;
  }, 0);
}

/**
 * Execution statistics straight from the recorded run history.
 */
export function buildExecutionStats(pack) {
  const by = itemsById(pack);
  const raw = (by.E1 && by.E1.raw) || {};
  const history = Array.isArray(raw.history) ? raw.history : [];
  const runs = raw.runCount || history.length;
  const failed = history.filter((h) => h === "failed").length;
  const passed = history.filter((h) => h === "passed").length;

  return {
    history,
    runs,
    failed,
    passed,
    transitions: countTransitions(history),
    failureRate: runs > 0 ? Math.round((failed / runs) * 100) : 0,
  };
}

/**
 * Retry recovery, computed exactly the way the analyzer computes it: a run
 * counts as recovered when it recorded at least one retry.
 * Returns null when no retry recovery was observed at all.
 */
export function buildRetryStats(pack) {
  const by = itemsById(pack);
  if (!present(by.E6)) return null;
  const raw = (by.E6 && by.E6.raw) || {};
  const retries = Array.isArray(raw.retriesPerRun) ? raw.retriesPerRun : [];
  const recovered = retries.filter((r) => typeof r === "number" && r > 0).length;
  const failedRuns = buildExecutionStats(pack).failed;
  if (recovered === 0) return null;
  return { recovered, failedRuns, retriesToPass: raw.retriesToPass || 0 };
}

function humanCategory(category) {
  if (!category) return null;
  const key = String(category).toLowerCase();
  return CATEGORY_MEANINGS[key] || String(category);
}

/**
 * Failure pattern: what kind of failure this is, why the analyzer thinks so,
 * and how many other tests share the same signature.
 */
export function buildFailurePattern(pack) {
  const by = itemsById(pack);
  const det = (pack && pack.deterministic) || {};
  const ruleRaw = (by.E2 && by.E2.raw) || {};

  const similarCount = Number(det.fingerprintGroupCount) > 0 ? Number(det.fingerprintGroupCount) : 0;

  return {
    category: present(by.E3) ? humanCategory(det.category || (by.E3.raw && by.E3.raw.category)) : null,
    likelyCause: present(by.E2)
      ? ruleRaw.likelyCause || RULE_MEANINGS[det.ruleCode] || null
      : null,
    explanation: present(by.E2) ? ruleRaw.explanation || null : null,
    similarCount,
    classification: det.classification || null,
  };
}

/**
 * The parsed error, split into the parts a QA engineer reads separately.
 * Returns null when no structured error was captured.
 */
export function buildErrorDetail(pack) {
  const by = itemsById(pack);
  if (!present(by.E4)) return null;
  const raw = (by.E4 && by.E4.raw) || {};
  const header = raw.header || (by.E4.value || "").split(" — ")[0] || null;
  if (!header) return null;

  return {
    header,
    callLog: raw.callLog || null,
    locator: raw.locator || null,
    expected: raw.expected || null,
    received: raw.received || null,
    timeout: raw.timeout || null,
  };
}

/**
 * Stack trace / code frame, plus the first test-file location referenced.
 * Returns null when nothing was captured.
 */
export function buildCodeDetail(pack) {
  const by = itemsById(pack);
  if (!present(by.E5)) return null;
  const raw = (by.E5 && by.E5.raw) || {};
  const stackTrace = raw.stackTrace || null;
  const codeFrame = raw.codeFrame || null;
  if (!stackTrace && !codeFrame) return null;

  let location = raw.codeFrameLocation || null;
  if (!location && stackTrace) {
    const match = String(stackTrace).match(/([\w./\\-]+\.(?:spec|test)\.[jt]sx?:\d+(?::\d+)?)/);
    if (match) location = match[1];
  }

  return { stackTrace, codeFrame, location };
}

/**
 * Browser scope. `primary` is the browser this failure was analysed on;
 * the rest were analysed alongside it. Only browsers present in the data.
 */
export function buildBrowsers(pack) {
  const by = itemsById(pack);
  if (!present(by.E8)) return [];
  const raw = (by.E8 && by.E8.raw) || {};
  const primary = raw.browser || null;
  const siblings = Array.isArray(raw.siblingBrowsers) ? raw.siblingBrowsers : [];
  const names = [];
  if (primary) names.push({ name: primary, primary: true });
  for (const s of siblings) {
    if (s && s !== primary) names.push({ name: s, primary: false });
  }
  return names;
}

/**
 * Artifacts actually captured for this failure. Absent artifacts are reported
 * as absent — never fabricated.
 */
export function buildArtifacts(pack) {
  const by = itemsById(pack);
  const raw = (by.E11 && by.E11.raw) || {};
  const screenshots = Array.isArray(raw.screenshots) ? raw.screenshots.filter(Boolean) : [];
  return {
    screenshots,
    trace: raw.trace || null,
    video: raw.video || null,
    any: screenshots.length > 0 || !!raw.trace || !!raw.video,
  };
}

/**
 * When the failure started / how it behaves across the run window.
 */
export function buildBoundary(pack) {
  const by = itemsById(pack);
  if (!present(by.E10)) return [];
  const raw = (by.E10 && by.E10.raw) || {};
  return Array.isArray(raw.classificationReasons) ? raw.classificationReasons.filter(Boolean) : [];
}

/**
 * Human-readable reasons behind the analyzer's own confidence score.
 * A-codes are dropped; only the prose reasons survive.
 */
export function buildConfidenceReasons(pack) {
  const explain = pack && pack.deterministic && pack.deterministic.confidenceExplain;
  const adjustments = explain && Array.isArray(explain.adjustments) ? explain.adjustments : [];
  return adjustments.map((a) => (a && a.reason ? a.reason : "")).filter(Boolean);
}

/**
 * Labels for evidence the analyzer could not capture, so the UI can say what
 * is missing without printing "NOT AVAILABLE" strings or evidence IDs.
 */
export function buildMissingEvidence(pack, labelFor) {
  const items = (pack && pack.items) || [];
  return items
    .filter((item) => item && item.present === false)
    .map((item) => (typeof labelFor === "function" ? labelFor(item.id) : item.id))
    .filter(Boolean);
}

/**
 * Everything the Overview and Evidence tabs need, in one call.
 */
export function buildInsights(pack) {
  const stats = buildExecutionStats(pack);
  return {
    subject: (pack && pack.subject) || {},
    stats,
    retry: buildRetryStats(pack),
    pattern: buildFailurePattern(pack),
    error: buildErrorDetail(pack),
    code: buildCodeDetail(pack),
    browsers: buildBrowsers(pack),
    artifacts: buildArtifacts(pack),
    boundary: buildBoundary(pack),
    confidenceReasons: buildConfidenceReasons(pack),
  };
}
