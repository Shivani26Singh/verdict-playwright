import CodeBlock from "./CodeBlock";

const COMMANDS = [
  { cmd: "playwright-flaky-analyzer --help", desc: "Show usage and available commands." },
  { cmd: "playwright-flaky-analyzer --version", desc: "Print the installed package version." },
  { cmd: "playwright-flaky-analyzer init", desc: "Scaffold a flaky.config.json in the current directory. Exits with an error if one already exists." },
  { cmd: "playwright-flaky-analyzer analyze [reports-folder]", desc: "Compare the available historical Playwright JSON reports and generate a report." },
];

const OPTIONS = [
  {
    flag: "-o, --output <path>",
    purpose: "Output file path",
    default: "./flaky-analysis.html",
    example: "analyze ./flaky-results -o dashboard.html",
    exit: "No",
  },
  {
    flag: "-f, --format <format>",
    purpose: "Output format: html, json, or markdown",
    default: "html",
    example: "analyze ./flaky-results --format markdown",
    exit: "No",
  },
  {
    flag: "--also-json",
    purpose: "With --format html, also write the companion .json dashboard data",
    default: "off",
    example: "analyze ./flaky-results --format html --also-json",
    exit: "No",
  },
  {
    flag: "--no-copy-evidence",
    purpose: "With --format html, keep a single .html with file:// links instead of a portable evidence bundle",
    default: "copy evidence (on)",
    example: "analyze ./flaky-results --no-copy-evidence",
    exit: "No",
  },
  {
    flag: "--min-failures <n>",
    purpose: "Minimum pass/fail transitions required to flag a test as flaky",
    default: "2",
    example: "analyze ./flaky-results --min-failures 3",
    exit: "No",
  },
  {
    flag: "--lookback <n>",
    purpose: "Maximum number of historical runs to analyze",
    default: "10",
    example: "analyze ./flaky-results --lookback 20",
    exit: "No",
  },
  {
    flag: "-v, --verbose",
    purpose: "Enable verbose/debug logging",
    default: "off",
    example: "analyze ./flaky-results --verbose",
    exit: "No",
  },
  {
    flag: "--max-flaky <n>",
    purpose: "CI quality gate — fail the build if the flaky-test count exceeds n. Opt-in.",
    default: "unset (no gate)",
    example: "analyze ./flaky-results --max-flaky 10",
    exit: "Yes — exit 1 if exceeded",
  },
  {
    flag: "-c, --config <path>",
    purpose: "Path to a flaky.config.json to use instead of the default location",
    default: "./flaky.config.json if present",
    example: "analyze --config ./ci/flaky.config.json",
    exit: "No",
  },
  {
    flag: "-d, --results-dir <path>",
    purpose: "Directory containing Playwright JSON reports (alternative to the positional argument)",
    default: "—",
    example: "analyze --results-dir ./flaky-results",
    exit: "No",
  },
];

export default function CliReference() {
  return (
    <section id="cli" className="section-pad border-t border-line/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">CLI reference</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Every command, verified against source
          </h2>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {COMMANDS.map((c) => (
            <div key={c.cmd} className="card p-4">
              <code className="block overflow-x-auto whitespace-pre font-mono text-[13px] text-signal">
                $ {c.cmd}
              </code>
              <p className="mt-2 text-sm text-paper-dim">{c.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-14 text-lg font-semibold text-paper">
          <span className="font-mono text-signal">analyze</span> options
        </h3>
        <div className="mt-5 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ink-800/60 text-xs uppercase tracking-wide text-paper-dim">
                <th className="px-4 py-3 font-medium">Flag</th>
                <th className="px-4 py-3 font-medium">Purpose</th>
                <th className="px-4 py-3 font-medium">Default</th>
                <th className="px-4 py-3 font-medium">Exit status?</th>
              </tr>
            </thead>
            <tbody>
              {OPTIONS.map((o, i) => (
                <tr
                  key={o.flag}
                  className={i % 2 === 0 ? "bg-ink-900/40" : "bg-transparent"}
                >
                  <td className="px-4 py-3 font-mono text-[13px] text-signal">{o.flag}</td>
                  <td className="px-4 py-3 text-paper-dim">{o.purpose}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-paper-dim">{o.default}</td>
                  <td className="px-4 py-3 text-paper-dim">{o.exit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-paper-dim/70">
          Reference only — see each row's example below the table for exact usage.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((o) => (
            <CodeBlock key={o.flag} code={`playwright-flaky-analyzer ${o.example}`} language="bash" />
          ))}
        </div>

        <div className="mt-16">
          <span className="eyebrow">--lookback</span>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-paper">
            A ceiling, not a requirement
          </h3>
          <p className="mt-4 max-w-2xl text-paper-dim">
            <code className="font-mono text-signal">--lookback 20</code> means: analyze up
            to the last 20 historical runs. If only 3 runs exist, the analyzer uses the 3
            that are available — it does not require exactly 20 runs to exist, and it
            never errors because fewer runs were found than the ceiling allows.
          </p>
          <div className="mt-6">
            <CodeBlock
              code="npx playwright-flaky-analyzer analyze ./flaky-results --lookback 20"
              language="bash"
              title="only 3 runs on disk → analyzes all 3"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
