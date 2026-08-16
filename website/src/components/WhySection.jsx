import FlowDiagram from "./FlowDiagram";

const RUN_HISTORY = [
  { run: "Run 1", pass: true },
  { run: "Run 2", pass: false },
  { run: "Run 3", pass: true },
  { run: "Run 4", pass: false },
  { run: "Run 5", pass: true },
];

const PROBLEMS = [
  "Waste investigation time chasing failures that were never real bugs",
  "Create noisy CI failures that erode trust in the pipeline",
  "Reduce confidence in regression results across the whole suite",
  "Hide real failures behind a pattern of \"it's probably just flaky\"",
  "Cause unnecessary pipeline reruns and slower feedback loops",
  "Accumulate unnoticed over time with no cross-run visibility",
];

const PIPELINE = [
  "Playwright Tests",
  "Analyzer Reporter",
  "results-run<N>.json",
  "Historical Runs",
  "Cross-Run Classification",
  "Trends + Reports",
  "Optional CI Quality Gate",
];

export default function WhySection() {
  return (
    <section id="why" className="section-pad border-t border-line/60">
      <div className="container-page">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-10">
          <div>
            <span className="eyebrow">Why flaky tests are a problem</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-paper sm:text-4xl">
              A test that passes here and fails there is hard to trust.
            </h2>
            <p className="mt-4 max-w-lg text-paper-dim">
              Flaky tests — the same test, different outcomes across runs, with nothing in
              your code actually changing — quietly erode confidence in a test suite. Left
              unmeasured, they can:
            </p>
            <ul className="mt-6 space-y-3">
              {PROBLEMS.map((p) => (
                <li key={p} className="flex gap-3 text-sm text-paper-dim">
                  <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-signal" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6 sm:p-8">
            <div className="font-mono text-xs text-paper-dim">same test · five runs</div>
            <div className="mt-4 space-y-2.5">
              {RUN_HISTORY.map((r) => (
                <div
                  key={r.run}
                  className="flex items-center justify-between rounded-md border border-line/70 bg-ink-900/60 px-4 py-2.5 font-mono text-sm"
                >
                  <span className="text-paper-dim">{r.run}</span>
                  <span className={r.pass ? "text-signal" : "text-bad"}>
                    {r.pass ? "✓ pass" : "✕ fail"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-1 border-t border-line/70 pt-5 font-mono text-sm text-paper-dim">
              <div>→ same test</div>
              <div>→ different outcomes</div>
              <div className="text-signal">→ flaky behavior</div>
            </div>
          </div>
        </div>

        <div className="mt-20">
          <div className="text-center">
            <span className="eyebrow">What the tool does</span>
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-paper sm:text-3xl">
              From raw Playwright output to a cross-run verdict
            </h3>
          </div>

          <div className="mt-10">
            <FlowDiagram steps={PIPELINE} />
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-paper-dim">
            The reporter collects each Playwright run's results into a numbered file. The
            analyzer then compares whichever historical result files are available —
            classifying every test, building trends, and generating a report.
          </p>
        </div>
      </div>
    </section>
  );
}
