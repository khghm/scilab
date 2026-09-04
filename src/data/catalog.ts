export type Subject = "physics" | "chemistry" | "biology" | "electronics" | "medicine";

export type LabKind =
  | "pendulum" | "projectile" | "snell" | "photo" | "carnot" | "rc" | "doppler" | "qbox"
  | "standing" | "young" | "spring" | "freefall" | "collision" | "incline" | "decay"
  | "titration" | "enzyme" | "redox" | "arrhenius" | "flame" | "calo" | "molarity" | "buffer" | "lechatelier"
  | "genetics" | "culture" | "mitosis" | "lotka" | "pcr" | "pedigree" | "bloodtype" | "yeast" | "elodea"
  | "seriesparallel" | "rcfilter" | "logicgate" | "timer555" | "bjt" | "rlc" | "opamp" | "mosfet" | "wheatstone" | "pwm"
  | "ecg" | "bloodpressure" | "spirometry" | "spo2" | "renal" | "glucose" | "reflex" | "pvloop";

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

export const SUBJECTS: Record<Subject, { fa: string; en: string; color: string; soft: string; blurb: string }> = {
  physics: { fa: "فیزیک", en: "PHYSICS", color: "#56b8ff", soft: "rgba(86,184,255,0.13)", blurb: "از مکانیک نیوتنی تا کوانتوم — موتور انتگرال‌گیری سیمپلتیک" },
  chemistry: { fa: "شیمی", en: "CHEMISTRY", color: "#f2a83b", soft: "rgba(242,168,59,0.13)", blurb: "تیتراسیون، تعادل و سینتیک — داده‌های مرجع NIST و PubChem" },
  biology: { fa: "زیست‌شناسی", en: "BIOLOGY", color: "#a5d95c", soft: "rgba(165,217,92,0.13)", blurb: "از مولکول تا اکوسیستم — شبیه‌سازی سلول، ژنتیک و جمعیت" },
  electronics: { fa: "الکترونیک", en: "ELECTRONICS", color: "#b388ff", soft: "rgba(179,136,255,0.13)", blurb: "شاخه مستقل مدار و نیمه‌هادی — از قانون اهم تا ماسفت و تشدید" },
  medicine: { fa: "پزشکی", en: "MEDICINE", color: "#ff6f61", soft: "rgba(255,111,97,0.13)", blurb: "فیزیولوژی بالینی — ECG، فشار خون، اسپیرومتری و حلقه PV" },
};

const E = (id: string, subject: Subject, lab: LabKind, title: string, field: string, desc: string, ngss: string[], ib: string, alevel: string, difficulty: 1 | 2 | 3, minutes: number): Experiment => ({
  id, subject, lab, title, field, desc, ngss, ib, alevel, difficulty, minutes, status: "live",
});

