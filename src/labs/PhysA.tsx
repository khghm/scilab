import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { bg, clamp, hud, FA, MONO, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };
const Rg = 8.314, GAM = 1.4;

/* ===================== Carnot ===================== */
function cycleOf(Th: number, Tc: number, r: number) {
  const Va = 1, Vb = r, k = Math.pow(Th / Tc, 1 / (GAM - 1));
  const Vc = Vb * k, Vd = Va * k;
  const P = (T: number, V: number) => Rg * T / V;
  const Qh = Rg * Th * Math.log(r), Qc = Rg * Tc * Math.log(r);
  return { Va, Vb, Vc, Vd, Pa: P(Th, Va), Pc: P(Tc, Vc), Qh, Qc, W: Qh - Qc, eta: 1 - Tc / Th };
}
function stateAt(c: ReturnType<typeof cycleOf>, Th: number, Tc: number, s: number) {
  const ph = Math.floor(s) % 4, u = s - Math.floor(s);
  let V: number, T: number;
  if (ph === 0) { V = c.Va * Math.pow(c.Vb / c.Va, u); T = Th; }
  else if (ph === 1) { V = c.Vb * Math.pow(c.Vc / c.Vb, u); T = Th * Math.pow(c.Vb / V, GAM - 1); }
  else if (ph === 2) { V = c.Vc * Math.pow(c.Vd / c.Vc, u); T = Tc; }
  else { V = c.Vd * Math.pow(c.Va / c.Vd, u); T = Tc * Math.pow(c.Vd / V, GAM - 1); }
  const dS = Rg * Math.log(c.Vb / c.Va);
  const S = ph === 0 ? dS * u : ph === 1 ? dS : ph === 2 ? dS * (1 - u) : 0;
  return { V, T, P: Rg * T / V, S, ph };
}
const PHASES = ["انبساط هم‌دما", "انبساط بی‌دررو", "تراکم هم‌دما", "تراکم بی‌دررو"];

