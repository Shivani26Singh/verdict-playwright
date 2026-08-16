export default function AppShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <a href="/" className="text-xl font-bold tracking-tight">
            VERDICT <span className="text-slate-400">— AI-Powered QA Failure Investigator</span>
          </a>
          <a
            href="https://github.com/shivani26singh/playwright-flaky-analyzer"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-slate-500 underline-offset-4 hover:underline"
          >
            GitHub
          </a>
        </div>
      </header>

      <div className="border-b border-sky-200 bg-sky-50">
        <div className="mx-auto max-w-6xl px-4 py-2 text-sm text-sky-800">
          Demo data — synthetic failures from a fictional product (Meridian).
          Deterministic analysis pre-computed from 20 CI runs; AI investigation runs live.
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-slate-500">
          VERDICT — a hackathon demo. Evidence is synthetic; the investigation workflow is real.
        </div>
      </footer>
    </div>
  );
}
