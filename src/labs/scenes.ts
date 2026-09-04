/* Bespoke animated apparatus scenes — one per experiment.
   Each scene draws a distinctive instrument driven by live params (p) and time (t),
   plus a compact live scope of the primary curve so the maths stays perceptible. */
import type { LabSpecDef } from "./specs1";
import { glow, rr, hexA, FA, MONO } from "./draw";
import {
  beaker, erlen, testTube, gradCyl, burette, burner, bubbles, stirBar, labelChip, caption, meter, dimArrow,
  lens, prism, ray, lightSource, screenBand,
  wire, resistor, battery, led, diode, capacitor, inductor, chipBox,
  cell, bacteria, dnaHelix, leaf, enzyme, membraneWall,
  heartBeat, lungShape, pulseWave, vessel,
  spring, pendulumArm, massBlock, piston, magnet, fieldLines,
} from "./apparatus";

type Ctx = CanvasRenderingContext2D;
type P = Record<string, number>;
export type SceneFn = (ctx: Ctx, p: P, t: number, ar: boolean, spec: LabSpecDef) => void;

const W = 960, H = 560;
const TAU = Math.PI * 2;

/* ---------- shared helpers ---------- */
function sampleCurve(spec: LabSpecDef, p: P, n = 90) {
  const c = spec.curves[0];
  const x0 = c.x0 ?? 0, x1 = c.x1 ?? 1;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; pts.push({ x, y: c.fn(x, p) }); }
  return { pts, x0, x1 };
}

