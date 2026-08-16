import { GITHUB_URL, NPM_URL } from "../config";
import CodeBlock from "./CodeBlock";
import NpmVersionBadge from "./NpmVersionBadge";

const TERMINAL_LINES = [
  { prompt: true, text: "playwright-flaky-analyzer analyze ./flaky-results" },
  { text: "> comparing 12 analyzed runs...", color: "text-term-dim" },
  { text: "> cross-run classification complete", color: "text-term-dim" },
  { text: "> 3 tests flagged flaky, 1 newly failing", color: "text-[#3ddc84]" },
  { text: "> report written: flaky-analysis/index.html", color: "text-term-dim" },
];

export default function Hero() {
  return (
    <section id="overview" className="relative section-pad pt-20 sm:pt-28">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <span className="eyebrow">Open-source · Playwright reporter + CLI</span>
          </div>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-paper sm:text-5xl lg:text-6xl">
            Understand flaky tests across your{" "}
            <span className="text-signal">Playwright</span> runs.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-paper-dim sm:text-lg">
            Analyze Playwright test history, identify tests whose outcomes change across
            runs, visualize flaky-test trends, understand retry behavior, preserve failure
            evidence, and enforce flaky-test limits in CI.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="#install" className="btn-primary">
              Get Started
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-secondary">
              View on GitHub
            </a>
            <a href={NPM_URL} target="_blank" rel="noreferrer" className="btn-secondary">
              View on npm
            </a>
          </div>

          <div className="mt-6 flex justify-center">
            <NpmVersionBadge />
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-2xl">
          <CodeBlock code={"npm install --save-dev playwright-flaky-analyzer"} language="bash" title="terminal" />
          <div className="mt-4 overflow-hidden rounded-lg border border-term-border bg-term-bg p-4 font-mono text-[13px] shadow-soft sm:text-sm">
            {TERMINAL_LINES.map((line, i) => (
              <div key={i} className={line.color || "text-term-text"}>
                {line.prompt ? <span className="prompt-dot">{line.text}</span> : line.text}
              </div>
            ))}
            <span className="mt-1 inline-block h-4 w-2 animate-pulse bg-[#3ddc84]/70 align-middle" />
          </div>
        </div>
      </div>
    </section>
  );
}
