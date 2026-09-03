export type Subject = "physics" | "chemistry" | "biology" | "electronics" | "medicine";

export type LabKind =
  | "pendulum" | "projectile" | "snell" | "photo"
  | "titration" | "enzyme"
  | "genetics" | "culture"
  | "seriesparallel" | "rcfilter" | "logicgate" | "timer555" | "bjt"
  | "ecg" | "bloodpressure" | "spirometry" | "spo2";

export interface Experiment {
  id: string;
  subject: Subject;
  title: string;
  field: string;
  desc: string;
  ngss: string[];
  ib: string;
  alevel: string;
  difficulty: 1 | 2 | 3;
  minutes: number;
  status: "live" | "soon";
  lab?: LabKind;
}

export const SUBJECTS: Record<
  Subject,
  { fa: string; en: string; color: string; soft: string; blurb: string }
> = {
  physics: {
    fa: "فیزیک", en: "PHYSICS", color: "#56b8ff", soft: "rgba(86,184,255,0.13)",
    blurb: "از مکانیک نیوتنی تا کوانتوم — موتور انتگرال‌گیری سیمپلتیک",
  },
  chemistry: {
    fa: "شیمی", en: "CHEMISTRY", color: "#f2a83b", soft: "rgba(242,168,59,0.13)",
    blurb: "تیتراسیون و سینتیک — داده‌های مرجع NIST و PubChem",
  },
  biology: {
    fa: "زیست‌شناسی", en: "BIOLOGY", color: "#a5d95c", soft: "rgba(165,217,92,0.13)",
    blurb: "از مولکول تا اکوسیستم — شبیه‌سازی جمعیت و سلول",
  },
  electronics: {
    fa: "الکترونیک", en: "ELECTRONICS", color: "#b388ff", soft: "rgba(179,136,255,0.13)",
    blurb: "شاخه مستقل مدار و نیمه‌هادی — از قانون اهم تا ماسفت و ۵۵۵",
  },
  medicine: {
    fa: "پزشکی", en: "MEDICINE", color: "#ff6f61", soft: "rgba(255,111,97,0.13)",
    blurb: "فیزیولوژی بالینی — ECG، فشار خون، اسپیرومتری و SpO₂",
  },
};

