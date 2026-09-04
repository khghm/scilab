import { useRef, useState } from "react";
import { LiveChart } from "../components/Chart";
import { LabShell, type FeedItem, type LabMode } from "../components/LabShell";
import { Slider } from "../components/ui";
import { fmt, useForce, useRaf } from "../lib/utils";
import { bioScene as bg, glow, hex2rgb, hud, FA, MONO, sr } from "./draw";
import type { Experiment } from "../data/catalog";

type Props = { exp: Experiment; onBack: () => void; initMode?: LabMode };

/* ===================== Pedigree ===================== */
export function PedigreeLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ kind: "rec" as "dom" | "rec", identified: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "شجره‌نامه را تحلیل کنید — والدین سالم با فرزند بیمار یعنی مغلوب؛ بیمار در همه نسل‌ها یعنی غالب." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [guess, setGuess] = useState<"dom" | "rec" | null>(null);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const submit = (g: "dom" | "rec") => {
    setGuess(g);
    if (g === S.kind) { S.identified++; pushFeed("ok", `درست — الگوی ${g === "dom" ? "غالب" : "مغلوب"} اتوزومی است.`); }
    else pushFeed("error", "نادرست — در الگوی مغلوب، والدین سالم (ناقل Aa) فرزند بیمار (aa) دارند.");
    force();
  };
  const draw = () => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const arP = mode === "ar";
    // pedigree panel
    ctx.fillStyle = "rgba(6,26,22,0.45)";
    ctx.strokeStyle = "rgba(46,120,96,0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(280, 84, 420, 420, 14); ctx.fill(); ctx.stroke();
    const shape = (x: number, y: number, sex: "m" | "f", aff: boolean) => {
      if (aff && !arP) glow(ctx, x, y, 44, [255, 111, 97], 0.4);
      const g = ctx.createRadialGradient(x - 6, y - 6, 3, x, y, 22);
      if (aff) { g.addColorStop(0, "#ff9a8f"); g.addColorStop(1, "#c94a3e"); }
      else { g.addColorStop(0, "#12434d"); g.addColorStop(1, "#082b33"); }
      ctx.fillStyle = g;
      ctx.strokeStyle = aff ? "#ff8a7d" : "#8fbcb8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (sex === "m") ctx.rect(x - 18, y - 18, 36, 36); else ctx.arc(x, y, 19, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      if (!aff) { ctx.fillStyle = "rgba(233,246,243,0.12)"; ctx.beginPath(); ctx.arc(x - 6, y - 6, 6, 0, Math.PI * 2); ctx.fill(); }
    };
    const line = (x1: number, y1: number, x2: number, y2: number) => { ctx.strokeStyle = "rgba(143,188,184,0.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    if (S.kind === "rec") {
      shape(340, 120, "m", false); shape(420, 120, "f", false); line(358, 120, 401, 120);
      shape(560, 120, "m", false); shape(640, 120, "f", false); line(578, 120, 621, 120);
      shape(380, 280, "m", false); shape(600, 280, "f", false);
      line(380, 138, 380, 262); line(600, 138, 600, 262); line(398, 280, 581, 280);
      shape(420, 440, "m", true); shape(500, 440, "f", false); shape(580, 440, "m", false);
      line(490, 298, 490, 380); line(420, 380, 580, 380);
      line(420, 380, 420, 422); line(500, 380, 500, 421); line(580, 380, 580, 422);
      ctx.fillStyle = "#e9f6f3"; ctx.font = `13px ${FA}`;
      ctx.fillText("والدین سالم → فرزند بیمار", 380, 66);
    } else {
      shape(340, 120, "m", true); shape(420, 120, "f", false); line(358, 120, 401, 120);
      shape(560, 120, "m", false); shape(640, 120, "f", false); line(578, 120, 621, 120);
      shape(380, 280, "m", true); shape(600, 280, "f", false);
      line(380, 138, 380, 262); line(600, 138, 600, 262); line(398, 280, 581, 280);
      shape(420, 440, "m", false); shape(500, 440, "f", true); shape(580, 440, "m", true);
      line(490, 298, 490, 380); line(420, 380, 580, 380);
      line(420, 380, 420, 422); line(500, 380, 500, 421); line(580, 380, 580, 422);
      ctx.fillStyle = "#e9f6f3"; ctx.font = `13px ${FA}`;
      ctx.fillText("بیمار در هر نسل؛ والد بیمار → فرزند سالم", 330, 66);
    }
    ctx.fillStyle = "#8fbcb8"; ctx.font = `12px ${FA}`;
    ctx.fillText("نسل I", 240, 124); ctx.fillText("نسل II", 240, 284); ctx.fillText("نسل III", 240, 444);
  };
  draw();

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={false}
      onToggleRun={() => pushFeed("info", "به کلیدها دقت کنید و الگو را حدس بزنید.")}
      onReset={() => { setGuess(null); pushFeed("info", "حدس پاک شد."); }}
      simClock={`تشخیص درست: ${S.identified}`}
      hint="دنبال والدین سالم با فرزند بیمار بگردید — نشانه قطعی صفت مغلوب است."
      protocol={[
        { label: "ثبت حدس اول", done: guess !== null },
        { label: "تشخیص درست", done: S.identified > 0 },
        { label: "شجره‌نامه دوم", done: S.ev >= 2 },
        { label: "۲ تشخیص درست", done: S.identified >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <div>
          <div className="text-[12px] text-fog mb-2">الگوی وراثت چیست؟</div>
          <div className="flex gap-2">
            <button onClick={() => submit("dom")} className="flex-1 px-3 py-3 rounded-lg text-[13px] font-bold border transition-all cursor-pointer"
              style={{ borderColor: guess === "dom" ? (S.kind === "dom" ? "#a5d95c" : "#ff6f61") : "#175059", color: guess === "dom" ? (S.kind === "dom" ? "#a5d95c" : "#ff6f61") : "#8fbcb8" }}>غالب اتوزومی</button>
            <button onClick={() => submit("rec")} className="flex-1 px-3 py-3 rounded-lg text-[13px] font-bold border transition-all cursor-pointer"
              style={{ borderColor: guess === "rec" ? (S.kind === "rec" ? "#a5d95c" : "#ff6f61") : "#175059", color: guess === "rec" ? (S.kind === "rec" ? "#a5d95c" : "#ff6f61") : "#8fbcb8" }}>مغلوب اتوزومی</button>
          </div>
        </div>
        <button onClick={() => { S.kind = S.kind === "dom" ? "rec" : "dom"; setGuess(null); pushFeed("info", "شجره‌نامه جدید — دوباره تحلیل کنید."); force(); }}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer"
          style={{ borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c20f" }}>شجره‌نامه جدید</button>
        <div className="rounded-lg border border-edge/70 bg-deep/50 p-3 text-[11.5px] text-fog leading-6">
          مربع = مرد، دایره = زن، سایه‌دار = بیمار.
        </div>
      </div>}
      chart={<LiveChart series={[sr("تشخیص‌های درست", "#a5d95c", [{ x: 0, y: 0 }, { x: 1, y: S.identified }])]} xLabel="—" yLabel="تعداد" height={230} yMin={0} />}
      table={{ headers: ["الگو", "نشانه کلیدی", "ژنوتیپ بیمار"], rows: [["غالب", "در همه نسل‌ها", "AA یا Aa"], ["مغلوب", "والد سالم → فرزند بیمار", "aa"], ["ناقل", "سالم با الل بیمار", "Aa"]] }}
      stats={[
        { label: "تشخیص درست", value: `${S.identified}`, color: "#a5d95c" },
        { label: "حدس شما", value: guess ? (guess === "dom" ? "غالب" : "مغلوب") : "—", color: guess === S.kind && guess ? "#a5d95c" : "#ff6f61" },
        { label: "نسل‌ها", value: "3", color: "#e9f6f3" },
        { label: "ژنوتیپ بیمار (مغلوب)", value: "aa", color: "#f2a83b" },
        { label: "ژنوتیپ بیمار (غالب)", value: "A_", color: "#f2a83b" },
        { label: "احتمال ناقل بودن والد (مغلوب)", value: "Aa × Aa", color: "#56b8ff" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`Pedigree: autosomal ${S.kind === "dom" ? "dominant" : "recessive"}`, `Key for recessive: unaffected x unaffected -> affected child`]} />
  );
}

/* ===================== ABO blood types ===================== */
const ALLELES = ["A", "B", "O"] as const;
type Allele = (typeof ALLELES)[number];
const pheno = (a: Allele, b: Allele) => { const s = new Set([a, b]); if (s.has("A") && s.has("B")) return "AB"; if (s.has("A")) return "A"; if (s.has("B")) return "B"; return "O"; };
export function BloodTypeLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ p1a: "A" as Allele, p1b: "O" as Allele, p2a: "B" as Allele, p2b: "O" as Allele, n: 16, obs: { A: 0, B: 0, AB: 0, O: 0 }, crossed: false, ev: 0, feed: [{ time: "#0", level: "info", msg: "گروه‌های خونی ABO — الل‌های A و B هم‌توان و هر دو بر O غالب‌اند. آمیزش بسازید و نسبت‌ها را ببینید." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const exp4 = { A: 0, B: 0, AB: 0, O: 0 } as Record<string, number>;
  for (const g1 of [S.p1a, S.p1b]) for (const g2 of [S.p2a, S.p2b]) exp4[pheno(g1, g2)] += 0.25;
  const cross = () => {
    S.obs = { A: 0, B: 0, AB: 0, O: 0 };
    for (let i = 0; i < S.n; i++) {
      const g1 = Math.random() < 0.5 ? S.p1a : S.p1b;
      const g2 = Math.random() < 0.5 ? S.p2a : S.p2b;
      S.obs[pheno(g1, g2) as "A" | "B" | "AB" | "O"]++;
    }
    S.crossed = true;
    pushFeed("ok", `آمیزش ${S.p1a}${S.p1b} × ${S.p2a}${S.p2b} — ${S.n} فرزند: A=${S.obs.A}، B=${S.obs.B}، AB=${S.obs.AB}، O=${S.obs.O}.`);
  };
  const draw = () => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const arB = mode === "ar";
    const ox = 330, oy = 150, cs = 150;
    const PH_COL: Record<string, string> = { A: "#ff6f61", B: "#56b8ff", AB: "#b388ff", O: "#8fbcb8" };
    // gamete header chips
    const chip = (x: number, y: number, txt: string, col: string) => {
      if (!arB) glow(ctx, x, y, 30, hex2rgb(col), 0.3);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.roundRect(x - 24, y - 20, 48, 34, 8); ctx.fill();
      ctx.fillStyle = "#04191d"; ctx.font = `700 20px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(txt, x, y + 4); ctx.textAlign = "left";
    };
    chip(ox + cs / 2, oy - 26, S.p1a, "#f2a83b");
    chip(ox + (3 * cs) / 2, oy - 26, S.p1b, "#f2a83b");
    chip(ox - 34, oy + cs / 2, S.p2a, "#56b8ff");
    chip(ox - 34, oy + (3 * cs) / 2, S.p2b, "#56b8ff");
    // result cells with phenotype glow + blood drop
    const cellB = (r: number, c: number, ph: string) => {
      const x = ox + c * cs, y = oy + r * cs, col = PH_COL[ph];
      if (!arB) glow(ctx, x + cs / 2, y + cs / 2, 70, hex2rgb(col), 0.22);
      const g = ctx.createLinearGradient(x, y, x, y + cs);
      g.addColorStop(0, `${col}33`); g.addColorStop(1, `${col}12`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(x + 5, y + 5, cs - 10, cs - 10, 10); ctx.fill();
      ctx.strokeStyle = `${col}88`; ctx.lineWidth = 1.8; ctx.stroke();
      // blood drop
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + cs / 2, y + 34);
      ctx.bezierCurveTo(x + cs / 2 + 12, y + 52, x + cs / 2 + 10, y + 66, x + cs / 2, y + 66);
      ctx.bezierCurveTo(x + cs / 2 - 10, y + 66, x + cs / 2 - 12, y + 52, x + cs / 2, y + 34);
      ctx.fill();
      ctx.fillStyle = "#e9f6f3"; ctx.font = `700 22px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(ph, x + cs / 2, y + cs - 26);
      ctx.textAlign = "left";
    };
    cellB(0, 0, pheno(S.p1a, S.p2a));
    cellB(0, 1, pheno(S.p1b, S.p2a));
    cellB(1, 0, pheno(S.p1a, S.p2b));
    cellB(1, 1, pheno(S.p1b, S.p2b));
    ctx.fillStyle = "#8fbcb8"; ctx.font = `12px ${FA}`;
    ctx.fillText("جدول پونت — فنوتیپ هر خانه", ox + 40, oy - 44);
    hud(ctx, 150, 460, 660, 70, mode === "ar");
    ctx.font = `13px ${MONO}`; ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`والدین: ${S.p1a}${S.p1b} (گروه ${pheno(S.p1a, S.p1b)})  ×  ${S.p2a}${S.p2b} (گروه ${pheno(S.p2a, S.p2b)})`, 172, 490);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("A و B هم‌توان (codominant) — هر دو بر O غالب", 172, 514);
  };
  draw();

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={false} onToggleRun={cross}
      onReset={() => { S.crossed = false; S.obs = { A: 0, B: 0, AB: 0, O: 0 }; pushFeed("info", "آماده آمیزش جدید."); }}
      simClock={`والدین: ${S.p1a}${S.p1b} × ${S.p2a}${S.p2b}`}
      hint="والدین AO و BO را امتحان کنید — هر چهار گروه در فرزندان ظاهر می‌شود."
      protocol={[
        { label: "انتخاب ژنوتیپ والدین", done: true },
        { label: "انجام آمیزش", done: S.crossed },
        { label: "مشاهده هم‌توانی A و B", done: exp4.AB > 0 },
        { label: "ظهور O از والدین A و B", done: exp4.O > 0 },
        { label: "مقایسه مشاهده و انتظار", done: S.ev >= 2 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        {([["والد ۱", "p1a", "p1b"], ["والد ۲", "p2a", "p2b"]] as [string, "p1a" | "p2a", "p1b" | "p2b"][]).map(([label, k1, k2]) => (
          <div key={label}>
            <div className="text-[12px] text-fog mb-1.5">{label} — دو الل</div>
            <div className="flex gap-1.5">
              {ALLELES.map((a) => (
                <div key={a} className="flex flex-col gap-1 flex-1">
                  <button onClick={() => { S[k1] = a; force(); }} className="px-2 py-1.5 rounded-lg text-[11px] border transition-all cursor-pointer"
                    style={S[k1] === a ? { borderColor: "#ff6f61", color: "#ff6f61", background: "#ff6f6118" } : { borderColor: "#175059", color: "#8fbcb8" }}>{a}</button>
                  <button onClick={() => { S[k2] = a; force(); }} className="px-2 py-1.5 rounded-lg text-[11px] border transition-all cursor-pointer"
                    style={S[k2] === a ? { borderColor: "#56b8ff", color: "#56b8ff", background: "#56b8ff18" } : { borderColor: "#175059", color: "#8fbcb8" }}>{a}</button>
                </div>
              ))}
            </div>
          </div>
        ))}
        <Slider label="تعداد فرزندان" value={S.n} min={4} max={64} step={4} digits={0} onChange={(v) => { S.n = v; force(); }} />
        <button onClick={cross} className="w-full px-4 py-3 rounded-lg font-bold text-sm transition-all active:scale-95 cursor-pointer" style={{ background: "#ff6f61", color: "#04191d" }}>انجام آمیزش</button>
      </div>}
      chart={<LiveChart series={[sr("انتظار مندلی ٪", "#35d3c2", ["A", "B", "AB", "O"].map((k, i) => ({ x: i, y: exp4[k] * 100 }))), sr("مشاهده‌شده ٪", "#f2a83b", ["A", "B", "AB", "O"].map((k, i) => ({ x: i, y: S.crossed ? (S.obs[k as "A"] / S.n) * 100 : 0 })))]} xLabel="A B AB O" yLabel="٪" height={230} yMin={0} yMax={100} />}
      table={{ headers: ["گروه", "ژنوتیپ‌ها", "انتظار ٪", "مشاهده"], rows: [["A", "AA/AO", fmt(exp4.A * 100, 0), S.obs.A], ["B", "BB/BO", fmt(exp4.B * 100, 0), S.obs.B], ["AB", "AB", fmt(exp4.AB * 100, 0), S.obs.AB], ["O", "OO", fmt(exp4.O * 100, 0), S.obs.O]] }}
      stats={[
        { label: "ژنوتیپ والد ۱", value: `${S.p1a}${S.p1b}`, color: "#ff6f61" },
        { label: "ژنوتیپ والد ۲", value: `${S.p2a}${S.p2b}`, color: "#56b8ff" },
        { label: "فنوتیپ والد ۱", value: pheno(S.p1a, S.p1b), color: "#e9f6f3" },
        { label: "فنوتیپ والد ۲", value: pheno(S.p2a, S.p2b), color: "#e9f6f3" },
        { label: "تنوع فرزندان", value: `${Object.values(exp4).filter((v) => v > 0).length} گروه`, color: "#a5d95c" },
        { label: "رابطه الل‌ها", value: "A=B هم‌توان، >O", color: "#f2a83b" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[`ABO: ${S.p1a}${S.p1b} x ${S.p2a}${S.p2b}`, `Expected A/B/AB/O = ${fmt(exp4.A * 100, 0)}/${fmt(exp4.B * 100, 0)}/${fmt(exp4.AB * 100, 0)}/${fmt(exp4.O * 100, 0)}\\%`]} />
  );
}

/* ===================== Yeast respiration ===================== */
export function YeastLab({ exp, onBack, initMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef({ sugar: 5, T: 30, oxy: false, t: 0, co2: 0, running: false, bubbles: [] as { x: number; y: number; r: number }[], samples: [] as { x: number; y: number }[], lastS: 0, ev: 0, feed: [{ time: "#0", level: "info", msg: "تنفس مخمر — بی‌هوازی: تخمیر با ۲ ATP؛ هوازی: تنفس کامل با ۳۸ ATP و CO₂ بیشتر." }] as FeedItem[] }).current;
  const force = useForce();
  const [mode, setMode] = useState<LabMode>(initMode ?? "normal");
  const [running, setRunning] = useState(false);
  const frame = useRef(0);
  const pushFeed = (level: FeedItem["level"], msg: string) => { S.ev++; S.feed = [{ time: `#${S.ev}`, level, msg }, ...S.feed].slice(0, 24); force(); };
  const tempF = Math.max(0, 1 - ((S.T - 35) / 25) ** 2);
  const rate = (S.oxy ? 1.6 : 1) * (S.sugar / (S.sugar + 2)) * tempF;
  const start = () => {
    S.t = 0; S.co2 = 0; S.bubbles = []; S.samples = []; S.lastS = 0; S.running = true; setRunning(true);
    pushFeed("info", `${S.oxy ? "هوازی" : "بی‌هوازی"} آغاز شد — نرخ نسبی ${fmt(rate, 2)}.`);
    if (S.T > 50) pushFeed("warn", "دمای بالای ۵۰° آنزیم‌های مخمر را دناتوره می‌کند.");
  };

  useRaf((dt) => {
    const ds = Math.min(dt, 50) / 1000;
    if (S.running) {
      S.t += ds; S.co2 += rate * ds * 3;
      if (Math.random() < rate * ds * 2) S.bubbles.push({ x: 260 + Math.random() * 80, y: 420, r: 3 + Math.random() * 4 });
      for (const b of S.bubbles) { b.y -= (30 + b.r * 4) * ds; b.x += Math.sin(b.y / 12) * 0.5; }
      S.bubbles = S.bubbles.filter((b) => b.y > 140);
      if (S.t - S.lastS >= 0.3) { S.samples.push({ x: Number(S.t.toFixed(1)), y: Number(S.co2.toFixed(1)) }); if (S.samples.length > 240) S.samples.shift(); S.lastS = S.t; }
    }
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    bg(ctx, 960, 560, mode === "ar");
    const arY = mode === "ar";
    const cx = 300, bot = 450;
    if (!arY) glow(ctx, cx, 360, 170, [242, 168, 59], 0.14);
    // broth gradient
    const br = ctx.createLinearGradient(0, 250, 0, bot);
    br.addColorStop(0, "rgba(242,190,100,0.32)");
    br.addColorStop(1, "rgba(210,140,60,0.42)");
    ctx.fillStyle = br;
    ctx.beginPath(); ctx.moveTo(cx - 120, 250); ctx.bezierCurveTo(cx - 130, bot - 40, cx - 125, bot - 4, cx - 80, bot - 2); ctx.lineTo(cx + 80, bot - 2); ctx.bezierCurveTo(cx + 125, bot - 4, cx + 130, bot - 40, cx + 120, 250); ctx.closePath(); ctx.fill();
    // foam layer
    ctx.fillStyle = "rgba(255,240,210,0.55)";
    for (let i = 0; i < 12; i++) {
      const fxx = cx - 104 + i * 19 + Math.sin(performance.now() / 500 + i) * 2;
      ctx.beginPath(); ctx.arc(fxx, 250 - (i % 3) * 3, 9 - (i % 3) * 2, 0, Math.PI * 2); ctx.fill();
    }
    // flask glass
    ctx.fillStyle = "rgba(242,168,59,0.05)";
    ctx.beginPath();
    ctx.moveTo(cx - 24, 190);
    ctx.bezierCurveTo(cx - 130, 230, cx - 130, bot - 40, cx - 80, bot); ctx.lineTo(cx + 80, bot);
    ctx.bezierCurveTo(cx + 130, bot - 40, cx + 130, 230, cx + 24, 190); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(214,240,244,0.6)"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 24, 120); ctx.lineTo(cx - 24, 190);
    ctx.bezierCurveTo(cx - 130, 230, cx - 130, bot - 40, cx - 80, bot); ctx.lineTo(cx + 80, bot);
    ctx.bezierCurveTo(cx + 130, bot - 40, cx + 130, 230, cx + 24, 190); ctx.lineTo(cx + 24, 120);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - 100, 270); ctx.bezierCurveTo(cx - 112, 320, cx - 106, 370, cx - 78, 408); ctx.stroke();
    // glowing CO2 bubbles
    for (const b of S.bubbles) {
      if (!arY) glow(ctx, b.x, b.y, b.r * 2.6, [255, 240, 210], 0.4);
      ctx.strokeStyle = "rgba(255,250,235,0.85)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,250,235,0.2)"; ctx.fill();
    }
    // delivery tube
    ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 8; ctx.lineCap = "butt";
    ctx.beginPath(); ctx.moveTo(cx, 120); ctx.lineTo(cx, 80); ctx.lineTo(640, 80); ctx.lineTo(640, 200); ctx.stroke();
    ctx.strokeStyle = "#3a8a94"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, 120); ctx.lineTo(cx, 82); ctx.lineTo(638, 82); ctx.lineTo(638, 198); ctx.stroke();
    // water trough + graduated cylinder
    ctx.strokeStyle = "rgba(214,240,244,0.5)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(540, 200); ctx.lineTo(548, 440); ctx.lineTo(780, 440); ctx.lineTo(788, 200); ctx.stroke();
    const wg = ctx.createLinearGradient(0, 230, 0, 436);
    wg.addColorStop(0, "rgba(86,184,255,0.10)"); wg.addColorStop(1, "rgba(86,184,255,0.22)");
    ctx.fillStyle = wg; ctx.fillRect(548, 230, 232, 206);
    ctx.strokeStyle = "rgba(214,240,244,0.6)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(610, 240, 70, 180, 6); ctx.stroke();
    const gh = Math.min(160, S.co2 * 4);
    if (!arY && gh > 4) glow(ctx, 645, 243 + gh / 2, 60, [255, 255, 255], 0.12);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(613, 243, 64, gh);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(613, 243 + i * 32); ctx.lineTo(625, 243 + i * 32); ctx.stroke(); }
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${MONO}`;
    ctx.fillText(`CO₂ = ${fmt(S.co2, 0)} mL`, 600, 470);
    hud(ctx, 140, 470, 420, 60, mode === "ar");
    ctx.font = `13px ${MONO}`; ctx.fillStyle = "#e9f6f3";
    ctx.fillText(`نرخ = ${fmt(rate, 2)}`, 160, 496);
    ctx.fillStyle = S.oxy ? "#35d3c2" : "#f2a83b";
    ctx.fillText(S.oxy ? "هوازی: 38 ATP / گلوکز" : "تخمیر: 2 ATP / گلوکز", 160, 518);
    frame.current++;
    if (frame.current % 7 === 0) force();
  }, true);

  return (
    <LabShell exp={exp} onBack={onBack} canvasRef={canvasRef} mode={mode} setMode={setMode}
      running={running}
      onToggleRun={() => { if (!S.running) start(); else { S.running = false; setRunning(false); } }}
      onReset={() => { S.running = false; setRunning(false); S.t = 0; S.co2 = 0; S.bubbles = []; S.samples = []; }}
      simClock={`CO₂ = ${fmt(S.co2, 0)} mL`}
      hint="هوازی و بی‌هوازی را مقایسه کنید؛ دمای بهینه حدود ۳۵° است و بالای ۵۰° مخمر از کار می‌افتد."
      protocol={[
        { label: "تخمیر بی‌هوازی و ثبت CO₂", done: S.samples.length > 10 },
        { label: "مقایسه با هوازی", done: S.oxy && S.samples.length > 5 },
        { label: "اثر غلظت قند", done: S.ev >= 1 || S.sugar !== 5 },
        { label: "اثر دمای بالا", done: S.T > 50 },
      ]}
      canvas={<canvas ref={canvasRef} width={960} height={560} className="block w-full h-auto" />}
      controls={<div className="space-y-5">
        <Slider label="غلظت قند" value={S.sugar} min={0.5} max={20} step={0.5} digits={1} unit="٪" accent="#f2a83b" onChange={(v) => { S.sugar = v; force(); }} />
        <Slider label="دما" value={S.T} min={10} max={60} step={1} digits={0} unit="°C" accent="#ff6f61" onChange={(v) => { S.T = v; force(); }} />
        <button onClick={() => { S.oxy = !S.oxy; pushFeed("info", S.oxy ? "اکسیژن وصل شد — تنفس هوازی." : "اکسیژن قطع شد — تخمیر الکلی."); force(); }}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer"
          style={S.oxy ? { borderColor: "#35d3c2", color: "#35d3c2", background: "#35d3c20f" } : { borderColor: "#f2a83b", color: "#f2a83b", background: "#f2a83b0f" }}>
          {S.oxy ? "شرایط: هوازی" : "شرایط: بی‌هوازی"}
        </button>
      </div>}
      chart={<LiveChart series={[sr("CO₂ (mL)", "#35d3c2", S.samples)]} xLabel="t (s)" yLabel="CO₂ (mL)" height={230} yMin={0} />}
      table={{ headers: ["t (s)", "CO₂ (mL)", "نرخ"], rows: S.samples.filter((_, i) => i % 4 === 0).map((p, i, arr) => { const prev = i > 0 ? arr[i - 1] : null; return [p.x, p.y, Number((prev ? (p.y - prev.y) / Math.max(p.x - prev.x, 0.1) : 0).toFixed(2))]; }) }}
      stats={[
        { label: "CO₂ جمع‌شده", value: `${fmt(S.co2, 0)} mL`, color: "#35d3c2" },
        { label: "نرخ نسبی", value: fmt(rate, 2), color: "#f2a83b" },
        { label: "شرایط", value: S.oxy ? "هوازی" : "بی‌هوازی", color: S.oxy ? "#35d3c2" : "#f2a83b" },
        { label: "ATP هر گلوکز", value: S.oxy ? "۳۸" : "۲", color: "#a5d95c" },
        { label: "دمای بهینه", value: "≈ 35 °C", color: "#ff6f61" },
        { label: "اثر دما f(T)", value: fmt(tempF, 2), color: "#e9f6f3" },
      ]}
      feed={S.feed} clearFeed={() => { S.feed = []; force(); }}
      latexExtra={[S.oxy ? `C6H12O6+6O2 -> 6CO2+6H2O (38 ATP)` : `C6H12O6 -> 2C2H5OH+2CO2 (2 ATP)`, `rate=${fmt(rate, 3)} at sugar=${fmt(S.sugar, 1)}\\%, T=${S.T}C`]} />
  );
}
