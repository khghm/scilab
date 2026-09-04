import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { physScene as bg, hud, FA, MONO, rr, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== Incline ===================== */
export function InclineLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ ang: 30, mu: 0.2, m: 2, t: 0, s: 0, v: 0, running: false, stopped: false, samples: [] as { x: number; y: number }[], lastS: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "جسم روی سطح شیب‌دار — اگر tanθ>μs جسم سُر می‌خورد؛ شتاب a=g(sinθ−μcosθ)." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const rad = (S.ang * Math.PI) / 180;
  const canSlide = Math.tan(rad) > S.mu;
  const a = canSlide ? 9.81 * (Math.sin(rad) - S.mu * Math.cos(rad)) : 0;
  const reset = () => { S.t = 0; S.s = 0; S.v = 0; S.samples = []; S.lastS = 0; S.stopped = false; S.running = false; setRunning(false); force(); };

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (S.running) {
      if (canSlide) {
        S.v += a * ds; S.s += S.v * ds; S.t += ds;
        if (S.t - S.lastS >= 0.05) { S.samples.push({ x: Number(S.t.toFixed(2)), y: Number(S.s.toFixed(2)) }); S.lastS = S.t; }
        if (S.s > 8) { S.stopped = true; S.running = false; setRunning(false); pushFeed("ok", `فرود از سطح — v=${fmt(S.v, 2)} m/s در t=${fmt(S.t, 2)} s.`); }
      } else {
        S.running = false; setRunning(false);
        pushFeed("warn", `شیب کافی نیست: tanθ=${fmt(Math.tan(rad), 2)} ≤ μ=${fmt(S.mu, 2)} — اصطکاک ایستایی جسم را نگه داشت.`);
      }
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const ox = 140, oy = 440, L = 560;
    const tx = ox + L * Math.cos(rad), ty = oy - L * Math.sin(rad);
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = "rgba(143,188,184,0.4)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, oy); ctx.stroke();
    ctx.strokeStyle = "#f2a83b";
    ctx.beginPath(); ctx.arc(ox, oy, 54, -rad, 0); ctx.stroke();
    ctx.fillStyle = "#f2a83b"; ctx.font = `13px ${MONO}`;
    ctx.fillText(`θ=${fmt(S.ang, 0)}°`, ox + 62, oy - 12);
    const frac = Math.min(1, S.s / 8);
    const bx = ox + (tx - ox) * frac, by = oy - (oy - ty) * frac;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(-rad);
    ctx.fillStyle = "#56b8ff";
    rr(ctx, -24, -46, 48, 44, 5); ctx.fill();
    ctx.fillStyle = "#04191d"; ctx.font = `700 12px ${MONO}`; ctx.textAlign = "center";
    ctx.fillText(`${fmt(S.m, 0)}kg`, 0, -20);
    ctx.restore(); ctx.textAlign = "left";
    ctx.strokeStyle = "#ff6f61"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx, by - 24); ctx.lineTo(bx, by - 24 + Math.min(70, S.m * 9.81 * 3)); ctx.stroke();
    hud(ctx, 560, 90, 340, 140, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`a = ${fmt(a, 2)} m/s²`, 580, 118);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`v = ${fmt(S.v, 2)} m/s`, 580, 142);
    ctx.fillStyle = "#56b8ff"; ctx.fillText(`s = ${fmt(S.s, 2)} m`, 580, 166);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`N = ${fmt(S.m * 9.81 * Math.cos(rad), 1)} N`, 740, 118);
    ctx.fillStyle = canSlide ? "#a5d95c" : "#ff6f61";
    ctx.fillText(canSlide ? "در حال سُر خوردن" : "ایستا (tanθ ≤ μ)", 580, 196);
    frame.current++;
    if (frame.current % 6 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => { if (S.stopped || !S.running) { reset(); S.running = true; setRunning(true); } else { S.running = false; setRunning(false); } }}
      onReset={reset}
      simClock={`t = ${fmt(S.t, 1)} s`}
      hint="زاویه را زیر آستانه tanθ=μ نگه دارید تا اصطکاک ایستایی جسم را ثابت نگه دارد. جرم در شتاب نقشی ندارد!"
      protocol={[
        { label: "یافتن آستانه سُر خوردن", done: S.ev >= 1 },
        { label: "اجرا و ثبت s–t", done: S.samples.length > 10 },
        { label: "تغییر μ و تکرار", done: S.ev >= 2 },
        { label: "تأیید a=g(sinθ−μcosθ)", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="زاویه شیب θ" value={S.ang} min={5} max={70} step={1} digits={0} unit="°" accent="#f2a83b" onChange={(v) => { S.ang = v; reset(); }} />
        <Slider label="ضریب اصطکاک μ" value={S.mu} min={0} max={1.2} step={0.05} digits={2} accent="#ff6f61" onChange={(v) => { S.mu = v; reset(); }} />
        <Slider label="جرم m" value={S.m} min={0.5} max={6} step={0.5} digits={1} unit="kg" accent="#56b8ff" onChange={(v) => { S.m = v; reset(); }} />
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          آستانه: <span className="num text-teal">θc = atan(μ) = {fmt((Math.atan(S.mu) * 180) / Math.PI, 1)}°</span>
        </div>
      </div>}
      chart={<LiveChart series={[sr("جابجایی s (m)", "#56b8ff", S.samples)]} xLabel="t (s)" yLabel="s (m)" height={230} yMin={0} />}
      table={{ headers: ["t (s)", "s (m)", "v (m/s)"], rows: S.samples.filter((_, i) => i % 4 === 0).map((pp) => [pp.x, pp.y, Number((a * pp.x).toFixed(2))]) }}
      stats={[
        { label: "شتاب a", value: `${fmt(a, 2)} m/s²`, color: "#f2a83b", sub: "g(sinθ−μcosθ)" },
        { label: "نیروی عمودی N", value: `${fmt(S.m * 9.81 * Math.cos(rad), 1)} N`, color: "#e9f6f3" },
        { label: "اصطکاک μN", value: `${fmt(S.mu * S.m * 9.81 * Math.cos(rad), 1)} N`, color: "#ff6f61" },
        { label: "زاویه بحرانی", value: `${fmt((Math.atan(S.mu) * 180) / Math.PI, 1)}°`, color: "#35d3c2" },
        { label: "وضعیت", value: canSlide ? "سُر می‌خورد" : "ایستا", color: canSlide ? "#a5d95c" : "#ff6f61" },
        { label: "سرعت فعلی", value: `${fmt(S.v, 2)} m/s`, color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Incline: \\theta=${S.ang}^\\circ, \\mu=${fmt(S.mu, 2)}, m=${fmt(S.m, 1)}kg`, `a=g(\\sin\\theta-\\mu\\cos\\theta)=${fmt(a, 3)}m/s^2; slip when \\tan\\theta>\\mu`]} />
  );
}

/* ===================== Radioactive decay ===================== */
export function DecayLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ halfLife: 6, n0: 200, t: 0, running: false, lastS: 0, samples: [] as { x: number; y: number }[], atoms: [] as { x: number; y: number; alive: boolean }[], ev: 0, feed: [{ time: "#0", level: "info", msg: "واپاشی تصادفی هسته‌ها — در جمعیت بزرگ قانون نمایی N=N₀·2^(−t/T½) حاکم است." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const seed = () => {
    S.atoms = Array.from({ length: S.n0 }, (_, i) => ({ x: 130 + (i % 20) * 30 + Math.random() * 8, y: 140 + Math.floor(i / 20) * 28 + Math.random() * 8, alive: true }));
    S.t = 0; S.samples = []; S.lastS = 0; S.running = false; setRunning(false); force();
  };
  if (S.atoms.length === 0) seed();
  const lam = Math.LN2 / S.halfLife;
  const alive = S.atoms.filter((x) => x.alive).length;

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000 * 2;
    if (S.running) {
      S.t += ds;
      for (const x of S.atoms) if (x.alive && Math.random() < lam * ds) x.alive = false;
      if (S.t - S.lastS >= 0.25) { S.samples.push({ x: Number(S.t.toFixed(2)), y: S.atoms.filter((q) => q.alive).length }); S.lastS = S.t; }
      if (alive === 0) { S.running = false; setRunning(false); pushFeed("ok", "همه هسته‌ها واپاشیدند."); }
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    ctx.strokeStyle = "rgba(23,80,89,0.6)";
    rr(ctx, 100, 100, 620, 340, 10); ctx.stroke();
    for (const x of S.atoms) {
      if (x.alive) { ctx.fillStyle = "#35d3c2"; ctx.beginPath(); ctx.arc(x.x, x.y, 7, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = "rgba(143,188,184,0.25)"; ctx.beginPath(); ctx.arc(x.x, x.y, 6, 0, Math.PI * 2); ctx.fill(); }
    }
    hud(ctx, 760, 120, 160, 170, mode === "ar");
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = "#e9f6f3"; ctx.fillText(`N = ${alive}`, 778, 150);
    ctx.fillStyle = "#8fbcb8"; ctx.fillText(`N₀ = ${S.n0}`, 778, 174);
    ctx.fillText(`t = ${fmt(S.t, 1)}`, 778, 198);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`T½ = ${fmt(S.halfLife, 1)}`, 778, 222);
    ctx.fillStyle = "#35d3c2"; ctx.fillText(`تئوری=${fmt(S.n0 * Math.exp(-lam * S.t), 0)}`, 778, 246);
    ctx.fillStyle = "#ff6f61"; ctx.fillText(`λN=${fmt(lam * alive, 1)}/s`, 778, 270);
    frame.current++;
    if (frame.current % 6 === 0) force();
  }, true);

  const measuredHalf = (() => { const hit = S.samples.find((p) => p.y <= S.n0 / 2); return hit ? hit.x : NaN; })();
  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => { if (S.atoms.length === 0 || alive === 0) seed(); S.running = !S.running; setRunning(S.running); if (S.running && S.samples.length === 0) pushFeed("info", "شمارش آغاز شد — واپاشی‌ها تصادفی‌اند."); }}
      onReset={seed}
      simClock={`t = ${fmt(S.t, 1)} — N = ${alive}`}
      hint="با N₀ کوچک، نوسان آماری دور منحنی نظری بیشتر می‌شود — ماهیت تصادفی واپاشی."
      protocol={[
        { label: "اجرا و مشاهده واپاشی تصادفی", done: S.samples.length > 4 },
        { label: "انطباق با منحنی نمایی", done: S.samples.length > 8 },
        { label: "اندازه‌گیری نیمه‌عمر از داده", done: isFinite(measuredHalf) },
        { label: "کاهش N₀ و دیدن نوسان", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="نیمه‌عمر T½" value={S.halfLife} min={2} max={20} step={0.5} digits={1} unit="s" accent="#f2a83b" onChange={(v) => { S.halfLife = v; }} />
        <Slider label="تعداد اولیه N₀" value={S.n0} min={40} max={400} step={20} digits={0} accent="#35d3c2" onChange={(v) => { S.n0 = v; seed(); }} />
        <div className="flex gap-2">
          {([["کوتاه ۳s", 3], ["متوسط ۸s", 8], ["بلند ۱۶s", 16]] as [string, number][]).map(([nm, v]) => (
            <button key={nm} onClick={() => { S.halfLife = v; force(); }} className="flex-1 px-2 py-1.5 rounded text-[11px] border border-edge/70 text-fog hover:text-snow transition-colors cursor-pointer">{nm}</button>
          ))}
        </div>
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          <span className="num text-teal">λ = ln2/T½ = {fmt(lam, 3)} s⁻¹</span>
        </div>
      </div>}
      chart={<LiveChart series={[sr("N شمارش (تصادفی)", "#35d3c2", S.samples), sr("نظری نمایی", "#f2a83b", Array.from({ length: 60 }, (_, i) => ({ x: Number((((i / 59) * S.halfLife * 5)).toFixed(2)), y: Number((S.n0 * Math.exp(-lam * (i / 59) * S.halfLife * 5)).toFixed(0)) })))]} xLabel="t (s)" yLabel="N" height={230} yMin={0} />}
      table={{ headers: ["t (s)", "N", "N نظری", "T½ گذشته"], rows: S.samples.filter((_, i) => i % 4 === 0).map((p) => [p.x, p.y, Number((S.n0 * Math.exp(-lam * p.x)).toFixed(0)), Number((p.x / S.halfLife).toFixed(1))]) }}
      stats={[
        { label: "باقی‌مانده", value: `${alive}`, color: "#35d3c2" },
        { label: "کسر باقی‌مانده", value: `${fmt((alive / S.n0) * 100, 1)} ٪`, color: "#e9f6f3" },
        { label: "ثابت واپاشی λ", value: `${fmt(lam, 3)} s⁻¹`, color: "#f2a83b" },
        { label: "نیمه‌عمر اندازه‌گیری", value: isFinite(measuredHalf) ? `${fmt(measuredHalf, 1)} s` : "—", color: "#35d3c2" },
        { label: "نیمه‌عمر واقعی", value: `${fmt(S.halfLife, 1)} s`, color: "#e9f6f3" },
        { label: "فعالیت λN", value: `${fmt(lam * alive, 1)} Bq`, color: "#ff6f61" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`N=N_0 e^{-\\lambda t}, \\lambda=\\ln2/T_{1/2}=${fmt(lam, 4)}s^{-1}`, isFinite(measuredHalf) ? `Measured T(1/2)=${fmt(measuredHalf, 2)}s vs true ${fmt(S.halfLife, 1)}s` : `Awaiting data`]} />
  );
}
