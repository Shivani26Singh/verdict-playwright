import { useEffect, useState } from "react";
import { GITHUB_URL, NPM_URL } from "../config";
import BrandIcon from "./BrandIcon";

const LINKS = [
  { href: "#overview", label: "Overview" },
  { href: "#why", label: "Why" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#install", label: "Install" },
  { href: "#cli", label: "CLI" },
  { href: "#reports", label: "Reports" },
  { href: "#ci-cd", label: "CI/CD" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-ink-950/85 backdrop-blur">
      <div className="container-page flex h-14 items-center justify-between">
        <a href="#overview" className="flex items-center gap-2 font-semibold tracking-tight">
          <BrandIcon className="h-5 w-5 text-signal" />
          <span className="text-[15px] text-paper">
            playwright-flaky<span className="text-signal">-analyzer</span>
          </span>
        </a>

        <nav className="hidden items-center gap-6 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-mono text-[13px] text-paper-dim transition hover:text-signal"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[13px] text-paper-dim transition hover:text-signal"
          >
            GitHub
          </a>
          <a
            href={NPM_URL}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[13px] text-paper-dim transition hover:text-signal"
          >
            npm
          </a>
          <a href="#install" className="btn-primary !py-2 !text-[13px]">
            Get Started
          </a>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded border border-line text-paper lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            {open ? (
              <path
                d="M3 3L15 15M15 3L3 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M2 4.5H16M2 9H16M2 13.5H16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-line/80 bg-ink-950 px-5 pb-5 pt-2 lg:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded px-2 py-2.5 font-mono text-sm text-paper-dim transition hover:bg-ink-800 hover:text-signal"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-4 border-t border-line/80 px-2 pt-3">
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="font-mono text-sm text-paper-dim hover:text-signal">
                GitHub
              </a>
              <a href={NPM_URL} target="_blank" rel="noreferrer" className="font-mono text-sm text-paper-dim hover:text-signal">
                npm
              </a>
            </div>
            <a href="#install" onClick={() => setOpen(false)} className="btn-primary mt-3 w-full">
              Get Started
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
