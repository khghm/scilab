import { glow, rr, hexA, FA, MONO } from "./draw";

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

/* ============================= misc ============================= */
export function labelChip(ctx: Ctx, x: number, y: number, text: string, color: string, w?: number) {
  ctx.font = `11px ${MONO}`;
  const tw = w ?? ctx.measureText(text).width + 18;
  ctx.fillStyle = "rgba(4,20,24,0.82)";
  rr(ctx, x - tw / 2, y - 12, tw, 22, 6); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.5); ctx.lineWidth = 1.2;
  rr(ctx, x - tw / 2, y - 12, tw, 22, 6); ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = "center";
  ctx.fillText(text, x, y + 3); ctx.textAlign = "left";
}

export function caption(ctx: Ctx, x: number, y: number, text: string, color = "#8fbcb8", size = 11) {
  ctx.fillStyle = color; ctx.font = `${size}px ${FA}`;
  ctx.fillText(text, x, y);
}

/** analog needle meter — the signature "live instrument" */
export function meter(ctx: Ctx, x: number, y: number, r: number, val: number, max: number, label: string, color: string, unit = "") {
  ctx.fillStyle = "rgba(6,18,22,0.9)";
  ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.75, Math.PI * 2.25); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.7); ctx.lineWidth = 2; ctx.stroke();
  // ticks
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    ctx.strokeStyle = i % 5 === 0 ? hexA(color, 0.8) : "rgba(143,188,184,0.35)";
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r - 8), y + Math.sin(a) * (r - 8));
    ctx.lineTo(x + Math.cos(a) * (r - (i % 5 === 0 ? 16 : 12)), y + Math.sin(a) * (r - (i % 5 === 0 ? 16 : 12)));
    ctx.stroke();
  }
  // needle
  const f = Math.max(0, Math.min(1, val / max));
  const na = Math.PI * 0.75 + f * Math.PI * 1.5;
  ctx.strokeStyle = "#ff6f61"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(na) * (r - 12), y + Math.sin(na) * (r - 12)); ctx.stroke();
  ctx.fillStyle = "#e9f6f3"; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = color; ctx.font = `700 15px ${MONO}`; ctx.textAlign = "center";
  ctx.fillText(`${val.toFixed(val >= 100 ? 0 : 1)}${unit}`, x, y - r * 0.28);
  ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${FA}`;
  ctx.fillText(label, x, y + r * 0.55);
  ctx.textAlign = "left"; ctx.lineCap = "butt";
}

export function dimArrow(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, label: string, color = "#35d3c2") {
  ctx.strokeStyle = hexA(color, 0.8); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0);
  for (const [bx, by, dir] of [[x0, y0, 1], [x1, y1, -1]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a + 0.4) * 9 * dir, by + Math.sin(a + 0.4) * 9 * dir);
    ctx.lineTo(bx + Math.cos(a - 0.4) * 9 * dir, by + Math.sin(a - 0.4) * 9 * dir);
    ctx.closePath(); ctx.fillStyle = hexA(color, 0.8); ctx.fill();
  }
  ctx.fillStyle = color; ctx.font = `10px ${MONO}`; ctx.textAlign = "center";
  ctx.fillText(label, (x0 + x1) / 2, (y0 + y1) / 2 - 7);
  ctx.textAlign = "left";
}

/* ============================= chemistry ============================= */
function glassBody(ctx: Ctx, path: () => void) {
  ctx.beginPath(); path();
  ctx.fillStyle = "rgba(170,215,230,0.06)"; ctx.fill();
  ctx.strokeStyle = "rgba(214,240,244,0.62)"; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 1.4; ctx.stroke();
}

export function liquidClip(ctx: Ctx, path: () => void, fillFrac: number, rgb: [number, number, number], bottomY: number, topY: number, alpha = 0.5) {
  if (fillFrac <= 0.01) return;
  ctx.save();
  ctx.beginPath(); path(); ctx.clip();
  const ly = bottomY - fillFrac * (bottomY - topY);
  const g = ctx.createLinearGradient(0, ly, 0, bottomY);
  g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.75})`);
  g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, ly, 960, bottomY - ly + 20);
  // meniscus highlight
  ctx.strokeStyle = `rgba(255,255,255,0.35)`; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(960, ly); ctx.stroke();
  ctx.restore();
}

