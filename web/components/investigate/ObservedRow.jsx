"use client";

export default function ObservedRow({ row }) {
  return (
    <div id={`ev-${row.id}`} className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-sm font-medium text-slate-700">{row.label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{row.value}</div>
    </div>
  );
}