export function CarnotLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ Th: 600, Tc: 300, r: 2.2, speed: 0.8, s: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "چرخه کارنو — چهار فرآیند برگشت‌پذیر. بازده همیشه η=۱−Tc/Th است." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const c = cycleOf(S.Th, S.Tc, S.r);
  const st = stateAt(c, S.Th, S.Tc, S.s);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  useRaf((dt) => {
    if (running) S.s = (S.s + Math.min(dt, 60) / 1000 * 0.28 * S.speed) % 4;
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const t = clamp((st.T - S.Tc) / Math.max(S.Th - S.Tc, 1), 0, 1);
    const gasCol = `rgba(${Math.round(53 + t * 202)},${Math.round(211 - t * 100)},${Math.round(194 - t * 97)},0.5)`;
    const Vmax = c.Vc * 1.05, cTop = 130, cBot = 420;
    const pistonY = cBot - (st.V / Vmax) * (cBot - cTop - 40);
    ctx.strokeStyle = "rgba(233,246,243,0.55)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(70, cTop); ctx.lineTo(70, cBot); ctx.lineTo(280, cBot); ctx.lineTo(280, cTop); ctx.stroke();
    ctx.fillStyle = gasCol; ctx.fillRect(73, pistonY, 204, cBot - pistonY - 3);
    ctx.fillStyle = "#8fbcb8"; ctx.fillRect(62, pistonY - 12, 226, 12); ctx.fillRect(168, pistonY - 52, 10, 42);
    ctx.fillStyle = st.ph === 0 ? "rgba(255,111,97,0.85)" : "rgba(255,111,97,0.25)";
    ctx.fillRect(62, cBot + 34, 226, 28);
    ctx.fillStyle = st.ph === 2 ? "rgba(86,184,255,0.85)" : "rgba(86,184,255,0.25)";
    ctx.fillRect(62, cTop - 62, 226, 28);
    ctx.fillStyle = "#e9f6f3"; ctx.font = `12px ${FA}`;
    ctx.fillText(`منبع گرم ${S.Th} K`, 118, cBot + 52);
    ctx.fillText(`منبع سرد ${S.Tc} K`, 118, cTop - 44);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(PHASES[st.ph], 70, 520);
    ctx.fillStyle = "#e9f6f3"; ctx.font = `12px ${MONO}`;
    ctx.fillText(`T=${fmt(st.T, 0)}K  P=${fmt(st.P, 0)}kPa`, 190, 520);
    const px0 = 400, py0 = 70, pw = 500, phh = 380;
    const X = (V: number) => px0 + (V / (c.Vc * 1.08)) * pw;
    const Y = (P: number) => py0 + phh - (P / (c.Pa * 1.12)) * phh;
    ctx.strokeStyle = "rgba(143,188,184,0.4)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px0, py0 + phh); ctx.lineTo(px0 + pw, py0 + phh); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const q = stateAt(c, S.Th, S.Tc, (i / 200) * 4);
      if (i === 0) ctx.moveTo(X(q.V), Y(q.P)); else ctx.lineTo(X(q.V), Y(q.P));
    }
    ctx.closePath(); ctx.fillStyle = "rgba(242,168,59,0.10)"; ctx.fill();
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = "#35d3c2";
    ctx.beginPath(); ctx.arc(X(st.V), Y(st.P), 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `12px ${FA}`;
    ctx.fillText(`مساحت = کار هر چرخه W = ${fmt(c.W, 0)} J`, px0 + 150, py0 + phh / 2);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const tsCurve = Array.from({ length: 120 }, (_, i) => { const q = stateAt(c, S.Th, S.Tc, (i / 119) * 4); return { x: q.S, y: q.T }; });
  const c1v = Rg / (GAM - 1);
  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.Th = 600; S.Tc = 300; S.r = 2.2; S.s = 0; pushFeed("info", "چرخه به شرایط اولیه بازگشت."); }}
      simClock={`φ=${fmt(S.s, 2)}/4 — ${PHASES[st.ph]}`}
      hint="دماهای دو منبع را تغییر دهید؛ بازده فقط به نسبت آن‌ها وابسته است و با تغییر گاز کاری عوض نمی‌شود."
      protocol={[
        { label: "اجرای چرخه و شناسایی چهار فرآیند", done: S.ev >= 0 },
        { label: "خواندن Q و W هر فرآیند", done: true },
        { label: "تغییر Th و ثبت بازده", done: S.ev >= 1 },
        { label: "تأیید η = 1 − Tc/Th", done: S.ev >= 1 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="دمای منبع گرم Th" value={S.Th} min={400} max={800} step={5} digits={0} unit="K" accent="#ff6f61" onChange={(v) => { S.Th = v; if (S.Tc > v - 40) S.Tc = v - 40; pushFeed("info", `بازده کارنو η = ${fmt((1 - S.Tc / S.Th) * 100, 1)}٪ شد.`); }} />
        <Slider label="دمای منبع سرد Tc" value={S.Tc} min={200} max={400} step={5} digits={0} unit="K" accent="#56b8ff" onChange={(v) => { S.Tc = Math.min(v, S.Th - 40); pushFeed("info", `بازده کارنو η = ${fmt((1 - S.Tc / S.Th) * 100, 1)}٪ شد.`); }} />
        <Slider label="نسبت انبساط r = Vb/Va" value={S.r} min={1.5} max={4} step={0.1} digits={1} accent="#f2a83b" onChange={(v) => { S.r = v; force(); }} />
        <Slider label="سرعت چرخه" value={S.speed} min={0.2} max={2.5} step={0.1} digits={1} unit="×" accent="#35d3c2" onChange={(v) => { S.speed = v; force(); }} />
      </div>}
      chart={<LiveChart series={[sr("چرخه T–S", "#f2a83b", tsCurve), sr("وضعیت فعلی", "#35d3c2", [{ x: st.S, y: st.T }, { x: st.S, y: st.T }])]} xLabel="S (J/K)" yLabel="T (K)" height={230} />}
      table={{ headers: ["فرآیند", "Q (J)", "W (J)", "ΔU (J)"], rows: [
        ["A→B هم‌دما", Number(c.Qh.toFixed(0)), Number(c.Qh.toFixed(0)), 0],
        ["B→C بی‌دررو", 0, Number((c1v * (S.Tc - S.Th)).toFixed(0)), Number((c1v * (S.Tc - S.Th)).toFixed(0))],
        ["C→D هم‌دما", Number((-c.Qc).toFixed(0)), Number((-c.Qc).toFixed(0)), 0],
        ["D→A بی‌دررو", 0, Number((c1v * (S.Th - S.Tc)).toFixed(0)), Number((c1v * (S.Th - S.Tc)).toFixed(0))],
      ] }}
      stats={[
        { label: "بازده چرخه η", value: `${fmt(c.eta * 100, 1)} ٪`, color: "#f2a83b", sub: "W/Qh" },
        { label: "بازده کارنو", value: `${fmt((1 - S.Tc / S.Th) * 100, 1)} ٪`, color: "#35d3c2", sub: "تطبیق کامل ✓" },
        { label: "کار هر چرخه", value: `${fmt(c.W, 0)} J`, color: "#e9f6f3" },
        { label: "گرمای دریافتی Qh", value: `${fmt(c.Qh, 0)} J`, color: "#ff6f61" },
        { label: "گرمای دفعی Qc", value: `${fmt(c.Qc, 0)} J`, color: "#56b8ff" },
        { label: "دمای فعلی گاز", value: `${fmt(st.T, 0)} K`, color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Carnot: Th=${S.Th}K, Tc=${S.Tc}K, r=${fmt(S.r, 1)}`, `eta = 1 - Tc/Th = ${fmt(c.eta * 100, 2)}\\%; W = ${fmt(c.W, 1)} J`]} />
  );
}

/* ===================== RC circuit ===================== */
interface RcSim { V: number; Rk: number; CuF: number; Vc0v: number; phase: "idle" | "charge" | "discharge"; t: number; Vc: number; samples: { x: number; y: number }[]; lastS: number; ev: number; feed: FeedItem[] }

export function RcLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<RcSim>({ V: 9, Rk: 10, CuF: 100, Vc0v: 9, phase: "idle", t: 0, Vc: 0, samples: [], lastS: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "مدار RC — کلید را روی شارژ بگذارید؛ Vc به‌صورت نمایی بالا می‌رود. τ=RC ثابت زمانی است." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);
  const R = S.Rk * 1000, C = S.CuF * 1e-6, tau = R * C;
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const setPhase = (p: "charge" | "discharge") => {
    S.phase = p; S.t = 0; S.samples = []; S.lastS = 0;
    setRunning(true);
    pushFeed("info", p === "charge" ? "شارژ آغاز شد — Vc = V(1−e^(−t/τ))." : "دشارژ آغاز شد — Vc = V₀·e^(−t/τ).");
  };

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000 * 2.5;
    if (running && S.phase !== "idle") {
      S.t += ds;
      S.Vc = S.phase === "charge" ? S.V * (1 - Math.exp(-S.t / tau)) : S.Vc0v * Math.exp(-S.t / tau);
      if (S.t - S.lastS >= 0.06) { S.samples.push({ x: Number(S.t.toFixed(2)), y: Number(S.Vc.toFixed(2)) }); if (S.samples.length > 400) S.samples.shift(); S.lastS = S.t; }
      if (S.t > 5.2 * tau) { setRunning(false); pushFeed("ok", `پس از ۵τ خازن تقریباً کامل ${S.phase === "charge" ? "شارژ" : "دشارژ"} شد (${fmt(S.Vc, 2)} V).`); }
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(200, 180); ctx.lineTo(760, 180); ctx.lineTo(760, 400); ctx.lineTo(200, 400); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "#0b3038"; ctx.fillRect(330, 160, 140, 40);
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(335 + i * 22, 180); ctx.lineTo(345 + i * 22, 168); ctx.stroke(); }
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`; ctx.fillText(`R = ${fmt(S.Rk, 0)} kΩ`, 372, 150);
    ctx.strokeStyle = "#56b8ff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(460, 230); ctx.lineTo(460, 330); ctx.moveTo(490, 230); ctx.lineTo(490, 330); ctx.stroke();
    ctx.fillStyle = `rgba(86,184,255,${(S.Vc / S.V) * 0.35})`;
    ctx.fillRect(463, 232, 24, 96);
    ctx.fillStyle = "#56b8ff"; ctx.fillText(`C = ${fmt(S.CuF, 0)} µF`, 505, 285);
    ctx.fillStyle = "#35d3c2";
    ctx.fillRect(185, 250, 30, 80);
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 13px ${MONO}`;
    ctx.fillText(`${fmt(S.V, 0)}V`, 180, 240);
    const cur = S.phase === "charge" ? ((S.V - S.Vc) / R) * 1e3 : (S.Vc / R) * 1e3;
    if (running && cur > 0.005) {
      const ph = (frame.current * 4) % 44;
      ctx.fillStyle = "#a5d95c";
      for (let i = 0; i < 5; i++) {
        const d = (i * 44 + ph) % 220;
        ctx.beginPath(); ctx.arc(560 + d, 180, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    hud(ctx, 140, 430, 680, 80, mode === "ar");
    ctx.font = `700 22px ${MONO}`; ctx.fillStyle = "#35d3c2";
    ctx.fillText(`Vc = ${fmt(S.Vc, 2)} V`, 165, 465);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`I = ${fmt(cur, 2)} mA`, 165, 495);
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`τ = RC = ${fmt(tau, 2)} s`, 470, 465);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `12px ${MONO}`;
    ctx.fillText(`t½ = ${fmt(tau * Math.LN2, 2)} s`, 470, 495);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);
  const Vc0v = (S as RcSim & { Vc0v?: number }).Vc0v ?? S.V;
  const theo = Array.from({ length: 80 }, (_, i) => { const t = (i / 79) * 5.2 * tau; return { x: Number(t.toFixed(2)), y: Number((S.phase === "discharge" ? Vc0v * Math.exp(-t / tau) : S.V * (1 - Math.exp(-t / tau))).toFixed(2)) }; });

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => { if (!running && S.phase === "idle") setPhase("charge"); else { setRunning(!running); } }}
      onReset={() => { S.phase = "idle"; S.t = 0; S.Vc = 0; S.samples = []; setRunning(false); pushFeed("info", "خازن تخلیه و مدار آماده شد."); }}
      simClock={`t=${fmt(S.t, 1)}s · Vc=${fmt(S.Vc, 2)}V`}
      hint="R یا C را دوبرابر کنید تا τ دوبرابر شود — شارژ کندتر می‌شود. پس از ۵τ خازن عملاً پر است."
      protocol={[
        { label: "شارژ خازن و ثبت منحنی", done: S.samples.length > 10 },
        { label: "خواندن τ = RC", done: S.samples.length > 5 },
        { label: "دشارژ و مقایسه", done: S.phase === "discharge" || S.ev >= 2 },
        { label: "تغییر R یا C و تکرار", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="ولتاژ منبع V" value={S.V} min={3} max={15} step={0.5} digits={1} unit="V" accent="#35d3c2" onChange={(v) => { S.V = v; force(); }} />
        <Slider label="مقاومت R" value={S.Rk} min={1} max={100} step={1} digits={0} unit="kΩ" accent="#f2a83b" onChange={(v) => { S.Rk = v; force(); }} />
        <Slider label="ظرفیت C" value={S.CuF} min={10} max={470} step={10} digits={0} unit="µF" accent="#56b8ff" onChange={(v) => { S.CuF = v; force(); }} />
        <div className="flex gap-2">
          <button onClick={() => setPhase("charge")} className="flex-1 px-3 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer" style={{ borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c20f" }}>شارژ</button>
          <button onClick={() => { (S as RcSim & { Vc0v: number }).Vc0v = S.Vc; setPhase("discharge"); }} className="flex-1 px-3 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer" style={{ borderColor: "#ff6f61", color: "#ff6f61", background: "#ff6f610f" }}>دشارژ</button>
        </div>
      </div>}
      chart={<LiveChart series={[sr("Vc اندازه‌گیری", "#35d3c2", S.samples), sr("نظری", "#f2a83b", theo)]} xLabel="t (s)" yLabel="Vc (V)" height={230} yMin={0} />}
      table={{ headers: ["t (s)", "Vc (V)", "t/τ"], rows: S.samples.filter((_, i) => i % 4 === 0).map((p) => [p.x, p.y, Number((p.x / tau).toFixed(2))]) }}
      stats={[
        { label: "ثابت زمانی τ", value: `${fmt(tau, 2)} s`, color: "#f2a83b", sub: "R×C" },
        { label: "نیمه‌عمر", value: `${fmt(tau * Math.LN2, 2)} s`, color: "#35d3c2", sub: "τ·ln2" },
        { label: "ولتاژ خازن", value: `${fmt(S.Vc, 2)} V`, color: "#e9f6f3" },
        { label: "کسر شارژ", value: `${fmt((S.Vc / S.V) * 100, 1)} ٪`, color: "#56b8ff" },
        { label: "جریان لحظه‌ای", value: `${fmt((Math.abs(S.V - S.Vc) / R) * 1e3, 2)} mA`, color: "#a5d95c" },
        { label: "انرژی ذخیره‌شده", value: `${fmt(0.5 * C * S.Vc * S.Vc * 1e3, 2)} mJ`, color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`RC: R=${fmt(S.Rk, 0)}k\\Omega, C=${fmt(S.CuF, 0)}\\mu F, \\tau=${fmt(tau, 3)}s`, `Vc(t) = V(1-e^{-t/\\tau}); V=${fmt(S.V, 1)}V`]} />
  );
}

/* ===================== Doppler ===================== */
const VSOUND = 343;
export function DopplerLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ vs: 120, f0: 300, sx: 180, waves: [] as { x: number; r: number }[], ev: 0, warned: false, feed: [{ time: "#0", level: "info", msg: "منبع صوت متحرک — جلوی منبع امواج فشرده (بسامد بالاتر) و پشت آن کشیده‌اند." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const mach = S.vs / VSOUND;
  const fAhead = (S.f0 * VSOUND) / (VSOUND - S.vs);
  const fBehind = (S.f0 * VSOUND) / (VSOUND + S.vs);

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (running) {
      S.sx += S.vs * ds * 0.55;
      if (S.sx > 900) S.sx = 60;
      if (frame.current % Math.max(2, Math.round(14 / (S.f0 / 100))) === 0) S.waves.push({ x: S.sx, r: 4 });
      for (const w of S.waves) w.r += VSOUND * ds * 0.55;
      S.waves = S.waves.filter((w) => w.r < 950);
      if (mach >= 1 && !S.warned) { S.warned = true; pushFeed("warn", "سرعت منبع از سرعت صوت گذشت — مخروط ماخ و موج ضربه‌ای تشکیل شد!"); }
      if (mach < 1) S.warned = false;
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    for (const w of S.waves) {
      ctx.strokeStyle = `rgba(86,184,255,${Math.max(0, 0.5 * (1 - w.r / 950)).toFixed(2)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(w.x, 300, w.r, 0, Math.PI * 2); ctx.stroke();
    }
    if (mach >= 1) {
      const th = Math.asin(1 / mach);
      ctx.strokeStyle = "rgba(255,111,97,0.7)"; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(S.sx, 300); ctx.lineTo(S.sx - Math.cos(th) * 750, 300 - Math.sin(th) * 750);
      ctx.moveTo(S.sx, 300); ctx.lineTo(S.sx - Math.cos(th) * 750, 300 + Math.sin(th) * 750);
      ctx.stroke();
    }
    ctx.fillStyle = "#f2a83b";
    ctx.beginPath(); ctx.arc(S.sx, 300, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#a5d95c"; ctx.beginPath(); ctx.arc(790, 120, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#56b8ff"; ctx.beginPath(); ctx.arc(170, 120, 15, 0, Math.PI * 2); ctx.fill();
    ctx.font = `11px ${FA}`;
    ctx.fillStyle = "#a5d95c"; ctx.fillText("ناظر جلویی", 762, 96);
    ctx.fillStyle = "#56b8ff"; ctx.fillText("ناظر پشتی", 146, 96);
    hud(ctx, 250, 430, 470, 92, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#a5d95c"; ctx.fillText(`f′ جلو = ${fmt(fAhead, 0)} Hz`, 272, 458);
    ctx.fillStyle = "#56b8ff"; ctx.fillText(`f′ پشت = ${fmt(fBehind, 0)} Hz`, 272, 482);
    ctx.fillStyle = mach >= 1 ? "#ff6f61" : "#e9f6f3"; ctx.fillText(`Mach = ${fmt(mach, 2)}${mach >= 1 ? " — فراصوت" : ""}`, 272, 506);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`f₀=${fmt(S.f0, 0)}Hz v=343m/s`, 520, 458);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const curve = Array.from({ length: 67 }, (_, i) => { const v = i * 5; return { x: v, y: v < 340 ? (S.f0 * VSOUND) / (VSOUND - v) : NaN }; }).filter((p) => isFinite(p.y));
  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.vs = 120; S.waves = []; pushFeed("info", "به حالت اولیه بازگشت."); }}
      simClock={`Mach = ${fmt(mach, 2)}`}
      hint="سرعت را به ۳۴۳ m/s نزدیک کنید — فشرده‌شدن امواج در جلو تشدید می‌شود؛ از آن عبور کنید تا مخروط ماخ ببینید."
      protocol={[
        { label: "مشاهده فشرده‌شدن امواج در جلو", done: true },
        { label: "مقایسه f′ جلو و پشت", done: true },
        { label: "افزایش سرعت و تغییر ماخ", done: S.ev >= 1 || S.vs > 250 },
        { label: "رسیدن به سرعت صوت (مخروط ماخ)", done: S.warned },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="سرعت منبع vₛ" value={S.vs} min={0} max={400} step={5} digits={0} unit="m/s" accent="#f2a83b" onChange={(v) => { S.vs = v; force(); }} />
        <Slider label="بسامد منبع f₀" value={S.f0} min={100} max={800} step={20} digits={0} unit="Hz" accent="#35d3c2" onChange={(v) => { S.f0 = v; force(); }} />
        <div className="flex flex-wrap gap-1.5">
          {([["پیاده ۳۴", 34], ["خودرو ۸۰", 80], ["آژیر ۱۷۰", 170], ["جت ۳۴۰", 340]] as [string, number][]).map(([nm, v]) => (
            <button key={nm} onClick={() => { S.vs = v; force(); }} className="flex-1 px-2 py-1.5 rounded text-[11px] border border-edge/70 text-fog hover:text-snow transition-colors cursor-pointer">{nm}</button>
          ))}
        </div>
      </div>}
      chart={<LiveChart series={[sr("f′ ناظر جلویی", "#a5d95c", curve), sr("وضعیت فعلی", "#f2a83b", [{ x: S.vs, y: fAhead }, { x: S.vs, y: fAhead }])]} xLabel="vₛ (m/s)" yLabel="f′ (Hz)" height={230} yMin={0} />}
      table={{ headers: ["vₛ (m/s)", "ماخ", "f′ جلو (Hz)", "f′ پشت (Hz)"], rows: [0, 85, 170, 255, 340].map((v) => [v, Number((v / VSOUND).toFixed(2)), Number(((S.f0 * VSOUND) / (VSOUND - v)).toFixed(0)), Number(((S.f0 * VSOUND) / (VSOUND + v)).toFixed(0))]) }}
      stats={[
        { label: "بسامد جلو", value: `${fmt(fAhead, 0)} Hz`, color: "#a5d95c" },
        { label: "بسامد پشت", value: `${fmt(fBehind, 0)} Hz`, color: "#56b8ff" },
        { label: "عدد ماخ", value: fmt(mach, 2), color: mach >= 1 ? "#ff6f61" : "#e9f6f3" },
        { label: "رژیم", value: mach >= 1 ? "فراصوت" : "زیرصوت", color: mach >= 1 ? "#ff6f61" : "#35d3c2" },
        { label: "بسامد منبع", value: `${fmt(S.f0, 0)} Hz`, color: "#f2a83b" },
        { label: "طول‌موج جلو", value: `${fmt((VSOUND - S.vs) / S.f0 * 100, 1)} cm`, color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Doppler: f' = f v/(v \\mp v_s); v=343 m/s`, `f0=${fmt(S.f0, 0)}Hz, vs=${S.vs} m/s => f'(front)=${fmt(fAhead, 1)}Hz, Mach=${fmt(mach, 3)}`]} />
  );
}
