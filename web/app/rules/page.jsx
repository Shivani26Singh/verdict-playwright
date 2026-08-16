import Section from "@/components/ui/Section.jsx";
import StatTile from "@/components/ui/StatTile.jsx";
import RuleBrowser from "@/components/rules/RuleBrowser.jsx";
import { loadRules } from "@/lib/suite.js";

export const metadata = {
  title: "Detection Rules — VERDICT",
  description:
    "The 20 explainable QA analysis rules that establish what happened, before any AI runs.",
};

export default async function RulesPage() {
  const data = await loadRules();

  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Rule data has not been built</h1>
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

  const { suite, rules, categories } = data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {suite.totalRules} explainable QA analysis rules
        </h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-slate-600">
          Every failure is put through this catalogue <strong>before</strong> the AI is asked
          anything. Each rule states what it detected, why it matched, how confident it is, and
          what to check next — the same answer, every time, with no model involved.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-300 bg-slate-900 p-6 text-white">
        <p className="text-lg font-semibold leading-snug sm:text-xl">
          20 deterministic rules establish what happened.
          <br />
          <span className="text-slate-300">AI interprets what it means.</span>
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          The rules below produce the evidence. The AI never sees the raw test output — only
          what these rules established, and it must cite that evidence for every claim it
          makes. That ordering is what keeps the verdict grounded.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Rules in catalogue"
          value={suite.totalRules}
          hint={`${categories.length} categories`}
        />
        <StatTile
          label="Fired on this suite"
          value={`${suite.matchedRules}/${suite.totalRules}`}
          tone="pass"
          hint={`Across ${suite.totalInvestigations} analysed failures`}
        />
        <StatTile
          label="Remediation checks"
          value={suite.totalChecks}
          hint="Five concrete checks per rule"
        />
        <StatTile
          label="Escalated to human"
          value={suite.humanReviewMatches}
          tone="flaky"
          hint={`${suite.humanReviewRules} rules refuse to guess`}
        />
      </div>

      <Section
        title="Some rules deliberately decline to answer"
        description="Refusing to guess is a designed outcome, not a gap."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {rules
            .filter((r) => r.requiresHumanReview)
            .map((rule) => (
              <div key={rule.code} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-amber-950">{rule.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-amber-900">
                  {rule.explanation}
                </p>
                <p className="mt-2 text-xs font-medium text-amber-800">
                  Fired {rule.matches.count} time{rule.matches.count === 1 ? "" : "s"} here —
                  each one routed to a person rather than given a confident cause.
                </p>
              </div>
            ))}
        </div>
      </Section>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold tracking-tight text-slate-900">The catalogue</h2>
        <RuleBrowser rules={rules} categories={categories} />
      </div>
    </div>
  );
}
