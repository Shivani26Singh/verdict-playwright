import { healthBand, formatDate } from "@/lib/suite.js";

const RING = {
  pass: "var(--viz-pass)",
  flaky: "var(--viz-flaky)",
  fail: "var(--viz-fail)",
};

/**
 * The page's hero. The health score is the one number a QA lead looks at
 * first, so it gets the dial; everything beside it says what the score was
 * computed from.
 */
export default function SuiteHeader({ dashboard }) {
  const { dataset, health, latestRun } = dashboard;
  const band = healthBand(health.score);
  const colour = RING[band.tone] || RING.flaky;
  const circumference = 2 * Math.PI * 42;
  const dash = (Math.min(100, Math.max(0, health.score)) / 100) * circumference;

  const window = [formatDate(dataset.firstRunAt), formatDate(dataset.lastRunAt)]
    .filter(Boolean)
    .join(" – ");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
        <div className="flex items-center gap-5">
          <div className="relative flex-none">
            <svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label={`Suite health score ${health.score} out of 100 — ${band.label}`}>
              <circle cx="52" cy="52" r="42" fill="none" stroke="var(--viz-grid)" strokeWidth="8" />
              <circle
                cx="52"
                cy="52"
                r="42"
                fill="none"
                stroke={colour}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
                transform="rotate(-90 52 52)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold leading-none text-slate-900">
                {health.score}
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                / 100
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: colour }}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-slate-900">{band.label}</span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
              Suite health
            </h1>
            {/*
              One line on desktop: the pass rate and the window it covers read
              as a single fact, so a wrap between them is a false break. Falls
              back to normal wrapping below lg.
            */}
            <p className="mt-1 text-sm leading-relaxed text-slate-500 lg:whitespace-nowrap">
              {health.passRate}% of executions passed across the analysed window
              {window ? ` · ${window}` : ""}
            </p>
          </div>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          {[
            { label: "Runs analysed", value: dataset.runs },
            { label: "Tests tracked", value: dataset.tests },
            { label: "Executions", value: dataset.executions.toLocaleString("en-GB") },
            { label: "Browsers", value: dataset.browsers },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {item.label}
              </dt>
              <dd className="mt-1 text-2xl font-bold leading-none text-slate-900">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {latestRun.label ? (
        <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span className="font-medium text-slate-700">Latest ({latestRun.label}):</span>{" "}
          {latestRun.total} tests — {latestRun.passed} passed, {latestRun.failed} failed
          {latestRun.skipped ? `, ${latestRun.skipped} skipped` : ""} ({latestRun.passRate}%
          pass rate).
        </p>
      ) : null}
    </section>
  );
}
