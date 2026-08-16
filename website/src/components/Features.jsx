const FEATURES = [
  {
    tag: "01",
    title: "Cross-Run Flaky Test Detection",
    desc: "Identifies tests whose outcomes change across analyzed Playwright runs — not just a single execution.",
  },
  {
    tag: "02",
    title: "Flaky Tests Trend",
    desc: "Shows how the number of flaky tests changes from run to run, based on cross-run classification.",
  },
  {
    tag: "03",
    title: "Retries Per Run Trend",
    desc: "Shows retry activity within each individual Playwright execution — a separate, within-run signal.",
  },
  {
    tag: "04",
    title: "Evidence Retention",
    desc: "Automatically archives failure evidence per run/attempt, so historical screenshots, videos, and traces survive later Playwright executions that reuse the same output directory.",
  },
  {
    tag: "05",
    title: "HTML / JSON / Markdown Reports",
    desc: "An interactive HTML dashboard, machine-readable JSON, or a Markdown summary for PRs and CI — pick per run.",
  },
  {
    tag: "06",
    title: "Configurable Lookback",
    desc: "Analyze up to a chosen number of historical runs with --lookback <n> — it's a ceiling, not a requirement.",
  },
  {
    tag: "07",
    title: "CI Quality Gate",
    desc: "Use --max-flaky <n> to fail the build when the flaky-test count exceeds your threshold. Opt-in, off by default.",
  },
  {
    tag: "08",
    title: "Playwright Reporter",
    desc: "Integrates through Playwright's own reporter configuration — no separate service, no test-file changes.",
  },
];

export default function Features() {
  return (
    <section id="features" className="section-pad border-t border-line/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Key features</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Built for engineers who own CI stability
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.tag} className="card flex flex-col gap-3 p-5">
              <span className="font-mono text-xs text-signal">{f.tag}</span>
              <h3 className="text-[15px] font-semibold text-paper">{f.title}</h3>
              <p className="text-sm leading-relaxed text-paper-dim">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