export const EXPERIMENTS: Experiment[] = [
  // ---------------- PHYSICS ----------------
  {
    id: "p-pendulum", subject: "physics", lab: "pendulum", status: "live",
    title: "آونگ ساده و اندازه‌گیری g", field: "مکانیک کلاسیک",
    desc: "نوسان واقعی با معادله کامل sinθ؛ اندازه‌گیری دوره، انرژی و مقایسه با تئوری تا زوایای بزرگ.",
    ngss: ["HS-PS2-1"], ib: "IB DP Physics 2.1", alevel: "AQA 3.6.1.3 (SHM)",
    difficulty: 1, minutes: 20,
  },
  {
    id: "p-projectile", subject: "physics", lab: "projectile", status: "live",
    title: "پرتابه با مقاومت هوا", field: "مکانیک کلاسیک",
    desc: "حل عددی حرکت پرتابه با درگ مربعی؛ مقایسه لحظه‌ای با خلأ و بهینه‌یابی زاویه پرتاب.",
    ngss: ["HS-PS2-1"], ib: "IB DP Physics 2.1", alevel: "AQA 3.1.1",
    difficulty: 1, minutes: 25,
  },
  {
    id: "p-snell", subject: "physics", lab: "snell", status: "live",
    title: "شکست نور و قانون اسنل", field: "اپتیک هندسی",
    desc: "ره‌گیری پرتو با ماوس؛ زاویه بحرانی، بازتاب درونی کلی و بازتاب فرنل نزدیک زاویه بروستر.",
    ngss: ["HS-PS4-2"], ib: "IB DP Physics 4.3", alevel: "AQA 3.7.3.1",
    difficulty: 1, minutes: 20,
  },
  {
    id: "p-photo", subject: "physics", lab: "photo", status: "live",
    title: "اثر فوتوالکتریک", field: "فیزیک حالت جامد",
    desc: "بسامد آستانه و پتانسیل توقف؛ برآورد تجربی ثابت پلانک از شیب نمودار KE–f.",
    ngss: ["HS-PS4-3"], ib: "IB DP Physics B.1", alevel: "AQA 3.8.2.2",
    difficulty: 3, minutes: 30,
  },
  { id: "p-carnot", subject: "physics", status: "soon", title: "چرخه کارنو و بازده بیشینه", field: "ترمودینامیک",
    desc: "نمودار P–V تعاملی؛ کار، گرما و بازده در برابر ۱−Tc/Th.",
    ngss: ["HS-PS3-4"], ib: "IB DP Physics 2.4", alevel: "AQA 3.6.2.4", difficulty: 3, minutes: 35 },
  { id: "p-rc", subject: "physics", status: "soon", title: "مدار RC و پاسخ گذرا", field: "الکترومغناطیس",
    desc: "شارژ و دشارژ خازن؛ اندازه‌گیری ثابت زمانی و نیمه‌عمر ولتاژ.",
    ngss: ["HS-PS2-5"], ib: "IB DP Physics 5.3", alevel: "AQA 3.6.4.2", difficulty: 2, minutes: 25 },
  { id: "p-doppler", subject: "physics", status: "soon", title: "اثر داپلر و موج ضربه‌ای", field: "امواج و صوت",
    desc: "فشرده‌شدن جبهه‌موج‌ها جلوی منبع؛ عدد ماخ و مخروط فراصوت.",
    ngss: ["HS-PS4-1"], ib: "IB DP Physics 4.4", alevel: "AQA 3.6.2.3", difficulty: 2, minutes: 25 },
  { id: "p-box", subject: "physics", status: "soon", title: "ذره در جعبه کوانتومی", field: "مبانی کوانتوم",
    desc: "حل عددی معادله شرودینگر؛ ترازهای انرژی و چگالی احتمال.",
    ngss: ["HS-PS1-8"], ib: "IB DP Physics C.2", alevel: "Enrichment", difficulty: 3, minutes: 35 },

  // ---------------- CHEMISTRY ----------------
  {
    id: "c-titration", subject: "chemistry", lab: "titration", status: "live",
    title: "تیتراسیون اسید و باز", field: "شیمی تجزیه",
    desc: "منحنی pH–حجم برای اسید قوی/ضعیف با شناساگر قابل انتخاب؛ یافتن نقطه هم‌ارزی و غلظت مجهول.",
    ngss: ["HS-PS1-7"], ib: "IB DP Chemistry 8.2", alevel: "AQA 3.1.12 (Acids)",
    difficulty: 2, minutes: 30,
  },
  {
    id: "c-enzyme", subject: "chemistry", lab: "enzyme", status: "live",
    title: "سینتیک آنزیمی میکائلیس–منتن", field: "بیوشیمی",
    desc: "اثر سوبسترا، دما و pH بر سرعت؛ برآورد Vmax و Km و پایش دناتوره‌شدن حرارتی.",
    ngss: ["HS-PS1-5", "HS-LS1-2"], ib: "IB DP Chemistry 22.1", alevel: "AQA Biology 3.6.2",
    difficulty: 2, minutes: 35,
  },
  { id: "c-redox", subject: "chemistry", status: "soon", title: "پرمنگنات‌سنجی اکسایش–کاهش", field: "شیمی تجزیه",
    desc: "تیتراسیون آهن(II) با KMnO₄ با شناساگری خودکار.",
    ngss: ["HS-PS1-7"], ib: "IB DP Chemistry 9.1", alevel: "AQA 3.1.11.4", difficulty: 2, minutes: 30 },
  { id: "c-arrhenius", subject: "chemistry", status: "soon", title: "سینتیک و معادله آرنیوس", field: "شیمی فیزیک",
    desc: "برآورد انرژی فعال‌سازی از شیب نمودار ln k بر حسب 1/T.",
    ngss: ["HS-PS1-5"], ib: "IB DP Chemistry 6.1", alevel: "AQA 3.1.12.4", difficulty: 3, minutes: 35 },
  { id: "c-flame", subject: "chemistry", status: "soon", title: "آزمون شعله و طیف نشری", field: "شیمی معدنی",
    desc: "رنگ‌های نشری کاتیون‌ها و گذارهای الکترونی؛ شیشه کبالت برای پتاسیم.",
    ngss: ["HS-PS1-8"], ib: "IB DP Chemistry 2.2", alevel: "AQA 3.2.4", difficulty: 1, minutes: 20 },
  { id: "c-calo", subject: "chemistry", status: "soon", title: "کالریمتری و آنتالپی خنثی‌سازی", field: "شیمی فیزیک",
    desc: "اندازه‌گیری ΔH با برون‌یابی برای تصحیح اتلاف حرارتی.",
    ngss: ["HS-PS1-4"], ib: "IB DP Chemistry 5.1", alevel: "AQA 3.1.9.2", difficulty: 2, minutes: 30 },

  // ---------------- BIOLOGY ----------------
  {
    id: "b-genetics", subject: "biology", lab: "genetics", status: "live",
    title: "ژنتیک جمعیت و هاردی–واینبرگ", field: "ژنتیک مندلی و جمعیت",
    desc: "رانش ژنتیکی و انتخاب طبیعی در جمعیت مجازی؛ آزمون χ² برای تعادل اللی.",
    ngss: ["HS-LS3-3"], ib: "IB DP Biology A.4", alevel: "AQA Biology 3.7.3",
    difficulty: 2, minutes: 30,
  },
  {
    id: "b-culture", subject: "biology", lab: "culture", status: "live",
    title: "کشت باکتری و آنتی‌بیوگرام", field: "میکروبیولوژی",
    desc: "منحنی رشد لجستیک؛ هاله عدم رشد دور دیسک آنتی‌بیوتیک و برآورد MIC.",
    ngss: ["HS-LS1-2"], ib: "IB DP Biology 11.2", alevel: "AQA Biology 3.2.6",
    difficulty: 2, minutes: 35,
  },
  { id: "b-mitosis", subject: "biology", status: "soon", title: "میتوز در نوک ریشه پیاز", field: "زیست سلولی",
    desc: "شمارش سلول‌ها در هر فاز؛ شاخص میتوزی و مدت نسبی فازها.",
    ngss: ["HS-LS1-4"], ib: "IB DP Biology 1.6", alevel: "AQA Biology 3.2.2", difficulty: 1, minutes: 25 },
  { id: "b-elodea", subject: "biology", status: "soon", title: "فتوسنتز در الودیا", field: "فیزیولوژی گیاهی",
    desc: "نرخ حباب‌های اکسیژن برحسب نور و CO₂؛ قانون عوامل محدودکننده.",
    ngss: ["HS-LS1-5"], ib: "IB DP Biology 8.2", alevel: "AQA Biology 3.5.3", difficulty: 1, minutes: 30 },
  { id: "b-lotka", subject: "biology", status: "soon", title: "مدل شکارگر–شکار لوتکا–ولترا", field: "اکولوژی",
    desc: "چرخه‌های جمعیت و فضای فاز؛ اثر نرخ شکار و ظرفیت محیط.",
    ngss: ["HS-LS2-1"], ib: "IB DP Biology 4.1", alevel: "AQA Biology 3.7.4.5", difficulty: 3, minutes: 30 },
  { id: "b-pcr", subject: "biology", status: "soon", title: "PCR و الکتروفورز ژل", field: "زیست مولکولی",
    desc: "چرخه‌های دمایی و رشد نمایی کپی‌ها؛ تحلیل طول قطعات روی ژل.",
    ngss: ["HS-LS3-1"], ib: "IB DP Biology 7.2", alevel: "AQA Biology 3.1.5.3", difficulty: 2, minutes: 40 },

  // ---------------- ELECTRONICS (independent track) ----------------
  {
    id: "e-seriesparallel", subject: "electronics", lab: "seriesparallel", status: "live",
    title: "مقاومت‌های سری و موازی", field: "مدار DC",
    desc: "مقاومت معادل، تقسیم ولتاژ در سری و تقسیم جریان در موازی با قانون اهم و توان.",
    ngss: ["HS-PS2-5"], ib: "IB DP Physics 5.2", alevel: "AQA 3.6.3.2",
    difficulty: 1, minutes: 20,
  },
  {
    id: "e-rcfilter", subject: "electronics", lab: "rcfilter", status: "live",
    title: "فیلتر RC پایین‌گذر/بالاگذر", field: "سیگنال و فیلتر",
    desc: "فرکانس قطع fc=1/(2πRC)، بهره −3dB و پاسخ فرکانسی بر حسب لگاریتم.",
    ngss: ["HS-PS4-5"], ib: "IB DP Physics 4.5", alevel: "AQA 3.6.4.4",
    difficulty: 2, minutes: 25,
  },
  {
    id: "e-logicgate", subject: "electronics", lab: "logicgate", status: "live",
    title: "گیت‌های منطقی و جدول صحت", field: "منطق دیجیتال",
    desc: "AND، OR، NAND، NOR، XOR و NOT؛ تکمیل جدول صحت و گیت‌های جهان‌شمول.",
    ngss: ["HS-PS2-5"], ib: "IB DP Physics 5.5", alevel: "Enrichment",
    difficulty: 1, minutes: 20,
  },
  {
    id: "e-timer555", subject: "electronics", lab: "timer555", status: "live",
    title: "تایمر ۵۵۵ آستابل", field: "مدار پالس",
    desc: "موج مربعی با f=1.44/((R1+2R2)C)؛ دیوتی سیکل، شارژ/دشارژ خازن و اسیلوسکوپ زنده.",
    ngss: ["HS-PS4-5"], ib: "IB DP Physics 4.5", alevel: "Enrichment",
    difficulty: 2, minutes: 25,
  },
  {
    id: "e-bjt", subject: "electronics", lab: "bjt", status: "live",
    title: "ترانزیستور BJT و نواحی کار", field: "نیمه‌هادی",
    desc: "نواحی قطع، فعال و اشباع؛ Ic=βIb، نقطه کار Q روی خط بار و بهره ولتاژی.",
    ngss: ["HS-PS2-5"], ib: "IB DP Physics 5.4", alevel: "Enrichment",
    difficulty: 3, minutes: 30,
  },
  { id: "e-rlc", subject: "electronics", status: "soon", title: "تشدید RLC سری", field: "مدار AC",
    desc: "فرکانس تشدید، امپدانس حداقل، ضریب کیفیت Q و پهنای باند.",
    ngss: ["HS-PS4-1"], ib: "IB DP Physics 4.6", alevel: "AQA 3.6.4.2", difficulty: 3, minutes: 30 },
  { id: "e-opamp", subject: "electronics", status: "soon", title: "تقویت‌کننده عملیاتی", field: "آنالوگ",
    desc: "وارونه (−Rf/Rin) و ناوارونه (1+Rf/Rin)، بهره بسته و اشباع ریل.",
    ngss: ["HS-PS2-5"], ib: "IB DP Physics 5.4", alevel: "Enrichment", difficulty: 3, minutes: 30 },
  { id: "e-mosfet", subject: "electronics", status: "soon", title: "ماسفت و نواحی کار", field: "نیمه‌هادی",
    desc: "نواحی قطع، اهمی و اشباع؛ Id=k(Vgs−Vth)² و کلید دیجیتال.",
    ngss: ["HS-PS2-5"], ib: "IB DP Physics 5.4", alevel: "Enrichment", difficulty: 3, minutes: 30 },
  { id: "e-wheatstone", subject: "electronics", status: "soon", title: "پل وتستون و کرنش‌سنج", field: "اندازه‌گیری",
    desc: "تعادل پل R1/R2=R3/Rx و اندازه‌گیری مقاومت مجهول با کرنش.",
    ngss: ["HS-PS2-5"], ib: "IB DP Physics 5.2", alevel: "AQA 3.6.3.3", difficulty: 2, minutes: 25 },
  { id: "e-pwm", subject: "electronics", status: "soon", title: "کنترل موتور با PWM", field: "توان",
    desc: "تنظیم سرعت موتور DC با دیوتی سیکل؛ ولتاژ میانگین و RPM زیر بار.",
    ngss: ["HS-PS3-5"], ib: "IB DP Physics 5.3", alevel: "Enrichment", difficulty: 2, minutes: 25 },

  // ---------------- MEDICINE (independent track) ----------------
  {
    id: "m-ecg", subject: "medicine", lab: "ecg", status: "live",
    title: "نوار قلب (ECG) و ریتم", field: "فیزیولوژی قلب",
    desc: "امواج P/QRS/T زنده؛ فاصله R–R، ضربان، برون‌ده قلبی و اثر استرس ورزشی.",
    ngss: ["HS-LS1-2"], ib: "IB DP Biology 6.1", alevel: "AQA Biology 3.6.4.4",
    difficulty: 2, minutes: 25,
  },
  {
    id: "m-bloodpressure", subject: "medicine", lab: "bloodpressure", status: "live",
    title: "فشار خون و MAP", field: "همودینامیک",
    desc: "ستون جیوه با نبض؛ سیستول/دیاستول، فشار میانگین شریانی و طبقه‌بندی بالینی.",
    ngss: ["HS-LS1-2"], ib: "IB DP Biology 6.1", alevel: "AQA Biology 3.6.4.4",
    difficulty: 2, minutes: 25,
  },
  {
    id: "m-spirometry", subject: "medicine", lab: "spirometry", status: "live",
    title: "اسپیرومتری و حجم‌های ریوی", field: "فیزیولوژی تنفس",
    desc: "TV، IRV، ERV و ظرفیت حیاتی؛ اثر قد، سن و جنس با ریه‌های متحرک.",
    ngss: ["HS-LS1-2"], ib: "IB DP Biology 6.2", alevel: "AQA Biology 3.6.4.2",
    difficulty: 2, minutes: 25,
  },
  {
    id: "m-spo2", subject: "medicine", lab: "spo2", status: "live",
    title: "اشباع اکسیژن (SpO₂) و ارتفاع", field: "فیزیولوژی خون",
    desc: "منحنی تفکیک اکسی‌هموگلوبین؛ اثر بور و شبیه‌سازی ارتفاع تا ۸۰۰۰ متر.",
    ngss: ["HS-LS1-2"], ib: "IB DP Biology 6.2", alevel: "AQA Biology 3.6.4.3",
    difficulty: 3, minutes: 30,
  },
  { id: "m-renal", subject: "medicine", status: "soon", title: "عملکرد کلیه و GFR", field: "فیزیولوژی کلیه",
    desc: "خودتنظیمی GFR و اثر ADH بر بازجذب آب با نفرون متحرک.",
    ngss: ["HS-LS1-2"], ib: "IB DP Biology 6.5", alevel: "AQA Biology 3.6.4.6", difficulty: 3, minutes: 30 },
  { id: "m-glucose", subject: "medicine", status: "soon", title: "تنظیم قند خون", field: "غدد درون‌ریز",
    desc: "حلقه انسولین–گلوکاگن و شبیه‌سازی مقاومت انسولینی پس از وعده.",
    ngss: ["HS-LS1-2"], ib: "IB DP Biology 6.4", alevel: "AQA Biology 3.6.4.1", difficulty: 2, minutes: 25 },
  { id: "m-reflex", subject: "medicine", status: "soon", title: "زمان واکنش عصبی", field: "نوروفیزیولوژی",
    desc: "اندازه‌گیری تعاملی زمان واکنش؛ مسیر قوس بازتاب و آمار میانگین.",
    ngss: ["HS-LS1-2"], ib: "IB DP Biology 6.6", alevel: "AQA Biology 3.6.5.2", difficulty: 1, minutes: 20 },
  { id: "m-ecg2", subject: "medicine", status: "soon", title: "حلقه فشار–حجم بطن", field: "فیزیولوژی قلب",
    desc: "چرخه قلبی روی نمودار PV؛ حجم ضربه‌ای و برون‌ده.",
    ngss: ["HS-LS1-2"], ib: "IB DP Biology 6.1", alevel: "AQA Biology 3.6.4.4", difficulty: 3, minutes: 30 },
];

export const liveExperiments = () => EXPERIMENTS.filter((e) => e.lab);
export const liveOf = (s: Subject) => EXPERIMENTS.filter((e) => e.lab && e.subject === s);
export const SUBJECT_ORDER: Subject[] = ["physics", "chemistry", "biology", "electronics", "medicine"];
