/**
 * AI provider for VERDICT.
 *
 * Two interchangeable backends behind one function:
 *
 *   groq       — OpenAI-compatible Chat Completions (see ai-groq.js)
 *   anthropic  — the official @anthropic-ai/sdk with a hand-written JSON Schema
 *
 * Both are handed the identical system prompt, the identical user message, and
 * the identical VerdictSchema. Whichever answers, the raw verdict goes through
 * the same Verdict Guard afterwards. Selection is by environment variable only;
 * no key is ever sent to the browser.
 *
 * The blueprint allows zodOutputFormat / messages.parse only when the installed
 * SDK exposes them for Zod v3. This SDK's zodOutputFormat imports zod/v4, so we
 * deliberately fall back to the documented hand-written schema path.
 */

import Anthropic from "@anthropic-ai/sdk";
import { VerdictSchema, VerdictJsonSchema } from "./verdict-schema.js";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.js";
import { investigateWithGroq, GROQ_DEFAULT_MODEL } from "./ai-groq.js";

const DEFAULT_MODEL = "claude-opus-5";

/**
 * Which backend to use. An explicit VERDICT_PROVIDER wins; otherwise whichever
 * key is present, preferring Groq. Returns null when neither key is set.
 */
export function resolveProvider() {
  const forced = (process.env.VERDICT_PROVIDER || "").trim().toLowerCase();
  if (forced === "groq" || forced === "anthropic") return forced;
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

/** The model that will actually be used, for provenance display. */
export function resolveModel(provider) {
  const p = provider || resolveProvider();
  if (process.env.VERDICT_MODEL) return process.env.VERDICT_MODEL;
  return p === "groq" ? GROQ_DEFAULT_MODEL : DEFAULT_MODEL;
}

function extractJsonObject(text) {
  if (typeof text !== "string") throw new Error("Empty model response");
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in model response");
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') {
      inStr = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("Unterminated JSON object in model response");
}

function textFromResponse(message) {
  const content = (message && message.content) || [];
  const text = content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
  if (!text.trim()) throw new Error("Empty model response");
  return text;
}

/**
 * Call the configured provider and return a schema-validated verdict object
 * (raw, pre-guard) together with the model that produced it.
 * Throws on any failure — the route handles the failure and never 5xxes.
 */
export async function investigateWithAI(pack, opts = {}) {
  const provider = resolveProvider();
  if (!provider) {
    const err = new Error(
      "No AI provider configured — set GROQ_API_KEY (or ANTHROPIC_API_KEY)"
    );
    err.code = "no_api_key";
    throw err;
  }

  if (provider === "groq") {
    const { verdict, model, usage } = await investigateWithGroq(pack);
    return { verdict, provider: "groq", model, usage };
  }

  const verdict = await investigateWithAnthropic(pack, opts);
  return {
    verdict,
    provider: "anthropic",
    model: process.env.VERDICT_MODEL || DEFAULT_MODEL,
    usage: null,
  };
}

/**
 * Call Claude and return a schema-validated verdict object (raw, pre-guard).
 */
async function investigateWithAnthropic(pack) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error("ANTHROPIC_API_KEY environment variable is not set");
    err.code = "no_api_key";
    throw err;
  }

  const model = process.env.VERDICT_MODEL || DEFAULT_MODEL;
  const effort = ["low", "medium", "high"].includes(process.env.VERDICT_EFFORT)
    ? process.env.VERDICT_EFFORT
    : "low";

  const client = new Anthropic({
    apiKey,
    maxRetries: 1,
  });

  const response = await client.messages.create(
    {
      model,
      max_tokens: 12000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildUserMessage(pack) }],
      output_config: {
        effort,
        format: {
          type: "json_schema",
          schema: VerdictJsonSchema,
        },
      },
    },
    { timeout: 45000 }
  );

  const text = textFromResponse(response);
  let parsed;
  try {
    parsed = JSON.parse(extractJsonObject(text));
  } catch {
    parsed = JSON.parse(text);
  }

  const validated = VerdictSchema.safeParse(parsed);
  if (!validated.success) {
    const err = new Error("Model response failed VerdictSchema validation");
    err.code = "invalid_output";
    throw err;
  }

  return validated.data;
}

export function providerFailureInfo(err) {
  const message = err && err.message ? String(err.message) : String(err);
  let reason = "error";
  if (err && err.code) reason = err.code;
  else if (/rate.?limit|429/i.test(message)) reason = "rate_limited";
  else if (/timeout|timed out/i.test(message)) reason = "timeout";
  else if (/refus/i.test(message)) reason = "refusal";
  return { reason, message };
}
