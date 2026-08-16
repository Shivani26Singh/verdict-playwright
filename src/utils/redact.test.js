"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const { redactString, redactDeep } = require("./redact");

test("redacts a bearer token", () => {
  const r = redactString("Authorization: Bearer abc123DEF456ghi");
  assert.ok(!r.value.includes("abc123DEF456ghi"));
  assert.ok(r.count >= 1);
});

test("redacts an email address", () => {
  const r = redactString("login failed for user jane.doe@example.com");
  assert.ok(r.value.includes("[REDACTED_EMAIL]"));
  assert.ok(!r.value.includes("jane.doe@example.com"));
});

test("redacts an IPv4 address", () => {
  const r = redactString("ECONNREFUSED 10.0.12.34:5432");
  assert.ok(r.value.includes("[REDACTED_IP]"));
});

test("redacts an OpenAI-style key and a JWT", () => {
  assert.ok(redactString("key sk-ABCDEFGHIJKLMNOP1234").value.includes("[REDACTED_KEY]"));
  assert.ok(
    redactString("token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9").value.includes("[REDACTED_JWT]")
  );
});

test("leaves ordinary text untouched (no false positives)", () => {
  const s = "Timeout 30000ms exceeded waiting for locator button#submit";
  const r = redactString(s);
  assert.strictEqual(r.value, s);
  assert.strictEqual(r.count, 0);
});

test("handles empty / non-string input", () => {
  assert.deepStrictEqual(redactString(""), { value: "", count: 0 });
  assert.deepStrictEqual(redactString(null), { value: null, count: 0 });
});

test("redactDeep walks nested structures without mutating the input", () => {
  const input = {
    a: "contact me@x.io",
    b: ["plain", "Bearer zzzzzzzzzzzz"],
    c: { d: "10.1.2.3" },
    n: 5,
  };
  const snapshot = JSON.parse(JSON.stringify(input));
  const out = redactDeep(input);
  assert.deepStrictEqual(input, snapshot, "input must not be mutated");
  assert.ok(out.count >= 3);
  assert.ok(out.data.a.includes("[REDACTED_EMAIL]"));
  assert.ok(!out.data.b[1].includes("zzzzzzzzzzzz"));
  assert.ok(out.data.c.d.includes("[REDACTED_IP]"));
  assert.strictEqual(out.data.n, 5);
});
