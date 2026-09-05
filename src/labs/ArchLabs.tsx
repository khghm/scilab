import { useEffect, useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { bg, hud, FA, MONO, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

function Bit({ on, onClick, color = "#35d3c2" }: { on: boolean; onClick?: () => void; color?: string }) {
  return (
    <button onClick={onClick}
      className={`w-9 h-9 rounded-lg font-mono font-bold border text-[12px] transition-all ${onClick ? "cursor-pointer hover:brightness-125 active:scale-90" : "cursor-default"}`}
      style={on ? { background: `${color}22`, borderColor: color, color, boxShadow: `0 0 12px ${color}55` } : { background: "#07252b", borderColor: "#175059", color: "#8fbcb8" }}>
      {on ? "1" : "0"}
    </button>
  );
}

/* ===================== ALU 8-bit ===================== */
const OPS = [
  { id: "AND", fa: "AND", color: "#56b8ff" },
  { id: "OR", fa: "OR", color: "#35d3c2" },
  { id: "XOR", fa: "XOR", color: "#a5d95c" },
  { id: "NOT", fa: "NOT A", color: "#b388ff" },
  { id: "ADD", fa: "ADD", color: "#f2a83b" },
  { id: "SUB", fa: "SUB", color: "#ff6f61" },
  { id: "SHL", fa: "SHL", color: "#35d3c2" },
  { id: "SHR", fa: "SHR", color: "#b388ff" },
] as const;
type OpId = (typeof OPS)[number]["id"];

interface AluSim { A: number[]; B: number[]; op: OpId; hist: { x: number; y: number }[]; n: number; ev: number; feed: FeedItem[] }

export function AluLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<AluSim>({ A: [0, 0, 0, 0, 1, 0, 1, 1], B: [0, 0, 0, 1, 0, 1, 0, 1], op: "ADD", hist: [], n: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "واحد حساب و منطق ۸ بیتی — بیت‌های A و B را با کلیک بسازید، عملگر را انتخاب کنید و پرچم‌ها را بخوانید." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const a = parseInt(S.A.join(""), 2), b = parseInt(S.B.join(""), 2);
  const calc = () => {
    let r = 0, c = 0, v = 0;
    switch (S.op) {
      case "AND": r = a & b; break;
      case "OR": r = a | b; break;
      case "XOR": r = a ^ b; break;
      case "NOT": r = (~a) & 0xff; break;
      case "ADD": { const t = a + b; r = t & 0xff; c = t > 255 ? 1 : 0; v = ((~(a ^ b)) & (a ^ r) & 0x80) ? 1 : 0; break; }
      case "SUB": { const t = a - b; r = t & 0xff; c = t < 0 ? 1 : 0; v = (((a ^ b)) & (a ^ r) & 0x80) ? 1 : 0; break; }
      case "SHL": c = (a >> 7) & 1; r = (a << 1) & 0xff; break;
      case "SHR": c = a & 1; r = a >> 1; break;
    }
    return { r, c, z: r === 0 ? 1 : 0, nn: (r >> 7) & 1, v };
  };
  const { r, c, z, nn, v } = calc();
  const execute = () => {
    S.n++;
    S.hist.push({ x: S.n, y: r });
    if (S.hist.length > 40) S.hist.shift();
    pushFeed("ok", `${S.op}: ${a} ⊕ ${b} = ${r} (0x${r.toString(16).toUpperCase()}) — Z=${z} N=${nn} C=${c} V=${v}`);
    force();
  };

  const draw = () => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const opDef = OPS.find((o) => o.id === S.op)!;
    // ALU trapezoid
    ctx.fillStyle = "rgba(179,136,255,0.08)";
    ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(330, 150); ctx.lineTo(630, 150); ctx.lineTo(690, 400); ctx.lineTo(270, 400);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 30px ${FA}`; ctx.textAlign = "center";
    ctx.fillText("ALU", 480, 260);
    ctx.fillStyle = opDef.color; ctx.font = `700 20px ${MONO}`;
    ctx.fillText(S.op, 480, 295);
    ctx.textAlign = "left";
    // inputs
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#56b8ff"; ctx.fillText(`A = ${a} (${a.toString(2).padStart(8, "0")})`, 300, 120);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`B = ${b} (${b.toString(2).padStart(8, "0")})`, 300, 440);
    // buses
    ctx.strokeStyle = "#56b8ff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(400, 130); ctx.lineTo(400, 150); ctx.stroke();
    ctx.strokeStyle = "#f2a83b";
    ctx.beginPath(); ctx.moveTo(400, 425); ctx.lineTo(400, 400); ctx.stroke();
    // output
    ctx.strokeStyle = "#35d3c2";
    ctx.beginPath(); ctx.moveTo(630, 400); ctx.lineTo(630, 460); ctx.lineTo(820, 460); ctx.stroke();
    ctx.fillStyle = "#35d3c2"; ctx.font = `700 22px ${MONO}`;
    ctx.fillText(`${r} = ${r.toString(2).padStart(8, "0")}₂`, 690, 448);
    // flag lamps
    const flags: [string, number, string][] = [["Z", z, "#35d3c2"], ["N", nn, "#56b8ff"], ["C", c, "#ff6f61"], ["V", v, "#f2a83b"]];
    flags.forEach(([lab, val, col], i) => {
      const x = 770 + (i % 2) * 80, y = 170 + Math.floor(i / 2) * 90;
      ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fillStyle = val ? col : "#0f3d46";
      if (val && mode === "normal") { ctx.shadowColor = col; ctx.shadowBlur = 16; }
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = val ? col : "#175059"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#e9f6f3"; ctx.font = `700 14px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(lab, x, y + 5); ctx.textAlign = "left";
    });
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("پرچم‌ها: صفر / منفی / نقلی / سرریز", 735, 285);
  };
  useEffect(() => { draw(); });

  const toggleBit = (arr: number[], i: number) => { arr[i] = 1 - arr[i]; force(); };

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={false} onToggleRun={execute}
      onReset={() => { S.A = [0, 0, 0, 0, 0, 0, 0, 0]; S.B = [0, 0, 0, 0, 0, 0, 0, 0]; S.op = "ADD"; S.hist = []; S.n = 0; pushFeed("info", "ALU آماده عملیات جدید."); }}
      simClock={`${S.op}: ${a} → ${r}`}
      hint="ADD و SUB را با اعداد بزرگ امتحان کنید تا پرچم‌های C و V روشن شوند — پایه تشخیص سرریز در پردازنده‌ها."
      protocol={[
        { label: "عملیات منطقی (AND/OR/XOR)", done: S.ev >= 1 },
        { label: "جمع با پرچم Z", done: S.ev >= 2 },
        { label: "ایجاد سرریز V در ADD", done: v === 1 || S.ev >= 3 },
        { label: "شیفت و انتقال بیت به C", done: S.op === "SHL" || S.op === "SHR" },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-4">
        <div>
          <div className="text-[12px] text-fog mb-1.5">ثبت A — {a} (MSB←LSB)</div>
          <div className="flex gap-1">{S.A.map((v, i) => <Bit key={i} on={v === 1} onClick={() => toggleBit(S.A, i)} color="#56b8ff" />)}</div>
        </div>
        <div>
          <div className="text-[12px] text-fog mb-1.5">ثبت B — {b}</div>
          <div className="flex gap-1">{S.B.map((v, i) => <Bit key={i} on={v === 1} onClick={() => toggleBit(S.B, i)} color="#f2a83b" />)}</div>
        </div>
        <div>
          <div className="text-[12px] text-fog mb-1.5">عملگر</div>
          <div className="grid grid-cols-4 gap-1.5">
            {OPS.map((o) => (
              <button key={o.id} onClick={() => { S.op = o.id; force(); }}
                className="px-2 py-2 rounded-lg text-[11.5px] font-mono font-bold border transition-all cursor-pointer"
                style={S.op === o.id ? { borderColor: o.color, color: o.color, background: `${o.color}15`, boxShadow: `0 0 10px ${o.color}33` } : { borderColor: "#175059", color: "#8fbcb8" }}>
                {o.fa}
              </button>
            ))}
          </div>
        </div>
        <button onClick={execute} className="w-full px-4 py-3 rounded-lg font-bold text-sm cursor-pointer transition-all active:scale-95" style={{ background: "#b388ff", color: "#04191d" }}>
          اجرای عملیات
        </button>
      </div>}
      chart={<LiveChart series={[sr("نتیجه عملیات‌ها", "#b388ff", S.hist)]} xLabel="عملیات #" yLabel="نتیجه" height={230} yMin={0} yMax={255} />}
      table={{ headers: ["#", "عملیات", "A", "B", "نتیجه", "Z N C V"], rows: S.hist.map((h, i) => [h.x, S.op, "—", "—", h.y, "—"]) }}
      stats={[
        { label: "ورودی A", value: `${a} (0x${a.toString(16).toUpperCase().padStart(2, "0")})`, color: "#56b8ff" },
        { label: "ورودی B", value: `${b} (0x${b.toString(16).toUpperCase().padStart(2, "0")})`, color: "#f2a83b" },
        { label: "نتیجه", value: `${r} (0x${r.toString(16).toUpperCase().padStart(2, "0")})`, color: "#35d3c2" },
        { label: "پرچم Z", value: z ? "۱ — صفر" : "۰", color: z ? "#35d3c2" : "#8fbcb8" },
        { label: "پرچم C", value: c ? "۱ — نقلی" : "۰", color: c ? "#ff6f61" : "#8fbcb8" },
        { label: "پرچم V", value: v ? "۱ — سرریز" : "۰", color: v ? "#f2a83b" : "#8fbcb8" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`8-bit ALU: ${S.op}(${a}, ${b}) = ${r} (0x${r.toString(16).toUpperCase()})`, `Flags: Z=${z}, N=${nn}, C=${c}, V=${v}`]} />
  );
}

/* ===================== Von Neumann CPU ===================== */
const MNEM: { id: string; fa: string; needs: "imm" | "addr" | "none" }[] = [
  { id: "MOV A,#", fa: "MOV A,#n", needs: "imm" },
  { id: "MOV B,#", fa: "MOV B,#n", needs: "imm" },
  { id: "ADD A,B", fa: "ADD A,B", needs: "none" },
  { id: "SUB A,B", fa: "SUB A,B", needs: "none" },
  { id: "INC A", fa: "INC A", needs: "none" },
  { id: "DEC A", fa: "DEC A", needs: "none" },
  { id: "JMP", fa: "JMP addr", needs: "addr" },
  { id: "HLT", fa: "HLT", needs: "none" },
];
interface Slot { op: number; val: number }
interface CpuSim { prog: Slot[]; pc: number; A: number; B: number; Z: number; cycles: number; halted: boolean; phase: string; speed: number; acc: number; running: boolean; histA: { x: number; y: number }[]; ev: number; feed: FeedItem[] }

const defaultProg = (): Slot[] => [
  { op: 0, val: 5 }, { op: 1, val: 3 }, { op: 2, val: 0 }, { op: 2, val: 0 },
  { op: 2, val: 0 }, { op: 4, val: 0 }, { op: 4, val: 0 }, { op: 6, val: 2 },
  { op: 7, val: 0 }, { op: 7, val: 0 },
];

export function CpuLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<CpuSim>({ prog: defaultProg(), pc: 0, A: 0, B: 0, Z: 0, cycles: 0, halted: false, phase: "آماده", speed: 2, acc: 0, running: false, histA: [], ev: 0, feed: [{ time: "#0", level: "info", msg: "ماشین فون‌نویمان — برنامه را ویرایش کنید و با Step یا Run، چرخه fetch→decode→execute را دنبال کنید. پیش‌فرض: A=5، سه بار A=A+B سپس دو INC و پرش به جمع (حلقه)." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const step = () => {
    if (S.halted) return;
    const slot = S.prog[S.pc];
    const m = MNEM[slot.op];
    const addr0 = S.pc;
    switch (m.id) {
      case "MOV A,#": S.A = slot.val & 0xff; break;
      case "MOV B,#": S.B = slot.val & 0xff; break;
      case "ADD A,B": S.A = (S.A + S.B) & 0xff; break;
      case "SUB A,B": S.A = (S.A - S.B) & 0xff; break;
      case "INC A": S.A = (S.A + 1) & 0xff; break;
      case "DEC A": S.A = (S.A - 1) & 0xff; break;
      case "JMP": S.pc = Math.min(slot.val, 9); break;
      case "HLT": S.halted = true; S.running = false; setRunning(false); pushFeed("warn", "HLT — پردازنده متوقف شد."); break;
    }
    S.Z = S.A === 0 ? 1 : 0;
    if (m.id !== "JMP" && m.id !== "HLT") S.pc = (S.pc + 1) % 10;
    S.cycles++;
    S.phase = `execute: ${m.fa}${m.needs === "imm" ? slot.val : m.needs === "addr" ? slot.val : ""}`;
    S.histA.push({ x: S.cycles, y: S.A });
    if (S.histA.length > 60) S.histA.shift();
    pushFeed("info", `چرخه ${S.cycles}: آدرس ${addr0} — ${m.fa} → A=${S.A}, B=${S.B}, Z=${S.Z}`);
    force();
  };

  useRaf((dt) => {
    const ds = Math.min(dt, 60) / 1000;
    if (S.running && !S.halted) {
      S.acc += ds;
      const per = 1 / S.speed;
      while (S.acc >= per && S.running && !S.halted) { S.acc -= per; step(); }
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    // RAM block
    ctx.strokeStyle = "rgba(143,188,184,0.5)"; ctx.lineWidth = 2;
    ctx.strokeRect(90, 110, 280, 340);
    ctx.fillStyle = "#e9f6f3"; ctx.font = `13px ${FA}`;
    ctx.fillText("حافظه برنامه (RAM)", 150, 100);
    for (let i = 0; i < 10; i++) {
      const y = 122 + i * 32, active = i === S.pc && !S.halted;
      ctx.fillStyle = active ? "rgba(242,168,59,0.18)" : i % 2 ? "rgba(15,61,70,0.5)" : "rgba(11,48,56,0.5)";
      ctx.fillRect(100, y, 260, 28);
      if (active) { ctx.strokeStyle = "#f2a83b"; ctx.strokeRect(100, y, 260, 28); }
      ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${MONO}`;
      ctx.fillText(`0x${i}`, 108, y + 19);
      const m = MNEM[S.prog[i].op];
      ctx.fillStyle = active ? "#f2a83b" : "#e9f6f3";
      ctx.font = `12px ${MONO}`;
      ctx.fillText(`${m.fa}${m.needs === "imm" ? S.prog[i].val : m.needs === "addr" ? S.prog[i].val : ""}`, 150, y + 19);
      if (active) { ctx.fillStyle = "#f2a83b"; ctx.fillText("◄ PC", 300, y + 19); }
    }
    // bus
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(372, 280); ctx.lineTo(470, 280); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`;
    ctx.fillText("باس داده", 392, 268);
    // CPU block
    ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 2.5;
    ctx.strokeRect(470, 110, 250, 340);
    ctx.fillStyle = "#b388ff"; ctx.font = `700 16px ${FA}`;
    ctx.fillText("پردازنده (CPU)", 545, 100);
    ctx.fillStyle = "rgba(179,136,255,0.06)"; ctx.fillRect(470, 110, 250, 340);
    const regs: [string, string, number][] = [["A", "#35d3c2", S.A], ["B", "#f2a83b", S.B], ["PC", "#56b8ff", S.pc], ["IR", "#b388ff", S.prog[S.pc].op]];
    regs.forEach(([lab, col, val], i) => {
      const x = 490 + (i % 2) * 118, y = 140 + Math.floor(i / 2) * 92;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 100, 62);
      ctx.fillStyle = col; ctx.font = `700 12px ${MONO}`;
      ctx.fillText(lab, x + 10, y + 22);
      ctx.font = `700 24px ${MONO}`;
      ctx.fillText(String(val), x + 10, y + 50);
    });
    ctx.fillStyle = "#e9f6f3"; ctx.font = `12px ${FA}`;
    ctx.fillText(`چرخه: ${S.cycles}`, 490, 360);
    ctx.fillStyle = S.Z ? "#35d3c2" : "#8fbcb8";
    ctx.fillText(`پرچم Z: ${S.Z}`, 490, 384);
    ctx.fillStyle = S.halted ? "#ff6f61" : "#a5d95c";
    ctx.fillText(S.halted ? "متوقف (HLT)" : S.running ? "در حال اجرا" : "آماده / Step", 490, 408);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${MONO}`;
    ctx.fillText(S.phase, 490, 432);
    // ALU mini
    ctx.strokeStyle = "#f2a83b";
    ctx.beginPath(); ctx.moveTo(545, 320); ctx.lineTo(645, 320); ctx.lineTo(660, 345); ctx.lineTo(530, 345); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "#f2a83b"; ctx.font = `11px ${MONO}`; ctx.fillText("ALU", 582, 338);
    // output LEDs (A bits)
    ctx.fillStyle = "#e9f6f3"; ctx.font = `12px ${FA}`;
    ctx.fillText("ثبت A (بیت‌ها):", 760, 130);
    for (let i = 0; i < 8; i++) {
      const on = (S.A >> (7 - i)) & 1;
      ctx.beginPath(); ctx.arc(775 + i * 22, 152, 8, 0, Math.PI * 2);
      ctx.fillStyle = on ? "#35d3c2" : "#0f3d46";
      if (on && mode === "normal") { ctx.shadowColor = "#35d3c2"; ctx.shadowBlur = 10; }
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = on ? "#35d3c2" : "#175059"; ctx.stroke();
    }
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${MONO}`;
    ctx.fillText(`A = ${S.A} = 0x${S.A.toString(16).toUpperCase().padStart(2, "0")}`, 765, 185);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const setSlot = (i: number, patch: Partial<Slot>) => { S.prog[i] = { ...S.prog[i], ...patch }; force(); };
  const cpuReset = () => { S.pc = 0; S.A = 0; S.B = 0; S.Z = 0; S.cycles = 0; S.halted = false; S.running = false; setRunning(false); S.histA = []; S.phase = "آماده"; pushFeed("info", "پردازنده ریست شد — PC=0."); };

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => { if (S.halted) { pushFeed("warn", "ابتدا ریست کنید."); return; } S.running = !S.running; setRunning(S.running); }}
      onReset={cpuReset}
      simClock={`PC=${S.pc} · A=${S.A} · B=${S.B} · چرخه ${S.cycles}`}
      hint="با Step تک‌گام جلو بروید و PC را دنبال کنید؛ JMP آدرس ۲ یک حلقه می‌سازد. برنامه را آزادانه بازنویسی کنید."
      protocol={[
        { label: "اجرای تک‌گام (Step)", done: S.cycles >= 1 },
        { label: "مشاهده حلقه با JMP", done: S.cycles >= 8 },
        { label: "توقف با HLT", done: S.halted },
        { label: "نوشتن برنامه جدید", done: S.ev >= 6 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-3">
        <div className="flex gap-2">
          <button onClick={step} className="flex-1 px-3 py-2.5 rounded-lg text-[12.5px] font-bold border border-violet/60 text-violet hover:bg-violet/10 transition-colors cursor-pointer">Step تک‌گام</button>
        </div>
        <Slider label="سرعت اجرا" value={S.speed} min={0.5} max={8} step={0.5} digits={1} unit="گام/ثانیه" accent="#b388ff" onChange={(v) => { S.speed = v; force(); }} />
        <div className="max-h-[260px] overflow-y-auto rounded-lg border border-edge/60">
          {S.prog.map((slot, i) => {
            const m = MNEM[slot.op];
            return (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 border-b border-edge/40 bg-deep/40">
                <span className="num text-[10px] text-fog w-6">{i}</span>
                <select value={slot.op} onChange={(e) => setSlot(i, { op: parseInt(e.target.value, 10) })}
                  className="rounded bg-panel border border-edge text-snow text-[11px] px-1 py-1 outline-none flex-1">
                  {MNEM.map((mm, oi) => <option key={mm.id} value={oi}>{mm.fa}</option>)}
                </select>
                {m.needs !== "none" && (
                  <input type="number" min={0} max={m.needs === "addr" ? 9 : 255} value={slot.val}
                    onChange={(e) => setSlot(i, { val: Math.max(0, Math.min(m.needs === "addr" ? 9 : 255, parseInt(e.target.value || "0", 10))) })}
                    className="num w-14 rounded bg-panel border border-edge text-snow text-[11px] px-1.5 py-1 outline-none" />
                )}
              </div>
            );
          })}
        </div>
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11px] text-fog leading-6">
          MOV A,#n بارگذاری · ADD/SUB حساب · INC/DEC · JMP پرش · HLT توقف
        </div>
      </div>}
      chart={<LiveChart series={[sr("مقدار A در هر چرخه", "#35d3c2", S.histA)]} xLabel="چرخه" yLabel="A" height={230} yMin={0} yMax={255} />}
      table={{ headers: ["آدرس", "دستور", "مقدار"], rows: S.prog.map((slot, i) => [`0x${i}`, MNEM[slot.op].fa, MNEM[slot.op].needs === "none" ? "—" : slot.val]) }}
      stats={[
        { label: "ثبت A", value: `${S.A} (0x${S.A.toString(16).toUpperCase().padStart(2, "0")})`, color: "#35d3c2" },
        { label: "ثبت B", value: `${S.B} (0x${S.B.toString(16).toUpperCase().padStart(2, "0")})`, color: "#f2a83b" },
        { label: "شمارنده برنامه PC", value: `${S.pc}`, color: "#56b8ff" },
        { label: "پرچم Z", value: `${S.Z}`, color: S.Z ? "#35d3c2" : "#8fbcb8" },
        { label: "چرخه‌های اجراشده", value: `${S.cycles}`, color: "#b388ff" },
        { label: "وضعیت", value: S.halted ? "HLT" : S.running ? "RUN" : "IDLE", color: S.halted ? "#ff6f61" : "#a5d95c" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Von Neumann 8-bit model: PC=${S.pc}, A=${S.A}, B=${S.B}, Z=${S.Z}, cycles=${S.cycles}`, `Program: ${S.prog.map((s, i) => `${i}:${MNEM[s.op].id}`).join(", ")}`]} />
  );
}
