"use client";

import MetricCards from "@/components/investigate/MetricCards.jsx";
import ExecutionHistory from "@/components/investigate/ExecutionHistory.jsx";
import FailurePattern from "@/components/investigate/FailurePattern.jsx";
import ErrorBlock from "@/components/investigate/ErrorBlock.jsx";

/**
 * The Overview tab — "What happened?".
 *
 * This is the deterministic Playwright Flaky Analyzer's own findings, visualised.
 * Every figure comes from the analyzer; the AI has not run at this point.
 */
export default function ObservedPanel({ insights, missing }) {
  const { stats, retry, pattern, error, code, browsers, boundary, confidenceReasons } = insights;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">What happened.</span> Deterministic
          findings across {stats.runs} CI run{stats.runs === 1 ? "" : "s"} — the same answer
          every time. No AI involved yet.
        </p>
      </div>

      <div id="insight-metrics" className="scroll-mt-24">
        <MetricCards stats={stats} retry={retry} />
      </div>

      <div id="insight-history" className="scroll-mt-24">
        <ExecutionHistory stats={stats} />
      </div>

      <div id="insight-pattern" className="scroll-mt-24">
        <FailurePattern pattern={pattern} browsers={browsers} />
      </div>

      <div id="insight-error" className="scroll-mt-24">
        <ErrorBlock error={error} code={code} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {boundary.length > 0 ? (
          <div id="insight-boundary" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-700">Failure behaviour</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {boundary.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {confidenceReasons.length > 0 ? (
          <div id="insight-confidence" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-700">
              How certain the analyzer is
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {confidenceReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {missing.length > 0 ? (
        <p className="text-sm text-slate-400">
          Not captured for this failure: {missing.join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
