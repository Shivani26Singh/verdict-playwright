#!/usr/bin/env node

"use strict";

const { Command } = require("commander");
const path = require("path");
const fs = require("fs");
const { version } = require("../../package.json");

const program = new Command();

program
  .name("playwright-flaky-analyzer")
  .description("Analyze Playwright test reports across multiple runs to detect flaky tests")
  .version(version);

program
  .command("analyze")
  .description("Analyze Playwright JSON reports for flaky tests")
  .argument("[reports-folder]", "Directory containing Playwright JSON report files")
  .option("-c, --config <path>", "Path to flaky.config.json")
  .option("-d, --results-dir <path>", "Directory containing Playwright JSON reports")
  .option("-o, --output <path>", "Output file path")
  .option("-f, --format <format>", "Output format: html (default), json, markdown")
  .option(
    "--also-json",
    "With --format html, also write the companion .json dashboard file (off by default)"
  )
  .option(
    "--no-copy-evidence",
    "With --format html, do NOT copy evidence into the report; keep a single .html with file:// links (default: copy evidence into a portable bundle)"
  )
  .option(
    "--min-failures <n>",
    "Minimum pass/fail transitions to flag a test as flaky (default 2)",
    parseInt
  )
  .option("--lookback <n>", "Number of past runs to analyze", parseInt)
  .option("-v, --verbose", "Enable verbose/debug logging")
  .option(
    "--investigate <provider>",
    "Investigation provider to use for flaky test analysis"
  )
  .option(
    "--generate-ai-prompt",
    "Generate investigation-prompt.md for AI-assisted Root Cause Analysis"
  )
  .option("--generate-ai-json", "Generate investigation-json-prompt.md for structured AI JSON output")
  .option(
    "--ai-investigation <file>",
    "Path to ai-investigation.json to embed in HTML dashboard"
  )
  .option(
    "--max-flaky <n>",
    "CI quality gate: fail the build (non-zero exit code) if the flaky-test count exceeds this number. Opt-in — no gate unless set.",
    parseInt
  )
  .addHelpText(
    "after",
    "\nExamples:\n  $ playwright-flaky-analyzer analyze ./reports\n  $ playwright-flaky-analyzer analyze ./reports --format html -o dashboard.html\n  $ playwright-flaky-analyzer analyze ./reports --format markdown --verbose\n  $ playwright-flaky-analyzer analyze ./reports --investigate mock\n  $ playwright-flaky-analyzer analyze ./reports --generate-ai-prompt\n  $ playwright-flaky-analyzer analyze ./reports --generate-ai-json\n  $ playwright-flaky-analyzer analyze ./reports --ai-investigation ai-investigation.json\n  $ npx playwright-flaky-analyzer analyze ./test-results"
  )
  .action((reportsFolder, options) => {
    runAnalysis(reportsFolder, options);
  });

program
  .command("init")
  .description("Create a flaky.config.json in the current directory")
  .action(() => {
    const configPath = path.join(process.cwd(), "flaky.config.json");
    if (fs.existsSync(configPath)) {
      console.error(`\u2716  flaky.config.json already exists at: ${configPath}`);
      process.exit(1);
    }
    const defaultConfig = {
      analyzer: {
        minFailures: 2,
        lookbackRuns: 10,
      },
      input: {
        resultsDir: "./test-results",
        globPattern: "**/*.json",
      },
      output: {
        format: "html",
        outputFile: "./flaky-analysis.html",
        includeCharts: false,
        verbose: false,
      },
      logging: {
        level: "info",
        file: "./logs/analyzer.log",
        console: true,
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), "utf-8");
    console.log(`\u2714  Created flaky.config.json at: ${configPath}`);
    console.log("   Edit it to point resultsDir to your Playwright JSON reports folder.");
  });

program.addHelpText(
  "after",
  `
Environment:
  Node.js >= 18.0.0 required.

Documentation:
  https://github.com/shivani26singh/playwright-flaky-analyzer#readme

Report bugs:
  https://github.com/shivani26singh/playwright-flaky-analyzer/issues
`
);

