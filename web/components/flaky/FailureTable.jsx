"use client";

import { useMemo, useState } from "react";
import FailureRow, { CLASSIFICATION } from "@/components/flaky/FailureRow.jsx";

const HEADER =
  "hidden grid-cols-[minmax(0,3fr)_minmax(0,2fr)_7rem_4.5rem_5.5rem_5rem] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 pl-[18px] text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:grid";

/**
 * The failure workspace: every analysed failure, searchable and filterable,
 * each row expanding to its history, error, and actions.
 *
 * Dense by default so a QA engineer can scan 78 rows, with the detail behind
 * progressive disclosure rather than removed.
 */
export default function FailureTable({ failures, categories, classifications, browsers }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [classification, setClassification] = useState("all");
  const [browser, setBrowser] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return failures.filter((f) => {
      if (category !== "all" && f.category !== category) return false;
      if (classification !== "all" && f.classification !== classification) return false;
      if (browser !== "all" && f.browser !== browser) return false;
      if (!q) return true;
      return (
        f.testName.toLowerCase().includes(q) ||
        (f.pattern || "").toLowerCase().includes(q) ||
        (f.errorHeader || "").toLowerCase().includes(q) ||
        (f.file || "").toLowerCase().includes(q)
      );
    });
  }, [failures, query, category, classification, browser]);

  const selectClass =
    "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-slate-500 focus:outline-none";

  return (
    <div>
      {/* One filter row above everything it scopes. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search test, signal, error, file…"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
        />
        <select
          value={classification}
          onChange={(e) => setClassification(e.target.value)}
          className={selectClass}
        >
          <option value="all">All statuses</option>
          {classifications.map((c) => (
            <option key={c} value={c}>
              {(CLASSIFICATION[c] && CLASSIFICATION[c].label) || c}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={selectClass}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={browser}
          onChange={(e) => setBrowser(e.target.value)}
          className={selectClass}
        >
          <option value="all">All browsers</option>
          {browsers.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <span className="text-xs tabular-nums text-slate-500">
          {visible.length} of {failures.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className={HEADER}>
          <span>Test</span>
          <span>Detected signal</span>
          <span>Category</span>
          <span className="text-right">Conf.</span>
          <span>Browser</span>
          <span>Evidence</span>
        </div>

        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            No failure matches these filters.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((f) => (
              <FailureRow
                key={f.id}
                entry={f}
                open={expanded === f.id}
                onToggle={() => setExpanded(expanded === f.id ? null : f.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
