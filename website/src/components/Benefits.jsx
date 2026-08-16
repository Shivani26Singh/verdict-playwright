const BENEFITS = [
  "Less manual flaky-test investigation",
  "Better CI signal",
  "Historical visibility",
  "Evidence preservation",
  "Consistent reporting",
  "Automated quality gates",
  "Simple Playwright integration",
  "Multiple output formats",
];

export default function Benefits() {
  return (
    <section className="section-pad border-t border-line/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Benefits</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Why use Playwright Flaky Analyzer?
          </h2>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div
              key={b}
              className="rounded-md border border-line/70 bg-ink-800/40 px-4 py-4 text-sm text-paper"
            >
              <span className="mr-2 font-mono text-signal">＋</span>
              {b}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
