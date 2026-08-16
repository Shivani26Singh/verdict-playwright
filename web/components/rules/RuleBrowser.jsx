"use client";

import { useMemo, useState } from "react";
import RuleCard from "@/components/rules/RuleCard.jsx";

/**
 * The rule catalogue with a single filter row above everything it scopes.
 * Filtering never changes how a rule is coloured — severity follows the rule,
 * not its position in the filtered list.
 */
export default function RuleBrowser({ rules, categories }) {
  const [category, setCategory] = useState("all");
  const [onlyMatched, setOnlyMatched] = useState(false);

  const visible = useMemo(() => {
    return rules.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (onlyMatched && r.matches.count === 0) return false;
      return true;
    });
  }, [rules, category, onlyMatched]);

  const options = [{ name: "all", ruleCount: rules.length }, ...categories];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {options.map((opt) => {
          const active = category === opt.name;
          return (
            <button
              key={opt.name}
              type="button"
              onClick={() => setCategory(opt.name)}
              aria-pressed={active}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {opt.name === "all" ? "All rules" : opt.name}
              <span className={`ml-1.5 tabular-nums ${active ? "text-slate-400" : "text-slate-400"}`}>
                {opt.ruleCount}
              </span>
            </button>
          );
        })}

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={onlyMatched}
            onChange={(e) => setOnlyMatched(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />
          Only rules that fired on this suite
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No rules match this filter.
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((rule) => (
            <RuleCard key={rule.code} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
}
