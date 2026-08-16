import MainNav from "@/components/MainNav.jsx";
import Logo from "@/components/Logo.jsx";

/**
 * The product frame. The header is a dark bar so it reads as chrome rather
 * than as the first card on the page — the previous white-on-white header
 * dissolved into the content beneath it.
 *
 * The three top-level destinations are peers: the overview, the deep-dive
 * workspace, and the deterministic rule catalogue.
 */
export default function AppShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-3">
          <a href="/" className="group flex items-center gap-3">
            <Logo />
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-[0.14em] text-white">
                VERDICT
              </span>
              <span className="mt-1 hidden text-[11px] font-medium tracking-wide text-slate-400 sm:inline">
                Test failure intelligence for Playwright
              </span>
            </span>
          </a>

          <div className="flex items-center gap-4">
            <MainNav />
            <a
              href="https://github.com/Shivani26Singh/verdict-playwright"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 text-sm font-medium text-slate-300 underline-offset-4 transition hover:text-white hover:underline lg:inline-flex"
            >
              {/* U+FE0F keeps the colour emoji presentation of the arrow. */}
              <span>GitHub</span>
              <span aria-hidden="true" className="text-xs leading-none">
                ↗️
              </span>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500">
          <p className="flex items-center gap-2">
            <span className="font-display font-bold tracking-[0.12em] text-slate-700">
              VERDICT
            </span>
            <span>
              — 20 deterministic rules establish what happened. AI interprets what it means. A
              guard verifies the conclusion.
            </span>
          </p>
          <p>Test failure intelligence for Playwright</p>
        </div>
      </footer>
    </div>
  );
}
