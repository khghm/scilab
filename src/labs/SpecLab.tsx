import { useEffect, useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode, type StatItem } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { SUBJECTS, type Experiment, type Subject } from "../data/catalog";
import { bioScene, chemScene, FA, glow, medScene, MONO, physScene, rr } from "./draw";
import { SPECS, type LabSpecDef } from "./specs1";
export { };

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ------------------------------------------------------------------ */
/*  Generic high-fidelity parametric laboratory.                       */
/*  Each experiment is a LabSpecDef: real formulae, live curves,       */
/*  animated sweep, parameter marker, readouts, protocol tracking.     */
/* ------------------------------------------------------------------ */

const sceneOf: Record<Subject, (ctx: CanvasRenderingContext2D, W: number, H: number, ar: boolean, t?: number) => void> = {
  physics: physScene,
  chemistry: chemScene,
  biology: bioScene,
  electronics: physScene,
  medicine: medScene,
};

function autoRange(vals: number[]): [number, number] {
  const f = vals.filter((v) => isFinite(v));
  if (f.length < 2) return [0, 1];
  const s = [...f].sort((a, b) => a - b);
  const lo = s[Math.floor(s.length * 0.02)];
  const hi = s[Math.max(1, Math.ceil(s.length * 0.98) - 1)];
  let y0 = lo, y1 = hi;
  if (y1 - y0 < 1e-12) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.14;
  return [y0 - pad, y1 + pad];
}

function sample(fn: (x: number, p: Record<string, number>) => number, p: Record<string, number>, x0: number, x1: number, n = 160) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push({ x, y: fn(x, p) });
  }
  return pts;
}

/** draw a curve, breaking the path at non-finite or huge jumps (asymptotes) */
function strokeCurve(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], X: (x: number) => number, Y: (y: number) => number, span: number) {
  ctx.beginPath();
  let pen = false;
  let prevY = NaN;
  for (const pt of pts) {
    if (!isFinite(pt.y) || Math.abs(pt.y - prevY) > span * 3) { pen = false; prevY = pt.y; continue; }
    const x = X(pt.x), y = Y(pt.y);
    if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
    prevY = pt.y;
  }
  ctx.stroke();
}

import type { CurveSpec } from "./specs1";
interface ResolvedCurve extends CurveSpec { x0: number; x1: number }
interface ResolvedSpec extends Omit<LabSpecDef, "curves"> { curves: ResolvedCurve[] }
function normalize(raw: LabSpecDef): ResolvedSpec {
  const x0 = raw.curves[0].x0 ?? 0;
  const x1 = raw.curves[0].x1 ?? 1;
  return { ...raw, curves: raw.curves.map((c) => ({ ...c, x0: c.x0 ?? x0, x1: c.x1 ?? x1 })) };
}

