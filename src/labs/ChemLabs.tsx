import { useRef, useState } from "react";
import { LiveChart, type SeriesDef } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import type { Experiment } from "../data/catalog";
import * as chem from "./chem";

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
    const t = performance.now() / 1000;
    chem.chemBg(ctx, W, H, ar, t);
    if (!ar) chem.bench(ctx, W, H, 470);

    // burette on stand
    const bx = 300;
    if (!ar) {
      chem.glow(ctx, bx, 60, 90, [86, 184, 255], 0.10);
      ctx.strokeStyle = "rgba(143,188,184,0.4)"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(bx - 70, 34); ctx.lineTo(bx + 70, 34); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - 70, 34); ctx.lineTo(bx - 70, 470); ctx.stroke();
    }
    const frac = Math.max(0, 1 - S.v / 50);
    chem.burette(ctx, bx, 46, 320, frac, [86, 184, 255]);

    // falling drops
    if (S.auto || frame.current % 40 < 8) {
      const dy = 396 + ((t * 120) % 52);
      chem.glow(ctx, bx, dy, 10, [120, 200, 255], 0.5);
      ctx.fillStyle = "rgba(120,200,255,0.9)";
      ctx.beginPath(); ctx.ellipse(bx, dy, 3, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    }

    // erlenmeyer with indicator color
    const [lr, lg, lb] = S.indicator === "phenol"
      ? (pH < 8.2 ? [210, 235, 240] : [255, 111, 160])
      : S.indicator === "methyl"
        ? (pH < 3.1 ? [255, 90, 70] : pH < 4.4 ? [255, 160, 90] : [255, 220, 120])
        : (pH < 6 ? [255, 90, 70] : pH < 7.6 ? [160, 220, 120] : [80, 120, 220]);
    const liqAlpha = S.indicator === "phenol" && pH < 8.2 ? 0.14 : 0.8;
    chem.erlenmeyer(ctx, bx, 462, 24, 92, -148, -58);
    chem.erlenLiquid(ctx, bx, 462, 0.62, 92, [lr, lg, lb], liqAlpha);
    if (S.auto) chem.swirl(ctx, bx, 430, 46, t, "255,255,255");
    if (pH >= 8.2 && S.indicator === "phenol") chem.glow(ctx, bx, 432, 70, [255, 111, 160], 0.22);

    // stir bar
    ctx.save();
    ctx.translate(bx, 452); ctx.rotate(t * (S.auto ? 6 : 0));
    ctx.fillStyle = "#e9f6f3";
    ctx.beginPath(); ctx.roundRect(-16, -3.5, 32, 7, 3.5); ctx.fill();
    ctx.restore();

    // pH meter HUD
    chem.chemHud(ctx, 560, 96, 340, 168, pH < 4 ? "#ff6f61" : pH < 8 ? "#a5d95c" : "#56b8ff");
    chem.caption(ctx, 582, 124, S.strong ? "اسید قوی — HCl" : "اسید ضعیف — CH₃COOH", "#e9f6f3", 13);
    chem.readout(ctx, 582, 182, fmt(pH, 2), pH < 4 ? "#ff6f61" : pH < 8 ? "#a5d95c" : "#56b8ff", 44);
    ctx.font = `12px ${chem.MONO}`; ctx.fillStyle = "#8fbcb8";
    ctx.fillText(`V(NaOH) = ${fmt(S.v, 2)} mL`, 582, 210);
    ctx.fillText(`Ve = ${fmt(Ve, 2)} mL`, 582, 230);
    // pH color bar
    const barY = 244;
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = i === Math.round(pH) ? "#e9f6f3" : "rgba(143,188,184,0.25)";
      ctx.fillRect(582 + i * 21, barY, 17, 8);
    }
    chem.labelChip(ctx, bx - 60, 500, "NaOH 0.1 M", "#56b8ff");
    chem.labelChip(ctx, 620, 300, S.indicator === "phenol" ? "فنل‌فتالئین" : S.indicator === "methyl" ? "متیل‌اورانژ" : "برموتیمول", "#f2a83b");
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
    const t = performance.now() / 1000;
    chem.chemBg(ctx, W, H, ar, t);
    if (!ar) chem.bench(ctx, W, H, 452);

    // reaction cuvette (glass) with tinted solution
    const tint = Math.min(1, S.P / Math.max(S.S0, 0.01));
    ctx.fillStyle = `rgba(165,217,92,${(0.05 + tint * 0.16).toFixed(2)})`;
    ctx.strokeStyle = "rgba(214,240,244,0.55)";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(290, 96, 540, 320, 14); ctx.fill(); ctx.stroke();
    chem.shine(ctx, 310, 110, 400, 18, 14);
    if (S.running) chem.bubbles(ctx, 320, 400, 480, 260, 14, t, "165,217,92", 0.8);

    // substrate / product particles
    const nS = Math.round(26 * (sc() / Math.max(S.S0, 0.01)));
    const nP = 26 - nS;
    for (let i = 0; i < nS; i++) {
      const x = 320 + ((i * 137) % 480), y = 130 + ((i * 89) % 250);
      chem.glow(ctx, x + Math.sin(t * 2.2 + i) * 9, y, 12, [242, 168, 59], 0.35);
      ctx.fillStyle = "#f2a83b";
      ctx.beginPath(); ctx.arc(x + Math.sin(t * 2.2 + i) * 9, y, 6, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < nP; i++) {
      const x = 330 + ((i * 173) % 470), y = 140 + ((i * 101) % 240);
      chem.glow(ctx, x + Math.cos(t * 2 + i) * 9, y, 11, [165, 217, 92], 0.35);
      ctx.fillStyle = "#a5d95c";
      ctx.beginPath(); ctx.arc(x + Math.cos(t * 2 + i) * 9, y, 5.2, 0, Math.PI * 2); ctx.fill();
    }
    // enzyme (with active site)
    for (let i = 0; i < 4; i++) {
      const x = 390 + i * 105, y = 250 + Math.sin(t * 1.4 + i * 2) * 34;
      chem.glow(ctx, x, y, 30, [53, 211, 194], 0.4);
      ctx.fillStyle = "rgba(53,211,194,0.95)";
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#04191d";
      ctx.beginPath(); ctx.arc(x + 6, y - 4, 4.5, 0, Math.PI * 2); ctx.fill();
    }

    // thermometer
    const thX = 180, thTop = 120, thH = 300;
    chem.chemHud(ctx, thX - 40, thTop - 30, 92, thH + 74, "#ff6f61");
    ctx.fillStyle = "#0a2b33";
    ctx.beginPath(); ctx.roundRect(thX - 9, thTop, 18, thH, 9); ctx.fill();
    const tg = ctx.createLinearGradient(0, thTop, 0, thTop + thH);
    tg.addColorStop(0, "#ff6f61"); tg.addColorStop(1, "#56b8ff");
    ctx.fillStyle = tg;
    const tFrac = Math.max(0, Math.min(1, (70 - S.T) / 60));
    ctx.fillRect(thX - 5, thTop + 8 + (thH - 16) * tFrac, 10, (thH - 16) * (1 - tFrac));
    ctx.fillStyle = "#e9f6f3";
    ctx.beginPath(); ctx.arc(thX, thTop + thH + 14, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff6f61";
    ctx.beginPath(); ctx.arc(thX, thTop + thH + 14, 8, 0, Math.PI * 2); ctx.fill();
    ctx.font = `700 15px ${chem.MONO}`; ctx.fillStyle = "#e9f6f3"; ctx.textAlign = "center";
    ctx.fillText(`${S.T.toFixed(0)}°`, thX + 2, thTop + thH + 42);
    ctx.textAlign = "left";

    // readout
    chem.chemHud(ctx, 250, 440, 560, 84, "#a5d95c");
    ctx.font = `600 19px ${chem.MONO}`;
    ctx.fillStyle = "#a5d95c"; ctx.fillText(`[P] = ${fmt(S.P, 2)} mM`, 274, 470);
    ctx.fillStyle = "#f2a83b"; ctx.fillText(`v = ${fmt(vOf(sc()), 3)}`, 274, 500);
    ctx.fillStyle = S.activity > 0.5 ? "#35d3c2" : "#ff6f61";
    ctx.fillText(`act ${fmt(S.activity * 100, 0)}%`, 560, 470);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `12px ${chem.MONO}`;
    ctx.fillText(`[S] = ${fmt(sc(), 2)} mM`, 560, 500);
    ctx.fillText(`mM/min`, 380, 500);
    chem.labelChip(ctx, 300, 60, "E + S ⇌ ES → E + P", "#35d3c2");
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
