const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { classifyError, classifyErrors, CATEGORIES } = require("./failure-classifier");

// ─── classifyError ────────────────────────────────────────────

describe("failure-classifier — classifyError", () => {
  describe("timeout", () => {
    it('detects "Timeout exceeded"', () => {
      const err = { message: "Error: page.click: Timeout 30000ms exceeded." };
      assert.equal(classifyError(err), CATEGORIES.TIMEOUT);
    });

    it('detects "Timed out waiting for"', () => {
      const err = { message: "Timed out waiting for element" };
      assert.equal(classifyError(err), CATEGORIES.TIMEOUT);
    });

    it('detects "navigation timeout"', () => {
      const err = { message: "page.goto: Navigation timeout of 30000ms exceeded" };
      assert.equal(classifyError(err), CATEGORIES.TIMEOUT);
    });

    it("detects timeout in stack trace", () => {
      const err = {
        message: "page failed",
        stack: "at page.waitForTimeout (node_modules/playwright)",
      };
      assert.equal(classifyError(err), CATEGORIES.TIMEOUT);
    });
  });

  describe("locator", () => {
    it('detects "selector not found"', () => {
      const err = { message: "Error: page.click: selector button#submit not found" };
      assert.equal(classifyError(err), CATEGORIES.LOCATOR);
    });

    it('detects "not visible"', () => {
      const err = { message: "Error: element not visible" };
      assert.equal(classifyError(err), CATEGORIES.LOCATOR);
    });

    it("detects locator keyword", () => {
      const err = { message: "locator('.submit-btn') resolved to 0 elements" };
      assert.equal(classifyError(err), CATEGORIES.LOCATOR);
    });

    it("detects click() call in stack", () => {
      const err = { message: "Failed", stack: "at some.click(...)" };
      assert.equal(classifyError(err), CATEGORIES.LOCATOR);
    });
  });

  describe("assertion", () => {
    it('detects "expect(received).toBe..."', () => {
      const err = { message: "expect(received).toBe(expected)" };
      assert.equal(classifyError(err), CATEGORIES.ASSERTION);
    });

    it("detects toEqual", () => {
      const err = { message: "Expected: 5, Received: 3 — toEqual failed" };
      assert.equal(classifyError(err), CATEGORIES.ASSERTION);
    });

    it("detects toBeGreaterThan", () => {
      const err = { message: "expect(received).toBeGreaterThan(0) — received was 0" };
      assert.equal(classifyError(err), CATEGORIES.ASSERTION);
    });

    it("detects toContain", () => {
      const err = { message: "expect(page).toContain('No results') — text not found" };
      assert.equal(classifyError(err), CATEGORIES.ASSERTION);
    });

    it('detects "expected" and "received" together', () => {
      const err = { message: "CSS class mismatch: expected .btn-primary, received .btn-secondary" };
      assert.equal(classifyError(err), CATEGORIES.ASSERTION);
    });

    it("detects snapshot mismatch", () => {
      const err = { message: "A snapshot doesn't match at ..." };
      assert.equal(classifyError(err), CATEGORIES.ASSERTION);
    });
  });

  describe("network", () => {
    it("detects ECONNREFUSED", () => {
      const err = { message: "Error: connect ECONNREFUSED 127.0.0.1:8080" };
      assert.equal(classifyError(err), CATEGORIES.NETWORK);
    });

    it("detects 502 status", () => {
      const err = { message: "Request failed with status 502" };
      assert.equal(classifyError(err), CATEGORIES.BACKEND);
    });

    it("detects fetch API error", () => {
      const err = { message: "fetch failed: network error" };
      assert.equal(classifyError(err), CATEGORIES.NETWORK);
    });

    it("detects DNS error", () => {
      const err = { message: "getaddrinfo ENOTFOUND api.example.com" };
      assert.equal(classifyError(err), CATEGORIES.NETWORK);
    });
  });

  describe("authentication", () => {
    it("detects 401 unauthorized", () => {
      const err = { message: "Request failed: 401 Unauthorized" };
      assert.equal(classifyError(err), CATEGORIES.AUTHENTICATION);
    });

    it("detects 403 forbidden", () => {
      const err = { message: "HTTP 403 Forbidden — access denied" };
      assert.equal(classifyError(err), CATEGORIES.AUTHENTICATION);
    });

    it("detects session expired", () => {
      const err = { message: "Session expired, please log in again" };
      assert.equal(classifyError(err), CATEGORIES.AUTHENTICATION);
    });

    it("detects token error in stack", () => {
      const err = { message: "Request failed", stack: "at validateToken(auth.js:12:5)" };
      assert.equal(classifyError(err), CATEGORIES.AUTHENTICATION);
    });
  });

  describe("environment", () => {
    it("detects missing env variable", () => {
      const err = { message: "Missing environment variable: API_URL" };
      assert.equal(classifyError(err), CATEGORIES.ENVIRONMENT);
    });

    it("detects EADDRINUSE", () => {
      const err = { message: "Error: listen EADDRINUSE: address already in use :::3000" };
      assert.equal(classifyError(err), CATEGORIES.ENVIRONMENT);
    });

    it("detects docker reference", () => {
      const err = { message: "Cannot connect to docker container" };
      assert.equal(classifyError(err), CATEGORIES.ENVIRONMENT);
    });

    it("detects port in use", () => {
      const err = { message: "Port 8080 is already in use" };
      assert.equal(classifyError(err), CATEGORIES.ENVIRONMENT);
    });
  });

  describe("data", () => {
    it("detects TypeError", () => {
      const err = { message: "TypeError: Cannot read properties of null (reading 'id')" };
      assert.equal(classifyError(err), CATEGORIES.DATA);
    });

    it("detects undefined error", () => {
      const err = { message: "Error: fixture data is undefined" };
      assert.equal(classifyError(err), CATEGORIES.DATA);
    });

    it("detects is not a function", () => {
      const err = { message: "TypeError: x.click is not a function" };
      assert.equal(classifyError(err), CATEGORIES.DATA);
    });

    it("detects validation error", () => {
      const err = { message: "Data validation failed: schema mismatch" };
      assert.equal(classifyError(err), CATEGORIES.DATA);
    });
  });

  describe("unknown", () => {
    it("returns unknown for empty error", () => {
      assert.equal(classifyError({ message: "" }), CATEGORIES.UNKNOWN);
    });

    it("returns unknown for null", () => {
      assert.equal(classifyError(null), CATEGORIES.UNKNOWN);
    });

    it("returns unknown for unrecognized message", () => {
      const err = { message: "Something very odd happened" };
      assert.equal(classifyError(err), CATEGORIES.UNKNOWN);
    });

    it("returns unknown for string without patterns", () => {
      assert.equal(classifyError("random text"), CATEGORIES.UNKNOWN);
    });
  });

  describe("priority", () => {
    it("classifies mixed timeout+assertion as timeout (higher priority)", () => {
      const err = {
        message: "expect(received).toBe(true) — Timed out waiting for element",
      };
      assert.equal(classifyError(err), CATEGORIES.TIMEOUT);
    });

    it("classifies mixed locator+assertion as locator (higher priority)", () => {
      const err = {
        message: "expect(page).toContain('x') — selector button#submit not found",
        stack: "at page.click (tests/login.spec.js:20:5)",
      };
      assert.equal(classifyError(err), CATEGORIES.LOCATOR);
    });

    it("locator beats timeout when both patterns exist", () => {
      const err = {
        message: "Timeout 30000ms exceeded — selector .dropdown-menu not found",
      };
      assert.equal(classifyError(err), CATEGORIES.LOCATOR);
    });

    it("assertion beats network when both patterns exist", () => {
      const err = {
        message: "expect(received).toBe(true) — fetch returned 502",
      };
      assert.equal(classifyError(err), CATEGORIES.ASSERTION);
    });
  });
});

