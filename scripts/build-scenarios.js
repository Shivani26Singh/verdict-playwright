"use strict";

/**
 * Build-time scenario generator.
 *
 * Runs the UNCHANGED deterministic analyzer over demo-project/ci-runs, trims,
 * redacts, builds internal evidence packs, applies the Verdict Guard, and
 * writes committed JSON into web/public/scenarios/.
 *
 * This is a plain Node CommonJS script at the repo root. It is the ONLY place
 * that imports the analyzer package.
 */

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { compare } = require("../src/analyzer/engine");
const { buildDashboardJson } = require("../src/reporter/dashboard-json");
const { redactDeep } = require("../src/utils/redact");

const REPO_ROOT = path.resolve(__dirname, "..");
const CI_DIR = path.join(REPO_ROOT, "demo-project", "ci-runs");
const EVIDENCE_DIR = path.join(REPO_ROOT, "demo-project", "evidence");
const OUT_DIR = path.join(REPO_ROOT, "web", "public", "scenarios");
const ASSET_DIR = path.join(REPO_ROOT, "web", "public", "demo-assets", "screenshots");

const SCENARIOS = [
  {
    id: "flaky-checkout",
    title: "confirms a declined card after the customer re-enters CVC",
    cardTitle: "Checkout — declined card retry",
    cardDescription: "A payment confirmation test that fails, then passes when retried.",
    runs: null,
    expected: { classification: "flaky" },
  },
  {
    id: "product-invoice-500",
    title: "generates the monthly invoice for an enterprise plan",
    cardTitle: "Billing — monthly invoice generation",
    cardDescription: "An invoice test that fails on every run with a server error.",
    runs: null,
    expected: { classification: "stable_failure", category: "Network", ruleCode: "RC-018" },
  },
  {
    id: "insufficient-evidence",
    title: "renders the header when the profile payload is partial",
    cardTitle: "Settings — theme preference",
    cardDescription: "A test that failed recently, with very little evidence captured.",
    runs: [19, 20],
    expected: { classification: "newly_failed", ruleCode: "RC-007", runCount: 2 },
  },
];

function readRunNumbers(nums) {
  return nums.map((n) => JSON.parse(fs.readFileSync(path.join(CI_DIR, `results-run${n}.json`), "utf8")));
}

function readAllRuns() {
  const files = fs
    .readdirSync(CI_DIR)
    .filter((f) => /^results-run\d+\.json$/.test(f))
    .sort((a, b) => {
      const n = (x) => Number(x.match(/run(\d+)/)[1]);
      return n(a) - n(b);
    });
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(CI_DIR, f), "utf8")));
}

function buildAnalysis(runs) {
  const result = compare(runs, { analyzer: { minFailures: 2 } });
  const dashboard = buildDashboardJson(result);
  return { result, dashboard };
}

function basenameFromUrl(url) {
  if (!url) return null;
  const normalized = String(url).replace(/\\/g, "/");
  const base = normalized.split("/").pop();
  return base || null;
}

function rewriteEvidenceUrl(url) {
  const base = basenameFromUrl(url);
  return base ? `/demo-assets/screenshots/${base}` : null;
}

function rewriteEvidence(evidence) {
  if (!evidence) return null;
  const out = JSON.parse(JSON.stringify(evidence));
  if (Array.isArray(out.screenshots)) {
    out.screenshots = out.screenshots.map(rewriteEvidenceUrl).filter(Boolean);
    if (out.screenshots.length === 0) out.screenshots = null;
  }
  if (out.trace) out.trace = rewriteEvidenceUrl(out.trace);
  if (out.video) out.video = rewriteEvidenceUrl(out.video);
  return out;
}

function findEngineResult(engineResults, title, browser) {
  return engineResults.find((r) => r.title === title && r.browser === browser) || null;
}

function siblingBrowsersFor(dashboardInvestigations, title, browser) {
  const set = new Set();
  for (const inv of dashboardInvestigations) {
    if (inv.testName === title && inv.browser && inv.browser !== browser) {
      set.add(inv.browser);
    }
  }
  return [...set];
}

