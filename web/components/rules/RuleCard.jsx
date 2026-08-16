"use client";

import { useState } from "react";

const SEVERITY = {
  critical: { label: "Critical", dot: "var(--viz-fail)" },
  high: { label: "High", dot: "var(--viz-fail-soft)" },
  medium: { label: "Medium", dot: "var(--viz-flaky)" },
  low: { label: "Low", dot: "var(--viz-skip)" },
};

/**
 * Explains the two confidence numbers the engine produces without restating
 * either as anything other than what it is.
 */
function confidenceTitle(rule) {
  const suite = rule.matches.avgConfidence;
  return [
    `Base rule confidence: ${rule.baseConfidence}%.`,
    suite === null
      ? "This rule has not fired on this suite, so there is no suite-adjusted figure."
      : `Suite evidence adjusted this rule's confidence to ${suite}%.`,
    "",
    "The base figure is how distinctive this rule's signature is in general. The suite figure is that base after this suite's own evidence — history consistency, corroborating tests, retry behaviour, how many runs there are — moved it up or down.",
  ].join("\n");
}

/**
 * A titled band inside an expanded rule.
 *
 * The three bands carry different jobs, so they carry different hues: what the
 * rule watches for (blue), what to do about it (indigo — the actionable one),
 * and what it actually caught here (teal). Tints and left rules rather than
 * saturated blocks, so the text stays the loudest thing.
 */
const BAND = {
  blue: { wrap: "border-sky-200 bg-sky-50/70", rule: "#2a78d6", head: "text-sky-950" },
  indigo: {
    wrap: "border-violet-200 bg-violet-50/70",
    rule: "#7c3aed",
    head: "text-violet-950",
  },
  teal: {
    wrap: "border-emerald-200 bg-emerald-50/70",
    rule: "var(--viz-pass)",
    head: "text-emerald-950",
  },
};

function Band({ tone, title, note, children }) {
  const b = BAND[tone] || BAND.blue;
  return (
    <section className={`overflow-hidden rounded-xl border ${b.wrap}`}>
      <div className="flex gap-3">
        <span aria-hidden="true" className="w-1 flex-none" style={{ background: b.rule }} />
        <div className="min-w-0 flex-1 px-4 py-3.5">
          <h4 className={`font-display text-sm font-semibold ${b.head}`}>
            {title}
            {note ? (
              <span className="ml-2 text-xs font-normal text-slate-500">{note}</span>
            ) : null}
          </h4>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </section>
  );
}

/**
 * One detection rule, collapsed by default.
 *
 * Collapsed shows only what is needed to decide whether to open it: what it
 * detects, how relevant it is to this suite, and how to expand. The full
 * explanation, the five checks, and the matched tests appear together on
 * expand — one control per rule, not three nested accordions.
 */
export default function RuleCard({ rule }) {
  const [open, setOpen] = useState(false);
  const severity = SEVERITY[rule.severity] || SEVERITY.medium;
  const matched = rule.matches.count > 0;
  const suiteConfidence = rule.matches.avgConfidence;

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
        open ? "border-slate-300" : matched ? "border-slate-200 hover:border-slate-300" : "border-slate-200/80"
      }`}
    >
      {/*
        A top rule in the severity colour. Its job is separation — on a page of
        twenty white cards a hairline border alone does not register — and it
        earns the space by encoding severity at the same time.
      */}
      <div
        aria-hidden="true"
        className="h-1 w-full"
        style={{ background: severity.dot }}
      />
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: severity.dot }}
                  aria-hidden="true"
                />
                {rule.category}
              </span>
              <span className="text-[11px] text-slate-400">{severity.label} severity</span>
              {rule.requiresHumanReview ? (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                  Escalates to human
                </span>
              ) : null}
            </div>

            {/* PRIMARY — what this rule detects, in plain English. */}
            <h3
              className={`mt-2 text-base font-semibold leading-snug ${
                matched ? "text-slate-900" : "text-slate-600"
              }`}
            >
              {rule.name}
            </h3>

            {/* Collapsed keeps the description short; expanding shows it whole. */}
            <p
              className={`mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600 ${
                open ? "" : "line-clamp-2"
              }`}
            >
              {rule.explanation}
            </p>
          </div>

          {/* How relevant is this rule to my data? */}
          <div className="flex-none text-right">
            <div
              className={`text-2xl font-bold leading-none tabular-nums ${
                matched ? "text-slate-900" : "text-slate-300"
              }`}
            >
              {rule.matches.count}
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              {rule.matches.count === 1 ? "test matched" : "tests matched"}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              open
                ? "border-slate-400 bg-slate-100 text-slate-800"
                : "border-sky-300 bg-sky-50 text-sky-800 hover:border-sky-500 hover:bg-sky-100"
            }`}
          >
            {open ? "Hide detail" : `What it looks for & ${rule.suggestedChecks.length} QA checks`}
            <span className={`transition ${open ? "rotate-90" : ""}`} aria-hidden="true">
              ›
            </span>
          </button>

          {/* Secondary — present, not competing. */}
          <span
            className="cursor-help text-xs text-slate-500 decoration-slate-300 decoration-dotted underline-offset-2 hover:underline"
            title={confidenceTitle(rule)}
          >
            Suite confidence{" "}
            <span className="font-semibold tabular-nums text-slate-700">
              {suiteConfidence === null ? "—" : `${suiteConfidence}%`}
            </span>
            <span className="text-slate-400"> · base {rule.baseConfidence}%</span>
          </span>

          {rule.matches.browsers.length > 0 ? (
            <span className="text-xs capitalize text-slate-400">
              {rule.matches.browsers.join(", ")}
            </span>
          ) : (
            <span className="text-xs text-slate-400">Did not fire on this suite</span>
          )}

          {/* TECHNICAL — available, deliberately quiet. */}
          <span
            className="ml-auto cursor-help font-mono text-[10px] text-slate-400"
            title={`Rule ID: ${rule.code} · ${rule.id}`}
          >
            Rule ID: {rule.code}
          </span>
        </div>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-slate-200 bg-slate-50 px-5 py-5">
          <Band tone="blue" title="What the analyzer looks for">
            <p className="max-w-3xl text-sm leading-relaxed text-slate-700">
              {rule.evidence || rule.explanation}
            </p>
          </Band>

          <Band
            tone="indigo"
            title="Suggested QA checks"
            note={`${rule.suggestedChecks.length} concrete things to look at`}
          >
            <ol className="space-y-2.5">
              {rule.suggestedChecks.map((check, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-slate-700">{check}</span>
                </li>
              ))}
            </ol>
          </Band>

          {rule.matches.examples.length > 0 ? (
            <Band tone="teal" title="Matched on this suite">
              <p className="text-xs text-slate-600">
                This rule fired because these tests showed the pattern above.
              </p>
              <ul className="mt-2.5 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
                {rule.matches.examples.map((ex, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 truncate text-sm text-slate-700">{ex.testName}</span>
                    <span className="flex-none text-xs tabular-nums text-slate-400">
                      <span className="capitalize">{ex.browser}</span> · {ex.confidence}%
                    </span>
                  </li>
                ))}
              </ul>
              {rule.matches.count > rule.matches.examples.length ? (
                <p className="mt-2 text-xs text-slate-600">
                  + {rule.matches.count - rule.matches.examples.length} more —{" "}
                  <a
                    href="/flaky"
                    className="font-medium text-emerald-800 underline-offset-4 hover:underline"
                  >
                    see them in Flaky Analysis →
                  </a>
                </p>
              ) : null}
            </Band>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
