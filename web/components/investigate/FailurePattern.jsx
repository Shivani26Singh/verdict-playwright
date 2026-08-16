import Badge from "@/components/ui/Badge.jsx";

/**
 * What kind of failure the analyzer matched, and how many other tests in the
 * same run window share the signature.
 */
export default function FailurePattern({ pattern, browsers }) {
  const similar =
    pattern.similarCount === 0
      ? "No other test shows this failure pattern"
      : pattern.similarCount === 1
        ? "1 other test shows a similar failure pattern"
        : `${pattern.similarCount} other tests show a similar failure pattern`;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700">Failure pattern</h3>

        {pattern.category ? (
          <div className="mt-2">
            <Badge tone="blue">{pattern.category}</Badge>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Failure type could not be determined</p>
        )}

        {pattern.likelyCause ? (
          <p className="mt-3 text-sm font-medium text-slate-800">{pattern.likelyCause}</p>
        ) : null}
        {pattern.explanation ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{pattern.explanation}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">Similar failures</h3>
          <p className="mt-2 text-sm text-slate-600">{similar}</p>
        </div>

        {browsers.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-700">Browsers</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {browsers.map((b) => (
                <span
                  key={b.name}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    b.primary
                      ? "bg-sky-100 text-sky-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {b.name}
                  {b.primary ? <span className="text-[10px] font-normal">· this failure</span> : null}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
