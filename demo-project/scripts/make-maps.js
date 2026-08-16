"use strict";

/**
 * Generates docs/RULE_MAP.md and docs/FEATURE_MAP.md directly from data/catalog.js so
 * the mappings are always exact. Run: npm run maps
 */
const fs = require("fs");
const path = require("path");
const { FAILING, RUNS } = require("../data/catalog");

const DOCS = path.join(__dirname, "..", "docs");
fs.mkdirSync(DOCS, { recursive: true });

const RULE_NAMES = {
  "RC-001": "Generic / wait / navigation timeout",
  "RC-002": "Locator not found",
  "RC-003": "Assertion failure (toBe / toEqual / toBeCloseTo)",
  "RC-004": "Network error (connection refused / DNS)",
  "RC-005": "Consistently failing — not flaky",
  "RC-006": "Race condition / rapid alternation",
  "RC-007": "Generic failure (no known pattern)",
  "RC-008": "Element not visible",
  "RC-009": "Click timeout (element not actionable)",
  "RC-010": "Element detached from the DOM",
  "RC-011": "Strict-mode violation (locator matched many)",
  "RC-012": "toHaveText mismatch",
  "RC-013": "toHaveTitle mismatch",
  "RC-014": "net::ERR_ navigation / TLS failure",
  "RC-015": "HTTP 401 Unauthorized (session/token)",
  "RC-016": "HTTP 403 Forbidden (permission)",
  "RC-017": "HTTP 404 Not Found",
  "RC-018": "HTTP 500 Internal Server Error (backend)",
  "RC-019": "ECONNRESET (dropped connection)",
  "RC-020": "Target / browser closed (crash / OOM)",
};

const browserNote = (t) => {
  if (!t.perProject) return "";
  const only = Object.entries(t.perProject).filter(([, v]) => v.cls && v.cls !== "stable_pass").map(([b]) => b);
  return only.length && only.length < 3 ? ` _(${only.join("/")} only)_` : "";
};
const ref = (t) => `\`${t.suite} > ${t.title}\`${browserNote(t)}`;

// ---- RULE_MAP.md ----
const byRule = {};
for (const t of FAILING) (byRule[t.rule] = byRule[t.rule] || []).push(t);
let rm = "# Investigation Rule → Test Map\n\n";
rm += "Every one of the analyzer's 20 root-cause rules (RC-001 … RC-020) is exercised by at least one\n";
rm += "real test in this suite. Verify with `npm run verify`.\n\n";
rm += "| Rule | Root cause | Demonstrated by |\n|------|------------|-----------------|\n";
for (const code of Object.keys(RULE_NAMES)) {
  const tests = byRule[code] || [];
  rm += `| **${code}** | ${RULE_NAMES[code]} | ${tests.map(ref).join("<br>") || "—"} |\n`;
}
fs.writeFileSync(path.join(DOCS, "RULE_MAP.md"), rm);

// ---- FEATURE_MAP.md ----
const find = (pred) => FAILING.filter(pred);
const first = (pred) => FAILING.find(pred);
const rc = (code) => first((t) => t.rule === code);
const withEvidence = (kind) => find((t) => t.evidence && t.evidence[kind]);

const rows = [
  ["Stable Pass", "42 passing tests across every module (e.g. `Authentication > signs in with email and password`)"],
  ["Stable Fail", `${ref(rc("RC-018"))} and ${ref(rc("RC-005"))}`],
  ["Newly Failed", `${ref(rc("RC-002"))}, ${ref(rc("RC-013"))}`],
  ["Fixed Tests", "`Analytics > reconciles funnel totals against the source dataset` (green again in the latest run)"],
  ["Flaky Tests", `${ref(rc("RC-009"))}, ${ref(rc("RC-006"))}`],
  ["Regression", `${ref(first((t) => t.cls === "regression"))} (green mid-history, failing again now)`],
  ["Retry Timeline", `All ${RUNS} runs — retries per run rise on the flaky-heavy sprints, with a trend line over the bars`],
  ["Retry Statistics — recovers", `${ref(rc("RC-009"))} (fails first attempt, passes on retry)`],
  ["Retry Statistics — exhausted", `${ref(rc("RC-018"))} (2 retries, all fail)`],
  ["Browser Comparison", "`Tasks > reorders a task via drag and drop` _(webkit only)_ and `Dashboard > formats the revenue tile as localized currency` _(firefox only)_"],
  ["Failure Categories", "All 9 categories populated: timeout, locator, assertion, network, backend, authentication, environment, data, unknown"],
  ["Failure Frequency", `${ref(rc("RC-005"))} (fails in every run — top of the list)`],
  ["Flaky Tests Trend", `Always on, no flag — flaky count per run across all ${RUNS} analyzed runs, aligned with Retries Per Run on the same axis`],
  ["Slowest Tests", "`Reports > delivers the PDF export within the 30s SLA`, `Reports > builds a report from the query editor`"],
  ["Evidence — Screenshots", withEvidence("shot").slice(0, 2).map(ref).join(", ")],
  ["Evidence — Videos", withEvidence("video").slice(0, 2).map(ref).join(", ")],
  ["Evidence — Trace Viewer links", withEvidence("trace").slice(0, 2).map(ref).join(", ")],
  ["Root Cause Analysis", "Every failing/flaky card — 20 distinct RC rules (see RULE_MAP.md)"],
  ["Suggested Fixes", "Each investigation lists 5 concrete, rule-specific checks"],
  ["Investigation Summary", "Header counts of regressions / flaky / newly-failed with the dominant root cause"],
  ["Search", "Type `billing` or `timeout` to filter the investigation list live"],
  ["Filter", "Filter chips: All / Regression / Flaky / New Failure"],
  ["Expand / Collapse", "Expand All / Collapse All, or click any investigation card header"],
  ["Evidence Preview", `Click a screenshot thumbnail on ${ref(rc("RC-009"))} to open the inline preview`],
];
let fm = "# HTML Report Feature → Test Map\n\n";
fm += "Where to see each analyzer dashboard capability in the generated `flaky-report/index.html`.\n\n";
fm += "| Dashboard feature | Demonstrated by |\n|-------------------|-----------------|\n";
for (const [f, d] of rows) fm += `| **${f}** | ${d} |\n`;
fs.writeFileSync(path.join(DOCS, "FEATURE_MAP.md"), fm);

console.log("wrote docs/RULE_MAP.md and docs/FEATURE_MAP.md");
