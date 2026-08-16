import StatTile from "@/components/ui/StatTile.jsx";

/**
 * The four headline analyzer metrics. Every value comes from the deterministic
 * analyzer's own run history — nothing here is estimated. Status rides on the
 * tile's dot rather than on the figure's colour, so the numbers stay readable.
 */
export default function MetricCards({ stats, retry }) {
  const cards = [
    {
      label: "Runs analysed",
      value: String(stats.runs),
      hint: `${stats.passed} passed · ${stats.failed} failed`,
    },
    {
      label: "Failure rate",
      value: `${stats.failureRate}%`,
      hint: `Failed in ${stats.failed} of ${stats.runs} runs`,
      tone: stats.failureRate === 100 ? "fail" : stats.failureRate > 0 ? "flaky" : "pass",
    },
    {
      label: "Recovered on retry",
      value: retry ? `${retry.recovered}/${retry.failedRuns}` : "None",
      hint: retry ? "Failed runs that passed when retried" : "No retry recovery observed",
      tone: retry ? "pass" : "skip",
    },
    {
      label: "Pass/fail flips",
      value: String(stats.transitions),
      hint: stats.transitions > 0 ? "Outcome changed between runs" : "Outcome never changed",
      tone: stats.transitions > 0 ? "flaky" : "skip",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <StatTile key={card.label} {...card} />
      ))}
    </div>
  );
}
