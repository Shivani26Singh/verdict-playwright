import StatTile from "@/components/ui/StatTile.jsx";
import CompositionBar from "@/components/charts/CompositionBar.jsx";

/**
 * The factual snapshot: how every tracked test currently behaves, then the
 * same figures as one part-to-whole bar. This is the first thing on the page
 * because it is the question a QA engineer opens the tool to answer.
 */
export default function SuiteSummary({ dashboard }) {
  const { headline, composition, dataset } = dashboard;

  const tiles = [
    {
      label: "Total tests",
      value: headline.total,
      tone: "neutral",
      title: `Every distinct test-and-browser combination tracked across ${dataset.runs} runs.`,
    },
    {
      label: "Passing",
      value: headline.passing,
      tone: "pass",
      title: "Passed in every analysed run.",
    },
    {
      label: "Passing on retry",
      value: headline.passingOnRetry,
      tone: "fixed",
      title: "Failed at least once but recovered when the run retried them.",
    },
    {
      label: "Flaky",
      value: headline.flaky,
      tone: "flaky",
      title: "Outcome alternates between pass and fail across the window.",
    },
    {
      label: "Newly failing",
      value: headline.newlyFailing,
      tone: "failSoft",
      title: "Passed earlier in the window and are failing now.",
    },
    {
      label: "Consistently failing",
      value: headline.consistentlyFailing,
      tone: "fail",
      title: "Failed in every analysed run — reproducible, not intermittent.",
    },
    {
      label: "Skipped",
      value: headline.skipped,
      tone: "skip",
      title: "Never executed in the analysed runs.",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Seven across on desktop; the tiles are compact so no figure wraps. */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} compact />
        ))}
      </div>
      <div className="border-t border-slate-100 pt-4">
        <CompositionBar composition={composition} total={dataset.tests} />
      </div>
    </div>
  );
}
