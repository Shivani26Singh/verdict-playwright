"use client";

import { useState } from "react";
import Panel from "@/components/ui/Panel.jsx";
import Spinner from "@/components/ui/Spinner.jsx";
import AiAssessmentCard from "@/components/investigate/AiAssessmentCard.jsx";

const LABELS = ["Collecting evidence…", "Analysing…", "Verifying conclusions…"];

async function loadJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

export default function InvestigateClient({ scenarioId }) {
  const [state, setState] = useState({ status: "idle", result: null, error: null });
  const [labelIndex, setLabelIndex] = useState(0);

  async function investigate() {
    setState({ status: "loading", result: null, error: null });
    setLabelIndex(0);
    const timer = setInterval(() => {
      setLabelIndex((i) => (i + 1) % LABELS.length);
    }, 1800);

    try {
      const investigation = await loadJson(`/scenarios/${scenarioId}.investigation.json`);
      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          investigation,
          siblingBrowsers: [],
          redactionCount: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Investigation failed");
      }
      setState({ status: "done", result: data, error: null });
    } catch (err) {
      try {
        const cached = await loadJson(`/scenarios/${scenarioId}.verdict.json`);
        const pack = await loadJson(`/scenarios/${scenarioId}.pack.json`);
        setState({
          status: "done",
          result: {
            ok: true,
            evidencePack: pack,
            verdict: cached.verdict,
            guard: cached.guard,
            provenance: { mode: "cached", reason: "Live AI unavailable" },
          },
          error: null,
        });
      } catch {
        setState({ status: "error", result: null, error: err.message });
      }
    } finally {
      clearInterval(timer);
    }
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={investigate}
        disabled={state.status === "loading"}
        className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-6 py-3 font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state.status === "loading" ? <Spinner label={LABELS[labelIndex]} /> : "Investigate with AI"}
      </button>

      {state.status === "done" && state.result ? (
        <AiAssessmentCard result={state.result} onReinvestigate={investigate} />
      ) : null}
      {state.status === "error" ? (
        <Panel title="AI assessment" subtitle="What those facts most likely indicate." accent="assessment">
          <p className="text-rose-600">Could not load an assessment. {state.error}</p>
        </Panel>
      ) : null}
    </div>
  );
}
