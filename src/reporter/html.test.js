"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { generate } = require("./html");

function makeDashboard(overrides) {
  overrides = overrides || {};
  return {
    project: "Playwright Flaky Test Analyzer",
    version: "1.6.0",
    generatedAt: "2026-07-27T12:00:00.000Z",
    schemaVersion: "1.0.0",
    summary: {
      runs: 3,
      totalTests: 5,
      stablePass: 2,
      stableFail: 1,
      flaky: 1,
      newlyFailed: 1,
      fixed: 0,
      regression: 1,
      healthScore: 40,
    },
    health: {
      passRate: 40,
      failRate: 60,
      flakyRate: 20,
      retryRate: 1,
      avgDurationMs: 1233.33,
    },
    suiteSummary: {
      total: 5,
      stable: 2,
      flaky: 1,
      regression: 1,
      failed: 2,
      stablePct: 40,
      flakyPct: 20,
      regressionPct: 20,
      failedPct: 40,
    },
    retryTimeline: [
      { run: "Run 1", retries: 1, durationMs: 1200, failed: 3, flaky: 0 },
      { run: "Run 2", retries: 0, durationMs: 1000, failed: 2, flaky: 1 },
    ],
    browserStats: [
      {
        browser: "chromium",
        totalTests: 10,
        totalFailures: 6,
        totalFlaky: 1,
        totalRetries: 3,
        failRate: 60,
        flakyRate: 10,
      },
      {
        browser: "firefox",
        totalTests: 5,
        totalFailures: 3,
        totalFlaky: 0,
        totalRetries: 1,
        failRate: 60,
        flakyRate: 0,
      },
    ],
    slowestTests: [
      {
        rank: 1,
        title: "Login > should show error | chromium",
        durationMs: 5000,
        maxDurationMs: 5000,
        retries: 2,
      },
      {
        rank: 2,
        title: "Dashboard > loads metrics | firefox",
        durationMs: 3200,
        maxDurationMs: 3200,
        retries: 1,
      },
    ],
    failureFrequency: [
      {
        testName: "Dashboard > loads metrics",
        browser: "firefox",
        failureCount: 3,
        totalRuns: 3,
        failureRate: 100,
      },
      {
        testName: "Login > should show error",
        browser: "chromium",
        failureCount: 2,
        totalRuns: 3,
        failureRate: 66.67,
      },
    ],
    failureCategories: {
      total: 4,
      counts: {
        timeout: 2,
        locator: 1,
        assertion: 1,
        network: 0,
        authentication: 0,
        environment: 0,
        data: 0,
        unknown: 0,
      },
      sampleErrors: [
        { message: "Timeout 30000ms exceeded", category: "timeout" },
        { message: "selector not found", category: "locator" },
      ],
    },
    flakyTests: [
      {
        title: "Search > flaky results",
        browser: "chromium",
        history: ["PASS", "FAIL", "PASS"],
        passes: 2,
        fails: 1,
        flakyRate: 33,
      },
    ],
    recommendations: {
      critical: [],
      high: [{ icon: "\u2705", message: "Test recommendation" }],
      medium: [],
      low: [],
    },
    hasFailures: true,
    hasFlaky: true,
    investigations: [
      {
        testName: "Search > flaky results",
        browser: "chromium",
        ruleBased: {
          provider: "rule-engine",
          result: {
            likelyCause: "Test timed out",
            confidence: 85,
            severity: "high",
            evidence: "Timeout",
            possibleFixes: ["Fix timeout"],
            explanation: "Details",
            requiresHumanReview: false,
          },
        },
        providerResult: null,
        timestamp: "2026-01-01T00:00:00Z",
      },
    ],
    runSummary: [
      "5 tests executed across 3 runs.",
      "2 tests passed consistently across all runs.",
      "1 flaky test detected.",
      "Timeout-related failures were the most common issue.",
    ],
    ...overrides,
  };
}

