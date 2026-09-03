import { useRef, useState } from "react";
import { LiveChart, type SeriesDef } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import type { Experiment } from "../data/catalog";

function sr(name: string, color: string, arr: { x: number; y: number }[]): SeriesDef {
  return { name, color, ["data"]: arr };
}

/* ===================== Pendulum ===================== */
interface PenSim {
  L: number; g: number; damp: number;
  th: number; w: number; t: number; running: boolean; dragging: boolean;
  samples: { x: number; y: number }[]; lastS: number;
  ke: { x: number; y: number }[]; pe: { x: number; y: number }[];
  crossings: number[]; feed: FeedItem[]; ev: number; bigWarned: boolean;
}

export function PendulumLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<PenSim>({
    L: 1.5, g: 9.81, damp: 0,
    th: 0.6, w: 0, t: 0, running: true, dragging: false,
    samples: [], lastS: 0, ke: [], pe: [],
    crossings: [], ev: 0, bigWarned: false,
    feed: [{ time: "t=0.0", level: "info", msg: "گلوله را با ماوس بکشید و رها کنید. دوره با عبور از تعادل اندازه‌گیری می‌شود و با تئوری (از جمله بسط زاویه بزرگ) مقایسه می‌شود." }],
  }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => {
    S.ev++;
    S.feed = [{ time: `t=${S.t.toFixed(1)}`, level, msg }, ...S.feed].slice(0, 24);
    force();
  };

  const Tsmall = 2 * Math.PI * Math.sqrt(S.L / S.g);
  const th0 = Math.max(0.1, Math.abs(S.th) + Math.abs(S.w) * Math.sqrt(S.L / S.g) * 0.5);
  const Tbig = Tsmall * (1 + th0 * th0 / 16);

  const step = (h: number) => {
    const f = (t: number, w: number) => -(S.g / S.L) * Math.sin(t) - S.damp * w;
    const k1t = S.w, k1w = f(S.th, S.w);
    const k2t = S.w + h * k1w, k2w = f(S.th + h * k1t, S.w + h * k1w);
    const prev = S.th;
    S.th += (h / 2) * (k1t + k2t);
    S.w += (h / 2) * (k1w + k2w);
    S.t += h;
    if (prev < 0 && S.th >= 0 && S.w > 0) {
      S.crossings.push(S.t);
      if (S.crossings.length > 8) S.crossings.shift();
      if (S.crossings.length >= 3 && S.crossings.length % 2 === 1) {
        const n = S.crossings.length;
        const T = (S.crossings[n - 1] - S.crossings[n - 3]);
        pushFeed("ok", `دوره اندازه‌گیری‌شده T=${fmt(T, 3)} s — تئوری زاویه‌کوچک ${fmt(Tsmall, 3)} s (${fmt(((T - Tsmall) / Tsmall) * 100, 1)}٪) و بسط بزرگ ${fmt(Tbig, 3)} s.`);
      }
    }
  };

  useRaf((dt) => {
    const n = 6;
    const h = Math.min(dt, 50) / 1000 / n;
    if (running && !S.dragging) {
      for (let i = 0; i < n; i++) step(h);
      if (Math.abs(S.th) > 1.2 && !S.bigWarned) {
        S.bigWarned = true;
        pushFeed("warn", "زاویه بزرگ است — تقریب sinθ≈θ برقرار نیست؛ دوره از ۲π√(L/g) بیشتر می‌شود. با بسط مرتبه بالاتر مقایسه کنید.");
      }
      if (Math.abs(S.th) < 1.1) S.bigWarned = false;
      if (S.t - S.lastS >= 0.05) {
        const m = 1;
        const v = S.w * S.L;
        const ke = 0.5 * m * v * v;
        const pe = m * S.g * S.L * (1 - Math.cos(S.th));
        S.samples.push({ x: Number(S.t.toFixed(2)), y: Number(((S.th * 180) / Math.PI).toFixed(1)) });
        S.ke.push({ x: Number(S.t.toFixed(2)), y: Number(ke.toFixed(2)) });
        S.pe.push({ x: Number(S.t.toFixed(2)), y: Number(pe.toFixed(2)) });
        if (S.samples.length > 500) { S.samples.shift(); S.ke.shift(); S.pe.shift(); }
        S.lastS = S.t;
      }
    }
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 6 === 0) force();
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
    const ox = 430, oy = 90, px = ox + Math.sin(S.th) * S.L * 230, py = oy + Math.cos(S.th) * S.L * 230;
    // protractor arcs
    for (let a = -60; a <= 60; a += 15) {
      const r1 = ((a - 90) * Math.PI) / 180 + Math.PI / 2;
      ctx.strokeStyle = "rgba(143,188,184,0.18)";
      ctx.beginPath();
      ctx.moveTo(ox + Math.sin((a * Math.PI) / 180) * 150, oy + Math.cos((a * Math.PI) / 180) * 150);
      ctx.lineTo(ox + Math.sin((a * Math.PI) / 180) * 165, oy + Math.cos((a * Math.PI) / 180) * 165);
      ctx.stroke();
      void r1;
    }
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = "rgba(143,188,184,0.35)";
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + 380); ctx.stroke();
    ctx.setLineDash([]);
    // rod
    ctx.strokeStyle = "#8fbcb8"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(px, py); ctx.stroke();
    // pivot
    ctx.fillStyle = "#2a7a80";
    ctx.fillRect(ox - 60, oy - 14, 120, 12);
    // bob
    ctx.fillStyle = "#f2a83b";
    if (!ar) { ctx.shadowColor = "#f2a83b"; ctx.shadowBlur = 16; }
    ctx.beginPath(); ctx.arc(px, py, 17, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // velocity vector
    const vx = Math.cos(S.th) * S.w * 46, vy = -Math.sin(S.th) * S.w * 46;
    if (Math.abs(S.w) > 0.05) {
      ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + vx, py + vy); ctx.stroke();
    }
    // angle arc
    ctx.strokeStyle = "#f2a83b";
    ctx.beginPath(); ctx.arc(ox, oy, 60, Math.PI / 2 - S.th, Math.PI / 2, S.th > 0); ctx.stroke();
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '14px "IBM Plex Mono", monospace';
    ctx.fillText(`θ = ${fmt((S.th * 180) / Math.PI, 1)}°`, ox + 74, oy + 52);
    // HUD
    ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.8)";
    ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(620, 380, 300, 130, 10); ctx.fill(); ctx.stroke();
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`T(تئوری) = ${fmt(Tsmall, 3)} s`, 640, 408);
    ctx.fillStyle = "#f2a83b";
    ctx.fillText(`T(بزرگ)  = ${fmt(Tbig, 3)} s`, 640, 432);
    const measured = S.crossings.length >= 3 ? S.crossings[S.crossings.length - 1] - S.crossings[S.crossings.length - 3] : NaN;
    ctx.fillStyle = "#35d3c2";
    ctx.fillText(`T(اندازه) = ${isFinite(measured) ? fmt(measured, 3) : "—"} s`, 640, 456);
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`g = ${fmt(S.g, 2)} m/s²  L = ${fmt(S.L, 2)} m`, 640, 482);
    ctx.fillStyle = "#8fbcb8";
    ctx.font = '11px Vazirmatn, sans-serif';
    ctx.fillText("گلوله را بکشید و رها کنید", 660, 502);
  };

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>, down: boolean) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 960;
    const py = ((e.clientY - rect.top) / rect.height) * 560;
    const ox = 430, oy = 90;
    if (down) {
      const bx = ox + Math.sin(S.th) * S.L * 230, by = oy + Math.cos(S.th) * S.L * 230;
      if (Math.hypot(px - bx, py - by) < 40) S.dragging = true;
    }
    if (S.dragging) {
      S.th = Math.atan2(px - ox, py - oy);
      S.w = 0;
      S.crossings = [];
    }
    if (!down) {
      if (S.dragging) pushFeed("info", `رها شد از θ₀=${fmt((S.th * 180) / Math.PI, 1)}° — نوسان آغاز شد.`);
      S.dragging = false;
    }
    force();
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        S.th = 0.6; S.w = 0; S.t = 0; S.samples = []; S.ke = []; S.pe = []; S.crossings = [];
        pushFeed("info", "آونگ به حالت اولیه بازگشت.");
      }}
      simClock={`t = ${fmt(S.t, 1)} s`}
      hint="گلوله را با ماوس بکشید؛ برای زوایای بزرگ‌تر از ~۲۰° دوره از فرمول ساده بیشتر می‌شود — بسط (1+θ₀²/16) را بررسی کنید."
      protocol={[
        { label: "کشیدن و رهاکردن گلوله", done: S.ev >= 1 },
        { label: "ثبت ۳ عبور از تعادل", done: S.crossings.length >= 3 },
        { label: "مقایسه T اندازه و تئوری", done: S.ev >= 2 },
        { label: "آزمایش زاویه بزرگ (>۶۰°)", done: S.bigWarned || Math.abs(S.th) > 1.05 },
        { label: "تغییر L یا g و تکرار", done: S.ev >= 3 },
      ]}
      canvas={
        <canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto cursor-grab"
          onPointerDown={(e) => onPointer(e, true)}
          onPointerMove={(e) => S.dragging && onPointer(e, false)}
          onPointerUp={(e) => onPointer(e, false)}
          onPointerLeave={(e) => S.dragging && onPointer(e, false)} />
      }
      controls={
        <div className="space-y-5">
          <Slider label="طول نخ L" value={S.L} min={0.5} max={2.5} step={0.05} digits={2} unit="m" accent="#f2a83b" onChange={(v) => { S.L = v; force(); }} />
          <Slider label="شتاب گرانش g" value={S.g} min={1} max={25} step={0.01} digits={2} unit="m/s²" accent="#35d3c2" onChange={(v) => { S.g = v; force(); }} />
          <Slider label="میرایی b" value={S.damp} min={0} max={0.6} step={0.02} digits={2} unit="s⁻¹" accent="#ff6f61" onChange={(v) => { S.damp = v; force(); }} />
          <div>
            <div className="text-[12px] text-fog mb-1.5">پیش‌تنظیم گرانش</div>
            <div className="flex flex-wrap gap-1.5">
              {([["ماه", 1.62], ["مریخ", 3.71], ["زمین", 9.81], ["مشتری", 24.79]] as [string, number][]).map(([nm, gv]) => (
                <button key={nm} onClick={() => { S.g = gv; pushFeed("info", `گرانش ${nm}: g=${fmt(gv, 2)} — T باید ${fmt(2 * Math.PI * Math.sqrt(S.L / gv), 2)} s شود.`); force(); }}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] border border-edge/70 text-fog hover:text-snow hover:border-edge2 transition-colors cursor-pointer">
                  {nm}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
      chart={
        <div className="grid md:grid-cols-2 gap-5">
          <LiveChart series={[sr("θ (درجه)", "#f2a83b", S.samples)]} xLabel="t (s)" yLabel="θ (°)" height={215} />
          <LiveChart series={[sr("انرژی جنبشی", "#35d3c2", S.ke), sr("انرژی پتانسیل", "#ff6f61", S.pe)]} xLabel="t (s)" yLabel="E (J)" height={215} yMin={0} />
        </div>
      }
      table={{
        headers: ["t (s)", "θ (°)", "KE (J)", "PE (J)"],
        rows: S.samples.filter((_, i) => i % 4 === 0).map((s, i) => [s.x, s.y, S.ke[i * 4]?.y ?? 0, S.pe[i * 4]?.y ?? 0]),
      }}
      stats={[
        { label: "دوره تئوری (کوچک)", value: `${fmt(Tsmall, 3)} s`, color: "#e9f6f3", sub: "2π√(L/g)" },
        { label: "دوره با بسط بزرگ", value: `${fmt(Tbig, 3)} s`, color: "#f2a83b", sub: "×(1+θ₀²/16)" },
        { label: "دوره اندازه‌گیری", value: S.crossings.length >= 3 ? `${fmt(S.crossings[S.crossings.length - 1] - S.crossings[S.crossings.length - 3], 3)} s` : "—", color: "#35d3c2" },
        { label: "زاویه فعلی", value: `${fmt((S.th * 180) / Math.PI, 1)}°`, color: "#e9f6f3" },
        { label: "سرعت زاویه‌ای", value: `${fmt(S.w, 2)} rad/s`, color: "#e9f6f3" },
        { label: "گرانش", value: `${fmt(S.g, 2)} m/s²`, color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `Simple pendulum, exact equation: d2th/dt2 = -(g/L) sin(th) - b dth/dt`,
        `L = ${fmt(S.L, 2)} m, g = ${fmt(S.g, 2)} m/s^2, b = ${fmt(S.damp, 2)}`,
        `T(small) = 2pi sqrt(L/g) = ${fmt(Tsmall, 3)} s; T(large-angle approx) = ${fmt(Tbig, 3)} s`,
      ]}
    />
  );
}

/* ===================== Projectile ===================== */
interface ProjSim {
  v0: number; ang: number; drag: boolean; cd: number;
  t: number; running: boolean; fired: boolean;
  air: { x: number; y: number }[]; vac: { x: number; y: number }[];
  vx: number; vy: number; x: number; y: number;
  landed: boolean; ranges: number[]; feed: FeedItem[]; ev: number;
}

export function ProjectileLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<ProjSim>({
    v0: 26, ang: 52, drag: true, cd: 0.35,
    t: 0, running: false, fired: false,
    air: [], vac: [], vx: 0, vy: 0, x: 0, y: 0,
    landed: false, ranges: [], ev: 0,
    feed: [{ time: "#0", level: "info", msg: "پرتاب با مقاومت هوای مربعی (F=−½ρCdA·v²) در کنار مسیر خلأ. زاویه بهینه با درگ دیگر ۴۵° نیست!" }],
  }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => {
    S.ev++;
    S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24);
    force();
  };

  const fire = () => {
    const a = (S.ang * Math.PI) / 180;
    S.t = 0; S.fired = true; S.running = true; S.landed = false;
    S.x = 0; S.y = 0; S.vx = S.v0 * Math.cos(a); S.vy = S.v0 * Math.sin(a);
    S.air = [{ x: 0, y: 0 }]; S.vac = [{ x: 0, y: 0 }];
    pushFeed("info", `پرتاب: v₀=${fmt(S.v0, 0)} m/s در زاویه ${fmt(S.ang, 0)}°.`);
  };
  const reset = () => {
    S.fired = false; S.running = false; S.air = []; S.vac = []; S.t = 0;
    force();
  };

  const vacPt = (t: number) => {
    const a = (S.ang * Math.PI) / 180;
    return { x: S.v0 * Math.cos(a) * t, y: S.v0 * Math.sin(a) * t - 4.905 * t * t };
  };

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (S.running && S.fired && !S.landed) {
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const h = ds / steps;
        const sp = Math.hypot(S.vx, S.vy);
        const k = S.drag ? 0.5 * 1.2 * S.cd * 0.02 / 0.45 : 0;
        const ax = -k * sp * S.vx;
        const ay = -9.81 - k * sp * S.vy;
        S.vx += ax * h; S.vy += ay * h;
        S.x += S.vx * h; S.y += S.vy * h;
        S.t += h;
        if (S.y <= 0 && S.t > 0.05) {
          S.y = 0; S.landed = true; S.running = false;
          S.ranges.push(S.x);
          const vr = vacPt(S.t);
          pushFeed("ok", `فرود در x=${fmt(S.x, 1)} m پس از ${fmt(S.t, 2)} s — خلأ تا ${fmt(vr.x, 1)} m می‌رفت (${fmt(((vr.x - S.x) / vr.x) * 100, 0)}٪ کاهش برد).`);
          break;
        }
      }
      S.air.push({ x: Number(S.x.toFixed(2)), y: Number(Math.max(0, S.y).toFixed(2)) });
      S.vac.push(vacPt(Math.min(S.t, (2 * S.v0 * Math.sin((S.ang * Math.PI) / 180)) / 9.81)));
    }
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 6 === 0) force();
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
    const gy = 470, sc = 10.5;
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(40, gy); ctx.lineTo(920, gy); ctx.stroke();
    for (let m = 0; m <= 80; m += 10) {
      ctx.strokeStyle = "rgba(143,188,184,0.25)";
      ctx.beginPath(); ctx.moveTo(60 + m * sc, gy); ctx.lineTo(60 + m * sc, gy + 8); ctx.stroke();
      ctx.fillStyle = "#8fbcb8";
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillText(`${m}m`, 52 + m * sc, gy + 22);
    }
    const X = (x: number) => 60 + x * sc, Y = (y: number) => gy - y * sc;
    // vacuum path
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(86,184,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    S.vac.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))));
    ctx.stroke();
    ctx.setLineDash([]);
    // air path
    ctx.strokeStyle = "#f2a83b";
    ctx.lineWidth = 3;
    if (!ar) { ctx.shadowColor = "#f2a83b"; ctx.shadowBlur = 8; }
    ctx.beginPath();
    S.air.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))));
    ctx.stroke();
    ctx.shadowBlur = 0;
    // ball
    if (S.fired) {
      ctx.fillStyle = "#e9f6f3";
      ctx.beginPath(); ctx.arc(X(S.x), Y(S.y), 9, 0, Math.PI * 2); ctx.fill();
      // velocity vector
      ctx.strokeStyle = "#35d3c2";
      ctx.beginPath(); ctx.moveTo(X(S.x), Y(S.y)); ctx.lineTo(X(S.x) + S.vx * 2, Y(S.y) - S.vy * 2); ctx.stroke();
    }
    // launcher
    const la = (S.ang * Math.PI) / 180;
    ctx.strokeStyle = "#8fbcb8"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(60, gy); ctx.lineTo(60 + Math.cos(la) * 52, gy - Math.sin(la) * 52); ctx.stroke();
    // HUD
    ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.8)";
    ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(600, 60, 320, 96, 10); ctx.fill(); ctx.stroke();
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#f2a83b";
    ctx.fillText(`x=${fmt(S.x, 1)}m  y=${fmt(S.y, 1)}m`, 620, 88);
    ctx.fillStyle = "#35d3c2";
    ctx.fillText(`|v|=${fmt(Math.hypot(S.vx, S.vy), 1)} m/s`, 620, 112);
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`t=${fmt(S.t, 2)} s  درگ=${S.drag ? "روشن" : "خاموش"}`, 620, 136);
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={S.running}
      onToggleRun={() => (S.fired && !S.landed ? reset() : fire())}
      onReset={reset}
      simClock={`x = ${fmt(S.x, 1)} m`}
      hint="درگ را خاموش کنید تا مسیر سهمی کامل شود؛ با درگ، زاویه بهینه زیر ۴۵° می‌افتد و برد کاهش می‌یابد."
      protocol={[
        { label: "پرتاب با مقاومت هوا", done: S.landed },
        { label: "مقایسه با مسیر خلأ", done: S.landed },
        { label: "خاموش‌کردن درگ", done: !S.drag && S.fired },
        { label: "یافتن زاویه بیشینه برد", done: S.ranges.length >= 3 },
        { label: "تغییر Cd و بررسی", done: S.ev >= 3 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <Slider label="تندی اولیه v₀" value={S.v0} min={8} max={40} step={1} digits={0} unit="m/s" accent="#f2a83b" onChange={(v) => { S.v0 = v; }} />
          <Slider label="زاویه پرتاب" value={S.ang} min={10} max={80} step={1} digits={0} unit="°" accent="#56b8ff" onChange={(v) => { S.ang = v; force(); }} />
          <Slider label="ضریب درگ Cd" value={S.cd} min={0.05} max={1} step={0.05} digits={2} accent="#ff6f61" onChange={(v) => { S.cd = v; force(); }} />
          <button onClick={() => { S.drag = !S.drag; pushFeed("info", S.drag ? "مقاومت هوا فعال شد." : "مقاومت هوا خاموش — حرکت سهمی ایده‌آل."); force(); }}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer"
            style={{ borderColor: S.drag ? "#ff6f61" : "#35d3c2", color: S.drag ? "#ff6f61" : "#35d3c2", background: S.drag ? "#ff6f610f" : "#35d3c20f" }}>
            مقاومت هوا: {S.drag ? "روشن" : "خاموش"}
          </button>
        </div>
      }
      chart={
        <LiveChart series={[sr("مسیر با درگ", "#f2a83b", S.air), sr("مسیر خلأ", "#56b8ff", S.vac)]} xLabel="x (m)" yLabel="y (m)" height={230} yMin={0} />
      }
      table={{
        headers: ["شماره پرتاب", "برد (m)", "زاویه (°)", "v₀ (m/s)"],
        rows: S.ranges.map((r, i) => [i + 1, Number(r.toFixed(1)), S.ang, S.v0]),
      }}
      stats={[
        { label: "برد فعلی", value: `${fmt(S.x, 1)} m`, color: "#f2a83b" },
        { label: "ارتفاع بیشینه", value: `${fmt(Math.max(0, ...S.air.map((p) => p.y), 0), 1)} m`, color: "#e9f6f3" },
        { label: "زمان پرواز", value: `${fmt(S.t, 2)} s`, color: "#e9f6f3" },
        { label: "تندی فعلی", value: `${fmt(Math.hypot(S.vx, S.vy), 1)} m/s`, color: "#35d3c2" },
        { label: "برد در خلأ (تئوری)", value: `${fmt((S.v0 * S.v0 * Math.sin((2 * S.ang * Math.PI) / 180)) / 9.81, 1)} m`, color: "#56b8ff" },
        { label: "تعداد پرتاب", value: `${S.ranges.length}`, color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `Projectile with quadratic drag: F = -0.5 rho Cd A |v| v; rho=1.2 kg/m3, A=0.02 m2, m=0.45 kg`,
        `v0 = ${fmt(S.v0, 0)} m/s, angle = ${fmt(S.ang, 0)} deg, Cd = ${fmt(S.cd, 2)}`,
        `Vacuum range = v0^2 sin(2a)/g = ${fmt((S.v0 * S.v0 * Math.sin((2 * S.ang * Math.PI) / 180)) / 9.81, 2)} m`,
      ]}
    />
  );
}
