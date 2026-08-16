import InvestigateClient from "@/components/investigate/InvestigateClient.jsx";
import { buildInsights, buildMissingEvidence } from "@/lib/insights.js";
import { humanizeEvidenceLabel, humanizeClassification } from "@/lib/humanize.js";

const CLASSIFICATION_DOT = {
  flaky: "var(--viz-flaky)",
  stable_failure: "var(--viz-fail)",
  newly_failed: "var(--viz-fail-soft)",
  regression: "var(--viz-fail)",
  fixed: "var(--viz-fixed)",
  stable_pass: "var(--viz-pass)",
};

/**
 * One failure's investigation page.
 *
 * Shared by the curated demo scenarios and by any of the analysed failures
 * opened from Flaky Analysis, so both get the identical four-tab experience.
 * The only difference is `source`: a curated scenario carries a pre-generated
 * verdict for a fast demo, an arbitrary failure runs the model on demand.
 */
export default function InvestigationView({ pack, rule, source, backHref, backLabel, initialTab, autoRun }) {
  const insights = buildInsights(pack);
  const missing = buildMissingEvidence(pack, (id) => humanizeEvidenceLabel(id).toLowerCase());
  const classification = pack.subject.classification;

  return (
    <div>
      <a
        href={backHref}
        className="mb-6 inline-block text-sm text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
      >
        ← {backLabel}
      </a>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: CLASSIFICATION_DOT[classification] || "var(--viz-skip)" }}
              aria-hidden="true"
            />
            {humanizeClassification(classification)}
          </span>
          <span className="font-mono text-xs text-slate-400">{pack.subject.file}</span>
        </div>

        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {pack.subject.testName}
        </h1>

        <p className="mt-1.5 text-sm text-slate-500">
          <span className="capitalize">{pack.subject.browser}</span> · {insights.stats.runs} runs
          analysed · {insights.stats.failed} failed
          {insights.stats.transitions > 0
            ? ` · ${insights.stats.transitions} pass/fail flips`
            : ""}
          {rule ? ` · ${rule.category.toLowerCase()} rule matched` : ""}
        </p>
      </div>

      <InvestigateClient
        insights={insights}
        missing={missing}
        pack={pack}
        rule={rule}
        source={source}
        initialTab={initialTab}
        autoRun={autoRun}
      />
    </div>
  );
}
