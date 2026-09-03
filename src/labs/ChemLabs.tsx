import { useRef, useState } from "react";
import { LiveChart, type SeriesDef } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import type { Experiment } from "../data/catalog";

function sr(name: string, color: string, arr: { x: number; y: number }[]): SeriesDef {
  return { name, color, ["data"]: arr };
}

/* ===================== Titration ===================== */
interface TitSim {
  strong: boolean; Ca: number;
  v: number; running: boolean; auto: boolean;
  samples: { x: number; y: number }[];
  feed: FeedItem[]; ev: number; overshoot: boolean; done: boolean; indicator: string;
}
const VA = 25; // mL acid in flask
const CB = 0.1; // M base in burette

export function TitrationLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<TitSim>({
    strong: true, Ca: 0.08, v: 0, running: false, auto: false,
    samples: [], ev: 0, overshoot: false, done: false, indicator: "phenol",
    feed: [{ time: "#0", level: "info", msg: "تیتراسیون ۲۵ میلی‌لیتر اسید با NaOH غلظت ۰٫۱ مولار. قطره‌قطره اضافه کنید و از منحنی pH–V نقطه هم‌ارزی و غلظت مجهول را بیابید." }],
  }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => {
    S.ev++;
    S.feed = [{ time: `V=${fmt(S.v, 1)}`, level, msg }, ...S.feed].slice(0, 24);
    force();
  };

  const Ve = (S.Ca * VA) / CB;
  const pHof = (v: number) => {
    const na = S.Ca * VA / 1000, nb = CB * v / 1000, Vt = (VA + v) / 1000;
    if (v < Ve - 1e-9) {
      if (S.strong) {
        const h = (na - nb) / Vt;
        return -Math.log10(h);
      }
      const ka = 1.75e-5;
      const ca = (na - nb) / Vt, cb = nb / Vt;
      return -Math.log10(ka * ca / Math.max(cb, 1e-12));
    }
    if (Math.abs(v - Ve) < 1e-9) {
      if (S.strong) return 7;
      const kb = 1e-14 / 1.75e-5;
      const cs = na / Vt;
      return 14 + Math.log10(Math.sqrt(kb * cs));
    }
    const oh = (nb - na) / Vt;
    return 14 + Math.log10(oh);
  };
  const pH = pHof(S.v);

  const add = (dv: number) => {
    S.v = Math.min(50, S.v + dv);
    S.samples.push({ x: Number(S.v.toFixed(2)), y: Number(pHof(S.v).toFixed(3)) });
    if (S.samples.length > 400) S.samples.shift();
    if (S.v > Ve + 0.6 && !S.overshoot) {
      S.overshoot = true;
      pushFeed("warn", `از نقطه هم‌ارزی (${fmt(Ve, 2)} mL) عبور کردید — شناساگر تغییر رنگ ماندگار دارد. خطای رویه‌ای: افزودن باید نزدیک هم‌ارزی قطره‌قطره باشد.`);
    }
    if (!S.done && Math.abs(S.v - Ve) < 0.4) {
      S.done = true;
      const Cm = (CB * S.v) / VA;
      pushFeed("ok", `نقطه هم‌ارزی نزدیک است — غلظت اسید مجهول: Ca = Cb·V/Va = ${fmt(Cm * 1000, 2)} mmol/L... یعنی ${fmt(Cm, 4)} M.`);
    }
    force();
  };

  useRaf((dt) => {
    if (S.auto) add((Math.min(dt, 50) / 1000) * 1.1);
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const reset = () => {
    S.v = 0; S.samples = []; S.overshoot = false; S.done = false; S.auto = false;
    setRunning(false);
    pushFeed("info", "بورت پر شد — از صفر شروع کنید.");
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
    // burette
    const bx = 300;
    ctx.strokeStyle = "rgba(233,246,243,0.55)";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(bx - 20, 40, 40, 330, 8); ctx.stroke();
    const fill = 1 - S.v / 50;
    ctx.fillStyle = "rgba(86,184,255,0.35)";
    ctx.fillRect(bx - 17, 44 + 322 * (1 - fill), 34, 322 * fill);
    for (let ml = 0; ml <= 50; ml += 10) {
      const yy = 44 + (ml / 50) * 322;
      ctx.strokeStyle = "rgba(143,188,184,0.5)";
      ctx.beginPath(); ctx.moveTo(bx - 20, yy); ctx.lineTo(bx - 30, yy); ctx.stroke();
      ctx.fillStyle = "#8fbcb8";
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillText(`${ml}`, bx - 52, yy + 3);
    }
    // drops
    if (S.auto || frame.current % 40 < 6) {
      ctx.fillStyle = "rgba(86,184,255,0.8)";
      const dy = 380 + ((performance.now() / 9) % 60);
      ctx.beginPath(); ctx.arc(bx, dy, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // flask
    const fy = 450;
    ctx.strokeStyle = "rgba(233,246,243,0.55)";
    ctx.beginPath();
    ctx.moveTo(bx - 26, 400); ctx.lineTo(bx - 26, 420);
    ctx.bezierCurveTo(bx - 110, 450, bx - 110, fy + 40, bx - 60, fy + 60);
    ctx.lineTo(bx + 60, fy + 60);
    ctx.bezierCurveTo(bx + 110, fy + 40, bx + 110, 450, bx + 26, 420);
    ctx.lineTo(bx + 26, 400);
    ctx.stroke();
    // solution color by pH + indicator
    const col = S.indicator === "phenol"
      ? pH < 8.2 ? "rgba(233,246,243,0.10)" : "rgba(255,111,160,0.55)"
      : S.indicator === "methyl"
        ? pH < 3.1 ? "rgba(255,90,70,0.5)" : pH < 4.4 ? "rgba(255,160,90,0.5)" : "rgba(255,220,120,0.35)"
        : pH < 6 ? "rgba(255,90,70,0.45)" : pH < 7.6 ? "rgba(160,220,120,0.4)" : "rgba(80,120,220,0.5)";
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(bx - 92, 470);
    ctx.bezierCurveTo(bx - 100, fy + 36, bx - 100, fy + 40, bx - 58, fy + 56);
    ctx.lineTo(bx + 58, fy + 56);
    ctx.bezierCurveTo(bx + 100, fy + 40, bx + 100, fy + 36, bx + 92, 470);
    ctx.closePath(); ctx.fill();
    // pH meter
    ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.8)";
    ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(560, 120, 330, 130, 10); ctx.fill(); ctx.stroke();
    ctx.font = '600 42px "IBM Plex Mono", monospace';
    ctx.fillStyle = pH < 4 ? "#ff6f61" : pH < 8 ? "#a5d95c" : "#56b8ff";
    ctx.fillText(fmt(pH, 2), 580, 178);
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`V(NaOH) = ${fmt(S.v, 2)} mL`, 580, 204);
    ctx.fillText(`Ve = ${fmt(Ve, 2)} mL`, 580, 224);
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '12px Vazirmatn, sans-serif';
    ctx.fillText(S.strong ? "اسید قوی HCl" : "اسید ضعیف CH₃COOH", 560, 100);
  };

  const curve = Array.from({ length: 101 }, (_, i) => {
    const v = (50 * i) / 100;
    return { x: Number(v.toFixed(2)), y: Number(pHof(v).toFixed(3)) };
  });

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => {
        S.auto = !S.auto; setRunning(S.auto);
        if (S.auto) pushFeed("info", "افزودن خودکار آغاز شد — نزدیک هم‌ارزی بهتر است قطره‌قطره بروید.");
      }}
      onReset={reset}
      simClock={`V = ${fmt(S.v, 2)} mL — pH = ${fmt(pH, 2)}`}
      hint="با دکمه «قطره» میلی‌لیتری و نزدیک Ve نیم‌قطره‌ای اضافه کنید؛ سپس از نمودار مشتق، جهش pH را پیدا کنید."
      protocol={[
        { label: "انتخاب نوع اسید و شناساگر", done: true },
        { label: "افزودن باز و ثبت منحنی", done: S.samples.length >= 5 },
        { label: "رسیدن به نزدیکی Ve", done: S.done },
        { label: "مشاهده جهش pH", done: S.done },
        { label: "محاسبه غلظت مجهول", done: S.done },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => add(1)} className="px-3 py-2.5 rounded-lg text-[12.5px] font-bold border border-amber/50 text-amber bg-amber/10 hover:bg-amber/20 transition-colors cursor-pointer">+ ۱٫۰ mL</button>
            <button onClick={() => add(0.2)} className="px-3 py-2.5 rounded-lg text-[12.5px] font-bold border border-teal/50 text-teal bg-teal/10 hover:bg-teal/20 transition-colors cursor-pointer">+ ۰٫۲ mL (قطره)</button>
          </div>
          <Slider label="غلظت اسید مجهول Ca" value={S.Ca} min={0.02} max={0.15} step={0.005} digits={3} unit="M" accent="#f2a83b"
            onChange={(v) => { S.Ca = v; reset(); }} />
          <div>
            <div className="text-[12px] text-fog mb-1.5">نوع اسید</div>
            <div className="flex gap-1.5">
              <button onClick={() => { S.strong = true; reset(); pushFeed("info", "اسید قوی — جهش هم‌ارزی بزرگ و متقارن حول pH=7."); force(); }}
                className="flex-1 px-3 py-1.5 rounded-lg text-[11.5px] border cursor-pointer transition-all"
                style={S.strong ? { borderColor: "#f2a83b", color: "#f2a83b", background: "#f2a83b18" } : { borderColor: "#175059", color: "#8fbcb8" }}>HCl قوی</button>
              <button onClick={() => { S.strong = false; reset(); pushFeed("info", "اسید ضعیف — بافر استاتی و هم‌ارزی در pH>7؛ فنل‌فتالئین مناسب است."); force(); }}
                className="flex-1 px-3 py-1.5 rounded-lg text-[11.5px] border cursor-pointer transition-all"
                style={!S.strong ? { borderColor: "#f2a83b", color: "#f2a83b", background: "#f2a83b18" } : { borderColor: "#175059", color: "#8fbcb8" }}>استیک ضعیف</button>
            </div>
          </div>
          <div>
            <div className="text-[12px] text-fog mb-1.5">شناساگر</div>
            <div className="flex gap-1.5">
              {([["phenol", "فنل‌فتالئین"], ["methyl", "متیل‌اورانژ"], ["bromo", "برموتیمول"]] as [string, string][]).map(([k, nm]) => (
                <button key={k} onClick={() => { S.indicator = k; force(); }}
                  className="flex-1 px-2 py-1.5 rounded-lg text-[10.5px] border cursor-pointer transition-all"
                  style={S.indicator === k ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c218" } : { borderColor: "#175059", color: "#8fbcb8" }}>{nm}</button>
              ))}
            </div>
          </div>
        </div>
      }
      chart={
        <LiveChart
          series={[sr("منحنی تیتراسیون", "#35d3c2", curve), sr("داده شما", "#f2a83b", S.samples)]}
          xLabel="V(NaOH) mL" yLabel="pH" height={230} yMin={0} yMax={14} markerX={Ve} markerLabel="Ve تئوری" />
      }
      table={{
        headers: ["V (mL)", "pH", "ΔpH/ΔV"],
        rows: S.samples.filter((_, i) => i % 3 === 0).map((p, i, arr) => {
          const prev = i > 0 ? arr[i - 1] : null;
          const d = prev && p.x > prev.x ? (p.y - prev.y) / (p.x - prev.x) : 0;
          return [p.x, p.y, Number(d.toFixed(2))];
        }),
      }}
      stats={[
        { label: "pH فعلی", value: fmt(pH, 2), color: pH < 4 ? "#ff6f61" : pH < 8 ? "#a5d95c" : "#56b8ff" },
        { label: "حجم افزوده", value: `${fmt(S.v, 2)} mL`, color: "#e9f6f3" },
        { label: "Ve تئوری", value: `${fmt(Ve, 2)} mL`, color: "#f2a83b", sub: "CaVa/Cb" },
        { label: "غلظت مجهول از داده", value: S.v > 0.5 ? `${fmt((CB * S.v) / VA, 4)} M` : "—", color: "#35d3c2", sub: "در Ve: CbVe/Va" },
        { label: "غلظت واقعی", value: `${fmt(S.Ca, 4)} M`, color: "#e9f6f3" },
        { label: "خطای عبور", value: S.overshoot ? "ثبت شد" : "ندارد", color: S.overshoot ? "#ff6f61" : "#a5d95c" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `Acid: ${S.strong ? "HCl (strong)" : "CH3COOH (weak, Ka=1.75e-5)"}, Va=${VA} mL, Ca=${fmt(S.Ca, 4)} M`,
        `Titrant NaOH Cb=${CB} M; equivalence Ve = Ca Va / Cb = ${fmt(Ve, 3)} mL`,
        S.done ? `Unknown concentration from data: Ca = Cb V/Va = ${fmt((CB * S.v) / VA, 4)} M` : `Awaiting equivalence point`,
      ]}
    />
  );
}

/* ===================== Enzyme (Michaelis–Menten) ===================== */
interface EnzSim {
  S0: number; E: number; T: number; pHv: number;
  t: number; P: number; activity: number; running: boolean;
  samples: { x: number; y: number }[]; lastS: number;
  feed: FeedItem[]; ev: number; warnedT: boolean; informedDone: boolean;
}
const KM = 5;

export function EnzymeLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<EnzSim>({
    S0: 12, E: 2.5, T: 37, pHv: 7,
    t: 0, P: 0, activity: 1, running: false,
    samples: [], lastS: 0, ev: 0, warnedT: false, informedDone: false,
    feed: [{ time: "#0", level: "info", msg: "واکنش آنزیمی E+S⇌ES→E+P. غلظت، دما و pH را تغییر دهید؛ بالای ۴۰° آنزیم دناتوره می‌شود و با «آنزیم تازه» برمی‌گردد." }],
  }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => {
    S.ev++;
    S.feed = [{ time: `t=${fmt(S.t, 1)}`, level, msg }, ...S.feed].slice(0, 24);
    force();
  };

  const fT = () => Math.pow(1.8, (Math.min(S.T, 40) - 37) / 10);
  const fPH = () => Math.exp(-((S.pHv - 7) ** 2) / (2 * 1.1 ** 2));
  const VmaxEff = () => 0.6 * S.E * S.activity * fT() * fPH();
  const sc = () => Math.max(0, S.S0 - S.P);
  const vOf = (s: number) => (VmaxEff() * s) / (KM + s);

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (S.running) {
      const dMin = ds * 0.5;
      const s = sc();
      if (s > 0) S.P = Math.min(S.S0, S.P + vOf(s) * dMin);
      S.t += dMin;
      if (S.T > 40) {
        S.activity = Math.max(0, S.activity - S.activity * ((S.T - 40) / 20) * 0.035 * ds);
        if (!S.warnedT) {
          S.warnedT = true;
          pushFeed(S.T >= 50 ? "error" : "warn", "دناتوراسیون حرارتی — ساختار سوم آنزیم در حال فروریختن است؛ فعالیت افت می‌کند و برگشت‌ناپذیر است مگر آنزیم تازه اضافه کنید.");
        }
      }
      if (S.T < 42) S.warnedT = false;
      if (sc() <= 1e-6 && !S.informedDone) {
        S.informedDone = true;
        pushFeed("ok", "سوبسترا کامل مصرف شد — منحنی پیشرفت به plateau رسید.");
      }
      if (S.t - S.lastS >= 0.5) {
        S.samples.push({ x: Number(S.t.toFixed(1)), y: Number(S.P.toFixed(2)) });
        if (S.samples.length > 300) S.samples.shift();
        S.lastS = S.t;
      }
    }
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const reset = () => {
    S.t = 0; S.P = 0; S.activity = 1; S.samples = []; S.lastS = 0;
    S.running = false; setRunning(false); S.informedDone = false;
    pushFeed("info", "واکنش از نو — آنزیم با فعالیت ۱۰۰٪.");
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
    const tint = Math.min(1, S.P / Math.max(S.S0, 0.01));
    ctx.fillStyle = ar ? "rgba(165,217,92,0.06)" : `rgba(165,217,92,${(0.05 + tint * 0.16).toFixed(2)})`;
    ctx.strokeStyle = "rgba(233,246,243,0.5)";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(280, 90, 560, 330, 16); ctx.fill(); ctx.stroke();
    // pseudo-particles
    const nS = Math.round(26 * (sc() / Math.max(S.S0, 0.01)));
    const nP = 26 - nS;
    for (let i = 0; i < nS; i++) {
      const x = 310 + ((i * 137) % 500), y = 120 + ((i * 89) % 270);
      ctx.fillStyle = "#f2a83b";
      ctx.beginPath(); ctx.arc(x + Math.sin(performance.now() / 400 + i) * 8, y, 6.5, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < nP; i++) {
      const x = 320 + ((i * 173) % 490), y = 130 + ((i * 101) % 260);
      ctx.fillStyle = "#a5d95c";
      ctx.beginPath(); ctx.arc(x + Math.cos(performance.now() / 380 + i) * 8, y, 5.5, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      const x = 380 + i * 110, y = 240 + Math.sin(performance.now() / 700 + i * 2) * 30;
      ctx.fillStyle = "rgba(53,211,194,0.9)";
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#04191d";
      ctx.beginPath(); ctx.arc(x + 6, y - 4, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    // readout
    ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.78)";
    ctx.strokeStyle = "rgba(23,80,89,0.9)";
    ctx.beginPath(); ctx.roundRect(220, 448, 520, 76, 10); ctx.fill(); ctx.stroke();
    ctx.font = '600 20px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#a5d95c";
    ctx.fillText(`[P] = ${fmt(S.P, 2)} mM`, 242, 480);
    ctx.fillStyle = "#f2a83b";
    ctx.fillText(`v = ${fmt(vOf(sc()), 3)} mM/min`, 242, 506);
    ctx.fillStyle = S.activity > 0.5 ? "#35d3c2" : "#ff6f61";
    ctx.fillText(`activity = ${fmt(S.activity * 100, 0)}%`, 560, 480);
    ctx.fillStyle = "#8fbcb8";
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillText(`[S] = ${fmt(sc(), 2)} mM`, 560, 506);
  };

  const mmCurve = Array.from({ length: 41 }, (_, i) => {
    const s = (30 * i) / 40;
    return { x: s, y: (VmaxEff() * s) / (KM + s) };
  });
  const v0 = S.samples.length ? (S.samples.length > 1 ? (S.samples[1].y - S.samples[0].y) / Math.max(S.samples[1].x - S.samples[0].x, 0.001) * 2 : NaN) : NaN;

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => {
        S.running = !S.running; setRunning(S.running);
        if (S.running && S.samples.length === 0) pushFeed("info", "واکنش آغاز شد — سرعت اولیه در حال ثبت است.");
      }}
      onReset={reset}
      simClock={`t = ${fmt(S.t, 1)} min`}
      hint="[S]₀ را چند برابر Km کنید تا سینتیک مرتبه صفر (v≈Vmax) ببینید؛ سپس دما را به ۵۰° برسانید و دناتوره‌شدن را دنبال کنید."
      protocol={[
        { label: "اجرای واکنش و ثبت v₀", done: S.samples.length >= 3 },
        { label: "منحنی پیشرفت [P]–t", done: S.samples.length >= 15 },
        { label: "آزمایش اشباع S≫Km", done: S.S0 >= 4 * KM },
        { label: "اثر دما یا pH", done: S.T !== 37 || S.pHv !== 7 },
        { label: "دناتوراسیون و آنزیم تازه", done: S.activity < 1 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <Slider label="غلظت سوبسترا [S]₀" value={S.S0} min={1} max={30} step={0.5} digits={1} unit="mM" accent="#f2a83b" onChange={(v) => { S.S0 = v; reset(); }} />
          <Slider label="غلظت آنزیم [E]" value={S.E} min={0.5} max={5} step={0.1} digits={1} unit="µM" accent="#35d3c2" onChange={(v) => { S.E = v; force(); }} />
          <Slider label="دما T" value={S.T} min={10} max={70} step={1} digits={0} unit="°C" accent="#ff6f61" onChange={(v) => { S.T = v; force(); }} />
          <Slider label="pH بافر" value={S.pHv} min={3} max={10} step={0.1} digits={1} accent="#56b8ff" onChange={(v) => { S.pHv = v; force(); }} />
          <button onClick={() => { S.activity = 1; pushFeed("info", "آنزیم تازه اضافه شد — فعالیت به ۱۰۰٪ بازگشت."); force(); }}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border border-teal text-teal bg-teal/10 hover:bg-teal/20 transition-all cursor-pointer">
            افزودن آنزیم تازه
          </button>
        </div>
      }
      chart={
        <div className="grid md:grid-cols-2 gap-5">
          <LiveChart series={[sr("[P] (mM)", "#a5d95c", S.samples)]} xLabel="t (min)" yLabel="[P] (mM)" height={215} yMin={0} />
          <LiveChart
            series={[sr("Michaelis–Menten", "#35d3c2", mmCurve), sr("نقطه کار", "#f2a83b", [{ x: sc(), y: vOf(sc()) }, { x: sc(), y: vOf(sc()) }])]}
            xLabel="[S] (mM)" yLabel="v" height={215} yMin={0} />
        </div>
      }
      table={{
        headers: ["t (min)", "[P] (mM)", "[S] (mM)", "Activity ٪"],
        rows: S.samples.map((s) => [s.x, s.y, Number((S.S0 - s.y).toFixed(2)), Number((S.activity * 100).toFixed(0))]),
      }}
      stats={[
        { label: "سرعت فعلی v", value: `${fmt(vOf(sc()), 3)} mM/min`, color: "#f2a83b" },
        { label: "Vmax (شرایط فعلی)", value: `${fmt(VmaxEff(), 3)}`, color: "#35d3c2", sub: "kcat·[E]·activity" },
        { label: "Km", value: "5.00 mM", color: "#e9f6f3", sub: "BRENDA" },
        { label: "فعالیت آنزیم", value: `${fmt(S.activity * 100, 0)} ٪`, color: S.activity > 0.7 ? "#a5d95c" : "#ff6f61" },
        { label: "سوبسترای باقی‌مانده", value: `${fmt(sc(), 2)} mM`, color: "#e9f6f3" },
        { label: "بازده تبدیل", value: `${fmt((S.P / Math.max(S.S0, 0.01)) * 100, 1)} ٪`, color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `Michaelis-Menten: v = Vmax [S]/(Km+[S]); Km=5 mM, kcat=0.6/min per uM E`,
        `T=${fmt(S.T, 0)} C, pH=${fmt(S.pHv, 1)}, [E]=${fmt(S.E, 1)} uM, [S]0=${fmt(S.S0, 1)} mM`,
        `Thermal denaturation: first-order loss above 40 C`,
      ]}
    />
  );
}
