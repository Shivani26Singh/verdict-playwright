import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildEvidencePack } from "../lib/evidence-pack.js";
import { humanizeObservedRows, humanizeAbsentSummary, humanizeHasNoInternalIds } from "../lib/humanize.js";

const flaky = JSON.parse(readFileSync(new URL("./fixtures/investigation.flaky.json", import.meta.url), "utf8"));
const sparse = JSON.parse(readFileSync(new URL("./fixtures/investigation.sparse.json", import.meta.url), "utf8"));

test("evidence pack always has 11 items E1..E11 in order", () => {
  const pack = buildEvidencePack(flaky, { siblingBrowsers: ["firefox", "webkit"] });
  assert.equal(pack.items.length, 11);
  assert.deepEqual(
    pack.items.map((i) => i.id),
    ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10", "E11"]
  );
  for (const item of pack.items) {
    assert.ok("id" in item);
    assert.ok("label" in item);
    assert.ok("present" in item);
    assert.ok("value" in item);
  }
});

test("evidence pack E11 value always names screenshot, trace, video", () => {
  const pack = buildEvidencePack(sparse, { siblingBrowsers: [] });
  const e11 = pack.items.find((i) => i.id === "E11");
  assert.match(e11.value, /Screenshot/i);
  assert.match(e11.value, /Trace/i);
  assert.match(e11.value, /Video/i);
});

test("sparse fixture has at least 4 absent items", () => {
  const pack = buildEvidencePack(sparse, { siblingBrowsers: [] });
  assert.ok(pack.absentIds.length >= 4, `expected >= 4, got ${pack.absentIds.length}`);
  assert.equal(pack.deterministic.confidence < 50, true);
  assert.equal(pack.subject.runCount, 2);
});

test("absent evidence value uses NOT AVAILABLE prefix", () => {
  const pack = buildEvidencePack(sparse, { siblingBrowsers: [] });
  for (const id of pack.absentIds) {
    const item = pack.items.find((i) => i.id === id);
    assert.match(item.value, /^NOT AVAILABLE — /);
  }
});

test("humanized observed rows list present items only", () => {
  const pack = buildEvidencePack(sparse, { siblingBrowsers: [] });
  const rows = humanizeObservedRows(pack);
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.equal(pack.items.find((i) => i.id === row.id).present, true);
  }
});

test("humanized absent summary contains no NOT AVAILABLE string", () => {
  const pack = buildEvidencePack(sparse, { siblingBrowsers: [] });
  const summary = humanizeAbsentSummary(pack);
  assert.ok(summary.length > 0);
  assert.doesNotMatch(summary, /NOT AVAILABLE/);
});

test("humanized surface has no internal identifiers", () => {
  const pack = buildEvidencePack(flaky, { siblingBrowsers: ["firefox", "webkit"] });
  assert.equal(humanizeHasNoInternalIds(pack), true);
});
