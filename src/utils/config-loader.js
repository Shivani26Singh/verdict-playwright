const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const DEFAULT_CONFIG = {
  analyzer: {
    minFailures: 2,
    lookbackRuns: 10,
  },
  input: {
    resultsDir: "./examples/sample-results",
    globPattern: "**/*.json",
  },
  output: {
    format: "html",
    outputFile: "./flaky-analysis.html",
    includeCharts: false,
    verbose: false,
    // HTML format used to ALSO silently write a companion .json file on
    // every run, whether or not anyone asked for it. Off by default now —
    // pass --also-json (CLI) or set this true to opt back in.
    alsoJson: false,
    // Copy all referenced Playwright evidence (screenshots/videos/traces) into
    // the HTML report's own assets/ folder and rewrite links to relative paths,
    // so the report bundle is fully portable (zip it, send it, open anywhere).
    // Disable with --no-copy-evidence or output.copyEvidence:false (also honors
    // html.copyEvidence) to keep the old single-file report with file:// links.
    copyEvidence: true,
  },
  logging: {
    level: "info",
    file: "./logs/analyzer.log",
    console: true,
  },
  // CI quality gate (opt-in): fail the build (non-zero exit code) when the
  // flaky-test count exceeds this threshold. null = no gate — exit code
  // depends only on whether the tool ran successfully, exactly like today.
  // Enable with --max-flaky <n>. Flaky count is the one signal a normal
  // Playwright CI run doesn't already gate on (a flaky test typically
  // passes on retry, so Playwright's own exit code stays green) — see
  // DESIGN_DECISIONS.md.
  ci: {
    maxFlaky: null,
  },
};

function resolveConfigPath(customPath) {
  if (customPath) {
    const resolved = path.resolve(customPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Configuration file not found: ${resolved}`);
    }
    return resolved;
  }

  const cwdConfig = path.resolve(process.cwd(), "flaky.config.json");
  if (fs.existsSync(cwdConfig)) {
    return cwdConfig;
  }

  return null;
}

function loadConfig(customPath) {
  const configPath = resolveConfigPath(customPath);

  if (!configPath) {
    logger.warn("No flaky.config.json found — using default configuration.");
    return deepMerge({}, DEFAULT_CONFIG);
  }

  logger.info(`Loading configuration from: ${configPath}`);

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const userConfig = JSON.parse(raw);
    const merged = deepMerge(DEFAULT_CONFIG, userConfig);

    logger.debug("Configuration loaded successfully.");
    return merged;
  } catch (err) {
    logger.error(`Failed to load configuration: ${err.message}`);
    logger.warn("Falling back to default configuration.");
    return deepMerge({}, DEFAULT_CONFIG);
  }
}

function deepMerge(base, override) {
  const result = { ...base };

  for (const key of Object.keys(override)) {
    if (
      override[key] &&
      typeof override[key] === "object" &&
      !Array.isArray(override[key]) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }

  return result;
}

module.exports = { loadConfig, DEFAULT_CONFIG };
