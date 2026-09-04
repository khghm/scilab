import { useMemo, useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, faDigits, useForce, useRaf } from "../lib/utils";
import { bg, FA, MONO, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

const STAGES = ["IF", "ID", "EX", "MEM", "WB"];
const STAGE_COLORS = ["#56b8ff", "#35d3c2", "#f2a83b", "#b388ff", "#a5d95c"];

interface Inst { name: string; rd: string | null; rs: string[]; isLoad?: boolean }

const PROGRAMS: { fa: string; code: Inst[] }[] = [
  {
    fa: "با خطر RAW (وابستگی داده)",
    code: [
      { name: "LOAD R1,[0]", rd: "R1", rs: [], isLoad: true },
      { name: "ADD R2,R1,R3", rd: "R2", rs: ["R1", "R3"] },
      { name: "ADD R3,R2,R4", rd: "R3", rs: ["R2", "R4"] },
      { name: "STORE [8],R3", rd: null, rs: ["R3"] },
      { name: "ADD R5,R5,R1", rd: "R5", rs: ["R5", "R1"] },
    ],
  },
  {
    fa: "بدون خطر (مستقل)",
    code: [
      { name: "ADD R1,R2,R3", rd: "R1", rs: ["R2", "R3"] },
      { name: "ADD R4,R5,R6", rd: "R4", rs: ["R5", "R6"] },
      { name: "LOAD R7,[4]", rd: "R7", rs: [], isLoad: true },
      { name: "ADD R8,R1,R4", rd: "R8", rs: ["R1", "R4"] },
      { name: "STORE [8],R7", rd: null, rs: ["R7"] },
    ],
  },
];

interface Slot { stage: number; cycle: number; inst: number; stall?: boolean }

function schedule(code: Inst[], forward: boolean): { grid: (Slot | null)[][]; cycles: number; stalls: number; hazards: number } {
  const n = code.length;
  const start = new Array(n).fill(0);
  const writeAt: Record<string, { cycle: number; isLoad: boolean }> = {};
  let stalls = 0, hazards = 0;
  for (let i = 0; i < n; i++) {
    let s = i; // ideal: enter IF at cycle i
    if (i > 0) s = Math.max(s, start[i - 1] + 1);
    for (const r of code[i].rs) {
      const p = writeAt[r];
      if (!p) continue;
      hazards++;
      let need: number;
      if (!forward) need = p.cycle + 3; // must wait until producer WB (3 bubbles)
      else if (p.isLoad) need = p.cycle + 1; // load-use: 1 bubble even with forwarding
      else need = p.cycle; // forwarding: no extra stall
      if (need > s) { stalls += need - s; s = need; }
    }
    start[i] = s;
    const dest = code[i].rd;
    if (dest) writeAt[dest] = { cycle: s + 4, isLoad: !!code[i].isLoad };
  }
  const total = Math.max(...start) + 5;
  const grid: (Slot | null)[][] = Array.from({ length: n }, () => Array(total).fill(null));
  for (let i = 0; i < n; i++)
    for (let st = 0; st < 5; st++) grid[i][start[i] + st] = { stage: st, cycle: start[i] + st, inst: i };
  return { grid, cycles: total, stalls, hazards };
}

export function PipelineLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ prog: 0, forward: true, playC: 0, speed: 1.2, ev: 0, feed: [{ time: "#0", level: "info", msg: "خط لوله ۵ مرحله‌ای (IF/ID/EX/MEM/WB) — خطر وابستگی داده (RAW) باعث حباب می‌شود؛ فورواردینگ اکثر حباب‌ها را حذف می‌کند. نمودار گانت چرخه‌ها را نشان می‌دهد." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const code = PROGRAMS[S.prog].code;
  const { grid, cycles, stalls, hazards } = useMemo(() => schedule(code, S.forward), [S.prog, S.forward]);
  const cyc = Math.min(cycles - 1, Math.floor(S.playC));
  const ipc = code.length / cycles;
  const speedup = (code.length * 5) / cycles;

  useRaf((dt) => {
    if (running) {
      S.playC += Math.min(dt, 50) / 1000 * S.speed;
      if (S.playC >= cycles) S.playC = 0;
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    // Gantt chart
    const gx = 190, gy = 110, cw = 42, ch = 48;
    ctx.fillStyle = "#e9f6f3"; ctx.font = `13px ${FA}`;
    ctx.fillText("نمودار گانت خط لوله — هر ردیف یک دستور، هر ستون یک چرخه", gx, gy - 24);
    // cycle header
    ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`;
    for (let c = 0; c < cycles; c++) {
      ctx.fillStyle = c === cyc ? "#f2a83b" : "#8fbcb8";
      ctx.fillText(String(c), gx + c * cw + cw / 2 - 4, gy - 8);
    }
    // rows
    code.forEach((inst, i) => {
      ctx.fillStyle = "#e9f6f3"; ctx.font = `11px ${MONO}`;
      ctx.fillText(inst.name, 60, gy + i * ch + ch / 2 + 4);
      for (let c = 0; c < cycles; c++) {
        const x = gx + c * cw, y = gy + i * ch;
        const cell = grid[i][c];
        ctx.strokeStyle = "rgba(23,80,89,0.5)"; ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cw, ch);
        if (cell) {
          ctx.fillStyle = STAGE_COLORS[cell.stage] + (c === cyc ? "ff" : "66");
          ctx.beginPath(); ctx.roundRect(x + 3, y + 6, cw - 6, ch - 12, 6); ctx.fill();
          ctx.fillStyle = "#04191d"; ctx.font = `700 10px ${MONO}`; ctx.textAlign = "center";
          ctx.fillText(STAGES[cell.stage], x + cw / 2, y + ch / 2 + 3); ctx.textAlign = "left";
        } else if (c > i && c < Math.min(cycles, 99)) {
          // bubble / stall region (unfilled slot within a row's span)
        }
      }
    });
    // current-cycle playhead line
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx + cyc * cw + cw / 2, gy - 4); ctx.lineTo(gx + cyc * cw + cw / 2, gy + code.length * ch + 4); ctx.stroke();
    // pipeline diagram (5 boxes) with active stage at cyc
    const py = 420, bw = 130;
    ctx.fillStyle = "#8fbcb8"; ctx.font = `12px ${FA}`;
    ctx.fillText("مراحل خط لوله در چرخه جاری:", 190, py - 14);
    STAGES.forEach((st, si) => {
      const x = 190 + si * (bw + 14);
      const active = code.some((_, i) => grid[i][cyc]?.stage === si);
      const instHere = code.map((c2, i) => ({ c2, i })).filter(({ i }) => grid[i][cyc]?.stage === si).map(({ i }) => `I${i}`);
      ctx.fillStyle = active ? STAGE_COLORS[si] + "33" : "rgba(11,48,56,0.6)";
      ctx.strokeStyle = active ? STAGE_COLORS[si] : "#175059"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x, py, bw, 70, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = active ? STAGE_COLORS[si] : "#8fbcb8"; ctx.font = `700 15px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(st, x + bw / 2, py + 26);
      ctx.fillStyle = "#e9f6f3"; ctx.font = `11px ${MONO}`;
      ctx.fillText(instHere.join(",") || "—", x + bw / 2, py + 50);
      ctx.textAlign = "left";
      if (si < 4) { ctx.strokeStyle = "#2a7a80"; ctx.beginPath(); ctx.moveTo(x + bw + 2, py + 35); ctx.lineTo(x + bw + 12, py + 35); ctx.stroke(); }
    });
    frame.current++;
    if (frame.current % 10 === 0) force();
  }, true);

  const setProg = (i: number) => { S.prog = i; S.playC = 0; pushFeed("info", `برنامه «${PROGRAMS[i].fa}» بارگذاری شد.`); force(); };
  const setFwd = () => { S.forward = !S.forward; pushFeed(S.forward ? "ok" : "warn", S.forward ? "فورواردینگ فعال شد — داده‌ها از خروجی EX/MEM به جلوتر فرستاده می‌شوند." : "فورواردینگ خاموش — خطرهای RAW حباب ایجاد می‌کنند."); force(); };

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.playC = 0; pushFeed("info", "شبیه‌سازی از چرخه صفر آغاز شد."); }}
      simClock={`چرخه ${cyc + 1}/${cycles} · IPC=${fmt(ipc, 2)}`}
      hint="برنامه دارای وابستگی را با فورواردینگ خاموش اجرا کنید تا حباب‌ها را ببینید؛ سپس فورواردینگ را روشن کنید و کاهش چرخه‌ها را مقایسه کنید."
      protocol={[
        { label: "اجرای برنامه بدون خطر", done: S.prog === 1 || S.ev >= 1 },
        { label: "مشاهده خطر RAW و حباب", done: S.prog === 0 && !S.forward },
        { label: "فعال‌کردن فورواردینگ", done: S.forward && S.ev >= 2 },
        { label: "مقایسه IPC و سرعت‌افزایی", done: S.ev >= 3 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-4">
        <div>
          <div className="text-[12px] text-fog mb-1.5">برنامه</div>
          <div className="flex flex-col gap-1.5">
            {PROGRAMS.map((p, i) => (
              <button key={p.fa} onClick={() => setProg(i)} className="px-3 py-2 rounded-lg text-[11.5px] text-right border transition-all cursor-pointer"
                style={S.prog === i ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c215" } : { borderColor: "#175059", color: "#8fbcb8" }}>{p.fa}</button>
            ))}
          </div>
        </div>
        <button onClick={setFwd} className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer"
          style={S.forward ? { borderColor: "#a5d95c", color: "#a5d95c", background: "#a5d95c10" } : { borderColor: "#ff6f61", color: "#ff6f61", background: "#ff6f6110" }}>
          {S.forward ? "فورواردینگ: فعال" : "فورواردینگ: خاموش"}
        </button>
        <Slider label="سرعت شبیه‌سازی" value={S.speed} min={0.4} max={3} step={0.2} digits={1} unit="×" accent="#f2a83b" onChange={(x) => { S.speed = x; force(); }} />
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          خطر RAW وقتی است که دستوری ثبتی را می‌خواند که دستور قبلی هنوز ننوشته. LOAD→use حتی با فورواردینگ یک حباب لازم دارد.
        </div>
      </div>}
      chart={<LiveChart series={[sr("چرخه تجمعی", "#35d3c2", [{ x: 0, y: 0 }, { x: cyc + 1, y: cyc + 1 }]), sr("دستور تکمیل‌شده", "#f2a83b", code.map((_, i) => ({ x: grid[i].findIndex((c) => c?.stage === 4) + 1, y: i + 1 })).sort((a, b) => a.x - b.x))]} xLabel="چرخه" yLabel="دستور" height={230} yMin={0} />}
      table={{ headers: ["دستور", "شروع IF", "پایان WB", "حباب"], rows: code.map((c2, i) => { const st = grid[i].findIndex((c) => c?.stage === 0); const end = grid[i].findIndex((c) => c?.stage === 4); const ideal = i + 4; return [c2.name, st, end, Math.max(0, end - ideal)]; }) }}
      stats={[
        { label: "کل چرخه‌ها", value: `${cycles}`, color: "#f2a83b" },
        { label: "IPC (دستور/چرخه)", value: fmt(ipc, 2), color: "#35d3c2" },
        { label: "حباب‌های درج‌شده", value: `${stalls}`, color: stalls ? "#ff6f61" : "#a5d95c" },
        { label: "خطرهای RAW", value: `${hazards}`, color: "#b388ff" },
        { label: "سرعت‌افزایی", value: `${fmt(speedup, 2)}×`, color: "#a5d95c" },
        { label: "فورواردینگ", value: S.forward ? "فعال" : "خاموش", color: S.forward ? "#a5d95c" : "#ff6f61" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`5-stage pipeline: cycles=${cycles}, IPC=${fmt(ipc, 3)}, stalls=${stalls}, hazards=${hazards}`, `forwarding=${S.forward}, speedup=${fmt(speedup, 2)}x over non-pipelined`]} />
  );
}
