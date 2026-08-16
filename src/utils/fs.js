const fs = require("fs");
const path = require("path");
const logger = require("./logger");

function ensureDir(dirPath) {
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
    logger.debug(`Created directory: ${resolved}`);
  }
  return resolved;
}

function readJsonFile(filePath) {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  try {
    const raw = fs.readFileSync(resolved, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to read JSON from ${resolved}: ${err.message}`);
  }
}

function writeJsonFile(filePath, data) {
  const resolved = path.resolve(filePath);
  ensureDir(path.dirname(resolved));

  try {
    fs.writeFileSync(resolved, JSON.stringify(data, null, 2), "utf-8");
    logger.debug(`Written: ${resolved}`);
  } catch (err) {
    throw new Error(`Failed to write JSON to ${resolved}: ${err.message}`);
  }
}

function writeTextFile(filePath, content) {
  const resolved = path.resolve(filePath);
  ensureDir(path.dirname(resolved));

  try {
    fs.writeFileSync(resolved, content, "utf-8");
    logger.debug(`Written: ${resolved}`);
  } catch (err) {
    throw new Error(`Failed to write file ${resolved}: ${err.message}`);
  }
}

function collectJsonFiles(dirPath, _pattern) {
  const resolved = path.resolve(dirPath);

  if (!fs.existsSync(resolved)) {
    logger.warn(`Directory not found: ${resolved}`);
    return [];
  }

  const files = [];

  const entries = fs.readdirSync(resolved, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".json")) continue;
    if (entry.name.startsWith(".")) {
      logger.debug(`Ignoring internal JSON file: ${entry.name}`);
      continue;
    }

    files.push(path.join(resolved, entry.name));
  }

  logger.debug(`Collected ${files.length} JSON file(s) from: ${resolved}`);

  return files;
}

function collectRunFiles(dirPath) {
  const resolved = path.resolve(dirPath);

  if (!fs.existsSync(resolved)) {
    logger.warn(`Directory not found: ${resolved}`);
    return [];
  }

  const runPattern = /^results-run(\d+)\.json$/;
  const files = [];

  const entries = fs.readdirSync(resolved, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = entry.name.match(runPattern);
    if (!match) continue;

    files.push({
      path: path.join(resolved, entry.name),
      runNumber: parseInt(match[1], 10),
    });
  }

  files.sort((a, b) => a.runNumber - b.runNumber);

  const sortedPaths = files.map((f) => f.path);

  logger.debug(`Collected ${sortedPaths.length} historical run file(s) from: ${resolved}`);

  return sortedPaths;
}

module.exports = {
  ensureDir,
  readJsonFile,
  writeJsonFile,
  writeTextFile,
  collectJsonFiles,
  collectRunFiles,
};
