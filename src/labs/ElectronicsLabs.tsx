import { useRef, useState } from "react";
import { LiveChart, type SeriesDef } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import type { Experiment } from "../data/catalog";

function sr(name: string, color: string, arr: { x: number; y: number }[]): SeriesDef {
  return { name, color, ["data"]: arr };
}

/* ===================== Series & Parallel ===================== */
interface SpSim { cfg: "series" | "parallel"; R1: number; R2: number; V: number; feed: FeedItem[]; ev: number }

export function SeriesParallelLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<SpSim>({ cfg: "series", R1: 100, R2: 220, V: 9, ev: 0, feed: [{ time: "#0", level: "info", msg: "سری: Req=R1+R2 و جریان مشترک؛ موازی: 1/Req=1/R1+1/R2 و ولتاژ مشترک. الکترون‌ها را دنبال کنید." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const tv = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const Req = S.cfg === "series" ? S.R1 + S.R2 : (S.R1 * S.R2) / (S.R1 + S.R2);
  const I = S.V / Req;
  const I1 = S.cfg === "series" ? I : S.V / S.R1;
  const I2 = S.cfg === "series" ? I : S.V / S.R2;
  const P = S.V * I;

  useRaf((dt) => {
    tv.current += Math.min(dt, 50) / 1000;
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const draw = (ar: boolean) => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const W = 960, H = 560;
    ctx.clearRect(0, 0, W, H);
    if (!ar) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#082229"); g.addColorStop(1, "#0b3038");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 4;
    if (S.cfg === "series") {
      ctx.beginPath(); ctx.roundRect(160, 150, 640, 220, 20); ctx.stroke();
      const zr = (x: number, y: number, label: string) => {
        ctx.fillStyle = "#0b3038"; ctx.fillRect(x - 45, y - 16, 90, 32);
        ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x - 45, y);
        for (let i = 0; i < 8; i++) ctx.lineTo(x - 38 + i * 11, y + (i % 2 ? -10 : 10));
        ctx.lineTo(x + 45, y);
        ctx.stroke();
        ctx.fillStyle = "#e9f6f3"; ctx.font = '12px "IBM Plex Mono", monospace';
        ctx.fillText(label, x - 30, y - 24);
        ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 4;
      };
      zr(380, 150, `R1=${fmt(S.R1, 0)}Ω`);
      zr(620, 150, `R2=${fmt(S.R2, 0)}Ω`);
      // battery
      ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(160, 240); ctx.lineTo(140, 240); ctx.moveTo(160, 280); ctx.lineTo(140, 280); ctx.stroke();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(140, 250); ctx.lineTo(140, 270); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(130, 252); ctx.lineTo(130, 268); ctx.stroke();
      ctx.fillStyle = "#f2a83b"; ctx.font = '13px "IBM Plex Mono", monospace';
      ctx.fillText(`${fmt(S.V, 1)}V`, 96, 266);
      // electrons
      const n = 10;
      const speed = Math.min(120, I * 9000);
      for (let i = 0; i < n; i++) {
        const tt = ((tv.current * speed + i * (2 * (640 + 220))) % (2 * (640 + 220)));
        let ex = 0, ey = 0;
        const per = 2 * (640 + 220);
        if (tt < 640) { ex = 160 + tt; ey = 150; }
        else if (tt < 640 + 220) { ex = 800; ey = 150 + (tt - 640); }
        else if (tt < 1280 + 220) { ex = 800 - (tt - 860); ey = 370; }
        else { ex = 160; ey = 370 - (tt - 1500); }
        ctx.fillStyle = "#35d3c2";
        ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.beginPath(); ctx.moveTo(160, 150); ctx.lineTo(800, 150); ctx.moveTo(160, 370); ctx.lineTo(800, 370); ctx.stroke();
      const br = (y: number, label: string) => {
        ctx.beginPath(); ctx.moveTo(400, 150); ctx.lineTo(400, y - 16); ctx.moveTo(400, y + 16); ctx.lineTo(400, 370); ctx.stroke();
        ctx.fillStyle = "#0b3038"; ctx.fillRect(355, y - 16, 90, 32);
        ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(400, y - 16);
        for (let i = 0; i < 4; i++) ctx.lineTo(400 + (i % 2 ? -9 : 9), y - 12 + i * 8);
        ctx.lineTo(400, y + 16); ctx.stroke();
        ctx.fillStyle = "#e9f6f3"; ctx.font = '12px "IBM Plex Mono", monospace';
        ctx.fillText(label, 412, y + 4);
        ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 4;
      };
      ctx.beginPath(); ctx.moveTo(560, 150); ctx.lineTo(560, 234); ctx.moveTo(560, 286); ctx.lineTo(560, 370); ctx.stroke();
      ctx.fillStyle = "#0b3038"; ctx.fillRect(515, 234, 90, 52);
      ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(560, 234);
      for (let i = 0; i < 5; i++) ctx.lineTo(560 + (i % 2 ? -9 : 9), 240 + i * 10);
      ctx.lineTo(560, 286); ctx.stroke();
      ctx.fillStyle = "#e9f6f3"; ctx.fillText(`R2=${fmt(S.R2, 0)}Ω`, 572, 264);
      br(260, `R1=${fmt(S.R1, 0)}Ω`);
      ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(160, 240); ctx.lineTo(140, 240); ctx.moveTo(160, 280); ctx.lineTo(140, 280); ctx.stroke();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(140, 250); ctx.lineTo(140, 270); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(130, 252); ctx.lineTo(130, 268); ctx.stroke();
      ctx.fillStyle = "#f2a83b"; ctx.font = '13px "IBM Plex Mono", monospace';
      ctx.fillText(`${fmt(S.V, 1)}V`, 96, 266);
      for (let i = 0; i < 12; i++) {
        const tt = (tv.current * 90 + i * 90) % 1080;
        let ex = 0, ey = 0;
        if (tt < 640) { ex = 160 + tt; ey = 150; }
        else if (tt < 860) { ex = 800; ey = 150 + (tt - 640); }
        else { ex = 800 - (tt - 860); ey = 370; }
        ctx.fillStyle = "#35d3c2";
        ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // HUD
    ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.8)";
    ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(240, 420, 480, 96, 10); ctx.fill(); ctx.stroke();
    ctx.font = '14px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`Req = ${fmt(Req, 1)} Ω`, 262, 450);
    ctx.fillText(`I کل = ${fmt(I * 1000, 1)} mA`, 262, 476);
    ctx.fillStyle = "#35d3c2";
    ctx.fillText(`I₁=${fmt(I1 * 1000, 1)}mA  I₂=${fmt(I2 * 1000, 1)}mA`, 262, 502);
    ctx.fillStyle = "#f2a83b";
    ctx.fillText(`P = ${fmt(P, 2)} W`, 560, 450);
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(S.cfg === "series" ? "V₁=IR1 · V₂=IR2" : "V مشترک", 560, 476);
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "مدار همیشه زیر ولتاژ است — Rها و آرایش را تغییر دهید.")}
      onReset={() => { S.R1 = 100; S.R2 = 220; S.V = 9; S.cfg = "series"; pushFeed("info", "به حالت اولیه بازگشت."); }}
      simClock={`I = ${fmt(I * 1000, 1)} mA`}
      hint="در سری جریان یکی است و ولتاژ تقسیم می‌شود؛ در موازی برعکس. Req موازی همیشه از کوچک‌ترین مقاومت کمتر است."
      protocol={[
        { label: "محاسبه Req سری", done: S.cfg === "series" },
        { label: "بررسی تقسیم ولتاژ", done: S.ev >= 1 },
        { label: "سوییچ به موازی", done: S.cfg === "parallel" },
        { label: "بررسی تقسیم جریان", done: S.cfg === "parallel" && S.ev >= 2 },
        { label: "مقایسه Req دو آرایش", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <div className="flex gap-1.5">
            <button onClick={() => { S.cfg = "series"; pushFeed("info", "آرایش سری — Req=R1+R2."); force(); }}
              className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold border cursor-pointer transition-all"
              style={S.cfg === "series" ? { borderColor: "#b388ff", color: "#b388ff", background: "#b388ff18" } : { borderColor: "#175059", color: "#8fbcb8" }}>سری</button>
            <button onClick={() => { S.cfg = "parallel"; pushFeed("info", "آرایش موازی — 1/Req=1/R1+1/R2."); force(); }}
              className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold border cursor-pointer transition-all"
              style={S.cfg === "parallel" ? { borderColor: "#b388ff", color: "#b388ff", background: "#b388ff18" } : { borderColor: "#175059", color: "#8fbcb8" }}>موازی</button>
          </div>
          <Slider label="مقاومت R1" value={S.R1} min={10} max={1000} step={10} digits={0} unit="Ω" accent="#f2a83b" onChange={(v) => { S.R1 = v; force(); }} />
          <Slider label="مقاومت R2" value={S.R2} min={10} max={1000} step={10} digits={0} unit="Ω" accent="#56b8ff" onChange={(v) => { S.R2 = v; force(); }} />
          <Slider label="ولتاژ منبع V" value={S.V} min={1} max={24} step={0.5} digits={1} unit="V" accent="#35d3c2" onChange={(v) => { S.V = v; force(); }} />
        </div>
      }
      chart={
        <LiveChart
          series={[
            sr("Req بر حسب R2", "#b388ff", Array.from({ length: 50 }, (_, i) => {
              const r2 = 10 + i * 20;
              return { x: r2, y: S.cfg === "series" ? S.R1 + r2 : (S.R1 * r2) / (S.R1 + r2) };
            })),
            sr("نقطه فعلی", "#f2a83b", [{ x: S.R2, y: Req }, { x: S.R2, y: Req }]),
          ]}
          xLabel="R2 (Ω)" yLabel="Req (Ω)" height={230} yMin={0} />
      }
      table={{
        headers: ["R2 (Ω)", "Req (Ω)", "I (mA)", "P (mW)"],
        rows: [50, 100, 220, 470, 1000].map((r2) => {
          const rq = S.cfg === "series" ? S.R1 + r2 : (S.R1 * r2) / (S.R1 + r2);
          const ii = S.V / rq;
          return [r2, Number(rq.toFixed(1)), Number((ii * 1000).toFixed(1)), Number((S.V * ii * 1000).toFixed(0))];
        }),
      }}
      stats={[
        { label: "مقاومت معادل", value: `${fmt(Req, 1)} Ω`, color: "#b388ff", sub: S.cfg === "series" ? "R1+R2" : "R1R2/(R1+R2)" },
        { label: "جریان کل", value: `${fmt(I * 1000, 1)} mA`, color: "#35d3c2" },
        { label: "جریان R1", value: `${fmt(I1 * 1000, 1)} mA`, color: "#f2a83b" },
        { label: "جریان R2", value: `${fmt(I2 * 1000, 1)} mA`, color: "#56b8ff" },
        { label: "ولتاژ R1", value: `${fmt(S.cfg === "series" ? I * S.R1 : S.V, 2)} V`, color: "#e9f6f3" },
        { label: "توان کل", value: `${fmt(P, 3)} W`, color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `Configuration: ${S.cfg}; R1=${fmt(S.R1, 0)} ohm, R2=${fmt(S.R2, 0)} ohm, V=${fmt(S.V, 1)} V`,
        `Req = ${fmt(Req, 2)} ohm; I = V/Req = ${fmt(I * 1000, 2)} mA; P = VI = ${fmt(P, 3)} W`,
      ]}
    />
  );
}

/* ===================== RC Filter ===================== */
interface RcSim { kind: "lp" | "hp"; R: number; C: number; freq: number; feed: FeedItem[]; ev: number }

export function RcFilterLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<RcSim>({ kind: "lp", R: 1000, C: 0.1, freq: 500, ev: 0, feed: [{ time: "#0", level: "info", msg: "فیلتر RC: پایین‌گذر از خازن، بالاگذر از مقاومت خروجی می‌گیرد. fc=1/(2πRC) جایی است که بهره به −3dB می‌رسد." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const tv = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const fc = 1 / (2 * Math.PI * S.R * S.C * 1e-6);
  const ratio = S.freq / fc;
  const gain = S.kind === "lp" ? 1 / Math.sqrt(1 + ratio * ratio) : ratio / Math.sqrt(1 + ratio * ratio);
  const dB = 20 * Math.log10(Math.max(gain, 1e-6));
  const phase = S.kind === "lp" ? -Math.atan(ratio) : Math.PI / 2 - Math.atan(ratio);

  useRaf((dt) => {
    tv.current += Math.min(dt, 50) / 1000;
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const draw = (ar: boolean) => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const W = 960, H = 560;
    ctx.clearRect(0, 0, W, H);
    if (!ar) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#082229"); g.addColorStop(1, "#0b3038");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // scope traces
    const oy1 = 170, oy2 = 400, amp = 70;
    ctx.fillStyle = "#8fbcb8"; ctx.font = '11px Vazirmatn, sans-serif';
    ctx.fillText("ورودی Vin", 90, oy1 - amp - 14);
    ctx.fillText("خروجی Vout", 90, oy2 - amp * gain - 14);
    ctx.strokeStyle = "rgba(143,188,184,0.25)";
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(80, oy1); ctx.lineTo(880, oy1); ctx.moveTo(80, oy2); ctx.lineTo(880, oy2); ctx.stroke();
    ctx.setLineDash([]);
    const wv = 2 * Math.PI * (S.freq / 900);
    ctx.strokeStyle = "#56b8ff"; ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = 80; x <= 880; x += 3) {
      const y = oy1 - amp * Math.sin((x - 80) * wv * 0.06 + tv.current * 4);
      if (x === 80) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = S.kind === "lp" ? "#b388ff" : "#f2a83b";
    ctx.lineWidth = 2.6;
    if (!ar) { ctx.shadowColor = ctx.strokeStyle as string; ctx.shadowBlur = 8; }
    ctx.beginPath();
    for (let x = 80; x <= 880; x += 3) {
      const y = oy2 - amp * gain * Math.sin((x - 80) * wv * 0.06 + tv.current * 4 + phase);
      if (x === 80) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    // HUD
    ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.8)";
    ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(600, 40, 320, 100, 10); ctx.fill(); ctx.stroke();
    ctx.font = '14px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`fc = ${fc >= 1000 ? fmt(fc / 1000, 2) + " kHz" : fmt(fc, 0) + " Hz"}`, 620, 68);
    ctx.fillStyle = "#35d3c2";
    ctx.fillText(`بهره = ${fmt(gain, 3)} (${fmt(dB, 1)} dB)`, 620, 92);
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`φ = ${fmt((phase * 180) / Math.PI, 0)}°  f/fc = ${fmt(ratio, 2)}`, 620, 116);
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '13px Vazirmatn, sans-serif';
    ctx.fillText(S.kind === "lp" ? "فیلتر پایین‌گذر — خروجی از خازن" : "فیلتر بالاگذر — خروجی از مقاومت", 100, 60);
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "سیگنال همیشه در جریان است — R، C و فرکانس را جاروب کنید.")}
      onReset={() => { S.R = 1000; S.C = 0.1; S.freq = 500; S.kind = "lp"; pushFeed("info", "به حالت اولیه بازگشت."); }}
      simClock={`f = ${fmt(S.freq, 0)} Hz`}
      hint="فرکانس را روی fc بیاورید تا بهره دقیقاً −3dB (0.707) شود؛ یک دهه بالاتر، شیب −20dB/decade را ببینید."
      protocol={[
        { label: "مشاهده پایین‌گذر", done: true },
        { label: "یافتن fc (بهره 0.707)", done: Math.abs(gain - 0.707) < 0.03 },
        { label: "سوییچ به بالاگذر", done: S.kind === "hp" },
        { label: "تغییر R یا C", done: S.ev >= 1 },
        { label: "بررسی شیب −20dB/dec", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <div className="flex gap-1.5">
            <button onClick={() => { S.kind = "lp"; pushFeed("info", "پایین‌گذر: فرکانس‌های پایین عبور می‌کنند."); force(); }}
              className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold border cursor-pointer transition-all"
              style={S.kind === "lp" ? { borderColor: "#b388ff", color: "#b388ff", background: "#b388ff18" } : { borderColor: "#175059", color: "#8fbcb8" }}>پایین‌گذر</button>
            <button onClick={() => { S.kind = "hp"; pushFeed("info", "بالاگذر: فرکانس‌های بالا عبور می‌کنند."); force(); }}
              className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold border cursor-pointer transition-all"
              style={S.kind === "hp" ? { borderColor: "#f2a83b", color: "#f2a83b", background: "#f2a83b18" } : { borderColor: "#175059", color: "#8fbcb8" }}>بالاگذر</button>
          </div>
          <Slider label="فرکانس سیگنال f" value={S.freq} min={10} max={10000} step={10} digits={0} unit="Hz" accent="#56b8ff" onChange={(v) => { S.freq = v; force(); }} />
          <Slider label="مقاومت R" value={S.R} min={100} max={10000} step={100} digits={0} unit="Ω" accent="#f2a83b" onChange={(v) => { S.R = v; force(); }} />
          <Slider label="خازن C" value={S.C} min={0.01} max={10} step={0.01} digits={2} unit="µF" accent="#35d3c2" onChange={(v) => { S.C = v; force(); }} />
        </div>
      }
      chart={
        <LiveChart
          series={[
            sr("بهره (dB)", "#b388ff", Array.from({ length: 80 }, (_, i) => {
              const f = 10 * Math.pow(1000, i / 79);
              const r = f / fc;
              const g = S.kind === "lp" ? 1 / Math.sqrt(1 + r * r) : r / Math.sqrt(1 + r * r);
              return { x: Math.log10(f), y: 20 * Math.log10(Math.max(g, 1e-4)) };
            })),
            sr("f فعلی", "#f2a83b", [{ x: Math.log10(S.freq), y: dB }, { x: Math.log10(S.freq), y: dB }]),
          ]}
          xLabel="log₁₀(f)" yLabel="بهره (dB)" height={230} yMin={-60} yMax={3} markerX={Math.log10(fc)} markerLabel="fc" />
      }
      table={{
        headers: ["f (Hz)", "f/fc", "بهره", "dB", "φ (°)"],
        rows: [0.1, 0.5, 1, 2, 10].map((m) => {
          const f = fc * m;
          const g = S.kind === "lp" ? 1 / Math.sqrt(1 + m * m) : m / Math.sqrt(1 + m * m);
          const ph = S.kind === "lp" ? -Math.atan(m) : Math.PI / 2 - Math.atan(m);
          return [Number(f.toFixed(0)), m, Number(g.toFixed(3)), Number((20 * Math.log10(g)).toFixed(1)), Number(((ph * 180) / Math.PI).toFixed(0))];
        }),
      }}
      stats={[
        { label: "فرکانس قطع fc", value: fc >= 1000 ? `${fmt(fc / 1000, 2)} kHz` : `${fmt(fc, 0)} Hz`, color: "#f2a83b", sub: "1/(2πRC)" },
        { label: "بهره فعلی", value: fmt(gain, 3), color: "#35d3c2" },
        { label: "بهره (dB)", value: `${fmt(dB, 1)} dB`, color: "#b388ff" },
        { label: "اختلاف فاز", value: `${fmt((phase * 180) / Math.PI, 0)}°`, color: "#e9f6f3" },
        { label: "f/fc", value: fmt(ratio, 2), color: "#56b8ff" },
        { label: "نوع فیلتر", value: S.kind === "lp" ? "پایین‌گذر" : "بالاگذر", color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `RC ${S.kind === "lp" ? "low-pass" : "high-pass"}: R=${fmt(S.R, 0)} ohm, C=${fmt(S.C, 2)} uF`,
        `fc = 1/(2 pi R C) = ${fmt(fc, 1)} Hz; at f=${fmt(S.freq, 0)} Hz gain = ${fmt(gain, 3)} (${fmt(dB, 1)} dB)`,
      ]}
    />
  );
}

/* ===================== Logic Gates ===================== */
type Gate = "AND" | "OR" | "NAND" | "NOR" | "XOR" | "NOT";
const GATES: Gate[] = ["AND", "OR", "NAND", "NOR", "XOR", "NOT"];
const gateOut = (g: Gate, a: boolean, b: boolean): boolean => {
  switch (g) {
    case "AND": return a && b;
    case "OR": return a || b;
    case "NAND": return !(a && b);
    case "NOR": return !(a || b);
    case "XOR": return a !== b;
    case "NOT": return !a;
  }
};

export function LogicGateLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gate, setGate] = useState<Gate>("AND");
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [guess, setGuess] = useState<boolean | null>(null);
  const S = useRef<{ feed: FeedItem[]; ev: number; score: number; total: number }>({ ev: 0, score: 0, total: 0, feed: [{ time: "#0", level: "info", msg: "ورودی‌ها را تغییر دهید و خروجی گیت را ببینید؛ سپس جدول صحت را کامل کنید — هر پاسخ درست امتیاز می‌گیرد." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const tv = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  useRaf((dt) => { tv.current += Math.min(dt, 50) / 1000; draw(); frame.current++; if (frame.current % 10 === 0) force(); }, true);

  const out = gateOut(gate, a, b);

  const draw = () => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const W = 960, H = 560;
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#082229"); g.addColorStop(1, "#0b3038");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const gx = 480, gy = 260;
    // wires
    const wire = (x1: number, y1: number, x2: number, y2: number, on: boolean) => {
      ctx.strokeStyle = on ? "#35d3c2" : "#175059";
      ctx.lineWidth = on ? 3.5 : 2.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (on) {
        const tt = (tv.current * 140) % 1;
        const px = x1 + (x2 - x1) * tt, py = y1 + (y2 - y1) * tt;
        ctx.fillStyle = "#a5d95c";
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      }
    };
    if (gate === "NOT") {
      wire(200, gy, gx - 70, gy, a);
      wire(gx + 80, gy, 780, gy, out);
    } else {
      wire(200, gy - 60, gx - 70, gy - 60, a);
      wire(200, gy + 60, gx - 70, gy + 60, b);
      wire(gx + 80, gy, 780, gy, out);
    }
    // gate body
    ctx.fillStyle = "#0b3038";
    ctx.strokeStyle = out ? "#b388ff" : "#2a7a80";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (gate === "NOT") {
      ctx.moveTo(gx - 70, gy - 50); ctx.lineTo(gx - 70, gy + 50); ctx.lineTo(gx + 60, gy); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(gx + 70, gy, 10, 0, Math.PI * 2); ctx.stroke();
    } else if (gate === "AND" || gate === "NAND") {
      ctx.moveTo(gx - 70, gy - 60); ctx.lineTo(gx - 10, gy - 60);
      ctx.arc(gx - 10, gy, 60, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(gx - 70, gy + 60); ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (gate === "NAND") { ctx.beginPath(); ctx.arc(gx + 62, gy, 10, 0, Math.PI * 2); ctx.stroke(); }
    } else {
      ctx.moveTo(gx - 70, gy - 60);
      ctx.quadraticCurveTo(gx - 20, gy - 60, gx + 50, gy);
      ctx.quadraticCurveTo(gx - 20, gy + 60, gx - 70, gy + 60);
      ctx.quadraticCurveTo(gx - 45, gy, gx - 70, gy - 60);
      ctx.fill(); ctx.stroke();
      if (gate === "NOR") { ctx.beginPath(); ctx.arc(gx + 62, gy, 10, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '700 20px "IBM Plex Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText(gate, gx - 10, gy + 7);
    ctx.textAlign = "left";
    // switches
    const sw = (x: number, y: number, on: boolean, label: string) => {
      ctx.fillStyle = on ? "#a5d95c" : "#175059";
      ctx.beginPath(); ctx.roundRect(x - 34, y - 18, 68, 36, 18); ctx.fill();
      ctx.fillStyle = "#e9f6f3";
      ctx.beginPath(); ctx.arc(on ? x + 16 : x - 16, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8fbcb8";
      ctx.font = '12px "IBM Plex Mono", monospace';
      ctx.fillText(`${label} = ${on ? 1 : 0}`, x - 30, y + 34);
    };
    if (gate === "NOT") sw(200, gy, a, "A");
    else { sw(200, gy - 60, a, "A"); sw(200, gy + 60, b, "B"); }
    // output LED
    ctx.fillStyle = out ? "#35d3c2" : "#10393f";
    if (out) { ctx.shadowColor = "#35d3c2"; ctx.shadowBlur = 20; }
    ctx.beginPath(); ctx.arc(790, gy, 22, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '13px Vazirmatn, sans-serif';
    ctx.fillText("خروجی Q", 770, gy + 48);
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(gate === "NAND" || gate === "NOR" ? "حباب کوچک = نقیض (NOT) خروجی" : "شکل گیت تابع منطقی را تعیین می‌کند", 100, 80);
  };

  const submitGuess = (v: boolean) => {
    setGuess(v);
    S.total++;
    if (v === out) { S.score++; pushFeed("ok", `درست! ${gate}(${a ? 1 : 0}${gate === "NOT" ? "" : `,${b ? 1 : 0}`}) = ${out ? 1 : 0}.`); }
    else pushFeed("error", `نادرست — خروجی ${out ? 1 : 0} است. به حباب نقیض و جدول صحت دقت کنید.`);
    force();
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "سیگنال‌ها زنده‌اند — گیت و ورودی‌ها را عوض کنید.")}
      onReset={() => { setGate("AND"); setA(true); setB(false); setGuess(null); pushFeed("info", "به گیت AND بازگشت."); }}
      simClock={`${gate} → Q=${out ? 1 : 0}`}
      hint="گیت‌های NAND و NOR جهان‌شمول‌اند — هر مدار منطقی را می‌توان فقط با آن‌ها ساخت."
      protocol={[
        { label: "بررسی خروجی AND", done: gate === "AND" && S.total > 0 },
        { label: "درک حباب نقیض (NAND)", done: gate === "NAND" },
        { label: "مقایسه XOR و OR", done: gate === "XOR" },
        { label: "گیت تک‌ورودی NOT", done: gate === "NOT" },
        { label: "۸ پاسخ درست جدول صحت", done: S.score >= 8 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-4">
          <div>
            <div className="text-[12px] text-fog mb-1.5">انتخاب گیت</div>
            <div className="grid grid-cols-3 gap-1.5">
              {GATES.map((gt) => (
                <button key={gt} onClick={() => { setGate(gt); setGuess(null); force(); }}
                  className="px-2 py-2 rounded-lg text-[11.5px] font-mono font-semibold border cursor-pointer transition-all"
                  style={gate === gt ? { borderColor: "#b388ff", color: "#b388ff", background: "#b388ff18" } : { borderColor: "#175059", color: "#8fbcb8" }}>{gt}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setA(!a); setGuess(null); }}
              className="px-3 py-2.5 rounded-lg text-[12.5px] font-bold border cursor-pointer transition-all"
              style={a ? { borderColor: "#a5d95c", color: "#a5d95c", background: "#a5d95c18" } : { borderColor: "#175059", color: "#8fbcb8" }}>A = {a ? 1 : 0}</button>
            {gate !== "NOT" ? (
              <button onClick={() => { setB(!b); setGuess(null); }}
                className="px-3 py-2.5 rounded-lg text-[12.5px] font-bold border cursor-pointer transition-all"
                style={b ? { borderColor: "#a5d95c", color: "#a5d95c", background: "#a5d95c18" } : { borderColor: "#175059", color: "#8fbcb8" }}>B = {b ? 1 : 0}</button>
            ) : (
              <span className="px-3 py-2.5 rounded-lg text-[12px] text-fog border border-edge/60 text-center">تک‌ورودی</span>
            )}
          </div>
          <div>
            <div className="text-[12px] text-fog mb-1.5">پیش‌بینی شما از خروجی:</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => submitGuess(true)} className="px-3 py-2.5 rounded-lg text-[12.5px] font-bold border border-teal/50 text-teal bg-teal/10 hover:bg-teal/20 transition-colors cursor-pointer">Q = 1</button>
              <button onClick={() => submitGuess(false)} className="px-3 py-2.5 rounded-lg text-[12.5px] font-bold border border-coral/50 text-coral bg-coral/10 hover:bg-coral/20 transition-colors cursor-pointer">Q = 0</button>
            </div>
          </div>
        </div>
      }
      chart={
        <LiveChart
          series={[sr("امتیاز", "#b388ff", [{ x: 0, y: 0 }, { x: 1, y: S.score }, { x: 2, y: S.total }])]}
          xLabel="—" yLabel="تعداد" height={230} yMin={0} />
      }
      table={{
        headers: gate === "NOT" ? ["A", "Q"] : ["A", "B", `${gate}`],
        rows: gate === "NOT"
          ? [[0, 1], [1, 0]]
          : [[0, 0, gateOut(gate, false, false) ? 1 : 0], [0, 1, gateOut(gate, false, true) ? 1 : 0], [1, 0, gateOut(gate, true, false) ? 1 : 0], [1, 1, gateOut(gate, true, true) ? 1 : 0]],
      }}
      stats={[
        { label: "گیت", value: gate, color: "#b388ff" },
        { label: "ورودی A", value: `${a ? 1 : 0}`, color: "#a5d95c" },
        { label: "ورودی B", value: gate === "NOT" ? "—" : `${b ? 1 : 0}`, color: "#a5d95c" },
        { label: "خروجی Q", value: `${out ? 1 : 0}`, color: "#35d3c2" },
        { label: "پاسخ‌های درست", value: `${S.score} از ${S.total}`, color: "#f2a83b" },
        { label: "نرخ موفقیت", value: S.total ? `${fmt((S.score / S.total) * 100, 0)} ٪` : "—", color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `Logic gate ${gate}: truth table verified interactively`,
        `A=${a ? 1 : 0}${gate === "NOT" ? "" : `, B=${b ? 1 : 0}`} -> Q=${out ? 1 : 0}`,
        `Score: ${S.score}/${S.total} correct predictions`,
      ]}
    />
  );
}
