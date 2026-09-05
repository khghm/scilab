import { useMemo, useRef, useState } from "react";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { fmt, faDigits, useForce, useRaf } from "../lib/utils";
import { bg, FA, MONO } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ---------- expression AST ---------- */
type Expr =
  | { k: "num"; v: number }
  | { k: "var"; name: string }
  | { k: "call"; name: string; args: Expr[] }
  | { k: "bin"; op: string; a: Expr; b: Expr };

/* ---------- flat ops (compiled) ---------- */
type Op =
  | { op: "assign"; name: string; e: Expr; decl?: boolean }
  | { op: "pinMode"; pin: Expr; mode: string }
  | { op: "dw"; pin: Expr; e: Expr }
  | { op: "aw"; pin: Expr; e: Expr }
  | { op: "delay"; e: Expr }
  | { op: "println"; e: Expr | null; text?: string }
  | { op: "jz"; cond: Expr; target: number }
  | { op: "jmp"; target: number };

const SKETCHES: { fa: string; src: string }[] = [
  {
    fa: "چشمک‌زن (Blink)",
    src: `// چشمک‌زن روی پین 13
pinMode(13, OUTPUT);
Serial.println("شروع");
int t = 0;
for (int i = 0; i < 4; i = i + 1) {
  digitalWrite(13, HIGH);
  delay(400);
  digitalWrite(13, LOW);
  delay(400);
  t = t + 1;
}
Serial.println("پایان");`,
  },
  {
    fa: "تنفس LED با PWM",
    src: `// روشن/خاموش تدریجی با analogWrite
pinMode(13, OUTPUT);
for (int f = 0; f <= 255; f = f + 17) {
  analogWrite(13, f);
  delay(60);
}
for (int f = 255; f >= 0; f = f - 17) {
  analogWrite(13, f);
  delay(60);
}`,
  },
  {
    fa: "سروو با map",
    src: `// پتانسیومتر -> سروو
pinMode(9, OUTPUT);
int adc = 512;
int ang = map(adc, 0, 1023, 0, 180);
analogWrite(9, ang);
Serial.println(ang);
delay(300);`,
  },
];

/* ---------- tokenizer ---------- */
function tokenize(src: string): string[] {
  const cleaned = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const out: string[] = [];
  let i = 0;
  const isD = (c: string) => c >= "0" && c <= "9";
  const isA = (c: string) => /[a-zA-Z_]/.test(c);
  while (i < cleaned.length) {
    const c = cleaned[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"') {
      let j = i + 1, s = "";
      while (j < cleaned.length && cleaned[j] !== '"') { s += cleaned[j]; j++; }
      out.push(`"${s}"`); i = j + 1; continue;
    }
    if (isD(c)) {
      let j = i; while (j < cleaned.length && isD(cleaned[j])) j++;
      out.push(cleaned.slice(i, j)); i = j; continue;
    }
    if (isA(c)) {
      let j = i; while (j < cleaned.length && (isA(cleaned[j]) || isD(cleaned[j]))) j++;
      out.push(cleaned.slice(i, j)); i = j; continue;
    }
    const two = cleaned.slice(i, i + 2);
    if (["==", "!=", ">=", "<=", "&&", "||"].includes(two)) { out.push(two); i += 2; continue; }
    if ("+-*/%()<>=,;{}".includes(c)) { out.push(c); i++; continue; }
    i++;
  }
  return out;
}

