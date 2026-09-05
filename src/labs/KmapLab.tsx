import { useEffect, useMemo, useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { fmt, faDigits, useForce } from "../lib/utils";
import { bg, FA, MONO, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };
type Cell = 0 | 1 | 2; // 0, 1, X

/* Gray-code order for rows (AB) and cols (CD) */
const GRAY = [0, 1, 3, 2];
const abcd = (i: number) => [(i >> 3) & 1, (i >> 2) & 1, (i >> 1) & 1, i & 1];

interface Implicant { mask: number; val: number; cover: number[] }

/* Quine-McCluskey minimization */
function qm(minterms: number[], dontcares: number[]): { primes: Implicant[]; chosen: Implicant[] } {
  const combine = (a: Implicant, b: Implicant): Implicant | null => {
    if (a.mask !== b.mask) return null;
    const diff = a.val ^ b.val;
    if ((diff & (diff - 1)) !== 0 || diff === 0) return null; // exactly one bit differs
    const mask = a.mask | diff;
    return { mask, val: a.val & ~mask, cover: [...new Set([...a.cover, ...b.cover])] };
  };
  let groups: Implicant[] = [...minterms, ...dontcares]
    .filter((v, i, s) => s.indexOf(v) === i)
    .map((v) => ({ mask: 0, val: v, cover: [v] }));
  const primes: Implicant[] = [];
  while (groups.length) {
    const used = new Set<Implicant>();
    const next: Implicant[] = [];
    for (let i = 0; i < groups.length; i++)
      for (let j = i + 1; j < groups.length; j++) {
        const c = combine(groups[i], groups[j]);
        if (c) { used.add(groups[i]); used.add(groups[j]); next.push(c); }
      }
    for (const g of groups) if (!used.has(g)) primes.push(g);
    // dedupe next
    const seen = new Set<string>();
    groups = next.filter((g) => { const k = `${g.mask}:${g.val}`; if (seen.has(k)) return false; seen.add(k); return true; });
  }
  /* cover required minterms: essential first, then greedy */
  const required = minterms.filter((v, i, s) => s.indexOf(v) === i);
  const chosen: Implicant[] = [];
  const covered = new Set<number>();
  let progress = true;
  while (covered.size < required.length && progress) {
    progress = false;
    // essential: minterm covered by exactly one prime
    for (const m of required) {
      if (covered.has(m)) continue;
      const covering = primes.filter((p) => !chosen.includes(p) && p.cover.includes(m));
      if (covering.length === 1) { chosen.push(covering[0]); covering[0].cover.forEach((v) => covered.add(v)); progress = true; }
    }
    if (!progress) {
      const uncovered = required.filter((m) => !covered.has(m));
      if (!uncovered.length) break;
      const best = primes.filter((p) => !chosen.includes(p))
        .sort((a, b) => b.cover.filter((v) => uncovered.includes(v)).length - a.cover.filter((v) => uncovered.includes(v)).length)[0];
      if (best) { chosen.push(best); best.cover.forEach((v) => covered.add(v)); progress = true; }
    }
  }
  return { primes, chosen };
}

const termStr = (p: Implicant): string => {
  const vars = ["A", "B", "C", "D"];
  let s = "";
  for (let b = 0; b < 4; b++) {
    if (p.mask & (8 >> b)) continue;
    const bit = (p.val >> (3 - b)) & 1;
    s += bit ? vars[b] : vars[b] + "′";
  }
  return s || "1";
};

const PRESETS: { fa: string; cells: Cell[] }[] = [
  { fa: "رقم نقلی جمع‌کننده", cells: Array.from({ length: 16 }, (_, i) => { const [a, b, c] = abcd(i); return (a & b) | (b & c) | (a & c) ? 1 : 0; }) as Cell[] },
  { fa: "تابع اکثریت", cells: Array.from({ length: 16 }, (_, i) => { const [a, b, c] = abcd(i); return a + b + c >= 2 ? 1 : 0; }) as Cell[] },
  { fa: "زوجیت زوج", cells: Array.from({ length: 16 }, (_, i) => { const [a, b, c, d] = abcd(i); return (a + b + c + d) % 2 === 0 ? 1 : 0; }) as Cell[] },
];

const GROUP_COLORS = ["#35d3c2", "#f2a83b", "#b388ff", "#56b8ff", "#a5d95c", "#ff6f61"];

export function KmapLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ cells: [...PRESETS[0].cells] as Cell[], ev: 0, feed: [{ time: "#0", level: "info", msg: "نقشه کارنو ۴ متغیره — روی خانه‌ها کلیک کنید (۰→۱→X) تا تابع را بسازید؛ حل‌کننده Quine-McCluskey فرم کمینه SOP را با گروه‌بندی بصری استخراج می‌کند." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [nVars, setNVars] = useState<3 | 4>(4);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const n = nVars === 4 ? 16 : 8;
  const minterms = S.cells.slice(0, n).map((c, i) => (c === 1 ? i : -1)).filter((i) => i >= 0);
  const dontcares = S.cells.slice(0, n).map((c, i) => (c === 2 ? i : -1)).filter((i) => i >= 0);
  const { primes, chosen } = useMemo(() => qm(minterms, dontcares), [S.cells.join(","), nVars]);
  const sop = chosen.length ? chosen.map(termStr).join(" + ") : (minterms.length ? "0" : "0");

  const setCell = (i: number) => { S.cells[i] = ((S.cells[i] + 1) % 3) as Cell; force(); };
  const loadPreset = (idx: number) => { S.cells = [...PRESETS[idx].cells]; setNVars(4); pushFeed("info", `تابع «${PRESETS[idx].fa}» بارگذاری شد — ${PRESETS[idx].cells.filter((c) => c === 1).length} مینترم.`); };
  const solve = () => {
    pushFeed("ok", `کمینه‌سازی شد: F = ${sop || "0"} — ${chosen.length} جمله در برابر ${minterms.length} مینترم خام.`);
    force();
  };

  const draw = () => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const rows = nVars === 4 ? 4 : 2, cols = 4;
    const gx = 130, gy = 130, cw = 92, ch = 84;
    // group overlays (drawn first, behind cells)
    chosen.forEach((p, gi) => {
      const col = GROUP_COLORS[gi % GROUP_COLORS.length];
      const cellsIn = p.cover.filter((m) => m < n && S.cells[m] !== 0);
      cellsIn.forEach((m) => {
        const r = nVars === 4 ? GRAY.indexOf((m >> 2) & 3) : GRAY.indexOf((m >> 2) & 3) % 2;
        const c = GRAY.indexOf(m & 3);
        ctx.fillStyle = col + "22";
        ctx.strokeStyle = col + "88";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(gx + c * cw + 6, gy + r * ch + 6, cw - 12, ch - 12, 10);
        ctx.fill(); ctx.stroke();
      });
    });
    // grid
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = (GRAY[r] << 2) | GRAY[c];
        if (i >= n) continue;
        const x = gx + c * cw, y = gy + r * ch;
        ctx.fillStyle = S.cells[i] === 1 ? "rgba(53,211,194,0.14)" : S.cells[i] === 2 ? "rgba(143,188,184,0.08)" : "rgba(11,48,56,0.6)";
        ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(x + 3, y + 3, cw - 6, ch - 6, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = S.cells[i] === 1 ? "#35d3c2" : S.cells[i] === 2 ? "#f2a83b" : "#8fbcb8";
        ctx.font = `700 26px ${MONO}`; ctx.textAlign = "center";
        ctx.fillText(S.cells[i] === 2 ? "X" : String(S.cells[i]), x + cw / 2, y + ch / 2 + 9);
        ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`;
        ctx.fillText(`m${i}`, x + 12, y + 16);
        ctx.textAlign = "left";
      }
    // axis labels
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 14px ${MONO}`;
    ctx.fillText(nVars === 4 ? "AB \\ CD" : "A \\ BC", gx - 118, gy - 14);
    for (let c = 0; c < cols; c++) {
      const [c1, c0] = [(GRAY[c] >> 1) & 1, GRAY[c] & 1];
      ctx.fillText(`${c1}${c0}`, gx + c * cw + cw / 2 - 10, gy - 14);
    }
    for (let r = 0; r < rows; r++) {
      const code = nVars === 4 ? GRAY[r] : GRAY[r];
      const s = nVars === 4 ? `${(code >> 1) & 1}${code & 1}` : `${code & 1}`;
      ctx.fillText(s, gx - 30, gy + r * ch + ch / 2 + 5);
    }
    // SOP result panel
    ctx.fillStyle = "rgba(4,25,29,0.8)"; ctx.strokeStyle = "rgba(42,122,128,0.9)";
    ctx.beginPath(); ctx.roundRect(560, 130, 340, 130, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("فرم کمینه مجموعِ حاصل‌ضرب‌ها (SOP)", 578, 154);
    ctx.fillStyle = "#35d3c2"; ctx.font = `700 17px ${MONO}`;
    const lines: string[] = []; let cur = "F = ";
    for (const t of (sop || "0").split(" + ")) {
      if ((cur + t).length > 24) { lines.push(cur); cur = "    " + t + " + "; }
      else cur += t + " + ";
    }
    lines.push(cur.replace(/ \+ $/, ""));
    lines.slice(0, 4).forEach((l, i) => ctx.fillText(l, 578, 182 + i * 22));
    // legend
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("خانه‌ها: ۰ / ۱ / بی‌تفاوت (X) — کلیک کنید", 560, 300);
    chosen.forEach((p, gi) => {
      ctx.fillStyle = GROUP_COLORS[gi % GROUP_COLORS.length];
      ctx.fillRect(560, 318 + gi * 22, 14, 14);
      ctx.fillStyle = "#e9f6f3"; ctx.font = `11px ${MONO}`;
      ctx.fillText(termStr(p), 582, 330 + gi * 22);
    });
  };
  useEffect(draw);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={false} onToggleRun={solve}
      onReset={() => { S.cells = Array(16).fill(0) as Cell[]; pushFeed("info", "نقشه پاک شد."); }}
      simClock={`${minterms.length} مینترم → ${chosen.length} جمله`}
      hint="با کلیک روی هر خانه بین ۰، ۱ و X جابه‌جا شوید؛ گروه‌های ۲، ۴ و ۸تایی به‌صورت بصری رنگ‌آمیزی می‌شوند و جمله‌های ضروری خودکار استخراج می‌شوند."
      protocol={[
        { label: "ساخت تابع دلخواه با کلیک", done: S.ev >= 1 || minterms.length > 0 },
        { label: "کمینه‌سازی خودکار", done: S.ev >= 2 },
        { label: "استفاده از خانه بی‌تفاوت (X)", done: S.cells.slice(0, n).includes(2) },
        { label: "بارگذاری تابع از پیش‌تعریف‌شده", done: S.ev >= 3 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-4">
        <div>
          <div className="text-[12px] text-fog mb-1.5">تعداد متغیرها</div>
          <div className="flex gap-1.5">
            {([3, 4] as const).map((v) => (
              <button key={v} onClick={() => { setNVars(v); force(); }} className="flex-1 px-2 py-2 rounded-lg text-[12px] border transition-all cursor-pointer"
                style={nVars === v ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c215" } : { borderColor: "#175059", color: "#8fbcb8" }}>{faDigits(v)} متغیره</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[12px] text-fog mb-1.5">توابع نمونه</div>
          <div className="flex flex-col gap-1.5">
            {PRESETS.map((p, i) => (
              <button key={p.fa} onClick={() => loadPreset(i)} className="px-3 py-2 rounded-lg text-[11.5px] text-right border border-edge/70 text-fog hover:text-teal hover:border-teal/50 transition-colors cursor-pointer">{p.fa}</button>
            ))}
          </div>
        </div>
        <button onClick={solve} className="w-full px-4 py-3 rounded-lg font-bold text-sm cursor-pointer transition-all active:scale-95" style={{ background: "#35d3c2", color: "#04191d" }}>
          کمینه‌سازی Quine-McCluskey
        </button>
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          خانه‌های مجاور فقط در <b className="text-teal">یک بیت</b> تفاوت دارند (کد گری)؛ گروه ۲ᵏ تایی، k متغیر را حذف می‌کند.
        </div>
      </div>}
      chart={<LiveChart series={[sr("تعداد جمله‌ها", "#35d3c2", [{ x: 0, y: minterms.length }, { x: 1, y: chosen.length }]), sr("مینترم خام", "#f2a83b", [{ x: 0, y: minterms.length }, { x: 0.5, y: minterms.length }])]} xLabel="—" yLabel="تعداد" height={230} yMin={0} />}
      table={{ headers: ["m", "ABCD", "مقدار", "جمله پوشاننده"], rows: S.cells.slice(0, n).map((c, i) => { const [a, b, cc, d] = abcd(i); const cov = chosen.findIndex((p) => p.cover.includes(i)); return [`m${i}`, `${a}${b}${cc}${d}`, c === 2 ? "X" : String(c), cov >= 0 ? termStr(chosen[cov]) : "—"]; }) }}
      stats={[
        { label: "فرم کمینه SOP", value: sop || "0", color: "#35d3c2" },
        { label: "تعداد مینترم‌ها", value: `${minterms.length}`, color: "#f2a83b" },
        { label: "جمله‌های ضروری", value: `${chosen.length}`, color: "#b388ff" },
        { label: "خانه‌های بی‌تفاوت", value: `${dontcares.length}`, color: "#e9f6f3" },
        { label: " implicant‌های اولیه", value: `${primes.length}`, color: "#56b8ff" },
        { label: "صرفه‌جویی", value: minterms.length ? `${fmt((1 - chosen.length / Math.max(minterms.length, 1)) * 100, 0)}٪` : "—", color: "#a5d95c" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`K-map minimization (${nVars}-var)`, `F = ${sop || "0"}`, `minterms=${minterms.length}, primes=${primes.length}, essential=${chosen.length}`]} />
  );
}
