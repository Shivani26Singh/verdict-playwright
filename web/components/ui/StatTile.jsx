/**
 * A single headline figure.
 *
 * The status rides on a coloured rule down the left edge — the same device the
 * detailed report uses — rather than on the number's own colour, so the figure
 * stays in text ink and readable at a glance.
 */
const ACCENT = {
  pass: "var(--viz-pass)",
  fixed: "var(--viz-fixed)",
  flaky: "var(--viz-flaky)",
  fail: "var(--viz-fail)",
  failSoft: "var(--viz-fail-soft)",
  skip: "var(--viz-skip)",
  neutral: "#94a3b8",
};

export default function StatTile({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
  emphasis,
  compact,
  title,
}) {
  return (
    <div
      title={title}
      className={`relative overflow-hidden rounded-xl border bg-white ${
        compact ? "p-3 pl-4" : "p-4 pl-5"
      } ${emphasis ? "border-slate-300 shadow-sm" : "border-slate-200"}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: ACCENT[tone] || ACCENT.neutral }}
      />
      {/*
        Two lines are reserved for the label so a wrapping one ("Passing on
        retry") does not push its value below the others in the same row.
      */}
      <span
        className={`flex items-start font-semibold uppercase leading-tight tracking-wider text-slate-500 ${
          compact ? "min-h-[1.9rem] text-[10px]" : "min-h-[2rem] text-[11px]"
        }`}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className={`font-bold leading-none text-slate-900 ${
            emphasis ? "text-4xl" : compact ? "text-2xl" : "text-3xl"
          }`}
        >
          {value}
        </span>
        {unit ? <span className="text-sm font-medium text-slate-400">{unit}</span> : null}
      </div>
      {hint ? <p className="mt-1.5 text-xs leading-snug text-slate-500">{hint}</p> : null}
    </div>
  );
}
