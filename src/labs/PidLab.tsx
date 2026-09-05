import { useMemo, useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, faDigits, useForce, useRaf } from "../lib/utils";
import { bg, FA, MONO, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

const SIM_T = 12, DT = 0.02, N = Math.floor(SIM_T / DT);

interface SimPoint { t: number; pv: number; sp: number; u: number }
interface Metrics { overshoot: number; rise: number; settling: number; sserr: number; peak: number }

/* simulate step response of DC-motor position plant with PID + anti-windup */
function simulate(kp: number, ki: number, kd: number, sp: number, tau: number, gain: number, aw: boolean): { pts: SimPoint[]; m: Metrics } {
  let pv = 0, vel = 0, integ = 0, prevErr = sp;
  const pts: SimPoint[] = [];
  let peak = 0, rise10 = -1, rise90 = -1, settle = -1, band = Math.abs(sp) * 0.02;
  for (let i = 0; i < N; i++) {
    const t = i * DT;
    const err = sp - pv;
    integ += err * DT;
    if (aw) integ = Math.max(-sp * 2 / Math.max(ki, 0.01), Math.min(sp * 2 / Math.max(ki, 0.01), integ));
    const d = (err - prevErr) / DT;
    let u = kp * err + ki * integ + kd * d;
    u = Math.max(-3 * sp, Math.min(3 * sp, u)); // actuator saturation
    // plant: tau*vel' = -vel + gain*u ; pv' = vel
    vel += ((-vel + gain * u) / tau) * DT;
    pv += vel * DT;
    prevErr = err;
    peak = Math.max(peak, pv);
    if (rise10 < 0 && pv >= 0.1 * sp) rise10 = t;
    if (rise90 < 0 && pv >= 0.9 * sp) rise90 = t;
    if (settle < 0 && Math.abs(sp - pv) <= band && i > 10) settle = t;
    if (i % 2 === 0) pts.push({ t: Number(t.toFixed(2)), pv: Number(pv.toFixed(3)), sp, u: Number(u.toFixed(2)) });
  }
  const overshoot = sp > 0 ? Math.max(0, ((peak - sp) / sp) * 100) : 0;
  const rise = rise10 >= 0 && rise90 >= 0 ? rise90 - rise10 : NaN;
  const sserr = Math.abs(sp - pts[pts.length - 1].pv);
  return { pts, m: { overshoot, rise, settling: settle, sserr, peak } };
}

const PRESETS: { fa: string; kp: number; ki: number; kd: number }[] = [
  { fa: "فقط P — خطای ماندگار", kp: 2, ki: 0, kd: 0 },
  { fa: "PI — حذف خطا، کمی فراجهش", kp: 2.5, ki: 1.2, kd: 0 },
  { fa: "PID تنظیم‌شده (Ziegler–Nichols)", kp: 3.2, ki: 1.6, kd: 1.4 },
  { fa: "PD — میرایی بدون انتگرال", kp: 3, ki: 0, kd: 1.8 },
];

export function PidLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ kp: 3.2, ki: 1.6, kd: 1.4, sp: 100, tau: 0.8, gain: 1, aw: true, playT: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "کنترل‌کننده PID روی گیاه مرتبه‌اول (موتور DC) — بهره‌ها را تنظیم کنید؛ پاسخ پله، فراجهش، زمان نشست و خطای ماندگار لحظه‌ای محاسبه می‌شود." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(true);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };

  const { pts, m } = useMemo(() => simulate(S.kp, S.ki, S.kd, S.sp, S.tau, S.gain, S.aw), [S.kp, S.ki, S.kd, S.sp, S.tau, S.gain, S.aw]);
  const idx = Math.min(pts.length - 1, Math.floor(S.playT / DT / 2));
  const cur = pts[idx];

  useRaf((dt) => {
    if (running) {
      S.playT += Math.min(dt, 50) / 1000 * 1.2;
      if (S.playT > SIM_T) S.playT = 0;
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    // cart-on-rail plant visualization
    const railY = 430, x0 = 120, x1 = 840;
    ctx.fillStyle = "#1d5b63"; ctx.fillRect(x0, railY, x1 - x0, 8);
    const frac = Math.max(0, Math.min(1, cur.pv / (S.sp * 1.3)));
    const cx = x0 + frac * (x1 - x0 - 60);
    // setpoint marker
    const spx = x0 + (S.sp / (S.sp * 1.3)) * (x1 - x0 - 60);
    ctx.setLineDash([5, 6]); ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(spx, railY - 70); ctx.lineTo(spx, railY + 30); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f2a83b"; ctx.font = `11px ${FA}`; ctx.fillText("مقصود (SP)", spx - 28, railY - 80);
    // cart
    ctx.fillStyle = "#35d3c2";
    ctx.beginPath(); ctx.roundRect(cx, railY - 52, 60, 44, 8); ctx.fill();
    ctx.fillStyle = "#04191d"; ctx.beginPath(); ctx.arc(cx + 14, railY - 4, 9, 0, Math.PI * 2); ctx.arc(cx + 46, railY - 4, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 12px ${MONO}`; ctx.textAlign = "center";
    ctx.fillText(fmt(cur.pv, 0), cx + 30, railY - 26); ctx.textAlign = "left";
    // motor + signal bar (control effort u)
    const uFrac = Math.max(0, Math.min(1, Math.abs(cur.u) / (3 * S.sp)));
    ctx.fillStyle = "#0b3038"; ctx.strokeStyle = "#2a7a80";
    ctx.beginPath(); ctx.roundRect(120, 120, 300, 26, 13); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cur.u >= 0 ? "#35d3c2" : "#ff6f61";
    ctx.beginPath(); ctx.roundRect(122, 122, Math.max(4, uFrac * 296), 22, 11); ctx.fill();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText(`سیگنال کنترل u = ${fmt(cur.u, 1)}`, 120, 165);
    // metrics readout
    const metrics: [string, string, string][] = [
      ["فراجهش", isFinite(m.overshoot) ? `${fmt(m.overshoot, 1)}٪` : "—", m.overshoot > 20 ? "#ff6f61" : "#a5d95c"],
      ["زمان صعود ۱۰→۹۰٪", isFinite(m.rise) ? `${fmt(m.rise, 2)} s` : "—", "#56b8ff"],
      ["زمان نشست (۲٪)", isFinite(m.settling) ? `${fmt(m.settling, 2)} s` : "∞", isFinite(m.settling) ? "#35d3c2" : "#ff6f61"],
      ["خطای ماندگار", `${fmt(m.sserr, 2)}`, m.sserr < 1 ? "#a5d95c" : "#f2a83b"],
    ];
    metrics.forEach(([lab, val, col], i) => {
      const x = 500 + (i % 2) * 210, y = 120 + Math.floor(i / 2) * 64;
      ctx.fillStyle = "rgba(4,25,29,0.75)"; ctx.strokeStyle = "rgba(42,122,128,0.8)";
      ctx.beginPath(); ctx.roundRect(x, y, 195, 52, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#8fbcb8"; ctx.font = `10.5px ${FA}`; ctx.fillText(lab, x + 12, y + 20);
      ctx.fillStyle = col; ctx.font = `700 16px ${MONO}`; ctx.fillText(val, x + 12, y + 42);
    });
    frame.current++;
    if (frame.current % 10 === 0) force();
  }, true);

  const apply = (p: (typeof PRESETS)[number]) => { S.kp = p.kp; S.ki = p.ki; S.kd = p.kd; pushFeed("info", `پیش‌تنظیم «${p.fa}» اعمال شد.`); force(); };
  const verdict = () => {
    if (S.ki === 0 && m.sserr > 1) return { txt: "بدون جمله انتگرالی خطای ماندگار باقی می‌ماند — Ki را اضافه کنید.", col: "#f2a83b" };
    if (m.overshoot > 25) return { txt: "فراجهش زیاد — Kd را افزایش یا Kp را کاهش دهید.", col: "#ff6f61" };
    if (isFinite(m.settling) && m.overshoot < 10 && m.sserr < 1) return { txt: "تنظیم عالی: نشست سریع، فراجهش کم، خطای صفر.", col: "#a5d95c" };
    return { txt: "در حال ارزیابی پاسخ…", col: "#8fbcb8" };
  };
  const v = verdict();

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running} onToggleRun={() => setRunning((r) => !r)}
      onReset={() => { S.playT = 0; pushFeed("info", "شبیه‌سازی از ابتدا اجرا شد."); }}
      simClock={`t = ${fmt(cur.t, 2)} s · PV = ${fmt(cur.pv, 1)}`}
      hint="Ki=0 خطای ماندگار می‌دهد؛ Kd زیاد فراجهش را می‌گیرد اما نویز را تقویت می‌کند. آنتی‌وینداپ را خاموش کنید تا اشباع انتگرال را ببینید."
      protocol={[
        { label: "مشاهده پاسخ P-only و خطای ماندگار", done: S.ev >= 1 || S.ki === 0 },
        { label: "افزودن Ki و حذف خطا", done: S.ki > 0 },
        { label: "تنظیم Kd برای کاهش فراجهش", done: S.kd > 0 },
        { label: "رسیدن به فراجهش <۱۰٪ و نشست سریع", done: m.overshoot < 10 && isFinite(m.settling) },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-4">
        <Slider label="بهره تناسبی Kp" value={S.kp} min={0} max={8} step={0.1} digits={1} accent="#f2a83b" onChange={(x) => { S.kp = x; force(); }} />
        <Slider label="بهره انتگرالی Ki" value={S.ki} min={0} max={5} step={0.1} digits={1} accent="#35d3c2" onChange={(x) => { S.ki = x; force(); }} />
        <Slider label="بهره مشتقی Kd" value={S.kd} min={0} max={5} step={0.1} digits={1} accent="#b388ff" onChange={(x) => { S.kd = x; force(); }} />
        <Slider label="مقدار مقصود (SP)" value={S.sp} min={20} max={150} step={5} digits={0} unit="واحد" accent="#56b8ff" onChange={(x) => { S.sp = x; force(); }} />
        <Slider label="ثابت زمانی گیاه τ" value={S.tau} min={0.2} max={2} step={0.1} digits={1} unit="s" accent="#ff6f61" onChange={(x) => { S.tau = x; force(); }} />
        <button onClick={() => { S.aw = !S.aw; pushFeed(S.aw ? "info" : "warn", S.aw ? "آنتی‌وینداپ فعال شد." : "آنتی‌وینداپ خاموش — خطر اشباع انتگرال."); force(); }}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer"
          style={S.aw ? { borderColor: "#a5d95c", color: "#a5d95c", background: "#a5d95c10" } : { borderColor: "#ff6f61", color: "#ff6f61", background: "#ff6f6110" }}>
          {S.aw ? "آنتی‌وینداپ: فعال" : "آنتی‌وینداپ: خاموش"}
        </button>
        <div className="flex flex-col gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.fa} onClick={() => apply(p)} className="px-3 py-2 rounded-lg text-[11.5px] text-right border border-edge/70 text-fog hover:text-teal hover:border-teal/50 transition-colors cursor-pointer">{p.fa}</button>
          ))}
        </div>
      </div>}
      chart={<LiveChart series={[sr("متغیر فرآیند PV", "#35d3c2", pts.map((p) => ({ x: p.t, y: p.pv }))), sr("مقصود SP", "#f2a83b", [{ x: 0, y: S.sp }, { x: SIM_T, y: S.sp }]), sr("نشانگر جاری", "#b388ff", [{ x: cur.t, y: cur.pv }, { x: cur.t, y: cur.pv }])]} xLabel="t (s)" yLabel="PV" height={230} />}
      table={{ headers: ["t (s)", "PV", "SP", "u"], rows: pts.filter((_, i) => i % 5 === 0).map((p) => [p.t, p.pv, p.sp, p.u]) }}
      stats={[
        { label: "فراجهش", value: isFinite(m.overshoot) ? `${fmt(m.overshoot, 1)} ٪` : "—", color: m.overshoot > 20 ? "#ff6f61" : "#a5d95c" },
        { label: "زمان صعود", value: isFinite(m.rise) ? `${fmt(m.rise, 2)} s` : "—", color: "#56b8ff" },
        { label: "زمان نشست (۲٪)", value: isFinite(m.settling) ? `${fmt(m.settling, 2)} s` : "∞", color: isFinite(m.settling) ? "#35d3c2" : "#ff6f61" },
        { label: "خطای ماندگار", value: fmt(m.sserr, 2), color: m.sserr < 1 ? "#a5d95c" : "#f2a83b" },
        { label: "اوج پاسخ", value: fmt(m.peak, 1), color: "#e9f6f3" },
        { label: "تحلیلگر", value: v.txt, color: v.col },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`PID: Kp=${fmt(S.kp, 1)}, Ki=${fmt(S.ki, 1)}, Kd=${fmt(S.kd, 1)}, SP=${fmt(S.sp, 0)}`, `overshoot=${fmt(m.overshoot, 2)}\\%, rise=${isFinite(m.rise) ? fmt(m.rise, 3) : "NA"}s, settling=${isFinite(m.settling) ? fmt(m.settling, 3) : "NA"}s, e_ss=${fmt(m.sserr, 3)}`]} />
  );
}
