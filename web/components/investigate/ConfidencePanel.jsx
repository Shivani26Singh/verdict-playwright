"use client";

import { humanizeBand } from "@/lib/humanize.js";

export default function ConfidencePanel({ pack, verdict }) {
  const reasons = (pack && pack.deterministic && pack.deterministic.confidenceExplain
    ? pack.deterministic.confidenceExplain.adjustments
    : []
  )
    .map((a) => (a && a.reason ? a.reason : ""))
    .filter(Boolean);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="font-medium text-slate-700">
        Confidence: {humanizeBand(verdict.confidenceBand)}
      </div>
      {reasons.length > 0 ? (
        <div className="mt-2">
          <div className="text-sm font-medium text-slate-600">Why:</div>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
