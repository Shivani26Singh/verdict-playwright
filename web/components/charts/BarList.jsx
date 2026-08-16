/**
 * A ranked magnitude list — one hue for every bar, because the categories have
 * no natural order and the bar length already encodes the value. Every row is
 * directly labelled, so the list is its own table view.
 */
export default function BarList({ items, valueSuffix = "", emptyLabel = "Nothing recorded" }) {
  const rows = (items || []).filter((i) => Number(i.value) > 0);
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  const max = Math.max(...rows.map((r) => Number(r.value)));

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm capitalize text-slate-700">
              {row.label}
            </span>
            <span className="flex-none text-sm font-semibold tabular-nums text-slate-900">
              {row.value}
              {valueSuffix}
              {row.note ? (
                <span className="ml-1.5 text-xs font-normal text-slate-400">{row.note}</span>
              ) : null}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, (Number(row.value) / max) * 100)}%`,
                background: row.color || "var(--viz-fixed)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
