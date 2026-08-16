"use client";

import { humanizeOwner } from "@/lib/humanize.js";

/**
 * The "what should QA do next?" step. This is the end of the product story, so
 * it gets its own emphasised card rather than a muted footnote.
 */
export default function RecommendedAction({ verdict }) {
  const action = verdict && verdict.recommendedAction;
  if (!action) return null;

  return (
    <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
        Recommended next step
      </h3>

      <p className="mt-2 text-lg font-semibold leading-snug text-emerald-950">
        {action.action}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800">
          Owner: {humanizeOwner(action.owner)}
        </span>
        {action.urgency ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800">
            Priority {action.urgency}
          </span>
        ) : null}
      </div>

      {action.ticketDraft ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-emerald-800 hover:underline">
            Draft ticket description
          </summary>
          <p className="mt-2 rounded-lg border border-emerald-200 bg-white p-3 text-sm text-slate-700">
            {action.ticketDraft}
          </p>
        </details>
      ) : null}
    </div>
  );
}
