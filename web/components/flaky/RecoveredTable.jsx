"use client";

import { useState } from "react";
import FailureRow from "@/components/flaky/FailureRow.jsx";

/**
 * Passing on retry — tests that always ended green, but only because a retry
 * saved them. They are not failures, so they are listed separately, but the
 * analyzer captured the same evidence for their first attempt, so they get the
 * same presentation and the same actions.
 */
export default function RecoveredTable({ recovered }) {
  const [expanded, setExpanded] = useState(null);
  const rows = recovered || [];

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No test needed a retry to pass in the analysed window.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[minmax(0,3fr)_minmax(0,2fr)_7rem_4.5rem_5.5rem_5rem] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 pl-[18px] text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:grid">
        <span>Test</span>
        <span>Detected signal</span>
        <span>Category</span>
        <span className="text-right">Conf.</span>
        <span>Browser</span>
        <span>Evidence</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <FailureRow
            key={r.id}
            entry={r}
            open={expanded === r.id}
            onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
          />
        ))}
      </ul>
    </div>
  );
}
