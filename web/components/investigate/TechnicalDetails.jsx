"use client";

export default function TechnicalDetails({ pack, verdict, guard, provenance }) {
  const det = (pack && pack.deterministic) || {};
  const cited = (verdict && verdict.rootCause && verdict.rootCause.citedEvidence) || [];
  const adjustments = det.confidenceExplain
    ? det.confidenceExplain.adjustments || []
    : [];

  return (
    <details className="mt-4 rounded-lg border border-slate-300 bg-slate-50">
      <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-slate-600">
        Technical details
      </summary>
      <div className="space-y-2 px-4 pb-4 font-mono text-xs text-slate-600">
        <div>Evidence present: {(pack.presentIds || []).join(" ") || "—"}</div>
        <div>Evidence absent: {(pack.absentIds || []).join(" ") || "—"}</div>
        <div>Matched rule: {det.ruleCode || "—"} · {det.ruleId || "—"}</div>
        <div>
          Failure fingerprint: {det.fingerprint || "—"} · shared with {det.fingerprintGroupCount} tests
        </div>
        <div>
          Rule confidence: {det.confidence}% · base {det.confidenceExplain ? det.confidenceExplain.baseConfidence : "—"}
          {adjustments.length ? " · " + adjustments.map((a) => `${a.code} ${a.delta}`).join(" · ") : ""}
        </div>
        <div>AI confidence band: {verdict && verdict.confidenceBand}</div>
        <div>Agreement: {guard && guard.agreement ? guard.agreement.status : "—"}</div>
        <div>
          Guard: {guard && guard.violations ? guard.violations.length : 0} check(s) ·{" "}
          {(guard && guard.strippedCitations ? guard.strippedCitations : []).length} citation(s) stripped
        </div>
        <div>Cited by AI: rootCause: {cited.join(", ") || "—"}</div>
        <div>
          Model: {provenance && provenance.model ? provenance.model : "—"} · prompt v
          {(provenance && provenance.promptVersion) || "—"} · pack v
          {(provenance && provenance.packVersion) || "1.0.0"}
        </div>
        <div>
          Mode: {provenance && provenance.mode} ·{" "}
          {provenance && typeof provenance.latencyMs === "number"
            ? `${(provenance.latencyMs / 1000).toFixed(1)} s · `
            : ""}
          {pack && pack.redaction ? `${pack.redaction.count} values redacted at build time` : "0 values redacted"}
        </div>
      </div>
    </details>
  );
}
