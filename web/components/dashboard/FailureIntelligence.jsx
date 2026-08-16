"use client";

const SEVERITY_DOT = {
  critical: "var(--viz-fail)",
  high: "var(--viz-fail-soft)",
  medium: "var(--viz-flaky)",
  low: "var(--viz-skip)",
};

/**
 * Plain-English reading of a confidence number, plus where it came from.
 *
 * The score is not a probability the cause is correct — it is how strongly
 * this failure's evidence matches the rule's own signature. Saying so avoids
 * the obvious misreading of "99%".
 */
function confidenceExplanation(pct, group) {
  const band =
    pct >= 90
      ? "Very strong match"
      : pct >= 70
        ? "Strong match"
        : pct >= 50
          ? "Moderate match"
          : "Weak match";

  const lines = [
    `${band} — ${pct}%`,
    "",
    "How this is worked out:",
    "• Each rule starts from a base score set by how distinctive its signature is.",
    "• The score then moves up or down on this suite's own evidence: a fully consistent history and other tests sharing the same failure signature push it up; noisy pass/fail flipping, no recovery on retry, or only a couple of runs to go on pull it down.",
    `• Averaged here across the ${group.tests} test${group.tests === 1 ? "" : "s"} that matched.`,
    "",
    pct < 50
      ? "Below 50% the engine will not name a cause — it says so instead of guessing."
      : "This measures how well the evidence fits the rule, not the odds that a fix will work.",
  ];

  if (group.requiresHumanReview) {
    lines.push("", "This rule always asks for a person, however high the score.");
  }

  return lines.join("\n");
}

function ConfidenceBar({ value, manual, group }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="flex cursor-help items-center gap-2" title={confidenceExplanation(pct, group)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: manual
              ? "var(--viz-skip)"
              : pct >= 70
                ? "var(--viz-pass)"
                : "var(--viz-flaky)",
          }}
        />
      </div>
      <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-700 decoration-slate-300 decoration-dotted underline-offset-2 hover:underline">
        {pct}%
      </span>
    </div>
  );
}

const CONFIDENCE_HEADER_HELP = [
  "Confidence — how strongly this failure's evidence matches the rule's signature.",
  "",
  "It is NOT the probability that the cause is correct, and not a guess at whether a fix will work.",
  "",
  "Each rule has a base score for how distinctive its signature is. That score then moves on this suite's own evidence — a consistent history and other tests sharing the signature raise it; noisy flipping, no retry recovery, or very few runs lower it.",
  "",
  "Below 50% the engine declines to name a cause.",
  "",
  "Hover any individual score for its own reading.",
].join("\n");

/**
 * The analysed failures grouped by the strongest deterministic signal.
 *
 * Deliberately not titled "root cause": a group the engine could not pin down
 * is shown as needing manual investigation rather than being given a cause it
 * does not have.
 *
 * The rows scroll inside the card so all 20 stay reachable without the card
 * dominating the page; the column headers and the summary/actions below stay
 * put.
 */
export default function FailureIntelligence({ groups, total }) {
  const rows = groups || [];
  if (rows.length === 0) return null;

  const manualCount = rows.filter((g) => g.needsManualInvestigation).length;

  return (
    <div>
      <div className="subtle-scroll max-h-[26rem] overflow-y-auto rounded-lg border border-slate-200">
        <table className="w-full table-fixed text-left">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="text-[11px] uppercase tracking-wider text-slate-500">
              <th className="w-[42%] border-b border-slate-200 px-3 py-2 font-semibold">Signal</th>
              <th className="w-[14%] border-b border-slate-200 px-3 py-2 font-semibold">
                Category
              </th>
              <th className="w-[8%] border-b border-slate-200 px-3 py-2 text-right font-semibold">
                Tests
              </th>
              <th
                className="w-[17%] cursor-help border-b border-slate-200 px-3 py-2 font-semibold"
                title={CONFIDENCE_HEADER_HELP}
              >
                Confidence
                <span className="ml-1 text-slate-400" aria-hidden="true">
                  ⓘ
                </span>
              </th>
              <th className="w-[19%] border-b border-slate-200 px-3 py-2 font-semibold">
                Next step
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((g, i) => (
              <tr key={`${g.pattern}-${i}`} className="align-top">
                <td className="px-3 py-2.5">
                  <div className="flex gap-2">
                    <span
                      className="mt-1.5 h-2 w-2 flex-none rounded-full"
                      style={{ background: SEVERITY_DOT[g.severity] || SEVERITY_DOT.medium }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug text-slate-900">
                        {g.pattern}
                      </p>
                      {g.needsManualInvestigation && g.detail !== g.pattern ? (
                        <p className="mt-0.5 text-xs leading-snug text-slate-500">{g.detail}</p>
                      ) : null}
                      <p className="mt-0.5 text-[11px] capitalize text-slate-400">
                        {g.browsers.join(", ")}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-sm text-slate-600">{g.category}</td>
                <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-900">
                  {g.tests}
                </td>
                <td className="px-3 py-2.5">
                  <ConfidenceBar
                    value={g.confidence}
                    manual={g.needsManualInvestigation}
                    group={g}
                  />
                </td>
                <td className="px-3 py-2.5">
                  {g.needsManualInvestigation ? (
                    <span
                      className="inline-block cursor-help rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
                      title="Routed to a person — either the evidence is too weak to name a cause, or this rule always asks for human judgement."
                    >
                      Needs human review
                    </span>
                  ) : (
                    <span
                      className="inline-block cursor-help rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                      title="The deterministic evidence supports this signal. AI can now interpret what it means for this failure."
                    >
                      Evidence supports this signal
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="max-w-xl text-xs text-slate-500">
          {manualCount} of {rows.length} rules need human review because the available evidence
          isn&apos;t strong enough to support a conclusion.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="/rules"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-500"
          >
            View all {rows.length} rules →
          </a>
          <a
            href="/flaky"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-500"
          >
            Investigate {total} failures →
          </a>
        </div>
      </div>
    </div>
  );
}
