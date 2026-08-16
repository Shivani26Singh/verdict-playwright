const logger = require("../utils/logger");
const { compare } = require("./engine");
const { compute } = require("./stats");

// Load + validate the report files and run the deterministic comparison.
// Returns the raw result, or null if analysis can't proceed. Shared by both
// run() (sync, offline) and runWithAi() (async, network-capable).
function computeResult(config) {
  logger.info("Flaky analysis engine initializing...");

  const { collectJsonFiles, collectRunFiles, readJsonFile } = require("../utils/fs");
  const { isValidPlaywrightReport } = require("../utils/validator");

  const resultsDir = config.input.resultsDir;
  const lookback = config.analyzer.lookbackRuns || 10;

  // collectRunFiles returns results-run<N>.json paths already ordered by run
  // number. Only fall back to a generic *.json scan when no run-numbered files
  // exist; sort that fallback for deterministic ordering.
  let files = collectRunFiles(resultsDir);

  if (files.length === 0) {
    files = collectJsonFiles(resultsDir).sort();
  }

  if (files.length === 0) {
    logger.warn(`No JSON files found in: ${resultsDir}`);
    return null;
  }

  const selectedFiles = files.slice(-lookback);

  logger.info(
    `Found ${files.length} report file(s), analyzing last ${selectedFiles.length} run(s).`
  );

  const reports = [];

  for (const file of selectedFiles) {
    try {
      const report = readJsonFile(file);
      if (isValidPlaywrightReport(report)) {
        reports.push(report);
        logger.debug(`Loaded: ${file}`);
      } else {
        logger.warn(`Skipping invalid report: ${file}`);
      }
    } catch (err) {
      logger.error(`Failed to read ${file}: ${err.message}`);
    }
  }

  if (reports.length < 2) {
    logger.warn(
      `Need at least 2 valid reports for comparison, found ${reports.length}. Single-run analysis not supported yet.`
    );
    return null;
  }

  logger.info(`Comparing ${reports.length} run(s)...`);

  try {
    return compare(reports, config);
  } catch (err) {
    logger.error(`Comparison failed: ${err.message}`);
    return null;
  }
}

function finalize(config, result) {
  logResults(result);
  if (config.output.outputFile) {
    writeOutput(config, result);
  }
  return result;
}

function run(config) {
  const result = computeResult(config);
  if (!result) return null;
  return finalize(config, result);
}

function logResults(result) {
  logger.info("============================================");
  logger.info("COMPARISON SUMMARY");
  logger.info("============================================");

  const s = result.summary;
  logger.info(`  Runs analyzed:     ${s.runsAnalyzed}`);
  logger.info(`  Total tests:       ${s.totalTests}`);
  logger.info(`  Stable pass:       ${s.stable_pass}`);
  logger.info(`  Stable failure:    ${s.stable_failure}`);
  logger.info(`  Flaky:             ${s.flaky}`);
  logger.info(`  Newly failed:      ${s.newly_failed}`);
  logger.info(`  Fixed:             ${s.fixed}`);
  logger.info(`  Regression:        ${s.regression}`);
  logger.info("============================================");

  for (const test of result.results) {
    if (test.classification !== "stable_pass") {
      const fc =
        test.failureCategory && test.failureCategory !== "unknown"
          ? ` [${test.failureCategory}]`
          : "";
      logger.info(
        `  [${test.classification.toUpperCase()}]${fc} ${test.title} — ${test.history.join(" → ")}`
      );
    }
  }

  if (result.statistics) {
    logStatistics(result.statistics);
  }
}

function logStatistics(stats) {
  logger.info("============================================");
  logger.info("STATISTICS");
  logger.info("============================================");

  if (stats.aggregate) {
    const a = stats.aggregate;
    logger.info(`  Overall pass rate:  ${a.overallPassRate}%`);
    logger.info(`  Overall fail rate:  ${a.overallFailRate}%`);
    logger.info(`  Avg duration/run:   ${a.avgDurationAcrossRuns}ms`);
    logger.info(`  Avg retries/run:    ${a.avgRetriesAcrossRuns}`);
    logger.info(`  Best run pass rate: ${a.bestRunPassRate}%`);
    logger.info(`  Worst run pass rate:${a.worstRunPassRate}%`);
  }

  if (stats.slowestTests && stats.slowestTests.length > 0) {
    logger.info(`  --- Top ${Math.min(5, stats.slowestTests.length)} Slowest Tests ---`);
    for (const test of stats.slowestTests.slice(0, 5)) {
      logger.info(
        `    ${test.title}: ${test.totalDuration}ms (max ${test.maxDuration}ms, ${test.retries} retries)`
      );
    }
  }

  if (stats.failureFrequency && stats.failureFrequency.length > 0) {
    logger.info(`  --- Most Frequent Failures ---`);
    for (const fail of stats.failureFrequency.slice(0, 5)) {
      if (fail.failureCount > 0) {
        logger.info(
          `    ${fail.title}: ${fail.failureCount}/${fail.totalRuns} runs (${fail.failureRate}%)`
        );
      }
    }
  }

  if (stats.browserStats && stats.browserStats.length > 0) {
    logger.info(`  --- Browser Statistics ---`);
    for (const b of stats.browserStats) {
      logger.info(
        `    ${b.browser}: ${b.totalTests} tests, ${b.failRate}% fail, ${b.flakyRate}% flaky, ${b.totalRetries} retries`
      );
    }
  }
}

