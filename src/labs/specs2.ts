import type { LabSpecDef, ParamSpec } from "./specs1";

const P = (key: string, label: string, min: number, max: number, step: number, def: number, unit = "", accent = "#f2a83b", digits?: number): ParamSpec =>
  ({ key, label, min, max, step, def, unit, accent, digits: digits ?? (step < 0.01 ? 3 : step < 1 ? 2 : step < 10 ? 1 : 0) });
const f2 = (v: number) => (isFinite(v) ? v.toFixed(2) : "—");
const f1 = (v: number) => (isFinite(v) ? v.toFixed(1) : "—");
const f0 = (v: number) => (isFinite(v) ? v.toFixed(0) : "—");
const sci = (v: number) => (isFinite(v) ? v.toExponential(2) : "—");

/* ================================================================ */
/* BIOLOGY — 21 quantitative experiments                            */
/* ================================================================ */
const BIO: Record<string, LabSpecDef> = {
  "b-fick": {
    formula: "J = D·A·ΔC/Δx — قانون فیک انتشار",
    xLabel: "ΔC (mM)", yLabel: "J (µmol/s)",
    params: [
      P("D", "ضریب انتشار D", 0.5, 5, 0.1, 2, "×10⁻⁵ cm²/s", "#35d3c2", 1),
      P("A", "مساحت غشا", 1, 20, 0.5, 8, "cm²", "#56b8ff", 1),
      P("dx", "ضخامت غشا", 0.5, 10, 0.5, 2, "µm", "#a5d95c", 1),
    ],
    curves: [
      { name: "J(ΔC)", color: "#f2a83b", x0: 0, x1: 50, fn: (x, p) => (p.D * p.A * x) / p.dx / 10 },
      { name: "غشای ضخیم‌تر", color: "#8fbcb8", x0: 0, x1: 50, fn: (x, p) => (p.D * p.A * x) / (p.dx * 2) / 10 },
    ],
    readouts: (p) => [
      { label: "شار J در ΔC=25", value: `${f1((p.D * p.A * 25) / p.dx / 10)} µmol/s`, color: "#f2a83b" },
      { label: "شیب (نفوذپذیری)", value: f2((p.D * p.A) / p.dx / 10), color: "#35d3c2", sub: "D·A/Δx" },
      { label: "اثر ضخامت", value: "J ∝ 1/Δx", color: "#a5d95c" },
      { label: "O₂ در ریه", value: "Δx ≈ 0.5 µm", color: "#56b8ff" },
      { label: "انتشار تسهیل‌شده", value: "اشباع می‌شود", color: "#e9f6f3" },
      { label: "انتقال فعال", value: "خلاف شیب", color: "#e9f6f3" },
    ],
    protocol: ["شار در ΔC", "اثر ضخامت غشا", "اثر مساحت", "مقایسه با تسهیل‌شده"],
    hint: "شار با شیب غلظت خطی است — غشای نازک‌تر و مساحت بیشتر، انتشار سریع‌تر. آلوئول ریه هر دو را بهینه کرده.",
  },
  "b-osmocell": {
    formula: "V/V₀ در تونیسیتی‌های مختلف — اسمز گلبول",
    xLabel: "اسمولاریته خارج (mOsm)", yLabel: "V/V₀",
    params: [P("osm", "اسمولاریته محیط", 100, 600, 10, 300, "mOsm", "#f2a83b", 0)],
    curves: [
      { name: "V/V₀", color: "#f2a83b", x0: 100, x1: 600, fn: (x) => Math.min(1.9, 300 / x), markerKey: "osm", markerLabel: "محیط" },
      { name: "ایزوتونیک", color: "#8fbcb8", x0: 100, x1: 600, fn: () => 1 },
    ],
    readouts: (p) => {
      const r = Math.min(1.9, 300 / p.osm);
      return [
        { label: "تغییر حجم", value: `${f0((r - 1) * 100)} ٪`, color: "#f2a83b" },
        { label: "وضعیت", value: p.osm < 280 ? "هیپوتونیک — تورم/لیز" : p.osm > 320 ? "هیپرتونیک — چروکیدگی" : "ایزوتونیک — پایدار", color: p.osm < 280 ? "#ff6f61" : p.osm > 320 ? "#f2a83b" : "#a5d95c" },
        { label: "سرم نرمال", value: "285–295 mOsm", color: "#35d3c2" },
        { label: "آب مقطر", value: "لیز کامل", color: "#ff6f61" },
        { label: "کره گیاهی", value: "دیواره از لیز جلوگیری", color: "#a5d95c", sub: "فشار تورژسانس" },
        { label: "قاعده", value: "آب به سمت غلظت بیشتر", color: "#e9f6f3" },
      ];
    },
    protocol: ["محیط ایزوتونیک", "هیپوتونیک (لیز)", "هیپرتونیک (چروک)", "سرم ۲۹۰"],
    hint: "گلبول در آب مقطر می‌ترکد و در آب‌نمک غلیظ چروکیده می‌شود — فقط سرم ۰٫۹٪ ایمن است.",
  },
  "b-lightresp": {
    formula: "P = Pmax·I/(I+K) − Rd — منحنی پاسخ نوری",
    xLabel: "شدت نور (µmol/m²·s)", yLabel: "فتوسنتز خالص",
    params: [
      P("Pmax", "Pmax", 5, 40, 1, 20, "", "#35d3c2", 0),
      P("K", "نیمه‌اشباع K", 20, 200, 10, 80, "", "#56b8ff", 0),
      P("Rd", "تنفس تاریکی", 0.5, 8, 0.5, 2, "", "#ff6f61", 1),
    ],
    curves: [
      { name: "فتوسنتز خالص", color: "#a5d95c", x0: 0, x1: 1000, fn: (x, p) => (p.Pmax * x) / (x + p.K) - p.Rd },
      { name: "صفر (جبران)", color: "#8fbcb8", x0: 0, x1: 1000, fn: () => 0 },
    ],
    readouts: (p) => {
      const Ic = (p.Rd * p.K) / (p.Pmax - p.Rd);
      return [
        { label: "نقطه جبران نوری", value: `${f0(Ic)} µmol/m²·s`, color: "#f2a83b", sub: "P خالص = 0" },
        { label: "P در نور اشباع", value: `${f1(p.Pmax - p.Rd)}`, color: "#a5d95c" },
        { label: "بازده کوانتومی", value: f2(p.Pmax / p.K), color: "#35d3c2", sub: "شیب اولیه" },
        { label: "عامل محدودکننده", value: "نور→CO₂→دما", color: "#56b8ff" },
        { label: "نقطه اشباع", value: `≈ ${f0(3 * p.K)}`, color: "#e9f6f3" },
        { label: "سایه‌دوست", value: "K کوچک‌تر", color: "#e9f6f3" },
      ];
    },
    protocol: ["نقطه جبران", "منحنی اشباع", "اffect K", "تنفس تاریکی"],
    hint: "در نور کم، نور عامل محدودکننده است؛ پس از اشباع، CO₂ محدود می‌کند. نقطه جبران جایی است که فتوسنتز = تنفس.",
  },
  "b-rq": {
    formula: "RQ = CO₂ تولیدی / O₂ مصرفی",
    xLabel: "سهم لیپید", yLabel: "RQ",
    params: [P("lip", "سهم لیپید در سوخت", 0, 1, 0.05, 0.3, "", "#f2a83b", 2)],
    curves: [
      { name: "RQ", color: "#f2a83b", x0: 0, x1: 1, fn: (x) => (1 - x) * 1 + x * 0.7, markerKey: "lip", markerLabel: "لیپید" },
      { name: "RQ پروتئین 0.8", color: "#8fbcb8", x0: 0, x1: 1, fn: () => 0.8 },
    ],
    readouts: (p) => {
      const rq = (1 - p.lip) * 1 + p.lip * 0.7;
      return [
        { label: "RQ", value: f2(rq), color: "#f2a83b" },
        { label: "سوخت غالب", value: rq > 0.95 ? "کربوهیدرات" : rq < 0.78 ? "لیپید" : "مخلوط", color: "#a5d95c" },
        { label: "گلوکز", value: "RQ = 1.00", color: "#35d3c2", sub: "C₆H₁₂O₆ + 6O₂" },
        { label: "پالمیتات", value: "RQ = 0.70", color: "#56b8ff", sub: "C₁₆ لیپید" },
        { label: "RQ > 1", value: "لیپوژنز از قند", color: "#e9f6f3" },
        { label: "کالری‌متری", value: "≈ 20.2 kJ/L O₂", color: "#e9f6f3" },
      ];
    },
    protocol: ["RQ کربوهیدرات", "RQ لیپید", "سوخت مخلوط", "تفسیر متابولیک"],
    hint: "RQ امضای سوخت است: قند ۱٫۰، چربی ۰٫۷. در گرسنگی طولانی RQ به ۰٫۷ میل می‌کند.",
  },
  "b-popgrowth": {
    formula: "N(t) = K / (1 + ((K−N₀)/N₀)·e^(−rt)) — لجستیک",
    xLabel: "t (روز)", yLabel: "N (جمعیت)",
    params: [
      P("r", "نرخ رشد r", 0.05, 1, 0.05, 0.3, "/روز", "#35d3c2", 2),
      P("K", "ظرفیت برد K", 100, 2000, 50, 1000, "", "#f2a83b", 0),
      P("N0", "جمعیت اولیه", 5, 200, 5, 50, "", "#56b8ff", 0),
    ],
    curves: [
      { name: "لجستیک", color: "#a5d95c", x0: 0, x1: 30, fn: (x, p) => p.K / (1 + ((p.K - p.N0) / p.N0) * Math.exp(-p.r * x)) },
      { name: "نمایی (بدون K)", color: "#8fbcb8", x0: 0, x1: 30, fn: (x, p) => p.N0 * Math.exp(p.r * x) },
    ],
    readouts: (p) => [
      { label: "N در روز ۳۰", value: f0(p.K / (1 + ((p.K - p.N0) / p.N0) * Math.exp(-p.r * 30))), color: "#a5d95c" },
      { label: "نرخ بیشینه (K/2)", value: f0(p.r * p.K / 4), color: "#f2a83b", sub: "در N = K/2" },
      { label: "زمان دوبرابرشدن", value: `${f1(Math.LN2 / p.r)} روز`, color: "#35d3c2", sub: "فاز نمایی" },
      { label: "MSY", value: "برداشت در K/2", color: "#56b8ff", sub: "بیشینه عملکرد پایدار" },
      { label: "مقاومت محیطی", value: "با N→K", color: "#e9f6f3" },
      { label: "مدل", value: "فرهولست", color: "#e9f6f3" },
    ],
    protocol: ["فاز نمایی", "نقطه عطف K/2", "اثر r", "اثر K"],
    hint: "رشد لجستیک S-شکل است: نمایی در ابتدا، سپس مقاومت محیطی. سریع‌ترین رشد دقیقاً در K/2 رخ می‌دهد.",
  },
  "b-survivorship": {
    formula: "منحنی بقا lx — سه استراتژی زندگی",
    xLabel: "سن نسبی", yLabel: "log₁₀ بازماندگان",
    params: [P("type", "نوع منحنی (I…III)", 1, 3, 0.1, 1, "", "#f2a83b", 1)],
    curves: [
      { name: "منحنی بقا", color: "#f2a83b", x0: 0, x1: 1, fn: (x, p) => { const t = p.type; const w1 = Math.max(0, (3 - t) / 2), w2 = Math.max(0, 1 - Math.abs(t - 2)), w3 = Math.max(0, (t - 1) / 2); const s = Math.pow(1 - x, 0.15) * w1 + Math.pow(1 - x, 1) * w2 + Math.pow(1 - x, 3.5) * w3; return Math.log10(Math.max(s, 1e-4)); } },
    ],
    readouts: (p) => [
      { label: "نوع", value: p.type < 1.5 ? "I — مرگ‌ومیر دیررس" : p.type < 2.5 ? "II — نرخ ثابت" : "III — مرگ‌ومیر زودرس", color: "#f2a83b" },
      { label: "مثال نوع I", value: "انسان، فیل", color: "#35d3c2", sub: "مراقبت والدین بالا" },
      { label: "مثال نوع II", value: "پرندگان، جوندگان", color: "#56b8ff" },
      { label: "مثال نوع III", value: "ماهی، حشرات، گیاهان", color: "#a5d95c", sub: "هزاران تخم" },
      { label: "امید زندگی", value: p.type < 1.5 ? "بالا" : p.type < 2.5 ? "متوسط" : "پایین در جوانی", color: "#e9f6f3" },
      { label: "انتخاب طبیعی", value: "تعداد vs کیفیت", color: "#e9f6f3" },
    ],
    protocol: ["منحنی نوع I", "نوع III", "گذار پیوسته", "استراتژی r/K"],
    hint: "اسلایدر را از ۱ تا ۳ ببرید — انسان (I) به ماهی (III)؛ گذر از استراتژی کیفیت‌گرا به تعدادگرا.",
  },
  "b-chisquare": {
    formula: "χ² = Σ (O−E)²/E — آزمون نسبت ۹:۳:۳:۱",
    xLabel: "انحراف از انتظار", yLabel: "χ²",
    params: [
      P("o1", "مشاهده فنوتیپ ۱", 100, 400, 5, 280, "", "#f2a83b", 0),
      P("o2", "مشاهده فنوتیپ ۲", 30, 150, 5, 95, "", "#35d3c2", 0),
      P("o3", "مشاهده فنوتیپ ۳", 30, 150, 5, 90, "", "#56b8ff", 0),
      P("o4", "مشاهده فنوتیپ ۴", 5, 80, 5, 35, "", "#a5d95c", 0),
    ],
    curves: [
      { name: "χ²(انحراف)", color: "#f2a83b", x0: 0, x1: 50, fn: (x) => (x * x) / 100 },
      { name: "بحرانی 7.81", color: "#ff6f61", x0: 0, x1: 50, fn: () => 7.81 },
    ],
    readouts: (p) => {
      const N = p.o1 + p.o2 + p.o3 + p.o4;
      const e = [9 / 16, 3 / 16, 3 / 16, 1 / 16].map((q) => q * N);
      const o = [p.o1, p.o2, p.o3, p.o4];
      const chi = o.reduce((s, v, i) => s + ((v - e[i]) ** 2) / e[i], 0);
      return [
        { label: "χ²", value: f2(chi), color: "#f2a83b" },
        { label: "نتیجه (df=3)", value: chi < 7.81 ? "انطباق با ۹:۳:۳:۱ ✓" : "رد فرضیه مندلی ✗", color: chi < 7.81 ? "#a5d95c" : "#ff6f61", sub: "بحرانی = 7.81 (α=0.05)" },
        { label: "N کل", value: f0(N), color: "#e9f6f3" },
        { label: "درجات آزادی", value: "3", color: "#35d3c2", sub: "فنوتیپ−1" },
        { label: "E فنوتیپ ۱", value: f0(e[0]), color: "#56b8ff" },
        { label: "قاعده", value: "χ²<بحرانی → پذیرش", color: "#e9f6f3" },
      ];
    },
    protocol: ["محاسبه χ²", "مقایسه با ۷٫۸۱", "اثر N بر آزمون", "تشخیص پیوستگی ژن"],
    hint: "اگر χ² از ۷٫۸۱ بگذرد، نسبت ۹:۳:۳:۱ رد می‌شود — شاید ژن‌ها پیوسته‌اند یا انتخابی در کار است.",
  },
  "b-linkage": {
    formula: "RF = نوترکیب‌ها / کل × 100 — واحد نقشه (cM)",
    xLabel: "فاصله واقعی (cM)", yLabel: "RF مشاهده‌شده",
    params: [P("d", "فاصله ژنی", 1, 60, 1, 20, "cM", "#f2a83b", 0)],
    curves: [
      { name: "RF با تداخل", color: "#f2a83b", x0: 0, x1: 60, fn: (x) => 50 * (1 - Math.exp(-2 * x / 100)) * 100 / 100, markerKey: "d", markerLabel: "فاصله" },
      { name: "خطی (بدون تداخل)", color: "#8fbcb8", x0: 0, x1: 60, fn: (x) => x },
    ],
    readouts: (p) => {
      const rf = 50 * (1 - Math.exp(-2 * p.d / 100));
      return [
        { label: "RF مشاهده‌شده", value: `${f1(rf)} ٪`, color: "#f2a83b" },
        { label: "واحد نقشه", value: `${f1(p.d)} cM`, color: "#35d3c2", sub: "سانتی‌مورگان" },
        { label: "سقف RF", value: "50 ٪", color: "#ff6f61", sub: "توزیع مستقل" },
        { label: "ژن‌های پیوسته", value: "RF < 50٪", color: "#a5d95c" },
        { label: "تداخل", value: "کراسینگ‌اور دوتایی پنهان", color: "#56b8ff" },
        { label: "مورگان", value: "مگس سرکه", color: "#e9f6f3" },
      ];
    },
    protocol: ["RF و فاصله", "اشباع در ۵۰٪", "اثر تداخل", "ساخت نقشه ژنی"],
    hint: "RF هرگز از ۵۰٪ نمی‌گذرد — در فواصل دور، کراسینگ‌اورهای دوتایی، نوترکیبی را پنهان می‌کنند (تابع هالدین).",
  },
  "b-proteindenat": {
    formula: "فعالیت آنزیم بر حسب دما — بهینه و دناتوراسیون",
    xLabel: "T (°C)", yLabel: "فعالیت ٪",
    params: [
      P("Topt", "دمای بهینه", 20, 80, 1, 37, "°C", "#f2a83b", 0),
      P("w", "پهنای پایداری", 5, 30, 1, 12, "°C", "#35d3c2", 0),
    ],
    curves: [
      { name: "فعالیت(T)", color: "#f2a83b", x0: 0, x1: 100, fn: (x, p) => 100 * Math.exp(-((x - p.Topt) ** 2) / (2 * p.w * p.w)) * (x < p.Topt ? 1 : Math.exp(-Math.max(0, x - p.Topt - p.w) / 8)) },
      { name: "آنزیم گرمادوست", color: "#a5d95c", x0: 0, x1: 100, fn: (x) => 100 * Math.exp(-((x - 72) ** 2) / (2 * 15 * 15)) },
    ],
    readouts: (p) => [
      { label: "دمای بهینه", value: `${f0(p.Topt)} °C`, color: "#f2a83b" },
      { label: "فعالیت در ۲۵°", value: `${f0(100 * Math.exp(-((25 - p.Topt) ** 2) / (2 * p.w * p.w)))} ٪`, color: "#35d3c2" },
      { label: "دناتوراسیون", value: `شروع ≈ ${f0(p.Topt + p.w)} °C`, color: "#ff6f61", sub: "برهم‌کنش‌های غیرکووالان" },
      { label: "Taq پلیمراز", value: "بهینه ۷۲°C", color: "#a5d95c", sub: "چشمه آب گرم" },
      { label: "Q₁₀", value: "≈ ۲ (زیر بهینه)", color: "#56b8ff" },
      { label: "برگشت‌ناپذیری", value: "بالای آستانه", color: "#e9f6f3" },
    ],
    protocol: ["قله فعالیت", "اثر پهنای پایداری", "دناتوراسیون حرارتی", "آنزیم گرمادوست"],
    hint: "زیر بهینه، سرعت با Q₁₀≈۲ بالا می‌رود؛ بالای آن، تاخوردگی سه‌بعدی از دست می‌رود و فعالیت سقوط می‌کند.",
  },
  "b-inhibitor": {
    formula: "لاینویور–بورک: 1/v = (Km/Vmax)(1/[S]) + 1/Vmax",
    xLabel: "1/[S] (mM⁻¹)", yLabel: "1/v",
    params: [
      P("Vmax", "Vmax", 5, 50, 1, 20, "", "#35d3c2", 0),
      P("Km", "Km", 1, 20, 0.5, 5, "mM", "#f2a83b", 1),
      P("I", "غلظت مهارکننده", 0, 20, 1, 10, "mM", "#ff6f61", 0),
    ],
    curves: [
      { name: "بدون مهارکننده", color: "#35d3c2", x0: 0, x1: 1, fn: (x, p) => (p.Km / p.Vmax) * x + 1 / p.Vmax },
      { name: "رقابتی", color: "#f2a83b", x0: 0, x1: 1, fn: (x, p) => { const a = 1 + p.I / p.Km; return (a * p.Km / p.Vmax) * x + 1 / p.Vmax; } },
      { name: "غیررقابتی", color: "#ff6f61", x0: 0, x1: 1, fn: (x, p) => { const a = 1 + p.I / p.Km; return (a * p.Km / p.Vmax) * x + a / p.Vmax; } },
    ],
    readouts: (p) => {
      const a = 1 + p.I / p.Km;
      return [
        { label: "Km ظاهری (رقابتی)", value: `${f1(a * p.Km)} mM`, color: "#f2a83b", sub: "α×Km — زیاد می‌شود" },
        { label: "Vmax (رقابتی)", value: `${f0(p.Vmax)}`, color: "#35d3c2", sub: "تغییر نمی‌کند" },
        { label: "Vmax ظاهری (غیررقابتی)", value: `${f1(p.Vmax / a)}`, color: "#ff6f61", sub: "کم می‌شود" },
        { label: "اشتراک رقابتی", value: "جایگاه فعال", color: "#56b8ff" },
        { label: "رفع با [S] بالا", value: "فقط رقابتی", color: "#a5d95c" },
        { label: "مثال", value: "استاتین‌ها (رقابتی)", color: "#e9f6f3" },
      ];
    },
    protocol: ["خط بدون مهارکننده", "تقاطع در 1/Vmax (رقابتی)", "شیب αKm/Vmax", "تمایز دو نوع"],
    hint: "مهار رقابتی: خط‌ها روی محور y قطع می‌شوند (Vmax ثابت). غیررقابتی: روی محور x (Km ثابت).",
  },
  "b-dnamelt": {
    formula: "Tm = 69.3 + 0.41×(٪GC) — ذوب DNA",
    xLabel: "T (°C)", yLabel: "کسر دورشته‌ای",
    params: [P("gc", "درصد GC", 20, 70, 1, 45, "٪", "#f2a83b", 0)],
    curves: [
      { name: "ذوب DNA", color: "#f2a83b", x0: 40, x1: 110, fn: (x, p) => { const tm = 69.3 + 0.41 * p.gc; return 1 / (1 + Math.exp((x - tm) / 2.5)); } },
      { name: "GC=60٪", color: "#8fbcb8", x0: 40, x1: 110, fn: (x) => 1 / (1 + Math.exp((x - (69.3 + 0.41 * 60)) / 2.5)) },
    ],
    readouts: (p) => {
      const tm = 69.3 + 0.41 * p.gc;
      return [
        { label: "Tm", value: `${f1(tm)} °C`, color: "#f2a83b" },
        { label: "پیوند H در GC", value: "۳ (در برابر ۲ در AT)", color: "#35d3c2", sub: "پایدارتر" },
        { label: "ΔTm به ازای ۱۰٪GC", value: "+4.1 °C", color: "#a5d95c" },
        { label: "PCR دناتوراسیون", value: "94–98 °C", color: "#ff6f61" },
        { label: "هیبریداسیون", value: "Tm − 5°C", color: "#56b8ff" },
        { label: "گذار", value: "همکاری (سیگموئید)", color: "#e9f6f3" },
      ];
    },
    protocol: ["Tm در GC=45", "اثر GC بر پایداری", "شیب تیز گذار", "کاربرد در PCR"],
    hint: "جفت‌های GC سه پیوند هیدروژنی دارند — هرچه GC بیشتر، Tm بالاتر. منحنی سیگموئید، گذار همکاری را نشان می‌دهد.",
  },
  "b-gentime": {
    formula: "N = N₀·2^(t/g) — زمان نسل باکتری",
    xLabel: "t (دقیقه)", yLabel: "log₁₀ N",
    params: [
      P("g", "زمان نسل g", 10, 120, 5, 20, "دقیقه", "#f2a83b", 0),
      P("N0", "log N₀", 1, 5, 0.5, 2, "", "#35d3c2", 1),
    ],
    curves: [
      { name: "log N(t)", color: "#a5d95c", x0: 0, x1: 300, fn: (x, p) => p.N0 + x / p.g * Math.log10(2) },
      { name: "E.coli g=20", color: "#8fbcb8", x0: 0, x1: 300, fn: (x, p) => p.N0 + x / 20 * Math.log10(2) },
    ],
    readouts: (p) => [
      { label: "تعداد نسل در ۵ ساعت", value: f0(300 / p.g), color: "#f2a83b" },
      { label: "N پس از ۵ ساعت", value: sci(Math.pow(10, p.N0 + (300 / p.g) * Math.log10(2))), color: "#a5d95c" },
      { label: "نرخ رشد µ", value: `${f2(Math.LN2 / p.g)} /دقیقه`, color: "#35d3c2", sub: "ln2/g" },
      { label: "E.coli", value: "g = 20 دقیقه", color: "#56b8ff" },
      { label: "سل", value: "g = 15–20 ساعت!", color: "#ff6f61" },
      { label: "فازها", value: "تأخیری→لگاریتمی→ایستایی", color: "#e9f6f3" },
    ],
    protocol: ["نسل‌ها در ۵ ساعت", "رشد لگاریتمی", "مقایسه g", "µ = ln2/g"],
    hint: "در نمودار نیمه‌لگاریتمی رشد لگاریتمی خط راست است — شیب آن ln2/g. یک باکتری در ۱۰ ساعت می‌تواند میلیاردها شود.",
  },
  "b-competition": {
    formula: "ایزوکلاین رقابت لوتکا — حذف رقابتی گاوس",
    xLabel: "N₁", yLabel: "N₂",
    params: [
      P("K1", "K₁", 50, 300, 10, 150, "", "#35d3c2", 0),
      P("K2", "K₂", 50, 300, 10, 180, "", "#ff6f61", 0),
      P("a12", "α₁₂ (اثر ۲ بر ۱)", 0.2, 2, 0.1, 0.8, "", "#f2a83b", 1),
      P("a21", "α₂₁ (اثر ۱ بر ۲)", 0.2, 2, 0.1, 0.6, "", "#56b8ff", 1),
    ],
    curves: [
      { name: "ایزوکلاین N₁", color: "#35d3c2", x0: 0, x1: 300, fn: (x, p) => Math.max(0, (p.K1 - x) / p.a12) },
      { name: "ایزوکلاین N₂", color: "#ff6f61", x0: 0, x1: 300, fn: (x, p) => Math.max(0, p.K2 - p.a21 * x) },
    ],
    readouts: (p) => {
      const k1oa12 = p.K1 / p.a12;
      const outcome = p.K1 > k1oa12 * p.a21 && p.K1 > p.K2 * p.a21 ? "N₁ برنده" : p.K2 > p.K1 * p.a12 ? "N₂ برنده" : "هم‌زیستی پایدار";
      return [
        { label: "نتیجه", value: outcome, color: outcome.includes("هم‌زیستی") ? "#a5d95c" : "#f2a83b" },
        { label: "K₁/α₁₂", value: f0(k1oa12), color: "#35d3c2" },
        { label: "K₂/α₂₁", value: f0(p.K2 / p.a21), color: "#ff6f61" },
        { label: "اصل گاوس", value: "دو گونه، یک نیچ → حذف", color: "#56b8ff" },
        { label: "شرط هم‌زیستی", value: "α‌ها کوچک", color: "#a5d95c" },
        { label: "پارامسیوم", value: "آزمایش کلاسیک", color: "#e9f6f3" },
      ];
    },
    protocol: ["ایزوکلاین‌ها", "تقاطع = هم‌زیستی", "حذف رقابتی", "اثر α"],
    hint: "هر ایزوکلاین خطی است که رشد آن گونه صفر می‌شود. اگر تقاطع پایدار باشد هم‌زیستی، وگرنه یکی حذف می‌شود.",
  },
  "b-energypyramid": {
    formula: "Eₙ = E₀ × 10^(−n) — قاعده ۱۰٪ لیندمن",
    xLabel: "سطح غذایی", yLabel: "انرژی (kJ/m²·سال)",
    params: [P("E0", "انرژی تولیدکنندگان", 1000, 50000, 1000, 20000, "", "#a5d95c", 0)],
    curves: [
      { name: "انرژی (لگاریتمی)", color: "#a5d95c", x0: 0, x1: 4, fn: (x, p) => p.E0 * Math.pow(0.1, x) },
    ],
    readouts: (p) => [
      { label: "تولیدکنندگان", value: sci(p.E0), color: "#a5d95c" },
      { label: "مصرف‌کنندگان I", value: sci(p.E0 * 0.1), color: "#f2a83b" },
      { label: "مصرف‌کنندگان II", value: sci(p.E0 * 0.01), color: "#ff6f61" },
      { label: "رأس هرم", value: sci(p.E0 * 0.001), color: "#b388ff" },
      { label: "بازده انتقال", value: "≈ 10 ٪", color: "#35d3c2", sub: "تنفس + دفع + گرما" },
      { label: "طول زنجیر", value: "معمولاً ≤ 5", color: "#e9f6f3", sub: "انرژی کافی نیست" },
    ],
    protocol: ["قاعده ۱۰٪", "افت انرژی هر سطح", "محدودیت طول زنجیر", "زیست‌توده"],
    hint: "فقط ~۱۰٪ انرژی به سطح بعد منتقل می‌شود — به همین دلیل هرم‌ها باریک و زنجیرها کوتاه‌اند.",
  },
  "b-shannon": {
    formula: "H′ = −Σ pᵢ·ln pᵢ — تنوع شانون",
    xLabel: "یکنواختی J", yLabel: "H′ (bit)",
    params: [
      P("S", "تعداد گونه‌ها", 2, 20, 1, 6, "", "#35d3c2", 0),
      P("J", "یکنواختی", 0.1, 1, 0.05, 0.8, "", "#f2a83b", 2),
    ],
    curves: [
      { name: "H′(یکنواختی)", color: "#f2a83b", x0: 0.1, x1: 1, fn: (x, p) => x * Math.log2(p.S) },
      { name: "H′max = log₂S", color: "#8fbcb8", x0: 0.1, x1: 1, fn: (_x, p) => Math.log2(p.S) },
    ],
    readouts: (p) => {
      const H = p.J * Math.log2(p.S);
      return [
        { label: "H′ شانون", value: `${f2(H)} bit`, color: "#f2a83b" },
        { label: "H′max", value: `${f2(Math.log2(p.S))} bit`, color: "#35d3c2", sub: "log₂ S" },
        { label: "یکنواختی Pielou", value: f2(p.J), color: "#a5d95c", sub: "H′/H′max" },
        { label: "تنوع بالای اکوسیستم", value: "H′ > 3", color: "#56b8ff" },
        { label: "آلودگی/تخریب", value: "H′ افت می‌کند", color: "#ff6f61" },
        { label: "پایش", value: "شاخص سلامت اکوسیستم", color: "#e9f6f3" },
      ];
    },
    protocol: ["H′ در J=0.8", "اثر تعداد گونه", "یکنواختی کامل", "پایش سلامت"],
    hint: "تنوع هم به تعداد گونه وابسته است هم به یکنواختی فراوانی‌ها — جنگل سالم H′ بالای ۳ دارد.",
  },
  "b-markrecapture": {
    formula: "N = M·C/R — برآورد لینکلن–پترسن",
    xLabel: "R (بازگیری نشان‌دار)", yLabel: "N برآوردی",
    params: [
      P("M", "نشان‌گذاری اولیه M", 20, 300, 10, 100, "", "#35d3c2", 0),
      P("C", "صید دوم C", 20, 300, 10, 120, "", "#56b8ff", 0),
      P("R", "بازگیری نشان‌دار R", 2, 100, 1, 25, "", "#f2a83b", 0),
    ],
    curves: [
      { name: "N(R)", color: "#f2a83b", x0: 2, x1: 100, fn: (x, p) => (p.M * p.C) / x, markerKey: "R", markerLabel: "R" },
    ],
    readouts: (p) => {
      const N = (p.M * p.C) / p.R;
      const se = N * Math.sqrt(1 / p.R + 1 / p.C + 1 / p.M);
      return [
        { label: "برآورد N", value: f0(N), color: "#f2a83b" },
        { label: "خطای معیار", value: `±${f0(se)}`, color: "#35d3c2", sub: "بازگیری بیشتر → دقیق‌تر" },
        { label: "نسبت بازگیری", value: `${f1((p.R / p.C) * 100)} ٪`, color: "#a5d95c" },
        { label: "فروض", value: "بسته‌بودن جمعیت، اختلاط کامل", color: "#56b8ff" },
        { label: "اثر حذف نشان", value: "N بیش‌برآورد", color: "#ff6f61" },
        { label: "اصلاح چپمن", value: "برای R کوچک", color: "#e9f6f3" },
      ];
    },
    protocol: ["برآورد N", "حساسیت به R", "اثر M و C", "فروض روش"],
    hint: "هرچه بازگیری نشان‌دارها کمتر باشد، جمعیت بزرگ‌تر برآورد می‌شود — ولی خطا هم بالا می‌رود.",
  },
  "b-stomata": {
    formula: "تعرق = g·(VPD) — روزنه‌ها و هدایت",
    xLabel: "نور (µmol/m²·s)", yLabel: "هدایت روزنه‌ای",
    params: [
      P("co2", "CO₂ محیط", 200, 800, 20, 400, "ppm", "#35d3c2", 0),
      P("vpd", "کسری رطوبت VPD", 0.5, 4, 0.25, 1.5, "kPa", "#56b8ff", 2),
    ],
    curves: [
      { name: "هدایت(نور)", color: "#a5d95c", x0: 0, x1: 1500, fn: (x, p) => 400 * (x / (x + 200)) * (400 / p.co2) / (1 + 0.15 * (p.vpd - 1.5)) },
      { name: "CO₂=800", color: "#8fbcb8", x0: 0, x1: 1500, fn: (x, p) => 400 * (x / (x + 200)) * (400 / 800) / (1 + 0.15 * (p.vpd - 1.5)) },
    ],
    readouts: (p) => [
      { label: "هدایت در نور اشباع", value: f0(400 * (400 / p.co2) / (1 + 0.15 * (p.vpd - 1.5))), color: "#a5d95c", sub: "mmol/m²·s" },
      { label: "اثر CO₂ بالا", value: "بسته‌شدن روزنه", color: "#35d3c2" },
      { label: "اثر VPD", value: "خشکی → بسته‌شدن", color: "#f2a83b" },
      { label: "سازش", value: "فتوسنتز vs از دست دادن آب", color: "#56b8ff" },
      { label: "اسید abscisic", value: "هورمون تنش آبی", color: "#ff6f61" },
      { label: "گیاهان CAM", value: "روزنه شبانه", color: "#e9f6f3" },
    ],
    protocol: ["پاسخ به نور", "اثر CO₂", "اثر خشکی VPD", "سازش آبی"],
    hint: "روزنه‌ها تعادل ظریف‌اند: باز برای CO₂، بسته برای حفظ آب. CO₂ بالا و خشکی هر دو آن‌ها را می‌بندند.",
  },
  "b-photoperiod": {
    formula: "پاسخ گلدهی به طول روز — فتوپریودیسم",
    xLabel: "طول روز (ساعت)", yLabel: "پاسخ گلدهی",
    params: [P("crit", "طول روز بحرانی", 8, 16, 0.5, 12, "ساعت", "#f2a83b", 1)],
    curves: [
      { name: "روزبلند", color: "#f2a83b", x0: 6, x1: 18, fn: (x, p) => 100 / (1 + Math.exp(-(x - p.crit) * 1.5)) },
      { name: "روزکوتاه", color: "#56b8ff", x0: 6, x1: 18, fn: (x, p) => 100 / (1 + Math.exp((x - p.crit) * 1.5)) },
      { name: "بحرانی", color: "#8fbcb8", x0: 6, x1: 18, fn: (_x, p) => 50 },
    ],
    readouts: (p) => [
      { label: "طول روز بحرانی", value: `${f1(p.crit)} ساعت`, color: "#f2a83b" },
      { label: "گیاه روزبلند", value: "گل در روز > بحرانی", color: "#f2a83b", sub: "گندم، اسفناج" },
      { label: "گیاه روزکوتاه", value: "گل در روز < بحرانی", color: "#56b8ff", sub: "برنج، گل داوودی" },
      { label: "گیرنده نور", value: "فیتوکروم", color: "#a5d95c", sub: "قرمز/قرمز-دور" },
      { label: "فلوریژن", value: "سیگنال FT در آوند", color: "#35d3c2" },
      { label: "اندازه‌گیری", value: "طول شب، نه روز!", color: "#e9f6f3" },
    ],
    protocol: ["منحنی روزبلند", "منحنی روزکوتاه", "نقطه بحرانی", "نقش فیتوکروم"],
    hint: "گیاه در واقع طول شب را اندازه می‌گیرد — فلش نور در نیمه‌شب، گیاه روزکوتاه را فریب می‌دهد.",
  },
  "b-lengthtension": {
    formula: "کشش–طول سارکومر — هم‌پوشانی اکتین/میوزین",
    xLabel: "طول سارکومر (µm)", yLabel: "کشش ٪",
    params: [P("lopt", "طول بهینه", 2.0, 2.4, 0.05, 2.2, "µm", "#f2a83b", 2)],
    curves: [
      { name: "کشش(طول)", color: "#f2a83b", x0: 1.5, x1: 3.6, fn: (x, p) => { const d = Math.abs(x - p.lopt); return 100 * Math.exp(-(d * d) / (2 * 0.45 * 0.45)) * (x < 1.9 ? Math.max(0, (x - 1.5) / 0.4) : 1); } },
    ],
    readouts: (p) => [
      { label: "طول بهینه", value: `${f2(p.lopt)} µm`, color: "#f2a83b", sub: "هم‌پوشانی بیشینه" },
      { label: "کشش در ۳٫۶µm", value: "۰ ٪", color: "#ff6f61", sub: "بدون هم‌پوشانی" },
      { label: "کشش در ۱٫۶µm", value: "افت — تداخل فیلامان", color: "#56b8ff" },
      { label: "پل‌های عرضی", value: "میوزین–اکتین", color: "#a5d95c" },
      { label: "سارکومر قلب", value: "≈ 2.2 µm", color: "#35d3c2" },
      { label: "مدل", value: "فیلامان لغزان", color: "#e9f6f3" },
    ],
    protocol: ["قله در طول بهینه", "افت در کشش زیاد", "افت در کوتاه‌شدن", "مبنای مولکولی"],
    hint: "کشش به هم‌پوشانی اکتین و میوزین وابسته است — خیلی کوتاه یا خیلی بلند، پل عرضی کم می‌شود.",
  },
  "b-nitrogen": {
    formula: "چرخه نیتروژن — تثبیت در برابر دنیتریفیکاسیون",
    xLabel: "t (سال)", yLabel: "N خاک (kg/هکتار)",
    params: [
      P("fix", "تثبیت سالانه", 5, 100, 5, 30, "kg/ha", "#35d3c2", 0),
      P("den", "دنیتریفیکاسیون", 0.05, 0.5, 0.05, 0.15, "/سال", "#ff6f61", 2),
    ],
    curves: [
      { name: "N خاک(t)", color: "#a5d95c", x0: 0, x1: 50, fn: (x, p) => { const nss = p.fix / p.den; return nss * (1 - Math.exp(-p.den * x)) + 100 * Math.exp(-p.den * x); } },
      { name: "ظرفیت تعادل", color: "#8fbcb8", x0: 0, x1: 50, fn: (_x, p) => p.fix / p.den },
    ],
    readouts: (p) => [
      { label: "تعادل N", value: `${f0(p.fix / p.den)} kg/ha`, color: "#a5d95c", sub: "تثبیت/دنیتریفیکاسیون" },
      { label: "زمان رسیدن به ۶۳٪", value: `${f1(1 / p.den)} سال`, color: "#f2a83b" },
      { label: "تثبیت زیستی", value: "ریزوبیوم، سیانوباکتر", color: "#35d3c2" },
      { label: "کود شیمیایی (هابر)", value: "+۱۰۰ kg/ha", color: "#56b8ff" },
      { label: "شستشوی نیترات", value: "آلودگی آب", color: "#ff6f61" },
      { label: "نیتریفیکاسیون", value: "NH₄⁺→NO₃⁻", color: "#e9f6f3" },
    ],
    protocol: ["تعادل دینامیک", "اثر تثبیت", "اثر دنیتریفیکاسیون", "اثر کود"],
    hint: "مخزن N خاک به سمت تعادل تثبیت/ازدست حرکت می‌کند — کود زیاد، تعادل را به سمت شستشو می‌برد.",
  },
  "b-plaque": {
    formula: "تیتر = پلاک‌ها / (رقت × حجم) — PFU/mL",
    xLabel: "log₁₀ رقت", yLabel: "پلاک‌ها",
    params: [
      P("titer", "log تیتر واقعی", 5, 10, 0.2, 8, "", "#f2a83b", 1),
      P("vol", "حجم کشت", 0.05, 0.2, 0.05, 0.1, "mL", "#35d3c2", 2),
    ],
    curves: [
      { name: "پلاک‌های قابل شمارش", color: "#f2a83b", x0: 3, x1: 10, fn: (x, p) => Math.pow(10, p.titer) * Math.pow(10, -x) * p.vol },
      { name: "سقف شمارش ۳۰۰", color: "#8fbcb8", x0: 3, x1: 10, fn: () => 300 },
    ],
    readouts: (p) => {
      const t = Math.pow(10, p.titer);
      return [
        { label: "تیتر", value: sci(t) + " PFU/mL", color: "#f2a83b" },
        { label: "رقت بهینه", value: `10^−${f0(p.titer + Math.log10(p.vol) + 2)}`, color: "#35d3c2", sub: "۳۰–۳۰۰ پلاک" },
        { label: "در رقت 10⁻⁶", value: f0(t * 1e-6 * p.vol), color: "#a5d95c" },
        { label: "محدوده معتبر", value: "30–300 پلاک", color: "#56b8ff" },
        { label: "باکتریوفاژ", value: "لیز میزبان", color: "#e9f6f3" },
        { label: "T4 فاژ", value: "~10¹⁰ PFU/mL", color: "#e9f6f3" },
      ];
    },
    protocol: ["شمارش پلاک", "یافتن رقت بهینه", "محاسبه تیتر", "محدوده ۳۰–۳۰۰"],
    hint: "فقط پلیت‌های ۳۰ تا ۳۰۰ پلاک قابل استنادند — خیلی پر یا خیلی خالی، تیتر را خطا می‌اندازد.",
  },
};

