/**
 * A companion capability, not part of VERDICT.
 *
 * The point it makes is narrow: AI is an optional layer here, and deterministic
 * Playwright analysis is available to someone who has no AI access at all.
 * Visually strong enough to be noticed at the foot of the page, deliberately
 * on a different surface from the product's own cards so it never reads as
 * another VERDICT feature.
 */
export default function OfflineAnalyzerCta() {
  return (
    <aside className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-6 p-7">
        <div className="flex min-w-0 max-w-xl gap-4">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-slate-800"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              {/* Plug: works unplugged from any AI provider. */}
              <path
                d="M9 3v5M15 3v5"
                stroke="#12866b"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z"
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M12 17v4" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>

          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold tracking-tight text-white">
              Need analysis without AI?
            </h2>
            <p className="mt-1 text-sm font-semibold text-emerald-300">You&apos;re still covered.</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Run deterministic Playwright failure analysis — no AI or API key required.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <a
            href="https://playwright-flaky-analyzer.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Open Offline Analyzer →
          </a>
          <a
            href="https://www.npmjs.com/package/playwright-flaky-analyzer"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 underline-offset-4 transition hover:text-white hover:underline"
          >
            {/* Same colour-emoji arrow treatment as the GitHub link. */}
            <span>npm package</span>
            <span aria-hidden="true" className="text-xs leading-none">
              ↗️
            </span>
          </a>
        </div>
      </div>
    </aside>
  );
}