// Derive the portable-bundle directory from the configured output path.
//   ./flaky-report/index.html  -> ./flaky-report            (already a bundle)
//   ./flaky-report.html        -> ./flaky-report            (strip .html)
//   ./out/dashboard.html       -> ./out/dashboard
//   ./flaky-report             -> ./flaky-report            (no extension = dir)
// The report is always written as <bundleDir>/index.html with a sibling assets/.
function resolveBundleDir(outputPath) {
  const path = require("path");
  const resolved = path.resolve(outputPath);
  const ext = path.extname(resolved).toLowerCase();
  const base = path.basename(resolved).toLowerCase();
  if (base === "index.html" || base === "index.htm") return path.dirname(resolved);
  if (ext === ".html" || ext === ".htm") {
    return path.join(path.dirname(resolved), path.basename(resolved, path.extname(resolved)));
  }
  return resolved; // no extension: treat the path itself as the bundle directory
}

function writeOutput(config, result) {
  const { writeJsonFile, writeTextFile } = require("../utils/fs");
  const path = require("path");

  const outputPath = config.output.outputFile;
  const format = config.output.format;

  if (format === "json") {
    const { buildDashboardJson } = require("../reporter/dashboard-json");
    const dashboard = buildDashboardJson(result);
    writeJsonFile(outputPath, dashboard);
    logger.info(`Dashboard JSON written to: ${outputPath}`);
  } else if (format === "markdown" || format === "md") {
    const { generate } = require("../reporter/markdown");
    const md = generate(result);
    const mdPath = outputPath.endsWith(".md") ? outputPath : outputPath.replace(/\.[^.]+$/, ".md");
    writeTextFile(mdPath, md);
    logger.info(`Markdown report written to: ${mdPath}`);
  } else if (format === "html") {
    const { buildDashboardJson } = require("../reporter/dashboard-json");
    const { generate } = require("../reporter/html");
    const dashboard = buildDashboardJson(result);

    // Resolve copyEvidence: html.copyEvidence overrides output.copyEvidence,
    // which overrides the built-in default (on).
    const copyEvidence =
      config.html && typeof config.html.copyEvidence === "boolean"
        ? config.html.copyEvidence
        : config.output && typeof config.output.copyEvidence === "boolean"
          ? config.output.copyEvidence
          : true;

    if (copyEvidence) {
      // Portable bundle: a folder with index.html + assets/. Evidence is copied
      // in and links rewritten to relative assets/... paths, so the whole folder
      // can be zipped and opened anywhere without the original Playwright output.
      const bundleDir = resolveBundleDir(outputPath);
      const htmlPath = path.join(bundleDir, "index.html");
      try {
        const { packageEvidence } = require("../evidence");
        const s = packageEvidence(dashboard, bundleDir, { logger });
        logger.info(
          `Evidence packaged into ${path.join(bundleDir, "assets")}: ${s.copied} file(s) copied` +
            (s.deduped ? `, ${s.deduped} duplicate reference(s) reused` : "") +
            (s.missing ? `, ${s.missing} unavailable (links disabled)` : "")
        );
      } catch (err) {
        // Packaging must never block report generation — fall back to whatever
        // paths are on the model.
        logger.warn(`Evidence packaging skipped due to error: ${err.message}`);
      }
      writeTextFile(htmlPath, generate(dashboard));
      logger.info(`Portable HTML report bundle: ${bundleDir}`);
      logger.info(`  Open ${htmlPath} — self-contained; zip the folder to share.`);
      if (config.output && config.output.alsoJson) {
        const jsonPath = path.join(bundleDir, "flaky-analysis.json");
        writeJsonFile(jsonPath, dashboard);
        logger.info(`Dashboard JSON written to: ${jsonPath}`);
      }
    } else {
      // Single self-contained .html with file:// evidence links (legacy behavior).
      const htmlPath = outputPath.endsWith(".html")
        ? outputPath
        : outputPath.replace(/\.[^.]+$/, ".html");
      writeTextFile(htmlPath, generate(dashboard));
      logger.info(`Dashboard HTML written to: ${htmlPath}`);
      if (config.output && config.output.alsoJson) {
        const jsonPath = outputPath.endsWith(".html")
          ? outputPath.replace(/\.html$/, ".json")
          : outputPath.replace(/\.[^.]+$/, ".json");
        writeJsonFile(jsonPath, dashboard);
        logger.info(`Dashboard JSON written to: ${jsonPath}`);
      }
    }
  } else {
    const { buildDashboardJson } = require("../reporter/dashboard-json");
    const dashboard = buildDashboardJson(result);
    writeJsonFile(outputPath.replace(/\.[^.]+$/, ".json"), dashboard);
    logger.info(`Unknown format "${format}", falling back to JSON: ${outputPath}`);
  }
}

module.exports = { run, computeResult, compare, compute };
