"use strict";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const url = require("url");

const collector = require("./collector");
const copier = require("./copier");
const rewriter = require("./path-rewriter");
const { packageEvidence } = require("./index");

// ── temp workspace ──────────────────────────────────────────────────────────
let WORK;
let SRC; // where "Playwright output" (source evidence) lives
let BUNDLE; // where the report bundle is written

function fileUrl(p) {
  return url.pathToFileURL(p).href;
}
function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return p;
}

before(() => {
  WORK = fs.mkdtempSync(path.join(os.tmpdir(), "pfa-evidence-"));
});
after(() => {
  try {
    fs.rmSync(WORK, { recursive: true, force: true });
  } catch (e) {
    /* ignore */
  }
});
beforeEach(() => {
  SRC = fs.mkdtempSync(path.join(WORK, "src-"));
  BUNDLE = fs.mkdtempSync(path.join(WORK, "bundle-"));
});

// Build a dashboard with one investigation whose evidence points at real files
// in SRC (as file:// URLs, exactly like dashboard-json.js emits).
function dashboardWith(evidence) {
  return { investigations: [{ testName: "t", evidence }] };
}

// ── collector ────────────────────────────────────────────────────────────────
describe("evidence/collector", () => {
  it("resolves file:// URLs, skips http(s)/data/already-relative, and categorizes", () => {
    const shot = writeFile(path.join(SRC, "a.png"), "png");
    const vid = writeFile(path.join(SRC, "v.webm"), "webm");
    const trace = writeFile(path.join(SRC, "t.zip"), "zip");
    const d = dashboardWith({
      screenshots: [
        fileUrl(shot),
        "https://cdn.example.com/remote.png",
        "assets/screenshots/x.png",
      ],
      video: fileUrl(vid),
      trace: fileUrl(trace),
    });
    const { objects, sources } = collector.collect(d);
    assert.equal(objects.length, 1);
    // remote + already-relative are skipped; 3 real files remain
    assert.equal(sources.size, 3);
    assert.equal(sources.get(shot).category, "screenshots");
    assert.equal(sources.get(vid).category, "videos");
    assert.equal(sources.get(trace).category, "traces");
  });

  it("dedupes the same source referenced many times", () => {
    const shot = writeFile(path.join(SRC, "same.png"), "png");
    const d = {
      investigations: [
        { evidence: { screenshots: [fileUrl(shot), fileUrl(shot), fileUrl(shot)] } },
      ],
    };
    const { sources } = collector.collect(d);
    assert.equal(sources.size, 1);
  });

  it("collects distinct evidence objects across investigations + passingOnRetry + rootCause", () => {
    const shot = writeFile(path.join(SRC, "a.png"), "png");
    const shared = { screenshots: [fileUrl(shot)] };
    const d = {
      investigations: [{ evidence: shared }],
      passingOnRetryTests: [{ evidence: { screenshots: [fileUrl(shot)] } }],
      rootCauseSummary: [{ evidence: shared }], // same object as investigations
    };
    const { objects } = collector.collect(d);
    // shared object counted once; the passingOnRetry object is distinct -> 2
    assert.equal(objects.length, 2);
  });

  it("also collects per-run evidence from evidenceByRun (the run picker), not just the default evidence", () => {
    const run2Shot = writeFile(path.join(SRC, "run2.png"), "png-run2");
    const run3Shot = writeFile(path.join(SRC, "run3.png"), "png-run3");
    const d = {
      investigations: [
        {
          evidence: { screenshots: [fileUrl(run3Shot)] }, // default = latest run
          evidenceByRun: [
            { runIndex: 1, runLabel: "Run 2", evidence: { screenshots: [fileUrl(run2Shot)] } },
            { runIndex: 2, runLabel: "Run 3", evidence: { screenshots: [fileUrl(run3Shot)] } },
          ],
        },
      ],
    };
    const { objects, sources } = collector.collect(d);
    // default evidence + 2 per-run evidence objects = 3 distinct objects...
    assert.equal(objects.length, 3);
    // ...but only 2 distinct files, since the default duplicates run 3's file.
    assert.equal(sources.size, 2);
    assert.ok(sources.has(run2Shot));
    assert.ok(sources.has(run3Shot));
  });
});