export function beaker(ctx: Ctx, x: number, y: number, w: number, h: number, fillFrac: number, rgb: [number, number, number], label?: string) {
  const path = () => { ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x - w / 2 + w * 0.06, y); ctx.quadraticCurveTo(x, y + 8, x + w / 2 - w * 0.06, y); ctx.lineTo(x + w / 2, y - h); };
  liquidClip(ctx, path, fillFrac, rgb, y, y - h + 8);
  glassBody(ctx, path);
  // spout + graduations
  ctx.strokeStyle = "rgba(214,240,244,0.62)"; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x - w / 2 - 8, y - h - 6); ctx.stroke();
  ctx.strokeStyle = "rgba(143,188,184,0.4)"; ctx.lineWidth = 1.2;
  for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + 8, y - (h * i) / 4); ctx.lineTo(x - w / 2 + 22, y - (h * i) / 4); ctx.stroke(); }
  if (label) caption(ctx, x - w / 2, y + 22, label, "#8fbcb8", 11);
}

export function erlen(ctx: Ctx, x: number, y: number, s: number, fillFrac: number, rgb: [number, number, number]) {
  const path = () => {
    ctx.moveTo(x - s * 0.16, y - s); ctx.lineTo(x - s * 0.16, y - s * 0.72);
    ctx.lineTo(x - s * 0.62, y - s * 0.08); ctx.quadraticCurveTo(x, y + s * 0.08, x + s * 0.62, y - s * 0.08);
    ctx.lineTo(x + s * 0.16, y - s * 0.72); ctx.lineTo(x + s * 0.16, y - s);
  };
  liquidClip(ctx, path, fillFrac, rgb, y, y - s + 6);
  glassBody(ctx, path);
}

export function testTube(ctx: Ctx, x: number, y: number, w: number, h: number, fillFrac: number, rgb: [number, number, number]) {
  const path = () => { ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x - w / 2, y - w / 2); ctx.arc(x, y - w / 2, w / 2, Math.PI, 0, true); ctx.lineTo(x + w / 2, y - h); };
  liquidClip(ctx, path, fillFrac, rgb, y, y - h + 4);
  glassBody(ctx, path);
  ctx.strokeStyle = "rgba(214,240,244,0.62)"; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(x - w / 2 - 4, y - h); ctx.lineTo(x + w / 2 + 4, y - h); ctx.stroke();
}

export function gradCyl(ctx: Ctx, x: number, y: number, w: number, h: number, fillFrac: number, rgb: [number, number, number]) {
  const path = () => { ctx.roundRect(x - w / 2, y - h, w, h, [0, 0, 6, 6]); };
  liquidClip(ctx, path, fillFrac, rgb, y, y - h + 6);
  glassBody(ctx, path);
  ctx.strokeStyle = "rgba(143,188,184,0.45)"; ctx.lineWidth = 1.1;
  for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + 4, y - (h * i) / 8); ctx.lineTo(x - w / 2 + (i % 2 ? 14 : 22), y - (h * i) / 8); ctx.stroke(); }
}

