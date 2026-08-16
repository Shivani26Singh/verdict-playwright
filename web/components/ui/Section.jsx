/**
 * A titled content region.
 *
 * The accent rule at the top is what separates one card from the next — on a
 * page of white cards on a near-white page, a hairline border alone does not
 * register. The colour carries the section's role, not decoration.
 */
const ACCENT = {
  neutral: "var(--viz-fixed)",
  fixed: "var(--viz-fixed)",
  pass: "var(--viz-pass)",
  flaky: "var(--viz-flaky)",
  fail: "var(--viz-fail)",
  failSoft: "var(--viz-fail-soft)",
  skip: "var(--viz-skip)",
  ai: "#7c3aed",
};

export default function Section({
  title,
  description,
  action,
  children,
  id,
  accent = "neutral",
  className = "",
}) {
  return (
    <section
      id={id}
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div
        aria-hidden="true"
        className="h-1 w-full"
        style={{ background: ACCENT[accent] || ACCENT.neutral }}
      />
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex-none">{action}</div> : null}
        </header>
      ) : null}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