// ─── classifyErrors ───────────────────────────────────────────

describe("failure-classifier — classifyErrors", () => {
  it("classifies each error and picks dominant category", () => {
    const errors = [
      { message: "Timeout waiting for element" },
      { message: "Timeout waiting for element" },
      { message: "expect(received).toBe(expected)" },
    ];

    const result = classifyErrors(errors);
    assert.equal(result.category, CATEGORIES.TIMEOUT);
    assert.equal(result.errors.length, 3);
    assert.equal(result.errors[0].category, CATEGORIES.TIMEOUT);
    assert.equal(result.errors[1].category, CATEGORIES.TIMEOUT);
    assert.equal(result.errors[2].category, CATEGORIES.ASSERTION);
  });

  it("returns unknown for empty array", () => {
    const result = classifyErrors([]);
    assert.equal(result.category, CATEGORIES.UNKNOWN);
    assert.deepEqual(result.errors, []);
  });

  it("handles string-only errors", () => {
    const result = classifyErrors(["Timeout exceeded"]);
    assert.equal(result.category, CATEGORIES.TIMEOUT);
    assert.equal(result.errors[0].message, "Timeout exceeded");
    assert.equal(result.errors[0].stack, null);
  });

  it("picks the most frequent category", () => {
    const errors = [
      { message: "locator not found" },
      { message: "locator not found" },
      { message: "assertion failed" },
      { message: "timeout" },
      { message: "network error" },
    ];

    const result = classifyErrors(errors);
    assert.equal(result.category, CATEGORIES.LOCATOR);
  });

  it("uses priority as tiebreaker when frequencies are equal", () => {
    const errors = [
      { message: "Timeout error" },
      { message: "Timeout error" },
      { message: "expect(received).toBe(expected)" },
      { message: "expect(received).toBe(expected)" },
    ];

    const result = classifyErrors(errors);
    assert.equal(result.category, CATEGORIES.TIMEOUT);
  });
});

