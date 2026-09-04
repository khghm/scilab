/* Parametric laboratory specifications — real formulae, live curves, readouts. */
export interface ParamSpec {
  key: string; label: string; min: number; max: number; step: number; def: number;
  unit?: string; accent?: string; digits?: number;
}
export interface CurveSpec {
  name: string; color: string;
  x0?: number; x1?: number;
  fn: (x: number, p: Record<string, number>) => number;
  markerKey?: string; markerLabel?: string;
}
export interface LabSpecDef {
  formula: string;
  xLabel: string; yLabel: string;
  params: ParamSpec[];
  curves: CurveSpec[];
  readouts: (p: Record<string, number>) => { label: string; value: string; color?: string; sub?: string }[];
  protocol: string[];
  hint: string;
  table?: (p: Record<string, number>) => { headers: string[]; rows: (string | number)[][] };
  yRange?: (p: Record<string, number>) => [number, number];
}

const P = (key: string, label: string, min: number, max: number, step: number, def: number, unit = "", accent = "#f2a83b", digits?: number): ParamSpec =>
  ({ key, label, min, max, step, def, unit, accent, digits: digits ?? (step < 0.01 ? 3 : step < 1 ? 2 : step < 10 ? 1 : 0) });

const f2 = (v: number) => (isFinite(v) ? v.toFixed(2) : "—");
const f1 = (v: number) => (isFinite(v) ? v.toFixed(1) : "—");
const f0 = (v: number) => (isFinite(v) ? v.toFixed(0) : "—");
const sci = (v: number) => (isFinite(v) ? v.toExponential(2) : "—");

