import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { bioScene as bg, glow, hex2rgb, hud, FA, MONO, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== Mitosis ===================== */
const PHASES = ["بین‌فاز", "پروفاز", "متافاز", "آنافاز", "تلوفاز"];
const PH_COLORS = ["#8fbcb8", "#f2a83b", "#35d3c2", "#ff6f61", "#b388ff"];
export function MitosisLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mkCells = () => Array.from({ length: 24 }, (_, i) => {
    const r = Math.random();
    const ph = r < 0.62 ? 0 : r < 0.74 ? 1 : r < 0.83 ? 2 : r < 0.92 ? 3 : 4;
    return { x: 90 + (i % 6) * 130 + Math.random() * 40, y: 110 + Math.floor(i / 6) * 92 + Math.random() * 30, ph, picked: 0 };
  });
  const S = useRef({ cells: mkCells(), counts: [0, 0, 0, 0, 0], field: 1, ev: 0, feed: [{ time: "#0", level: "info", msg: "نوک ریشه پیاز زیر میکروسکوپ — روی هر سلول کلیک کنید و فازش را بشمارید. شاخص میتوزی = سلول‌های در حال تقسیم / کل." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const total = S.counts.reduce((a, b) => a + b, 0);
  const dividing = total - S.counts[0];
  const mi = total > 0 ? (dividing / total) * 100 : 0;

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 960;
    const py = ((e.clientY - rect.top) / rect.height) * 560;
    for (const c of S.cells) {
      if (Math.hypot(c.x - px, c.y - py) < 30) {
        S.counts[c.ph]++;
        c.picked++;
        force();
        return;
      }
    }
  };
  const newField = () => {
    S.cells = mkCells();
    S.field++;
    pushFeed("info", `میدان دید شماره ${S.field} — سلول‌های جدید آماده شمارش‌اند.`);
  };

  const draw = () => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const arMode = mode === "ar";
    // microscope field: warm light pool + double lens ring
    if (!arMode) glow(ctx, 480, 290, 330, [190, 230, 200], 0.1);
    const pool = ctx.createRadialGradient(480, 290, 40, 480, 290, 262);
    pool.addColorStop(0, "rgba(190,235,205,0.10)");
    pool.addColorStop(0.8, "rgba(120,190,150,0.04)");
    pool.addColorStop(1, "rgba(10,40,30,0.10)");
    ctx.fillStyle = pool;
    ctx.beginPath(); ctx.arc(480, 290, 260, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(46,120,96,0.7)"; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(480, 290, 260, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(140,225,175,0.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(480, 290, 250, 0, Math.PI * 2); ctx.stroke();
    // lens vignette
    if (!arMode) {
      const vg = ctx.createRadialGradient(480, 290, 170, 480, 290, 300);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(2,12,9,0.55)");
      ctx.fillStyle = vg;
      ctx.beginPath(); ctx.arc(480, 290, 300, 0, Math.PI * 2); ctx.fill();
    }
    for (const c of S.cells) {
      if (!arMode) glow(ctx, c.x, c.y, 40, hex2rgb(PH_COLORS[c.ph]), c.picked ? 0.35 : 0.16);
      const cg = ctx.createRadialGradient(c.x - 6, c.y - 6, 3, c.x, c.y, 24);
      cg.addColorStop(0, "rgba(30,74,66,0.95)");
      cg.addColorStop(1, "rgba(10,42,38,0.92)");
      ctx.fillStyle = cg;
      ctx.strokeStyle = PH_COLORS[c.ph];
      ctx.lineWidth = c.picked ? 3 : 2;
      ctx.beginPath(); ctx.arc(c.x, c.y, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = PH_COLORS[c.ph]; ctx.lineWidth = 1.5;
      if (c.ph === 0) { ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.stroke(); }
      else if (c.ph === 1) { for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(c.x - 8 + k * 4, c.y - 8); ctx.bezierCurveTo(c.x - 12 + k * 4, c.y, c.x - 4 + k * 4, c.y, c.x - 8 + k * 4, c.y + 8); ctx.stroke(); } }
      else if (c.ph === 2) { ctx.beginPath(); ctx.moveTo(c.x - 12, c.y); ctx.lineTo(c.x + 12, c.y); ctx.stroke(); for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(c.x + k * 5, c.y - 5); ctx.lineTo(c.x + k * 5, c.y + 5); ctx.stroke(); } }
      else if (c.ph === 3) { for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(c.x - 12, c.y); ctx.lineTo(c.x - 5, c.y + k * 3); ctx.moveTo(c.x + 12, c.y); ctx.lineTo(c.x + 5, c.y + k * 3); ctx.stroke(); } }
      else { ctx.beginPath(); ctx.arc(c.x - 8, c.y, 6, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(c.x + 8, c.y, 6, 0, Math.PI * 2); ctx.stroke(); }
      if (c.picked) { ctx.fillStyle = "#a5d95c"; ctx.beginPath(); ctx.arc(c.x + 18, c.y - 18, 5, 0, Math.PI * 2); ctx.fill(); }
    }
    hud(ctx, 760, 140, 170, 280, mode === "ar");
    ctx.font = `11px ${FA}`;
    PHASES.forEach((p, i) => {
      ctx.fillStyle = PH_COLORS[i];
      ctx.fillRect(774, 162 + i * 34, 10, 10);
      ctx.fillText(p, 790, 171 + i * 34);
      ctx.font = `12px ${MONO}`; ctx.fillText(`${S.counts[i]}`, 880, 171 + i * 34); ctx.font = `11px ${FA}`;
    });
    ctx.fillStyle = "#e9f6f3"; ctx.font = `12px ${FA}`;
    ctx.fillText(`میدان ${S.field}`, 774, 402);
  };
  draw();

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={false}
      onToggleRun={() => pushFeed("info", "روی سلول‌ها کلیک کنید تا فازشان شمرده شود.")}
      onReset={() => { S.cells = mkCells(); S.counts = [0, 0, 0, 0, 0]; S.field = 1; pushFeed("info", "شمارش از سر گرفته شد."); }}
      simClock={`شمرده: ${total} — شاخص ${fmt(mi, 1)}٪`}
      hint="حداقل ۴۰ سلول در دو میدان بشمارید؛ شاخص میتوزی واقعی ریشه پیاز حدود ۱۰ تا ۲۰٪ است. مدت هر فاز ∝ تعداد سلول‌هایش."
      protocol={[
        { label: "شمارش ۲۰ سلول", done: total >= 20 },
        { label: "شمارش در میدان دوم", done: S.field >= 2 },
        { label: "محاسبه شاخص میتوزی", done: total >= 30 },
        { label: "تخمین مدت نسبی فازها", done: total >= 40 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto cursor-pointer" onClick={onClick} />}
      controls={<div className="space-y-5">
        <button onClick={newField} className="w-full px-4 py-3 rounded-lg font-bold text-sm transition-all active:scale-95 cursor-pointer" style={{ background: "#a5d95c", color: "#04191d" }}>
          میدان دید بعدی
        </button>
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          راهنما: هسته یکپارچه = بین‌فاز · کروموزوم‌های متراکم = پروفاز · ردیف استوایی = متافاز · کشش به قطبین = آنافاز · دو هسته = تلوفاز
        </div>
        <button onClick={() => { S.cells.forEach((c) => { S.counts[c.ph]++; c.picked++; }); force(); pushFeed("ok", "همه سلول‌های این میدان به‌صورت خودکار شمرده شدند."); }}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer"
          style={{ borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c20f" }}>
          شمارش خودکار میدان
        </button>
      </div>}
      chart={<LiveChart series={[sr("فراوانی فازها", "#35d3c2", PHASES.map((p, i) => ({ x: i, y: S.counts[i] })))]} xLabel="فاز (۰=بین‌فاز … ۴=تلوفاز)" yLabel="تعداد" height={230} yMin={0} />}
      table={{ headers: ["فاز", "تعداد", "درصد", "مدت نسبی (از ۷۲۰ دقیقه)"], rows: PHASES.map((p, i) => [p, S.counts[i], total ? Number(((S.counts[i] / total) * 100).toFixed(1)) : 0, total ? Number(((S.counts[i] / total) * 720).toFixed(0)) : 0]) }}
      stats={[
        { label: "شاخص میتوزی", value: `${fmt(mi, 1)} ٪`, color: "#a5d95c", sub: "در حال تقسیم/کل" },
        { label: "سلول‌های شمرده", value: `${total}`, color: "#e9f6f3" },
        { label: "در حال تقسیم", value: `${dividing}`, color: "#35d3c2" },
        { label: "بین‌فاز", value: total ? `${fmt((S.counts[0] / total) * 100, 1)} ٪` : "—", color: "#8fbcb8" },
        { label: "مدت تخمینی متافاز", value: total ? `${fmt((S.counts[2] / total) * 720, 0)} دقیقه` : "—", color: "#f2a83b" },
        { label: "میدان‌ها", value: `${S.field}`, color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Mitotic index = dividing/total = ${fmt(mi, 2)}\\% (n=${total})`, `Phase durations approx proportional to counts`]} />
  );
}

/* ===================== Lotka-Volterra ===================== */
export function LotkaLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ a: 0.6, b: 0.05, c: 0.4, d: 0.04, x0: 40, y0: 9, t: 0, prey: 40, pred: 9, series: [] as { t: number; x: number; y: number }[], ev: 0, feed: [{ time: "#0", level: "info", msg: "شکارگر–شکار لوتکا–ولترا — جمعیت‌ها با فاز تقریباً ربع‌دوره‌ای نوسان می‌کنند. نرخ شکار یا مرگ شکارگر را تغییر دهید." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const deriv = (x: number, y: number): [number, number] => [S.a * x - S.b * x * y, -S.c * y + S.d * x * y];
  const step = (h: number) => {
    const [k1x, k1y] = deriv(S.prey, S.pred);
    const [k2x, k2y] = deriv(S.prey + h * k1x / 2, S.pred + h * k1y / 2);
    const [k3x, k3y] = deriv(S.prey + h * k2x / 2, S.pred + h * k2y / 2);
    const [k4x, k4y] = deriv(S.prey + h * k3x, S.pred + h * k3y);
    S.prey = Math.max(0.01, S.prey + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x));
    S.pred = Math.max(0.01, S.pred + (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y));
  };

  useRaf((dt) => {
    if (running) {
      for (let i = 0; i < 4; i++) { step(0.05); S.t += 0.05; }
      S.series.push({ t: S.t, x: S.prey, y: S.pred });
      if (S.series.length > 700) S.series.shift();
      if (S.prey < 0.5 && S.ev < 2) pushFeed("warn", "جمعیت شکار به آستانه انقراض رسید — تعادل ظریف است.");
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const arMode2 = mode === "ar";
    const gx = 80, gy = 80, gw = 460, gh = 380;
    // graph panel
    ctx.fillStyle = "rgba(6,26,22,0.5)";
    ctx.beginPath(); ctx.roundRect(gx - 24, gy - 34, gw + 48, gh + 58, 12); ctx.fill();
    ctx.strokeStyle = "rgba(143,188,184,0.4)";
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    const xmax = Math.max(80, ...S.series.map((p) => p.x)) * 1.1;
    const ymax = Math.max(30, ...S.series.map((p) => p.y)) * 1.1;
    // prey area fill
    if (S.series.length > 1) {
      const ag = ctx.createLinearGradient(0, gy, 0, gy + gh);
      ag.addColorStop(0, "rgba(165,217,92,0.22)");
      ag.addColorStop(1, "rgba(165,217,92,0)");
      ctx.fillStyle = ag;
      ctx.beginPath();
      S.series.forEach((p, i) => {
        const px = gx + (p.t / Math.max(S.t, 30)) * gw;
        const py = gy + gh - (p.x / xmax) * gh;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.lineTo(gx + (S.series[S.series.length - 1].t / Math.max(S.t, 30)) * gw, gy + gh);
      ctx.lineTo(gx + (S.series[0].t / Math.max(S.t, 30)) * gw, gy + gh);
      ctx.closePath(); ctx.fill();
    }
    for (const [key, col] of [["x", "#a5d95c"], ["y", "#ff6f61"]] as ["x" | "y", string][]) {
      ctx.strokeStyle = col; ctx.lineWidth = 2.4;
      if (!arMode2) { ctx.shadowColor = col; ctx.shadowBlur = 7; }
      ctx.beginPath();
      S.series.forEach((p, i) => {
        const px = gx + (p.t / Math.max(S.t, 30)) * gw;
        const py = gy + gh - (p[key] / (key === "x" ? xmax : ymax)) * gh;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    const px0 = 620, py0 = 90, ps = 300;
    ctx.fillStyle = "rgba(6,26,22,0.5)";
    ctx.beginPath(); ctx.roundRect(px0 - 14, py0 - 14, ps + 28, ps + 28, 12); ctx.fill();
    ctx.strokeStyle = "rgba(143,188,184,0.4)";
    ctx.strokeRect(px0, py0, ps, ps);
    ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 1.8;
    if (!arMode2) { ctx.shadowColor = "#35d3c2"; ctx.shadowBlur = 6; }
    ctx.beginPath();
    S.series.forEach((p, i) => {
      const px = px0 + (p.x / xmax) * ps, py = py0 + ps - (p.y / ymax) * ps;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (!arMode2) glow(ctx, px0 + (S.prey / xmax) * ps, py0 + ps - (S.pred / ymax) * ps, 34, [242, 168, 59], 0.5);
    ctx.fillStyle = "#f2a83b";
    ctx.beginPath(); ctx.arc(px0 + (S.prey / xmax) * ps, py0 + ps - (S.pred / ymax) * ps, 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = `11px ${FA}`; ctx.fillStyle = "#8fbcb8";
    ctx.fillText("فضای فاز (شکار، شکارگر)", px0 + 60, py0 + ps + 22);
    ctx.fillStyle = "#a5d95c"; ctx.fillText("شکار", gx + gw - 60, gy + 16);
    ctx.fillStyle = "#ff6f61"; ctx.fillText("شکارگر", gx + gw - 130, gy + 16);
    hud(ctx, 620, 430, 300, 90, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#a5d95c"; ctx.fillText(`شکار = ${fmt(S.prey, 1)}`, 640, 460);
    ctx.fillStyle = "#ff6f61"; ctx.fillText(`شکارگر = ${fmt(S.pred, 1)}`, 640, 486);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`t = ${fmt(S.t, 0)}`, 800, 460);
    frame.current++;
    if (frame.current % 7 === 0) force();
  }, true);

  const reset = () => { S.t = 0; S.prey = S.x0; S.pred = S.y0; S.series = []; pushFeed("info", "شبیه‌سازی از جمعیت‌های اولیه از سر گرفته شد."); };
  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)} onReset={reset}
      simClock={`t = ${fmt(S.t, 0)} — شکار ${fmt(S.prey, 0)} / شکارگر ${fmt(S.pred, 0)}`}
      hint="نرخ شکار b را زیاد کنید — دامنه نوسان‌ها بزرگ‌تر و خطر انقراض شکار بیشتر می‌شود. مدار بسته فضای فاز نشانه نوسان پایدار است."
      protocol={[
        { label: "مشاهده نوسان‌های با فازه‌دار", done: S.t > 15 },
        { label: "مدار بسته فضای فاز", done: S.t > 30 },
        { label: "اثر نرخ شکار b", done: S.ev >= 1 || S.b !== 0.05 },
        { label: "اثر نرخ مرگ شکارگر c", done: S.ev >= 2 || S.c !== 0.4 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="نرخ رشد شکار a" value={S.a} min={0.1} max={1.5} step={0.05} digits={2} accent="#a5d95c" onChange={(v) => { S.a = v; force(); }} />
        <Slider label="نرخ شکار b" value={S.b} min={0.01} max={0.15} step={0.005} digits={3} accent="#f2a83b" onChange={(v) => { S.b = v; pushFeed("info", `b=${fmt(v, 3)} — برهم‌کنش شکار تغییر کرد.`); }} />
        <Slider label="نرخ مرگ شکارگر c" value={S.c} min={0.1} max={1} step={0.05} digits={2} accent="#ff6f61" onChange={(v) => { S.c = v; force(); }} />
        <Slider label="بازده تبدیل d" value={S.d} min={0.01} max={0.1} step={0.005} digits={3} accent="#56b8ff" onChange={(v) => { S.d = v; force(); }} />
        <div className="flex gap-2">
          <button onClick={() => { S.x0 = 40; S.y0 = 9; reset(); }} className="flex-1 px-3 py-2 rounded-lg text-[11px] border border-edge/70 text-fog hover:text-snow cursor-pointer">شروع ۴۰/۹</button>
          <button onClick={() => { S.x0 = 80; S.y0 = 4; reset(); }} className="flex-1 px-3 py-2 rounded-lg text-[11px] border border-edge/70 text-fog hover:text-snow cursor-pointer">شروع ۸۰/۴</button>
        </div>
      </div>}
      chart={<LiveChart series={[sr("شکار", "#a5d95c", S.series.map((p) => ({ x: p.t, y: p.x }))), sr("شکارگر", "#ff6f61", S.series.map((p) => ({ x: p.t, y: p.y })))]} xLabel="t" yLabel="جمعیت" height={230} yMin={0} />}
      table={{ headers: ["t", "شکار", "شکارگر"], rows: S.series.filter((_, i) => i % 40 === 0).map((p) => [Number(p.t.toFixed(1)), Number(p.x.toFixed(1)), Number(p.y.toFixed(1))]) }}
      stats={[
        { label: "جمعیت شکار", value: fmt(S.prey, 1), color: "#a5d95c" },
        { label: "جمعیت شکارگر", value: fmt(S.pred, 1), color: "#ff6f61" },
        { label: "نقطه تعادل شکار", value: fmt(S.c / S.d, 1), color: "#e9f6f3", sub: "c/d" },
        { label: "نقطه تعادل شکارگر", value: fmt(S.a / S.b, 1), color: "#e9f6f3", sub: "a/b" },
        { label: "بیشینه شکار", value: S.series.length ? fmt(Math.max(...S.series.map((p) => p.x)), 0) : "—", color: "#a5d95c" },
        { label: "بیشینه شکارگر", value: S.series.length ? fmt(Math.max(...S.series.map((p) => p.y)), 0) : "—", color: "#ff6f61" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`dx/dt = ax - bxy; dy/dt = -cy + dxy`, `a=${fmt(S.a, 2)}, b=${fmt(S.b, 3)}, c=${fmt(S.c, 2)}, d=${fmt(S.d, 3)}; equilibrium (c/d, a/b) = (${fmt(S.c / S.d, 1)}, ${fmt(S.a / S.b, 1)})`]} />
  );
}

/* ===================== PCR ===================== */
export function PcrLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ cycles: 30, eff: 0.9, n0: 100, cycle: 0, phase: 0, tv: 0, running: false, ev: 0, feed: [{ time: "#0", level: "info", msg: "واکنش زنجیره‌ای پلیمراز — سه مرحله دمایی در هر چرخه؛ کپی‌ها به‌صورت N₀(1+E)ⁿ رشد می‌کنند." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const copies = S.n0 * Math.pow(1 + S.eff, S.cycle);

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (S.running && S.cycle < S.cycles) {
      S.tv += ds;
      const inCycle = S.tv % 3;
      S.phase = inCycle < 1 ? 0 : inCycle < 2 ? 1 : 2;
      const newCycle = Math.floor(S.tv / 3);
      if (newCycle > S.cycle) {
        S.cycle = newCycle;
        if (S.cycle === 10) pushFeed("ok", `چرخه ۱۰ — کپی‌ها ${fmt(S.n0 * Math.pow(1 + S.eff, 10), 0)} عدد؛ هنوز فاز نمایی.`);
        if (S.cycle >= S.cycles) { S.running = false; setRunning(false); pushFeed("ok", `PCR کامل شد — ${copies.toExponential(1)} کپی از ${fmt(S.n0, 0)} قالب اولیه (≈2ⁿ در E=۱).`); }
      }
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const arMode3 = mode === "ar";
    const temps = [95, 55, 72];
    const names = ["دناتوراسیون ۹۵°", "اتصال پرایمر ۵۵°", "طویل‌شدن ۷۲°"];
    const cols = ["#ff6f61", "#56b8ff", "#a5d95c"];
    for (let i = 0; i < 3; i++) {
      const bx = 100 + i * 290;
      const active = S.phase === i && S.running;
      if (active && !arMode3) glow(ctx, bx + 125, 225, 150, hex2rgb(cols[i]), 0.3);
      const bgr = ctx.createLinearGradient(bx, 150, bx, 300);
      if (active) { bgr.addColorStop(0, `${cols[i]}45`); bgr.addColorStop(1, `${cols[i]}18`); }
      else { bgr.addColorStop(0, "rgba(15,61,70,0.85)"); bgr.addColorStop(1, "rgba(8,38,44,0.85)"); }
      ctx.fillStyle = bgr;
      ctx.strokeStyle = active ? cols[i] : "rgba(23,80,89,0.8)";
      ctx.lineWidth = active ? 3 : 2;
      ctx.beginPath(); ctx.roundRect(bx, 150, 250, 150, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = cols[i]; ctx.font = `700 30px ${MONO}`;
      ctx.fillText(`${temps[i]}°C`, bx + 78, 215);
      ctx.fillStyle = "#e9f6f3"; ctx.font = `12px ${FA}`;
      ctx.fillText(names[i], bx + 66, 250);
      if (active) {
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.arc(bx + 222, 172, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // connector arrows
    ctx.strokeStyle = "rgba(143,188,184,0.4)"; ctx.lineWidth = 2;
    for (const ax of [352, 642]) {
      ctx.beginPath(); ctx.moveTo(ax, 225); ctx.lineTo(ax + 36, 225); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax + 36, 225); ctx.lineTo(ax + 27, 219); ctx.moveTo(ax + 36, 225); ctx.lineTo(ax + 27, 231); ctx.stroke();
    }
    ctx.fillStyle = "#8fbcb8"; ctx.font = `13px ${FA}`;
    ctx.fillText(`چرخه ${S.cycle} از ${S.cycles}`, 110, 120);
    const barW = Math.min(560, Math.log10(copies / S.n0 + 1) / Math.log10(Math.pow(1 + S.eff, S.cycles) + 1) * 560);
    ctx.fillStyle = "rgba(23,80,89,0.6)";
    ctx.beginPath(); ctx.roundRect(110, 380, 560, 26, 13); ctx.fill();
    if (barW > 2) {
      const pgr = ctx.createLinearGradient(110, 0, 110 + barW, 0);
      pgr.addColorStop(0, "#35d3c2"); pgr.addColorStop(1, "#a5d95c");
      if (!arMode3) glow(ctx, 110 + barW, 393, 30, [165, 217, 92], 0.5);
      ctx.fillStyle = pgr;
      ctx.beginPath(); ctx.roundRect(110, 380, Math.max(14, barW), 26, 13); ctx.fill();
    }
    ctx.fillStyle = "#e9f6f3"; ctx.font = `13px ${MONO}`;
    ctx.fillText(`کپی‌ها = ${copies.toExponential(2)}`, 110, 440);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `12px ${FA}`;
    ctx.fillText(`N = N₀(1+E)ⁿ = ${fmt(S.n0, 0)} × ${fmt(1 + S.eff, 2)}^${S.cycle}`, 110, 470);
    // gel electrophoresis with glowing bands
    const gelG = ctx.createLinearGradient(690, 160, 690, 490);
    gelG.addColorStop(0, "rgba(86,184,255,0.20)");
    gelG.addColorStop(1, "rgba(40,100,170,0.12)");
    ctx.fillStyle = gelG; ctx.fillRect(690, 160, 220, 330);
    ctx.strokeStyle = "rgba(143,188,184,0.35)"; ctx.strokeRect(690, 160, 220, 330);
    for (let lane = 0; lane < 3; lane++) {
      const lx = 715 + lane * 70;
      ctx.fillStyle = "rgba(4,25,29,0.7)"; ctx.fillRect(lx, 180, 40, 290);
      const sizes = lane === 0 ? [280] : lane === 1 ? [200, 120] : [240, 150, 90];
      for (const s of sizes) {
        const bandY = 190 + (s / 300) * 260;
        if (!arMode3) glow(ctx, lx + 20, bandY + 3, 26, [165, 217, 92], 0.5);
        const bnd = ctx.createLinearGradient(0, bandY, 0, bandY + 7);
        bnd.addColorStop(0, "#d3f5a0"); bnd.addColorStop(1, "#a5d95c");
        ctx.fillStyle = bnd;
        ctx.beginPath(); ctx.roundRect(lx + 4, bandY, 32, 7, 3); ctx.fill();
      }
      ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${FA}`;
      ctx.fillText(lane === 0 ? "نردبان" : `نمونه ${lane}`, lx, 480);
    }
    frame.current++;
    if (frame.current % 7 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => { if (S.cycle >= S.cycles) { S.cycle = 0; S.tv = 0; } S.running = !S.running; setRunning(S.running); if (S.running && S.cycle === 0) pushFeed("info", "سیکلر حرارتی آغاز شد — ۳ دما در هر چرخه."); }}
      onReset={() => { S.cycle = 0; S.tv = 0; S.running = false; setRunning(false); force(); }}
      simClock={`چرخه ${S.cycle}/${S.cycles}`}
      hint="راندمان را از ۱ به ۰٫۷ کاهش دهید تا ببینید تفاوت توانی چقدر عظیم است — 2³⁰ در برابر 1.7³⁰."
      protocol={[
        { label: "اجرای چرخه‌های دمایی", done: S.cycle > 0 },
        { label: "رشد نمایی کپی‌ها", done: S.cycle >= 10 },
        { label: "تکمیل ۳۰ چرخه", done: S.cycle >= S.cycles },
        { label: "اثر راندمان بر بازده", done: S.ev >= 2 || S.eff !== 0.9 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="تعداد چرخه" value={S.cycles} min={10} max={40} step={1} digits={0} accent="#35d3c2" onChange={(v) => { S.cycles = v; force(); }} />
        <Slider label="راندمان E" value={S.eff} min={0.5} max={1} step={0.05} digits={2} accent="#f2a83b" onChange={(v) => { S.eff = v; pushFeed("info", `E=${fmt(v, 2)} — ضریب هر چرخه ${fmt(1 + v, 2)} برابر شد.`); }} />
        <Slider label="قالب اولیه N₀" value={S.n0} min={10} max={1000} step={10} digits={0} accent="#56b8ff" onChange={(v) => { S.n0 = v; force(); }} />
      </div>}
      chart={<LiveChart series={[sr("log کپی‌ها", "#35d3c2", Array.from({ length: S.cycles + 1 }, (_, i) => ({ x: i, y: Number(Math.log10(S.n0 * Math.pow(1 + S.eff, i)).toFixed(2)) }))), sr("چرخه فعلی", "#f2a83b", [{ x: S.cycle, y: Number(Math.log10(copies).toFixed(2)) }, { x: S.cycle, y: Number(Math.log10(copies).toFixed(2)) }])]} xLabel="چرخه n" yLabel="log₁₀(N)" height={230} yMin={0} />}
      table={{ headers: ["چرخه", "کپی (E=1)", `کپی (E=${fmt(S.eff, 2)})`], rows: [5, 10, 15, 20, 25, 30].filter((n) => n <= S.cycles).map((n) => [n, (S.n0 * Math.pow(2, n)).toExponential(1), (S.n0 * Math.pow(1 + S.eff, n)).toExponential(1)]) }}
      stats={[
        { label: "کپی‌های فعلی", value: copies.toExponential(2), color: "#35d3c2" },
        { label: "چرخه", value: `${S.cycle} / ${S.cycles}`, color: "#e9f6f3" },
        { label: "ضریب تکثیر", value: `${Math.pow(1 + S.eff, S.cycle).toExponential(1)}×`, color: "#f2a83b" },
        { label: "دمای دناتوراسیون", value: "95 °C", color: "#ff6f61" },
        { label: "دمای اتصال", value: "55 °C", color: "#56b8ff" },
        { label: "دمای طویل‌شدن", value: "72 °C", color: "#a5d95c" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`N = N0(1+E)^n = ${fmt(S.n0, 0)}(1+${fmt(S.eff, 2)})^${S.cycle} = ${copies.toExponential(2)}`, `Steps: 95C denature, 55C anneal, 72C extend`]} />
  );
}