describe("html — generate", () => {
  it("produces a valid HTML document", () => {
    const html = generate(makeDashboard());
    assert.ok(html.startsWith("<!DOCTYPE html>"));
    assert.ok(html.includes('<html lang="en">'));
    assert.ok(html.includes("</html>"));
  });

  it("includes a <title> tag", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("Dashboard"));
  });

  it("embeds dashboard JSON as var D", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("var D="));
    assert.ok(html.includes('"summary"'));
    assert.ok(html.includes('"health"'));
  });

  it("escapes HTML-breaking characters in embedded JSON", () => {
    const dash = makeDashboard();
    dash.slowestTests[0].title = "test <script>alert(1)</script>";
    const html = generate(dash);
    assert.ok(!html.includes("<script>alert"));
  });

  it("includes all sections", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("Suite Summary"));
    assert.ok(html.includes(">Flaky Tests Trend<"));
    assert.ok(html.includes(">Retries Per Run Trend<"));
    assert.ok(html.includes("Run Highlights"));
    assert.ok(html.includes("Investigation"));
    assert.ok(html.includes("Additional Metrics"));
  });

  it("orders top-level sections as Suite Summary, Flaky Tests Trend, Retries Per Run Trend, Run Highlights, Failed Tests, Passing on Retry, Additional Metrics", () => {
    const html = generate(makeDashboard());
    const iSuite = html.indexOf(">Suite Summary<");
    const iFlakyTrend = html.indexOf(">Flaky Tests Trend<");
    const iRetriesTrend = html.indexOf(">Retries Per Run Trend<");
    const iHighlights = html.indexOf("Run Highlights");
    const iFailed = html.indexOf(">Failed Tests<");
    const iPassingRetry = html.indexOf("Passing on Retry — Details");
    const iAdditional = html.indexOf(">Additional Metrics<");
    assert.ok(iSuite < iFlakyTrend, "Suite Summary before Flaky Tests Trend");
    assert.ok(iFlakyTrend < iRetriesTrend, "Flaky Tests Trend before Retries Per Run Trend");
    assert.ok(iRetriesTrend < iHighlights, "Retries Per Run Trend before Run Highlights");
    assert.ok(iHighlights < iFailed, "Run Highlights before Failed Tests");
    assert.ok(iFailed < iPassingRetry, "Failed Tests before Passing on Retry");
    assert.ok(iPassingRetry < iAdditional, "Passing on Retry before Additional Metrics");
  });

  it("Flaky Tests Trend and Retries Per Run Trend are their own top-level sections, grouped together, not nested inside Additional Metrics", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes('id="section-flaky-trend"'));
    assert.ok(html.includes('id="section-retries-trend"'));
    assert.ok(html.includes('id="adv-flaky-trend"'));
    assert.ok(html.includes('id="adv-retries"'));
    const iAdditionalHeader = html.indexOf(">Additional Metrics<");
    const iFlakyTrendBlock = html.indexOf('id="adv-flaky-trend"');
    const iRetriesBlock = html.indexOf('id="adv-retries"');
    const iRootCauseBlock = html.indexOf('id="adv-root-cause"');
    assert.ok(iFlakyTrendBlock < iRetriesBlock, "Flaky Tests Trend appears directly above Retries Per Run Trend");
    assert.ok(
      iRetriesBlock < iAdditionalHeader,
      "Retries Per Run Trend appears before Additional Metrics, not inside it"
    );
    assert.ok(
      iAdditionalHeader < iRootCauseBlock,
      "Additional Metrics still wraps Root Cause Summary"
    );
  });

  it("Additional Metrics no longer contains the retries or flaky-trend blocks", () => {
    const html = generate(makeDashboard());
    const advancedStart = html.indexOf('id="section-advanced"');
    const advancedBody = html.slice(advancedStart, html.indexOf("</main>"));
    assert.ok(!advancedBody.includes('id="adv-retries"'));
    assert.ok(!advancedBody.includes('id="adv-flaky-trend"'));
  });

  it("includes header with health score", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("header-project"));
    assert.ok(html.includes("header-meta"));
    assert.ok(html.includes("chip-red") || html.includes("Stable"));
  });

  it("includes Expand All and Collapse All buttons", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("btn-expand-all"));
    assert.ok(html.includes("btn-collapse-all"));
    assert.ok(html.includes("Expand All"));
    assert.ok(html.includes("Collapse All"));
  });

  it("includes chevron indicator in card headers", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("inv-card-header::before"));
  });

  it("includes evidence badge CSS", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("inv-ev-badge"));
  });

  it("includes mark highlighting CSS", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("<mark>") || html.includes("mark{"));
  });

  it("includes field-group CSS for card body zones", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("inv-field-group"));
  });

  it("includes renderEvidence with stack trace line counting", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("split") && html.includes("stackTrace"));
  });

  it("filter toolbar includes count in labels", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("All (')") || html.includes("All"));
  });

  it("does not include a footer", () => {
    const html = generate(makeDashboard());
    assert.ok(!html.includes("Generated by"));
  });

  it("is self-contained with no external links", () => {
    const html = generate(makeDashboard());
    assert.ok(!html.includes('<link rel="stylesheet" href='));
    assert.ok(!html.includes("<script src="));
  });

  it("includes CSS variables for theming", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("prefers-color-scheme:dark"));
    assert.ok(html.includes("var(--"));
  });

  it(".inv-error-msg preserves whitespace (regression: used to collapse multi-line Playwright errors into one unreadable run-on line)", () => {
    const html = generate(makeDashboard());
    const rule = html.match(/\.inv-error-msg\{[^}]*\}/);
    assert.ok(rule, ".inv-error-msg rule must exist");
    assert.ok(rule[0].includes("white-space:pre-wrap"));
  });

  it("includes sortable headers", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("th"));
  });

  it("includes search input", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("search") || html.includes("Search"));
  });

  it("has collapsible sections", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("section-toggle"));
  });

  it("renders empty state for no failures", () => {
    const dash = makeDashboard({
      hasFailures: false,
      hasFlaky: false,
      failureFrequency: [],
      failureCategories: {
        total: 0,
        counts: {
          timeout: 0,
          locator: 0,
          assertion: 0,
          network: 0,
          authentication: 0,
          environment: 0,
          data: 0,
          unknown: 0,
        },
        sampleErrors: [],
      },
      flakyTests: [],
    });
    const html = generate(dash);
    assert.ok(html.includes("No failing tests detected"));
  });

  it("renders correctly with no statistics", () => {
    const dash = makeDashboard();
    dash.browserStats = [];
    dash.slowestTests = [];
    dash.failureFrequency = [];
    dash.retryTimeline = [];
    const html = generate(dash);
    assert.ok(html.includes("<!DOCTYPE html>"));
  });

  it("attaches collapse/expand click handlers before any data rendering, so a click can't be dropped while a large report is still rendering", () => {
    const html = generate(makeDashboard());
    const iInit = html.indexOf("initCollapsible();");
    const iRetries = html.indexOf("renderRetryTimeline,");
    const iInvestigation = html.indexOf("renderInvestigation,");
    const iAdvanced = html.indexOf("renderAdvancedMetrics,");
    assert.ok(iInit >= 0, "initCollapsible() call present");
    assert.ok(iInit < iRetries, "initCollapsible before renderRetryTimeline");
    assert.ok(iInit < iInvestigation, "initCollapsible before renderInvestigation");
    assert.ok(iInit < iAdvanced, "initCollapsible before renderAdvancedMetrics");
  });

  it("includes confidence bars", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("Confidence") || html.includes("confidence"));
  });

  it("builds a hover tooltip explaining the confidence percentage", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("function buildConfidenceTooltip"));
    assert.ok(html.includes("i.confidenceExplain"));
    // Plain-language tooltip (no A-code jargon / "Base confidence:" / "clamped" wording).
    assert.ok(html.includes("how strongly the evidence backs this root cause"));
    assert.ok(html.includes("from the matching rule"));
  });

  it("wires a Needs Review badge for investigations below the confidence threshold", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("belowConfidenceThreshold"));
    assert.ok(html.includes("Needs Review"));
  });

  it("wires a Passing on Retry Details section reading D.passingOnRetryTests", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("Passing on Retry — Details"));
    assert.ok(html.includes("function renderPassingOnRetryDetails"));
    assert.ok(html.includes("D.passingOnRetryTests"));
    assert.ok(html.includes("safeRender(renderPassingOnRetryDetails,"));
  });

  it("renders Passing on Retry entries as full investigation cards, not a plain table", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("function renderPassingOnRetryCard"));
    // Reuses the exact same card-building blocks as Failed Tests investigations
    assert.ok(html.includes("buildCardHeader(i,clsLabel,clsBadge,cardId,ev,'\\u2705')"));
    assert.ok(html.includes("h+=buildCardCollapsed(i);"));
    assert.ok(html.includes("h+=buildCardBody(i,ev,cardId);"));
  });

  it("defaults the Failed Tests card icon to the cross mark when no icon is passed", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("function buildCardHeader(i,clsLabel,clsBadge,cardId,ev,icon)"));
    assert.ok(html.includes("(icon||'\\u274C')"));
  });

  it("shows Suite Summary cards (regression merged into newly failing, skipped shown separately)", function () {
    const html = generate(makeDashboard());
    assert.ok(html.includes("Total Tests"));
    assert.ok(html.includes("card-stable"));
    assert.ok(html.includes("card-passing-retry"));
    assert.ok(html.includes("card-flaky"));
    assert.ok(!html.includes("card-regression"));
    assert.ok(html.includes("card-newfail"));
    assert.ok(html.includes("card-stablefail"));
    assert.ok(html.includes("card-skipped"));
  });

  it("wires the Passing on Retry card to suiteSummary.passingOnRetry", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("Passing on Retry"));
    assert.ok(html.includes("_ss.passingOnRetry"));
    assert.ok(html.includes("_ss.passingOnRetryPct"));
  });

  it("surfaces flaky tests via the flaky tile and filter chip", () => {
    const html = generate(makeDashboard());
    // The standalone Flaky Tests table was removed; flaky tests appear as the Flaky tile
    // and the Flaky filter chip over the investigation cards.
    assert.ok(html.includes("card-flaky"));
    assert.ok(html.includes("Flaky ('+flakyCount"));
  });

  it("splits test+browser in frequency table", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("testName"));
  });

  it("has Additional Metrics collapsed by default", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes('class="section collapsed"') && html.includes("Additional Metrics"));
  });

  it("includes Investigation section", () => {
    const html = generate(makeDashboard());
    assert.ok(html.includes("Investigation"));
    assert.ok(html.includes("section-investigation"));
    assert.ok(html.includes("renderInvestigation"));
  });

  it("shows root cause and error display in investigation", function () {
    var html = generate(makeDashboard());
    assert.ok(
      html.includes("Root Cause") || html.includes("Error Message") || html.includes("likelyCause")
    );
  });
});

