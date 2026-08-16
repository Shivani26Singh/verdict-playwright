import ReportCard from "@/components/flaky/ReportCard.jsx";
import FailureTable from "@/components/flaky/FailureTable.jsx";
import RecoveredTable from "@/components/flaky/RecoveredTable.jsx";
import SkippedTable from "@/components/flaky/SkippedTable.jsx";
import OfflineAnalyzerCta from "@/components/dashboard/OfflineAnalyzerCta.jsx";
import { loadDashboard, loadFailureIndex } from "@/lib/suite.js";

export const metadata = {
  title: "Flaky Analysis — VERDICT",
  description:
    "Investigate the failures detected across the analysed Playwright runs — signals, evidence, rules, and AI investigation.",
};

/**
 * The failure-investigation workspace, presented as one deterministic report
 * in three sections.
 *
 * Deliberately NOT a second dashboard: suite-level charts and trends live on
 * the Overview. What is here is the report a QA engineer works through —
 * failures first and open, then the two categories that a failure list would
 * otherwise hide.
 */
export default async function FlakyAnalysisPage() {
  const [dashboard, failures] = await Promise.all([loadDashboard(), loadFailureIndex()]);

  if (!dashboard || !failures) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Analysis data has not been built</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Run{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
            node scripts/build-suite-data.js
          </code>{" "}
          from the repository root.
        </p>
      </div>
    );
  }

  const { dataset } = dashboard;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Flaky Analysis
        </h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-slate-600">
          Investigate the failures detected across the analysed Playwright runs.{" "}
          {failures.total} failures were found across {dataset.tests} tests and {dataset.runs}{" "}
          runs — <strong>every one of them</strong> can be opened individually, down to its
          evidence, the rules that fired, and an AI verdict.
        </p>
      </header>

      <ReportCard
        title="Failed tests"
        count={failures.total}
        summary="Search, filter, and open any failure for its history, evidence, rules, and AI verdict."
        defaultOpen
      >
        <FailureTable
          failures={failures.failures}
          categories={failures.categories}
          classifications={failures.classifications}
          browsers={failures.browsers}
        />
      </ReportCard>

      <ReportCard
        title="Passing on retry — details"
        count={failures.recoveredTotal}
        summary="Green in every run, but only because a retry saved them."
      >
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-slate-600">
          Tests that passed after one or more retries. They are not classified as failures, but
          the first-attempt errors are useful signals for identifying instability — and because
          the analyzer captured the same evidence for them, they can be investigated exactly like
          a failure.
        </p>
        <RecoveredTable recovered={failures.recovered} />
      </ReportCard>

      <ReportCard
        title="Skipped tests — details"
        count={failures.skippedTotal}
        summary="Never executed, so excluded from flaky and failing classification."
      >
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-slate-600">
          Tests skipped in the analysed runs. Because they never executed there is no error, no
          evidence and no rule match — there is nothing to investigate, so they are listed for
          completeness only.
        </p>
        <SkippedTable skipped={failures.skipped} />
      </ReportCard>

      <OfflineAnalyzerCta />
    </div>
  );
}
