"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Spinner from "@/components/ui/Spinner.jsx";
import AiAssessmentCard from "@/components/investigate/AiAssessmentCard.jsx";
import ObservedPanel from "@/components/investigate/ObservedPanel.jsx";
import ArtifactList from "@/components/investigate/ArtifactList.jsx";
import RulesAppliedTab from "@/components/investigate/RulesAppliedTab.jsx";
import ErrorBlock from "@/components/investigate/ErrorBlock.jsx";
import { TabsContext } from "@/components/investigate/TabsContext.js";

const LABELS = ["Collecting evidence…", "Analysing…", "Verifying conclusions…"];

const TABS = [
  { id: "analysis", label: "Analysis", caption: "What happened" },
  { id: "ai", label: "AI Verdict", caption: "What it means" },
  { id: "evidence", label: "Evidence", caption: "Proof" },
  { id: "rules", label: "Rules Applied", caption: "How we know" },
];

async function loadJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

function InvestigateButton({ onClick, loading, label, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? <Spinner label={label} /> : "Investigate with AI →"}
    </button>
  );
}

export default function InvestigateClient({
  insights,
  missing,
  pack,
  rule,
  source,
  initialTab = "analysis",
  autoRun = false,
}) {
  const [tab, setTab] = useState(initialTab);
  const [state, setState] = useState({ status: "idle", result: null, error: null });
  const [labelIndex, setLabelIndex] = useState(0);
  const autoRunFired = useRef(false);

  /**
   * The committed verdict, captured from a real model run. Only the three
   * curated scenarios have one; an arbitrary failure has no cache and is
   * told so honestly rather than being shown a stand-in.
   */
  const loadCachedResult = useCallback(
    async (reason) => {
      if (!source || !source.verdictUrl) return null;
      const [cached, cachedPack] = await Promise.all([
        loadJson(source.verdictUrl),
        loadJson(source.packUrl),
      ]);
      return {
        ok: true,
        evidencePack: cachedPack,
        verdict: cached.verdict,
        guard: cached.guard,
        provenance: { ...(cached.provenance || {}), mode: "cached", reason },
      };
    },
    [source]
  );

  const investigate = useCallback(async () => {
    setState({ status: "loading", result: null, error: null });
    setLabelIndex(0);
    const timer = setInterval(() => {
      setLabelIndex((i) => (i + 1) % LABELS.length);
    }, 1800);

    try {
      const payload = await loadJson(source.investigationUrl);
      const investigation = source.investigationKey ? payload[source.investigationKey] : payload;

      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ investigation, siblingBrowsers: [], redactionCount: 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Investigation failed");

      // The route answers 200 even when the provider is unavailable or the
      // demo kill switch is on, returning a synthesized placeholder. Prefer a
      // committed verdict where one exists; otherwise say what happened.
      const mode = data.provenance && data.provenance.mode;
      if (mode !== "live") {
        const reason =
          mode === "unavailable" ? "Live AI unavailable" : "Serving the committed verdict";
        const cached = await loadCachedResult(reason);
        if (cached) {
          setState({ status: "done", result: cached, error: null });
        } else {
          setState({
            status: "error",
            result: null,
            error:
              mode === "unavailable"
                ? "The AI provider is not reachable right now, so no verdict was produced. Nothing is being substituted in its place."
                : "This deployment is serving cached verdicts only, and none was captured for this failure.",
          });
        }
      } else {
        setState({ status: "done", result: data, error: null });
      }
    } catch (err) {
      const cached = await loadCachedResult("Live AI unavailable").catch(() => null);
      if (cached) {
        setState({ status: "done", result: cached, error: null });
      } else {
        setState({ status: "error", result: null, error: err.message });
      }
    } finally {
      clearInterval(timer);
    }
  }, [source, loadCachedResult]);

  // Arriving from a "Investigate with AI →" link starts the run immediately.
  useEffect(() => {
    if (autoRun && !autoRunFired.current) {
      autoRunFired.current = true;
      investigate();
    }
  }, [autoRun, investigate]);

  const goToEvidence = useCallback((target) => {
    if (!target) return;
    setTab(target.tab);
    setTimeout(() => {
      const el = document.getElementById(target.anchor);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-evidence");
      setTimeout(() => el.classList.remove("highlight-evidence"), 1600);
    }, 60);
  }, []);

  const ctx = useMemo(() => ({ goToEvidence, setTab }), [goToEvidence]);

  async function investigateAndShow() {
    setTab("ai");
    await investigate();
  }

  const det = (pack && pack.deterministic) || {};
  const loading = state.status === "loading";

  return (
    <TabsContext.Provider value={ctx}>
      <div>
        <nav
          className="flex flex-wrap gap-1 border-b border-slate-200"
          aria-label="Investigation sections"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-left transition ${
                  active
                    ? "border-slate-900 bg-white text-slate-900"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                <span className="block text-sm font-semibold">{t.label}</span>
                <span
                  className={`block text-[11px] ${active ? "text-slate-500" : "text-slate-400"}`}
                >
                  {t.caption}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="pt-6">
          {tab === "analysis" ? (
            <div className="space-y-6">
              <ObservedPanel insights={insights} missing={missing} />
              <div className="rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50 p-6 text-center">
                <h3 className="text-lg font-semibold text-violet-900">
                  The rules established the facts. Now ask what they mean.
                </h3>
                <p className="mx-auto mt-1 max-w-xl text-sm text-violet-700">
                  The deterministic engine says what happened. AI weighs those signals against
                  each other to attribute the failure — and may disagree, hedge, or decline.
                </p>
                <InvestigateButton
                  onClick={investigateAndShow}
                  loading={loading}
                  label={LABELS[labelIndex]}
                  className="mt-4"
                />
              </div>
            </div>
          ) : null}

          {tab === "ai" ? (
            <div className="space-y-5">
              {state.status === "idle" ? (
                <div className="rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50 p-8 text-center">
                  <h3 className="text-lg font-semibold text-violet-900">Ready to investigate</h3>
                  <p className="mx-auto mt-1 max-w-xl text-sm text-violet-700">
                    The model receives the analyzer&apos;s findings, the matched rule, and the
                    captured evidence — nothing else. It must cite that evidence for every claim,
                    and a deterministic guard checks its answer before you see it.
                  </p>
                  <InvestigateButton
                    onClick={investigate}
                    loading={loading}
                    label={LABELS[labelIndex]}
                    className="mt-4"
                  />
                </div>
              ) : null}

              {loading ? (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-8 text-center text-violet-800">
                  <Spinner label={LABELS[labelIndex]} />
                </div>
              ) : null}

              {state.status === "done" && state.result ? (
                <AiAssessmentCard result={state.result} onReinvestigate={investigate} />
              ) : null}

              {state.status === "error" ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
                  <h3 className="font-semibold text-rose-800">No verdict was produced</h3>
                  <p className="mt-1 max-w-2xl text-sm text-rose-700">{state.error}</p>
                  <p className="mt-2 text-sm text-rose-700">
                    The deterministic analysis on the other tabs is unaffected — it never depended
                    on the model.
                  </p>
                  <button
                    type="button"
                    onClick={investigate}
                    className="mt-3 rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                  >
                    Try again
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "evidence" ? (
            <div id="insight-artifacts" className="scroll-mt-24 space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">Proof.</span> Artifacts the
                  analyzer collected from the failing run — nothing here is generated.
                </p>
              </div>
              <ArtifactList artifacts={insights.artifacts} />
              <ErrorBlock error={insights.error} code={insights.code} />
            </div>
          ) : null}

          {tab === "rules" ? (
            <RulesAppliedTab
              rule={rule}
              insights={insights}
              confidence={det.confidence}
              band={det.band}
              confidenceReasons={insights.confidenceReasons}
              onInvestigate={investigateAndShow}
              investigating={loading}
              investigateLabel={LABELS[labelIndex]}
            />
          ) : null}
        </div>
      </div>
    </TabsContext.Provider>
  );
}
