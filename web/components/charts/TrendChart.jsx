"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Pass rate across the analysed run window.
 *
 * One series, one axis. A single series needs no legend box — the section
 * title names it — and the endpoint is the only point directly labelled; the
 * rest are carried by the axis, the hover crosshair, and the table view below.
 * The y-domain is padded around the observed range rather than pinned to 0,
 * and both bounds are printed on the axis so the framing is visible.
 */
const PAD = { top: 14, right: 16, bottom: 26, left: 38 };
const HEIGHT = 200;

function niceDomain(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = Math.max(0, Math.floor((min - 4) / 5) * 5);
  const hi = Math.min(100, Math.ceil((max + 4) / 5) * 5);
  return hi - lo < 10 ? [Math.max(0, lo - 5), Math.min(100, hi + 5)] : [lo, hi];
}

export default function TrendChart({ trend }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0] && entries[0].contentRect && entries[0].contentRect.width;
      if (w) setWidth(Math.max(320, Math.round(w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = Array.isArray(trend) ? trend : [];

  const geom = useMemo(() => {
    if (points.length === 0) return null;
    const values = points.map((p) => p.passRate);
    const [lo, hi] = niceDomain(values);
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const x = (i) =>
      PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v) => PAD.top + innerH - ((v - lo) / (hi - lo || 1)) * innerH;

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.passRate)}`).join(" ");
    const area =
      `M${x(0)},${PAD.top + innerH} ` +
      points.map((p, i) => `L${x(i)},${y(p.passRate)}`).join(" ") +
      ` L${x(points.length - 1)},${PAD.top + innerH} Z`;

    const ticks = [lo, Math.round((lo + hi) / 2), hi];
    return { lo, hi, x, y, line, area, ticks, innerW, innerH };
  }, [points, width]);

  const onMove = useCallback(
    (event) => {
      if (!geom || points.length === 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const ratio = (px - PAD.left) / (geom.innerW || 1);
      const idx = Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))));
      setHover(idx);
    },
    [geom, points.length]
  );

  if (!geom) return null;

  const last = points[points.length - 1];
  const active = hover === null ? null : points[hover];

  return (
    <div ref={wrapRef}>
      <div className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Pass rate across ${points.length} runs, from ${points[0].passRate}% to ${last.passRate}%`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          className="block touch-none"
        >
          {geom.ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={geom.y(t)}
                y2={geom.y(t)}
                stroke="var(--viz-grid)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={geom.y(t) + 3.5}
                textAnchor="end"
                className="fill-slate-400 text-[10px] tabular-nums"
              >
                {t}%
              </text>
            </g>
          ))}

          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--viz-fixed)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--viz-fixed)" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          <path d={geom.area} fill="url(#trend-fill)" />
          <path
            d={geom.line}
            fill="none"
            stroke="var(--viz-fixed)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {active ? (
            <g>
              <line
                x1={geom.x(hover)}
                x2={geom.x(hover)}
                y1={PAD.top}
                y2={PAD.top + geom.innerH}
                stroke="var(--viz-axis)"
                strokeWidth="1"
              />
              <circle
                cx={geom.x(hover)}
                cy={geom.y(active.passRate)}
                r="5"
                fill="var(--viz-fixed)"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          ) : (
            <circle
              cx={geom.x(points.length - 1)}
              cy={geom.y(last.passRate)}
              r="4"
              fill="var(--viz-fixed)"
              stroke="#ffffff"
              strokeWidth="2"
            />
          )}

          <text
            x={PAD.left}
            y={HEIGHT - 8}
            className="fill-slate-400 text-[10px] tabular-nums"
          >
            {points[0].label}
          </text>
          <text
            x={width - PAD.right}
            y={HEIGHT - 8}
            textAnchor="end"
            className="fill-slate-400 text-[10px] tabular-nums"
          >
            {last.label}
          </text>
        </svg>

        {active ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{
              left: Math.min(Math.max(geom.x(hover), 78), width - 78),
              top: 0,
            }}
          >
            <div className="font-semibold text-slate-900">{active.label}</div>
            <div className="mt-1 space-y-0.5 tabular-nums text-slate-600">
              <div>{active.passRate}% passed</div>
              <div>
                {active.failed} failed · {active.skipped} skipped
              </div>
              <div>
                {active.flaky} flaky · {active.retries} retries
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
          Show run-by-run figures
        </summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">Run</th>
                <th className="px-3 py-1.5 text-right font-medium">Pass rate</th>
                <th className="px-3 py-1.5 text-right font-medium">Failed</th>
                <th className="px-3 py-1.5 text-right font-medium">Flaky</th>
                <th className="px-3 py-1.5 text-right font-medium">Retries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums text-slate-700">
              {points.map((p) => (
                <tr key={p.label}>
                  <td className="px-3 py-1.5">{p.label}</td>
                  <td className="px-3 py-1.5 text-right">{p.passRate}%</td>
                  <td className="px-3 py-1.5 text-right">{p.failed}</td>
                  <td className="px-3 py-1.5 text-right">{p.flaky}</td>
                  <td className="px-3 py-1.5 text-right">{p.retries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
