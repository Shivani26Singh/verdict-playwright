# STEPS.md — Execution Guide (deterministic CLI)

> **Scope.** This guide covers the **deterministic command-line analysis** only —
> running the engine over Playwright JSON and producing HTML/JSON/Markdown
> reports. It does **not** cover the VERDICT web application, its AI
> investigation, or the Verdict Guard.
>
> For VERDICT — the dashboard, the 20-rule Detection Rules page, evidence-driven
> investigation, AI verdicts and grounding checks — start at
> **[README.md](./README.md)**.
>
> The same deterministic analysis is also available as a standalone offline tool
> at [playwright-flaky-analyzer.vercel.app](https://playwright-flaky-analyzer.vercel.app),
> for when no AI provider is available or wanted.

---

## Part 0 — Running VERDICT (the web application)

This is the part most people want. Requires **Node.js >= 18**.

```bash
git clone https://github.com/Shivani26Singh/verdict-playwright.git
cd verdict-playwright
npm install

# 1. Generate the analysis data from the bundled Playwright runs.
#    Both scripts run the deterministic engine — no AI, no network.
node scripts/build-suite-data.js    # suite health, 20-rule catalogue, 78 failure packs
node scripts/build-scenarios.js     # evidence packs for the three curated investigations

# 2. Start the app.
cd web
npm install
npm run dev                          # http://localhost:3000
```

Open `http://localhost:3000` and you get the full deterministic product —
Overview, Flaky Analysis, Detection Rules, evidence, and the rules that fired —
**with no API key at all**. The three curated investigations also render their
committed verdicts, labelled *"Cached — live call unavailable"*.

### Enabling live AI investigation locally

To run a live investigation on any of the analysed failures, supply your own
provider key:

```bash
cd web
cp .env.example .env.local
# then edit .env.local and set:
#   GROQ_API_KEY=<your own key>
```

`.env.local` is gitignored and the key is read **server-side only**, inside the
`/api/investigate` route. It is never sent to the browser.

Optional — regenerate the committed verdicts from a real model run:

```bash
node scripts/refresh-ai-cache.mjs    # from the repository root
```

That script refuses to run without a key rather than writing a fake verdict.

### Using your own Playwright runs

The bundled `demo-project/ci-runs/` is just a populated sample. Point the
scripts at your own Playwright JSON result files to analyse a real suite — see
the CLI sections below for the input format and options.

---

## Part 1 — The deterministic CLI

How to run the deterministic analysis on any machine (fresh clone or daily use).

## Prerequisites

- **Node.js** ≥ 18.0.0 ([download](https://nodejs.org/))
- **npm** (bundled with Node.js)

## Installation

### First Time (after `git clone`)

```bash
git clone https://github.com/shivani26singh/playwright-flaky-analyzer.git
cd playwright-flaky-analyzer
npm install
```

### Daily Use (already configured)

```bash
npm install   # only if dependencies changed
```

## Environment Setup

No environment variables or `.env` file are read by this project. All configuration comes from `flaky.config.json` (see [Configuration Reference](#configuration-reference) below) or CLI flags, which take precedence over the config file.

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `commander` | CLI argument parsing and help display |
| `winston` | Structured logging (console + file) |
| `eslint` | Code linting (dev) |
| `prettier` | Code formatting (dev) |
| `eslint-config-prettier` | ESLint-Prettier compatibility (dev) |

## Commands

| Command | What it does |
|---------|-------------|
| `npm start` | Run the flaky analyzer CLI |
| `node src/cli/run-analysis.js` | Run the CLI directly |
| `npm run lint` | Lint source files |
| `npm run format` | Format all source files |
| `npm run format:check` | Check formatting without changes |
| `npm run build` | Verify the project (no compile step) |
| `npm test` | Run the test suite |

## Running Locally

### Basic run (uses flaky.config.json defaults)

```bash
npm start
```

### With CLI options

```bash
node src/cli/run-analysis.js analyze --results-dir ./examples/sample-results --format markdown --output ./flaky-analysis.md --verbose
```

### Using a custom config file

```bash
node src/cli/run-analysis.js analyze --config ./my-config.json
```

### Viewing help

```bash
npm start -- --help
```

## Running Demonstrations

```bash
node src/cli/run-analysis.js analyze --results-dir ./examples/sample-results --verbose
```

## Running Tests

```bash
npm test
```

## CLI Reference

```
Usage: playwright-flaky-analyzer [command]

Commands:
  analyze [options] [reports-folder]  Analyze Playwright JSON reports
  init                                Create a flaky.config.json
```

### `analyze`

```
Usage: playwright-flaky-analyzer analyze [options] [reports-folder]

Arguments:
  reports-folder                    Directory containing Playwright JSON report files

Options:
  -c, --config <path>               Path to flaky.config.json
  -d, --results-dir <path>          Directory containing Playwright JSON reports
  -o, --output <path>               Output file path
  -f, --format <format>             Output format: html (default), json, markdown (md is also accepted as a shorthand for markdown)
      --also-json                  Also write the companion .json dashboard data file when --format html is used (default: off)
      --no-copy-evidence            With --format html, keep a single .html with file:// links instead of copying evidence into a portable bundle (default: copy evidence)
      --min-failures <n>            Minimum pass/fail transitions to flag a test as flaky (default 2)
      --lookback <n>                Number of past runs to analyze
  -v, --verbose                     Enable verbose/debug logging
      --max-flaky <n>               CI quality gate: fail the build (non-zero exit code) if the flaky-test count exceeds this number. Opt-in — no gate unless set.
```

Examples:

```bash
# Analyze reports in a directory (positional argument)
playwright-flaky-analyzer analyze ./test-results

# Same, via --results-dir instead of the positional argument
playwright-flaky-analyzer analyze --results-dir ./test-results

# Generate HTML Dashboard with a custom output path
playwright-flaky-analyzer analyze ./test-results --format html -o dashboard.html

# Generate HTML Dashboard AND the companion dashboard.json alongside it
playwright-flaky-analyzer analyze ./test-results --format html --also-json

# Generate Markdown with verbose logging
playwright-flaky-analyzer analyze ./test-results --format markdown --verbose

# Generate JSON output
playwright-flaky-analyzer analyze ./test-results --format json -o analysis.json

# Analyze only the last 5 runs
playwright-flaky-analyzer analyze ./test-results --lookback 5

# Flaky Tests Trend and Retries Per Run Trend (both bar+line charts, same runs, same axis) are always shown — no flag needed:

# CI quality gate — exit code 1 if the flaky-test count exceeds 5 (report is still written first)
playwright-flaky-analyzer analyze ./test-results --max-flaky 5
```

Format notes:
- **json** — the same cross-run dashboard data, as machine-readable JSON, for CI/CD integrations or API consumers.
- **markdown** — a human-readable report (executive summary, flaky tests, consistently failing tests, regressions, statistics, recommendations) for PR comments, Slack, or any text-based workflow.
- **html** — a self-contained, offline dashboard with interactive search/filter — see [docs/architecture/ARCHITECTURE.md § HTML Generator](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/architecture/ARCHITECTURE.md#html-generator-srcreporterhtmljs) for the full section breakdown. By default it produces a **portable bundle** — a folder derived from `-o` (e.g. `-o flaky-report.html` → `flaky-report/index.html`) containing `assets/{screenshots,videos,traces,attachments}/` with copies of every referenced Playwright artifact, and all links rewritten to relative `assets/...` paths. Zip the folder and open `index.html` anywhere; evidence keeps working without the original Playwright output (ideal for CI where reports are published as separate artifacts). Pass `--no-copy-evidence` (or `output.copyEvidence: false`) to instead write a single `.html` with `file://` links. Pass `--also-json` to also write the companion `.json` dashboard data (see [DESIGN_DECISIONS.md § JSON Output Made Opt-In for HTML Format](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/DESIGN_DECISIONS.md#json-output-made-opt-in-for-html-format)).

### `init`

```bash
playwright-flaky-analyzer init
```

Creates a `flaky.config.json` in the current directory with the defaults shown in [Configuration Reference](#configuration-reference) below. Exits with an error if one already exists at that path.

## Configuration Reference

Create `flaky.config.json` in your project root (or generate it via `playwright-flaky-analyzer init`):

```json
{
  "analyzer": {
    "minFailures": 2,
    "lookbackRuns": 10
  },
  "input": {
    "resultsDir": "./test-results",
    "globPattern": "**/*.json"
  },
  "output": {
    "format": "html",
    "outputFile": "./flaky-analysis.html",
    "includeCharts": false,
    "verbose": false
  },
  "logging": {
    "level": "info",
    "file": "./logs/analyzer.log",
    "console": true
  },
  "ci": {
    "maxFlaky": null
  }
}
```

The block above shows every key, including the optional `ci` section. `playwright-flaky-analyzer init` actually scaffolds a minimal file that **omits** `ci` (and sets `input.resultsDir` to `./test-results`, the conventional Playwright output directory — see the `resultsDir` row below for why that differs from the built-in default) — this is fine either way, since `ci.maxFlaky` defaults to `null` (gate disabled) whether or not the key is present in your file. Add a `"ci": { "maxFlaky": <n> }` block yourself (or just pass `--max-flaky <n>` on the CLI) to opt into the gate.

| Setting | Default | Description |
|---------|---------|-------------|
| `analyzer.minFailures` | 2 | Minimum pass/fail transitions to flag a test as flaky |
| `analyzer.lookbackRuns` | 10 | Maximum past runs to analyze |
| `input.resultsDir` | `./examples/sample-results` | Directory containing Playwright JSON reports. This is the built-in fallback used only when **no** `flaky.config.json` exists at all — it points at the bundled sample data so the CLI produces a working report with zero setup. A `flaky.config.json` scaffolded via `init` sets this to `./test-results` instead, since a real project needs its own results directory, not the samples. |
| `input.globPattern` | `**/*.json` | Reserved. Currently has no effect — the scanner prefers `results-run<N>.json` files and otherwise collects every non-dotfile `*.json` in `resultsDir`, without applying this pattern |
| `output.format` | html | Output format: `html`, `json`, `markdown` |
| `output.outputFile` | `./flaky-analysis.html` | Output file path |
| `output.includeCharts` | false | Reserved for future chart rendering (currently has no effect on output) |
| `output.verbose` | false | Verbose CLI logging |
| `output.alsoJson` | false | When `output.format` is `html`, also write the companion `.json` dashboard data file (same as CLI `--also-json`) |
| `output.copyEvidence` | true | When `output.format` is `html`, copy evidence into a portable `assets/` bundle and rewrite links to relative paths. Set `false` (or CLI `--no-copy-evidence`) for a single `.html` with `file://` links. Also honored as `html.copyEvidence`. |
| `logging.level` | info | Log level: `debug`, `info`, `warn`, `error` |
| `logging.file` | `./logs/analyzer.log` | Log file path |
| `logging.console` | true | Whether to also log to the console |
| `ci.maxFlaky` | null | Opt-in CI quality gate: fail the build (non-zero exit code) when the flaky-test count exceeds this number (same as CLI `--max-flaky`). `null` disables the gate — exit code depends only on whether the tool ran successfully, exactly like before this option existed. |

CLI flags always take precedence over `flaky.config.json` values when both are provided (e.g., `--format` overrides `output.format`).

## Using This From a Different Project

Everything above covers running the analyzer *inside this repo*. This section covers using it from a **separate Playwright project** — either from a local clone (for example, to test unreleased changes) or from the published npm package.

There are two ways to do this, depending on whether you're working from a local clone or installing the published package.

### Scenario A — From a Local Clone (e.g. Unreleased Changes)

To use the analyzer from a local clone — for example, to try changes that aren't on npm yet — make it resolvable from source in **one** of these three ways:

**Option 1 — `npm link` (best while you're actively changing the analyzer's source)**

```bash
# In this repo:
cd playwright-flaky-analyzer
npm install
npm link

# In your other Playwright project:
cd /path/to/your-other-project
npm link playwright-flaky-analyzer
```

This creates a symlink — any source change here (`src/**`) is picked up immediately in the other project without reinstalling.

**Option 2 — `file:` dependency (simplest, survives a normal `npm install`)**

In your other project's `package.json`:

```json
"devDependencies": {
  "playwright-flaky-analyzer": "file:../playwright-flaky-analyzer"
}
```

(use whatever relative — or absolute — path actually points at your clone), then:

```bash
npm install
```

Unlike `npm link`, this copies the package in; re-run `npm install` there after pulling analyzer changes.

**Option 3 — `npm pack` + install the tarball (closest to what a real published install looks like)**

```bash
# In this repo:
cd playwright-flaky-analyzer
npm pack
# produces playwright-flaky-analyzer-<version>.tgz (e.g. playwright-flaky-analyzer-1.0.3.tgz) in the current directory

# In your other project:
npm install /full/path/to/playwright-flaky-analyzer-<version>.tgz
```

This is exactly what [RELEASE_CHECKLIST.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/RELEASE_CHECKLIST.md) §3 uses to verify a release before publishing — good for a final sanity check, not for iterating quickly.

### Scenario B — From npm (published package)

```bash
npm install -D playwright-flaky-analyzer
# or, without installing anything:
npx playwright-flaky-analyzer analyze ./test-results
```

### Then — Regardless of Which Option Above — Set Up and Run

These steps are identical no matter how the package got resolved:

**1. Add the reporter** to your other project's `playwright.config.js`:

```js
module.exports = {
  reporter: [
    ['list'],
    ['playwright-flaky-analyzer/reporter', {
      outputFile: './flaky-results/results.json'
    }],
  ],
};
```

> Keep analyzer result files outside Playwright's `outputDir` (default: `test-results`) because Playwright may clean that directory before each test run.

**2. Run your suite at least twice** (the analyzer needs 2+ runs to compare — see [KNOWN_LIMITATIONS.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/KNOWN_LIMITATIONS.md)):

```bash
npx playwright test
npx playwright test
```

Each run auto-increments and writes a new file — `results-run1.json`, `results-run2.json`, ... — plus a `latest.json` snapshot of the most recent run, into `flaky-results/` (or wherever `outputFile`'s directory points). You don't rename or number anything by hand; the reporter scans the output directory and picks the next number itself.

**3. Analyze the results:**

```bash
npx playwright-flaky-analyzer analyze ./flaky-results --format html
```

(If you used `npm link`/`file:`/tarball install rather than a real npm install, the `npx` bin resolves the same way — via the `bin` entry in this package's `package.json` — so no different invocation is needed.)

Open the generated `flaky-analysis.html` in a browser. From here, everything in [CLI Reference](#cli-reference) and [Configuration Reference](#configuration-reference) above applies unchanged.

## Typical Project Layout

For a project *consuming* the package (as opposed to this repository itself), a typical layout looks like:

```
my-project/
├── playwright.config.js       # configures the reporter (see README § Custom Reporter)
├── flaky.config.json          # optional — analyzer defaults apply if absent
├── package.json
├── tests/
├── flaky-results/              # written by the custom reporter, one file per run — kept outside Playwright's own outputDir (default: test-results) so it isn't cleaned between runs
│   ├── results-run1.json
│   ├── results-run2.json
│   ├── results-run3.json
│   └── ...
├── flaky-analysis.html        # written by `analyze --format html`
├── flaky-analysis.json        # only present if you passed --also-json
└── node_modules/
```

`flaky-analysis.md` only appears if you separately run `analyze --format markdown`; `--format html` writes only the `.html` file by default — pass `--also-json` if you also want `flaky-analysis.json` written alongside it.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `commander` not found | Run `npm install` |
| No JSON files found / "Results directory not found" | Verify `resultsDir` path in `flaky.config.json`, or pass `--results-dir`/a positional argument; confirm the directory contains `.json` files |
| "Need at least 2 valid reports" | Make sure you have 2+ valid Playwright JSON report files — single-run analysis isn't supported (see [KNOWN_LIMITATIONS.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/KNOWN_LIMITATIONS.md)) |
| "No failing tests detected" | Your test suite is stable — no flaky tests found, nothing to fix |
| Browser Stats show 0 flaky | Browser stats use per-run data; check the Flaky Tests section for cross-run flaky counts instead |
| Permission denied (Linux/macOS) | `chmod +x src/cli/run-analysis.js` |
| ESLint errors | Run `npm run lint` to auto-fix |
| Node version too old | Upgrade to Node.js ≥ 18.0.0 |

## Related Documentation

- [README.md](./README.md) — project overview, installation, and Quick Start
- [API.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/API.md) — full programmatic API reference
- [docs/architecture/REPORTER.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/architecture/REPORTER.md) — custom reporter internals and output schema
- [CONTRIBUTING.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/CONTRIBUTING.md) — contributing workflow and code style
- [docs/architecture/ARCHITECTURE.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/docs/architecture/ARCHITECTURE.md) — technical architecture
- [KNOWN_LIMITATIONS.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/KNOWN_LIMITATIONS.md) — current limitations
- [RELEASE_CHECKLIST.md](https://github.com/shivani26singh/playwright-flaky-analyzer/blob/main/RELEASE_CHECKLIST.md) — steps required before publishing a release
