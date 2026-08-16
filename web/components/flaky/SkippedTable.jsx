import HistoryStrip from "@/components/home/HistoryStrip.jsx";

/**
 * Skipped tests.
 *
 * They never executed, so there is no error, no evidence, no rule match and
 * nothing to investigate — deliberately no actions here. Listed so the suite
 * accounting is complete and nobody assumes they passed.
 */

/**
 * Describe *how often* a test was skipped, from its actual history.
 *
 * A test quarantined for the whole window and one skipped only in the latest
 * run are very different signals — the second is a skip someone just
 * introduced, which is exactly what this table exists to surface. Counting
 * the history is the only honest way to tell them apart.
 */
function describeSkips(history, runCount) {
  const runs = runCount || history.length;
  const skips = history.filter((outcome) => outcome === "skipped").length;

  if (runs === 0) return "Not run";
  if (skips === runs) return `Skipped in all ${runs} runs`;
  if (skips === 1 && history[history.length - 1] === "skipped") {
    return `Skipped in the latest run only (of ${runs})`;
  }
  return `Skipped in ${skips} of ${runs} runs`;
}

export default function SkippedTable({ skipped }) {
  const rows = skipped || [];
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No test was skipped in the analysed runs.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[minmax(0,3fr)_7rem_minmax(0,2fr)_6rem] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:grid">
        <span>Test</span>
        <span>Browser</span>
        <span>History</span>
        <span>Status</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map((s) => (
          <li
            key={`${s.testName}::${s.browser}`}
            className="grid grid-cols-1 items-center gap-x-4 gap-y-2 px-4 py-2.5 lg:grid-cols-[minmax(0,3fr)_7rem_minmax(0,2fr)_6rem]"
          >
            <span className="truncate text-sm text-slate-700">{s.testName}</span>
            <span className="text-xs capitalize text-slate-500">{s.browser}</span>
            <span>
              <HistoryStrip history={s.history} />
            </span>
            <span className="text-xs text-slate-500">
              {describeSkips(s.history || [], s.runCount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
