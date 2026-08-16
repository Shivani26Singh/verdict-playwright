"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const registry = require("./index");
const { validateAiInvestigation } = require("../ai-schema");

test("registry ships offline mock + file providers", () => {
  assert.ok(registry.listProviders().includes("mock"));
  assert.ok(registry.listProviders().includes("file"));
  assert.strictEqual(registry.getProvider("nope"), null);
});

test("ensureLoaded lazily registers the network anthropic adapter", () => {
  const p = registry.ensureLoaded("anthropic");
  assert.ok(p);
  assert.strictEqual(p.mode, "network");
  assert.strictEqual(registry.isNetworkProvider("anthropic"), true);
  assert.strictEqual(registry.isNetworkProvider("mock"), false);
});

test("register rejects a provider without investigate()", () => {
  assert.throws(() => registry.register("bad", {}));
});

test("mock.buildOverlay returns a schema-valid overlay", () => {
  const mock = require("./mock");
  const overlay = mock.buildOverlay({
    summary: { totalTests: 2, runsAnalyzed: 3 },
    health: { overallPassRate: 60 },
    failureCategories: { counts: { timeout: 2 } },
    problematicTests: [
      { title: "A", classification: "flaky", failureCategory: "timeout" },
      { title: "B", classification: "stable_failure", failureCategory: "locator" },
    ],
  });
  assert.deepStrictEqual(validateAiInvestigation(overlay), []);
  assert.strictEqual(overlay.flakyTests.length, 1);
  assert.strictEqual(overlay.consistentFailures.length, 1);
});

test("file.loadFromFile parses valid JSON and throws clearly otherwise", () => {
  const file = require("./file");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pfa-ai-"));
  const good = path.join(dir, "good.json");
  const bad = path.join(dir, "bad.json");
  fs.writeFileSync(good, JSON.stringify({ executiveSummary: "hi" }));
  fs.writeFileSync(bad, "{ not json");

  assert.deepStrictEqual(file.loadFromFile(good), { executiveSummary: "hi" });
  assert.throws(() => file.loadFromFile(bad), /not valid JSON/);
  assert.throws(() => file.loadFromFile(path.join(dir, "missing.json")), /not found/);
  assert.throws(() => file.loadFromFile(null), /requires a path/);
});

test("anthropic adapter extracts a JSON object from noisy model text", () => {
  const anthropic = require("./anthropic");
  const text = 'Here you go:\n{"executiveSummary": "x", "nested": {"a": 1}} \nHope that helps!';
  assert.deepStrictEqual(
    anthropic.extractJsonObject(text),
    '{"executiveSummary": "x", "nested": {"a": 1}}'
  );
  assert.throws(() => anthropic.extractJsonObject("no json here"));
});