/* ---------- parser ---------- */
function parse(src: string): { ops: Op[]; err: string | null } {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const expect = (t: string) => { if (peek() !== t) throw new Error(`انتظار «${t}» در نزدیکی «${peek() ?? "پایان"}»`); p++; };
  const ops: Op[] = [];
  const jmpPatches: { idx: number; here: number }[] = [];

  function expr(minBp = 0): Expr {
    let left = atom();
    const bp: Record<string, number> = { "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, ">": 4, "<=": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };
    while (peek() && bp[peek()] !== undefined && bp[peek()] >= minBp) {
      const op = next();
      const right = expr(bp[op] + 1);
      left = { k: "bin", op, a: left, b: right };
    }
    return left;
  }
  function atom(): Expr {
    const t = next();
    if (t === undefined) throw new Error("عبارت ناتمام");
    if (/^[0-9]+$/.test(t)) return { k: "num", v: parseInt(t, 10) };
    if (t.startsWith('"')) return { k: "num", v: 0 }; // handled as string in println
    if (t === "(") { const e = expr(); expect(")"); return e; }
    if (t === "-") return { k: "bin", op: "-", a: { k: "num", v: 0 }, b: atom() };
    if (/^[a-zA-Z_]/.test(t)) {
      if (peek() === "(") {
        next();
        const args: Expr[] = [];
        if (peek() !== ")") { args.push(expr()); while (peek() === ",") { next(); args.push(expr()); } }
        expect(")");
        return { k: "call", name: t, args };
      }
      const consts: Record<string, number> = { HIGH: 1, LOW: 0, OUTPUT: 1, INPUT: 0, true: 1, false: 0 };
      if (t in consts) return { k: "num", v: consts[t] };
      return { k: "var", name: t };
    }
    throw new Error(`توکن ناشناخته «${t}»`);
  }

  function block(): void {
    expect("{");
    while (peek() !== "}") { stmt(); if (peek() === ";") next(); }
    expect("}");
  }
  function stmt(): void {
    const t = peek();
    if (t === "int") {
      next(); const name = next(); expect("="); const e = expr(); expect(";");
      ops.push({ op: "assign", name, e, decl: true }); return;
    }
    if (t === "pinMode") {
      next(); expect("("); const pin = expr(); expect(",");
      const mode = next(); expect(")"); expect(";");
      ops.push({ op: "pinMode", pin, mode }); return;
    }
    if (t === "digitalWrite") {
      next(); expect("("); const pin = expr(); expect(","); const e = expr(); expect(")"); expect(";");
      ops.push({ op: "dw", pin, e }); return;
    }
    if (t === "analogWrite") {
      next(); expect("("); const pin = expr(); expect(","); const e = expr(); expect(")"); expect(";");
      ops.push({ op: "aw", pin, e }); return;
    }
    if (t === "delay") {
      next(); expect("("); const e = expr(); expect(")"); expect(";");
      ops.push({ op: "delay", e }); return;
    }
    if (t === "Serial") {
      next(); expect("."); next(); // println
      expect("(");
      if (peek() === ")") { next(); expect(";"); ops.push({ op: "println", e: null }); return; }
      if (peek()?.startsWith('"')) { const text = next().slice(1, -1); expect(")"); expect(";"); ops.push({ op: "println", e: null, text }); return; }
      const e = expr(); expect(")"); expect(";");
      ops.push({ op: "println", e }); return;
    }
    if (t === "if") {
      next(); expect("("); const cond = expr(); expect(")");
      const jzIdx = ops.length; ops.push({ op: "jz", cond, target: -1 });
      block();
      if (peek() === "else") {
        next();
        const jmpIdx = ops.length; ops.push({ op: "jmp", target: -1 });
        (ops[jzIdx] as { target: number }).target = ops.length;
        block();
        (ops[jmpIdx] as { target: number }).target = ops.length;
      } else {
        (ops[jzIdx] as { target: number }).target = ops.length;
      }
      return;
    }
    if (t === "for") {
      next(); expect("(");
      // init
      expect("int"); const v = next(); expect("="); const initE = expr(); expect(";");
      ops.push({ op: "assign", name: v, e: initE, decl: true });
      const loopStart = ops.length;
      const cond = expr(); expect(";");
      const jzIdx = ops.length; ops.push({ op: "jz", cond, target: -1 });
      // increment parsed after body: we need to parse it now but place after body. Parse inc expr, stash.
      const incName = next(); // e.g. i
      expect("="); const incE = expr(); expect(")");
      block();
      ops.push({ op: "assign", name: incName, e: incE });
      ops.push({ op: "jmp", target: loopStart });
      (ops[jzIdx] as { target: number }).target = ops.length;
      return;
    }
    // assignment or expression statement
    if (t && /^[a-zA-Z_]/.test(t) && toks[p + 1] === "=") {
      const name = next(); expect("="); const e = expr(); expect(";");
      ops.push({ op: "assign", name, e }); return;
    }
    throw new Error(`دستور ناشناخته «${t ?? ""}»`);
  }

  try {
    while (p < toks.length) { stmt(); }
    return { ops, err: null };
  } catch (e) {
    return { ops: [], err: (e as Error).message };
  }
}

interface VmState {
  pc: number; vars: Record<string, number>; pins: Record<number, string>; out: Record<number, number>;
  pwm: Record<number, number>; time: number; serial: string[]; done: boolean; waitUntil: number;
}

export function ArduinoIdeLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [src, setSrc] = useState(SKETCHES[0].src);
  const S = useRef({ sketch: 0, running: false, speed: 1, linePc: -1, ev: 0, feed: [{ time: "#0", level: "info", msg: "یک IDE آردوینوی واقعی — کد را ویرایش کنید، کامپایل می‌شود به کد میانی، سپس گام‌به‌گام یا پیوسته اجرا کنید؛ متغیرها، پین‌ها و مانیتور سریال زنده‌اند." }] as FeedItem[] }).current;
  const vm = useRef<VmState>({ pc: 0, vars: {}, pins: {}, out: {}, pwm: {}, time: 0, serial: [], done: false, waitUntil: 0 });
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const { ops, err } = useMemo(() => parse(src), [src]);
  const lines = useMemo(() => src.split("\n"), [src]);

  const resetVm = () => { vm.current = { pc: 0, vars: {}, pins: {}, out: {}, pwm: {}, time: 0, serial: [], done: false, waitUntil: 0 }; S.running = false; S.linePc = -1; force(); };

  const evalE = (e: Expr): number => {
    switch (e.k) {
      case "num": return e.v;
      case "var": return vm.current.vars[e.name] ?? 0;
      case "call": {
        if (e.name === "digitalRead") return vm.current.out[evalE(e.args[0])] ? 1 : 0;
        if (e.name === "analogRead") return 512;
        if (e.name === "map") {
          const [x, in0, in1, out0, out1] = e.args.map(evalE);
          return Math.round(out0 + ((x - in0) * (out1 - out0)) / (in1 - in0 || 1));
        }
        if (e.name === "abs") return Math.abs(evalE(e.args[0]));
        return 0;
      }
      case "bin": {
        const a = evalE(e.a), b = evalE(e.b);
        switch (e.op) {
          case "+": return a + b; case "-": return a - b; case "*": return a * b;
          case "/": return b === 0 ? 0 : Math.trunc(a / b); case "%": return b === 0 ? 0 : a % b;
          case ">": return a > b ? 1 : 0; case "<": return a < b ? 1 : 0;
          case ">=": return a >= b ? 1 : 0; case "<=": return a <= b ? 1 : 0;
          case "==": return a === b ? 1 : 0; case "!=": return a !== b ? 1 : 0;
          case "&&": return a && b ? 1 : 0; case "||": return a || b ? 1 : 0;
          default: return 0;
        }
      }
    }
  };

  const step = () => {
    const v = vm.current;
    if (v.done || err) return;
    if (v.time < v.waitUntil) { v.time += 10; return; } // inside delay
    const op = ops[v.pc];
    if (!op) { v.done = true; S.running = false; pushFeed("ok", "اجرای sketch کامل شد."); force(); return; }
    switch (op.op) {
      case "assign": v.vars[op.name] = evalE(op.e); break;
      case "pinMode": v.pins[evalE(op.pin)] = op.mode === "OUTPUT" || op.mode === "1" ? "OUTPUT" : "INPUT"; break;
      case "dw": { const pin = evalE(op.pin); const val = evalE(op.e); v.out[pin] = val; v.pwm[pin] = val ? 255 : 0; break; }
      case "aw": { const pin = evalE(op.pin); const val = Math.max(0, Math.min(255, evalE(op.e))); v.pwm[pin] = val; v.out[pin] = val > 127 ? 1 : 0; break; }
      case "delay": v.waitUntil = v.time + evalE(op.e); break;
      case "println": v.serial.push(op.text !== undefined ? op.text : String(evalE(op.e!))); if (v.serial.length > 30) v.serial.shift(); break;
      case "jz": if (!evalE(op.cond)) v.pc = op.target - 1; break;
      case "jmp": v.pc = op.target - 1; break;
    }
    v.pc++;
    if (v.pc >= ops.length) { v.done = true; S.running = false; pushFeed("ok", "اجرای sketch کامل شد."); }
  };

  useRaf((dt) => {
    if (S.running && !err) {
      const steps = Math.max(1, Math.round(S.speed * (dt / 16)));
      for (let i = 0; i < steps && !vm.current.done; i++) step();
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const v = vm.current;
    // LED on pin 13
    const b13 = (v.pwm[13] ?? 0) / 255;
    ctx.beginPath(); ctx.arc(200, 160, 46, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(242,168,59,${0.1 + b13 * 0.9})`;
    if (b13 > 0.05 && mode === "normal") { ctx.shadowColor = "#f2a83b"; ctx.shadowBlur = 50 * b13; }
    ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`; ctx.textAlign = "center";
    ctx.fillText("LED پین ۱۳", 200, 232);
    ctx.fillStyle = "#e9f6f3"; ctx.font = `11px ${MONO}`;
    ctx.fillText(`PWM=${v.pwm[13] ?? 0}`, 200, 250);
    ctx.textAlign = "left";
    // servo on pin 9
    const ang9 = ((v.pwm[9] ?? 0) / 255) * 180;
    const sx = 480, sy = 190;
    ctx.fillStyle = "#0e4a52"; ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(sx - 70, sy - 34, 140, 80, 8); ctx.fill(); ctx.stroke();
    const hr = ((ang9 - 90) * Math.PI) / 180;
    ctx.save(); ctx.translate(sx, sy + 10); ctx.rotate(hr);
    ctx.fillStyle = "#35d3c2"; ctx.beginPath(); ctx.roundRect(-8, -60, 16, 70, 8); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(sx, sy + 10, 13, 0, Math.PI * 2); ctx.fillStyle = "#04191d"; ctx.fill();
    ctx.strokeStyle = "#35d3c2"; ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`; ctx.textAlign = "center";
    ctx.fillText(`سروو پین ۹ = ${fmt(ang9, 0)}°`, sx, sy + 70);
    ctx.textAlign = "left";
    // pin states table
    ctx.fillStyle = "#e9f6f3"; ctx.font = `13px ${FA}`;
    ctx.fillText("وضعیت پین‌ها:", 700, 120);
    const pinNums = [...new Set([...Object.keys(v.pins), ...Object.keys(v.out), ...Object.keys(v.pwm)].map(Number))].sort((a, b) => a - b).slice(0, 6);
    pinNums.forEach((pn, i) => {
      const y = 140 + i * 26;
      ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${MONO}`;
      ctx.fillText(`P${pn}`, 700, y);
      ctx.fillStyle = (v.pwm[pn] ?? 0) > 0 ? "#35d3c2" : "#8fbcb8";
      ctx.fillText(v.pins[pn] === "OUTPUT" ? (v.pwm[pn] ? `PWM ${v.pwm[pn]}` : v.out[pn] ? "HIGH" : "LOW") : "—", 740, y);
    });
    // time + status
    ctx.fillStyle = "rgba(4,25,29,0.75)"; ctx.strokeStyle = "rgba(42,122,128,0.9)";
    ctx.beginPath(); ctx.roundRect(620, 420, 290, 90, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`; ctx.fillText("زمان شبیه‌سازی", 640, 442);
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 20px ${MONO}`; ctx.fillText(`${fmt(v.time, 0)} ms`, 640, 468);
    ctx.fillStyle = v.done ? "#a5d95c" : S.running ? "#35d3c2" : "#f2a83b";
    ctx.font = `12px ${FA}`;
    ctx.fillText(v.done ? "پایان اجرا" : S.running ? "در حال اجرا" : err ? "خطای کامپایل" : "توقف — Step بزنید", 640, 494);
    frame.current++;
    if (frame.current % 9 === 0) force();
  }, true);

  const compile = () => {
    resetVm();
    if (err) pushFeed("error", `خطای کامپایل: ${err}`);
    else pushFeed("ok", `کامپایل موفق — ${ops.length} دستور میانی تولید شد.`);
    force();
  };
  const run = () => {
    if (err) { pushFeed("error", `ابتدا خطا را رفع کنید: ${err}`); return; }
    if (vm.current.done) resetVm();
    S.running = !S.running; force();
  };

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={S.running} onToggleRun={run}
      onReset={() => { resetVm(); pushFeed("info", "ماشین مجازی ریست شد."); }}
      simClock={`PC=${vm.current.pc}/${ops.length} · t=${fmt(vm.current.time, 0)}ms`}
      hint="کد را آزادانه ویرایش و Compile کنید؛ سپس Step برای اجرای خط‌به‌خط یا Run برای اجرای پیوسته. حلقه‌ها و شرط‌ها به پرش‌های کد میانی ترجمه می‌شوند."
      protocol={[
        { label: "کامپایل موفق sketch", done: !err && ops.length > 0 },
        { label: "اجرای گام‌به‌گام (Step)", done: vm.current.pc > 0 },
        { label: "مشاهده خروجی سریال", done: vm.current.serial.length > 0 },
        { label: "نوشتن و اجرای کد دلخواه", done: S.ev >= 3 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-fog">ویرایشگر sketch.ino</span>
            <span className="text-[10px] font-mono" style={{ color: err ? "#ff6f61" : "#a5d95c" }}>{err ? "خطا" : `${ops.length} op`}</span>
          </div>
          <textarea
            dir="ltr" value={src} spellCheck={false}
            onChange={(e) => setSrc(e.target.value)}
            className="w-full h-[190px] rounded-lg bg-abyss/90 border border-edge/70 text-teal text-[11.5px] font-mono leading-5 p-3 outline-none focus:border-teal/60 resize-none"
          />
        </div>
        {err && <div className="text-[11px] text-coral bg-coral/10 border border-coral/40 rounded-lg px-3 py-2" dir="rtl">{err}</div>}
        <div className="flex gap-2">
          <button onClick={compile} className="flex-1 px-3 py-2.5 rounded-lg text-[12.5px] font-bold border border-sky/60 text-sky hover:bg-sky/10 transition-colors cursor-pointer">Compile</button>
          <button onClick={() => { if (!err) { step(); force(); } }} className="flex-1 px-3 py-2.5 rounded-lg text-[12.5px] font-bold border border-violet/60 text-violet hover:bg-violet/10 transition-colors cursor-pointer">Step</button>
        </div>
        <div>
          <div className="text-[12px] text-fog mb-1.5">sketch‌های نمونه</div>
          <div className="flex flex-col gap-1.5">
            {SKETCHES.map((s, i) => (
              <button key={s.fa} onClick={() => { setSrc(s.src); S.sketch = i; resetVm(); force(); }} className="px-3 py-2 rounded-lg text-[11.5px] text-right border border-edge/70 text-fog hover:text-teal hover:border-teal/50 transition-colors cursor-pointer">{s.fa}</button>
            ))}
          </div>
        </div>
      </div>}
      chart={
        <div className="rounded-lg border border-edge/60 bg-abyss/90 p-4 h-[230px] overflow-y-auto" dir="ltr">
          <div className="text-[10px] font-mono tracking-[0.2em] text-fog mb-2">SERIAL MONITOR @ 9600</div>
          {vm.current.serial.length === 0 && <div className="text-[11px] font-mono text-edge2">— خروجی‌ای نیست —</div>}
          {vm.current.serial.map((l, i) => (
            <div key={i} className="text-[12px] font-mono text-lime leading-6">{'>'} {l}</div>
          ))}
        </div>
      }
      table={{ headers: ["متغیر", "مقدار"], rows: Object.entries(vm.current.vars).map(([k, val]) => [k, val]) }}
      stats={[
        { label: "برنامه (PC)", value: `${vm.current.pc} / ${ops.length}`, color: "#b388ff" },
        { label: "زمان شبیه‌سازی", value: `${fmt(vm.current.time, 0)} ms`, color: "#35d3c2" },
        { label: "LED پین ۱۳", value: `${vm.current.pwm[13] ?? 0}/255`, color: "#f2a83b" },
        { label: "سروو پین ۹", value: `${fmt(((vm.current.pwm[9] ?? 0) / 255) * 180, 0)}°`, color: "#35d3c2" },
        { label: "خطوط سریال", value: `${vm.current.serial.length}`, color: "#a5d95c" },
        { label: "وضعیت", value: vm.current.done ? "پایان" : err ? "خطا" : S.running ? "اجرا" : "توقف", color: err ? "#ff6f61" : "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Arduino VM: ${ops.length} compiled ops, t=${fmt(vm.current.time, 0)}ms`, `pins: ${Object.keys(vm.current.pwm).join(",") || "none"}`]} />
  );
}
