import Badge from "@/components/ui/Badge.jsx";
import HistoryStrip from "@/components/home/HistoryStrip.jsx";

export default function ScenarioCard({ scenario }) {
  const classificationTone =
    scenario.classification === "flaky" ? "amber" : scenario.classification === "stable_failure" ? "red" : "purple";
  const classificationLabel =
    scenario.classification === "flaky"
      ? "Flaky"
      : scenario.classification === "stable_failure"
        ? "Consistently failing"
        : "Newly failing";

  return (
    <a
      href={`/investigate/${scenario.id}`}
      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">{scenario.title}</h3>
          <Badge tone={classificationTone}>{classificationLabel}</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-600">{scenario.description}</p>
      </div>

      <div className="mt-5 space-y-2">
        <HistoryStrip history={scenario.history} />
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Failed in {scenario.failedCount} of {scenario.runCount} runs</span>
          <span className="font-medium text-sky-600 group-hover:underline">Investigate →</span>
        </div>
      </div>
    </a>
  );
}
