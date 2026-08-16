export default function HowItWorks() {
  const steps = [
    "Test failures",
    "Evidence collected",
    "AI investigates",
    "Conclusions verified",
    "Recommended action",
  ];
  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">How it works</h2>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{step}</span>
            {i < steps.length - 1 ? <span className="text-slate-300">→</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
