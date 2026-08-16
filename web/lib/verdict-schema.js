/**
 * VERDICT output schema — Zod, plain JavaScript, .strict() everywhere.
 * This is the single source of truth for both the AI's structured output
 * (via zodOutputFormat or a hand-written JSON Schema) and the Guard's safeParse.
 */

import { z } from "zod";

export const CATEGORIES = [
  "PRODUCT_DEFECT",
  "TEST_DEFECT",
  "FLAKY_TIMING",
  "ENVIRONMENT_INFRA",
  "INSUFFICIENT_EVIDENCE",
];

export const OWNERS = ["DEV_TEAM", "QA_TEAM", "PLATFORM_TEAM", "NEEDS_TRIAGE"];
export const BANDS = ["HIGH", "MEDIUM", "LOW"];
export const URGENCY = ["P1", "P2", "P3"];

const Ids = z.array(z.string());

export const VerdictSchema = z
  .object({
    category: z.enum(CATEGORIES),
    headline: z
      .string()
      .describe("One plain-English sentence a QA engineer can act on. No jargon, no evidence IDs, no rule codes."),
    rootCause: z
      .object({
        statement: z.string().describe("Plain English. Never mention evidence IDs or rule codes in the text."),
        citedEvidence: Ids,
      })
      .strict(),
    reasoning: z.array(
      z
        .object({
          step: z.string().describe("A single plain-English claim a QA engineer would recognise. 2-5 of these."),
          citedEvidence: Ids,
        })
        .strict()
    ),
    contradictingEvidence: z.array(
      z
        .object({
          point: z.string(),
          citedEvidence: Ids,
        })
        .strict()
    ),
    confidenceBand: z.enum(BANDS),
    confidenceRationale: z.string(),
    recommendedAction: z
      .object({
        owner: z.enum(OWNERS),
        action: z.string(),
        urgency: z.enum(URGENCY),
        ticketDraft: z.string(),
      })
      .strict(),
    evidenceGaps: z.array(z.string()),
  })
  .strict();

/**
 * Hand-written JSON Schema derived from the Zod schema, used as the fallback
 * when the installed SDK does not expose zodOutputFormat / messages.parse.
 */
export const VerdictJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "category",
    "headline",
    "rootCause",
    "reasoning",
    "contradictingEvidence",
    "confidenceBand",
    "confidenceRationale",
    "recommendedAction",
    "evidenceGaps",
  ],
  properties: {
    category: { type: "string", enum: CATEGORIES },
    headline: { type: "string" },
    rootCause: {
      type: "object",
      additionalProperties: false,
      required: ["statement", "citedEvidence"],
      properties: {
        statement: { type: "string" },
        citedEvidence: { type: "array", items: { type: "string" } },
      },
    },
    reasoning: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["step", "citedEvidence"],
        properties: {
          step: { type: "string" },
          citedEvidence: { type: "array", items: { type: "string" } },
        },
      },
    },
    contradictingEvidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["point", "citedEvidence"],
        properties: {
          point: { type: "string" },
          citedEvidence: { type: "array", items: { type: "string" } },
        },
      },
    },
    confidenceBand: { type: "string", enum: BANDS },
    confidenceRationale: { type: "string" },
    recommendedAction: {
      type: "object",
      additionalProperties: false,
      required: ["owner", "action", "urgency", "ticketDraft"],
      properties: {
        owner: { type: "string", enum: OWNERS },
        action: { type: "string" },
        urgency: { type: "string", enum: URGENCY },
        ticketDraft: { type: "string" },
      },
    },
    evidenceGaps: { type: "array", items: { type: "string" } },
  },
};
