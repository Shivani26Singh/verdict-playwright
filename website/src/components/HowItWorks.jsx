import CodeBlock from "./CodeBlock";

const REPORTER_SNIPPET = `module.exports = {
  reporter: [
    ['list'],
    ['playwright-flaky-analyzer/reporter', {
      outputFile: './flaky-results/results.json'
    }],
  ],
};`;

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-pad border-t border-line/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Four steps, start to finish
          </h2>
        </div>

        <div className="mt-14 space-y-14">
          <Step number="01" title="Install">
            <CodeBlock code="npm install --save-dev playwright-flaky-analyzer" language="bash" />
          </Step>

          <Step number="02" title="Configure">
            <p className="mb-4 text-sm text-paper-dim">
              Add the analyzer reporter to your Playwright config. Keep its output outside
              Playwright's own <code className="font-mono text-signal">outputDir</code> (default:{" "}
              <code className="font-mono text-signal">test-results</code>) — Playwright may
              clean that directory before each run, and this file needs to survive across
              runs to be compared.
            </p>
            <CodeBlock code={REPORTER_SNIPPET} language="js" title="playwright.config.js" />
          </Step>

          <Step number="03" title="Run">
            <p className="mb-4 text-sm text-paper-dim">
              Run your suite as usual. Each execution writes a new numbered result file next
              to the last one.
            </p>
            <CodeBlock code="npx playwright test" language="bash" />
            <div className="mt-4 rounded-lg border border-line bg-ink-900/60 p-4 font-mono text-[13px] text-paper-dim">
              <div>flaky-results/results-run1.json</div>
              <div>flaky-results/results-run2.json</div>
              <div>flaky-results/results-run3.json</div>
              <div className="text-paper-dim/60">...</div>
            </div>
          </Step>

          <Step number="04" title="Analyze">
            <p className="mb-4 text-sm text-paper-dim">
              Run the analyzer over the accumulated result files. It compares whichever
              historical runs are available and writes a report.
            </p>
            <CodeBlock
              code="npx playwright-flaky-analyzer analyze ./flaky-results --lookback 20 --format html"
              language="bash"
            />
          </Step>

          <Step number="05" title="Open the report">
            <p className="text-sm text-paper-dim">
              Open the generated <code className="font-mono text-signal">flaky-analysis/index.html</code>{" "}
              in any browser — no server required.
            </p>
          </Step>
        </div>
      </div>
    </section>
  );
}

// Fixed label-column width (not "auto") so every step's code block starts at
// the same x position — each Step is its own grid, and "auto" sizes the
// column per-instance from that step's own title length alone.
function Step({ number, title, children }) {
  return (
    <div className="grid gap-6 sm:grid-cols-[9rem,1fr] sm:gap-8">
      <div className="flex items-start gap-4 sm:flex-col sm:items-start sm:gap-2">
        <span className="font-mono text-2xl text-signal/70">{number}</span>
        <h3 className="text-lg font-semibold text-paper sm:mt-1">{title}</h3>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