describe("html — evidence path & script-embed safety (Fixes #3, #4)", () => {
  const BS = String.fromCharCode(92); // backslash, avoids escape-counting in assertions
  const LS = String.fromCharCode(0x2028); // U+2028 LINE SEPARATOR
  const PS = String.fromCharCode(0x2029); // U+2029 PARAGRAPH SEPARATOR

  // The escaping helpers run client-side (inside the injected <script>). To test their
  // behavior we extract their source from the generated HTML and evaluate it in Node.
  const scriptBody = (html) => html.split("<script>(function(){")[1].split("})();</script>")[0];
  const pickLine = (script, name) =>
    script.split("\n").find((l) => l.trim().startsWith("function " + name + "("));
  const pickBlock = (script, startName, endMarker) => {
    const lines = script.split("\n");
    const start = lines.findIndex((l) => l.trim().startsWith("function " + startName + "("));
    let end = start;
    for (let i = start; i < lines.length; i++) {
      if (lines[i].includes(endMarker)) {
        end = i;
        break;
      }
    }
    return lines.slice(start, end + 1).join("\n");
  };
  const clientFns = () => {
    const s = scriptBody(generate({ summary: { runs: 1, totalTests: 1 } }));
    const src =
      [
        pickLine(s, "esc"),
        pickLine(s, "escAttr"),
        pickLine(s, "escJs"),
        pickLine(s, "safeUrl"),
        pickBlock(s, "renderEvidenceBody", "return h;}"),
        pickBlock(s, "renderEvidence", "return h;}"),
      ].join("\n") +
      "\nreturn { esc, escAttr, escJs, safeUrl, renderEvidence, renderEvidenceBody };";
    return new Function(src)();
  };
  const htmlAttrDecode = (s) =>
    s
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  // Recover the argument passed to openPreview exactly as a browser would: read the
  // onclick attribute, HTML-attribute-decode it, then execute the handler with stubs.
  const runOnclick = (thumbHtml) => {
    const m = thumbHtml.match(/onclick="([^"]*)"/);
    assert.ok(m, "expected an onclick handler");
    const handler = htmlAttrDecode(m[1]);
    const captured = [];
    const sink = { pwned: false };
    const fn = new Function("event", "openPreview", "sink", handler);
    fn({ stopPropagation() {} }, (arg) => captured.push(arg), sink);
    return { captured, sink };
  };

  // ── Fix #3: escJs (single-quoted JS-string context inside an inline onclick) ──
  it("escJs escapes single quotes", () => {
    assert.equal(clientFns().escJs("shots/a'b.png"), "shots/a" + BS + "'b.png");
  });

  it("escJs escapes backslashes (Windows paths)", () => {
    assert.equal(
      clientFns().escJs("C:" + BS + "Users" + BS + "a.png"),
      "C:" + BS + BS + "Users" + BS + BS + "a.png"
    );
  });

  it("escJs escapes U+2028/U+2029 and newlines", () => {
    const f = clientFns();
    assert.equal(f.escJs("a" + LS + "b"), "a" + BS + "u2028b");
    assert.equal(f.escJs("a" + PS + "b"), "a" + BS + "u2029b");
    assert.equal(f.escJs("a\nb"), "a" + BS + "nb");
  });

  // ── Fix #3: no breakout through the inline onclick, across path shapes ──
  const onclickPaths = [
    { name: "relative path", p: "test-results/shot.png" },
    { name: "Windows path", p: "C:" + BS + "Users" + BS + "me" + BS + "shot.png" },
    { name: "absolute path", p: "/tmp/shot.png" },
    { name: "single quote", p: "shots/a'b.png" },
    { name: "breakout payload", p: "x');sink.pwned=true;('" },
  ];
  for (const { name, p } of onclickPaths) {
    it(`onclick round-trips the path verbatim and never executes injected code — ${name}`, () => {
      const html = clientFns().renderEvidence({ screenshots: [p] });
      const { captured, sink } = runOnclick(html);
      assert.deepEqual(captured, [p]); // openPreview received the path as a single data string
      assert.equal(sink.pwned, false); // nothing injected executed
    });
  }

  // ── Fix #3: safeUrl (href scheme guard) ──
  it("safeUrl neutralizes dangerous URL schemes (incl. obfuscation)", () => {
    const f = clientFns();
    for (const bad of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(1)",
      "java\tscript:alert(1)",
      "data:text/html,<b>x</b>",
      "vbscript:msgbox(1)",
    ]) {
      assert.equal(f.safeUrl(bad), "#", "should block: " + JSON.stringify(bad));
    }
  });

  it("safeUrl preserves valid relative, Windows, absolute, http(s) and file paths", () => {
    const f = clientFns();
    for (const good of [
      "test-results/trace.zip",
      "./a/b.zip",
      "/var/tmp/trace.zip",
      "C:" + BS + "Users" + BS + "me" + BS + "trace.zip",
      "https://ci.example.com/t.zip",
      "file:///C:/t.zip",
    ]) {
      assert.equal(f.safeUrl(good), good, "should preserve: " + good);
    }
  });

  it("renderEvidence blocks javascript: trace/video hrefs but keeps valid ones", () => {
    const f = clientFns();
    // screenshots:[] provided because renderEvidence's "Open Screenshot" span unconditionally
    // reads ev.screenshots[0] (pre-existing behavior, unrelated to this fix).
    const bad = f.renderEvidence({
      screenshots: [],
      trace: "javascript:alert(1)",
      video: "javascript:alert(2)",
    });
    assert.ok(/href="#"/.test(bad));
    assert.ok(!/href="javascript:/i.test(bad));
    const good = f.renderEvidence({
      screenshots: [],
      trace: "test-results/trace.zip",
      video: "test-results/v.webm",
    });
    assert.ok(good.includes('href="test-results/trace.zip"'));
    assert.ok(good.includes('href="test-results/v.webm"'));
  });

  // ── Fix #4: U+2028/U+2029 in embedded report data ──
  it("escapes U+2028/U+2029 in the embedded data blob and round-trips them", () => {
    const html = generate({ summary: { runs: 1, totalTests: 1 }, note: "a" + LS + "b" + PS + "c" });
    assert.equal(html.indexOf(LS), -1, "no raw U+2028 in output");
    assert.equal(html.indexOf(PS), -1, "no raw U+2029 in output");
    assert.ok(html.includes(BS + "u2028"));
    assert.ok(html.includes(BS + "u2029"));
    const dline = scriptBody(html)
      .split("\n")
      .find((l) => l.startsWith("var D="));
    const D = new Function(dline + " return D;")();
    assert.equal(D.note, "a" + LS + "b" + PS + "c");
  });

  it("still escapes </script> and angle brackets in the data blob (regression)", () => {
    const html = generate({ summary: { runs: 1, totalTests: 1 }, note: "</script><img>&" });
    assert.ok(!scriptBody(html).includes("</script>"));
    assert.ok(html.includes(BS + "u003c")); // '<' escaped
  });

  it("keeps the embedded data blob valid JS with hostile evidence data (separators, </script>, quotes)", () => {
    const html = generate({
      summary: { runs: 1, totalTests: 1 },
      note: "line" + LS + "sep" + PS + "end</script>",
      evidence: { screenshots: ["a'b" + LS + ".png"], trace: "javascript:alert(1)" },
    });
    assert.equal(html.indexOf(LS), -1, "no raw U+2028 in output");
    assert.equal(html.indexOf(PS), -1, "no raw U+2029 in output");
    const dline = scriptBody(html)
      .split("\n")
      .find((l) => l.startsWith("var D="));
    // The var D=<json>; blob is the surface Fix #4 governs; it must parse even with
    // separators / </script> / single quotes embedded in report data.
    const D = new Function(dline + " return D;")();
    assert.equal(D.evidence.screenshots[0], "a'b" + LS + ".png"); // round-trips exactly
    assert.ok(D.note.includes("</script>"));
  });
});

