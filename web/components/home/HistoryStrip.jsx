export default function HistoryStrip({ history }) {
  const cells = Array.isArray(history) ? history : [];
  return (
    <div className="flex items-center gap-1">
      {cells.map((h, i) => (
        <span
          key={i}
          title={h}
          className={`inline-block h-4 w-4 rounded-sm ${
            h === "failed" ? "bg-rose-500" : h === "passed" ? "bg-emerald-500" : "bg-slate-300"
          }`}
        />
      ))}
    </div>
  );
}
