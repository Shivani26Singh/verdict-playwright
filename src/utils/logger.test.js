const { describe, it } = require("node:test");
const assert = require("node:assert");
const {
  createLogger,
  getLogger,
  initLogger,
  info,
  warn,
  error,
  debug,
  verbose,
} = require("./logger");

describe("logger — createLogger", () => {
  it("creates a logger with default level", () => {
    const logger = createLogger({});
    assert.strictEqual(logger.level, "info");
  });

  it("creates a logger with custom level", () => {
    const logger = createLogger({ logging: { level: "debug" } });
    assert.strictEqual(logger.level, "debug");
  });

  it("disables console when configured", () => {
    const logger = createLogger({ logging: { console: false } });
    const consoleTransports = logger.transports.filter((t) => t.name === "console");
    assert.strictEqual(consoleTransports.length, 0);
  });

  it("adds file transport when log file is specified", () => {
    const logger = createLogger({
      logging: { file: "./test-output/logs/test.log", console: false },
    });
    const fileTransports = logger.transports.filter(
      (t) => t instanceof require("winston").transports.File
    );
    assert.ok(fileTransports.length > 0);
  });
});

describe("logger — getLogger / initLogger", () => {
  it("getLogger returns a logger without config", () => {
    initLogger({});
    const logger = getLogger();
    assert.ok(logger);
    assert.strictEqual(logger.level, "info");
  });

  it("initLogger overrides previous logger", () => {
    initLogger({ logging: { level: "warn" } });
    const logger = getLogger();
    assert.strictEqual(logger.level, "warn");
  });
});

describe("logger — convenience methods", () => {
  it("info, warn, error, debug, verbose do not throw", () => {
    initLogger({ logging: { console: false } });
    assert.doesNotThrow(() => info("test info"));
    assert.doesNotThrow(() => warn("test warn"));
    assert.doesNotThrow(() => error("test error"));
    assert.doesNotThrow(() => debug("test debug"));
    assert.doesNotThrow(() => verbose("test verbose"));
  });
});
