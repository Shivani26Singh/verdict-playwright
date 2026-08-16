# REPORTER.md — Custom Playwright Reporter

## Overview

The `PlaywrightReporter` is a reusable custom reporter for Playwright that produces a standardized, framework-independent `results.json` file. It hooks into Playwright's test lifecycle to capture every test, retry, error, and attachment — normalizing them into a clean schema designed for flaky-test analysis.

## Quick Start

This is the only supported integration path — see the [README Custom Reporter section](../../README.md#custom-reporter) for the canonical example. Reference the reporter by its package subpath export, not by a file path into `src/`:

```javascript
// playwright.config.js
module.exports = {
  reporter: [
    ['list'],
    ['playwright-flaky-analyzer/reporter', {
      outputFile: './flaky-results/results.json',
      includeConfig: true
    }],
  ],
};
```

The `playwright-flaky-analyzer/reporter` export resolves to the reporter class via `package.json`'s `exports` map — no absolute or relative path into `node_modules` needed, and it works on any machine after `npm install`.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputFile` | `string` | `"./test-results/results.json"` | Determines the output **directory**. Each run is written into that directory as `results-run<N>.json` (auto-incremented) plus `latest.json`; the file name in this path is not used verbatim. The default sits inside Playwright's own default `outputDir` (`test-results`), which Playwright cleans before each run — override `outputFile` (as shown above) to point somewhere Playwright doesn't clean |
| `includeConfig` | `boolean` | `true` | Include Playwright config in the report |
| `includeErrors` | `boolean` | `true` | Include error messages and stacks |
| `includeAttachments` | `boolean` | `true` | Include attachment metadata |
| `maxErrorLength` | `number` | `5000` | Truncate error messages longer than this |

## Lifecycle Hooks

The reporter implements the Playwright Reporter API:

| Hook | When Called | What It Does |
|------|-------------|-------------|
| `onBegin(config)` | Before the test run starts | Stores config snapshot, resets internal state |
| `onTestBegin(testCase)` | Before each test case (including retries) | Creates a test record with id, title, location, tags — guarded by an id-existence check, since Playwright calls this once per *attempt*, not once per logical test; without the guard, a retried test got a second, permanently-empty record that `onTestEnd` never populated |
| `onTestEnd(testCase, result)` | After each test case (including retries) | Appends the result to the test's result array |
| `onEnd()` | After all tests finish | Recomputes the summary once per logical test, then writes the run's report as `results-run<N>.json` and `latest.json`, and prints confirmation |
| `printsToStdio()` | When Playwright connects the reporter | Returns `false` — no stdout interference |

## Output Schema

The reporter produces a JSON file with this top-level structure:

```json
{
  "schemaVersion": "1.0.0",
  "reporter": {
    "name": "playwright-flaky-analyzer",
    "version": "1.0.0"
  },
  "metadata": {
    "generatedAt": "2025-08-15T10:01:00.000Z",
    "framework": "playwright",
    "configFile": "playwright.config.js",
    "rootDir": "/project/tests"
  },
  "config": { ... },
  "timing": {
    "startTime": "2025-08-15T10:00:00.000Z",
    "endTime": "2025-08-15T10:01:00.000Z",
    "durationMs": 60000
  },
  "summary": {
    "total": 5,
    "passed": 3,
    "failed": 1,
    "skipped": 0,
    "flaky": 1,
    "interrupted": 0
  },
  "tests": [...]
}
```

### Test Record

```json
{
  "id": "Login Suite > should login",
  "title": "should login",
  "titlePath": ["Login Suite", "should login"],
  "location": {
    "file": "tests/login.spec.js",
    "line": 10,
    "column": 4
  },
  "tags": ["@smoke", "@critical"],
  "parentTitle": "Login Suite",
  "status": "flaky",
  "results": [
    {
      "retry": 0,
      "workerIndex": 0,
      "parallelIndex": 0,
      "status": "failed",
      "duration": 3200,
      "startTime": "2025-08-15T10:00:05.000Z",
      "errors": [
        {
          "message": "Error: expect(received).toBe(expected)",
          "stack": "at LoginPage.login (login.spec.js:24:30)",
          "snippet": null,
          "location": null
        }
      ],
      "attachments": [
        {
          "name": "screenshot",
          "contentType": "image/png",
          "path": "/tmp/screenshot.png",
          "hasBody": true
        }
      ],
      "stdout": null,
      "stderr": null
    },
    {
      "retry": 1,
      "workerIndex": 0,
      "parallelIndex": 0,
      "status": "passed",
      "duration": 1800,
      "startTime": "2025-08-15T10:00:10.000Z",
      "errors": [],
      "attachments": [],
      "stdout": null,
      "stderr": null
    }
  ]
}
```

## Flaky Detection Logic

The reporter identifies flaky tests when it builds the report (in `onEnd`), computed once per logical test so retries never inflate the counts:

- If a test **failed on any retry attempt** and also **passed on any retry attempt**, it's counted as **flaky**.
- If it **failed on all retries**, it's counted as **failed**.
- If it **passed on all retries**, it's counted as **passed**.

The summary object reflects these counts so downstream consumers don't need to recompute them.

## Framework Independence

Although the reporter is written for Playwright's hook API, the output schema is deliberately framework-independent:

- No Playwright-specific field names leak into the output.
- The `metadata.framework` field identifies the source.
- The schema can be produced by any test runner (Jest, Vitest, Cypress) — simply emit an object matching the schema.

See `src/reporter/schema.js` for the full JSON Schema definition and `validateReport()` to validate any report against it.

## Error Handling

- Missing test IDs → auto-generated from `titlePath`
- Missing attachment fields → defaults applied
- Long error messages → truncated per `maxErrorLength`
- Corrupt/non-standard error objects → normalized to `{ message, stack }`
- Missing output directory → created automatically

## Integration

For CI/CD, point `outputFile` at your artifacts directory directly in `playwright.config.js`:

```javascript
// playwright.config.js
module.exports = {
  reporter: [
    ['list'],
    ['playwright-flaky-analyzer/reporter', {
      outputFile: './ci-artifacts/results.json',
    }],
  ],
};
```

There is no environment-variable override for the output path — configure it through the reporter options shown above.

---

## Related Documentation

[← README](../../README.md) · [STEPS](../../STEPS.md) · [API](../../API.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [KNOWN_LIMITATIONS](../../KNOWN_LIMITATIONS.md)