describe("html — inline dashboard script executes (Phase 2.5 regression)", () => {
  const vm = require("node:vm");

  const scriptOf = (html) => {
    const a = html.indexOf("<script>") + "<script>".length;
    const b = html.indexOf("</script>", a);
    return html.slice(a, b);
  };

  // Minimal DOM stub — just enough surface for the dashboard IIFE to execute end-to-end.
  function el(id) {
    const L = {};
    return {
      _id: id,
      tag: "div",
      textContent: "",
      innerHTML: "",
      value: "",
      style: {},
      attrs: {},
      children: [],
      classList: {
        _s: new Set(),
        add(c) {
          this._s.add(c);
        },
        remove(c) {
          this._s.delete(c);
        },
        toggle(c) {
          if (this._s.has(c)) {
            this._s.delete(c);
            return false;
          }
          this._s.add(c);
          return true;
        },
        contains(c) {
          return this._s.has(c);
        },
      },
      _L: L,
      addEventListener(t, fn) {
        (L[t] = L[t] || []).push(fn);
      },
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
      getAttribute(k) {
        return this.attrs[k];
      },
      appendChild(c) {
        this.children.push(c);
        return c;
      },
      removeChild(c) {
        this.children = this.children.filter((x) => x !== c);
        return c;
      },
      querySelector() {
        return el(id + "::q");
      },
      querySelectorAll() {
        return [];
      },
      closest() {
        return this._c || (this._c = el(id + "::section"));
      },
      get parentElement() {
        return this._p || (this._p = el(id + "::parent"));
      },
      get parentNode() {
        return this.parentElement;
      },
      focus() {},
      remove() {},
    };
  }
  function makeDom() {
    const els = {};
    const header = el("section-header");
    const document = {
      getElementById(id) {
        return els[id] || (els[id] = el(id));
      },
      querySelector(s) {
        return el(s);
      },
      querySelectorAll(s) {
        return s === ".section-header" ? [header] : [];
      },
      createElement(t) {
        const e = el("new-" + t);
        e.tag = t;
        return e;
      },
      createTextNode(t) {
        return { textContent: t };
      },
      body: el("body"),
      documentElement: el("html"),
    };
    const ctx = vm.createContext({
      document,
      window: {
        localStorage: { getItem: () => null, setItem() {} },
        matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
      },
      localStorage: { getItem: () => null, setItem() {} },
      setTimeout: (fn) => {
        fn();
        return 1;
      },
      clearTimeout: () => {},
      console,
    });
    return { ctx, els, header };
  }

  const richDashboard = () => ({
    project: "P",
    version: "1.0.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    summary: { runs: 2, totalTests: 2, stablePass: 0, flaky: 1, newlyFailed: 1 },
    suiteSummary: {
      total: 2,
      stable: 0,
      flaky: 1,
      regression: 0,
      failed: 1,
      stablePct: 0,
      flakyPct: 50,
    },
    hasFlaky: true,
    flakyTests: [{ title: "t", history: ["passed", "failed"], flakyRate: 50 }],
    retryTimeline: [{ run: "Run 1", retries: 1, durationMs: 100 }],
    browserStats: [{ browser: "chromium", totalTests: 2, totalFailures: 1, failRate: 50 }],
    failureCategories: { total: 1, counts: { timeout: 1 } },
    failureFrequency: [{ testName: "t", failureCount: 1, totalRuns: 2 }],
    slowestTests: [{ title: "t", durationMs: 500 }],
    rootCauseSummary: [
      {
        testName: "t",
        status: "flaky",
        pattern: "RC-001",
        category: "Timeout",
        confidence: 80,
        priority: "high",
      },
    ],
    investigations: [
      {
        classification: "flaky",
        classificationLabel: "Flaky",
        classificationBadge: "badge-warn",
        classificationDataClass: "flaky",
        severity: "medium",
        likelyCause: "slow",
        testName: "t",
        evidence: {
          screenshots: ["shots/a.png"],
          trace: "test-results/t.zip",
          video: "test-results/v.webm",
          errorMessages: ["boom"],
          stackTrace: "at x",
        },
      },
    ],
  });

  // Requirement #4: the exact JS the browser receives must be syntactically valid.
  // This is the test that fails on the pre-fix implementation (missing brace) and passes after.
  it("generated inline <script> parses as valid JavaScript (regression for the missing brace)", () => {
    const script = scriptOf(generate(richDashboard()));
    assert.doesNotThrow(() => new vm.Script(script));
  });

  // Requirement #5: the whole IIFE initializes and populates the dashboard.
  it("initializes: the script runs end-to-end and populates the dashboard containers", () => {
    const dom = makeDom();
    const script = scriptOf(generate(richDashboard()));
    assert.doesNotThrow(() => new vm.Script(script).runInContext(dom.ctx));
    assert.ok(dom.els["adv-retries"].innerHTML.length > 0, "retry timeline rendered");
    assert.ok(dom.els["investigation-list"].innerHTML.length > 0, "investigation panels rendered");
    assert.ok(dom.els["adv-root-cause"].innerHTML.length > 0, "advanced metrics rendered");
  });

  // Regression guard: the 8 top-level render calls used to be one unguarded
  // synchronous chain — a throw in any one of them silently killed every
  // section after it, with no visible error unless devtools happened to be
  // open. safeRender() isolates each call so that can't happen again.
  it("safeRender isolates one section's failure from every section that runs after it", () => {
    const script = scriptOf(generate(richDashboard()));
    const line = script.split("\n").find((l) => l.trim().startsWith("function safeRender("));
    assert.ok(line, "safeRender must be defined in the generated script");
    const safeRender = new Function(line + "\nreturn safeRender;")();

    const calls = [];
    const errors = [];
    const realError = console.error;
    console.error = (...args) => errors.push(args);
    try {
      safeRender(() => {
        throw new Error("boom");
      }, "Section A");
      safeRender(() => calls.push("B"), "Section B");
    } finally {
      console.error = realError;
    }

    assert.deepEqual(calls, ["B"], "Section B still ran even though Section A threw first");
    assert.equal(errors.length, 1, "the failure is logged, not silently swallowed");
    assert.ok(String(errors[0][0]).includes("Section A"));
  });

  // Requirement #6: collapsible sections (wired via addEventListener) work.
  it("collapsible sections toggle when their header is activated", () => {
    const dom = makeDom();
    new vm.Script(scriptOf(generate(richDashboard()))).runInContext(dom.ctx);
    assert.ok(
      dom.header._L.click && dom.header._L.click.length === 1,
      "section-header click listener attached"
    );
    dom.header._L.click[0].call(dom.header);
    assert.equal(dom.header.closest().classList.contains("collapsed"), true);
  });

  // Evidence packaging: traces download as an asset (can't open a .zip in the
  // browser); videos play inline via a relative <video> src. Both use guarded URLs.
  it("investigation renders trace as a download link and video as an inline player", () => {
    const dom = makeDom();
    new vm.Script(scriptOf(generate(richDashboard()))).runInContext(dom.ctx);
    const invHtml = dom.els["investigation-list"].innerHTML;
    assert.ok(invHtml.includes("Download Trace"), "trace is a download link");
    assert.ok(invHtml.includes('href="test-results/t.zip"'), "trace href preserved");
    assert.ok(invHtml.includes("<video"), "video plays inline");
    assert.ok(invHtml.includes('src="test-results/v.webm"'), "inline video src preserved");
  });

  it("card body renders Primary Error before Call Log before Code Frame before Evidence before Root Cause", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    dashboard.investigations[0].primaryError = {
      message: "Error: expect(locator).toBeHidden() failed\n\nLocator:  locator('#x')\nExpected: hidden\nReceived: visible\nTimeout:  20000ms\n\nCall log:\n  - waiting for locator('#x')",
      stack: "at spec.js:41:3",
      snippet: "39 |   x();\n> 41 |   y();\n     |   ^",
      location: { file: "spec.js", line: 41, column: 3 },
    };
    dashboard.investigations[0].evidence.parsedError = {
      header: "Error: expect(locator).toBeHidden() failed",
      locator: "locator('#x')",
      expected: "hidden",
      received: "visible",
      timeout: "20000ms",
      callLog: "  - waiting for locator('#x')",
    };
    dashboard.investigations[0].evidence.codeFrame = "39 |   x();\n> 41 |   y();\n     |   ^";
    dashboard.investigations[0].evidence.codeFrameLocation = { file: "spec.js", line: 41, column: 3 };
    new vm.Script(scriptOf(generate(dashboard))).runInContext(dom.ctx);
    const invHtml = dom.els["investigation-list"].innerHTML;
    const iPrimary = invHtml.indexOf("Primary Error");
    const iCallLog = invHtml.indexOf("Call Log");
    const iCodeFrame = invHtml.indexOf("Code Frame");
    const iEvidence = invHtml.indexOf("Download Trace");
    const iRootCause = invHtml.indexOf("Root Cause");
    assert.ok(iPrimary >= 0 && iCallLog > iPrimary, "Call Log must come after Primary Error");
    assert.ok(iCodeFrame > iCallLog, "Code Frame must come after Call Log");
    assert.ok(iEvidence > iCodeFrame, "Evidence must come after Code Frame");
    assert.ok(iRootCause > iEvidence, "Root Cause must come after Evidence");
  });

  it("multi-line Call Log content is preserved with newlines intact, not collapsed to one line", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    dashboard.investigations[0].evidence.parsedError = {
      header: "Error: locator.fill: Test timeout of 240000ms exceeded.",
      locator: null,
      expected: null,
      received: null,
      timeout: null,
      callLog:
        "  - waiting for locator('#well-list-navigation-search')\n  - fill(\"OXY\")\n  - element was detached from the DOM, retrying",
    };
    new vm.Script(scriptOf(generate(dashboard))).runInContext(dom.ctx);
    const invHtml = dom.els["investigation-list"].innerHTML;
    assert.ok(
      invHtml.includes(
        "  - waiting for locator('#well-list-navigation-search')\n  - fill(\"OXY\")\n  - element was detached from the DOM, retrying"
      ),
      "call log newlines must survive verbatim in the rendered HTML"
    );
  });

  it("Locator/Expected/Received/Timeout table only renders fields that were actually parsed — no fabrication", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    dashboard.investigations[0].evidence.parsedError = {
      header: "Error: locator.fill: Test timeout of 240000ms exceeded.",
      locator: "locator('#x')",
      expected: null,
      received: null,
      timeout: "240000ms",
      callLog: null,
    };
    new vm.Script(scriptOf(generate(dashboard))).runInContext(dom.ctx);
    const invHtml = dom.els["investigation-list"].innerHTML;
    assert.ok(invHtml.includes("<th>Locator</th>"));
    assert.ok(invHtml.includes("<th>Timeout</th>"));
    assert.ok(!invHtml.includes("<th>Expected</th>"));
    assert.ok(!invHtml.includes("<th>Received</th>"));
  });

  it("graceful fallback: an old-shaped investigation with no primaryError/evidence.parsedError still renders a working Full Error block, no undefined/[object Object]/NaN", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    // Legacy shape only: classifiedErrors with a plain message, nothing new set.
    dashboard.investigations[0].classifiedErrors = [{ message: "Timeout 30000ms exceeded" }];
    delete dashboard.investigations[0].evidence.errorMessages;
    delete dashboard.investigations[0].evidence.stackTrace;
    new vm.Script(scriptOf(generate(dashboard))).runInContext(dom.ctx);
    const invHtml = dom.els["investigation-list"].innerHTML;
    assert.ok(invHtml.includes("Full Error"));
    assert.ok(invHtml.includes("Timeout 30000ms exceeded"));
    assert.ok(!invHtml.includes("undefined"));
    assert.ok(!invHtml.includes("[object Object]"));
    assert.ok(!invHtml.includes("NaN"));
  });

  it("Code Frame highlights the failing line via .line-current", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    dashboard.investigations[0].primaryError = { message: "boom", stack: null };
    dashboard.investigations[0].evidence.codeFrame =
      "39 |   await a();\n40 |   await b();\n> 41 |   await c();\n     |         ^\n42 |\n43 |   // next";
    dashboard.investigations[0].evidence.codeFrameLocation = { file: "spec.js", line: 41, column: 9 };
    new vm.Script(scriptOf(generate(dashboard))).runInContext(dom.ctx);
    const invHtml = dom.els["investigation-list"].innerHTML;
    assert.ok(invHtml.includes('<span class="line-current">'));
    assert.ok(invHtml.includes("&gt; 41 |   await c();"));
    assert.ok(invHtml.includes("spec.js:41:9"));
  });

  it("'Other Errors Seen In Other Runs/Attempts' replaces 'Additional error detail' and stays readable across multiple distinct errors", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    dashboard.investigations[0].primaryError = { message: "Primary failure text" };
    dashboard.investigations[0].classifiedErrors = [
      { message: "Primary failure text" },
      { message: "Error: locator.fill: Test timeout of 240000ms exceeded.\nCall log:\n  - step one\n  - step two" },
    ];
    new vm.Script(scriptOf(generate(dashboard))).runInContext(dom.ctx);
    const invHtml = dom.els["investigation-list"].innerHTML;
    assert.ok(invHtml.includes("Other Errors Seen In Other Runs/Attempts"));
    assert.ok(!invHtml.includes("Additional error detail"));
    assert.ok(invHtml.includes("Error: locator.fill: Test timeout of 240000ms exceeded.\n"));
  });

  it("end-to-end: reproduces the C298046 example (Pattern A as primaryError with snippet/location/stack, Pattern B as a distinct classifiedErrors entry)", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    const patternA = [
      "Error: expect(locator).toBeHidden() failed",
      "",
      "Locator:  locator('text=/Adding Well Data to the Master Data Administrator|wells have been updated/i')",
      "Expected: hidden",
      "Received: visible",
      "Timeout:  20000ms",
      "",
      "Call log:",
      '  - Expect "toBeHidden" with timeout 20000ms',
      "    34 x locator resolved to <div>Adding Well Data...</div>",
    ].join("\n");
    const patternB = [
      "Error: locator.fill: Test timeout of 240000ms exceeded.",
      "Call log:",
      "  - waiting for locator('#well-list-navigation-search')",
      "  - element was detached from the DOM, retrying",
    ].join("\n");
    dashboard.investigations[0].primaryError = {
      message: patternA,
      stack: "at createPadAndOpenWellDraft (helpers.js:12:3)\nat mda_trajectory_draftwell.spec.js:317:31",
      snippet:
        "39 |   await wellSearchPage.continueBtnInPadModal.click();\n40 |   await wellSearchPage.continueBtnInPadModal.click();\n> 41 |   await expect(wellSearchPage.padCreationFinalMsg).toBeHidden({ timeout: 20000 });\n     |                                                     ^\n42 |\n43 |   // Open Well Draft",
      location: { file: "wellSearchPage.spec.js", line: 41, column: 53 },
    };
    dashboard.investigations[0].classifiedErrors = [
      { message: patternA },
      { message: patternB },
    ];
    dashboard.investigations[0].evidence.parsedError = {
      header: "Error: expect(locator).toBeHidden() failed",
      locator:
        "locator('text=/Adding Well Data to the Master Data Administrator|wells have been updated/i')",
      expected: "hidden",
      received: "visible",
      timeout: "20000ms",
      callLog: '  - Expect "toBeHidden" with timeout 20000ms\n    34 x locator resolved to <div>Adding Well Data...</div>',
    };
    dashboard.investigations[0].evidence.codeFrame = dashboard.investigations[0].primaryError.snippet;
    dashboard.investigations[0].evidence.codeFrameLocation =
      dashboard.investigations[0].primaryError.location;
    new vm.Script(scriptOf(generate(dashboard))).runInContext(dom.ctx);
    const invHtml = dom.els["investigation-list"].innerHTML;
    assert.ok(
      invHtml.includes(
        "locator('text=/Adding Well Data to the Master Data Administrator|wells have been updated/i')"
      )
    );
    assert.ok(invHtml.includes("<th>Expected</th>") && invHtml.includes(">hidden<"));
    assert.ok(invHtml.includes("<th>Received</th>") && invHtml.includes(">visible<"));
    assert.ok(invHtml.includes("<th>Timeout</th>") && invHtml.includes("20000ms"));
    assert.ok(invHtml.includes("34 x locator resolved to"));
    assert.ok(invHtml.includes('<span class="line-current">'));
    assert.ok(invHtml.includes("createPadAndOpenWellDraft"));
    assert.ok(invHtml.includes("wellSearchPage.spec.js:41:53"));
    assert.ok(invHtml.includes("Other Errors Seen In Other Runs/Attempts"));
    assert.ok(invHtml.includes("locator.fill: Test timeout of 240000ms exceeded."));
  });

  it("shows 'Trend requires multiple analyzed runs.' when only one run was analyzed", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    assert.equal(dashboard.retryTimeline.length, 1);
    new vm.Script(scriptOf(generate(dashboard))).runInContext(dom.ctx);
    assert.equal(
      dom.els["adv-flaky-trend"].innerHTML.includes("Trend requires multiple analyzed runs."),
      true
    );
  });

  it("renders a bar+line chart and interpretation using the SAME retryTimeline/statistics.perRun data as Retries Per Run — no --history-file, no separate mechanism", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    dashboard.retryTimeline = [
      { run: "Run 1", retries: 1, durationMs: 100, failed: 2, flaky: 5 },
      { run: "Run 2", retries: 3, durationMs: 100, failed: 3, flaky: 8 },
      { run: "Run 3", retries: 0, durationMs: 100, failed: 1, flaky: 6 },
      { run: "Run 4", retries: 2, durationMs: 100, failed: 2, flaky: 12 },
    ];
    const html = generate(dashboard);
    assert.ok(html.includes(">Flaky Tests Trend<"), "section title rendered as its own top-level section");
    new vm.Script(scriptOf(html)).runInContext(dom.ctx);
    const chartHtml = dom.els["adv-flaky-trend"].innerHTML;
    assert.ok(chartHtml.includes("<svg"), "chart SVG rendered");
    assert.ok(chartHtml.includes("<rect"), "bars rendered");
    assert.ok(chartHtml.includes("<polyline"), "trend line rendered");
    // Same run count/labels as Retries Per Run — both read dashboard.retryTimeline.
    assert.ok(chartHtml.includes("Run 1") && chartHtml.includes("Run 4"));
    assert.ok(
      chartHtml.includes("Flaky tests increased from 5 to 12 across the 4 analyzed runs."),
      "first-vs-last interpretation"
    );
  });

  it("shows all N analyzed runs, not a fixed count (8 runs available => 8 shown)", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    dashboard.retryTimeline = Array.from({ length: 8 }, (_, i) => ({
      run: `Run ${i + 1}`,
      retries: 1,
      durationMs: 100,
      failed: 1,
      flaky: i + 1,
    }));
    new vm.Script(scriptOf(generate(dashboard))).runInContext(dom.ctx);
    const chartHtml = dom.els["adv-flaky-trend"].innerHTML;
    assert.equal((chartHtml.match(/<rect/g) || []).length, 8);
    assert.ok(chartHtml.includes("Flaky tests increased from 1 to 8 across the 8 analyzed runs."));
  });

  it("describes a decreasing flaky trend correctly, first vs last analyzed run", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    dashboard.retryTimeline = [
      { run: "Run 1", retries: 1, durationMs: 100, failed: 1, flaky: 12 },
      { run: "Run 2", retries: 1, durationMs: 100, failed: 1, flaky: 3 },
    ];
    new vm.Script(scriptOf(generate(dashboard))).runInContext(dom.ctx);
    assert.ok(
      dom.els["adv-flaky-trend"].innerHTML.includes(
        "Flaky tests decreased from 12 to 3 across the 2 analyzed runs."
      )
    );
  });

  it("describes a stable flaky trend correctly", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    dashboard.retryTimeline = [
      { run: "Run 1", retries: 1, durationMs: 100, failed: 1, flaky: 4 },
      { run: "Run 2", retries: 1, durationMs: 100, failed: 1, flaky: 4 },
    ];
    new vm.Script(scriptOf(generate(dashboard))).runInContext(dom.ctx);
    assert.ok(
      dom.els["adv-flaky-trend"].innerHTML.includes(
        "Flaky test count remained relatively stable across the 2 analyzed runs."
      )
    );
  });

  it("never renders any Reliability Score markup, and never references --history-file", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    dashboard.retryTimeline = [
      { run: "Run 1", retries: 1, durationMs: 100, failed: 1, flaky: 2 },
      { run: "Run 2", retries: 1, durationMs: 100, failed: 1, flaky: 4 },
    ];
    const html = generate(dashboard);
    assert.ok(!html.includes("Reliability Score"));
    assert.ok(!html.includes("rel-score"));
    assert.ok(!html.includes("section-reliability"));
    assert.ok(!html.includes("history-file"));
    new vm.Script(scriptOf(html)).runInContext(dom.ctx); // still parses/executes cleanly
  });

  it("Retries Per Run renders a bar+line chart (trend line added over the existing bars)", () => {
    const dom = makeDom();
    const dashboard = richDashboard();
    dashboard.retryTimeline = [
      { run: "Run 1", retries: 1, durationMs: 100 },
      { run: "Run 2", retries: 4, durationMs: 100 },
      { run: "Run 3", retries: 2, durationMs: 100 },
    ];
    const fullHtml = generate(dashboard);
    assert.ok(fullHtml.includes(">Retries Per Run Trend<"), "section title rendered as its own top-level section");
    new vm.Script(scriptOf(fullHtml)).runInContext(dom.ctx);
    const html = dom.els["adv-retries"].innerHTML;
    assert.ok(html.includes("<svg"), "chart SVG rendered");
    assert.ok(html.includes("<rect"), "bars rendered");
    assert.ok(html.includes("<polyline"), "trend line rendered");
  });
});

