"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseErrorMessage } = require("./error-parser");

// Pattern A: a real Playwright locator-assertion timeout, verbatim shape
// (Locator/Expected/Received/Timeout/Call log all present as labeled lines).
const PATTERN_A = [
  "Error: expect(locator).toBeHidden() failed",
  "",
  "Locator:  locator('text=/Adding Well Data to the Master Data Administrator|wells have been updated/i')",
  "Expected: hidden",
  "Received: visible",
  "Timeout:  20000ms",
  "",
  "Call log:",
  '  - Expect "toBeHidden" with timeout 20000ms',
  "  - waiting for locator('text=/Adding Well Data to the Master Data Administrator|wells have been updated/i')",
  '    34 x locator resolved to <div font-weight="600" font-size="1.25rem" class="sc-iBYQkv dQDZXY" letter-spacing="-0.005rem">Adding Well Data to the Master Data Administrator...</div>',
  '      - unexpected value "visible"',
  "    8 x locator resolved to <p>The following wells have been updated:</p>",
  '      - unexpected value "visible"',
].join("\n");

// Pattern B: a Playwright action-timeout error — Call log only, no labeled
// Locator/Expected/Received/Timeout lines.
const PATTERN_B = [
  "Error: locator.fill: Test timeout of 240000ms exceeded.",
  "Call log:",
  "  - waiting for locator('#well-list-navigation-search')",
  '  - locator resolved to <input name="" value="" disabled type="text"/>',
  '  - fill("OXY")',
  "  - attempting fill action",
  "    2 x waiting for element to be visible, enabled and editable",
  "      - element is not enabled",
  "    - retrying fill action",
  "      - waiting 20ms",
  "    - waiting for element to be visible, enabled and editable",
  "      - element was detached from the DOM, retrying",
].join("\n");

// Pattern C: a plain one-liner with no structure at all.
const PATTERN_C = "Test timeout of 240000ms exceeded.";

describe("error-parser — parseErrorMessage", () => {
  it("Pattern A: extracts header, locator, expected, received, timeout, and the full call log", () => {
    const r = parseErrorMessage(PATTERN_A);
    assert.equal(r.header, "Error: expect(locator).toBeHidden() failed");
    assert.equal(
      r.locator,
      "locator('text=/Adding Well Data to the Master Data Administrator|wells have been updated/i')"
    );
    assert.equal(r.expected, "hidden");
    assert.equal(r.received, "visible");
    assert.equal(r.timeout, "20000ms");
    assert.ok(r.callLog.includes('Expect "toBeHidden" with timeout 20000ms'));
    assert.ok(r.callLog.includes("34 x locator resolved to"));
    assert.ok(r.callLog.includes("8 x locator resolved to <p>The following wells have been updated:</p>"));
  });

  it("Pattern B: extracts header and the full call log, but no Locator/Expected/Received/Timeout (none are labeled in the text)", () => {
    const r = parseErrorMessage(PATTERN_B);
    assert.equal(r.header, "Error: locator.fill: Test timeout of 240000ms exceeded.");
    assert.equal(r.locator, null);
    assert.equal(r.expected, null);
    assert.equal(r.received, null);
    assert.equal(r.timeout, null);
    assert.ok(r.callLog.includes("waiting for locator('#well-list-navigation-search')"));
    assert.ok(r.callLog.includes("attempting fill action"));
    assert.ok(r.callLog.includes("element was detached from the DOM, retrying"));
  });

  it("Pattern C: a plain one-liner only ever populates header, nothing else fabricated", () => {
    const r = parseErrorMessage(PATTERN_C);
    assert.equal(r.header, "Test timeout of 240000ms exceeded.");
    assert.equal(r.locator, null);
    assert.equal(r.expected, null);
    assert.equal(r.received, null);
    assert.equal(r.timeout, null);
    assert.equal(r.callLog, null);
  });

  it("empty/whitespace-only input returns all-empty fields without throwing", () => {
    assert.deepEqual(parseErrorMessage(""), {
      header: "",
      locator: null,
      expected: null,
      received: null,
      timeout: null,
      callLog: null,
    });
    assert.deepEqual(parseErrorMessage("   \n  \n "), {
      header: "",
      locator: null,
      expected: null,
      received: null,
      timeout: null,
      callLog: null,
    });
  });

  it("handles null/undefined input without throwing", () => {
    assert.doesNotThrow(() => parseErrorMessage(null));
    assert.doesNotThrow(() => parseErrorMessage(undefined));
    assert.equal(parseErrorMessage(null).header, "");
  });

  it("strips ANSI color codes from the header", () => {
    const r = parseErrorMessage("\x1b[31mError: something failed\x1b[0m\nLocator:  locator('#x')");
    assert.equal(r.header, "Error: something failed");
    assert.equal(r.locator, "locator('#x')");
  });

  it("handles CRLF line endings the same as LF", () => {
    const crlf = PATTERN_A.replace(/\n/g, "\r\n");
    const r = parseErrorMessage(crlf);
    assert.equal(r.expected, "hidden");
    assert.equal(r.received, "visible");
    assert.equal(r.timeout, "20000ms");
    assert.ok(r.callLog.includes("34 x locator resolved to"));
  });

  it("does not truncate the call log early even if it contains the substring 'Call log' again", () => {
    const msg = [
      "Error: something failed",
      "Call log:",
      "  - step one",
      '  - a locator whose accessible name literally says "Call log: nested"',
      "  - step two",
    ].join("\n");
    const r = parseErrorMessage(msg);
    assert.ok(r.callLog.includes("step one"));
    assert.ok(r.callLog.includes("Call log: nested"));
    assert.ok(r.callLog.includes("step two"));
  });
});
