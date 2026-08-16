"use client";

import { humanizeEvidenceLabel } from "@/lib/humanize.js";
import { useTabs } from "@/components/investigate/TabsContext.js";

/**
 * Maps each piece of analyzer evidence to the place in the UI where a judge can
 * actually see it. The evidence ID itself is never rendered — only its
 * human-readable label.
 */
const EVIDENCE_TARGETS = {
  E1: { tab: "analysis", anchor: "insight-history" },
  E2: { tab: "analysis", anchor: "insight-pattern" },
  E3: { tab: "analysis", anchor: "insight-pattern" },
  E4: { tab: "analysis", anchor: "insight-error" },
  E5: { tab: "analysis", anchor: "insight-error" },
  E6: { tab: "analysis", anchor: "insight-metrics" },
  E7: { tab: "analysis", anchor: "insight-pattern" },
  E8: { tab: "analysis", anchor: "insight-pattern" },
  E9: { tab: "analysis", anchor: "insight-confidence" },
  E10: { tab: "analysis", anchor: "insight-boundary" },
  E11: { tab: "evidence", anchor: "insight-artifacts" },
};

/**
 * Renders the evidence a claim rests on as human-readable chips. Clicking a
 * chip switches to the tab that shows it and highlights the section.
 */
export default function EvidenceChips({ ids, pack }) {
  const tabs = useTabs();
  const items = (pack && pack.items) || [];
  const known = new Set(items.filter((i) => i && i.present !== false).map((i) => i.id));

  const list = (Array.isArray(ids) ? ids : []).filter((id) => id && known.has(id));
  if (list.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-slate-400">Based on:</span>
      {list.map((id) => {
        const target = EVIDENCE_TARGETS[id];
        return (
          <button
            key={id}
            type="button"
            disabled={!target || !tabs}
            onClick={() => tabs && target && tabs.goToEvidence(target)}
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 transition enabled:hover:border-sky-300 enabled:hover:bg-sky-50 enabled:hover:text-sky-700 disabled:cursor-default"
          >
            {humanizeEvidenceLabel(id)}
          </button>
        );
      })}
    </div>
  );
}
