"use client";

import ViewEvidenceLink from "@/components/investigate/ViewEvidenceLink.jsx";
import { evidenceIndexById } from "@/lib/humanize.js";

export default function EvidenceCaveats({ verdict, pack }) {
  const contradicting = (verdict && verdict.contradictingEvidence) || [];
  const gaps = (verdict && verdict.evidenceGaps) || [];

  if (contradicting.length === 0 && gaps.length === 0) return null;

  return (
    <div className="space-y-4">
      {contradicting.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-medium text-slate-700">What argues against this</h3>
          <ul className="mt-2 space-y-2">
            {contradicting.map((point, i) => {
              const indices = (point.citedEvidence || [])
                .map((id) => evidenceIndexById(pack, id))
                .filter((x) => x != null);
              return (
                <li key={i} className="flex items-start justify-between gap-4">
                  <span className="text-sm text-slate-600">{point.point}</span>
                  {indices.length > 0 ? <ViewEvidenceLink indices={indices} /> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {gaps.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-medium text-slate-700">What would help</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {gaps.map((gap) => (
              <li key={gap}>{gap.replace(/^Missing evidence: /, "")}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
