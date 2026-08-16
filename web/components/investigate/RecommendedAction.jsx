"use client";

import { humanizeOwner } from "@/lib/humanize.js";

export default function RecommendedAction({ verdict }) {
  const action = verdict && verdict.recommendedAction;
  if (!action) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm font-medium text-slate-500">
        {humanizeOwner(action.owner)} · Priority {action.urgency}
      </div>
      <p className="mt-2 text-sm text-slate-700">{action.action}</p>
    </div>
  );
}
