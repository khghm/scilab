import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { bg, hud, FA, MONO, rr, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== RLC resonance ===================== */
export function RlcLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ R: 50, LmH: 100, CuF: 10, f: 159, tv: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "RLC سری — در فرکانس تشدید XL=XC، امپدانس حداقل و جریان بیشینه است. f₀=1/(2π√LC)." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const L = S.LmH / 1000, C = S.CuF * 1e-6;
  const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
  const XL = 2 * Math.PI * S.f * L, XC = 1 / (2 * Math.PI * S.f * C);
  const Z = Math.sqrt(S.R ** 2 + (XL - XC) ** 2);
  const I = 10 / Z;
  const Q = (1 / S.R) * Math.sqrt(L / C);
  const bw = f0 / Q;
  const Iof = (f: number) => {
    const x = 2 * Math.PI * f * L - 1 / (2 * Math.PI * f * C);
    return 10 / Math.sqrt(S.R ** 2 + x * x);
  };

  useRaf((dt) => {
    if (running) S.tv += Math.min(dt, 50) / 1000;
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(180, 200); ctx.lineTo(780, 200); ctx.lineTo(780, 380); ctx.lineTo(180, 380); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "#0b3038";
    ctx.fillRect(250, 180, 110, 40); ctx.fillRect(430, 180, 110, 40); ctx.fillRect(610, 180, 110, 40);
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(255 + i * 21, 200); ctx.lineTo(265 + i * 21, 186); ctx.stroke(); }
    ctx.strokeStyle = "#35d3c2";
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(452 + i * 18, 200, 9, Math.PI, 0); ctx.stroke(); }
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(630, 188); ctx.lineTo(700, 188); ctx.moveTo(630, 212); ctx.lineTo(700, 212); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText(`R=${S.R}Ω`, 282, 172); ctx.fillText(`L=${fmt(S.LmH, 0)}mH`, 460, 172); ctx.fillText(`C=${fmt(S.CuF, 0)}µF`, 640, 172);
    const cur = Math.min(70, I * 25) * Math.sin(2 * Math.PI * (S.f / 120) * S.tv);
    ctx.fillStyle = "#a5d95c";
    for (let i = 0; i < 6; i++) {
      const px = 200 + ((i * 96 + cur * 8 + frame.current * 2) % 560);
      ctx.beginPath(); ctx.arc(px, 200 + (Math.abs(cur) > 30 ? -8 : 8), 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#35d3c2"; ctx.fillRect(165, 250, 30, 80);
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 13px ${MONO}`; ctx.fillText("10V", 158, 240);
    hud(ctx, 200, 420, 560, 90, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`Z = ${fmt(Z, 1)} Ω   I = ${fmt(I, 2)} A`, 222, 450);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`f₀ = ${fmt(f0, 0)} Hz   Q = ${fmt(Q, 1)}   BW = ${fmt(bw, 0)} Hz`, 222, 478);
    ctx.fillStyle = Math.abs(S.f - f0) < bw / 2 ? "#a5d95c" : "#8fbcb8";
    ctx.fillText(Math.abs(S.f - f0) < bw / 2 ? "در محدوده تشدید — جریان نزدیک بیشینه" : "خارج از تشدید", 222, 502);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const curve = Array.from({ length: 120 }, (_, i) => { const f = 20 + i * 5; return { x: f, y: Number(Iof(f).toFixed(3)) }; });
  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.f = 159; pushFeed("info", "به محدوده تشدید بازگشت."); }}
      simClock={`f = ${fmt(S.f, 0)} Hz — I = ${fmt(I, 2)} A`}
      hint="بسامد را جاروب کنید تا قله جریان در f₀ دیده شود؛ R را زیاد کنید تا Q کمتر و پهنای باند بیشتر شود."
      protocol={[
        { label: "یافتن قله جریان (f₀)", done: Math.abs(S.f - f0) < bw / 2 },
        { label: "خواندن امپدانس حداقل", done: true },
        { label: "محاسبه Q و پهنای باند", done: S.ev >= 1 },
        { label: "اثر R بر تیزی تشدید", done: S.R !== 50 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="بسامد منبع f" value={S.f} min={20} max={600} step={1} digits={0} unit="Hz" accent="#f2a83b" onChange={(v) => { S.f = v; force(); }} />
        <Slider label="مقاومت R" value={S.R} min={10} max={200} step={5} digits={0} unit="Ω" accent="#ff6f61" onChange={(v) => { S.R = v; force(); }} />
        <Slider label="سلف L" value={S.LmH} min={20} max={300} step={10} digits={0} unit="mH" accent="#35d3c2" onChange={(v) => { S.LmH = v; pushFeed("info", `f₀ به ${fmt(1 / (2 * Math.PI * Math.sqrt((v / 1000) * C)), 0)} Hz منتقل شد.`); }} />
        <Slider label="خازن C" value={S.CuF} min={2} max={40} step={1} digits={0} unit="µF" accent="#56b8ff" onChange={(v) => { S.CuF = v; force(); }} />
      </div>}
      chart={<LiveChart series={[sr("جریان I(f)", "#35d3c2", curve), sr("وضعیت فعلی", "#f2a83b", [{ x: S.f, y: I }, { x: S.f, y: I }])]} xLabel="f (Hz)" yLabel="I (A)" height={230} yMin={0} markerX={f0} markerLabel="f₀" />}
      table={{ headers: ["f (Hz)", "Z (Ω)", "I (A)"], rows: [50, 100, 159, 200, 300].map((f) => { const x = 2 * Math.PI * f * L - 1 / (2 * Math.PI * f * C); const z = Math.sqrt(S.R ** 2 + x * x); return [f, Number(z.toFixed(1)), Number((10 / z).toFixed(2))]; }) }}
      stats={[
        { label: "فرکانس تشدید", value: `${fmt(f0, 0)} Hz`, color: "#f2a83b", sub: "1/(2π√LC)" },
        { label: "امپدانس", value: `${fmt(Z, 1)} Ω`, color: "#e9f6f3" },
        { label: "جریان", value: `${fmt(I, 2)} A`, color: "#35d3c2" },
        { label: "ضریب کیفیت Q", value: fmt(Q, 1), color: "#a5d95c", sub: "(1/R)√(L/C)" },
        { label: "پهنای باند", value: `${fmt(bw, 0)} Hz`, color: "#56b8ff", sub: "f₀/Q" },
        { label: "XL / XC", value: `${fmt(XL, 0)} / ${fmt(XC, 0)} Ω`, color: "#8fbcb8" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`f0 = 1/(2\\pi\\sqrt{LC}) = ${fmt(f0, 1)}Hz`, `Z=\\sqrt{R^2+(X_L-X_C)^2}=${fmt(Z, 1)}\\Omega; Q=${fmt(Q, 2)}; BW=${fmt(bw, 1)}Hz`]} />
  );
}

/* ===================== Op-amp ===================== */
export function OpampLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ cfg: "inv" as "inv" | "noninv", Rf: 100, Rin: 10, vinA: 1, tv: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "آپ‌امپ ایده‌آل — بهره وارونه −Rf/Rin و ناوارونه 1+Rf/Rin؛ خروجی در ±۱۳V اشباع می‌شود." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const gain = S.cfg === "inv" ? -S.Rf / S.Rin : 1 + S.Rf / S.Rin;
  const vSat = 13;
  const vout = (t: number) => {
    const raw = gain * S.vinA * Math.sin(2 * Math.PI * 0.7 * t);
    return Math.max(-vSat, Math.min(vSat, raw));
  };
  const clipped = Math.abs(gain) * S.vinA > vSat;

  useRaf((dt) => {
    if (running) S.tv += Math.min(dt, 50) / 1000;
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    ctx.fillStyle = "#0f3d46"; ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(380, 200); ctx.lineTo(380, 380); ctx.lineTo(540, 290); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 18px ${MONO}`;
    ctx.fillText("−", 392, 245); ctx.fillText("+", 392, 350);
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(240, 235); ctx.lineTo(380, 235); ctx.moveTo(240, 345); ctx.lineTo(380, 345); ctx.moveTo(540, 290); ctx.lineTo(700, 290); ctx.stroke();
    ctx.fillStyle = "#56b8ff"; ctx.font = `11px ${FA}`;
    ctx.fillText("ورودی", 250, 222); ctx.fillText("خروجی", 620, 278);
    const plot = (fn: (t: number) => number, col: string, x0: number, w: number, cy: number, amp: number) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const t = S.tv - 2.5 + (i / 120) * 2.5;
        const y = cy - Math.max(-1, Math.min(1, fn(t) / amp)) * amp * 0.8;
        if (i === 0) ctx.moveTo(x0 + (i / 120) * w, y); else ctx.lineTo(x0 + (i / 120) * w, y);
      }
      ctx.stroke();
    };
    plot((t) => S.vinA * Math.sin(2 * Math.PI * 0.7 * t), "#56b8ff", 120, 200, 470, S.vinA);
    plot(vout, "#f2a83b", 420, 260, 470, Math.max(vSat, Math.abs(gain) * S.vinA));
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("ورودی", 190, 430); ctx.fillText("خروجی", 520, 430);
    hud(ctx, 720, 120, 210, 190, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`A = ${fmt(gain, 1)}`, 740, 150);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`Rf/Rin = ${fmt(S.Rf / S.Rin, 1)}`, 740, 176);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`Vout(p) = ${fmt(Math.min(vSat, Math.abs(gain) * S.vinA), 1)}V`, 740, 202);
    ctx.fillStyle = clipped ? "#ff6f61" : "#a5d95c";
    ctx.fillText(clipped ? "اشباع (کلیپ)!" : "خطی", 740, 228);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("ریل تغذیه ±13V", 740, 260);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.cfg = "inv"; S.Rf = 100; S.Rin = 10; S.vinA = 1; pushFeed("info", "به پیکربندی وارونه با بهره −۱۰ بازگشت."); }}
      simClock={`بهره = ${fmt(gain, 1)}`}
      hint="ورودی را زیاد کنید تا خروجی به ریل ±۱۳V برسد و کلیپ شود — بهره محصول، محدود به تغذیه است."
      protocol={[
        { label: "ساخت تقویت‌کننده وارونه", done: true },
        { label: "تأیید A=−Rf/Rin", done: S.ev >= 1 || S.Rf !== 100 },
        { label: "پیکربندی ناوارونه", done: S.cfg === "noninv" },
        { label: "مشاهده اشباع ریل", done: clipped },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <div className="flex gap-2">
          <button onClick={() => { S.cfg = "inv"; pushFeed("info", `وارونه — A = −Rf/Rin = ${fmt(-S.Rf / S.Rin, 1)}؛ سیگنال ۱۸۰° وارونه می‌شود.`); force(); }} className="flex-1 px-3 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer"
            style={S.cfg === "inv" ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c20f" } : { borderColor: "#175059", color: "#8fbcb8" }}>وارونه</button>
          <button onClick={() => { S.cfg = "noninv"; pushFeed("info", `ناوارونه — A = 1+Rf/Rin = ${fmt(1 + S.Rf / S.Rin, 1)}.`); force(); }} className="flex-1 px-3 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer"
            style={S.cfg === "noninv" ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c20f" } : { borderColor: "#175059", color: "#8fbcb8" }}>ناوارونه</button>
        </div>
        <Slider label="مقاومت بازخورد Rf" value={S.Rf} min={10} max={300} step={10} digits={0} unit="kΩ" accent="#f2a83b" onChange={(v) => { S.Rf = v; force(); }} />
        <Slider label="مقاومت ورودی Rin" value={S.Rin} min={5} max={100} step={5} digits={0} unit="kΩ" accent="#35d3c2" onChange={(v) => { S.Rin = v; force(); }} />
        <Slider label="دامنه ورودی" value={S.vinA} min={0.2} max={4} step={0.1} digits={1} unit="V" accent="#56b8ff" onChange={(v) => { S.vinA = v; if (Math.abs(gain) * v > vSat) pushFeed("warn", "خروجی از ریل تغذیه گذشت — قله‌ها کلیپ شدند."); force(); }} />
      </div>}
      chart={<LiveChart series={[sr("بهره بر حسب Rf", "#35d3c2", Array.from({ length: 30 }, (_, i) => { const rf = 10 + i * 10; return { x: rf, y: Number((S.cfg === "inv" ? rf / S.Rin : 1 + rf / S.Rin).toFixed(1)) }; })), sr("وضعیت فعلی", "#f2a83b", [{ x: S.Rf, y: Math.abs(gain) }, { x: S.Rf, y: Math.abs(gain) }])]} xLabel="Rf (kΩ)" yLabel="|بهره|" height={230} yMin={0} />}
      table={{ headers: ["Rf (kΩ)", "Rin (kΩ)", "A وارونه", "A ناوارونه"], rows: [20, 50, 100, 200].map((rf) => [rf, S.Rin, Number((-rf / S.Rin).toFixed(1)), Number((1 + rf / S.Rin).toFixed(1))]) }}
      stats={[
        { label: "بهره حلقه‌بسته", value: fmt(gain, 1), color: "#f2a83b", sub: S.cfg === "inv" ? "−Rf/Rin" : "1+Rf/Rin" },
        { label: "Vout قله", value: `${fmt(Math.min(vSat, Math.abs(gain) * S.vinA), 1)} V`, color: "#35d3c2" },
        { label: "وضعیت", value: clipped ? "اشباع" : "خطی", color: clipped ? "#ff6f61" : "#a5d95c" },
        { label: "ریل تغذیه", value: "±13 V", color: "#e9f6f3" },
        { label: "وارونگی فاز", value: S.cfg === "inv" ? "۱۸۰°" : "۰°", color: "#56b8ff" },
        { label: "پیکربندی", value: S.cfg === "inv" ? "وارونه" : "ناوارونه", color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`${S.cfg === "inv" ? "Inverting: A=-Rf/Rin" : "Non-inverting: A=1+Rf/Rin"} = ${fmt(gain, 1)}`, `Rails \\pm13V; clipping when |A|Vin > 13V`]} />
  );
}

/* ===================== MOSFET ===================== */
export function MosfetLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ vgs: 3, vds: 5, k: 2, vth: 2, ev: 0, feed: [{ time: "#0", level: "info", msg: "NMOS — زیر Vth قطع؛ در اشباع Id=k(Vgs−Vth)². به‌عنوان کلید دیجیتال: Vgs پایین=خاموش، بالا=روشن." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const on = S.vgs > S.vth;
  const idsat = on ? S.k * (S.vgs - S.vth) ** 2 : 0;
  const region = !on ? "قطع" : S.vds < S.vgs - S.vth ? "اهمی (تریود)" : "اشباع";
  const id = !on ? 0 : S.vds < S.vgs - S.vth ? S.k * (2 * (S.vgs - S.vth) * S.vds - S.vds ** 2) : idsat;

  useRaf((dt) => {
    if (running) frame.current += Math.min(dt, 50) / 16;
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(200, 140); ctx.lineTo(200, 420); ctx.moveTo(200, 280); ctx.lineTo(320, 280); ctx.moveTo(320, 200); ctx.lineTo(320, 360); ctx.stroke();
    ctx.strokeStyle = on ? "#a5d95c" : "#3a5a5e"; ctx.lineWidth = on ? 5 : 3;
    ctx.beginPath(); ctx.moveTo(350, 140); ctx.lineTo(350, 420); ctx.stroke();
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(350, 200); ctx.lineTo(430, 200); ctx.moveTo(350, 360); ctx.lineTo(430, 360); ctx.moveTo(430, 200); ctx.lineTo(430, 120); ctx.lineTo(620, 120); ctx.moveTo(430, 360); ctx.lineTo(430, 460); ctx.lineTo(620, 460); ctx.stroke();
    if (on) {
      ctx.fillStyle = "#a5d95c";
      for (let i = 0; i < 5; i++) {
        const py = (frame.current * 2 + i * 56) % 280 + 140;
        ctx.beginPath(); ctx.arc(430, py, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = "#8fbcb8"; ctx.font = `12px ${FA}`;
    ctx.fillText("G", 300, 270); ctx.fillText("D", 440, 190); ctx.fillText("S", 440, 380);
    ctx.fillStyle = on ? "#a5d95c" : "#8fbcb8";
    ctx.fillText(on ? "کانال تشکیل شد — جریان می‌گذرد" : "زیر آستانه — کانالی نیست", 480, 290);
    hud(ctx, 600, 160, 310, 200, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`Vgs = ${fmt(S.vgs, 1)} V  (Vth=${fmt(S.vth, 1)})`, 620, 190);
    ctx.fillStyle = "#56b8ff"; ctx.fillText(`Vds = ${fmt(S.vds, 1)} V`, 620, 216);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`Id = ${fmt(id, 1)} mA`, 620, 242);
    ctx.fillStyle = region === "اشباع" ? "#a5d95c" : region === "قطع" ? "#ff6f61" : "#56b8ff";
    ctx.fillText(`ناحیه: ${region}`, 620, 268);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText(`کلید دیجیتال: خروجی = ${on ? "0 (وصل به زمین)" : "1 (Vdd)"}`, 620, 300);
    ctx.fillText(`اشباع: Id = k(Vgs−Vth)² = ${fmt(idsat, 1)} mA`, 620, 330);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const famCurve = (vg: number) => Array.from({ length: 61 }, (_, i) => {
    const vd = i * 0.1;
    const vov = vg - S.vth;
    const y = vov <= 0 ? 0 : vd < vov ? S.k * (2 * vov * vd - vd * vd) : S.k * vov * vov;
    return { x: Number(vd.toFixed(1)), y: Number(y.toFixed(1)) };
  });
  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.vgs = 3; S.vds = 5; pushFeed("info", "به نقطه کار اولیه بازگشت."); }}
      simClock={`Id = ${fmt(id, 1)} mA — ${region}`}
      hint="Vgs را از زیر Vth عبور دهید تا کانال باز شود؛ منحنی‌های خانوادگی Id–Vds برای چند Vgs رسم شده‌اند."
      protocol={[
        { label: "عبور از آستانه Vth", done: S.vgs > S.vth },
        { label: "مشاهده ناحیه اهمی", done: S.vds < S.vgs - S.vth && on },
        { label: "مشاهده ناحیه اشباع", done: region === "اشباع" },
        { label: "رفتار کلیدی (قطع/وصل)", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="ولتاژ گیت-سورس Vgs" value={S.vgs} min={0} max={6} step={0.1} digits={1} unit="V" accent="#35d3c2" onChange={(v) => { S.vgs = v; if (Math.abs(v - S.vth) < 0.15) pushFeed("info", "نزدیک آستانه — کانال در حال تشکیل/محو است."); force(); }} />
        <Slider label="ولتاژ درین-سورس Vds" value={S.vds} min={0} max={6} step={0.1} digits={1} unit="V" accent="#56b8ff" onChange={(v) => { S.vds = v; force(); }} />
        <Slider label="پارامتر k" value={S.k} min={0.5} max={5} step={0.5} digits={1} unit="mA/V²" accent="#f2a83b" onChange={(v) => { S.k = v; force(); }} />
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          Vth = {fmt(S.vth, 1)} V · مرز اهمی/اشباع: Vds = Vgs − Vth
        </div>
      </div>}
      chart={<LiveChart series={[sr("Vgs=3V", "#8fbcb8", famCurve(3)), sr("Vgs=4V", "#35d3c2", famCurve(4)), sr("Vgs=5V", "#f2a83b", famCurve(5)), sr("وضعیت", "#ff6f61", [{ x: S.vds, y: id }, { x: S.vds, y: id }])]} xLabel="Vds (V)" yLabel="Id (mA)" height={230} yMin={0} />}
      table={{ headers: ["Vgs (V)", "Id اشباع (mA)", "وضعیت"], rows: [1, 2, 3, 4, 5].map((vg) => [vg, Number((vg > S.vth ? S.k * (vg - S.vth) ** 2 : 0).toFixed(1)), vg > S.vth ? "روشن" : "قطع"]) }}
      stats={[
        { label: "ناحیه کار", value: region, color: region === "اشباع" ? "#a5d95c" : region === "قطع" ? "#ff6f61" : "#56b8ff" },
        { label: "جریان درین", value: `${fmt(id, 1)} mA`, color: "#f2a83b" },
        { label: "Vgs−Vth", value: `${fmt(S.vgs - S.vth, 1)} V`, color: "#35d3c2", sub: "ولتاژ بیش‌رانش" },
        { label: "مرز اشباع", value: `${fmt(Math.max(0, S.vgs - S.vth), 1)} V`, color: "#e9f6f3" },
        { label: "Id اشباع", value: `${fmt(idsat, 1)} mA`, color: "#e9f6f3" },
        { label: "حالت کلیدی", value: on ? "وصل (ON)" : "قطع (OFF)", color: on ? "#a5d95c" : "#ff6f61" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`NMOS: Vth=${fmt(S.vth, 1)}V, k=${fmt(S.k, 1)}mA/V^2`, `Saturation: Id=k(Vgs-Vth)^2=${fmt(idsat, 2)}mA; region=${region}`]} />
  );
}