function trimInvestigation(inv, engineResult) {
  const eng = engineResult || {};
  const out = {
    testName: inv.testName,
    file: eng.file || null,
    browser: inv.browser || null,
    classification: inv.classification || null,
    history: inv.history || [],
    retriesPerRun: inv.retriesPerRun || [],
    runCount: inv.runCount || 0,
    passedOnRetry: !!eng.passedOnRetry,
    retriesToPass: typeof eng.retriesToPass === "number" ? eng.retriesToPass : 0,
    firstSeenRun: typeof eng.firstSeenRun === "number" ? eng.firstSeenRun : null,
    lastSeenRun: typeof eng.lastSeenRun === "number" ? eng.lastSeenRun : null,
    matchedRuleCode: inv.matchedRuleCode || null,
    matchedRule: inv.matchedRule || null,
    category: inv.category || null,
    likelyCause: inv.likelyCause || null,
    explanation: inv.explanation || null,
    confidence: typeof inv.confidence === "number" ? inv.confidence : 0,
    severity: inv.severity || "medium",
    fingerprint: inv.fingerprint || null,
    fingerprintGroupCount: Number(inv.fingerprintGroupCount) || 0,
    classificationReasons: inv.classificationReasons || [],
    confidenceExplain: inv.confidenceExplain || null,
    evidence: rewriteEvidence(inv.evidence),
  };
  return out;
}

function humanizeHasNoInternalIds(pack, humanize) {
  const rows = humanize.humanizeObservedRows(pack);
  const parts = [
    ...rows.map((r) => r.label),
    ...rows.map((r) => r.value),
    humanize.humanizeAbsentSummary(pack),
    humanize.humanizeRule(pack && pack.deterministic && pack.deterministic.ruleCode),
    humanize.humanizeCategory(pack && pack.deterministic && pack.deterministic.category),
    ...humanize.humanizeConfidenceReasons(pack),
  ].filter((s) => typeof s === "string");
  const pattern = /\bE(1[01]|[1-9])\b|\bRC-\d{3}\b|\bFP-[0-9A-F]{6}\b|\bA[1-9]\b/;
  return !parts.some((s) => pattern.test(s));
}

