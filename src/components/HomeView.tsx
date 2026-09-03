import { useEffect, useState, type ReactElement } from "react";
import { EXPERIMENTS, SUBJECTS, SUBJECT_ORDER, liveExperiments, liveOf, type Experiment, type Subject } from "../data/catalog";
import { faDigits, useReveal } from "../lib/utils";
import type { LabMode } from "./LabShell";
import { Chip, CountUp, DiffDots, Reveal, SectionHead, StatusPill } from "./ui";
import {
  IconAr, IconBook, IconBolt, IconCheck, IconChip, IconError, IconHeadset,
  IconPlay, IconPulse, IconSeal, IconTarget, SubjectIcon,
} from "./icons";

/* ---------------- mini instrument animations ---------------- */
function PendulumMini() {
  return (
    <svg viewBox="0 0 60 60" className="w-16 h-16 shrink-0">
      <line x1="12" y1="8" x2="48" y2="8" stroke="#1d5b63" strokeWidth="2.5" />
      <g className="swing-mini">
        <line x1="30" y1="8" x2="30" y2="40" stroke="#8fbcb8" strokeWidth="1.6" />
        <circle cx="30" cy="45" r="7" fill="#f2a83b" />
      </g>
    </svg>
  );
}
function EcgMini() {
  return (
    <svg viewBox="0 0 60 60" className="w-16 h-16 shrink-0">
      <path d="M4 32h10l4-14 6 24 5-16 3 6h24" stroke="#ff6f61" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path className="ekg-dash" d="M4 32h10l4-14 6 24 5-16 3 6h24" stroke="#ffd08a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChipMini() {
  return (
    <svg viewBox="0 0 60 60" className="w-16 h-16 shrink-0">
      <rect x="16" y="16" width="28" height="28" rx="4" fill="none" stroke="#b388ff" strokeWidth="2.5" />
      <rect x="24" y="24" width="12" height="12" rx="2" fill="#b388ff" opacity="0.5" />
      {[22, 30, 38].map((p) => (
        <g key={p}>
          <line x1={p} y1="8" x2={p} y2="16" stroke="#8fbcb8" strokeWidth="2" />
          <line x1={p} y1="44" x2={p} y2="52" stroke="#8fbcb8" strokeWidth="2" />
          <line x1="8" y1={p} x2="16" y2={p} stroke="#8fbcb8" strokeWidth="2" />
          <line x1="44" y1={p} x2="52" y2={p} stroke="#8fbcb8" strokeWidth="2" />
        </g>
      ))}
      <rect className="chip-blink" x="27" y="27" width="6" height="6" fill="#35d3c2" />
    </svg>
  );
}
function FlaskMini() {
  return (
    <svg viewBox="0 0 60 60" className="w-16 h-16 shrink-0">
      <path d="M26 7v15l-12 24a6 6 0 0 0 5.5 8.5h21a6 6 0 0 0 5.5-8.5L34 22V7" fill="none" stroke="#8fbcb8" strokeWidth="2" />
      <path d="M23 7h14" stroke="#8fbcb8" strokeWidth="2" />
      <path className="flask-pulse" d="M20 36h20l6 12a3.5 3.5 0 0 1-3.2 5H17.2a3.5 3.5 0 0 1-3.2-5l6-12Z" />
    </svg>
  );
}
function GeneticsMini() {
  const cs = ["#f2a83b", "#35d3c2", "#ff6f61"];
  return (
    <svg viewBox="0 0 60 60" className="w-16 h-16 shrink-0">
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <circle key={`${r}${c}`} className="breathe" style={{ animationDelay: `${(r * 3 + c) * 0.18}s` }}
            cx={16 + c * 14} cy={16 + r * 14} r="5.5" fill={cs[(r * 3 + c + r) % 3]} />
        ))
      )}
    </svg>
  );
}

