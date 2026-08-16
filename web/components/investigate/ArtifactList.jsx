"use client";

import { humanizeArtifactLabel } from "@/lib/humanize.js";

export default function ArtifactList({ item }) {
  const raw = item && item.raw ? item.raw : {};
  const screenshots = Array.isArray(raw.screenshots) ? raw.screenshots : [];
  const kinds = [
    { key: "screenshot", present: screenshots.length > 0 },
    { key: "trace", present: !!raw.trace },
    { key: "video", present: !!raw.video },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-sm font-medium text-slate-700">Available evidence</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {kinds.map((k) => (
          <span key={k.key} className="inline-flex items-center gap-1 text-sm text-slate-600">
            <span className={k.present ? "text-emerald-600" : "text-slate-400"}>
              {k.present ? "✓" : "✕"}
            </span>
            {humanizeArtifactLabel(k.key)}
          </span>
        ))}
      </div>
    </div>
  );
}