describe("failure-classifier — backend & category classification (Phase 5)", () => {
  const cat = (m) => classifyError({ message: m });

  it("classifies backend / server / API failures as backend", () => {
    assert.equal(cat("Internal Server Error"), CATEGORIES.BACKEND);
    assert.equal(cat("Request failed with status 500 Internal Server Error"), CATEGORIES.BACKEND);
    assert.equal(cat("backend service returned an error"), CATEGORIES.BACKEND);
  });

  it("classifies HTTP 5xx failures as backend", () => {
    assert.equal(cat("HTTP 502 Bad Gateway"), CATEGORIES.BACKEND);
    assert.equal(cat("503 Service Unavailable"), CATEGORIES.BACKEND);
    assert.equal(cat("500 error"), CATEGORIES.BACKEND);
  });

  it("classifies network failures as network", () => {
    assert.equal(cat("network error occurred"), CATEGORIES.NETWORK);
    assert.equal(cat("connection reset by peer"), CATEGORIES.NETWORK);
  });

  it("classifies connection-refused failures as network", () => {
    assert.equal(cat("connect ECONNREFUSED 127.0.0.1:8080"), CATEGORIES.NETWORK);
    assert.equal(cat("connection refused"), CATEGORIES.NETWORK);
  });

  it("classifies DNS-resolution failures as network", () => {
    assert.equal(cat("getaddrinfo ENOTFOUND api.example.com"), CATEGORIES.NETWORK);
    assert.equal(cat("DNS lookup failed for host"), CATEGORIES.NETWORK);
  });

  it("keeps timeout failures classified as timeout", () => {
    assert.equal(cat("page.waitForSelector: Timeout 5000ms exceeded"), CATEGORIES.TIMEOUT);
  });

  it("keeps frontend/locator failures classified as locator", () => {
    assert.equal(cat("locator.click: element is not visible"), CATEGORIES.LOCATOR);
  });

  it("classifies unrecognized/empty failures as unknown", () => {
    assert.equal(cat(""), CATEGORIES.UNKNOWN);
    assert.equal(cat("%%% unexpected marker ###"), CATEGORIES.UNKNOWN);
  });
});
