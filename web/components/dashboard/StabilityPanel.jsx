import Section from "@/components/ui/Section.jsx";
import SeriesChart from "@/components/charts/SeriesChart.jsx";

/**
 * The two series that separate the questions QA people conflate:
 *
 *   Flaky tests per run  — how many tests are UNSTABLE
 *   Retries per run      — how much the suite is RECOVERING
 *
 * A suite can be stable but retry-heavy, or retry-free but deeply flaky.
 * Shown side by side, on their own axes, because they are different measures.
 */
export default function StabilityPanel({ stability }) {
  if (!stability) return null;
  const { flaky, retries } = stability;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section
        title="Flaky tests over time"
        description="Tests whose outcome alternates, counted per run."
        accent="flaky"
      >
        <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-3xl font-bold leading-none text-slate-900">{flaky.current}</span>
          <span className="text-xs text-slate-500">
            now · ranged {flaky.min}–{flaky.max} across the window
          </span>
        </div>
        <SeriesChart series={flaky.series} color="var(--viz-flaky)" unitLabel="flaky tests" />
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600">
          {flaky.interpretation}
        </p>
      </Section>

      <Section
        title="Retries per run"
        description="How hard the suite worked to recover, run by run."
        accent="fixed"
      >
        <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-3xl font-bold leading-none text-slate-900">{retries.current}</span>
          <span className="text-xs text-slate-500">
            in the latest run · {retries.average} average · {retries.total.toLocaleString("en-GB")}{" "}
            total
          </span>
        </div>
        <SeriesChart series={retries.series} color="var(--viz-fixed)" unitLabel="retries" />
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600">
          {retries.interpretation}
        </p>
      </Section>
    </div>
  );
}
