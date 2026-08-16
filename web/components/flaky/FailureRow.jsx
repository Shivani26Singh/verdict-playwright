"use client";

import HistoryStrip from "@/components/home/HistoryStrip.jsx";

export const CLASSIFICATION = {
  flaky: { label: "Flaky", dot: "var(--viz-flaky)" },
  stable_failure: { label: "Consistently failing", dot: "var(--viz-fail)" },
  newly_failed: { label: "Newly failing", dot: "var(--viz-fail-soft)" },
  regression: { label: "Regression", dot: "var(--viz-fail)" },
  fixed: { label: "Recently fixed", dot: "var(--viz-fixed)" },
  stable_pass: { label: "Recovered on retry", dot: "var(--viz-fixed)" },
};

/**
 * Two different things, deliberately kept apart:
 *
 *   unresolved  — confidence is too low for the engine to name a cause, so the
 *                 signal itself reads "needs manual investigation"
 *   escalated   — the matched rule asks for a person REGARDLESS of confidence
 *
 * Collapsing them would print "needs manual investigation · 99%".
 */
export function isUnresolved(entry) {
  return (Number(entry.confidence) || 0) < 50;
}

function ConfidencePill({ value, unresolved }) {
  const pct = Number(value) || 0;
  return (
    <span
      className="inline-flex cursor-help items-center gap-1.5 text-xs font-semibold tabular-nums"
      title={
        unresolved
          ? `Only ${pct}% — too low for the engine to name a cause, so it declines rather than guessing.`
          : `${pct}% — how strongly this failure's evidence matches the rule's signature. Not the odds a fix will work.`
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: unresolved
            ? "var(--viz-skip)"
            : pct >= 70
              ? "var(--viz-pass)"
              : "var(--viz-flaky)",
        }}
      />
      {pct}%
    </span>
  );
}

/**
 * Artifact indicators.
 *
 * The same glyphs the detailed report uses for these artifacts, so the two
 * surfaces read consistently.
 */
function ArtifactBadges({ artifacts }) {
  const bits = [
    artifacts.screenshots > 0 ? { key: "img", icon: "📷", label: "Screenshot available" } : null,
    artifacts.trace ? { key: "trc", icon: "🔍", label: "Trace available" } : null,
    artifacts.video ? { key: "vid", icon: "▶️", label: "Video available" } : null,
  ].filter(Boolean);

  if (bits.length === 0) {
    return <span className="text-[10px] uppercase tracking-wide text-slate-300">none</span>;
  }

  return (
    <span className="flex gap-1">
      {bits.map((b) => (
        <span
          key={b.key}
          title={b.label}
          role="img"
          aria-label={b.label}
          className="inline-flex cursor-help items-center justify-center rounded bg-slate-100 px-1.5 py-1 text-[11px] leading-none"
        >
          {b.icon}
        </span>
      ))}
    </span>
  );
}

/**
 * One row of the investigation workspace.
 *
 * Dense and scannable when collapsed — name, status, signal, category,
 * confidence, browser, artifacts. Expanding reveals the run history, the
 * error itself, and the four actions, with "Investigate with AI" kept as the
 * primary action rather than buried in a menu.
 */
