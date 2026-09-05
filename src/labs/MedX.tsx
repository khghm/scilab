import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { faDigits, fmt, useForce, useRaf } from "../lib/utils";
import { medScene as bg, glow, monitor, hud, FA, MONO, rr, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== Renal GFR ===================== */
export function RenalLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ bp: 100, adh: 0.5, tv: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "خودتنظیمی کلیه — GFR بین فشارهای ۸۰ تا ۱۸۰ تقریباً ثابت می‌ماند (مکانیسم میوژنیک). ADH بازجذب آب را کنترل می‌کند." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const gfr = S.bp < 60 ? 0 : S.bp < 80 ? 125 * ((S.bp - 60) / 20) : S.bp < 180 ? 125 * (1 + (S.bp - 130) * 0.0006) : 125 * (1 + (S.bp - 180) * 0.004);
  const urine = Math.max(0.1, 1.2 * (1.1 - S.adh) * (gfr / 125));

  useRaf((dt) => {
    if (running) S.tv += Math.min(dt, 50) / 1000;
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    if (mode !== "ar") {
      glow(ctx, 300, 250, 130, [242, 168, 59], 0.12);
      glow(ctx, 300, 250, 70, [255, 200, 120], 0.10 + 0.06 * Math.sin(S.tv * 3));
    }
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 14;
    if (mode !== "ar") { ctx.shadowColor = "#f2a83b"; ctx.shadowBlur = 10; }
    ctx.beginPath(); ctx.arc(300, 250, 90, Math.PI * 0.5, Math.PI * 2.5); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#56b8ff"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(300, 340); ctx.lineTo(300, 430); ctx.quadraticCurveTo(300, 470, 340, 470); ctx.lineTo(430, 470); ctx.stroke();
    ctx.fillStyle = "#e9f6f3"; ctx.font = `12px ${FA}`;
    ctx.fillText("کپسول بومن + گلومرول", 210, 130);
    ctx.fillStyle = "#56b8ff";
    ctx.fillText("لوله پیچ‌خورده (بازجذب آب ← ADH)", 250, 500);
    const drops = Math.round((S.tv * urine * 3) % 3);
    for (let i = 0; i < drops; i++) {
      ctx.fillStyle = "rgba(86,184,255,0.7)";
      ctx.beginPath(); ctx.arc(470, 450 + ((S.tv * 60 * urine + i * 40) % 90), 4, 0, Math.PI * 2); ctx.fill();
    }
    hud(ctx, 560, 120, 340, 240, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`فشار خون = ${fmt(S.bp, 0)} mmHg`, 580, 150);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`GFR = ${fmt(gfr, 0)} mL/min`, 580, 178);
    ctx.fillStyle = "#56b8ff"; ctx.fillText(`ADH = ${fmt(S.adh, 2)}`, 580, 206);
    ctx.fillStyle = "#a5d95c"; ctx.fillText(`ادرار = ${fmt(urine, 2)} mL/min`, 580, 234);
    ctx.fillStyle = S.bp >= 80 && S.bp <= 180 ? "#a5d95c" : "#ff6f61";
    ctx.fillText(S.bp >= 80 && S.bp <= 180 ? "خودتنظیمی فعال — GFR پایدار" : "خارج از بازه خودتنظیمی!", 580, 266);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("بازه میوژنیک: ۸۰ تا ۱۸۰ میلی‌متر جیوه", 580, 300);
    ctx.fillText(S.adh < 0.3 ? "ADH کم → ادرار رقیق و زیاد (دیابت بی‌مزه)" : S.adh > 0.8 ? "ADH زیاد → ادرار غلیظ و کم" : "ADH متعادل", 580, 328);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.bp = 100; S.adh = 0.5; pushFeed("info", "به شرایط فیزیولوژیک بازگشت."); }}
      simClock={`GFR = ${fmt(gfr, 0)} mL/min`}
      hint="فشار خون را از ۸۰ تا ۱۸۰ تغییر دهید — GFR تقریباً ثابت می‌ماند؛ خارج از این بازه نارسایی شروع می‌شود."
      protocol={[
        { label: "مشاهده خودتنظیمی GFR", done: S.bp !== 100 },
        { label: "بازه ۸۰–۱۸۰ را پوشش دهید", done: S.ev >= 2 },
        { label: "اثر ADH بر ادرار", done: S.adh !== 0.5 },
        { label: "فشار زیر ۶۰ (نارسایی)", done: S.bp < 70 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="فشار خون شریانی" value={S.bp} min={40} max={200} step={2} digits={0} unit="mmHg" accent="#ff6f61" onChange={(v) => { S.bp = v; if (v < 60) pushFeed("error", "فشار زیر ۶۰ — گلومرول دیگر فیلتر نمی‌کند؛ نارسایی حاد کلیه."); else if (v > 180) pushFeed("warn", "فشار بالای بازه خودتنظیمی — GFR به‌سرعت بالا می‌رود و آسیب گلومرولی شروع می‌شود."); force(); }} />
        <Slider label="سطح ADH" value={S.adh} min={0} max={1} step={0.05} digits={2} accent="#56b8ff" onChange={(v) => { S.adh = v; force(); }} />
      </div>}
      chart={<LiveChart series={[sr("GFR بر حسب فشار", "#35d3c2", Array.from({ length: 81 }, (_, i) => { const bp = 40 + i * 2; const g = bp < 60 ? 0 : bp < 80 ? 125 * ((bp - 60) / 20) : bp < 180 ? 125 * (1 + (bp - 130) * 0.0006) : 125 * (1 + (bp - 180) * 0.004); return { x: bp, y: Number(g.toFixed(0)) }; })), sr("وضعیت فعلی", "#ff6f61", [{ x: S.bp, y: gfr }, { x: S.bp, y: gfr }])]} xLabel="فشار (mmHg)" yLabel="GFR (mL/min)" height={230} yMin={0} />}
      table={{ headers: ["فشار (mmHg)", "GFR", "وضعیت"], rows: [50, 70, 90, 120, 150, 190].map((bp) => { const g = bp < 60 ? 0 : bp < 80 ? 125 * ((bp - 60) / 20) : bp < 180 ? 125 * (1 + (bp - 130) * 0.0006) : 125 * (1 + (bp - 180) * 0.004); return [bp, Number(g.toFixed(0)), bp < 60 ? "نارسایی" : bp < 80 ? "کاهش" : bp <= 180 ? "خودتنظیمی" : "آسیب"]; }) }}
      stats={[
        { label: "GFR", value: `${fmt(gfr, 0)} mL/min`, color: "#35d3c2", sub: "نرمال ≈ ۱۲۵" },
        { label: "فشار خون", value: `${fmt(S.bp, 0)} mmHg`, color: "#ff6f61" },
        { label: "خودتنظیمی", value: S.bp >= 80 && S.bp <= 180 ? "فعال" : "غیرفعال", color: S.bp >= 80 && S.bp <= 180 ? "#a5d95c" : "#ff6f61" },
        { label: "ADH", value: fmt(S.adh, 2), color: "#56b8ff" },
        { label: "نرخ ادرار", value: `${fmt(urine, 2)} mL/min`, color: "#a5d95c" },
        { label: "فیلتراسیون روزانه", value: `${fmt((gfr * 1440) / 1000, 0)} L/روز`, color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Renal autoregulation: GFR ~ 125 mL/min for MAP 80-180 mmHg (myogenic)`, `ADH=${fmt(S.adh, 2)} => urine flow=${fmt(urine, 2)} mL/min`]} />
  );
}

/* ===================== Glucose–insulin ===================== */
export function GlucoseLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ sens: 1, t: 0, G: 90, I: 10, samples: [] as { x: number; y: number; i: number }[], lastS: 0, meals: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "حلقه بازخورد منفی انسولین–گلوکز — وعده غذایی بدهید و پاسخ پانکراس را ببینید. حساسیت را کم کنید تا مقاومت انسولینی شبیه‌سازی شود." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const meal = () => {
    S.G += 80; S.meals++;
    pushFeed("info", `وعده ${faDigits(S.meals)} — گلوکز به ${fmt(S.G, 0)} mg/dL جهش کرد؛ پانکراس انسولین ترشح می‌کند.`);
    if (S.sens < 0.5) pushFeed("warn", "حساسیت کم است — بازگشت به خط پایه کند و قله بلندتر می‌شود (پیش‌دیابت).");
  };

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000 * 3;
    if (running) {
      S.t += ds;
      const dG = -(0.25 * S.sens * (S.I / 10) * (S.G - 70) + 0.05 * (S.G - 90)) * ds * 0.6;
      const dI = (0.9 * Math.max(0, S.G - 90) - 0.35 * (S.I - 10)) * ds * 0.6;
      S.G = Math.max(60, S.G + dG);
      S.I = Math.max(2, S.I + dI);
      if (S.t - S.lastS >= 0.5) { S.samples.push({ x: Number(S.t.toFixed(1)), y: Number(S.G.toFixed(0)), i: Number(S.I.toFixed(1)) }); if (S.samples.length > 300) S.samples.shift(); S.lastS = S.t; }
      if (S.G > 180 && S.ev % 4 === 0) pushFeed("warn", `هایپرگلیسمی — قند ${fmt(S.G, 0)} mg/dL از آستانه کلیوی ۱۸۰ گذشت.`);
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const gx = 90, gy = 90, gw = 480, gh = 360;
    ctx.strokeStyle = "rgba(143,188,184,0.4)";
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    const t0 = Math.max(0, S.t - 60);
    const vis = S.samples.filter((p) => p.x >= t0);
    const Yg = (g: number) => gy + gh - ((g - 50) / 180) * gh;
    const Yi = (i: number) => gy + gh - (i / 60) * gh;
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2.5;
    if (mode !== "ar") { ctx.shadowColor = "#f2a83b"; ctx.shadowBlur = 8; }
    ctx.beginPath();
    vis.forEach((p, idx) => (idx === 0 ? ctx.moveTo(gx + ((p.x - t0) / 60) * gw, Yg(p.y)) : ctx.lineTo(gx + ((p.x - t0) / 60) * gw, Yg(p.y))));
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (vis.length) {
      const lastG = vis[vis.length - 1];
      if (mode !== "ar") glow(ctx, gx + ((lastG.x - t0) / 60) * gw, Yg(lastG.y), 22, [242, 168, 59], 0.4);
    }
    ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 1.8;
    ctx.beginPath();
    vis.forEach((p, idx) => (idx === 0 ? ctx.moveTo(gx + ((p.x - t0) / 60) * gw, Yi(p.i)) : ctx.lineTo(gx + ((p.x - t0) / 60) * gw, Yi(p.i))));
    ctx.stroke();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = "rgba(255,111,97,0.6)";
    ctx.beginPath(); ctx.moveTo(gx, Yg(180)); ctx.lineTo(gx + gw, Yg(180)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ff6f61"; ctx.font = `10px ${FA}`; ctx.fillText("آستانه کلیوی ۱۸۰", gx + gw - 110, Yg(180) - 6);
    ctx.fillStyle = "#f2a83b"; ctx.fillText("گلوکز", gx + 10, gy + 20);
    ctx.fillStyle = "#35d3c2"; ctx.fillText("انسولین", gx + 70, gy + 20);
    monitor(ctx, 620, 120, 290, 230, mode === "ar", "#f2a83b");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`گلوکز = ${fmt(S.G, 0)} mg/dL`, 640, 150);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`انسولین = ${fmt(S.I, 1)} µU/mL`, 640, 178);
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`حساسیت = ${fmt(S.sens, 2)}`, 640, 206);
    ctx.fillStyle = S.G > 140 ? "#ff6f61" : S.G < 70 ? "#56b8ff" : "#a5d95c";
    ctx.fillText(S.G > 140 ? "هایپرگلیسمی" : S.G < 70 ? "هیپوگلیسمی" : "نرمال (۷۰–۱۴۰)", 640, 234);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("بازخورد منفی: قند↑ → انسولین↑ → قند↓", 640, 270);
    ctx.fillText(S.sens < 0.5 ? "مقاومت انسولینی — پاسخ کند" : "حساسیت طبیعی", 640, 298);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.t = 0; S.G = 90; S.I = 10; S.samples = []; S.meals = 0; pushFeed("info", "به حالت ناشتا بازگشت."); }}
      simClock={`قند = ${fmt(S.G, 0)} mg/dL`}
      hint="چند وعده پشت‌سرهم با حساسیت کم بدهید — قله‌ها بلندتر و بازگشت کندتر می‌شود؛ تصویر مقاومت انسولینی."
      protocol={[
        { label: "ثبت خط پایه ناشتا", done: S.samples.length > 6 },
        { label: "وعده و پاسخ انسولین", done: S.meals >= 1 },
        { label: "بازگشت به خط پایه", done: S.meals >= 1 && S.G < 110 },
        { label: "شبیه‌سازی مقاومت انسولینی", done: S.sens < 0.6 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <button onClick={meal} className="w-full px-4 py-3 rounded-lg font-bold text-sm transition-all active:scale-95 cursor-pointer" style={{ background: "#f2a83b", color: "#04191d" }}>
          وعده غذایی (+۸۰ mg/dL)
        </button>
        <Slider label="حساسیت به انسولین" value={S.sens} min={0.2} max={1.5} step={0.05} digits={2} accent="#35d3c2" onChange={(v) => { S.sens = v; if (v < 0.5) pushFeed("warn", "حساسیت پایین — مقاومت انسولینی فعال شد."); force(); }} />
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          {"نرمال ناشتا: ۷۰–۱۰۰ · پس از غذا کمتر از ۱۴۰ mg/dL"}
        </div>
      </div>}
      chart={<LiveChart series={[sr("گلوکز (mg/dL)", "#f2a83b", S.samples.map((p) => ({ x: p.x, y: p.y }))), sr("انسولین (µU/mL)", "#35d3c2", S.samples.map((p) => ({ x: p.x, y: p.i })))]} xLabel="t (s)" yLabel="غلظت" height={230} yMin={0} />}
      table={{ headers: ["t (s)", "گلوکز", "انسولین"], rows: S.samples.filter((_, i) => i % 4 === 0).map((p) => [p.x, p.y, p.i]) }}
      stats={[
        { label: "گلوکز", value: `${fmt(S.G, 0)} mg/dL`, color: "#f2a83b" },
        { label: "انسولین", value: `${fmt(S.I, 1)} µU/mL`, color: "#35d3c2" },
        { label: "وضعیت", value: S.G > 140 ? "هایپر" : S.G < 70 ? "هیپو" : "نرمال", color: S.G > 140 ? "#ff6f61" : S.G < 70 ? "#56b8ff" : "#a5d95c" },
        { label: "حساسیت", value: fmt(S.sens, 2), color: "#e9f6f3", sub: S.sens < 0.5 ? "مقاومت" : "طبیعی" },
        { label: "وعده‌ها", value: `${S.meals}`, color: "#e9f6f3" },
        { label: "قله پس از آخرین وعده", value: S.samples.length ? `${fmt(Math.max(...S.samples.slice(-40).map((p) => p.y)), 0)}` : "—", color: "#f2a83b" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Glucose-insulin negative feedback; sensitivity=${fmt(S.sens, 2)}`, `Fasting 70-100, postprandial <140 mg/dL; renal threshold 180`]} />
  );
}

/* ===================== Reflex time ===================== */
export function ReflexLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ state: "idle" as "idle" | "wait" | "go" | "early" | "done", t0: 0, delay: 0, times: [] as number[], ev: 0, feed: [{ time: "#0", level: "info", msg: "زمان واکنش — دکمه را بزنید، صبر کنید تا صحنه سبز شود، سپس سریع‌ترین کلیک را بکنید. مسیر: گیرنده ← عصب حسی ← نخاع/مغز ← عصب حرکتی ← ماهیچه." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const timer = useRef<number | null>(null);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const start = () => {
    S.state = "wait"; S.delay = 1200 + Math.random() * 2500;
    timer.current = window.setTimeout(() => { S.state = "go"; S.t0 = performance.now(); force(); }, S.delay);
    force();
  };
  const click = () => {
    if (S.state === "wait") {
      if (timer.current) clearTimeout(timer.current);
      S.state = "early";
      pushFeed("warn", "زود کلیک کردید — قبل از محرک! این خطای رویه است؛ صبر کنید تا سبز شود.");
      force();
      return;
    }
    if (S.state === "go") {
      const rt = performance.now() - S.t0;
      S.times = [...S.times, Math.round(rt)];
      S.state = "done";
      pushFeed(rt < 200 ? "ok" : "info", `زمان واکنش ${fmt(rt, 0)} میلی‌ثانیه ثبت شد ${rt < 200 ? "— عالی!" : ""}.`);
      force();
    }
  };
  const mean = S.times.length ? S.times.reduce((a, b) => a + b, 0) / S.times.length : NaN;
  const sd = S.times.length > 1 ? Math.sqrt(S.times.reduce((s, v) => s + (v - mean) ** 2, 0) / (S.times.length - 1)) : NaN;
  const draw = () => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const col = S.state === "go" ? "#a5d95c" : S.state === "wait" ? "#ff6f61" : S.state === "early" ? "#f2a83b" : S.state === "done" ? "#35d3c2" : "#2a7a80";
    if (mode !== "ar" && S.state === "go") glow(ctx, 480, 250, 320, [165, 217, 92], 0.20);
    if (mode !== "ar" && S.state === "wait") glow(ctx, 480, 250, 260, [255, 111, 97], 0.10);
    ctx.fillStyle = `${col}22`; ctx.strokeStyle = col; ctx.lineWidth = 4;
    if (mode !== "ar") { ctx.shadowColor = col; ctx.shadowBlur = 16; }
    rr(ctx, 180, 100, 600, 300, 20); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textAlign = "center"; ctx.font = `700 34px ${FA}`;
    ctx.fillStyle = col;
    const msg = S.state === "go" ? "حالا کلیک کن!" : S.state === "wait" ? "صبر کن..." : S.state === "early" ? "خیلی زود بود!" : S.state === "done" ? `${fmt(S.times[S.times.length - 1], 0)} میلی‌ثانیه` : "دکمه اجرا را بزن";
    ctx.fillText(msg, 480, 240);
    ctx.font = `13px ${FA}`; ctx.fillStyle = "#8fbcb8";
    ctx.fillText("گیرنده → عصب حسی → CNS → عصب حرکتی → ماهیچه", 480, 290);
    // traveling nerve impulse dots along the reflex arc
    if (S.state === "go" || S.state === "done") {
      const tt = performance.now() / 1000;
      for (let i = 0; i < 5; i++) {
        const u = ((tt * 1.4 + i / 5) % 1);
        const nx = 200 + u * 560;
        if (mode !== "ar") glow(ctx, nx, 320, 12, [53, 211, 194], 0.5);
        ctx.fillStyle = "#35d3c2";
        ctx.beginPath(); ctx.arc(nx, 320, 3.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = "rgba(53,211,194,0.3)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(200, 320); ctx.lineTo(760, 320); ctx.stroke();
    }
    ctx.textAlign = "left";
    monitor(ctx, 240, 430, 480, 70, mode === "ar", "#a5d95c");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`تلاش‌ها: ${S.times.length}   میانگین: ${isFinite(mean) ? fmt(mean, 0) : "—"} ms`, 262, 460);
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`SD = ${isFinite(sd) ? fmt(sd, 0) : "—"} ms   بهترین: ${S.times.length ? fmt(Math.min(...S.times), 0) : "—"} ms`, 262, 486);
  };
  draw();

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={S.state === "wait" || S.state === "go"}
      onToggleRun={() => { if (S.state === "wait" || S.state === "go") return; start(); }}
      onReset={() => { if (timer.current) clearTimeout(timer.current); S.state = "idle"; S.times = []; pushFeed("info", "آمار پاک شد."); }}
      simClock={`میانگین = ${isFinite(mean) ? fmt(mean, 0) : "—"} ms`}
      hint="محرک تصادفی است — حدس نزنید. ۵ تلاش بزنید تا میانگین پایدار شود؛ کلیک زودهنگام خطای رویه است."
      protocol={[
        { label: "اولین زمان واکنش", done: S.times.length >= 1 },
        { label: "۵ تلاش کامل", done: S.times.length >= 5 },
        { label: "بدون کلیک زودهنگام", done: S.times.length >= 3 && !S.feed.some((f) => f.msg.includes("زود")) },
        { label: "محاسبه میانگین و SD", done: S.times.length >= 5 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className={`block w-full h-auto ${S.state === "go" ? "cursor-pointer" : ""}`} onClick={click} />}
      controls={<div className="space-y-5">
        <button onClick={start} disabled={S.state === "wait" || S.state === "go"}
          className="w-full px-4 py-3 rounded-lg font-bold text-sm transition-all active:scale-95 cursor-pointer disabled:opacity-40"
          style={{ background: "#a5d95c", color: "#04191d" }}>
          {S.state === "wait" ? "منتظر محرک..." : "شروع تلاش جدید"}
        </button>
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          زمان واکنش بصری نرمال: ۲۰۰ تا ۲۵۰ میلی‌ثانیه.
          <br />قوس بازتاب نخاعی (بدون مغز) بسیار سریع‌تر است (~۵۰ms).
        </div>
      </div>}
      chart={<LiveChart series={[sr("زمان واکنش هر تلاش (ms)", "#a5d95c", S.times.map((t, i) => ({ x: i + 1, y: t }))), sr("میانگین", "#f2a83b", S.times.length ? [{ x: 1, y: mean }, { x: S.times.length, y: mean }] : [])]} xLabel="تلاش" yLabel="ms" height={230} yMin={0} />}
      table={{ headers: ["تلاش", "زمان (ms)", "انحراف از میانگین"], rows: S.times.map((t, i) => [i + 1, t, isFinite(mean) ? Number((t - mean).toFixed(0)) : 0]) }}
      stats={[
        { label: "میانگین", value: isFinite(mean) ? `${fmt(mean, 0)} ms` : "—", color: "#a5d95c" },
        { label: "انحراف معیار", value: isFinite(sd) ? `${fmt(sd, 0)} ms` : "—", color: "#35d3c2" },
        { label: "بهترین", value: S.times.length ? `${fmt(Math.min(...S.times), 0)} ms` : "—", color: "#f2a83b" },
        { label: "تعداد تلاش", value: `${S.times.length}`, color: "#e9f6f3" },
        { label: "SEM", value: S.times.length > 1 ? `${fmt(sd / Math.sqrt(S.times.length), 0)} ms` : "—", color: "#56b8ff" },
        { label: "وضعیت", value: S.state === "go" ? "حالا کلیک کن!" : S.state === "wait" ? "صبر کن" : "آماده", color: S.state === "go" ? "#a5d95c" : "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Reaction time: n=${S.times.length}, mean=${isFinite(mean) ? fmt(mean, 0) : "-"}ms, SD=${isFinite(sd) ? fmt(sd, 0) : "-"}ms`, `Visual RT normal range 200-250 ms`]} />
  );
}

/* ===================== PV loop ===================== */
export function PvLoopLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ pre: 120, after: 90, cont: 1.4, tv: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "حلقه فشار–حجم بطن چپ — مساحت حلقه برابر کار ضربه‌ای است. پیش‌بار، پس‌بار و انقباض‌پذیری را تغییر دهید." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const loop = () => {
    const vEs = 50 + S.pre * 0.2 - S.cont * 10;
    const vEd = 120 + S.pre * 0.3;
    const pts: { v: number; p: number }[] = [];
    for (let i = 0; i <= 24; i++) pts.push({ v: vEd, p: 5 + (i / 24) * (S.after - 5) });
    for (let i = 0; i <= 24; i++) { const v = vEd - (i / 24) * (vEd - vEs); pts.push({ v, p: S.after + S.cont * 20 * Math.sin((i / 24) * Math.PI) }); }
    for (let i = 0; i <= 24; i++) pts.push({ v: vEs, p: S.after - (i / 24) * (S.after - 3) });
    for (let i = 0; i <= 24; i++) { const v = vEs + (i / 24) * (vEd - vEs); pts.push({ v, p: 3 + (i / 24) * 4 }); }
    return { pts, vEs, vEd };
  };

  useRaf((dt) => {
    if (running) S.tv += Math.min(dt, 50) / 1000;
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const gx = 140, gy = 80, gw = 420, gh = 380;
    ctx.strokeStyle = "rgba(143,188,184,0.4)";
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    const { pts, vEs, vEd } = loop();
    const X = (v: number) => gx + ((v - 30) / 160) * gw;
    const Y = (p: number) => gy + gh - (p / 160) * gh;
    ctx.strokeStyle = "#ff6f61"; ctx.lineWidth = 2.5;
    if (mode !== "ar") { ctx.shadowColor = "#ff6f61"; ctx.shadowBlur = 9; }
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.v), Y(p.p)) : ctx.lineTo(X(p.v), Y(p.p))));
    ctx.closePath();
    ctx.fillStyle = "rgba(255,111,97,0.12)"; ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    const idx = Math.floor((S.tv * 24) % pts.length);
    const cur = pts[idx];
    if (mode !== "ar") glow(ctx, X(cur.v), Y(cur.p), 26, [53, 211, 194], 0.4);
    ctx.fillStyle = "#35d3c2";
    ctx.beginPath(); ctx.arc(X(cur.v), Y(cur.p), 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(233,246,243,0.9)";
    ctx.beginPath(); ctx.arc(X(cur.v) - 2, Y(cur.p) - 2, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${MONO}`;
    ctx.fillText("حجم (mL)", gx + gw - 70, gy + gh + 22);
    ctx.fillText("فشار (mmHg)", gx + 8, gy + 14);
    monitor(ctx, 620, 120, 290, 250, mode === "ar", "#ff6f61");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`V = ${fmt(cur.v, 0)} mL  P = ${fmt(cur.p, 0)}`, 640, 150);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`SV = ${fmt(vEd - vEs, 0)} mL`, 640, 178);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`EF = ${fmt(((vEd - vEs) / vEd) * 100, 0)}٪`, 640, 206);
    ctx.fillStyle = "#a5d95c"; ctx.fillText(`کار ضربه‌ای ≈ ${fmt((vEd - vEs) * S.after * 0.0133 * 0.8, 1)} J`, 640, 234);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("پیش‌بار ↑ → حجم پایان‌دیاستول ↑ (فرانک–استارلینگ)", 640, 270);
    ctx.fillText("پس‌بار ↑ → پهن‌تر شدن حلقه (کار بیشتر)", 640, 298);
    ctx.fillText("انقباض‌پذیری ↑ → حجم پایان‌سیستول ↓", 640, 326);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const { vEs, vEd } = loop();
  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.pre = 120; S.after = 90; S.cont = 1.4; pushFeed("info", "به شرایط پایه بازگشت."); }}
      simClock={`SV = ${fmt(vEd - vEs, 0)} mL — EF ${fmt(((vEd - vEs) / vEd) * 100, 0)}٪`}
      hint="پس‌بار را بالا ببرید تا حلقه پهن‌تر و کار بیشتر شود؛ انقباض‌پذیری را کم کنید تا EF افت کند (نارسایی)."
      protocol={[
        { label: "مشاهده چرخه قلبی روی حلقه", done: true },
        { label: "اثر پیش‌بار (فرانک–استارلینگ)", done: S.pre !== 120 },
        { label: "اثر پس‌بار بر کار", done: S.after !== 90 },
        { label: "افت EF با کاهش انقباض‌پذیری", done: S.cont < 1 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="پیش‌بار (پر شدن)" value={S.pre} min={60} max={200} step={5} digits={0} accent="#56b8ff" onChange={(v) => { S.pre = v; force(); }} />
        <Slider label="پس‌بار (فشار آئورت)" value={S.after} min={60} max={140} step={2} digits={0} unit="mmHg" accent="#ff6f61" onChange={(v) => { S.after = v; force(); }} />
        <Slider label="انقباض‌پذیری" value={S.cont} min={0.4} max={2} step={0.1} digits={1} accent="#a5d95c" onChange={(v) => { S.cont = v; if (v < 0.8) pushFeed("warn", "انقباض‌پذیری ضعیف — EF پایین آمد؛ تصویر نارسایی سیستولی."); force(); }} />
      </div>}
      chart={<LiveChart series={[sr("SV بر حسب پیش‌بار", "#56b8ff", Array.from({ length: 15 }, (_, i) => { const pre = 60 + i * 10; const e2 = 120 + pre * 0.3; const s2 = 50 + pre * 0.2 - S.cont * 10; return { x: pre, y: e2 - s2 }; })), sr("وضعیت فعلی", "#ff6f61", [{ x: S.pre, y: vEd - vEs }, { x: S.pre, y: vEd - vEs }])]} xLabel="پیش‌بار" yLabel="SV (mL)" height={230} yMin={0} />}
      table={{ headers: ["کمیت", "مقدار", "نرمال"], rows: [["حجم پایان‌دیاستول", Number(vEd.toFixed(0)) + " mL", "≈155"], ["حجم پایان‌سیستول", Number(vEs.toFixed(0)) + " mL", "≈65"], ["حجم ضربه‌ای", Number((vEd - vEs).toFixed(0)) + " mL", "≈70"], ["کسر جهشی EF", Number((((vEd - vEs) / vEd) * 100).toFixed(0)) + "٪", "55-70٪"]] }}
      stats={[
        { label: "حجم ضربه‌ای SV", value: `${fmt(vEd - vEs, 0)} mL`, color: "#35d3c2" },
        { label: "کسر جهشی EF", value: `${fmt(((vEd - vEs) / vEd) * 100, 0)} ٪`, color: ((vEd - vEs) / vEd) < 0.4 ? "#ff6f61" : "#a5d95c" },
        { label: "برون‌ده (HR=72)", value: `${fmt(((vEd - vEs) * 72) / 1000, 1)} L/min`, color: "#e9f6f3" },
        { label: "کار ضربه‌ای", value: `${fmt((vEd - vEs) * S.after * 0.0133 * 0.8, 1)} J`, color: "#f2a83b" },
        { label: "حجم پایان‌دیاستول", value: `${fmt(vEd, 0)} mL`, color: "#56b8ff" },
        { label: "حجم پایان‌سیستول", value: `${fmt(vEs, 0)} mL`, color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`LV pressure-volume loop; EDV=${fmt(vEd, 0)}mL, ESV=${fmt(vEs, 0)}mL`, `SV=${fmt(vEd - vEs, 0)}mL; EF=${fmt(((vEd - vEs) / vEd) * 100, 0)}\\%; Starling: preload->SV`]} />
  );
}