const MINI: Record<string, () => ReactElement> = {
  pendulum: PendulumMini,
  projectile: PendulumMini,
  snell: PendulumMini,
  photo: ChipMini,
  titration: FlaskMini,
  enzyme: FlaskMini,
  genetics: GeneticsMini,
  culture: GeneticsMini,
  seriesparallel: ChipMini,
  rcfilter: ChipMini,
  logicgate: ChipMini,
  timer555: ChipMini,
  bjt: ChipMini,
  ecg: EcgMini,
  bloodpressure: EcgMini,
  spirometry: EcgMini,
  spo2: EcgMini,
};

/* ---------------- telemetry ticker ---------------- */
const TICKS = [
  "شاخه الکترونیک: ۵ آزمایش زنده — از قانون اهم تا نواحی کاری BJT",
  "شاخه پزشکی: مانیتور ECG کالیبره شد — فاصله R–R پایدار",
  "NIST: ثابت تفکیک اسید استیک (Ka = ۱٫۷۵×۱۰⁻⁵) بارگذاری شد",
  "موتور فیزیک: انتگرال‌گیر نیمه‌ضمنی — ۲۴۰ گام در ثانیه — پایدار",
  "PubChem CID 2244 (آسپرین) — خواص ترمودینامیکی همگام‌سازی شد",
  "منحنی تفکیک اکسی‌هموگلوبین: P50 = 27 mmHg — اثر بور فعال",
  "WebXR: دسته‌های کنترلی شناسایی شدند — رندر استریو ۶۰fps",
  "BRENDA: Km میکائلیس–منتن برای E.C. 2.7.1.1 دریافت شد",
  "تایمر ۵۵۵: پنجره تریگر ⅓–⅔ Vcc تأیید شد",
  "خروجی LaTeX گزارش نوار قلب #M-042 تولید شد",
];

function Ticker() {
  const [n, setN] = useState(3);
  useEffect(() => {
    const i = setInterval(() => setN((v) => v + 1), 2400);
    return () => clearInterval(i);
  }, []);
  const items = Array.from({ length: 4 }, (_, k) => TICKS[(n - k + TICKS.length * 4) % TICKS.length]);
  return (
    <div className="rounded-xl border border-edge bg-abyss/80 p-4 text-[11.5px] leading-7 h-[164px] overflow-hidden">
      <div className="flex items-center justify-between mb-2 text-teal">
        <span className="font-mono tracking-[0.25em] text-[10px]">SYSTEM TELEMETRY</span>
        <span className="flex items-center gap-1.5 text-[10px] text-lime">
          <span className="w-1.5 h-1.5 rounded-full bg-lime pulse-dot" /> LIVE
        </span>
      </div>
      {items.map((t, i) => (
        <div key={`${n}-${i}`} className={i === 0 ? "ticker-in text-snow" : "text-fog"} style={{ opacity: 1 - i * 0.22 }}>
          <span className="text-edge2">[{faDigits((n - i) % 100)}] </span>
          {t}
        </div>
      ))}
    </div>
  );
}

