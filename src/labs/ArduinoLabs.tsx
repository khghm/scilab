import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { bg, FA, MONO, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== Arduino blink / GPIO + serial monitor ===================== */
const SOS = [1, 0, 1, 0, 1, 0, 3, 0, 3, 0, 3, 0, 1, 0, 1, 0, 1, 0, 0, 0]; // units: 1=dot,3=dash
interface BlSim { pattern: "blink" | "sos" | "breath"; onT: number; offT: number; unit: number; t: number; led: number; tx: number; serial: string[]; nOn: number; ev: number; feed: FeedItem[] }

export function BlinkLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<BlSim>({ pattern: "blink", onT: 300, offT: 300, unit: 120, t: 0, led: 0, tx: 0, serial: [], nOn: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "برد آردوینو Uno شبیه‌سازی‌شده — الگو را انتخاب کنید؛ LED داخلی (پین ۱۳) طبق کد چشمک می‌زند و مانیتور سریال رویدادها را چاپ می‌کند." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const println = (line: string) => {
    S.serial = [...S.serial, `${fmt(S.t / 1000, 2)}s  ${line}`].slice(-24);
    S.tx = 1;
  };

  useRaf((dt) => {
    const dm = Math.min(dt, 50);
    if (running) {
      S.t += dm;
      S.tx = Math.max(0, S.tx - dm / 120);
      let on = 0;
      if (S.pattern === "blink") {
        const per = S.onT + S.offT;
        const ph = S.t % per;
        on = ph < S.onT ? 1 : 0;
      } else if (S.pattern === "breath") {
        on = 0.5 - 0.5 * Math.cos((2 * Math.PI * S.t) / (S.onT * 6));
      } else {
        const u = S.unit;
        let acc = 0;
        for (const v of SOS) acc += v * u;
        let ph = S.t % acc;
        let cur = 0;
        for (const v of SOS) {
          const dur = v * u;
          if (ph < dur) { cur = v >= 1 ? 1 : 0; break; }
          ph -= dur;
        }
        on = cur;
      }
      const was = S.led;
      S.led = on;
      if (S.pattern !== "breath" && ((was === 0) !== (on === 0)) && on === 1) { S.nOn++; if (S.nOn % 4 === 1) println("LED ON  (digitalWrite 13, HIGH)"); }
      if (S.pattern !== "breath" && was === 1 && on === 0 && S.nOn % 4 === 1) println("LED OFF (digitalWrite 13, LOW)");
      if (S.pattern === "breath" && frame.current % 140 === 0) println(`PWM = ${Math.round(on * 255)} (analogWrite)`);
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    // Uno board
    ctx.fillStyle = "#0e4a52";
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(150, 120, 660, 330, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 22px ${FA}`;
    ctx.fillText("Arduino UNO — شبیه‌ساز", 190, 160);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${MONO}`;
    ctx.fillText("ATmega328P @ 16 MHz", 190, 182);
    // pin headers
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = "#07252b";
      ctx.fillRect(180 + i * 42, 200, 18, 18);
      ctx.strokeStyle = "#175059"; ctx.strokeRect(180 + i * 42, 200, 18, 18);
    }
    ctx.fillStyle = "#8fbcb8"; ctx.font = `9px ${MONO}`;
    for (let i = 0; i < 14; i++) ctx.fillText(String(i), 186 + i * 42, 232);
    // chip
    ctx.fillStyle = "#04191d";
    ctx.beginPath(); ctx.roundRect(330, 290, 180, 70, 6); ctx.fill();
    ctx.strokeStyle = "#1d5b63"; ctx.strokeRect(330, 290, 180, 70);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`;
    ctx.fillText("MEGA328P-PU", 372, 330);
    // LED L (pin13)
    const glow = S.led;
    ctx.beginPath(); ctx.arc(620, 300, 26, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(242,168,59,${0.15 + glow * 0.85})`;
    if (glow > 0.05 && mode === "normal") { ctx.shadowColor = "#f2a83b"; ctx.shadowBlur = 40 * glow; }
    ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 12px ${MONO}`; ctx.textAlign = "center";
    ctx.fillText("L", 620, 304); ctx.textAlign = "left";
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("LED داخلی — پین ۱۳", 575, 348);
    // TX LED
    ctx.beginPath(); ctx.arc(690, 300, 12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(165,217,92,${0.15 + S.tx * 0.85})`; ctx.fill();
    ctx.strokeStyle = "#a5d95c"; ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`;
    ctx.fillText("TX", 682, 330);
    // serial monitor
    ctx.fillStyle = "#04191d";
    ctx.strokeStyle = "rgba(42,122,128,0.9)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(150, 460, 660, 86, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`;
    ctx.fillText("Serial Monitor @ 9600 baud", 165, 476);
    ctx.fillStyle = "#a5d95c"; ctx.font = `11px ${MONO}`;
    S.serial.slice(-3).forEach((l, i) => ctx.fillText(l, 165, 494 + i * 16));
    frame.current++;
    if (frame.current % 9 === 0) force();
  }, true);

  const freq = S.pattern === "blink" ? 1000 / (S.onT + S.offT) : S.pattern === "sos" ? 1000 / (SOS.reduce((a, b) => a + b, 0) * S.unit) : 1000 / (S.onT * 6);
  const duty = S.pattern === "blink" ? (S.onT / (S.onT + S.offT)) * 100 : 50;
  const code = S.pattern === "blink"
    ? `void setup() {\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  Serial.println("LED ON");\n  delay(${S.onT});\n  digitalWrite(13, LOW);\n  Serial.println("LED OFF");\n  delay(${S.offT});\n}`
    : S.pattern === "sos"
      ? `// الگوی مورس S-O-S\nvoid loop() {\n  morse("...---...");\n  // dot = ${S.unit} ms\n}`
      : `void loop() {\n  for (int f=0; f<=255; f++) {\n    analogWrite(13, f);\n    delay(${Math.round(S.onT / 42)});\n  }\n}`;

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.t = 0; S.serial = []; S.nOn = 0; pushFeed("info", "برد ریست شد — sketch از نو اجرا می‌شود."); }}
      simClock={`LED = ${S.led > 0.5 ? "HIGH" : S.led > 0.02 ? `PWM ${Math.round(S.led * 255)}` : "LOW"}`}
      hint="الگوی SOS مورس را امتحان کنید — نقطه‌ها و خط‌ها با همان تایمینگ استاندارد ۱:۳ ارسال می‌شوند."
      protocol={[
        { label: "اجرای چشمک ساده و خواندن سریال", done: S.nOn >= 1 },
        { label: "تغییر زمان روشن/خاموش", done: S.ev >= 1 || S.onT !== 300 },
        { label: "الگوی تنفس (PWM)", done: S.pattern === "breath" },
        { label: "الگوی مورس SOS", done: S.pattern === "sos" },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-4">
        <div>
          <div className="text-[12px] text-fog mb-1.5">الگوی sketch</div>
          <div className="flex gap-1.5">
            {([["blink", "چشمک"], ["breath", "تنفس PWM"], ["sos", "مورس SOS"]] as [BlSim["pattern"], string][]).map(([id, fa]) => (
              <button key={id} onClick={() => { S.pattern = id; S.t = 0; S.serial = []; println(`// sketch: ${fa}`); force(); }}
                className="flex-1 px-2 py-2 rounded-lg text-[11.5px] border transition-all cursor-pointer"
                style={S.pattern === id ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c215" } : { borderColor: "#175059", color: "#8fbcb8" }}>
                {fa}
              </button>
            ))}
          </div>
        </div>
        {S.pattern !== "sos" && (
          <Slider label={S.pattern === "breath" ? "دوره تنفس" : "زمان روشن"} value={S.onT} min={80} max={1200} step={20} digits={0} unit="ms" accent="#f2a83b" onChange={(v) => { S.onT = v; force(); }} />
        )}
        {S.pattern === "blink" && (
          <Slider label="زمان خاموش" value={S.offT} min={80} max={1200} step={20} digits={0} unit="ms" accent="#56b8ff" onChange={(v) => { S.offT = v; force(); }} />
        )}
        {S.pattern === "sos" && (
          <Slider label="واحد مورس (dot)" value={S.unit} min={60} max={250} step={10} digits={0} unit="ms" accent="#35d3c2" onChange={(v) => { S.unit = v; force(); }} />
        )}
        <div>
          <div className="text-[11px] text-fog mb-1.5">پیش‌نمایش کد (زنده)</div>
          <pre dir="ltr" className="text-[10px] leading-5 font-mono text-teal bg-abyss/80 border border-edge/60 rounded-lg p-3 overflow-x-auto max-h-[150px] overflow-y-auto">{code}</pre>
        </div>
      </div>}
      chart={<LiveChart series={[sr("وضعیت LED", "#f2a83b", [{ x: 0, y: S.led }, { x: 1, y: S.led }])]} xLabel="—" yLabel="سطح" height={230} yMin={0} yMax={1.2} />}
      table={{ headers: ["رویداد سریال"], rows: S.serial.slice(-12).map((l) => [l]) }}
      stats={[
        { label: "وضعیت پین ۱۳", value: S.led > 0.5 ? "HIGH" : S.led > 0.02 ? `PWM ${Math.round(S.led * 255)}` : "LOW", color: "#f2a83b" },
        { label: "فرکانس چشمک", value: `${fmt(freq, 2)} Hz`, color: "#35d3c2" },
        { label: "دیوتی سیکل", value: `${fmt(duty, 0)} ٪`, color: "#e9f6f3" },
        { label: "تعداد روشن‌شدن", value: `${S.nOn}`, color: "#a5d95c" },
        { label: "زمان اجرا", value: `${fmt(S.t / 1000, 1)} s`, color: "#e9f6f3" },
        { label: "الگو", value: S.pattern === "blink" ? "چشمک" : S.pattern === "breath" ? "تنفس" : "مورس", color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Arduino GPIO: pattern=${S.pattern}, on=${S.onT}ms, off=${S.offT}ms`, `f=${fmt(freq, 3)} Hz, duty=${fmt(duty, 1)}\\%`]} />
  );
}

/* ===================== Arduino ADC + analog sensor (draggable pot) ===================== */
interface AdcSim { sensor: "pot" | "ldr" | "ntc"; frac: number; light: number; temp: number; vref: number; t: number; plot: { x: number; y: number }[]; drag: boolean; ev: number; feed: FeedItem[] }

export function AdcLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<AdcSim>({ sensor: "pot", frac: 0.5, light: 50, temp: 25, vref: 5, t: 0, plot: [], drag: false, ev: 0, feed: [{ time: "#0", level: "info", msg: "مبدل ۱۰ بیتی آردوینو — دستگیره پتانسیومتر را با ماوس بچرخانید (یا سنسور نور/دما را تغییر دهید) و مقدار ۰ تا ۱۰۲۳ را روی پلاتر سریال ببینید." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const val = Math.round(S.frac * 1023);
  const volt = (val / 1023) * S.vref;

  useRaf((dt) => {
    S.t += Math.min(dt, 50) / 1000;
    if (frame.current % 6 === 0) {
      const noisy = Math.max(0, Math.min(1023, val + Math.round((Math.random() - 0.5) * 6)));
      S.plot.push({ x: Number(S.t.toFixed(2)), y: noisy });
      if (S.plot.length > 260) S.plot.shift();
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    // potentiometer
    const cx = 250, cy = 280, R = 95;
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(cx, cy, R + 18, (135 * Math.PI) / 180, (405 * Math.PI) / 180); ctx.stroke();
    ctx.fillStyle = "#0e4a52";
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 3; ctx.stroke();
    const ang = (135 + S.frac * 270) * (Math.PI / 180);
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * (R - 16), cy + Math.sin(ang) * (R - 16)); ctx.stroke();
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 13px ${MONO}`; ctx.textAlign = "center";
    ctx.fillText(`${Math.round(S.frac * 100)}٪`, cx, cy + R + 48);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("دستگیره را بکشید", cx, cy - R - 34);
    ctx.textAlign = "left";
    // ADC box
    ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 2.5;
    ctx.strokeRect(480, 200, 200, 150);
    ctx.fillStyle = "rgba(179,136,255,0.07)"; ctx.fillRect(480, 200, 200, 150);
    ctx.fillStyle = "#b388ff"; ctx.font = `700 16px ${FA}`;
    ctx.fillText("ADC 10-bit", 528, 190);
    ctx.font = `700 40px ${MONO}`; ctx.textAlign = "center";
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(String(val), 580, 265);
    ctx.font = `12px ${MONO}`; ctx.fillStyle = "#35d3c2";
    ctx.fillText(`${fmt(volt, 2)} V`, 580, 292);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`;
    ctx.fillText(val.toString(2).padStart(10, "0"), 580, 318);
    ctx.textAlign = "left";
    // wire
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx + R + 18, cy); ctx.bezierCurveTo(420, cy - 40, 430, 275, 480, 275); ctx.stroke();
    ctx.strokeStyle = "#2a7a80";
    ctx.beginPath(); ctx.moveTo(680, 275); ctx.lineTo(790, 275); ctx.stroke();
    // serial plotter mini
    ctx.fillStyle = "#04191d";
    ctx.beginPath(); ctx.roundRect(760, 200, 150, 150, 8); ctx.fill();
    ctx.strokeStyle = "rgba(42,122,128,0.9)"; ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `9px ${MONO}`;
    ctx.fillText("Serial Plotter", 772, 216);
    if (S.plot.length > 1) {
      ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 1.8;
      ctx.beginPath();
      S.plot.slice(-90).forEach((p, i) => {
        const x = 768 + (i / 90) * 134, y = 340 - (p.y / 1023) * 110;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    // resolution note
    ctx.fillStyle = "#8fbcb8"; ctx.font = `12px ${FA}`;
    ctx.fillText(`رزولوشن هر پله LSB = ${fmt(S.vref / 1024 * 1000, 2)} mV`, 480, 400);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const ptr = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current; if (!cv) return { x: 0, y: 0 };
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 960, y: ((e.clientY - r.top) / r.height) * 560 };
  };

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={S.drag}
      onToggleRun={() => pushFeed("info", "دستگیره پتانسیومتر را روی صحنه با ماوس بچرخانید.")}
      onReset={() => { S.frac = 0.5; S.plot = []; S.t = 0; pushFeed("info", "مقدار به نیمه بازگشت."); }}
      simClock={`ADC = ${val} / 1023`}
      hint="Vref را روی ۱٫۱ ولت بگذارید — رزولوشن چند برابر دقیق‌تر می‌شود (LSB کوچک‌تر)؛ برای سنسورهای کم‌دامنه حیاتی است."
      protocol={[
        { label: "چرخاندن پتانسیومتر با ماوس", done: S.ev >= 1 || S.frac !== 0.5 },
        { label: "خواندن مقدار باینری ۱۰ بیتی", done: true },
        { label: "تغییر Vref و LSB", done: S.vref !== 5 },
        { label: "سنسور نور یا دما", done: S.sensor !== "pot" },
      ]}
      canvas={
        <canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => { const p = ptr(e); if (Math.hypot(p.x - 250, p.y - 280) < 130) { S.drag = true; (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); } }}
          onPointerMove={(e) => {
            if (!S.drag || S.sensor !== "pot") return;
            const p = ptr(e);
            let a = (Math.atan2(p.y - 280, p.x - 250) * 180) / Math.PI;
            if (a < 0) a += 360;
            let f = (a - 135) / 270;
            if (a > 315 && a < 360) f = 0;
            if (a > 45 && a < 135) f = 1;
            S.frac = Math.max(0, Math.min(1, f));
          }}
          onPointerUp={() => { if (S.drag) { S.drag = false; pushFeed("ok", `ADC = ${val} → ${fmt(volt, 2)} V`); force(); } }} />
      }
      controls={<div className="space-y-4">
        <div>
          <div className="text-[12px] text-fog mb-1.5">سنسور آنالوگ</div>
          <div className="flex gap-1.5">
            {([["pot", "پتانسیومتر"], ["ldr", "فتوسل LDR"], ["ntc", "ترمیستور NTC"]] as [AdcSim["sensor"], string][]).map(([id, fa]) => (
              <button key={id} onClick={() => { S.sensor = id; pushFeed("info", `سنسور ${fa} روی A0 وصل شد.`); force(); }}
                className="flex-1 px-2 py-2 rounded-lg text-[11px] border transition-all cursor-pointer"
                style={S.sensor === id ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c215" } : { borderColor: "#175059", color: "#8fbcb8" }}>
                {fa}
              </button>
            ))}
          </div>
        </div>
        {S.sensor === "pot" && (
          <Slider label="موقعیت دستگیره" value={S.frac * 100} min={0} max={100} step={1} digits={0} unit="٪" accent="#f2a83b" onChange={(v) => { S.frac = v / 100; force(); }} />
        )}
        {S.sensor === "ldr" && (
          <Slider label="شدت نور محیط" value={S.light} min={0} max={100} step={1} digits={0} unit="٪" accent="#f2a83b" onChange={(v) => { S.light = v; S.frac = v / 100; force(); }} />
        )}
        {S.sensor === "ntc" && (
          <Slider label="دمای محیط" value={S.temp} min={0} max={80} step={1} digits={0} unit="°C" accent="#ff6f61" onChange={(v) => { S.temp = v; S.frac = Math.max(0.02, 1 - v / 90); force(); }} />
        )}
        <div>
          <div className="text-[12px] text-fog mb-1.5">ولتاژ مرجع (AREF)</div>
          <div className="flex gap-1.5">
            {[5, 3.3, 1.1].map((v) => (
              <button key={v} onClick={() => { S.vref = v; pushFeed("info", `Vref = ${fmt(v, 1)} V — LSB = ${fmt((v / 1024) * 1000, 2)} mV شد.`); force(); }}
                className="flex-1 px-2 py-2 rounded-lg text-[11.5px] font-mono border transition-all cursor-pointer"
                style={S.vref === v ? { borderColor: "#b388ff", color: "#b388ff", background: "#b388ff15" } : { borderColor: "#175059", color: "#8fbcb8" }}>
                {fmt(v, 1)} V
              </button>
            ))}
          </div>
        </div>
      </div>}
      chart={<LiveChart series={[sr("خوانش ADC (0–1023)", "#35d3c2", S.plot)]} xLabel="t (s)" yLabel="ADC" height={230} yMin={0} yMax={1023} />}
      table={{ headers: ["t (s)", "ADC", "ولتاژ (V)"], rows: S.plot.filter((_, i) => i % 5 === 0).map((p) => [p.x, p.y, Number(((p.y / 1023) * S.vref).toFixed(3))]) }}
      stats={[
        { label: "مقدار ADC", value: `${val} / 1023`, color: "#35d3c2" },
        { label: "باینری", value: val.toString(2).padStart(10, "0"), color: "#b388ff" },
        { label: "ولتاژ ورودی", value: `${fmt(volt, 2)} V`, color: "#f2a83b" },
        { label: "ولتاژ مرجع", value: `${fmt(S.vref, 1)} V`, color: "#e9f6f3" },
        { label: "رزولوشن LSB", value: `${fmt((S.vref / 1024) * 1000, 2)} mV`, color: "#a5d95c" },
        { label: "کانال", value: "A0", color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`10-bit ADC: raw=${val}/1023, Vref=${fmt(S.vref, 1)}V => Vin=${fmt(volt, 3)}V`, `LSB = Vref/1024 = ${fmt((S.vref / 1024) * 1000, 3)} mV`]} />
  );
}

/* ===================== Arduino PWM → servo ===================== */
interface SvSim { pot: number; angle: number; t: number; hist: { x: number; y: number }[]; ev: number; feed: FeedItem[] }

export function PwmServoLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<SvSim>({ pot: 512, angle: 90, t: 0, hist: [], ev: 0, feed: [{ time: "#0", level: "info", msg: "زنجیره کنترل آردوینو: پتانسیومتر → ADC → map() → سروو. پالس PWM بین ۱۰۰۰ تا ۲۰۰۰ میکروثانیه، زاویه ۰ تا ۱۸۰ را می‌سازد." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const adc = Math.round(S.pot);
  const mapped = Math.round((adc / 1023) * 180);
  const pulse = 1000 + (mapped / 180) * 1000;
  const duty = (pulse / 20000) * 100;

  useRaf((dt) => {
    S.t += Math.min(dt, 50) / 1000;
    S.angle += (mapped - S.angle) * Math.min(1, dt / 90);
    if (frame.current % 7 === 0) {
      S.hist.push({ x: Number(S.t.toFixed(1)), y: Number(S.angle.toFixed(1)) });
      if (S.hist.length > 240) S.hist.shift();
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    // servo body
    const sx = 300, sy = 300;
    ctx.fillStyle = "#0e4a52";
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(sx - 110, sy - 60, 220, 130, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${MONO}`;
    ctx.fillText("SG90 Micro Servo", sx - 60, sy + 92);
    // horn
    const hr = (S.angle - 90) * (Math.PI / 180);
    ctx.save();
    ctx.translate(sx, sy - 10);
    ctx.rotate(hr);
    ctx.fillStyle = "#f2a83b";
    ctx.beginPath(); ctx.roundRect(-14, -95, 28, 110, 12); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(sx, sy - 10, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#04191d"; ctx.fill();
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 3; ctx.stroke();
    // scale arc
    ctx.strokeStyle = "rgba(143,188,184,0.3)";
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(sx, sy - 10, 120, -Math.PI, 0); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`;
    ctx.fillText("0°", sx - 150, sy + 4); ctx.fillText("180°", sx + 122, sy + 4); ctx.fillText("90°", sx - 10, sy - 140);
    // PWM waveform
    ctx.fillStyle = "#04191d";
    ctx.strokeStyle = "rgba(42,122,128,0.9)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(560, 150, 340, 150, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`;
    ctx.fillText("PWM — دوره ۲۰ ms", 575, 170);
    const wy = 250, wh = 60;
    ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 2.5;
    ctx.beginPath();
    const px = (u: number) => 580 + (u / 20000) * 300;
    for (let rep = 0; rep < 2; rep++) {
      const off = rep * 150;
      ctx.moveTo(580 + off, wy);
      ctx.lineTo(580 + off, wy - wh);
      ctx.lineTo(px(pulse) + off, wy - wh);
      ctx.lineTo(px(pulse) + off, wy);
      ctx.lineTo(580 + off + 150, wy);
    }
    ctx.stroke();
    ctx.fillStyle = "#f2a83b"; ctx.font = `11px ${MONO}`;
    ctx.fillText(`پالس = ${fmt(pulse, 0)} µs`, 580, 190);
    // pipeline
    ctx.fillStyle = "#e9f6f3"; ctx.font = `12px ${FA}`;
    ctx.fillText("زنجیره کنترل:", 575, 340);
    const steps: [string, string][] = [[`ADC = ${adc}`, "#35d3c2"], [`map(0,1023,0,180) = ${mapped}°`, "#f2a83b"], [`Servo.write(${mapped})`, "#b388ff"]];
    steps.forEach(([txt, col], i) => {
      ctx.fillStyle = col; ctx.font = `12px ${MONO}`;
      ctx.fillText(txt, 575, 368 + i * 26);
      if (i < 2) { ctx.strokeStyle = "#2a7a80"; ctx.beginPath(); ctx.moveTo(560, 372 + i * 26); ctx.lineTo(568, 378 + i * 26); ctx.lineTo(560, 384 + i * 26); ctx.stroke(); }
    });
    ctx.fillStyle = "#35d3c2"; ctx.font = `700 26px ${MONO}`;
    ctx.fillText(`${fmt(S.angle, 0)}°`, sx - 22, sy + 150);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "سروو با همان فرمان Servo.write می‌چرخد — پهنای پالس زاویه را تعیین می‌کند.")}
      onReset={() => { S.pot = 512; S.hist = []; S.t = 0; pushFeed("info", "سروو به ۹۰ درجه برگشت."); }}
      simClock={`زاویه = ${fmt(S.angle, 0)}°`}
      hint="پتانسیومتر را از ۰ تا ۱۰۲۳ جاروب کنید — رزولوشن واقعی حدود ۰٫۱۸ درجه در هر پله ADC است."
      protocol={[
        { label: "چرخش سروو با پتانسیومتر", done: S.ev >= 1 || S.pot !== 512 },
        { label: "خواندن پهنای پالس µs", done: true },
        { label: "رسیدن به ۰ و ۱۸۰ درجه", done: S.pot < 60 || S.pot > 960 },
        { label: "مشاهده پله‌های map()", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="پتانسیومتر (ADC)" value={S.pot} min={0} max={1023} step={1} digits={0} accent="#f2a83b" onChange={(v) => { S.pot = v; force(); }} />
        <div>
          <div className="text-[12px] text-fog mb-1.5">زاویه سریع</div>
          <div className="flex gap-1.5">
            {[0, 45, 90, 135, 180].map((a) => (
              <button key={a} onClick={() => { S.pot = Math.round((a / 180) * 1023); pushFeed("ok", `Servo.write(${a}) — پالس ${fmt(1000 + a / 180 * 1000, 0)} µs`); force(); }}
                className="flex-1 px-2 py-2 rounded-lg text-[11.5px] font-mono border border-edge/70 text-fog hover:text-bright hover:border-edge2 transition-colors cursor-pointer">
                {a}°
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          <span className="num text-teal">pulse = 1000 + (angle/180)×1000 µs</span>
          <br />دوره ثابت ۲۰ ms — فقط پهنای پالس مهم است.
        </div>
      </div>}
      chart={<LiveChart series={[sr("زاویه سروو (درجه)", "#f2a83b", S.hist)]} xLabel="t (s)" yLabel="زاویه (°)" height={230} yMin={-5} yMax={185} />}
      table={{ headers: ["ADC", "زاویه (°)", "پالس (µs)", "دیوتی ٪"], rows: [0, 256, 512, 768, 1023].map((p) => [p, Math.round((p / 1023) * 180), Math.round(1000 + (p / 1023) * 1000), Number((((1000 + (p / 1023) * 1000) / 20000) * 100).toFixed(2))]) }}
      stats={[
        { label: "زاویه فرمان", value: `${mapped}°`, color: "#f2a83b" },
        { label: "زاویه واقعی سروو", value: `${fmt(S.angle, 1)}°`, color: "#35d3c2" },
        { label: "پهنای پالس", value: `${fmt(pulse, 0)} µs`, color: "#b388ff" },
        { label: "دیوتی سیکل", value: `${fmt(duty, 2)} ٪`, color: "#e9f6f3" },
        { label: "مقدار ADC", value: `${adc}`, color: "#e9f6f3" },
        { label: "رزولوشن زاویه", value: "≈ 0.18°/پله", color: "#a5d95c" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Servo chain: ADC=${adc} -> angle=${mapped} deg -> pulse=${fmt(pulse, 0)} us`, `PWM period 20 ms, duty=${fmt(duty, 2)}\\%`]} />
  );
}
