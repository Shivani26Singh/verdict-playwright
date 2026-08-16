"use strict";

/**
 * Evidence path rewriter.
 *
 * Given the evidence objects the collector found and the copier's result map
 * (original absolute path -> bundle-relative path | missing), rewrite each
 * evidence object *in place* so every reference points at `assets/...` relative
 * to index.html — never at the original Playwright directory, an absolute path,
 * or a `../..` escape.
 *
 * Missing files are not silently dropped: the reference is set to null AND a
 * `*Unavailable` flag is set so the HTML renderer can show a disabled
 * "unavailable" control instead of a dead link.
 *
 * Idempotent: references already pointing at `assets/...` (or remote http(s)
 * URLs the collector deliberately skipped) are left untouched.
 */

const collector = require("./collector");

function relFor(ref, copyMap) {
  const fsPath = collector.toFsPath(ref);
  if (!fsPath) return { kept: ref }; // remote URL / already-relative / empty — keep as-is
  const res = copyMap.get(fsPath);
  if (!res) return { kept: ref }; // not in plan (shouldn't happen) — keep as-is
  if (res.missing || !res.relPath) return { missing: true };
  return { rel: res.relPath };
}

/**
 * @param {object[]} evidenceObjects - distinct evidence objects from collector
 * @param {Map} copyMap - copier result: absPath -> {relPath|null, missing}
 * @returns {{ rewritten:number, screenshotsDropped:number, tracesMissing:number, videosMissing:number }}
 */
function rewrite(evidenceObjects, copyMap) {
  let rewritten = 0;
  let screenshotsDropped = 0;
  let tracesMissing = 0;
  let videosMissing = 0;

  (evidenceObjects || []).forEach((ev) => {
    if (!ev || typeof ev !== "object") return;

    if (Array.isArray(ev.screenshots)) {
      const out = [];
      let dropped = 0;
      ev.screenshots.forEach((s) => {
        const r = relFor(s, copyMap);
        if (r.rel) out.push(r.rel);
        else if (r.kept) out.push(r.kept);
        else dropped++; // missing
      });
      ev.screenshots = out;
      if (dropped) {
        ev.screenshotsUnavailable = (ev.screenshotsUnavailable || 0) + dropped;
        screenshotsDropped += dropped;
      }
      rewritten++;
    }

    if (ev.trace) {
      const r = relFor(ev.trace, copyMap);
      if (r.rel) ev.trace = r.rel;
      else if (r.kept) ev.trace = r.kept;
      else {
        ev.trace = null;
        ev.traceUnavailable = true;
        tracesMissing++;
      }
      rewritten++;
    }

    if (ev.video) {
      const r = relFor(ev.video, copyMap);
      if (r.rel) ev.video = r.rel;
      else if (r.kept) ev.video = r.kept;
      else {
        ev.video = null;
        ev.videoUnavailable = true;
        videosMissing++;
      }
      rewritten++;
    }

    if (Array.isArray(ev.attachments)) {
      ev.attachments = ev.attachments
        .map((a) => {
          const ref = typeof a === "string" ? a : a && a.path;
          const r = relFor(ref, copyMap);
          if (r.rel) return typeof a === "string" ? r.rel : Object.assign({}, a, { path: r.rel });
          if (r.kept) return a;
          return null; // missing
        })
        .filter(Boolean);
    }
  });

  return { rewritten, screenshotsDropped, tracesMissing, videosMissing };
}

module.exports = { rewrite };
