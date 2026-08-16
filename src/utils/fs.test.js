const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const {
  ensureDir,
  readJsonFile,
  writeJsonFile,
  writeTextFile,
  collectJsonFiles,
  collectRunFiles,
} = require("./fs");

const TEST_DIR = path.join(__dirname, "..", "..", "test-output", "fs-test");

describe("fs — ensureDir", () => {
  before(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("creates a directory that does not exist", () => {
    const dir = path.join(TEST_DIR, "new-dir");
    const result = ensureDir(dir);
    assert.ok(fs.existsSync(result));
    assert.strictEqual(result, path.resolve(dir));
  });

  it("returns existing directory without error", () => {
    const dir = path.join(TEST_DIR, "existing");
    fs.mkdirSync(dir, { recursive: true });
    const result = ensureDir(dir);
    assert.ok(fs.existsSync(result));
  });

  after(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });
});

describe("fs — readJsonFile", () => {
  before(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  it("reads and parses a valid JSON file", () => {
    const file = path.join(TEST_DIR, "test.json");
    fs.writeFileSync(file, JSON.stringify({ key: "value" }));
    const data = readJsonFile(file);
    assert.deepStrictEqual(data, { key: "value" });
  });

  it("throws on missing file", () => {
    assert.throws(() => readJsonFile(path.join(TEST_DIR, "nonexistent.json")), /File not found/);
  });

  it("throws on invalid JSON", () => {
    const file = path.join(TEST_DIR, "invalid.json");
    fs.writeFileSync(file, "not json");
    assert.throws(() => readJsonFile(file), /Failed to read JSON/);
  });

  after(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });
});

describe("fs — writeJsonFile", () => {
  before(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("writes JSON and creates directory", () => {
    const file = path.join(TEST_DIR, "subdir", "output.json");
    writeJsonFile(file, { hello: "world" });
    const raw = fs.readFileSync(file, "utf-8");
    assert.deepStrictEqual(JSON.parse(raw), { hello: "world" });
  });

  after(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });
});

describe("fs — writeTextFile", () => {
  before(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("writes text content and creates directory", () => {
    const file = path.join(TEST_DIR, "notes", "readme.md");
    writeTextFile(file, "# Hello");
    assert.strictEqual(fs.readFileSync(file, "utf-8"), "# Hello");
  });

  after(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });
});

describe("fs — collectJsonFiles", () => {
  before(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  it("returns empty array for nonexistent directory", () => {
    const result = collectJsonFiles(path.join(TEST_DIR, "nope"));
    assert.deepStrictEqual(result, []);
  });

  it("collects only .json files", () => {
    fs.writeFileSync(path.join(TEST_DIR, "a.json"), "{}");
    fs.writeFileSync(path.join(TEST_DIR, "b.txt"), "text");
    fs.writeFileSync(path.join(TEST_DIR, "c.json"), "{}");
    const files = collectJsonFiles(TEST_DIR);
    assert.strictEqual(files.length, 2);
  });

  it("ignores dot-prefixed json files", () => {
    fs.writeFileSync(path.join(TEST_DIR, ".hidden.json"), "{}");
    const files = collectJsonFiles(TEST_DIR);
    const hidden = files.filter((f) => f.includes(".hidden"));
    assert.strictEqual(hidden.length, 0);
  });

  after(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });
});

describe("fs — collectRunFiles", () => {
  before(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  it("returns empty array for nonexistent directory", () => {
    const result = collectRunFiles(path.join(TEST_DIR, "nope"));
    assert.deepStrictEqual(result, []);
  });

  it("collects and sorts results-runN.json files", () => {
    fs.writeFileSync(path.join(TEST_DIR, "results-run3.json"), "{}");
    fs.writeFileSync(path.join(TEST_DIR, "results-run1.json"), "{}");
    fs.writeFileSync(path.join(TEST_DIR, "results-run2.json"), "{}");
    fs.writeFileSync(path.join(TEST_DIR, "other.json"), "{}");
    const files = collectRunFiles(TEST_DIR);
    assert.strictEqual(files.length, 3);
    assert.ok(files[0].endsWith("results-run1.json"));
    assert.ok(files[1].endsWith("results-run2.json"));
    assert.ok(files[2].endsWith("results-run3.json"));
  });

  after(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });
});
