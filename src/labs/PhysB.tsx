import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { bg, hud, FA, MONO, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== Quantum box ===================== */
const E1 = 0.376; // eV for electron in L=1nm
export function QuantumBoxLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ n: 2, sup: false, tv: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "ذره در جعبه — ترازهای انرژی Eₙ=n²E₁ و توابع موج ایستاده. حالت برهم‌نهی را فعال کنید تا نوسان زمانی |Ψ|² را ببینید." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const En = (n: number) => E1 * n * n;
  const psi = (n: number, x: number) => Math.sqrt(2) * Math.sin(n * Math.PI * x);
  const prob = (x: number, t: number) => {
    if (!S.sup) return psi(S.n, x) ** 2;
    const w = 2 * Math.PI * (En(2) - En(1)) * t * 2;
    const p = (psi(1, x) + psi(2, x) * Math.cos(w)) ** 2 + (psi(2, x) * Math.sin(w)) ** 2;
    return p / 2;
  };

  useRaf((dt) => {
    if (running) S.tv += Math.min(dt, 50) / 1000;
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const bx = 120, bw = 420, cy = 300, amp = 110;
    ctx.strokeStyle = "rgba(233,246,243,0.6)"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(bx, cy - 170); ctx.lineTo(bx, cy + 170); ctx.moveTo(bx + bw, cy - 170); ctx.lineTo(bx + bw, cy + 170); ctx.stroke();
    ctx.setLineDash([5, 6]); ctx.strokeStyle = "rgba(143,188,184,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, cy); ctx.lineTo(bx + bw, cy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = i / 120, y = cy - psi(S.n, x) * amp * 0.9 * Math.cos(2 * Math.PI * En(S.n) * S.tv * 2);
      if (i === 0) ctx.moveTo(bx + x * bw, y); else ctx.lineTo(bx + x * bw, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "#f2a83b"; ctx.fillStyle = "rgba(242,168,59,0.16)";
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = i / 120, y = cy + 150 - prob(x, S.tv) * 70;
      if (i === 0) ctx.moveTo(bx + x * bw, y); else ctx.lineTo(bx + x * bw, y);
    }
    ctx.lineTo(bx + bw, cy + 150); ctx.lineTo(bx, cy + 150); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("ψₙ (آبی) — |Ψ|² (کهربایی)", bx, 120);
    for (let k = 1; k <= 4; k++) {
      const lvl = 460 - (En(k) / En(4)) * 250;
      ctx.strokeStyle = k === S.n ? "#35d3c2" : "rgba(143,188,184,0.5)";
      ctx.lineWidth = k === S.n ? 3 : 1.5;
      ctx.beginPath(); ctx.moveTo(640, lvl); ctx.lineTo(880, lvl); ctx.stroke();
      ctx.fillStyle = k === S.n ? "#35d3c2" : "#8fbcb8";
      ctx.font = `12px ${MONO}`;
      ctx.fillText(`n=${k}  E=${fmt(En(k), 2)} eV`, 700, lvl - 8);
    }
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const lam21 = 1240 / (En(2) - En(1));
  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.n = 2; S.sup = false; pushFeed("info", "به تراز n=2 بازگشت."); }}
      simClock={`E${S.n} = ${fmt(En(S.n), 2)} eV`}
      hint="ترازها را عوض کنید — تعداد گره‌های ψ برابر n−1 است. برهم‌نهی ۱+۲ چگالی احتمال را در جعبه به نوسان درمی‌آورد."
      protocol={[
        { label: "مشاهده ترازها Eₙ=n²E₁", done: true },
        { label: "شمارش گره‌ها (n−1)", done: S.ev >= 1 || S.n >= 3 },
        { label: "فعال‌کردن برهم‌نهی", done: S.sup },
        { label: "محاسبه λ گذار ۲→۱", done: S.ev >= 1 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="عدد کوانتومی n" value={S.n} min={1} max={4} step={1} digits={0} accent="#35d3c2" onChange={(v) => { S.n = v; pushFeed("info", `تراز n=${v}: E=${fmt(En(v), 2)} eV — ${v - 1} گره.`); }} />
        <button onClick={() => { S.sup = !S.sup; pushFeed("info", S.sup ? "برهم‌نهی Ψ=(ψ₁+ψ₂)/√۲ فعال شد — نوسان کوانتومی آغاز." : "به حالت ماندا بازگشت."); force(); }}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer"
          style={S.sup ? { borderColor: "#f2a83b", color: "#f2a83b", background: "#f2a83b0f" } : { borderColor: "#175059", color: "#8fbcb8" }}>
          {S.sup ? "برهم‌نهی ۱+۲: فعال" : "فعال‌کردن برهم‌نهی ۱+۲"}
        </button>
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          <span className="num text-teal">Eₙ = n²h²/(8mL²)</span> با L=۱ نانومتر و الکترون → E₁≈۰٫۳۸ eV
        </div>
      </div>}
      chart={<LiveChart series={[sr("Eₙ (eV)", "#35d3c2", [1, 2, 3, 4, 5, 6].map((n) => ({ x: n, y: En(n) }))), sr("وضعیت فعلی", "#f2a83b", [{ x: S.n, y: En(S.n) }, { x: S.n, y: En(S.n) }])]} xLabel="n" yLabel="E (eV)" height={230} yMin={0} />}
      table={{ headers: ["n", "Eₙ (eV)", "ΔE از پایه", "گره‌ها"], rows: [1, 2, 3, 4].map((n) => [n, Number(En(n).toFixed(2)), Number((En(n) - E1).toFixed(2)), n - 1]) }}
      stats={[
        { label: "انرژی تراز فعلی", value: `${fmt(En(S.n), 2)} eV`, color: "#35d3c2" },
        { label: "انرژی پایه E₁", value: `${fmt(E1, 2)} eV`, color: "#e9f6f3" },
        { label: "گذار ۲→۱", value: `${fmt(En(2) - E1, 2)} eV`, color: "#f2a83b" },
        { label: "λ گذار ۲→۱", value: `${fmt(lam21, 0)} nm`, color: "#56b8ff", sub: "hc/ΔE" },
        { label: "تعداد گره‌ها", value: `${S.n - 1}`, color: "#e9f6f3" },
        { label: "حالت", value: S.sup ? "برهم‌نهی" : "ماندا", color: S.sup ? "#f2a83b" : "#a5d95c" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Particle in box: E_n = n^2 h^2/(8mL^2), L=1nm, E1=${fmt(E1, 3)} eV`, `Transition 2->1: \\Delta E=${fmt(En(2) - E1, 3)} eV, \\lambda=${fmt(lam21, 0)} nm`]} />
  );
}

/* ===================== Standing waves ===================== */
export function StandingWaveLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ f: 30, T: 80, muG: 5, amp: 42, tv: 0, hit: [] as number[], ev: 0, feed: [{ time: "#0", level: "info", msg: "رشته‌ای به طول ۲ متر — بسامد را جاروب کنید تا مودهای تشدید پیدا شوند؛ گره‌ها ساکن می‌مانند." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const mu = S.muG / 1000, v = Math.sqrt(S.T / mu);
  const fn = (n: number) => (n * v) / 4;
  const resAt = (f: number) => { let b = 0; for (let n = 1; n <= 8; n++) { const u = (f - fn(n)) / (fn(n) / 14); b = Math.max(b, 1 / (1 + u * u)); } return b; };
  const nStar = Math.max(1, Math.min(8, Math.round((4 * S.f) / v)));
  const res = resAt(S.f);

  useRaf((dt) => {
    if (running) S.tv += Math.min(dt, 50) / 1000;
    if (res > 0.8 && !S.hit.includes(nStar)) {
      S.hit = [...S.hit, nStar];
      pushFeed("ok", `تشدید در مود n=${nStar} — f=${fmt(S.f, 1)} Hz با fₙ=${fmt(fn(nStar), 1)} Hz منطبق است.`);
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const x0 = 110, x1 = 900, cy = 250;
    const X = (x: number) => x0 + (x / 2) * (x1 - x0);
    ctx.fillStyle = "#2a7a80";
    ctx.fillRect(x0 - 14, cy - 90, 12, 180); ctx.fillRect(x1 + 2, cy - 90, 12, 180);
    const osc = Math.sin(2 * Math.PI * (S.f / 9) * S.tv) * 7 * res;
    ctx.fillStyle = "#f2a83b";
    ctx.beginPath(); ctx.arc(x0 - 22, cy + osc, 9, 0, Math.PI * 2); ctx.fill();
    const A = S.amp * (0.15 + 0.85 * res);
    ctx.setLineDash([5, 5]); ctx.strokeStyle = "rgba(53,211,194,0.4)"; ctx.lineWidth = 1.2;
    for (const sgn of [1, -1]) {
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const x = (i / 120) * 2, y = cy + sgn * A * Math.sin((nStar * Math.PI * x) / 2);
        if (i === 0) ctx.moveTo(X(x), y); else ctx.lineTo(X(x), y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = res > 0.8 ? "#ffd08a" : "#e9f6f3"; ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = (i / 120) * 2;
      const y = cy + A * Math.sin((nStar * Math.PI * x) / 2) * Math.sin(2 * Math.PI * (S.f / 9) * S.tv);
      if (i === 0) ctx.moveTo(X(x), y); else ctx.lineTo(X(x), y);
    }
    ctx.stroke();
    if (res > 0.5) {
      ctx.fillStyle = "#35d3c2";
      for (let k = 0; k <= nStar; k++) { ctx.beginPath(); ctx.arc(X((k * 2) / nStar), cy, 4.5, 0, Math.PI * 2); ctx.fill(); }
    }
    if (res > 0.8) {
      ctx.fillStyle = "rgba(165,217,92,0.15)"; ctx.strokeStyle = "#a5d95c";
      ctx.fillRect(370, 44, 220, 40); ctx.strokeRect(370, 44, 220, 40);
      ctx.fillStyle = "#a5d95c"; ctx.font = `700 15px ${FA}`; ctx.textAlign = "center";
      ctx.fillText(`تشدید — مود n = ${nStar}`, 480, 70); ctx.textAlign = "left";
    }
    hud(ctx, 110, 450, 520, 80, mode === "ar");
    ctx.font = `13px ${MONO}`; ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`v = √(T/μ) = ${fmt(v, 1)} m/s   f₁ = ${fmt(fn(1), 1)} Hz`, 130, 480);
    ctx.fillText(`f = ${fmt(S.f, 1)} Hz   n* = ${nStar}   تشدید ${fmt(res * 100, 0)}٪`, 130, 506);
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.f = 30; S.T = 80; S.muG = 5; S.hit = []; pushFeed("info", "مودهای کشف‌شده پاک شدند."); }}
      simClock={`f = ${fmt(S.f, 1)} Hz`}
      hint="بسامد را آرام جاروب کنید؛ وقتی منحنی پاسخ قله می‌زند رشته در مود n مرتعش می‌شود. کشش را زیاد کنید تا قله‌ها جابه‌جا شوند."
      protocol={[
        { label: "یافتن مود اساسی n=1", done: S.hit.includes(1) },
        { label: "یافتن دست‌کم سه مود", done: S.hit.length >= 3 },
        { label: "شمارش گره‌ها (n+1)", done: S.hit.length >= 2 },
        { label: "تأیید fₙ = n·v/2L", done: S.hit.length >= 3 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="بسامد محرک f" value={S.f} min={1} max={60} step={0.2} digits={1} unit="Hz" accent="#f2a83b" onChange={(v) => { S.f = v; force(); }} />
        <Slider label="کشش رشته T" value={S.T} min={10} max={200} step={2} digits={0} unit="N" accent="#35d3c2" onChange={(v) => { S.T = v; pushFeed("info", `v = ${fmt(Math.sqrt(v / mu), 1)} m/s — قله‌های تشدید جابه‌جا شدند.`); }} />
        <Slider label="چگالی خطی μ" value={S.muG} min={2} max={20} step={0.5} digits={1} unit="g/m" accent="#56b8ff" onChange={(v) => { S.muG = v; force(); }} />
        <Slider label="دامنه محرک" value={S.amp} min={15} max={60} step={1} digits={0} unit="px" accent="#a5d95c" onChange={(v) => { S.amp = v; force(); }} />
      </div>}
      chart={<LiveChart series={[sr("پاسخ دامنه", "#f2a83b", Array.from({ length: 240 }, (_, i) => ({ x: 1 + (i / 239) * 59, y: resAt(1 + (i / 239) * 59) }))), sr("f فعلی", "#35d3c2", [{ x: S.f, y: res }, { x: S.f, y: res }])]} xLabel="f (Hz)" yLabel="دامنه نسبی" height={230} yMin={0} yMax={1.15} />}
      table={{ headers: ["مود n", "fₙ (Hz)", "λₙ (m)", "گره‌ها"], rows: [1, 2, 3, 4, 5, 6].map((n) => [n, Number(fn(n).toFixed(1)), Number((4 / n).toFixed(2)), n + 1]) }}
      stats={[
        { label: "سرعت موج v", value: `${fmt(v, 1)} m/s`, color: "#35d3c2", sub: "√(T/μ)" },
        { label: "بسامد اساسی", value: `${fmt(fn(1), 1)} Hz`, color: "#f2a83b" },
        { label: "مود غالب", value: `${nStar}`, color: "#e9f6f3" },
        { label: "نزدیکی به تشدید", value: `${fmt(res * 100, 0)} ٪`, color: res > 0.8 ? "#a5d95c" : res > 0.4 ? "#f2a83b" : "#ff6f61" },
        { label: "طول‌موج فعلی", value: `${fmt(v / Math.max(S.f, 0.1), 2)} m`, color: "#e9f6f3" },
        { label: "مودهای کشف‌شده", value: `${S.hit.length} / 8`, color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`String L=2m, T=${S.T}N, mu=${fmt(mu * 1000, 1)}g/m => v=${fmt(v, 2)}m/s`, `f_n = n v/(2L); f1=${fmt(fn(1), 2)}Hz; drive f=${fmt(S.f, 1)}Hz (n*=${nStar})`]} />
  );
}

/* ===================== Young ===================== */
function waveColor(l: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  if (l < 440) { r = -(l - 440) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; }
  else if (l < 510) { g = 1; b = -(l - 510) / 20; } else if (l < 580) { r = (l - 510) / 70; g = 1; }
  else if (l < 645) { r = 1; g = -(l - 645) / 65; } else r = 1;
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
export function YoungLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ lam: 550, d: 0.25, D: 1.5, phase: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "تداخل دو شکاف — نوارهای روشن و تاریک روی پرده. فاصله نوارها Δy=λD/d است." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const dy = ((S.lam * 1e-9 * S.D) / (S.d * 1e-3)) * 1e3;
  const [cr, cg, cb] = waveColor(S.lam);
  const colorStr = `rgb(${cr},${cg},${cb})`;
  const Iof = (ymm: number) => {
    const y = ymm * 1e-3;
    const arg = (Math.PI * S.d * 1e-3 * y) / (S.lam * 1e-9 * S.D);
    const b = (Math.PI * 0.02e-3 * y) / (S.lam * 1e-9 * S.D);
    const env = Math.abs(b) < 1e-6 ? 1 : (Math.sin(b) / b) ** 2;
    return Math.cos(arg) ** 2 * env;
  };

  useRaf((dt) => {
    if (running) S.phase += Math.min(dt, 50) / 1000;
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const cy = 280, bx = 300, scrX = 840;
    const slitOff = 16 + S.d * 150;
    ctx.fillStyle = colorStr;
    ctx.beginPath(); ctx.arc(110, cy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = colorStr; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(122, cy - 4); ctx.lineTo(bx - 6, cy - slitOff); ctx.moveTo(122, cy + 4); ctx.lineTo(bx - 6, cy + slitOff); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#2a7a80";
    ctx.fillRect(bx - 5, 44, 10, cy - slitOff - 10 - 44);
    ctx.fillRect(bx - 5, cy - slitOff + 10, 10, 2 * slitOff - 20);
    ctx.fillRect(bx - 5, cy + slitOff + 10, 10, 560 - 44 - (cy + slitOff + 10));
    ctx.save();
    ctx.beginPath(); ctx.rect(bx + 6, 40, scrX - bx - 10, 480); ctx.clip();
    const sp = 16 + ((S.lam - 400) / 300) * 20, maxR = 580;
    for (const sY of [cy - slitOff, cy + slitOff]) {
      for (let k = 0; k < 15; k++) {
        const r = (S.phase * 42 + k * sp) % maxR;
        if (r < 4) continue;
        ctx.strokeStyle = colorStr;
        ctx.globalAlpha = Math.max(0, 0.32 * (1 - r / maxR));
        ctx.beginPath(); ctx.arc(bx, sY, r, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      }
    }
    ctx.restore(); ctx.globalAlpha = 1;
    const pxPerMm = 17.5;
    for (let py = 60; py < 500; py += 2) {
      const I = Iof((py - cy) / pxPerMm);
      const rr2 = Math.min(255, Math.round(cr * I + 255 * I * I * 0.5));
      const gg2 = Math.min(255, Math.round(cg * I + 255 * I * I * 0.5));
      const bb2 = Math.min(255, Math.round(cb * I + 255 * I * I * 0.5));
      ctx.fillStyle = `rgb(${rr2},${gg2},${bb2})`;
      ctx.fillRect(scrX, py, 16, 2);
    }
    ctx.strokeStyle = "rgba(233,246,243,0.5)";
    ctx.strokeRect(scrX, 58, 16, 442);
    ctx.fillStyle = "#e9f6f3"; ctx.font = `12px ${FA}`;
    ctx.fillText("منبع همدوس", 84, cy + 40); ctx.fillText("دو شکاف", bx - 22, 36); ctx.fillText("پرده", scrX - 4, 48);
    ctx.fillStyle = "#35d3c2"; ctx.font = `12px ${MONO}`;
    ctx.fillText(`Δy = ${fmt(dy, 2)} mm`, scrX - 150, 528);
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`λ=${S.lam}nm d=${fmt(S.d, 2)}mm D=${fmt(S.D, 1)}m`, 60, 528);
    frame.current++;
    if (frame.current % 10 === 0) force();
  }, true);

  const theta1 = (Math.asin(Math.min(1, (S.lam * 1e-9) / (S.d * 1e-3))) * 180) / Math.PI;
  const colorName = S.lam < 450 ? "بنفش" : S.lam < 490 ? "آبی" : S.lam < 560 ? "سبز" : S.lam < 590 ? "زرد" : S.lam < 630 ? "نارنجی" : "قرمز";
  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.lam = 550; S.d = 0.25; S.D = 1.5; pushFeed("info", "به نور سبز ۵۵۰ نانومتری بازگشت."); }}
      simClock={`λ = ${S.lam} nm`}
      hint="طول‌موج را جاروب کنید تا رنگ نوارها عوض شود؛ با افزایش d نوارها به‌هم فشرده می‌شوند (Δy=λD/d)."
      protocol={[
        { label: "مشاهده نوارهای تداخل", done: true },
        { label: "تغییر λ و تغییر رنگ", done: S.ev >= 1 || S.lam !== 550 },
        { label: "اندازه‌گیری فاصله نوارها Δy", done: true },
        { label: "تأیید Δy = λD/d", done: S.ev >= 1 || S.d !== 0.25 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <div>
          <Slider label="طول‌موج λ" value={S.lam} min={400} max={700} step={5} digits={0} unit="nm" accent={colorStr}
            onChange={(v) => { S.lam = v; if (S.ev === 0 || frame.current % 3 === 0) pushFeed("info", `λ=${v} nm — نور ${colorName}؛ Δy=${fmt(((v * 1e-9 * S.D) / (S.d * 1e-3)) * 1e3, 2)} mm شد.`); }} />
          <div className="h-2 rounded-full mt-2" style={{ background: "linear-gradient(90deg,#7b2ff7,#2f6bff,#2fd37b,#e8f72f,#ff9b2f,#ff3b3b)" }} />
        </div>
        <Slider label="فاصله دو شکاف d" value={S.d} min={0.05} max={0.5} step={0.01} digits={2} unit="mm" accent="#f2a83b" onChange={(v) => { S.d = v; force(); }} />
        <Slider label="فاصله تا پرده D" value={S.D} min={0.5} max={3} step={0.1} digits={1} unit="m" accent="#56b8ff" onChange={(v) => { S.D = v; force(); }} />
      </div>}
      chart={<LiveChart series={[sr("شدت I(y)", colorStr, Array.from({ length: 141 }, (_, i) => ({ x: -12 + (24 * i) / 140, y: Iof(-12 + (24 * i) / 140) })))]} xLabel="y روی پرده (mm)" yLabel="شدت نسبی" height={230} yMin={0} yMax={1.1} markerX={dy} markerLabel="نوار مرتبه ۱" />}
      table={{ headers: ["مرتبه m", "روشن y (mm)", "تاریک y (mm)"], rows: [0, 1, 2, 3, 4].map((m) => [m, Number((m * dy).toFixed(2)), Number(((m + 0.5) * dy).toFixed(2))]) }}
      stats={[
        { label: "فاصله نوارها Δy", value: `${fmt(dy, 2)} mm`, color: "#35d3c2", sub: "λD/d" },
        { label: "زاویه نوار اول", value: `${fmt(theta1, 2)}°`, color: "#e9f6f3" },
        { label: "بسامد نور", value: `${fmt(299790 / S.lam, 0)} THz`, color: "#e9f6f3" },
        { label: "انرژی فوتون", value: `${fmt(1240 / S.lam, 2)} eV`, color: "#56b8ff" },
        { label: "رنگ غالب", value: colorName, color: colorStr },
        { label: "تعداد نوار روشن", value: `${Math.max(1, Math.floor(11 / Math.max(dy, 0.05)) * 2 + 1)}`, color: "#f2a83b" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Young: \\lambda=${S.lam}nm, d=${fmt(S.d, 2)}mm, D=${fmt(S.D, 1)}m`, `\\Delta y = \\lambda D/d = ${fmt(dy, 3)}mm`]} />
  );
}
