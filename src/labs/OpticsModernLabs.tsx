import { useRef, useState } from "react";
import { LiveChart, type SeriesDef } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import type { Experiment } from "../data/catalog";
import { glow, physScene } from "./draw";

function sr(name: string, color: string, arr: { x: number; y: number }[]): SeriesDef {
  return { name, color, ["data"]: arr };
}

const MEDIA = [
  { fa: "هوا", n: 1.0 }, { fa: "آب", n: 1.33 }, { fa: "شیشه", n: 1.52 },
  { fa: "یاقوت", n: 1.77 }, { fa: "الماس", n: 2.42 },
];

/* ===================== Snell ===================== */
interface SnellSim {
  n1: number; n2: number; t1: number;
  feed: FeedItem[]; ev: number; tirWas: boolean; dragging: boolean; touched: boolean;
}

export function SnellLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<SnellSim>({
    n1: 1.0, n2: 1.52, t1: 40, ev: 0, tirWas: false, dragging: false, touched: false,
    feed: [{ time: "#0", level: "info", msg: "پرتو را با ماوس بکشید. قانون اسنل: n₁sinθ₁ = n₂sinθ₂ — اگر n₁>n₂ و θ₁ از زاویه بحرانی بگذرد، بازتاب درونی کلی رخ می‌دهد." }],
  }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => {
    S.ev++;
    S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24);
    force();
  };

  const rad = (S.t1 * Math.PI) / 180;
  const sinT = (S.n1 * Math.sin(rad)) / S.n2;
  const tir = sinT > 1;
  const t2 = tir ? NaN : (Math.asin(sinT) * 180) / Math.PI;
  const thetaC = S.n1 > S.n2 ? (Math.asin(S.n2 / S.n1) * 180) / Math.PI : NaN;
  const R = (() => {
    if (tir) return 1;
    const c1 = Math.cos(rad), c2 = Math.cos((t2 * Math.PI) / 180);
    const rs = ((S.n1 * c1 - S.n2 * c2) / (S.n1 * c1 + S.n2 * c2)) ** 2;
    const rp = ((S.n1 * c2 - S.n2 * c1) / (S.n1 * c2 + S.n2 * c1)) ** 2;
    return (rs + rp) / 2;
  })();

  useRaf(() => {
    if (tir !== S.tirWas) {
      S.tirWas = tir;
      if (tir) pushFeed("warn", `بازتاب درونی کلی — θ₁ از زاویه بحرانی ${fmt(thetaC, 1)}° عبور کرد؛ هیچ پرتوی شکست نمی‌یابد.`);
    }
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 10 === 0) force();
  }, true);

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 960;
    const py = ((e.clientY - rect.top) / rect.height) * 560;
    if (py < 285) {
      const ang = Math.max(0, Math.min(89, (Math.atan2(Math.abs(px - 480), 290 - py) * 180) / Math.PI));
      S.t1 = Math.round(ang * 2) / 2;
      S.touched = true;
      force();
    }
  };

  const draw = (ar: boolean) => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const W = 960, H = 560;
    physScene(ctx, W, H, ar, performance.now() / 1000);
    const Ox = 480, Oy = 290, L = 250;
    // media with depth gradients
    const m1a = 0.05 + Math.min(1, (S.n1 - 1) / 1.5) * 0.14;
    const g1 = ctx.createLinearGradient(0, 40, 0, Oy);
    g1.addColorStop(0, `rgba(86,184,255,${(m1a * 0.4).toFixed(2)})`);
    g1.addColorStop(1, `rgba(86,184,255,${m1a.toFixed(2)})`);
    ctx.fillStyle = g1;
    ctx.fillRect(40, 40, W - 80, Oy - 40);
    const m2a = 0.06 + Math.min(1, (S.n2 - 1) / 1.5) * 0.22;
    const g2 = ctx.createLinearGradient(0, Oy, 0, H - 40);
    g2.addColorStop(0, `rgba(86,184,255,${m2a.toFixed(2)})`);
    g2.addColorStop(1, `rgba(60,150,235,${(m2a * 0.55).toFixed(2)})`);
    ctx.fillStyle = g2;
    ctx.fillRect(40, Oy, W - 80, H - Oy - 40);
    // interface — glowing line
    if (!ar) glow(ctx, Ox, Oy, 300, [140, 220, 235], 0.10);
    const il = ctx.createLinearGradient(40, 0, W - 40, 0);
    il.addColorStop(0, "rgba(233,246,243,0.15)");
    il.addColorStop(0.5, "rgba(233,246,243,0.85)");
    il.addColorStop(1, "rgba(233,246,243,0.15)");
    ctx.strokeStyle = il; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(40, Oy); ctx.lineTo(W - 40, Oy); ctx.stroke();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(143,188,184,0.5)";
    ctx.beginPath(); ctx.moveTo(Ox, 60); ctx.lineTo(Ox, H - 60); ctx.stroke();
    ctx.setLineDash([]);
    const t1r = (S.t1 * Math.PI) / 180;
    // incident ray with glow + traveling photons
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 3;
    if (!ar) { ctx.shadowColor = "#f2a83b"; ctx.shadowBlur = 14; }
    ctx.beginPath();
    ctx.moveTo(Ox - L * Math.sin(t1r), Oy - L * Math.cos(t1r));
    ctx.lineTo(Ox, Oy); ctx.stroke();
    ctx.shadowBlur = 0;
    const tt = performance.now() / 1000;
    for (let i = 0; i < 4; i++) {
      const u = ((tt * 0.9 + i * 0.25) % 1);
      const fx = Ox - (1 - u) * L * Math.sin(t1r), fy = Oy - (1 - u) * L * Math.cos(t1r);
      ctx.fillStyle = "rgba(255,224,150,0.95)";
      ctx.beginPath(); ctx.arc(fx, fy, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    // reflected
    ctx.globalAlpha = 0.25 + 0.75 * R;
    ctx.strokeStyle = "#ff6f61"; ctx.lineWidth = 2.6;
    if (!ar) { ctx.shadowColor = "#ff6f61"; ctx.shadowBlur = 10; }
    ctx.beginPath();
    ctx.moveTo(Ox, Oy);
    ctx.lineTo(Ox + L * Math.sin(t1r), Oy - L * Math.cos(t1r));
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    // incidence point glow
    if (!ar) glow(ctx, Ox, Oy, 60, [242, 168, 59], 0.35);
    if (!tir) {
      const t2r = (t2 * Math.PI) / 180;
      ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 3;
      ctx.globalAlpha = 0.3 + 0.7 * (1 - R);
      if (!ar) { ctx.shadowColor = "#35d3c2"; ctx.shadowBlur = 12; }
      ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(Ox + L * Math.sin(t2r), Oy + L * Math.cos(t2r)); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#35d3c2";
      ctx.font = '13px "IBM Plex Mono", monospace';
      ctx.fillText(`θ₂=${fmt(t2, 1)}°`, Ox + 74, Oy + 60);
      // θ2 arc
      ctx.strokeStyle = "rgba(53,211,194,0.7)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(Ox, Oy, 56, Math.PI / 2, Math.PI / 2 - t2r, true); ctx.stroke();
    } else {
      ctx.fillStyle = "#ff6f61";
      ctx.font = '700 16px Vazirmatn, sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("بازتاب درونی کلی (TIR)", Ox, Oy + 90);
      ctx.textAlign = "left";
      if (!ar) glow(ctx, Ox, Oy, 90, [255, 111, 97], 0.3);
      if (isFinite(thetaC)) {
        const tc = (thetaC * Math.PI) / 180;
        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = "rgba(255,111,97,0.7)";
        ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(Ox - L * Math.sin(tc), Oy - L * Math.cos(tc)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '12px "IBM Plex Mono", monospace';
        ctx.fillText(`θc=${fmt(thetaC, 1)}°`, Ox - L * Math.sin(tc) - 10, Oy - L * Math.cos(tc) + 16);
      }
    }
    // θ1 arc + label
    ctx.strokeStyle = "rgba(242,168,59,0.8)"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(Ox, Oy, 56, -Math.PI / 2, -Math.PI / 2 + t1r); ctx.stroke();
    ctx.fillStyle = "#f2a83b";
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillText(`θ₁=${fmt(S.t1, 1)}°`, Ox - 118, Oy - 56);
    ctx.font = '13px Vazirmatn, sans-serif';
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`محیط ۱ — n₁=${fmt(S.n1, 2)}`, 56, 66);
    ctx.fillText(`محیط ۲ — n₂=${fmt(S.n2, 2)}`, 56, H - 52);
    ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.8)";
    ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(W - 320, 52, 280, 62, 10); ctx.fill(); ctx.stroke();
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`R = ${fmt(R * 100, 1)}٪   T = ${fmt((1 - R) * 100, 1)}٪`, W - 304, 78);
    ctx.fillStyle = tir ? "#ff6f61" : "#35d3c2";
    ctx.fillText(tir ? "sinθ₂ > 1 → TIR" : `n₁sinθ₁ = ${fmt(S.n1 * Math.sin(t1r), 3)}`, W - 304, 100);
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "پرتو همیشه در حال انتشار است — زاویه را با ماوس یا لغزنده تغییر دهید.")}
      onReset={() => { S.n1 = 1; S.n2 = 1.52; S.t1 = 40; pushFeed("info", "به حالت هوا→شیشه بازگشت."); }}
      simClock={`θ₁ = ${fmt(S.t1, 1)}°`}
      hint="پرتو فرودی را مستقیم روی صحنه بکشید. برای دیدن TIR محیط ۱ را چگال‌تر از محیط ۲ کنید (مثلاً الماس→هوا)."
      protocol={[
        { label: "تغییر θ₁ و خواندن θ₂", done: S.touched },
        { label: "تأیید n₁sinθ₁ = n₂sinθ₂", done: S.ev >= 1 },
        { label: "ساخت شرایط n₁>n₂", done: S.n1 > S.n2 },
        { label: "مشاهده TIR و θc", done: S.tirWas },
        { label: "بررسی بازتاب فرنل", done: S.ev >= 2 },
      ]}
      canvas={
        <canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto cursor-crosshair"
          onPointerDown={(e) => { S.dragging = true; onPointer(e); }}
          onPointerMove={(e) => S.dragging && onPointer(e)}
          onPointerUp={() => { S.dragging = false; }}
          onPointerLeave={() => { S.dragging = false; }} />
      }
      controls={
        <div className="space-y-5">
          <Slider label="زاویه تابش θ₁" value={S.t1} min={0} max={89} step={0.5} digits={1} unit="°" accent="#f2a83b"
            onChange={(v) => { S.t1 = v; S.touched = true; force(); }} />
          {([1, 2] as const).map((which) => (
            <div key={which}>
              <div className="text-[12px] text-fog mb-1.5">محیط {which === 1 ? "۱ (بالا)" : "۲ (پایین)"}</div>
              <div className="flex flex-wrap gap-1.5">
                {MEDIA.map((m) => (
                  <button key={m.fa}
                    onClick={() => { if (which === 1) S.n1 = m.n; else S.n2 = m.n; S.touched = true; pushFeed("info", `محیط ${which === 1 ? "۱" : "۲"}: ${m.fa} (n=${fmt(m.n, 2)})`); }}
                    className="px-3 py-1.5 rounded-lg text-[11.5px] border transition-all cursor-pointer"
                    style={Math.abs((which === 1 ? S.n1 : S.n2) - m.n) < 0.01
                      ? { borderColor: which === 1 ? "#f2a83b" : "#35d3c2", color: which === 1 ? "#f2a83b" : "#35d3c2", background: which === 1 ? "#f2a83b18" : "#35d3c218" }
                      : { borderColor: "#175059", color: "#8fbcb8" }}>
                    {m.fa} {fmt(m.n, 2)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      }
      chart={
        <LiveChart
          series={[
            sr("θ₂ بر حسب θ₁", "#35d3c2", Array.from({ length: 89 }, (_, i) => {
              const a = i + 1;
              const s = (S.n1 * Math.sin((a * Math.PI) / 180)) / S.n2;
              return { x: a, y: s > 1 ? NaN : (Math.asin(s) * 180) / Math.PI };
            }).filter((p) => isFinite(p.y))),
            sr("θ₁=θ₂", "#8fbcb8", [{ x: 0, y: 0 }, { x: 89, y: 89 }]),
          ]}
          xLabel="θ₁ (°)" yLabel="θ₂ (°)" height={230} yMin={0} yMax={90} markerX={S.t1} />
      }
      table={{
        headers: ["محیط", "n", "v=c/n (×10⁸ m/s)"],
        rows: MEDIA.map((m) => [m.fa, Number(m.n.toFixed(2)), Number((2.998 / m.n).toFixed(2))]),
      }}
      stats={[
        { label: "زاویه شکست θ₂", value: tir ? "— (TIR)" : `${fmt(t2, 1)}°`, color: "#35d3c2" },
        { label: "زاویه بحرانی θc", value: isFinite(thetaC) ? `${fmt(thetaC, 1)}°` : "—", color: "#ff6f61" },
        { label: "بازتاب R", value: `${fmt(R * 100, 1)} ٪`, color: "#e9f6f3" },
        { label: "عبور T", value: `${fmt((1 - R) * 100, 1)} ٪`, color: "#e9f6f3" },
        { label: "زاویه بروستر", value: `${fmt((Math.atan(S.n2 / S.n1) * 180) / Math.PI, 1)}°`, color: "#56b8ff" },
        { label: "n₁sinθ₁", value: fmt(S.n1 * Math.sin(rad), 3), color: "#f2a83b" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `Snell: n1 sin(t1) = n2 sin(t2); n1=${fmt(S.n1, 3)}, n2=${fmt(S.n2, 3)}`,
        `t1 = ${fmt(S.t1, 1)} deg -> t2 = ${tir ? "TIR" : fmt(t2, 2) + " deg"}; Fresnel R = ${fmt(R * 100, 2)} pct`,
        isFinite(thetaC) ? `Critical angle = ${fmt(thetaC, 2)} deg` : `No critical angle (n1 <= n2)`,
      ]}
    />
  );
}

/* ===================== Photoelectric ===================== */
const METALS = [
  { fa: "سیمزی", W: 2.14 }, { fa: "پتاسیم", W: 2.3 }, { fa: "سدیم", W: 2.36 },
  { fa: "روی", W: 4.31 }, { fa: "مس", W: 4.7 },
];

interface PhotoSim {
  metal: number; lam: number; inten: number; V: number;
  photons: { x: number; y: number; sp: number }[];
  electrons: { x: number; y: number; vx: number }[];
  feed: FeedItem[]; ev: number; emittedWarned: boolean;
}

export function PhotoelectricLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<PhotoSim>({
    metal: 2, lam: 400, inten: 5, V: 0,
    photons: [], electrons: [], ev: 0, emittedWarned: false,
    feed: [{ time: "#0", level: "info", msg: "فوتون‌ها به فلز می‌تابند: اگر hf > W الکترون گسیل می‌شود. KE_max = hf − W — فقط به بسامد وابسته است، نه شدت!" }],
  }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => {
    S.ev++;
    S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24);
    force();
  };

  const hc = 1240; // eV·nm
  const Ef = hc / S.lam;
  const W = METALS[S.metal].W;
  const KE = Math.max(0, Ef - W);
  const emits = Ef > W;
  const Vstop = KE;
  const current = emits ? S.inten * Math.max(0, 1 - (S.V > 0 ? S.V / (Vstop + 0.001) : 0)) : 0;

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (Math.random() < S.inten * ds * 1.6) {
      S.photons.push({ x: -20, y: 150 + Math.random() * 240, sp: 260 + Math.random() * 60 });
    }
    for (const p of S.photons) p.x += p.sp * ds;
    for (const p of [...S.photons]) {
      if (p.x > 380) {
        S.photons = S.photons.filter((q) => q !== p);
        if (emits) {
          S.electrons.push({ x: 392, y: p.y, vx: 60 + KE * 90 });
        }
      }
    }
    for (const e of S.electrons) e.x += e.vx * ds;
    S.electrons = S.electrons.filter((e) => e.x < 820);
    if (!emits && !S.emittedWarned && S.ev < 30) {
      S.emittedWarned = true;
      pushFeed("warn", `هیچ الکترونی گسیل نمی‌شود — hf=${fmt(Ef, 2)} eV کمتر از تابع کار ${fmt(W, 2)} eV است. شدت را هرچقدر زیاد کنید فایده ندارد؛ طول‌موج را کوتاه‌تر کنید.`);
    }
    if (emits) S.emittedWarned = false;
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const draw = (ar: boolean) => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const Wc = 960, H = 560;
    physScene(ctx, Wc, H, ar, performance.now() / 1000);
    // wavelength → visible color for lamp + photons
    const lamCol = (l: number): [number, number, number] =>
      l < 450 ? [154, 107, 255] : l < 490 ? [79, 139, 255] : l < 560 ? [79, 224, 107] : l < 590 ? [255, 225, 79] : l < 630 ? [255, 155, 59] : [255, 90, 70];
    const lc = lamCol(S.lam);
    // evacuated glass tube with inner glow
    if (!ar) glow(ctx, 480, 265, 430, lc, 0.05);
    ctx.fillStyle = "rgba(150,210,230,0.045)";
    ctx.beginPath(); ctx.roundRect(60, 100, 840, 330, 40); ctx.fill();
    ctx.strokeStyle = "rgba(214,240,244,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(60, 100, 840, 330, 40); ctx.stroke();
    ctx.strokeStyle = "rgba(214,240,244,0.18)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(70, 110, 820, 310, 34); ctx.stroke();
    // cathode plate (metallic)
    const cg = ctx.createLinearGradient(380, 0, 394, 0);
    cg.addColorStop(0, "#5d8a90"); cg.addColorStop(0.5, "#a8c8c5"); cg.addColorStop(1, "#5d8a90");
    ctx.fillStyle = cg;
    ctx.fillRect(380, 140, 14, 260);
    if (!ar && S.electrons.length > 0) glow(ctx, 387, 270, 70, [53, 211, 194], 0.22);
    // anode
    const ag = ctx.createLinearGradient(810, 0, 822, 0);
    ag.addColorStop(0, "#16454d"); ag.addColorStop(0.5, "#2a7a80"); ag.addColorStop(1, "#16454d");
    ctx.fillStyle = ag;
    ctx.fillRect(810, 140, 12, 260);
    // photons — wavy packets in lamp color with glow heads
    const wv = Math.max(6, 26 - S.lam / 34);
    for (const p of S.photons) {
      ctx.strokeStyle = `rgba(${lc[0]},${lc[1]},${lc[2]},0.9)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const xx = p.x - 24 + i;
        const yy = p.y + Math.sin((i / 24) * Math.PI * 2 * (24 / wv)) * 4;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      if (!ar) glow(ctx, p.x, p.y, 14, lc, 0.4);
    }
    // electrons with soft glow
    for (const e of S.electrons) {
      if (!ar) glow(ctx, e.x, e.y, 16, [53, 211, 194], 0.35);
      ctx.fillStyle = "#35d3c2";
      ctx.beginPath(); ctx.arc(e.x, e.y, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(233,246,243,0.9)";
      ctx.beginPath(); ctx.arc(e.x - 1.2, e.y - 1.2, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    // light source lamp with wavelength-colored halo
    if (!ar) glow(ctx, 60, 270, 90, lc, 0.45);
    ctx.fillStyle = `rgb(${lc[0]},${lc[1]},${lc[2]})`;
    ctx.beginPath(); ctx.arc(60, 270, 26, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#04191d";
    ctx.font = '10px Vazirmatn, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("لامپ", 60, 274);
    ctx.textAlign = "left";
    // labels
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '12px Vazirmatn, sans-serif';
    ctx.fillText(`کاتد ${METALS[S.metal].fa} (W=${fmt(W, 2)} eV)`, 330, 130);
    ctx.fillText("آند", 800, 130);
    // ammeter
    ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.8)";
    ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(110, 460, 740, 66, 10); ctx.fill(); ctx.stroke();
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`hf = ${fmt(Ef, 2)} eV   W = ${fmt(W, 2)} eV   KE_max = ${fmt(KE, 2)} eV`, 130, 488);
    ctx.fillStyle = emits ? "#35d3c2" : "#ff6f61";
    ctx.fillText(emits ? `جریان فوتونی = ${fmt(current, 1)} µA` : "جریان = صفر (زیر آستانه)", 130, 512);
    ctx.fillStyle = "#f2a83b";
    ctx.fillText(`V_stop = ${fmt(Vstop, 2)} V`, 620, 488);
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`λ₀ = ${fmt(hc / W, 0)} nm`, 620, 512);
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "لامپ روشن است — λ، شدت و فلز را تغییر دهید.")}
      onReset={() => { S.metal = 2; S.lam = 400; S.inten = 5; S.V = 0; pushFeed("info", "به شرایط اولیه بازگشت."); }}
      simClock={`λ = ${fmt(S.lam, 0)} nm`}
      hint="شدت فقط تعداد الکترون‌ها را زیاد می‌کند، نه انرژی‌شان. ولتاژ معکوس را تا قطع جریان بالا ببرید — همان پتانسیل توقف است."
      protocol={[
        { label: "مشاهده گسیل فوتوالکتریک", done: emits },
        { label: "افزایش شدت و ثبت جریان", done: S.ev >= 1 },
        { label: "کاهش λ زیر آستانه", done: !emits },
        { label: "اندازه‌گیری V توقف", done: S.ev >= 2 },
        { label: "تغییر فلز و λ₀ جدید", done: S.ev >= 3 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <Slider label="طول‌موج نور λ" value={S.lam} min={200} max={700} step={5} digits={0} unit="nm" accent="#f2a83b" onChange={(v) => { S.lam = v; force(); }} />
          <Slider label="شدت نور" value={S.inten} min={1} max={10} step={1} digits={0} unit="×" accent="#ffd08a" onChange={(v) => { S.inten = v; force(); }} />
          <Slider label="ولتاژ معکوس V" value={S.V} min={0} max={3} step={0.05} digits={2} unit="V" accent="#ff6f61" onChange={(v) => { S.V = v; force(); }} />
          <div>
            <div className="text-[12px] text-fog mb-1.5">فلز کاتد</div>
            <div className="flex flex-wrap gap-1.5">
              {METALS.map((m, i) => (
                <button key={m.fa} onClick={() => { S.metal = i; pushFeed("info", `${m.fa}: تابع کار W=${fmt(m.W, 2)} eV — طول‌موج آستانه λ₀=${fmt(hc / m.W, 0)} nm.`); force(); }}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] border transition-all cursor-pointer"
                  style={S.metal === i ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c218" } : { borderColor: "#175059", color: "#8fbcb8" }}>
                  {m.fa}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
      chart={
        <LiveChart
          series={[
            sr("KE_max بر حسب f", "#35d3c2", Array.from({ length: 60 }, (_, i) => {
              const f = 4 + i * 0.15; // ×10^14 Hz
              const E = (6.626e-34 * f * 1e14) / 1.6e-19;
              return { x: f, y: Math.max(0, E - W) };
            })),
            sr("نقطه فعلی", "#f2a83b", [{ x: 29979 / S.lam * 10, y: KE }, { x: 29979 / S.lam * 10, y: KE }]),
          ]}
          xLabel="f (×10¹⁴ Hz)" yLabel="KE_max (eV)" height={230} yMin={0} />
      }
      table={{
        headers: ["فلز", "W (eV)", "λ₀ (nm)", "f₀ (×10¹⁴ Hz)"],
        rows: METALS.map((m) => [m.fa, m.W, Number((hc / m.W).toFixed(0)), Number((29979 / (hc / m.W) * 10).toFixed(1))]),
      }}
      stats={[
        { label: "انرژی فوتون hf", value: `${fmt(Ef, 2)} eV`, color: "#f2a83b" },
        { label: "تابع کار W", value: `${fmt(W, 2)} eV`, color: "#e9f6f3" },
        { label: "KE بیشینه", value: `${fmt(KE, 2)} eV`, color: "#35d3c2", sub: "hf − W" },
        { label: "پتانسیل توقف", value: `${fmt(Vstop, 2)} V`, color: "#ff6f61" },
        { label: "طول‌موج آستانه", value: `${fmt(hc / W, 0)} nm`, color: "#56b8ff" },
        { label: "جریان فوتونی", value: emits ? `${fmt(current, 1)} µA` : "صفر", color: emits ? "#a5d95c" : "#ff6f61" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `Photoelectric: KE_max = hf - W; hc = 1240 eV nm`,
        `lambda = ${fmt(S.lam, 0)} nm -> hf = ${fmt(Ef, 3)} eV; W(${METALS[S.metal].fa}) = ${fmt(W, 2)} eV`,
        `Stopping potential V_s = ${fmt(Vstop, 3)} V; threshold lambda0 = ${fmt(hc / W, 0)} nm`,
      ]}
    />
  );
}
