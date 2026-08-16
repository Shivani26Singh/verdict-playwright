import { useState } from "react";

const FAQS = [
  {
    q: "What is a flaky test?",
    a: "A test whose outcome changes across runs without a corresponding code change — it passes sometimes and fails other times against the same code.",
  },
  {
    q: "Does this replace Playwright?",
    a: "No. It's a companion reporter and CLI that runs alongside Playwright, reading its test results — Playwright still runs your tests.",
  },
  {
    q: "Do I need to change my Playwright tests?",
    a: "No test-file changes are required. You add the analyzer's reporter to your Playwright config and run your suite as usual.",
  },
  {
    q: "Do I need Playwright retries enabled?",
    a: "No. Cross-run classification and retry-activity reporting work independently of whether Playwright's own retries option is configured.",
  },
  {
    q: "How many historical runs should I keep?",
    a: "Enough to see a pattern — a handful of runs is usually enough to start spotting flaky behavior; more runs give the trend charts more signal.",
  },
  {
    q: "What does --lookback do?",
    a: "It sets an upper limit on how many historical runs to analyze. If fewer runs exist than the limit, the analyzer simply uses what's available.",
  },
  {
    q: "What is the difference between Flaky Tests Trend and Retries Per Run Trend?",
    a: "Flaky Tests Trend is a cross-run metric — how many tests are classified flaky as of each analyzed run. Retries Per Run Trend is a within-run metric — how many retries happened during each individual Playwright execution.",
  },
  {
    q: "Does it work in CI?",
    a: "Yes — it's a CLI step you add to any pipeline. Your CI system is responsible for persisting the historical result files between builds.",
  },
  {
    q: "Does it modify my tests?",
    a: "No. It only reads Playwright's test result output; it never modifies test files or test behavior.",
  },
  {
    q: "Where are reports generated?",
    a: "Wherever you point --output, defaulting to ./flaky-analysis.html in the current directory when no output path is given.",
  },
  {
    q: "What happens to screenshots/videos/traces?",
    a: "The reporter automatically archives each attempt's evidence into a run-scoped folder, so it stays available for later analysis even after Playwright cleans its own output directory — but only for evidence Playwright actually captured. Screenshot/video/trace capture is off by default in Playwright, so make sure use.screenshot, use.video, and use.trace are set in playwright.config.js.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="section-pad border-t border-line/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">FAQ</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mx-auto mt-10 max-w-3xl divide-y divide-line/70 rounded-lg border border-line">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-paper">{item.q}</span>
                  <span className={`font-mono text-signal transition-transform ${isOpen ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm leading-relaxed text-paper-dim">{item.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