export function burette(ctx: Ctx, x: number, y: number, h: number, fillFrac: number, rgb: [number, number, number], t: number) {
  const w = 26;
  const path = () => { ctx.roundRect(x - w / 2, y, w, h, 8); };
  liquidClip(ctx, path, fillFrac, rgb, y + h - 26, y + 4);
  glassBody(ctx, path);
  ctx.strokeStyle = "rgba(143,188,184,0.45)"; ctx.lineWidth = 1.1;
  for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + 3, y + (h - 26) * i / 10); ctx.lineTo(x - w / 2 + (i % 2 ? 10 : 16), y + (h - 26) * i / 10); ctx.stroke(); }
  // stopcock + tip + falling drop
  ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x - 14, y + h - 14); ctx.lineTo(x + 14, y + h - 14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + h - 4); ctx.lineTo(x - 4, y + h + 12); ctx.lineTo(x + 4, y + h + 12); ctx.closePath();
  ctx.fillStyle = "rgba(214,240,244,0.5)"; ctx.fill();
  const dy = (t * 60) % 34;
  glow(ctx, x, y + h + 16 + dy, 9, rgb, 0.5);
  ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.9)`;
  ctx.beginPath(); ctx.arc(x, y + h + 16 + dy, 3.4, 0, TAU); ctx.fill();
}

export function flame(ctx: Ctx, x: number, y: number, t: number, hue: [number, number, number]) {
  const f = 0.82 + 0.18 * Math.sin(t * 19) * Math.sin(t * 13.3);
  const fh = 74 * f;
  glow(ctx, x, y - fh * 0.55, 60, hue, 0.3);
  const g = ctx.createLinearGradient(0, y - fh, 0, y);
  g.addColorStop(0, `rgba(${hue[0]},${hue[1]},${hue[2]},0.9)`);
  g.addColorStop(0.65, `rgba(${hue[0]},${hue[1]},${hue[2]},0.4)`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 16, y);
  ctx.quadraticCurveTo(x - 20 * f, y - fh * 0.6, x, y - fh);
  ctx.quadraticCurveTo(x + 20 * f, y - fh * 0.6, x + 16, y);
  ctx.closePath(); ctx.fill();
  // blue inner cone
  ctx.fillStyle = "rgba(90,140,255,0.55)";
  ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.quadraticCurveTo(x, y - fh * 0.4, x + 7, y); ctx.closePath(); ctx.fill();
}

export function burner(ctx: Ctx, x: number, y: number, t: number, hue: [number, number, number]) {
  flame(ctx, x, y - 66, t, hue);
  ctx.fillStyle = "#1d5b63"; ctx.fillRect(x - 8, y - 66, 16, 60);
  ctx.fillStyle = "#2a7a80"; ctx.beginPath(); ctx.ellipse(x, y, 34, 9, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#3a8a94"; ctx.lineWidth = 2; ctx.stroke();
}

export function bubbles(ctx: Ctx, x: number, y: number, w: number, h: number, n: number, t: number, rgb: [number, number, number], alpha = 0.8) {
  for (let i = 0; i < n; i++) {
    const cyc = (t * (0.5 + (i % 4) * 0.2) + i * 0.37) % 1;
    const bx = x + ((i * 53) % w);
    const by = y + h - cyc * h;
    ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * (1 - cyc)})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3) * 1.4, 0, TAU); ctx.stroke();
  }
}

export function stirBar(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 6);
  ctx.fillStyle = "#e9f6f3"; rr(ctx, -16, -4, 32, 8, 4); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(233,246,243,0.25)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(x, y, 22, 7, 0, 0, TAU); ctx.stroke();
}

/* ============================= optics ============================= */
export function lens(ctx: Ctx, x: number, y: number, h: number, convex: boolean, color = "#56b8ff") {
  ctx.strokeStyle = hexA(color, 0.85); ctx.lineWidth = 2.6;
  ctx.fillStyle = hexA(color, 0.1);
  ctx.beginPath();
  if (convex) ctx.ellipse(x, y, 14, h / 2, 0, 0, TAU);
  else { ctx.moveTo(x - 10, y - h / 2); ctx.quadraticCurveTo(x + 16, y, x - 10, y + h / 2); ctx.quadraticCurveTo(x - 26, y, x - 10, y - h / 2); }
  ctx.fill(); ctx.stroke();
}

export function prism(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = "rgba(170,215,230,0.1)";
  ctx.strokeStyle = "rgba(214,240,244,0.6)"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x, y - s * 0.6); ctx.lineTo(x - s * 0.6, y + s * 0.45); ctx.lineTo(x + s * 0.6, y + s * 0.45); ctx.closePath();
  ctx.fill(); ctx.stroke();
}

export function ray(ctx: Ctx, pts: [number, number][], color: string, w = 2.4, dashed = false) {
  ctx.strokeStyle = color; ctx.lineWidth = w;
  if (dashed) ctx.setLineDash([6, 6]);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke(); ctx.setLineDash([]);
}

export function lightSource(ctx: Ctx, x: number, y: number, t: number, color = "#ffd23c") {
  glow(ctx, x, y, 46, hexRgb(color), 0.4 + 0.1 * Math.sin(t * 7));
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = "#04191d"; ctx.font = `9px ${FA}`; ctx.textAlign = "center";
  ctx.fillText("لامپ", x, y + 3); ctx.textAlign = "left";
}

export function screenBand(ctx: Ctx, x: number, y: number, h: number, rgb: [number, number, number], inten: number) {
  ctx.fillStyle = "#0a2429"; rr(ctx, x - 7, y, 14, h, 5); ctx.fill();
  ctx.strokeStyle = "rgba(214,240,244,0.4)"; ctx.lineWidth = 1.6; ctx.stroke();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.05 + inten * 0.3})`);
  g.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.15 + inten * 0.75})`);
  g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.05 + inten * 0.3})`);
  ctx.fillStyle = g; rr(ctx, x - 5, y + 3, 10, h - 6, 4); ctx.fill();
}