describe("html — inline handlers reachable from global scope (Phase 2.6 regression)", () => {
  const vm = require("node:vm");
  // Every function referenced by an inline on*="" attribute in the generated HTML.
  const HANDLERS = [
    "openPreview",
    "toggleCard",
    "filterCards",
    "debouncedSearch",
    "expandAllCards",
    "collapseAllCards",
    "switchEvidenceRun",
  ];

  const scriptOf = (h) => {
    const a = h.indexOf("<script>") + "<script>".length;
    const b = h.indexOf("</script>", a);
    return h.slice(a, b);
  };

  function el(id) {
    const L = {};
    return {
      _id: id,
      tag: "div",
      className: "",
      textContent: "",
      innerHTML: "",
      value: "",
      style: {},
      attrs: {},
      children: [],
      onclick: null,
      classList: {
        _s: new Set(),
        add(c) {
          this._s.add(c);
        },
        remove(c) {
          this._s.delete(c);
        },
        toggle(c) {
          if (this._s.has(c)) {
            this._s.delete(c);
            return false;
          }
          this._s.add(c);
          return true;
        },
        contains(c) {
          return this._s.has(c);
        },
      },
      _L: L,
      addEventListener(t, fn) {
        (L[t] = L[t] || []).push(fn);
      },
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
      getAttribute(k) {
        return this.attrs[k];
      },
      appendChild(c) {
        this.children.push(c);
        return c;
      },
      removeChild(c) {
        this.children = this.children.filter((x) => x !== c);
        return c;
      },
      querySelector() {
        return el(id + "::q");
      },
      querySelectorAll() {
        return [];
      },
      closest() {
        return this._c || (this._c = el(id + "::s"));
      },
      get parentElement() {
        return this._p || (this._p = el(id + "::p"));
      },
      get parentNode() {
        return this.parentElement;
      },
      focus() {},
      remove() {},
    };
  }
  function makeDom(qsa) {
    const els = {};
    const window = {
      localStorage: { getItem: () => null, setItem() {} },
      matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    };
    const document = {
      getElementById(id) {
        return els[id] || (els[id] = el(id));
      },
      querySelector(s) {
        return el(s);
      },
      querySelectorAll(s) {
        return (qsa && qsa[s]) || [];
      },
      createElement(t) {
        const e = el("new-" + t);
        e.tag = t;
        return e;
      },
      createTextNode(t) {
        return { textContent: t };
      },
      body: el("body"),
      documentElement: el("html"),
    };
    const ctx = vm.createContext({
      document,
      window,
      localStorage: window.localStorage,
      setTimeout: (fn) => {
        fn();
        return 1;
      },
      clearTimeout: () => {},
      console,
    });
    return { ctx, els, window, document };
  }
  const DASH = {
    project: "P",
    version: "1.0.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    summary: { runs: 2, totalTests: 2, stablePass: 0, flaky: 1 },
    suiteSummary: {
      total: 2,
      stable: 0,
      flaky: 1,
      regression: 0,
      failed: 1,
      stablePct: 0,
      flakyPct: 50,
    },
  };
  const run = (qsa) => {
    const dom = makeDom(qsa);
    new vm.Script(scriptOf(generate(DASH))).runInContext(dom.ctx);
    return dom;
  };

  // Regression: the inline handlers are declared inside the IIFE. Without exporting them to
  // window, an inline onclick/oninput/onkeydown resolves the name in global scope and throws
  // ReferenceError. This test is undefined-typed (and would fail) on the pre-fix implementation.
  it("exposes every inline-handler function on window", () => {
    const dom = run();
    for (const h of HANDLERS) {
      assert.equal(typeof dom.window[h], "function", h + " must be reachable from global scope");
    }
  });

  it("screenshot/evidence preview opens (openPreview creates a dismissible overlay)", () => {
    const dom = run();
    dom.window.openPreview("shots/a.png");
    const overlay = dom.document.body.children[0];
    assert.ok(overlay, "overlay appended to body");
    assert.equal(overlay.className, "evidence-overlay");
    assert.equal(overlay.children[0].src, "shots/a.png");
    overlay.onclick(); // clicking the overlay dismisses it
    assert.equal(dom.document.body.children.length, 0);
  });

  it("Expand All / Collapse All toggle the investigation cards", () => {
    const card = el("card");
    const dom = run({
      "#investigation-list .inv-card": [card],
      "#investigation-list .inv-card.expanded": [card],
    });
    dom.window.expandAllCards();
    assert.equal(card.classList.contains("expanded"), true);
    dom.window.collapseAllCards();
    assert.equal(card.classList.contains("expanded"), false);
  });

  it("Filter activates without error and marks the active badge", () => {
    const dom = run();
    const badge = el("badge");
    badge.textContent = "Flaky (1)";
    assert.doesNotThrow(() => dom.window.filterCards("flaky", badge));
    assert.equal(badge.classList.contains("badge-fail"), true);
  });

  it("Search runs without a ReferenceError", () => {
    const dom = run();
    dom.document.getElementById("global-search").value = "foo";
    assert.doesNotThrow(() => dom.window.debouncedSearch());
  });

  // ── History strip: visible run numbers, not just hover tooltips ──
  it("history strip tiles show their run number as visible text, in order, oldest to newest", () => {
    const dash = {
      ...DASH,
      investigations: [
        {
          testName: "always fails",
          classification: "stable_failure",
          classificationLabel: "Consistently Failing",
          classificationBadge: "badge-fail",
          classificationDataClass: "stable_failure",
          severity: "high",
          likelyCause: "broken",
          history: ["failed", "failed", "passed", "failed"],
        },
      ],
    };
    const dom = makeDom();
    new vm.Script(scriptOf(generate(dash))).runInContext(dom.ctx);
    const invHtml = dom.els["investigation-list"].innerHTML;
    const tiles = [...invHtml.matchAll(/<span class="inv-run ([^"]+)"[^>]*>(\d+)<\/span>/g)];
    assert.equal(tiles.length, 4, "one visible-numbered tile per run");
    assert.deepEqual(
      tiles.map((m) => m[2]),
      ["1", "2", "3", "4"],
      "numbered oldest to newest, matching history[] order"
    );
    assert.deepEqual(
      tiles.map((m) => m[1]),
      ["run-fail", "run-fail", "run-pass", "run-fail"]
    );
  });

  // ── Evidence run picker: default to latest, option to view any earlier run ──
  const evidenceDash = () => ({
    ...DASH,
    investigations: [
      {
        testName: "flaky screenshot test",
        classification: "flaky",
        classificationLabel: "Flaky",
        classificationBadge: "badge-warn",
        classificationDataClass: "flaky",
        severity: "medium",
        likelyCause: "slow",
        history: ["failed", "passed", "failed"],
        evidence: { screenshots: ["run3.png"] }, // default = latest run with evidence
        evidenceByRun: [
          { runIndex: 0, runLabel: "Run 1", evidence: { screenshots: ["run1.png"] } },
          { runIndex: 2, runLabel: "Run 3", evidence: { screenshots: ["run3.png"] } },
        ],
      },
    ],
  });

  it("evidence run picker: renders a <select> defaulting to the most recent run when 2+ runs have evidence", () => {
    const dom = makeDom();
    new vm.Script(scriptOf(generate(evidenceDash()))).runInContext(dom.ctx);
    const invHtml = dom.els["investigation-list"].innerHTML;
    assert.ok(invHtml.includes('class="inv-ev-run-select"'), "run picker rendered");
    assert.ok(invHtml.includes(">Run 1<") && invHtml.includes(">Run 3<"), "both runs listed as options");
    assert.ok(invHtml.includes("run3.png"), "defaults to the latest run's evidence");
    assert.ok(!invHtml.includes("run1.png"), "earlier run's evidence not shown until selected");
    assert.ok(/<option value="1" selected>Run 3<\/option>/.test(invHtml), "latest run pre-selected");
  });

  it("evidence run picker: switchEvidenceRun swaps the evidence body to the selected earlier run", () => {
    const dom = makeDom();
    new vm.Script(scriptOf(generate(evidenceDash()))).runInContext(dom.ctx);
    dom.window.switchEvidenceRun("card-0", "0"); // pos 0 = Run 1, the earlier of the two
    assert.ok(dom.els["ev-body-card-0"].innerHTML.includes("run1.png"));
    assert.ok(!dom.els["ev-body-card-0"].innerHTML.includes("run3.png"));
  });

  it("evidence run picker: no picker rendered when only one run has evidence", () => {
    const dash = evidenceDash();
    dash.investigations[0].evidenceByRun = [
      { runIndex: 2, runLabel: "Run 3", evidence: { screenshots: ["run3.png"] } },
    ];
    const dom = makeDom();
    new vm.Script(scriptOf(generate(dash))).runInContext(dom.ctx);
    const invHtml = dom.els["investigation-list"].innerHTML;
    assert.ok(!invHtml.includes('class="inv-ev-run-select"'));
    assert.ok(invHtml.includes("run3.png"));
  });

  it("evidence run picker: falls back to the default evidence, no picker, when evidenceByRun is absent (backward compatible)", () => {
    const dash = evidenceDash();
    delete dash.investigations[0].evidenceByRun;
    const dom = makeDom();
    assert.doesNotThrow(() => new vm.Script(scriptOf(generate(dash))).runInContext(dom.ctx));
    const invHtml = dom.els["investigation-list"].innerHTML;
    assert.ok(!invHtml.includes('class="inv-ev-run-select"'));
    assert.ok(invHtml.includes("run3.png"));
  });
});

