/**
 * AI provider for VERDICT. Uses the official @anthropic-ai/sdk with a
 * hand-written JSON Schema + VerdictSchema.safeParse() on the returned text.
 *
 * The blueprint allows zodOutputFormat / messages.parse only when the installed
 * SDK exposes them for Zod v3. This SDK's zodOutputFormat imports zod/v4, so we
 * deliberately fall back to the documented hand-written schema path.
 */

import Anthropic from "@anthropic-ai/sdk";
import { VerdictSchema, VerdictJsonSchema } from "./verdict-schema.js";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.js";

const DEFAULT_MODEL = "claude-opus-5";

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
 * Call Claude and return a schema-validated verdict object (raw, pre-guard).
 * Throws on any failure — the route handles the failure and never 5xxes.
 */
export async function investigateWithAI(pack, opts = {}) {
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
  if (err && err.code === "no_api_key") reason = "no_api_key";
  else if (/rate.?limit|429/i.test(message)) reason = "rate_limited";
  else if (/timeout|timed out/i.test(message)) reason = "timeout";
  else if (/refus/i.test(message)) reason = "refusal";
  return { reason, message };
}
