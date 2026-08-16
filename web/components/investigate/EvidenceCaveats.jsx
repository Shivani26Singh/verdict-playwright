"use client";

import EvidenceChips from "@/components/investigate/EvidenceChips.jsx";
import { humanizeEvidenceGap } from "@/lib/humanize.js";

/**
 * Evidence that argues against the chosen verdict, plus the evidence that was
 * never captured. Showing both is what keeps the verdict honest.
 */
export default function EvidenceCaveats({ verdict, pack }) {
  const contradicting = (verdict && verdict.contradictingEvidence) || [];
  const gaps = [
    ...new Set(
      ((verdict && verdict.evidenceGaps) || []).map(humanizeEvidenceGap).filter(Boolean)
    ),
  ];

  if (contradicting.length === 0 && gaps.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {contradicting.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-sm font-semibold text-amber-900">Evidence arguing against</h3>
          <ul className="mt-3 space-y-3">
            {contradicting.map((point, i) => (
              <li key={i}>
                <p className="text-sm leading-relaxed text-amber-950">
                  <span className="mr-1.5 font-bold" aria-hidden="true">
                    ⚠
                  </span>
                  {point.point}
                </p>
                <EvidenceChips ids={point.citedEvidence} pack={pack} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {gaps.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700">
            What would make this conclusive
          </h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            {gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
