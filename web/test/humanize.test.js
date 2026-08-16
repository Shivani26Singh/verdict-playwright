import test from "node:test";
import assert from "node:assert/strict";
import { humanizeEvidenceGap, humanizeEvidenceLabel } from "../lib/humanize.js";

/**
 * evidenceGaps is the one user-visible list the Verdict Guard's prose cleaner
 * does not touch — the model fills it in freely, so a raw "E8" can reach the
 * UI. These cover that leak path.
 */

test("a bare evidence id becomes its human label", () => {
  assert.equal(humanizeEvidenceGap("E8"), "Browser");
  assert.equal(humanizeEvidenceGap("E11"), "Available evidence");
  assert.equal(humanizeEvidenceGap("E1"), "Execution history");
});

test("the 'Missing evidence:' prefix is dropped", () => {
  assert.equal(humanizeEvidenceGap("Missing evidence: E5"), "Code location");
  assert.equal(humanizeEvidenceGap("Missing evidence: a trace"), "a trace");
});

test("an id embedded in a sentence is replaced in place", () => {
  assert.equal(
    humanizeEvidenceGap("No E11 was captured for this run"),
    "No Available evidence was captured for this run"
  );
});

test("plain prose is left alone", () => {
  assert.equal(humanizeEvidenceGap("More execution history"), "More execution history");
});

test("empty and nullish entries collapse to an empty string", () => {
  assert.equal(humanizeEvidenceGap(""), "");
  assert.equal(humanizeEvidenceGap(null), "");
  assert.equal(humanizeEvidenceGap("Missing evidence:   "), "");
});

test("no evidence id survives humanization", () => {
  const leakage = /\bE(1[01]|[1-9])\b/;
  for (let i = 1; i <= 11; i++) {
    const id = `E${i}`;
    assert.ok(!leakage.test(humanizeEvidenceGap(id)), `${id} leaked as a bare gap`);
    assert.ok(
      !leakage.test(humanizeEvidenceGap(`Missing evidence: ${id}`)),
      `${id} leaked behind the prefix`
    );
    assert.notEqual(humanizeEvidenceLabel(id), id);
  }
});
