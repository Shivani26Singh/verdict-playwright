import HistoryStrip from "@/components/home/HistoryStrip.jsx";

const CLASSIFICATION = {
  flaky: { label: "Flaky", dot: "var(--viz-flaky)" },
  stable_failure: { label: "Consistently failing", dot: "var(--viz-fail)" },
  newly_failed: { label: "Newly failing", dot: "var(--viz-fail-soft)" },
  regression: { label: "Regression", dot: "var(--viz-fail)" },
  fixed: { label: "Recently fixed", dot: "var(--viz-fixed)" },
};

/**
 * The failures worth opening. Each card shows the analyzer's own signal and
 * figures but deliberately withholds the AI verdict — that is what the
 * investigation reveals.
 */
export default function FeaturedInvestigations({ featured }) {
  const items = featured || [];
  if (items.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {items.map((item) => {
        const meta = CLASSIFICATION[item.classification] || {
          label: "Unclassified",
          dot: "var(--viz-skip)",
        };
        return (
          <a
            key={item.id}
            href={`/investigate/${item.id}`}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-400 hover:shadow-md"
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 flex-none rounded-full"
                  style={{ background: meta.dot }}
                  aria-hidden="true"
                />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {meta.label}
                </span>
              </div>

              <h3 className="mt-2 text-base font-semibold leading-snug text-slate-900">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </div>

            {/*
              The strip renders exactly the runs the analyzer tracked for this
              test — two cells for a test seen twice. Padding it out to 20
              would imply observations that were never made.
            */}
            <div className="mt-5">
              <HistoryStrip history={item.history} />
              <div className="mt-2.5 flex items-baseline justify-between gap-2 text-xs">
                <span className="tabular-nums text-slate-500">
                  {item.failedCount} of {item.runCount} tracked runs failed
                  {item.transitions > 0
                    ? ` · ${item.transitions} flip${item.transitions === 1 ? "" : "s"}`
                    : ""}
                </span>
                <span className="font-semibold text-slate-900 group-hover:underline">
                  Investigate →
                </span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