export function SpecLab({ exp, onBack, initMode }: Props) {
  const spec: ResolvedSpec = normalize(SPECS[exp.id]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);

  const params = useRef<Record<string, number>>(
    Object.fromEntries(spec.params.map((q) => [q.key, q.def]))
  ).current;
  const S = useRef({
    tp: 0, changes: 0, lastPush: 0, ev: 0,
    feed: [{ time: "#0", level: "info", msg: spec.hint }] as FeedItem[],
  }).current;

  const sub = SUBJECTS[exp.subject];

  const pushFeed = (level: FeedItem["level"], msg: string) => {
    S.ev++;
    S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 22);
    force();
  };

  const onParam = (key: string, label: string, v: number) => {
    params[key] = v;
    S.changes++;
    const now = performance.now();
    if (now - S.lastPush > 1100) {
      S.lastPush = now;
      const ro = spec.readouts(params);
      pushFeed("info", `${label} = ${fmt(v, 2)} → ${ro[0].label}: ${ro[0].value}`);
    } else {
      force();
    }
  };

  useRaf((dt) => {
    if (running) S.tp += Math.min(dt, 60) / 1000;
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const W = 960, H = 560;
    sceneOf[exp.subject](ctx, W, H, mode === "ar", performance.now() / 1000);

    const accent = sub.color;
    const ml = 74, mr = 30, mt = 34, mb = 58;
    const pw = W - ml - mr, ph = H - mt - mb;
    const c0 = spec.curves[0];
    const x0 = c0.x0 ?? 0, x1 = c0.x1 ?? 1;
    const curves = spec.curves.map((cs) => ({ ...cs, x0: cs.x0 ?? x0, x1: cs.x1 ?? x1 }));
    const pts0 = sample(c0.fn, params, x0, x1);
    const allY = pts0.map((q) => q.y);
    const [yMin, yMax] = spec.yRange ? spec.yRange(params) : autoRange(allY);
    const X = (x: number) => ml + ((x - x0) / (x1 - x0)) * pw;
    const Y = (y: number) => mt + ph - ((Math.max(yMin, Math.min(yMax, y)) - yMin) / (yMax - yMin)) * ph;

    // plot frame
    ctx.fillStyle = "rgba(4,20,24,0.55)";
    rr(ctx, ml - 8, mt - 8, pw + 16, ph + 16, 12); ctx.fill();
    ctx.strokeStyle = `${accent}55`; ctx.lineWidth = 1.6;
    rr(ctx, ml - 8, mt - 8, pw + 16, ph + 16, 12); ctx.stroke();

    // grid
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const gx = ml + (pw * i) / 5;
      ctx.strokeStyle = "rgba(143,188,184,0.12)";
      ctx.beginPath(); ctx.moveTo(gx, mt); ctx.lineTo(gx, mt + ph); ctx.stroke();
      ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(fmt(c0.x0 + ((c0.x1 - c0.x0) * i) / 5, Math.abs(c0.x1 - c0.x0) > 50 ? 0 : 1), gx, mt + ph + 18);
    }
    for (let i = 0; i <= 4; i++) {
      const gy = mt + (ph * i) / 4;
      ctx.strokeStyle = "rgba(143,188,184,0.12)";
      ctx.beginPath(); ctx.moveTo(ml, gy); ctx.lineTo(ml + pw, gy); ctx.stroke();
      ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`; ctx.textAlign = "right";
      ctx.fillText(fmt(yMax - ((yMax - yMin) * i) / 4, Math.abs(yMax - yMin) > 20 ? 0 : 2), ml - 10, gy + 3.5);
    }
    ctx.textAlign = "left";

    // secondary curves (faint)
    for (let i = spec.curves.length - 1; i >= 1; i--) {
      const cs = spec.curves[i];
      const pts = sample(cs.fn, params, cs.x0 ?? c0.x0, cs.x1 ?? c0.x1);
      ctx.strokeStyle = cs.color; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.6;
      strokeCurve(ctx, pts, X, Y, yMax - yMin);
      ctx.globalAlpha = 1;
    }

    // primary curve: glow area + luminous stroke
    const grad = ctx.createLinearGradient(0, mt, 0, mt + ph);
    grad.addColorStop(0, `${accent}30`);
    grad.addColorStop(1, `${accent}03`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    let pen = false, firstX = 0, lastX = 0;
    for (const pt of pts0) {
      if (!isFinite(pt.y)) continue;
      const x = X(pt.x), y = Y(pt.y);
      if (!pen) { ctx.moveTo(x, y); firstX = x; pen = true; } else ctx.lineTo(x, y);
      lastX = x;
    }
    ctx.lineTo(lastX, mt + ph); ctx.lineTo(firstX, mt + ph); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 2.8;
    if (mode !== "ar") { ctx.shadowColor = accent; ctx.shadowBlur = 13; }
    strokeCurve(ctx, pts0, X, Y, yMax - yMin);
    ctx.shadowBlur = 0;

    // parameter marker
    const mk = c0.markerKey;
    if (mk && params[mk] !== undefined) {
      const mx = X(Math.max(c0.x0, Math.min(c0.x1, params[mk])));
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(mx, mt); ctx.lineTo(mx, mt + ph); ctx.stroke();
      ctx.setLineDash([]);
      const mv = c0.fn(params[mk], params);
      if (isFinite(mv)) {
        ctx.fillStyle = "#35d3c2";
        ctx.beginPath(); ctx.arc(mx, Y(mv), 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(53,211,194,0.5)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(mx, Y(mv), 10, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = "rgba(4,25,29,0.85)";
      rr(ctx, mx - 60, mt + 6, 120, 24, 7); ctx.fill();
      ctx.strokeStyle = "rgba(53,211,194,0.6)"; ctx.lineWidth = 1.2;
      rr(ctx, mx - 60, mt + 6, 120, 24, 7); ctx.stroke();
      ctx.fillStyle = "#35d3c2"; ctx.font = `11px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(`${c0.markerLabel ?? mk} = ${fmt(params[mk], 2)}`, mx, mt + 22);
      ctx.textAlign = "left";
    }

    // animated sweep dot
    const span = c0.x1 - c0.x0;
    const xs = c0.x0 + ((S.tp * span / 7) % span);
    const ys = c0.fn(xs, params);
    if (isFinite(ys)) {
      if (mode !== "ar") glow(ctx, X(xs), Y(ys), 26, hex(accent), 0.4);
      ctx.fillStyle = "#e9f6f3";
      ctx.beginPath(); ctx.arc(X(xs), Y(ys), 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(4,25,29,0.85)";
      rr(ctx, W - mr - 168, mt + ph - 34, 160, 26, 7); ctx.fill();
      ctx.fillStyle = "#e9f6f3"; ctx.font = `11px ${MONO}`; ctx.textAlign = "right";
      ctx.fillText(`x=${fmt(xs, 2)}  y=${fmt(ys, 2)}`, W - mr - 18, mt + ph - 16);
      ctx.textAlign = "left";
    }

    // formula strip
    ctx.fillStyle = "rgba(4,25,29,0.8)";
    rr(ctx, ml, mt + ph + 30, Math.min(560, ctx.measureText(spec.formula).width * 0 + 560), 22, 6); ctx.fill();
    ctx.fillStyle = accent; ctx.font = `12px ${MONO}`;
    ctx.fillText(spec.formula, ml + 12, mt + ph + 45);

    // axis captions
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.textAlign = "center";
    ctx.fillText(spec.xLabel, ml + pw / 2, H - 6);
    ctx.textAlign = "left";
    ctx.fillText(spec.yLabel, ml, mt - 16);

    frame++;
    if (frame % 9 === 0) force();
  }, true);
  let frame = 0;

  // derived data
  const readouts: StatItem[] = spec.readouts(params);
  const chartSeries = spec.curves.map((cs, i) => ({
    name: cs.name,
    color: i === 0 ? sub.color : cs.color,
    ["data"]: sample(cs.fn, params, cs.x0 ?? spec.curves[0].x0, cs.x1 ?? spec.curves[0].x1, 90)
      .filter((q) => isFinite(q.y))
      .map((q) => ({ x: Number(q.x.toFixed(3)), y: Number(q.y.toFixed(3)) })),
  }));
  const c0 = spec.curves[0];
  const tbl = spec.table
    ? spec.table(params)
    : {
        headers: [spec.xLabel, spec.yLabel],
        rows: Array.from({ length: 9 }, (_, i) => {
          const x = c0.x0 + ((c0.x1 - c0.x0) * i) / 8;
          const y = c0.fn(x, params);
          return [Number(x.toFixed(2)), isFinite(y) ? Number(y.toFixed(3)) : "—"];
        }),
      };
  const ro = spec.readouts(params);

  useEffect(() => {
    const t = window.setTimeout(() => {
      pushFeed("ok", "منحنی زنده پایدار شد — پارامترها را تغییر دهید و پاسخ لحظه‌ای سیستم را ببینید.");
    }, 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        for (const q of spec.params) params[q.key] = q.def;
        S.changes = 0;
        pushFeed("info", "همه پارامترها به مقادیر مرجع بازگشتند.");
      }}
      simClock={ro[0] ? `${ro[0].label} = ${ro[0].value}` : "—"}
      hint={spec.hint}
      protocol={spec.protocol.map((label, i) => ({ label, done: i === 0 ? true : S.changes >= i * 2 }))}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-4">
          {spec.params.map((q) => (
            <Slider key={q.key} label={q.label} value={params[q.key]} min={q.min} max={q.max} step={q.step}
              digits={q.digits ?? 1} unit={q.unit} accent={q.accent ?? sub.color}
              onChange={(v) => onParam(q.key, q.label, v)} />
          ))}
        </div>
      }
      chart={
        <LiveChart series={chartSeries as never} xLabel={spec.xLabel} yLabel={spec.yLabel} height={230}
          markerX={c0.markerKey ? params[c0.markerKey] : null} markerLabel={c0.markerLabel} />
      }
      table={tbl}
      stats={readouts}
      feed={S.feed}
      clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[spec.formula, spec.params.map((q) => `${q.key} = ${fmt(params[q.key], 3)}${q.unit ? " " + q.unit : ""}`).join(", "), ro.slice(0, 3).map((r) => `${r.label} = ${r.value}`).join("; ")]}
    />
  );
}

function hex(c: string): [number, number, number] {
  const h = c.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
