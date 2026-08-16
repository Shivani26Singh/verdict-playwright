"use client";

import Spinner from "@/components/ui/Spinner.jsx";

const SEVERITY = {
  critical: { label: "Critical", dot: "var(--viz-fail)" },
  high: { label: "High", dot: "var(--viz-fail-soft)" },
  medium: { label: "Medium", dot: "var(--viz-flaky)" },
  low: { label: "Low", dot: "var(--viz-skip)" },
};

function ConfidenceBar({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: pct >= 70 ? "var(--viz-pass)" : pct >= 40 ? "var(--viz-flaky)" : "var(--viz-fail-soft)",
        }}
      />
    </div>
  );
}

/**
 * Which deterministic rule fired for THIS failure, and everything it produced:
 * what it detected, why it matched, how the confidence was arrived at, and the
 * concrete checks it suggests. This all happened before the AI was asked
 * anything.
 */
function HandoffToAi({ onInvestigate, investigating, investigateLabel, rule }) {
  if (typeof onInvestigate !== "function") return null;
  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-5">
      <h3 className="text-sm font-semibold text-violet-900">What the AI does with this</h3>
      <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-violet-800">
        The signals above are facts, not a conclusion. The model receives all of them — the
        matched rule, its confidence, the execution history, and the captured evidence — and
        decides what they add up to. It may agree{rule && rule.requiresHumanReview
          ? ", or confirm that this genuinely needs a person"
          : ", find the evidence mixed, prefer a different explanation, or decline for lack of evidence"}
        .
      </p>
      <button
        type="button"
        onClick={onInvestigate}
        disabled={investigating}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {investigating ? <Spinner label={investigateLabel} /> : "Investigate with AI →"}
      </button>
    </div>
  );
}

export default function RulesAppliedTab({
  rule,
  insights,
  confidence,
  band,
  confidenceReasons,
  onInvestigate,
  investigating,
  investigateLabel,
}) {
  if (!rule) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-sm font-semibold text-slate-700">No rule matched this failure</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            None of the deterministic rules recognised this failure signature. That is itself a
            finding — and the reason any verdict here should be cautious.
          </p>
          <a
            href="/rules"
            className="mt-4 inline-block text-sm font-medium text-sky-700 underline-offset-4 hover:underline"
          >
            See all detection rules →
          </a>
        </div>
        <HandoffToAi
          onInvestigate={onInvestigate}
          investigating={investigating}
          investigateLabel={investigateLabel}
          rule={null}
        />
      </div>
    );
  }

  const severity = SEVERITY[rule.severity] || SEVERITY.medium;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Detected signals.</span> This failure was
          put through all 20 deterministic rules before any model was asked. One matched — the
          same match, every time.
        </p>
      </div>

      <article className="rounded-2xl border-2 border-slate-300 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: severity.dot }}
            aria-hidden="true"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {rule.category}
          </span>
          <span className="text-[11px] text-slate-300">·</span>
          <span className="text-[11px] text-slate-400">{severity.label} severity</span>
          {rule.requiresHumanReview ? (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Escalates to human review
            </span>
          ) : null}
          <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            {rule.code}
          </span>
        </div>

        <h2 className="mt-3 text-xl font-bold leading-snug tracking-tight text-slate-900">
          {rule.name}
        </h2>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              What was detected
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
              {rule.evidence || rule.explanation}
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Why it matched
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{rule.explanation}</p>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Confidence in this match
            </h3>
            <span className="text-sm font-bold tabular-nums text-slate-900">
              {confidence}%{band ? <span className="ml-1.5 text-xs font-medium text-slate-400">{band}</span> : null}
            </span>
          </div>
          <ConfidenceBar value={confidence} />
          {confidenceReasons && confidenceReasons.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {confidenceReasons.map((reason) => (
                <li key={reason} className="flex gap-2 text-xs leading-relaxed text-slate-600">
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Started from a base of {rule.baseConfidence}% for this rule.
            </p>
          )}
        </div>
      </article>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">
          Suggested checks
          <span className="ml-2 text-xs font-normal text-slate-500">
            {rule.suggestedChecks.length} concrete things to look at
          </span>
        </h3>
        <ol className="mt-3 space-y-2.5">
          {rule.suggestedChecks.map((check, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-slate-700">{check}</span>
            </li>
          ))}
        </ol>
      </div>

      {insights && insights.pattern && insights.pattern.similarCount > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-800">Corroboration</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            {insights.pattern.similarCount} other test
            {insights.pattern.similarCount === 1 ? "" : "s"} in this suite produced the same
            failure signature. Shared signatures raise the confidence in the match — an
            isolated one-off lowers it.
          </p>
        </div>
      ) : null}

      <HandoffToAi
        onInvestigate={onInvestigate}
        investigating={investigating}
        investigateLabel={investigateLabel}
        rule={rule}
      />

      <p className="text-xs text-slate-500">
        This rule is one of 20.{" "}
        <a href="/rules" className="font-medium text-sky-700 underline-offset-4 hover:underline">
          See the full catalogue →
        </a>
      </p>
    </div>
  );
}