/* ================================================================ */
/* PHYSICS — 15 advanced parametric experiments                     */
/* ================================================================ */
const PHYS: Record<string, LabSpecDef> = {
  "p-kepler": {
    formula: "T = 2π·√(a³/GM☉)  →  T² ∝ a³",
    xLabel: "a (AU)", yLabel: "T (سال)",
    params: [P("a", "نیم‌قطر مدار a", 0.3, 40, 0.1, 1, "AU", "#f2a83b", 2)],
    curves: [
      { name: "دوره مداری T", color: "#f2a83b", x0: 0.3, x1: 40, fn: (x) => Math.pow(x, 1.5), markerKey: "a", markerLabel: "a" },
      { name: "خط T=a^1.5", color: "#56b8ff", x0: 0.3, x1: 40, fn: (x) => Math.pow(x, 1.5) },
    ],
    readouts: (p) => {
      const T = Math.pow(p.a, 1.5);
      const v = 29.78 / Math.sqrt(p.a);
      return [
        { label: "دوره مداری T", value: `${f2(T)} سال`, color: "#f2a83b", sub: `${f0(T * 365.25)} روز` },
        { label: "سرعت مداری", value: `${f1(v)} km/s`, color: "#35d3c2", sub: "v = √(GM/a)" },
        { label: "T²/a³", value: f2((T * T) / (p.a ** 3)), color: "#a5d95c", sub: "ثابت کپلری ≈ ۱" },
        { label: "فاصله", value: `${f2(p.a * 149.6)} ×10⁶ km`, color: "#e9f6f3" },
        { label: "جرم خورشید", value: "1.989×10³⁰ kg", color: "#e9f6f3" },
        { label: "قانون", value: "سوم کپلر", color: "#56b8ff" },
      ];
    },
    protocol: ["مشاهده منحنی T–a", "تغییر a و خواندن T", "بررسی ثابت T²/a³", "مقایسه با سیارات واقعی"],
    hint: "a را تغییر دهید — T²/a³ همیشه ≈۱ باقی می‌ماند؛ این قانون سوم کپلر است. زمین a=۱ و T=۱ سال.",
  },
  "p-escape": {
    formula: "vₑ = √(2GM/R)",
    xLabel: "R (×10⁶ m)", yLabel: "vₑ (km/s)",
    params: [
      P("M", "جرم سیاره", 0.1, 2000, 1, 5.97, "×10²⁴ kg", "#f2a83b", 2),
      P("R", "شعاع سیاره", 1, 70, 0.1, 6.37, "×10⁶ m", "#35d3c2", 2),
    ],
    curves: [
      { name: "سرعت فرار", color: "#f2a83b", x0: 1, x1: 70, fn: (x, p) => Math.sqrt((2 * 6.674e-11 * p.M * 1e24) / (x * 1e6)) / 1000, markerKey: "R", markerLabel: "R" },
    ],
    readouts: (p) => {
      const ve = Math.sqrt((2 * 6.674e-11 * p.M * 1e24) / (p.R * 1e6)) / 1000;
      const g = (6.674e-11 * p.M * 1e24) / (p.R * 1e6) ** 2;
      return [
        { label: "سرعت فرار vₑ", value: `${f2(ve)} km/s`, color: "#f2a83b" },
        { label: "g سطحی", value: `${f2(g)} m/s²`, color: "#35d3c2" },
        { label: "نسبت به زمین", value: `×${f2(ve / 11.19)}`, color: "#a5d95c" },
        { label: "انرژی ویژه", value: `${f1(ve * ve / 2)} MJ/kg`, color: "#e9f6f3", sub: "vₑ²/2" },
        { label: "زمین", value: "11.19 km/s", color: "#8fbcb8" },
        { label: "ماه", value: "2.38 km/s", color: "#8fbcb8" },
      ];
    },
    protocol: ["خواندن vₑ زمین", "تغییر جرم", "تغییر شعاع", "شبیه‌سازی ماه/مشتری"],
    hint: "سرعت فرار به √M/R وابسته است. جرم را مثل مشتری (۳۱۸) بگذارید — vₑ به ۵۹٫۵ km/s می‌رسد.",
  },
  "p-torque": {
    formula: "τ = F·r·sinθ  —  تعادل: F₁r₁ = F₂r₂",
    xLabel: "θ (درجه)", yLabel: "τ (N·m)",
    params: [
      P("F", "نیروی F₁", 5, 100, 1, 40, "N", "#f2a83b", 0),
      P("r", "بازوی r₁", 0.2, 2, 0.05, 1, "m", "#35d3c2"),
      P("r2", "بازوی r₂", 0.2, 2, 0.05, 1.5, "m", "#56b8ff"),
    ],
    curves: [
      { name: "τ(θ)", color: "#f2a83b", x0: 0, x1: 180, fn: (x, p) => p.F * p.r * Math.sin((x * Math.PI) / 180), markerKey: undefined },
      { name: "τ ماکزیمم", color: "#8fbcb8", x0: 0, x1: 180, fn: (_x, p) => p.F * p.r },
    ],
    readouts: (p) => {
      const tau = p.F * p.r;
      return [
        { label: "τ ماکزیمم", value: `${f1(tau)} N·m`, color: "#f2a83b", sub: "در θ=۹۰°" },
        { label: "F₂ لازم برای تعادل", value: `${f1(tau / p.r2)} N`, color: "#35d3c2", sub: "F₁r₁/r₂" },
        { label: "τ در θ=۳۰°", value: `${f1(tau * 0.5)} N·m`, color: "#e9f6f3" },
        { label: "مزیت مکانیکی", value: `×${f2(p.r2 / p.r)}`, color: "#a5d95c" },
        { label: "شرط تعادل", value: "Στ = 0", color: "#56b8ff" },
        { label: "sinθ بهینه", value: "θ = 90°", color: "#e9f6f3" },
      ];
    },
    protocol: ["خواندن τ ماکزیمم", "تغییر بازوی r₁", "محاسبه F₂ تعادل", "بررسی مزیت مکانیکی"],
    hint: "τ فقط مولفه عمودی نیرو را می‌بیند؛ در θ=۹۰° بیشینه است. تعادل اهرم: F₂ = F₁r₁/r₂.",
  },
  "p-centripetal": {
    formula: "F = mv²/r  ,  a = v²/r = ω²r",
    xLabel: "v (m/s)", yLabel: "F (N)",
    params: [
      P("m", "جرم", 0.2, 10, 0.2, 2, "kg", "#f2a83b", 1),
      P("r", "شعاع مسیر", 0.5, 20, 0.5, 5, "m", "#35d3c2", 1),
      P("v", "سرعت", 1, 40, 0.5, 10, "m/s", "#56b8ff", 1),
    ],
    curves: [
      { name: "F(v)", color: "#f2a83b", x0: 1, x1: 40, fn: (x, p) => (p.m * x * x) / p.r, markerKey: "v", markerLabel: "v" },
      { name: "F برای 2m", color: "#8fbcb8", x0: 1, x1: 40, fn: (x, p) => (2 * p.m * x * x) / p.r },
    ],
    readouts: (p) => {
      const a = (p.v * p.v) / p.r;
      return [
        { label: "نیروی مرکزگرا", value: `${f1(p.m * a)} N`, color: "#f2a83b" },
        { label: "شتاب a", value: `${f1(a)} m/s²`, color: "#35d3c2", sub: `${f1(a / 9.81)} g` },
        { label: "دوره چرخش", value: `${f2((2 * Math.PI * p.r) / p.v)} s`, color: "#56b8ff", sub: "T = 2πr/v" },
        { label: "ω", value: `${f2(p.v / p.r)} rad/s`, color: "#a5d95c" },
        { label: "f چرخش", value: `${f2(p.v / (2 * Math.PI * p.r))} Hz`, color: "#e9f6f3" },
        { label: "جهت نیرو", value: "به سمت مرکز", color: "#e9f6f3" },
      ];
    },
    protocol: ["خواندن F در v", "دوبرابرکردن v", "تغییر شعاع", "مقایسه با وزن mg"],
    hint: "F با مربع سرعت رشد می‌کند — دوبرابرشدن v یعنی چهاربرابرشدن نیرو. شعاع بیشتر، نیروی کمتر.",
  },
  "p-buoyancy": {
    formula: "F_b = ρ_f·V·g  —  شناوری: ρ_جسم/ρ_سیال",
    xLabel: "ρ جسم (kg/m³)", yLabel: "F_b (N)",
    params: [
      P("rf", "چگالی سیال", 500, 2000, 10, 1000, "kg/m³", "#56b8ff", 0),
      P("V", "حجم جسم", 0.001, 0.1, 0.001, 0.02, "m³", "#35d3c2", 3),
      P("ro", "چگالی جسم", 100, 3000, 10, 600, "kg/m³", "#f2a83b", 0),
    ],
    curves: [
      { name: "F_b(ρ جسم)", color: "#f2a83b", x0: 100, x1: 3000, fn: (x, p) => Math.min(1, p.rf / x) * p.rf * p.V * 9.81 * (x < p.rf ? 1 : 1) * (x < p.rf ? (p.rf / x) : 1), markerKey: "ro", markerLabel: "ρ جسم" },
      { name: "وزن W", color: "#8fbcb8", x0: 100, x1: 3000, fn: (x, p) => x * p.V * 9.81 },
    ],
    readouts: (p) => {
      const frac = Math.min(1, p.ro / p.rf);
      const Fb = p.ro < p.rf ? p.ro * p.V * 9.81 : p.rf * p.V * 9.81;
      const W = p.ro * p.V * 9.81;
      return [
        { label: "نیروی شناوری", value: `${f1(Fb)} N`, color: "#f2a83b" },
        { label: "وزن جسم", value: `${f1(W)} N`, color: "#8fbcb8" },
        { label: "کسر غوطه‌ور", value: `${f0(frac * 100)} ٪`, color: "#35d3c2", sub: "ρ جسم/ρ سیال" },
        { label: "وضعیت", value: p.ro < p.rf ? "شناور" : p.ro === p.rf ? "خنثی" : "غرق می‌شود", color: p.ro < p.rf ? "#a5d95c" : "#ff6f61" },
        { label: "نیروی خالص", value: `${f1(Math.abs(W - Fb))} N`, color: "#e9f6f3" },
        { label: "یخ در آب", value: "۹۲٪ زیر آب", color: "#56b8ff" },
      ];
    },
    protocol: ["خواندن کسر غوطه‌وری", "تغییر چگالی سیال", "ساختن جسم خنثی", "شرایط غرق‌شدن"],
    hint: "کسر غوطه‌ور = ρجسم/ρسیال. یخ (۹۲۰) در آب (۱۰۰۰) ۹۲٪ زیر آب است؛ اصل ارشمیدس.",
  },
  "p-entropy": {
    formula: "S = k·ln Ω  —  Ω = (q+N−1)! / q!(N−1)!",
    xLabel: "q (کوانتای انرژی)", yLabel: "S/k",
    params: [
      P("N", "تعداد نوسانگر N", 5, 60, 1, 20, "", "#35d3c2", 0),
      P("q", "کوانتای انرژی q", 1, 100, 1, 30, "", "#f2a83b", 0),
    ],
    curves: [
      { name: "S/k = lnΩ", color: "#f2a83b", x0: 1, x1: 100, fn: (x, p) => lnOmega(Math.round(x), Math.round(p.N)), markerKey: "q", markerLabel: "q" },
    ],
    readouts: (p) => {
      const s = lnOmega(Math.round(p.q), Math.round(p.N));
      return [
        { label: "S/k (ln Ω)", value: f1(s), color: "#f2a83b" },
        { label: "S (J/K)", value: sci(s * 1.38e-23), color: "#35d3c2", sub: "k = 1.38×10⁻²³" },
        { label: "Ω (ریزحالت‌ها)", value: sci(Math.exp(s)), color: "#a5d95c" },
        { label: "S به ازای نوسانگر", value: f2(s / p.N), color: "#e9f6f3" },
        { label: "dS/dq ≈ 1/T", value: f2(lnOmega(Math.round(p.q) + 1, Math.round(p.N)) - s), color: "#56b8ff", sub: "تعریف دما" },
        { label: "قانون", value: "بولتزمن", color: "#e9f6f3" },
      ];
    },
    protocol: ["خواندن Ω در q", "افزایش N", "رشد لگاریتمی S", "تفسیر 1/T = dS/dq"],
    hint: "آنتروپی لگاریتم تعداد ریزحالت‌هاست. با q زیاد می‌شود ولی نرخ رشدش (۱/T) کم می‌شود.",
  },
  "p-blackbody": {
    formula: "B(λ,T) = 2hc²/λ⁵ · 1/(e^(hc/λkT)−1)  ,  λmax·T = 2.898×10⁶ nm·K",
    xLabel: "λ (nm)", yLabel: "شدت (نسبی)",
    params: [P("T", "دما T", 2000, 12000, 100, 5800, "K", "#f2a83b", 0)],
    curves: [
      { name: "B(λ,T)", color: "#f2a83b", x0: 50, x1: 3000, fn: (x, p) => planckN(x, p.T), markerKey: "T", markerLabel: undefined },
      { name: "T = 4000 K", color: "#8fbcb8", x0: 50, x1: 3000, fn: (x) => planckN(x, 4000) },
    ],
    readouts: (p) => {
      const lmax = 2.898e6 / p.T;
      return [
        { label: "λmax (وین)", value: `${f0(lmax)} nm`, color: "#f2a83b", sub: lmax < 400 ? "فرابنفش" : lmax < 700 ? "نور مرئی" : "فروسرخ" },
        { label: "توان کل σT⁴", value: `${f1(Math.pow(p.T / 5800, 4) * 63.2)} MW/m²`, color: "#ff6f61" },
        { label: "نسبت به خورشید", value: `×${f2(Math.pow(p.T / 5800, 4))}`, color: "#a5d95c" },
        { label: "رنگ تقریبی", value: p.T < 3500 ? "نارنجی-قرمز" : p.T < 5500 ? "زرد" : p.T < 8000 ? "سفید" : "آبی", color: "#e9f6f3" },
        { label: "خورشید", value: "5800 K → 500 nm", color: "#56b8ff" },
        { label: "قانون", value: "جابجایی وین", color: "#e9f6f3" },
      ];
    },
    protocol: ["منحنی خورشید ۵۸۰۰K", "جابه‌جایی λmax با T", "مقایسه با ۴۰۰۰K", "توان ∝ T⁴"],
    hint: "T را بالا ببرید — قله به سمت آبی می‌رود (وین) و ارتفاعش با T⁴ رشد می‌کند (اشتفان–بولتزمن).",
  },
  "p-compton": {
    formula: "Δλ = λc·(1−cosθ)  ,  λc = h/mₑc = 2.426 pm",
    xLabel: "θ پراکندگی (درجه)", yLabel: "Δλ (pm)",
    params: [P("lam", "λ فرودی", 1, 100, 1, 20, "pm", "#35d3c2", 0)],
    curves: [
      { name: "Δλ(θ)", color: "#f2a83b", x0: 0, x1: 180, fn: (x) => 2.426 * (1 - Math.cos((x * Math.PI) / 180)) },
    ],
    readouts: (p) => {
      const d90 = 2.426;
      return [
        { label: "Δλ در ۹۰°", value: `${f2(d90)} pm`, color: "#f2a83b", sub: "= λc کمتون" },
        { label: "Δλ ماکزیمم (۱۸۰°)", value: `${f2(2 * 2.426)} pm`, color: "#ff6f61", sub: "2λc" },
        { label: "λ پراکنده (۹۰°)", value: `${f1(p.lam + 2.426)} pm`, color: "#35d3c2" },
        { label: "انرژی فوتون فرودی", value: `${f1(1240 / p.lam * 1000)} eV`, color: "#a5d95c", sub: "E=hc/λ" },
        { label: "انرژی الکترون پس‌زده", value: `${f1(1240e3 / p.lam - 1240e3 / (p.lam + 2.426))} eV`, color: "#e9f6f3" },
        { label: "λc", value: "2.426 pm", color: "#56b8ff" },
      ];
    },
    protocol: ["خواندن λc", "Δλ در ۱۸۰°", "اثر λ فرودی", "انرژی الکترون پس‌زده"],
    hint: "Δλ فقط به زاویه وابسته است نه λ فرودی — دلیلش ذره‌بودن فوتون است. در ۱۸۰° برابر 2λc.",
  },
  "p-bohr": {
    formula: "Eₙ = −13.6/n² eV  ,  1/λ = R(1/4 − 1/n²) — سری بالمر",
    xLabel: "n", yLabel: "Eₙ (eV)",
    params: [P("n", "تراز بالایی n", 3, 10, 1, 3, "", "#f2a83b", 0)],
    curves: [
      { name: "Eₙ", color: "#f2a83b", x0: 1, x1: 10, fn: (x) => -13.6 / (x * x), markerKey: "n", markerLabel: "n" },
      { name: "E=0 (یونش)", color: "#8fbcb8", x0: 1, x1: 10, fn: () => 0 },
    ],
    readouts: (p) => {
      const n = Math.round(p.n);
      const lam = 364.6 * (n * n) / (n * n - 4);
      const names: Record<number, string> = { 3: "Hα قرمز", 4: "Hβ فیروزه‌ای", 5: "Hγ آبی", 6: "Hδ بنفش" };
      return [
        { label: "λ خط بالمر", value: `${f1(lam)} nm`, color: "#f2a83b", sub: names[n] ?? "فرابنفش نزدیک" },
        { label: "Eₙ", value: `${f2(-13.6 / (n * n))} eV`, color: "#35d3c2" },
        { label: "انرژی فوتون", value: `${f2(13.6 * (0.25 - 1 / (n * n)))} eV`, color: "#a5d95c", sub: "E₂−Eₙ" },
        { label: "انرژی یونش", value: "13.6 eV", color: "#ff6f61", sub: "از n=1" },
        { label: "شعاع مدار n", value: `${f2(0.0529 * n * n)} nm`, color: "#56b8ff", sub: "a₀n²" },
        { label: "سری", value: "بالمر (n→2)", color: "#e9f6f3" },
      ];
    },
    protocol: ["خط Hα (n=3)", "خط Hβ (n=4)", "همگرایی سری", "انرژی یونش"],
    hint: "گذار به n=2 سری بالمر مرئی را می‌سازد: n=3 قرمز (۶۵۶nm)، n=4 فیروزه‌ای (۴۸۶nm). با n→∞ به حد ۳۶۴٫۶nm همگرا می‌شود.",
  },
  "p-lens": {
    formula: "1/f = 1/dₒ + 1/dᵢ  ,  M = −dᵢ/dₒ",
    xLabel: "dₒ (cm)", yLabel: "dᵢ (cm)",
    params: [
      P("f", "فاصله کانونی f", 5, 80, 1, 20, "cm", "#35d3c2", 0),
      P("do", "فاصله جسم dₒ", 5, 200, 1, 60, "cm", "#f2a83b", 0),
    ],
    curves: [
      { name: "dᵢ(dₒ)", color: "#f2a83b", x0: 5, x1: 200, fn: (x, p) => { const d = (p.f * x) / (x - p.f); return Math.max(-150, Math.min(150, d)); }, markerKey: "do", markerLabel: "dₒ" },
      { name: "dᵢ = dₒ", color: "#8fbcb8", x0: 5, x1: 200, fn: (x) => x },
    ],
    readouts: (p) => {
      const di = (p.f * p.do) / (p.do - p.f);
      const M = -di / p.do;
      return [
        { label: "فاصله تصویر dᵢ", value: `${f1(di)} cm`, color: "#f2a83b", sub: di > 0 ? "حقیقی (پشت عدسی)" : "مجازی (جلوی عدسی)" },
        { label: "بزرگ‌نمایی M", value: `×${f2(M)}`, color: "#35d3c2", sub: M < 0 ? "وارونه" : "مستقیم" },
        { label: "وضعیت", value: p.do > 2 * p.f ? "کوچک‌شده حقیقی" : p.do > p.f ? "بزرگ‌شده حقیقی" : "بزرگ‌شده مجازی", color: "#a5d95c" },
        { label: "نقطه 2f", value: `${f0(2 * p.f)} cm`, color: "#56b8ff" },
        { label: "|M| = 1 در", value: `dₒ = ${f0(2 * p.f)} cm`, color: "#e9f6f3" },
        { label: "توان عدسی", value: `${f2(100 / p.f)} D`, color: "#e9f6f3", sub: "دیوپتر" },
      ];
    },
    protocol: ["تصویر حقیقی وارونه", "جسم در 2f", "جسم داخل f (ذره‌بین)", "واگرایی در dₒ=f"],
    hint: "در dₒ=f تصویر به بی‌نهایت می‌رود. داخل کانون، تصویر مجازی و مستقیم است — اصل ذره‌بین.",
  },
  "p-diffraction": {
    formula: "I(θ) = I₀·[sin(β)/β]²  ,  β = πa·sinθ/λ  ,  تاریکی: a·sinθ = mλ",
    xLabel: "θ (درجه)", yLabel: "I/I₀",
    params: [
      P("a", "عرض شکاف a", 1, 20, 0.5, 6, "µm", "#f2a83b", 1),
      P("lam", "طول‌موج λ", 400, 700, 10, 550, "nm", "#35d3c2", 0),
    ],
    curves: [
      { name: "I(θ)", color: "#f2a83b", x0: -30, x1: 30, fn: (x, p) => { const b = (Math.PI * p.a * 1e-6 * Math.sin((x * Math.PI) / 180)) / (p.lam * 1e-9); return Math.abs(b) < 1e-6 ? 1 : Math.pow(Math.sin(b) / b, 2); } },
    ],
    readouts: (p) => {
      const th1 = (Math.asin(p.lam * 1e-9 / (p.a * 1e-6)) * 180) / Math.PI;
      return [
        { label: "اولین تاریکی θ₁", value: `±${f1(th1)}°`, color: "#f2a83b", sub: "sinθ = λ/a" },
        { label: "پهنای نوار مرکزی", value: `${f1(2 * th1)}°`, color: "#35d3c2" },
        { label: "λ/a", value: f3(p.lam * 1e-9 / (p.a * 1e-6)), color: "#a5d95c" },
        { label: "تعداد نوارها در ±۳۰°", value: `${Math.floor(Math.sin((30 * Math.PI) / 180) * p.a * 1e-6 / (p.lam * 1e-9)) * 2 + 1}`, color: "#e9f6f3" },
        { label: "شدت ماکزیمم", value: "I₀ در θ=0", color: "#56b8ff" },
        { label: "پدیده", value: "پراش تک‌شکاف", color: "#e9f6f3" },
      ];
    },
    protocol: ["پهنای نوار مرکزی", "باریک‌کردن شکاف", "تغییر λ", "رابطه θ₁ = λ/a"],
    hint: "شکاف باریک‌تر → نوار مرکزی پهن‌تر. پراش درست وقتی λ/a بزرگ شود خود را نشان می‌دهد.",
  },
  "p-magnetic": {
    formula: "F = qvB  ,  r = mv/qB  ,  f = qB/2πm",
    xLabel: "v (×10⁶ m/s)", yLabel: "r (cm)",
    params: [
      P("B", "میدان B", 0.01, 2, 0.01, 0.5, "T", "#35d3c2", 2),
      P("v", "سرعت ذره", 0.5, 30, 0.5, 10, "×10⁶ m/s", "#f2a83b", 1),
    ],
    curves: [
      { name: "r(v) — الکترون", color: "#f2a83b", x0: 0.5, x1: 30, fn: (x, p) => ((9.11e-31 * x * 1e6) / (1.6e-19 * p.B)) * 100, markerKey: "v", markerLabel: "v" },
    ],
    readouts: (p) => {
      const r = ((9.11e-31 * p.v * 1e6) / (1.6e-19 * p.B)) * 100;
      const fc = (1.6e-19 * p.B) / (2 * Math.PI * 9.11e-31);
      return [
        { label: "شعاع مدار", value: `${f1(r)} cm`, color: "#f2a83b" },
        { label: "فرکانس سیکلوترون", value: `${sci(fc)} Hz`, color: "#35d3c2", sub: "مستقل از v!" },
        { label: "نیروی لورنتس", value: `${sci(1.6e-19 * p.v * 1e6 * p.B)} N`, color: "#a5d95c" },
        { label: "انرژی جنبشی", value: `${f1(0.5 * 9.11e-31 * (p.v * 1e6) ** 2 / 1.6e-19)} eV`, color: "#e9f6f3" },
        { label: "دوره چرخش", value: `${sci(1 / fc)} s`, color: "#56b8ff" },
        { label: "جهت چرخش", value: "قاعده دست راست", color: "#e9f6f3" },
      ];
    },
    protocol: ["خواندن r", "اثر B بر شعاع", "ثبات فرکانس سیکلوترون", "انرژی بر حسب eV"],
    hint: "r با v خطی و با B معکوس است، ولی فرکانس سیکلوترون فقط به B وابسته است — اساس شتاب‌دهنده‌ها.",
  },
  "p-relmom": {
    formula: "γ = 1/√(1−v²/c²)  ,  KE = (γ−1)mc²",
    xLabel: "v/c", yLabel: "KE (MeV)",
    params: [P("b", "سرعت v/c", 0.01, 0.99, 0.01, 0.5, "", "#f2a83b", 2)],
    curves: [
      { name: "نسبیتی", color: "#f2a83b", x0: 0.01, x1: 0.99, fn: (x) => (1 / Math.sqrt(1 - x * x) - 1) * 0.511, markerKey: "b", markerLabel: "v/c" },
      { name: "کلاسیک ½mv²", color: "#8fbcb8", x0: 0.01, x1: 0.99, fn: (x) => 0.5 * 0.511 * x * x },
    ],
    readouts: (p) => {
      const g = 1 / Math.sqrt(1 - p.b * p.b);
      return [
        { label: "ضریب لورنتس γ", value: f2(g), color: "#f2a83b" },
        { label: "KE نسبیتی", value: `${f2((g - 1) * 0.511)} MeV`, color: "#35d3c2" },
        { label: "KE کلاسیک", value: `${f2(0.5 * 0.511 * p.b * p.b)} MeV`, color: "#8fbcb8" },
        { label: "خطای کلاسیک", value: `${f0(((g - 1) / (0.5 * p.b * p.b) - 1) * 100)} ٪`, color: "#ff6f61" },
        { label: "تکانه p", value: `${f2(g * p.b * 0.511)} MeV/c`, color: "#a5d95c" },
        { label: "انرژی سکون e⁻", value: "0.511 MeV", color: "#56b8ff" },
      ];
    },
    protocol: ["γ در v=0.5c", "واگرایی نزدیک c", "مقایسه با کلاسیک", "تکانه نسبیتی"],
    hint: "نزدیک c انرژی به بی‌نهایت می‌رود — هیچ جرم‌داری به c نمی‌رسد. در v<0.1c دو منحنی منطبق‌اند.",
  },
  "p-capacitor": {
    formula: "C = ε₀A/d  ,  U = ½CV²  ,  E = V/d",
    xLabel: "d (mm)", yLabel: "C (nF)",
    params: [
      P("A", "مساحت صفحات", 1, 100, 1, 25, "cm²", "#35d3c2", 0),
      P("V", "ولتاژ", 1, 500, 5, 100, "V", "#f2a83b", 0),
      P("d", "فاصله صفحات", 0.1, 10, 0.1, 1, "mm", "#56b8ff", 1),
    ],
    curves: [
      { name: "C(d)", color: "#f2a83b", x0: 0.1, x1: 10, fn: (x, p) => (8.854e-12 * p.A * 1e-4) / (x * 1e-3) * 1e9, markerKey: "d", markerLabel: "d" },
    ],
    readouts: (p) => {
      const C = (8.854e-12 * p.A * 1e-4) / (p.d * 1e-3);
      return [
        { label: "ظرفیت C", value: `${f2(C * 1e9)} nF`, color: "#f2a83b" },
        { label: "انرژی ذخیره‌شده", value: `${f2(0.5 * C * p.V * p.V * 1e6)} µJ`, color: "#35d3c2", sub: "½CV²" },
        { label: "میدان E", value: `${f0(p.V / (p.d * 1e-3))} V/m`, color: "#a5d95c" },
        { label: "بار Q", value: `${f2(C * p.V * 1e9)} nC`, color: "#e9f6f3", sub: "Q = CV" },
        { label: "ε₀", value: "8.854 pF/m", color: "#56b8ff" },
        { label: "شکست هوا", value: "≈ 3 MV/m", color: "#ff6f61" },
      ];
    },
    protocol: ["خواندن C", "نصف‌کردن d", "اثر مساحت", "انرژی ∝ V²"],
    hint: "C با فاصله معکوس است. هشدار: میدان بیش از ۳MV/m باعث جرقه (شکست دی‌الکتریک هوا) می‌شود.",
  },
  "p-gravfield": {
    formula: "g(h) = GM/(R+h)²",
    xLabel: "ارتفاع h (km)", yLabel: "g (m/s²)",
    params: [P("h", "ارتفاع از سطح", 0, 40000, 100, 400, "km", "#f2a83b", 0)],
    curves: [
      { name: "g(h)", color: "#f2a83b", x0: 0, x1: 40000, fn: (x) => (6.674e-11 * 5.972e24) / (6.371e6 + x * 1000) ** 2, markerKey: "h", markerLabel: "h" },
      { name: "سطح زمین", color: "#8fbcb8", x0: 0, x1: 40000, fn: () => 9.81 },
    ],
    readouts: (p) => {
      const g = (6.674e-11 * 5.972e24) / (6.371e6 + p.h * 1000) ** 2;
      return [
        { label: "g در ارتفاع h", value: `${f2(g)} m/s²`, color: "#f2a83b" },
        { label: "نسبت به سطح", value: `${f1((g / 9.81) * 100)} ٪`, color: "#35d3c2" },
        { label: "ISS (۴۰۰km)", value: "8.67 m/s²", color: "#56b8ff", sub: "فضانوردان بی‌وزن‌اند چون در سقوط آزادند" },
        { label: "ماه (۳۸۴۰۰۰km)", value: "0.0027 m/s²", color: "#8fbcb8" },
        { label: "g سطح", value: "9.81 m/s²", color: "#a5d95c" },
        { label: "قانون", value: "عکس مربع فاصله", color: "#e9f6f3" },
      ];
    },
    protocol: ["g در ۴۰۰km", "ارتفاع GEO", "افت تا ماه", "قانون عکس مربع"],
    hint: "در مدار ISS هنوز g≈۸٫۷ است — بی‌وزنی ناشی از سقوط آزاد است نه نبود گرانش!",
  },
};

