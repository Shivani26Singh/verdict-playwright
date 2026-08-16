import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import InvestigationView from "@/components/investigate/InvestigationView.jsx";
import { loadRules } from "@/lib/suite.js";

const TABS = new Set(["analysis", "ai", "evidence", "rules"]);

/**
 * One of the three curated demo scenarios. Identical experience to any other
 * failure — the only difference is that a real model verdict is already
 * committed for it, so the demo path is instant even without a live API call.
 */
export default async function InvestigationPage({ params, searchParams }) {
  const { scenarioId } = await params;
  const query = (await searchParams) || {};

  if (!/^[a-z0-9-]+$/.test(scenarioId)) notFound();

  let pack;
  try {
    const raw = await readFile(
      path.join(process.cwd(), "public", "scenarios", `${scenarioId}.pack.json`),
      "utf8"
    );
    pack = JSON.parse(raw);
  } catch {
    notFound();
  }

  const ruleData = await loadRules();
  const ruleCode = pack.deterministic && pack.deterministic.ruleCode;
  const rule =
    ruleData && ruleCode ? ruleData.rules.find((r) => r.code === ruleCode) || null : null;

  const requestedTab = typeof query.tab === "string" ? query.tab : null;

  return (
    <InvestigationView
      pack={pack}
      rule={rule}
      backHref="/"
      backLabel="Overview"
      initialTab={requestedTab && TABS.has(requestedTab) ? requestedTab : "analysis"}
      autoRun={query.run === "1"}
      source={{
        kind: "scenario",
        investigationUrl: `/scenarios/${scenarioId}.investigation.json`,
        investigationKey: null,
        verdictUrl: `/scenarios/${scenarioId}.verdict.json`,
        packUrl: `/scenarios/${scenarioId}.pack.json`,
      }}
    />
  );
}
