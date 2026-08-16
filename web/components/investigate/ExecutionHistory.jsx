/**
 * The run-by-run outcome strip. This is the single most legible signal in the
 * whole product: alternating green/red reads as flaky, solid red reads as a
 * consistent defect, and two cells reads as "we barely have any data".
 *
 * Failed cells carry a diagonal texture in addition to the red fill — pure
 * green against this red is indistinguishable under deuteranopia, so colour
 * alone must not be what separates pass from fail. The summary line states
 * the same facts in words.
 */
export default function ExecutionHistory({ stats }) {
  const { history, runs, failed, transitions } = stats;

  const summary =
    transitions > 0
      ? `Outcome changed ${transitions} time${transitions === 1 ? "" : "s"} across ${runs} runs`
      : failed === runs && runs > 0
        ? `Every one of the ${runs} runs failed`
        : `Outcome never changed across ${runs} runs`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">Execution history</h3>
        <span className="text-xs text-slate-500">{summary}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-1">
        {history.map((outcome, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              title={`Run ${i + 1}: ${outcome}`}
              aria-label={`Run ${i + 1}: ${outcome}`}
              className={`block h-9 w-6 rounded ${outcome === "failed" ? "run-cell-failed" : ""}`}
              // backgroundColor, not the `background` shorthand: the shorthand
              // would reset the texture background-image set by the class.
              style={{
                backgroundColor:
                  outcome === "failed"
                    ? "var(--viz-fail)"
                    : outcome === "passed"
                      ? "var(--viz-pass)"
                      : "var(--viz-skip)",
              }}
            />
            <span className="text-[10px] tabular-nums text-slate-400">{i + 1}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: "var(--viz-pass)" }}
          />
          Passed <span className="tabular-nums text-slate-400">({runs - failed})</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="run-cell-failed inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: "var(--viz-fail)" }}
          />
          Failed <span className="tabular-nums text-slate-400">({failed})</span>
        </span>
        <span className="ml-auto">Oldest run on the left</span>
      </div>
    </div>
  );
}
