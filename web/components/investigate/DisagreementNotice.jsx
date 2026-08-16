"use client";

export default function DisagreementNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">⚠ Analysis disagreement</p>
      <p className="mt-1">
        The automated analysis indicates a strong failure pattern, but AI could not
        confidently determine ownership.
      </p>
      <p className="mt-1">Human review recommended.</p>
    </div>
  );
}
