import CodeBlock from "./CodeBlock";
import FlowDiagram from "./FlowDiagram";

const FLOW = [
  "Playwright test execution",
  "Reporter creates run data",
  "CI persists/restores historical result files",
  "Analyzer runs with --lookback",
  "Report generated",
  "Optional --max-flaky gate",
  "CI artifact publishing",
];

const GATE_EXAMPLE = `npx playwright-flaky-analyzer analyze ./flaky-results \\
  --lookback 20 \\
  --format html \\
  --max-flaky 10`;

export default function CiCd() {
  return (
    <section id="ci-cd" className="section-pad border-t border-line/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">CI / CD</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Drop it into an existing pipeline
          </h2>
        </div>

        <div className="mt-12">
          <FlowDiagram steps={FLOW} wrapLabels />
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h3 className="text-xl font-semibold text-paper">Gate the build on flaky count</h3>
            <p className="mt-3 text-paper-dim">
              If the flaky-test count exceeds the threshold, the process exits with code{" "}
              <code className="font-mono text-signal">1</code>. The report is still generated
              either way — a failing gate never blocks the report from being written.
            </p>
          </div>
          <CodeBlock code={GATE_EXAMPLE} language="bash" title="ci step" />
        </div>

        <div className="mt-10 rounded-lg border border-line/70 bg-ink-800/40 p-5 text-sm text-paper-dim">
          <strong className="text-paper">Important:</strong> the npm package itself does not
          persist historical CI runs across separate builds — that's the responsibility of
          your CI system. For example, Azure DevOps can persist the result directory using
          its own artifact/cache mechanisms; the analyzer simply reads whatever historical
          result files are present in the directory you point it at.
        </div>
      </div>
    </section>
  );
}
