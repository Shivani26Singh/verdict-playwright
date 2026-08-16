/**
 * Builds the INTERNAL evidence pack (E1..E11) from a trimmed investigation.
 * This is layer 1 — consumed by the server, the prompt, and the Guard.
 * `raw` is structured data for the UI and is never sent to the model.
 */

import { confidenceBand } from "./confidence.js";
import { humanizeEvidenceLabel } from "./humanize.js";

const NOT_AVAILABLE = (why) => `NOT AVAILABLE — ${why}`;

function allArtifactsExplicit(evidence) {
  const e = evidence || {};
  const ss = Array.isArray(e.screenshots) && e.screenshots.length > 0;
  const trace = !!e.trace;
  const video = !!e.video;
  return [
    ss ? "Screenshot: captured" : "Screenshot: not captured",
    trace ? "Trace: captured" : "Trace: not captured",
    video ? "Video: captured" : "Video: not captured",
  ].join(" | ");
}

function hasCodeFrame(evidence) {
  const e = evidence || {};
  return !!e.codeFrame || !!e.codeFrameLocation;
}

function hasRetryBehaviour(inv) {
  const retries = Array.isArray(inv.retriesPerRun) ? inv.retriesPerRun : [];
  return retries.some((r) => typeof r === "number" && r > 0) || inv.passedOnRetry || inv.retriesToPass > 0;
}

function formatRetryValue(inv) {
  const retries = Array.isArray(inv.retriesPerRun) ? inv.retriesPerRun : [];
  const recovered = retries.filter((r) => typeof r === "number" && r > 0).length;
  const failedRuns = (inv.history || []).filter((h) => h === "failed").length;
  if (recovered === 0) {
    return NOT_AVAILABLE("no retry recovery was observed for this failure");
  }
  return `Recovered on retry in ${recovered} of ${failedRuns} failed runs`;
}

function formatExecutionHistory(inv) {
  const history = inv.history || [];
  const failed = history.filter((h) => h === "failed").length;
  const passed = history.filter((h) => h === "passed").length;
  const total = history.length;
  const transitions = history.reduce((n, h, i) => {
    if (i === 0) return n;
    const prev = history[i - 1];
    if ((prev === "passed" && h === "failed") || (prev === "failed" && h === "passed")) return n + 1;
    return n;
  }, 0);
  if (failed === 0) return `Passed in all ${total} runs`;
  return `Failed in ${failed} of ${total} runs${transitions > 0 ? `, with ${transitions} pass/fail transitions` : ""}${passed > 0 ? ", passing intermittently" : ", consistently failing"}`;
}

function formatRuleValue(inv) {
  if (!inv.matchedRuleCode) return NOT_AVAILABLE("no deterministic rule matched this failure");
  return `${inv.likelyCause || "Cause could not be identified"}. ${inv.explanation || ""}`.trim();
}

function formatBrowserValue(inv, siblingBrowsers) {
  const browser = inv.browser || "Unknown";
  if (!siblingBrowsers || siblingBrowsers.length === 0) {
    return NOT_AVAILABLE("only one browser was analysed");
  }
  return `${browser} — also analysed on ${siblingBrowsers.join(", ")}`;
}

