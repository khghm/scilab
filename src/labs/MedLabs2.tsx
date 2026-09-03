import { useRef, useState } from "react";
import { LiveChart, type SeriesDef } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import type { Experiment } from "../data/catalog";

function sr(name: string, color: string, arr: { x: number; y: number }[]): SeriesDef {
  return { name, color, ["data"]: arr };
}

/* ===================== Spirometry ===================== */
interface SpiroSim {
  height: number; age: number; sex: number; breath: number;
  phase: "rest" | "inhale" | "exhale" | "forced";
  t: number; vol: number; tv: number;
  trace: { x: number; y: number }[];
  feed: FeedItem[]; ev: number; measured: boolean;
}

export function SpirometryLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<SpiroSim>({
    height: 175, age: 25, sex: 1, breath: 14,
    phase: "rest", t: 0, vol: 0.5, tv: 0.5,
    trace: [], ev: 0, measured: false,
    feed: [{ time: "#0", level: "info", msg: "اسپیرومتر حجم‌های ریوی را اندازه می‌گیرد: دم عمیق، بازدم آرام، سپس بازدم اجباری برای ظرفیت حیاتی (VC). قد و سن، ظرفیت‌ها را تغییر می‌دهند." }],
  }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  // predicted volumes (L)
  const vcPred = (S.sex === 1 ? 0.052 * S.height - 0.022 * S.age - 3.6 : 0.041 * S.height - 0.018 * S.age - 2.69);
  const tvPred = vcPred * 0.1;
  const irvPred = vcPred * 0.55;
  const ervPred = vcPred * 0.25;
  const rvPred = vcPred * 0.33;

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (S.phase === "inhale") {
      S.vol += ds * 2.4;
      if (S.vol >= tvPred + irvPred) { S.vol = tvPred + irvPred; S.phase = "exhale"; pushFeed("info", "دم عمیق کامل شد — حالا بازدم آرام، سپس بازدم اجباری تا انتها."); }
    } else if (S.phase === "exhale") {
      S.vol -= ds * 1.8;
      if (S.vol <= tvPred - ervPred) { S.vol = tvPred - ervPred; S.phase = "forced"; }
    } else if (S.phase === "forced") {
      S.vol -= ds * 3.2;
      if (S.vol <= 0) {
        S.vol = 0; S.phase = "rest";
        const vc = tvPred + irvPred + ervPred;
        pushFeed("ok", `بازدم اجباری کامل شد — ظرفیت حیاتی VC ≈ ${fmt(vc, 2)} L (حداکثر − حداقل منحنی). RV را اسپیرومتر نمی‌بیند!`);
        S.measured = true;
      }
    } else {
      // resting tidal breathing
      S.vol = tvPred + 0.12 * Math.sin(S.t * (S.breath / 60) * Math.PI * 2) * tvPred * 3;
    }
    S.t += ds;
    S.trace.push({ x: Number(S.t.toFixed(2)), y: Number(S.vol.toFixed(2)) });
    if (S.trace.length > 600) S.trace.shift();
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 7 === 0) force();
  }, true);

  const reset = () => {
    S.t = 0; S.vol = tvPred; S.phase = "rest"; S.trace = []; S.measured = false;
    pushFeed("info", "تنفس به حالت عادی برگشت.");
  };

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
    // lungs
    const cx = 240, cy = 260;
    const fillFrac = S.vol / (vcPred + rvPred);
    const breathScale = 1 + fillFrac * 0.35;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + side * 95, cy);
      ctx.scale(breathScale, breathScale);
      ctx.fillStyle = `rgba(255,111,97,${(0.18 + fillFrac * 0.3).toFixed(2)})`;
      ctx.strokeStyle = "#ff6f61";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(side * -20, -120);
      ctx.bezierCurveTo(side * 90, -110, side * 110, 20, side * 80, 110);
      ctx.bezierCurveTo(side * 40, 140, side * -10, 120, side * -20, 60);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // trachea
    ctx.strokeStyle = "#8fbcb8";
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(cx, 80); ctx.lineTo(cx, cy - 60); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 60); ctx.lineTo(cx - 60, cy - 20); ctx.moveTo(cx, cy - 60); ctx.lineTo(cx + 60, cy - 20); ctx.stroke();
    // mouthpiece + tube
    ctx.strokeStyle = "#2a7a80";
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(cx, 80); ctx.lineTo(cx, 40); ctx.lineTo(430, 40); ctx.stroke();
    ctx.fillStyle = "#8fbcb8";
    ctx.font = '11px Vazirmatn, sans-serif';
    ctx.fillText("دهانی اسپیرومتر", cx - 34, 26);
    // volume bars (right)
    const bx = 620, by = 480, bw = 240;
    const segs: [string, number, string][] = [
      ["RV", rvPred, "#175059"],
      ["ERV", ervPred, "#56b8ff"],
      ["TV", tvPred, "#a5d95c"],
      ["IRV", irvPred, "#f2a83b"],
    ];
    let y = by;
    for (const [nm, v, col] of segs) {
      const h = v * 52;
      y -= h;
      ctx.fillStyle = col as string;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(bx, y, bw, h - 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#e9f6f3";
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.fillText(`${nm} ${fmt(v as number, 2)}L`, bx + bw + 8, y + h / 2 + 4);
    }
    // current volume needle
    const ny = by - S.vol * 52;
    ctx.strokeStyle = "#35d3c2";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(bx - 14, ny); ctx.lineTo(bx + bw + 4, ny); ctx.stroke();
    ctx.fillStyle = "#35d3c2";
    ctx.beginPath(); ctx.moveTo(bx - 14, ny); ctx.lineTo(bx - 26, ny - 6); ctx.lineTo(bx - 26, ny + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '12px Vazirmatn, sans-serif';
    ctx.fillText("حجم‌های ریوی (نوار) و حجم لحظه‌ای (فلش)", bx - 40, by + 26);
    // phase label
    const phName = S.phase === "rest" ? "تنفس عادی" : S.phase === "inhale" ? "دم عمیق…" : S.phase === "exhale" ? "بازدم آرام…" : "بازدم اجباری!";
    ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.8)";
    ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(80, 420, 400, 84, 10); ctx.fill(); ctx.stroke();
    ctx.font = '600 20px "IBM Plex Mono", monospace';
    ctx.fillStyle = S.phase === "forced" ? "#ff6f61" : "#e9f6f3";
    ctx.fillText(`V = ${fmt(S.vol, 2)} L`, 100, 452);
    ctx.font = '13px Vazirmatn, sans-serif';
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(phName, 100, 478);
    ctx.fillText(`VC پیش‌بینی = ${fmt(vcPred, 2)} L`, 260, 452);
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => { if (S.phase === "rest") { S.phase = "inhale"; pushFeed("info", "دم عمیق آغاز شد — ریه‌ها را پر کنید."); } }}
      onReset={reset}
      simClock={`V = ${fmt(S.vol, 2)} L`}
      hint="دکمه اجرا = دم عمیق؛ پس از آن به‌طور خودکار بازدم و بازدم اجباری انجام می‌شود. قد را تغییر دهید و VC پیش‌بینی را ببینید."
      protocol={[
        { label: "تنفس عادی (TV)", done: S.t > 2 },
        { label: "دم عمیق (IRV)", done: S.phase !== "rest" || S.ev >= 1 },
        { label: "بازدم اجباری کامل", done: S.measured },
        { label: "خواندن VC از منحنی", done: S.measured },
        { label: "اثر قد/سن بر ظرفیت‌ها", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <Slider label="قد" value={S.height} min={140} max={200} step={1} digits={0} unit="cm" accent="#f2a83b" onChange={(v) => { S.height = v; force(); }} />
          <Slider label="سن" value={S.age} min={15} max={80} step={1} digits={0} unit="سال" accent="#56b8ff" onChange={(v) => { S.age = v; force(); }} />
          <div className="flex gap-1.5">
            <button onClick={() => { S.sex = 1; force(); }}
              className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold border cursor-pointer transition-all"
              style={S.sex === 1 ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c218" } : { borderColor: "#175059", color: "#8fbcb8" }}>مرد</button>
            <button onClick={() => { S.sex = 0; force(); }}
              className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold border cursor-pointer transition-all"
              style={S.sex === 0 ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c218" } : { borderColor: "#175059", color: "#8fbcb8" }}>زن</button>
          </div>
          <Slider label="نرخ تنفس" value={S.breath} min={8} max={30} step={1} digits={0} unit="/min" accent="#ff6f61" onChange={(v) => { S.breath = v; force(); }} />
          <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11px] text-fog leading-6">
            TLC = VC + RV — اسپیرومتر فقط VC را می‌بیند؛ RV با روش شست‌وشوی هلیوم اندازه‌گیری می‌شود.
          </div>
        </div>
      }
      chart={
        <LiveChart series={[sr("حجم (L)", "#35d3c2", S.trace)]} xLabel="t (s)" yLabel="V (L)" height={230} yMin={0} />
      }
      table={{
        headers: ["حجم", "مقدار (L)", "٪TLC"],
        rows: [
          ["TV — حجم جاری", Number(tvPred.toFixed(2)), Number(((tvPred / (vcPred + rvPred)) * 100).toFixed(0))],
          ["IRV — ذخیره دمی", Number(irvPred.toFixed(2)), Number(((irvPred / (vcPred + rvPred)) * 100).toFixed(0))],
          ["ERV — ذخیره بازدمی", Number(ervPred.toFixed(2)), Number(((ervPred / (vcPred + rvPred)) * 100).toFixed(0))],
          ["RV — باقی‌مانده", Number(rvPred.toFixed(2)), Number(((rvPred / (vcPred + rvPred)) * 100).toFixed(0))],
          ["VC — ظرفیت حیاتی", Number(vcPred.toFixed(2)), Number(((vcPred / (vcPred + rvPred)) * 100).toFixed(0))],
        ],
      }}
      stats={[
        { label: "ظرفیت حیاتی VC", value: `${fmt(vcPred, 2)} L`, color: "#f2a83b" },
        { label: "حجم جاری TV", value: `${fmt(tvPred, 2)} L`, color: "#a5d95c" },
        { label: "TLC کل", value: `${fmt(vcPred + rvPred, 2)} L`, color: "#35d3c2" },
        { label: "RV باقی‌مانده", value: `${fmt(rvPred, 2)} L`, color: "#56b8ff", sub: "غیرقابل اندازه‌گیری با اسپیرومتر" },
        { label: "حجم لحظه‌ای", value: `${fmt(S.vol, 2)} L`, color: "#e9f6f3" },
        { label: "دقیقه‌حجمی", value: `${fmt(tvPred * S.breath, 1)} L/min`, color: "#e9f6f3", sub: "TV×نرخ" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `Spirometry: height=${fmt(S.height, 0)} cm, age=${fmt(S.age, 0)}, sex=${S.sex ? "M" : "F"}`,
        `Predicted: TV=${fmt(tvPred, 2)} L, IRV=${fmt(irvPred, 2)} L, ERV=${fmt(ervPred, 2)} L, RV=${fmt(rvPred, 2)} L`,
        `VC = ${fmt(vcPred, 2)} L; TLC = VC+RV = ${fmt(vcPred + rvPred, 2)} L`,
      ]}
    />
  );
}

/* ===================== SpO₂ ===================== */
interface Spo2Sim { alt: number; pco2: number; ph: number; feed: FeedItem[]; ev: number }

export function Spo2Lab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<Spo2Sim>({ alt: 0, pco2: 40, ph: 7.4, ev: 0, feed: [{ time: "#0", level: "info", msg: "منحنی تفکیک اکسی‌هموگلوبین سیگموئید است: در ریوی (PO₂≈100) اشباع ~۹۸٪ و در بافت (PO₂≈40) اکسیژن آزاد می‌شود. اثر بور: اسیدوز و CO₂ منحنی را راست می‌برند." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const tv = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const po2Alv = 104 - S.alt / 1000 * 8.5; // rough: inspired PO2 falls with altitude
  const shift = (S.pco2 - 40) * 0.4 + (7.4 - S.ph) * 60; // Bohr right-shift (P50 offset)
  const p50 = 27 + shift;
  const satOf = (po2: number) => {
    const n = 2.7;
    return (Math.pow(po2, n) / (Math.pow(p50, n) + Math.pow(po2, n))) * 100;
  };
  const satAlv = satOf(po2Alv);
  const satTissue = satOf(40);
  const delivered = satAlv - satTissue;

  useRaf((dt) => {
    tv.current += Math.min(dt, 50) / 1000;
    if (satAlv < 88 && S.ev < 30 && frame.current % 500 === 0) {
      pushFeed("error", `هیپوکسمی — اشباع ${fmt(satAlv, 0)}٪ زیر ۹۰ است؛ در این ارتفاع اکسیژن کمکی لازم است.`);
    }
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
    // dissociation curve
    const gx = 120, gy = 80, gw = 440, gh = 330;
    ctx.strokeStyle = "rgba(143,188,184,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText("PO₂ (mmHg)", gx + gw - 80, gy + gh + 22);
    ctx.fillText("Sat٪", gx + 4, gy + 14);
    const X = (p: number) => gx + (p / 110) * gw;
    const Y = (s: number) => gy + gh - (s / 100) * gh;
    // standard curve (p50=27)
    ctx.strokeStyle = "rgba(143,188,184,0.35)";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let p = 0; p <= 110; p += 2) {
      const s = (Math.pow(p, 2.7) / (Math.pow(27, 2.7) + Math.pow(p, 2.7))) * 100;
      if (p === 0) ctx.moveTo(X(p), Y(s)); else ctx.lineTo(X(p), Y(s));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // shifted curve
    ctx.strokeStyle = "#ff6f61";
    ctx.lineWidth = 2.6;
    if (!ar) { ctx.shadowColor = "#ff6f61"; ctx.shadowBlur = 7; }
    ctx.beginPath();
    for (let p = 0; p <= 110; p += 2) {
      const s = satOf(p);
      if (p === 0) ctx.moveTo(X(p), Y(s)); else ctx.lineTo(X(p), Y(s));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    // markers: alveolar + tissue
    const dot = (p: number, s: number, col: string, label: string) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(X(p), Y(s), 7, 0, Math.PI * 2); ctx.fill();
      ctx.font = '11px Vazirmatn, sans-serif';
      ctx.fillText(label, X(p) + 12, Y(s) - 8);
    };
    dot(po2Alv, satAlv, "#35d3c2", `ریه PO₂=${fmt(po2Alv, 0)}`);
    dot(40, satTissue, "#f2a83b", "بافت PO₂=40");
    // P50 marker
    ctx.strokeStyle = "#b388ff";
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(X(p50), Y(50)); ctx.lineTo(X(p50), gy + gh); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#b388ff";
    ctx.fillText(`P50=${fmt(p50, 0)}`, X(p50) - 16, gy + gh + 16);
    // pulse oximeter readout
    ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.85)";
    ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(640, 110, 270, 200, 14); ctx.fill(); ctx.stroke();
    const pulse = 0.5 + 0.5 * Math.sin(tv.current * 4.8);
    ctx.font = '600 56px "IBM Plex Mono", monospace';
    ctx.fillStyle = satAlv < 90 ? "#ff6f61" : satAlv < 95 ? "#f2a83b" : "#35d3c2";
    ctx.fillText(`${fmt(satAlv, 0)}`, 668, 186);
    ctx.font = '16px "IBM Plex Mono", monospace';
    ctx.fillText("٪ SpO₂", 760, 182);
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`HR = ${fmt(72 + S.alt / 80, 0)} bpm`, 668, 220);
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`ارتفاع = ${fmt(S.alt, 0)} m`, 668, 246);
    ctx.fillText(`تحویل O₂ = ${fmt(delivered, 0)}٪`, 668, 272);
    // pleth wave
    ctx.strokeStyle = "#35d3c2";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 656; x <= 894; x += 3) {
      const t = tv.current - (894 - x) / 200;
      const y = 300 - 16 * Math.pow(Math.max(0, Math.sin(t * 4.8)), 3);
      if (x === 656) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    void pulse;
    ctx.fillStyle = "#8fbcb8";
    ctx.font = '11px Vazirmatn, sans-serif';
    ctx.fillText("منحنی سیگموئید = اتصال تعاونی هموگلوبین", 130, 60);
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "پالس‌اکسیمتر همیشه در حال پایش است — ارتفاع و CO₂ را تغییر دهید.")}
      onReset={() => { S.alt = 0; S.pco2 = 40; S.ph = 7.4; pushFeed("info", "به شرایط سطح دریا و pH طبیعی بازگشت."); }}
      simClock={`SpO₂ = ${fmt(satAlv, 0)}٪`}
      hint="ارتفاع را به ۶۰۰۰ متر ببرید تا اشباع زیر ۹۰ بیفتد؛ سپس با افزایش PCO₂ اثر بور و راست‌رفتن منحنی را ببینید."
      protocol={[
        { label: "خواندن اشباع در سطح دریا", done: true },
        { label: "صعود به ارتفاع", done: S.alt >= 2000 },
        { label: "مشاهده افت SpO₂", done: satAlv < 92 },
        { label: "اثر بور (افزایش PCO₂)", done: S.pco2 > 45 },
        { label: "مقایسه تحویل O₂ بافتی", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <Slider label="ارتفاع" value={S.alt} min={0} max={8000} step={100} digits={0} unit="m" accent="#56b8ff" onChange={(v) => { S.alt = v; force(); }} />
          <Slider label="PCO₂ خون" value={S.pco2} min={25} max={70} step={1} digits={0} unit="mmHg" accent="#f2a83b"
            onChange={(v) => { S.pco2 = v; if (v > 45) pushFeed("warn", "هیپرکاپنی — CO₂ بالا منحنی را راست می‌برد (اثر بور): در بافت اکسیژن بیشتر آزاد می‌شود ولی در ریه اشباع کمی افت می‌کند."); force(); }} />
          <Slider label="pH خون" value={S.ph} min={7.1} max={7.6} step={0.02} digits={2} accent="#35d3c2" onChange={(v) => { S.ph = v; force(); }} />
          <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11px] text-fog leading-6">
            P50 نرمال ≈ ۲۷ mmHg — راست‌رفت = آزادسازی آسان‌تر O₂ در بافت (اسیدوز، CO₂، دما)
          </div>
        </div>
      }
      chart={
        <LiveChart
          series={[
            sr("اشباع با اثر بور", "#ff6f61", Array.from({ length: 56 }, (_, i) => ({ x: i * 2, y: Number(satOf(i * 2).toFixed(1)) }))),
            sr("استاندارد P50=27", "#8fbcb8", Array.from({ length: 56 }, (_, i) => ({ x: i * 2, y: Number(((Math.pow(i * 2, 2.7) / (Math.pow(27, 2.7) + Math.pow(i * 2, 2.7))) * 100).toFixed(1)) }))),
          ]}
          xLabel="PO₂ (mmHg)" yLabel="اشباع ٪" height={230} yMin={0} yMax={100} markerX={po2Alv} markerLabel="PO₂ ریوی" />
      }
      table={{
        headers: ["ارتفاع (m)", "PO₂ ریوی", "SpO₂ ٪"],
        rows: [0, 1500, 3000, 4500, 6000, 8000].map((a) => {
          const p = 104 - (a / 1000) * 8.5;
          return [a, Number(p.toFixed(0)), Number(satOf(p).toFixed(0))];
        }),
      }}
      stats={[
        { label: "اشباع ریوی SpO₂", value: `${fmt(satAlv, 1)} ٪`, color: satAlv < 90 ? "#ff6f61" : "#35d3c2" },
        { label: "اشباع بافتی", value: `${fmt(satTissue, 1)} ٪`, color: "#f2a83b", sub: "در PO₂=40" },
        { label: "اکسیژن تحویلی", value: `${fmt(delivered, 1)} ٪`, color: "#a5d95c", sub: "تفاضل ریه−بافت" },
        { label: "P50", value: `${fmt(p50, 0)} mmHg`, color: "#b388ff", sub: "نرمال ۲۷" },
        { label: "PO₂ ریوی", value: `${fmt(po2Alv, 0)} mmHg`, color: "#56b8ff" },
        { label: "وضعیت", value: satAlv < 88 ? "هیپوکسمی شدید" : satAlv < 92 ? "هیپوکسمی" : satAlv < 95 ? "مرزی" : "نرمال", color: satAlv < 92 ? "#ff6f61" : satAlv < 95 ? "#f2a83b" : "#a5d95c" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `Hill equation: Sat = PO2^n/(P50^n+PO2^n), n=2.7`,
        `Altitude=${fmt(S.alt, 0)} m -> alveolar PO2=${fmt(po2Alv, 0)} mmHg -> SpO2=${fmt(satAlv, 1)} pct`,
        `Bohr effect: PCO2=${fmt(S.pco2, 0)}, pH=${fmt(S.ph, 2)} -> P50=${fmt(p50, 1)} mmHg`,
      ]}
    />
  );
}