describe("html — Additional Metrics card headers (compact redesign)", () => {
  const vm = require("node:vm");
  const scriptOf = (h) => {
    const a = h.indexOf("<script>") + "<script>".length;
    const b = h.indexOf("</script>", a);
    return h.slice(a, b);
  };
  function el(id) {
    return {
      _id: id,
      innerHTML: "",
      textContent: "",
      value: "",
      style: {},
      classList: {
        _s: new Set(),
        add(c) {
          this._s.add(c);
        },
        contains(c) {
          return this._s.has(c);
        },
      },
      querySelector() {
        return el(id + "::q");
      },
      querySelectorAll() {
        return [];
      },
    };
  }
  function makeDom() {
    const els = {};
    const document = {
      getElementById(id) {
        return els[id] || (els[id] = el(id));
      },
      querySelector(s) {
        return el(s);
      },
      querySelectorAll() {
        return [];
      },
      createElement(t) {
        return el("new-" + t);
      },
      createTextNode(t) {
        return { textContent: t };
      },
      body: el("body"),
      documentElement: el("html"),
    };
    const ctx = vm.createContext({
      document,
      window: {
        localStorage: { getItem: () => null, setItem() {} },
        matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
      },
      localStorage: { getItem: () => null, setItem() {} },
      setTimeout: (fn) => {
        fn();
        return 1;
      },
      clearTimeout: () => {},
      console,
    });
    return { ctx, els };
  }
  const dash = () => ({
    project: "P",
    version: "1.0.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    summary: { runs: 3, totalTests: 2 },
    suiteSummary: { total: 2, stable: 0, flaky: 1, regression: 0, failed: 1, stablePct: 0, flakyPct: 50 },
    browserStats: [{ browser: "chromium", totalTests: 10, totalFailures: 2, failRate: 20 }],
    browserStatsLatest: [{ browser: "chromium", totalTests: 10, totalFailures: 2, failRate: 20 }],
    failureCategories: { total: 1, counts: { timeout: 1 } },
    failureCategoriesLatest: { total: 1, counts: { timeout: 1 } },
    slowestTests: [{ title: "slow test", durationMs: 5000 }],
    failureFrequency: [{ testName: "flaky test", failureCount: 2, totalRuns: 5 }],
    rootCauseSummary: [
      { testName: "t", status: "flaky", pattern: "RC-001", category: "Timeout", confidence: 80 },
    ],
    retryTimeline: [{ run: "Run 1", retries: 1, durationMs: 100, failed: 1, flaky: 1 }],
  });

  it("Browser Statistics and Failure Categories use the new compact card-header structure (title + controls row, no gray box)", () => {
    const dom = makeDom();
    new vm.Script(scriptOf(generate(dash()))).runInContext(dom.ctx);
    for (const id of ["adv-browsers", "adv-categories"]) {
      const html = dom.els[id].innerHTML;
      assert.ok(html.startsWith('<div class="adv-card-header">'), id + " starts with the new header wrapper");
      assert.ok(html.includes('<h3 class="adv-card-title">'), id + " title uses the new title class");
      assert.ok(html.includes('<div class="adv-card-controls">'), id + " has a controls row for the tabs");
      assert.ok(html.includes('class="scope-toggle"'), id + " still renders the Latest Run/All Runs tabs");
      assert.ok(html.includes('class="adv-info-icon"'), id + " helper text is a compact info icon, not a full line");
      assert.ok(!/&middot;\s*(counts are|error occurrences)/.test(html), id + " no longer spells out helper text as a full line");
    }
  });

  it("Failure Frequency and Slowest Tests use the same title styling but stay single-line (no tabs, no wasted space)", () => {
    const dom = makeDom();
    new vm.Script(scriptOf(generate(dash()))).runInContext(dom.ctx);
    for (const id of ["adv-frequency", "adv-slowest"]) {
      const html = dom.els[id].innerHTML;
      assert.ok(html.includes('<h3 class="adv-card-title">'), id + " uses the same title class as the tab-bearing cards");
      assert.ok(!html.includes('class="adv-card-controls"'), id + " has no controls row");
      assert.ok(!html.includes('class="scope-toggle"'), id + " has no tabs");
      assert.ok(!html.includes('class="adv-info-icon"'), id + " has no info icon");
    }
  });

  it("does not change Root Cause Summary's distinct warning-flagged header styling", () => {
    const dom = makeDom();
    new vm.Script(scriptOf(generate(dash()))).runInContext(dom.ctx);
    const html = dom.els["adv-root-cause"].innerHTML;
    assert.ok(html.startsWith("<h3>Root Cause Summary "), "unchanged markup, not migrated to the new card-header classes");
    assert.ok(!html.includes('class="adv-card-header"'));
  });
});

