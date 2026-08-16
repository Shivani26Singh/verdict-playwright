// Shared step-flow visual: a numbered pill per step. Horizontal mode chains
// pills with bold chevrons via flex-wrap (no absolute-positioned connector
// line) so it degrades cleanly to multiple rows at any viewport width.
// Vertical mode stacks pills with a short connecting rule — meant for a
// narrower column (e.g. a two-column section's image-like side).
export default function FlowDiagram({ steps, wrapLabels = false, vertical = false }) {
  if (vertical) {
    return (
      <div className="flex flex-col items-stretch">
        {steps.map((step, i) => (
          <div key={step}>
            <div className="flex items-center gap-3 rounded-full border border-line bg-ink-800 py-2 pl-2 pr-4 shadow-soft">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-signal font-mono text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span className="font-mono text-[13px] text-paper">{step}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="ml-[15px] h-4 w-px bg-line" />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div className="flex items-center gap-2.5 rounded-full border border-line bg-ink-800 py-2 pl-2 pr-4 shadow-soft">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-signal font-mono text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <span
              className={`font-mono text-[13px] text-paper ${wrapLabels ? "max-w-[150px] leading-snug" : "whitespace-nowrap"}`}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span className="font-mono text-lg font-bold leading-none text-signal/50">›</span>
          )}
        </div>
      ))}
    </div>
  );
}
