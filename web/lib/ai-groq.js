/**
 * Groq provider for VERDICT.
 *
 * Groq exposes an OpenAI-compatible Chat Completions endpoint, so this needs no
 * extra dependency — just `fetch`. It reuses the SAME system prompt, the SAME
 * user message builder, and the SAME VerdictSchema as the Anthropic provider.
 * Nothing about the evidence contract or the Verdict Guard changes.
 *
 * SERVER-SIDE ONLY. `GROQ_API_KEY` is read from process.env and is never
 * prefixed with NEXT_PUBLIC_, so Next.js will not inline it into client
 * JavaScript. This module is imported only from the route handler and from
 * build scripts.
 */

import { VerdictSchema, VerdictJsonSchema } from "./verdict-schema.js";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.js";

export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Groq's JSON mode guarantees syntactically valid JSON but not schema
 * conformance, so the exact shape is restated in the system prompt. The
 * response is still validated by VerdictSchema before it leaves this module.
 */
function schemaInstruction() {
  return [
    "",
    "## Required output",
    "",
    "Reply with a single JSON object and nothing else — no prose, no markdown",
    "fence. It must match this JSON Schema exactly, including every required",
    "key and the exact enum values:",
    "",
    JSON.stringify(VerdictJsonSchema, null, 2),
    "",
    "citedEvidence arrays contain evidence IDs such as \"E1\" — those arrays are",
    "the ONLY place an identifier may appear.",
  ].join("\n");
}

function messageText(payload) {
  const choice = payload && payload.choices && payload.choices[0];
  const text = choice && choice.message && choice.message.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Empty model response");
  }
  return text;
}

/** Tolerate a stray fence or a leading sentence around the JSON object. */
function extractJsonObject(text) {
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

/**
 * Groq's free tier meters tokens per minute, so a burst of investigations can
 * legitimately be told to wait a couple of seconds. Both the Retry-After
 * header and the "try again in 1.5s" hint in the body are honoured; anything
 * longer than MAX_RETRY_WAIT_MS is surfaced as a failure rather than silently
 * stalling the request.
 */
const MAX_RETRY_ATTEMPTS = 3;
const MAX_RETRY_WAIT_MS = 12000;

function retryDelayMs(res, body) {
  const header = Number(res.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return Math.ceil(header * 1000);
  const match = /try again in ([\d.]+)\s*s/i.exec(body || "");
  if (match) return Math.ceil(Number(match[1]) * 1000) + 250;
  return 2000;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postOnce(apiKey, model, pack, signal) {
  return fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\n" + schemaInstruction() },
        { role: "user", content: buildUserMessage(pack) },
      ],
    }),
  });
}

async function callGroq(apiKey, model, pack, signal) {
  for (let attempt = 1; ; attempt++) {
    const res = await postOnce(apiKey, model, pack, signal);
    if (res.ok) return res.json();

    const detail = await res.text().catch(() => "");

    if (res.status === 429 && attempt < MAX_RETRY_ATTEMPTS) {
      const wait = retryDelayMs(res, detail);
      if (wait <= MAX_RETRY_WAIT_MS) {
        await sleep(wait);
        continue;
      }
    }

    const err = new Error(
      `Groq request failed with ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`
    );
    if (res.status === 429) err.code = "rate_limited";
    else if (res.status === 401 || res.status === 403) err.code = "bad_api_key";
    throw err;
  }
}

/**
 * Call Groq and return a schema-validated verdict object (raw, pre-guard).
 * Throws on any failure — the caller decides what to show.
 */
export async function investigateWithGroq(pack) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error("GROQ_API_KEY environment variable is not set");
    err.code = "no_api_key";
    throw err;
  }

  const model = process.env.VERDICT_MODEL || GROQ_DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  let payload;
  try {
    payload = await callGroq(apiKey, model, pack, controller.signal);
  } catch (err) {
    if (err && err.name === "AbortError") {
      const timeout = new Error("Groq request timed out after 45s");
      timeout.code = "timeout";
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const text = messageText(payload);
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
    err.detail = validated.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw err;
  }

  return {
    verdict: validated.data,
    model,
    usage: (payload && payload.usage) || null,
  };
}
