const SCHEMA_VERSION = "1.0.0";

function defineSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://github.com/shivani26singh/playwright-flaky-analyzer/schemas/results-v1.json",
    title: "Playwright Flaky Analyzer Results",
    description:
      "Standardized test results produced by the playwright-flaky-analyzer custom reporter. Framework-independent by design — any test runner can emit this format.",
    type: "object",
    required: ["schemaVersion", "reporter", "metadata", "timing", "summary", "tests"],
    properties: {
      schemaVersion: {
        type: "string",
        description: "Semantic version of this schema.",
      },
      reporter: {
        type: "object",
        required: ["name", "version"],
        properties: {
          name: { type: "string" },
          version: { type: "string" },
        },
      },
      metadata: {
        type: "object",
        properties: {
          generatedAt: { type: "string", format: "date-time" },
          framework: { type: "string" },
          configFile: { type: ["string", "null"] },
          rootDir: { type: ["string", "null"] },
        },
      },
      config: {
        description:
          "Framework configuration snapshot (Playwright config). Omitted when includeConfig is false.",
      },
      timing: {
        type: "object",
        required: ["startTime", "endTime", "durationMs"],
        properties: {
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          durationMs: { type: "number" },
        },
      },
      summary: {
        type: "object",
        required: ["total", "passed", "failed", "skipped", "flaky", "interrupted"],
        properties: {
          total: { type: "number" },
          passed: { type: "number" },
          failed: { type: "number" },
          skipped: { type: "number" },
          flaky: { type: "number" },
          interrupted: { type: "number" },
        },
      },
      tests: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "title", "titlePath", "location", "tags", "results"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            titlePath: {
              type: "array",
              items: { type: "string" },
            },
            location: {
              type: "object",
              properties: {
                file: { type: ["string", "null"] },
                line: { type: ["number", "null"] },
                column: { type: ["number", "null"] },
              },
            },
            tags: {
              type: "array",
              items: { type: "string" },
            },
            parentTitle: { type: ["string", "null"] },
            status: {
              type: "string",
              enum: ["passed", "failed", "skipped", "timedOut", "interrupted"],
            },
            results: {
              type: "array",
              items: {
                type: "object",
                required: ["retry", "status", "duration"],
                properties: {
                  retry: { type: "number" },
                  workerIndex: { type: ["number", "null"] },
                  parallelIndex: { type: ["number", "null"] },
                  status: { type: "string" },
                  duration: { type: "number" },
                  startTime: { type: ["string", "null"], format: "date-time" },
                  errors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        message: { type: "string" },
                        stack: { type: ["string", "null"] },
                        snippet: { type: ["string", "null"] },
                        location: {},
                      },
                    },
                  },
                  attachments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        contentType: { type: "string" },
                        path: { type: ["string", "null"] },
                        hasBody: { type: "boolean" },
                      },
                    },
                  },
                  stdout: { type: ["string", "null"] },
                  stderr: { type: ["string", "null"] },
                },
              },
            },
          },
        },
      },
    },
  };
}

function validateReport(report) {
  const errors = [];

  if (!report || typeof report !== "object") {
    return ["Report must be a non-null object."];
  }

  if (!report.schemaVersion) {
    errors.push("Missing required field: schemaVersion");
  }

  if (!report.reporter || !report.reporter.name) {
    errors.push("Missing required field: reporter.name");
  }

  if (!report.metadata || typeof report.metadata !== "object") {
    errors.push("Missing required field: metadata");
  }

  if (!report.timing || typeof report.timing !== "object") {
    errors.push("Missing required field: timing");
  }

  if (!report.summary || typeof report.summary !== "object") {
    errors.push("Missing required field: summary");
  } else {
    const requiredSum = ["total", "passed", "failed", "skipped", "flaky", "interrupted"];
    for (const key of requiredSum) {
      if (typeof report.summary[key] !== "number") {
        errors.push(`Missing or invalid summary field: ${key}`);
      }
    }
  }

  if (!Array.isArray(report.tests)) {
    errors.push("tests must be an array.");
  } else {
    for (let i = 0; i < report.tests.length; i++) {
      const t = report.tests[i];
      if (!t.id) errors.push(`tests[${i}]: missing id`);
      if (!t.title) errors.push(`tests[${i}]: missing title`);
      if (!Array.isArray(t.results)) errors.push(`tests[${i}]: results must be an array`);

      if (Array.isArray(t.results)) {
        for (let j = 0; j < t.results.length; j++) {
          const r = t.results[j];
          if (typeof r.retry !== "number")
            errors.push(`tests[${i}].results[${j}]: retry must be a number`);
          if (!r.status) errors.push(`tests[${i}].results[${j}]: missing status`);
          if (typeof r.duration !== "number")
            errors.push(`tests[${i}].results[${j}]: duration must be a number`);
        }
      }
    }
  }

  return errors;
}

module.exports = { SCHEMA_VERSION, defineSchema, validateReport };
