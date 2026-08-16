"use client";

import ViewEvidenceLink from "@/components/investigate/ViewEvidenceLink.jsx";
import { evidenceIndexById } from "@/lib/humanize.js";

export default function WhyWeThink({ verdict, pack }) {
  const steps = (verdict && verdict.reasoning) || [];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-medium text-slate-700">Why we think this</h3>
      <ul className="mt-2 space-y-2">
        {steps.map((step, i) => {
          const indices = (step.citedEvidence || [])
            .map((id) => evidenceIndexById(pack, id))
            .filter((x) => x != null);
          return (
            <li key={i} className="flex items-start justify-between gap-4">
              <span className="text-sm text-slate-600">
                <span className="mr-2 text-emerald-600">✓</span>
                {step.step}
              </span>
              {indices.length > 0 ? <ViewEvidenceLink indices={indices} /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
