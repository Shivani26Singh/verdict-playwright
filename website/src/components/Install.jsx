import CodeBlock from "./CodeBlock";
import NpmVersionBadge from "./NpmVersionBadge";
import { NPM_URL } from "../config";

const HIGHLIGHTS = [
  "No account, no API key, no service to stand up",
  "Two production dependencies total (commander, winston)",
  "Works fully offline — zero network calls in the core pipeline",
  "npx works too — try it without installing anything",
];

export default function Install() {
  return (
    <section id="install" className="section-pad border-t border-line/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Install</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Add it to any Playwright project
          </h2>
          <p className="mt-4 text-paper-dim">
            Published on npm as a regular dev dependency —<br className="hidden sm:block" />{" "}
            the full setup walkthrough is in{" "}
            <a href="#how-it-works" className="whitespace-nowrap text-signal underline decoration-signal/30 underline-offset-4">
              How It Works below
            </a>
            .
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-xl">
          <CodeBlock code="npm install --save-dev playwright-flaky-analyzer" language="bash" title="terminal" />

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <NpmVersionBadge />
            <a
              href={NPM_URL}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-paper-dim underline decoration-line underline-offset-4 hover:text-signal"
            >
              view package on npm →
            </a>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h}
                className="flex gap-2.5 rounded-md border border-line/70 bg-ink-800/40 px-4 py-3 text-sm text-paper-dim"
              >
                <span className="mt-0.5 font-mono text-signal">✓</span>
                <span>{h}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-paper-dim/80">
            Requires Node.js ≥ 18 and Playwright ≥ 1.30 for the custom reporter.
          </p>
        </div>
      </div>
    </section>
  );
}
