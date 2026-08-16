const TONE = {
  good: "var(--viz-pass)",
  warn: "var(--viz-flaky)",
  bad: "var(--viz-fail)",
  neutral: "var(--viz-skip)",
};

/**
 * What a QA engineer needs to know about this suite before drilling in.
 * Each item is one fact read off the analyzer with a plain-English reading of
 * what it means — not the analyzer's own prose paragraph verbatim.
 */
export default function RunHighlights({ highlights }) {
  const items = highlights || [];
  if (items.length === 0) return null;

  return (
    <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.key} className="flex gap-2.5">
          <span
            className="mt-1.5 h-2 w-2 flex-none rounded-full"
            style={{ background: TONE[item.tone] || TONE.neutral }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {item.label}
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-900">
              {item.value}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">{item.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
