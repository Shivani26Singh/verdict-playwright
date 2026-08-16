"use strict";

/**
 * Sanity-checks the catalog against the analyzer BEFORE generating the report:
 *   - every failing test's error reaches its intended investigation rule (RC-xxx)
 *   - reports which of the 20 rules and 9 failure categories are covered
 * Run: node scripts/verify-catalog.js
 */
const path = require("path");
const ANALYZER = path.join(__dirname, "..", "..", "playwright-flaky-analyzer");
const { runRules } = require(path.join(ANALYZER, "src/investigation/rule-engine"));
const { classifyError } = require(path.join(ANALYZER, "src/analyzer/failure-classifier"));
const RULES = require(path.join(ANALYZER, "src/knowledge/rules"));
const { FAILING } = require("../data/catalog");

// history that reaches behaviour rules honestly (RC-005 needs >=90% fail; RC-006 needs alternation)
function historyFor(cls, pattern) {
  if (pattern) return pattern.split("").map((c) => (c === "F" ? "failed" : "passed"));
  return { stable_failure: ["failed", "failed", "failed", "failed"], flaky: ["passed", "failed", "passed", "failed"], newly_failed: ["passed", "passed", "passed", "failed"], fixed: ["failed", "passed"], regression: ["failed", "passed", "passed", "failed"] }[cls] || ["failed"];
}

let ok = 0, bad = 0;
const rulesHit = new Set();
const catsHit = new Set();
console.log("RULE   EXPECT ACTUAL  CATEGORY      TEST");
for (const t of FAILING) {
  const history = historyFor(t.cls, t.pattern || (t.perProject && Object.values(t.perProject)[0] && Object.values(t.perProject)[0].pattern));
  const test = { classifiedErrors: [{ message: t.error.message, stack: t.error.stack, category: classifyError({ message: t.error.message }) }], errors: [{ message: t.error.message, stack: t.error.stack }], history };
  const r = runRules(test);
  const actual = r && r.result ? r.result.ruleCode : "(none)";
  const cat = classifyError({ message: t.error.message });
  rulesHit.add(actual); catsHit.add(cat);
  const pass = actual === t.rule;
  if (pass) ok++; else bad++;
  console.log((pass ? "ok  " : "FAIL") + " " + t.rule.padEnd(7) + t.rule.padEnd(0) + " " + actual.padEnd(7) + cat.padEnd(14) + t.suite + " > " + t.title);
}
const allRules = RULES.map((r) => r.code).sort();
const missingRules = allRules.filter((c) => !rulesHit.has(c));
const allCats = ["timeout", "locator", "assertion", "network", "backend", "authentication", "environment", "data", "unknown"];
const missingCats = allCats.filter((c) => !catsHit.has(c));
console.log("\nintended-rule matches: " + ok + " ok, " + bad + " mismatched");
console.log("rules exercised (" + rulesHit.size + "/20): " + [...rulesHit].sort().join(", "));
console.log("rules NOT exercised: " + (missingRules.length ? missingRules.join(", ") : "none"));
console.log("categories exercised (" + catsHit.size + "/9): " + [...catsHit].sort().join(", "));
console.log("categories NOT exercised: " + (missingCats.length ? missingCats.join(", ") : "none"));
process.exit(bad === 0 && missingRules.length === 0 && missingCats.length === 0 ? 0 : 1);
