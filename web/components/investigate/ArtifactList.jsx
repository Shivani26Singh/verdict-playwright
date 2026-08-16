"use client";

import { useState } from "react";

/**
 * Failure artifacts captured by the analyzer's evidence collector: screenshots,
 * a Playwright trace, and a video. Only what actually exists on disk is shown —
 * missing artifacts are reported as missing, never faked.
 */
export default function ArtifactList({ artifacts }) {
  const [lightbox, setLightbox] = useState(null);
  const screenshots = (artifacts && artifacts.screenshots) || [];
  const trace = artifacts && artifacts.trace;
  const video = artifacts && artifacts.video;

  const missing = [
    screenshots.length === 0 ? "screenshot" : null,
    !trace ? "trace" : null,
    !video ? "video" : null,
  ].filter(Boolean);

  if (!artifacts || !artifacts.any) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <h3 className="text-sm font-semibold text-slate-700">No artifacts captured</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          No screenshot, trace, or video was recorded for this failure. This is itself a
          finding: without artifacts there is far less to reason about.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {screenshots.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">
            Screenshot{screenshots.length > 1 ? "s" : ""} at failure
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {screenshots.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setLightbox(src)}
                className="group block overflow-hidden rounded-lg border border-slate-200 transition hover:border-sky-400"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt="Screenshot captured at the moment the test failed"
                  className="w-full bg-slate-50 object-cover"
                />
                <span className="block bg-slate-50 px-3 py-2 text-left text-xs text-slate-500 group-hover:text-sky-700">
                  Click to enlarge
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {video ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-700">Video</h3>
            <video
              src={video}
              controls
              preload="metadata"
              className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-900"
            />
            <a
              href={video}
              download
              className="mt-2 inline-block text-sm font-medium text-sky-600 hover:underline"
            >
              Download recording ↓
            </a>
          </div>
        ) : null}

        {trace ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-700">Playwright trace</h3>
            <p className="mt-2 text-sm text-slate-600">
              Full step-by-step trace of the failing run, including DOM snapshots and
              network activity.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href={trace}
                download
                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Download trace ↓
              </a>
              <a
                href="https://trace.playwright.dev/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Open trace viewer ↗
              </a>
            </div>
          </div>
        ) : null}
      </div>

      {missing.length > 0 ? (
        <p className="text-sm text-slate-400">Not captured: {missing.join(", ")}.</p>
      ) : null}

      {lightbox ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter") setLightbox(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Screenshot captured at the moment the test failed"
            className="max-h-full max-w-full rounded-lg shadow-2xl"
          />
          <span className="absolute bottom-6 text-sm text-slate-300">
            Click anywhere to close
          </span>
        </div>
      ) : null}
    </div>
  );
}
