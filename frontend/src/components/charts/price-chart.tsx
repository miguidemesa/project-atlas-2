"use client";

import { useMemo, useRef, useState } from "react";
import { formatPeso } from "@/lib/format";
import type { PricePoint } from "@/lib/types";

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "ALL", days: Infinity },
] as const;

const W = 640;
const H = 220;
const PAD = { top: 16, right: 8, bottom: 22, left: 52 };

export function PriceChart({ history }: { history: PricePoint[] }) {
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [pathKey, setPathKey] = useState(0);

  const data = useMemo(() => {
    const cutoff = Date.now() - rangeDays * 86_400_000;
    const sliced = history.filter((p) => +new Date(p.date) >= cutoff);
    return sliced.length >= 2 ? sliced : history.slice(-2);
  }, [history, rangeDays]);

  const geom = useMemo(() => {
    const prices = data.map((p) => p.price);
    const min = Math.min(...prices) * 0.97;
    const max = Math.max(...prices) * 1.03;
    const iw = W - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (i / (data.length - 1)) * iw;
    const y = (v: number) => PAD.top + ih - ((v - min) / (max - min)) * ih;
    const line = data.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ");
    const area = `${line} L${x(data.length - 1).toFixed(1)},${(H - PAD.bottom)} L${PAD.left},${H - PAD.bottom} Z`;
    return { x, y, line, area, min, max };
  }, [data]);

  function pick(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const t = (relX - PAD.left) / (W - PAD.left - PAD.right);
    const idx = Math.round(t * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-ink">Market activity</p>
        <div className="flex gap-1" role="tablist" aria-label="Price range">
          {RANGES.map((r) => (
            <button
              key={r.label}
              role="tab"
              aria-selected={rangeDays === r.days}
              onClick={() => {
                setRangeDays(r.days);
                setHoverIdx(null);
                setPathKey((k) => k + 1);
              }}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                rangeDays === r.days ? "bg-gold text-ink font-semibold" : "text-ink-dim hover:bg-raised hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          onPointerMove={pick}
          onPointerLeave={() => setHoverIdx(null)}
        >
          {[0, 0.5, 1].map((t) => {
            const v = geom.min + (geom.max - geom.min) * (1 - t);
            const yy = PAD.top + t * (H - PAD.top - PAD.bottom);
            return (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} stroke="#2A2C2E" strokeWidth="1" />
                <text x={PAD.left - 6} y={yy + 3} textAnchor="end" fontSize="10" fill="#55585C" fontFamily="var(--font-jetbrains)">
                  {(v / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}

          <defs>
            <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C6A24B" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#C6A24B" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <g key={pathKey}>
            <path d={geom.area} fill="url(#chart-fill)" style={{ animation: "chartIn 700ms cubic-bezier(0.22,1,0.36,1)" }} />
            <path
              d={geom.line}
              fill="none"
              stroke="#C6A24B"
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                strokeDasharray: 2000,
                strokeDashoffset: 2000,
                animation: "drawLine 900ms cubic-bezier(0.4,0,0.2,1) forwards",
              }}
            />
          </g>

          {hoverIdx !== null && (
            <g>
              <line
                x1={geom.x(hoverIdx)}
                x2={geom.x(hoverIdx)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="#3A3C3E"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={geom.x(hoverIdx)} cy={geom.y(data[hoverIdx].price)} r="4" fill="#C6A24B" stroke="#141517" strokeWidth="2" />
            </g>
          )}

          <text x={PAD.left} y={H - 6} fontSize="10" fill="#55585C" fontFamily="var(--font-jetbrains)">
            {data[0].date}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="10" fill="#55585C" fontFamily="var(--font-jetbrains)">
            {data[data.length - 1].date}
          </text>

          <style>{`
            @keyframes drawLine { to { stroke-dashoffset: 0; } }
            @keyframes chartIn { from { opacity: 0; } to { opacity: 1; } }
          `}</style>
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-line-hv bg-elevated px-3 py-2 shadow-lifted"
            style={{
              left: `${((geom.x(hoverIdx!) / W) * 100).toFixed(1)}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-mono text-xs text-ink-dim">{hovered.date}</p>
            <p className="font-display text-lg leading-tight text-gold">{formatPeso(hovered.price)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
