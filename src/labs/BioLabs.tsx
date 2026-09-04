import { useRef, useState } from "react";
import { LiveChart, type SeriesDef } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { bioScene, euCell, glow, hud, petri } from "./draw";
import type { Experiment } from "../data/catalog";

function sr(name: string, color: string, arr: { x: number; y: number }[]): SeriesDef {
  return { name, color, ["data"]: arr };
}

/* ===================== Hardy–Weinberg ===================== */
interface GenSim {
  p: number; n: number; sel: number;
  gen: number; freqs: { x: number; y: number }[];
  counts: { aa: number; ab: number; bb: number };
  feed: FeedItem[]; ev: number; running: boolean;
}

export function GeneticsLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<GenSim>({
    p: 0.5, n: 120, sel: 0,
    gen: 0, freqs: [{ x: 0, y: 0.5 }],
    counts: { aa: 30, ab: 60, bb: 30 },
    ev: 0, running: false,
    feed: [{ time: "#0", level: "info", msg: "جمعیت دیپلوئید با الل‌های A و B. جفت‌گیری تصادفی + رانش ژنتیکی؛ با انتخاب طبیعی روی فنوتیپ، فراوانی الل‌ها جهت‌دار عوض می‌شود." }],
  }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => {
    S.ev++;
    S.feed = [{ time: `نسل ${S.gen}`, level, msg }, ...S.feed].slice(0, 24);
    force();
  };

  const seedPop = () => {
    const p = S.p;
    S.counts = {
      aa: Math.round(S.n * p * p),
      ab: Math.round(S.n * 2 * p * (1 - p)),
      bb: 0,
    };
    S.counts.bb = S.n - S.counts.aa - S.counts.ab;
    S.gen = 0;
    S.freqs = [{ x: 0, y: p }];
    force();
  };

  const alleleFreq = () => {
    const { aa, ab, bb } = S.counts;
    const tot = aa + ab + bb;
    return tot ? (2 * aa + ab) / (2 * tot) : 0.5;
  };

  const nextGen = () => {
    const p = alleleFreq();
    const { aa, ab, bb } = S.counts;
    // fitness
    const wAA = 1, wAB = 1 - S.sel / 2, wBB = 1 - S.sel;
    const pool = aa * wAA + ab * wAB + bb * wBB;
    const pA = (2 * aa * wAA + ab * wAB) / (2 * pool);
    const next = { aa: 0, ab: 0, bb: 0 };
    for (let i = 0; i < S.n; i++) {
      const g1 = Math.random() < pA ? "A" : "B";
      const g2 = Math.random() < pA ? "A" : "B";
      if (g1 === "A" && g2 === "A") next.aa++;
      else if (g1 === "B" && g2 === "B") next.bb++;
      else next.ab++;
    }
    S.counts = next;
    S.gen++;
    const np = alleleFreq();
    S.freqs.push({ x: S.gen, y: Number(np.toFixed(3)) });
    if (S.freqs.length > 200) S.freqs.shift();
    if (np > 0.95 && S.ev < 40) pushFeed("warn", `الل A در حال تثبیت است (p=${fmt(np, 2)}) — تنوع ژنتیکی از دست رفت.`);
    if (np < 0.05 && S.ev < 40) pushFeed("warn", `الل A در حال حذف است (p=${fmt(np, 2)}).`);
    force();
  };

  useRaf((dt) => {
    if (S.running) {
      if (frame.current % 12 === 0) nextGen();
    }
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 9 === 0) force();
  }, true);

  const draw = (ar: boolean) => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const W = 960, H = 560;
    bioScene(ctx, W, H, ar, performance.now() / 1000);
    // population panel
    ctx.fillStyle = "rgba(6,26,22,0.5)";
    ctx.strokeStyle = "rgba(46,120,96,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(100, 58, 720, 396, 14); ctx.fill(); ctx.stroke();
    // individuals as living cells
    const { aa, ab, bb } = S.counts;
    const cols = 20, cw = 34, ox = 120, oy = 90, tt = performance.now() / 1000;
    let i = 0;
    const put = (n: number, color: string) => {
      for (let k = 0; k < n; k++) {
        const cx = ox + (i % cols) * (cw + 6) + cw / 2 + Math.sin(tt * 1.3 + i * 2.7) * 1.6;
        const cy = oy + Math.floor(i / cols) * (cw + 6) + cw / 2 + Math.cos(tt * 1.1 + i * 1.9) * 1.6;
        euCell(ctx, cx, cy, 12, color, true, ar);
        i++;
      }
    };
    put(aa, "#f2a83b");
    put(ab, "#8fbcb8");
    put(bb, "#56b8ff");
    // legend + freq bar
    const p = alleleFreq();
    hud(ctx, 660, 400, 260, 120, ar);
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`AA = ${aa}`, 680, 428);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`AB = ${ab}`, 680, 450);
    ctx.fillStyle = "#56b8ff"; ctx.fillText(`BB = ${bb}`, 680, 472);
    ctx.fillStyle = "#35d3c2";
    ctx.fillText(`p(A) = ${fmt(p, 3)}`, 680, 496);
    // allele frequency bar with glow marker
    ctx.fillStyle = "#10393f";
    ctx.beginPath(); ctx.roundRect(120, 480, 460, 16, 8); ctx.fill();
    if (!ar) glow(ctx, 120 + 460 * p, 488, 40, [233, 246, 243], 0.35);
    const bg1 = ctx.createLinearGradient(120, 0, 120 + 460 * p, 0);
    bg1.addColorStop(0, "#f2c877"); bg1.addColorStop(1, "#f2a83b");
    ctx.fillStyle = bg1;
    ctx.beginPath(); ctx.roundRect(120, 480, Math.max(8, 460 * p), 16, 8); ctx.fill();
    const bg2 = ctx.createLinearGradient(120 + 460 * p, 0, 580, 0);
    bg2.addColorStop(0, "#56b8ff"); bg2.addColorStop(1, "#2f7fc4");
    ctx.fillStyle = bg2;
    ctx.beginPath(); ctx.roundRect(120 + 460 * p, 480, Math.max(8, 460 * (1 - p)), 16, 8); ctx.fill();
    ctx.fillStyle = "#e9f6f3";
    ctx.beginPath(); ctx.roundRect(118 + 460 * p, 476, 4, 24, 2); ctx.fill();
    ctx.fillStyle = "#8fbcb8";
    ctx.font = '11px Vazirmatn, sans-serif';
    ctx.fillText("فراوانی الل A در برابر B", 120, 518);
    ctx.fillStyle = "#a5d95c";
    ctx.font = '13px Vazirmatn, sans-serif';
    ctx.fillText(`نسل ${S.gen}`, 120, 70);
  };

  const p = alleleFreq();
  const chi = (() => {
    const tot = S.counts.aa + S.counts.ab + S.counts.bb;
    const eAA = tot * p * p, eAB = tot * 2 * p * (1 - p), eBB = tot * (1 - p) ** 2;
    let x = 0;
    if (eAA > 0) x += (S.counts.aa - eAA) ** 2 / eAA;
    if (eAB > 0) x += (S.counts.ab - eAB) ** 2 / eAB;
    if (eBB > 0) x += (S.counts.bb - eBB) ** 2 / eBB;
    return x;
  })();

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => {
        S.running = !S.running; setRunning(S.running);
        if (S.running) pushFeed("info", S.sel > 0 ? `اجرا با انتخاب طبیعی s=${fmt(S.sel, 2)} علیه BB.` : "اجرا با جفت‌گیری تصادفی — فقط رانش ژنتیکی.");
      }}
      onReset={seedPop}
      simClock={`نسل ${S.gen} — p(A)=${fmt(p, 2)}`}
      hint="با جمعیت کوچک (N=40) رانش شدیدتر است؛ انتخاب s=0.4 الل B را حذف می‌کند. χ² تعادل هاردی–واینبرگ را چک کنید."
      protocol={[
        { label: "ساخت جمعیت اولیه", done: true },
        { label: "۱۰ نسل جفت‌گیری تصادفی", done: S.gen >= 10 },
        { label: "مشاهده رانش در N کوچک", done: S.n <= 60 && S.gen >= 5 },
        { label: "اعمال انتخاب طبیعی", done: S.sel > 0 && S.gen >= 5 },
        { label: "آزمون χ² تعادل", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <Slider label="فراوانی اولیه p(A)" value={S.p} min={0.05} max={0.95} step={0.05} digits={2} accent="#f2a83b" onChange={(v) => { S.p = v; seedPop(); }} />
          <Slider label="اندازه جمعیت N" value={S.n} min={40} max={200} step={20} digits={0} accent="#35d3c2" onChange={(v) => { S.n = v; seedPop(); }} />
          <Slider label="شدت انتخاب s علیه BB" value={S.sel} min={0} max={0.8} step={0.05} digits={2} accent="#ff6f61" onChange={(v) => { S.sel = v; force(); }} />
          <button onClick={nextGen} className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border border-teal text-teal bg-teal/10 hover:bg-teal/20 transition-all cursor-pointer">
            یک نسل جلو
          </button>
        </div>
      }
      chart={
        <LiveChart series={[sr("p(A) بر حسب نسل", "#f2a83b", S.freqs)]} xLabel="نسل" yLabel="p(A)" height={230} yMin={0} yMax={1} />
      }
      table={{
        headers: ["نسل", "AA", "AB", "BB", "p(A)"],
        rows: S.freqs.map((f, idx) => idx === S.freqs.length - 1 ? [idx, S.counts.aa, S.counts.ab, S.counts.bb, f.y] : [idx, "—", "—", "—", f.y]),
      }}
      stats={[
        { label: "فراوانی الل A", value: fmt(p, 3), color: "#f2a83b" },
        { label: "فراوانی الل B", value: fmt(1 - p, 3), color: "#56b8ff" },
        { label: "هتروزیگوت AB", value: `${S.counts.ab}`, color: "#8fbcb8" },
        { label: "انتظار HW (2pq·N)", value: `${fmt(2 * p * (1 - p) * S.n, 0)}`, color: "#e9f6f3" },
        { label: "آماره χ²", value: fmt(chi, 2), color: chi > 3.84 ? "#ff6f61" : "#a5d95c", sub: "بحرانی(α=0.05)=3.84" },
        { label: "نسل", value: `${S.gen}`, color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `Hardy-Weinberg: p^2 + 2pq + q^2 = 1; N=${S.n}, s(BB)=${fmt(S.sel, 2)}`,
        `Generation ${S.gen}: p(A)=${fmt(p, 3)}, chi2=${fmt(chi, 2)} (crit 3.84)`,
        `Genetic drift strength ~ 1/(2N); selection shifts p directionally`,
      ]}
    />
  );
}

/* ===================== Bacterial culture ===================== */
interface CulSim {
  k: number; cap: number; anti: boolean;
  t: number; Nv: number; running: boolean; plated: boolean;
  zones: number[]; samples: { x: number; y: number }[]; lastS: number;
  feed: FeedItem[]; ev: number; loggedPhase: number;
}

export function CultureLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<CulSim>({
    k: 0.9, cap: 1000, anti: false,
    t: 0, Nv: 10, running: false, plated: false,
    zones: [], samples: [], lastS: 0, ev: 0, loggedPhase: 0,
    feed: [{ time: "#0", level: "info", msg: "کشت باکتری در محیط مایع: فاز تأخیری، لگاریتمی و ایستایی. سپس روی پلیت آگار بکارید و با دیسک آنتی‌بیوتیک، هاله عدم رشد را اندازه بگیرید." }],
  }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => {
    S.ev++;
    S.feed = [{ time: `t=${fmt(S.t, 0)}h`, level, msg }, ...S.feed].slice(0, 24);
    force();
  };

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000 * 1.5; // 1s ≈ 1.5 h
    if (S.running) {
      S.t += ds;
      S.Nv += S.k * S.Nv * (1 - S.Nv / S.cap) * ds;
      if (S.Nv >= S.cap * 0.99) { S.Nv = S.cap; S.running = false; setRunning(false); pushFeed("ok", "فاز ایستایی — جمعیت به ظرفیت برد رسید (منابع محدود شد)."); }
      if (S.Nv > S.cap * 0.5 && S.loggedPhase === 1) { S.loggedPhase = 2; pushFeed("info", "رشد در حال کندشدن است — وارد فاز کاهشی/ایستایی می‌شویم."); }
      if (S.Nv > S.cap * 0.1 && S.loggedPhase === 0) { S.loggedPhase = 1; pushFeed("info", "فاز لگاریتمی — رشد نمایی با نرخ µ≈k."); }
      if (S.t - S.lastS >= 0.8) {
        S.samples.push({ x: Number(S.t.toFixed(1)), y: Number(Math.log10(S.Nv).toFixed(2)) });
        S.lastS = S.t;
      }
    }
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const plate = () => {
    S.plated = true;
    const zone = S.anti ? 14 + Math.random() * 8 : 0;
    S.zones.push(Number(zone.toFixed(1)));
    pushFeed(S.anti ? "ok" : "warn", S.anti
      ? `دیسک آنتی‌بیوتیک گذاشته شد — قطر هاله عدم رشد ${fmt(zone, 1)} mm (حساس/مقاوم را با جدول CLSI بسنجید).`
      : "بدون آنتی‌بیوتیک هاله‌ای تشکیل نمی‌شود — رشد یکنواخت (چمن) خواهید دید.");
    force();
  };

  const draw = (ar: boolean) => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const W = 960, H = 560;
    bioScene(ctx, W, H, ar, performance.now() / 1000);
    // incubation flask (glass + turbid broth)
    const fx = 240, fy = 300;
    const turb = Math.min(1, S.Nv / S.cap);
    if (!ar) glow(ctx, fx, fy + 20, 150, [165, 217, 92], 0.08 + turb * 0.2);
    const broth = ctx.createLinearGradient(0, 250, 0, fy + 90);
    broth.addColorStop(0, `rgba(165,217,92,${(0.10 + turb * 0.3).toFixed(2)})`);
    broth.addColorStop(1, `rgba(120,190,80,${(0.16 + turb * 0.42).toFixed(2)})`);
    ctx.fillStyle = broth;
    ctx.beginPath();
    ctx.moveTo(fx - 105, 250);
    ctx.bezierCurveTo(fx - 118, fy + 50, fx - 112, fy + 62, fx - 66, fy + 86);
    ctx.lineTo(fx + 66, fy + 86);
    ctx.bezierCurveTo(fx + 112, fy + 62, fx + 118, fy + 50, fx + 105, 250);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(165,217,92,0.06)";
    ctx.beginPath();
    ctx.moveTo(fx - 22, 170);
    ctx.bezierCurveTo(fx - 120, 210, fx - 120, fy + 60, fx - 70, fy + 90);
    ctx.lineTo(fx + 70, fy + 90);
    ctx.bezierCurveTo(fx + 120, fy + 60, fx + 120, 210, fx + 22, 170);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(214,240,244,0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx - 22, 120); ctx.lineTo(fx - 22, 170);
    ctx.bezierCurveTo(fx - 120, 210, fx - 120, fy + 60, fx - 70, fy + 90);
    ctx.lineTo(fx + 70, fy + 90);
    ctx.bezierCurveTo(fx + 120, fy + 60, fx + 120, 210, fx + 22, 170);
    ctx.lineTo(fx + 22, 120);
    ctx.stroke();
    // glass shine
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(fx - 96, 240); ctx.bezierCurveTo(fx - 104, 300, fx - 96, 340, fx - 70, 372); ctx.stroke();
    // bacteria with glow
    const dots = Math.min(60, Math.round(turb * 60));
    for (let i = 0; i < dots; i++) {
      const x = fx - 80 + ((i * 53) % 160), y = 270 + ((i * 97) % 110) + Math.sin(performance.now() / 300 + i) * 4;
      if (!ar) glow(ctx, x, y, 8, [165, 217, 92], 0.3);
      ctx.fillStyle = "rgba(200,240,140,0.9)";
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    // agar plate with texture + glowing lawn
    const px = 680, py = 280, pr = 150;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fillStyle = "#2a2118"; ctx.fill();
    ctx.restore();
    petri(ctx, px, py, pr, ar);
    if (S.plated) {
      const lawn = ctx.createRadialGradient(px, py, 10, px, py, pr - 14);
      lawn.addColorStop(0, "rgba(180,230,120,0.75)");
      lawn.addColorStop(0.8, "rgba(140,205,95,0.55)");
      lawn.addColorStop(1, "rgba(110,170,80,0.4)");
      ctx.fillStyle = lawn;
      ctx.beginPath(); ctx.arc(px, py, pr - 14, 0, Math.PI * 2); ctx.fill();
      if (!ar) glow(ctx, px, py, pr - 10, [165, 217, 92], 0.12);
      const z = S.zones[S.zones.length - 1] ?? 0;
      if (z > 0) {
        const zr = z * 3.2;
        const zoneG = ctx.createRadialGradient(px, py, 6, px, py, zr);
        zoneG.addColorStop(0, "rgba(170,135,95,0.95)");
        zoneG.addColorStop(0.75, "rgba(150,118,82,0.85)");
        zoneG.addColorStop(1, "rgba(140,205,95,0.35)");
        ctx.fillStyle = zoneG;
        ctx.beginPath(); ctx.arc(px, py, zr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(165,217,92,0.8)"; ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(px, py, zr, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        // antibiotic disk
        if (!ar) glow(ctx, px, py, 26, [233, 246, 243], 0.25);
        ctx.fillStyle = "#e9f6f3";
        ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#04191d";
        ctx.font = '9px "IBM Plex Mono", monospace';
        ctx.textAlign = "center";
        ctx.fillText("AMP", px, py + 3);
        ctx.textAlign = "left";
        // zone diameter arrow
        ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px - zr, py); ctx.lineTo(px + zr, py); ctx.stroke();
        ctx.fillStyle = "#35d3c2";
        ctx.font = '12px "IBM Plex Mono", monospace';
        ctx.fillText(`${fmt(z, 1)} mm`, px + zr + 8, py + 4);
      }
    } else {
      ctx.fillStyle = "rgba(233,246,243,0.45)";
      ctx.font = '12px Vazirmatn, sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("پلیت آماده کشت", px, py);
      ctx.textAlign = "left";
    }
    // HUD
    hud(ctx, 80, 460, 500, 64, ar);
    ctx.font = '14px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`N = ${fmt(S.Nv, 0)} CFU/mL   log₁₀N = ${fmt(Math.log10(S.Nv), 2)}`, 100, 488);
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`t = ${fmt(S.t, 1)} h   µ = ${fmt(S.k, 2)} h⁻¹`, 100, 510);
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => {
        if (!S.running && S.Nv >= S.cap) { pushFeed("info", "کشت به ایستایی رسیده — بازنشانی کنید."); return; }
        S.running = !S.running; setRunning(S.running);
        if (S.running && S.samples.length === 0) pushFeed("info", "انکوباسیون آغاز شد — فاز تأخیری کوتاه است.");
      }}
      onReset={() => {
        S.t = 0; S.Nv = 10; S.running = false; setRunning(false);
        S.plated = false; S.zones = []; S.samples = []; S.loggedPhase = 0;
        pushFeed("info", "کشت تازه تلقیح شد.");
      }}
      simClock={`log₁₀N = ${fmt(Math.log10(S.Nv), 2)}`}
      hint="پس از رسیدن به ایستایی، با یا بدون دیسک آنتی‌بیوتیک روی پلیت بکارید و قطر هاله را با آستانه CLSI مقایسه کنید."
      protocol={[
        { label: "رشد تا فاز لگاریتمی", done: S.loggedPhase >= 1 },
        { label: "رسیدن به فاز ایستایی", done: S.Nv >= S.cap * 0.99 },
        { label: "کشت روی پلیت آگار", done: S.plated },
        { label: "اندازه‌گیری هاله عدم رشد", done: S.zones.length > 0 },
        { label: "تکرار با/بدون آنتی‌بیوتیک", done: S.zones.length >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <Slider label="نرخ رشد ویژه µ" value={S.k} min={0.3} max={1.5} step={0.05} digits={2} unit="h⁻¹" accent="#a5d95c" onChange={(v) => { S.k = v; force(); }} />
          <Slider label="ظرفیت برد (log)" value={Math.log10(S.cap)} min={2.3} max={3.5} step={0.1} digits={1} accent="#f2a83b"
            onChange={(v) => { S.cap = Math.pow(10, v); force(); }} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { S.anti = true; plate(); }}
              className="px-3 py-2.5 rounded-lg text-[11.5px] font-bold border border-teal/50 text-teal bg-teal/10 hover:bg-teal/20 transition-colors cursor-pointer">
              کشت + دیسک AMP
            </button>
            <button onClick={() => { S.anti = false; plate(); }}
              className="px-3 py-2.5 rounded-lg text-[11.5px] font-bold border border-edge text-fog hover:text-snow transition-colors cursor-pointer">
              کشت بدون دیسک
            </button>
          </div>
          <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11px] text-fog leading-6">
            تفسیر CLSI (آمپی‌سیلین): هاله ≥۱۷mm حساس · ۱۴–۱۶mm نیمه‌حساس · ≤۱۳mm مقاوم
          </div>
        </div>
      }
      chart={
        <LiveChart series={[sr("log₁₀(N)", "#a5d95c", S.samples)]} xLabel="t (h)" yLabel="log₁₀(CFU/mL)" height={230} />
      }
      table={{
        headers: ["t (h)", "log₁₀N", "N (CFU/mL)", "فاز"],
        rows: S.samples.map((s) => [s.x, s.y, Number(Math.pow(10, s.y).toFixed(0)), s.y < Math.log10(S.cap * 0.08) ? "تأخیری" : s.y < Math.log10(S.cap * 0.7) ? "لگاریتمی" : "ایستایی"]),
      }}
      stats={[
        { label: "جمعیت فعلی", value: `${fmt(S.Nv, 0)} CFU/mL`, color: "#a5d95c" },
        { label: "log₁₀N", value: fmt(Math.log10(S.Nv), 2), color: "#e9f6f3" },
        { label: "نرخ ویژه µ", value: `${fmt(S.k, 2)} h⁻¹`, color: "#f2a83b" },
        { label: "زمان دوبرابری", value: `${fmt(Math.LN2 / S.k, 1)} h`, color: "#35d3c2", sub: "ln2/µ" },
        { label: "قطر هاله", value: S.zones.length ? `${fmt(S.zones[S.zones.length - 1], 1)} mm` : "—", color: "#e9f6f3" },
        { label: "تفسیر", value: S.zones.length === 0 ? "—" : (S.zones[S.zones.length - 1] >= 17 ? "حساس" : S.zones[S.zones.length - 1] >= 14 ? "نیمه‌حساس" : "مقاوم"), color: S.zones.length && S.zones[S.zones.length - 1] < 14 ? "#ff6f61" : "#a5d95c" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `Logistic growth: dN/dt = mu N (1 - N/K); mu=${fmt(S.k, 2)} /h, K=${fmt(S.cap, 0)} CFU/mL`,
        `Doubling time = ln2/mu = ${fmt(Math.LN2 / S.k, 2)} h`,
        S.zones.length ? `Inhibition zone = ${fmt(S.zones[S.zones.length - 1], 1)} mm (CLSI interpretation)` : `No disk-diffusion assay yet`,
      ]}
    />
  );
}
