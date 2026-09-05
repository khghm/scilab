import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { bg, hud, FA, MONO, rr, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== Wheatstone ===================== */
export function WheatstoneLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ R1: 100, R2: 150, R3: 120, Rx: 180, strain: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "پل وتستون — وقتی R1/R2 = R3/Rx ولتاژ وسط صفر می‌شود (تعادل). با تنظیم R3 مقاومت مجهول را بیابید." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const Rx = S.Rx * (1 + S.strain * 2e-3);
  const Va = 5 * (S.R2 / (S.R1 + S.R2));
  const Vb = 5 * (Rx / (S.R3 + Rx));
  const Vg = Vb - Va;
  const balanced = Math.abs(Vg) < 0.01;
  const RxMeasured = (S.R3 * S.R2) / S.R1;

  useRaf(() => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const cx = 430, cy = 280, arm = 130;
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - arm * 1.4); ctx.lineTo(cx + arm * 1.4, cy); ctx.lineTo(cx, cy + arm * 1.4); ctx.lineTo(cx - arm * 1.4, cy); ctx.closePath();
    ctx.stroke();
    const res = (x: number, y: number, label: string, col: string) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(cy - y, cx - x) + Math.PI / 2);
      ctx.fillStyle = "#0b3038"; ctx.strokeStyle = col; ctx.lineWidth = 2.5;
      rr(ctx, -30, -14, 60, 28, 5); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = col; ctx.font = `11px ${MONO}`;
      ctx.fillText(label, x + 26, y + 4);
    };
    res(cx - arm * 0.7, cy - arm * 0.7, `R1=${fmt(S.R1, 0)}`, "#56b8ff");
    res(cx + arm * 0.7, cy - arm * 0.7, `R2=${fmt(S.R2, 0)}`, "#56b8ff");
    res(cx - arm * 0.7, cy + arm * 0.7, `R3=${fmt(S.R3, 0)}`, "#f2a83b");
    res(cx + arm * 0.7, cy + arm * 0.7, `Rx=${fmt(Rx, 0)}`, S.strain !== 0 ? "#a5d95c" : "#f2a83b");
    ctx.strokeStyle = balanced ? "#a5d95c" : "#ff6f61"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - arm * 1.4, cy); ctx.lineTo(cx + arm * 1.4, cy); ctx.stroke();
    ctx.fillStyle = balanced ? "#a5d95c" : "#ff6f61";
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 14px ${MONO}`; ctx.textAlign = "center";
    ctx.fillText(`Vg = ${fmt(Vg * 1000, 1)} mV`, cx, cy + arm * 1.4 + 34);
    ctx.textAlign = "left";
    ctx.fillStyle = "#35d3c2"; ctx.fillRect(cx - 15, cy - arm * 1.4 - 40, 30, 40);
    ctx.fillStyle = "#04191d"; ctx.font = `700 10px ${MONO}`; ctx.fillText("5V", cx - 8, cy - arm * 1.4 - 16);
    hud(ctx, 660, 140, 260, 200, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`Va = ${fmt(Va, 3)} V`, 680, 170);
    ctx.fillStyle = "#56b8ff"; ctx.fillText(`Vb = ${fmt(Vb, 3)} V`, 680, 196);
    ctx.fillStyle = balanced ? "#a5d95c" : "#ff6f61";
    ctx.fillText(balanced ? "تعادل — Vg ≈ 0" : "نامتعادل", 680, 222);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`Rx (از تعادل) = R3·R2/R1`, 680, 252);
    ctx.fillText(`= ${fmt(RxMeasured, 1)} Ω`, 680, 274);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText(S.strain !== 0 ? `کرنش ${fmt(S.strain, 0)} με → ΔR = ${fmt(Rx - S.Rx, 2)} Ω` : "Rx را به کرنش‌سنج تبدیل کنید", 680, 306);
    frame.current++;
    if (frame.current % 9 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "با تنظیم R3 پل را متعادل کنید تا Vg صفر شود.")}
      onReset={() => { S.R1 = 100; S.R2 = 150; S.R3 = 120; S.Rx = 180; S.strain = 0; pushFeed("info", "پل به حالت اولیه بازگشت."); }}
      simClock={`Vg = ${fmt(Vg * 1000, 1)} mV`}
      hint="R3 را تنظیم کنید تا Vg≈0 — آنگاه Rx = R3·R2/R1. سپس کرنش اعمال کنید و خروجی میلی‌ولتی حسگر را ببینید."
      protocol={[
        { label: "متعادل‌کردن پل (Vg≈0)", done: balanced },
        { label: "محاسبه Rx مجهول", done: balanced },
        { label: "اعمال کرنش", done: S.strain !== 0 },
        { label: "خواندن ΔV ناشی از کرنش", done: S.strain !== 0 && S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="R1" value={S.R1} min={50} max={300} step={5} digits={0} unit="Ω" accent="#56b8ff" onChange={(v) => { S.R1 = v; force(); }} />
        <Slider label="R2" value={S.R2} min={50} max={300} step={5} digits={0} unit="Ω" accent="#56b8ff" onChange={(v) => { S.R2 = v; force(); }} />
        <Slider label="R3 (قابل تنظیم)" value={S.R3} min={50} max={300} step={1} digits={0} unit="Ω" accent="#f2a83b" onChange={(v) => { S.R3 = v; if (Math.abs(5 * (Rx / (v + Rx)) - Va) < 0.01) pushFeed("ok", `تعادل برقرار شد — Rx = ${fmt(RxMeasured, 1)} Ω.`); force(); }} />
        <Slider label="Rx (مجهول)" value={S.Rx} min={50} max={300} step={5} digits={0} unit="Ω" accent="#a5d95c" onChange={(v) => { S.Rx = v; S.strain = 0; force(); }} />
        <Slider label="کرنش ε" value={S.strain} min={-500} max={500} step={10} digits={0} unit="µε" accent="#35d3c2" onChange={(v) => { S.strain = v; force(); }} />
      </div>}
      chart={<LiveChart series={[sr("Vg بر حسب R3", "#f2a83b", Array.from({ length: 51 }, (_, i) => { const r3 = 50 + i * 5; return { x: r3, y: Number((5 * Rx / (r3 + Rx) - Va).toFixed(3)) }; })), sr("وضعیت فعلی", "#35d3c2", [{ x: S.R3, y: Number(Vg.toFixed(3)) }, { x: S.R3, y: Number(Vg.toFixed(3)) }])]} xLabel="R3 (Ω)" yLabel="Vg (V)" height={230} />}
      table={{ headers: ["R3 (Ω)", "Vg (mV)", "وضعیت"], rows: [100, 130, 150, 170, 180, 200].map((r3) => [r3, Number(((5 * Rx / (r3 + Rx)) - Va).toFixed(3)), Math.abs((5 * Rx / (r3 + Rx)) - Va) < 0.01 ? "تعادل" : "نامتعادل"]) }}
      stats={[
        { label: "ولتاژ پل Vg", value: `${fmt(Vg * 1000, 1)} mV`, color: balanced ? "#a5d95c" : "#ff6f61" },
        { label: "وضعیت", value: balanced ? "متعادل" : "نامتعادل", color: balanced ? "#a5d95c" : "#f2a83b" },
        { label: "Rx از رابطه تعادل", value: `${fmt(RxMeasured, 1)} Ω`, color: "#35d3c2", sub: "R3·R2/R1" },
        { label: "Rx واقعی", value: `${fmt(Rx, 1)} Ω`, color: "#e9f6f3" },
        { label: "کرنش", value: `${fmt(S.strain, 0)} µε`, color: "#a5d95c" },
        { label: "حساسیت GF", value: "2.0", color: "#8fbcb8", sub: "ΔR/R = GF·ε" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Balance: R1/R2 = R3/Rx => Rx = R3 R2/R1 = ${fmt(RxMeasured, 1)}\\Omega`, `Vg=${fmt(Vg, 4)}V; strain ${fmt(S.strain, 0)}\\mu\\varepsilon => \\Delta R=${fmt(Rx - S.Rx, 2)}\\Omega`]} />
  );
}

