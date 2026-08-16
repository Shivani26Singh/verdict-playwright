const ITEMS = [
  {
    problem: "No flaky trend appears",
    fix: "Cross-run classification needs enough historical outcome data — a single run has nothing to compare against. Accumulate at least 2 result files, ideally more, before expecting a meaningful trend.",
  },
  {
    problem: "Only 3 runs analyzed when I requested 20",
    fix: "--lookback is an upper limit, not a requirement. If only 3 result files exist in the results directory, the analyzer uses those 3.",
  },
  {
    problem: "No historical runs in CI",
    fix: "The analyzer only sees result files that exist in the results directory at the time it runs. Your CI system must persist and restore previous result files between builds (for example, via a cache or artifact step).",
  },
  {
    problem: "Evidence unavailable",
    fix: "Evidence archiving is automatic per run/attempt, but it can only archive attachments Playwright actually produced — Playwright's screenshot, video, and trace capture are off by default. Set use.screenshot ('only-on-failure'), use.video ('retain-on-failure'), and use.trace ('retain-on-failure', or similar) in playwright.config.js, then check that the archived evidence directory is present alongside your result files.",
  },
];

export default function Troubleshooting() {
  return (
    <section id="troubleshooting" className="section-pad border-t border-line/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Troubleshooting</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Common issues
          </h2>
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {ITEMS.map((item) => (
            <div key={item.problem} className="card p-5">
              <div className="font-mono text-sm text-bad">{item.problem}</div>
              <p className="mt-2 text-sm text-paper-dim">{item.fix}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
