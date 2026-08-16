import FlowDiagram from "./FlowDiagram";

const STEPS = [
  "Run Playwright",
  "New results-run<N>.json",
  "Historical runs accumulate",
  "Run analyzer",
  "HTML / JSON / Markdown",
  "Optional CI gate",
];

const NOTES = [
  "You do not reinstall the package on every run.",
  "You do not reconfigure the reporter on every run.",
  "The reporter simply stays part of your Playwright config.",
  "The accumulated result files are what make cross-run analysis possible.",
];

export default function WorkflowAfterSetup() {
  return (
    <section className="section-pad border-t border-line/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">After setup, your workflow is simple</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Test, analyze, repeat
          </h2>
        </div>

        <div className="mt-10">
          <FlowDiagram steps={STEPS} />
        </div>

        <div className="mx-auto mt-10 grid max-w-2xl gap-3 sm:grid-cols-2">
          {NOTES.map((n) => (
            <div key={n} className="flex gap-3 rounded-md border border-line/70 bg-ink-800/40 px-4 py-3 text-sm text-paper-dim">
              <span className="mt-0.5 font-mono text-signal">✓</span>
              <span>{n}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
