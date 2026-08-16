"use client";

import { useState } from "react";

/**
 * The Verdict Guard, made visible even when everything agrees.
 *
 * The guard is deterministic code that runs on the model's answer before a
 * human sees it: it strips citations of evidence that does not exist, drops
 * unsupported reasoning, and reconciles the AI's confidence against the
 * analyzer's own. When it finds nothing wrong that IS the result worth
 * showing — a silent guard looks like no guard at all.
 *
 * Every row below is derived from the actual guard output for this verdict.
 */

const AGREEMENT_COPY = {
  AGREE: {
    ok: true,
    label: "Analyzer and AI agree",
    detail: (a) => `Both rated confidence ${a.deterministicBand.toLowerCase()}.`,
  },
  SOFT_DISAGREE: {
    ok: true,
    label: "Analyzer and AI broadly agree",
    detail: (a) =>
      `Analyzer ${a.deterministicBand.toLowerCase()}, AI ${String(a.aiBand).toLowerCase()} — one band apart.`,
  },
  DISAGREE: {
    ok: false,
    label: "Analyzer and AI disagree",
    detail: (a) =>
      `Analyzer ${a.deterministicBand.toLowerCase()}, AI ${String(a.aiBand).toLowerCase()} — human review recommended.`,
  },
};

function buildChecks(guard, verdict) {
  if (!guard) return [];
  const violations = guard.violations || [];
  const stripped = guard.strippedCitations || [];
  const has = (code) => violations.some((v) => v.code === code);

  const reasoningCount = (verdict && verdict.reasoning ? verdict.reasoning : []).length;
  const rootCited = (verdict && verdict.rootCause && verdict.rootCause.citedEvidence) || [];
  const claimCount = reasoningCount + (rootCited.length > 0 ? 1 : 0);

  const checks = [
    {
      key: "supported",
      ok: !has("G4") && !has("G5"),
      label: "Claims supported by analyzer evidence",
      detail:
        !has("G4") && !has("G5")
          ? `All ${claimCount} claim${claimCount === 1 ? "" : "s"} cite evidence the analyzer actually produced.`
          : "A claim could not be supported and was removed.",
    },
    {
      key: "fabrication",
      ok: stripped.length === 0,
      label: "No fabricated evidence",
      detail:
        stripped.length === 0
          ? "No citation pointed at evidence that does not exist."
          : `${stripped.length} citation${stripped.length === 1 ? "" : "s"} referenced evidence that was never captured and ${stripped.length === 1 ? "was" : "were"} stripped.`,
    },
    {
      key: "coherence",
      ok: guard.categoryCoherence !== "WEAK",
      label: "Conclusion matches the failure signals",
      detail:
        guard.categoryCoherence === "WEAK"
          ? "The claimed cause is weakly supported; confidence was downgraded."
          : "The chosen category is backed by the signals the analyzer found.",
    },
  ];

  const agreement = guard.agreement;
  if (agreement && agreement.status) {
    const copy = AGREEMENT_COPY[agreement.status] || AGREEMENT_COPY.SOFT_DISAGREE;
    checks.push({
      key: "agreement",
      ok: copy.ok,
      label: copy.label,
      detail: copy.detail(agreement),
    });
  }

  if (has("G10")) {
    checks.push({
      key: "language",
      ok: true,
      label: "Internal identifiers removed from the answer",
      detail: "Rule codes and evidence IDs were stripped from the user-facing text.",
    });
  }

  return checks;
}

export default function GroundingChecks({ guard, verdict }) {
  const [open, setOpen] = useState(false);
  const checks = buildChecks(guard, verdict);
  if (checks.length === 0) return null;

  const failed = checks.filter((c) => !c.ok).length;
  const allOk = failed === 0;
  const violations = (guard && guard.violations) || [];

  return (
    <div
      className={`rounded-xl border ${
        allOk ? "border-slate-200 bg-white" : "border-amber-300 bg-amber-50"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: allOk ? "var(--viz-pass)" : "var(--viz-flaky)" }}
            aria-hidden="true"
          >
            {allOk ? "✓" : "!"}
          </span>
          <h3 className="text-sm font-semibold text-slate-900">Grounding checks</h3>
          <span className="text-xs text-slate-500">
            {allOk
              ? `${checks.length} of ${checks.length} passed`
              : `${checks.length - failed} of ${checks.length} passed`}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Deterministic — runs on the AI's answer before you see it
        </p>
      </div>

      <ul className="grid gap-x-6 gap-y-2 border-t border-slate-100 px-4 py-3 sm:grid-cols-2">
        {checks.map((check) => (
          <li key={check.key} className="flex gap-2.5">
            <span
              className="mt-0.5 flex-none text-sm font-bold leading-none"
              style={{ color: check.ok ? "var(--viz-pass)" : "var(--viz-flaky)" }}
              aria-hidden="true"
            >
              {check.ok ? "✓" : "⚠"}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug text-slate-800">{check.label}</p>
              <p className="mt-0.5 text-xs leading-snug text-slate-500">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      {violations.length > 0 ? (
        <div className="border-t border-slate-100 px-4 py-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline"
          >
            {open ? "Hide" : "Show"} what the guard changed ({violations.length})
          </button>
          {open ? (
            <ul className="mt-2 space-y-1.5 pb-2">
              {violations.map((v, i) => (
                <li key={i} className="text-xs leading-relaxed text-slate-600">
                  <span className="font-medium text-slate-800">{v.message}</span>
                  {v.detail ? <span className="text-slate-500"> {v.detail}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
