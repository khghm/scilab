import { useId } from "react";
import { fmtA, useSize } from "../lib/utils";

export interface Pt { x: number; y: number }
export interface SeriesDef {
  name: string;
  color: string;
  data?: Pt[];
  values?: Pt[];
}

export function ptsOf(s: SeriesDef): Pt[] {
  return s.data ?? s.values ?? [];
}

interface Props {
  series: SeriesDef[];
  xLabel: string;
  yLabel: string;
  height?: number;
  yMin?: number;
  yMax?: number;
  markerX?: number | null;
  markerLabel?: string;
}

export function LiveChart({ series, xLabel, yLabel, height = 230, yMin, yMax, markerX = null, markerLabel }: Props) {
  const { ref, width: W } = useSize<HTMLDivElement>();
  const H = height;
  const pad = { l: 48, r: 16, t: 14, b: 30 };
  const clipId = useId().replace(/[^a-zA-Z0-9]/g, "");

  const xs: number[] = [];
  const ys: number[] = [];
  for (const s of series)
    for (const p of ptsOf(s))
      if (isFinite(p.x) && isFinite(p.y)) { xs.push(p.x); ys.push(p.y); }

  return (
    <div ref={ref} dir="ltr" className="w-full">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
        {series.map((s) => {
          const d = ptsOf(s);
          const last = d.length ? d[d.length - 1] : null;
          return (
            <span key={s.name} className="inline-flex items-center gap-1.5 text-[11px] text-fog">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
              {s.name}
              {last && <b className="num text-snow font-medium">{fmtA(last.y)}</b>}
            </span>
          );
        })}
        {markerX != null && markerLabel && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-teal">
            <span className="w-4 border-t border-dashed border-teal" />
            {markerLabel}
          </span>
        )}
      </div>

      {xs.length < 2 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-edge text-fog text-xs" style={{ height: H - 40 }}>
          در حال جمع‌آوری داده… آزمایش را اجرا کنید
        </div>
      ) : (
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {(() => {
            let x0 = Math.min(...xs);
            let x1 = Math.max(...xs);
            if (x1 - x0 < 1e-9) x1 = x0 + 1;
            let y0 = yMin ?? Math.min(...ys, 0);
            let y1 = yMax ?? Math.max(...ys, 0);
            if (Math.abs(y1 - y0) < 1e-9) { y0 -= 1; y1 += 1; }
            const my = (y1 - y0) * 0.08;
            if (yMin == null) y0 -= my;
            if (yMax == null) y1 += my;

            const mx = (x: number) => pad.l + ((x - x0) / (x1 - x0)) * (W - pad.l - pad.r);
            const myy = (y: number) => H - pad.b - ((y - y0) / (y1 - y0)) * (H - pad.t - pad.b);
            const yTicks = [0, 1, 2, 3, 4].map((i) => y0 + ((y1 - y0) * i) / 4);
            const xTicks = [0, 1, 2, 3, 4].map((i) => x0 + ((x1 - x0) * i) / 4);

            return (
              <>
                <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} fill="rgba(7,37,43,0.5)" stroke="rgba(23,80,89,0.8)" />
                {yTicks.map((t, i) => (
                  <g key={`y${i}`}>
                    <line x1={pad.l} x2={W - pad.r} y1={myy(t)} y2={myy(t)} stroke="rgba(143,188,184,0.13)" />
                    <text x={pad.l - 7} y={myy(t) + 3.5} textAnchor="end" fontSize={10} fill="#8fbcb8" fontFamily="IBM Plex Mono, monospace">{fmtA(t)}</text>
                  </g>
                ))}
                {xTicks.map((t, i) => (
                  <g key={`x${i}`}>
                    <line x1={mx(t)} x2={mx(t)} y1={pad.t} y2={H - pad.b} stroke="rgba(143,188,184,0.07)" />
                    <text x={mx(t)} y={H - pad.b + 16} textAnchor="middle" fontSize={10} fill="#8fbcb8" fontFamily="IBM Plex Mono, monospace">{fmtA(t)}</text>
                  </g>
                ))}
                {markerX != null && markerX >= x0 && markerX <= x1 && (
                  <line x1={mx(markerX)} x2={mx(markerX)} y1={pad.t} y2={H - pad.b} stroke="#35d3c2" strokeWidth={1.4} strokeDasharray="5 4" />
                )}
                <clipPath id={`clip${clipId}`}>
                  <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} />
                </clipPath>
                <g clipPath={`url(#clip${clipId})`}>
                  {series.map((s, si) => {
                    const pts = ptsOf(s).filter((p) => p.x >= x0 && p.x <= x1);
                    if (pts.length < 2) return null;
                    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${mx(p.x).toFixed(1)},${myy(p.y).toFixed(1)}`).join("");
                    const last = pts[pts.length - 1];
                    return (
                      <g key={s.name}>
                        {si === 0 && (
                          <path d={`${d}L${mx(last.x).toFixed(1)},${myy(Math.max(y0, Math.min(y1, 0))).toFixed(1)}L${mx(pts[0].x).toFixed(1)},${myy(Math.max(y0, Math.min(y1, 0))).toFixed(1)}Z`} fill={s.color} opacity={0.08} />
                        )}
                        <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                        <circle cx={mx(last.x)} cy={myy(last.y)} r={5.5} fill={s.color} opacity={0.18} />
                        <circle cx={mx(last.x)} cy={myy(last.y)} r={3} fill={s.color} />
                      </g>
                    );
                  })}
                </g>
                <text x={W - pad.r} y={H - 6} textAnchor="end" fontSize={10} fill="#8fbcb8" fontFamily="IBM Plex Mono, monospace">{xLabel}</text>
                <text x={12} y={pad.t + 2} fontSize={10} fill="#8fbcb8" fontFamily="IBM Plex Mono, monospace">{yLabel}</text>
              </>
            );
          })()}
        </svg>
      )}
    </div>
  );
}