function assertInvariants(scenario, pack, humanize) {
  const det = pack.deterministic || {};
  const items = pack.items || [];
  const errors = [];

  if (items.length !== 11) errors.push(`items.length=${items.length}, expected 11`);
  for (const item of items) {
    if (!item.id || !item.label || !("present" in item) || !("value" in item)) {
      errors.push(`item missing id/label/present/value: ${JSON.stringify(item)}`);
    }
  }
  if (JSON.stringify(pack).length >= 20000) {
    errors.push("pack exceeds 20_000 chars");
  }
  if (!humanizeHasNoInternalIds(pack, humanize)) {
    errors.push("humanized surface leaks internal identifiers");
  }

  if (scenario.id === "flaky-checkout") {
    if (det.classification !== "flaky") errors.push(`S1 classification=${det.classification}`);
    const e6 = items.find((i) => i.id === "E6");
    if (!e6 || e6.present !== true) errors.push("S1 E6 must be present");
    const e1 = items.find((i) => i.id === "E1");
    if (!e1 || !/\btransitions?\b/.test(e1.value || "")) errors.push("S1 E1 must show a pass/fail transition");
  }
  if (scenario.id === "product-invoice-500") {
    const e4 = items.find((i) => i.id === "E4");
    if (!e4 || !/\b500\b/.test(e4.value || "")) errors.push("S2 E4 must match 500");
    if (det.confidence < 80) errors.push(`S2 confidence=${det.confidence}`);
  }
  if (scenario.id === "insufficient-evidence") {
    if (pack.absentIds.length < 4) errors.push(`S3 absentIds=${pack.absentIds.length}`);
    if (det.confidence >= 50) errors.push(`S3 confidence=${det.confidence}`);
    const e11 = items.find((i) => i.id === "E11");
    if (e11 && /(Screenshot|Trace|Video): captured/i.test(e11.value || "")) {
      errors.push("S3 E11 must show no artifacts");
    }
    if (pack.subject.runCount !== 2) errors.push(`S3 runCount=${pack.subject.runCount}`);
  }

  if (errors.length) {
    throw new Error(`Assertions failed for ${scenario.id}:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * True when the scenario already has a verdict captured from a real model run
 * by scripts/refresh-ai-cache.mjs. Those must never be overwritten by the
 * hand-written placeholder below — a heuristic verdict presented as AI output
 * would be a lie about what the product does.
 */
function hasRealAiVerdict(scenarioId) {
  const file = path.join(OUT_DIR, `${scenarioId}.verdict.json`);
  if (!fs.existsSync(file)) return false;
  try {
    const existing = JSON.parse(fs.readFileSync(file, "utf8"));
    const provenance = existing && existing.provenance;
    return !!(provenance && provenance.provider && provenance.model);
  } catch {
    return false;
  }
}

/**
 * A hand-written stand-in used only to bootstrap a scenario before any model
 * has been called. It is NOT AI output and is never labelled as such — run
 * scripts/refresh-ai-cache.mjs to replace it with a genuine verdict.
 */
function heuristicVerdict(pack, scenarioId) {
  const items = pack.items || [];
  const byId = {};
  for (const it of items) byId[it.id] = it;

  if (scenarioId === "flaky-checkout") {
    return {
      category: "FLAKY_TIMING",
      headline: "The checkout failure is intermittent and usually recovers when the test is retried.",
      rootCause: {
        statement: "The payment confirmation button is not reliably ready when the test attempts to click it, and the failure tends to resolve on retry.",
        citedEvidence: ["E1", "E6", "E2"],
      },
      reasoning: [
        { step: "The test fails in some runs and passes in others, which points to timing rather than a permanently broken flow.", citedEvidence: ["E1"] },
        { step: "Most failed attempts recover when the test is retried.", citedEvidence: ["E6"] },
        { step: "The detected cause is that the payment button was not ready for interaction.", citedEvidence: ["E2"] },
      ],
      contradictingEvidence: [
        { point: "The error text resembles a product UI state, but the intermittent history argues against a stable product defect.", citedEvidence: ["E4"] },
      ],
      confidenceBand: "HIGH",
      confidenceRationale: "Execution history and retry recovery both agree on an intermittent timing cause.",
      recommendedAction: {
        owner: "QA_TEAM",
        action: "Replace the fixed wait with an assertion-based wait on the confirm button.",
        urgency: "P2",
        ticketDraft: "Stabilize the declined-card checkout test by waiting for the confirm button to be enabled before clicking.",
      },
      evidenceGaps: [],
    };
  }

  if (scenarioId === "product-invoice-500") {
    return {
      category: "PRODUCT_DEFECT",
      headline: "The invoice generation fails consistently with a server error.",
      rootCause: {
        statement: "The billing API returns HTTP 500 on every run, pointing to a backend defect in the invoice endpoint.",
        citedEvidence: ["E1", "E4", "E2"],
      },
      reasoning: [
        { step: "Every analyzed run failed, so this is a consistent defect rather than intermittent flakiness.", citedEvidence: ["E1"] },
        { step: "The error reports an HTTP 500 from the invoice endpoint.", citedEvidence: ["E4"] },
        { step: "The deterministic rule identifies a backend/API failure.", citedEvidence: ["E2"] },
      ],
      contradictingEvidence: [],
      confidenceBand: "HIGH",
      confidenceRationale: "A consistent failure history and an explicit server error agree.",
      recommendedAction: {
        owner: "DEV_TEAM",
        action: "Investigate the invoice endpoint for the HTTP 500 response and fix the underlying backend error.",
        urgency: "P1",
        ticketDraft: "Investigate and fix the HTTP 500 returned by the monthly invoice endpoint.",
      },
      evidenceGaps: [],
    };
  }

  return {
    category: "INSUFFICIENT_EVIDENCE",
    headline: "There is not enough evidence to determine the cause of this failure.",
    rootCause: {
      statement: "The available evidence does not distinguish between product, test, and environment causes.",
      citedEvidence: [],
    },
    reasoning: [
      { step: "Only a limited execution history is available for this failure.", citedEvidence: ["E1"] },
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
    evidenceGaps: (pack.absentIds || []).map((id) => `Missing evidence: ${id}`),
  };
}

function collectAssets(pack) {
  const urls = [];
  const e11 = (pack.items || []).find((i) => i.id === "E11");
  const raw = e11 && e11.raw;
  if (!raw) return urls;
  for (const u of raw.screenshots || []) urls.push(u);
  if (raw.trace) urls.push(raw.trace);
  if (raw.video) urls.push(raw.video);
  return urls;
}

function copyAssets(pack) {
  const urls = collectAssets(pack);
  const copied = [];
  for (const url of urls) {
    const base = basenameFromUrl(url);
    if (!base) continue;
    const src = path.join(EVIDENCE_DIR, base);
    const dest = path.join(ASSET_DIR, base);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      copied.push(base);
    }
  }
  return copied;
}

async function main() {
  const { buildEvidencePack, synthesizedInsufficientEvidence } = await import(
    pathToFileURL(path.join(REPO_ROOT, "web", "lib", "evidence-pack.js")).href
  );
  const { guardVerdict } = await import(
    pathToFileURL(path.join(REPO_ROOT, "web", "lib", "verdict-guard.js")).href
  );
  const humanize = await import(pathToFileURL(path.join(REPO_ROOT, "web", "lib", "humanize.js")).href);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(ASSET_DIR, { recursive: true });

  const index = [];

  for (const scenario of SCENARIOS) {
    const runs = scenario.runs ? readRunNumbers(scenario.runs) : readAllRuns();
    const { result, dashboard } = buildAnalysis(runs);
    const inv = dashboard.investigations.find((i) => i.testName === scenario.title && i.browser === "chromium");

    if (!inv) {
      throw new Error(`Target investigation not found for ${scenario.id}: ${scenario.title}`);
    }

    const engineResult = findEngineResult(result.results, scenario.title, inv.browser);
    const siblings = siblingBrowsersFor(dashboard.investigations, scenario.title, inv.browser);
    let trimmed = trimInvestigation(inv, engineResult);

    // S3 is a deliberately sparse scenario: the synthetic report still carries
    // evidence, so drop it entirely at build time to make E4/E5 truthfully
    // absent and E11 show no artifacts. This is scenario construction, not a
    // guard or analyzer change.
    if (scenario.id === "insufficient-evidence") {
      trimmed.evidence = null;
    }

    const redacted = redactDeep(trimmed);
    const investigation = redacted.data;

    const pack = buildEvidencePack(investigation, {
      siblingBrowsers: siblings,
      redaction: { count: redacted.count },
    });

    assertInvariants(scenario, pack, humanize);

    const copied = copyAssets(pack);

    fs.writeFileSync(path.join(OUT_DIR, `${scenario.id}.investigation.json`), JSON.stringify(investigation, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, `${scenario.id}.pack.json`), JSON.stringify(pack, null, 2));

    if (hasRealAiVerdict(scenario.id)) {
      console.log(`  ${scenario.id}: kept the existing model-generated verdict.`);
    } else {
      let rawVerdict = heuristicVerdict(pack, scenario.id);
      if (scenario.id === "insufficient-evidence") {
        rawVerdict = synthesizedInsufficientEvidence(pack);
      }

      const guard = guardVerdict(rawVerdict, pack);
      const placeholder = {
        verdict: guard.verdict,
        guard,
        provenance: {
          mode: "cached",
          reason:
            "Placeholder — NOT model output. Run scripts/refresh-ai-cache.mjs for a real verdict.",
          generatedAt: new Date().toISOString(),
        },
      };
      fs.writeFileSync(
        path.join(OUT_DIR, `${scenario.id}.verdict.json`),
        JSON.stringify(placeholder, null, 2)
      );
      console.log(
        `  ${scenario.id}: wrote a PLACEHOLDER verdict — run scripts/refresh-ai-cache.mjs.`
      );
    }

    const history = investigation.history || [];
    const failed = history.filter((h) => h === "failed").length;
    const transitions = history.reduce((n, h, i) => {
      if (i === 0) return n;
      const prev = history[i - 1];
      if ((prev === "passed" && h === "failed") || (prev === "failed" && h === "passed")) return n + 1;
      return n;
    }, 0);

    index.push({
      id: scenario.id,
      title: scenario.cardTitle,
      description: scenario.cardDescription,
      classification: investigation.classification,
      category: investigation.category,
      runCount: investigation.runCount,
      failedCount: failed,
      transitions,
      history,
      expected: scenario.expected,
    });

    console.log(`[built] ${scenario.id} — ${pack.absentIds.length} absent, copied ${copied.length} assets`);
  }

  fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2));
  console.log("[built] index.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
