"use client";

/**
 * Suite composition as one part-to-whole bar.
 *
 * Segments are separated by a 2px surface gap rather than a border, and the
 * legend below carries the label + count + share for every segment — so the
 * figures are readable without relying on the colour, and the legend doubles
 * as the chart's table view.
 */
const FILL = {
  emerald: "var(--viz-pass)",
  sky: "var(--viz-fixed)",
  amber: "var(--viz-flaky)",
  rose: "var(--viz-fail)",
  orange: "var(--viz-fail-soft)",
  slate: "var(--viz-skip)",
};

export default function CompositionBar({ composition, total }) {
  const slices = (composition || []).filter((c) => c.count > 0);
  if (slices.length === 0) return null;

  const sum = slices.reduce((n, c) => n + c.count, 0) || 1;

  return (
    <div>
      <div className="flex h-[22px] w-full gap-[2px] overflow-hidden rounded-lg">
        {slices.map((slice, i) => (
          <div
            key={slice.key}
            title={`${slice.label}: ${slice.count} of ${total} tests (${slice.pct}%)`}
            style={{
              width: `${(slice.count / sum) * 100}%`,
              background: FILL[slice.tone] || "var(--viz-skip)",
              borderTopLeftRadius: i === 0 ? 4 : 0,
              borderBottomLeftRadius: i === 0 ? 4 : 0,
              borderTopRightRadius: i === slices.length - 1 ? 4 : 0,
              borderBottomRightRadius: i === slices.length - 1 ? 4 : 0,
            }}
          />
        ))}
      </div>

      {/*
        One column, never truncated: these labels are the only thing telling a
        reader which segment is which, so clipping them to "R" and "S" would
        make the colour the sole encoding.
      */}
      <ul className="mt-4 space-y-2">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-baseline gap-2">
            <span
              className="h-2.5 w-2.5 flex-none translate-y-px rounded-sm"
              style={{ background: FILL[slice.tone] || "var(--viz-skip)" }}
              aria-hidden="true"
            />
            <span className="flex-1 text-sm leading-snug text-slate-600">{slice.label}</span>
            <span className="flex-none text-sm font-semibold tabular-nums text-slate-900">
              {slice.count}
            </span>
            <span className="w-11 flex-none text-right text-xs tabular-nums text-slate-400">
              {slice.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
