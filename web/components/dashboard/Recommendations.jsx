const LEVEL = {
  critical: { label: "Critical", dot: "var(--viz-fail)", bg: "bg-rose-50", text: "text-rose-900" },
  high: { label: "High", dot: "var(--viz-fail-soft)", bg: "bg-orange-50", text: "text-orange-900" },
  medium: { label: "Medium", dot: "var(--viz-flaky)", bg: "bg-amber-50", text: "text-amber-900" },
  low: { label: "Low", dot: "var(--viz-skip)", bg: "bg-slate-50", text: "text-slate-700" },
};

/**
 * The analyzer's own recommendations, in the priority order it assigned.
 * Wording is the analyzer's — nothing is rephrased here.
 */
export default function Recommendations({ recommendations }) {
  const items = recommendations || [];
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No action recommended — the suite is healthy.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((rec, i) => {
        const level = LEVEL[rec.level] || LEVEL.low;
        return (
          <li key={i} className={`flex items-start gap-3 rounded-lg ${level.bg} px-3 py-2.5`}>
            <span
              className="mt-1.5 h-2 w-2 flex-none rounded-full"
              style={{ background: level.dot }}
              aria-hidden="true"
            />
            <p className={`flex-1 text-sm leading-relaxed ${level.text}`}>
              {String(rec.message).replace(/^(Warning|Critical):\s*/i, "")}
            </p>
            <span className="flex-none text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {level.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
