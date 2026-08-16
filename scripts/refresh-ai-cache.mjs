/**
 * Regenerate the committed scenario verdicts using the REAL AI pipeline.
 *
 *   evidence pack  ->  SYSTEM_PROMPT + buildUserMessage  ->  Groq / Anthropic
 *   ->  VerdictSchema validation  ->  Verdict Guard  ->  *.verdict.json
 *
 * This replaces the build-time heuristicVerdict() placeholders in
 * scripts/build-scenarios.js so the offline/cached demo path serves genuine
 * model output rather than a hand-written stand-in.
 *
 * It NEVER fabricates a verdict. With no provider key it exits non-zero and
 * writes nothing. The key is read from the environment or from web/.env.local
 * (which is gitignored) and is never written into any output file.
 *
 * Usage — from the repository root:
 *
 *   node scripts/refresh-ai-cache.mjs             # reads web/.env.local
 *   node scripts/refresh-ai-cache.mjs --dry-run   # calls the model, writes nothing
 *
 * Reads and writes only web/public/scenarios/*.verdict.json.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const REPO_ROOT = process.cwd();
const SCENARIO_DIR = path.join(REPO_ROOT, "web", "public", "scenarios");
const WEB_LIB = path.join(REPO_ROOT, "web", "lib");
const ENV_LOCAL = path.join(REPO_ROOT, "web", ".env.local");

/** What each scenario must conclude for the demo to hold together. */
const EXPECTED_CATEGORY = {
  "flaky-checkout": "FLAKY_TIMING",
  "product-invoice-500": "PRODUCT_DEFECT",
  "insufficient-evidence": "INSUFFICIENT_EVIDENCE",
};

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Groq's free tier meters tokens per minute and one investigation costs about
 * half the allowance, so the scenarios are spaced out rather than fired back
 * to back. The provider also retries a 429 on its own; this just keeps us from
 * relying on that for every single call.
 */
const PAUSE_BETWEEN_MS = Number(process.env.VERDICT_REFRESH_PAUSE_MS || 25000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Minimal .env reader so this script sees the same key `next dev` does.
 * Only fills variables that are not already set in the real environment.
 */
async function loadEnvLocal() {
  let text;
  try {
    text = await readFile(ENV_LOCAL, "utf8");
  } catch {
    return false;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) process.env[key] = value;
  }
  return true;
}

async function importWebLib(file) {
  return import(pathToFileURL(path.join(WEB_LIB, file)).href);
}

async function readJson(file) {
  return JSON.parse(await readFile(path.join(SCENARIO_DIR, file), "utf8"));
}

function fail(message, hint) {
  console.error(`\n  ERROR: ${message}\n`);
  if (hint) console.error(`${hint}\n`);
  process.exit(1);
}

async function main() {
  const foundEnvFile = await loadEnvLocal();

  const { investigateWithAI, resolveProvider, resolveModel } = await importWebLib(
    "ai-provider.js"
  );
  const { guardVerdict } = await importWebLib("verdict-guard.js");
  const { PROMPT_VERSION, PACK_VERSION } = await importWebLib("constants.js");

  const provider = resolveProvider();
  if (!provider) {
    fail(
      "No AI provider key found — refusing to write a fake AI cache.",
      [
        "  Put your personal Groq key in web/.env.local (already gitignored):",
        "",
        "      GROQ_API_KEY=gsk_...",
        "",
        "  then re-run from the repository root:",
        "",
        "      node scripts/refresh-ai-cache.mjs",
        "",
        foundEnvFile
          ? "  web/.env.local was found but contains no GROQ_API_KEY or ANTHROPIC_API_KEY."
          : "  web/.env.local does not exist yet.",
        "",
        "  The existing *.verdict.json files were left untouched.",
      ].join("\n")
    );
  }

  const model = resolveModel(provider);
  console.log(
    `\nRegenerating cached verdicts via ${provider} / ${model}${DRY_RUN ? " (dry run)" : ""}\n`
  );

  const ids = Object.keys(EXPECTED_CATEGORY);
  const summary = [];

  for (const [position, id] of ids.entries()) {
    if (position > 0 && PAUSE_BETWEEN_MS > 0) {
      process.stdout.write(`  … pausing ${Math.round(PAUSE_BETWEEN_MS / 1000)}s for the rate limit\n`);
      await sleep(PAUSE_BETWEEN_MS);
    }

    const pack = await readJson(`${id}.pack.json`);
    process.stdout.write(`  ${id} … `);

    let call;
    const started = Date.now();
    try {
      call = await investigateWithAI(pack);
    } catch (err) {
      console.log("FAILED");
      fail(
        `Live AI call failed for "${id}": ${err && err.message ? err.message : err}` +
          (err && err.detail ? `\n         ${err.detail}` : ""),
        "  Nothing was written. Fix the failure and re-run — the cache is never faked."
      );
    }
    const latencyMs = Date.now() - started;

    const guard = guardVerdict(call.verdict, pack);
    const verdict = guard.verdict;
    const expected = EXPECTED_CATEGORY[id];
    const matched = verdict.category === expected;

    console.log(
      `${verdict.category} (${verdict.confidenceBand}) in ${(latencyMs / 1000).toFixed(1)}s` +
        `${matched ? "" : `  ← expected ${expected}`}`
    );

    summary.push({ id, category: verdict.category, expected, matched, guard });

    if (!DRY_RUN) {
      const payload = {
        verdict,
        guard,
        provenance: {
          mode: "cached",
          reason: "Real model output captured by scripts/refresh-ai-cache.mjs",
          provider: call.provider,
          model: call.model,
          promptVersion: PROMPT_VERSION,
          packVersion: PACK_VERSION,
          generatedAt: new Date().toISOString(),
          latencyMs,
        },
      };
      await writeFile(
        path.join(SCENARIO_DIR, `${id}.verdict.json`),
        JSON.stringify(payload, null, 2)
      );
    }
  }

  console.log("");
  const mismatched = summary.filter((s) => !s.matched);
  for (const s of summary) {
    const violations = (s.guard.violations || []).length;
    const stripped = (s.guard.strippedCitations || []).length;
    console.log(
      `  ${s.matched ? "OK  " : "DIFF"} ${s.id.padEnd(22)} ${s.category.padEnd(22)} guard: ${violations} violation(s), ${stripped} citation(s) stripped`
    );
  }

  if (mismatched.length > 0) {
    console.log(
      `\n  ${mismatched.length} scenario(s) did not reach the expected category.` +
        "\n  That is the model's genuine answer — it has been written as-is." +
        "\n  Review the evidence pack or the prompt rather than editing the verdict by hand.\n"
    );
  } else {
    console.log("\n  All three scenarios reached their expected conclusion.\n");
  }

  if (DRY_RUN) console.log("  Dry run — no files were written.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
