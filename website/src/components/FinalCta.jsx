import CodeBlock from "./CodeBlock";
import { GITHUB_URL, NPM_URL } from "../config";

export default function FinalCta() {
  return (
    <section className="section-pad border-t border-line/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl rounded-xl border border-line bg-ink-800/40 p-8 text-center shadow-soft sm:p-12">
          <h2 className="text-xl font-bold tracking-tight text-paper sm:text-2xl">
            Ready to understand your flaky tests?
          </h2>
          <div className="mx-auto mt-6 max-w-md">
            <CodeBlock code="npm install --save-dev playwright-flaky-analyzer" language="bash" />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
        </div>
      </div>
    </section>
  );
}
