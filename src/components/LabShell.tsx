import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { SUBJECTS, type Experiment } from "../data/catalog";
import { describe, download, faDigits, fmtA } from "../lib/utils";
import {
  IconAr, IconBack, IconCheck, IconCode, IconCsv, IconDownload, IconError, IconExpand, IconEye,
  IconHeadset, IconInfo, IconJson, IconPause, IconPlay, IconReset, IconTrash, IconWarn,
} from "./icons";
import { Chip } from "./ui";

export type LabMode = "normal" | "vr" | "ar";

export interface FeedItem { time: string; level: "info" | "ok" | "warn" | "error"; msg: string }
export interface StatItem { label: string; value: string; sub?: string; color?: string }

interface Props {
  exp: Experiment;
  onBack: () => void;
  canvas: ReactNode;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  mode: LabMode;
  setMode: (m: LabMode) => void;
  running: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  simClock: string;
  hint: string;
  protocol: { label: string; done: boolean }[];
  controls: ReactNode;
  chart: ReactNode;
  table: { headers: string[]; rows: (string | number)[][] };
  stats: StatItem[];
  feed: FeedItem[];
  clearFeed: () => void;
  latexExtra?: string[];
}

function toCsv(headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /["\n,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

const texEsc = (s: string) => s.replace(/([&%$#_{}])/g, "\\$1");

function toLatex(exp: Experiment, stats: StatItem[], table: { headers: string[]; rows: (string | number)[][] }, extra?: string[]) {
  const L: string[] = [];
  L.push("\\documentclass[11pt]{article}");
  L.push("\\usepackage[a4paper,margin=2cm]{geometry}");
  L.push("\\usepackage{booktabs,array}");
  L.push(`\\title{Lab Report --- ${texEsc(exp.title)}}`);
  L.push("\\author{SciLab Immersive --- NGSS / IB / A-Level aligned}");
  L.push("\\begin{document}\\maketitle");
  L.push(`\\noindent Track: ${SUBJECTS[exp.subject].en} --- Field: ${texEsc(exp.field)}\\\\`);
  L.push(`Standards: ${texEsc(exp.ngss.join(", "))}; ${texEsc(exp.ib)}; ${texEsc(exp.alevel)}`);
  L.push("\\section*{Measured Quantities}");
  L.push("\\begin{tabular}{ll}\\toprule");
  L.push("\\textbf{Quantity} & \\textbf{Value} \\\\ \\midrule");
  for (const s of stats) L.push(`${texEsc(s.label)} & ${texEsc(s.value)} \\\\`);
  L.push("\\bottomrule\\end{tabular}");
  if (extra?.length) {
    L.push("\\section*{Analysis Notes}\\begin{itemize}");
    for (const e of extra) L.push(`\\item \\texttt{${texEsc(e)}}`);
    L.push("\\end{itemize}");
  }
  L.push("\\section*{Raw Data}");
  L.push(`\\begin{tabular}{${"c".repeat(table.headers.length)}}\\toprule`);
  L.push(table.headers.map((h) => `\\textbf{${texEsc(h)}}`).join(" & ") + " \\\\ \\midrule");
  for (const r of table.rows.slice(0, 40)) L.push(r.map((c) => texEsc(String(c))).join(" & ") + " \\\\");
  L.push("\\bottomrule\\end{tabular}");
  L.push("\\end{document}");
  return L.join("\n");
}

const FEED_META: Record<FeedItem["level"], { color: string; icon: ReactNode; fa: string }> = {
  info: { color: "#56b8ff", icon: <IconInfo c="w-3.5 h-3.5" />, fa: "راهنما" },
  ok: { color: "#a5d95c", icon: <IconCheck c="w-3.5 h-3.5" />, fa: "تأیید" },
  warn: { color: "#f2a83b", icon: <IconWarn c="w-3.5 h-3.5" />, fa: "هشدار رویه‌ای" },
  error: { color: "#ff6f61", icon: <IconError c="w-3.5 h-3.5" />, fa: "خطا" },
};

export function LabShell(p: Props) {
  const [fs, setFs] = useState(false);
  const [col, setCol] = useState(1);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const copyRef = useRef<HTMLCanvasElement | null>(null);
  const sub = SUBJECTS[p.exp.subject];
  const doneCount = p.protocol.filter((x) => x.done).length;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        p.onToggleRun();
      }
      if (e.key === "r" || e.key === "R") p.onReset();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (p.mode !== "vr") return;
    let raf = 0;
    const loop = () => {
      const src = p.canvasRef.current, dst = copyRef.current;
      if (src && dst) {
        const ctx = dst.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, dst.width, dst.height);
          ctx.drawImage(src, 0, 0);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [p.mode]);

  const toggleFs = () => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
    setFs(!fs);
  };

  const statNums = p.table.rows.map((r) => Number(r[col])).filter((v) => isFinite(v));
  const ds = describe(statNums);

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button onClick={p.onBack} className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-edge text-fog hover:text-snow hover:border-edge2 transition-colors text-[12.5px] cursor-pointer">
          <IconBack c="w-4 h-4" />
          بازگشت به کاتالوگ
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2 h-2 rounded-full pulse-dot shrink-0" style={{ background: sub.color }} />
          <h1 className="font-display text-2xl text-snow truncate">{p.exp.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mr-auto">
          {p.exp.ngss.map((n) => <Chip key={n} color="#35d3c2">NGSS {n}</Chip>)}
          <Chip color="#f2a83b">{p.exp.ib}</Chip>
          <Chip color="#56b8ff">{p.exp.alevel}</Chip>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_330px] gap-4 items-start">
        {/* stage column */}
        <div className="min-w-0">
          <div
            ref={stageRef}
            className="relative rounded-xl border bg-deep overflow-hidden"
            style={{ borderColor: `${sub.color}33`, boxShadow: `0 0 0 1px ${sub.color}14, 0 18px 50px -18px ${sub.color}30` }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] z-20 pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${sub.color}, transparent)`, opacity: 0.7 }} />
            {p.mode === "ar" && (
              <img
                src="https://ipfs.io/ipfs/QmQzJ6C6Y6hE3d6m7vW8xXyYzZ1aB2cD3eF4gH5iJ6kL7m/arlab.jpg"
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-45"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            {p.mode === "vr" ? (
              <div className="relative flex items-stretch justify-center gap-2 bg-black p-3" dir="ltr">
                {[{ off: 6, ref: p.canvasRef, node: p.canvas }, { off: -6, ref: null, node: null }].length && (
                  <>
                    <div className="relative rounded-full overflow-hidden border-4 border-panel2 bg-abyss w-1/2 aspect-square max-h-[520px] flex items-center justify-center">
                      <div className="w-[150%]" style={{ transform: "translateX(3%)" }}>{p.canvas}</div>
                      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 50%, transparent 62%, rgba(0,0,0,0.9) 78%)" }} />
                    </div>
                    <div className="relative rounded-full overflow-hidden border-4 border-panel2 bg-abyss w-1/2 aspect-square max-h-[520px] flex items-center justify-center">
                      <canvas ref={copyRef} width={960} height={560} className="w-[150%] block" style={{ transform: "translateX(-3%)" }} />
                      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 50%, transparent 62%, rgba(0,0,0,0.9) 78%)" }} />
                    </div>
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-mono text-fog bg-black/60 px-3 py-1.5 rounded-full">
                      <IconHeadset c="w-3.5 h-3.5 text-sky" /> STEREO · parallax ±۳٪
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="relative">
                {p.canvas}
                {p.mode === "normal" && <div className="scan-line" />}
                {p.mode === "ar" && (
                  <>
                    <div className="absolute top-3 right-3 flex items-center gap-2 text-[10px] font-mono text-lime bg-black/55 px-3 py-1.5 rounded-full border border-lime/30" dir="ltr">
                      <IconAr c="w-3.5 h-3.5" /> AR PASS-THROUGH · anchor: bench
                    </div>
                    <div className="absolute inset-0 pointer-events-none opacity-25" style={{ backgroundImage: "linear-gradient(rgba(165,217,92,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(165,217,92,0.25) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
                  </>
                )}
              </div>
            )}

            {/* stage toolbar */}
            <div className="relative z-10 flex flex-wrap items-center gap-2 px-3 py-2.5 border-t border-edge/70 bg-abyss/70">
              <button onClick={p.onToggleRun}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-bold transition-all active:scale-95 cursor-pointer"
                style={{ background: p.running ? "#f2a83b" : "#35d3c2", color: "#04191d" }}>
                {p.running ? <IconPause c="w-4 h-4" /> : <IconPlay c="w-4 h-4" />}
                {p.running ? "توقف" : "اجرا"}
              </button>
              <button onClick={p.onReset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] border border-edge text-fog hover:text-snow hover:border-edge2 transition-colors cursor-pointer">
                <IconReset c="w-3.5 h-3.5" />
                بازنشانی
              </button>
              <span className="num text-[11.5px] px-2.5 py-1.5 rounded-lg bg-panel border border-edge text-teal">{p.simClock}</span>
              <div className="mr-auto flex items-center gap-1.5">
                {(["normal", "vr", "ar"] as LabMode[]).map((m) => (
                  <button key={m} onClick={() => p.setMode(m)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer"
                    style={p.mode === m
                      ? { borderColor: m === "vr" ? "#56b8ff" : m === "ar" ? "#a5d95c" : "#2a7a80", color: m === "vr" ? "#56b8ff" : m === "ar" ? "#a5d95c" : "#e9f6f3", background: m === "vr" ? "#56b8ff14" : m === "ar" ? "#a5d95c14" : "#0f3d46" }
                      : { borderColor: "#175059", color: "#8fbcb8" }}>
                    {m === "normal" ? <IconEye c="w-3.5 h-3.5" /> : m === "vr" ? <IconHeadset c="w-3.5 h-3.5" /> : <IconAr c="w-3.5 h-3.5" />}
                    {m === "normal" ? "عادی" : m.toUpperCase()}
                  </button>
                ))}
                <button onClick={toggleFs} className="p-2 rounded-lg border border-edge text-fog hover:text-snow transition-colors cursor-pointer" title="تمام‌صفحه">
                  <IconExpand c="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* hint + protocol */}
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-edge bg-panel/70 p-4">
              <div className="flex items-center gap-2 mb-2 text-[11px] font-mono tracking-[0.2em] text-teal">PROTOCOL — پروتکل آزمایش</div>
              <div className="h-1.5 rounded-full bg-deep mb-3 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(doneCount / p.protocol.length) * 100}%`, background: sub.color }} />
              </div>
              <ul className="space-y-1.5">
                {p.protocol.map((st, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-[12.5px]">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full border text-[10px] shrink-0 transition-colors"
                      style={st.done ? { borderColor: "#a5d95c", background: "#a5d95c1f", color: "#a5d95c" } : { borderColor: "#175059", color: "#8fbcb8" }}>
                      {st.done ? <IconCheck c="w-3 h-3" /> : faDigits(i + 1)}
                    </span>
                    <span className={st.done ? "text-snow" : "text-fog"}>{st.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-edge bg-panel/70 p-4">
              <div className="flex items-center gap-2 mb-2 text-[11px] font-mono tracking-[0.2em]" style={{ color: sub.color }}>FIELD NOTE</div>
              <p className="text-[12.5px] text-fog leading-7">{p.hint}</p>
              <div className="mt-3 pt-3 border-t border-edge/60 text-[11px] text-fog flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: sub.color }} />
                کلید Space: اجرا/توقف · کلید R: بازنشانی
              </div>
            </div>
          </div>
        </div>

        {/* control column */}
        <aside className="rounded-xl border border-edge bg-panel/70 p-4 lg:sticky lg:top-20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono tracking-[0.2em] text-fog">PARAMETERS — پارامترها</span>
            <span className="text-[10.5px] num px-2 py-0.5 rounded" style={{ background: `${sub.color}16`, color: sub.color, border: `1px solid ${sub.color}40` }}>{sub.fa}</span>
          </div>
          {p.controls}
        </aside>
      </div>

      {/* chart */}
      <section className="mt-5 rounded-xl border border-edge bg-panel/70 p-5">
        <div className="text-[11px] font-mono tracking-[0.2em] text-fog mb-3">LIVE CHART — نمودار زنده</div>
        {p.chart}
      </section>

      {/* table + stats */}
      <section className="mt-5 grid lg:grid-cols-[1.2fr_1fr] gap-4">
        <div className="rounded-xl border border-edge bg-panel/70 p-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono tracking-[0.2em] text-fog">DATA TABLE — جدول داده</span>
            <label className="text-[11px] text-fog flex items-center gap-2">
              ستون آمار:
              <select
                className="rounded-md bg-deep border border-edge text-snow text-[11px] px-2 py-1 outline-none"
                value={col}
                onChange={(e) => setCol(parseInt(e.target.value, 10))}
              >
                {p.table.headers.map((h, i) => (
                  <option key={h + i} value={i}>{h}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="overflow-x-auto max-h-[340px] overflow-y-auto rounded-lg border border-edge/60" dir="ltr">
            <table className="w-full text-[11.5px]">
              <thead className="sticky top-0 bg-panel2">
                <tr>
                  {p.table.headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-mono text-[10.5px] text-fog whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.table.rows.length === 0 && (
                  <tr><td colSpan={p.table.headers.length} className="px-3 py-6 text-center text-fog text-[11px]" dir="rtl">هنوز داده‌ای ثبت نشده — آزمایش را اجرا کنید</td></tr>
                )}
                {[...p.table.rows].reverse().map((r, i) => (
                  <tr key={i} className={i % 2 ? "bg-deep/40" : ""}>
                    {r.map((c, j) => (
                      <td key={j} className="px-3 py-1.5 font-mono text-[10.5px] text-snow whitespace-nowrap">{typeof c === "number" ? fmtA(c) : c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ds.n > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              {([["n", ds.n], ["میانگین", ds.mean], ["انحراف معیار", ds.sd], ["SEM", ds.sem], ["بازه", ds.max - ds.min]] as [string, number][]).map(([l, v]) => (
                <div key={l} className="rounded-lg border border-edge/60 bg-deep/50 px-2 py-2">
                  <div className="text-[10px] text-fog mb-1">{l}</div>
                  <div className="num text-[12px] text-teal">{isFinite(v) ? fmtA(v) : "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-edge bg-panel/70 p-5">
          <div className="text-[11px] font-mono tracking-[0.2em] text-fog mb-3">READOUTS — خوانش‌ها</div>
          <div className="grid grid-cols-2 gap-2.5">
            {p.stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-edge/60 bg-deep/50 p-3 hover:border-edge2 transition-colors">
                <div className="text-[10.5px] text-fog mb-1">{s.label}</div>
                <div className="text-[15px] font-bold leading-6" style={{ color: s.color ?? "#e9f6f3" }}>{s.value}</div>
                {s.sub && <div className="text-[10px] text-fog mt-0.5">{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* feed + export */}
      <section className="mt-5 grid lg:grid-cols-[1.2fr_1fr] gap-4 pb-4">
        <div className="rounded-xl border border-edge bg-panel/70 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono tracking-[0.2em] text-fog">ANALYSIS LOG — بازخورد تحلیلی و خطاهای رویه‌ای</span>
            <button onClick={p.clearFeed} className="flex items-center gap-1.5 text-[11px] text-fog hover:text-coral transition-colors cursor-pointer">
              <IconTrash c="w-3.5 h-3.5" />
              پاک‌کردن
            </button>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pl-1">
            {p.feed.length === 0 && <div className="text-[11.5px] text-fog py-4 text-center">لاگ خالی است</div>}
            {p.feed.map((f, i) => {
              const m = FEED_META[f.level];
              return (
                <div key={`${f.time}-${i}`} className={`flex items-start gap-2.5 rounded-lg border border-edge/50 bg-deep/40 p-2.5 ${i === 0 ? "ticker-in" : ""}`}>
                  <span className="mt-0.5 shrink-0" style={{ color: m.color }}>{m.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${m.color}18`, color: m.color }}>{m.fa}</span>
                      <span className="num text-[10px] text-fog">{f.time}</span>
                    </div>
                    <p className="text-[12px] text-snow leading-6">{f.msg}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-panel/70 p-5">
          <div className="text-[11px] font-mono tracking-[0.2em] text-fog mb-3">REPORT — خروجی گزارش علمی</div>
          <p className="text-[12px] text-fog leading-6 mb-4">
            گزارش از داده‌های واقعی همین جلسه ساخته می‌شود: جدول کامل، خوانش‌ها و یادداشت‌های تحلیلی.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => download(`scilab-${p.exp.id}.csv`, toCsv(p.table.headers, p.table.rows), "text/csv")}
              className="flex flex-col items-center gap-1.5 py-3 rounded-lg border border-edge text-fog hover:text-teal hover:border-teal/50 transition-colors text-[11px] cursor-pointer">
              <IconCsv c="w-5 h-5" /> CSV
            </button>
            <button onClick={() => download(`scilab-${p.exp.id}-report.tex`, toLatex(p.exp, p.stats, p.table, p.latexExtra), "application/x-tex")}
              className="flex flex-col items-center gap-1.5 py-3 rounded-lg border border-edge text-fog hover:text-amber hover:border-amber/50 transition-colors text-[11px] cursor-pointer">
              <IconCode c="w-5 h-5" /> LaTeX
            </button>
            <button onClick={() => download(`scilab-${p.exp.id}.json`, JSON.stringify({ experiment: p.exp.id, title: p.exp.title, stats: p.stats, table: p.table, log: p.feed }, null, 2), "application/json")}
              className="flex flex-col items-center gap-1.5 py-3 rounded-lg border border-edge text-fog hover:text-sky hover:border-sky/50 transition-colors text-[11px] cursor-pointer">
              <IconJson c="w-5 h-5" /> JSON
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10.5px] text-fog">
            <IconDownload c="w-3.5 h-3.5" />
            {faDigits(p.table.rows.length)} رکورد · {faDigits(p.feed.length)} رویداد ثبت‌شده
          </div>
        </div>
      </section>
    </div>
  );
}
