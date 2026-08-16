import Panel from "@/components/ui/Panel.jsx";

export default function ObservedPanel({ observed }) {
  const { rows, artifacts, absentSummary } = observed;

  return (
    <Panel
      title="What we observed"
      subtitle="Facts taken directly from the test results."
      accent="observed"
    >
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.index} id={`ev-index-${row.index}`} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-sm font-medium text-slate-700">{row.label}</div>
            <div className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{row.value}</div>
          </div>
        ))}

        {artifacts ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-sm font-medium text-slate-700">Available evidence</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                <span className={artifacts.screenshot ? "text-emerald-600" : "text-slate-400"}>
                  {artifacts.screenshot ? "✓" : "✕"}
                </span>
                Screenshot
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                <span className={artifacts.trace ? "text-emerald-600" : "text-slate-400"}>
                  {artifacts.trace ? "✓" : "✕"}
                </span>
                Trace
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                <span className={artifacts.video ? "text-emerald-600" : "text-slate-400"}>
                  {artifacts.video ? "✓" : "✕"}
                </span>
                Video
              </span>
            </div>
          </div>
        ) : null}

        {absentSummary ? <p className="text-sm text-slate-400">{absentSummary}</p> : null}
      </div>
    </Panel>
  );
}