/* ============================= circuits ============================= */
export function wire(ctx: Ctx, pts: [number, number][], color = "#3a8a94", w = 3) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = "round";
  ctx.beginPath(); pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))); ctx.stroke();
}

export function resistor(ctx: Ctx, x: number, y: number, w: number, label?: string) {
  ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x - w / 2, y);
  const n = 6, seg = w / (n + 2);
  ctx.lineTo(x - w / 2 + seg, y);
  for (let i = 0; i < n; i++) ctx.lineTo(x - w / 2 + seg * (i + 1.5), y + (i % 2 ? 9 : -9));
  ctx.lineTo(x + w / 2 - seg, y); ctx.lineTo(x + w / 2, y); ctx.stroke();
  if (label) caption(ctx, x - 16, y - 14, label, "#f2a83b", 11);
}

export function battery(ctx: Ctx, x: number, y: number, label = "") {
  ctx.strokeStyle = "#e9f6f3"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 16, y - 12); ctx.lineTo(x - 16, y + 12); ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x - 6, y - 20); ctx.lineTo(x - 6, y + 20); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + 4, y - 12); ctx.lineTo(x + 4, y + 12); ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x + 14, y - 20); ctx.lineTo(x + 14, y + 20); ctx.stroke();
  if (label) caption(ctx, x - 14, y + 38, label, "#e9f6f3", 11);
}

export function led(ctx: Ctx, x: number, y: number, on: number, color: string) {
  glow(ctx, x, y, 34, hexRgb(color), 0.5 * on);
  ctx.fillStyle = hexA(color, 0.25 + 0.7 * on);
  ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.9); ctx.lineWidth = 2; ctx.stroke();
}

export function diode(ctx: Ctx, x: number, y: number, vertical = false) {
  ctx.strokeStyle = "#b388ff"; ctx.fillStyle = "#b388ff"; ctx.lineWidth = 2.4;
  ctx.save(); ctx.translate(x, y); if (vertical) ctx.rotate(Math.PI / 2);
  ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-9, 8); ctx.lineTo(7, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(7, -8); ctx.lineTo(7, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-9, 0); ctx.moveTo(7, 0); ctx.lineTo(18, 0); ctx.stroke();
  ctx.restore();
}

export function capacitor(ctx: Ctx, x: number, y: number) {
  ctx.strokeStyle = "#56b8ff"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 5, y - 12); ctx.lineTo(x - 5, y + 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 5, y - 12); ctx.lineTo(x + 5, y + 12); ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.lineTo(x - 5, y); ctx.moveTo(x + 5, y); ctx.lineTo(x + 20, y); ctx.stroke();
}

export function inductor(ctx: Ctx, x: number, y: number) {
  ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x - 24, y);
  for (let i = 0; i < 4; i++) ctx.arc(x - 18 + i * 12, y, 6, Math.PI, 0, false);
  ctx.lineTo(x + 24, y); ctx.stroke();
}

