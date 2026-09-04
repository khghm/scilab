import { useRef, useState } from "react";
import { LiveChart, type SeriesDef } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { medScene, monitor, medCross, glow, MONO, FA } from "./draw";
import type { Experiment } from "../data/catalog";

function sr(name: string, color: string, arr: { x: number; y: number }[]): SeriesDef {
  return { name, color, ["data"]: arr };
}

/* ===================== ECG ===================== */
interface EcgSim {
  hr: number; stress: number;
  t: number; trace: { x: number; y: number }[];
  beats: number[]; feed: FeedItem[]; ev: number; warned: boolean;
}

export function EcgLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<EcgSim>({
    hr: 72, stress: 0, t: 0, trace: [], beats: [], ev: 0, warned: false,
    feed: [{ time: "#0", level: "info", msg: "نوار قلب زنده — امواج P (دهلیز)، QRS (بطن) و T (بازقطبش). استرس ورزشی را بالا ببرید و تغییر فاصله R–R و برون‌ده قلبی را ببینید." }],
  }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const hrNow = S.hr + S.stress * 0.9;
  const rr = 60 / hrNow;

  const wave = (t: number) => {
    const ph = (t % rr) / rr; // 0..1 within beat
    const g = (c: number, w: number, a: number) => a * Math.exp(-((ph - c) ** 2) / (2 * w * w));
    return g(0.12, 0.03, 0.16) - g(0.2, 0.012, 0.12) + g(0.22, 0.014, 1.0) - g(0.25, 0.013, 0.28) + g(0.36, 0.04, 0.24);
  };

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    const prev = S.t;
    S.t += ds;
    // detect R peak crossing (phase near 0.22)
    const phPrev = (prev % rr) / rr, phNow = (S.t % rr) / rr;
    if (phPrev < 0.22 && phNow >= 0.22) {
      S.beats.push(S.t);
      if (S.beats.length > 10) S.beats.shift();
      if (S.beats.length >= 3 && hrNow > 100 && !S.warned) {
        S.warned = true;
        pushFeed("warn", `تاکی‌کاردی — ضربان ${fmt(hrNow, 0)} bpm بالای ۱۰۰ است؛ پاسخ طبیعی به ورزش ولی در استراحت نیاز به بررسی دارد.`);
      }
      if (hrNow <= 100) S.warned = false;
    }
    S.trace.push({ x: Number(S.t.toFixed(2)), y: Number(wave(S.t).toFixed(3)) });
    if (S.trace.length > 700) S.trace.shift();
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 6 === 0) force();
  }, true);

  const draw = (ar: boolean) => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const W = 960, H = 560;
    medScene(ctx, W, H, ar, performance.now() / 1000);
    const oy = 330, amp = 190;
    const tMax = S.t, tMin = tMax - 6;
    ctx.strokeStyle = "#a5d95c";
    ctx.lineWidth = 2.4;
    if (!ar) { ctx.shadowColor = "#a5d95c"; ctx.shadowBlur = 7; }
    ctx.beginPath();
    let started = false;
    for (const p of S.trace) {
      if (p.x < tMin) continue;
      const x = ((p.x - tMin) / 6) * (W - 40) + 20;
      const y = oy - p.y * amp;
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    // wave labels at last beat
    const last = S.beats[S.beats.length - 1];
    if (last && last > tMin) {
      const X = (tt: number) => ((tt - tMin) / 6) * (W - 40) + 20;
      ctx.fillStyle = "#8fbcb8";
      ctx.font = '13px "IBM Plex Mono", monospace';
      ctx.fillText("P", X(last - 0.1 * rr) - 4, oy - 0.2 * amp);
      ctx.fillText("R", X(last) - 4, oy - 1.08 * amp);
      ctx.fillText("T", X(last + 0.16 * rr) - 4, oy - 0.3 * amp);
    }
    // heart icon pulsing with vital glow
    const ph = (S.t % rr) / rr;
    const beatK = Math.exp(-((ph - 0.22) ** 2) / (2 * 0.02 * 0.02));
    const scale = 1 + 0.25 * beatK;
    if (!ar) glow(ctx, 830, 120, 60 + beatK * 30, [255, 111, 97], 0.2 + beatK * 0.3);
    ctx.save();
    ctx.translate(830, 120);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ff6f61";
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.bezierCurveTo(-30, 0, -20, -26, 0, -12);
    ctx.bezierCurveTo(20, -26, 30, 0, 0, 26);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-8, -8, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // monitor-style vitals panel
    monitor(ctx, 60, 60, 360, 128, ar, "#ff6f61");
    medCross(ctx, 90, 84, 16, "#ff6f61");
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText("LEAD II  ·  25 mm/s", 110, 88);
    ctx.font = '600 46px "IBM Plex Mono", monospace';
    ctx.fillStyle = hrNow > 100 ? "#ff6f61" : "#a5d95c";
    if (!ar) { ctx.shadowColor = hrNow > 100 ? "#ff6f61" : "#a5d95c"; ctx.shadowBlur = 12; }
    ctx.fillText(`${fmt(hrNow, 0)}`, 80, 146);
    ctx.shadowBlur = 0;
    ctx.font = '14px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText("bpm", 186, 142);
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`R–R = ${fmt(rr * 1000, 0)} ms`, 250, 122);
    ctx.fillStyle = "#35d3c2";
    ctx.fillText(`CO = ${fmt((hrNow * 70) / 1000, 1)} L/min`, 250, 146);
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "مانیتور همیشه وصل است — ضربان پایه و استرس را تغییر دهید.")}
      onReset={() => { S.hr = 72; S.stress = 0; S.trace = []; S.beats = []; pushFeed("info", "بیمار در حالت استراحت قرار گرفت."); }}
      simClock={`HR = ${fmt(hrNow, 0)} bpm`}
      hint="فاصله R–R معکوس ضربان است. در استرس ورزشی، برون‌ده قلبی (HR×SV) بالا می‌رود — پاسخ طبیعی فیزیولوژیک."
      protocol={[
        { label: "شناسایی امواج P، QRS، T", done: true },
        { label: "خواندن R–R و ضربان", done: S.beats.length >= 3 },
        { label: "افزایش استرس ورزشی", done: S.stress > 0 },
        { label: "مشاهده تاکی‌کاردی (>100)", done: hrNow > 100 },
        { label: "محاسبه برون‌ده قلبی", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <Slider label="ضربان پایه" value={S.hr} min={40} max={110} step={1} digits={0} unit="bpm" accent="#ff6f61"
            onChange={(v) => {
              S.hr = v;
              if (v < 50) pushFeed("warn", `برادی‌کاردی — ضربان ${fmt(v, 0)} زیر ۵۰ است؛ در ورزشکاران طبیعی ولی در حالت عادی نیاز به بررسی دارد.`);
              force();
            }} />
          <Slider label="استرس ورزشی" value={S.stress} min={0} max={60} step={2} digits={0} unit="bpm+" accent="#f2a83b" onChange={(v) => { S.stress = v; force(); }} />
          <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11px] text-fog leading-6">
            P: دپلاریزاسیون دهلیزها · QRS: دپلاریزاسیون بطن‌ها · T: بازقطبش بطن‌ها
            <br />محدوده طبیعی استراحت: ۶۰–۱۰۰ bpm
          </div>
        </div>
      }
      chart={
        <LiveChart series={[sr("ولتاژ (mV)", "#a5d95c", S.trace.filter((_, i) => i % 3 === 0))]} xLabel="t (s)" yLabel="mV" height={230} />
      }
      table={{
        headers: ["ضربه", "زمان R (s)", "R–R (ms)", "HR لحظه‌ای"],
        rows: S.beats.map((b, i) => {
          const prev = i > 0 ? S.beats[i - 1] : null;
          const d = prev ? (b - prev) * 1000 : NaN;
          return [i + 1, Number(b.toFixed(2)), isFinite(d) ? Number(d.toFixed(0)) : "—", isFinite(d) ? Number((60000 / d).toFixed(0)) : "—"];
        }),
      }}
      stats={[
        { label: "ضربان قلب", value: `${fmt(hrNow, 0)} bpm`, color: hrNow > 100 ? "#ff6f61" : "#a5d95c" },
        { label: "فاصله R–R", value: `${fmt(rr * 1000, 0)} ms`, color: "#e9f6f3" },
        { label: "برون‌ده قلبی", value: `${fmt((hrNow * 70) / 1000, 1)} L/min`, color: "#35d3c2", sub: "HR × SV(70mL)" },
        { label: "وضعیت", value: hrNow > 100 ? "تاکی‌کاردی" : hrNow < 60 ? "برادی‌کاردی" : "نرمال", color: hrNow > 100 || hrNow < 60 ? "#f2a83b" : "#a5d95c" },
        { label: "حجم ضربه‌ای", value: "70 mL", color: "#e9f6f3" },
        { label: "تعداد ضربان", value: `${S.beats.length}`, color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `ECG: HR(base)=${fmt(S.hr, 0)} bpm, exercise stress +${fmt(S.stress, 0)}`,
        `RR interval = ${fmt(rr * 1000, 0)} ms; CO = HR x SV = ${fmt((hrNow * 70) / 1000, 2)} L/min`,
        `Waves: P(atrial depolarization), QRS(ventricular), T(repolarization)`,
      ]}
    />
  );
}