export const EXPERIMENTS: Experiment[] = [
  // ---------------- PHYSICS (15) ----------------
  E("p-pendulum", "physics", "pendulum", "آونگ ساده و اندازه‌گیری g", "مکانیک کلاسیک",
    "نوسان واقعی با معادله کامل sinθ؛ اندازه‌گیری دوره، انرژی و مقایسه با تئوری تا زوایای بزرگ.",
    ["HS-PS2-1"], "IB DP Physics 2.1", "AQA 3.6.1.3 (SHM)", 1, 20),
  E("p-projectile", "physics", "projectile", "پرتابه با مقاومت هوا", "مکانیک کلاسیک",
    "حل عددی حرکت پرتابه با درگ مربعی؛ مقایسه لحظه‌ای با خلأ و بهینه‌یابی زاویه پرتاب.",
    ["HS-PS2-1"], "IB DP Physics 2.1", "AQA 3.1.1", 1, 25),
  E("p-spring", "physics", "spring", "فنر و حرکت هماهنگ ساده", "مکانیک کلاسیک",
    "نوسان جرم روی فنر؛ دوره T=2π√(m/k)، تبادل انرژی جنبشی و پتانسیل و میرایی نمایی.",
    ["HS-PS2-1"], "IB DP Physics 2.2", "AQA 3.6.1.2 (SHM)", 1, 20),
  E("p-freefall", "physics", "freefall", "سقوط آزاد و اندازه‌گیری g", "مکانیک کلاسیک",
    "زمان‌سنجی سقوط؛ g=2h/t² و مقایسه گرانش ماه، مریخ، زمین و مشتری.",
    ["HS-PS2-1"], "IB DP Physics 2.1", "AQA 3.1.1.2", 1, 20),
  E("p-collision", "physics", "collision", "برخورد و پایستگی تکانه", "مکانیک کلاسیک",
    "برخورد یک‌بعدی با ضریب بازگشت متغیر؛ پایستگی تکانه و اتلاف انرژی جنبشی.",
    ["HS-PS2-2"], "IB DP Physics 2.2", "AQA 3.1.4.2", 2, 25),
  E("p-incline", "physics", "incline", "سطح شیب‌دار و اصطکاک", "مکانیک کلاسیک",
    "آستانه سُر خوردن tanθ=μ و شتاب a=g(sinθ−μcosθ) با نمودار s–t زنده.",
    ["HS-PS2-1"], "IB DP Physics 2.2", "AQA 3.1.2", 2, 25),
  E("p-carnot", "physics", "carnot", "چرخه کارنو و بازده بیشینه", "ترمودینامیک",
    "پیستون متحرک و نمودار P–V با نقطه متحرک؛ جدول Q و W چهار فرآیند و تطبیق η=1−Tc/Th.",
    ["HS-PS3-4"], "IB DP Physics 2.4", "AQA 3.6.2.4", 3, 35),
  E("p-standing", "physics", "standing", "امواج ایستاده روی رشته", "امواج و صوت",
    "مودهای تشدید n=۱ تا ۸ با گره و شکم؛ منحنی پاسخ و تأیید fₙ=n·v/2L.",
    ["HS-PS4-1"], "IB DP Physics 4.2", "AQA 3.6.2.2", 2, 25),
  E("p-doppler", "physics", "doppler", "اثر داپلر و موج ضربه‌ای", "امواج و صوت",
    "جبهه‌موج‌های فشرده و کشیده؛ عدد ماخ و مخروط فراصوت هنگام عبور از سرعت صوت.",
    ["HS-PS4-1"], "IB DP Physics 4.4", "AQA 3.6.2.3", 2, 25),
  E("p-snell", "physics", "snell", "شکست نور و قانون اسنل", "اپتیک هندسی",
    "کشیدن پرتو با ماوس؛ زاویه بحرانی، بازتاب درونی کلی و بازتاب فرنل نزدیک زاویه بروستر.",
    ["HS-PS4-2"], "IB DP Physics 4.3", "AQA 3.7.3.1", 1, 20),
  E("p-young", "physics", "young", "تداخل دو شکاف یانگ", "اپتیک فیزیکی",
    "جبهه‌موج‌های متحرک رنگی و نوارهای تداخلی؛ اندازه‌گیری Δy=λD/d و پوش پراش.",
    ["HS-PS4-2"], "IB DP Physics 4.4", "AQA 3.7.4.4", 2, 30),
  E("p-rc", "physics", "rc", "مدار RC و پاسخ گذرا", "الکترومغناطیس",
    "شارژ و دشارژ خازن با الکترون‌های متحرک؛ τ=RC، نیمه‌عمر و انطباق با منحنی نظری.",
    ["HS-PS2-5"], "IB DP Physics 5.3", "AQA 3.6.4.2", 2, 25),
  E("p-photo", "physics", "photo", "اثر فوتوالکتریک", "فیزیک حالت جامد",
    "بسامد آستانه و پتانسیل توقف؛ برآورد ثابت پلانک از شیب نمودار KE–f برای ۵ فلز.",
    ["HS-PS4-3"], "IB DP Physics B.1", "AQA 3.8.2.2", 3, 30),
  E("p-box", "physics", "qbox", "ذره در جعبه کوانتومی", "مبانی کوانتوم",
    "ترازهای Eₙ=n²E₁، توابع موج ایستاده و نوسان برهم‌نهی؛ طول‌موج گذار ۲→۱.",
    ["HS-PS1-8"], "IB DP Physics C.2", "Enrichment", 3, 35),
  E("p-decay", "physics", "decay", "واپاشی رادیواکتیو", "فیزیک هسته‌ای",
    "واپاشی تصادفی هسته‌ها؛ انطباق با N₀·2^(−t/T½)، شمارشگر گایگر و نوسان آماری.",
    ["HS-PS1-8"], "IB DP Physics C.5", "AQA 3.8.1.4", 2, 25),

  // ---------------- CHEMISTRY (9) ----------------
  E("c-titration", "chemistry", "titration", "تیتراسیون اسید و باز", "شیمی تجزیه",
    "منحنی pH–حجم برای اسید قوی/ضعیف با شناساگر قابل انتخاب؛ نقطه هم‌ارزی و غلظت مجهول.",
    ["HS-PS1-7"], "IB DP Chemistry 8.2", "AQA 3.1.12 (Acids)", 2, 30),
  E("c-enzyme", "chemistry", "enzyme", "سینتیک آنزیمی میکائلیس–منتن", "بیوشیمی",
    "اثر سوبسترا، دما و pH بر سرعت؛ برآورد Vmax و Km و پایش دناتوره‌شدن حرارتی.",
    ["HS-PS1-5", "HS-LS1-2"], "IB DP Chemistry 22.1", "AQA Biology 3.6.2", 2, 35),
  E("c-redox", "chemistry", "redox", "پرمنگنات‌سنجی اکسایش–کاهش", "شیمی تجزیه",
    "تیتراسیون Fe²⁺ با KMnO₄ به‌صورت شناساگر درونی؛ خطای رسوب MnO₂ در غیاب اسید.",
    ["HS-PS1-7"], "IB DP Chemistry 9.1", "AQA 3.1.11.4", 2, 30),
  E("c-molarity", "chemistry", "molarity", "محلول‌سازی و مولاریته", "شیمی محلول‌ها",
    "M=n/V با ذرات متحرک؛ اثر معکوس حجم و ماشین رقت M₁V₁=M₂V₂.",
    ["HS-PS1-6"], "IB DP Chemistry 1.2", "AQA 3.1.6.1", 1, 20),
  E("c-buffer", "chemistry", "buffer", "بافرها و هندرسون–هاسل‌بالخ", "شیمی محلول‌ها",
    "بافر استات؛ افزودن اسید/باز قوی، ظرفیت بافر و شکست در pKa±1.",
    ["HS-PS1-7"], "IB DP Chemistry 8.3", "AQA 3.1.12.3", 3, 30),
  E("c-lechatelier", "chemistry", "lechatelier", "تعادل و اصل لوشاتلیه", "شیمی تعادل",
    "N₂O₄ بی‌رنگ ⇌ 2NO₂ قهوه‌ای؛ تنش دما، فشار و غلظت با تغییر رنگ زنده.",
    ["HS-PS1-6"], "IB DP Chemistry 7.1", "AQA 3.1.10.2", 2, 25),
  E("c-arrhenius", "chemistry", "arrhenius", "سینتیک و معادله آرنیوس", "شیمی فیزیک",
    "ثبت نرخ در دماهای مختلف؛ برازش ln k بر حسب 1/T برای استخراج Ea و اثر کاتالیزور.",
    ["HS-PS1-5"], "IB DP Chemistry 6.1", "AQA 3.1.12.4", 3, 35),
  E("c-flame", "chemistry", "flame", "آزمون شعله و طیف نشری", "شیمی معدنی",
    "رنگ‌های نشری ۶ فلز با خطوط طیفی؛ پوشانندگی سدیم و ترفند شیشه کبالت.",
    ["HS-PS1-8"], "IB DP Chemistry 2.2", "AQA 3.2.4", 1, 20),
  E("c-calo", "chemistry", "calo", "کالریمتری و آنتالپی خنثی‌سازی", "شیمی فیزیک",
    "منحنی دما–زمان با سردشدن نیوتنی؛ برون‌یابی ΔT و محاسبه ΔH در برابر −۵۷٫۳ kJ/mol.",
    ["HS-PS1-4"], "IB DP Chemistry 5.1", "AQA 3.1.9.2", 2, 30),

  // ---------------- BIOLOGY (9) ----------------
  E("b-genetics", "biology", "genetics", "ژنتیک جمعیت و هاردی–واینبرگ", "ژنتیک مندلی و جمعیت",
    "رانش ژنتیکی و انتخاب طبیعی در جمعیت مجازی؛ آزمون χ² برای تعادل اللی.",
    ["HS-LS3-3"], "IB DP Biology A.4", "AQA Biology 3.7.3", 2, 30),
  E("b-mitosis", "biology", "mitosis", "میتوز در نوک ریشه پیاز", "زیست سلولی",
    "شمارش تعاملی سلول‌های هر فاز زیر میکروسکوپ؛ شاخص میتوزی و مدت نسبی فازها.",
    ["HS-LS1-4"], "IB DP Biology 1.6", "AQA Biology 3.2.2", 1, 25),
  E("b-pcr", "biology", "pcr", "PCR و الکتروفورز ژل", "زیست مولکولی",
    "چرخه‌های دمایی ۹۵/۵۵/۷۲ و رشد نمایی N₀(1+E)ⁿ؛ باندهای ژل و اثر راندمان.",
    ["HS-LS3-1"], "IB DP Biology 7.2", "AQA Biology 3.1.5.3", 2, 40),
  E("b-pedigree", "biology", "pedigree", "تحلیل شجره‌نامه", "ژنتیک مندلی",
    "تشخیص الگوی غالب و مغلوب اتوزومی از سه نسل؛ تفسیر ناقل‌ها با بازخورد.",
    ["HS-LS3-3"], "IB DP Biology 3.4", "AQA Biology 3.7.2.4", 2, 25),
  E("b-bloodtype", "biology", "bloodtype", "گروه‌های خونی ABO", "ژنتیک مندلی",
    "هم‌توانی الل‌های A و B؛ جدول پونت تعاملی، آمیزش و نسبت فنوتیپ فرزندان.",
    ["HS-LS3-3"], "IB DP Biology 3.4", "AQA Biology 3.7.2.1", 1, 25),
  E("b-culture", "biology", "culture", "کشت باکتری و آنتی‌بیوگرام", "میکروبیولوژی",
    "منحنی رشد لجستیک؛ هاله عدم رشد دور دیسک آنتی‌بیوتیک و برآورد MIC.",
    ["HS-LS1-2"], "IB DP Biology 11.2", "AQA Biology 3.2.6", 2, 35),
  E("b-yeast", "biology", "yeast", "تنفس مخمر و تخمیر", "میکروبیولوژی",
    "جمع‌آوری CO₂ در پتومتر؛ مقایسه هوازی (۳۸ ATP) و تخمیر (۲ ATP) و اثر قند و دما.",
    ["HS-LS1-2"], "IB DP Biology 2.8", "AQA Biology 3.5.4.4", 2, 30),
  E("b-elodea", "biology", "elodea", "فتوسنتز در الودیا", "فیزیولوژی گیاهی",
    "حباب‌های اکسیژن زنده؛ قانون عوامل محدودکننده بلکمن و اثر دمای بالا.",
    ["HS-LS1-5"], "IB DP Biology 8.2", "AQA Biology 3.5.3", 1, 30),
  E("b-lotka", "biology", "lotka", "مدل شکارگر–شکار لوتکا–ولترا", "اکولوژی",
    "انتگرال‌گیری RK4؛ نوسان‌های بافازه‌دار، مدار بسته فضای فاز و آستانه انقراض.",
    ["HS-LS2-1"], "IB DP Biology 4.1", "AQA Biology 3.7.4.5", 3, 30),

  // ---------------- ELECTRONICS (10) ----------------
  E("e-seriesparallel", "electronics", "seriesparallel", "مقاومت‌های سری و موازی", "مدار DC",
    "مقاومت معادل، تقسیم ولتاژ و جریان با الکترون‌های متحرک؛ قانون اهم و توان.",
    ["HS-PS2-5"], "IB DP Physics 5.2", "AQA 3.6.3.2", 1, 20),
  E("e-rcfilter", "electronics", "rcfilter", "فیلتر RC پایین‌گذر/بالاگذر", "سیگنال و فیلتر",
    "فرکانس قطع fc=1/(2πRC)، بهره −3dB و پاسخ فرکانسی روی مقیاس لگاریتمی.",
    ["HS-PS4-5"], "IB DP Physics 4.5", "AQA 3.6.4.4", 2, 25),
  E("e-logicgate", "electronics", "logicgate", "گیت‌های منطقی و جدول صحت", "منطق دیجیتال",
    "AND، OR، NAND، NOR، XOR و NOT؛ تکمیل تعاملی جدول صحت و گیت‌های جهان‌شمول.",
    ["HS-PS2-5"], "IB DP Physics 5.5", "Enrichment", 1, 20),
  E("e-timer555", "electronics", "timer555", "تایمر ۵۵۵ آستابل", "مدار پالس",
    "موج مربعی با f=1.44/((R1+2R2)C)؛ پنجره تریگر ⅓–⅔Vcc، دیوتی و اسیلوسکوپ زنده.",
    ["HS-PS4-5"], "IB DP Physics 4.5", "Enrichment", 2, 25),
  E("e-bjt", "electronics", "bjt", "ترانزیستور BJT و نواحی کار", "نیمه‌هادی",
    "قطع، فعال و اشباع؛ Ic=βIb، نقطه کار Q روی خط بار و بهره ولتاژی.",
    ["HS-PS2-5"], "IB DP Physics 5.4", "Enrichment", 3, 30),
  E("e-mosfet", "electronics", "mosfet", "ماسفت و نواحی کار", "نیمه‌هادی",
    "آستانه Vth، ناحیه اهمی و اشباع با Id=k(Vgs−Vth)²؛ منحنی‌های خانوادگی و رفتار کلیدی.",
    ["HS-PS2-5"], "IB DP Physics 5.4", "Enrichment", 3, 30),
  E("e-rlc", "electronics", "rlc", "تشدید RLC سری", "مدار AC",
    "فرکانس تشدید f₀=1/(2π√LC)، امپدانس حداقل، ضریب کیفیت Q و پهنای باند.",
    ["HS-PS4-1"], "IB DP Physics 4.6", "AQA 3.6.4.2", 3, 30),
  E("e-opamp", "electronics", "opamp", "تقویت‌کننده عملیاتی", "آنالوگ",
    "وارونه (−Rf/Rin) و ناوارونه (1+Rf/Rin)؛ بهره بسته، وارونگی فاز و اشباع ریل.",
    ["HS-PS2-5"], "IB DP Physics 5.4", "Enrichment", 3, 30),
  E("e-wheatstone", "electronics", "wheatstone", "پل وتستون و کرنش‌سنج", "اندازه‌گیری",
    "تعادل پل با Vg≈0 و یافتن Rx=R3·R2/R1؛ خروجی میلی‌ولتی کرنش با GF=2.",
    ["HS-PS2-5"], "IB DP Physics 5.2", "AQA 3.6.3.3", 2, 25),
  E("e-pwm", "electronics", "pwm", "کنترل موتور با PWM", "توان",
    "ولتاژ میانگین Duty×V؛ موتور چرخان با RPM واقعی، اثر بار و کلیدزنی ماسفت.",
    ["HS-PS3-5"], "IB DP Physics 5.3", "Enrichment", 2, 25),

  // ---------------- MEDICINE (8) ----------------
  E("m-ecg", "medicine", "ecg", "نوار قلب (ECG) و ریتم", "فیزیولوژی قلب",
    "امواج P/QRS/T زنده؛ فاصله R–R، ضربان، برون‌ده قلبی و تاکی‌کاردی زیر استرس.",
    ["HS-LS1-2"], "IB DP Biology 6.1", "AQA Biology 3.6.4.4", 2, 25),
  E("m-bloodpressure", "medicine", "bloodpressure", "فشار خون و MAP", "همودینامیک",
    "ستون جیوه نبض‌دار؛ سیستول/دیاستول، فشار میانگین شریانی و طبقه‌بندی AHA.",
    ["HS-LS1-2"], "IB DP Biology 6.1", "AQA Biology 3.6.4.4", 2, 25),
  E("m-pvloop", "medicine", "pvloop", "حلقه فشار–حجم بطن", "فیزیولوژی قلب",
    "چرخه قلبی روی نمودار PV؛ حجم ضربه‌ای، کسر جهشی و اثر پیش‌بار و پس‌بار.",
    ["HS-LS1-2"], "IB DP Biology 6.1", "AQA Biology 3.6.4.4", 3, 30),
  E("m-spirometry", "medicine", "spirometry", "اسپیرومتری و حجم‌های ریوی", "فیزیولوژی تنفس",
    "TV، IRV، ERV و ظرفیت حیاتی با ریه‌های متحرک؛ اثر قد، سن و جنس.",
    ["HS-LS1-2"], "IB DP Biology 6.2", "AQA Biology 3.6.4.2", 2, 25),
  E("m-spo2", "medicine", "spo2", "اشباع اکسیژن (SpO₂)", "فیزیولوژی خون",
    "منحنی سیگموئید تفکیک هموگلوبین؛ اثر بور، P50 و شبیه‌سازی ارتفاع تا ۸۰۰۰ متر.",
    ["HS-LS1-2"], "IB DP Biology 6.2", "AQA Biology 3.6.4.3", 3, 30),
  E("m-renal", "medicine", "renal", "عملکرد کلیه و GFR", "فیزیولوژی کلیه",
    "خودتنظیمی میوژنیک GFR در بازه ۸۰–۱۸۰ و اثر ADH بر بازجذب آب و ادرار.",
    ["HS-LS1-2"], "IB DP Biology 6.5", "AQA Biology 3.6.4.6", 3, 30),
  E("m-glucose", "medicine", "glucose", "تنظیم قند خون", "غدد درون‌ریز",
    "بازخورد منفی انسولین–گلوکز؛ پاسخ به وعده غذایی و شبیه‌سازی مقاومت انسولینی.",
    ["HS-LS1-2"], "IB DP Biology 6.4", "AQA Biology 3.6.4.1", 2, 25),
  E("m-reflex", "medicine", "reflex", "زمان واکنش عصبی", "نوروفیزیولوژی",
    "اندازه‌گیری تعاملی زمان واکنش با محرک تصادفی؛ آمار میانگین و SD تلاش‌ها.",
    ["HS-LS1-2"], "IB DP Biology 6.6", "AQA Biology 3.6.5.2", 1, 20),
];

export const liveExperiments = () => EXPERIMENTS.filter((e) => e.lab);
export const liveOf = (s: Subject) => EXPERIMENTS.filter((e) => e.lab && e.subject === s);
export const SUBJECT_ORDER: Subject[] = ["physics", "chemistry", "biology", "electronics", "medicine"];
