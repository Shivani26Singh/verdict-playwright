"use client";

import EvidenceChips from "@/components/investigate/EvidenceChips.jsx";

/**
 * The AI's reasoning chain. Every step carries the analyzer evidence it rests
 * on, shown as human-readable chips.
 */
export default function WhyWeThink({ verdict, pack }) {
  const steps = (verdict && verdict.reasoning) || [];
  if (steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-700">Why we think this</h3>
      <ol className="mt-3 space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-slate-700">{step.step}</p>
              <EvidenceChips ids={step.citedEvidence} pack={pack} />
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-slate-400">
        Each step is grounded in analyzer evidence. Claims that cited evidence the
        analyzer never produced are removed before this is shown.
      </p>
    </div>
  );
}
