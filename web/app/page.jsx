import { readFile } from "node:fs/promises";
import path from "node:path";
import HowItWorks from "@/components/home/HowItWorks.jsx";
import ScenarioCard from "@/components/home/ScenarioCard.jsx";

export default async function HomePage() {
  let scenarios = [];
  try {
    const raw = await readFile(path.join(process.cwd(), "public", "scenarios", "index.json"), "utf8");
    scenarios = JSON.parse(raw);
  } catch {
    scenarios = [];
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Investigate CI failures with AI</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          VERDICT turns Playwright CI history into grounded, human-readable failure attribution —
          separating product defects from flaky tests and environmental problems.
        </p>
      </div>

      <HowItWorks />

      <h2 className="mb-4 text-lg font-semibold">Demo scenarios</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </div>
    </div>
  );
}
