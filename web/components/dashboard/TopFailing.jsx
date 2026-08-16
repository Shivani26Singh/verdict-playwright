const TONE = {
  stable_failure: "var(--viz-fail)",
  newly_failed: "var(--viz-fail-soft)",
  flaky: "var(--viz-flaky)",
  regression: "var(--viz-fail)",
};

/**
 * The most-failing test/browser pairs, each joined to the deterministic rule
 * that fired for it — so the row says how often AND why, not just how often.
 */
export default function TopFailing({ rows, failures }) {
  const items = rows || [];
  if (items.length === 0) return <p className="text-sm text-slate-500">No failing tests.</p>;

  // Map each row to its analysed-failure page so the list is a way in, not a
  // dead end. Keyed on the analyzer's own identity for a row.
  const idByKey = {};
  for (const f of (failures && failures.failures) || []) {
    idByKey[`${f.testName}::${f.browser}`] = f.id;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((row) => {
        const id = idByKey[`${row.testName}::${row.browser}`];
        const Row = id ? "a" : "div";
        return (
        <Row
          key={`${row.testName}::${row.browser}`}
          {...(id ? { href: `/investigate/f/${id}` } : {})}
          className={`flex gap-4 py-3 first:pt-0 last:pb-0 ${
            id ? "group -mx-2 rounded-lg px-2 transition hover:bg-slate-50" : ""
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 flex-none rounded-full"
                style={{ background: TONE[row.classification] || "var(--viz-skip)" }}
                aria-hidden="true"
              />
              <p className="truncate text-sm font-medium text-slate-900 group-hover:underline">
                {row.testName}
              </p>
            </div>
            {row.likelyCause ? (
              <p className="mt-0.5 truncate pl-4 text-xs text-slate-500">{row.likelyCause}</p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-[11px] text-slate-400">
              <span className="capitalize">{row.browser}</span>
              {row.category ? <span>· {row.category}</span> : null}
              {row.classificationLabel ? <span>· {row.classificationLabel}</span> : null}
              {row.requiresHumanReview ? (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800">
                  Needs human review
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex-none text-right">
            <div className="text-sm font-bold tabular-nums text-slate-900">
              {row.failureRate}%
            </div>
            <div className="text-[11px] tabular-nums text-slate-400">
              {row.failureCount}/{row.totalRuns} runs
            </div>
            {typeof row.confidence === "number" ? (
              <div className="text-[11px] tabular-nums text-slate-400">
                {row.confidence}% conf.
              </div>
            ) : null}
          </div>
        </Row>
        );
      })}
    </ul>
  );
}
