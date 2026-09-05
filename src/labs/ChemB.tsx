import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { chemScene, hud, FA, MONO, rr, sr } from "./draw";
import * as chem from "./chem";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== Calorimetry ===================== */
const MIX_T = 30;
export function CaloLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ Ca: 1, Va: 50, Cb: 1, Vb: 50, T0: 22, insul: 0.9, t: 0, T: 22, running: false, started: false, mixed: false, peakT: 22, samples: [] as { x: number; y: number }[], lastS: 0, corrected: false, dTcorr: 0, peakLogged: false, ev: 0, feed: [{ time: "#0", level: "info", msg: "خنثی‌سازی HCl+NaOH در ظرف فومی — دما بالا می‌رود و با نرخ وابسته به عایق سرد می‌شود. ΔT واقعی را با برون‌یابی بگیرید." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const nA = (S.Ca * S.Va) / 1000, nB = (S.Cb * S.Vb) / 1000, nLim = Math.min(nA, nB);
  const mass = S.Va + S.Vb;
  const dTIdeal = (nLim * 57300) / (mass * 4.18);
  const kc = (1 - S.insul) * 0.0012 + 0.00005;
  const start = () => {
    S.t = 0; S.T = S.T0; S.samples = []; S.lastS = 0; S.mixed = false; S.started = true; S.running = true; S.peakT = S.T0; S.corrected = false; S.peakLogged = false;
    setRunning(true);
    pushFeed("info", `آغاز — پایه ${fmt(S.T0, 1)}°C؛ در ثانیه ${MIX_T} مخلوط می‌شود.`);
    if (Math.abs(nA - nB) > 1e-6) pushFeed("warn", `مول‌ها برابر نیستند — محدودکننده ${nA < nB ? "HCl" : "NaOH"} است.`);
    if (S.insul < 0.5) pushFeed("warn", "عایق ضعیف است — اتلاف بزرگ خواهد بود و برون‌یابی حیاتی می‌شود.");
  };

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000 * 2.2;
    if (S.running) {
      S.t += ds;
      if (!S.mixed && S.t >= MIX_T) { S.mixed = true; pushFeed("info", "مخلوط‌کردن — H⁺ + OH⁻ → H₂O (ΔH=−۵۷٫۳ kJ/mol)."); }
      const heating = S.mixed ? (dTIdeal / 14) * Math.exp(-(S.t - MIX_T) / 14) : 0;
      S.T += (heating - kc * (S.T - 22)) * ds;
      S.peakT = Math.max(S.peakT, S.T);
      if (S.mixed && S.t > MIX_T + 55 && !S.peakLogged) { S.peakLogged = true; pushFeed("ok", `قله ${fmt(S.peakT, 2)}°C — ΔT مشاهده‌شده ${fmt(S.peakT - S.T0, 2)} K (با اتلاف).`); }
      if (S.t - S.lastS >= 1.5) { S.samples.push({ x: Number(S.t.toFixed(1)), y: Number(S.T.toFixed(3)) }); S.lastS = S.t; }
      if (S.t > 300) { S.running = false; setRunning(false); pushFeed("info", "ثبت کامل شد — حالا برون‌یابی کنید."); }
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    chemScene(ctx, 960, 560, mode === "ar", performance.now() / 1000);
    const cx = 320, cy = 330;
    const warm = Math.max(0, Math.min(1, (S.T - 22) / Math.max(dTIdeal, 1)));
    // warm glow behind cup
    if (mode !== "ar") chem.glow(ctx, cx, cy + 40, 200, [255, 140, 80], 0.10 + warm * 0.12);
    // styrofoam cup with shading
    const cg = ctx.createLinearGradient(cx - 130, 0, cx + 130, 0);
    cg.addColorStop(0, "#c8d4d8"); cg.addColorStop(0.5, "#eef4f6"); cg.addColorStop(1, "#b8c6cb");
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(cx - 130, cy - 140); ctx.lineTo(cx - 105, cy + 130); ctx.quadraticCurveTo(cx, cy + 152, cx + 105, cy + 130); ctx.lineTo(cx + 130, cy - 140); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(4,25,29,0.3)"; ctx.lineWidth = 2; ctx.stroke();
    if (S.insul > 0.6) {
      ctx.fillStyle = "#d5dee1";
      ctx.beginPath(); ctx.roundRect(cx - 142, cy - 160, 284, 22, 6); ctx.fill();
      ctx.strokeStyle = "rgba(4,25,29,0.25)"; ctx.stroke();
    }
    // liquid with temperature color + glow
    ctx.fillStyle = `rgba(${Math.round(120 + warm * 135)},${Math.round(180 - warm * 60)},${Math.round(230 - warm * 120)},0.85)`;
    ctx.beginPath(); ctx.moveTo(cx - 122, cy - 120); ctx.lineTo(cx - 102, cy + 126); ctx.quadraticCurveTo(cx, cy + 146, cx + 102, cy + 126); ctx.lineTo(cx + 122, cy - 120); ctx.closePath(); ctx.fill();
    chem.glow(ctx, cx, cy, 110, [255, 160, 90], warm * 0.3);
    if (S.mixed) chem.bubbles(ctx, cx - 90, cy + 120, 180, 160, 10, performance.now() / 1000, "255,255,255", 0.7);
    // stir bar
    const ang = S.running ? performance.now() / 120 : 0;
    ctx.save(); ctx.translate(cx, cy + 110); ctx.rotate(ang);
    ctx.fillStyle = "#04191d"; ctx.beginPath(); ctx.roundRect(-24, -4, 48, 8, 4); ctx.fill(); ctx.restore();
    hud(ctx, 120, cy + 160, 400, 64, mode === "ar");
    ctx.font = `600 22px ${MONO}`; ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`T = ${fmt(S.T, 2)} °C`, 140, cy + 190);
    ctx.font = `12px ${MONO}`; ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`t=${fmt(S.t, 0)}s  kc=${kc.toExponential(1)}s⁻¹`, 140, cy + 212);
    ctx.fillStyle = warm > 0.6 ? "#ff6f61" : "#35d3c2";
    ctx.fillText(S.mixed ? "واکنش در جریان" : "در انتظار مخلوط", 380, cy + 190);
    const gx = 590, gy = 140, gw = 320, gh = 240;
    ctx.strokeStyle = "rgba(23,80,89,0.9)"; rr(ctx, gx, gy, gw, gh, 10); ctx.stroke();
    if (S.samples.length > 1) {
      const yMax = Math.max(S.T0 + dTIdeal + 1, ...S.samples.map((p) => p.y)) + 0.5;
      const X = (x: number) => gx + 22 + (x / 300) * (gw - 40);
      const Y = (y: number) => gy + gh - 26 - ((y - S.T0 - 0.5) / (yMax - S.T0 - 0.5)) * (gh - 56);
      ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2;
      ctx.beginPath();
      S.samples.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))));
      ctx.stroke();
      ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(53,211,194,0.8)";
      ctx.beginPath(); ctx.moveTo(X(MIX_T), gy + 26); ctx.lineTo(X(MIX_T), gy + gh - 26); ctx.stroke();
      ctx.setLineDash([]);
    }
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const extrapolate = () => {
    if (S.samples.length < 12) { pushFeed("warn", "داده کافی نیست — بگذارید آزمایش کامل شود."); return; }
    const tail = S.samples.filter((p) => p.x > MIX_T + 60);
    const xs = tail.map((p) => p.x), ys = tail.map((p) => p.y), n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
    const slope = sxy / sxx, icpt = my - slope * mx;
    S.dTcorr = icpt + slope * MIX_T - S.T0;
    S.corrected = true;
    pushFeed("ok", `برون‌یابی: ΔT تصحیح‌شده = ${fmt(S.dTcorr, 2)} K در برابر ${fmt(S.peakT - S.T0, 2)} K مشاهده‌شده.`);
  };
  const dT = S.corrected ? S.dTcorr : S.peakT - S.T0;
  const q = mass * 4.18 * dT;
  const dH = -q / (nLim * 1000);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => { if (!S.started || S.t >= 300) start(); else { S.running = !S.running; setRunning(S.running); } }}
      onReset={() => { S.t = 0; S.T = S.T0; S.samples = []; S.started = false; S.mixed = false; S.running = false; setRunning(false); S.peakT = S.T0; S.corrected = false; S.peakLogged = false; pushFeed("info", "کالریمتر آماده دور جدید."); }}
      simClock={`t = ${fmt(S.t, 0)} s — T = ${fmt(S.T, 2)} °C`}
      hint="عایق را ضعیف کنید تا اهمیت برون‌یابی را لمس کنید — ΔT مشاهده‌شده کمتر از مقدار واقعی لحظه مخلوط‌کردن می‌شود."
      protocol={[
        { label: "تنظیم غلظت‌ها و حجم‌ها", done: S.started },
        { label: "مشاهده قله دمایی", done: S.peakLogged },
        { label: "کامل‌شدن ثبت ۵ دقیقه‌ای", done: S.t >= 300 },
        { label: "برون‌یابی ΔT", done: S.corrected },
        { label: "مقایسه ΔH با −۵۷٫۳", done: S.corrected },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-4">
        <Slider label="غلظت HCl" value={S.Ca} min={0.5} max={2} step={0.1} digits={1} unit="M" accent="#ff6f61" onChange={(v) => { S.Ca = v; force(); }} />
        <Slider label="حجم HCl" value={S.Va} min={25} max={100} step={5} digits={0} unit="mL" accent="#ff6f61" onChange={(v) => { S.Va = v; force(); }} />
        <Slider label="غلظت NaOH" value={S.Cb} min={0.5} max={2} step={0.1} digits={1} unit="M" accent="#56b8ff" onChange={(v) => { S.Cb = v; force(); }} />
        <Slider label="حجم NaOH" value={S.Vb} min={25} max={100} step={5} digits={0} unit="mL" accent="#56b8ff" onChange={(v) => { S.Vb = v; force(); }} />
        <Slider label="کیفیت عایق" value={S.insul} min={0.1} max={1} step={0.05} digits={2} accent="#f2a83b" onChange={(v) => { S.insul = v; force(); }} />
        <button onClick={extrapolate} className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer" style={{ borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c20f" }}>
          برون‌یابی ΔT به زمان مخلوط‌کردن
        </button>
      </div>}
      chart={<LiveChart series={[sr("دما (°C)", "#f2a83b", S.samples)]} xLabel="t (s)" yLabel="T (°C)" height={230} markerX={MIX_T} markerLabel="مخلوط‌کردن" />}
      table={{ headers: ["t (s)", "T (°C)", "ΔT (K)", "فاز"], rows: S.samples.filter((_, i) => i % 2 === 0).map((p) => [p.x, p.y, Number((p.y - S.T0).toFixed(2)), p.x < MIX_T ? "پیش از مخلوط" : p.x < MIX_T + 45 ? "افزایش" : "سردشدن"]) }}
      stats={[
        { label: "ΔT مشاهده‌شده", value: `${fmt(S.peakT - S.T0, 2)} K`, color: "#f2a83b" },
        { label: "ΔT تصحیح‌شده", value: S.corrected ? `${fmt(S.dTcorr, 2)} K` : "—", color: "#35d3c2" },
        { label: "مول واکنش‌داده", value: `${fmt(nLim * 1000, 0)} mmol`, color: "#e9f6f3" },
        { label: "گرمای آزادشده q", value: `${fmt(q, 0)} J`, color: "#ff6f61", sub: "mcΔT" },
        { label: "ΔH خنثی‌سازی", value: S.corrected || S.peakLogged ? `${fmt(dH, 1)} kJ/mol` : "—", color: "#e9f6f3" },
        { label: "خطا نسبت به −۵۷٫۳", value: S.corrected ? `${fmt(Math.abs((dH + 57.3) / 57.3) * 100, 1)} ٪` : "—", color: S.corrected && Math.abs((dH + 57.3) / 57.3) < 0.08 ? "#a5d95c" : "#f2a83b" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`HCl+NaOH: m=${fmt(mass, 0)}g, c=4.18`, `dT=${fmt(dT, 2)}K => q=${fmt(q, 0)}J, dH=${fmt(dH, 1)}kJ/mol (lit. -57.3)`]} />
  );
}

