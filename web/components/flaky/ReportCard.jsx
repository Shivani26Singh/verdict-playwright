"use client";

import { useState } from "react";

/**
 * A collapsible report section.
 *
 * Borrows the standalone analyzer report's structure — blue top accent, an
 * uppercase section title, a chevron on the right, the whole header
 * clickable — because that language reads as "one report in sections" rather
 * than "a page of unrelated widgets". The styling is VERDICT's own.
 *
 * Only this outer card collapses. Whatever is inside stays whole, so a reader
 * is never more than one click from the content.
 */
export default function ReportCard({
  title,
  count,
  summary,
  defaultOpen = false,
  accent = "var(--viz-fixed)",
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div aria-hidden="true" className="h-1 w-full" style={{ background: accent }} />

      <h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-left transition hover:bg-slate-50 ${
            open ? "border-b border-slate-200" : ""
          }`}
        >
          <span className="font-display text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
            {title}
          </span>
          {typeof count === "number" ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
              {count}
            </span>
          ) : null}
          {summary ? (
            <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{summary}</span>
          ) : (
            <span className="flex-1" />
          )}
          <span
            aria-hidden="true"
            className={`flex-none text-slate-400 transition-transform ${
              open ? "rotate-90" : ""
            }`}
          >
            ▸
          </span>
        </button>
      </h2>

      {open ? <div className="px-5 py-5">{children}</div> : null}
    </section>
  );
}
