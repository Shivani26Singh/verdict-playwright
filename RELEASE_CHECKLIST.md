# Release Checklist

A living checklist, re-run for every release — not a one-time snapshot. See [DEVELOPMENT_JOURNEY.md](./DEVELOPMENT_JOURNEY.md) for why "re-run every time" matters more than it sounds.

## 1. Code and Tests

- [ ] All intended changes merged to `main`
- [ ] `npm test` passes with 0 failures
- [ ] `npm run lint` passes with no errors
- [ ] `npm run format:check` passes
- [ ] No unrelated/leftover debug code, `console.log`, or commented-out blocks

## 2. Version

- [ ] Bump `version` in `package.json` (semver — patch/minor/major per the change)
- [ ] Add a new entry at the top of `CHANGELOG.md` for the version, following the existing format
- [ ] If any roadmap item in `ROADMAP.md` shipped, move it from "Planned"/"Future" into the new CHANGELOG entry and remove it from `ROADMAP.md`

## 3. Package Contents — Verify From a Clean Install, Not the Repo

This step exists because of a real incident (see [DEVELOPMENT_JOURNEY.md](./DEVELOPMENT_JOURNEY.md)) — a `"files"` allowlist or `.npmignore` change can silently break packaging, and running commands inside the repo checkout won't catch it.

- [ ] `npm pack --dry-run` — inspect the file list directly; confirm no `*.test.js`, no scratch/generated files, `examples/` present
- [ ] `npm pack` for real, then in a **separate empty directory**: `npm init -y && npm install ./playwright-flaky-analyzer-<version>.tgz`
- [ ] From that clean install, run the README's Quick Start verbatim: configure the reporter in a real `playwright.config.js`, run `npx playwright test`, then `analyze` with each of `--format html|json|markdown`
- [ ] Confirm the reporter subpath import works exactly as Playwright's loader uses it: `new (require('playwright-flaky-analyzer/reporter').default || require('playwright-flaky-analyzer/reporter'))(options)`
- [ ] Record package size (compressed/unpacked, file count) for the CHANGELOG or release notes if it changed meaningfully

## 4. Documentation Verification

- [ ] `README.md` — every command in it has been run against the actual CLI this release; every code snippet's imports resolve given the current `exports` map in `package.json`
- [ ] `CHANGELOG.md` — new entry added, consistent with `docs/architecture/ARCHITECTURE.md` and the actual source (rule IDs, classification codes, adjustment counts)
- [ ] `docs/architecture/ARCHITECTURE.md` and `docs/architecture/REPORTER.md` — still describe the current directory structure and the one supported reporter integration path
- [ ] No two documents describe the same topic differently (see [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) and [DEVELOPMENT_JOURNEY.md](./DEVELOPMENT_JOURNEY.md) for why this matters)
- [ ] All internal Markdown links resolve (relative paths correct after any doc moves)

## 5. GitHub

- [ ] CI is green on `main` (`.github/workflows/ci.yml`)
- [ ] `git tag vX.Y.Z` on the release commit
- [ ] Push the tag: `git push origin vX.Y.Z`
- [ ] Create a GitHub Release from the tag, using the new `CHANGELOG.md` entry as the release body
- [ ] Confirm `README.md` badges (npm version, license, Node version) still render correctly

## 6. npm Publish

- [ ] `npm whoami` — confirm logged in as the correct publishing account
- [ ] `npm publish` (runs `prepack` → `npm test` automatically per `package.json`)
- [ ] `npm view playwright-flaky-analyzer version` — confirm the published version matches
- [ ] `npm install -D playwright-flaky-analyzer@latest` in a scratch project — confirm the real, live npm package installs and works, not just the local tarball

## 7. Post-Release

- [ ] Close any GitHub issues resolved by this release, linking the release/tag
- [ ] Update `ROADMAP.md` if priorities shifted based on what shipped
- [ ] Announce (if applicable) — link the GitHub Release

---

## Related Documentation

[← README](./README.md) · [CHANGELOG](./CHANGELOG.md) · [CONTRIBUTING](./CONTRIBUTING.md) · [ROADMAP](./ROADMAP.md)
