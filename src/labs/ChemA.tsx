import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { chemScene, hud, FA, MONO, rr, sr } from "./draw";
import * as chem from "./chem";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== Redox permanganate ===================== */
export function RedoxLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ v: 0, acidified: true, dropping: false, epSeen: false, overshoot: false, ev: 0, feed: [{ time: "#0", level: "info", msg: "تیتراسیون Fe²⁺ با KMnO₄ — پرمنگنات شناساگر خودش است: اولین صورتی ماندگار، نقطه پایان. محیط باید اسیدی باشد وگرنه رسوب قهوه‌ای MnO₂ می‌دهد." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const VEQ = 25; // mL
  const excess = Math.max(0, S.v - VEQ);
  const Cunknown = (5 * 0.02 * Math.min(S.v, VEQ + excess)) / 25 * (S.v >= VEQ ? VEQ / Math.min(S.v, VEQ) : 0) || (5 * 0.02 * VEQ) / 25;

  useRaf((dt) => {
    if (S.dropping && S.v < 40) S.v = Math.min(40, S.v + Math.min(dt, 50) / 1000 * 3.5);
    if (!S.epSeen && S.v >= VEQ) { S.epSeen = true; pushFeed("ok", `نقطه پایان — صورتی ماندگار در V=${fmt(S.v, 1)} mL. هم‌ارزی: 5Fe²⁺ + MnO₄⁻ + 8H⁺ → 5Fe³⁺ + Mn²⁺ + 4H₂O.`); }
    if (!S.overshoot && S.v > VEQ + 2.5) { S.overshoot = true; pushFeed("warn", "از نقطه پایان عبور کردید — رنگ پررنگ شد و خطای تیتراسیون بالا رفت؛ آرام‌تر بریزید."); }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    chemScene(ctx, 960, 560, mode === "ar", performance.now() / 1000);
    const bx = 300, by = 462;
    // burette with purple KMnO4
    if (mode !== "ar") {
      ctx.strokeStyle = "rgba(143,188,184,0.4)"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(bx - 70, 40); ctx.lineTo(bx + 70, 40); ctx.stroke();
    }
    chem.burette(ctx, bx, 52, 280, Math.max(0, 1 - S.v / 50), [122, 47, 181]);
    chem.labelChip(ctx, bx + 40, 70, "KMnO₄ 0.02 M", "#b388ff");
    // erlenmeyer with reaction color
    const tint = !S.acidified && S.v > 0.3 ? 0.4 : Math.min(1, excess / 1.2);
    const liqCol: [number, number, number] = !S.acidified && S.v > 0.3
      ? [140, 90, 40]
      : [Math.round(235 + tint * 20), Math.round(150 - tint * 60), Math.round(200 - tint * 30)];
    chem.erlenmeyer(ctx, bx, by, 22, 88, -140, -55);
    chem.erlenLiquid(ctx, bx, by, 0.6, 88, liqCol, !S.acidified && S.v > 0.3 ? 0.6 : 0.3 + tint * 0.5);
    if (excess > 0.05 && S.acidified) chem.glow(ctx, bx, by - 45, 80, [235, 120, 190], 0.25);
    if (S.dropping) chem.swirl(ctx, bx, by - 40, 44, performance.now() / 1000, "255,255,255");
    chem.caption(ctx, bx - 110, by + 40, "ارلن: Fe²⁺ + H₂SO₄", "#c9d8d6", 12);
    hud(ctx, 560, 160, 340, 150, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`V = ${fmt(S.v, 2)} mL`, 580, 190);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`Ve = ${VEQ} mL (نظری)`, 580, 216);
    ctx.fillStyle = "#b388ff"; ctx.fillText(`n(Fe²⁺) = ${fmt(5 * 0.02 * Math.min(S.v, VEQ), 2)} mmol`, 580, 242);
    ctx.fillStyle = S.acidified ? "#a5d95c" : "#ff6f61";
    ctx.fillText(S.acidified ? "محیط اسیدی ✓" : "خطا: اسید کافی نیست!", 580, 268);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`C(Fe²⁺) = ${fmt(S.v >= VEQ ? Cunknown : 0, 3)} M`, 580, 294);
    frame.current++;
    if (frame.current % 6 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={S.dropping}
      onToggleRun={() => { S.dropping = !S.dropping; force(); }}
      onReset={() => { S.v = 0; S.dropping = false; S.epSeen = false; S.overshoot = false; pushFeed("info", "بورت صفر شد — تیتراسیون جدید."); }}
      simClock={`V = ${fmt(S.v, 2)} mL`}
      hint="قطره‌قطره نزدیک شوید؛ اولین صورتی ماندگار نقطه پایان است. اسید را حذف کنید تا خطای رسوب MnO₂ را ببینید."
      protocol={[
        { label: "اسیدی‌کردن محیط", done: S.acidified },
        { label: "افزودن پرمنگنات", done: S.v > 1 },
        { label: "دیدن نقطه پایان صورتی", done: S.epSeen },
        { label: "اجتناب از عبور (خطای رویه)", done: S.epSeen && !S.overshoot },
        { label: "محاسبه غلظت Fe²⁺", done: S.v >= VEQ },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="حجم پرمنگنات ریخته‌شده" value={S.v} min={0} max={40} step={0.1} digits={1} unit="mL" accent="#b388ff" onChange={(v) => { S.v = v; force(); }} />
        <div className="flex gap-2">
          <button onClick={() => { S.dropping = !S.dropping; force(); }} className="flex-1 px-3 py-2.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer" style={{ background: "#b388ff", color: "#04191d" }}>{S.dropping ? "توقف قطره" : "ریختن قطره‌قطره"}</button>
          <button onClick={() => { S.v = VEQ - 0.3; pushFeed("info", "به نزدیکی نقطه هم‌ارزی پرش کردید — حالا قطره‌قطره ادامه دهید."); force(); }} className="flex-1 px-3 py-2.5 rounded-lg text-[12px] border border-edge text-fog hover:text-snow transition-colors cursor-pointer">پرش تا ۲۴٫۷</button>
        </div>
        <button onClick={() => { S.acidified = !S.acidified; if (!S.acidified) pushFeed("error", "H₂SO₄ حذف شد — MnO₄⁻ در محیط خنثی به MnO₂ قهوه‌ای تبدیل می‌شود و تیتراسیون باطل است!"); else pushFeed("ok", "محیط دوباره اسیدی شد — Mn²⁺ بی‌رنگ تشکیل می‌شود."); force(); }}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer"
          style={S.acidified ? { borderColor: "#a5d95c", color: "#a5d95c", background: "#a5d95c0f" } : { borderColor: "#ff6f61", color: "#ff6f61", background: "#ff6f610f" }}>
          {S.acidified ? "H₂SO₄: موجود" : "H₂SO₄: حذف شده (خطا!)"}
        </button>
      </div>}
      chart={<LiveChart series={[sr("n(Fe²⁺) واکنش‌داده (mmol)", "#35d3c2", Array.from({ length: 41 }, (_, i) => ({ x: i, y: Number((5 * 0.02 * Math.min(i, VEQ)).toFixed(2)) }))), sr("حجم فعلی", "#b388ff", [{ x: S.v, y: 5 * 0.02 * Math.min(S.v, VEQ) }, { x: S.v, y: 5 * 0.02 * Math.min(S.v, VEQ) }])]} xLabel="V (mL)" yLabel="mmol" height={230} yMin={0} markerX={VEQ} markerLabel="هم‌ارزی" />}
      table={{ headers: ["V (mL)", "وضعیت", "رنگ"], rows: [[5, "پیش از هم‌ارزی", "بی‌رنگ"], [15, "پیش از هم‌ارزی", "بی‌رنگ"], [24.9, "نزدیک هم‌ارزی", "صورتی محو"], [25, "هم‌ارزی", "اولین صورتی ماندگار"], [28, "پس از هم‌ارزی", "صورتی پررنگ"]] }}
      stats={[
        { label: "حجم هم‌ارزی", value: `${VEQ} mL`, color: "#b388ff" },
        { label: "حجم فعلی", value: `${fmt(S.v, 2)} mL`, color: "#e9f6f3" },
        { label: "غلظت Fe²⁺", value: `${fmt(Cunknown, 3)} M`, color: "#35d3c2", sub: "پس از هم‌ارزی" },
        { label: "نسبت مولی", value: "5Fe²⁺ : 1MnO₄⁻", color: "#f2a83b" },
        { label: "شناساگر", value: "خود پرمنگنات", color: "#e9f6f3" },
        { label: "وضعیت محیط", value: S.acidified ? "اسیدی ✓" : "خطا!", color: S.acidified ? "#a5d95c" : "#ff6f61" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`5Fe^{2+} + MnO_4^- + 8H^+ -> 5Fe^{3+} + Mn^{2+} + 4H_2O`, `Ve=${VEQ}mL of 0.02M KMnO4 => C(Fe2+) = ${fmt(Cunknown, 4)}M`]} />
  );
}

/* ===================== Arrhenius ===================== */
const EA_BASE = 60000;
export function ArrheniusLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ T: 25, cat: 0, conc: 0.5, runs: [] as { T: number; k: number; lnk: number; invT: number; v0: number }[], ev: 0, rangeWarned: false, bubT: 0, feed: [{ time: "#0", level: "info", msg: "تجزیه H₂O₂ — نرخ را در دماهای مختلف ثبت کنید تا از شیب ln k بر حسب 1/T انرژی فعال‌سازی استخراج شود." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const Ea = EA_BASE - [0, 15000, 20000][S.cat];
  const TK = S.T + 273.15;
  const k = 1e8 * Math.exp(-Ea / (8.314 * TK));
  const v0 = k * S.conc;
  const record = () => {
    S.runs = [...S.runs, { T: S.T, k, lnk: Math.log(k), invT: 1 / TK, v0 }].slice(-14);
    pushFeed("ok", `نرخ در ${fmt(S.T, 0)}°C ثبت شد: k=${k.toExponential(2)} min⁻¹.`);
    const Ts = S.runs.map((x) => x.T);
    if (S.runs.length >= 2 && Math.max(...Ts) - Math.min(...Ts) < 20 && !S.rangeWarned) { S.rangeWarned = true; pushFeed("warn", "بازه دمایی کمتر از ۲۰ درجه است — شیب آرنیوس عدم‌قطعیت بزرگ می‌گیرد؛ نقاط را پخش کنید."); }
  };
  const fit = (() => {
    const n = S.runs.length;
    if (n < 2) return null;
    const xs = S.runs.map((r) => r.invT), ys = S.runs.map((r) => r.lnk);
    const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); syy += (ys[i] - my) ** 2; }
    const slope = sxy / sxx, icpt = my - slope * mx;
    const r2 = syy > 0 ? 1 - (syy - (sxy * sxy) / sxx) / syy : 1;
    return { slope, icpt, r2, eaFit: (-slope * 8.314) / 1000 };
  })();

  useRaf((dt) => {
    S.bubT += Math.min(dt, 50) / 1000;
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    chemScene(ctx, 960, 560, mode === "ar", performance.now() / 1000);
    const tx = 260, ty = 462;
    chem.testTube(ctx, tx, ty - 300, 104, 280, 0.75, [150, 200, 235]);
    chem.glow(ctx, tx, ty - 120, 90, [150, 200, 235], 0.12);
    const bubRate = Math.min(1, Math.log10(1 + v0 * 400) / 3);
    for (let i = 0; i < 16; i++) {
      const cyc = (S.bubT * (40 + (i % 4) * 25) * 0.02 + i * 0.61) % 1;
      const bx2 = tx - 36 + ((i * 29) % 72), by2 = ty - 50 - cyc * 170;
      chem.glow(ctx, bx2, by2, 8, [200, 235, 255], 0.35 * (1 - cyc) * (0.3 + bubRate));
      ctx.fillStyle = `rgba(255,255,255,${((1 - cyc) * 0.75 * (0.25 + bubRate)).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(bx2, by2, 2 + (i % 3) * 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#e9f6f3"; ctx.font = `13px ${MONO}`;
    ctx.fillText(`T = ${fmt(S.T, 0)}°C`, tx + 110, ty - 200);
    ctx.fillStyle = S.cat > 0 ? "#a5d95c" : "#8fbcb8"; ctx.font = `13px ${FA}`;
    ctx.fillText(["بدون کاتالیزور", "کاتالیزور: KI", "کاتالیزور: Fe³⁺"][S.cat], tx - 140, ty + 20);
    ctx.font = `13px ${MONO}`; ctx.fillStyle = "#f2a83b";
    ctx.fillText(`k = ${k.toExponential(2)} min⁻¹   v₀ = ${fmt(v0, 3)}`, tx - 140, ty - 320);
    hud(ctx, 560, 120, 340, 280, mode === "ar");
    ctx.font = `11px ${MONO}`; ctx.fillStyle = "#8fbcb8";
    ctx.fillText("ln k vs 1/T", 574, 142);
    if (S.runs.length) {
      const invs = S.runs.map((r) => r.invT), lns = S.runs.map((r) => r.lnk);
      const x0 = Math.min(...invs, 1 / TK) - 0.0001, x1 = Math.max(...invs, 1 / TK) + 0.0001;
      const y0 = Math.min(...lns, Math.log(k)) - 2, y1 = Math.max(...lns, Math.log(k)) + 2;
      const X = (x: number) => 586 + ((x - x0) / (x1 - x0)) * 290;
      const Y = (y: number) => 370 - ((y - y0) / (y1 - y0)) * 210;
      if (fit) {
        ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(X(x0), Y(fit.icpt + fit.slope * x0)); ctx.lineTo(X(x1), Y(fit.icpt + fit.slope * x1)); ctx.stroke();
      }
      for (const r of S.runs) { ctx.fillStyle = "#35d3c2"; ctx.beginPath(); ctx.arc(X(r.invT), Y(r.lnk), 4.5, 0, Math.PI * 2); ctx.fill(); }
    } else { ctx.fillStyle = "#8fbcb8"; ctx.font = `12px ${FA}`; ctx.fillText("هنوز داده‌ای ثبت نشده", 640, 260); }
    frame.current++;
    if (frame.current % 9 === 0) force();
  }, true);

  const CATS = ["بدون کاتالیزور", "KI (یدید)", "Fe³⁺"];
  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "واکنش پیوسته در جریان است — دما را تغییر دهید و نرخ را ثبت کنید.")}
      onReset={() => { S.runs = []; S.rangeWarned = false; S.T = 25; S.cat = 0; pushFeed("info", "سری جدید آرنیوس آغاز شد."); }}
      simClock={`T = ${fmt(S.T, 0)} °C — k = ${k.toExponential(1)}`}
      hint="حداقل ۵ نقطه در بازه پهن (۱۰ تا ۶۰ درجه) ثبت کنید؛ شیب خط برابر −Ea/R است. سپس کاتالیزور را عوض کنید."
      protocol={[
        { label: "ثبت اولین نرخ", done: S.runs.length >= 1 },
        { label: "۵ نقطه با بازه ≥۲۰°C", done: S.runs.length >= 5 && !S.rangeWarned },
        { label: "برازش خط (R²)", done: fit !== null && fit.r2 > 0.95 },
        { label: "استخراج Ea از شیب", done: fit !== null },
        { label: "مقایسه با کاتالیزور", done: S.cat > 0 && S.runs.length >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="دما T" value={S.T} min={0} max={60} step={1} digits={0} unit="°C" accent="#ff6f61" onChange={(v) => { S.T = v; force(); }} />
        <Slider label="غلظت H₂O₂" value={S.conc} min={0.1} max={2} step={0.1} digits={1} unit="M" accent="#56b8ff" onChange={(v) => { S.conc = v; force(); }} />
        <div>
          <div className="text-[12px] text-fog mb-1.5">کاتالیزور</div>
          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c, i) => (
              <button key={c} onClick={() => { S.cat = i; pushFeed("info", i > 0 ? `${c}: مسیر جایگزین با Ea=${fmt((EA_BASE - [0, 15000, 20000][i]) / 1000, 0)} kJ/mol.` : "کاتالیزور حذف شد."); force(); }}
                className="px-3 py-1.5 rounded-lg text-[12px] border transition-all cursor-pointer"
                style={S.cat === i ? { borderColor: "#a5d95c", color: "#a5d95c", background: "#a5d95c18" } : { borderColor: "#175059", color: "#8fbcb8" }}>{c}</button>
            ))}
          </div>
        </div>
        <button onClick={record} className="w-full px-4 py-3 rounded-lg font-bold text-sm transition-all active:scale-95 cursor-pointer" style={{ background: "#f2a83b", color: "#04191d" }}>
          ثبت نرخ در این دما (نقطه آرنیوس)
        </button>
      </div>}
      chart={<LiveChart series={[sr("داده‌ها", "#35d3c2", S.runs.map((r) => ({ x: Number((r.invT * 1000).toFixed(3)), y: Number(r.lnk.toFixed(2)) }))), sr("وضعیت فعلی", "#e9f6f3", [{ x: Number(((1 / TK) * 1000).toFixed(3)), y: Number(Math.log(k).toFixed(2)) }, { x: Number(((1 / TK) * 1000).toFixed(3)), y: Number(Math.log(k).toFixed(2)) }])]} xLabel="1000/T (K⁻¹)" yLabel="ln k" height={230} />}
      table={{ headers: ["T (°C)", "1000/T", "k (min⁻¹)", "ln k"], rows: S.runs.map((r) => [r.T, Number((r.invT * 1000).toFixed(3)), r.k.toExponential(2), Number(r.lnk.toFixed(2))]) }}
      stats={[
        { label: "Ea واقعی", value: `${fmt(Ea / 1000, 0)} kJ/mol`, color: "#f2a83b" },
        { label: "Ea از برازش", value: fit ? `${fmt(fit.eaFit, 1)} kJ/mol` : "—", color: "#35d3c2", sub: "−شیب×R" },
        { label: "R² برازش", value: fit ? fmt(fit.r2, 4) : "—", color: "#e9f6f3" },
        { label: "خطای Ea", value: fit ? `${fmt(Math.abs((fit.eaFit - Ea / 1000) / (Ea / 1000)) * 100, 1)} ٪` : "—", color: fit && Math.abs(fit.eaFit - Ea / 1000) / (Ea / 1000) < 0.08 ? "#a5d95c" : "#f2a83b" },
        { label: "k فعلی", value: `${k.toExponential(2)}`, color: "#e9f6f3" },
        { label: "Q₁₀", value: fmt(Math.exp((Ea / 8.314) * (1 / TK - 1 / (TK + 10))), 1), color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`k = A e^{-Ea/RT}; Ea(true)=${fmt(Ea / 1000, 0)}kJ/mol`, fit ? `Fit: Ea=${fmt(fit.eaFit, 2)}kJ/mol, R2=${fmt(fit.r2, 4)}` : `Need >=2 runs`]} />
  );
}

/* ===================== Flame test ===================== */
const METALS = [
  { id: "Li", fa: "لیتیم", lines: [670.8], rgb: [255, 80, 70], colorFa: "قرمز کارمن" },
  { id: "Na", fa: "سدیم", lines: [589.0], rgb: [255, 210, 60], colorFa: "زرد طلایی" },
  { id: "K", fa: "پتاسیم", lines: [404.4, 766.5], rgb: [200, 150, 255], colorFa: "بنفش کم‌رنگ" },
  { id: "Ca", fa: "کلسیم", lines: [622.0], rgb: [255, 130, 70], colorFa: "نارنجی-قرمز" },
  { id: "Ba", fa: "باریم", lines: [524.2, 553.5], rgb: [150, 235, 110], colorFa: "سبز مایل به زرد" },
  { id: "Cu", fa: "مس", lines: [510.5, 570.0], rgb: [90, 225, 180], colorFa: "سبز-آبی" },
];
const lineColor = (nm: number) => (nm < 450 ? "#9a6bff" : nm < 490 ? "#4f8bff" : nm < 560 ? "#4fe06b" : nm < 590 ? "#ffe14f" : nm < 630 ? "#ff9b3b" : "#ff4f3b");

export function FlameLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ m1: 1, m2: -1, cobalt: false, burner: true, ev: 0, warnedNa: false, feed: [{ time: "#0", level: "info", msg: "نمک را در شعله بگذارید — رنگ نشری امضای عنصر است. زرد سدیم همه‌چیز را می‌پوشاند؛ شیشه کبالت راه‌حل کلاسیک برای پتاسیم است." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const setMetal = (slot: 1 | 2, idx: number) => {
    if (slot === 1) S.m1 = idx; else S.m2 = idx;
    const m = METALS[idx];
    pushFeed("info", `${m.fa}: رنگ ${m.colorFa} — خطوط ${m.lines.map((l) => `${fmt(l, 0)} nm`).join(" و ")}.`);
    if (m.id === "Na" && !S.warnedNa) { S.warnedNa = true; pushFeed("warn", "خط زرد سدیم (۵۸۹nm) خیره‌کننده است و بنفش پتاسیم را می‌پوشاند — از شیشه کبالت استفاده کنید."); }
    force();
  };
  const present = [S.m1, S.m2].filter((i) => i >= 0);
  const comp = (() => {
    let r = 0, g = 0, b = 0, w = 0;
    for (const i of present) {
      const m = METALS[i];
      const ww = (m.id === "Na" ? 3.2 : m.id === "K" ? 0.55 : 1.6) * (S.cobalt && m.id === "Na" ? 0.04 : 1);
      r += m.rgb[0] * ww; g += m.rgb[1] * ww; b += m.rgb[2] * ww; w += ww;
    }
    return w ? [r / w, g / w, b / w] : [0, 0, 0];
  })();
  const flameOn = S.burner && present.length > 0;

  useRaf(() => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    chemScene(ctx, 960, 560, mode === "ar", performance.now() / 1000);
    const bx = 300, by = 462, t = performance.now() / 1000;
    const flick = 0.85 + 0.15 * Math.sin(t * 21) * Math.sin(t * 13.7);
    chem.burner(ctx, bx, by, t, false);
    if (S.burner) {
      const fh = 150 * flick, [r, g2, b2] = flameOn ? comp : [70, 110, 255];
      chem.glow(ctx, bx, by - 120 - fh / 2, fh, [r, g2, b2].map((v) => Math.round(v)) as [number, number, number], 0.35);
      const oc = ctx.createRadialGradient(bx, by - 120 - fh / 2, 8, bx, by - 120 - fh / 2, fh);
      oc.addColorStop(0, `rgba(${Math.round(r)},${Math.round(g2)},${Math.round(b2)},0.9)`);
      oc.addColorStop(0.55, `rgba(${Math.round(r)},${Math.round(g2)},${Math.round(b2)},0.3)`);
      oc.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = oc;
      ctx.beginPath(); ctx.ellipse(bx, by - 120 - fh / 2, 40 * flick, fh * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      const ig = ctx.createLinearGradient(bx, by - 118, bx, by - 118 - 56);
      ig.addColorStop(0, "rgba(120,170,255,0.85)");
      ig.addColorStop(1, "rgba(160,200,255,0.1)");
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.moveTo(bx - 13, by - 116); ctx.quadraticCurveTo(bx, by - 116 - 54 * flick, bx + 13, by - 116); ctx.closePath(); ctx.fill();
    }
    // wire loop with glowing sample
    ctx.strokeStyle = "rgba(214,240,244,0.7)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(bx + 150, by - 240); ctx.lineTo(bx + 26, by - 160); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx + 150, by - 248, 11, 0, Math.PI * 2); ctx.stroke();
    if (flameOn) {
      const [r, g2, b2] = comp.map((v) => Math.round(v)) as [number, number, number];
      chem.glow(ctx, bx + 150, by - 248, 30, [r, g2, b2], 0.6);
      ctx.fillStyle = `rgb(${r},${g2},${b2})`;
      ctx.beginPath(); ctx.arc(bx + 150, by - 248, 7, 0, Math.PI * 2); ctx.fill();
    }
    const px = 540, py = 120, pw = 360, ph = 220;
    ctx.fillStyle = "#04191d"; ctx.strokeStyle = "rgba(42,122,128,0.9)";
    rr(ctx, px, py, pw, ph, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${MONO}`;
    ctx.fillText("طیف نشری (400–780 nm)", px + 14, py + 22);
    const Xnm = (nm: number) => px + 20 + ((nm - 400) / 380) * (pw - 40);
    for (const i of present) {
      const m = METALS[i];
      for (const nm of m.lines) {
        const strong = S.cobalt && m.id === "Na" ? 0.12 : 1;
        ctx.strokeStyle = lineColor(nm); ctx.globalAlpha = strong; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(Xnm(nm), py + ph - 30); ctx.lineTo(Xnm(nm), py + 44); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = lineColor(nm); ctx.font = `9.5px ${MONO}`;
        ctx.fillText(`${fmt(nm, 0)}`, Xnm(nm) - 10, py + ph - 16);
      }
    }
    if (S.cobalt) {
      ctx.fillStyle = "rgba(80,60,200,0.18)"; ctx.strokeStyle = "#7a5cff";
      rr(ctx, 540, 360, 360, 38, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#b3a4ff"; ctx.font = `12px ${FA}`;
      ctx.fillText("شیشه کبالت — زرد سدیم حذف شد", 560, 384);
    }
    ctx.fillStyle = "#e9f6f3"; ctx.font = `14px ${FA}`;
    ctx.fillText(flameOn ? `رنگ مشاهده‌شده: ${present.map((i) => METALS[i].colorFa).join(" + ")}` : "شعله آماده — نمک را انتخاب کنید", 120, 70);
    frame.current++;
    if (frame.current % 10 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={S.burner}
      onToggleRun={() => { S.burner = !S.burner; force(); }}
      onReset={() => { S.m1 = 1; S.m2 = -1; S.cobalt = false; pushFeed("info", "به سدیم بازگشت — خط زرد معروف ۵۸۹nm."); }}
      simClock={present.length ? `${present.map((i) => METALS[i].id).join("+")}` : "—"}
      hint="سدیم+پتاسیم را مخلوط کنید تا پوشانندگی را ببینید، سپس شیشه کبالت را فعال کنید."
      protocol={[
        { label: "مشاهده رنگ نشری تک‌عنصر", done: S.ev >= 1 },
        { label: "افزودن عنصر دوم (مخلوط)", done: S.m2 >= 0 },
        { label: "رویت پوشانندگی سدیم", done: S.warnedNa },
        { label: "فعال‌کردن شیشه کبالت", done: S.cobalt },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-4">
        {([1, 2] as const).map((slot) => (
          <div key={slot}>
            <div className="text-[12px] text-fog mb-1.5">نمک {slot === 1 ? "اول" : "دوم (اختیاری)"}</div>
            <div className="flex flex-wrap gap-1.5">
              {METALS.map((m, i) => (
                <button key={m.id} onClick={() => setMetal(slot, i)}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] border transition-all cursor-pointer"
                  style={(slot === 1 ? S.m1 : S.m2) === i ? { borderColor: "#f2a83b", color: "#f2a83b", background: "#f2a83b18" } : { borderColor: "#175059", color: "#8fbcb8" }}>{m.fa}</button>
              ))}
              {slot === 2 && (
                <button onClick={() => { S.m2 = -1; force(); }} className="px-3 py-1.5 rounded-lg text-[11.5px] border border-edge/70 text-fog hover:text-snow cursor-pointer">حذف</button>
              )}
            </div>
          </div>
        ))}
        <button onClick={() => { S.cobalt = !S.cobalt; pushFeed("info", S.cobalt ? "شیشه کبالت جلوی چشم — زرد/نارنجی جذب می‌شود." : "شیشه کبالت برداشته شد."); force(); }}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer"
          style={S.cobalt ? { borderColor: "#7a5cff", color: "#b3a4ff", background: "#7a5cff18" } : { borderColor: "#175059", color: "#8fbcb8" }}>
          {S.cobalt ? "شیشه کبالت: جلوی چشم" : "شیشه کبالت: برداشته"}
        </button>
      </div>}
      chart={<LiveChart series={present.map((i) => sr(METALS[i].fa, `rgb(${METALS[i].rgb.join(",")})`, METALS[i].lines.filter((l) => l <= 780).map((l) => ({ x: l, y: S.cobalt && METALS[i].id === "Na" ? 0.08 : 1 }))))} xLabel="طول‌موج (nm)" yLabel="شدت نسبی" height={230} yMin={0} yMax={1.15} />}
      table={{ headers: ["عنصر", "خطوط (nm)", "رنگ شعله"], rows: METALS.map((m) => [m.fa, m.lines.map((l) => fmt(l, 1)).join("، "), m.colorFa]) }}
      stats={[
        { label: "رنگ مشاهده‌شده", value: present.length ? present.map((i) => METALS[i].colorFa).join(" + ") : "—", color: `rgb(${comp.map((x) => Math.round(x)).join(",") || "143,188,184"})` },
        { label: "عناصر موجود", value: present.length ? present.map((i) => METALS[i].fa).join(" + ") : "—", color: "#35d3c2" },
        { label: "قوی‌ترین خط", value: present.length ? `${fmt(Math.max(...present.flatMap((i) => METALS[i].lines)), 0)} nm` : "—", color: "#f2a83b" },
        { label: "شیشه کبالت", value: S.cobalt ? "فعال" : "غیرفعال", color: S.cobalt ? "#b3a4ff" : "#8fbcb8" },
        { label: "نوع طیف", value: "خطی نشری", color: "#e9f6f3" },
        { label: "شعله", value: S.burner ? "روشن" : "خاموش", color: S.burner ? "#a5d95c" : "#ff6f61" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Flame emission: ${present.map((i) => `${METALS[i].fa} ${METALS[i].lines.join("/")}nm`).join("; ") || "no sample"}`, S.cobalt ? `Cobalt glass suppresses Na 589nm` : `No filter`]} />
  );
}