/* ================================================================ */
/* ELECTRONICS — 5 advanced parametric experiments                  */
/* ================================================================ */
const ELEC: Record<string, LabSpecDef> = {
  "e-diodeiv": {
    formula: "I = Is·(e^(V/nVt) − 1) — معادله شاکلی",
    xLabel: "V (V)", yLabel: "I (mA)",
    params: [
      P("n", "ضریب ایده‌آلی n", 1, 2, 0.1, 1.2, "", "#35d3c2", 1),
      P("V", "ولتاژ بایاس", 0.2, 0.9, 0.01, 0.65, "V", "#f2a83b", 2),
      P("T", "دما", 250, 400, 5, 300, "K", "#56b8ff", 0),
    ],
    curves: [
      { name: "I(V)", color: "#f2a83b", x0: 0, x1: 0.9, fn: (x, p) => { const Vt = (1.38e-23 * p.T) / 1.6e-19; const Is = 1e-12 * Math.exp((p.T - 300) / 12); return Is * (Math.exp(x / (p.n * Vt)) - 1) * 1000; }, markerKey: "V", markerLabel: "V" },
    ],
    readouts: (p) => {
      const Vt = (1.38e-23 * p.T) / 1.6e-19;
      const Is = 1e-12 * Math.exp((p.T - 300) / 12);
      const I = Is * (Math.exp(p.V / (p.n * Vt)) - 1) * 1000;
      return [
        { label: "جریان I", value: `${f2(I)} mA`, color: "#f2a83b" },
        { label: "ولتاژ حرارتی Vt", value: `${f1(Vt * 1000)} mV`, color: "#35d3c2", sub: "kT/q ≈ 26mV" },
        { label: "مقاومت دینامیکی", value: `${f1((p.n * Vt) / Math.max(I * 1e-3, 1e-12))} Ω`, color: "#a5d95c", sub: "nVt/I" },
        { label: "V زانو سیلیسیم", value: "≈ 0.7 V", color: "#56b8ff" },
        { label: "اثر دما", value: "ΔV ≈ −2 mV/°C", color: "#ff6f61" },
        { label: "Is", value: sci(Is), color: "#e9f6f3", sub: "جریان اشباع" },
      ];
    },
    protocol: ["زانوی ۰٫۷ ولت", "رشد نمایی", "مقاومت دینامیکی", "اثر دما"],
    hint: "جریان دیود نمایی است؛ بالای زانو، هر ۶۰mV/n جریان ده‌برابر می‌شود. دما زانو را پایین می‌آورد.",
  },
  "e-thevenin": {
    formula: "Vth = Vs·R₂/(R₁+R₂)  ,  Rth = R₁‖R₂  ,  Pmax در RL=Rth",
    xLabel: "RL (Ω)", yLabel: "P (mW)",
    params: [
      P("Vs", "ولتاژ منبع", 3, 24, 0.5, 12, "V", "#f2a83b", 1),
      P("R1", "R₁", 10, 500, 10, 100, "Ω", "#35d3c2", 0),
      P("R2", "R₂", 10, 500, 10, 200, "Ω", "#56b8ff", 0),
    ],
    curves: [
      { name: "توان بار", color: "#f2a83b", x0: 5, x1: 600, fn: (x, p) => { const vth = (p.Vs * p.R2) / (p.R1 + p.R2); const rth = (p.R1 * p.R2) / (p.R1 + p.R2); const v = (vth * x) / (rth + x); return (v * v / x) * 1000; } },
    ],
    readouts: (p) => {
      const vth = (p.Vs * p.R2) / (p.R1 + p.R2);
      const rth = (p.R1 * p.R2) / (p.R1 + p.R2);
      return [
        { label: "Vth", value: `${f2(vth)} V`, color: "#f2a83b" },
        { label: "Rth", value: `${f0(rth)} Ω`, color: "#35d3c2", sub: "R₁R₂/(R₁+R₂)" },
        { label: "Pmax", value: `${f1((vth * vth / (4 * rth)) * 1000)} mW`, color: "#a5d95c", sub: "در RL = Rth" },
        { label: "RL برای Pmax", value: `${f0(rth)} Ω`, color: "#56b8ff" },
        { label: "اتلاف در Rth", value: "۵۰٪ در Pmax", color: "#ff6f61" },
        { label: "مدل", value: "منبع ولتاژ + سری Rth", color: "#e9f6f3" },
      ];
    },
    protocol: ["محاسبه Vth و Rth", "قله توان در RL=Rth", "قضیه Pmax", "بازده ۵۰٪"],
    hint: "بیشینه توان وقتی منتقل می‌شود که RL = Rth — اما بازده فقط ۵۰٪ است؛ برای انتقال توان، نه بازده.",
  },
  "e-transformer": {
    formula: "V₂/V₁ = N₂/N₁  ,  Z₂ = Z₁·(N₂/N₁)²",
    xLabel: "نسبت دور N₂/N₁", yLabel: "V₂ (V)",
    params: [
      P("V1", "ولتاژ اولیه", 12, 240, 2, 220, "V", "#f2a83b", 0),
      P("n", "نسبت دور N₂/N₁", 0.05, 3, 0.05, 0.05, "", "#35d3c2", 2),
    ],
    curves: [
      { name: "V₂(n)", color: "#f2a83b", x0: 0.05, x1: 3, fn: (x, p) => p.V1 * x, markerKey: "n", markerLabel: "n" },
      { name: "V₁", color: "#8fbcb8", x0: 0.05, x1: 3, fn: (_x, p) => p.V1 },
    ],
    readouts: (p) => [
      { label: "V₂", value: `${f1(p.V1 * p.n)} V`, color: "#f2a83b" },
      { label: "I₂/I₁", value: f2(1 / p.n), color: "#35d3c2", sub: "عکس نسبت دور" },
      { label: "نوع", value: p.n < 1 ? "کاهنده (شبکه→خانه)" : p.n > 1 ? "افزاینده" : "ایزوله 1:1", color: "#a5d95c" },
      { label: "انتقال امپدانس", value: `×${f2(p.n * p.n)}`, color: "#56b8ff", sub: "n²" },
      { label: "توان (ایده‌آل)", value: "ثابت", color: "#e9f6f3", sub: "V₁I₁ = V₂I₂" },
      { label: "شبکه ایران", value: "230V / 50Hz", color: "#e9f6f3" },
    ],
    protocol: ["کاهنده ۲۲۰→۱۲", "افزاینده", "انتقال امپدانس n²", "پایستگی توان"],
    hint: "ترانسفورماتور ولتاژ را با نسبت دور تبدیل و جریان را عکس آن — توان تقریباً ثابت می‌ماند.",
  },
  "e-filterorder": {
    formula: "|H| = 1/√(1+(f/fc)^(2n)) — مرتبه فیلتر",
    xLabel: "f/fc", yLabel: "بهره (dB)",
    params: [P("n", "مرتبه فیلتر", 1, 6, 1, 2, "", "#f2a83b", 0)],
    curves: [
      { name: "|H|(dB)", color: "#f2a83b", x0: 0.1, x1: 100, fn: (x, p) => 20 * Math.log10(1 / Math.sqrt(1 + Math.pow(x, 2 * p.n))) },
      { name: "مرتبه ۱", color: "#8fbcb8", x0: 0.1, x1: 100, fn: (x) => 20 * Math.log10(1 / Math.sqrt(1 + x * x)) },
      { name: "−3dB", color: "#ff6f61", x0: 0.1, x1: 100, fn: () => -3 },
    ],
    readouts: (p) => [
      { label: "شیب توقف", value: `${f0(20 * p.n)} dB/dekade`, color: "#f2a83b", sub: "20n" },
      { label: "بهره در 10fc", value: `${f1(-20 * p.n)} dB`, color: "#35d3c2" },
      { label: "در fc", value: "−3 dB (همه مراتب)", color: "#a5d95c" },
      { label: "باترورث", value: "ماکزیمم تخت", color: "#56b8ff" },
      { label: "فاز در fc", value: `−${f0(45 * p.n)}°`, color: "#e9f6f3" },
      { label: "پله‌گذاری", value: "نوسان با مرتبه بالا", color: "#e9f6f3" },
    ],
    protocol: ["شیب ۲۰n dB/dek", "تقاطع −3dB", "مقایسه مراتب", "انتخاب مرتبه"],
    hint: "هر مرتبه ۲۰dB/دهه به شیب می‌افزاید. در fc همه فیلترها −3dBاند — فرق فقط در شیب توقف است.",
  },
  "e-impedance": {
    formula: "Z = √(R² + (XL−XC)²)  ,  f₀ = 1/(2π√LC)",
    xLabel: "f (Hz)", yLabel: "Z (Ω)",
    params: [
      P("R", "مقاومت", 5, 200, 5, 50, "Ω", "#f2a83b", 0),
      P("L", "سلف", 1, 100, 1, 25, "mH", "#35d3c2", 0),
      P("C", "خازن", 0.1, 20, 0.1, 2, "µF", "#56b8ff", 1),
    ],
    curves: [
      { name: "Z(f)", color: "#f2a83b", x0: 10, x1: 3000, fn: (x, p) => { const xl = 2 * Math.PI * x * p.L * 1e-3; const xc = 1 / (2 * Math.PI * x * p.C * 1e-6); return Math.sqrt(p.R * p.R + (xl - xc) ** 2); } },
      { name: "حداقل = R", color: "#8fbcb8", x0: 10, x1: 3000, fn: (_x, p) => p.R },
    ],
    readouts: (p) => {
      const fr0 = 1 / (2 * Math.PI * Math.sqrt(p.L * 1e-3 * p.C * 1e-6));
      const Q = (2 * Math.PI * fr0 * p.L * 1e-3) / p.R;
      return [
        { label: "فرکانس تشدید f₀", value: `${f0(fr0)} Hz`, color: "#f2a83b" },
        { label: "Z در f₀", value: `${f0(p.R)} Ω`, color: "#35d3c2", sub: "= R (خالص اهمی)" },
        { label: "ضریب کیفیت Q", value: f1(Q), color: "#a5d95c", sub: "ω₀L/R" },
        { label: "پهنای باند", value: `${f0(fr0 / Q)} Hz`, color: "#56b8ff", sub: "f₀/Q" },
        { label: "زیر f₀", value: "خازنی (φ<0)", color: "#e9f6f3" },
        { label: "بالای f₀", value: "سلفی (φ>0)", color: "#e9f6f3" },
      ];
    },
    protocol: ["حداقل Z در f₀", "اثر R بر Q", "پهنای باند", "رفتار خازنی/سلفی"],
    hint: "در تشدید، XL و XC یکدیگر را خنثی می‌کنند و Z به R می‌رسد — R کمتر یعنی Q بالاتر و پهنای باند باریک‌تر.",
  },
};