export function chipBox(ctx: Ctx, x: number, y: number, w: number, h: number, label: string, color = "#b388ff") {
  ctx.fillStyle = "rgba(10,30,36,0.9)";
  rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.8); ctx.lineWidth = 2; rr(ctx, x, y, w, h, 8); ctx.stroke();
  ctx.strokeStyle = hexA(color, 0.5); ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(x - 10, y + (h * i) / 4); ctx.lineTo(x, y + (h * i) / 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w, y + (h * i) / 4); ctx.lineTo(x + w + 10, y + (h * i) / 4); ctx.stroke();
  }
  ctx.fillStyle = color; ctx.font = `700 12px ${MONO}`; ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + h / 2 + 4); ctx.textAlign = "left";
}

/* ============================= biology ============================= */
export function cell(ctx: Ctx, x: number, y: number, r: number, rgb: [number, number, number], t: number, phase = 0) {
  const wob = 1 + 0.05 * Math.sin(t * 2 + phase);
  glow(ctx, x, y, r * 1.8, rgb, 0.16);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r * wob);
  g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.4)`);
  g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.14)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * wob, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.85)`; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55)`;
  ctx.beginPath(); ctx.arc(x + r * 0.12, y - r * 0.06, r * 0.4, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(233,246,243,0.7)";
  ctx.beginPath(); ctx.arc(x + r * 0.2, y - r * 0.14, r * 0.13, 0, TAU); ctx.fill();
}

export function bacteria(ctx: Ctx, x: number, y: number, t: number, i: number, rgb: [number, number, number]) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2 + i) * 0.5 + i);
  ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.85)`;
  rr(ctx, -9, -4, 18, 8, 4); ctx.fill();
  ctx.restore();
}

