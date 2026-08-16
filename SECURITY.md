# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ |
| < 1.0   | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability in `playwright-flaky-analyzer`, please **do not open a public GitHub issue**.

Instead, report it privately by emailing **shivani26singh@gmail.com** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce, or a minimal proof of concept
- The affected version(s)

You should expect an initial response within a few days. Once a fix is available, a new patch version will be released and the report will be credited (unless you request otherwise) in the release notes.

## Scope

This project is an offline, deterministic CLI/reporter. The core analysis — including the opt-in CI quality gate (`--max-flaky`) and the always-on Flaky Tests Trend chart (built entirely from the report files already being analyzed, no separate file or network access) — makes **no network calls** and has no external service dependencies. Reports involving arbitrary code execution, path traversal in file output, or dependency vulnerabilities (`commander`, `winston`) are all in scope.

---

## Related Documentation

[← README](./README.md) · [CONTRIBUTING](./CONTRIBUTING.md) · [CODE_OF_CONDUCT](./CODE_OF_CONDUCT.md)