function runAnalysis(reportsFolder, options) {
  const { loadConfig } = require("../utils/config-loader");
  const { initLogger } = require("../utils/logger");
  const logger = require("../utils/logger");
  const { validateConfig } = require("../utils/validator");

  const config = loadConfig(options.config);

  if (options.verbose || options.v) {
    config.logging.level = "debug";
    config.output.verbose = true;
  }

  initLogger(config);

  const resultsDir = options.resultsDir || reportsFolder || config.input.resultsDir || null;

  if (!resultsDir) {
    logger.error("No results directory specified.");
    logger.error("Usage: playwright-flaky-analyzer analyze <reports-folder>");
    logger.error("   or: playwright-flaky-analyzer analyze --results-dir <path>");
    process.exit(1);
  }

  const resolvedDir = path.resolve(resultsDir);

  if (!fs.existsSync(resolvedDir)) {
    logger.error(`Results directory not found: ${resolvedDir}`);
    logger.error("Make sure the path exists and contains Playwright JSON report files.");
    process.exit(1);
  }

  config.input.resultsDir = resolvedDir;
  if (options.output) config.output.outputFile = options.output;
  if (options.format) {
    const validFormats = ["html", "json", "markdown", "md"];
    if (!validFormats.includes(options.format)) {
      logger.error(
        `Invalid format: "${options.format}". Valid formats: ${validFormats.join(", ")}`
      );
      process.exit(1);
    }
    config.output.format = options.format;
  }
  if (options.alsoJson) config.output.alsoJson = true;
  // commander sets options.copyEvidence to false only when --no-copy-evidence
  // is passed; leave the config default (true) otherwise.
  if (options.copyEvidence === false) config.output.copyEvidence = false;
  if (options.minFailures !== undefined && options.minFailures !== null) {
    const n = options.minFailures;
    if (!Number.isInteger(n) || n < 1) {
      logger.error("--min-failures must be a positive integer");
      process.exit(1);
    }
    config.analyzer.minFailures = n;
  }
  if (options.lookback !== undefined && options.lookback !== null) {
    const n = options.lookback;
    if (!Number.isInteger(n) || n < 1) {
      logger.error("--lookback must be a positive integer");
      process.exit(1);
    }
    config.analyzer.lookbackRuns = n;
  }
  if (options.investigate) {
    config.output.investigationProvider = options.investigate;
  }
  if (options.aiInvestigation) {
    config.output.aiInvestigationFile = options.aiInvestigation;
  }
  if (options.maxFlaky !== undefined && options.maxFlaky !== null) {
    const n = options.maxFlaky;
    if (!Number.isInteger(n) || n < 0) {
      logger.error("--max-flaky must be a non-negative integer");
      process.exit(1);
    }
    config.ci.maxFlaky = n;
  }

  const configErrors = validateConfig(config);
  if (configErrors.length > 0) {
    logger.error("Configuration errors:");
    configErrors.forEach((e) => logger.error(`  - ${e}`));
    process.exit(1);
  }

  logger.info(`Playwright Flaky Test Analyzer v${version}`);
  logger.info("============================================");

  if (config.output.verbose) {
    logger.debug("Configuration:");
    logger.debug(JSON.stringify(config, null, 2));
  }

  logger.info(`Results directory: ${config.input.resultsDir}`);
  logger.info(`Output: ${config.output.outputFile} (${config.output.format})`);
  logger.info(`Min failures threshold: ${config.analyzer.minFailures}`);
  logger.info(`Lookback runs: ${config.analyzer.lookbackRuns}`);
  logger.info("============================================");

  const analyzer = require("../analyzer/index");

  let result;
  try {
    result = analyzer.run(config);
  } catch (err) {
    logger.error(`Analysis failed: ${err.message}`);
    process.exit(1);
  }

  if (result) {
    if (options.generateAiPrompt) {
      generatePromptFile(config, result);
    }
    if (options.generateAiJson) {
      generateJsonPromptFile(config, result);
    }
    logger.info("Analysis complete.");
    // Opt-in CI quality gate — evaluated only after the report has already
    // been written above, so a failing gate never blocks the report from
    // being generated/published. Returns null (exit 0, unchanged behavior)
    // when no threshold was configured.
    const gateExitCode = evaluateFlakyGate(config, result);
    exitAfterFlush(gateExitCode === null ? 0 : gateExitCode);
  } else {
    logger.warn(
      "Analysis produced no output. Check that the results directory contains valid Playwright JSON reports."
    );
    process.exit(1);
  }
}

// winston's transports (console + the log file) write asynchronously —
// process.exit() terminates the process immediately, without waiting for
// those in-flight writes to actually reach stdout/disk. On a run with a lot
// of prior output (many warnings on a large dataset), this could truncate
// exactly the lines a CI pipeline greps for: the final "Analysis complete." /
// gate summary. Ending the logger and waiting for its 'finish' event (the
// standard winston pattern for this) guarantees every transport has drained
// — including everything logged earlier in the run, since stream writes are
// flushed in the order they were queued — before the process actually exits.
// This changes nothing about WHEN we exit or with what code, only that the
// exit now waits for output that was already going to be written anyway.
function exitAfterFlush(code) {
  const rawLogger = require("../utils/logger").getLogger();
  rawLogger.on("finish", () => process.exit(code));
  rawLogger.end();
}

// Opt-in CI quality gate, evaluated purely from the already-computed,
// deterministic flaky-test count (result.summary.flaky) — never from
// Confidence, never from AI. Flaky count is the one signal a normal
// Playwright CI run doesn't already gate on (a flaky test typically passes
// on retry, so Playwright's own exit code stays green) — see
// DESIGN_DECISIONS.md. Returns null when no gate is configured, meaning
// "don't change the exit code"; otherwise 0 (PASSED) or 1 (FAILED).
function evaluateFlakyGate(config, result) {
  const logger = require("../utils/logger");
  const threshold = config.ci && config.ci.maxFlaky;
  if (threshold === null || threshold === undefined) return null;

  const flakyCount = (result.summary && result.summary.flaky) || 0;
  const passed = flakyCount <= threshold;
  logger.info(`Flaky test count: ${flakyCount}`);
  logger.info(`Allowed maximum: ${threshold}`);
  logger.info(`Result: ${passed ? "PASSED" : "FAILED"}`);
  return passed ? 0 : 1;
}

function generatePromptFile(config, result) {
  const logger = require("../utils/logger");
  const outputPath = config.output.outputFile;
  const outputDir = path.dirname(path.resolve(outputPath));
  const promptPath = path.join(outputDir, "investigation-prompt.md");

  const { formatInvestigationPromptMd } = require("../prompts");
  const promptMd = formatInvestigationPromptMd(result);
  fs.writeFileSync(promptPath, promptMd, "utf-8");
  logger.info(`AI investigation prompt written to: ${promptPath}`);
}

function generateJsonPromptFile(config, result) {
  const logger = require("../utils/logger");
  const outputPath = config.output.outputFile;
  const outputDir = path.dirname(path.resolve(outputPath));
  const promptPath = path.join(outputDir, "investigation-json-prompt.md");

  const { formatInvestigationJsonPromptMd } = require("../prompts");
  const promptMd = formatInvestigationJsonPromptMd(result);
  fs.writeFileSync(promptPath, promptMd, "utf-8");
  logger.info(`AI investigation JSON prompt written to: ${promptPath}`);
}

program.parse(process.argv);