function buildItems(inv, siblingBrowsers) {
  const evidence = inv.evidence || {};
  const parsedError = evidence.parsedError || {};
  const parsedPresent = !!(parsedError.header || parsedError.locator || parsedError.expected || parsedError.received || parsedError.timeout || parsedError.callLog);
  const stackPresent = !!(evidence.stackTrace || evidence.codeFrame || evidence.codeFrameLocation);
  const categoryPresent = !!inv.category && String(inv.category).toLowerCase() !== "unknown";
  const rulePresent = !!inv.matchedRuleCode;
  const fingerprintPresent = !!inv.fingerprint;
  const corroboration = Number(inv.fingerprintGroupCount) || 0;
  const regressionReasons = Array.isArray(inv.classificationReasons) && inv.classificationReasons.length > 0;
  const confidenceExplain = inv.confidenceExplain || null;

  return [
    {
      id: "E1",
      label: "Execution history",
      kind: "history",
      present: true,
      value: formatExecutionHistory(inv),
      raw: { history: inv.history || [], runCount: inv.runCount || 0 },
    },
    {
      id: "E2",
      label: "Matched deterministic rule",
      kind: "rule",
      present: rulePresent,
      value: rulePresent ? formatRuleValue(inv) : NOT_AVAILABLE("no rule matched"),
      raw: { matchedRuleCode: inv.matchedRuleCode || null, likelyCause: inv.likelyCause || null, explanation: inv.explanation || null },
    },
    {
      id: "E3",
      label: "Failure category",
      kind: "category",
      present: categoryPresent,
      value: categoryPresent ? inv.category : NOT_AVAILABLE("failure category is unknown"),
      raw: { category: categoryPresent ? inv.category : "unknown" },
    },
    {
      id: "E4",
      label: "Parsed primary error",
      kind: "error",
      present: parsedPresent,
      value: parsedPresent
        ? [parsedError.header, parsedError.locator ? `Locator: ${parsedError.locator}` : null, parsedError.expected ? `Expected: ${parsedError.expected}` : null, parsedError.received ? `Received: ${parsedError.received}` : null, parsedError.timeout ? `Timeout: ${parsedError.timeout}` : null, parsedError.callLog ? `Call log: ${parsedError.callLog}` : null].filter(Boolean).join(" — ")
        : NOT_AVAILABLE("no structured error was parsed for this failure"),
      raw: parsedPresent ? parsedError : null,
    },
    {
      id: "E5",
      label: "Stack trace & code frame",
      kind: "code",
      present: stackPresent,
      value: stackPresent
        ? [evidence.stackTrace, evidence.codeFrame, evidence.codeFrameLocation ? `Location: ${evidence.codeFrameLocation}` : null].filter(Boolean).join(" — ")
        : NOT_AVAILABLE("no stack trace or code frame was captured for this failure"),
      raw: { stackTrace: evidence.stackTrace || null, codeFrame: evidence.codeFrame || null, codeFrameLocation: evidence.codeFrameLocation || null },
    },
    {
      id: "E6",
      label: "Retry behaviour",
      kind: "retry",
      present: hasRetryBehaviour(inv),
      value: hasRetryBehaviour(inv) ? formatRetryValue(inv) : NOT_AVAILABLE("no retry recovery was observed for this failure"),
      raw: { retriesPerRun: inv.retriesPerRun || [], passedOnRetry: inv.passedOnRetry || false, retriesToPass: inv.retriesToPass || 0 },
    },
    {
      id: "E7",
      label: "Fingerprint corroboration",
      kind: "fingerprint",
      present: fingerprintPresent,
      value: fingerprintPresent
        ? `${corroboration === 0 ? "No other test" : corroboration === 1 ? "1 other test" : `${corroboration} other tests`} show${corroboration === 1 ? "s" : ""} a similar failure pattern`
        : NOT_AVAILABLE("no failure fingerprint was computed"),
      raw: { fingerprint: inv.fingerprint || null, fingerprintGroupCount: corroboration },
    },
    {
      id: "E8",
      label: "Browser scope",
      kind: "browser",
      present: !!(siblingBrowsers && siblingBrowsers.length > 0),
      value: formatBrowserValue(inv, siblingBrowsers),
      raw: { browser: inv.browser || null, siblingBrowsers: siblingBrowsers || [] },
    },
    {
      id: "E9",
      label: "Confidence explanation",
      kind: "confidence",
      present: true,
      value: confidenceExplain
        ? `Base confidence ${confidenceExplain.baseConfidence}%. ${(confidenceExplain.adjustments || []).map((a) => a.reason).join(" · ")}`
        : "No confidence explanation available",
      raw: confidenceExplain,
    },
    {
      id: "E10",
      label: "Regression boundary",
      kind: "boundary",
      present: regressionReasons,
      value: regressionReasons
        ? inv.classificationReasons.join(" · ")
        : NOT_AVAILABLE("no regression boundary was recorded"),
      raw: { classificationReasons: inv.classificationReasons || [], firstSeenRun: inv.firstSeenRun ?? null, lastSeenRun: inv.lastSeenRun ?? null },
    },
    {
      id: "E11",
      label: "Available artifacts",
      kind: "artifacts",
      present: true,
      value: allArtifactsExplicit(evidence),
      raw: {
        screenshots: Array.isArray(evidence.screenshots) ? evidence.screenshots : [],
        trace: evidence.trace || null,
        video: evidence.video || null,
      },
    },
  ];
}

/**
 * @param {Object} inv — trimmed investigation
 * @param {Object} opts — { siblingBrowsers, redaction }
 */
export function buildEvidencePack(inv, opts = {}) {
  const siblingBrowsers = Array.isArray(opts.siblingBrowsers) ? opts.siblingBrowsers : [];
  const items = buildItems(inv, siblingBrowsers);
  const presentIds = items.filter((i) => i.present).map((i) => i.id);
  const absentIds = items.filter((i) => !i.present).map((i) => i.id);
  const confidenceExplain = inv.confidenceExplain || null;
  const confidence = typeof inv.confidence === "number" ? inv.confidence : (confidenceExplain ? confidenceExplain.finalConfidence : 0);

  return {
    packVersion: "1.0.0",
    subject: {
      testName: inv.testName || inv.title || "",
      file: inv.file || null,
      browser: inv.browser || null,
      classification: inv.classification || "unknown",
      runCount: inv.runCount || 0,
    },
    items,
    presentIds,
    absentIds,
    deterministic: {
      confidence,
      band: confidenceBand(confidence),
      ruleCode: inv.matchedRuleCode || null,
      ruleId: inv.matchedRule || null,
      category: inv.category || null,
      classification: inv.classification || null,
      fingerprint: inv.fingerprint || null,
      fingerprintGroupCount: Number(inv.fingerprintGroupCount) || 0,
      severity: inv.severity || "medium",
      adjustments: confidenceExplain ? confidenceExplain.adjustments || [] : [],
      confidenceExplain,
    },
    redaction: {
      applied: !!(opts.redaction && opts.redaction.count > 0),
      count: (opts.redaction && opts.redaction.count) || 0,
      stage: "build",
    },
  };
}

export function synthesizedInsufficientEvidence(pack) {
  const absentIds = pack && pack.absentIds ? pack.absentIds : [];
  return {
    category: "INSUFFICIENT_EVIDENCE",
    headline: "There is not enough evidence to determine the cause of this failure.",
    rootCause: { statement: "The available evidence does not distinguish between product, test, and environment causes.", citedEvidence: [] },
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
    evidenceGaps: absentIds.length ? absentIds.map((id) => humanizeEvidenceLabel(id)) : ["More execution history"],
  };
}
