import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { arrow, bg, hud, FA, MONO, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== Spring SHM ===================== */
export function SpringLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ m: 1, k: 40, A: 0.8, damp: 0, t: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "جرم روی فنر — نوسان هماهنگ ساده با T=2π√(m/k). میرایی را زیاد کنید تا میرایی نمایی را ببینید." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const w0 = Math.sqrt(S.k / S.m);
  const T = (2 * Math.PI) / w0;
  const yAt = (t: number) => S.A * Math.cos(w0 * t) * Math.exp(-S.damp * t);

  useRaf((dt) => {
    if (running) S.t += Math.min(dt, 50) / 1000;
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const sx = 260, top = 90;
    ctx.fillStyle = "#2a7a80"; ctx.fillRect(sx - 90, top - 26, 180, 20);
    const yEq = 300, y = yEq + yAt(S.t) * 150;
    ctx.strokeStyle = "#8fbcb8"; ctx.lineWidth = 3;
    ctx.beginPath();
    const coils = 9;
    for (let i = 0; i <= coils * 2; i++) {
      const yy = top - 6 + ((y - 24 - (top - 6)) * i) / (coils * 2);
      const xx = sx + (i % 2 === 0 ? -26 : 26) * (i === 0 || i === coils * 2 ? 0 : 1);
      if (i === 0) ctx.moveTo(sx, top - 6); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.fillStyle = "#f2a83b";
    ctx.fillRect(sx - 38, y - 24, 76, 48);
    ctx.fillStyle = "#04191d"; ctx.font = `700 13px ${MONO}`; ctx.textAlign = "center";
    ctx.fillText(`${fmt(S.m, 1)}kg`, sx, y + 4); ctx.textAlign = "left";
    ctx.setLineDash([5, 6]); ctx.strokeStyle = "rgba(53,211,194,0.5)";
    ctx.beginPath(); ctx.moveTo(sx - 130, yEq); ctx.lineTo(sx + 130, yEq); ctx.stroke();
    ctx.setLineDash([]);
    const vel = -S.A * w0 * Math.sin(w0 * S.t) * Math.exp(-S.damp * S.t);
    arrow(ctx, sx + 60, y, 0, Math.max(-60, Math.min(60, vel * 55)), "#a5d95c");
    const disp = yAt(S.t), KE = 0.5 * S.m * vel * vel, PE = 0.5 * S.k * disp * disp;
    hud(ctx, 560, 120, 330, 190, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`T = 2π√(m/k) = ${fmt(T, 2)} s`, 580, 150);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`x = ${fmt(disp, 2)} m`, 580, 176);
    ctx.fillStyle = "#a5d95c"; ctx.fillText(`v = ${fmt(vel, 2)} m/s`, 580, 202);
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText("KE", 580, 232); ctx.fillText("PE", 580, 262);
    ctx.fillStyle = "#a5d95c"; ctx.fillRect(630, 220, Math.min(240, (KE / (0.5 * S.k * S.A * S.A)) * 240), 12);
    ctx.fillStyle = "#f2a83b"; ctx.fillRect(630, 250, Math.min(240, (PE / (0.5 * S.k * S.A * S.A)) * 240), 12);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const dispCurve = Array.from({ length: 200 }, (_, i) => ({ x: Number(((i / 199) * 8 * T).toFixed(2)), y: Number(yAt((i / 199) * 8 * T).toFixed(3)) }));
  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.t = 0; pushFeed("info", "نوسان از دامنه اولیه از سر گرفته شد."); }}
      simClock={`T = ${fmt(T, 2)} s`}
      hint="جرم را ۴ برابر کنید تا دوره ۲ برابر شود. میرایی انرژی را به‌تدریج می‌گیرد — دامنه نمایی کم می‌شود."
      protocol={[
        { label: "اندازه‌گیری دوره نوسان", done: true },
        { label: "تأیید T=2π√(m/k)", done: S.ev >= 1 || S.m !== 1 },
        { label: "مشاهده تبادل KE/PE", done: true },
        { label: "اثر میرایی بر دامنه", done: S.damp > 0 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="جرم m" value={S.m} min={0.5} max={5} step={0.5} digits={1} unit="kg" accent="#f2a83b" onChange={(v) => { S.m = v; pushFeed("info", `دوره T = ${fmt((2 * Math.PI) / Math.sqrt(S.k / v), 2)} s شد.`); }} />
        <Slider label="ثابت فنر k" value={S.k} min={10} max={150} step={5} digits={0} unit="N/m" accent="#35d3c2" onChange={(v) => { S.k = v; force(); }} />
        <Slider label="دامنه A" value={S.A} min={0.2} max={1} step={0.05} digits={2} unit="m" accent="#56b8ff" onChange={(v) => { S.A = v; force(); }} />
        <Slider label="ضریب میرایی γ" value={S.damp} min={0} max={0.5} step={0.02} digits={2} unit="1/s" accent="#ff6f61" onChange={(v) => { S.damp = v; force(); }} />
      </div>}
      chart={<LiveChart series={[sr("جابجایی x (m)", "#35d3c2", dispCurve)]} xLabel="t (s)" yLabel="x (m)" height={230} />}
      table={{ headers: ["t (s)", "x (m)", "v (m/s)", "E کل (J)"], rows: [0, 1, 2, 3, 4, 5].map((t) => { const d = yAt(t * T / 4); const vv = -S.A * w0 * Math.sin(w0 * t * T / 4) * Math.exp(-S.damp * t * T / 4); return [Number((t * T / 4).toFixed(2)), Number(d.toFixed(3)), Number(vv.toFixed(2)), Number((0.5 * S.k * d * d + 0.5 * S.m * vv * vv).toFixed(3))]; }) }}
      stats={[
        { label: "دوره T", value: `${fmt(T, 2)} s`, color: "#f2a83b", sub: "2π√(m/k)" },
        { label: "بسامد f", value: `${fmt(1 / T, 2)} Hz`, color: "#35d3c2" },
        { label: "بسامد زاویه‌ای ω", value: `${fmt(w0, 2)} rad/s`, color: "#e9f6f3" },
        { label: "انرژی کل", value: `${fmt(0.5 * S.k * S.A * S.A, 2)} J`, color: "#a5d95c" },
        { label: "جابجایی فعلی", value: `${fmt(yAt(S.t), 2)} m`, color: "#e9f6f3" },
        { label: "سرعت فعلی", value: `${fmt(-S.A * w0 * Math.sin(w0 * S.t) * Math.exp(-S.damp * S.t), 2)} m/s`, color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`SHM: m=${fmt(S.m, 1)}kg, k=${S.k}N/m => T=2\\pi\\sqrt{m/k}=${fmt(T, 3)}s`, `x(t)=A\\cos(\\omega t)e^{-\\gamma t}, A=${fmt(S.A, 2)}m, \\gamma=${fmt(S.damp, 2)}`]} />
  );
}

/* ===================== Free fall ===================== */
const PLANETS: [string, number][] = [["ماه", 1.62], ["مریخ", 3.71], ["زمین", 9.81], ["مشتری", 24.79]];
export function FreeFallLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ h: 5, g: 9.81, air: false, t: -1, landed: false, bestT: NaN, ev: 0, feed: [{ time: "#0", level: "info", msg: "جسم را رها کنید — زمان‌سنج از لحظه رهاکردن تا فرود کار می‌کند. g = 2h/t². سیارات مختلف را امتحان کنید." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const tIdeal = Math.sqrt((2 * S.h) / S.g);

  const drop = () => {
    S.t = 0; S.landed = false; setRunning(true);
    pushFeed("info", `رها شد از h=${fmt(S.h, 1)} m — زمان فرود نظری ${fmt(tIdeal, 2)} s.`);
  };
  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (running && S.t >= 0 && !S.landed) {
      S.t += ds;
      if (S.t >= tIdeal) {
        S.landed = true; S.bestT = tIdeal; setRunning(false);
        pushFeed("ok", `فرود در t=${fmt(tIdeal, 2)} s — g اندازه‌گیری‌شده = 2h/t² = ${fmt((2 * S.h) / (tIdeal * tIdeal), 2)} m/s².`);
        if (S.air) pushFeed("warn", "با مقاومت هوا زمان فرود واقعی بیشتر از این مقدار نظری می‌شود.");
      }
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const top = 90, bot = 470;
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(200, top); ctx.lineTo(200, bot); ctx.stroke();
    for (let i = 0; i <= 5; i++) {
      const yy = bot - (i / 5) * (bot - top);
      ctx.beginPath(); ctx.moveTo(195, yy); ctx.lineTo(210, yy); ctx.stroke();
      ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`;
      ctx.fillText(`${fmt((S.h * i) / 5, 1)}`, 168, yy + 4);
    }
    ctx.fillStyle = "#56b8ff"; ctx.fillRect(140, bot, 500, 14);
    const frac = S.t < 0 ? 0 : Math.min(1, (S.t / tIdeal) ** 2);
    const by = top + frac * (bot - top - 24);
    ctx.fillStyle = "#f2a83b";
    ctx.beginPath(); ctx.arc(300, by, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#04191d"; ctx.font = `700 11px ${MONO}`; ctx.textAlign = "center";
    ctx.fillText("2kg", 300, by + 4); ctx.textAlign = "left";
    if (S.landed) {
      ctx.fillStyle = "rgba(165,217,92,0.25)";
      ctx.beginPath(); ctx.arc(300, bot - 10, 34, 0, Math.PI * 2); ctx.fill();
    }
    hud(ctx, 560, 140, 320, 160, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`t = ${S.t >= 0 ? fmt(S.t, 2) : "—"} s`, 580, 170);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`t نظری = ${fmt(tIdeal, 2)} s`, 580, 196);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`g = ${fmt(S.g, 2)} m/s²`, 580, 222);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`v فرود = ${fmt(S.g * tIdeal, 2)} m/s`, 580, 248);
    ctx.fillStyle = "#a5d95c"; ctx.fillText(`h = ${fmt(S.h, 1)} m`, 580, 274);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => { if (!running) drop(); }}
      onReset={() => { S.t = -1; S.landed = false; setRunning(false); pushFeed("info", "جسم به ارتفاع اولیه بازگشت."); }}
      simClock={S.t >= 0 ? `t = ${fmt(Math.max(0, S.t), 2)} s` : "آماده رهاکردن"}
      hint="ارتفاع را تغییر دهید و ببینید t با √h زیاد می‌شود؛ جرم در سقوط آزاد نقشی ندارد."
      protocol={[
        { label: "رهاکردن و ثبت زمان فرود", done: S.landed },
        { label: "محاسبه g = 2h/t²", done: S.landed },
        { label: "تغییر ارتفاع و تکرار", done: S.ev >= 2 },
        { label: "مقایسه گرانش سیارات", done: S.g !== 9.81 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="ارتفاع h" value={S.h} min={1} max={10} step={0.5} digits={1} unit="m" accent="#f2a83b" onChange={(v) => { S.h = v; S.t = -1; S.landed = false; setRunning(false); force(); }} />
        <div>
          <div className="text-[12px] text-fog mb-1.5">گرانش سیاره</div>
          <div className="flex gap-1.5">
            {PLANETS.map(([nm, g]) => (
              <button key={nm} onClick={() => { S.g = g; S.t = -1; S.landed = false; setRunning(false); pushFeed("info", `گرانش ${nm}: g=${fmt(g, 2)} m/s².`); force(); }}
                className="flex-1 px-2 py-2 rounded-lg text-[11px] border transition-all cursor-pointer"
                style={Math.abs(S.g - g) < 0.01 ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c20f" } : { borderColor: "#175059", color: "#8fbcb8" }}>
                {nm}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { S.air = !S.air; pushFeed(S.air ? "warn" : "info", S.air ? "مقاومت هوا فعال شد — در واقعیت زمان فرود کمی بیشتر می‌شود." : "مقاومت هوا حذف شد — سقوط در خلأ."); force(); }}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer"
          style={S.air ? { borderColor: "#ff6f61", color: "#ff6f61", background: "#ff6f610f" } : { borderColor: "#175059", color: "#8fbcb8" }}>
          {S.air ? "مقاومت هوا: فعال" : "مقاومت هوا: خاموش"}
        </button>
      </div>}
      chart={<LiveChart series={[sr("ارتفاع بر حسب زمان", "#f2a83b", Array.from({ length: 60 }, (_, i) => { const t = (i / 59) * tIdeal; return { x: Number(t.toFixed(2)), y: Number((S.h - 0.5 * S.g * t * t).toFixed(2)) }; })), sr("فرود", "#35d3c2", [{ x: tIdeal, y: 0 }, { x: tIdeal, y: 0 }])]} xLabel="t (s)" yLabel="y (m)" height={230} yMin={0} />}
      table={{ headers: ["h (m)", "t فرود (s)", "v فرود (m/s)", "g"], rows: [2, 4, 6, 8, 10].map((h) => [h, Number(Math.sqrt((2 * h) / S.g).toFixed(2)), Number(Math.sqrt(2 * S.g * h).toFixed(1)), fmt(S.g, 2)]) }}
      stats={[
        { label: "زمان فرود", value: S.landed ? `${fmt(tIdeal, 2)} s` : "—", color: "#35d3c2" },
        { label: "g اندازه‌گیری", value: S.landed ? `${fmt((2 * S.h) / (tIdeal * tIdeal), 2)} m/s²` : "—", color: "#f2a83b" },
        { label: "سرعت فرود", value: `${fmt(S.g * tIdeal, 2)} m/s`, color: "#56b8ff" },
        { label: "انرژی پتانسیل اولیه", value: `${fmt(2 * S.g * S.h, 0)} J`, color: "#e9f6f3", sub: "m=2kg" },
        { label: "گرانش فعلی", value: `${fmt(S.g, 2)} m/s²`, color: "#e9f6f3" },
        { label: "وضعیت", value: S.landed ? "فرود آمد" : S.t >= 0 ? "در حال سقوط" : "آماده", color: S.landed ? "#a5d95c" : "#f2a83b" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Free fall: h=${fmt(S.h, 1)}m, g=${fmt(S.g, 2)}m/s^2`, `t=\\sqrt{2h/g}=${fmt(tIdeal, 3)}s; v=\\sqrt{2gh}=${fmt(S.g * tIdeal, 2)}m/s`]} />
  );
}

/* ===================== Collisions ===================== */
export function CollisionLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ m1: 2, m2: 2, v1: 4, v2: 0, e: 1, x1: 140, x2: 700, u1: 0, u2: 0, fired: false, collided: false, ev: 0, feed: [{ time: "#0", level: "info", msg: "برخورد یک‌بعدی — تکانه همیشه پایسته است؛ انرژی جنبشی فقط در برخورد کشسان (e=1) می‌ماند." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const p = S.m1 * S.v1 + S.m2 * S.v2;
  const keB = 0.5 * S.m1 * S.v1 ** 2 + 0.5 * S.m2 * S.v2 ** 2;
  const v1n = (S.m1 * S.v1 + S.m2 * S.v2 + S.m2 * S.e * (S.v2 - S.v1)) / (S.m1 + S.m2);
  const v2n = (S.m1 * S.v1 + S.m2 * S.v2 + S.m1 * S.e * (S.v1 - S.v2)) / (S.m1 + S.m2);
  const keA = 0.5 * S.m1 * v1n ** 2 + 0.5 * S.m2 * v2n ** 2;
  const setup = () => { S.x1 = 140; S.x2 = 700; S.u1 = 0; S.u2 = 0; S.fired = false; S.collided = false; setRunning(false); force(); };

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000 * 60;
    if (S.fired) {
      S.x1 += S.u1 * ds; S.x2 += S.u2 * ds;
      if (!S.collided && S.x2 - S.x1 <= 62) {
        S.u1 = v1n; S.u2 = v2n; S.x1 = S.x2 - 62; S.collided = true;
        pushFeed("ok", `برخورد — v₁′=${fmt(v1n, 2)}، v₂′=${fmt(v2n, 2)} m/s. ΔKE=${fmt(keA - keB, 1)} J.`);
        if (S.e < 1) pushFeed("warn", `e=${fmt(S.e, 2)} — ${fmt(((keB - keA) / keB) * 100, 0)}٪ انرژی جنبشی به گرما/تغییرشکل رفت.`);
      }
      if (S.x1 < 40 || S.x1 > 920 || S.x2 < 40 || S.x2 > 920) { S.fired = false; setRunning(false); }
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const railY = 330;
    ctx.fillStyle = "#1d5b63"; ctx.fillRect(60, railY + 30, 840, 8);
    for (let i = 0; i < 14; i++) { ctx.strokeStyle = "rgba(143,188,184,0.3)"; ctx.beginPath(); ctx.arc(90 + i * 60, railY + 52, 7, 0, Math.PI * 2); ctx.stroke(); }
    const r1 = 22 + S.m1 * 8, r2 = 22 + S.m2 * 8;
    ctx.fillStyle = "#56b8ff";
    ctx.fillRect(S.x1 - r1, railY - r1 * 1.2, r1 * 2, r1 * 1.2 + 30);
    ctx.fillStyle = "#f2a83b";
    ctx.fillRect(S.x2 - r2, railY - r2 * 1.2, r2 * 2, r2 * 1.2 + 30);
    ctx.fillStyle = "#04191d"; ctx.font = `700 13px ${MONO}`; ctx.textAlign = "center";
    ctx.fillText(`${fmt(S.m1, 0)}kg`, S.x1, railY + 8);
    ctx.fillText(`${fmt(S.m2, 0)}kg`, S.x2, railY + 8);
    ctx.textAlign = "left";
    arrow(ctx, S.x1, railY - r1 * 1.2 - 18, (S.fired ? S.u1 : S.v1) * 12, 0, "#a5d95c");
    arrow(ctx, S.x2, railY - r2 * 1.2 - 18, (S.fired ? S.u2 : S.v2) * 12, 0, "#a5d95c");
    hud(ctx, 160, 90, 640, 80, mode === "ar");
    ctx.font = `14px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`p = ${fmt(p, 1)} kg·m/s (پایسته)`, 185, 120);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`KE: قبل ${fmt(keB, 1)} J → بعد ${fmt(keA, 1)} J`, 185, 148);
    ctx.fillStyle = S.e === 1 ? "#a5d95c" : "#ff6f61";
    ctx.fillText(`e = ${fmt(S.e, 2)}`, 560, 120);
    frame.current++;
    if (frame.current % 6 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => { if (!S.fired) { S.u1 = S.v1; S.u2 = S.v2; S.fired = true; S.collided = false; setRunning(true); pushFeed("info", `رها شد — p اولیه = ${fmt(p, 1)} kg·m/s.`); } else setup(); }}
      onReset={setup}
      simClock={S.collided ? "پس از برخورد" : "پیش از برخورد"}
      hint="e=1 را با e=0 مقایسه کنید — تکانه در هر دو پایسته است ولی انرژی جنبشی فقط در کشسان."
      protocol={[
        { label: "برخورد کشسان (e=1)", done: S.e === 1 && S.collided },
        { label: "بررسی پایستگی تکانه", done: S.collided },
        { label: "برخورد غیرکشسان (e<1)", done: S.e < 1 && S.collided },
        { label: "تغییر جرم‌ها و تکرار", done: S.ev >= 3 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="جرم جسم ۱" value={S.m1} min={1} max={6} step={0.5} digits={1} unit="kg" accent="#56b8ff" onChange={(v) => { S.m1 = v; setup(); }} />
        <Slider label="جرم جسم ۲" value={S.m2} min={1} max={6} step={0.5} digits={1} unit="kg" accent="#f2a83b" onChange={(v) => { S.m2 = v; setup(); }} />
        <Slider label="سرعت جسم ۱" value={S.v1} min={-6} max={6} step={0.5} digits={1} unit="m/s" accent="#35d3c2" onChange={(v) => { S.v1 = v; setup(); }} />
        <Slider label="سرعت جسم ۲" value={S.v2} min={-6} max={6} step={0.5} digits={1} unit="m/s" accent="#35d3c2" onChange={(v) => { S.v2 = v; setup(); }} />
        <Slider label="ضریب بازگشت e" value={S.e} min={0} max={1} step={0.05} digits={2} accent="#ff6f61" onChange={(v) => { S.e = v; force(); }} />
      </div>}
      chart={<LiveChart series={[sr("KE قبل", "#35d3c2", [{ x: 0, y: keB }, { x: 1, y: keB }]), sr("KE بعد", "#f2a83b", [{ x: 0, y: keA }, { x: 1, y: keA }])]} xLabel="—" yLabel="KE (J)" height={230} yMin={0} />}
      table={{ headers: ["کمیت", "قبل", "بعد"], rows: [["v₁ (m/s)", S.v1, Number(v1n.toFixed(2))], ["v₂ (m/s)", S.v2, Number(v2n.toFixed(2))], ["تکانه", Number(p.toFixed(1)), Number(p.toFixed(1))], ["KE (J)", Number(keB.toFixed(1)), Number(keA.toFixed(1))]] }}
      stats={[
        { label: "تکانه کل", value: `${fmt(p, 1)} kg·m/s`, color: "#e9f6f3", sub: "همیشه پایسته" },
        { label: "v₁′ پیش‌بینی", value: `${fmt(v1n, 2)} m/s`, color: "#56b8ff" },
        { label: "v₂′ پیش‌بینی", value: `${fmt(v2n, 2)} m/s`, color: "#f2a83b" },
        { label: "KE قبل", value: `${fmt(keB, 1)} J`, color: "#35d3c2" },
        { label: "KE بعد", value: `${fmt(keA, 1)} J`, color: "#35d3c2" },
        { label: "اتلاف انرژی", value: `${fmt(Math.max(0, keB - keA), 1)} J`, color: S.e === 1 ? "#a5d95c" : "#ff6f61" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`1D collision: m1=${fmt(S.m1, 1)}, m2=${fmt(S.m2, 1)}, u1=${fmt(S.v1, 1)}, u2=${fmt(S.v2, 1)}, e=${fmt(S.e, 2)}`, `v1'=${fmt(v1n, 3)}, v2'=${fmt(v2n, 3)}; \\Delta KE=${fmt(keA - keB, 3)}J`]} />
  );
}
