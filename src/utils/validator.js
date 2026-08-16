const { validateReport } = require("../reporter/schema");

function isValidPlaywrightReport(data) {
  if (!data || typeof data !== "object") {
    return false;
  }

  // --------------------------------------------------------
  // Support Playwright native JSON reporter format
  // --------------------------------------------------------
  const isNativePlaywrightReport =
    data.config && typeof data.config === "object" && Array.isArray(data.suites);

  if (isNativePlaywrightReport) {
    return true;
  }

  // --------------------------------------------------------
  // Support playwright-flaky-analyzer custom reporter format
  // --------------------------------------------------------
  const validationErrors = validateReport(data);

  if (validationErrors.length === 0) {
    return true;
  }

  return false;
}

function validateFilePaths(paths) {
  const errors = [];

  for (const p of paths) {
    if (typeof p !== "string" || p.trim().length === 0) {
      errors.push(`Invalid path: "${p}"`);
    }
  }

  return errors;
}

function validateConfig(config) {
  const errors = [];

  if (!config) {
    errors.push("Configuration is null or undefined.");
    return errors;
  }

  if (config.analyzer) {
    if (
      config.analyzer.minFailures !== undefined &&
      (!Number.isInteger(config.analyzer.minFailures) || config.analyzer.minFailures < 1)
    ) {
      errors.push("analyzer.minFailures must be a positive integer.");
    }

    if (
      config.analyzer.lookbackRuns !== undefined &&
      (!Number.isInteger(config.analyzer.lookbackRuns) || config.analyzer.lookbackRuns < 1)
    ) {
      errors.push("analyzer.lookbackRuns must be a positive integer.");
    }
  }

  if (
    config.output &&
    config.output.copyEvidence !== undefined &&
    typeof config.output.copyEvidence !== "boolean"
  ) {
    errors.push("output.copyEvidence must be a boolean.");
  }
  if (
    config.html &&
    config.html.copyEvidence !== undefined &&
    typeof config.html.copyEvidence !== "boolean"
  ) {
    errors.push("html.copyEvidence must be a boolean.");
  }

  if (
    config.ci &&
    config.ci.maxFlaky !== undefined &&
    config.ci.maxFlaky !== null &&
    (!Number.isInteger(config.ci.maxFlaky) || config.ci.maxFlaky < 0)
  ) {
    errors.push("ci.maxFlaky must be a non-negative integer, or null to disable.");
  }

  return errors;
}

module.exports = {
  isValidPlaywrightReport,
  validateFilePaths,
  validateConfig,
};
