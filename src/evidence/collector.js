"use strict";

/**
 * Evidence collector.
 *
 * Walks a built dashboard model and finds every evidence file it references
 * (screenshots, videos, traces, and any generic attachments). Evidence paths
 * on the model are `file://` URLs (see dashboard-json.js `toOpenableUrl`) or,
 * if that conversion failed, raw filesystem paths. This module normalizes them
 * back to absolute filesystem paths and groups them by asset category so the
 * copier can package them.
 *
 * It intentionally does NO file I/O — it only reads the in-memory model — so it
 * is trivially unit-testable and safe to run even when the evidence files are
 * long gone.
 */

const path = require("path");
const url = require("url");

// The four asset buckets, matching the on-disk assets/<category>/ layout.
const CATEGORY = {
  SCREENSHOT: "screenshots",
  VIDEO: "videos",
  TRACE: "traces",
  ATTACHMENT: "attachments",
};

/**
 * Convert an evidence reference (a `file://` URL, a raw absolute/relative path,
 * or a remote URL) into an absolute filesystem path we can read. Returns null
 * for anything we should NOT copy: remote http(s) URLs, data: URIs, already
 * bundle-relative `assets/...` paths, or empty values.
 */
function toFsPath(ref) {
  if (!ref || typeof ref !== "string") return null;
  const trimmed = ref.trim();
  if (!trimmed) return null;

  // Already packaged (idempotent re-runs) — leave it alone.
  if (trimmed.startsWith("assets/") || trimmed.startsWith("./assets/")) return null;

  if (/^file:\/\//i.test(trimmed)) {
    try {
      return url.fileURLToPath(trimmed);
    } catch (e) {
      return null;
    }
  }

  // Remote or non-file protocols can't be copied into a local bundle.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return null; // http(s), ftp, ...
  if (/^data:/i.test(trimmed)) return null;

  // Treat everything else as a filesystem path.
  return path.resolve(trimmed);
}

/**
 * Gather the distinct evidence objects referenced anywhere in the dashboard.
 * The same `evidence` object can be shared by reference across investigations,
 * passingOnRetryTests and rootCauseSummary; we dedupe by object identity so a
 * later rewrite touches each object exactly once.
 */
function collectEvidenceObjects(dashboard) {
  const seen = new Set();
  const objects = [];
  const push = (ev) => {
    if (ev && typeof ev === "object" && !seen.has(ev)) {
      seen.add(ev);
      objects.push(ev);
    }
  };
  const walkList = (list) => {
    (list || []).forEach((item) => {
      if (!item) return;
      push(item.evidence);
      // Per-run evidence (the "view a previous run's artifacts" picker) —
      // each entry is its own evidence-shaped object, distinct from the
      // default `item.evidence` above, so it needs collecting separately.
      (item.evidenceByRun || []).forEach((r) => push(r && r.evidence));
    });
  };
  if (dashboard) {
    walkList(dashboard.investigations);
    walkList(dashboard.passingOnRetryTests);
    walkList(dashboard.rootCauseSummary);
  }
  return objects;
}

/**
 * Build the copy plan.
 *
 * @param {object} dashboard - the dashboard model (post buildDashboardJson).
 * @returns {{ objects: object[], sources: Map<string, {category:string}> }}
 *   objects: the distinct evidence objects (for the rewriter).
 *   sources: absolute fs path -> { category } for every unique file to copy.
 */
function collect(dashboard) {
  const objects = collectEvidenceObjects(dashboard);
  const sources = new Map();

  const add = (ref, category) => {
    const fsPath = toFsPath(ref);
    if (!fsPath) return;
    // First category wins — a path is only ever one kind of asset.
    if (!sources.has(fsPath)) sources.set(fsPath, { category });
  };

  objects.forEach((ev) => {
    if (Array.isArray(ev.screenshots)) ev.screenshots.forEach((s) => add(s, CATEGORY.SCREENSHOT));
    if (ev.video) add(ev.video, CATEGORY.VIDEO);
    if (ev.trace) add(ev.trace, CATEGORY.TRACE);
    // Generic attachments (future-proofing — not produced by the current
    // reporter, which only surfaces screenshots/video/trace, but copied here
    // if a model ever includes them so nothing is silently dropped).
    if (Array.isArray(ev.attachments)) {
      ev.attachments.forEach((a) =>
        add(typeof a === "string" ? a : a && a.path, CATEGORY.ATTACHMENT)
      );
    }
  });

  return { objects, sources };
}

module.exports = { collect, toFsPath, collectEvidenceObjects, CATEGORY };