function lnOmega(q: number, N: number): number {
  // ln C(q+N-1, q) via Stirling-free sum for stability
  let s = 0;
  for (let i = 1; i <= q; i++) s += Math.log(N - 1 + i) - Math.log(i);
  return s;
}
function planckN(lamNm: number, T: number): number {
  const h = 6.626e-34, c = 3e8, k = 1.38e-23;
  const l = lamNm * 1e-9;
  const B = (2 * h * c * c) / Math.pow(l, 5) / (Math.exp((h * c) / (l * k * T)) - 1);
  const lmax = 2.898e-3 / T;
  const Bmax = (2 * h * c * c) / Math.pow(lmax, 5) / (Math.exp((h * c) / (lmax * k * T)) - 1);
  return B / Bmax;
}
function f3(v: number) { return isFinite(v) ? v.toFixed(3) : "—"; }

/* ================================================================ */
/* CHEMISTRY — 21 advanced parametric experiments                   */
/* ================================================================ */
const R = 8.314, F = 96485;
const CHEM: Record<string, LabSpecDef> = {
  "c-gaslaw": {
    formula: "PV = nRT — همدماها",
    xLabel: "V (L)", yLabel: "P (atm)",
    params: [
      P("n", "مول گاز", 0.5, 4, 0.1, 1, "mol", "#35d3c2", 1),
      P("T", "دما", 200, 600, 10, 300, "K", "#f2a83b", 0),
    ],
    curves: [
      { name: "همدمای T", color: "#f2a83b", x0: 1, x1: 50, fn: (x, p) => (p.n * 0.0821 * p.T) / x, markerKey: undefined },
      { name: "T/2", color: "#8fbcb8", x0: 1, x1: 50, fn: (x, p) => (p.n * 0.0821 * p.T) / x / 2 },
    ],
    readouts: (p) => {
      const P10 = (p.n * 0.0821 * p.T) / 10;
      return [
        { label: "P در V=10L", value: `${f2(P10)} atm`, color: "#f2a83b" },
        { label: "PV/nT", value: "0.0821 L·atm/mol·K", color: "#a5d95c", sub: "ثابت جهانی" },
        { label: "حجم مولی STP", value: "22.4 L", color: "#56b8ff" },
        { label: "V در P=1atm", value: `${f1(p.n * 0.0821 * p.T)} L`, color: "#35d3c2" },
        { label: "قانون بویل", value: "P ∝ 1/V", color: "#e9f6f3" },
        { label: "قانون شارل", value: "V ∝ T", color: "#e9f6f3" },
      ];
    },
    protocol: ["همدمای ۳۰۰K", "دوبرابرکردن T", "اثر تعداد مول", "شکل هذلولی PV"],
    hint: "هر همدما یک هذلولی است؛ دمای بالاتر، منحنی دورتر از مبدأ. PV همیشه = nRT.",
  },
  "c-beer": {
    formula: "A = ε·l·c  ,  %T = 10^(−A)×100",
    xLabel: "غلظت c (mM)", yLabel: "جذب A",
    params: [
      P("eps", "ضریب جذب ε", 1, 50, 0.5, 15, "L·mmol⁻¹·cm⁻¹", "#35d3c2", 1),
      P("l", "طول مسیر l", 0.5, 5, 0.5, 1, "cm", "#56b8ff", 1),
      P("c", "غلظت", 0.01, 2, 0.01, 0.5, "mM", "#f2a83b", 2),
    ],
    curves: [
      { name: "A(c)", color: "#f2a83b", x0: 0, x1: 2, fn: (x, p) => p.eps * p.l * x, markerKey: "c", markerLabel: "c" },
      { name: "%T/10", color: "#8fbcb8", x0: 0, x1: 2, fn: (x, p) => Math.pow(10, -(p.eps * p.l * x)) },
    ],
    readouts: (p) => {
      const A = p.eps * p.l * p.c;
      return [
        { label: "جذب A", value: f2(A), color: "#f2a83b", sub: A > 2 ? "خارج از محدوده خطی!" : "محدوده خطی" },
        { label: "عبور %T", value: `${f1(Math.pow(10, -A) * 100)} ٪`, color: "#35d3c2" },
        { label: "شیب کالیبراسیون", value: f1(p.eps * p.l), color: "#a5d95c", sub: "εl" },
        { label: "حد تشخیص", value: "A ≈ 0.01", color: "#56b8ff" },
        { label: "c مجهول از A", value: `${f2(A / (p.eps * p.l))} mM`, color: "#e9f6f3" },
        { label: "قانون", value: "بیر–لامبرت", color: "#e9f6f3" },
      ];
    },
    protocol: ["رسم منحنی کالیبراسیون", "اثر ε", "اثر طول سل", "محدوده A>2"],
    hint: "A با غلظت خطی است ولی %T نمایی. برای دقت، A را بین ۰٫۱ تا ۱ نگه دارید.",
  },
  "c-vanthoff": {
    formula: "ln K = −ΔH°/R·(1/T) + ΔS°/R",
    xLabel: "1000/T (K⁻¹)", yLabel: "ln K",
    params: [
      P("dH", "ΔH°", -100, 100, 1, -57, "kJ/mol", "#f2a83b", 0),
      P("dS", "ΔS°", -200, 200, 5, -60, "J/mol·K", "#35d3c2", 0),
      P("T", "دما", 250, 800, 5, 298, "K", "#56b8ff", 0),
    ],
    curves: [
      { name: "ln K(1/T)", color: "#f2a83b", x0: 1.25, x1: 4, fn: (x, p) => (-(p.dH * 1000) / R) * (x / 1000) + (p.dS / R), markerKey: undefined },
    ],
    readouts: (p) => {
      const lnK = (-(p.dH * 1000) / R) * (1 / p.T) + p.dS / R;
      return [
        { label: "K در T", value: sci(Math.exp(lnK)), color: "#f2a83b", sub: Math.exp(lnK) > 1 ? "فرآورده‌خواه" : "واکنش‌گرخواه" },
        { label: "ΔG° = −RT lnK", value: `${f1(-p.T * R * lnK / 1000)} kJ/mol`, color: "#35d3c2" },
        { label: "شیب", value: `${f0(-p.dH * 1000 / R)} K`, color: "#a5d95c", sub: "−ΔH/R" },
        { label: "واکنش گرماده", value: p.dH < 0 ? "بله — گرما K را کم می‌کند" : "خیر", color: p.dH < 0 ? "#ff6f61" : "#56b8ff" },
        { label: "T تعادل (K=1)", value: `${f0((p.dH * 1000) / p.dS)} K`, color: "#e9f6f3" },
        { label: "اصل لوشاتلیه", value: "تأیید می‌شود", color: "#e9f6f3" },
      ];
    },
    protocol: ["شیب −ΔH/R", "علامت ΔH و جهت", "دمای K=1", "محاسبه ΔG°"],
    hint: "شیب خط = −ΔH/R. برای واکنش گرماده (ΔH<0) افزایش دما K را کاهش می‌دهد — لوشاتلیه کمی.",
  },
  "c-hydrolysis": {
    formula: "NH₄⁺ + H₂O ⇌ NH₃ + H₃O⁺  ,  [H⁺] = √(Kw·c/Kb)",
    xLabel: "c (M)", yLabel: "pH",
    params: [P("c", "غلظت نمک", 0.001, 2, 0.001, 0.1, "M", "#f2a83b", 3)],
    curves: [
      { name: "pH(c) — NH₄Cl", color: "#f2a83b", x0: 0.001, x1: 2, fn: (x) => -Math.log10(Math.sqrt((1e-14 * x) / 1.8e-5)), markerKey: "c", markerLabel: "c" },
      { name: "pH=7 خنثی", color: "#8fbcb8", x0: 0.001, x1: 2, fn: () => 7 },
    ],
    readouts: (p) => {
      const H = Math.sqrt((1e-14 * p.c) / 1.8e-5);
      return [
        { label: "pH", value: f2(-Math.log10(H)), color: "#f2a83b", sub: "اسیدی — کاتیون اسید مزدوج" },
        { label: "[H⁺]", value: sci(H), color: "#35d3c2" },
        { label: "درصد هیدرولیز", value: `${f2((H / p.c) * 100)} ٪`, color: "#a5d95c" },
        { label: "Ka(NH₄⁺)", value: sci(1e-14 / 1.8e-5), color: "#56b8ff", sub: "Kw/Kb" },
        { label: "رقیق‌سازی", value: "pH به ۷ نزدیک می‌شود", color: "#e9f6f3" },
        { label: "NaCl", value: "pH = 7 (بدون هیدرولیز)", color: "#8fbcb8" },
      ];
    },
    protocol: ["pH نمک ۰٫۱M", "اثر رقیق‌سازی", "درصد هیدرولیز", "Ka = Kw/Kb"],
    hint: "نمکِ باز ضعیف + اسید قوی، محلول را اسیدی می‌کند. رقیق‌تر → هیدرولیز بیشتر ولی [H⁺] کمتر.",
  },
  "c-nernst": {
    formula: "E = E° − (RT/nF)·ln Q  ,  Q = [Zn²⁺]/[Cu²⁺]",
    xLabel: "log Q", yLabel: "E (V)",
    params: [P("logQ", "log Q", -4, 4, 0.1, 0, "", "#f2a83b", 1)],
    curves: [
      { name: "E(logQ) — دانیل", color: "#f2a83b", x0: -4, x1: 4, fn: (x) => 1.1 - (0.0592 / 2) * x, markerKey: "logQ", markerLabel: "logQ" },
    ],
    readouts: (p) => {
      const E = 1.1 - (0.0592 / 2) * p.logQ;
      return [
        { label: "E سلول", value: `${f3(E)} V`, color: "#f2a83b" },
        { label: "E° دانیل", value: "1.10 V", color: "#a5d95c", sub: "Cu²⁺/Cu − Zn²⁺/Zn" },
        { label: "شیب نرنست", value: "−29.6 mV/dekade", color: "#35d3c2", sub: "−59.2/n mV" },
        { label: "E = 0 در", value: `logQ = ${f1((1.1 * 2) / 0.0592)}`, color: "#ff6f61", sub: "باتری مرده" },
        { label: "n انتقال الکترون", value: "2", color: "#56b8ff" },
        { label: "T", value: "298 K", color: "#e9f6f3" },
      ];
    },
    protocol: ["E در Q=1", "شیب ۵۹٫۲/n", "باتری مرده E=0", "اثر غلظت بر E"],
    hint: "هر ده‌برابرشدن Q، ولتاژ ۲۹٫۶mV افت می‌کند (n=2). وقتی E=0 باتری به تعادل رسیده.",
  },
  "c-order": {
    formula: "مرتبه ۱: ln[A] = ln[A]₀ − kt  ,  t½ = ln2/k",
    xLabel: "t (min)", yLabel: "[A]/[A]₀",
    params: [P("k", "ثابت سرعت k", 0.01, 0.5, 0.01, 0.1, "min⁻¹", "#f2a83b", 2)],
    curves: [
      { name: "مرتبه ۱", color: "#f2a83b", x0: 0, x1: 60, fn: (x, p) => Math.exp(-p.k * x) },
      { name: "مرتبه ۰", color: "#56b8ff", x0: 0, x1: 60, fn: (x, p) => Math.max(0, 1 - p.k * x * 0.5) },
      { name: "مرتبه ۲", color: "#8fbcb8", x0: 0, x1: 60, fn: (x, p) => 1 / (1 + p.k * x * 2) },
    ],
    readouts: (p) => {
      return [
        { label: "t½ مرتبه ۱", value: `${f1(Math.LN2 / p.k)} min`, color: "#f2a83b", sub: "ln2/k — مستقل از [A]₀" },
        { label: "زمان ۹۰٪ مصرف", value: `${f1(Math.LN10 / p.k)} min`, color: "#35d3c2", sub: "3.3 × t½" },
        { label: "[A] پس از 10 دقیقه", value: `${f1(Math.exp(-p.k * 10) * 100)} ٪`, color: "#a5d95c" },
        { label: "شناسایی مرتبه", value: "ln[A]–t خطی → ۱", color: "#56b8ff" },
        { label: "واحد k (۱)", value: "min⁻¹", color: "#e9f6f3" },
        { label: "واحد k (۲)", value: "M⁻¹min⁻¹", color: "#e9f6f3" },
      ];
    },
    protocol: ["مقایسه سه مرتبه", "t½ مستقل از غلظت", "تشخیص با ln[A]", "زمان ۹۰٪"],
    hint: "فقط در مرتبه ۱ نیمه‌عمر ثابت است — نشانه تجربی آن. نمودار ln[A] بر حسب t خطی می‌شود.",
  },
  "c-collision": {
    formula: "f = e^(−Ea/RT) — کسر مولکول‌های پرانرژی (بولتزمن)",
    xLabel: "T (K)", yLabel: "کسر f",
    params: [P("Ea", "انرژی فعال‌سازی", 20, 150, 1, 75, "kJ/mol", "#f2a83b", 0)],
    curves: [
      { name: "f(T)", color: "#f2a83b", x0: 250, x1: 1000, fn: (x, p) => Math.exp(-(p.Ea * 1000) / (R * x)), markerKey: undefined },
      { name: "Ea/2 (کاتالیزور)", color: "#a5d95c", x0: 250, x1: 1000, fn: (x, p) => Math.exp(-(p.Ea * 500) / (R * x)) },
    ],
    readouts: (p) => {
      const f300 = Math.exp(-(p.Ea * 1000) / (R * 300));
      const f310 = Math.exp(-(p.Ea * 1000) / (R * 310));
      return [
        { label: "f در ۳۰۰K", value: sci(f300), color: "#f2a83b" },
        { label: "افزایش با ۱۰°", value: `×${f1(f310 / f300)}`, color: "#ff6f61", sub: "قاعده سرانگشتی ×۲–۳" },
        { label: "با کاتالیزور", value: sci(Math.exp(-(p.Ea * 500) / (R * 300))), color: "#a5d95c", sub: "Ea/2" },
        { label: "Ea", value: `${f0(p.Ea)} kJ/mol`, color: "#35d3c2" },
        { label: "نظریه برخورد", value: "برخورد + جهت درست", color: "#56b8ff" },
        { label: "عامل فضایی p", value: "0 تا 1", color: "#e9f6f3" },
      ];
    },
    protocol: ["کسر پرانرژی در ۳۰۰K", "اثر ۱۰ درجه", "اثر کاتالیزور", "حساسیت به Ea"],
    hint: "کسر مولکول‌های بالای Ea نمایی است — ۱۰ درجه می‌تواند سرعت را دوبرابر کند. کاتالیزور Ea را کم می‌کند.",
  },
  "c-gibbs": {
    formula: "ΔG = ΔH − TΔS  —  خودبه‌خودی: ΔG < 0",
    xLabel: "T (K)", yLabel: "ΔG (kJ/mol)",
    params: [
      P("dH", "ΔH", -200, 200, 5, 90, "kJ/mol", "#f2a83b", 0),
      P("dS", "ΔS", -300, 300, 5, 150, "J/mol·K", "#35d3c2", 0),
    ],
    curves: [
      { name: "ΔG(T)", color: "#f2a83b", x0: 100, x1: 1500, fn: (x, p) => p.dH - x * p.dS / 1000, markerKey: undefined },
      { name: "ΔG = 0", color: "#8fbcb8", x0: 100, x1: 1500, fn: () => 0 },
    ],
    readouts: (p) => {
      const Tc = (p.dH * 1000) / p.dS;
      return [
        { label: "T تغییر خودبه‌خودی", value: p.dS !== 0 ? `${f0(Tc)} K` : "—", color: "#f2a83b", sub: "ΔH/ΔS" },
        { label: "ΔG در ۲۹۸K", value: `${f1(p.dH - 298 * p.dS / 1000)} kJ/mol`, color: p.dH - 298 * p.dS / 1000 < 0 ? "#a5d95c" : "#ff6f61" },
        { label: "نوع واکنش", value: p.dH > 0 && p.dS > 0 ? "درمای بالا خودبه‌خودی" : p.dH < 0 && p.dS < 0 ? "درمای پایین خودبه‌خودی" : p.dH < 0 ? "همیشه خودبه‌خودی" : "هرگز خودبه‌خودی نیست", color: "#56b8ff" },
        { label: "ΔH", value: `${f0(p.dH)} kJ/mol`, color: "#e9f6f3" },
        { label: "ΔS", value: `${f0(p.dS)} J/mol·K`, color: "#e9f6f3" },
        { label: "K در ۲۹۸K", value: sci(Math.exp(-(p.dH - 298 * p.dS / 1000) * 1000 / (R * 298))), color: "#35d3c2" },
      ];
    },
    protocol: ["جایی که ΔG=0", "چهار حالت علامت‌ها", "ΔG در ۲۹۸K", "رابطه با K"],
    hint: "ΔG<۰ یعنی خودبه‌خودی. واکنش گرماگیر با آنتروپی مثبت فقط در دمای بالا خودبه‌خودی است — جایی که خط از صفر رد می‌شود.",
  },
  "c-clapeyron": {
    formula: "ln P = −ΔHvap/R·(1/T) + C — کلازیوس–کلاپیرون",
    xLabel: "1000/T (K⁻¹)", yLabel: "ln P",
    params: [P("dHv", "ΔH تبخیر", 20, 60, 0.5, 40.7, "kJ/mol", "#f2a83b", 1)],
    curves: [
      { name: "ln P(1/T)", color: "#f2a83b", x0: 2, x1: 4, fn: (x, p) => (-(p.dHv * 1000) / R) * (x / 1000) + 28 },
      { name: "ΔH=25 (اتر)", color: "#8fbcb8", x0: 2, x1: 4, fn: (x) => (-25000 / R) * (x / 1000) + 22 },
    ],
    readouts: (p) => {
      return [
        { label: "شیب", value: `${f0(-p.dHv * 1000 / R)} K`, color: "#f2a83b", sub: "−ΔHvap/R" },
        { label: "ΔHvap آب", value: "40.7 kJ/mol", color: "#56b8ff" },
        { label: "نقطه جوش نرمال", value: "373 K (P=1atm)", color: "#a5d95c" },
        { label: "فرار بودن", value: p.dHv < 30 ? "بالا (پیوند ضعیف)" : "کم (پیوند هیدروژنی)", color: "#35d3c2" },
        { label: "قاعده تروتون", value: "ΔSvap ≈ 88 J/mol·K", color: "#e9f6f3" },
        { label: "در کوهستان", value: "جوش در T پایین‌تر", color: "#e9f6f3" },
      ];
    },
    protocol: ["شیب −ΔH/R", "مقایسه آب و اتر", "پیوند هیدروژنی", "پیش‌بینی نقطه جوش"],
    hint: "شیب خط lnP بر حسب 1/T برابر −ΔHvap/R است. آب با پیوند هیدروژنی شیب تندتری دارد.",
  },
  "c-raoult": {
    formula: "P = X_A·P°_A + X_B·P°_B — رائول",
    xLabel: "X_B (کسر مولی)", yLabel: "P (kPa)",
    params: [
      P("Pa", "P°_A (بنزن)", 5, 30, 0.5, 12.7, "kPa", "#35d3c2", 1),
      P("Pb", "P°_B (تولوئن)", 1, 15, 0.5, 3.8, "kPa", "#56b8ff", 1),
      P("Xb", "کسر مولی B", 0, 1, 0.05, 0.4, "", "#f2a83b", 2),
    ],
    curves: [
      { name: "فشار کل", color: "#f2a83b", x0: 0, x1: 1, fn: (x, p) => (1 - x) * p.Pa + x * p.Pb, markerKey: "Xb", markerLabel: "X_B" },
      { name: "جزئی A", color: "#35d3c2", x0: 0, x1: 1, fn: (x, p) => (1 - x) * p.Pa },
      { name: "جزئی B", color: "#56b8ff", x0: 0, x1: 1, fn: (x, p) => x * p.Pb },
    ],
    readouts: (p) => {
      const P = (1 - p.Xb) * p.Pa + p.Xb * p.Pb;
      const yB = (p.Xb * p.Pb) / P;
      return [
        { label: "فشار کل", value: `${f2(P)} kPa`, color: "#f2a83b" },
        { label: "کسر مولی بخار y_B", value: f2(yB), color: "#35d3c2", sub: "غنی‌تر از فرارتر" },
        { label: "P جزئی A", value: `${f2((1 - p.Xb) * p.Pa)} kPa`, color: "#a5d95c" },
        { label: "P جزئی B", value: `${f2(p.Xb * p.Pb)} kPa`, color: "#56b8ff" },
        { label: "تقطیر", value: "بخار در B فقیرتر", color: "#e9f6f3" },
        { label: "محلول ایده‌آل", value: "برهم‌کنش A–B ≈ A–A", color: "#e9f6f3" },
      ];
    },
    protocol: ["فشار کل خطی", "ترکیب بخار y", "انحراف از رائول", "اساس تقطیر"],
    hint: "فشار کل ترکیب خطی است ولی بخار همیشه از جزء فرارتر غنی‌تر است — اساس تقطیر جزءبه‌جزء.",
  },
  "c-colligative": {
    formula: "ΔTb = i·Kb·m  ,  ΔTf = i·Kf·m",
    xLabel: "مولالیته m", yLabel: "ΔT (°C)",
    params: [
      P("i", "ضریب وانت‌هوف i", 1, 4, 1, 2, "", "#35d3c2", 0),
      P("m", "مولالیته", 0.1, 5, 0.1, 1, "mol/kg", "#f2a83b", 1),
    ],
    curves: [
      { name: "ΔTb (Kb=0.51)", color: "#f2a83b", x0: 0, x1: 5, fn: (x, p) => p.i * 0.51 * x, markerKey: "m", markerLabel: "m" },
      { name: "ΔTf (Kf=1.86)", color: "#56b8ff", x0: 0, x1: 5, fn: (x, p) => p.i * 1.86 * x },
    ],
    readouts: (p) => {
      return [
        { label: "نقطه جوش جدید", value: `${f2(100 + p.i * 0.51 * p.m)} °C`, color: "#f2a83b" },
        { label: "نقطه انجماد جدید", value: `${f2(0 - p.i * 1.86 * p.m)} °C`, color: "#56b8ff" },
        { label: "ΔTb", value: `${f2(p.i * 0.51 * p.m)} °C`, color: "#a5d95c" },
        { label: "ΔTf", value: `${f2(p.i * 1.86 * p.m)} °C`, color: "#35d3c2" },
        { label: "i برای NaCl", value: "≈ 2 (یونش کامل)", color: "#e9f6f3" },
        { label: "i برای CaCl₂", value: "≈ 3", color: "#e9f6f3" },
      ];
    },
    protocol: ["اثر i=2 نمک", "افزایش نقطه جوش", "افت نقطه انجماد", "ضدیخ ماشین"],
    hint: "خواص کولیگاتیو فقط به تعداد ذرات وابسته‌اند نه نوعشان — نمک جاده‌ها را از یخ نجات می‌دهد.",
  },
  "c-osmosis": {
    formula: "π = i·M·R·T — فشار اسمزی",
    xLabel: "M (mol/L)", yLabel: "π (atm)",
    params: [P("M", "مولاریته", 0.01, 1, 0.01, 0.15, "M", "#f2a83b", 2)],
    curves: [
      { name: "π(M) در ۳۱۰K", color: "#f2a83b", x0: 0, x1: 1, fn: (x) => x * 0.0821 * 310, markerKey: "M", markerLabel: "M" },
    ],
    readouts: (p) => {
      const pi = p.M * 0.0821 * 310;
      return [
        { label: "فشار اسمزی", value: `${f2(pi)} atm`, color: "#f2a83b" },
        { label: "ستون آب معادل", value: `${f1(pi * 10.3)} m`, color: "#56b8ff", sub: "هر atm ≈ ۱۰٫۳m آب" },
        { label: "فیزیولوژیک (۰٫۱۵M)", value: "3.8 atm", color: "#a5d95c", sub: "سرم نرمال" },
        { label: "T", value: "310 K (بدن)", color: "#35d3c2" },
        { label: "M مجهول از π", value: `${f2(p.M)} M`, color: "#e9f6f3", sub: "روش تعیین جرم مولکولی" },
        { label: "غشا", value: "نیمه‌تراوا", color: "#e9f6f3" },
      ];
    },
    protocol: ["π سرم ۰٫۱۵M", "ستون آب معادل", "تزریق آب مقطر!", "تعیین جرم مولکولی"],
    hint: "فشار اسمزی حتی در غلظت‌های کم، بزرگ است — تزریق آب خالص به رگ باعث لیز گلبول‌ها می‌شود.",
  },
  "c-phdilution": {
    formula: "pH = −log[H⁺] — رقت‌سازی اسید قوی",
    xLabel: "ضریب رقت", yLabel: "pH",
    params: [P("c0", "غلظت اولیه HCl", 0.01, 2, 0.01, 1, "M", "#f2a83b", 2)],
    curves: [
      { name: "pH(rقت)", color: "#f2a83b", x0: 0, x1: 9, fn: (x, p) => -Math.log10(Math.max(1e-7, p.c0 * Math.pow(10, -x))), markerKey: undefined },
      { name: "pH=7 آب", color: "#8fbcb8", x0: 0, x1: 9, fn: () => 7 },
    ],
    readouts: (p) => {
      return [
        { label: "pH اولیه", value: f2(-Math.log10(p.c0)), color: "#f2a83b" },
        { label: "پس از ۱۰× رقت", value: f2(-Math.log10(p.c0 / 10)), color: "#35d3c2", sub: "+۱ واحد" },
        { label: "پس از ۱۰⁶×", value: f2(-Math.log10(Math.max(1e-7, p.c0 / 1e6))), color: "#a5d95c", sub: "به ۷ میل می‌کند، نه کمتر" },
        { label: "حد", value: "هرگز >۷ نمی‌شود", color: "#56b8ff", sub: "یونش آب غالب می‌شود" },
        { label: "هر ۱۰× رقت", value: "+۱ pH", color: "#e9f6f3" },
        { label: "[H⁺] آب", value: "10⁻⁷ M", color: "#e9f6f3" },
      ];
    },
    protocol: ["pH اسید ۱M", "هر رقت +۱ واحد", "نزدیک‌شدن به ۷", "نقش یونش آب"],
    hint: "هر ده‌برابر رقت، pH یک واحد بالا می‌رود ولی هرگز از ۷ عبور نمی‌کند — چون آب خودش یونش دارد.",
  },
  "c-redoxtable": {
    formula: "E°cell = E°(کاتد) − E°(آند)",
    xLabel: "فلز", yLabel: "E° (V)",
    params: [P("k", "شاخص نیم‌سلول", 0, 7, 1, 4, "", "#f2a83b", 0)],
    curves: [
      { name: "E° نیم‌سلول‌ها", color: "#f2a83b", x0: 0, x1: 7, fn: (x) => [-2.37, -1.66, -0.76, -0.44, 0, 0.34, 0.8, 1.36][Math.round(x)] },
    ],
    readouts: (p) => {
      const names = ["Mg²⁺/Mg", "Al³⁺/Al", "Zn²⁺/Zn", "Fe²⁺/Fe", "H⁺/H₂", "Cu²⁺/Cu", "Ag⁺/Ag", "Cl₂/Cl⁻"];
      const E = [-2.37, -1.66, -0.76, -0.44, 0, 0.34, 0.8, 1.36];
      const k = Math.min(7, Math.round(p.k));
      return [
        { label: "نیم‌سلول", value: names[k], color: "#f2a83b" },
        { label: "E°", value: `${f2(E[k])} V`, color: "#35d3c2", sub: "نسبت به SHE" },
        { label: "سلول با مس", value: `${f2(0.34 - E[k])} V`, color: "#a5d95c" },
        { label: "احیاکننده قوی‌تر", value: E[k] < 0 ? "فلز فعال (E° منفی)" : "یون", color: "#ff6f61" },
        { label: "SHE", value: "0.00 V (مرجع)", color: "#56b8ff" },
        { label: "خودبه‌خودی", value: "E°cell > 0", color: "#e9f6f3" },
      ];
    },
    protocol: ["ردیف الکتروشیمیایی", "سلول با مس", "احیاکننده‌های قوی", "پیش‌بینی خودبه‌خودی"],
    hint: "هرچه E° منفی‌تر، فلز فعال‌تر و احیاکننده قوی‌تر. اختلاف دو نیم‌سلول، ولتاژ سلول است.",
  },
  "c-complex": {
    formula: "M + L ⇌ ML  ,  Kf = [ML]/([M][L])",
    xLabel: "[L] (mM)", yLabel: "کسر کمپلکس",
    params: [P("Kf", "log Kf", 2, 12, 0.5, 6, "", "#f2a83b", 1)],
    curves: [
      { name: "کسر ML", color: "#f2a83b", x0: 0, x1: 1, fn: (x, p) => { const L = x * 1e-3; const K = Math.pow(10, p.Kf); return (K * L) / (1 + K * L); }, markerKey: undefined },
    ],
    readouts: (p) => {
      const K = Math.pow(10, p.Kf);
      const half = (1 / K) * 1000;
      return [
        { label: "Kf", value: sci(K), color: "#f2a83b" },
        { label: "[L] برای ۵۰٪", value: sci(half / 1000), color: "#35d3c2", sub: "= 1/Kf" },
        { label: "کمپلکس در ۱mM", value: `${f1((K * 1e-3 / (1 + K * 1e-3)) * 100)} ٪`, color: "#a5d95c" },
        { label: "EDTA–Ca²⁺", value: "log Kf = 10.7", color: "#56b8ff" },
        { label: "هموگلوبین–O₂", value: "تعاونی (سیگموئید)", color: "#e9f6f3" },
        { label: "کاربرد", value: "تیتراسیون کمپلکسومتری", color: "#e9f6f3" },
      ];
    },
    protocol: ["منحنی اشباع", "نقطه ۵۰٪", "اثر log Kf", "کمپلکس‌های EDTA"],
    hint: "منحنی هایپربولی اشباع — در [L]=1/Kf نیمی از فلز کمپلکس شده. log Kf بزرگ‌تر، اشباع زودتر.",
  },
  "c-bondenergy": {
    formula: "ΔH = ΣBE(شکسته) − ΣBE(تشکیل‌شده)",
    xLabel: "تعداد C–H", yLabel: "ΔH (kJ/mol)",
    params: [P("n", "تعداد پیوند C–H", 1, 8, 1, 4, "", "#f2a83b", 0)],
    curves: [
      { name: "ΔH(n)", color: "#f2a83b", x0: 1, x1: 8, fn: (x) => 413 * x + 498 * x - (805 * x + 463 * 2 * x), markerKey: "n", markerLabel: "n" },
    ],
    readouts: (p) => {
      const dH = 413 * p.n + 498 * p.n - (805 * p.n + 463 * 2 * p.n);
      return [
        { label: "ΔH احتراق تقریبی", value: `${f0(dH)} kJ/mol`, color: "#f2a83b", sub: "گرماده (منفی)" },
        { label: "به ازای هر CH₂", value: `${f0(dH / p.n)} kJ/mol`, color: "#35d3c2" },
        { label: "BE(C–H)", value: "413 kJ/mol", color: "#a5d95c" },
        { label: "BE(O=O)", value: "498 kJ/mol", color: "#56b8ff" },
        { label: "BE(C=O)", value: "805 kJ/mol", color: "#e9f6f3" },
        { label: "چرا منفی", value: "تشکیل پیوند قوی‌تر", color: "#ff6f61" },
      ];
    },
    protocol: ["شکستن vs تشکیل", "ΔH برای متان", "روند با طول زنجیر", "گرماده‌بودن احتراق"],
    hint: "احتراق گرماده است چون پیوندهای C=O و O–H که تشکیل می‌شوند قوی‌تر از پیوندهای شکسته‌اند.",
  },
  "c-uvvis": {
    formula: "ΔE ≈ h²(2k+1)/(8mL²) — رنگ و مزدوج‌بودن",
    xLabel: "طول مزدوج (پیوند)", yLabel: "λmax (nm)",
    params: [P("k", "تعداد پیوندهای مزدوج", 1, 12, 1, 4, "", "#f2a83b", 0)],
    curves: [
      { name: "λmax(k)", color: "#f2a83b", x0: 1, x1: 12, fn: (x) => { const L = (x + 1) * 1.4e-10; const dE = (6.626e-34 ** 2 * (2 * x + 1)) / (8 * 9.11e-31 * L * L); return (6.626e-34 * 3e8 / dE) * 1e9; }, markerKey: "k", markerLabel: "k" },
      { name: "مرز مرئی 700nm", color: "#8fbcb8", x0: 1, x1: 12, fn: () => 700 },
    ],
    readouts: (p) => {
      const L = (p.k + 1) * 1.4e-10;
      const dE = (6.626e-34 ** 2 * (2 * p.k + 1)) / (8 * 9.11e-31 * L * L);
      const lam = (6.626e-34 * 3e8 / dE) * 1e9;
      return [
        { label: "λmax", value: `${f0(lam)} nm`, color: "#f2a83b", sub: lam < 400 ? "UV — بی‌رنگ" : lam < 700 ? "مرئی — رنگی" : "IR" },
        { label: "ΔE", value: `${f2(dE / 1.6e-19)} eV`, color: "#35d3c2" },
        { label: "اتیلن (k=1)", value: "≈ 170 nm (UV)", color: "#56b8ff" },
        { label: "β-کاروتن (k=11)", value: "نارنجی", color: "#ff9b3b" },
        { label: "لیکوپن", value: "قرمز گوجه", color: "#ff6f61" },
        { label: "رنگ مکمل", value: "جذب → مکمل دیده می‌شود", color: "#e9f6f3" },
      ];
    },
    protocol: ["λmax اتیلن", "ورود به محدوده مرئی", "رنگ کاروتنوئیدها", "ΔE با مزدوج‌بودن"],
    hint: "هر پیوند مزدوج بیشتر، λmax بلندتر — β-کاروتن با ۱۱ پیوند مزدوج نارنجی است.",
  },
  "c-tlc": {
    formula: "Rf = مسافت ماده / مسافت حلال",
    xLabel: "قطبیت حلال", yLabel: "Rf",
    params: [P("pol", "قطبیت فاز متحرک", 0, 1, 0.05, 0.5, "", "#f2a83b", 2)],
    curves: [
      { name: "ماده A (قطبی)", color: "#f2a83b", x0: 0, x1: 1, fn: (x) => 0.15 + 0.7 * x * x },
      { name: "ماده B (کم‌قطب)", color: "#56b8ff", x0: 0, x1: 1, fn: (x) => 0.55 + 0.3 * x },
      { name: "ماده C", color: "#a5d95c", x0: 0, x1: 1, fn: (x) => 0.3 + 0.5 * x },
    ],
    readouts: (p) => {
      return [
        { label: "Rf ماده A", value: f2(0.15 + 0.7 * p.pol * p.pol), color: "#f2a83b" },
        { label: "Rf ماده B", value: f2(0.55 + 0.3 * p.pol), color: "#56b8ff" },
        { label: "Rf ماده C", value: f2(0.3 + 0.5 * p.pol), color: "#a5d95c" },
        { label: "بهترین جداسازی", value: "ΔRf ≈ 0.2", color: "#35d3c2" },
        { label: "Rf مجاز", value: "0.2 تا 0.8", color: "#e9f6f3" },
        { label: "فاز ثابت", value: "سیلیکا (قطبی)", color: "#e9f6f3" },
      ];
    },
    protocol: ["Rf سه ماده", "اثر قطبیت حلال", "بهینه‌سازی جداسازی", "شناسایی با استاندارد"],
    hint: "در سیلیکای قطبی، ماده قطبی‌تر کندتر حرکت می‌کند. با تغییر حلال، جداسازی را بهینه کنید.",
  },
  "c-faraday": {
    formula: "m = (M·I·t)/(z·F) — قوانین فارادی",
    xLabel: "t (min)", yLabel: "m (g)",
    params: [
      P("I", "جریان", 0.5, 10, 0.5, 2, "A", "#f2a83b", 1),
      P("M", "جرم مولی", 20, 200, 1, 63.5, "g/mol", "#35d3c2", 1),
      P("z", "ظرفیت z", 1, 3, 1, 2, "", "#56b8ff", 0),
    ],
    curves: [
      { name: "m(t) — مس", color: "#f2a83b", x0: 0, x1: 60, fn: (x, p) => (p.M * p.I * x * 60) / (p.z * 96485), markerKey: undefined },
    ],
    readouts: (p) => {
      const m60 = (p.M * p.I * 3600) / (p.z * 96485);
      return [
        { label: "رسوب در ۶۰ دقیقه", value: `${f2(m60)} g`, color: "#f2a83b" },
        { label: "مول الکترون", value: `${f2((p.I * 3600) / 96485)} mol`, color: "#35d3c2", sub: "Q/F" },
        { label: "بار کل", value: `${f0(p.I * 3600)} C`, color: "#a5d95c" },
        { label: "F", value: "96485 C/mol", color: "#56b8ff" },
        { label: "معادل الکتروشیمیایی", value: sci(p.M / (p.z * 96485)), color: "#e9f6f3", sub: "g/C" },
        { label: "آبکاری", value: "کاتد وزن می‌گیرد", color: "#e9f6f3" },
      ];
    },
    protocol: ["رسوب مس", "رابطه خطی m–t", "اثر z", "ظرفیت‌سنجی کولنی"],
    hint: "جرم رسوب با بار الکتریکی خطی است — اساس آبکاری و تعیین دقیق ثابت فارادی.",
  },
  "c-lattice": {
    formula: "U ≈ −(k·z⁺z⁻·e²)/r — انرژی شبکه بلورین",
    xLabel: "r₀ (pm)", yLabel: "U (kJ/mol)",
    params: [P("z", "بار یون z⁺z⁻", 1, 9, 1, 4, "", "#f2a83b", 0)],
    curves: [
      { name: "U(r)", color: "#f2a83b", x0: 100, x1: 400, fn: (x, p) => (-1389 * p.z) / x, markerKey: undefined },
      { name: "z=1 (NaCl)", color: "#8fbcb8", x0: 100, x1: 400, fn: (x) => -1389 / x },
    ],
    readouts: (p) => {
      return [
        { label: "U در r=250pm", value: `${f0((-1389 * p.z) / 250)} kJ/mol`, color: "#f2a83b" },
        { label: "NaCl (z=1)", value: "−787 kJ/mol", color: "#56b8ff" },
        { label: "MgO (z=4)", value: "−3795 kJ/mol", color: "#ff6f61", sub: "نقطه ذوب ۲۸۵۲°C!" },
        { label: "وابستگی", value: "U ∝ z⁺z⁻/r", color: "#a5d95c" },
        { label: "چرخه بورن–هابر", value: "اندازه‌گیری غیرمستقیم", color: "#35d3c2" },
        { label: "حلالیت", value: "U بزرگ → کم‌حلوال‌تر", color: "#e9f6f3" },
      ];
    },
    protocol: ["U بر حسب r", "اثر مضاعف‌شدن بار", "مقایسه NaCl و MgO", "رابطه با نقطه ذوب"],
    hint: "انرژی شبکه با حاصل‌ضرب بارها و معکوس فاصله رشد می‌کند — MgO با بار ۲± تقریباً ۵ برابر NaCl.",
  },
  "c-ratelaw": {
    formula: "rate = k[A]^m[B]^n — روش سرعت‌های اولیه",
    xLabel: "log[A]", yLabel: "log(rate)",
    params: [
      P("m", "مرتبه نسبت به A", 0, 3, 0.5, 2, "", "#f2a83b", 1),
      P("k", "log k", -3, 1, 0.5, -1, "", "#35d3c2", 1),
    ],
    curves: [
      { name: "log(rate)–log[A]", color: "#f2a83b", x0: -2, x1: 1, fn: (x, p) => p.k + p.m * x, markerKey: undefined },
    ],
    readouts: (p) => {
      return [
        { label: "شیب = مرتبه m", value: f1(p.m), color: "#f2a83b", sub: "از نمودار لگاریتمی" },
        { label: "k", value: sci(Math.pow(10, p.k)), color: "#35d3c2" },
        { label: "دوبرابرشدن [A]", value: `سرعت ×${f1(Math.pow(2, p.m))}`, color: "#a5d95c" },
        { label: "مرتبه ۰", value: "سرعت ثابت", color: "#56b8ff" },
        { label: "مرتبه ۲", value: "سرعت ×۴", color: "#e9f6f3" },
        { label: "مکانیسم", value: "مرحله کند تعیین‌کننده", color: "#e9f6f3" },
      ];
    },
    protocol: ["شیب = مرتبه", "اثر دوبرابرشدن [A]", "تعیین k", "رابطه با مکانیسم"],
    hint: "در مختصات لگاریتمی، شیب خط دقیقاً مرتبه واکنش است — قدرتمندترین روش تعیین قانون سرعت.",
  },
};

export const SPECS: Record<string, LabSpecDef> = { ...PHYS, ...CHEM, ...(typeof window !== "undefined" ? {} : {}) };

// Specs for biology / electronics / medicine live in specs2.ts and are merged there.
import { SPECS2 } from "./specs2";
for (const key of Object.keys(SPECS2)) SPECS[key] = SPECS2[key];
