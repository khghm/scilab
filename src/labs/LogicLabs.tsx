import { useEffect, useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { bg, hud, FA, MONO, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/** دکمه بیت تعاملی */
function Bit({ on, onClick, color = "#35d3c2", label, small = false }: { on: boolean; onClick?: () => void; color?: string; label?: string; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg font-mono font-bold border transition-all active:scale-90 ${small ? "w-8 h-8 text-[11px]" : "w-10 h-10 text-[13px]"} ${onClick ? "cursor-pointer hover:brightness-125" : "cursor-default"}`}
      style={on
        ? { background: `${color}22`, borderColor: color, color, boxShadow: `0 0 14px ${color}55` }
        : { background: "#07252b", borderColor: "#175059", color: "#8fbcb8" }}>
      {label ?? (on ? "1" : "0")}
    </button>
  );
}

/* ===================== SR/D فلیپ‌فلاپ و شیفت‌رجیستر ===================== */
interface FfSim { s: number; r: number; q: number; d: number; dq: number; serial: number; reg: number[]; hist: { x: number; y: number }[]; clk: number; ev: number; feed: FeedItem[] }

export function FlipFlopLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<FfSim>({ s: 0, r: 0, q: 0, d: 0, dq: 0, serial: 1, reg: [0, 0, 0, 0], hist: [], clk: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "فلیپ‌فلاپ — حافظه یک‌بیتی. روی S و R کلیک کنید؛ سپس با فلیپ‌فلاپ D و شیفت‌رجیستر، بیت‌ها را با هر پالس کلاک جابه‌جا کنید." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const setSr = (v: "S" | "R") => {
    if (v === "S") { S.s = 1; S.r = 0; S.q = 1; pushFeed("ok", "S=1 — خروجی Q لچ شد روی ۱."); }
    else { S.s = 0; S.r = 1; S.q = 0; pushFeed("ok", "R=1 — خروجی Q لچ شد روی ۰."); }
    force();
  };
  const dClock = () => {
    S.dq = S.d;
    pushFeed("info", `لبه بالارونده کلاک — D=${S.d} به Q منتقل شد.`);
    force();
  };
  const shiftClock = () => {
    S.reg = [S.serial, S.reg[0], S.reg[1], S.reg[2]];
    S.clk++;
    const v = parseInt(S.reg.join(""), 2);
    S.hist.push({ x: S.clk, y: v });
    if (S.hist.length > 40) S.hist.shift();
    pushFeed("info", `کلاک #${S.clk} — بیت ${S.serial} وارد شد؛ رجیستر = ${S.reg.join("")}₂ = ${v}₁₀`);
    force();
  };

  const draw = () => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const lamp = (x: number, y: number, on: boolean, color: string, label: string) => {
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fillStyle = on ? color : "#0f3d46";
      if (on && mode === "normal") { ctx.shadowColor = color; ctx.shadowBlur = 18; }
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = on ? color : "#175059"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#e9f6f3"; ctx.font = `700 12px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(label, x, y + 34); ctx.textAlign = "left";
    };
    // SR latch box
    ctx.strokeStyle = "rgba(143,188,184,0.5)"; ctx.lineWidth = 2;
    ctx.strokeRect(130, 110, 200, 130);
    ctx.fillStyle = "#e9f6f3"; ctx.font = `13px ${FA}`;
    ctx.fillText("SR Latch", 190, 100);
    ctx.font = `12px ${MONO}`; ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`S=${S.s}  R=${S.r}`, 150, 145);
    lamp(200, 200, S.q === 1, "#35d3c2", "Q");
    lamp(270, 200, S.q === 0, "#ff6f61", "Q̄");
    // D-FF box
    ctx.strokeStyle = "rgba(143,188,184,0.5)";
    ctx.strokeRect(430, 110, 200, 130);
    ctx.fillStyle = "#e9f6f3"; ctx.font = `13px ${FA}`;
    ctx.fillText("D Flip-Flop", 486, 100);
    ctx.font = `12px ${MONO}`; ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`D=${S.d}  CLK↑`, 450, 145);
    lamp(500, 200, S.dq === 1, "#f2a83b", "Q");
    lamp(570, 200, S.dq === 0, "#56b8ff", "Q̄");
    // shift register
    ctx.strokeStyle = "rgba(143,188,184,0.5)";
    ctx.strokeRect(130, 330, 700, 150);
    ctx.fillStyle = "#e9f6f3"; ctx.font = `14px ${FA}`;
    ctx.fillText("شیفت‌رجیستر ۴ بیتی — ورودی سریال از چپ", 150, 320);
    for (let i = 0; i < 4; i++) {
      const x = 250 + i * 130, on = S.reg[i] === 1;
      ctx.strokeStyle = on ? "#b388ff" : "#175059"; ctx.lineWidth = 2;
      ctx.strokeRect(x, 370, 90, 70);
      ctx.fillStyle = on ? "#b388ff" : "#8fbcb8";
      ctx.font = `700 26px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(String(S.reg[i]), x + 45, 415);
      ctx.font = `10px ${MONO}`; ctx.fillStyle = "#8fbcb8";
      ctx.fillText(`FF${3 - i}`, x + 45, 458);
      ctx.textAlign = "left";
      if (i < 3) { ctx.strokeStyle = "#2a7a80"; ctx.beginPath(); ctx.moveTo(x + 92, 405); ctx.lineTo(x + 128, 405); ctx.stroke(); }
    }
    ctx.fillStyle = "#b388ff"; ctx.font = `13px ${MONO}`;
    ctx.fillText(`IN=${S.serial}`, 150, 412);
    const v = parseInt(S.reg.join(""), 2);
    hud(ctx, 620, 110, 300, 130, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`رجیستر: ${S.reg.join("")}`, 640, 140);
    ctx.fillStyle = "#b388ff"; ctx.fillText(`= ${v} دسیمال`, 640, 166);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`پالس‌های کلاک: ${S.clk}`, 640, 192);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`= 0x${v.toString(16).toUpperCase().padStart(2, "0")}`, 640, 218);
  };
  useEffect(() => { draw(); });

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={false}
      onToggleRun={shiftClock}
      onReset={() => { S.s = 0; S.r = 0; S.q = 0; S.d = 0; S.dq = 0; S.reg = [0, 0, 0, 0]; S.clk = 0; S.hist = []; pushFeed("info", "همه فلیپ‌فلاپ‌ها صفر شدند."); }}
      simClock={`Q=${S.q} · DQ=${S.dq} · REG=${S.reg.join("")}₂`}
      hint="فلیپ‌فلاپ عنصر حافظه است: با یک پالس کلاک، بیتِ ورودی ذخیره می‌شود و تا پالس بعدی ثابت می‌ماند."
      protocol={[
        { label: "Set و Reset فلیپ‌فلاپ SR", done: S.ev >= 2 },
        { label: "انتقال D با لبه کلاک", done: S.ev >= 3 },
        { label: "شیفت دادن ۴ بیت به رجیستر", done: S.clk >= 4 },
        { label: "خواندن مقدار دسیمال/هگز", done: S.clk >= 4 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <div>
          <div className="text-[12px] text-fog mb-2">ورودی‌های SR Latch</div>
          <div className="flex gap-2">
            <button onClick={() => setSr("S")} className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-bold border border-teal/60 text-teal hover:bg-teal/10 transition-colors cursor-pointer">Set (S=1)</button>
            <button onClick={() => setSr("R")} className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-bold border border-coral/60 text-coral hover:bg-coral/10 transition-colors cursor-pointer">Reset (R=1)</button>
          </div>
        </div>
        <div>
          <div className="text-[12px] text-fog mb-2">فلیپ‌فلاپ D</div>
          <div className="flex items-center gap-3">
            <Bit on={S.d === 1} onClick={() => { S.d = 1 - S.d; force(); }} color="#f2a83b" label={`D=${S.d}`} />
            <button onClick={dClock} className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-bold border border-amber/60 text-amber hover:bg-amber/10 transition-colors cursor-pointer">پالس کلاک ↑</button>
          </div>
        </div>
        <div>
          <div className="text-[12px] text-fog mb-2">شیفت‌رجیستر</div>
          <div className="flex items-center gap-3">
            <Bit on={S.serial === 1} onClick={() => { S.serial = 1 - S.serial; force(); }} color="#b388ff" label={`IN=${S.serial}`} />
            <button onClick={shiftClock} className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-bold" style={{ background: "#b388ff", color: "#04191d" }}>شیفت با کلاک</button>
          </div>
        </div>
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          هر بیت با کلیک جابه‌جا می‌شود؛ مقدار رجیستر به‌صورت دودویی، دسیمال و هگز نمایش داده می‌شود.
        </div>
      </div>}
      chart={<LiveChart series={[sr("مقدار رجیستر پس از هر کلاک", "#b388ff", S.hist)]} xLabel="پالس کلاک" yLabel="مقدار (دسیمال)" height={230} yMin={0} yMax={15} />}
      table={{ headers: ["کلاک", "بیت ورودی", "رجیستر Q3..Q0", "دسیمال"], rows: S.hist.map((h, i) => { const prev = i > 0 ? S.hist[i - 1].y : 0; return [h.x, ((h.y & ~(prev & ~h.y)) ? 1 : 0), h.y.toString(2).padStart(4, "0"), h.y]; }) }}
      stats={[
        { label: "خروجی Q (SR)", value: `${S.q}`, color: "#35d3c2" },
        { label: "خروجی Q (D)", value: `${S.dq}`, color: "#f2a83b" },
        { label: "رجیستر دودویی", value: `${S.reg.join("")}₂`, color: "#b388ff" },
        { label: "رجیستر دسیمال", value: `${parseInt(S.reg.join(""), 2)}`, color: "#e9f6f3" },
        { label: "رجیستر هگز", value: `0x${parseInt(S.reg.join(""), 2).toString(16).toUpperCase().padStart(2, "0")}`, color: "#56b8ff" },
        { label: "تعداد کلاک", value: `${S.clk}`, color: "#a5d95c" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`SR latch: S=${S.s}, R=${S.r}, Q=${S.q}`, `Shift register after ${S.clk} clocks: Q=${S.reg.join("")}_2 = ${parseInt(S.reg.join(""), 2)}_{10}`]} />
  );
}

/* ===================== شمارنده ۴ بیتی ===================== */
interface CntSim { count: number; mode: "bin" | "bcd"; freq: number; t: number; acc: number; wave: { x: number; q0: number; q1: number; q2: number; q3: number }[]; ev: number; feed: FeedItem[] }

export function CounterLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<CntSim>({ count: 0, mode: "bin", freq: 2, t: 0, acc: 0, wave: [], ev: 0, feed: [{ time: "#0", level: "info", msg: "شمارنده ۴ بیتی با چهار فلیپ‌فلاپ آبشاری — Q0 با هر کلاک، Q1 با هر دو کلاک و… toggling می‌کند؛ تقسیم فرکانس را ببینید." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const maxV = S.mode === "bcd" ? 10 : 16;

  useRaf((dt) => {
    const ds = Math.min(dt, 60) / 1000;
    if (running) {
      S.t += ds; S.acc += ds;
      const per = 1 / S.freq;
      while (S.acc >= per) {
        S.acc -= per;
        S.count = (S.count + 1) % maxV;
        if (S.count === 0 && S.mode === "bcd") pushFeed("info", "سرریز BCD — شمارنده پس از ۹ به صفر برگشت (ده‌دهی).");
      }
      S.wave.push({ x: Number(S.t.toFixed(2)), q0: S.count & 1, q1: (S.count >> 1) & 1, q2: (S.count >> 2) & 1, q3: (S.count >> 3) & 1 });
      if (S.wave.length > 320) S.wave.shift();
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    for (let i = 0; i < 4; i++) {
      const x = 160 + i * 165, on = (S.count >> (3 - i)) & 1;
      ctx.strokeStyle = on ? "#b388ff" : "#175059"; ctx.lineWidth = 2;
      ctx.strokeRect(x, 140, 120, 110);
      ctx.fillStyle = on ? "#b388ff" : "#8fbcb8";
      ctx.font = `700 42px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(String(on), x + 60, 210);
      ctx.font = `11px ${MONO}`; ctx.fillStyle = "#8fbcb8";
      ctx.fillText(`Q${3 - i}  ÷${2 ** (3 - i + 1)}`, x + 60, 275);
      ctx.textAlign = "left";
      if (i < 3) { ctx.strokeStyle = "#2a7a80"; ctx.beginPath(); ctx.moveTo(x + 122, 195); ctx.lineTo(x + 158, 195); ctx.stroke(); }
    }
    // 7-seg style decimal
    hud(ctx, 300, 330, 360, 130, mode === "ar");
    ctx.font = `700 58px ${MONO}`; ctx.textAlign = "center";
    ctx.fillStyle = "#35d3c2";
    ctx.fillText(String(S.count), 480, 410);
    ctx.textAlign = "left";
    ctx.font = `12px ${MONO}`; ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`${S.count.toString(2).padStart(4, "0")}₂  ·  0x${S.count.toString(16).toUpperCase()}`, 380, 440);
    ctx.fillStyle = "#f2a83b"; ctx.font = `13px ${FA}`;
    ctx.fillText(`فرکانس خروجی Q0 = ${fmt(S.freq, 1)} Hz — هر خروجی نصف قبلی`, 180, 510);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.count = 0; S.t = 0; S.wave = []; pushFeed("info", "شمارنده صفر شد."); }}
      simClock={`شمارش: ${S.count} (${S.count.toString(2).padStart(4, "0")}₂)`}
      hint="هر خروجی فرکانس ورودی را بر ۲، ۴، ۸ و ۱۶ تقسیم می‌کند — اساس تقسیم‌کننده‌های فرکانس و ساعت‌های دیجیتال."
      protocol={[
        { label: "اجرا و مشاهده شمارش دودویی", done: S.wave.length > 20 },
        { label: "مشاهده تقسیم فرکانس", done: true },
        { label: "حالت BCD (۰ تا ۹)", done: S.mode === "bcd" },
        { label: "تغییر فرکانس کلاک", done: S.ev >= 1 || S.freq !== 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="فرکانس کلاک" value={S.freq} min={0.5} max={10} step={0.5} digits={1} unit="Hz" accent="#b388ff" onChange={(v) => { S.freq = v; force(); }} />
        <div className="flex gap-2">
          <button onClick={() => { S.mode = "bin"; pushFeed("info", "حالت دودویی — شمارش ۰ تا ۱۵."); force(); }} className="flex-1 px-3 py-2.5 rounded-lg text-[12.5px] font-bold border transition-all cursor-pointer"
            style={S.mode === "bin" ? { borderColor: "#b388ff", color: "#b388ff", background: "#b388ff15" } : { borderColor: "#175059", color: "#8fbcb8" }}>دودویی (۰–۱۵)</button>
          <button onClick={() => { S.mode = "bcd"; S.count = S.count % 10; pushFeed("info", "حالت BCD — شمارش ده‌دهی ۰ تا ۹."); force(); }} className="flex-1 px-3 py-2.5 rounded-lg text-[12.5px] font-bold border transition-all cursor-pointer"
            style={S.mode === "bcd" ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c215" } : { borderColor: "#175059", color: "#8fbcb8" }}>BCD (۰–۹)</button>
        </div>
        <div>
          <div className="text-[12px] text-fog mb-2">بارگذاری مستقیم (Preset)</div>
          <div className="flex gap-1.5">
            {[3, 2, 1, 0].map((b) => (
              <Bit key={b} on={((S.count >> b) & 1) === 1} onClick={() => { S.count = S.count ^ (1 << b); S.count = S.count % maxV; force(); }} color="#b388ff" />
            ))}
            <span className="num text-[12px] text-fog self-center mr-2">= {S.count}</span>
          </div>
        </div>
      </div>}
      chart={<LiveChart series={[sr("Q0", "#b388ff", S.wave.map((w) => ({ x: w.x, y: w.q0 }))), sr("Q1", "#35d3c2", S.wave.map((w) => ({ x: w.x, y: w.q1 * 2 }))), sr("Q2", "#f2a83b", S.wave.map((w) => ({ x: w.x, y: w.q2 * 4 }))), sr("Q3", "#ff6f61", S.wave.map((w) => ({ x: w.x, y: w.q3 * 6 })))]} xLabel="t (s)" yLabel="Q (تراز)" height={230} yMin={-0.5} yMax={7} />}
      table={{ headers: ["دسیمال", "دودویی", "هگز", "فرکانس نسبی Q0"], rows: Array.from({ length: 10 }, (_, i) => [i, i.toString(2).padStart(4, "0"), `0x${i.toString(16).toUpperCase()}`, i % 2 === 0 ? "—" : "لبه"]) }}
      stats={[
        { label: "شمارش فعلی", value: `${S.count}`, color: "#35d3c2" },
        { label: "دودویی", value: `${S.count.toString(2).padStart(4, "0")}₂`, color: "#b388ff" },
        { label: "هگزادسیمال", value: `0x${S.count.toString(16).toUpperCase()}`, color: "#f2a83b" },
        { label: "فرکانس Q0", value: `${fmt(S.freq, 1)} Hz`, color: "#e9f6f3", sub: "f/2" },
        { label: "فرکانس Q3", value: `${fmt(S.freq / 16, 2)} Hz`, color: "#e9f6f3", sub: "f/16" },
        { label: "حالت", value: S.mode === "bcd" ? "BCD" : "دودویی", color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`4-bit ripple counter, clock ${fmt(S.freq, 1)} Hz, mode=${S.mode}`, `Q_n frequency = f_clk / 2^{n+1}; count=${S.count}=${S.count.toString(2).padStart(4, "0")}_2`]} />
  );
}

/* ===================== جمع‌کننده ۴ بیتی ===================== */
export function AdderLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ A: [0, 1, 0, 1], B: [0, 0, 1, 1], cin: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "جمع‌کننده موازی ۴ بیتی — بیت‌های A و B را با کلیک تغییر دهید و انتشار موجیِ رقمِ نقلی (carry ripple) را دنبال کنید." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const a = parseInt(S.A.join(""), 2), b = parseInt(S.B.join(""), 2);
  const total = a + b + S.cin;
  // carry chain from LSB (index 3)
  const C = [S.cin];
  const Sum: number[] = [];
  for (let i = 3; i >= 0; i--) {
    const cIn = C[C.length - 1];
    const s = S.A[i] + S.B[i] + cIn;
    Sum.unshift(s & 1);
    C.push(s >> 1);
  }
  const cout = C[C.length - 1];
  const overflow = S.A[0] === S.B[0] && Sum[0] !== S.A[0];

  const toggle = (arr: number[], i: number) => { arr[i] = 1 - arr[i]; pushFeed("info", `ورودی تغییر کرد — ${arr === S.A ? "A" : "B"} = ${arr.join("")}₂`); force(); };

  const draw = () => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    for (let i = 0; i < 4; i++) {
      const x = 190 + i * 165;
      ctx.strokeStyle = "rgba(143,188,184,0.5)"; ctx.lineWidth = 2;
      ctx.strokeRect(x, 200, 120, 120);
      ctx.fillStyle = "#e9f6f3"; ctx.font = `13px ${FA}`; ctx.textAlign = "center";
      ctx.fillText(`جمع‌کننده کامل ${3 - i}`, x + 60, 190);
      ctx.font = `700 30px ${MONO}`;
      ctx.fillStyle = "#56b8ff"; ctx.fillText(String(S.A[i]), x + 60, 250);
      ctx.fillStyle = "#f2a83b"; ctx.fillText(String(S.B[i]), x + 60, 285);
      ctx.fillStyle = "#35d3c2"; ctx.fillText(String(Sum[i]), x + 60, 345);
      ctx.textAlign = "left";
      // carry
      const cIn = i === 3 ? S.cin : C[3 - i + 1 - 1];
      const cOut = C[3 - i + 1];
      ctx.strokeStyle = cOut ? "#ff6f61" : "#175059";
      ctx.lineWidth = cOut ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(x + 122, 230); ctx.lineTo(x + 158, 230); ctx.stroke();
      ctx.fillStyle = cOut ? "#ff6f61" : "#8fbcb8"; ctx.font = `10px ${MONO}`;
      ctx.fillText(`c=${cOut}`, x + 128, 222);
    }
    hud(ctx, 280, 400, 420, 110, mode === "ar");
    ctx.font = `14px ${MONO}`;
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`${a.toString(2).padStart(4, "0")} + ${b.toString(2).padStart(4, "0")} + ${S.cin} = ${(total & 15).toString(2).padStart(4, "0")}`, 300, 432);
    ctx.fillStyle = "#35d3c2";
    ctx.fillText(`${a} + ${b} + ${S.cin} = ${total}`, 300, 460);
    ctx.fillStyle = cout ? "#ff6f61" : "#8fbcb8";
    ctx.fillText(`رقم نقلی نهایی Cout = ${cout}`, 300, 488);
  };
  useEffect(() => { draw(); });

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={false}
      onToggleRun={() => pushFeed("info", `A=${a} و B=${b} — حاصل ${total}${cout ? " با سرریز" : ""}.`)}
      onReset={() => { S.A = [0, 0, 0, 0]; S.B = [0, 0, 0, 0]; S.cin = 0; pushFeed("info", "ورودی‌ها صفر شدند."); }}
      simClock={`${a} + ${b} + ${S.cin} = ${total}`}
      hint="رقم نقلی از کم‌ارزش‌ترین بیت به سمت بالا «موج» می‌زند — دلیل نام ripple-carry و کندبودن آن در جمع‌کننده‌های بزرگ."
      protocol={[
        { label: "جمع دو عدد ساده", done: S.ev >= 1 },
        { label: "ایجاد رقم نقلی داخلی", done: total > 15 || S.ev >= 2 },
        { label: "سرریز Cout=1", done: cout === 1 },
        { label: "بررسی جدول صحت FA", done: S.ev >= 3 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <div>
          <div className="text-[12px] text-fog mb-1.5">عدد A (آبی)</div>
          <div className="flex gap-1.5">{S.A.map((v, i) => <Bit key={i} on={v === 1} onClick={() => toggle(S.A, i)} color="#56b8ff" />)}</div>
        </div>
        <div>
          <div className="text-[12px] text-fog mb-1.5">عدد B (کهربایی)</div>
          <div className="flex gap-1.5">{S.B.map((v, i) => <Bit key={i} on={v === 1} onClick={() => toggle(S.B, i)} color="#f2a83b" />)}</div>
        </div>
        <div className="flex items-center gap-3">
          <Bit on={S.cin === 1} onClick={() => { S.cin = 1 - S.cin; force(); }} color="#ff6f61" label={`Cin=${S.cin}`} />
          <span className="text-[12px] text-fog">رقم نقلی ورودی</span>
        </div>
      </div>}
      chart={<LiveChart series={[sr("مقدار A", "#56b8ff", [{ x: 0, y: a }, { x: 1, y: a }]), sr("مقدار B", "#f2a83b", [{ x: 0, y: b }, { x: 1, y: b }]), sr("حاصل", "#35d3c2", [{ x: 0, y: total }, { x: 1, y: total }])]} xLabel="—" yLabel="مقدار" height={230} yMin={0} yMax={32} />}
      table={{ headers: ["A", "B", "Cin", "Sum", "Cout"], rows: [[0, 0, 0, 0, 0], [0, 0, 1, 1, 0], [0, 1, 0, 1, 0], [0, 1, 1, 0, 1], [1, 0, 0, 1, 0], [1, 0, 1, 0, 1], [1, 1, 0, 0, 1], [1, 1, 1, 1, 1]] }}
      stats={[
        { label: "عدد A", value: `${a} (${a.toString(2).padStart(4, "0")}₂)`, color: "#56b8ff" },
        { label: "عدد B", value: `${b} (${b.toString(2).padStart(4, "0")}₂)`, color: "#f2a83b" },
        { label: "حاصل (۴ بیت)", value: `${total & 15} (${(total & 15).toString(2).padStart(4, "0")}₂)`, color: "#35d3c2" },
        { label: "حاصل کامل", value: `${total}`, color: "#e9f6f3" },
        { label: "Cout", value: `${cout}`, color: cout ? "#ff6f61" : "#8fbcb8" },
        { label: "سرریز علامت‌دار", value: overflow ? "بله" : "خیر", color: overflow ? "#ff6f61" : "#a5d95c" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`4-bit ripple-carry adder: ${a}+${b}+${S.cin}=${total}`, `Sum=${(total & 15).toString(2).padStart(4, "0")}_2, Cout=${cout}`]} />
  );
}