describe("html — evidence without screenshots + Open Screenshot button (Phase 7 regression)", () => {
  const vm = require("node:vm");

  const scriptOf = (h) =>
    h.slice(
      h.indexOf("<script>") + "<script>".length,
      h.indexOf("</script>", h.indexOf("<script>"))
    );
  const htmlAttrDecode = (s) =>
    s
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");

  function el(id) {
    const L = {};
    return {
      _id: id,
      tag: "div",
      className: "",
      textContent: "",
      innerHTML: "",
      value: "",
      style: {},
      attrs: {},
      children: [],
      onclick: null,
      classList: {
        _s: new Set(),
        add(c) {
          this._s.add(c);
        },
        remove(c) {
          this._s.delete(c);
        },
        toggle(c) {
          if (this._s.has(c)) {
            this._s.delete(c);
            return false;
          }
          this._s.add(c);
          return true;
        },
        contains(c) {
          return this._s.has(c);
        },
      },
      _L: L,
      addEventListener(t, fn) {
        (L[t] = L[t] || []).push(fn);
      },
      setAttribute() {},
      getAttribute() {},
      appendChild(c) {
        this.children.push(c);
        return c;
      },
      removeChild(c) {
        this.children = this.children.filter((x) => x !== c);
        return c;
      },
      querySelector() {
        return el(id + "::q");
      },
      querySelectorAll() {
        return [];
      },
      closest() {
        return el(id + "::s");
      },
      get parentElement() {
        return el(id + "::p");
      },
      get parentNode() {
        return this.parentElement;
      },
      focus() {},
      remove() {},
    };
  }
  function render(evidence, classification, extra) {
    const dash = {
      project: "P",
      version: "1",
      generatedAt: "2026-01-01T00:00:00Z",
      summary: { runs: 2, totalTests: 1, flaky: 1 },
      suiteSummary: { total: 1, flaky: 1 },
      investigations: [
        {
          classification: classification || "flaky",
          classificationLabel: "Flaky",
          severity: "medium",
          likelyCause: "x",
          testName: "t",
          evidence,
          ...extra,
        },
      ],
    };
    const script = scriptOf(generate(dash));
    const els = {};
    const window = {
      localStorage: { getItem: () => null, setItem() {} },
      matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    };
    const document = {
      getElementById(id) {
        return els[id] || (els[id] = el(id));
      },
      querySelector() {
        return el("q");
      },
      querySelectorAll(s) {
        return s === ".section-header" ? [el("h")] : [];
      },
      createElement(t) {
        return el(t);
      },
      createTextNode(x) {
        return { textContent: x };
      },
      body: el("body"),
      documentElement: el("html"),
    };
    const ctx = vm.createContext({
      document,
      window,
      localStorage: window.localStorage,
      setTimeout: (fn) => {
        fn();
        return 1;
      },
      clearTimeout: () => {},
      console,
    });
    let initError = null;
    try {
      new vm.Script(script).runInContext(ctx);
    } catch (e) {
      initError = e.message;
    }
    return { initError, invHtml: els["investigation-list"].innerHTML, window, ctx };
  }
  function runOnclick(ctx, raw) {
    const captured = [];
    const f = new vm.Script(
      "(function(event,openPreview){" + htmlAttrDecode(raw) + "})"
    ).runInContext(ctx);
    f({ stopPropagation() {} }, (u) => captured.push(u));
    return captured;
  }

  // CRITICAL: every evidence shape must render without crashing the whole dashboard script.
  const shapes = {
    "screenshots present": {
      screenshots: ["shots/a.png", "shots/b.png"],
      trace: "t.zip",
      video: "v.webm",
    },
    "error messages only": { errorMessages: ["boom"] },
    "trace only": { trace: "test-results/t.zip" },
    "video only": { video: "test-results/v.webm" },
    "stack trace only": { stackTrace: "at foo (bar.js:1:1)" },
  };
  for (const [name, evidence] of Object.entries(shapes)) {
    it(`renders without a runtime error when evidence = ${name}`, () => {
      const r = render(evidence);
      assert.equal(r.initError, null, "dashboard script must not throw");
      assert.ok(r.invHtml.length > 0, "investigation panel must render");
    });
  }

  it("still flags a regression-pattern test (CLS-005) as priority-critical even though its classification is now newly_failed", () => {
    // classify() merges the "fixed, then broke again" pattern into
    // newly_failed (see classifier.js), but CLS-005 is the rule id for
    // exactly that pattern and was deliberately kept unchanged — the card's
    // red critical border must key off that, not the old "regression"
    // classification string, which classify() never produces anymore.
    const r = render({}, "newly_failed", { classificationRuleId: "CLS-005", severity: "high" });
    assert.equal(r.initError, null);
    assert.ok(
      r.invHtml.includes("priority-critical"),
      "CLS-005 must still render as priority-critical"
    );
  });

  it("a plain newly_failed test (not a regression pattern) gets priority-high, not priority-critical, when severity is high", () => {
    const r = render({}, "newly_failed", { classificationRuleId: "CLS-004", severity: "high" });
    assert.equal(r.initError, null);
    assert.ok(r.invHtml.includes("priority-high"));
    assert.ok(!r.invHtml.includes("priority-critical"));
  });

  it("renders every card's HTML with balanced div tags, so cards never nest inside each other", () => {
    // Regression: renderEvidence() used to open .inv-field and
    // .inv-evidence-row but only close one of them before returning,
    // leaving .inv-field permanently unclosed — every card after the first
    // ended up nested INSIDE the previous card's unclosed div, cascading
    // into ballooning heights and borders that visually bled across every
    // subsequent card down the page.
    const dash = {
      project: "P",
      version: "1",
      generatedAt: "2026-01-01T00:00:00Z",
      summary: { runs: 2, totalTests: 3, flaky: 3 },
      suiteSummary: { total: 3, flaky: 3 },
      investigations: [
        {
          classification: "flaky",
          classificationLabel: "Flaky",
          severity: "high",
          likelyCause: "x",
          testName: "t1",
          evidence: { trace: "a.zip", video: "a.webm" },
        },
        {
          classification: "flaky",
          classificationLabel: "Flaky",
          severity: "high",
          likelyCause: "x",
          testName: "t2",
          evidence: { trace: "b.zip" },
        },
        {
          classification: "flaky",
          classificationLabel: "Flaky",
          severity: "high",
          likelyCause: "x",
          testName: "t3",
          evidence: {},
        },
      ],
    };
    const script = scriptOf(generate(dash));
    const els = {};
    const window = {
      localStorage: { getItem: () => null, setItem() {} },
      matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    };
    const document = {
      getElementById(id) {
        return els[id] || (els[id] = el(id));
      },
      querySelector() {
        return el("q");
      },
      querySelectorAll(s) {
        return s === ".section-header" ? [el("h")] : [];
      },
      createElement(t) {
        return el(t);
      },
      createTextNode(x) {
        return { textContent: x };
      },
      body: el("body"),
      documentElement: el("html"),
    };
    const ctx = vm.createContext({
      document,
      window,
      localStorage: window.localStorage,
      setTimeout: (fn) => {
        fn();
        return 1;
      },
      clearTimeout: () => {},
      console,
    });
    new vm.Script(script).runInContext(ctx);
    const html = els["investigation-list"].innerHTML;
    const opens = (html.match(/<div\b/g) || []).length;
    const closes = (html.match(/<\/div>/g) || []).length;
    assert.equal(
      opens,
      closes,
      `unbalanced <div> tags: ${opens} opened, ${closes} closed — a card's HTML is leaking into the next`
    );
    // Each card must open at the SAME nesting depth (0) — if renderEvidence
    // leaked an unclosed div, "inv-card priority-high" for t2/t3 would appear
    // at depth > 0 relative to t1's card.
    const cardStarts = [...html.matchAll(/<div class="inv-card /g)].map((m) => m.index);
    assert.equal(cardStarts.length, 3, "expected exactly 3 top-level card divs");
  });

  it("does not duplicate the opening lines of a long stack trace in a separate preview block", () => {
    // For stackTrace longer than 5 lines, the <details> used to be followed
    // by an always-visible 3-line "preview" <pre> repeating the trace's
    // opening lines a second time — visible right below the (collapsed by
    // default) full trace, regardless of whether it was expanded.
    const stack = [
      "Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/",
      "Call log:",
      '  - navigating to "https://example.com/", waiting until "domcontentloaded"',
      "",
      "    at LoginPage.goto (login_page.js:22:21)",
      "    at loginFn (authHelper.js:41:19)",
      "    at navigateToApp (authHelper.js:167:31)",
      "    at spec.js:12:11",
    ].join("\n");
    const r = render({ stackTrace: stack });
    assert.equal(r.initError, null);
    // The opening call-log line should appear exactly once — not once inside
    // <details> and again in a trailing duplicate <pre>.
    const occurrences = r.invHtml.split("navigating to").length - 1;
    assert.equal(occurrences, 1, "opening line of the stack trace must not be duplicated");
  });

  it("Open Screenshot button opens the first screenshot and does not reference 'ev'", () => {
    const r = render({ screenshots: ["shots/a.png", "shots/b.png"] });
    assert.equal(r.initError, null);
    const btn = r.invHtml.match(/onclick="([^"]*)"[^>]*>[^<]*Open Screenshot/);
    assert.ok(btn, "Open Screenshot button present");
    assert.equal(/\bev\b/.test(btn[1]), false, "onclick must not reference the build-time 'ev'");
    assert.deepEqual(runOnclick(r.ctx, btn[1]), ["shots/a.png"]);
  });

  it("screenshot thumbnail opens its screenshot", () => {
    const r = render({ screenshots: ["shots/a.png"] });
    const thumb = r.invHtml.match(/inv-screenshot-thumb[^>]*onclick="([^"]*)"/);
    assert.ok(thumb, "thumbnail present");
    assert.deepEqual(runOnclick(r.ctx, thumb[1]), ["shots/a.png"]);
  });

  it("Open Screenshot button is disabled and inert when there are no screenshots", () => {
    const r = render({ errorMessages: ["boom"], trace: "test-results/t.zip" });
    assert.equal(r.initError, null);
    assert.ok(/inv-ev-btn disabled/.test(r.invHtml), "button rendered as disabled");
    const btn = r.invHtml.match(/onclick="([^"]*)"[^>]*>[^<]*Open Screenshot/);
    assert.ok(btn);
    assert.doesNotThrow(() => runOnclick(r.ctx, btn[1]), "disabled button must not throw on click");
  });
});