/* ===================== Molarity & dilution ===================== */
export function MolarityLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ moles: 0.5, vol: 1, stockM: 2, vStock: 250, ev: 0, feed: [{ time: "#0", level: "info", msg: "مولاریته M=n/V — حل‌شونده را تغییر دهید یا با افزودن حلال رقیق کنید. در رقت، M₁V₁=M₂V₂." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const M = S.moles / S.vol;
  const dilM = (S.stockM * S.vStock) / 1000;
  const particles = useRef(Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12 }))).current;

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (running) for (const p of particles) {
      p.x += p.vx * ds; p.y += p.vy * ds;
      if (p.x < 0 || p.x > 1) p.vx *= -1;
      if (p.y < 0 || p.y > 1) p.vy *= -1;
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    chemScene(ctx, 960, 560, mode === "ar", performance.now() / 1000);
    const bx = 260, bw = 220, bot = 462, liqH = Math.min(300, S.vol * 150);
    const tint = Math.min(1, M / 2);
    const bcx = bx + bw / 2;
    // beaker glass
    chem.beaker(ctx, bcx, bot, bw / 2, 340);
    // liquid
    const frac = Math.max(0.05, liqH / 340);
    chem.beakerLiquid(ctx, bcx, bot, bw / 2, 340, frac, [242, 168, 59], 0.25 + tint * 0.5);
    chem.glow(ctx, bcx, bot - liqH / 2, 130, [242, 168, 59], 0.08 + tint * 0.1);
    // solute particles
    const nShow = Math.min(60, Math.round(S.moles * 60));
    for (let i = 0; i < nShow; i++) {
      const p = particles[i];
      const px = bx + 10 + p.x * (bw - 20), py = bot - liqH + 10 + p.y * (liqH - 22);
      chem.glow(ctx, px, py, 9, [242, 168, 59], 0.4);
      ctx.fillStyle = "#f2a83b";
      ctx.beginPath(); ctx.arc(px, py, 4.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#c9d8d6"; ctx.font = `12px ${FA}`;
    ctx.fillText(`n = ${fmt(S.moles, 2)} mol`, bx, bot + 34);
    ctx.fillText(`V = ${fmt(S.vol, 1)} L`, bx + 130, bot + 34);
    hud(ctx, 560, 160, 330, 170, mode === "ar");
    ctx.font = `700 24px ${MONO}`; ctx.fillStyle = "#f2a83b";
    ctx.fillText(`M = ${fmt(M, 2)} mol/L`, 580, 200);
    ctx.font = `12px ${MONO}`; ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`ذرات نمایشی: ${nShow}`, 580, 230);
    ctx.fillText(`غلظت نسبی رنگ ∝ M`, 580, 254);
    ctx.fillStyle = "#35d3c2";
    ctx.fillText(`رقت: ${fmt(S.stockM, 1)}M × ${fmt(S.vStock, 0)}mL → ${fmt(dilM, 2)}M (۱L)`, 580, 290);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.moles = 0.5; S.vol = 1; pushFeed("info", "به محلول ۰٫۵ مولار بازگشت."); }}
      simClock={`M = ${fmt(M, 2)} mol/L`}
      hint="حجم را دوبرابر کنید بدون تغییر مول — غلظت نصف می‌شود و رنگ کم‌رنگ‌تر. رابطه معکوس M=n/V را ببینید."
      protocol={[
        { label: "ساخت محلول و خواندن M", done: true },
        { label: "تغییر n و دیدن اثر مستقیم", done: S.ev >= 1 || S.moles !== 0.5 },
        { label: "رقیق‌کردن و دیدن اثر معکوس", done: S.vol > 1 },
        { label: "طراحی رقت با M₁V₁=M₂V₂", done: S.ev >= 1 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="مول حل‌شونده n" value={S.moles} min={0.1} max={2} step={0.05} digits={2} unit="mol" accent="#f2a83b" onChange={(v) => { S.moles = v; force(); }} />
        <Slider label="حجم محلول V" value={S.vol} min={0.25} max={2} step={0.25} digits={2} unit="L" accent="#56b8ff" onChange={(v) => { S.vol = v; force(); }} />
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          <div className="text-snow mb-1">ماشین رقت:</div>
          استوک {fmt(S.stockM, 1)} M — بردارید {fmt(S.vStock, 0)} mL و به ۱ لیتر برسانید → {fmt(dilM, 2)} M
        </div>
        <Slider label="حجم برداشتی از استوک" value={S.vStock} min={50} max={500} step={10} digits={0} unit="mL" accent="#35d3c2" onChange={(v) => { S.vStock = v; force(); }} />
      </div>}
      chart={<LiveChart series={[sr("M بر حسب V (n ثابت)", "#56b8ff", Array.from({ length: 40 }, (_, i) => ({ x: Number((0.25 + i * 0.045).toFixed(2)), y: Number((S.moles / (0.25 + i * 0.045)).toFixed(2)) }))), sr("وضعیت فعلی", "#f2a83b", [{ x: S.vol, y: M }, { x: S.vol, y: M }])]} xLabel="V (L)" yLabel="M (mol/L)" height={230} yMin={0} />}
      table={{ headers: ["n (mol)", "V (L)", "M (mol/L)"], rows: [0.25, 0.5, 1, 1.5, 2].map((n) => [n, S.vol, Number((n / S.vol).toFixed(2))]) }}
      stats={[
        { label: "مولاریته", value: `${fmt(M, 2)} M`, color: "#f2a83b", sub: "n/V" },
        { label: "مول", value: `${fmt(S.moles, 2)} mol`, color: "#e9f6f3" },
        { label: "حجم", value: `${fmt(S.vol, 2)} L`, color: "#56b8ff" },
        { label: "تعداد ذرات", value: `${fmt(S.moles * 6.022e23, 2)}e23`, color: "#35d3c2", sub: "n×NA" },
        { label: "غلظت رقت", value: `${fmt(dilM, 2)} M`, color: "#a5d95c" },
        { label: "جرم NaCl معادل", value: `${fmt(S.moles * 58.44, 1)} g`, color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`M = n/V = ${fmt(S.moles, 2)}/${fmt(S.vol, 2)} = ${fmt(M, 3)} mol/L`, `Dilution: M1V1=M2V2 => ${fmt(S.stockM, 1)}M x ${fmt(S.vStock, 0)}mL -> ${fmt(dilM, 3)}M`]} />
  );
}

/* ===================== Buffer ===================== */
const pKa = 4.76;
export function BufferLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ acid: 0.1, salt: 0.1, added: 0, total: 1, ev: 0, feed: [{ time: "#0", level: "info", msg: "بافر استات (CH₃COOH/CH₃COO⁻) — اسید یا باز قوی اضافه کنید؛ pH با معادله هندرسون تقریباً ثابت می‌ماند تا ظرفیت بافر تمام شود." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const add = (delta: number) => {
    let a = S.acid, s = S.salt;
    if (delta > 0) { s = Math.max(0, s - delta); a += delta; } else { a = Math.max(0, a + delta); s -= delta; }
    S.acid = a; S.salt = s; S.added += delta; S.total += Math.abs(delta) / 10;
    if (s < 0.005 || a < 0.005) pushFeed("error", "ظرفیت بافر تمام شد — یکی از اجزا مصرف شد و pH به‌شدت تغییر می‌کند!");
    else if (Math.abs(pH - pKa) > 1) pushFeed("warn", `از محدوده مؤثر بافر (pKa±1) خارج شدید — مقاومت در حال کاهش است.`);
    else pushFeed("ok", `pH = ${fmt(pHOf(a, s), 2)} — بافر ${delta > 0 ? "اسید" : "باز"} اضافه‌شده را خنثی کرد.`);
    force();
  };
  const pHOf = (a: number, s: number) => {
    if (a <= 0.0001) return 12.5;
    if (s <= 0.0001) return 2.4;
    return pKa + Math.log10(s / a);
  };
  const pH = pHOf(S.acid, S.salt);

  useRaf(() => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    chemScene(ctx, 960, 560, mode === "ar", performance.now() / 1000);
    const bx = 260, bot = 462;
    const col: [number, number, number] = pH < 4 ? [255, 111, 97] : pH < 5.6 ? [242, 168, 59] : [86, 184, 255];
    chem.beaker(ctx, bx, bot, 84, 300);
    chem.beakerLiquid(ctx, bx, bot, 84, 300, 0.62, col, 0.75);
    chem.glow(ctx, bx, bot - 90, 120, col, 0.25);
    chem.swirl(ctx, bx, bot - 90, 50, performance.now() / 1000, "255,255,255");
    ctx.font = `700 42px ${MONO}`; ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; ctx.textAlign = "center";
    ctx.fillText(fmt(pH, 2), bx, 320);
    ctx.font = `12px ${FA}`; ctx.fillStyle = "#8fbcb8";
    ctx.fillText("pH بافر استات", bx, 352);
    ctx.textAlign = "left";
    const ratio = S.acid > 0 ? S.salt / S.acid : 99;
    hud(ctx, 540, 130, 370, 260, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`[CH₃COOH] = ${fmt(S.acid, 3)} M`, 560, 160);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`[CH₃COO⁻] = ${fmt(S.salt, 3)} M`, 560, 186);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`نسبت [باز]/[اسید] = ${fmt(ratio, 2)}`, 560, 212);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`pKa = ${pKa}`, 560, 238);
    ctx.fillStyle = Math.abs(pH - pKa) <= 1 ? "#a5d95c" : "#ff6f61";
    ctx.fillText(Math.abs(pH - pKa) <= 1 ? "در محدوده مؤثر pKa±1 ✓" : "خارج از محدوده مؤثر!", 560, 264);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`اضافه‌شده: ${fmt(S.added * 1000, 0)} mmol ${S.added >= 0 ? "H⁺" : "OH⁻"}`, 560, 290);
    const capL = Math.min(S.salt, 1), capR = Math.min(S.acid, 1);
    ctx.fillText("ظرفیت در برابر:", 560, 322);
    ctx.fillStyle = "#ff6f61"; ctx.fillRect(700, 312, 190 * Math.max(0, capL), 10);
    ctx.fillStyle = "#56b8ff"; ctx.fillRect(700, 330, 190 * Math.max(0, capR), 10);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${FA}`;
    ctx.fillText("اسید", 668, 321); ctx.fillText("باز", 668, 339);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={false}
      onToggleRun={() => pushFeed("info", "با دکمه‌های افزودن H⁺/OH⁻ ظرفیت بافر را آزمایش کنید.")}
      onReset={() => { S.acid = 0.1; S.salt = 0.1; S.added = 0; pushFeed("info", "بافر تازه: ۰٫۱M اسید + ۰٫۱M نمک → pH=pKa=۴٫۷۶."); }}
      simClock={`pH = ${fmt(pH, 2)}`}
      hint="وقتی [اسید]=[نمک]، pH دقیقاً برابر pKa است. آن‌قدر H⁺ اضافه کنید تا نمک تمام شود — آنگاه pH سقوط می‌کند."
      protocol={[
        { label: "خواندن pH اولیه (pKa)", done: true },
        { label: "افزودن باز و پایداری pH", done: S.added < 0 },
        { label: "افزودن اسید و پایداری pH", done: S.added > 0 },
        { label: "شکستن بافر (ظرفیت)", done: S.ev >= 3 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="غلظت اسید [CH₃COOH]" value={S.acid} min={0.01} max={0.5} step={0.01} digits={2} unit="M" accent="#ff6f61" onChange={(v) => { S.acid = v; force(); }} />
        <Slider label="غلظت نمک [CH₃COO⁻]" value={S.salt} min={0.01} max={0.5} step={0.01} digits={2} unit="M" accent="#56b8ff" onChange={(v) => { S.salt = v; force(); }} />
        <div className="flex gap-2">
          <button onClick={() => add(0.02)} className="flex-1 px-3 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer" style={{ borderColor: "#ff6f61", color: "#ff6f61", background: "#ff6f610f" }}>+ ۲۰ mmol H⁺</button>
          <button onClick={() => add(-0.02)} className="flex-1 px-3 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer" style={{ borderColor: "#56b8ff", color: "#56b8ff", background: "#56b8ff0f" }}>+ ۲۰ mmol OH⁻</button>
        </div>
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          <span className="num text-teal">pH = pKa + log([A⁻]/[HA])</span>
        </div>
      </div>}
      chart={<LiveChart series={[sr("pH بر حسب نسبت", "#35d3c2", Array.from({ length: 41 }, (_, i) => { const r = 0.05 + i * 0.2; return { x: Number(r.toFixed(2)), y: Number((pKa + Math.log10(r)).toFixed(2)) }; })), sr("وضعیت فعلی", "#f2a83b", [{ x: Math.max(0.05, Math.min(8.05, S.acid > 0 ? S.salt / S.acid : 8)), y: pH }, { x: Math.max(0.05, Math.min(8.05, S.acid > 0 ? S.salt / S.acid : 8)), y: pH }])]} xLabel="[A⁻]/[HA]" yLabel="pH" height={230} />}
      table={{ headers: ["[A⁻]/[HA]", "pH"], rows: [0.1, 0.5, 1, 2, 10].map((r) => [r, Number((pKa + Math.log10(r)).toFixed(2))]) }}
      stats={[
        { label: "pH بافر", value: fmt(pH, 2), color: "#f2a83b" },
        { label: "pKa", value: `${pKa}`, color: "#e9f6f3" },
        { label: "نسبت [A⁻]/[HA]", value: S.acid > 0 ? fmt(S.salt / S.acid, 2) : "∞", color: "#35d3c2" },
        { label: "محدوده مؤثر", value: "3.76 – 5.76", color: "#a5d95c", sub: "pKa ± 1" },
        { label: "ظرفیت باقی‌مانده (اسید)", value: `${fmt(S.salt * 1000, 0)} mmol`, color: "#ff6f61" },
        { label: "ظرفیت باقی‌مانده (باز)", value: `${fmt(S.acid * 1000, 0)} mmol`, color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Acetate buffer: pH = pKa + log([A-]/[HA]) = ${fmt(pH, 2)}`, `pKa=${pKa}; effective range ${pKa - 1}-${pKa + 1}`]} />
  );
}
