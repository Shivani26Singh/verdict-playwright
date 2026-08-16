import { buildEvidencePack, synthesizedInsufficientEvidence } from "@/lib/evidence-pack.js";
import { guardVerdict } from "@/lib/verdict-guard.js";
import { investigateWithAI, providerFailureInfo, resolveProvider } from "@/lib/ai-provider.js";
import { PROMPT_VERSION, PACK_VERSION } from "@/lib/constants.js";

export const runtime = "nodejs";
export const maxDuration = 60;

function unavailableResponse(pack, err) {
  const { reason, message } = providerFailureInfo(err);
  const fallback = guardVerdict(synthesizedInsufficientEvidence(pack), pack);
  return Response.json(
    {
      ok: true,
      evidencePack: pack,
      verdict: fallback.verdict,
      guard: {
        ...fallback,
        violations: [
          { code: "PROVIDER", severity: "FATAL", message: "Live AI provider unavailable.", detail: message },
          ...fallback.violations,
        ],
      },
      provenance: {
        mode: "unavailable",
        provider: resolveProvider(),
        reason,
      },
    },
    { status: 200 }
  );
}

function cachedResponse(pack, verdict, guard) {
  return Response.json(
    {
      ok: true,
      evidencePack: pack,
      verdict,
      guard,
      provenance: { mode: "cached", reason: "VERDICT_DEMO_ONLY" },
    },
    { status: 200 }
  );
}

function validateInvestigation(investigation) {
  return (
    investigation &&
    typeof investigation === "object" &&
    !Array.isArray(investigation) &&
    (typeof investigation.testName === "string" || typeof investigation.title === "string") &&
    Array.isArray(investigation.history)
  );
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, code: "BAD_REQUEST", message: "Malformed JSON body" }, { status: 400 });
    }

    const investigation = body && body.investigation;
    if (!validateInvestigation(investigation)) {
      return Response.json({ ok: false, code: "BAD_REQUEST", message: "Missing investigation" }, { status: 400 });
    }

    const siblingBrowsers = Array.isArray(body.siblingBrowsers) ? body.siblingBrowsers : [];
    const pack = buildEvidencePack(investigation, {
      siblingBrowsers,
      redaction: { count: body.redactionCount || 0 },
    });

    if (process.env.VERDICT_DEMO_ONLY === "true") {
      const fallback = guardVerdict(synthesizedInsufficientEvidence(pack), pack);
      return cachedResponse(pack, fallback.verdict, fallback);
    }

    let result;
    const callStarted = performance.now();
    try {
      result = await investigateWithAI(pack);
    } catch (err) {
      return unavailableResponse(pack, err);
    }
    const latencyMs = Math.round(performance.now() - callStarted);

    const guard = guardVerdict(result.verdict, pack);

    return Response.json(
      {
        ok: true,
        evidencePack: pack,
        verdict: guard.verdict,
        guard,
        provenance: {
          mode: "live",
          provider: result.provider,
          model: result.model,
          promptVersion: PROMPT_VERSION,
          packVersion: PACK_VERSION,
          generatedAt: new Date().toISOString(),
          latencyMs,
          redaction: pack.redaction,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      {
        ok: false,
        code: "INTERNAL",
        message: "Unexpected server error",
      },
      { status: 500 }
    );
  }
}
