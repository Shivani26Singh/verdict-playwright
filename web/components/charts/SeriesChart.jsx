"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * A single count-per-run series as bars.
 *
 * One series, one axis, so no legend box — the section title names it. Only
 * the current value is directly labelled; the rest are carried by the axis,
 * the hover tooltip, and the table view underneath. Bars are anchored to a
 * zero baseline with 4px rounded tops and a 2px surface gap between them.
 */
const PAD = { top: 16, right: 8, bottom: 22, left: 30 };
const HEIGHT = 150;
const GAP = 2;

function niceMax(max) {
  if (max <= 5) return Math.max(1, max);
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / (step / 2)) * (step / 2);
}

export default function SeriesChart({ series, color = "var(--viz-fixed)", unitLabel = "" }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(520);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0] && entries[0].contentRect && entries[0].contentRect.width;
      if (w) setWidth(Math.max(280, Math.round(w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = Array.isArray(series) ? series : [];

  const geom = useMemo(() => {
    if (points.length === 0) return null;
    const max = niceMax(Math.max(...points.map((p) => Number(p.value) || 0), 1));
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const slot = innerW / points.length;
    const barW = Math.max(3, slot - GAP);
    const baseline = PAD.top + innerH;
    const y = (v) => baseline - ((Number(v) || 0) / max) * innerH;
    const x = (i) => PAD.left + i * slot + GAP / 2;
    return { max, innerW, innerH, slot, barW, baseline, x, y };
  }, [points, width]);

  const onMove = useCallback(
    (event) => {
      if (!geom || points.length === 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const idx = Math.floor((event.clientX - rect.left - PAD.left) / geom.slot);
      setHover(idx >= 0 && idx < points.length ? idx : null);
    },
    [geom, points.length]
  );

  if (!geom) return null;

  const active = hover === null ? null : points[hover];
  const lastIndex = points.length - 1;

  return (
    <div ref={wrapRef}>
      <div className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${unitLabel || "Value"} per run across ${points.length} runs, currently ${points[lastIndex].value}`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          className="block"
        >
          {[0, geom.max / 2, geom.max].map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={geom.y(tick)}
                y2={geom.y(tick)}
                stroke="var(--viz-grid)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={geom.y(tick) + 3.5}
                textAnchor="end"
                className="fill-slate-400 text-[10px] tabular-nums"
              >
                {Math.round(tick)}
              </text>
            </g>
          ))}

          {points.map((p, i) => {
            const value = Number(p.value) || 0;
            const top = geom.y(value);
            const h = Math.max(value > 0 ? 2 : 0, geom.baseline - top);
            const isActive = hover === i;
            return (
              <rect
                key={p.label}
                x={geom.x(i)}
                y={geom.baseline - h}
                width={geom.barW}
                height={h}
                rx="3"
                fill={color}
                opacity={hover === null || isActive ? 1 : 0.45}
              />
            );
          })}

          <text x={PAD.left} y={HEIGHT - 6} className="fill-slate-400 text-[10px]">
            {points[0].label}
          </text>
          <text
            x={width - PAD.right}
            y={HEIGHT - 6}
            textAnchor="end"
            className="fill-slate-400 text-[10px]"
          >
            {points[lastIndex].label}
          </text>
        </svg>

        {active ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-lg"
            style={{
              left: Math.min(Math.max(geom.x(hover) + geom.barW / 2, 60), width - 60),
              top: 0,
            }}
          >
            <span className="font-semibold text-slate-900">{active.label}</span>
            <span className="ml-2 tabular-nums text-slate-600">
              {active.value} {unitLabel}
            </span>
          </div>
        ) : null}
      </div>

      <details className="mt-1">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
          Show values
        </summary>
        <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">Run</th>
                <th className="px-3 py-1.5 text-right font-medium">{unitLabel || "Value"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums text-slate-700">
              {points.map((p) => (
                <tr key={p.label}>
                  <td className="px-3 py-1.5">{p.label}</td>
                  <td className="px-3 py-1.5 text-right">{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
