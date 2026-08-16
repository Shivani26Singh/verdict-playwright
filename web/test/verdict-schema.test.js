import { test } from "node:test";
import assert from "node:assert/strict";
import { VerdictSchema } from "../lib/verdict-schema.js";
import { readFileSync } from "node:fs";

const valid = JSON.parse(readFileSync(new URL("./fixtures/verdict.valid.json", import.meta.url), "utf8"));

test("valid verdict parses successfully", () => {
  const parsed = VerdictSchema.safeParse(valid);
  assert.equal(parsed.success, true);
});

test("unknown category fails", () => {
  const parsed = VerdictSchema.safeParse({ ...valid, category: "UNKNOWN" });
  assert.equal(parsed.success, false);
});

test("extra top-level key fails (strict)", () => {
  const parsed = VerdictSchema.safeParse({ ...valid, extra: true });
  assert.equal(parsed.success, false);
});

test("missing citedEvidence fails", () => {
  const bad = JSON.parse(JSON.stringify(valid));
  delete bad.rootCause.citedEvidence;
  assert.equal(VerdictSchema.safeParse(bad).success, false);
});
