import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { bg, FA, MONO, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== Line follower robot ===================== */
const TRACKS = [
  { fa: "منحنی ملایم", fn: (x: number) => 300 + Math.sin(x / 95) * 75 },
  { fa: "موج تند", fn: (x: number) => 300 + Math.sin(x / 42) * 95 },
  { fa: "مارپیچ مرکب", fn: (x: number) => 300 + Math.sin(x / 60) * 80 + Math.sin(x / 17) * 28 },
];
interface LfSim { track: number; x: number; y: number; th: number; speed: number; gain: number; thr: number; t: number; lost: boolean; errHist: { x: number; y: number }[]; ev: number; feed: FeedItem[] }

export function LineFollowerLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<LfSim>({ track: 0, x: 70, y: 300, th: 0, speed: 130, gain: 3.2, thr: 0.5, t: 0, lost: false, errHist: [], ev: 0, feed: [{ time: "#0", level: "info", msg: "ربات تعقیب خط با سه سنسور مادون‌قرمز — خطای موقعیت از تفاضل سنسورها به فرمان موتور تبدیل می‌شود. بهره و آستانه را تنظیم کنید." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const trackFn = TRACKS[S.track].fn;

  const reset = () => {
    S.x = 70; S.y = trackFn(70); S.th = 0; S.t = 0; S.lost = false; S.errHist = [];
    setRunning(true);
    force();
  };
  const rescue = () => {
    S.y = trackFn(S.x); S.th = 0; S.lost = false; setRunning(true);
    pushFeed("info", "ربات به خط برگردانده شد.");
  };

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (running && !S.lost) {
      S.t += ds;
      const ahead = S.x + 18;
      const ty = trackFn(ahead);
      const err = (S.y - ty) / 90; // + = below line
      S.th += -err * S.gain * ds * 3.2;
      S.th = Math.max(-0.9, Math.min(0.9, S.th));
      S.x += Math.cos(S.th) * S.speed * ds;
      S.y += Math.sin(S.th) * S.speed * ds;
      if (S.x > 920) { S.x = 70; S.y = trackFn(70); S.th = 0; pushFeed("ok", "یک دور کامل طی شد — ربات روی خط ماند."); }
      if (Math.abs(S.y - trackFn(S.x)) > 52) {
        S.lost = true; setRunning(false);
        pushFeed("error", `ربات در x=${fmt(S.x, 0)} از خط خارج شد — بهره خیلی ${S.gain > 4 ? "بالا (نوسان)" : "پایین"} یا سرعت زیاد است.`);
      }
      S.errHist.push({ x: Number(S.t.toFixed(1)), y: Number((err * 100).toFixed(1)) });
      if (S.errHist.length > 260) S.errHist.shift();
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    // floor
    ctx.fillStyle = "rgba(143,188,184,0.05)"; ctx.fillRect(40, 80, 880, 420);
    // track
    ctx.strokeStyle = "#1d5b63"; ctx.lineWidth = 26; ctx.lineCap = "round";
    ctx.beginPath();
    for (let x = 40; x <= 920; x += 8) { const y = trackFn(x); if (x === 40) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 4; ctx.setLineDash([14, 12]);
    ctx.beginPath();
    for (let x = 40; x <= 920; x += 8) { const y = trackFn(x); if (x === 40) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.setLineDash([]);
    // robot
    ctx.save();
    ctx.translate(S.x, S.y); ctx.rotate(S.th);
    ctx.fillStyle = S.lost ? "#ff6f61" : "#f2a83b";
    ctx.beginPath(); ctx.roundRect(-22, -16, 44, 32, 8); ctx.fill();
    ctx.fillStyle = "#04191d";
    ctx.beginPath(); ctx.moveTo(22, -8); ctx.lineTo(34, 0); ctx.lineTo(22, 8); ctx.closePath(); ctx.fill();
    // sensor dots
    const sens = [-13, 0, 13].map((off) => {
      const sx = S.x + 18, sy = S.y + off * Math.cos(S.th);
      const d = Math.abs(sy - trackFn(sx)) / 40;
      return Math.max(0, 1 - d);
    });
    sens.forEach((v, i) => {
      ctx.beginPath(); ctx.arc(14, (i - 1) * 13, 4, 0, Math.PI * 2);
      ctx.fillStyle = v > S.th ? "#a5d95c" : "#0f3d46";
      ctx.fill();
    });
    ctx.restore();
    // readout
    const errNow = ((S.y - trackFn(S.x + 18)) / 90) * 100;
    ctx.fillStyle = "rgba(4,25,29,0.75)"; ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(80, 420, 560, 74, 10); ctx.fill(); ctx.stroke();
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`خطا = ${fmt(errNow, 1)}`, 100, 448);
    ctx.fillStyle = "#a5d95c"; ctx.fillText(`L=${fmt(sens[0], 2)}  M=${fmt(sens[1], 2)}  R=${fmt(sens[2], 2)}`, 100, 474);
    ctx.fillStyle = S.lost ? "#ff6f61" : "#35d3c2";
    ctx.fillText(S.lost ? "خارج از خط!" : "در حال تعقیب", 400, 448);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`مسافت = ${fmt(S.x - 70, 0)} px`, 400, 474);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => { if (S.lost) rescue(); else setRunning((r) => !r); }}
      onReset={reset}
      simClock={`خطا = ${fmt(((S.y - trackFn(S.x + 18)) / 90) * 100, 0)}`}
      hint="بهره زیاد → نوسان و خروج از خط؛ بهره کم → جا ماندن در پیچ‌ها. نقطه بهینه را پیدا کنید."
      protocol={[
        { label: "تعقیب موفق مسیر ملایم", done: S.ev >= 1 || S.x > 600 },
        { label: "تنظیم بهره تا حد نوسان", done: S.lost || S.gain > 4.5 },
        { label: "مسیر موج تند", done: S.track === 1 },
        { label: "مسیر مارپیچ مرکب", done: S.track === 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <div>
          <div className="text-[12px] text-fog mb-1.5">مسیر</div>
          <div className="flex gap-1.5">
            {TRACKS.map((t, i) => (
              <button key={t.fa} onClick={() => { S.track = i; reset(); pushFeed("info", `مسیر «${t.fa}» انتخاب شد.`); }}
                className="flex-1 px-2 py-2 rounded-lg text-[11.5px] border transition-all cursor-pointer"
                style={S.track === i ? { borderColor: "#a5d95c", color: "#a5d95c", background: "#a5d95c15" } : { borderColor: "#175059", color: "#8fbcb8" }}>
                {t.fa}
              </button>
            ))}
          </div>
        </div>
        <Slider label="بهره کنترل (P)" value={S.gain} min={0.5} max={8} step={0.1} digits={1} accent="#a5d95c" onChange={(v) => { S.gain = v; force(); }} />
        <Slider label="سرعت ربات" value={S.speed} min={60} max={260} step={10} digits={0} unit="px/s" accent="#f2a83b" onChange={(v) => { S.speed = v; force(); }} />
        <Slider label="آستانه سنسورها" value={S.thr} min={0.2} max={0.9} step={0.05} digits={2} accent="#35d3c2" onChange={(v) => { S.thr = v; force(); }} />
        {S.lost && (
          <button onClick={rescue} className="w-full px-4 py-2.5 rounded-lg text-sm font-bold cursor-pointer" style={{ background: "#ff6f61", color: "#04191d" }}>
            بازگرداندن ربات به خط
          </button>
        )}
      </div>}
      chart={<LiveChart series={[sr("خطای تعقیب ٪", "#a5d95c", S.errHist)]} xLabel="t (s)" yLabel="خطا (٪)" height={230} />}
      table={{ headers: ["t (s)", "خطا ٪"], rows: S.errHist.filter((_, i) => i % 6 === 0).map((p) => [p.x, p.y]) }}
      stats={[
        { label: "خطای فعلی", value: `${fmt(((S.y - trackFn(S.x + 18)) / 90) * 100, 1)} ٪`, color: "#a5d95c" },
        { label: "مسافت طی‌شده", value: `${fmt(Math.max(0, S.x - 70), 0)} px`, color: "#e9f6f3" },
        { label: "بهره P", value: fmt(S.gain, 1), color: "#35d3c2" },
        { label: "سرعت", value: `${fmt(S.speed, 0)} px/s`, color: "#f2a83b" },
        { label: "وضعیت", value: S.lost ? "خارج از خط" : "روی خط", color: S.lost ? "#ff6f61" : "#a5d95c" },
        { label: "مسیر", value: TRACKS[S.track].fa, color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Line follower: 3 IR sensors, proportional control e -> steering`, `Gain=${fmt(S.gain, 1)}, speed=${fmt(S.speed, 0)}, track="${TRACKS[S.track].fa}"`]} />
  );
}

/* ===================== 2-DOF robot arm (inverse kinematics, draggable target) ===================== */
interface ArmSim { L1: number; L2: number; tx: number; ty: number; elbow: 1 | -1; drag: boolean; hist: { x: number; y: number; t1: number; t2: number }[]; t: number; ev: number; feed: FeedItem[] }

export function RobotArmLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<ArmSim>({ L1: 170, L2: 130, tx: 520, ty: 190, elbow: 1, drag: false, hist: [], t: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "بازوی دو مفصله — هدف را با ماوس بکشید؛ سینماتیک معکوس با قانون کسینوس‌ها زاویه مفاصل را در لحظه محاسبه می‌کند." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const BASE = { x: 260, y: 430 };
  const ik = () => {
    const dx = S.tx - BASE.x, dy = BASE.y - S.ty;
    let D = Math.hypot(dx, dy);
    const maxR = S.L1 + S.L2 - 2, minR = Math.abs(S.L1 - S.L2) + 2;
    const clamped = D > maxR || D < minR;
    D = Math.max(minR, Math.min(maxR, D));
    const a = Math.atan2(dy, dx);
    const cosT2 = (D * D - S.L1 * S.L1 - S.L2 * S.L2) / (2 * S.L1 * S.L2);
    const t2 = Math.acos(Math.max(-1, Math.min(1, cosT2))) * S.elbow;
    const t1 = a - Math.atan2(S.L2 * Math.sin(t2), S.L1 + S.L2 * Math.cos(t2));
    return { t1, t2, D, clamped };
  };

  const ptr = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current; if (!cv) return { x: 0, y: 0 };
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 960, y: ((e.clientY - r.top) / r.height) * 560 };
  };

  useRaf((dt) => {
    S.t += Math.min(dt, 50) / 1000;
    if (S.drag && frame.current % 5 === 0) {
      const { t1, t2 } = ik();
      S.hist.push({ x: Number(S.t.toFixed(1)), y: Number(((t1 * 180) / Math.PI).toFixed(1)), t1: Number(((t1 * 180) / Math.PI).toFixed(1)), t2: Number(((t2 * 180) / Math.PI).toFixed(1)) });
      if (S.hist.length > 240) S.hist.shift();
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const { t1, t2, D, clamped } = ik();
    const ex = BASE.x + S.L1 * Math.cos(t1), ey = BASE.y - S.L1 * Math.sin(t1);
    const wx = ex + S.L2 * Math.cos(t1 + t2), wy = ey - S.L2 * Math.sin(t1 + t2);
    // reach envelope
    ctx.strokeStyle = "rgba(179,136,255,0.35)"; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(BASE.x, BASE.y, S.L1 + S.L2, 0, Math.PI * 2); ctx.stroke();
    if (Math.abs(S.L1 - S.L2) > 4) { ctx.beginPath(); ctx.arc(BASE.x, BASE.y, Math.abs(S.L1 - S.L2), 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);
    // grid floor
    ctx.strokeStyle = "rgba(143,188,184,0.12)";
    ctx.beginPath(); ctx.moveTo(60, 470); ctx.lineTo(900, 470); ctx.stroke();
    // arm
    ctx.lineCap = "round";
    ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(BASE.x, BASE.y); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(wx, wy); ctx.stroke();
    // joints
    const joint = (x: number, y: number, r: number, col: string) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#0b3038"; ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    };
    joint(BASE.x, BASE.y, 16, "#b388ff");
    joint(ex, ey, 13, "#35d3c2");
    joint(wx, wy, 9, "#f2a83b");
    // target
    const tcol = clamped ? "#ff6f61" : "#f2a83b";
    ctx.strokeStyle = tcol; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(S.tx, S.ty, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(S.tx - 24, S.ty); ctx.lineTo(S.tx + 24, S.ty); ctx.moveTo(S.tx, S.ty - 24); ctx.lineTo(S.tx, S.ty + 24); ctx.stroke();
    if (clamped) { ctx.fillStyle = "#ff6f61"; ctx.font = `12px ${FA}`; ctx.fillText("خارج از محدوده — به حداکثر دسترسی چسبید", S.tx - 120, S.ty - 34); }
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("هدف را بکشید", S.tx + 22, S.ty - 22);
    // HUD
    ctx.fillStyle = "rgba(4,25,29,0.75)"; ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(620, 90, 300, 150, 10); ctx.fill(); ctx.stroke();
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#b388ff"; ctx.fillText(`θ₁ = ${fmt((t1 * 180) / Math.PI, 1)}°`, 640, 120);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`θ₂ = ${fmt((t2 * 180) / Math.PI, 1)}°`, 640, 146);
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`D = ${fmt(D, 0)} px`, 640, 172);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`مچ: (${fmt(wx - BASE.x, 0)}, ${fmt(BASE.y - wy, 0)})`, 640, 198);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText(`حالت آرنج: ${S.elbow === 1 ? "بالا" : "پایین"}`, 640, 224);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const { t1, t2, D } = ik();

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={S.drag}
      onToggleRun={() => pushFeed("info", "هدف را با ماوس روی صحنه بکشید تا سینماتیک معکوس در لحظه حل شود.")}
      onReset={() => { S.tx = 520; S.ty = 190; S.hist = []; pushFeed("info", "بازو به حالت اولیه بازگشت."); }}
      simClock={`θ₁=${fmt((t1 * 180) / Math.PI, 1)}° θ₂=${fmt((t2 * 180) / Math.PI, 1)}°`}
      hint="هدف را بیرون دایره دسترسی ببرید — بازو به نزدیک‌ترین نقطه ممکن می‌چسبد و هشدار می‌گیرد. حالت آرنج را عوض کنید."
      protocol={[
        { label: "کشیدن هدف و خواندن زاویه‌ها", done: S.hist.length > 5 },
        { label: "تغییر حالت آرنج", done: S.elbow === -1 },
        { label: "خروج از محدوده دسترسی", done: S.ev >= 1 },
        { label: "تغییر طول بازوها", done: S.L1 !== 170 || S.L2 !== 130 },
      ]}
      canvas={
        <canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => { const p = ptr(e); if (Math.hypot(p.x - S.tx, p.y - S.ty) < 40) { S.drag = true; (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); } }}
          onPointerMove={(e) => { if (S.drag) { const p = ptr(e); S.tx = Math.max(80, Math.min(900, p.x)); S.ty = Math.max(80, Math.min(460, p.y)); } }}
          onPointerUp={() => { if (S.drag) { S.drag = false; const { clamped } = ik(); if (clamped) pushFeed("warn", "هدف خارج از فضای کاری است — بازو در حداکثر دسترسی قفل شد."); else pushFeed("ok", `حل IK: θ₁=${fmt((ik().t1 * 180) / Math.PI, 1)}°، θ₂=${fmt((ik().t2 * 180) / Math.PI, 1)}°`); force(); } }}
        />
      }
      controls={<div className="space-y-5">
        <Slider label="طول بازو ۱ (شانه)" value={S.L1} min={80} max={230} step={5} digits={0} unit="px" accent="#b388ff" onChange={(v) => { S.L1 = v; force(); }} />
        <Slider label="طول بازو ۲ (آرنج)" value={S.L2} min={60} max={200} step={5} digits={0} unit="px" accent="#35d3c2" onChange={(v) => { S.L2 = v; force(); }} />
        <div className="flex gap-2">
          <button onClick={() => { S.elbow = 1; force(); }} className="flex-1 px-3 py-2.5 rounded-lg text-[12.5px] font-bold border transition-all cursor-pointer"
            style={S.elbow === 1 ? { borderColor: "#b388ff", color: "#b388ff", background: "#b388ff15" } : { borderColor: "#175059", color: "#8fbcb8" }}>آرنج بالا</button>
          <button onClick={() => { S.elbow = -1; force(); }} className="flex-1 px-3 py-2.5 rounded-lg text-[12.5px] font-bold border transition-all cursor-pointer"
            style={S.elbow === -1 ? { borderColor: "#b388ff", color: "#b388ff", background: "#b388ff15" } : { borderColor: "#175059", color: "#8fbcb8" }}>آرنج پایین</button>
        </div>
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          <span className="num text-teal">θ₂ = acos((D²−L₁²−L₂²)/2L₁L₂)</span>
          <br />دو جواب آینه‌ای وجود دارد — «حالت آرنج».
        </div>
      </div>}
      chart={<LiveChart series={[sr("θ₁ (درجه)", "#b388ff", S.hist.map((h) => ({ x: h.x, y: h.t1 }))), sr("θ₂ (درجه)", "#35d3c2", S.hist.map((h) => ({ x: h.x, y: h.t2 })))]} xLabel="t (s)" yLabel="زاویه (°)" height={230} />}
      table={{ headers: ["t (s)", "θ₁ (°)", "θ₂ (°)"], rows: S.hist.filter((_, i) => i % 5 === 0).map((h) => [h.x, h.t1, h.t2]) }}
      stats={[
        { label: "زاویه شانه θ₁", value: `${fmt((t1 * 180) / Math.PI, 1)}°`, color: "#b388ff" },
        { label: "زاویه آرنج θ₂", value: `${fmt((t2 * 180) / Math.PI, 1)}°`, color: "#35d3c2" },
        { label: "فاصله هدف D", value: `${fmt(D, 0)} px`, color: "#e9f6f3" },
        { label: "حداکثر دسترسی", value: `${fmt(S.L1 + S.L2, 0)} px`, color: "#f2a83b" },
        { label: "حداقل دسترسی", value: `${fmt(Math.abs(S.L1 - S.L2), 0)} px`, color: "#f2a83b" },
        { label: "درجه آزادی", value: "2 DOF", color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`2R planar arm: L1=${S.L1}, L2=${S.L2}`, `IK: th2=${fmt((t2 * 180) / Math.PI, 2)} deg, th1=${fmt((t1 * 180) / Math.PI, 2)} deg, D=${fmt(D, 1)}`]} />
  );
}

/* ===================== Obstacle avoidance robot ===================== */
interface ObSim { x: number; y: number; th: number; speed: number; detect: number; turnA: number; obs: { x: number; y: number; r: number }[]; decisions: number; dist: number; near: number; t: number; ev: number; feed: FeedItem[]; histNear: { x: number; y: number }[] }

export function ObstacleLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<ObSim>({
    x: 120, y: 300, th: 0, speed: 90, detect: 110, turnA: 55,
    obs: [{ x: 520, y: 300, r: 42 }, { x: 730, y: 180, r: 36 }, { x: 680, y: 430, r: 46 }],
    decisions: 0, dist: 0, near: 999, t: 0, ev: 0, histNear: [],
    feed: [{ time: "#0", level: "info", msg: "ربات متحرک با سنسور اولتراسونیک جلو — برای افزودن مانع روی صحنه کلیک کنید؛ ربات با فاصله کمتر از آستانه، فرمان چرخش می‌گیرد." }],
  }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const reset = () => { S.x = 120; S.y = 300; S.th = 0; S.decisions = 0; S.dist = 0; S.t = 0; S.histNear = []; setRunning(true); force(); };

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (running) {
      S.t += ds;
      // nearest forward obstacle
      let best = 999;
      for (const o of S.obs) {
        const dx = o.x - S.x, dy = o.y - S.y;
        const d = Math.hypot(dx, dy) - o.r;
        const dir = Math.atan2(dy, dx);
        let rel = dir - S.th;
        while (rel > Math.PI) rel -= 2 * Math.PI;
        while (rel < -Math.PI) rel += 2 * Math.PI;
        if (Math.abs(rel) < 0.85 && d < best) best = d;
      }
      S.near = best;
      if (best < S.detect) {
        // turn away from obstacle side
        const o = S.obs.reduce((a, b2) => (Math.hypot(a.x - S.x, a.y - S.y) < Math.hypot(b2.x - S.x, b2.y - S.y) ? a : b2));
        const side = Math.atan2(o.y - S.y, o.x - S.x) - S.th;
        S.th += (Math.sin(side) >= 0 ? -1 : 1) * ((S.turnA * Math.PI) / 180) * ds * 4;
        if (frame.current % 30 === 0) { S.decisions++; pushFeed("ok", `اجتناب #${S.decisions}: فاصله ${fmt(best, 0)} px — فرمان چرخش صادر شد.`); }
      }
      S.x += Math.cos(S.th) * S.speed * ds;
      S.y += Math.sin(S.th) * S.speed * ds;
      S.dist += S.speed * ds;
      // wrap walls
      if (S.x < 50) S.x = 50, S.th = Math.PI - S.th;
      if (S.x > 910) S.x = 910, S.th = Math.PI - S.th;
      if (S.y < 70) S.y = 70, S.th = -S.th;
      if (S.y > 500) S.y = 500, S.th = -S.th;
      S.histNear.push({ x: Number(S.t.toFixed(1)), y: Number(Math.min(best, 300).toFixed(0)) });
      if (S.histNear.length > 260) S.histNear.shift();
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    ctx.fillStyle = "rgba(143,188,184,0.05)"; ctx.fillRect(40, 60, 880, 450);
    // obstacles
    for (const o of S.obs) {
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,111,97,0.22)"; ctx.fill();
      ctx.strokeStyle = "#ff6f61"; ctx.lineWidth = 2.5; ctx.stroke();
    }
    // sensor cone
    ctx.save();
    ctx.translate(S.x, S.y); ctx.rotate(S.th);
    const coneCol = S.near < S.detect ? "rgba(255,111,97,0.16)" : "rgba(53,211,194,0.10)";
    ctx.fillStyle = coneCol;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, S.detect, -0.85, 0.85); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = S.near < S.detect ? "rgba(255,111,97,0.5)" : "rgba(53,211,194,0.4)";
    ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.arc(0, 0, S.detect, -0.85, 0.85); ctx.stroke();
    ctx.setLineDash([]);
    // robot body
    ctx.fillStyle = "#b388ff";
    ctx.beginPath(); ctx.roundRect(-20, -15, 40, 30, 8); ctx.fill();
    ctx.fillStyle = "#04191d";
    ctx.beginPath(); ctx.moveTo(20, -7); ctx.lineTo(31, 0); ctx.lineTo(20, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    // HUD
    ctx.fillStyle = "rgba(4,25,29,0.75)"; ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(80, 60, 330, 74, 10); ctx.fill(); ctx.stroke();
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = S.near < S.detect ? "#ff6f61" : "#35d3c2";
    ctx.fillText(`فاصله تا مانع: ${S.near > 300 ? ">300" : fmt(S.near, 0)} px`, 100, 88);
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`فرمان‌های اجتناب: ${S.decisions}`, 100, 114);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`مسافت: ${fmt(S.dist, 0)} px · موانع: ${S.obs.length}`, 100, 470 + 0);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("برای افزودن مانع کلیک کنید", 700, 490);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)} onReset={reset}
      simClock={`فاصله = ${S.near > 300 ? "∞" : fmt(S.near, 0)} px`}
      hint="با کلیک مانع بسازید؛ آستانه تشخیص را تغییر دهید و ببینید ربات زودتر یا دیرتر واکنش نشان می‌دهد."
      protocol={[
        { label: "مشاهده اجتناب خودکار", done: S.decisions >= 1 },
        { label: "افزودن مانع با کلیک", done: S.obs.length > 3 },
        { label: "تغییر آستانه تشخیص", done: S.ev >= 2 || S.detect !== 110 },
        { label: "تغییر زاویه چرخش", done: S.turnA !== 55 },
      ]}
      canvas={
        <canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto cursor-crosshair"
          onPointerDown={(e) => {
            const cv = canvasRef.current; if (!cv) return;
            const r = cv.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width) * 960, y = ((e.clientY - r.top) / r.height) * 560;
            if (S.obs.length < 10) { S.obs.push({ x, y, r: 28 + Math.random() * 24 }); pushFeed("info", `مانع جدید در (${fmt(x, 0)}, ${fmt(y, 0)}) اضافه شد — تعداد: ${S.obs.length}`); force(); }
            else pushFeed("warn", "حداکثر ۱۰ مانع — یکی را حذف کنید (بازنشانی).");
          }} />
      }
      controls={<div className="space-y-5">
        <Slider label="سرعت ربات" value={S.speed} min={40} max={180} step={10} digits={0} unit="px/s" accent="#b388ff" onChange={(v) => { S.speed = v; force(); }} />
        <Slider label="آستانه تشخیص سنسور" value={S.detect} min={60} max={200} step={5} digits={0} unit="px" accent="#ff6f61" onChange={(v) => { S.detect = v; force(); }} />
        <Slider label="زاویه فرمان چرخش" value={S.turnA} min={20} max={120} step={5} digits={0} unit="°" accent="#35d3c2" onChange={(v) => { S.turnA = v; force(); }} />
        <button onClick={() => { if (S.obs.length > 0) { S.obs.pop(); pushFeed("info", "آخرین مانع حذف شد."); force(); } }}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border border-coral/60 text-coral hover:bg-coral/10 transition-colors cursor-pointer">
          حذف آخرین مانع
        </button>
      </div>}
      chart={<LiveChart series={[sr("فاصله تا نزدیک‌ترین مانع (px)", "#ff6f61", S.histNear), sr("آستانه تشخیص", "#35d3c2", S.histNear.length ? [{ x: S.histNear[0].x, y: S.detect }, { x: S.histNear[S.histNear.length - 1].x, y: S.detect }] : [])]} xLabel="t (s)" yLabel="فاصله (px)" height={230} yMin={0} />}
      table={{ headers: ["t (s)", "فاصله (px)"], rows: S.histNear.filter((_, i) => i % 6 === 0).map((p) => [p.x, p.y]) }}
      stats={[
        { label: "فاصله فعلی", value: S.near > 300 ? ">300 px" : `${fmt(S.near, 0)} px`, color: S.near < S.detect ? "#ff6f61" : "#35d3c2" },
        { label: "فرمان‌های اجتناب", value: `${S.decisions}`, color: "#f2a83b" },
        { label: "مسافت طی‌شده", value: `${fmt(S.dist, 0)} px`, color: "#e9f6f3" },
        { label: "تعداد موانع", value: `${S.obs.length}`, color: "#b388ff" },
        { label: "آستانه تشخیص", value: `${fmt(S.detect, 0)} px`, color: "#35d3c2" },
        { label: "سرعت", value: `${fmt(S.speed, 0)} px/s`, color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Obstacle avoidance: ultrasonic threshold=${fmt(S.detect, 0)}px, turn=${S.turnA} deg`, `Decisions=${S.decisions}, obstacles=${S.obs.length}, distance=${fmt(S.dist, 0)}px`]} />
  );
}