export default function FailureRow({ entry, open, onToggle }) {
  const meta = CLASSIFICATION[entry.classification] || {
    label: "Unclassified",
    dot: "var(--viz-skip)",
  };
  const unresolved = isUnresolved(entry);
  const recovered = entry.kind === "recovered";

  const statusLine = recovered
    ? `Recovered on retry · ${entry.retriedRuns} of ${entry.runCount} runs needed a retry`
    : `${meta.label} · ${entry.failedCount}/${entry.runCount} runs failed`;

  return (
    <li className={open ? "bg-slate-50/60" : ""}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`grid w-full grid-cols-1 items-center gap-x-4 gap-y-1.5 border-l-2 px-4 py-3 text-left transition hover:bg-slate-50 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_7rem_4.5rem_5.5rem_5rem]`}
        style={{ borderLeftColor: open ? meta.dot : "transparent" }}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span
              className="h-2 w-2 flex-none rounded-full"
              style={{ background: meta.dot }}
              aria-hidden="true"
            />
            <span className="truncate text-sm font-semibold text-slate-900">
              {entry.testName}
            </span>
          </span>
          <span className="mt-1 block pl-4 text-[11px] text-slate-500">{statusLine}</span>
        </span>

        {/*
          Signals are full sentences and a single truncated line loses the
          part that distinguishes them. Wraps to two lines, with the whole
          text on hover for the rare one that still overflows.
        */}
        <span className="min-w-0">
          <span
            className="line-clamp-2 block text-sm leading-snug text-slate-600"
            title={unresolved ? "Needs manual investigation" : entry.pattern}
          >
            {unresolved ? "Needs manual investigation" : entry.pattern}
          </span>
          {entry.requiresHumanReview ? (
            <span className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Human review
            </span>
          ) : null}
        </span>

        <span>
          <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
            {entry.category}
          </span>
        </span>

        <span className="text-right">
          <ConfidencePill value={entry.confidence} unresolved={unresolved} />
        </span>

        <span>
          <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium capitalize text-slate-600">
            {entry.browser}
          </span>
        </span>

        <span className="flex items-center justify-between gap-2">
          <ArtifactBadges artifacts={entry.artifacts} />
          <span
            className={`text-slate-400 transition ${open ? "rotate-90" : ""}`}
            aria-hidden="true"
          >
            ›
          </span>
        </span>
      </button>

      {open ? (
        <div
          className="space-y-4 border-l-2 bg-white px-4 py-4"
          style={{ borderLeftColor: meta.dot }}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {recovered ? "Retry history" : "Run history"}
              </h4>
              <div className="mt-2">
                <HistoryStrip history={entry.history} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {recovered ? (
                  <>
                    Passed in all {entry.runCount} runs, but {entry.retriedRuns} of them only
                    passed after a retry ({entry.totalRetries} retries total). The first attempt
                    failed each time.
                  </>
                ) : (
                  <>
                    {entry.failureRate}% failure rate
                    {entry.transitions > 0 ? ` · ${entry.transitions} pass/fail flips` : ""}
                    {entry.fingerprintGroupCount > 0
                      ? ` · ${entry.fingerprintGroupCount} test(s) share this signature`
                      : ""}
                  </>
                )}
              </p>
              <p className="mt-2 font-mono text-[11px] text-slate-400">
                {entry.codeLocation || entry.file || "location not captured"}
              </p>
            </div>

            <div className="min-w-0">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {recovered ? "First-attempt error" : "Error"}
              </h4>
              {entry.errorHeader ? (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
                  {entry.errorHeader}
                </pre>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  No structured error was captured.
                </p>
              )}
            </div>
          </div>

          {entry.sparse ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Only {entry.evidencePresent} of {entry.evidenceTotal} evidence items were captured.
              AI can still be asked, but it will likely answer that the evidence is
              insufficient — which is the correct answer.
            </p>
          ) : null}

          {/*
            Ordered as the investigation actually runs: read the analysis,
            see which rules fired, inspect the evidence, then ask AI to
            interpret it. The AI action sits last because it is the step the
            others lead to — and keeps the primary styling.
          */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <a
              href={`/investigate/f/${entry.id}`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-500"
            >
              View analysis
            </a>
            <a
              href={`/investigate/f/${entry.id}?tab=rules`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-500"
            >
              Rules applied
            </a>
            <a
              href={`/investigate/f/${entry.id}?tab=evidence`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-500"
            >
              View evidence
            </a>
            <span className="mx-1 hidden h-4 w-px bg-slate-200 sm:inline-block" />
            <a
              href={`/investigate/f/${entry.id}?tab=ai&run=1`}
              className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700"
            >
              Investigate with AI →
            </a>
          </div>
        </div>
      ) : null}
    </li>
  );
}
