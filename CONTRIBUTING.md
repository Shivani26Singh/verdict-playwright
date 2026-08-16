# Contributing

Thanks for considering a contribution to `playwright-flaky-analyzer`.

## Getting Started

```bash
git clone https://github.com/shivani26singh/playwright-flaky-analyzer.git
cd playwright-flaky-analyzer
npm install
npm test
```

See [STEPS.md](./STEPS.md) for the full local setup and command reference, and [docs/architecture/ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md) for how the project is structured.

## Development Workflow

1. Create a branch off `main`.
2. Make your change.
3. Run the test suite: `npm test`.
4. Run lint and formatting: `npm run lint` and `npm run format:check`.
5. Update `CHANGELOG.md` under an `Unreleased` (or the next version) heading if the change is user-facing.
6. Open a pull request describing what changed and why.

## Code Style

- Pure JavaScript (CommonJS), Node.js >= 18.
- No new runtime dependencies without discussion — the project intentionally keeps a minimal dependency footprint.
- Formatting is enforced by Prettier (`.prettierrc`) and linting by ESLint (`eslint.config.js`).
- Prefer small, focused pull requests over large ones.

## Tests

- Tests live alongside the source they cover (`*.test.js`), using Node's built-in test runner (`node --test`).
- New behavior should come with a new or updated test.
- All tests must pass before a pull request will be merged.

## Reporting Bugs

Open an issue at https://github.com/shivani26singh/playwright-flaky-analyzer/issues with:
- What you expected to happen
- What actually happened
- Steps to reproduce (a minimal Playwright JSON report or config snippet helps a lot)
- Node.js and package versions

## Security Issues

Please do not open a public issue for security vulnerabilities — see [SECURITY.md](./SECURITY.md) instead.

---

## Related Documentation

[← README](./README.md) · [STEPS](./STEPS.md) · [ARCHITECTURE](./docs/architecture/ARCHITECTURE.md) · [CODE_OF_CONDUCT](./CODE_OF_CONDUCT.md) · [RELEASE_CHECKLIST](./RELEASE_CHECKLIST.md)