/* ===================== PWM motor ===================== */
export function PwmLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ duty: 50, freq: 50, load: 20, rpm: 0, tv: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "کنترل سرعت موتور DC با PWM — ولتاژ میانگین = Duty×V. ماسفت با فرکانس بالا کلید می‌زند و اینرسی موتور آن را صاف می‌کند." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const Vdc = 12;
  const vAvg = (S.duty / 100) * Vdc;
  const rpmTarget = Math.max(0, (vAvg * 320 - S.load * 60) / (1 + S.load / 80));

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (running) {
      S.tv += ds;
      S.rpm += (rpmTarget - S.rpm) * Math.min(1, ds * 1.8);
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const gx = 90, gy = 120, gw = 380, gh = 150;
    ctx.strokeStyle = "rgba(23,80,89,0.9)"; rr(ctx, gx, gy, gw, gh, 10); ctx.stroke();
    const T = 1 / (S.freq / 40);
    const high = (S.duty / 100) * gh * 0.8;
    ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x < gw - 20; x++) {
      const t = (x / (gw - 20)) * T * 4 + S.tv;
      const on = (t % T) / T < S.duty / 100;
      const y = gy + gh - 15 - (on ? high : 0);
      if (x === 0) ctx.moveTo(gx + 10 + x, y); else ctx.lineTo(gx + 10 + x, y);
    }
    ctx.stroke();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = "#f2a83b";
    ctx.beginPath(); ctx.moveTo(gx + 10, gy + gh - 15 - (S.duty / 100) * high); ctx.lineTo(gx + gw - 10, gy + gh - 15 - (S.duty / 100) * high); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText(`PWM — میانگین (کهربایی) = ${fmt(vAvg, 1)} V`, gx + 20, gy + 24);
    const mx = 700, my = 200, ang = running ? S.tv * (S.rpm / 60) * Math.PI * 2 : 0;
    ctx.fillStyle = "#0f3d46"; ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(mx, my, 85, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 6;
    for (let i = 0; i < 3; i++) {
      const a = ang + (i * Math.PI * 2) / 3;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a) * 70, my + Math.sin(a) * 70); ctx.stroke();
    }
    ctx.fillStyle = "#f2a83b";
    ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 22px ${MONO}`; ctx.textAlign = "center";
    ctx.fillText(`${fmt(S.rpm, 0)}`, mx, my + 130);
    ctx.font = `11px ${FA}`; ctx.fillStyle = "#8fbcb8";
    ctx.fillText("RPM", mx, my + 150);
    ctx.textAlign = "left";
    ctx.fillStyle = S.duty > 0 ? "#a5d95c" : "#8fbcb8";
    ctx.fillRect(mx - 120, my + 60, 8, -Math.min(60, S.rpm / 60));
    hud(ctx, 90, 330, 480, 130, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`Duty = ${fmt(S.duty, 0)}٪ → V میانگین = ${fmt(vAvg, 1)} V`, 110, 360);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`f = ${fmt(S.freq, 0)} Hz   بار = ${fmt(S.load, 0)}٪`, 110, 386);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`تلفات کلیدزنی کم — بازده ≈ ${(95 - S.freq / 25).toFixed(0)}٪`, 110, 412);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`RPM هدف ≈ ${fmt(rpmTarget, 0)}`, 110, 438);
    frame.current++;
    if (frame.current % 7 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.duty = 50; S.freq = 50; S.load = 20; pushFeed("info", "به دیوتی ۵۰٪ بازگشت."); }}
      simClock={`${fmt(S.rpm, 0)} RPM — Duty ${fmt(S.duty, 0)}٪`}
      hint="دیوتی را تغییر دهید — سرعت تقریباً خطی دنبال می‌کند. بار را زیاد کنید تا سرعت زیر بار افت کند."
      protocol={[
        { label: "اجرای موتور با PWM", done: S.rpm > 10 },
        { label: "تغییر دیوتی و پاسخ سرعت", done: S.ev >= 1 || S.duty !== 50 },
        { label: "اثر بار مکانیکی", done: S.load > 40 },
        { label: "رابطه خطی Vمیانگین–RPM", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="دیوتی سیکل" value={S.duty} min={0} max={100} step={1} digits={0} unit="٪" accent="#b388ff" onChange={(v) => { S.duty = v; pushFeed("info", `V میانگین = ${fmt((v / 100) * Vdc, 1)} V — سرعت هدف تغییر کرد.`); }} />
        <Slider label="فرکانس PWM" value={S.freq} min={20} max={400} step={10} digits={0} unit="Hz" accent="#35d3c2" onChange={(v) => { S.freq = v; force(); }} />
        <Slider label="بار مکانیکی" value={S.load} min={0} max={100} step={5} digits={0} unit="٪" accent="#ff6f61" onChange={(v) => { S.load = v; if (v > 60) pushFeed("warn", "بار سنگین — سرعت زیر بار افت می‌کند."); force(); }} />
      </div>}
      chart={<LiveChart series={[sr("RPM بر حسب دیوتی", "#b388ff", Array.from({ length: 21 }, (_, i) => { const d = i * 5; const va = (d / 100) * Vdc; return { x: d, y: Number((Math.max(0, va * 320 - S.load * 60) / (1 + S.load / 80)).toFixed(0)) }; })), sr("وضعیت فعلی", "#f2a83b", [{ x: S.duty, y: rpmTarget }, { x: S.duty, y: rpmTarget }])]} xLabel="Duty (٪)" yLabel="RPM" height={230} yMin={0} />}
      table={{ headers: ["Duty ٪", "V میانگین", "RPM (بدون بار)"], rows: [0, 25, 50, 75, 100].map((d) => [d, Number(((d / 100) * Vdc).toFixed(1)), Number(((d / 100) * Vdc * 320).toFixed(0))]) }}
      stats={[
        { label: "سرعت موتور", value: `${fmt(S.rpm, 0)} RPM`, color: "#b388ff" },
        { label: "ولتاژ میانگین", value: `${fmt(vAvg, 1)} V`, color: "#f2a83b", sub: "Duty×12V" },
        { label: "دیوتی", value: `${fmt(S.duty, 0)} ٪`, color: "#e9f6f3" },
        { label: "فرکانس کلیدزنی", value: `${fmt(S.freq, 0)} Hz`, color: "#35d3c2" },
        { label: "بار", value: `${fmt(S.load, 0)} ٪`, color: "#ff6f61" },
        { label: "افت سرعت زیر بار", value: `${fmt(Math.max(0, (S.duty / 100) * Vdc * 320 - rpmTarget), 0)} RPM`, color: S.load > 40 ? "#ff6f61" : "#a5d95c" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Vavg = D \\times 12V = ${fmt(vAvg, 2)}V`, `PWM switching at ${S.freq}Hz; load ${S.load}\\% => RPM\\approx${fmt(rpmTarget, 0)}`]} />
  );
}
