"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const pkg = require("../../package.json");

describe("package.json — published contents", () => {
  it("excludes test files from the files allowlist", () => {
    assert.ok(
      pkg.files.some((f) => f.includes("*.test.js") && f.startsWith("!")),
      "files array must negate *.test.js so the tarball doesn't ship tests"
    );
  });

  it("ships examples/ so README demo commands work after a fresh install", () => {
    assert.ok(
      pkg.files.some((f) => f.startsWith("examples/")),
      "files array must include examples/ for the README 'Example Report' demo command"
    );
  });

  it("reporter subpath export points at a real file", () => {
    const fs = require("fs");
    const path = require("path");
    const reporterExport = pkg.exports["./reporter"];
    const resolved = path.join(__dirname, "..", "..", reporterExport);
    assert.ok(fs.existsSync(resolved), `${reporterExport} must exist`);
  });

  // Regression: README.md and STEPS.md are the only two docs that ship
  // inside the npm package (alongside LICENSE) — every OTHER doc
  // (FEATURES.md, API.md, ARCHITECTURE.md, etc.) lives only on GitHub.
  // A relative "./Foo.md" link in either shipped file would be a dead
  // link once installed via `npm install` (see FEATURES.md/API.md/etc.
  // not existing under node_modules/playwright-flaky-analyzer/). Any
  // link to a non-shipped doc must be an absolute URL instead.
  it("README.md and STEPS.md contain no relative links to documentation files that don't ship in the package", () => {
    const fs = require("fs");
    const path = require("path");
    const shipped = new Set(["README.md", "STEPS.md", "LICENSE"]);
    const linkPattern = /\]\(\.\/([^)#]+)(#[^)]*)?\)/g;

    for (const shippedFile of ["README.md", "STEPS.md"]) {
      const text = fs.readFileSync(path.join(__dirname, "..", "..", shippedFile), "utf-8");
      const offenders = [];
      let m;
      while ((m = linkPattern.exec(text))) {
        if (!shipped.has(m[1])) offenders.push(m[1]);
      }
      assert.deepEqual(
        offenders,
        [],
        `${shippedFile} has relative link(s) to non-shipped doc(s): ${offenders.join(", ")} — use an absolute GitHub URL instead`
      );
    }
  });
});