// ── copier ───────────────────────────────────────────────────────────────────
describe("evidence/copier", () => {
  it("copies each unique source once into assets/<category>/ and preserves names", () => {
    const shot = writeFile(path.join(SRC, "login.png"), "png-bytes");
    const sources = new Map([[shot, { category: "screenshots" }]]);
    const { map, copied, missing } = copier.copy(sources, BUNDLE, { logger: silent() });
    assert.equal(copied, 1);
    assert.equal(missing, 0);
    const rel = map.get(shot).relPath;
    assert.equal(rel, "assets/screenshots/login.png");
    assert.ok(fs.existsSync(path.join(BUNDLE, rel)), "file copied to bundle");
    assert.equal(fs.readFileSync(path.join(BUNDLE, rel), "utf8"), "png-bytes");
  });

  it("gives colliding basenames deterministic unique names", () => {
    const a = writeFile(path.join(SRC, "a", "shot.png"), "A");
    const b = writeFile(path.join(SRC, "b", "shot.png"), "B");
    const sources = new Map([
      [a, { category: "screenshots" }],
      [b, { category: "screenshots" }],
    ]);
    const { map } = copier.copy(sources, BUNDLE, { logger: silent() });
    const relA = map.get(a).relPath;
    const relB = map.get(b).relPath;
    assert.notEqual(relA, relB, "collision resolved to distinct names");
    assert.equal(relA, "assets/screenshots/shot.png"); // first keeps the plain name
    assert.match(relB, /^assets\/screenshots\/shot-[0-9a-f]{1,6}\.png$/);
    // both files present with their distinct content
    assert.equal(fs.readFileSync(path.join(BUNDLE, relA), "utf8"), "A");
    assert.equal(fs.readFileSync(path.join(BUNDLE, relB), "utf8"), "B");
    // deterministic: same inputs -> same names on a second run
    const bundle2 = fs.mkdtempSync(path.join(WORK, "bundle2-"));
    const map2 = copier.copy(sources, bundle2, { logger: silent() }).map;
    assert.equal(map2.get(b).relPath, relB);
  });

  it("records missing sources without throwing", () => {
    const ghost = path.join(SRC, "gone.png");
    const sources = new Map([[ghost, { category: "screenshots" }]]);
    let warned = 0;
    const { map, copied, missing } = copier.copy(sources, BUNDLE, {
      logger: { warn: () => warned++, debug() {} },
    });
    assert.equal(copied, 0);
    assert.equal(missing, 1);
    assert.equal(map.get(ghost).relPath, null);
    assert.equal(map.get(ghost).missing, true);
    assert.ok(warned >= 1, "a warning was logged for the missing file");
  });
});

// ── path-rewriter ─────────────────────────────────────────────────────────────
describe("evidence/path-rewriter", () => {
  it("rewrites references to relative assets/ paths and flags missing ones", () => {
    const shot = writeFile(path.join(SRC, "a.png"), "x");
    const gone = path.join(SRC, "gone.webm");
    const ev = { screenshots: [fileUrl(shot)], video: fileUrl(gone), trace: null };
    const copyMap = new Map([
      [shot, { relPath: "assets/screenshots/a.png", missing: false }],
      [gone, { relPath: null, missing: true }],
    ]);
    rewriter.rewrite([ev], copyMap);
    assert.deepEqual(ev.screenshots, ["assets/screenshots/a.png"]);
    assert.equal(ev.video, null);
    assert.equal(ev.videoUnavailable, true);
    // no path is absolute or escapes the bundle
    assert.ok(!/^([a-zA-Z]:\\|\/|file:|\.\.)/.test(ev.screenshots[0]));
  });
});

