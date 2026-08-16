import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { guardVerdict, GUARD_RULES } from "../lib/verdict-guard.js";
import { buildEvidencePack } from "../lib/evidence-pack.js";

const flaky = JSON.parse(readFileSync(new URL("./fixtures/investigation.flaky.json", import.meta.url), "utf8"));
const sparse = JSON.parse(readFileSync(new URL("./fixtures/investigation.sparse.json", import.meta.url), "utf8"));
const validVerdict = JSON.parse(readFileSync(new URL("./fixtures/verdict.valid.json", import.meta.url), "utf8"));
const hallucinated = JSON.parse(readFileSync(new URL("./fixtures/verdict.hallucinated.json", import.meta.url), "utf8"));

function flakyPack() {
  return buildEvidencePack(flaky, { siblingBrowsers: ["firefox", "webkit"] });
}

test("G1: null verdict returns synthesized INSUFFICIENT_EVIDENCE", () => {
  const out = guardVerdict(null, flakyPack());
  assert.equal(out.passed, false);
  assert.equal(out.verdict.category, "INSUFFICIENT_EVIDENCE");
  assert.ok(out.violations.some((v) => v.code === "G1"));
});

test("G2: hallucinated citation E99 is stripped", () => {
  const out = guardVerdict(hallucinated, flakyPack());
  assert.ok(out.strippedCitations.includes("E99"));
  assert.ok(out.violations.some((v) => v.code === "G2"));
  assert.deepEqual(out.verdict.rootCause.citedEvidence, ["E4"]);
});

test("G3: citation of absent evidence is stripped", () => {
  // Make E5 absent by using the sparse pack.
  const out = guardVerdict(hallucinated, buildEvidencePack(sparse, { siblingBrowsers: [] }));
  assert.ok(out.strippedCitations.includes("E5"));
  assert.ok(out.violations.some((v) => v.code === "G3"));
});

test("G4: root cause with only invalid citations forces INSUFFICIENT_EVIDENCE", () => {
  const bad = JSON.parse(JSON.stringify(validVerdict));
  bad.rootCause.citedEvidence = ["E99"];
  const out = guardVerdict(bad, flakyPack());
  assert.equal(out.verdict.category, "INSUFFICIENT_EVIDENCE");
  assert.equal(out.forcedInsufficient, true);
  assert.equal(out.verdict.confidenceBand, "LOW");
  assert.equal(out.verdict.recommendedAction.owner, "NEEDS_TRIAGE");
  assert.ok(out.verdict.evidenceGaps.length > 0);
});

test("G5: reasoning step with no valid citations is dropped", () => {
  const bad = JSON.parse(JSON.stringify(validVerdict));
  bad.reasoning = [{ step: "unsupported claim", citedEvidence: ["E99"] }];
  const out = guardVerdict(bad, flakyPack());
  assert.equal(out.verdict.reasoning.length, 0);
  assert.ok(out.violations.some((v) => v.code === "G5"));
});

test("G7: HIGH deterministic vs LOW AI marks disagreement", () => {
  const bad = JSON.parse(JSON.stringify(validVerdict));
  bad.confidenceBand = "LOW";
  bad.category = "FLAKY_TIMING";
  const out = guardVerdict(bad, flakyPack());
  assert.equal(out.agreement.status, "DISAGREE");
  assert.equal(out.agreement.humanReviewRecommended, true);
  assert.ok(out.violations.some((v) => v.code === "G7"));
});

test("G10: prose leakage is stripped and violation recorded", () => {
  const out = guardVerdict(hallucinated, flakyPack());
  assert.ok(out.violations.some((v) => v.code === "G10"));
  for (const token of ["E4", "RC-018", "FP-A31C09"]) {
    assert.equal(out.verdict.headline.includes(token), false);
  }
});

test("guard exports all 10 rules", () => {
  assert.deepEqual(GUARD_RULES, ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10"]);
});
