"use strict";

/**
 * Evidence packaging — public entry point.
 *
 * Makes an HTML report bundle self-contained and portable: copies every
 * referenced screenshot / video / trace into `<bundleDir>/assets/...` and
 * rewrites the dashboard model's evidence references to relative `assets/...`
 * paths. After this runs, the bundle folder can be zipped and opened anywhere —
 * it never depends on the original Playwright output directory.
 *
 *   collector  -> find & resolve evidence refs, group by category
 *   copier     -> copy each unique file once (dedupe, collisions, missing-safe)
 *   rewriter   -> point the model at the copied assets (relative paths)
 *
 * Never throws on evidence problems: a missing file becomes a disabled
 * "unavailable" control in the report, with a logged warning. Report generation
 * always succeeds.
 */

const collector = require("./collector");
const copier = require("./copier");
const rewriter = require("./path-rewriter");

/**
 * @param {object} dashboard - the built dashboard model (mutated in place)
 * @param {string} bundleDir - directory that will contain index.html + assets/
 * @param {object} [opts] - { logger, fsImpl }
 * @returns {{ copied:number, missing:number, deduped:number, bytes:number,
 *             screenshotsDropped:number, tracesMissing:number, videosMissing:number,
 *             totalRefs:number }}
 */
function packageEvidence(dashboard, bundleDir, opts) {
  opts = opts || {};
  const logger = opts.logger || { warn() {}, debug() {}, info() {} };

  const io = opts.fsImpl || require("fs");
  const assetsDir = require("path").join(bundleDir, "assets");
  // Start from a clean assets/ so a re-run into the same bundle never leaves
  // orphaned files from evidence that's since changed. Safe: we only ever own
  // the assets/ subtree.
  try {
    io.rmSync(assetsDir, { recursive: true, force: true });
  } catch (e) {
    /* best-effort clean; copier still overwrites what it needs */
  }

  const { objects, sources } = collector.collect(dashboard);

  // How many raw references existed vs. how many unique files we'll copy —
  // the difference is what deduping saved.
  let totalRefs = 0;
  objects.forEach((ev) => {
    if (Array.isArray(ev.screenshots)) totalRefs += ev.screenshots.length;
    if (ev.video) totalRefs++;
    if (ev.trace) totalRefs++;
    if (Array.isArray(ev.attachments)) totalRefs += ev.attachments.length;
  });

  const { map, copied, missing, bytes } = copier.copy(sources, bundleDir, {
    logger,
    fsImpl: opts.fsImpl,
  });

  const rw = rewriter.rewrite(objects, map);

  const deduped = Math.max(0, totalRefs - sources.size);

  return {
    copied,
    missing,
    deduped,
    bytes,
    totalRefs,
    screenshotsDropped: rw.screenshotsDropped,
    tracesMissing: rw.tracesMissing,
    videosMissing: rw.videosMissing,
  };
}

module.exports = { packageEvidence, collector, copier, rewriter };