/* ================================================================ */
/* MEDICINE — 22 clinical-quantitative experiments                  */
/* ================================================================ */
const MED: Record<string, LabSpecDef> = {
  "m-cardiacoutput": {
    formula: "CO = HR × SV  —  اصل فیک",
    xLabel: "HR (bpm)", yLabel: "CO (L/min)",
    params: [
      P("sv", "حجم ضربه‌ای SV", 40, 120, 5, 70, "mL", "#f2a83b", 0),
      P("hr", "ضربان", 40, 180, 2, 72, "bpm", "#35d3c2", 0),
    ],
    curves: [
      { name: "CO(HR)", color: "#f2a83b", x0: 40, x1: 180, fn: (x, p) => (x * p.sv) / 1000, markerKey: "hr", markerLabel: "HR" },
    ],
    readouts: (p) => [
      { label: "برون‌ده قلبی", value: `${f1((p.hr * p.sv) / 1000)} L/min`, color: "#f2a83b" },
      { label: "شاخص قلبی", value: `${f2((p.hr * p.sv) / 1000 / 1.7)} L/min/m²`, color: "#35d3c2", sub: "نرمال 2.5–4" },
      { label: "اصل فیک", value: "CO = V̇O₂/(Ca−Cv)", color: "#a5d95c" },
      { label: "ورزش", value: "CO تا 25 L/min", color: "#56b8ff" },
      { label: "نارسایی", value: "CO < 4", color: "#ff6f61" },
      { label: "کنترل", value: "سمپاتیک + فرانک‌استارلینگ", color: "#e9f6f3" },
    ],
    protocol: ["CO در استراحت", "اثر HR", "اثر SV", "شاخص قلبی"],
    hint: "برون‌ده قلبی حاصل‌ضرب ضربان در حجم ضربه‌ای است — در ورزش هر دو بالا می‌روند.",
  },
  "m-starling": {
    formula: "SV = f(EDV) — قانون فرانک–استارلینگ",
    xLabel: "EDV (mL)", yLabel: "SV (mL)",
    params: [
      P("cont", "انقباض‌پذیری", 0.5, 2.5, 0.1, 1.4, "", "#35d3c2", 1),
      P("edv", "حجم پایان‌دیاستول", 80, 200, 5, 130, "mL", "#f2a83b", 0),
    ],
    curves: [
      { name: "SV(EDV)", color: "#f2a83b", x0: 80, x1: 200, fn: (x, p) => p.cont * 60 * (1 - Math.exp(-(x - 50) / 45)), markerKey: "edv", markerLabel: "EDV" },
      { name: "نارسایی (cont↓)", color: "#8fbcb8", x0: 80, x1: 200, fn: (x) => 0.7 * 60 * (1 - Math.exp(-(x - 50) / 45)) },
    ],
    readouts: (p) => {
      const sv = p.cont * 60 * (1 - Math.exp(-(p.edv - 50) / 45));
      return [
        { label: "SV", value: `${f0(sv)} mL`, color: "#f2a83b" },
        { label: "EF", value: `${f0((sv / p.edv) * 100)} ٪`, color: "#35d3c2", sub: "نرمال ≥ 55٪" },
        { label: "ESV", value: `${f0(p.edv - sv)} mL`, color: "#56b8ff" },
        { label: "مکانیسم", value: "کشش سارکومر → پل عرضی بیشتر", color: "#a5d95c" },
        { label: "پیش‌بار ↑", value: "SV ↑ (جبران)", color: "#e9f6f3" },
        { label: "دوپامین", value: "cont ↑ → منحنی بالاتر", color: "#ff6f61" },
      ];
    },
    protocol: ["منحنی استارلینگ", "EF در EDV", "اثر انقباض‌پذیری", "نارسایی"],
    hint: "قلب هرچه بیشتر پر شود، محکم‌تر می‌تپد — مکانیسم تطابق خروجی دو بطن. نارسایی، کل منحنی را پایین می‌آورد.",
  },
  "m-intervals": {
    formula: "QTc = QT/√RR — اصلاح بازت (Bazett)",
    xLabel: "HR (bpm)", yLabel: "QTc (ms)",
    params: [
      P("qt", "QT اندازه‌گیری", 300, 500, 5, 400, "ms", "#f2a83b", 0),
      P("hr", "ضربان", 40, 140, 2, 70, "bpm", "#35d3c2", 0),
    ],
    curves: [
      { name: "QTc(HR)", color: "#f2a83b", x0: 40, x1: 140, fn: (x, p) => p.qt / Math.sqrt(60 / x), markerKey: "hr", markerLabel: "HR" },
      { name: "مرز 450ms", color: "#ff6f61", x0: 40, x1: 140, fn: () => 450 },
      { name: "مرز 470ms (زن)", color: "#f2a83b", x0: 40, x1: 140, fn: () => 470 },
    ],
    readouts: (p) => {
      const qtc = p.qt / Math.sqrt(60 / p.hr);
      return [
        { label: "QTc", value: `${f0(qtc)} ms`, color: qtc > 450 ? "#ff6f61" : "#a5d95c", sub: qtc > 500 ? "خطر Torsades!" : qtc > 450 ? "طولانی" : "نرمال" },
        { label: "RR", value: `${f0(60000 / p.hr)} ms`, color: "#35d3c2" },
        { label: "PR نرمال", value: "120–200 ms", color: "#56b8ff" },
        { label: "QRS نرمال", value: "< 120 ms", color: "#e9f6f3" },
        { label: "داروهای QT‌ساز", value: "ماکرولیدها، ضدآریتمی", color: "#ff6f61" },
        { label: "هیپوکالمی", value: "QT طولانی", color: "#e9f6f3" },
      ];
    },
    protocol: ["محاسبه QTc", "مرز ۴۵۰", "اثر تاکی‌کاردی", "QT>500"],
    hint: "QT با ضربان کوتاه می‌شود — Bazett آن را به ضربان ۶۰ نرمال می‌کند. QTc بالای ۵۰۰ خطر آریتمی جدی است.",
  },
  "m-ventilation": {
    formula: "V̇A = (VT − VD) × f — تهویه آلوئولی",
    xLabel: "f (تنفس/دقیقه)", yLabel: "V̇ (L/min)",
    params: [
      P("vt", "حجم جاری VT", 150, 800, 25, 500, "mL", "#f2a83b", 0),
      P("vd", "فضای مرده VD", 100, 250, 10, 150, "mL", "#56b8ff", 0),
      P("f", "تعداد تنفس", 6, 40, 1, 14, "/دقیقه", "#35d3c2", 0),
    ],
    curves: [
      { name: "V̇A(f)", color: "#a5d95c", x0: 6, x1: 40, fn: (x, p) => ((p.vt - p.vd) * x) / 1000, markerKey: "f", markerLabel: "f" },
      { name: "V̇E دقیقه‌ای", color: "#8fbcb8", x0: 6, x1: 40, fn: (x, p) => (p.vt * x) / 1000 },
    ],
    readouts: (p) => {
      return [
        { label: "تهویه آلوئولی", value: `${f1(((p.vt - p.vd) * p.f) / 1000)} L/min`, color: "#a5d95c" },
        { label: "تهویه دقیقه‌ای", value: `${f1((p.vt * p.f) / 1000)} L/min`, color: "#35d3c2" },
        { label: "نسبت VD/VT", value: f2(p.vd / p.vt), color: "#f2a83b", sub: "نرمال ≈ 0.3" },
        { label: "تنفس سطحی سریع", value: "V̇A افت می‌کند!", color: "#ff6f61", sub: "فضای مرده ثابت" },
        { label: "PaCO₂", value: "∝ 1/V̇A", color: "#56b8ff" },
        { label: "نرمال V̇A", value: "≈ 4–5 L/min", color: "#e9f6f3" },
      ];
    },
    protocol: ["V̇A نرمال", "تنفس کم‌عمق سریع", "اثر VD", "رابطه با PaCO₂"],
    hint: "ده تنفس ۵۰۰ میلی‌لیتری بهتر از ۲۵ تنفس ۲۰۰ میلی‌لیتری است — فضای مرده هر بار هدر می‌رود.",
  },
  "m-aagradient": {
    formula: "PAO₂ = FiO₂(Patm−PH₂O) − PaCO₂/R  ,  A-a = PAO₂ − PaO₂",
    xLabel: "سن (سال)", yLabel: "A-a (mmHg)",
    params: [
      P("fio2", "FiO₂", 0.21, 1, 0.01, 0.21, "", "#35d3c2", 2),
      P("pao2", "PaO₂ اندازه‌گیری", 50, 120, 1, 90, "mmHg", "#f2a83b", 0),
      P("paco2", "PaCO₂", 25, 60, 1, 40, "mmHg", "#56b8ff", 0),
    ],
    curves: [
      { name: "A-a شما", color: "#f2a83b", x0: 20, x1: 80, fn: (_x, p) => { const pao2alv = p.fio2 * (760 - 47) - p.paco2 / 0.8; return pao2alv - p.pao2; } },
      { name: "نرمال (سن/4+4)", color: "#8fbcb8", x0: 20, x1: 80, fn: (x) => x / 4 + 4 },
    ],
    readouts: (p) => {
      const pao2alv = p.fio2 * (760 - 47) - p.paco2 / 0.8;
      const aa = pao2alv - p.pao2;
      return [
        { label: "PAO₂ آلوئولی", value: `${f0(pao2alv)} mmHg`, color: "#35d9c2" },
        { label: "A-a گرادیان", value: `${f0(aa)} mmHg`, color: aa > 25 ? "#ff6f61" : "#a5d95c", sub: aa > 25 ? "افزایش — مشکل تبادل" : "نرمال" },
        { label: "افتراق", value: aa > 25 ? "شانت/V-Q" : "هیپوونتیلاسیون", color: "#56b8ff" },
        { label: "نرمال", value: "سن/4 + 4", color: "#e9f6f3" },
        { label: "R تنفسی", value: "0.8", color: "#e9f6f3" },
        { label: "در ارتفاع", value: "PAO₂ کم می‌شود", color: "#f2a83b" },
      ];
    },
    protocol: ["محاسبه PAO₂", "A-a نرمال", "افزایش در بیماری", "افتراق علت‌ها"],
    hint: "A-a بالا یعنی مشکل تبادل گاز (شانت، V/Q نابرابر)؛ A-a نرمال با هیپوکسمی یعنی هیپوونتیلاسیون.",
  },
  "m-compliance": {
    formula: "C = ΔV/ΔP — انعطاف‌پذیری ریه",
    xLabel: "P (cmH₂O)", yLabel: "V (L)",
    params: [
      P("c", "انعطاف‌پذیری C", 0.1, 0.4, 0.02, 0.2, "L/cmH₂O", "#f2a83b", 2),
      P("p", "فشار دمی", 5, 35, 1, 20, "cmH₂O", "#35d3c2", 0),
    ],
    curves: [
      { name: "V(P)", color: "#f2a83b", x0: 0, x1: 40, fn: (x, p) => 6 / (1 + Math.exp(-(x - 18) / (6 * p.c * 5))) * (0.3 + p.c * 2), markerKey: "p", markerLabel: "P" },
      { name: "فیبروز (C↓)", color: "#8fbcb8", x0: 0, x1: 40, fn: (x) => 6 / (1 + Math.exp(-(x - 18) / 4)) * 0.9 },
    ],
    readouts: (p) => [
      { label: "انعطاف‌پذیری", value: `${f2(p.c)} L/cmH₂O`, color: "#f2a83b" },
      { label: "حجم در P دمی", value: `${f1(6 / (1 + Math.exp(-(p.p - 18) / (6 * p.c * 5))) * (0.3 + p.c * 2))} L`, color: "#35d3c2" },
      { label: "فیبروز", value: "C کم — ریه سفت", color: "#ff6f61" },
      { label: "آمفیزم", value: "C زیاد — ارتجاع کم", color: "#56b8ff" },
      { label: "سورفکتانت", value: "C را بالا می‌برد", color: "#a5d95c" },
      { label: "هیسترزیس", value: "دم ≠ بازدم", color: "#e9f6f3" },
    ],
    protocol: ["منحنی P-V", "اثر C", "فیبروز vs آمفیزم", "شیب = C"],
    hint: "شیب منحنی فشار-حجم همان انعطاف‌پذیری است — فیبروز آن را کم و آمفیزم (با از دست رفتن ارتجاع) زیاد می‌کند.",
  },
  "m-acidbase": {
    formula: "pH = 6.1 + log₁₀(HCO₃⁻ / 0.03×PaCO₂) — هندرسون–هاسل‌بالخ",
    xLabel: "PaCO₂ (mmHg)", yLabel: "pH",
    params: [
      P("hco3", "HCO₃⁻", 10, 40, 1, 24, "mEq/L", "#35d3c2", 0),
      P("pco2", "PaCO₂", 20, 80, 1, 40, "mmHg", "#f2a83b", 0),
    ],
    curves: [
      { name: "pH(PaCO₂)", color: "#f2a83b", x0: 20, x1: 80, fn: (x, p) => 6.1 + Math.log10(p.hco3 / (0.03 * x)), markerKey: "pco2", markerLabel: "PaCO₂" },
      { name: "pH = 7.4", color: "#8fbcb8", x0: 20, x1: 80, fn: () => 7.4 },
    ],
    readouts: (p) => {
      const ph = 6.1 + Math.log10(p.hco3 / (0.03 * p.pco2));
      const dx = ph < 7.35 ? (p.pco2 > 45 ? "اسیدوز تنفسی" : "اسیدوز متابولیک") : ph > 7.45 ? (p.pco2 < 35 ? "آلکالوز تنفسی" : "آلکالوز متابولیک") : "نرمال";
      return [
        { label: "pH", value: f2(ph), color: ph < 7.35 || ph > 7.45 ? "#ff6f61" : "#a5d95c" },
        { label: "تشخیص", value: dx, color: "#f2a83b" },
        { label: "جبران", value: dx.includes("تنفسی") ? "کلیوی (HCO₃)" : dx.includes("متابولیک") ? "تنفسی (PaCO₂)" : "—", color: "#35d3c2" },
        { label: "بافر بیکربنات", value: "pKa = 6.1", color: "#56b8ff" },
        { label: "هیپرونتیلاسیون", value: "PaCO₂ ↓ → pH ↑", color: "#e9f6f3" },
        { label: "حد حیات", value: "6.8 – 7.8", color: "#ff6f61" },
      ];
    },
    protocol: ["pH نرمال", "اسیدوز تنفسی", "متابولیک با HCO₃", "جبران"],
    hint: "PaCO₂ بالا اسیدوز تنفسی، HCO₃ پایین اسیدوز متابولیک. بدن یکی را تغییر می‌دهد تا آن‌یکی را جبران کند.",
  },
  "m-aniongap": {
    formula: "AG = Na⁺ − (Cl⁻ + HCO₃⁻)",
    xLabel: "HCO₃⁻ (mEq/L)", yLabel: "AG",
    params: [
      P("na", "Na⁺", 125, 150, 1, 140, "mEq/L", "#f2a83b", 0),
      P("cl", "Cl⁻", 90, 120, 1, 104, "mEq/L", "#56b8ff", 0),
      P("hco3", "HCO₃⁻", 8, 32, 1, 24, "mEq/L", "#35d3c2", 0),
    ],
    curves: [
      { name: "AG(HCO₃⁻)", color: "#f2a83b", x0: 8, x1: 32, fn: (x, p) => p.na - (p.cl + x), markerKey: "hco3", markerLabel: "HCO₃⁻" },
      { name: "مرز 12", color: "#ff6f61", x0: 8, x1: 32, fn: () => 12 },
    ],
    readouts: (p) => {
      const ag = p.na - (p.cl + p.hco3);
      return [
        { label: "Anion Gap", value: f0(ag), color: ag > 12 ? "#ff6f61" : "#a5d95c", sub: ag > 12 ? "افزایش — اسیدهای آلی" : "نرمال 8–12" },
        { label: "علل AG↑", value: "کتواسیدوز، لاکتات، اورمی", color: "#f2a83b", sub: "MUDPILES" },
        { label: "AG نرمال", value: "اسهال، RTA", color: "#56b8ff" },
        { label: "ΔAG/ΔHCO₃", value: f1(ag > 12 ? (ag - 12) / Math.max(1, 24 - p.hco3) : 0), color: "#35d3c2", sub: "اختلال مختلط" },
        { label: "آلبومین", value: "هر 1g↓ → AG 2.5↓", color: "#e9f6f3" },
        { label: "کتون", value: "β-هیدروکسی‌بوتیرات", color: "#e9f6f3" },
      ];
    },
    protocol: ["AG نرمال", "اسیدوز با AG↑", "اثر آلبومین", "ΔAG/ΔHCO₃"],
    hint: "شکاف آنیونی، اسیدهای اندازه‌گیری‌نشده را نشان می‌دهد — در کتواسیدوز دیابتی بالا می‌رود.",
  },
  "m-creatinine": {
    formula: "CrCl = (140−سن)×وزن / (72×Scr) — کوکرافت–گالت",
    xLabel: "Scr (mg/dL)", yLabel: "CrCl (mL/min)",
    params: [
      P("age", "سن", 18, 90, 1, 55, "سال", "#56b8ff", 0),
      P("wt", "وزن", 40, 120, 1, 70, "kg", "#35d3c2", 0),
      P("scr", "کراتینین سرم", 0.5, 6, 0.1, 1.2, "mg/dL", "#f2a83b", 1),
    ],
    curves: [
      { name: "CrCl(Scr)", color: "#f2a83b", x0: 0.5, x1: 6, fn: (x, p) => ((140 - p.age) * p.wt) / (72 * x), markerKey: "scr", markerLabel: "Scr" },
      { name: "مرز 60 (CKD3)", color: "#ff6f61", x0: 0.5, x1: 6, fn: () => 60 },
    ],
    readouts: (p) => {
      const cr = ((140 - p.age) * p.wt) / (72 * p.scr);
      return [
        { label: "CrCl", value: `${f0(cr)} mL/min`, color: cr < 60 ? "#ff6f61" : "#a5d95c" },
        { label: "مرحله CKD", value: cr > 90 ? "1–2 (نرمال)" : cr > 60 ? "3a" : cr > 45 ? "3b" : cr > 30 ? "4" : "5 (نارسایی)", color: cr < 60 ? "#f2a83b" : "#35d3c2" },
        { label: "دوز دارو", value: cr < 50 ? "تعدیل لازم" : "نرمال", color: cr < 50 ? "#f2a83b" : "#e9f6f3" },
        { label: "GFR نرمال", value: "≈ 125 mL/min", color: "#56b8ff" },
        { label: "سیستاتین C", value: "دقیق‌تر از Scr", color: "#e9f6f3" },
        { label: "عضله کم", value: "Scr کاذباً پایین", color: "#e9f6f3" },
      ];
    },
    protocol: ["CrCl پایه", "اثر سن", "مرز CKD", "تعدیل دوز"],
    hint: "کراتینین سرم دیر بالا می‌رود — وقتی ۲ شد، حدود نیمی از نفرون‌ها از دست رفته‌اند.",
  },
  "m-osmolarity": {
    formula: "Osm = 2Na⁺ + Glu/18 + BUN/2.8",
    xLabel: "Na⁺ (mEq/L)", yLabel: "Osm (mOsm/kg)",
    params: [
      P("glu", "گلوکز", 60, 600, 10, 100, "mg/dL", "#f2a83b", 0),
      P("bun", "BUN", 5, 80, 1, 15, "mg/dL", "#56b8ff", 0),
      P("na", "Na⁺", 115, 160, 1, 140, "mEq/L", "#35d3c2", 0),
    ],
    curves: [
      { name: "Osm(Na)", color: "#35d3c2", x0: 115, x1: 160, fn: (x, p) => 2 * x + p.glu / 18 + p.bun / 2.8, markerKey: "na", markerLabel: "Na" },
      { name: "مرز 295", color: "#ff6f61", x0: 115, x1: 160, fn: () => 295 },
    ],
    readouts: (p) => {
      const osm = 2 * p.na + p.glu / 18 + p.bun / 2.8;
      return [
        { label: "اسمولاریته", value: `${f0(osm)} mOsm/kg`, color: osm > 295 ? "#ff6f61" : "#a5d95c" },
        { label: "سهم Na", value: f0(2 * p.na), color: "#35d3c2", sub: "≈ 95٪ کل" },
        { label: "هیپرناترمی", value: p.na > 145 ? "کم‌آبی" : "—", color: p.na > 145 ? "#f2a83b" : "#8fbcb8" },
        { label: "هیپوناترمی", value: p.na < 135 ? "ADH/SIADH" : "—", color: p.na < 135 ? "#f2a83b" : "#8fbcb8" },
        { label: "گپ اسمولار", value: ">10 → سموم", color: "#ff6f61", sub: "متانول، اتیلن‌گلیکول" },
        { label: "ADH", value: "تنظیم‌کننده اصلی", color: "#e9f6f3" },
      ];
    },
    protocol: ["Osm نرمال", "اثر گلوکز بالا", "هیپوناترمی", "گپ اسمولار"],
    hint: "سدیم تقریباً تمام اسمولاریته را تعیین می‌کند. در DKA گلوکز بالا، سدیم را کاذباً پایین نشان می‌دهد.",
  },
  "m-hba1c": {
    formula: "eAG = 28.7×HbA1c − 46.7 — میانگین قند سه‌ماهه",
    xLabel: "HbA1c (٪)", yLabel: "eAG (mg/dL)",
    params: [P("a1c", "HbA1c", 4, 14, 0.1, 5.7, "٪", "#f2a83b", 1)],
    curves: [
      { name: "eAG(A1c)", color: "#f2a83b", x0: 4, x1: 14, fn: (x) => 28.7 * x - 46.7, markerKey: "a1c", markerLabel: "A1c" },
      { name: "مرز دیابت 6.5", color: "#ff6f61", x0: 4, x1: 14, fn: () => 28.7 * 6.5 - 46.7 },
    ],
    readouts: (p) => {
      const eag = 28.7 * p.a1c - 46.7;
      return [
        { label: "میانگین قند تخمینی", value: `${f0(eag)} mg/dL`, color: "#f2a83b" },
        { label: "طبقه‌بندی", value: p.a1c < 5.7 ? "نرمال" : p.a1c < 6.5 ? "پیش‌دیابت" : "دیابت", color: p.a1c < 5.7 ? "#a5d95c" : p.a1c < 6.5 ? "#f2a83b" : "#ff6f61" },
        { label: "هدف درمانی", value: "< 7 ٪", color: "#35d3c2" },
        { label: "عمر گلبول", value: "120 روز", color: "#56b8ff", sub: "مبنای A1c" },
        { label: "گلیکاسیون", value: "هموگلوبین + گلوکز", color: "#e9f6f3" },
        { label: "هر 1٪ افت", value: "−29 mg/dL", color: "#e9f6f3" },
      ];
    },
    protocol: ["تبدیل A1c به eAG", "مرز دیابت", "هدف <7", "مبنای مولکولی"],
    hint: "HbA1c خاطره سه‌ماهه قند خون است — هر یک درصد، حدود ۲۹ میلی‌گرم به میانگین قند اضافه می‌کند.",
  },
  "m-bmibmr": {
    formula: "BMR = 10w + 6.25h − 5a + s — میفلین سنت‌ژور",
    xLabel: "وزن (kg)", yLabel: "BMR (kcal/روز)",
    params: [
      P("h", "قد", 140, 200, 1, 172, "cm", "#35d3c2", 0),
      P("a", "سن", 15, 85, 1, 30, "سال", "#56b8ff", 0),
      P("w", "وزن", 40, 140, 1, 72, "kg", "#f2a83b", 0),
      P("sex", "جنس (1=مرد)", 0, 1, 1, 1, "", "#a5d95c", 0),
    ],
    curves: [
      { name: "BMR(وزن)", color: "#f2a83b", x0: 40, x1: 140, fn: (x, p) => 10 * x + 6.25 * p.h - 5 * p.a + (p.sex ? 5 : -161), markerKey: "w", markerLabel: "وزن" },
    ],
    readouts: (p) => {
      const bmi = p.w / ((p.h / 100) ** 2);
      const bmr = 10 * p.w + 6.25 * p.h - 5 * p.a + (p.sex ? 5 : -161);
      return [
        { label: "BMI", value: f1(bmi), color: bmi < 18.5 || bmi > 30 ? "#ff6f61" : bmi > 25 ? "#f2a83b" : "#a5d95c", sub: bmi < 18.5 ? "کمبود وزن" : bmi < 25 ? "نرمال" : bmi < 30 ? "اضافه وزن" : "چاقی" },
        { label: "BMR", value: `${f0(bmr)} kcal/روز`, color: "#f2a83b" },
        { label: "TDEE (فعالیت 1.55)", value: `${f0(bmr * 1.55)} kcal`, color: "#35d3c2" },
        { label: "کسر کالری", value: "500 kcal → 0.5kg/هفته", color: "#56b8ff" },
        { label: "عضله", value: "BMR را بالا می‌برد", color: "#a5d95c" },
        { label: "سن", value: "هر دهه −2٪", color: "#e9f6f3" },
      ];
    },
    protocol: ["محاسبه BMI", "BMR پایه", "TDEE", "تعادل انرژی"],
    hint: "BMR انرژی زنده‌ماندن در استراحت مطلق است — ۶۰–۷۰٪ کل مصرف روزانه. عضله آن را بالا می‌برد.",
  },
  "m-pharmacokinetics": {
    formula: "C(t) = C₀·e^(−kt)  ,  t½ = 0.693/k — حذف مرتبه اول",
    xLabel: "t (ساعت)", yLabel: "C (mg/L)",
    params: [
      P("c0", "غلظت اولیه", 5, 100, 1, 50, "mg/L", "#f2a83b", 0),
      P("k", "ثابت حذف k", 0.02, 0.5, 0.01, 0.15, "/ساعت", "#35d3c2", 2),
    ],
    curves: [
      { name: "C(t)", color: "#f2a83b", x0: 0, x1: 48, fn: (x, p) => p.c0 * Math.exp(-p.k * x) },
      { name: "نیمه (C₀/2)", color: "#8fbcb8", x0: 0, x1: 48, fn: (_x, p) => p.c0 / 2 },
    ],
    readouts: (p) => [
      { label: "نیمه‌عمر", value: `${f1(0.693 / p.k)} ساعت`, color: "#f2a83b" },
      { label: "C پس از ۲۴ ساعت", value: `${f1(p.c0 * Math.exp(-p.k * 24))} mg/L`, color: "#35d3c2" },
      { label: "زمان حذف ۹۷٪", value: `${f1(5 * 0.693 / p.k)} ساعت`, color: "#a5d95c", sub: "۵ نیمه‌عمر" },
      { label: "فاصله دوز", value: "≈ t½", color: "#56b8ff" },
      { label: "پن‌سیلین", value: "t½ = 0.5 ساعت", color: "#e9f6f3" },
      { label: "دیازپام", value: "t½ = 40 ساعت", color: "#e9f6f3" },
    ],
    protocol: ["تعیین t½", "قاعده ۵ نیمه‌عمر", "اثر k", "فاصله دوز"],
    hint: "پس از ۵ نیمه‌عمر، ۹۷٪ دارو حذف شده — معیار قطع دارو و رسیدن به حالت پایدار.",
  },
  "m-ivdrip": {
    formula: "Css = R₀/CL  ,  C(t) = Css(1−e^(−kt)) — تزریق وریدی",
    xLabel: "t (ساعت)", yLabel: "C (mg/L)",
    params: [
      P("r0", "نرخ تزریق R₀", 5, 200, 5, 50, "mg/h", "#f2a83b", 0),
      P("cl", "کلیرانس CL", 2, 40, 1, 10, "L/h", "#35d3c2", 0),
      P("v", "حجم توزیع Vd", 10, 100, 5, 40, "L", "#56b8ff", 0),
    ],
    curves: [
      { name: "C(t)", color: "#f2a83b", x0: 0, x1: 30, fn: (x, p) => { const css = p.r0 / p.cl; const k = p.cl / p.v; return css * (1 - Math.exp(-k * x)); } },
      { name: "Css", color: "#8fbcb8", x0: 0, x1: 30, fn: (_x, p) => p.r0 / p.cl },
    ],
    readouts: (p) => {
      const css = p.r0 / p.cl;
      const k = p.cl / p.v;
      return [
        { label: "غلظت پایدار Css", value: `${f1(css)} mg/L`, color: "#f2a83b" },
        { label: "زمان رسیدن به ۹۰٪", value: `${f1(3.3 * 0.693 / k)} ساعت`, color: "#35d3c2", sub: "3.3 × t½" },
        { label: "t½", value: `${f1(0.693 / k)} ساعت`, color: "#a5d95c", sub: "0.693·Vd/CL" },
        { label: "دوز بارگیری", value: `${f0(css * p.v)} mg`, color: "#56b8ff", sub: "Css × Vd" },
        { label: "پنجره درمانی", value: "بین MEC و MTC", color: "#ff6f61" },
        { label: "وانکومایسین", value: "پایش سطح", color: "#e9f6f3" },
      ];
    },
    protocol: ["محاسبه Css", "زمان تا پایدار", "دوز بارگیری", "اثر CL"],
    hint: "غلظت پایدار فقط به نرخ تزریق و کلیرانس وابسته است — ولی ۳٫۳ نیمه‌عمر طول می‌کشد تا ۹۰٪ آن برسید.",
  },
  "m-eeg": {
    formula: "نوار مغز — باندهای فرکانسی دلتا تا بتا",
    xLabel: "f (Hz)", yLabel: "توان نسبی",
    params: [P("state", "حالت (0=بیدار … 1=خواب عمیق)", 0, 1, 0.05, 0.2, "", "#f2a83b", 2)],
    curves: [
      { name: "طیف EEG", color: "#b388ff", x0: 0.5, x1: 32, fn: (x, p) => { const s = p.state; const b = Math.max(0, 1 - s * 1.6) * Math.exp(-((x - 20) ** 2) / (2 * 6 * 6)); const a = Math.max(0, 1 - Math.abs(s - 0.25) * 2.2) * Math.exp(-((x - 10) ** 2) / (2 * 2.5 * 2.5)); const t = Math.max(0, 1 - Math.abs(s - 0.6) * 2) * Math.exp(-((x - 6) ** 2) / (2 * 1.8 * 1.8)); const d = Math.max(0, (s - 0.45) * 1.8) * Math.exp(-((x - 2) ** 2) / (2 * 1.2 * 1.2)); return b + a + t + d + 0.03; } },
    ],
    readouts: (p) => {
      const s = p.state;
      return [
        { label: "حالت", value: s < 0.2 ? "بیدار هوشیار" : s < 0.45 ? "چشم‌بسته آرام" : s < 0.7 ? "خواب سبک" : "خواب عمیق", color: "#b388ff" },
        { label: "باند غالب", value: s < 0.2 ? "بتا (13–30Hz)" : s < 0.45 ? "آلفا (8–13Hz)" : s < 0.7 ? "تتا (4–8Hz)" : "دلتا (0.5–4Hz)", color: "#f2a83b" },
        { label: "فرکانس قله", value: `${f1(20 - s * 18)} Hz`, color: "#35d3c2" },
        { label: "آلفا", value: "چشم‌بسته، آرامش", color: "#a5d95c" },
        { label: "دلتا", value: "خواب عمیق ترمیمی", color: "#56b8ff" },
        { label: "کاربرد", value: "تشخیص صرع، بیهوشی", color: "#e9f6f3" },
      ];
    },
    protocol: ["طیف بیداری", "گذار به آلفا", "تتا و تتا", "دلتای خواب عمیق"],
    hint: "با اسلایدر از بیداری به خواب عمیق بروید — قله طیف از بتای ۲۰ هرتز به دلتای ۲ هرتز کوچ می‌کند.",
  },
  "m-audiometry": {
    formula: "آستانه شنوایی بر حسب فرکانس — ادیوگرام",
    xLabel: "f (Hz)", yLabel: "آستانه (dB HL)",
    params: [
      P("age", "سن", 10, 85, 5, 25, "سال", "#f2a83b", 0),
      P("noise", "آسیب نویزی", 0, 40, 5, 0, "dB", "#ff6f61", 0),
    ],
    curves: [
      { name: "آستانه(f)", color: "#f2a83b", x0: 125, x1: 8000, fn: (x, p) => { const presby = Math.max(0, p.age - 20) * 0.9 * Math.pow(x / 8000, 2.2); const notch = p.noise * Math.exp(-((Math.log10(x) - 3.6) ** 2) / 0.02); return 5 + presby + notch; } },
      { name: "جوان ۲۰ ساله", color: "#8fbcb8", x0: 125, x1: 8000, fn: (x) => 5 + 0.5 * Math.pow(x / 8000, 2.2) },
    ],
    readouts: (p) => {
      const at4k = 5 + Math.max(0, p.age - 20) * 0.9 * Math.pow(0.55, 2.2) + p.noise;
      return [
        { label: "آستانه در 4kHz", value: `${f0(at4k)} dB`, color: at4k > 40 ? "#ff6f61" : "#a5d95c" },
        { label: "پیرگوشی", value: "فرکانس‌های بالا", color: "#f2a83b", sub: "presbycusis" },
        { label: "ناچ نویز", value: "شیار 4kHz", color: "#ff6f61", sub: "آسیب سلول‌های مویی" },
        { label: "محدوده گفتار", value: "500–2000 Hz", color: "#35d3c2" },
        { label: "سمع‌سنجی", value: "نرمال ≤ 20 dB", color: "#56b8ff" },
        { label: "حلزون", value: "تونوتوپی فرکانس", color: "#e9f6f3" },
      ];
    },
    protocol: ["ادیوگرام جوان", "اثر سن", "شیار نویز 4k", "حفاظت شنوایی"],
    hint: "پیری و نویز هر دو اول فرکانس‌های بالا را می‌گیرند — نویز صنعتی شیار مشخصی در ۴kHz می‌سازد.",
  },
  "m-vision": {
    formula: "A = 1/NP — قدرت تطابق عدسی (دیوپتر)",
    xLabel: "سن (سال)", yLabel: "تطابق (دیوپتر)",
    params: [P("age", "سن", 10, 75, 1, 45, "سال", "#f2a83b", 0)],
    curves: [
      { name: "تطابق(سن)", color: "#f2a83b", x0: 10, x1: 75, fn: (x) => Math.max(0, 14 * Math.exp(-0.038 * (x - 10))), markerKey: "age", markerLabel: "سن" },
      { name: "مرز پیرچشمی 1D", color: "#ff6f61", x0: 10, x1: 75, fn: () => 1 },
    ],
    readouts: (p) => {
      const acc = Math.max(0, 14 * Math.exp(-0.038 * (p.age - 10)));
      const np = acc > 0.15 ? 1 / acc : 6.7;
      return [
        { label: "قدرت تطابق", value: `${f1(acc)} D`, color: "#f2a83b" },
        { label: "نزدیک‌ترین نقطه دید", value: `${f1(np * 100)} cm`, color: "#35d3c2" },
        { label: "پیرچشمی", value: acc < 1.5 ? "شروع شده — عینک مطالعه" : "ندارد", color: acc < 1.5 ? "#ff6f61" : "#a5d95c" },
        { label: "کودک ۱۰ ساله", value: "NP ≈ 7 cm", color: "#56b8ff" },
        { label: "مکانیسم", value: "عضله مژگانی + ارتجاع عدسی", color: "#e9f6f3" },
        { label: "اصلاح", value: "عدسی مثبت (+)", color: "#e9f6f3" },
      ];
    },
    protocol: ["تطابق در جوانی", "افت با سن", "آستانه پیرچشمی", "NP"],
    hint: "عدسی با سن سفت می‌شود — از ۴۵ سالگی به بعد تقریباً همه برای مطالعه عینک می‌خواهند.",
  },
  "m-gastric": {
    formula: "V(t) = V₀·e^(−kt) — تخلیه معده",
    xLabel: "t (دقیقه)", yLabel: "حجم معده (mL)",
    params: [
      P("v0", "حجم وعده", 200, 1000, 50, 500, "mL", "#f2a83b", 0),
      P("k", "ثابت تخلیه", 0.002, 0.02, 0.001, 0.008, "/دقیقه", "#35d3c2", 3),
    ],
    curves: [
      { name: "V(t)", color: "#f2a83b", x0: 0, x1: 480, fn: (x, p) => p.v0 * Math.exp(-p.k * x) },
      { name: "نیمه", color: "#8fbcb8", x0: 0, x1: 480, fn: (_x, p) => p.v0 / 2 },
    ],
    readouts: (p) => [
      { label: "t½ تخلیه", value: `${f0(Math.LN2 / p.k)} دقیقه`, color: "#f2a83b" },
      { label: "باقی‌مانده در ۳ ساعت", value: `${f0(p.v0 * Math.exp(-p.k * 180))} mL`, color: "#35d3c2" },
      { label: "مایعات", value: "t½ ≈ 20 دقیقه", color: "#a5d95c" },
      { label: "غذای چرب", value: "k نصف می‌شود", color: "#56b8ff", sub: "CCK کند می‌کند" },
      { label: "گاستروپارزی", value: "دیابت — تخلیه کند", color: "#ff6f61" },
      { label: "پیلور", value: "اسفنکتر تنظیم‌کننده", color: "#e9f6f3" },
    ],
    protocol: ["t½ مایع", "اثر وعده چرب", "باقی‌مانده ۳ ساعته", "گاستروپارزی"],
    hint: "معده مایعات را سریع و جامدات را کند تخلیه می‌کند — چربی با هورمون CCK سرعت را نصف می‌کند.",
  },
  "m-lipid": {
    formula: "LDL = TC − HDL − TG/5 — فرمول فریدوالد",
    xLabel: "TG (mg/dL)", yLabel: "LDL (mg/dL)",
    params: [
      P("tc", "کلسترول کل", 120, 320, 5, 210, "mg/dL", "#f2a83b", 0),
      P("hdl", "HDL", 25, 90, 1, 50, "mg/dL", "#35d3c2", 0),
      P("tg", "تری‌گلیسیرید", 60, 400, 10, 150, "mg/dL", "#56b8ff", 0),
    ],
    curves: [
      { name: "LDL(TG)", color: "#f2a83b", x0: 60, x1: 400, fn: (x, p) => p.tc - p.hdl - x / 5, markerKey: "tg", markerLabel: "TG" },
      { name: "مرز 130", color: "#ff6f61", x0: 60, x1: 400, fn: () => 130 },
    ],
    readouts: (p) => {
      const ldl = p.tc - p.hdl - p.tg / 5;
      return [
        { label: "LDL محاسبه‌شده", value: `${f0(ldl)} mg/dL`, color: ldl > 130 ? "#ff6f61" : ldl > 100 ? "#f2a83b" : "#a5d95c" },
        { label: "طبقه‌بندی", value: ldl < 100 ? "بهینه" : ldl < 130 ? "نزدیک بهینه" : ldl < 160 ? "مرزی بالا" : "بالا", color: ldl > 130 ? "#f2a83b" : "#35d3c2" },
        { label: "نسبت TC/HDL", value: f1(p.tc / p.hdl), color: "#56b8ff", sub: "خطر: > 5" },
        { label: "HDL", value: p.hdl > 60 ? "محافظ (بالا)" : "نرمال", color: "#a5d95c" },
        { label: "محدودیت فرمول", value: "TG < 400", color: "#e9f6f3" },
        { label: "استاتین", value: "LDL را 30–50٪ کم", color: "#e9f6f3" },
      ];
    },
    protocol: ["محاسبه LDL", "طبقه‌بندی خطر", "اثر HDL", "نسبت TC/HDL"],
    hint: "LDL کلسترول «بد» رسوب‌دهنده و HDL «خوب» پاک‌کننده است — نسبت کل به HDL شاخص خطر قوی‌تری است.",
  },
  "m-inr": {
    formula: "INR = (PT/PT_نرمال)^ISI — پایش وارفارین",
    xLabel: "دوز وارفارین (mg)", yLabel: "INR",
    params: [
      P("isi", "ISI ترشع", 0.9, 1.5, 0.05, 1.1, "", "#35d3c2", 2),
      P("dose", "دوز روزانه", 1, 10, 0.5, 4, "mg", "#f2a83b", 1),
    ],
    curves: [
      { name: "INR(دوز)", color: "#f2a83b", x0: 1, x1: 10, fn: (x, p) => Math.pow((11.5 + 18 * (1 - Math.exp(-x / 3))) / 11.8, p.isi), markerKey: "dose", markerLabel: "دوز" },
      { name: "پنجره 2–3", color: "#a5d95c", x0: 1, x1: 10, fn: () => 2.5 },
      { name: "مرز خونریزی 4", color: "#ff6f61", x0: 1, x1: 10, fn: () => 4 },
    ],
    readouts: (p) => {
      const pt = 11.5 + 18 * (1 - Math.exp(-p.dose / 3));
      const inr = Math.pow(pt / 11.8, p.isi);
      return [
        { label: "INR", value: f2(inr), color: inr > 4 ? "#ff6f61" : inr >= 2 ? "#a5d95c" : "#f2a83b", sub: inr > 4 ? "خطر خونریزی!" : inr >= 2 && inr <= 3 ? "در پنجره درمانی" : "زیر درمان — لخته" },
        { label: "PT", value: `${f1(pt)} ثانیه`, color: "#35d3c2" },
        { label: "پنجره معمول", value: "2.0 – 3.0", color: "#a5d95c" },
        { label: "دریچه مکانیکی", value: "2.5 – 3.5", color: "#56b8ff" },
        { label: "ویتامین K", value: "پادزهر", color: "#e9f6f3" },
        { label: "CYP2C9", value: "تداخل دارویی", color: "#e9f6f3" },
      ];
    },
    protocol: ["INR در دوز 4", "پنجره 2–3", "خطر INR>4", "اثر ISI"],
    hint: "INR زیر ۲ خطر لخته و بالای ۴ خطر خونریزی دارد — باریک‌ترین پنجره درمانی در پزشکی.",
  },
  "m-heatbalance": {
    formula: "S = M − (E + R + C) — تعادل حرارتی بدن",
    xLabel: "دمای محیط (°C)", yLabel: "ذخیره حرارت (W)",
    params: [
      P("m", "متابولیسم M", 80, 500, 10, 150, "W", "#f2a83b", 0),
      P("ta", "دمای محیط", 0, 45, 1, 25, "°C", "#56b8ff", 0),
    ],
    curves: [
      { name: "ذخیره(Ta)", color: "#f2a83b", x0: 0, x1: 45, fn: (x, p) => { const sweat = Math.max(0, x - 28) * 14; const rad = 40 + 8 * (x - 20); return p.m - (sweat + Math.max(0, rad) + 20); }, markerKey: "ta", markerLabel: "Ta" },
      { name: "تعادل S=0", color: "#8fbcb8", x0: 0, x1: 45, fn: () => 0 },
    ],
    readouts: (p) => {
      const sweat = Math.max(0, p.ta - 28) * 14;
      const rad = 40 + 8 * (p.ta - 20);
      const s = p.m - (sweat + Math.max(0, rad) + 20);
      return [
        { label: "ذخیره حرارتی", value: `${f0(s)} W`, color: Math.abs(s) < 20 ? "#a5d95c" : "#ff6f61", sub: Math.abs(s) < 20 ? "آسایش" : s > 0 ? "گرم‌شدن بدن" : "سردشدن بدن" },
        { label: "تلفات تبخیری", value: `${f0(sweat)} W`, color: "#35d3c2", sub: "تعریق" },
        { label: "تابش + رسانش", value: `${f0(Math.max(0, rad) + 20)} W`, color: "#56b8ff" },
        { label: "منطقه آسایش", value: "S ≈ 0", color: "#a5d95c" },
        { label: "گرمازدگی", value: "S>0 پایدار + رطوبت", color: "#ff6f61" },
        { label: "هایپوترمی", value: "S<0 پایدار", color: "#b388ff" },
      ];
    },
    protocol: ["نقطه آسایش", "اثر فعالیت", "تعریق در گرما", "خطر گرمازدگی"],
    hint: "بدن وقتی دما ذخیره کند گرم و وقتی از دست بدهد سرد می‌شود — منطقه آسایش جایی است که S≈۰.",
  },
  "m-vo2max": {
    formula: "VO₂max = (d₁₂ − 505)/45 — آزمون کوپر",
    xLabel: "مسافت ۱۲ دقیقه (m)", yLabel: "VO₂max (mL/kg·min)",
    params: [P("d", "مسافت دویده‌شده", 1000, 3600, 50, 2400, "m", "#f2a83b", 0)],
    curves: [
      { name: "VO₂max(d)", color: "#f2a83b", x0: 1000, x1: 3600, fn: (x) => (x - 505) / 45, markerKey: "d", markerLabel: "مسافت" },
      { name: "مرز عالی 50", color: "#a5d95c", x0: 1000, x1: 3600, fn: () => 50 },
    ],
    readouts: (p) => {
      const v = (p.d - 505) / 45;
      return [
        { label: "VO₂max", value: `${f1(v)} mL/kg·min`, color: "#f2a83b" },
        { label: "رده", value: v < 30 ? "ضعیف" : v < 40 ? "متوسط" : v < 50 ? "خوب" : v < 60 ? "عالی" : "نخبه", color: v > 50 ? "#a5d95c" : "#35d3c2" },
        { label: "دونده ماراتن", value: "60–85", color: "#56b8ff" },
        { label: "مرد میانسال", value: "≈ 35", color: "#e9f6f3" },
        { label: "تمرین HIIT", value: "+10٪ در ۸ هفته", color: "#a5d95c" },
        { label: "واحد", value: "مصرف O₂ بیشینه", color: "#e9f6f3" },
      ];
    },
    protocol: ["آزمون کوپر", "رده‌بندی", "مقایسه ورزشکاران", "اثر تمرین"],
    hint: "مسافت دویده‌شده در ۱۲ دقیقه، برآورد ساده‌ای از مصرف بیشینه اکسیژن می‌دهد — شاخص طلایی آمادگی هوازی.",
  },
};

export const SPECS2: Record<string, LabSpecDef> = { ...BIO, ...ELEC, ...MED };
