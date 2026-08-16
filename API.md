# Programmatic API Reference

Full reference for `require('playwright-flaky-analyzer')`. For the quick version, see [README.md § Programmatic API](./README.md#programmatic-api). For the custom reporter (a separate export), see [docs/architecture/REPORTER.md](./docs/architecture/REPORTER.md).

Only two subpaths are published via `package.json`'s `exports` map: `.` (this API) and `./reporter` (the Playwright reporter class). Deep `require()` paths into `src/` are not part of the public contract and are not guaranteed stable across versions.

## `run(config)`

Runs the full pipeline: load reports from disk → validate → compare across runs → classify → compute statistics → write the configured output file(s).

**`run()` expects a fully-shaped config object** — all four top-level keys (`analyzer`, `input`, `output`, `logging`) must be present, since `run()` does not merge in defaults for missing keys itself (unlike the CLI, which calls `loadConfig()` first). Always start from `loadConfig()`:

```js
const { loadConfig, run } = require('playwright-flaky-analyzer');

const config = loadConfig(); // returns the full default shape, or flaky.config.json merged with defaults
config.input.resultsDir = './test-results';
config.output.format = 'html';
config.output.outputFile = './report.html';

const result = run(config);
```

Passing a partial object directly (e.g. `run({ input: {...}, output: {...} })` without `analyzer`/`logging`) throws `TypeError: Cannot read properties of undefined` — this was verified against the current implementation, not assumed.

When `config.output.format` is `'html'`, only the `.html` file is written unless `config.output.alsoJson` is also `true` — in which case the companion dashboard-data `.json` file is written alongside it (same as the CLI's `--also-json` flag; default `false`). This has no effect for any other `output.format` value.

`run()` performs the file I/O itself (reads the reports, writes the output) and returns the underlying comparison result object, or `null` if analysis couldn't proceed (see [Error Handling](#error-handling) below). The Flaky Tests Trend shown in the report is derived entirely from `result.statistics.perRun` (already present on every result, no opt-in flag) — there is no separate trend field or history file to manage. The opt-in CI gate (`--max-flaky`) itself is CLI-only — it decides the process's exit code, not something `run()` returns — but the flaky count it gates on is always available on `result.summary.flaky` for callers who want to implement their own gate.

## `compare(reports)`

The comparison engine, without any file I/O. Takes an array of **already-parsed** report objects (2 or more) and returns the classified comparison result.

```js
const { compare } = require('playwright-flaky-analyzer');

const result = compare([report1Json, report2Json, report3Json]);
```

Throws if fewer than 2 reports are provided.

## `compute(reports)`

Statistics only (pass/fail rates, durations, retries, browser breakdowns, failure frequency) — no classification. Takes an array of 1 or more already-parsed report objects.

```js
const { compute } = require('playwright-flaky-analyzer');

const stats = compute([report1Json, report2Json]);
```

## `loadConfig(customPath?)`

Loads and merges `flaky.config.json` (or a custom path) with the built-in defaults. This is what the CLI itself calls before running an analysis.

```js
const { loadConfig } = require('playwright-flaky-analyzer');

const config = loadConfig('./my-config.json'); // or loadConfig() for the default path
```

## `PlaywrightReporter`

The reporter class, also available directly via the `playwright-flaky-analyzer/reporter` package export (the form used in `playwright.config.js`). Exposed here mainly for programmatic instantiation/testing.

```js
const { PlaywrightReporter } = require('playwright-flaky-analyzer');

const reporter = new PlaywrightReporter({ outputFile: './flaky-results/results.json' });
```

See [docs/architecture/REPORTER.md](./docs/architecture/REPORTER.md) for its full lifecycle, options, and output schema.

## `defineSchema()` / `validateReport(report)`

The JSON Schema for the reporter's output format, and a validator against it.

```js
const { defineSchema, validateReport } = require('playwright-flaky-analyzer');

const schema = defineSchema();
const errors = validateReport(someParsedReportJson); // array of validation error strings, empty if valid
```

## `generateMarkdownReport(result)`

Takes the **raw comparison result** (the return value of `run()` or `compare()`), returns a Markdown string.

```js
const { loadConfig, run, generateMarkdownReport } = require('playwright-flaky-analyzer');

const config = loadConfig(); // full default shape — run() does not merge defaults itself
config.input.resultsDir = './test-results';
config.output.format = 'json';

const result = run(config);
const markdown = generateMarkdownReport(result);
```

## `generateCopilotReport(result)`

Also takes the raw comparison result. Returns `{ analysisMd, promptsMd }` — the two file contents the CLI writes as `analysis.md` and `COPILOT_PROMPTS.md`.

```js
const { generateCopilotReport } = require('playwright-flaky-analyzer');

const { analysisMd, promptsMd } = generateCopilotReport(result);
```

## `generateHtmlReport(dashboard)`

Unlike the two generators above, this takes a **dashboard JSON object**, not the raw comparison result — the dashboard model is an internal shape built from the result plus config. There is no exported subpath for building it standalone; go through `run({ output: { format: 'html' } })` for the full pipeline, or `run({ output: { format: 'json' } })` to get the dashboard JSON as the written output file, which can then be read back and passed to `generateHtmlReport`.

```js
const fs = require('fs');
const { generateHtmlReport } = require('playwright-flaky-analyzer');

const dashboard = JSON.parse(fs.readFileSync('./flaky-analysis.json', 'utf-8'));
const html = generateHtmlReport(dashboard);
```

## Error Handling

`compare()` and `compute()` throw synchronously on invalid input (e.g., fewer than 2 reports to `compare()`, or a non-array to either). `run()` behaves differently: it catches its own internal errors (missing/invalid report files, comparison failures) and logs them via the configured logger instead of throwing — it returns `null` in those cases rather than a result object. Check for a `null` return from `run()` rather than wrapping it in `try`/`catch`.

---

## Related Documentation

[← README](./README.md) · [STEPS](./STEPS.md) · [ARCHITECTURE](./docs/architecture/ARCHITECTURE.md) · [REPORTER](./docs/architecture/REPORTER.md) · [KNOWN_LIMITATIONS](./KNOWN_LIMITATIONS.md)
