import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { bg, hud, FA, MONO, rr, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== Le Chatelier ===================== */
const KH = 57300; // J/mol for N2O4 -> 2NO2 (endothermic forward)
export function LeChatelierLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ T: 298, P: 1, extra: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "N₂O₄ (بی‌رنگ) ⇌ 2NO₂ (قهوه‌ای) — واکنش رفت گرماگیر است. دما، فشار یا غلظت را تغییر دهید و پاسخ تعادل را ببینید." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const K = Math.exp(-(KH / 8.314) * (1 / S.T - 1 / 298)) * 0.15;
  // solve alpha: K = 4α²·C0/(1−α²), C0 scaled by P
  const C0 = S.P;
  const alpha = (() => { const a2 = K / (4 * C0 + K); return Math.sqrt(Math.min(0.98, a2)); })();
  const stress = S.extra > 0 ? "افزایش NO₂" : S.extra < 0 ? "افزایش N₂O₄" : "—";

  const apply = (kind: "T+" | "T-" | "P+" | "P-" | "NO2" | "N2O4") => {
    if (kind === "T+") { S.T = Math.min(400, S.T + 25); pushFeed("ok", "دما بالا رفت — چون واکنش رفت گرماگیر است، تعادل به‌سوی NO₂ قهوه‌ای جابه‌جا شد (رنگ تیره‌تر)."); }
    if (kind === "T-") { S.T = Math.max(220, S.T - 25); pushFeed("ok", "دما پایین آمد — تعادل به‌سوی N₂O₄ بی‌رنگ برگشت."); }
    if (kind === "P+") { S.P = Math.min(5, S.P + 0.5); pushFeed("ok", "فشار زیاد شد — تعادل به‌سوی سمت کم‌مول‌تر (N₂O₄) جابه‌جا شد؛ رنگ روشن‌تر."); }
    if (kind === "P-") { S.P = Math.max(0.5, S.P - 0.5); pushFeed("ok", "فشار کم شد — تعادل به‌سوی سمت پرمول‌تر (2NO₂) رفت."); }
    if (kind === "NO2") { S.extra = 1; pushFeed("warn", "NO₂ اضافه شد — Q>K شد؛ سیستم با مصرف NO₂ به تعادل برمی‌گردد ولی رنگ کمی تیره‌تر می‌ماند."); }
    if (kind === "N2O4") { S.extra = -1; pushFeed("warn", "N₂O₄ اضافه شد — سیستم با تولید NO₂ پاسخ می‌دهد."); }
    force();
  };

  useRaf(() => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const cx = 300, bot = 460, gasH = 240 / S.P;
    ctx.strokeStyle = "rgba(233,246,243,0.55)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 80, bot - 300); ctx.lineTo(cx - 80, bot); ctx.lineTo(cx + 80, bot); ctx.lineTo(cx + 80, bot - 300); ctx.stroke();
    ctx.fillStyle = `rgba(180,110,40,${(0.08 + alpha * 0.6).toFixed(2)})`;
    ctx.fillRect(cx - 76, bot - gasH, 152, gasH - 4);
    ctx.fillStyle = "#8fbcb8"; ctx.fillRect(cx - 90, bot - gasH - 14, 180, 14);
    const nB = Math.round(alpha * 26);
    for (let i = 0; i < 26; i++) {
      const isNO2 = i < nB;
      const px = cx - 66 + ((i * 53 + frame.current * (isNO2 ? 1.3 : 0.8)) % 132);
      const py = bot - 14 - ((i * 91 + frame.current * (isNO2 ? 1.1 : 0.7)) % (gasH - 24));
      ctx.fillStyle = isNO2 ? "#b46e28" : "#d8e6e4";
      ctx.beginPath(); ctx.arc(px, py, isNO2 ? 6 : 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#e9f6f3"; ctx.font = `12px ${FA}`;
    ctx.fillText("N₂O₄ بی‌رنگ ⇌ 2NO₂ قهوه‌ای (رفت گرماگیر)", 150, bot + 30);
    hud(ctx, 560, 130, 350, 250, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`T = ${fmt(S.T, 0)} K`, 580, 160);
    ctx.fillStyle = "#56b8ff"; ctx.fillText(`P = ${fmt(S.P, 1)} atm`, 580, 186);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`K(T) = ${fmt(K, 3)}`, 580, 212);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`α (تفکیک) = ${fmt(alpha * 100, 1)}٪`, 580, 238);
    ctx.fillStyle = "#b46e28"; ctx.fillText(`[NO₂] ∝ ${fmt(2 * alpha * C0, 2)}`, 580, 264);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`[N₂O₄] ∝ ${fmt((1 - alpha) * C0, 2)}`, 580, 290);
    ctx.fillStyle = S.extra !== 0 ? "#f2a83b" : "#8fbcb8";
    ctx.fillText(`تنش: ${stress}`, 580, 316);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("K فقط با دما تغییر می‌کند — فشار و غلظت فقط جای تعادل را عوض می‌کنند.", 580, 350);
    frame.current++;
    if (frame.current % 9 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "با دکمه‌های تنش، اصل لوشاتلیه را آزمایش کنید.")}
      onReset={() => { S.T = 298; S.P = 1; S.extra = 0; pushFeed("info", "به حالت استاندارد بازگشت."); }}
      simClock={`α = ${fmt(alpha * 100, 1)}٪ تفکیک`}
      hint="هر تنش را اعمال کنید و جهت جابه‌جایی را پیش‌بینی کنید قبل از دیدن رنگ. فقط دما مقدار K را تغییر می‌دهد."
      protocol={[
        { label: "اثر دما (گرماگیر بودن رفت)", done: S.T !== 298 },
        { label: "اثر فشار (سمت کم‌مول)", done: S.P !== 1 },
        { label: "اثر افزودن فرآورده", done: S.extra === 1 },
        { label: "تفکیک K از جابه‌جایی", done: S.ev >= 3 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-3">
        <Slider label="دما T" value={S.T} min={220} max={400} step={5} digits={0} unit="K" accent="#ff6f61" onChange={(v) => { S.T = v; force(); }} />
        <Slider label="فشار P" value={S.P} min={0.5} max={5} step={0.25} digits={2} unit="atm" accent="#56b8ff" onChange={(v) => { S.P = v; force(); }} />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => apply("T+")} className="px-3 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer" style={{ borderColor: "#ff6f61", color: "#ff6f61", background: "#ff6f610f" }}>گرم‌کردن +۲۵K</button>
          <button onClick={() => apply("T-")} className="px-3 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer" style={{ borderColor: "#56b8ff", color: "#56b8ff", background: "#56b8ff0f" }}>سردکردن −۲۵K</button>
          <button onClick={() => apply("P+")} className="px-3 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer" style={{ borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c20f" }}>فشار +۰٫۵</button>
          <button onClick={() => apply("P-")} className="px-3 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer" style={{ borderColor: "#f2a83b", color: "#f2a83b", background: "#f2a83b0f" }}>فشار −۰٫۵</button>
          <button onClick={() => apply("NO2")} className="px-3 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer" style={{ borderColor: "#b46e28", color: "#d09050", background: "#b46e280f" }}>افزودن NO₂</button>
          <button onClick={() => apply("N2O4")} className="px-3 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer" style={{ borderColor: "#8fbcb8", color: "#8fbcb8", background: "#8fbcb80f" }}>افزودن N₂O₄</button>
        </div>
      </div>}
      chart={<LiveChart series={[sr("K بر حسب T", "#f2a83b", Array.from({ length: 37 }, (_, i) => { const T = 220 + i * 5; return { x: T, y: Number((Math.exp(-(KH / 8.314) * (1 / T - 1 / 298)) * 0.15).toFixed(3)) }; })), sr("وضعیت فعلی", "#35d3c2", [{ x: S.T, y: K }, { x: S.T, y: K }])]} xLabel="T (K)" yLabel="K" height={230} yMin={0} />}
      table={{ headers: ["T (K)", "K", "α در P=1"], rows: [240, 270, 298, 330, 370].map((T) => { const Kt = Math.exp(-(KH / 8.314) * (1 / T - 1 / 298)) * 0.15; return [T, Number(Kt.toFixed(3)), Number((Math.sqrt(Math.min(0.98, Kt / (4 + Kt))) * 100).toFixed(1))]; }) }}
      stats={[
        { label: "ثابت تعادل K", value: fmt(K, 3), color: "#f2a83b", sub: "فقط تابع دما" },
        { label: "درجه تفکیک α", value: `${fmt(alpha * 100, 1)} ٪`, color: "#35d3c2" },
        { label: "[NO₂] نسبی", value: fmt(2 * alpha * C0, 2), color: "#b46e28" },
        { label: "[N₂O₄] نسبی", value: fmt((1 - alpha) * C0, 2), color: "#8fbcb8" },
        { label: "جهت با گرم‌کردن", value: "→ NO₂ (رفت)", color: "#ff6f61", sub: "رفت گرماگیر" },
        { label: "جهت با فشار", value: "→ N₂O₄", color: "#56b8ff", sub: "سمت کم‌مول" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`N2O4 <=> 2NO2 (forward endothermic)`, `K(T)=${fmt(K, 4)}; \\alpha=${fmt(alpha, 3)} at P=${fmt(S.P, 1)}atm; K=4\\alpha^2C_0/(1-\\alpha^2)`]} />
  );
}

/* ===================== Elodea photosynthesis ===================== */
export function ElodeaLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ light: 60, co2: 0.5, T: 25, t: 0, o2: 0, bubbles: [] as { x: number; y: number; r: number }[], samples: [] as { x: number; y: number }[], lastS: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "الودیا در آب — حباب‌های اکسیژن نرخ فتوسنتز را نشان می‌دهند. نور، CO₂ و دما را تغییر دهید و عامل محدودکننده را پیدا کنید." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const fLight = S.light / (S.light + 30);
  const fCo2 = S.co2 / (S.co2 + 0.4);
  const fT = Math.max(0, 1 - ((S.T - 28) / 22) ** 2);
  const rate = 1.4 * fLight * fCo2 * fT;
  const limiting = fLight <= fCo2 && fLight <= fT ? "نور" : fCo2 <= fT ? "CO₂" : "دما";

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (running) {
      S.t += ds;
      S.o2 += rate * ds * 0.5;
      if (Math.random() < rate * ds * 1.6) S.bubbles.push({ x: 300 + Math.random() * 60, y: 400, r: 2.5 + Math.random() * 3.5 });
      for (const b of S.bubbles) { b.y -= (26 + b.r * 5) * ds; b.x += Math.sin(b.y / 14) * 0.4; }
      S.bubbles = S.bubbles.filter((b) => b.y > 130);
      if (S.t - S.lastS >= 0.5) { S.samples.push({ x: Number(S.t.toFixed(1)), y: Number(S.o2.toFixed(1)) }); if (S.samples.length > 240) S.samples.shift(); S.lastS = S.t; }
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    ctx.fillStyle = "rgba(86,184,255,0.10)";
    ctx.fillRect(140, 110, 360, 360);
    ctx.strokeStyle = "rgba(233,246,243,0.5)"; ctx.lineWidth = 3;
    ctx.strokeRect(140, 110, 360, 360);
    ctx.strokeStyle = "#a5d95c"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(320, 440); ctx.quadraticCurveTo(300, 330, 330, 240); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const ly = 260 + i * 30, side = i % 2 ? 1 : -1;
      ctx.fillStyle = "#7cb342";
      ctx.beginPath(); ctx.ellipse(325 + side * 26, ly, 22, 8, side * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    for (const b of S.bubbles) {
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    }
    if (S.light > 5) {
      ctx.strokeStyle = `rgba(255,210,60,${(S.light / 100) * 0.8})`; ctx.lineWidth = 2.5;
      for (let i = 0; i < 5; i++) {
        const lx = 60 + i * 14;
        ctx.beginPath(); ctx.moveTo(lx, 60); ctx.lineTo(lx + 90, 220); ctx.stroke();
      }
      ctx.fillStyle = "#ffd23c";
      ctx.beginPath(); ctx.arc(70, 52, 16, 0, Math.PI * 2); ctx.fill();
    }
    hud(ctx, 560, 130, 350, 260, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`نرخ نسبی = ${fmt(rate, 2)}`, 580, 160);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`O₂ جمع‌شده = ${fmt(S.o2, 0)} mL`, 580, 186);
    ctx.fillStyle = "#ffd23c"; ctx.fillText(`نور: ${fmt(S.light, 0)}٪ (اثر ${fmt(fLight, 2)})`, 580, 212);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`CO₂: ${fmt(S.co2, 1)}g/L (اثر ${fmt(fCo2, 2)})`, 580, 238);
    ctx.fillStyle = S.T > 42 ? "#ff6f61" : "#f2a83b"; ctx.fillText(`دما: ${fmt(S.T, 0)}°C (اثر ${fmt(fT, 2)})`, 580, 264);
    ctx.fillStyle = "#a5d95c"; ctx.fillText(`عامل محدودکننده: ${limiting}`, 580, 296);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("قانون بلکمن: کمترین اثر، نرخ را تعیین می‌کند.", 580, 330);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.t = 0; S.o2 = 0; S.bubbles = []; S.samples = []; pushFeed("info", "شمارش اکسیژن از سر گرفته شد."); }}
      simClock={`O₂ = ${fmt(S.o2, 0)} mL — نرخ ${fmt(rate, 2)}`}
      hint="نور را اشباع کنید تا CO₂ محدودکننده شود؛ سپس CO₂ را زیاد کنید تا دما محدودکننده شود — قانون عوامل محدودکننده بلکمن."
      protocol={[
        { label: "ثبت نرخ در شرایط پایه", done: S.samples.length > 6 },
        { label: "اثر نور بر نرخ", done: S.ev >= 1 || S.light !== 60 },
        { label: "شناسایی عامل محدودکننده", done: true },
        { label: "اثر دمای بالا (>۴۲°)", done: S.T > 42 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="شدت نور" value={S.light} min={0} max={100} step={5} digits={0} unit="٪" accent="#ffd23c" onChange={(v) => { S.light = v; force(); }} />
        <Slider label="غلظت CO₂" value={S.co2} min={0.05} max={2} step={0.05} digits={2} unit="g/L" accent="#8fbcb8" onChange={(v) => { S.co2 = v; force(); }} />
        <Slider label="دما" value={S.T} min={5} max={45} step={1} digits={0} unit="°C" accent="#ff6f61" onChange={(v) => { S.T = v; if (v > 42) pushFeed("warn", "دمای بالای ۴۲° آنزیم‌های فتوسنتز را دناتوره می‌کند — نرخ سقوط کرد."); force(); }} />
      </div>}
      chart={<LiveChart series={[sr("O₂ (mL)", "#35d3c2", S.samples)]} xLabel="t (s)" yLabel="O₂ (mL)" height={230} yMin={0} />}
      table={{ headers: ["t (s)", "O₂ (mL)", "نرخ (mL/s)"], rows: S.samples.filter((_, i) => i % 4 === 0).map((p, i, arr) => { const prev = i > 0 ? arr[i - 1] : null; return [p.x, p.y, Number((prev ? (p.y - prev.y) / Math.max(p.x - prev.x, 0.1) : 0).toFixed(2))]; }) }}
      stats={[
        { label: "O₂ جمع‌شده", value: `${fmt(S.o2, 0)} mL`, color: "#35d3c2" },
        { label: "نرخ نسبی", value: fmt(rate, 2), color: "#f2a83b" },
        { label: "عامل محدودکننده", value: limiting, color: "#a5d95c", sub: "قانون بلکمن" },
        { label: "اثر نور", value: fmt(fLight, 2), color: "#ffd23c" },
        { label: "اثر CO₂", value: fmt(fCo2, 2), color: "#8fbcb8" },
        { label: "اثر دما", value: fmt(fT, 2), color: S.T > 42 ? "#ff6f61" : "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`6CO2+6H2O -> C6H12O6+6O2 (light)`, `rate=1.4 f(L) f(CO2) f(T)=${fmt(rate, 3)}; limiting=${limiting}`]} />
  );
}