export function dnaHelix(ctx: Ctx, x: number, y: number, len: number, t: number) {
  for (let i = 0; i < len / 9; i++) {
    const yy = y + i * 9;
    const off = Math.sin(i * 0.5 + t * 2) * 16;
    ctx.fillStyle = "rgba(165,217,92,0.9)";
    ctx.beginPath(); ctx.arc(x + off, yy, 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(86,184,255,0.8)";
    ctx.beginPath(); ctx.arc(x - off, yy, 2.6, 0, TAU); ctx.fill();
    if (i % 2 === 0) { ctx.strokeStyle = "rgba(143,188,184,0.3)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + off, yy); ctx.lineTo(x - off, yy); ctx.stroke(); }
  }
}

export function leaf(ctx: Ctx, x: number, y: number, s: number, t: number) {
  const sway = Math.sin(t * 1.3) * 0.06;
  ctx.save(); ctx.translate(x, y); ctx.rotate(sway);
  ctx.fillStyle = "rgba(124,179,66,0.8)";
  ctx.beginPath(); ctx.ellipse(0, 0, s * 1.5, s * 0.62, -0.4, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(85,130,40,0.9)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-s * 1.3, s * 0.4); ctx.quadraticCurveTo(0, -s * 0.1, s * 1.3, -s * 0.5); ctx.stroke();
  ctx.restore();
}

export function enzyme(ctx: Ctx, x: number, y: number, r: number, t: number, rgb: [number, number, number]) {
  glow(ctx, x, y, r * 1.7, rgb, 0.15);
  ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.8)`;
  ctx.beginPath();
  for (let a = 0; a <= TAU; a += 0.1) {
    const rr2 = r * (1 + 0.14 * Math.sin(a * 3 + t * 2));
    const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
    if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#04191d";
  ctx.beginPath(); ctx.arc(x + r * 0.5, y - r * 0.3, r * 0.3, 0, TAU); ctx.fill();
}

export function membraneWall(ctx: Ctx, x: number, y0: number, y1: number, t: number, pores = 3) {
  ctx.strokeStyle = "rgba(242,168,59,0.5)"; ctx.lineWidth = 7;
  ctx.setLineDash([14, 10]);
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < pores; i++) {
    const py = y0 + ((i + 0.5) / pores) * (y1 - y0);
    ctx.fillStyle = "rgba(53,211,194,0.9)";
    ctx.beginPath(); ctx.arc(x, py, 6 + Math.sin(t * 3 + i) * 1.5, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(53,211,194,0.8)"; ctx.lineWidth = 2; ctx.stroke();
  }
}

/* ============================= medicine ============================= */
export function heartBeat(ctx: Ctx, x: number, y: number, s: number, t: number, bpm: number) {
  const ph = (t * bpm) / 60 % 1;
  const k = 1 + 0.16 * Math.exp(-((ph - 0.2) ** 2) / (2 * 0.03));
  glow(ctx, x, y, s * 1.6, [255, 111, 97], 0.25 * k);
  ctx.save(); ctx.translate(x, y); ctx.scale(k * s / 30, k * s / 30);
  ctx.fillStyle = "#e05548";
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.bezierCurveTo(-30, 0, -20, -26, 0, -12);
  ctx.bezierCurveTo(20, -26, 30, 0, 0, 26);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,180,170,0.6)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

export function lungShape(ctx: Ctx, x: number, y: number, s: number, inflate: number, side: 1 | -1) {
  const sc = 1 + inflate * 0.3;
  ctx.save(); ctx.translate(x + side * s * 0.5, y); ctx.scale(sc, sc);
  ctx.fillStyle = `rgba(255,111,97,${0.15 + inflate * 0.25})`;
  ctx.strokeStyle = "#ff6f61"; ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(side * -14, -s * 0.62);
  ctx.bezierCurveTo(side * s * 0.5, -s * 0.56, side * s * 0.6, s * 0.1, side * s * 0.42, s * 0.56);
  ctx.bezierCurveTo(side * s * 0.2, s * 0.7, side * -0.05, s * 0.6, side * -0.1 * s, s * 0.3);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

export function pulseWave(ctx: Ctx, x: number, y: number, w: number, h: number, t: number, color = "#35d3c2", bpm = 72) {
  ctx.strokeStyle = hexA(color, 0.9); ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i <= w; i += 3) {
    const tt = t - (w - i) / (w * 1.4);
    const ph = (tt * bpm) / 60 % 1;
    const beat = (cx2: number, ww: number, hh: number) => hh * Math.exp(-((ph - cx2) ** 2) / (2 * ww * ww));
    const v = beat(0.34, 0.012, 0.42) - beat(0.3, 0.01, 0.12) - beat(0.4, 0.02, 0.18) + beat(0.16, 0.03, 0.14) + beat(0.62, 0.05, 0.2);
    const yy = y + h * 0.72 - v * h * 0.66;
    if (i === 0) ctx.moveTo(x + i, yy); else ctx.lineTo(x + i, yy);
  }
  ctx.stroke();
}

export function vessel(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, t: number, bpm = 72) {
  const ph = (t * bpm) / 60 % 1;
  const pulse = 0.5 + 0.5 * Math.sin(ph * TAU);
  ctx.strokeStyle = "#ff6f61"; ctx.lineWidth = w + pulse * 5;
  ctx.globalAlpha = 0.75;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(255,180,170,0.4)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x0, y0 - w * 0.3); ctx.lineTo(x1, y1 - w * 0.3); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const f = ((t * 60) + i * 90) % (x1 - x0);
    ctx.fillStyle = "#e05548";
    ctx.beginPath(); ctx.arc(x0 + f, y0 + ((i % 3) - 1) * w * 0.2, 4.4, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(150,40,35,0.6)";
    ctx.beginPath(); ctx.arc(x0 + f, y0 + ((i % 3) - 1) * w * 0.2, 1.8, 0, TAU); ctx.fill();
  }
}

/* ============================= physics ============================= */
export function spring(ctx: Ctx, x: number, y0: number, y1: number, coils = 8, w = 26) {
  ctx.strokeStyle = "#8fbcb8"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y0);
  const n = coils * 2;
  for (let i = 1; i <= n; i++) {
    const yy = y0 + ((y1 - y0) * i) / n;
    ctx.lineTo(x + (i % 2 ? -w / 2 : w / 2), yy);
  }
  ctx.lineTo(x, y1); ctx.stroke();
}

export function pendulumArm(ctx: Ctx, px: number, py: number, len: number, ang: number, rgb: [number, number, number]) {
  const bx = px + Math.sin(ang) * len, by = py + Math.cos(ang) * len;
  ctx.strokeStyle = "#8fbcb8"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
  glow(ctx, bx, by, 26, rgb, 0.4);
  const g = ctx.createRadialGradient(bx - 4, by - 4, 2, bx, by, 13);
  g.addColorStop(0, "#e9f6f3"); g.addColorStop(1, `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(bx, by, 13, 0, TAU); ctx.fill();
  ctx.fillStyle = "#1d5b63"; ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill();
}

export function massBlock(ctx: Ctx, x: number, y: number, w: number, h: number, label: string, color = "#56b8ff") {
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, hexA(color, 0.9)); g.addColorStop(1, hexA(color, 0.55));
  ctx.fillStyle = g; rr(ctx, x - w / 2, y - h / 2, w, h, 6); ctx.fill();
  ctx.strokeStyle = hexA(color, 1); ctx.lineWidth = 2; rr(ctx, x - w / 2, y - h / 2, w, h, 6); ctx.stroke();
  ctx.fillStyle = "#04191d"; ctx.font = `700 12px ${MONO}`; ctx.textAlign = "center";
  ctx.fillText(label, x, y + 4); ctx.textAlign = "left";
}

