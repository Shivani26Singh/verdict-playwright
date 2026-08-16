const winston = require("winston");
const path = require("path");
const fs = require("fs");

let logger = null;

function resolveLogsDir(logFilePath) {
  const dir = path.dirname(path.resolve(logFilePath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function createLogger(config) {
  const logConfig = config && config.logging ? config.logging : {};

  const level = logConfig.level || "info";
  const logFile = logConfig.file || "./logs/analyzer.log";

  resolveLogsDir(logFile);

  const transports = [];

  if (logConfig.console !== false) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: "HH:mm:ss" }),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} ${level}: ${message}`;
          })
        ),
      })
    );
  }

  if (logFile) {
    transports.push(
      new winston.transports.File({
        filename: logFile,
        format: winston.format.combine(
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          winston.format.json()
        ),
      })
    );
  }

  logger = winston.createLogger({
    level,
    transports,
    exitOnError: false,
  });

  return logger;
}

function getLogger() {
  if (!logger) {
    logger = createLogger();
  }
  return logger;
}

function initLogger(config) {
  logger = createLogger(config);
  return logger;
}

module.exports = {
  info: (...args) => getLogger().info(...args),
  warn: (...args) => getLogger().warn(...args),
  error: (...args) => getLogger().error(...args),
  debug: (...args) => getLogger().debug(...args),
  verbose: (...args) => getLogger().verbose(...args),
  createLogger,
  getLogger,
  initLogger,
};
