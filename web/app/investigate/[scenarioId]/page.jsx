import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import ObservedPanel from "@/components/investigate/ObservedPanel.jsx";
import InvestigateClient from "@/components/investigate/InvestigateClient.jsx";
import { buildSafeObserved } from "@/lib/humanize.js";

export default async function InvestigationPage({ params }) {
  const { scenarioId } = await params;
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

  const observed = buildSafeObserved(pack);

  return (
    <div>
      <a href="/" className="mb-6 inline-block text-sm text-sky-600 hover:underline">
        ← All scenarios
      </a>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{pack.subject.testName}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {pack.subject.file} · {pack.subject.browser} · {pack.subject.runCount} runs
        </p>
      </div>

      <div className="space-y-6">
        <ObservedPanel observed={observed} />
        <InvestigateClient scenarioId={scenarioId} />
      </div>
    </div>
  );
}
