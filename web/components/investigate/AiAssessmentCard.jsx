"use client";

import Panel from "@/components/ui/Panel.jsx";
import CachedBadge from "@/components/investigate/CachedBadge.jsx";
import DisagreementNotice from "@/components/investigate/DisagreementNotice.jsx";
import ConfidencePanel from "@/components/investigate/ConfidencePanel.jsx";
import WhyWeThink from "@/components/investigate/WhyWeThink.jsx";
import EvidenceCaveats from "@/components/investigate/EvidenceCaveats.jsx";
import RecommendedAction from "@/components/investigate/RecommendedAction.jsx";
import TechnicalDetails from "@/components/investigate/TechnicalDetails.jsx";
import { humanizeVerdictCategory } from "@/lib/humanize.js";

export default function AiAssessmentCard({ result, onReinvestigate }) {
  const { verdict, guard, provenance, evidencePack } = result;
  const meta = humanizeVerdictCategory(verdict.category);

  return (
    <Panel title="AI assessment" subtitle="What those facts most likely indicate." accent="assessment">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">{meta.title}</h3>
            <p className="text-sm text-slate-500">{meta.subline}</p>
          </div>
          {provenance && provenance.mode !== "live" ? <CachedBadge /> : null}
        </div>

        <p className="text-base text-slate-800">{verdict.headline}</p>

        {verdict.rootCause && verdict.rootCause.statement ? (
          <p className="text-sm text-slate-600">{verdict.rootCause.statement}</p>
        ) : null}

        <ConfidencePanel pack={evidencePack} verdict={verdict} />

        {guard && guard.agreement && guard.agreement.status === "DISAGREE" ? (
          <DisagreementNotice />
        ) : null}

        <WhyWeThink verdict={verdict} pack={evidencePack} />
        <EvidenceCaveats verdict={verdict} pack={evidencePack} />
        <RecommendedAction verdict={verdict} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReinvestigate}
            className="rounded-full border border-violet-300 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"
          >
            Re-investigate
          </button>
        </div>

        <TechnicalDetails pack={evidencePack} verdict={verdict} guard={guard} provenance={provenance} />
      </div>
    </Panel>
  );
}