export function piston(ctx: Ctx, x: number, y: number, w: number, h: number, frac: number, tempFrac: number) {
  const py = y + h - frac * (h - 30);
  ctx.strokeStyle = "rgba(214,240,244,0.5)"; ctx.lineWidth = 2.6;
  ctx.strokeRect(x, y, w, h);
  const g = ctx.createLinearGradient(0, py, 0, y + h);
  g.addColorStop(0, `rgba(${Math.round(53 + tempFrac * 202)},${Math.round(211 - tempFrac * 100)},${Math.round(194 - tempFrac * 97)},0.5)`);
  g.addColorStop(1, `rgba(${Math.round(53 + tempFrac * 202)},${Math.round(211 - tempFrac * 100)},${Math.round(194 - tempFrac * 97)},0.2)`);
  ctx.fillStyle = g; ctx.fillRect(x + 2, py, w - 4, y + h - py - 2);
  const pg = ctx.createLinearGradient(0, py - 12, 0, py);
  pg.addColorStop(0, "#9fc4c0"); pg.addColorStop(1, "#2f626b");
  ctx.fillStyle = pg; ctx.fillRect(x - 6, py - 12, w + 12, 12);
  ctx.fillStyle = "#5d8a90"; ctx.fillRect(x + w / 2 - 4, py - 44, 8, 34);
}

export function magnet(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = "#ff6f61"; ctx.beginPath(); ctx.arc(x, y, s, Math.PI, 0); ctx.lineTo(x + s, y + s * 0.6); ctx.lineTo(x + s * 0.55, y + s * 0.6); ctx.lineTo(x + s * 0.55, y); ctx.arc(x, y, s * 0.55, 0, Math.PI, true); ctx.lineTo(x - s * 0.55, y + s * 0.6); ctx.lineTo(x - s, y + s * 0.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#e9f6f3";
  ctx.fillRect(x + s * 0.55, y + s * 0.35, s * 0.45, s * 0.25);
  ctx.fillRect(x - s, y + s * 0.35, s * 0.45, s * 0.25);
}

export function fieldLines(ctx: Ctx, x: number, y: number, n: number, t: number, rgb: [number, number, number]) {
  for (let i = 0; i < n; i++) {
    const r = 30 + i * 26 + Math.sin(t * 1.4 + i) * 4;
    ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.28 - i * 0.04})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  }
}

function hexRgb(c: string): [number, number, number] {
  const h = c.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