/* ================= main ================= */
export function HomeView({ onOpen }: { onOpen: (id: string, mode?: LabMode) => void }) {
  const [tab, setTab] = useState<Subject>("physics");
  const live = liveExperiments();
  const rackIds = ["p-pendulum", "e-timer555", "m-ecg", "c-titration", "b-culture", "e-bjt"];
  const rack = rackIds.map((id) => live.find((e) => e.id === id)).filter((e): e is Experiment => !!e);
  const flagships = SUBJECT_ORDER.map((s) => liveOf(s)[0]).filter((e): e is Experiment => !!e);

  return (
    <div className="relative z-10">
      {/* ============ opening: lab console ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-8 items-stretch">
          <Reveal className="flex flex-col justify-center">
            <p className="font-mono text-[11px] tracking-[0.4em] text-teal mb-4">
              IMMERSIVE VIRTUAL SCIENCE LAB · 5 TRACKS · VR/AR
            </p>
            <h1 className="font-display text-5xl sm:text-6xl xl:text-7xl leading-[1.08] text-snow">
              آزمایشگاه فراگیر
              <span className="text-amber"> علوم</span>
            </h1>
            <p className="mt-5 text-fog leading-9 text-[15.5px] max-w-xl">
              پنج شاخه مستقل — <b className="text-snow">فیزیک</b>، <b className="text-snow">شیمی</b>، <b className="text-snow">زیست‌شناسی</b>،
              <b className="text-violet"> الکترونیک</b> و <b className="text-coral">پزشکی</b> — هر آزمایشِ واقعی، بی‌نهایت بار تکرار؛
              با موتور بلادرنگ، بازخورد خطاهای رویه‌ای و خروجی گزارش استاندارد.
            </p>
            {/* subject strip */}
            <div className="mt-6 grid grid-cols-5 gap-1.5 max-w-xl">
              {SUBJECT_ORDER.map((s) => (
                <a key={s} href="#labs" onClick={() => setTab(s)}
                  className="group rounded-lg border border-edge/70 bg-panel/60 px-1 py-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-edge2">
                  <span className="flex justify-center mb-1.5 transition-transform group-hover:scale-110" style={{ color: SUBJECTS[s].color }}>
                    <SubjectIcon subject={s} c="w-6 h-6" />
                  </span>
                  <span className="block text-[10.5px] text-fog group-hover:text-snow transition-colors">{SUBJECTS[s].fa}</span>
                  <span className="block num text-[9.5px] mt-0.5" style={{ color: SUBJECTS[s].color }}>{faDigits(liveOf(s).length)}</span>
                </a>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => onOpen("p-pendulum")}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                style={{ background: "#f2a83b", color: "#04191d" }}>
                <IconPlay c="w-4 h-4" />
                ورود به اولین آزمایش
              </button>
              <button onClick={() => onOpen("e-timer555")}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm border transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                style={{ borderColor: "#b388ff88", color: "#b388ff", background: "#b388ff10" }}>
                <IconChip c="w-4 h-4" />
                آزمایشگاه الکترونیک
              </button>
              <button onClick={() => onOpen("m-ecg")}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm border transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                style={{ borderColor: "#ff6f6188", color: "#ff6f61", background: "#ff6f6110" }}>
                <IconPulse c="w-4 h-4" />
                آزمایشگاه پزشکی
              </button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-[11.5px] text-fog">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-lime pulse-dot" />
                موتور فیزیک: آنلاین
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal pulse-dot" style={{ animationDelay: "0.4s" }} />
                سنسورهای مجازی: کالیبره
              </span>
            </div>
          </Reveal>

          {/* instrument rack */}
          <Reveal delay={120} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-[10px] tracking-[0.3em] text-fog">LIVE MODULES — آماده اجرا</span>
              <span className="num text-[10px] text-teal">{faDigits(live.length)} / {faDigits(EXPERIMENTS.length)}</span>
            </div>
            {rack.map((e, i) => {
              const Mini = e.lab ? MINI[e.lab] : undefined;
              const color = SUBJECTS[e.subject].color;
              return (
                <button key={e.id} onClick={() => onOpen(e.id)}
                  className="group flex items-center gap-4 rounded-xl border border-edge bg-panel/80 p-3.5 text-right transition-all hover:-translate-y-0.5 hover:bg-panel cursor-pointer"
                  style={{ transitionDelay: `${i * 40}ms` }}>
                  <div className="rounded-lg p-1.5 border border-edge/60 bg-deep/70 group-hover:scale-105 transition-transform">
                    {Mini ? <Mini /> : (
                      <span className="w-16 h-16 grid place-items-center" style={{ color }}><SubjectIcon subject={e.subject} c="w-9 h-9" /></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: color }} />
                      <span className="font-display text-lg text-snow leading-6 truncate">{e.title}</span>
                    </div>
                    <div className="text-[11px] text-fog">{SUBJECTS[e.subject].fa} · {e.field}</div>
                  </div>
                  <span className="hidden sm:block px-3 py-2 rounded-lg font-bold text-[11px]"
                    style={{ background: `${color}1f`, color, border: `1px solid ${color}55` }}>
                    اجرا ←
                  </span>
                </button>
              );
            })}
            <Ticker />
          </Reveal>
        </div>

        {/* stat band */}
        <Reveal delay={80}>
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-edge bg-panel/60 divide-x divide-x-reverse divide-edge/70 overflow-hidden">
            {([
              [live.length, "", "آزمایشگاه زنده در ۵ شاخه", "#f2a83b"],
              [live.length * 3, "+", "کد استاندارد NGSS / IB / A‑Level", "#35d3c2"],
              [240, " Hz", "نرخ انتگرال‌گیری موتور فیزیک", "#56b8ff"],
              [99.2, "٪", "دقت تطبیق با داده‌های مرجع", "#a5d95c"],
            ] as [number, string, string, string][]).map(([n, sfx, label, color]) => (
              <div key={label} className="p-6 text-center hover:bg-panel transition-colors">
                <div className="font-display text-4xl sm:text-5xl" style={{ color }}>
                  {n % 1 !== 0 ? <span className="num" style={{ direction: "ltr" }}>{faDigits("99.2")}{sfx}</span> : <CountUp to={n} suffix={sfx} />}
                </div>
                <div className="mt-2 text-[12px] text-fog">{label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============ catalog with 5 tracks ============ */}
      <section id="labs" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHead
              overline="EXPERIMENT CATALOG — 5 TRACKS"
              title="کاتالوگ آزمایش‌ها در پنج شاخه"
              desc="الکترونیک و پزشکی در کنار سه شاخه کلاسیک، به‌صورت کاملاً مستقل — هر آزمایش با کد استانداردهای جهانی و پروتکل گام‌به‌گام."
            />
            <div className="flex flex-wrap rounded-lg border border-edge overflow-hidden">
              {SUBJECT_ORDER.map((s) => (
                <button key={s} onClick={() => setTab(s)}
                  className="flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] font-medium transition-colors cursor-pointer"
                  style={tab === s ? { background: SUBJECTS[s].soft, color: SUBJECTS[s].color } : { color: "#8fbcb8" }}>
                  <SubjectIcon subject={s} c="w-4 h-4" />
                  {SUBJECTS[s].fa}
                  <span className="num text-[10px] opacity-80">{faDigits(liveOf(s).length)}</span>
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-edge/70 px-4 py-3" style={{ background: SUBJECTS[tab].soft }}>
            <span style={{ color: SUBJECTS[tab].color }}><SubjectIcon subject={tab} c="w-5 h-5" /></span>
            <p className="text-[12.5px] text-fog leading-6">
              <b style={{ color: SUBJECTS[tab].color }}>{SUBJECTS[tab].fa}:</b> {SUBJECTS[tab].blurb}
            </p>
          </div>
        </Reveal>

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPERIMENTS.filter((e) => e.subject === tab).map((e, i) => (
            <Reveal key={e.id} delay={(i % 3) * 70} className="h-full">
              <ExpCard e={e} onOpen={onOpen} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ standards ============ */}
      <section id="standards" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
        <Reveal>
          <SectionHead
            overline="STANDARDS & REFERENCE DATA"
            title="دقتی که قابل استناد است"
            desc="پروتکل‌ها و داده‌های شبیه‌سازی با سه چارچوب آموزشی جهانی و معتبرترین پایگاه‌های علمی همگام‌اند."
            accent="#f2a83b"
          />
        </Reveal>

        <div className="mt-8 grid lg:grid-cols-[1.3fr_1fr] gap-4">
          <Reveal>
            <div className="h-full rounded-xl border border-edge bg-panel/70 p-6 relative overflow-hidden">
              <div className="scan-line" />
              <div className="flex items-center gap-3 mb-4">
                <IconSeal c="w-8 h-8 text-amber" />
                <div>
                  <h3 className="font-display text-2xl text-snow">NGSS — نسل بعدی استانداردهای علوم</h3>
                  <p className="text-[12px] text-fog">Next Generation Science Standards</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  ["SEP‑3", "برنامه‌ریزی و اجرای تحقیق — هر آزمایش با پروتکل قابل‌سنجش"],
                  ["SEP‑4", "تحلیل و تفسیر داده — جدول زنده، آمار توصیفی و آزمون خطا"],
                  ["SEP‑5", "تفکر ریاضی و محاسباتی — موتور شبیه‌سازی کمی، نه انیمیشن کیفی"],
                ].map(([c, t]) => (
                  <li key={c} className="flex items-start gap-3 text-[13.5px] text-fog leading-7">
                    <span className="num shrink-0 px-2 py-0.5 rounded text-[11px] mt-1" style={{ background: "#f2a83b1a", color: "#f2a83b", border: "1px solid #f2a83b44" }}>{c}</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <div className="flex flex-col gap-4">
            <Reveal delay={100}>
              <div className="rounded-xl border border-edge bg-panel/70 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <IconBook c="w-7 h-7 text-sky" />
                  <h3 className="font-display text-xl text-snow">IB Diploma Programme</h3>
                </div>
                <p className="text-[13px] text-fog leading-7">
                  آزمایش‌ها با سرفصل‌های SL/HL و الزامات <b className="text-snow">Internal Assessment</b> طراحی شده‌اند؛ از جمله خطایابی و عدم‌قطعیت.
                </p>
              </div>
            </Reveal>
            <Reveal delay={180}>
              <div className="rounded-xl border border-edge bg-panel/70 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <IconTarget c="w-7 h-7 text-teal" />
                  <h3 className="font-display text-xl text-snow">A‑Level (AQA / Cambridge)</h3>
                </div>
                <p className="text-[13px] text-fog leading-7">
                  نگاشت مستقیم با <b className="text-snow">Required Practicals</b> — مانند RP‑12 آونگ و تیتراسیون‌های CPAC.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ data infrastructure ============ */}
      <section id="data" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
        <Reveal>
          <SectionHead
            overline="DATA PIPELINE"
            title="زیرساخت دادگستری و تحلیل"
            desc="هر رویداد آزمایش با برچسب زمان ثبت می‌شود؛ از جدول زنده تا آمار و گزارش نهایی، همه‌چیز قابل استخراج است."
            accent="#35d3c2"
          />
        </Reveal>

        <div className="mt-10 grid lg:grid-cols-[1fr_1fr] gap-6 items-center">
          <Reveal>
            <div className="flex flex-col">
              {([
                ["۰۱", "ثبت رویداد", "هر افزودن، رهاکردن و اندازه‌گیری با برچسب زمان شبیه‌سازی", "#f2a83b"],
                ["۰۲", "جدول داده زنده", "ستون‌های عددی با نمونه‌برداری هم‌گام از موتور", "#35d3c2"],
                ["۰۳", "تحلیل آماری", "میانگین، انحراف معیار، SEM روی هر ستون قابل انتخاب", "#56b8ff"],
                ["۰۴", "گزارش استاندارد", "خروجی LaTeX آماده چاپ، CSV برای Excel و JSON خام", "#a5d95c"],
              ] as [string, string, string, string][]).map(([n, t, d, c], i) => (
                <div key={n} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="w-11 h-11 rounded-full border-2 flex items-center justify-center font-display text-lg shrink-0" style={{ borderColor: c, color: c }}>{n}</span>
                    {i < 3 && (
                      <svg width="2" height="34" className="my-1">
                        <line x1="1" y1="0" x2="1" y2="34" stroke={c} strokeWidth="2" strokeDasharray="4 5" className="dash-move" />
                      </svg>
                    )}
                  </div>
                  <div className="pb-6 pt-1.5">
                    <h4 className="font-display text-xl text-snow">{t}</h4>
                    <p className="text-[13px] text-fog leading-6 mt-0.5">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="rounded-xl border border-edge bg-abyss/90 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge/70 bg-panel/60">
                <span className="font-mono text-[10.5px] tracking-[0.25em] text-fog">REPORT PREVIEW — scilab-m-ecg-report.tex</span>
                <span className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-coral/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-lime/80" />
                </span>
              </div>
              <pre dir="ltr" className="p-5 text-[11px] leading-6 font-mono text-fog overflow-x-auto">
{`\\documentclass[11pt]{article}
\\usepackage{booktabs}
\\title{Lab Report --- ECG \\& Cardiac Rhythm}
\\begin{document}\\maketitle
\\section*{Measured Quantities}
\\begin{tabular}{ll}\\toprule
Heart rate      & 72 bpm \\\\
RR interval     & 833 ms \\\\
Cardiac output  & 5.04 L/min \\\\
\\bottomrule\\end{tabular}
\\section*{Raw Data}  % CSV export available
...
\\end{document}`}
              </pre>
              <div className="flex items-center gap-2 px-4 py-3 border-t border-edge/70">
                <Chip color="#35d3c2">CSV</Chip>
                <Chip color="#f2a83b">LaTeX</Chip>
                <Chip color="#56b8ff">JSON</Chip>
                <span className="text-[11px] text-fog mr-auto">تولیدشده از داده واقعی همین جلسه</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ VR / AR ============ */}
      <section id="vr" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <SectionHead
              overline="IMMERSIVE MODES"
              title="وارد آزمایش شوید — واقعاً"
              desc="حالت VR با رندر استریوسکوپیک دوقلو و اختلاف منظر برای هدست‌ها، و حالت AR که میز کار مجازی را روی محیط واقعی لنگر می‌کند. هر دو از همین حالا داخل هر آزمایش فعال‌اند."
              accent="#56b8ff"
            />
            <ul className="mt-6 space-y-3.5">
              {[
                ["رندر استریوسکوپیک ۶۰ فریم", "دو چشمی با ماسک عدسی — آماده WebXR و هدست‌های Cardboard"],
                ["پاس‌ترو AR با لنگر سطح", "شناسایی میز کار و ترکیب ابزارها با محیط واقعی"],
                ["سوییچ لحظه‌ای", "بدون خروج از آزمایش، بین عادی / VR / AR جابه‌جا شوید"],
              ].map(([t, d]) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-1.5 w-2 h-2 rotate-45 bg-sky shrink-0" />
                  <div>
                    <div className="text-[14px] text-snow font-medium">{t}</div>
                    <div className="text-[12.5px] text-fog leading-6">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={() => onOpen("p-pendulum", "vr")}
              className="mt-7 flex items-center gap-2.5 px-6 py-3 rounded-lg font-bold text-sm transition-all hover:brightness-110 active:scale-95 cursor-pointer"
              style={{ background: "#56b8ff", color: "#04191d" }}>
              <IconHeadset c="w-5 h-5" />
              پیش‌نمایش VR روی آزمایش آونگ
            </button>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative rounded-2xl border border-edge bg-deep p-8 overflow-hidden">
              <div className="scan-line" />
              <div dir="ltr" className="flex items-center justify-center gap-4 bg-black rounded-xl py-8">
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-full overflow-hidden border-4 border-panel2 bg-abyss">
                    <div className="w-[150px] h-[150px] sm:w-[190px] sm:h-[190px] flex items-center justify-center">
                      <svg viewBox="0 0 60 60" className="w-24 h-24">
                        <line x1="12" y1="8" x2="48" y2="8" stroke="#1d5b63" strokeWidth="2.5" />
                        <g className="swing-mini" style={{ animationDelay: i === 1 ? "0.06s" : "0s" }}>
                          <line x1="30" y1="8" x2="30" y2="40" stroke="#8fbcb8" strokeWidth="1.6" />
                          <circle cx="30" cy="45" r="7" fill="#f2a83b" />
                        </g>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-mono text-fog">
                  <IconAr c="w-4 h-4 text-lime" />
                  parallax offset: ±۳٪ · lens mask: radial
                </div>
                <Chip color="#56b8ff" solid>WebXR</Chip>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ CTA — one flagship per track ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <Reveal>
          <div className="relative rounded-2xl border border-amber/40 overflow-hidden" style={{ background: "linear-gradient(120deg, #0b3038, #0f3d46 60%, #0b3038)" }}>
            <div className="scan-line" />
            <div className="relative z-10 px-8 py-12 sm:px-12">
              <div className="flex items-center gap-2 mb-3">
                <IconBolt c="w-5 h-5 text-amber" />
                <span className="font-mono text-[10.5px] tracking-[0.3em] text-amber">START NOW — بدون نصب، بدون حساب</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-snow leading-snug">
                از هر شاخه، یک آزمایشِ پرچم‌دار
              </h2>
              <p className="mt-2 text-fog text-[14px] leading-7 max-w-2xl">
                پنج دکمه، پنج شاخه مستقل — همین حالا اولین داده را ثبت کنید؛ بقیه {faDigits(EXPERIMENTS.length - live.length)} آزمایش در صف توسعه با همان موتور اجرا خواهند شد.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                {flagships.map((e) => (
                  <button key={e.id} onClick={() => onOpen(e.id)}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-[12.5px] font-bold border transition-all hover:-translate-y-0.5 cursor-pointer"
                    style={{ borderColor: `${SUBJECTS[e.subject].color}66`, color: SUBJECTS[e.subject].color, background: SUBJECTS[e.subject].soft }}>
                    <SubjectIcon subject={e.subject} c="w-4 h-4" />
                    {e.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function ExpCard({ e, onOpen }: { e: Experiment; onOpen: (id: string, mode?: LabMode) => void }) {
  const sub = SUBJECTS[e.subject];
  const isLive = e.status === "live";
  return (
    <div
      className={`group relative h-full rounded-xl border p-5 transition-all duration-200 ${
        isLive ? "border-edge bg-panel/80 hover:-translate-y-1 hover:border-edge2 cursor-pointer" : "border-edge/70 bg-deep/50"
      }`}
      onClick={() => isLive && onOpen(e.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ background: sub.soft, color: sub.color, border: `1px solid ${sub.color}44` }}>
          <SubjectIcon subject={e.subject} c="w-5 h-5" />
        </span>
        <StatusPill live={isLive} />
      </div>
      <div className="text-[11px] mb-1" style={{ color: sub.color }}>{e.field}</div>
      <h3 className="font-display text-xl text-snow leading-7 mb-1.5">{e.title}</h3>
      <p className="text-[12.5px] text-fog leading-6 mb-4">{e.desc}</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {e.ngss.map((n) => <Chip key={n} color="#35d3c2">NGSS {n}</Chip>)}
        <Chip color="#f2a83b">{e.ib}</Chip>
        <Chip color="#56b8ff">{e.alevel}</Chip>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-edge/60">
        <div className="flex items-center gap-3 text-[11px] text-fog">
          <DiffDots n={e.difficulty} />
          <span className="num">{faDigits(e.minutes)} دقیقه</span>
        </div>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-[12px] font-bold transition-transform group-hover:-translate-x-1" style={{ color: sub.color }}>
            <IconPlay c="w-3.5 h-3.5" />
            شروع آزمایش
          </span>
        ) : (
          <span className="text-[11.5px] text-fog">پروتکل آماده</span>
        )}
      </div>
    </div>
  );
}
