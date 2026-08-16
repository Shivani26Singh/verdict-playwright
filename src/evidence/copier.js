"use strict";

/**
 * Evidence copier.
 *
 * Copies each unique source file into `<bundleDir>/assets/<category>/` exactly
 * once, and returns a map from the original absolute path to its bundle-relative
 * destination (always POSIX-style, always relative to the report's index.html).
 *
 * Design points:
 *   - Never throws on a missing/unreadable source — records it as `missing`,
 *     logs a warning, and lets report generation continue.
 *   - Copies each distinct source path once (the collector already dedupes by
 *     path; this is a second guard).
 *   - Preserves the original filename. On a genuine collision (two DIFFERENT
 *     sources whose basenames match within the same category) it appends a
 *     short deterministic hash of the full source path, so names stay stable
 *     across runs (no counters that shift when inputs are reordered).
 */

const fs = require("fs");
const path = require("path");

// DJB2 — same tiny deterministic hash the fingerprints use; enough to
// disambiguate colliding basenames without pulling in `crypto`.
function shortHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).slice(0, 6);
}

function sanitizeName(name) {
  // Keep it filesystem- and URL-safe; collapse anything unusual to '_'.
  const base = path.basename(name || "").replace(/[^A-Za-z0-9._-]/g, "_");
  return base || "asset";
}

/**
 * @param {Map<string,{category:string}>} sources - abs fs path -> {category}
 * @param {string} bundleDir - the report bundle directory (index.html lives here)
 * @param {object} [opts] - { logger, fsImpl } (fsImpl for testing)
 * @returns {{ map: Map<string,{relPath:string|null, missing:boolean, category:string}>,
 *             copied:number, missing:number, bytes:number }}
 */
function copy(sources, bundleDir, opts) {
  opts = opts || {};
  const logger = opts.logger || { warn() {}, debug() {} };
  const io = opts.fsImpl || fs;

  const map = new Map();
  const usedNames = {}; // category -> Set of taken filenames
  let copied = 0;
  let missing = 0;
  let bytes = 0;

  for (const [srcPath, meta] of sources) {
    const category = meta.category;

    let exists = false;
    try {
      exists = io.existsSync(srcPath) && io.statSync(srcPath).isFile();
    } catch (e) {
      exists = false;
    }

    if (!exists) {
      missing++;
      map.set(srcPath, { relPath: null, missing: true, category });
      logger.warn(
        `Evidence file not found, skipping (report link will show "unavailable"): ${srcPath}`
      );
      continue;
    }

    // Resolve a collision-free destination filename within the category.
    const taken = (usedNames[category] = usedNames[category] || new Set());
    let name = sanitizeName(srcPath);
    if (taken.has(name)) {
      const ext = path.extname(name);
      const stem = name.slice(0, name.length - ext.length);
      name = `${stem}-${shortHash(srcPath)}${ext}`;
    }
    taken.add(name);

    const destDirAbs = path.join(bundleDir, "assets", category);
    const destAbs = path.join(destDirAbs, name);
    const relPath = `assets/${category}/${name}`; // POSIX, relative to index.html

    try {
      io.mkdirSync(destDirAbs, { recursive: true });
      io.copyFileSync(srcPath, destAbs);
      copied++;
      try {
        bytes += io.statSync(destAbs).size;
      } catch (e) {
        /* size is best-effort */
      }
      map.set(srcPath, { relPath, missing: false, category });
      logger.debug(`Copied evidence: ${srcPath} -> ${relPath}`);
    } catch (e) {
      // A copy that fails mid-way is treated like a missing file rather than
      // aborting the whole report.
      missing++;
      map.set(srcPath, { relPath: null, missing: true, category });
      logger.warn(
        `Failed to copy evidence (${e.message}); link will show "unavailable": ${srcPath}`
      );
    }
  }

  return { map, copied, missing, bytes };
}

module.exports = { copy, shortHash, sanitizeName };
