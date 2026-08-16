// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * Meridian end-to-end configuration.
 *
 * The suite runs against the Meridian staging environment across three browsers.
 * Failures capture a screenshot, video, and Playwright trace so the flaky-analyzer
 * dashboard has real evidence to show. The custom `playwright-flaky-analyzer/reporter`
 * writes one JSON file per run into ./ci-runs (results-run1.json, results-run2.json, …);
 * feeding several of those runs to the analyzer produces the trend/flaky dashboard.
 */
module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: process.env.CI ? 6 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.MERIDIAN_BASE_URL || "https://app.meridian.io",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  reporter: [
    ["list"],
    // Emits ./ci-runs/results-run{N}.json — the input the analyzer consumes.
    ["playwright-flaky-analyzer/reporter", { outputFile: "./ci-runs/results.json", includeConfig: true }],
  ],

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