/** compact live scope with primary curve + current-param marker */
function scope(ctx: Ctx, x: number, y: number, w: number, h: number, spec: LabSpecDef, p: P, accent: string, ar: boolean) {
  ctx.fillStyle = "rgba(4,20,24,0.72)";
  rr(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = hexA(accent, 0.5); ctx.lineWidth = 1.4; rr(ctx, x, y, w, h, 10); ctx.stroke();
  const { pts, x0, x1 } = sampleCurve(spec, p);
  const ys = pts.map((q) => q.y).filter((v) => isFinite(v));
  if (ys.length < 2) return;
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y1 - y0 < 1e-9) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.12; y0 -= pad; y1 += pad;
  const X = (v: number) => x + 8 + ((v - x0) / (x1 - x0)) * (w - 16);
  const Y = (v: number) => y + h - 8 - ((Math.max(y0, Math.min(y1, v)) - y0) / (y1 - y0)) * (h - 16);
  ctx.strokeStyle = "rgba(143,188,184,0.15)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 8, y + h / 2); ctx.lineTo(x + w - 8, y + h / 2); ctx.stroke();
  ctx.strokeStyle = accent; ctx.lineWidth = 2.2;
  if (!ar) { ctx.shadowColor = accent; ctx.shadowBlur = 9; }
  ctx.beginPath();
  let pen = false;
  for (const q of pts) {
    if (!isFinite(q.y)) { pen = false; continue; }
    if (!pen) { ctx.moveTo(X(q.x), Y(q.y)); pen = true; } else ctx.lineTo(X(q.x), Y(q.y));
  }
  ctx.stroke(); ctx.shadowBlur = 0;
  const mk = spec.curves[0].markerKey;
  if (mk && p[mk] !== undefined) {
    const mv = spec.curves[0].fn(p[mk], p);
    if (isFinite(mv)) {
      ctx.fillStyle = "#35d3c2";
      ctx.beginPath(); ctx.arc(X(p[mk]), Y(mv), 4.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(53,211,194,0.5)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(X(p[mk]), Y(mv), 8.5, 0, TAU); ctx.stroke();
    }
  }
}

function chips(ctx: Ctx, x: number, y: number, items: { label: string; value: string; color?: string }[], w = 190) {
  items.slice(0, 4).forEach((it, i) => {
    const cy = y + i * 40;
    ctx.fillStyle = "rgba(4,20,24,0.78)";
    rr(ctx, x, cy, w, 34, 8); ctx.fill();
    ctx.strokeStyle = hexA(it.color ?? "#35d3c2", 0.4); ctx.lineWidth = 1.2; rr(ctx, x, cy, w, 34, 8); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${FA}`;
    ctx.fillText(it.label, x + 10, cy + 13);
    ctx.fillStyle = it.color ?? "#e9f6f3"; ctx.font = `700 13px ${MONO}`;
    ctx.fillText(it.value, x + 10, cy + 28);
  });
}

function title(ctx: Ctx, text: string, accent: string) {
  ctx.font = `700 17px ${FA}`;
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = "rgba(4,20,24,0.66)";
  rr(ctx, 18, 12, tw + 26, 36, 9); ctx.fill();
  ctx.strokeStyle = hexA(accent, 0.45); ctx.lineWidth = 1.3;
  rr(ctx, 18, 12, tw + 26, 36, 9); ctx.stroke();
  ctx.fillStyle = accent;
  ctx.fillText(text, 31, 36);
  ctx.fillStyle = hexA(accent, 0.9);
  ctx.fillRect(18, 50, Math.min(140, tw * 0.5), 2.5);
}

const ro = (spec: LabSpecDef, p: P) => spec.readouts(p);

/* ================================================================ */
/* PHYSICS scenes                                                    */
/* ================================================================ */
const phy: Record<string, SceneFn> = {
  "p-kepler": (ctx, p, t, ar, spec) => {
    title(ctx, "مدار سیاره به‌دور خورشید — قانون سوم کپلر", "#f2a83b");
    const cx = 300, cy = 300;
    glow(ctx, cx, cy, 90, [255, 210, 60], 0.5);
    ctx.fillStyle = "#ffd23c"; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, TAU); ctx.fill();
    const a = 60 + p.a * 4.5;
    ctx.strokeStyle = "rgba(86,184,255,0.4)"; ctx.setLineDash([5, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(cx, cy, a, a * 0.72, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const ang = t * (2.4 / Math.pow(p.a, 1.5));
    const px = cx + Math.cos(ang) * a, py = cy + Math.sin(ang) * a * 0.72;
    glow(ctx, px, py, 22, [86, 184, 255], 0.5);
    ctx.fillStyle = "#56b8ff"; ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(143,188,184,0.5)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    caption(ctx, cx + 40, cy - a * 0.4, `a = ${p.a.toFixed(1)} AU`, "#56b8ff", 12);
    scope(ctx, 600, 120, 320, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 600, 320, ro(spec, p), 320);
  },
  "p-escape": (ctx, p, t, ar, spec) => {
    title(ctx, "سرعت فرار از جاذبه سیاره", "#f2a83b");
    const cx = 280, cy = 320, R = 40 + p.R * 1.4;
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R);
    g.addColorStop(0, "#7a9fb5"); g.addColorStop(1, "#2f5568");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    fieldLines(ctx, cx, cy, 5, t, [143, 188, 184]);
    const ve = Math.sqrt((2 * 6.674e-11 * p.M * 1e24) / (p.R * 1e6)) / 1000;
    const rocketA = t * 0.9;
    const rx = cx + Math.cos(-1.1) * (R + 10 + (rocketA * ve * 6) % 130);
    const ry = cy + Math.sin(-1.1) * (R + 10 + (rocketA * ve * 6) % 130);
    glow(ctx, rx, ry, 18, [255, 111, 97], 0.6);
    ctx.fillStyle = "#e9f6f3";
    ctx.save(); ctx.translate(rx, ry); ctx.rotate(-1.1 + Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(6, 8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#ff6f61"; ctx.beginPath(); ctx.arc(rx - Math.cos(-1.1) * 14, ry - Math.sin(-1.1) * 14, 4, 0, TAU); ctx.fill();
    dimArrow(ctx, cx, cy - R - 8, cx, cy - R - 60, `vₑ=${ve.toFixed(1)} km/s`);
    scope(ctx, 580, 120, 340, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 580, 320, ro(spec, p), 340);
  },
  "p-torque": (ctx, p, t, ar, spec) => {
    title(ctx, "اهرم و تعادل گشتاورها", "#f2a83b");
    const cx = 300, cy = 300;
    const tau1 = p.F * p.r, tau2 = tau1; // balanced view
    const ang = Math.sin(t * 0.8) * 0.12;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.strokeStyle = "#8fbcb8"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-p.r * 110, 0); ctx.lineTo(p.r2 * 110, 0); ctx.stroke();
    massBlock(ctx, -p.r * 110, 26, 40, 30, `${p.F}N`, "#f2a83b");
    massBlock(ctx, p.r2 * 110, 26, 40, 30, "F₂", "#56b8ff");
    ctx.restore();
    ctx.fillStyle = "#2a7a80"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 26, cy + 70); ctx.lineTo(cx + 26, cy + 70); ctx.closePath(); ctx.fill();
    dimArrow(ctx, cx, cy - 40, cx - p.r * 110, cy - 40, `r₁=${p.r.toFixed(2)}m`, "#35d3c2");
    ctx.strokeStyle = "rgba(242,168,59,0.8)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 56, Math.PI, Math.PI + 1.2); ctx.stroke();
    ctx.fillStyle = "#f2a83b"; ctx.font = `11px ${MONO}`; ctx.fillText(`τ₁=${tau1.toFixed(0)} N·m`, cx - 150, cy - 60);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "p-centripetal": (ctx, p, t, ar, spec) => {
    title(ctx, "حرکت دایره‌ای و نیروی مرکزگرا", "#f2a83b");
    const cx = 290, cy = 300, r = 50 + p.r * 6;
    ctx.strokeStyle = "rgba(86,184,255,0.45)"; ctx.setLineDash([6, 7]); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const w = p.v / p.r;
    const a = t * w;
    const bx = cx + Math.cos(a) * r, by = cy + Math.sin(a) * r;
    ctx.strokeStyle = "rgba(143,188,184,0.6)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke();
    glow(ctx, bx, by, 24, [242, 168, 59], 0.5);
    ctx.fillStyle = "#f2a83b"; ctx.beginPath(); ctx.arc(bx, by, 12, 0, TAU); ctx.fill();
    // inward force arrow
    ctx.strokeStyle = "#ff6f61"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - Math.cos(a) * 44, by - Math.sin(a) * 44); ctx.stroke();
    ctx.fillStyle = "#ff6f61"; ctx.font = `11px ${MONO}`; ctx.fillText("F→مرکز", bx - Math.cos(a) * 60 - 20, by - Math.sin(a) * 60);
    ctx.fillStyle = "#1d5b63"; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, TAU); ctx.fill();
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "p-buoyancy": (ctx, p, t, ar, spec) => {
    title(ctx, "شناوری و اصل ارشمیدس", "#f2a83b");
    const bx = 280, by = 470;
    beaker(ctx, bx, by, 260, 300, 0.72, [86, 184, 255], "سیال");
    const frac = Math.min(1, p.ro / p.rf);
    const bobY = by - 300 * 0.72 + frac * 150 + Math.sin(t * 1.6) * 5;
    massBlock(ctx, bx, bobY, 84, 60, `${p.ro}`, "#f2a83b");
    bubbles(ctx, bx - 100, by - 210, 200, 150, 8, t, [86, 184, 255], 0.5);
    dimArrow(ctx, bx + 70, bobY + 30, bx + 70, bobY + 80, "F↑", "#35d3c2");
    ctx.strokeStyle = "#ff6f61"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(bx - 70, bobY - 30); ctx.lineTo(bx - 70, bobY + 30); ctx.stroke();
    ctx.fillStyle = "#ff6f61"; ctx.font = `11px ${MONO}`; ctx.fillText("W↓", bx - 92, bobY + 48);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "p-entropy": (ctx, p, t, ar, spec) => {
    title(ctx, "انرژی و آنتروپی — نوسانگرهای اینشتین", "#f2a83b");
    const n = Math.round(p.N), q = Math.round(p.q);
    const cols = 10, cw = 30;
    for (let i = 0; i < Math.min(n, 60); i++) {
      const x = 130 + (i % cols) * (cw + 8), y = 120 + Math.floor(i / cols) * (cw + 10);
      const e = ((i * 7 + Math.floor(t * 2)) % Math.max(1, q)) < q / n ? 1 : 0.25;
      ctx.strokeStyle = "rgba(53,211,194,0.5)"; ctx.lineWidth = 1.4; rr(ctx, x, y, cw, cw, 6); ctx.stroke();
      glow(ctx, x + cw / 2, y + cw / 2, 20, [242, 168, 59], 0.3 * e);
      ctx.fillStyle = `rgba(242,168,59,${0.2 + e * 0.6})`;
      ctx.beginPath(); ctx.arc(x + cw / 2, y + cw / 2, 7, 0, TAU); ctx.fill();
    }
    caption(ctx, 130, 420, `${n} نوسانگر · ${q} کوانتا — ریزحالت‌ها: Ω = C(N+q−1, q)`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "p-blackbody": (ctx, p, t, ar, spec) => {
    title(ctx, "تابش جسم سیاه — قانون وین", "#f2a83b");
    const T = p.T;
    const col: [number, number, number] = T < 3500 ? [255, 120, 60] : T < 6000 ? [255, 200, 120] : T < 9000 ? [240, 240, 255] : [170, 190, 255];
    glow(ctx, 280, 280, 130, col, 0.55 + 0.1 * Math.sin(t * 5));
    ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
    ctx.beginPath(); ctx.arc(280, 280, 55, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + t * 0.6;
      ctx.strokeStyle = hexA("#ffd23c", 0.5); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(280 + Math.cos(a) * 66, 280 + Math.sin(a) * 66); ctx.lineTo(280 + Math.cos(a) * 92, 280 + Math.sin(a) * 92); ctx.stroke();
    }
    caption(ctx, 210, 400, `T = ${T.toFixed(0)} K — λmax = ${(2.898e6 / T).toFixed(0)} nm`, "#e9f6f3", 12);
    scope(ctx, 580, 120, 340, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 580, 320, ro(spec, p), 340);
  },
  "p-compton": (ctx, p, t, ar, spec) => {
    title(ctx, "پراکندگی کمتون — فوتون و الکترون", "#35d3c2");
    const cx = 280, cy = 280;
    ctx.fillStyle = "#35d3c2"; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, TAU); ctx.fill();
    const ph = (t * 90) % 260;
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < 30; i++) { const x = 40 + i * 3 + ((ph) % 60); const y = cy + Math.sin(i * 0.7) * 5; if (x < cx - 14) { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } }
    ctx.stroke();
    const sa = 0.6;
    ctx.strokeStyle = "#ff6f61"; ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < 20; i++) { const d = (ph * 0.8) % 160 + i * 4; const x = cx + Math.cos(sa) * d; const y = cy - Math.sin(sa) * d + Math.sin(i * 0.9) * 5; if (x < 540) { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } }
    ctx.stroke();
    const er = (ph * 1.4) % 150;
    ctx.fillStyle = "#56b8ff"; ctx.beginPath(); ctx.arc(cx + Math.cos(-0.9) * er, cy - Math.sin(-0.9) * er, 6, 0, TAU); ctx.fill();
    caption(ctx, 150, 420, `λ′ − λ = (h/mₑc)(1−cosθ) — طول‌موج پراکنده بلندتر می‌شود`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "p-bohr": (ctx, p, t, ar, spec) => {
    title(ctx, "مدل بور — ترازهای انرژی هیدروژن", "#f2a83b");
    const cx = 260, cy = 300;
    ctx.fillStyle = "#ff6f61"; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, TAU); ctx.fill();
    for (let n = 1; n <= 5; n++) {
      const r = 30 + n * n * 12;
      ctx.strokeStyle = n === Math.round(p.n) ? "rgba(242,168,59,0.9)" : "rgba(86,184,255,0.35)";
      ctx.lineWidth = n === Math.round(p.n) ? 2.4 : 1.3;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`; ctx.fillText(`n=${n}`, cx + r + 4, cy - 4);
    }
    const en = Math.round(p.n);
    const a = t * (3 / (en * en));
    const er = 30 + en * en * 12;
    glow(ctx, cx + Math.cos(a) * er, cy + Math.sin(a) * er, 16, [242, 168, 59], 0.6);
    ctx.fillStyle = "#f2a83b"; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * er, cy + Math.sin(a) * er, 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#35d3c2"; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx + 30, cy); ctx.lineTo(cx + er, cy - er * 0.6); ctx.stroke(); ctx.setLineDash([]);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "p-lens": (ctx, p, t, ar, spec) => {
    title(ctx, "عدسی نازک و تشکیل تصویر", "#35d3c2");
    const lx = 300, cy = 260, f = p.f * 1.6, d = Math.min(p.do * 1.4, 240);
    ctx.strokeStyle = "rgba(143,188,184,0.3)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(80, cy); ctx.lineTo(540, cy); ctx.stroke();
    lens(ctx, lx, cy, 150, true);
    ctx.fillStyle = "#35d3c2";
    ctx.beginPath(); ctx.arc(lx - f, cy, 4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(lx + f, cy, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`; ctx.fillText("F", lx - f - 3, cy + 16); ctx.fillText("F′", lx + f - 6, cy + 16);
    // object
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx - d, cy); ctx.lineTo(lx - d, cy - 60); ctx.stroke();
    ctx.fillStyle = "#f2a83b"; ctx.beginPath(); ctx.moveTo(lx - d, cy - 68); ctx.lineTo(lx - d - 6, cy - 56); ctx.lineTo(lx - d + 6, cy - 56); ctx.closePath(); ctx.fill();
    const di = 1 / (1 / (p.f) - 1 / (p.do));
    if (isFinite(di) && Math.abs(di) < 400) {
      const hi = -(di / p.do) * 60;
      ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(lx + di * 1.6, cy); ctx.lineTo(lx + di * 1.6, cy + hi * 1.6); ctx.stroke();
      ray(ctx, [[lx - d, cy - 60], [lx, cy - 60], [lx + di * 1.6, cy + hi * 1.6]], "rgba(242,168,59,0.7)", 1.6);
      ray(ctx, [[lx - d, cy - 60], [lx, cy - ((p.do - p.f) / p.do) * 60 * 0 + -60 * (1 - p.f / p.do)], [lx + di * 1.6, cy + hi * 1.6]], "rgba(86,184,255,0.6)", 1.4, true);
    }
    caption(ctx, 120, 440, `1/f = 1/dₒ + 1/dᵢ  →  dᵢ = ${isFinite(di) ? di.toFixed(1) : "∞"} cm`, "#8fbcb8", 12);
    scope(ctx, 600, 120, 320, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 600, 320, ro(spec, p), 320);
  },
  "p-diffraction": (ctx, p, t, ar, spec) => {
    title(ctx, "پراش تک‌شکاف و پهنای نوار مرکزی", "#f2a83b");
    lightSource(ctx, 100, 260, t, "#ffd23c");
    ctx.fillStyle = "#1d5b63";
    ctx.fillRect(280, 120, 14, 260 / 2 - p.a * 4);
    ctx.fillRect(280, 260 + p.a * 4, 14, 260 / 2 - p.a * 4 + 40);
    ray(ctx, [[117, 260], [280, 260]], "rgba(255,210,60,0.8)", 2);
    const lamCol: [number, number, number] = p.lam < 490 ? [79, 139, 255] : p.lam < 560 ? [79, 224, 107] : [255, 155, 59];
    for (let i = -3; i <= 3; i++) {
      const yy = 260 + i * (30 + (p.lam / p.a) * 3);
      const inten = i === 0 ? 1 : 0.35 / (i * i);
      ray(ctx, [[294, 260], [540, yy]], `rgba(${lamCol[0]},${lamCol[1]},${lamCol[2]},${inten})`, i === 0 ? 2.6 : 1.4);
    }
    screenBand(ctx, 548, 130, 260, lamCol, 0.5 + 0.2 * Math.sin(t * 4));
    caption(ctx, 120, 440, `θ ≈ λ/a — هرچه شکاف باریک‌تر، پراش گسترده‌تر`, "#8fbcb8", 12);
    scope(ctx, 610, 120, 310, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 610, 320, ro(spec, p), 310);
  },
  "p-magnetic": (ctx, p, t, ar, spec) => {
    title(ctx, "حرکت بار در میدان مغناطیسی — مسیر مارپیچ", "#35d3c2");
    magnet(ctx, 160, 200, 44);
    fieldLines(ctx, 300, 260, 4, t, [143, 188, 184]);
    const r = 30 + (p.v / p.B) * 4;
    ctx.strokeStyle = "rgba(86,184,255,0.4)"; ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.arc(330, 280, Math.min(r, 150), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const a = t * 2.2;
    const bx = 330 + Math.cos(a) * Math.min(r, 150), by = 280 + Math.sin(a) * Math.min(r, 150);
    glow(ctx, bx, by, 18, [53, 211, 194], 0.6);
    ctx.fillStyle = "#35d3c2"; ctx.beginPath(); ctx.arc(bx, by, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e9f6f3"; ctx.font = `10px ${MONO}`; ctx.fillText("+q", bx - 6, by - 10);
    caption(ctx, 150, 440, `r = mv/qB — شعاع با سرعت زیاد و با میدان کم می‌شود`, "#8fbcb8", 12);
    scope(ctx, 600, 120, 320, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 600, 320, ro(spec, p), 320);
  },
  "p-relmom": (ctx, p, t, ar, spec) => {
    title(ctx, "تکانه نسبیتی — γ در سرعت‌های نزدیک نور", "#f2a83b");
    const b = p.b;
    ctx.strokeStyle = "rgba(143,188,184,0.3)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(100, 300); ctx.lineTo(560, 300); ctx.stroke();
    const len = 120 * Math.sqrt(1 - b * b);
    const x = 120 + ((t * 160 * b) % 420);
    glow(ctx, x + len / 2, 280, 40, [242, 168, 59], 0.4);
    ctx.fillStyle = "#f2a83b"; rr(ctx, x, 268, len, 24, 10); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; rr(ctx, x, 268, len, 24, 10); ctx.stroke();
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${MONO}`;
    ctx.fillText(`L = L₀√(1−v²/c²) = ${len.toFixed(0)}`, 120, 340);
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = "rgba(86,184,255,0.5)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(100 + i * 80, 240); ctx.lineTo(84 + i * 80, 240); ctx.stroke();
    }
    scope(ctx, 600, 120, 320, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 600, 320, ro(spec, p), 320);
  },
  "p-capacitor": (ctx, p, t, ar, spec) => {
    title(ctx, "خازن تخت — میدان و انرژی ذخیره‌شده", "#56b8ff");
    const cx = 280, gap = 40 + p.d * 6;
    ctx.fillStyle = "#9fc4c0"; ctx.fillRect(cx - 90, 200 - gap / 2 - 10, 180, 10);
    ctx.fillRect(cx - 90, 200 + gap / 2, 180, 10);
    for (let i = 0; i < 5; i++) {
      const y0 = 200 - gap / 2, y1 = 200 + gap / 2;
      ctx.strokeStyle = "rgba(86,184,255,0.5)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(cx - 70 + i * 35, y0); ctx.lineTo(cx - 70 + i * 35, y1); ctx.stroke();
      ctx.fillStyle = "rgba(86,184,255,0.8)";
      ctx.beginPath(); ctx.moveTo(cx - 70 + i * 35, y1 - 8); ctx.lineTo(cx - 74 + i * 35, y1 - 16); ctx.lineTo(cx - 66 + i * 35, y1 - 16); ctx.closePath(); ctx.fill();
    }
    wire(ctx, [[cx - 90, 200 - gap / 2 - 5], [cx - 140, 200 - gap / 2 - 5], [cx - 140, 320], [cx + 140, 320], [cx + 140, 200 + gap / 2 + 5], [cx + 90, 200 + gap / 2 + 5]]);
    battery(ctx, cx, 320, `${p.V}V`);
    glow(ctx, cx, 200, gap, [86, 184, 255], 0.15 + 0.05 * Math.sin(t * 4));
    caption(ctx, 140, 440, `C = ε₀A/d — فاصله بیشتر، ظرفیت کمتر`, "#8fbcb8", 12);
    scope(ctx, 600, 120, 320, 170, spec, p, "#56b8ff", ar);
    chips(ctx, 600, 320, ro(spec, p), 320);
  },
  "p-gravfield": (ctx, p, t, ar, spec) => {
    title(ctx, "میدان گرانشی و کاهش g با ارتفاع", "#f2a83b");
    const cx = 280, cy = 420, R = 90;
    const g2 = ctx.createRadialGradient(cx - 25, cy - 25, 20, cx, cy, R);
    g2.addColorStop(0, "#5d8a90"); g2.addColorStop(1, "#2f5568");
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    const hPix = Math.min(p.h * 0.006, 220);
    ctx.strokeStyle = "rgba(143,188,184,0.5)"; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy - R - hPix); ctx.stroke(); ctx.setLineDash([]);
    const satY = cy - R - hPix;
    glow(ctx, cx, satY, 18, [242, 168, 59], 0.6);
    ctx.fillStyle = "#f2a83b"; ctx.beginPath(); ctx.arc(cx, satY, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(86,184,255,0.5)";
    ctx.beginPath(); ctx.ellipse(cx, satY, 70, 16, 0, 0, TAU); ctx.stroke();
    dimArrow(ctx, cx + 60, cy - R, cx + 60, satY, `h=${p.h.toFixed(0)}km`, "#35d3c2");
    caption(ctx, 150, 100, `g = GM/(R+h)² — در مدار ضعیف‌تر می‌شود`, "#8fbcb8", 12);
    scope(ctx, 600, 120, 320, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 600, 320, ro(spec, p), 320);
  },
};

/* ================================================================ */
/* CHEMISTRY scenes                                                  */
/* ================================================================ */
const chem: Record<string, SceneFn> = {
  "c-gaslaw": (ctx, p, t, ar, spec) => {
    title(ctx, "گاز ایده‌آل — PV = nRT در پیستون", "#f2a83b");
    const V = (p.n * 8.314 * p.T) / 101.3;
    piston(ctx, 200, 140, 170, 280, Math.min(0.95, V / 330), (p.T - 200) / 400);
    caption(ctx, 190, 460, `V = ${V.toFixed(1)} L  (n=${p.n.toFixed(1)}, T=${p.T.toFixed(0)}K)`, "#e9f6f3", 12);
    bubbles(ctx, 220, 200, 130, 180, 10, t, [242, 168, 59], 0.5);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-beer": (ctx, p, t, ar, spec) => {
    title(ctx, "قانون بیر–لامبرت — اسپکتروفتومتر", "#35d3c2");
    lightSource(ctx, 110, 250, t, "#ffd23c");
    const A = p.eps * p.l * p.c;
    const trans = Math.pow(10, -A);
    const cuvette: [number, number, number] = [255, 111, 97];
    ctx.fillStyle = "rgba(170,215,230,0.08)"; rr(ctx, 260, 190, 70, 120, 6); ctx.fill();
    ctx.strokeStyle = "rgba(214,240,244,0.6)"; rr(ctx, 260, 190, 70, 120, 6); ctx.stroke();
    ctx.fillStyle = `rgba(${cuvette[0]},${cuvette[1]},${cuvette[2]},${Math.min(0.85, 0.15 + A * 0.4)})`;
    rr(ctx, 264, 210, 62, 96, 4); ctx.fill();
    ray(ctx, [[127, 250], [260, 250]], "rgba(255,210,60,0.9)", 3);
    ray(ctx, [[330, 250], [470, 250]], `rgba(255,210,60,${0.15 + trans * 0.75})`, 3);
    ctx.fillStyle = "#0a2429"; rr(ctx, 470, 210, 30, 80, 5); ctx.fill();
    ctx.strokeStyle = "#35d3c2"; rr(ctx, 470, 210, 30, 80, 5); ctx.stroke();
    caption(ctx, 150, 400, `A = εlc = ${A.toFixed(2)}  →  T = ${(trans * 100).toFixed(0)}٪`, "#e9f6f3", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-vanthoff": (ctx, p, t, ar, spec) => {
    title(ctx, "معادله وانت‌هوف — وابستگی K به دما", "#f2a83b");
    burner(ctx, 240, 430, t, [255, 150, 80]);
    testTube(ctx, 240, 240, 70, 180, 0.6, [242, 168, 59]);
    bubbles(ctx, 215, 120, 50, 100, 6, t, [255, 200, 150], 0.6);
    caption(ctx, 130, 100, `T = ${p.T.toFixed(0)} K — ΔH<0: گرما دادن K را کم می‌کند`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-hydrolysis": (ctx, p, t, ar, spec) => {
    title(ctx, "هیدرولیز نمک — pH محلول", "#56b8ff");
    beaker(ctx, 260, 440, 220, 240, 0.6, [86, 184, 255], "نمک حل‌شده");
    stirBar(ctx, 260, 420, t);
    const ph = 7 + 0.5 * Math.log10(p.c) + 2.5;
    meter(ctx, 470, 320, 70, Math.min(14, Math.max(0, ph)), 14, "pH", ph > 7 ? "#56b8ff" : "#f2a83b");
    caption(ctx, 140, 110, "آنionِ بازِ مزدوج با آب واکنش می‌دهد → محیط بازی", "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#56b8ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-nernst": (ctx, p, t, ar, spec) => {
    title(ctx, "معادله نرنست — پتانسیل سلول", "#35d3c2");
    ctx.fillStyle = "#0e4a52"; rr(ctx, 150, 200, 130, 180, 8); ctx.fill();
    ctx.strokeStyle = "#2a7a80"; rr(ctx, 150, 200, 130, 180, 8); ctx.stroke();
    ctx.fillStyle = "#0e4a52"; rr(ctx, 330, 200, 130, 180, 8); ctx.fill();
    ctx.strokeStyle = "#2a7a80"; rr(ctx, 330, 200, 130, 180, 8); ctx.stroke();
    ctx.fillStyle = "#9fc4c0"; ctx.fillRect(195, 160, 16, 120); ctx.fillRect(375, 160, 16, 120);
    wire(ctx, [[203, 160], [203, 120], [383, 120], [383, 160]]);
    meter(ctx, 295, 120, 46, 1.1 - 0.059 * p.logQ, 2, "E (V)", "#35d3c2", "V");
    ctx.fillStyle = "#2a7a80"; rr(ctx, 270, 220, 70, 14, 6); ctx.fill();
    caption(ctx, 150, 430, `E = E° − (0.059/n)·logQ`, "#8fbcb8", 12);
    bubbles(ctx, 350, 230, 90, 130, 5, t, [53, 211, 194], 0.4);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-order": (ctx, p, t, ar, spec) => {
    title(ctx, "سینتیک مرتبه اول — نیمه‌عمر ثابت", "#f2a83b");
    beaker(ctx, 240, 440, 210, 230, 0.7, [242, 168, 59]);
    const n = 14;
    for (let i = 0; i < n; i++) {
      const alive = ((i * 37) % 100) / 100 > (1 - Math.exp(-p.k * (t % 20))) ? 0 : 1;
      if (alive) { ctx.fillStyle = "rgba(242,168,59,0.8)"; ctx.beginPath(); ctx.arc(160 + (i % 5) * 38, 280 + Math.floor(i / 5) * 34, 8, 0, TAU); ctx.fill(); }
    }
    stirBar(ctx, 240, 420, t);
    caption(ctx, 130, 110, `t½ = ln2/k = ${(0.693 / p.k).toFixed(1)} min — مستقل از غلظت`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-collision": (ctx, p, t, ar, spec) => {
    title(ctx, "نظریه برخورد — انرژی فعال‌سازی", "#ff6f61");
    for (let i = 0; i < 12; i++) {
      const x = 120 + ((i * 89 + t * 60) % 420);
      const y = 200 + ((i * 53) % 160) + Math.sin(t * 3 + i) * 8;
      ctx.fillStyle = i % 3 === 0 ? "#ff6f61" : "#56b8ff";
      ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,111,97,0.6)"; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(100, 160); ctx.lineTo(540, 160); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#ff6f61"; ctx.font = `11px ${MONO}`; ctx.fillText(`Ea = ${p.Ea} kJ/mol`, 400, 150);
    caption(ctx, 130, 430, "فقط برخوردهایی با E ≥ Ea واکنش می‌دهند", "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#ff6f61", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-gibbs": (ctx, p, t, ar, spec) => {
    title(ctx, "انرژی آزاد گیبس — خودبه‌خودی بودن", "#35d3c2");
    const dG = p.dH - (p.T * p.dS) / 1000;
    const spont = dG < 0;
    beaker(ctx, 250, 430, 210, 220, 0.65, spont ? [53, 211, 194] : [255, 111, 97], spont ? "خودبه‌خودی" : "غیرخودبه‌خودی");
    if (spont) bubbles(ctx, 170, 260, 160, 140, 8, t, [53, 211, 194], 0.6);
    glow(ctx, 250, 330, 90, spont ? [53, 211, 194] : [255, 111, 97], 0.25);
    caption(ctx, 130, 110, `ΔG = ΔH − TΔS = ${dG.toFixed(1)} kJ/mol`, "#e9f6f3", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-clapeyron": (ctx, p, t, ar, spec) => {
    title(ctx, "معادله کلاپیرون — مرز فاز مایع/بخار", "#56b8ff");
    burner(ctx, 240, 440, t, [255, 150, 80]);
    erlen(ctx, 240, 300, 120, 0.5, [86, 184, 255]);
    bubbles(ctx, 190, 220, 100, 80, 7, t, [200, 230, 255], 0.7);
    ctx.strokeStyle = "rgba(200,230,255,0.5)";
    ctx.beginPath(); ctx.moveTo(240, 180); ctx.bezierCurveTo(300, 140, 360, 120, 420, 110); ctx.stroke();
    caption(ctx, 130, 90, `dP/dT = ΔH/(T·ΔV) — شیب منحنی تعادل`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#56b8ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-raoult": (ctx, p, t, ar, spec) => {
    title(ctx, "قانون رائول — فشار بخار محلول", "#35d3c2");
    beaker(ctx, 200, 430, 150, 200, 0.6, [86, 184, 255], "A");
    beaker(ctx, 360, 430, 150, 200, 0.6, [179, 136, 255], "B");
    for (let i = 0; i < 6; i++) {
      const yy = 180 - ((t * 30 + i * 40) % 130);
      ctx.fillStyle = i % 2 ? "rgba(86,184,255,0.7)" : "rgba(179,136,255,0.7)";
      ctx.beginPath(); ctx.arc(180 + (i % 2) * 180 + Math.sin(t + i) * 8, yy, 5, 0, TAU); ctx.fill();
    }
    caption(ctx, 130, 100, `P = X_A·P°_A + X_B·P°_B — مخلوط ایده‌آل`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-colligative": (ctx, p, t, ar, spec) => {
    title(ctx, "خواص کولیگاتیو — افت نقطه انجماد", "#56b8ff");
    testTube(ctx, 200, 380, 80, 220, 0.7, [86, 184, 255]);
    ctx.fillStyle = "rgba(220,240,255,0.5)";
    for (let i = 0; i < 8; i++) ctx.beginPath(), ctx.arc(170 + (i % 3) * 22, 200 + Math.floor(i / 3) * 20, 4, 0, TAU), ctx.fill();
    ctx.fillStyle = "rgba(242,168,59,0.8)";
    for (let i = 0; i < 5; i++) ctx.beginPath(), ctx.arc(185 + (i % 2) * 26, 300 + Math.floor(i / 2) * 24, 6, 0, TAU), ctx.fill();
    const dTf = p.i * 1.86 * p.m;
    caption(ctx, 120, 100, `ΔTf = i·Kf·m = ${dTf.toFixed(1)} °C — یون‌ها اثر را چند برابر می‌کنند`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#56b8ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-osmosis": (ctx, p, t, ar, spec) => {
    title(ctx, "فشار اسمزی — غشای نیمه‌تراوا", "#35d3c2");
    membraneWall(ctx, 280, 150, 420, t, 3);
    for (let i = 0; i < 10; i++) ctx.fillStyle = "rgba(86,184,255,0.8)", ctx.beginPath(), ctx.arc(160 + (i % 4) * 28, 200 + Math.floor(i / 4) * 55, 6, 0, TAU), ctx.fill();
    for (let i = 0; i < 4 + p.M * 14; i++) ctx.fillStyle = "rgba(242,168,59,0.8)", ctx.beginPath(), ctx.arc(320 + (i % 5) * 30, 190 + Math.floor(i / 5) * 44, 6, 0, TAU), ctx.fill();
    const flow = ((t * 40) % 60);
    ctx.strokeStyle = "rgba(53,211,194,0.8)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(230 - flow * 0 + 60, 285); ctx.lineTo(268, 285); ctx.stroke();
    ctx.fillStyle = "#56b8ff"; ctx.beginPath(); ctx.arc(270, 285, 5, 0, TAU); ctx.fill();
    caption(ctx, 130, 110, `π = iMRT — آب به سمت غلظت بیشتر حرکت می‌کند`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-phdilution": (ctx, p, t, ar, spec) => {
    title(ctx, "رقیق‌سازی اسید — تغییر pH", "#ff6f61");
    const vols = [1, 10, 100];
    vols.forEach((v, i) => {
      const x = 150 + i * 130;
      gradCyl(ctx, x, 420, 70, 200, 0.5 + i * 0.1, [255, 111, 97]);
      ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`; ctx.fillText(`×${v}`, x - 10, 445);
    });
    ctx.strokeStyle = "rgba(143,188,184,0.6)";
    ctx.beginPath(); ctx.moveTo(220, 250); ctx.bezierCurveTo(260, 230, 280, 230, 300, 250); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(350, 250); ctx.bezierCurveTo(390, 230, 410, 230, 430, 250); ctx.stroke();
    caption(ctx, 130, 110, "هر ۱۰ برابر رقیق‌سازی، pH اسید قوی یک واحد بالا می‌رود", "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#ff6f61", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-redoxtable": (ctx, p, t, ar, spec) => {
    title(ctx, "ردیف الکتروشیمیایی — پتانسیل کاهش", "#f2a83b");
    const names = ["Li", "Zn", "Fe", "H₂", "Cu", "Ag", "Au", "F₂"];
    names.forEach((nm, i) => {
      const y = 120 + i * 38;
      const sel = i === Math.round(p.k);
      ctx.fillStyle = sel ? "rgba(242,168,59,0.2)" : "rgba(15,61,70,0.5)";
      rr(ctx, 130, y, 280, 30, 6); ctx.fill();
      if (sel) { ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 1.6; rr(ctx, 130, y, 280, 30, 6); ctx.stroke(); }
      ctx.fillStyle = sel ? "#f2a83b" : "#e9f6f3"; ctx.font = `700 13px ${MONO}`;
      ctx.fillText(nm, 145, y + 20);
      const E = [-3.04, -0.76, -0.44, 0, 0.34, 0.8, 1.5, 2.87][i];
      ctx.fillStyle = E < 0 ? "#56b8ff" : "#ff6f61";
      ctx.fillText(`${E > 0 ? "+" : ""}${E.toFixed(2)} V`, 300, y + 20);
    });
    caption(ctx, 130, 460, "پایین‌تر = اکسنده قوی‌تر — الکترون از بالا به پایین جاری است", "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-complex": (ctx, p, t, ar, spec) => {
    title(ctx, "تشکیل کمپلکس — ثابت پایداری Kf", "#b388ff");
    ctx.fillStyle = "#56b8ff"; ctx.beginPath(); ctx.arc(200, 280, 16, 0, TAU); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + t * 1.2;
      ctx.strokeStyle = "rgba(179,136,255,0.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(200, 280); ctx.lineTo(200 + Math.cos(a) * 44, 280 + Math.sin(a) * 44); ctx.stroke();
      ctx.fillStyle = "#b388ff"; ctx.beginPath(); ctx.arc(200 + Math.cos(a) * 52, 280 + Math.sin(a) * 52, 9, 0, TAU); ctx.fill();
    }
    glow(ctx, 200, 280, 60, [179, 136, 255], 0.3);
    caption(ctx, 120, 430, `M + 4L ⇌ ML₄  —  logKf = ${p.Kf.toFixed(1)}`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#b388ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-bondenergy": (ctx, p, t, ar, spec) => {
    title(ctx, "انرژی پیوند — آنتالپی واکنش", "#f2a83b");
    const n = Math.round(p.n);
    for (let i = 0; i < n; i++) {
      const x = 140 + (i % 4) * 60, y = 220 + Math.floor(i / 4) * 60;
      ctx.fillStyle = "#8fbcb8"; ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.fill();
      ctx.fillStyle = "#e9f6f3"; ctx.beginPath(); ctx.arc(x + 30, y, 9, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(242,168,59,0.8)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + 22, y); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(242,168,59,0.5)"; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(130, 330); ctx.lineTo(370, 330); ctx.stroke(); ctx.setLineDash([]);
    caption(ctx, 130, 420, `ΔH = ΣE(شکستن) − ΣE(تشکیل) — ${n} پیوند C–H`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-uvvis": (ctx, p, t, ar, spec) => {
    title(ctx, "جذب UV-Vis — مزدوجی و λmax", "#b388ff");
    const k = Math.round(p.k);
    for (let i = 0; i < k; i++) {
      const x = 130 + i * 34, y = 260;
      ctx.strokeStyle = i % 2 ? "rgba(179,136,255,0.9)" : "rgba(179,136,255,0.5)";
      ctx.lineWidth = i % 2 ? 4 : 2.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 26, y); ctx.stroke();
      if (i % 2) { ctx.beginPath(); ctx.moveTo(x + 4, y + 8); ctx.lineTo(x + 22, y + 8); ctx.stroke(); }
    }
    const lam = 200 + k * 30;
    const col: [number, number, number] = lam < 400 ? [154, 107, 255] : lam < 500 ? [79, 139, 255] : [79, 224, 107];
    ray(ctx, [[120, 200], [480, 200]], `rgba(${col[0]},${col[1]},${col[2]},0.8)`, 2.6);
    caption(ctx, 130, 400, `هر پیوند مزدوج بیشتر → λmax بلندتر (${lam} nm)`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#b388ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-tlc": (ctx, p, t, ar, spec) => {
    title(ctx, "کروماتوگرافی لایه‌نازک — جداسازی اجزا", "#a5d95c");
    ctx.fillStyle = "rgba(230,230,220,0.12)"; rr(ctx, 180, 120, 180, 300, 6); ctx.fill();
    ctx.strokeStyle = "rgba(214,240,244,0.5)"; rr(ctx, 180, 120, 180, 300, 6); ctx.stroke();
    ctx.strokeStyle = "rgba(86,184,255,0.6)"; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(180, 390); ctx.lineTo(360, 390); ctx.stroke(); ctx.setLineDash([]);
    const rf = 0.3 + p.pol * 0.5;
    const comps = [[0.9, "#f2a83b"], [0.6, "#35d3c2"], [0.35, "#b388ff"]];
    comps.forEach(([f, col], i) => {
      const y = 390 - (f as number) * rf * 250;
      glow(ctx, 220 + i * 50, y, 22, hexRgbOf(col as string), 0.4);
      ctx.fillStyle = col as string; ctx.beginPath(); ctx.arc(220 + i * 50, y, 12, 0, TAU); ctx.fill();
    });
    caption(ctx, 130, 460, `Rf = مسافت جزء / مسافت حلال — قطبیت بیشتر، حرکت بیشتر`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#a5d95c", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-faraday": (ctx, p, t, ar, spec) => {
    title(ctx, "الکترولیز — قوانین فارادی", "#f2a83b");
    ctx.fillStyle = "rgba(170,215,230,0.08)"; rr(ctx, 160, 200, 240, 200, 6); ctx.fill();
    ctx.strokeStyle = "rgba(214,240,244,0.55)"; rr(ctx, 160, 200, 240, 200, 6); ctx.stroke();
    ctx.fillStyle = "#9fc4c0"; ctx.fillRect(190, 160, 16, 150); ctx.fillRect(350, 160, 16, 150);
    wire(ctx, [[198, 160], [198, 120], [358, 120], [358, 160]]);
    battery(ctx, 278, 120, `${p.I}A`);
    const deposit = Math.min(1, (p.I * (t % 30)) / 60);
    ctx.fillStyle = "rgba(242,168,59,0.85)"; ctx.fillRect(344, 180, 8 + deposit * 10, 120);
    for (let i = 0; i < 6; i++) {
      const x = 210 + ((t * 40 + i * 40) % 130);
      ctx.fillStyle = "rgba(242,168,59,0.8)"; ctx.beginPath(); ctx.arc(x, 250 + (i % 3) * 30, 5, 0, TAU); ctx.fill();
    }
    caption(ctx, 130, 440, `m = (M·I·t)/(z·F) — جرم نشسته ∝ بار`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-lattice": (ctx, p, t, ar, spec) => {
    title(ctx, "انرژی شبکه — بلور یونی", "#56b8ff");
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = 160 + i * 56, y = 180 + j * 56;
      const pos = (i + j) % 2 === 0;
      glow(ctx, x, y, 16, pos ? [86, 184, 255] : [255, 111, 97], 0.35);
      ctx.fillStyle = pos ? "#56b8ff" : "#ff6f61";
      ctx.beginPath(); ctx.arc(x, y, pos ? 12 : 10, 0, TAU); ctx.fill();
      ctx.fillStyle = "#04191d"; ctx.font = `700 10px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(pos ? "+" : "−", x, y + 3.5); ctx.textAlign = "left";
    }
    caption(ctx, 130, 430, `U ∝ z⁺z⁻/r — بار بیشتر، شبکه پایدارتر (z⁺z⁻=${p.z.toFixed(0)})`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#56b8ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "c-ratelaw": (ctx, p, t, ar, spec) => {
    title(ctx, "قانون سرعت — مرتبه واکنش", "#35d3c2");
    beaker(ctx, 200, 430, 150, 190, 0.6, [53, 211, 194], "A");
    beaker(ctx, 380, 430, 150, 190, 0.6, [242, 168, 59], "B");
    for (let i = 0; i < 5; i++) {
      const x = 280 + Math.sin(t * 2 + i) * 30, y = 250 + i * 22;
      ctx.fillStyle = "#a5d95c"; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = "rgba(165,217,92,0.7)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(230, 330); ctx.lineTo(270, 300); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(350, 330); ctx.lineTo(310, 300); ctx.stroke();
    caption(ctx, 130, 110, `v = k[A]^m — m=${p.m.toFixed(1)}، logk=${p.k.toFixed(1)}`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
};

function hexRgbOf(c: string): [number, number, number] {
  const h = c.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/* ================================================================ */
/* BIOLOGY scenes                                                    */
/* ================================================================ */
const bio: Record<string, SceneFn> = {
  "b-fick": (ctx, p, t, ar, spec) => {
    title(ctx, "انتشار ساده — قانون اول فیک", "#35d3c2");
    membraneWall(ctx, 280, 150, 420, t, 4);
    for (let i = 0; i < 8; i++) { const x = 150 + ((t * 26 + i * 45) % 240); ctx.fillStyle = "rgba(53,211,194,0.8)"; ctx.beginPath(); ctx.arc(x, 220 + (i % 3) * 60, 6, 0, TAU); ctx.fill(); }
    for (let i = 0; i < 3; i++) ctx.fillStyle = "rgba(53,211,194,0.35)", ctx.beginPath(), ctx.arc(330 + i * 50, 280 + (i % 2) * 50, 6, 0, TAU), ctx.fill();
    caption(ctx, 130, 110, `J = −D·A·(ΔC/Δx) — شار با شیب غلظت`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-osmocell": (ctx, p, t, ar, spec) => {
    title(ctx, "اسمز و تونیسیته — گلبول قرمز", "#ff6f61");
    const scale = p.osm < 280 ? 1.35 : p.osm > 320 ? 0.7 : 1;
    const wob = 1 + 0.04 * Math.sin(t * 3);
    glow(ctx, 260, 280, 100 * scale, [255, 111, 97], 0.25);
    ctx.fillStyle = "rgba(224,85,72,0.8)";
    ctx.beginPath(); ctx.arc(260, 280, 70 * scale * wob, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(150,40,35,0.55)";
    ctx.beginPath(); ctx.arc(260, 280, 30 * scale * wob, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,180,170,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(260, 280, 70 * scale * wob, 0, TAU); ctx.stroke();
    const env = p.osm < 280 ? "هیپوتونیک — تورم" : p.osm > 320 ? "هیپرتونیک — چروکیدگی" : "ایزوتونیک — پایدار";
    caption(ctx, 140, 430, `${env} (${p.osm} mOsm)`, "#e9f6f3", 13);
    scope(ctx, 590, 120, 330, 170, spec, p, "#ff6f61", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-lightresp": (ctx, p, t, ar, spec) => {
    title(ctx, "پاسخ نور — منحنی فتوسنتز", "#a5d95c");
    lightSource(ctx, 140, 160, t, "#ffd23c");
    leaf(ctx, 260, 280, 60, t);
    leaf(ctx, 330, 320, 46, t + 1);
    ctx.strokeStyle = "rgba(124,179,66,0.7)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(260, 340); ctx.quadraticCurveTo(280, 400, 300, 430); ctx.stroke();
    for (let i = 0; i < 5; i++) { const yy = 180 + ((t * 26 + i * 50) % 140); ctx.fillStyle = "rgba(165,217,92,0.7)"; ctx.beginPath(); ctx.arc(230 + i * 26, yy, 4, 0, TAU); ctx.fill(); }
    caption(ctx, 130, 470, "در نور کم محدود به نور، در نور زیاد اشباع می‌شود", "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#a5d95c", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-rq": (ctx, p, t, ar, spec) => {
    title(ctx, "ضریب تنفسی — سوخت مصرفی", "#f2a83b");
    lungShape(ctx, 200, 280, 90, 0.3 + 0.3 * Math.sin(t * 1.5), -1);
    lungShape(ctx, 320, 280, 90, 0.3 + 0.3 * Math.sin(t * 1.5), 1);
    ctx.strokeStyle = "#8fbcb8"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(260, 160); ctx.lineTo(260, 210); ctx.stroke();
    const rq = 1 - p.lip * 0.3;
    ctx.fillStyle = "rgba(242,168,59,0.8)"; rr(ctx, 150, 380, 200 * (rq / 1), 14, 6); ctx.fill();
    ctx.fillStyle = "rgba(179,136,255,0.8)"; rr(ctx, 150, 400, 200 * (p.lip), 14, 6); ctx.fill();
    caption(ctx, 130, 110, `RQ = CO₂/O₂ — کربوهیدرات≈۱، لیپید≈۰٫۷ (RQ=${rq.toFixed(2)})`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-popgrowth": (ctx, p, t, ar, spec) => {
    title(ctx, "رشد لجستیک جمعیت", "#a5d95c");
    const N = p.N0 * Math.exp(p.r * (t % 30)) / (1 + (p.N0 / p.K) * (Math.exp(p.r * (t % 30)) - 1));
    const nDots = Math.min(60, Math.round(N / (p.K / 60)));
    for (let i = 0; i < nDots; i++) {
      const x = 130 + ((i * 97) % 380), y = 160 + ((i * 61) % 240);
      ctx.fillStyle = "rgba(165,217,92,0.75)"; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,111,97,0.6)"; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(110, 160 + 240 * (1 - 1)); ctx.lineTo(520, 160); ctx.stroke(); ctx.setLineDash([]);
    caption(ctx, 130, 440, `N = ${N.toFixed(0)} از K=${p.K} — رشد کند می‌شود`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#a5d95c", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-survivorship": (ctx, p, t, ar, spec) => {
    title(ctx, "منحنی بقا — استراتژی زندگی", "#56b8ff");
    const icons = ["👤", "🐦", "🐟"];
    const idx = Math.min(2, Math.max(0, Math.round(p.type) - 1));
    ctx.font = "46px serif"; ctx.fillText(icons[idx], 240, 260);
    ctx.strokeStyle = "rgba(86,184,255,0.5)"; ctx.lineWidth = 2;
    const ty = p.type;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const f = i / 40;
      const s = ty < 1.5 ? Math.pow(1 - f, 0.35) : ty < 2.5 ? 1 - f : Math.pow(1 - f, 3);
      const x = 140 + f * 320, y = 380 - s * 200;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    caption(ctx, 130, 110, `نوع ${["I (انسان)", "II (پرندگان)", "III (ماهی)"][idx]}`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#56b8ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-chisquare": (ctx, p, t, ar, spec) => {
    title(ctx, "آزمون خی‌دو — تناسب فنوتیپ‌ها", "#f2a83b");
    const obs = [p.o1, p.o2, p.o3, p.o4];
    const cols = ["#f2a83b", "#35d3c2", "#56b8ff", "#a5d95c"];
    const tot = obs.reduce((a, b) => a + b, 0);
    obs.forEach((v, i) => {
      const h = (v / 400) * 220;
      const x = 150 + i * 90;
      glow(ctx, x + 25, 400 - h / 2, 50, hexRgbOf(cols[i]), 0.2);
      ctx.fillStyle = cols[i]; rr(ctx, x, 400 - h, 50, h, 6); ctx.fill();
      ctx.fillStyle = "#e9f6f3"; ctx.font = `11px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(`${v}`, x + 25, 392 - h); ctx.textAlign = "left";
    });
    ctx.strokeStyle = "rgba(255,111,97,0.7)"; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(140, 400 - (tot / 4 / 400) * 220); ctx.lineTo(510, 400 - (tot / 4 / 400) * 220); ctx.stroke(); ctx.setLineDash([]);
    caption(ctx, 140, 110, "خط‌چین = انتظار مندلی — انحراف → رد فرضیه", "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-linkage": (ctx, p, t, ar, spec) => {
    title(ctx, "پیوستگی ژنی — کراسینگ‌اور", "#b388ff");
    ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(200, 180); ctx.lineTo(200, 380); ctx.stroke();
    ctx.strokeStyle = "#f2a83b";
    ctx.beginPath(); ctx.moveTo(240, 180); ctx.lineTo(240, 250); ctx.bezierCurveTo(240, 290, 200, 300, 200, 340); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(200, 250); ctx.bezierCurveTo(200, 290, 240, 300, 240, 340); ctx.lineTo(240, 380); ctx.stroke();
    ctx.fillStyle = "#56b8ff"; ctx.beginPath(); ctx.arc(200, 210, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ff6f61"; ctx.beginPath(); ctx.arc(240, 210, 8, 0, TAU); ctx.fill();
    glow(ctx, 220, 295, 30, [179, 136, 255], 0.5);
    caption(ctx, 130, 440, `فاصله ${p.d} cM — هر ۱٪ نوترکیبی = ۱ سانتی‌مورگان`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#b388ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-proteindenat": (ctx, p, t, ar, spec) => {
    title(ctx, "دناتوراسیون پروتئین با دما", "#ff6f61");
    const den = Math.exp(-((p.Topt + 25 - p.Topt) ** 2) / (2 * p.w * p.w)) > 0.5 ? false : true;
    burner(ctx, 220, 440, t, [255, 130, 80]);
    if (den) {
      ctx.strokeStyle = "rgba(255,111,97,0.8)"; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(180 + i * 30, 240); ctx.bezierCurveTo(190 + i * 30, 200, 170 + i * 30, 280, 200 + i * 30, 300); ctx.stroke(); }
    } else {
      enzyme(ctx, 220, 260, 55, t, [53, 211, 194]);
    }
    caption(ctx, 120, 110, `دمای بهینه ${p.Topt}°C — بالاتر از آن ساختار سوم فرو می‌ریزد`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#ff6f61", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-inhibitor": (ctx, p, t, ar, spec) => {
    title(ctx, "مهار رقابتی آنزیم", "#ff6f61");
    enzyme(ctx, 220, 260, 60, t, [53, 211, 194]);
    ctx.fillStyle = "#f2a83b"; ctx.beginPath(); ctx.arc(320 + Math.sin(t * 2) * 30, 220, 10, 0, TAU); ctx.fill();
    if (p.I > 2) {
      ctx.fillStyle = "#ff6f61";
      for (let i = 0; i < 3; i++) ctx.beginPath(), ctx.arc(270 + i * 24, 240 + Math.sin(t * 3 + i) * 8, 9, 0, TAU), ctx.fill();
      caption(ctx, 300, 300, "مهارکننده جایگاه فعال را اشغال کرد", "#ff6f61", 11);
    }
    ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`;
    ctx.fillText("سوبسترا", 310, 190); ctx.fillText("مهارکننده", 280, 330);
    scope(ctx, 590, 120, 330, 170, spec, p, "#ff6f61", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-dnamelt": (ctx, p, t, ar, spec) => {
    title(ctx, "ذوب DNA — وابسته به GC", "#35d3c2");
    dnaHelix(ctx, 220, 150, 200, t);
    const melted = p.gc < 40;
    if (melted) {
      ctx.strokeStyle = "rgba(53,211,194,0.6)"; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(190 + i * 12, 200 + i * 8); ctx.lineTo(170 + i * 12, 210 + i * 8); ctx.stroke(); }
    }
    caption(ctx, 120, 420, `GC=${p.gc}٪ — جفت‌های GC سه پیوند هیدروژنی دارند و پایدارترند`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-gentime": (ctx, p, t, ar, spec) => {
    title(ctx, "زمان نسل باکتری — رشد نمایی", "#a5d95c");
    const gens = Math.floor((t % 30) / (p.g / 6));
    const n = Math.min(64, Math.pow(2, gens));
    for (let i = 0; i < n; i++) {
      bacteria(ctx, 140 + ((i * 89) % 380), 180 + ((i * 53) % 220), t, i, [165, 217, 92]);
    }
    caption(ctx, 130, 440, `n = 2^(t/g) — ${n} باکتری پس از ${gens} نسل`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#a5d95c", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-competition": (ctx, p, t, ar, spec) => {
    title(ctx, "رقابت بین‌گونه‌ای — گاوس", "#35d3c2");
    for (let i = 0; i < 12; i++) { ctx.fillStyle = "rgba(53,211,194,0.8)"; ctx.beginPath(); ctx.arc(150 + ((i * 71) % 180), 200 + ((i * 47) % 160), 7, 0, TAU); ctx.fill(); }
    for (let i = 0; i < 10; i++) { ctx.fillStyle = "rgba(255,111,97,0.8)"; ctx.beginPath(); ctx.arc(330 + ((i * 83) % 180), 210 + ((i * 59) % 150), 7, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = "rgba(242,168,59,0.6)"; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(300, 160); ctx.lineTo(300, 400); ctx.stroke(); ctx.setLineDash([]);
    caption(ctx, 130, 440, "α₁₂ و α₂۱ شدت رقابت را تعیین می‌کنند — طرد رقابتی", "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-energypyramid": (ctx, p, t, ar, spec) => {
    title(ctx, "هرم انرژی — قانون ۱۰٪", "#a5d95c");
    const layers = [1, 0.1, 0.01, 0.001];
    const cols = ["#a5d95c", "#35d3c2", "#f2a83b", "#ff6f61"];
    const names = ["تولیدکننده", "مصرف‌کننده۱", "مصرف‌کننده۲", "راس"];
    layers.forEach((f, i) => {
      const w = 380 * Math.sqrt(f), h = 56;
      const y = 400 - i * 62;
      ctx.fillStyle = hexA(cols[i], 0.7 - i * 0.1);
      ctx.beginPath(); ctx.moveTo(280 - w / 2, y); ctx.lineTo(280 + w / 2, y); ctx.lineTo(280 + w / 2 - 30, y - h); ctx.lineTo(280 - w / 2 + 30, y - h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#04191d"; ctx.font = `10px ${FA}`; ctx.textAlign = "center";
      ctx.fillText(names[i], 280, y - 20); ctx.textAlign = "left";
    });
    caption(ctx, 130, 100, `E₀=${p.E0} — فقط ~۱۰٪ به تراز بعد منتقل می‌شود`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#a5d95c", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-shannon": (ctx, p, t, ar, spec) => {
    title(ctx, "تنوع زیستی — شاخص شانون", "#35d3c2");
    const S = Math.round(p.S);
    const palette = ["#f2a83b", "#35d3c2", "#56b8ff", "#a5d95c", "#b388ff", "#ff6f61", "#ffd23c", "#8fbcb8"];
    for (let i = 0; i < S * 4; i++) {
      const col = palette[i % S];
      ctx.fillStyle = hexA(col, 0.85);
      ctx.beginPath(); ctx.arc(140 + ((i * 83) % 400), 180 + ((i * 61) % 220), 8, 0, TAU); ctx.fill();
    }
    caption(ctx, 130, 440, `H′ = −Σpᵢ·ln(pᵢ) — ${S} گونه، یکنواختی ${p.J}`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-markrecapture": (ctx, p, t, ar, spec) => {
    title(ctx, "روش لینکلن–پترسن — برآورد جمعیت", "#f2a83b");
    for (let i = 0; i < 16; i++) {
      const marked = i < Math.min(16, Math.round((p.R / p.C) * 16));
      ctx.fillStyle = marked ? "#f2a83b" : "rgba(143,188,184,0.6)";
      ctx.beginPath();
      const x = 140 + ((i * 97 + t * 20) % 380), y = 180 + ((i * 71) % 200);
      ctx.arc(x, y, 9, 0, TAU); ctx.fill();
      if (marked) { ctx.strokeStyle = "#e9f6f3"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.stroke(); }
    }
    caption(ctx, 130, 430, `N = M·C/R — نسبت نشان‌دار در صید دوم`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-stomata": (ctx, p, t, ar, spec) => {
    title(ctx, "روزنه برگ — تبادل گاز و آب", "#a5d95c");
    leaf(ctx, 260, 260, 90, t);
    const open = p.co2 < 500 ? 14 : 5;
    ctx.fillStyle = "rgba(85,130,40,0.9)";
    ctx.beginPath(); ctx.ellipse(240, 250, 16, 30, 0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(280, 270, 16, 30, -0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(120,200,255,0.5)";
    ctx.beginPath(); ctx.ellipse(260, 260, open * 0.6, open, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 4; i++) { const yy = 200 - ((t * 24 + i * 40) % 90); ctx.fillStyle = "rgba(150,220,255,0.7)"; ctx.beginPath(); ctx.arc(255 + i * 5, yy, 3.5, 0, TAU); ctx.fill(); }
    caption(ctx, 130, 430, `VPD=${p.vpd} kPa — هوای خشک‌تر، تعرق بیشتر و بسته‌شدن روزنه`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#a5d95c", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-photoperiod": (ctx, p, t, ar, spec) => {
    title(ctx, "فتوپریودیسم — گل‌دهی و طول روز", "#f2a83b");
    const dayF = (Math.sin(t * 0.5) + 1) / 2;
    glow(ctx, 240, 180, 70, [255, 210, 60], 0.2 + dayF * 0.4);
    ctx.fillStyle = dayF > 0.5 ? "#ffd23c" : "#2f5568";
    ctx.beginPath(); ctx.arc(240, 180, 34, 0, TAU); ctx.fill();
    leaf(ctx, 240, 320, 50, t);
    ctx.strokeStyle = "rgba(124,179,66,0.8)"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(240, 370); ctx.lineTo(240, 420); ctx.stroke();
    ctx.fillStyle = dayF * 16 > p.crit ? "#ff6f61" : "#8fbcb8";
    ctx.beginPath(); ctx.arc(240, 300, dayF * 16 > p.crit ? 14 : 6, 0, TAU); ctx.fill();
    caption(ctx, 130, 110, `طول روز ${(dayF * 16).toFixed(1)}h در برابر بحرانی ${p.crit}h`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-lengthtension": (ctx, p, t, ar, spec) => {
    title(ctx, "طول–کشش سارکومر", "#ff6f61");
    const lo = p.lopt;
    for (let i = 0; i < 7; i++) {
      const x = 150 + i * 44;
      ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 14, 250); ctx.lineTo(x - 14, 290); ctx.stroke();
      ctx.strokeStyle = "#ff6f61";
      ctx.beginPath(); ctx.moveTo(x + 14, 240); ctx.lineTo(x + 14, 300); ctx.stroke();
      const ov = Math.max(0, 1 - Math.abs(lo - 2.2) * 3);
      ctx.strokeStyle = "rgba(143,188,184,0.7)"; ctx.lineWidth = 1.5;
      for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(x - 12, 258 + j * 12); ctx.lineTo(x - 12 + ov * 24, 258 + j * 12); ctx.stroke(); }
    }
    caption(ctx, 130, 400, `طول بهینه ${lo} µm — بیش‌کشیدگی، اتصال اکتین–میوزین را کم می‌کند`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#ff6f61", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-nitrogen": (ctx, p, t, ar, spec) => {
    title(ctx, "چرخه نیتروژن — تثبیت و دنیتریفیکاسیون", "#35d3c2");
    ctx.fillStyle = "#2f5568"; ctx.beginPath(); ctx.ellipse(280, 400, 180, 40, 0, 0, TAU); ctx.fill();
    leaf(ctx, 220, 360, 40, t); leaf(ctx, 330, 355, 34, t + 1);
    ctx.strokeStyle = "rgba(53,211,194,0.7)"; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const yy = 150 + ((t * 30 + i * 60) % 150); ctx.beginPath(); ctx.moveTo(260 + i * 30, 130); ctx.lineTo(260 + i * 30, yy); ctx.stroke(); }
    ctx.fillStyle = "#35d3c2"; ctx.font = `11px ${MONO}`;
    ctx.fillText("N₂", 250, 120); ctx.fillText("NH₄⁺", 350, 390); ctx.fillText("NO₃⁻", 160, 390);
    caption(ctx, 130, 90, `تثبیت ${p.fix} kg/ha — باکتری‌های ریزوبیوم N₂ را قابل‌جذب می‌کنند`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "b-plaque": (ctx, p, t, ar, spec) => {
    title(ctx, "تیتراسیون فاژ — شمارش پلاک", "#a5d95c");
    ctx.fillStyle = "rgba(180,135,90,0.25)"; ctx.beginPath(); ctx.arc(260, 280, 150, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(214,240,244,0.55)"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "rgba(165,217,92,0.4)"; ctx.beginPath(); ctx.arc(260, 280, 135, 0, TAU); ctx.fill();
    const nPlaques = Math.min(30, Math.round(Math.pow(10, p.titer - 6) * p.vol * 10));
    for (let i = 0; i < nPlaques; i++) {
      const a = i * 2.4, d = 20 + ((i * 47) % 110);
      ctx.fillStyle = "rgba(230,220,190,0.85)";
      ctx.beginPath(); ctx.arc(260 + Math.cos(a) * d, 280 + Math.sin(a) * d * 0.9, 7, 0, TAU); ctx.fill();
    }
    caption(ctx, 120, 470, `PFU/mL از شمارش پلاک‌ها در رقت مشخص`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#a5d95c", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
};

/* ================================================================ */
/* ELECTRONICS scenes                                                */
/* ================================================================ */
const ele: Record<string, SceneFn> = {
  "e-diodeiv": (ctx, p, t, ar, spec) => {
    title(ctx, "مشخصه I–V دیود — بایاس مستقیم", "#b388ff");
    wire(ctx, [[140, 200], [200, 200]]); battery(ctx, 170, 200, `${p.V}V`);
    wire(ctx, [[200, 200], [250, 200]]); resistor(ctx, 290, 200, 70, "R");
    wire(ctx, [[325, 200], [370, 200]]); diode(ctx, 395, 200);
    wire(ctx, [[413, 200], [460, 200], [460, 300], [140, 300], [140, 200]]);
    const on = p.V > 0.5 ? Math.min(1, (p.V - 0.5) * 2.5) : 0;
    led(ctx, 395, 245, on, "#ff6f61");
    if (on > 0.1) for (let i = 0; i < 5; i++) { const ex = 220 + ((t * 120 + i * 60) % 200); ctx.fillStyle = "rgba(179,136,255,0.8)"; ctx.beginPath(); ctx.arc(ex, 200, 3, 0, TAU); ctx.fill(); }
    caption(ctx, 130, 380, `I = Iₛ(e^(V/nVₜ)−1) — پس از ~۰٫۶V جریان جهش می‌کند`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#b388ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "e-thevenin": (ctx, p, t, ar, spec) => {
    title(ctx, "معادل تونن — ساده‌سازی مدار", "#35d3c2");
    wire(ctx, [[140, 180], [200, 180]]); battery(ctx, 170, 180, `${p.Vs}V`);
    wire(ctx, [[200, 180], [260, 180]]); resistor(ctx, 300, 180, 70, "R₁");
    wire(ctx, [[335, 180], [335, 240]]); resistor(ctx, 335, 280, 0); ctx.save(); ctx.translate(335, 280); ctx.rotate(Math.PI / 2); ctx.translate(-335, -280); ctx.restore();
    resistor(ctx, 335, 280, 70);
    wire(ctx, [[335, 315], [335, 360], [140, 360], [140, 180]]);
    chipBox(ctx, 480, 220, 110, 80, "تونن", "#35d3c2");
    wire(ctx, [[430, 240], [480, 240]]); wire(ctx, [[430, 280], [480, 280]]);
    ctx.strokeStyle = "rgba(53,211,194,0.5)"; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(430, 200); ctx.lineTo(430, 320); ctx.stroke(); ctx.setLineDash([]);
    caption(ctx, 130, 430, `Vₜₕ = Vs·R₂/(R₁+R₂) — مدار به یک منبع و یک مقاومت تقلیل می‌یابد`, "#8fbcb8", 12);
    scope(ctx, 600, 120, 320, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 600, 320, ro(spec, p), 320);
  },
  "e-transformer": (ctx, p, t, ar, spec) => {
    title(ctx, "ترانسفورماتور — القای متقابل", "#f2a83b");
    ctx.fillStyle = "#1d3a44"; rr(ctx, 240, 200, 14, 160, 4); ctx.fill();
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(225, 220 + i * 18, 9, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke(); }
    ctx.strokeStyle = "#35d3c2";
    const n2 = Math.max(2, Math.round(8 * p.n));
    for (let i = 0; i < n2; i++) { ctx.beginPath(); ctx.arc(395, 220 + i * (140 / n2), 9, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke(); }
    glow(ctx, 310, 280, 60, [242, 168, 59], 0.12 + 0.08 * Math.sin(t * 6));
    wire(ctx, [[216, 210], [150, 210], [150, 350], [216, 350]]);
    battery(ctx, 150, 280, `${p.V1}V AC`);
    ctx.fillStyle = "#f2a83b"; ctx.font = `11px ${MONO}`; ctx.fillText("N₁", 200, 190);
    ctx.fillStyle = "#35d3c2"; ctx.fillText("N₂", 400, 190);
    caption(ctx, 130, 430, `V₂ = V₁·(N₂/N₁) = ${(p.V1 * p.n).toFixed(0)} V — توان ثابت می‌ماند`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "e-filterorder": (ctx, p, t, ar, spec) => {
    title(ctx, "فیلتر پایین‌گذر — اثر مرتبه", "#56b8ff");
    wire(ctx, [[140, 240], [200, 240]]);
    const n = Math.round(p.n);
    for (let i = 0; i < Math.min(n, 4); i++) {
      const x = 220 + i * 90;
      resistor(ctx, x + 30, 240, 60);
      capacitor(ctx, x + 85, 270);
      wire(ctx, [[x + 60, 240], [x + 90, 240]]);
      wire(ctx, [[x + 85, 290], [x + 85, 320]]);
    }
    wire(ctx, [[140, 240], [140, 320], [560, 320]]);
    chipBox(ctx, 480, 210, 90, 60, "خروجی", "#56b8ff");
    caption(ctx, 130, 400, `شیب = −${n * 20} dB/decade — مرتبه بالاتر، گذار تیزتر`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#56b8ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "e-impedance": (ctx, p, t, ar, spec) => {
    title(ctx, "امپدانس RLC سری و تشدید", "#35d3c2");
    wire(ctx, [[140, 220], [190, 220]]); battery(ctx, 165, 220, "AC");
    wire(ctx, [[190, 220], [240, 220]]); resistor(ctx, 285, 220, 70, "R");
    wire(ctx, [[320, 220], [360, 220]]); inductor(ctx, 395, 220);
    wire(ctx, [[420, 220], [460, 220]]); capacitor(ctx, 485, 220);
    wire(ctx, [[505, 220], [540, 220], [540, 320], [140, 320], [140, 220]]);
    const f0 = 1 / (2 * Math.PI * Math.sqrt(p.L * 1e-3 * p.C * 1e-6));
    glow(ctx, 340, 270, 60, [53, 211, 194], 0.15 + 0.1 * Math.sin(t * 5));
    caption(ctx, 130, 400, `f₀ = 1/(2π√LC) = ${f0.toFixed(0)} Hz — در تشدید Z = R`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
};

/* ================================================================ */
/* MEDICINE scenes                                                   */
/* ================================================================ */
const med: Record<string, SceneFn> = {
  "m-cardiacoutput": (ctx, p, t, ar, spec) => {
    title(ctx, "برون‌ده قلبی — CO = HR × SV", "#ff6f61");
    heartBeat(ctx, 250, 280, 60, t, p.hr);
    vessel(ctx, 340, 280, 520, 280, 16, t, p.hr);
    meter(ctx, 430, 180, 60, (p.hr * p.sv) / 1000, 15, "CO (L/min)", "#ff6f61");
    caption(ctx, 130, 430, `هر انقباض ${p.sv} mL پمپ می‌کند — ضربان بیشتر، برون‌ده بیشتر`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#ff6f61", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-starling": (ctx, p, t, ar, spec) => {
    title(ctx, "قانون فرانک–استارلینگ قلب", "#ff6f61");
    const edv = p.edv;
    const sc = 0.7 + (edv / 200) * 0.5;
    heartBeat(ctx, 240, 280, 70 * sc, t, 70 * p.cont);
    vessel(ctx, 340, 280, 520, 280, 12 + (p.cont - 0.5) * 8, t, 70);
    ctx.strokeStyle = "rgba(53,211,194,0.5)"; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.arc(240, 280, 70 * sc + 14, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    caption(ctx, 120, 430, `پری بیشتر (EDV=${edv}) → انقباض قوی‌تر — طول سارکومر بهینه‌تر`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#ff6f61", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-intervals": (ctx, p, t, ar, spec) => {
    title(ctx, "فاصله QT و ضربان — اصلاح Bazett", "#35d3c2");
    pulseWave(ctx, 120, 140, 420, 220, t, "#35d3c2", p.hr);
    ctx.strokeStyle = "rgba(242,168,59,0.7)"; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(120, 320); ctx.lineTo(540, 320); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`;
    ctx.fillText("P", 190, 340); ctx.fillText("QRS", 260, 340); ctx.fillText("T", 360, 340);
    caption(ctx, 130, 420, `QTc = QT/√RR — طولانی‌شدن خطر آریتمی`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-ventilation": (ctx, p, t, ar, spec) => {
    title(ctx, "تهویه آلوئولی — فضای مرده", "#56b8ff");
    const br = 0.4 + 0.4 * Math.sin(t * (p.f / 15));
    lungShape(ctx, 200, 280, 100, br, -1);
    lungShape(ctx, 320, 280, 100, br, 1);
    ctx.strokeStyle = "#8fbcb8"; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(260, 150); ctx.lineTo(260, 200); ctx.stroke();
    for (let i = 0; i < 4; i++) { const yy = 130 - ((t * 30 + i * 30) % 90); ctx.fillStyle = "rgba(150,220,255,0.6)"; ctx.beginPath(); ctx.arc(255 + i * 4, yy, 4, 0, TAU); ctx.fill(); }
    caption(ctx, 120, 430, `VA = (VT−VD)·f — فقط هوای آلوئولی تبادل می‌شود`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#56b8ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-aagradient": (ctx, p, t, ar, spec) => {
    title(ctx, "گرادیان آلوئولو-شریانی اکسیژن", "#56b8ff");
    lungShape(ctx, 190, 260, 90, 0.4 + 0.3 * Math.sin(t * 1.4), -1);
    lungShape(ctx, 300, 260, 90, 0.4 + 0.3 * Math.sin(t * 1.4), 1);
    vessel(ctx, 350, 320, 520, 320, 14, t, 72);
    const pAO2 = p.fio2 * 713 - p.paco2 / 0.8;
    const grad = pAO2 - p.pao2;
    ctx.strokeStyle = "rgba(86,184,255,0.6)"; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(300, 200); ctx.lineTo(430, 320); ctx.stroke(); ctx.setLineDash([]);
    caption(ctx, 120, 430, `A-a = ${grad.toFixed(0)} mmHg — بالا رفتن یعنی نقص تبادل گاز`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#56b8ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-compliance": (ctx, p, t, ar, spec) => {
    title(ctx, "انعطاف‌پذیری ریه — فشار-حجم", "#56b8ff");
    const vol = p.c * p.p;
    const br = Math.min(1, vol / 8);
    lungShape(ctx, 200, 280, 100, br, -1);
    lungShape(ctx, 320, 280, 100, br, 1);
    ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(150, 420); ctx.lineTo(150 + p.p * 8, 420 - vol * 30); ctx.stroke();
    glow(ctx, 150 + p.p * 8, 420 - vol * 30, 20, [53, 211, 194], 0.5);
    ctx.fillStyle = "#35d3c2"; ctx.beginPath(); ctx.arc(150 + p.p * 8, 420 - vol * 30, 6, 0, TAU); ctx.fill();
    caption(ctx, 120, 110, `C = ΔV/ΔP — ریه سفت (فیبروز) انعطاف کم دارد`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#56b8ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-acidbase": (ctx, p, t, ar, spec) => {
    title(ctx, "تعادل اسیدوباز — معادله هندرسون", "#35d3c2");
    const ph = 6.1 + Math.log10(p.hco3 / (0.03 * p.pco2));
    meter(ctx, 250, 300, 100, ph, 14, "pH خون", ph < 7.35 ? "#56b8ff" : ph > 7.45 ? "#ff6f61" : "#35d3c2");
    ctx.fillStyle = "rgba(86,184,255,0.6)"; rr(ctx, 380, 220, 90, 60, 8); ctx.fill();
    ctx.fillStyle = "#e9f6f3"; ctx.font = `700 13px ${MONO}`; ctx.textAlign = "center";
    ctx.fillText("CO₂", 425, 248); ctx.fillText(`${p.pco2}`, 425, 268); ctx.textAlign = "left";
    ctx.fillStyle = "rgba(53,211,194,0.6)"; rr(ctx, 380, 320, 90, 60, 8); ctx.fill();
    ctx.fillStyle = "#e9f6f3"; ctx.textAlign = "center";
    ctx.fillText("HCO₃⁻", 425, 348); ctx.fillText(`${p.hco3}`, 425, 368); ctx.textAlign = "left";
    caption(ctx, 120, 450, `pH = 6.1 + log(HCO₃⁻/0.03·PCO₂) = ${ph.toFixed(2)}`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-aniongap": (ctx, p, t, ar, spec) => {
    title(ctx, "شکاف آنیونی — الکترولیت‌های سرم", "#f2a83b");
    const gap = p.na - (p.cl + p.hco3);
    const bars: [string, number, string][] = [["Na⁺", p.na, "#f2a83b"], ["Cl⁻", p.cl, "#56b8ff"], ["HCO₃⁻", p.hco3, "#35d3c2"], ["AG", gap, "#ff6f61"]];
    bars.forEach(([nm, v, col], i) => {
      const h = (v as number) * 1.4;
      const x = 140 + i * 95;
      ctx.fillStyle = hexA(col as string, 0.75); rr(ctx, x, 400 - h, 56, h, 6); ctx.fill();
      ctx.fillStyle = "#e9f6f3"; ctx.font = `11px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(`${nm}`, x + 28, 420); ctx.fillText(`${(v as number).toFixed(0)}`, x + 28, 392 - h); ctx.textAlign = "left";
    });
    caption(ctx, 130, 110, `AG = Na − (Cl + HCO₃) = ${gap.toFixed(0)} — نرمال ۸–۱۲`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-creatinine": (ctx, p, t, ar, spec) => {
    title(ctx, "کلیرانس کراتینین — عملکرد کلیه", "#35d3c2");
    ctx.fillStyle = "#b0685c";
    ctx.beginPath(); ctx.ellipse(220, 280, 55, 85, 0.25, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,180,170,0.5)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(255, 250); ctx.quadraticCurveTo(300, 260, 300, 300); ctx.stroke();
    for (let i = 0; i < 5; i++) { const yy = 320 + ((t * 30 + i * 24) % 90); ctx.fillStyle = "rgba(255,220,120,0.7)"; ctx.beginPath(); ctx.arc(300, yy, 4, 0, TAU); ctx.fill(); }
    caption(ctx, 120, 430, `کراتینین بالا → GFR پایین — فیلتراسیون ضعیف`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-osmolarity": (ctx, p, t, ar, spec) => {
    title(ctx, "اسمولاریته سرم — تعادل آب", "#56b8ff");
    cell(ctx, 200, 250, 55, [224, 85, 72], t);
    cell(ctx, 320, 250, 55, [224, 85, 72], t + 1);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = "rgba(86,184,255,0.6)"; ctx.beginPath(); ctx.arc(140 + ((i * 67) % 280), 350 + ((i * 31) % 60), 4, 0, TAU); ctx.fill(); }
    const osm = 2 * p.na + p.glu / 18 + p.bun / 2.8;
    caption(ctx, 120, 450, `Osm = 2Na + Glu/18 + BUN/2.8 = ${osm.toFixed(0)} mOsm/L`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#56b8ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-hba1c": (ctx, p, t, ar, spec) => {
    title(ctx, "هموگلوبین گلیکوزیله — میانگین قند", "#f2a83b");
    cell(ctx, 220, 250, 60, [224, 85, 72], t);
    const g = Math.round(p.a1c);
    for (let i = 0; i < g; i++) { const a = (i / g) * TAU; ctx.fillStyle = "#f2a83b"; ctx.beginPath(); ctx.arc(220 + Math.cos(a) * 45, 250 + Math.sin(a) * 45, 6, 0, TAU); ctx.fill(); }
    glow(ctx, 220, 250, 80, [242, 168, 59], 0.15 + p.a1c * 0.02);
    ctx.strokeStyle = "#f2a83b"; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(320, 250); ctx.lineTo(420, 200); ctx.stroke(); ctx.setLineDash([]);
    meter(ctx, 450, 220, 55, p.a1c, 14, "HbA1c ٪", p.a1c > 6.5 ? "#ff6f61" : "#35d3c2");
    caption(ctx, 120, 420, `گلوکز به هموگلوبین می‌چسبد — میانگین ۳ ماهه`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-bmibmr": (ctx, p, t, ar, spec) => {
    title(ctx, "ترکیب بدن — BMI و متابولیسم پایه", "#a5d95c");
    const bmi = p.w / Math.pow(p.h / 100, 2);
    const bw = 40 + (bmi - 18) * 2.5;
    ctx.fillStyle = "#56b8ff";
    ctx.beginPath(); ctx.arc(240, 160, 24, 0, TAU); ctx.fill();
    rr(ctx, 240 - bw / 2, 190, bw, 130, 12); ctx.fill();
    ctx.fillRect(240 - bw / 2 + 6, 320, 14, 80); ctx.fillRect(240 + bw / 2 - 20, 320, 14, 80);
    const cat = bmi < 18.5 ? "کم‌وزن" : bmi < 25 ? "نرمال" : bmi < 30 ? "اضافه‌وزن" : "چاقی";
    ctx.fillStyle = bmi < 25 ? "#a5d95c" : "#f2a83b"; ctx.font = `13px ${FA}`;
    ctx.fillText(cat, 220, 430);
    meter(ctx, 420, 240, 70, bmi, 40, "BMI", "#a5d95c");
    caption(ctx, 120, 110, `BMR با سن کم و با توده عضلانی زیاد می‌شود`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#a5d95c", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-pharmacokinetics": (ctx, p, t, ar, spec) => {
    title(ctx, "فارماکوکینتیک — حذف نمایی دارو", "#b388ff");
    ctx.fillStyle = "rgba(179,136,255,0.3)"; rr(ctx, 180, 200, 90, 200, 10); ctx.fill();
    ctx.strokeStyle = "rgba(179,136,255,0.7)"; rr(ctx, 180, 200, 90, 200, 10); ctx.stroke();
    const frac = Math.exp(-p.k * (t % 40));
    ctx.fillStyle = "rgba(179,136,255,0.75)"; rr(ctx, 186, 200 + 188 * (1 - frac), 78, 188 * frac, 6); ctx.fill();
    ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(270, 350); ctx.lineTo(330, 350); ctx.stroke();
    ctx.fillStyle = "#b0685c"; ctx.beginPath(); ctx.ellipse(380, 340, 40, 55, 0.2, 0, TAU); ctx.fill();
    caption(ctx, 120, 450, `C = C₀·e^(−kt) — نیمه‌عمر t½ = ${(0.693 / p.k).toFixed(1)} h`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#b388ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-ivdrip": (ctx, p, t, ar, spec) => {
    title(ctx, "تزریق وریدی — رسیدن به حالت پایدار", "#35d3c2");
    ctx.fillStyle = "rgba(170,215,230,0.1)"; rr(ctx, 200, 140, 80, 120, 8); ctx.fill();
    ctx.strokeStyle = "rgba(214,240,244,0.6)"; rr(ctx, 200, 140, 80, 120, 8); ctx.stroke();
    ctx.fillStyle = "rgba(53,211,194,0.5)"; rr(ctx, 206, 160, 68, 94, 5); ctx.fill();
    const drip = (t * p.r0 / 20) % 1;
    ctx.fillStyle = "#35d3c2"; ctx.beginPath(); ctx.arc(240, 268 + drip * 40, 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(240, 310); ctx.bezierCurveTo(240, 360, 320, 350, 380, 340); ctx.stroke();
    vessel(ctx, 360, 340, 520, 340, 12, t, 70);
    caption(ctx, 120, 440, `Css = R₀/CL — غلظت پایدار پس از ~۴ نیمه‌عمر`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#35d3c2", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-eeg": (ctx, p, t, ar, spec) => {
    title(ctx, "امواج مغزی — بیداری تا خواب عمیق", "#b388ff");
    ctx.fillStyle = "#e8c9a8"; ctx.beginPath(); ctx.arc(240, 260, 90, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(180,140,110,0.8)"; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(240, 260, 30 + i * 14, -0.8, 2.4); ctx.stroke(); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.fillStyle = "#35d3c2"; ctx.beginPath(); ctx.arc(240 + Math.cos(a) * 78, 260 + Math.sin(a) * 78, 6, 0, TAU); ctx.fill(); }
    const freq = 11 - p.state * 9, amp = 14 + p.state * 40;
    ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= 400; i += 3) { const y = 440 - amp * Math.sin((i / 400) * TAU * freq + t * 6) * Math.exp(-((i - 200) ** 2) / 40000); ctx.lineTo(120 + i, y); }
    ctx.stroke();
    caption(ctx, 120, 110, p.state < 0.3 ? "امواج بتا — بیدار و هوشیار" : p.state < 0.7 ? "امواج آلفا/تتا — آرامش" : "امواج دلتا — خواب عمیق", "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#b388ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-audiometry": (ctx, p, t, ar, spec) => {
    title(ctx, "ادیومتری — آستانه شنوایی", "#56b8ff");
    ctx.fillStyle = "#e8c9a8"; ctx.beginPath(); ctx.arc(200, 280, 70, 0, TAU); ctx.fill();
    ctx.fillStyle = "#d9b491"; ctx.beginPath(); ctx.arc(200, 280, 26, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#8fbcb8"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(200, 280, 10, 0, TAU); ctx.stroke();
    const wv = 20 + 6 * Math.sin(t * 10);
    ctx.strokeStyle = "rgba(86,184,255,0.7)"; ctx.lineWidth = 2;
    for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.arc(290 + r * 26, 280, wv + r * 14, -0.9, 0.9); ctx.stroke(); }
    ctx.fillStyle = "#56b8ff"; rr(ctx, 380, 250, 90, 60, 8); ctx.fill();
    ctx.fillStyle = "#04191d"; ctx.font = `10px ${FA}`; ctx.textAlign = "center"; ctx.fillText("منبع صدا", 425, 285); ctx.textAlign = "left";
    caption(ctx, 120, 430, `پیرگوشی: آستانه فرکانس‌های بالا با سن و نویز بالا می‌رود`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#56b8ff", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-vision": (ctx, p, t, ar, spec) => {
    title(ctx, "تطابق عدسی — پیرچشمی", "#f2a83b");
    ctx.fillStyle = "#e8c9a8"; ctx.beginPath(); ctx.arc(250, 280, 90, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(86,184,255,0.35)"; ctx.beginPath(); ctx.ellipse(250, 280, 34, 40, 0, 0, TAU); ctx.fill();
    const flex = Math.max(0.5, 1 - p.age / 90);
    ctx.fillStyle = "rgba(242,168,59,0.8)"; ctx.beginPath(); ctx.ellipse(250, 280, 20 * flex + 8, 26, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#04191d"; ctx.beginPath(); ctx.arc(250, 280, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,210,60,0.8)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(100, 250); ctx.lineTo(216, 272); ctx.moveTo(100, 310); ctx.lineTo(216, 288); ctx.stroke();
    ctx.strokeStyle = "rgba(255,210,60,0.8)";
    ctx.beginPath(); ctx.moveTo(284, 272); ctx.lineTo(340, 280); ctx.moveTo(284, 288); ctx.lineTo(340, 280); ctx.stroke();
    ctx.fillStyle = "#35d3c2"; ctx.beginPath(); ctx.arc(345, 280, 6, 0, TAU); ctx.fill();
    caption(ctx, 120, 430, `با سن، عدسی سفت می‌شود — توان تطابق کم می‌شود`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-gastric": (ctx, p, t, ar, spec) => {
    title(ctx, "تخلیه معده — سینتیک نمایی", "#f2a83b");
    ctx.fillStyle = "rgba(224,120,100,0.5)";
    ctx.beginPath(); ctx.ellipse(240, 260, 80, 100, 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,180,170,0.6)"; ctx.lineWidth = 3; ctx.stroke();
    const frac = Math.exp(-p.k * (t % 60) * 10);
    ctx.fillStyle = "rgba(242,168,59,0.7)";
    ctx.beginPath(); ctx.ellipse(240, 260 + 40 * (1 - frac), 70 * frac + 6, 80 * frac + 6, 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(290, 330); ctx.quadraticCurveTo(330, 380, 320, 420); ctx.stroke();
    for (let i = 0; i < 3; i++) { const yy = 380 + ((t * 40 + i * 30) % 60); ctx.fillStyle = "rgba(242,168,59,0.7)"; ctx.beginPath(); ctx.arc(322, yy, 4, 0, TAU); ctx.fill(); }
    caption(ctx, 120, 110, `V = V₀·e^(−kt) — نیمه‌عمر تخلیه ${(0.693 / (p.k * 10)).toFixed(0)} دقیقه`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-lipid": (ctx, p, t, ar, spec) => {
    title(ctx, "پروفایل لیپید — خطر قلبی", "#f2a83b");
    const bars: [string, number, string, number][] = [["TC", p.tc, "#f2a83b", 320], ["HDL", p.hdl, "#35d3c2", 90], ["TG", p.tg, "#56b8ff", 400], ["LDL", p.tc - p.hdl - p.tg / 5, "#ff6f61", 320]];
    bars.forEach(([nm, v, col, mx], i) => {
      const h = Math.max(6, ((v as number) / (mx as number)) * 240);
      const x = 140 + i * 95;
      glow(ctx, x + 28, 400 - h / 2, 40, hexRgbOf(col as string), 0.15);
      ctx.fillStyle = hexA(col as string, 0.75); rr(ctx, x, 400 - h, 56, h, 6); ctx.fill();
      ctx.fillStyle = "#e9f6f3"; ctx.font = `11px ${MONO}`; ctx.textAlign = "center";
      ctx.fillText(`${nm}`, x + 28, 420); ctx.fillText(`${(v as number).toFixed(0)}`, x + 28, 392 - h); ctx.textAlign = "left";
    });
    caption(ctx, 130, 110, `LDL = TC − HDL − TG/5 — معادله Friedewald`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#f2a83b", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-inr": (ctx, p, t, ar, spec) => {
    title(ctx, "انعقاد خون — INR و وارفارین", "#ff6f61");
    vessel(ctx, 140, 280, 520, 280, 18, t, 60);
    const inr = Math.pow(1.5 / p.dose, 0.3) * p.isi;
    for (let i = 0; i < 6; i++) {
      const x = 200 + i * 55;
      ctx.fillStyle = "#e05548"; ctx.beginPath(); ctx.arc(x, 280 + ((i % 3) - 1) * 6, 6, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(233,246,243,0.7)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 8, 270); ctx.lineTo(x + 8, 290); ctx.stroke();
    }
    meter(ctx, 430, 180, 55, inr, 5, "INR", inr > 3 ? "#ff6f61" : "#35d3c2");
    caption(ctx, 120, 420, `فیبرین لخته می‌سازد — INR بالا یعنی خون رقیق‌تر (ضدانعقاد)`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#ff6f61", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-heatbalance": (ctx, p, t, ar, spec) => {
    title(ctx, "تعادل حرارتی بدن — متابولیسم و محیط", "#ff6f61");
    ctx.fillStyle = "#e8c9a8";
    ctx.beginPath(); ctx.arc(240, 170, 26, 0, TAU); ctx.fill();
    rr(ctx, 214, 200, 52, 120, 14); ctx.fill();
    ctx.fillRect(220, 320, 16, 80); ctx.fillRect(244, 320, 16, 80);
    const heat = p.m / 500;
    glow(ctx, 240, 260, 90, [255, 111, 97], 0.15 + heat * 0.3);
    if (p.ta > 30) for (let i = 0; i < 5; i++) { const yy = 180 - ((t * 26 + i * 30) % 80); ctx.fillStyle = "rgba(150,220,255,0.6)"; ctx.beginPath(); ctx.arc(215 + i * 14, yy, 3.5, 0, TAU); ctx.fill(); }
    if (p.ta < 10) for (let i = 0; i < 5; i++) { ctx.strokeStyle = "rgba(120,200,255,0.8)"; ctx.lineWidth = 1.5; const x = 150 + i * 45; ctx.beginPath(); ctx.moveTo(x, 120); ctx.lineTo(x + 8, 140); ctx.lineTo(x, 160); ctx.stroke(); }
    caption(ctx, 120, 440, `M=${p.m}W در Ta=${p.ta}°C — بدن دمای ۳۷° را تنظیم می‌کند`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#ff6f61", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
  "m-vo2max": (ctx, p, t, ar, spec) => {
    title(ctx, "VO₂max — ظرفیت هوازی", "#a5d95c");
    const run = (t * 120) % 500;
    ctx.strokeStyle = "rgba(143,188,184,0.4)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(100, 380); ctx.lineTo(540, 380); ctx.stroke();
    const x = 120 + run;
    ctx.fillStyle = "#56b8ff";
    ctx.beginPath(); ctx.arc(x, 330, 14, 0, TAU); ctx.fill();
    rr(ctx, x - 10, 344, 20, 40, 8); ctx.fill();
    ctx.strokeStyle = "#56b8ff"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x - 4, 384); ctx.lineTo(x - 14, 404); ctx.moveTo(x + 4, 384); ctx.lineTo(x + 14, 404); ctx.stroke();
    heartBeat(ctx, 430, 220, 40, t, 150);
    ctx.strokeStyle = "rgba(165,217,92,0.6)"; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(100, 380); ctx.lineTo(100 + (p.d / 3600) * 440, 380); ctx.stroke(); ctx.setLineDash([]);
    caption(ctx, 120, 440, `دویدن بیشتر در ۱۲ دقیقه → VO₂max بالاتر — تست کوپر`, "#8fbcb8", 12);
    scope(ctx, 590, 120, 330, 170, spec, p, "#a5d95c", ar);
    chips(ctx, 590, 320, ro(spec, p), 330);
  },
};

export const SCENES: Record<string, SceneFn> = { ...phy, ...chem, ...bio, ...ele, ...med };
