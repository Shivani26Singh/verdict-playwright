import { notFound } from "next/navigation";
import InvestigationView from "@/components/investigate/InvestigationView.jsx";
import { loadFailure, loadRules } from "@/lib/suite.js";

const TABS = new Set(["analysis", "ai", "evidence", "rules"]);

export async function generateMetadata({ params }) {
  const { failureId } = await params;
  const failure = await loadFailure(failureId);
  const name = failure && failure.pack && failure.pack.subject && failure.pack.subject.testName;
  return { title: name ? `${name} — VERDICT` : "Investigation — VERDICT" };
}

/**
 * Investigation for ANY analysed failure, not just the three curated demos.
 * The evidence pack was produced at build time by the same analyzer path the
 * scenarios use, so the model receives identical, real evidence.
 */
export default async function FailureInvestigationPage({ params, searchParams }) {
  const { failureId } = await params;
  const query = (await searchParams) || {};

  const failure = await loadFailure(failureId);
  if (!failure) notFound();

  const ruleData = await loadRules();
  const ruleCode = failure.pack.deterministic && failure.pack.deterministic.ruleCode;
  const rule =
    ruleData && ruleCode ? ruleData.rules.find((r) => r.code === ruleCode) || null : null;

  const requestedTab = typeof query.tab === "string" ? query.tab : null;

  return (
    <InvestigationView
      pack={failure.pack}
      rule={rule}
      backHref="/flaky"
      backLabel="All analysed failures"
      initialTab={requestedTab && TABS.has(requestedTab) ? requestedTab : "analysis"}
      autoRun={query.run === "1"}
      source={{
        kind: "failure",
        investigationUrl: `/failures/${failureId}.json`,
        investigationKey: "investigation",
        verdictUrl: null,
      }}
    />
  );
}
