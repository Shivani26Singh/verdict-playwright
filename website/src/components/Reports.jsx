import CodeBlock from "./CodeBlock";
import FlowDiagram from "./FlowDiagram";

const FLAKY_TREND = [0, 0, 1, 3];
const RETRY_TREND = [2, 5, 1, 4];
const RUN_LABELS = ["Run 1", "Run 2", "Run 3", "Run 4"];

const DASHBOARD_SECTIONS = [
  "Suite Summary",
  "Flaky Tests Trend",
  "Retries Per Run Trend",
  "Run Highlights",
  "Failed Tests",
  "Passing on Retry",
  "Skipped Tests",
  "Additional Metrics",
];

const FORMATS = [
  {
    name: "HTML",
    flag: "--format html",
    use: "Interactive visual investigation — search, filter, evidence viewer, trend charts. The default format.",
  },
  {
    name: "JSON",
    flag: "--format json",
    use: "Machine-readable structured data for automation and downstream processing.",
  },
  {
    name: "Markdown",
    flag: "--format markdown",
    use: "Plain-text summary for pull requests, CI job summaries, and documentation.",
  },
];

// Bars + a connected trend line through each bar's value, drawn in one SVG
// so the line's points land exactly on the bar tops — matching the real
// product's "bar+line chart with a connected trend line" (see README).
function MiniChart({ values, barClass, lineClass }) {
  const max = Math.max(...values, 1);
  const slot = 100;
  const W = values.length * slot;
  const H = 120;
  const barMaxH = 92;
  const barW = 56;

  const points = values.map((v, i) => ({
    x: i * slot + slot / 2,
    y: H - (v / max) * barMaxH - 6,
  }));
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full sm:h-32" preserveAspectRatio="none">
        {values.map((v, i) => {
          const barH = Math.max((v / max) * barMaxH, 3);
          return (
            <rect
              key={i}
              x={i * slot + (slot - barW) / 2}
              y={H - barH}
              width={barW}
              height={barH}
              rx={4}
              className={barClass}
            />
          );
        })}
        <polyline points={linePoints} fill="none" strokeWidth={2.5} className={lineClass} />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} strokeWidth={2} className={`fill-ink-900 ${lineClass}`} />
        ))}
      </svg>
      <div className="mt-2 flex">
        {values.map((_, i) => (
          <span key={i} className="flex-1 text-center font-mono text-[11px] text-paper-dim">
            {RUN_LABELS[i]}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Reports() {
  return (
    <section id="reports" className="section-pad border-t border-line/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Reports</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Two trends, one report — and they measure different things
          </h2>
        </div>

        {/* Flaky Tests Trend */}
        <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="card p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-mono text-sm text-paper">Flaky Tests Trend</h3>
              <span className="rounded-full bg-signal/10 px-2.5 py-0.5 font-mono text-[11px] text-signal">
                cross-run
              </span>
            </div>
            <MiniChart values={FLAKY_TREND} barClass="fill-signal/45" lineClass="stroke-signal" />
            <p className="mt-5 font-mono text-xs text-paper-dim">
              "Flaky tests increased from 0 to 3 across the analyzed runs."
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-paper">Flaky Tests Trend</h3>
            <p className="mt-4 text-paper-dim">
              Shows the number of tests classified as flaky across the analyzed Playwright
              runs. This is a <strong className="text-paper">cross-run</strong> metric — it
              reflects the same cross-run classification used everywhere else in the report,
              not Playwright's own in-run retry signal.
            </p>
          </div>
        </div>

        {/* Retries Per Run Trend */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <h3 className="text-2xl font-bold tracking-tight text-paper">
              Retries Per Run Trend
            </h3>
            <p className="mt-4 text-paper-dim">
              Shows retry activity <strong className="text-paper">within</strong> each
              individual Playwright execution — how many retries that specific run needed to
              reach its final results.
            </p>
          </div>
          <div className="card order-1 p-6 sm:p-8 lg:order-2">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-mono text-sm text-paper">Retries Per Run Trend</h3>
              <span className="rounded-full bg-paper/10 px-2.5 py-0.5 font-mono text-[11px] text-paper-dim">
                within-run
              </span>
            </div>
            <MiniChart values={RETRY_TREND} barClass="fill-paper-dim/35" lineClass="stroke-paper-dim" />
            <p className="mt-5 font-mono text-xs text-paper-dim">
              retries per run: 2 → 5 → 1 → 4
            </p>
          </div>
        </div>

        {/* Comparison callout */}
        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line sm:grid-cols-2">
          <div className="bg-ink-800/60 p-6">
            <div className="font-mono text-xs text-signal">FLAKY TESTS TREND</div>
            <div className="mt-2 text-sm font-semibold text-paper">
              Cross-run stability signal
            </div>
            <p className="mt-2 text-sm text-paper-dim">
              "How many tests are flaky across my analyzed history?"
            </p>
          </div>
          <div className="bg-ink-800/60 p-6">
            <div className="font-mono text-xs text-paper-dim">RETRIES PER RUN TREND</div>
            <div className="mt-2 text-sm font-semibold text-paper">
              Within-run retry activity
            </div>
            <p className="mt-2 text-sm text-paper-dim">
              "How many retries happened during each individual run?"
            </p>
          </div>
        </div>

        {/* Evidence retention */}
        <div className="mt-20 grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center lg:gap-14">
          <div>
            <span className="eyebrow">Evidence retention</span>
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-paper sm:text-3xl">
              Screenshots, videos, and traces that outlive the run
            </h3>
            <p className="mt-4 text-paper-dim">
              Evidence archiving is automatic — you don't write a custom evidence-copying
              workaround per project. The reporter archives evidence per run/attempt so
              historical evidence can survive later Playwright executions that reuse the same
              output directory. Because historical evidence is retained rather than discarded,
              disk usage grows with your result-file history; the tool does not invent its own
              cleanup policy on top of that.
            </p>

            <div className="mt-6 rounded-lg border border-line/70 bg-ink-800/40 p-5">
              <p className="text-sm text-paper-dim">
                <strong className="text-paper">There's only something to archive if Playwright captured it.</strong>{" "}
                Screenshots, videos, and traces are off by default in Playwright — set them in{" "}
                <code className="font-mono text-signal">playwright.config.js</code>, or the
                reporter has nothing to copy:
              </p>
              <div className="mt-4">
                <CodeBlock
                  code={`use: {\n  screenshot: 'only-on-failure',\n  video: 'retain-on-failure',\n  trace: 'retain-on-failure',\n}`}
                  language="js"
                  title="playwright.config.js"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-start">
            <FlowDiagram
              steps={["Test failure", "Playwright attachment", "Reporter archives evidence", "Run-specific evidence", "Historical analysis", "Report"]}
              vertical
            />
          </div>
        </div>

        {/* Output formats */}
        <div className="mt-20">
          <span className="eyebrow">Output formats</span>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-paper sm:text-3xl">
            HTML, JSON, or Markdown
          </h3>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {FORMATS.map((f) => (
              <div key={f.name} className="card p-5">
                <div className="font-mono text-sm text-signal">{f.name}</div>
                <p className="mt-2 text-sm text-paper-dim">{f.use}</p>
                <code className="mt-3 block font-mono text-xs text-paper-dim">{f.flag}</code>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <CodeBlock
              code={"playwright-flaky-analyzer analyze ./flaky-results --format html --also-json"}
              language="bash"
              title="also write the companion .json dashboard file alongside HTML"
            />
          </div>
        </div>

        {/* Mock dashboard */}
        <div className="mt-20">
          <span className="eyebrow">Inside the HTML report</span>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-paper sm:text-3xl">
            One self-contained dashboard
          </h3>
          <div className="mt-8 overflow-hidden rounded-lg border border-line bg-ink-900 shadow-soft">
            <div className="flex items-center gap-1.5 border-b border-line bg-ink-700/60 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e5504a]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#e0a83f]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-signal/70" />
              <span className="ml-3 font-mono text-xs text-paper-dim">flaky-analysis/index.html</span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
              {DASHBOARD_SECTIONS.map((s) => (
                <div
                  key={s}
                  className="rounded-md border border-line/70 bg-ink-800/50 px-3 py-4 text-center font-mono text-[12px] text-paper-dim"
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
