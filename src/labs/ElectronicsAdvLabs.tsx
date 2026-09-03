import { useRef, useState } from "react";
import { LiveChart, type SeriesDef } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import type { Experiment } from "../data/catalog";

function sr(name: string, color: string, arr: { x: number; y: number }[]): SeriesDef {
  return { name, color, ["data"]: arr };
}

/* ===================== 555 Astable ===================== */
interface T555Sim { R1: number; R2: number; C: number; feed: FeedItem[]; ev: number }

export function Timer555Lab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<T555Sim>({ R1: 10, R2: 47, C: 10, ev: 0, feed: [{ time: "#0", level: "info", msg: "تایمر ۵۵۵ در حالت آستابل: خازن بین ⅓Vcc و ⅔Vcc شارژ (از راه R1+R2) و دشارژ (از راه R2) می‌شود. f=1.44/((R1+2R2)C)." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const tv = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const freqHz = 1.44 / (((S.R1 + 2 * S.R2) * 1000) * (S.C * 1e-6)); // kHz if R in k, C in uF -> actually 1.44/((R1+2R2)*C) with R in kΩ, C in µF gives kHz
  const tHigh = 0.693 * (S.R1 + S.R2) * S.C; // µs-ish scale (kΩ·µF = ms)
  const tLow = 0.693 * S.R2 * S.C;
  const duty = ((S.R1 + S.R2) / (S.R1 + 2 * S.R2)) * 100;
  const T = tHigh + tLow;

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
    // IC body
    const ix = 430, iy = 120, iw = 180, ih = 280;
    ctx.fillStyle = "#1a1a24";
    ctx.strokeStyle = "#b388ff";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(ix, iy, iw, ih, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '700 26px "IBM Plex Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("555", ix + iw / 2, iy + 90);
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText("ASTABLE", ix + iw / 2, iy + 112);
    ctx.textAlign = "left";
    // pins
    const pins = ["GND", "TRIG", "OUT", "RESET", "Vcc", "DIS", "THR", "CV"];
    pins.forEach((p, i) => {
      const y = iy + 30 + i * 32;
      ctx.strokeStyle = "#2a7a80";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ix - 24, y); ctx.lineTo(ix, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ix + iw, y); ctx.lineTo(ix + iw + 24, y); ctx.stroke();
      ctx.fillStyle = "#8fbcb8";
      ctx.font = '9px "IBM Plex Mono", monospace';
      ctx.fillText(p, ix + 8, y + 3);
      ctx.fillText(`${i + 1}`, ix - 18, y - 6);
    });
    // capacitor charging visualization
    const phase = (tv.current * Math.min(freqHz, 6)) % 1;
    const charging = phase < tHigh / T;
    const vc = charging
      ? 1 / 3 + (2 / 3 - 1 / 3) * (phase / (tHigh / T))
      : 2 / 3 - (2 / 3 - 1 / 3) * ((phase - tHigh / T) / (tLow / T));
    ctx.fillStyle = "#04191d";
    ctx.strokeStyle = "#2a7a80";
    ctx.beginPath(); ctx.roundRect(120, 150, 130, 190, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = charging ? "rgba(179,136,255,0.5)" : "rgba(255,111,97,0.5)";
    const chH = 150 * vc;
    ctx.fillRect(132, 328 - chH, 106, chH);
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillText(`Vc = ${fmt(vc * 9, 2)} V`, 132, 140);
    ctx.fillStyle = "#8fbcb8";
    ctx.font = '10px Vazirmatn, sans-serif';
    ctx.fillText(charging ? "شارژ از R1+R2" : "دشارژ از R2", 132, 360);
    // threshold lines
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(53,211,194,0.6)";
    ctx.beginPath(); ctx.moveTo(132, 328 - 150 * (1 / 3)); ctx.lineTo(238, 328 - 150 * (1 / 3)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(132, 328 - 150 * (2 / 3)); ctx.lineTo(238, 328 - 150 * (2 / 3)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#35d3c2";
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.fillText("⅓Vcc", 244, 328 - 150 * (1 / 3) + 3);
    ctx.fillText("⅔Vcc", 244, 328 - 150 * (2 / 3) + 3);
    // output LED blink
    const high = charging;
    ctx.fillStyle = high ? "#a5d95c" : "#10393f";
    if (high) { ctx.shadowColor = "#a5d95c"; ctx.shadowBlur = 22; }
    ctx.beginPath(); ctx.arc(760, 180, 24, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#8fbcb8";
    ctx.font = '11px Vazirmatn, sans-serif';
    ctx.fillText("خروجی OUT", 736, 226);
    // oscilloscope
    const oy = 420, amp = 60;
    ctx.strokeStyle = "rgba(143,188,184,0.3)";
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(120, oy); ctx.lineTo(880, oy); ctx.moveTo(120, oy - amp); ctx.lineTo(880, oy - amp); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 2.5;
    if (!ar) { ctx.shadowColor = "#b388ff"; ctx.shadowBlur = 8; }
    ctx.beginPath();
    const cyc = 220;
    for (let x = 120; x <= 880; x += 2) {
      const ph = (((x - 120) / cyc) + tv.current * Math.min(freqHz, 6) * 0.3) % 1;
      const y = ph < tHigh / T ? oy - amp : oy;
      if (x === 120) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '11px Vazirmatn, sans-serif';
    ctx.fillText("اسیلوسکوپ — موج مربعی خروجی", 120, oy + 30);
    // HUD
    ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.8)";
    ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(640, 280, 280, 100, 10); ctx.fill(); ctx.stroke();
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`f = ${freqHz >= 1 ? fmt(freqHz, 2) + " kHz" : fmt(freqHz * 1000, 0) + " Hz"}`, 660, 308);
    ctx.fillStyle = "#35d3c2";
    ctx.fillText(`Duty = ${fmt(duty, 1)}٪`, 660, 332);
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`tH=${fmt(tHigh, 1)}  tL=${fmt(tLow, 1)} (kΩ·µF)`, 660, 356);
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "نوسان‌ساز همیشه در حال نوسان است — R1، R2 و C را تغییر دهید.")}
      onReset={() => { S.R1 = 10; S.R2 = 47; S.C = 10; pushFeed("info", "به مقادیر کلاسیک بازگشت."); }}
      simClock={`f = ${freqHz >= 1 ? fmt(freqHz, 2) + " kHz" : fmt(freqHz * 1000, 0) + " Hz"}`}
      hint="دیوتی همیشه بالای ۵۰٪ است چون شارژ از R1+R2 و دشارژ فقط از R2 انجام می‌شود — برای دیوتی پایین‌تر، دیود موازی R2 لازم است."
      protocol={[
        { label: "مشاهده نوسان خروجی", done: true },
        { label: "خواندن f و دیوتی", done: S.ev >= 1 },
        { label: "تغییر C و اثر معکوس بر f", done: S.ev >= 2 },
        { label: "تغییر R2 و دیوتی", done: S.ev >= 3 },
        { label: "تأیید f=1.44/((R1+2R2)C)", done: S.ev >= 3 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <Slider label="مقاومت R1" value={S.R1} min={1} max={100} step={1} digits={0} unit="kΩ" accent="#f2a83b" onChange={(v) => { S.R1 = v; force(); }} />
          <Slider label="مقاومت R2" value={S.R2} min={1} max={200} step={1} digits={0} unit="kΩ" accent="#56b8ff" onChange={(v) => { S.R2 = v; force(); }} />
          <Slider label="خازن C" value={S.C} min={1} max={100} step={1} digits={0} unit="µF" accent="#35d3c2" onChange={(v) => { S.C = v; force(); }} />
          <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
            <span className="num text-violet">f = 1.44 / ((R1+2R2)·C)</span>
            <br />tHigh = 0.693(R1+R2)C · tLow = 0.693·R2·C
          </div>
        </div>
      }
      chart={
        <LiveChart
          series={[
            sr("f بر حسب C", "#b388ff", Array.from({ length: 50 }, (_, i) => {
              const c = 1 + i * 2;
              return { x: c, y: 1.44 / (((S.R1 + 2 * S.R2) * 1000) * (c * 1e-6)) };
            })),
            sr("نقطه فعلی", "#f2a83b", [{ x: S.C, y: freqHz }, { x: S.C, y: freqHz }]),
          ]}
          xLabel="C (µF)" yLabel="f (kHz)" height={230} yMin={0} />
      }
      table={{
        headers: ["C (µF)", "f (kHz)", "tH", "tL", "Duty ٪"],
        rows: [1, 10, 22, 47, 100].map((c) => {
          const f = 1.44 / (((S.R1 + 2 * S.R2) * 1000) * (c * 1e-6));
          return [c, Number(f.toFixed(2)), Number((0.693 * (S.R1 + S.R2) * c).toFixed(1)), Number((0.693 * S.R2 * c).toFixed(1)), Number(duty.toFixed(1))];
        }),
      }}
      stats={[
        { label: "فرکانس نوسان", value: freqHz >= 1 ? `${fmt(freqHz, 2)} kHz` : `${fmt(freqHz * 1000, 0)} Hz`, color: "#b388ff" },
        { label: "دیوتی سیکل", value: `${fmt(duty, 1)} ٪`, color: "#f2a83b" },
        { label: "زمان بالا tH", value: fmt(tHigh, 2), color: "#35d3c2" },
        { label: "زمان پایین tL", value: fmt(tLow, 2), color: "#35d3c2" },
        { label: "ولتاژ خازن", value: "⅓–⅔ Vcc", color: "#e9f6f3", sub: "پنجره تریگر" },
        { label: "پیکربندی", value: "آستابل", color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `555 astable: R1=${fmt(S.R1, 0)} k, R2=${fmt(S.R2, 0)} k, C=${fmt(S.C, 0)} uF`,
        `f = 1.44/((R1+2R2)C) = ${fmt(freqHz, 3)} kHz; duty = ${fmt(duty, 1)} pct`,
        `tHigh = 0.693(R1+R2)C = ${fmt(tHigh, 2)}; tLow = 0.693 R2 C = ${fmt(tLow, 2)}`,
      ]}
    />
  );
}

/* ===================== BJT ===================== */
interface BjtSim { Ib: number; beta: number; Rc: number; Vcc: number; feed: FeedItem[]; ev: number }

export function BjtLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<BjtSim>({ Ib: 20, beta: 150, Rc: 1, Vcc: 9, ev: 0, feed: [{ time: "#0", level: "info", msg: "ترانزیستور NPN در آرایش مشترک‌امیتر: Ic=βIb تا وقتی که به اشباع نرسد (Vce≈0.2V). نقطه کار Q را روی خط بار ببینید." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const IcSat = (S.Vcc - 0.2) / (S.Rc * 1000); // A
  const IcAct = S.beta * S.Ib * 1e-6; // A
  const sat = IcAct >= IcSat;
  const Ic = Math.min(IcAct, IcSat);
  const Vce = sat ? 0.2 : S.Vcc - Ic * S.Rc * 1000;
  const region = S.Ib <= 0.5 ? "قطع" : sat ? "اشباع" : "فعال";

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
    // load line graph
    const gx = 520, gy = 90, gw = 380, gh = 300;
    ctx.strokeStyle = "rgba(143,188,184,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText("Ic (mA)", gx + 6, gy + 14);
    ctx.fillText("Vce (V)", gx + gw - 50, gy + gh + 20);
    // load line: from (0, Vcc/Rc) to (Vcc, 0)
    const IcMaxMa = (S.Vcc / (S.Rc * 1000)) * 1000;
    const X = (v: number) => gx + (v / S.Vcc) * gw;
    const Y = (iMa: number) => gy + gh - (iMa / IcMaxMa) * gh;
    ctx.strokeStyle = "#56b8ff";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(0), Y(IcMaxMa)); ctx.lineTo(X(S.Vcc), Y(0)); ctx.stroke();
    // family curves
    ctx.strokeStyle = "rgba(143,188,184,0.22)";
    for (let ib = 10; ib <= 60; ib += 10) {
      ctx.beginPath();
      for (let v = 0.2; v <= S.Vcc; v += 0.2) {
        const ic = Math.min((S.beta * ib * 1e-6) * 1000, (S.Vcc - v) / (S.Rc * 1000) * 1000);
        if (v === 0.2) ctx.moveTo(X(v), Y(ic)); else ctx.lineTo(X(v), Y(ic));
      }
      ctx.stroke();
    }
    // Q point
    ctx.fillStyle = "#f2a83b";
    ctx.beginPath(); ctx.arc(X(Vce), Y(Ic * 1000), 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillText(`Q(${fmt(Vce, 1)}V, ${fmt(Ic * 1000, 1)}mA)`, X(Vce) + 12, Y(Ic * 1000) - 8);
    // transistor symbol
    const tx = 240, ty = 280;
    ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(tx, ty, 60, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 20, ty - 30); ctx.lineTo(tx - 20, ty + 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 45, ty); ctx.lineTo(tx - 20, ty); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 20, ty - 14); ctx.lineTo(tx + 20, ty - 40); ctx.lineTo(tx + 20, ty - 70); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 20, ty + 14); ctx.lineTo(tx + 20, ty + 40); ctx.lineTo(tx + 20, ty + 70); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx + 20, ty + 40); ctx.lineTo(tx + 8, ty + 30); ctx.lineTo(tx + 14, ty + 22); ctx.closePath();
    ctx.fillStyle = "#b388ff"; ctx.fill();
    ctx.fillStyle = "#8fbcb8";
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText("C", tx + 26, ty - 62);
    ctx.fillText("B", tx - 58, ty + 4);
    ctx.fillText("E", tx + 26, ty + 82);
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '13px Vazirmatn, sans-serif';
    ctx.fillText("NPN", tx - 12, ty - 78);
    // current arrows
    if (Ic > 1e-5) {
      ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx + 44, ty - 70); ctx.lineTo(tx + 44, ty + 70); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx + 44, ty + 70); ctx.lineTo(tx + 38, ty + 58); ctx.moveTo(tx + 44, ty + 70); ctx.lineTo(tx + 50, ty + 58); ctx.stroke();
    }
    // HUD
    ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.8)";
    ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(120, 420, 720, 96, 10); ctx.fill(); ctx.stroke();
    ctx.font = '14px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`Ib = ${fmt(S.Ib, 1)} µA   β = ${fmt(S.beta, 0)}`, 140, 450);
    ctx.fillText(`Ic = ${fmt(Ic * 1000, 2)} mA   Vce = ${fmt(Vce, 2)} V`, 140, 476);
    ctx.fillStyle = region === "فعال" ? "#a5d95c" : region === "اشباع" ? "#ff6f61" : "#8fbcb8";
    ctx.font = '700 16px Vazirmatn, sans-serif';
    ctx.fillText(`ناحیه: ${region}`, 560, 450);
    ctx.fillStyle = "#8fbcb8";
    ctx.font = '11px Vazirmatn, sans-serif';
    ctx.fillText(sat ? "Vce به 0.2V چسبیده — ترانزیستور مثل کلید بسته" : "Ic=βIb — تقویت‌کننده خطی", 560, 476);
  };

  useRaf(() => {
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 10 === 0) force();
  }, true);

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "مدار بایاس شده است — Ib را جاروب کنید تا از قطع به اشباع بروید.")}
      onReset={() => { S.Ib = 20; S.beta = 150; S.Rc = 1; S.Vcc = 9; pushFeed("info", "به نقطه کار میانی بازگشت."); }}
      simClock={`ناحیه: ${region}`}
      hint="Ib را تا جایی بالا ببرید که Vce به ۰٫۲ ولت برسد — آنجا اشباع است و Ic دیگر از βIb پیروی نمی‌کند."
      protocol={[
        { label: "مشاهده ناحیه فعال", done: region === "فعال" },
        { label: "تأیید Ic=βIb", done: S.ev >= 1 },
        { label: "رسیدن به اشباع", done: sat },
        { label: "برگشت به قطع (Ib≈0)", done: S.Ib <= 0.5 },
        { label: "تغییر Rc و جابه‌جایی Q", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <Slider label="جریان بیس Ib" value={S.Ib} min={0} max={80} step={1} digits={0} unit="µA" accent="#f2a83b" onChange={(v) => { S.Ib = v; force(); }} />
          <Slider label="بتا β (hFE)" value={S.beta} min={50} max={300} step={10} digits={0} accent="#35d3c2" onChange={(v) => { S.beta = v; force(); }} />
          <Slider label="مقاومت کلکتور Rc" value={S.Rc} min={0.2} max={5} step={0.1} digits={1} unit="kΩ" accent="#56b8ff" onChange={(v) => { S.Rc = v; force(); }} />
          <Slider label="ولتاژ تغذیه Vcc" value={S.Vcc} min={5} max={15} step={0.5} digits={1} unit="V" accent="#b388ff" onChange={(v) => { S.Vcc = v; force(); }} />
        </div>
      }
      chart={
        <LiveChart
          series={[
            sr("Ic بر حسب Ib", "#35d3c2", Array.from({ length: 80 }, (_, i) => {
              const ib = i;
              const icA = Math.min(S.beta * ib * 1e-6, IcSat);
              return { x: ib, y: icA * 1000 };
            })),
            sr("نقطه فعلی", "#f2a83b", [{ x: S.Ib, y: Ic * 1000 }, { x: S.Ib, y: Ic * 1000 }]),
          ]}
          xLabel="Ib (µA)" yLabel="Ic (mA)" height={230} yMin={0} />
      }
      table={{
        headers: ["Ib (µA)", "Ic (mA)", "Vce (V)", "ناحیه"],
        rows: [0, 10, 20, 40, 60, 80].map((ib) => {
          const ic = Math.min(S.beta * ib * 1e-6, IcSat);
          const vce = ic >= IcSat - 1e-9 ? 0.2 : S.Vcc - ic * S.Rc * 1000;
          return [ib, Number((ic * 1000).toFixed(2)), Number(vce.toFixed(2)), ib <= 0.5 ? "قطع" : ic >= IcSat - 1e-9 ? "اشباع" : "فعال"];
        }),
      }}
      stats={[
        { label: "جریان کلکتور", value: `${fmt(Ic * 1000, 2)} mA`, color: "#35d3c2" },
        { label: "Vce", value: `${fmt(Vce, 2)} V`, color: "#e9f6f3" },
        { label: "ناحیه کار", value: region, color: region === "فعال" ? "#a5d95c" : region === "اشباع" ? "#ff6f61" : "#8fbcb8" },
        { label: "Ic اشباع", value: `${fmt(IcSat * 1000, 1)} mA`, color: "#f2a83b", sub: "(Vcc−0.2)/Rc" },
        { label: "توان ترانزیستور", value: `${fmt(Vce * Ic * 1000, 1)} mW`, color: "#e9f6f3" },
        { label: "β", value: `${fmt(S.beta, 0)}`, color: "#b388ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `NPN common-emitter: beta=${fmt(S.beta, 0)}, Rc=${fmt(S.Rc, 1)} k, Vcc=${fmt(S.Vcc, 1)} V`,
        `Ib=${fmt(S.Ib, 0)} uA -> Ic=${fmt(Ic * 1e3, 2)} mA, Vce=${fmt(Vce, 2)} V (${region})`,
        `Ic(sat) = (Vcc-0.2)/Rc = ${fmt(IcSat * 1e3, 1)} mA`,
      ]}
    />
  );
}
