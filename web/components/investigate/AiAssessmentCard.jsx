"use client";

import VerdictBanner from "@/components/investigate/VerdictBanner.jsx";
import DisagreementNotice from "@/components/investigate/DisagreementNotice.jsx";
import GroundingChecks from "@/components/investigate/GroundingChecks.jsx";
import WhyWeThink from "@/components/investigate/WhyWeThink.jsx";
import EvidenceCaveats from "@/components/investigate/EvidenceCaveats.jsx";
import RecommendedAction from "@/components/investigate/RecommendedAction.jsx";
import TechnicalDetails from "@/components/investigate/TechnicalDetails.jsx";

/**
 * The AI Verdict tab once a verdict exists — "What does it mean?" and
 * "What should QA do next?". The Verdict Guard's result sits directly under
 * the verdict, whether or not it found anything.
 */
export default function AiAssessmentCard({ result, onReinvestigate }) {
  const { verdict, guard, provenance, evidencePack } = result;
  const cached = !!(provenance && provenance.mode !== "live");

  return (
    <div className="space-y-5">
      <VerdictBanner verdict={verdict} cached={cached} provenance={provenance} />

      <GroundingChecks guard={guard} verdict={verdict} />

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
          className="rounded-full border border-violet-300 px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50"
        >
          Re-investigate
        </button>
      </div>

      <TechnicalDetails
        pack={evidencePack}
        verdict={verdict}
        guard={guard}
        provenance={provenance}
      />
    </div>
  );
}
