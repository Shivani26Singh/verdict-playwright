"use client";

import { useState } from "react";
import Section from "@/components/ui/Section.jsx";
import BarList from "@/components/charts/BarList.jsx";

/**
 * A bar list with a Latest Run / All Runs scope switch in the card header.
 *
 * The two answer genuinely different questions — "what is broken right now?"
 * versus "what has this suite been doing?" — and a category that dominates the
 * whole window may be absent from the latest run. Latest Run is the default
 * because it is the state a QA engineer is usually acting on.
 *
 * The control sits in the header rather than above the bars so the card's
 * content area stays entirely data. Bars never change colour, only values.
 */
export default function ScopedBarSection({
  title,
  description,
  accent,
  allRuns,
  latestRun,
  valueSuffix = "",
  emptyLabel,
  footer,
}) {
  const [scope, setScope] = useState("latest");
  const items = scope === "latest" ? latestRun : allRuns;

  const button = (id, label) => {
    const active = scope === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setScope(id)}
        aria-pressed={active}
        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
          active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <Section
      title={title}
      description={description}
      accent={accent}
      action={
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
          {button("latest", "Latest Run")}
          {button("all", "All Runs")}
        </div>
      }
    >
      <BarList
        items={items}
        valueSuffix={valueSuffix}
        emptyLabel={emptyLabel || "Nothing recorded in this run."}
      />
      {footer}
    </Section>
  );
}