// ── integration: packageEvidence ─────────────────────────────────────────────
describe("evidence/packageEvidence (integration)", () => {
  it("packages a full bundle: screenshots + video + trace copied and rewritten relative", () => {
    const shot = writeFile(path.join(SRC, "shot.png"), "png");
    const vid = writeFile(path.join(SRC, "clip.webm"), "webm");
    const trace = writeFile(path.join(SRC, "trace.zip"), "zip");
    const ev = { screenshots: [fileUrl(shot)], video: fileUrl(vid), trace: fileUrl(trace) };
    const d = dashboardWith(ev);

    const summary = packageEvidence(d, BUNDLE, { logger: silent() });
    assert.equal(summary.copied, 3);
    assert.equal(summary.missing, 0);

    // rewritten to relative assets/ paths
    assert.equal(ev.screenshots[0], "assets/screenshots/shot.png");
    assert.equal(ev.video, "assets/videos/clip.webm");
    assert.equal(ev.trace, "assets/traces/trace.zip");
    // files physically present in the bundle
    assert.ok(fs.existsSync(path.join(BUNDLE, "assets/screenshots/shot.png")));
    assert.ok(fs.existsSync(path.join(BUNDLE, "assets/videos/clip.webm")));
    assert.ok(fs.existsSync(path.join(BUNDLE, "assets/traces/trace.zip")));
    // no reference points outside the bundle
    JSON.stringify(d).match(/file:\/\//g) === null;
    assert.ok(!JSON.stringify(d).includes("file://"), "no file:// references remain");
  });

  it("dedupes: one shared screenshot referenced 4x copies once", () => {
    const shot = writeFile(path.join(SRC, "one.png"), "png");
    const d = {
      investigations: [
        { evidence: { screenshots: [fileUrl(shot), fileUrl(shot)] } },
        { evidence: { screenshots: [fileUrl(shot), fileUrl(shot)] } },
      ],
    };
    const summary = packageEvidence(d, BUNDLE, { logger: silent() });
    assert.equal(summary.copied, 1, "copied once");
    assert.ok(summary.deduped >= 3, "3 duplicate references reused");
    const files = fs.readdirSync(path.join(BUNDLE, "assets/screenshots"));
    assert.equal(files.length, 1);
  });

  it("missing evidence -> unavailable flags, no throw, bundle still produced", () => {
    const ev = {
      screenshots: [fileUrl(path.join(SRC, "missing.png"))],
      video: fileUrl(path.join(SRC, "missing.webm")),
      trace: fileUrl(path.join(SRC, "missing.zip")),
    };
    const d = dashboardWith(ev);
    let summary;
    assert.doesNotThrow(() => {
      summary = packageEvidence(d, BUNDLE, { logger: silent() });
    });
    assert.equal(summary.missing, 3);
    assert.equal(summary.copied, 0);
    assert.equal(ev.trace, null);
    assert.equal(ev.traceUnavailable, true);
    assert.equal(ev.video, null);
    assert.equal(ev.videoUnavailable, true);
    assert.deepEqual(ev.screenshots, []);
    assert.equal(ev.screenshotsUnavailable, 1);
  });

  it("zero evidence: no crash, nothing copied", () => {
    const d = { investigations: [{ testName: "t", evidence: null }], passingOnRetryTests: [] };
    let summary;
    assert.doesNotThrow(() => {
      summary = packageEvidence(d, BUNDLE, { logger: silent() });
    });
    assert.equal(summary.copied, 0);
    assert.equal(summary.missing, 0);
  });

  it("leaves already-packaged (assets/...) and remote (http) references untouched", () => {
    const ev = {
      screenshots: ["assets/screenshots/kept.png", "https://cdn/x.png"],
      trace: "assets/traces/kept.zip",
    };
    const d = dashboardWith(ev);
    packageEvidence(d, BUNDLE, { logger: silent() });
    assert.deepEqual(ev.screenshots, ["assets/screenshots/kept.png", "https://cdn/x.png"]);
    assert.equal(ev.trace, "assets/traces/kept.zip");
  });
});

function silent() {
  return { warn() {}, debug() {}, info() {} };
}
