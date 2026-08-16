/**
 * Server-side readers for the committed suite view models.
 *
 * Both files are produced by scripts/build-suite-data.js, which runs the
 * unchanged deterministic analyzer over demo-project/ci-runs. Nothing in the
 * web layer computes suite statistics of its own — it only presents them.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

const SUITE_DIR = () => path.join(process.cwd(), "public", "suite");

async function readSuiteJson(file) {
  return JSON.parse(await readFile(path.join(SUITE_DIR(), file), "utf8"));
}

export async function loadDashboard() {
  try {
    return await readSuiteJson("dashboard.json");
  } catch {
    return null;
  }
}

export async function loadRules() {
  try {
    return await readSuiteJson("rules.json");
  } catch {
    return null;
  }
}

const FAILURE_DIR = () => path.join(process.cwd(), "public", "failures");

/** The full list of analysed failures, for the Flaky Analysis workspace. */
export async function loadFailureIndex() {
  try {
    return JSON.parse(await readFile(path.join(FAILURE_DIR(), "index.json"), "utf8"));
  } catch {
    return null;
  }
}

/**
 * One analysed failure — its trimmed investigation and its evidence pack.
 * This is what lets any failure, not just a curated scenario, be investigated.
 * The id comes from the URL, so it is constrained to the safe charset the
 * build script generates before it ever reaches the filesystem.
 */
export async function loadFailure(id) {
  if (!/^[a-z0-9-]+$/.test(String(id || ""))) return null;
  try {
    return JSON.parse(await readFile(path.join(FAILURE_DIR(), `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}

/** Health score → the band a QA lead would name it. */
export function healthBand(score) {
  const n = Number(score) || 0;
  if (n >= 85) return { label: "Healthy", tone: "pass" };
  if (n >= 70) return { label: "Needs attention", tone: "flaky" };
  if (n >= 50) return { label: "At risk", tone: "flaky" };
  return { label: "Critical", tone: "fail" };
}

export function formatDuration(ms) {
  const n = Number(ms) || 0;
  if (n < 1000) return `${Math.round(n)} ms`;
  if (n < 60000) return `${(n / 1000).toFixed(1)} s`;
  const minutes = Math.floor(n / 60000);
  const seconds = Math.round((n % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Severity → the visual weight it should carry. */
export const SEVERITY_TONE = {
  critical: "fail",
  high: "failSoft",
  medium: "flaky",
  low: "skip",
};
