const { version } = require("../package.json");
const { loadConfig } = require("./utils/config-loader");
const { run, compare, compute } = require("./analyzer/index");
const { PlaywrightReporter } = require("./reporter/PlaywrightReporter");
const { validateReport, defineSchema } = require("./reporter/schema");
const { generate } = require("./reporter/markdown");
const { generate: generateCopilot } = require("./reporter/copilot");
const { generate: generateHtml } = require("./reporter/html");

module.exports = {
  version,
  loadConfig,
  run,
  compare,
  compute,
  PlaywrightReporter,
  validateReport,
  defineSchema,
  generateMarkdownReport: generate,
  generateCopilotReport: generateCopilot,
  generateHtmlReport: generateHtml,
};