/* ===================== Blood pressure ===================== */
interface BpSim { sys: number; dia: number; stress: number; feed: FeedItem[]; ev: number }

export function BloodPressureLab({ exp, onBack, initMode }: { exp: Experiment; onBack: () => void; initMode?: LabMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<BpSim>({ sys: 120, dia: 80, stress: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "فشار خون با کاف و ستون جیوه: صدای کوروتکوف هنگام عبور فشار کاف از سیستول ظاهر و زیر دیاستول محو می‌شود. MAP≈DIA+⅓(S−D)." }] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const frame = useRef(0);
  const tv = useRef(0);

  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const sysE = S.sys + S.stress * 0.25;
  const diaE = S.dia + S.stress * 0.1;
  const map = diaE + (sysE - diaE) / 3;
  const cls = sysE >= 140 || diaE >= 90 ? "فشار خون بالا" : sysE >= 130 || diaE >= 85 ? "مرزی (پرفشاری خفیف)" : sysE < 90 || diaE < 60 ? "افت فشار" : "نرمال";
  const hr = 72 + S.stress * 0.8;
  const rr = 60 / hr;

  useRaf((dt) => {
    tv.current += Math.min(dt, 50) / 1000;
    if (sysE >= 140 && S.ev < 30 && frame.current % 600 === 0) {
      pushFeed("warn", `فشار ${fmt(sysE, 0)}/${fmt(diaE, 0)} — طبقه‌بندی: ${cls}. استرس و نمک را کاهش دهید.`);
    }
    draw(mode === "ar");
    frame.current++;
    if (frame.current % 8 === 0) force();
  }, true);

  const draw = (ar: boolean) => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const W = 960, H = 560;
    medScene(ctx, W, H, ar, performance.now() / 1000);
    // sphygmomanometer column
    const mx = 240, my = 90, mh = 380;
    ctx.fillStyle = "#04191d";
    ctx.strokeStyle = "rgba(42,122,128,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(mx - 26, my, 52, mh, 10); ctx.fill(); ctx.stroke();
    const pNow = diaE + (sysE - diaE) * (0.5 + 0.5 * Math.sin(tv.current * (Math.PI * 2) / rr));
    const yh = ((pNow - 0) / 200) * (mh - 30);
    const mg = ctx.createLinearGradient(0, my + mh, 0, my);
    mg.addColorStop(0, "#8a8fa0"); mg.addColorStop(1, "#c8ccd8");
    ctx.fillStyle = mg;
    ctx.fillRect(mx - 18, my + mh - 15 - yh, 36, yh);
    for (let p = 0; p <= 200; p += 20) {
      const y = my + mh - 15 - (p / 200) * (mh - 30);
      ctx.strokeStyle = "rgba(143,188,184,0.5)";
      ctx.beginPath(); ctx.moveTo(mx + 26, y); ctx.lineTo(mx + 36, y); ctx.stroke();
      ctx.fillStyle = "#8fbcb8";
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillText(`${p}`, mx + 40, y + 3);
    }
    ctx.fillStyle = "#e9f6f3";
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillText(`${fmt(pNow, 0)} mmHg`, mx - 20, my - 12);
    // artery with pulsing flow + vital glow
    const ay = 300;
    const pulse = 0.5 + 0.5 * Math.sin(tv.current * (Math.PI * 2) / rr);
    if (!ar) glow(ctx, 600, ay, 260, [255, 111, 97], 0.06 + pulse * 0.08);
    ctx.strokeStyle = "#ff6f61";
    ctx.lineWidth = 14 + pulse * 8;
    if (!ar) { ctx.shadowColor = "#ff6f61"; ctx.shadowBlur = 14; }
    ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.moveTo(380, ay); ctx.bezierCurveTo(520, ay - 30, 640, ay + 30, 820, ay); ctx.stroke();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    // inner highlight of artery wall
    ctx.strokeStyle = "rgba(255,180,170,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(390, ay - 4); ctx.bezierCurveTo(520, ay - 34, 640, ay + 26, 810, ay - 4); ctx.stroke();
    // RBCs (biconcave discs)
    for (let i = 0; i < 10; i++) {
      const tt = ((tv.current * (60 + pulse * 40)) + i * 82) % 820;
      const x = 380 + tt * 0.54;
      const y = ay + Math.sin((x - 380) / 440 * Math.PI) * (tt % 2 ? 1 : -1) * 6 + ((i % 3) - 1) * 6;
      if (!ar) glow(ctx, x, y, 12, [224, 85, 72], 0.35);
      ctx.fillStyle = "#e05548";
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(150,40,35,0.6)";
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
    // pressure wave trace
    const oy = 460, amp = 70;
    ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = 380; x <= 880; x += 3) {
      const t = tv.current - (880 - x) / 240;
      const ph = (t % rr) / rr;
      const pr = diaE + (sysE - diaE) * Math.exp(-((ph - 0.15) ** 2) / (2 * 0.05 * 0.05)) * (ph < 0.5 ? 1 : 0.6);
      const y = oy - ((pr - 40) / 160) * amp * 2;
      if (x === 380) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#8fbcb8";
    ctx.font = '11px Vazirmatn, sans-serif';
    ctx.fillText("موج فشار شریانی", 380, oy + 36);
    // monitor-style BP panel
    monitor(ctx, 420, 90, 460, 140, ar, "#ff6f61");
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText("NIBP  ·  mmHg", 444, 112);
    ctx.font = '600 42px "IBM Plex Mono", monospace';
    ctx.fillStyle = cls === "نرمال" ? "#a5d95c" : "#ff6f61";
    if (!ar) { ctx.shadowColor = cls === "نرمال" ? "#a5d95c" : "#ff6f61"; ctx.shadowBlur = 12; }
    ctx.fillText(`${fmt(sysE, 0)}/${fmt(diaE, 0)}`, 440, 160);
    ctx.shadowBlur = 0;
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#8fbcb8";
    ctx.fillText("mmHg", 654, 156);
    ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`MAP = ${fmt(map, 0)}`, 440, 190);
    ctx.fillStyle = "#35d3c2";
    ctx.fillText(`PP = ${fmt(sysE - diaE, 0)}`, 440, 212);
    ctx.fillStyle = cls === "نرمال" ? "#a5d95c" : "#f2a83b";
    ctx.font = '13px Vazirmatn, sans-serif';
    ctx.fillText(`طبقه‌بندی: ${cls}`, 660, 190);
  };

  return (
    <LabShell
      exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={true}
      onToggleRun={() => pushFeed("info", "مانیتورینگ فشار خون فعال است — پارامترها را تغییر دهید.")}
      onReset={() => { S.sys = 120; S.dia = 80; S.stress = 0; pushFeed("info", "فشار به محدوده نرمال بازگشت."); }}
      simClock={`${fmt(sysE, 0)}/${fmt(diaE, 0)} mmHg`}
      hint="استرس را بالا ببرید تا سیستول از ۱۴۰ عبور کند — نقطه‌ای که طبقه‌بینی به «فشار خون بالا» تغییر می‌کند."
      protocol={[
        { label: "خواندن سیستول/دیاستول", done: true },
        { label: "محاسبه MAP", done: S.ev >= 1 },
        { label: "افزایش استرس", done: S.stress > 0 },
        { label: "عبور از آستانه 140/90", done: sysE >= 140 || diaE >= 90 },
        { label: "بررسی فشار نبض", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={
        <div className="space-y-5">
          <Slider label="فشار سیستول پایه" value={S.sys} min={85} max={180} step={1} digits={0} unit="mmHg" accent="#ff6f61" onChange={(v) => { S.sys = v; force(); }} />
          <Slider label="فشار دیاستول پایه" value={S.dia} min={50} max={110} step={1} digits={0} unit="mmHg" accent="#56b8ff" onChange={(v) => { S.dia = v; force(); }} />
          <Slider label="استرس/فعالیت" value={S.stress} min={0} max={80} step={2} digits={0} accent="#f2a83b" onChange={(v) => { S.stress = v; force(); }} />
          <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11px] text-fog leading-6">
            طبق AHA: نرمال &lt;120/80 · افزایش‌یافته 120–129 · مرحله ۱ ≥130/80 · مرحله ۲ ≥140/90
          </div>
        </div>
      }
      chart={
        <LiveChart
          series={[
            sr("فشار مویرگی تخمینی", "#35d3c2", Array.from({ length: 60 }, (_, i) => {
              const t = i * 0.1;
              const ph = (t % rr) / rr;
              return { x: t, y: diaE + (sysE - diaE) * Math.exp(-((ph - 0.15) ** 2) / (2 * 0.05 * 0.05)) };
            })),
          ]}
          xLabel="t (s)" yLabel="mmHg" height={230} yMin={40} yMax={200} />
      }
      table={{
        headers: ["دسته", "سیستول", "دیاستول"],
        rows: [
          ["نرمال", "<120", "<80"],
          ["افزایش‌یافته", "120–129", "<80"],
          ["مرحله ۱", "130–139", "80–89"],
          ["مرحله ۲", "≥140", "≥90"],
          ["بحران", ">180", ">120"],
        ],
      }}
      stats={[
        { label: "فشار خون", value: `${fmt(sysE, 0)}/${fmt(diaE, 0)}`, color: cls === "نرمال" ? "#a5d95c" : "#ff6f61" },
        { label: "MAP", value: `${fmt(map, 0)} mmHg`, color: "#35d3c2", sub: "DIA+⅓(PP)" },
        { label: "فشار نبض", value: `${fmt(sysE - diaE, 0)} mmHg`, color: "#f2a83b", sub: "S−D" },
        { label: "طبقه‌بندی", value: cls, color: cls === "نرمال" ? "#a5d95c" : "#f2a83b" },
        { label: "ضربان همراه", value: `${fmt(hr, 0)} bpm`, color: "#e9f6f3" },
        { label: "مقاومت محیطی", value: fmt(map / ((hr * 70) / 1000) * 0.0013, 1), color: "#e9f6f3", sub: "TPR ≈ MAP/CO" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[
        `BP = ${fmt(sysE, 0)}/${fmt(diaE, 0)} mmHg (stress +${fmt(S.stress, 0)})`,
        `MAP = DIA + (SYS-DIA)/3 = ${fmt(map, 1)} mmHg; pulse pressure = ${fmt(sysE - diaE, 0)} mmHg`,
        `Classification: ${cls}`,
      ]}
    />
  );
}
