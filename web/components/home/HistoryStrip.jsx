/**
 * The compact run-outcome strip used on cards.
 *
 * Failed cells carry a diagonal texture as well as the red fill: the pass/fail
 * pair is the most important distinction in the product, and colour alone
 * cannot carry it for a red-green colourblind reader.
 */
export default function HistoryStrip({ history }) {
  const cells = Array.isArray(history) ? history : [];
  return (
    <div className="flex items-center gap-[2px]">
      {cells.map((h, i) => (
        <span
          key={i}
          title={`Run ${i + 1}: ${h}`}
          className={`inline-block h-4 w-3.5 rounded-[2px] ${
            h === "failed" ? "run-cell-failed" : ""
          }`}
          // backgroundColor, not the `background` shorthand: the shorthand
          // would reset the texture background-image set by the class.
          style={{
            backgroundColor:
              h === "failed"
                ? "var(--viz-fail)"
                : h === "passed"
                  ? "var(--viz-pass)"
                  : "var(--viz-skip)",
          }}
        />
      ))}
    </div>
  );
}
