/* Laboratory apparatus primitives — the visual vocabulary used by scenes.ts.
   Every primitive is animated where it matters (flames flicker, bubbles rise,
   hearts beat, electrons drift) so scenes feel like living instruments. */
import { glow, rr, hexA } from "./draw";

export const MONO = '"IBM Plex Mono", monospace';
export const FA = "Vazirmatn, sans-serif";

type Ctx = CanvasRenderingContext2D;
type RGB = [number, number, number];
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const TAU = Math.PI * 2;

/* ============================== text bits ============================== */
export function caption(ctx: Ctx, x: number, y: number, text: string | number, color = "#8fbcb8", size = 12) {
  ctx.fillStyle = color;
  ctx.font = `${size}px ${FA}`;
  ctx.fillText(String(text), x, y);
}

export function labelChip(ctx: Ctx, x: number, y: number, text: string | number, color = "#35d3c2", size = 11) {
  ctx.font = `700 ${size}px ${MONO}`;
  const w = ctx.measureText(String(text)).width + 16;
  ctx.fillStyle = "rgba(4,20,24,0.85)";
  rr(ctx, x, y - size - 5, w, size + 12, 6); ctx.fill();
  ctx.strokeStyle = hexA(color.startsWith("#") ? color : "#35d3c2", 0.55); ctx.lineWidth = 1.2;
  rr(ctx, x, y - size - 5, w, size + 12, 6); ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(String(text), x + 8, y - 2);
}

export function dimArrow(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, label: string | number, color = "#35d3c2") {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.8;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  const a = Math.atan2(y2 - y1, x2 - x1);
  for (const [px, py, dir] of [[x1, y1, 1], [x2, y2, -1]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(a) * 7 * dir, py + Math.sin(a) * 7 * dir);
    ctx.lineTo(px + Math.cos(a + 2.5) * 8, py + Math.sin(a + 2.5) * 8);
    ctx.lineTo(px + Math.cos(a - 2.5) * 8, py + Math.sin(a - 2.5) * 8);
    ctx.closePath(); ctx.fill();
  }
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  ctx.font = `700 11px ${MONO}`;
  const tw = ctx.measureText(String(label)).width;
  ctx.fillStyle = "rgba(4,20,24,0.85)";
  ctx.fillRect(mx - tw / 2 - 5, my - 16, tw + 10, 15);
  ctx.fillStyle = color;
  ctx.fillText(String(label), mx - tw / 2, my - 4);
}

export function meter(ctx: Ctx, x: number, y: number, w: number, value: number, max: number, label: string | number, color = "#35d3c2", unit = "") {
  const r = w * 0.62;
  ctx.fillStyle = "rgba(4,20,24,0.88)";
  ctx.strokeStyle = "rgba(42,122,128,0.9)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(143,188,184,0.3)"; ctx.lineWidth = 1.3;
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r - 5), y + Math.sin(a) * (r - 5));
    ctx.lineTo(x + Math.cos(a) * (r - 11), y + Math.sin(a) * (r - 11));
    ctx.stroke();
  }
  const f = Math.max(0, Math.min(1, value / max));
  const a = Math.PI * 0.75 + f * Math.PI * 1.5;
  glow(ctx, x + Math.cos(a) * (r - 18), y + Math.sin(a) * (r - 18), 12, hexToRgb(color), 0.5);
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (r - 16), y + Math.sin(a) * (r - 16)); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill();
  ctx.font = `700 12px ${MONO}`; ctx.textAlign = "center";
  ctx.fillStyle = "#e9f6f3";
  ctx.fillText(`${isFinite(value) ? value.toFixed(1) : "—"}${unit}`, x, y + r * 0.52);
  ctx.fillStyle = color; ctx.font = `10px ${FA}`;
  ctx.fillText(String(label), x, y + r + 15);
  ctx.textAlign = "left";
}

function hexToRgb(c: string): RGB {
  if (!c.startsWith("#")) return [53, 211, 194];
  const h = c.replace("#", "");
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
}

/* ============================== glassware ============================== */
export function beaker(ctx: Ctx, x: number, y: number, w: number, h: number, frac: number, liq: RGB, label?: string) {
  // (x, y) = bottom centre
  const top = y - h;
  ctx.fillStyle = "rgba(170,215,230,0.05)";
  ctx.strokeStyle = "rgba(214,240,244,0.6)"; ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, top); ctx.lineTo(x - w / 2 + 9, y);
  ctx.lineTo(x + w / 2 - 9, y); ctx.lineTo(x + w / 2, top);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // spout
  ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x - w / 2 - 10, top - 8); ctx.stroke();
  if (frac > 0.02) {
    const lh = frac * (h - 14);
    const ly = y - lh;
    const g = ctx.createLinearGradient(0, ly, 0, y);
    g.addColorStop(0, rgba(liq, 0.5)); g.addColorStop(1, rgba(liq, 0.28));
    ctx.fillStyle = g;
    ctx.beginPath();
    const inset = 11 * (1 - lh / h) + 3;
    ctx.moveTo(x - w / 2 + inset, ly);
    ctx.quadraticCurveTo(x, ly - 5, x + w / 2 - inset, ly);
    ctx.lineTo(x + w / 2 - 11, y - 2); ctx.lineTo(x - w / 2 + 11, y - 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(liq, 0.9); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x - w / 2 + inset, ly); ctx.quadraticCurveTo(x, ly - 5, x + w / 2 - inset, ly); ctx.stroke();
    glow(ctx, x, y - lh / 2, w * 0.55, liq, 0.12);
  }
  // graduations + shine
  ctx.strokeStyle = "rgba(214,240,244,0.3)"; ctx.lineWidth = 1.2;
  for (let i = 1; i <= 3; i++) { const gy = y - (h * i) / 4; ctx.beginPath(); ctx.moveTo(x - w / 2 + 14, gy); ctx.lineTo(x - w / 2 + 30, gy); ctx.stroke(); }
  ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x - w / 2 + 10, top + 14); ctx.lineTo(x - w / 2 + 15, y - 18); ctx.stroke();
  if (label) { ctx.fillStyle = "#8fbcb8"; ctx.font = `11px ${FA}`; ctx.textAlign = "center"; ctx.fillText(label, x, y + 18); ctx.textAlign = "left"; }
}

export function erlen(ctx: Ctx, x: number, y: number, s: number, frac: number, liq: RGB) {
  // (x, y) centre; s = scale
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  ctx.fillStyle = "rgba(170,215,230,0.05)";
  ctx.strokeStyle = "rgba(214,240,244,0.6)"; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-20, -110); ctx.lineTo(-20, -50);
  ctx.bezierCurveTo(-95, -15, -90, 85, -52, 108); ctx.lineTo(52, 108);
  ctx.bezierCurveTo(90, 85, 95, -15, 20, -50); ctx.lineTo(20, -110);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (frac > 0.02) {
    const ly = 108 - frac * 165;
    const g = ctx.createLinearGradient(0, ly, 0, 108);
    g.addColorStop(0, rgba(liq, 0.5)); g.addColorStop(1, rgba(liq, 0.26));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-86, ly);
    ctx.bezierCurveTo(-82, 80, -70, 104, -50, 106); ctx.lineTo(50, 106);
    ctx.bezierCurveTo(70, 104, 82, 80, 86, ly); ctx.closePath(); ctx.fill();
    glow(ctx, 0, (ly + 106) / 2, 90, liq, 0.14);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-70, 5); ctx.bezierCurveTo(-76, 45, -66, 78, -46, 96); ctx.stroke();
  ctx.restore();
}

export function testTube(ctx: Ctx, x: number, yTop: number, w: number, h: number, frac: number, liq: RGB) {
  ctx.fillStyle = "rgba(170,215,230,0.05)";
  ctx.strokeStyle = "rgba(214,240,244,0.6)"; ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, yTop); ctx.lineTo(x - w / 2, yTop + h - w / 2);
  ctx.arc(x, yTop + h - w / 2, w / 2, Math.PI, 0, true);
  ctx.lineTo(x + w / 2, yTop);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - w / 2 - 6, yTop); ctx.lineTo(x + w / 2 + 6, yTop); ctx.stroke();
  if (frac > 0.02) {
    const lh = frac * (h - w);
    const ly = yTop + h - w / 2 - lh;
    const g = ctx.createLinearGradient(0, ly, 0, yTop + h);
    g.addColorStop(0, rgba(liq, 0.55)); g.addColorStop(1, rgba(liq, 0.3));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 2.5, ly);
    ctx.lineTo(x - w / 2 + 2.5, yTop + h - w / 2);
    ctx.arc(x, yTop + h - w / 2, w / 2 - 2.5, Math.PI, 0, true);
    ctx.lineTo(x + w / 2 - 2.5, ly);
    ctx.closePath(); ctx.fill();
    glow(ctx, x, (ly + yTop + h) / 2, w, liq, 0.16);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 2; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x - w / 2 + 5, yTop + 12); ctx.lineTo(x - w / 2 + 5, yTop + h - w); ctx.stroke();
}

export function gradCyl(ctx: Ctx, x: number, y: number, w: number, h: number, frac: number, liq: RGB) {
  // (x, y) = bottom centre
  const top = y - h;
  ctx.fillStyle = "rgba(170,215,230,0.05)";
  ctx.strokeStyle = "rgba(214,240,244,0.6)"; ctx.lineWidth = 2.2;
  rr(ctx, x - w / 2, top, w, h, 5); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - w / 2 - 8, y); ctx.lineTo(x + w / 2 + 8, y); ctx.stroke();
  if (frac > 0.02) {
    const lh = frac * (h - 10);
    ctx.fillStyle = rgba(liq, 0.42);
    rr(ctx, x - w / 2 + 3, y - lh - 3, w - 6, lh, 3); ctx.fill();
    glow(ctx, x, y - lh / 2, w, liq, 0.14);
  }
  ctx.strokeStyle = "rgba(214,240,244,0.35)"; ctx.lineWidth = 1.1;
  for (let i = 1; i < 8; i++) { const gy = y - (h * i) / 8; ctx.beginPath(); ctx.moveTo(x - w / 2 + 4, gy); ctx.lineTo(x - w / 2 + (i % 2 ? 12 : 20), gy); ctx.stroke(); }
}

export function burette(ctx: Ctx, x: number, yTop: number, h: number, frac: number, liq: RGB) {
  ctx.strokeStyle = "rgba(214,240,244,0.6)"; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(x - 9, yTop); ctx.lineTo(x - 9, yTop + h); ctx.lineTo(x - 3, yTop + h + 26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 9, yTop); ctx.lineTo(x + 9, yTop + h); ctx.lineTo(x + 3, yTop + h + 26); ctx.stroke();
  if (frac > 0.02) {
    ctx.fillStyle = rgba(liq, 0.5);
    ctx.fillRect(x - 7, yTop + h * (1 - frac), 14, h * frac);
  }
  ctx.fillStyle = "#2a7a80"; ctx.fillRect(x - 15, yTop + h * 0.7, 30, 9);
  ctx.strokeStyle = "rgba(214,240,244,0.35)"; ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(x - 9, yTop + (h * i) / 10); ctx.lineTo(x - 3, yTop + (h * i) / 10); ctx.stroke(); }
}

export function burner(ctx: Ctx, x: number, y: number, t: number, flame: RGB) {
  // base at (x, y)
  ctx.fillStyle = "#1d3a44";
  rr(ctx, x - 34, y - 8, 68, 12, 4); ctx.fill();
  ctx.fillStyle = "#2a7a80";
  ctx.fillRect(x - 8, y - 78, 16, 72);
  ctx.fillRect(x - 16, y - 92, 32, 16);
  const flick = 0.82 + 0.18 * Math.sin(t * 19) * Math.sin(t * 12.7);
  const fh = 58 * flick;
  glow(ctx, x, y - 100 - fh / 2, 60, flame, 0.4);
  const g = ctx.createLinearGradient(0, y - 96 - fh, 0, y - 92);
  g.addColorStop(0, rgba(flame, 0.9)); g.addColorStop(0.55, rgba(flame, 0.55)); g.addColorStop(1, "rgba(90,140,255,0.5)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - 96 - fh);
  ctx.bezierCurveTo(x + 20, y - 100 - fh * 0.5, x + 16, y - 96, x, y - 92);
  ctx.bezierCurveTo(x - 16, y - 96, x - 20, y - 100 - fh * 0.5, x, y - 96 - fh);
  ctx.fill();
  ctx.fillStyle = "rgba(90,140,255,0.65)";
  ctx.beginPath();
  ctx.moveTo(x, y - 96 - fh * 0.42);
  ctx.bezierCurveTo(x + 8, y - 98, x + 6, y - 93, x, y - 91);
  ctx.bezierCurveTo(x - 6, y - 93, x - 8, y - 98, x, y - 96 - fh * 0.42);
  ctx.fill();
}

export function bubbles(ctx: Ctx, x: number, y: number, w: number, h: number, n: number, t: number, col: RGB, alpha = 0.6) {
  // bubbles rise within rect (x, y) .. (x+w, y+h)
  for (let i = 0; i < n; i++) {
    const speed = 26 + (i % 4) * 14;
    const cyc = ((t * speed + i * (h / n) * 1.7) % h) / h;
    const bx = x + ((i * 0.618 * w) % w) + Math.sin(t * 2 + i * 2.4) * 5;
    const by = y + h - cyc * h;
    const r = 2 + (i % 3) * 1.5 + cyc * 1.5;
    ctx.strokeStyle = rgba(col, alpha * (1 - cyc * 0.4));
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = rgba(col, alpha * 0.16);
    ctx.fill();
  }
}

export function stirBar(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save(); ctx.translate(x, y);
  const wob = Math.sin(t * 9) * 0.25;
  ctx.rotate(wob);
  ctx.fillStyle = "#0a2429"; ctx.strokeStyle = "rgba(214,240,244,0.7)"; ctx.lineWidth = 1.6;
  rr(ctx, -24, -6, 48, 12, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(214,240,244,0.5)";
  ctx.beginPath(); ctx.arc(14, 0, 3, 0, TAU); ctx.fill();
  ctx.restore();
  // swirl hint
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(x, y - 16, 26, t * 3, t * 3 + 2.2); ctx.stroke();
}

/* ============================== optics ============================== */
export function lens(ctx: Ctx, x: number, y: number, h: number, convex = true) {
  ctx.fillStyle = "rgba(140,210,235,0.14)";
  ctx.strokeStyle = "rgba(160,225,245,0.8)"; ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (convex) ctx.ellipse(x, y, 13, h / 2, 0, 0, TAU);
  else {
    ctx.moveTo(x - 8, y - h / 2); ctx.lineTo(x + 8, y - h / 2);
    ctx.quadraticCurveTo(x - 6, y, x + 8, y + h / 2); ctx.lineTo(x - 8, y + h / 2);
    ctx.quadraticCurveTo(x + 6, y, x - 8, y - h / 2);
  }
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(x - 4, y - h * 0.18, 3, h * 0.2, 0.2, 0, TAU); ctx.stroke();
}

export function prism(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = "rgba(140,210,235,0.16)";
  ctx.strokeStyle = "rgba(160,225,245,0.8)"; ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.9, y + s * 0.7); ctx.lineTo(x - s * 0.9, y + s * 0.7);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

export function ray(ctx: Ctx, pts: [number, number][], color: string, width = 2, dashed = false) {
  if (pts.length < 2) return;
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
  if (dashed) ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.setLineDash([]);
  const [ax, ay] = pts[pts.length - 1], [bx, by] = pts[pts.length - 2];
  const a = Math.atan2(ay - by, ax - bx);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(ax + Math.cos(a) * 8, ay + Math.sin(a) * 8);
  ctx.lineTo(ax + Math.cos(a + 2.6) * 8, ay + Math.sin(a + 2.6) * 8);
  ctx.lineTo(ax + Math.cos(a - 2.6) * 8, ay + Math.sin(a - 2.6) * 8);
  ctx.closePath(); ctx.fill();
}

export function lightSource(ctx: Ctx, x: number, y: number, t: number, color = "#ffd23c") {
  const pulse = 0.75 + 0.25 * Math.sin(t * 6);
  glow(ctx, x, y, 44, hexToRgb(color), 0.35 * pulse);
  ctx.fillStyle = "#0e4a52"; ctx.strokeStyle = "rgba(42,122,128,0.9)"; ctx.lineWidth = 2;
  rr(ctx, x - 26, y - 20, 40, 40, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x + 17, y, 8 * pulse + 3, 0, TAU); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.7); ctx.lineWidth = 1.6;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(x + 28, y + i * 7); ctx.lineTo(x + 40, y + i * 10); ctx.stroke();
  }
}

export function screenBand(ctx: Ctx, x: number, y: number, h: number, col: RGB, intensity = 0.8) {
  ctx.fillStyle = "rgba(10,30,36,0.9)";
  rr(ctx, x, y - 12, 26, h + 24, 5); ctx.fill();
  ctx.strokeStyle = "rgba(42,122,128,0.8)"; ctx.lineWidth = 1.4;
  rr(ctx, x, y - 12, 26, h + 24, 5); ctx.stroke();
  const cy = y + h / 2;
  for (let i = -5; i <= 5; i++) {
    const env = i === 0 ? 1 : Math.pow(Math.sin(i * 0.9) / (i * 0.9), 2);
    const yy = cy + i * (h / 11);
    glow(ctx, x + 13, yy, 16, col, 0.5 * env * intensity);
    ctx.fillStyle = rgba(col, Math.min(1, env * intensity));
    ctx.fillRect(x + 4, yy - 2.5, 18, 5);
  }
}

/* ============================== electronics ============================== */
export function wire(ctx: Ctx, pts: [number, number][], color = "rgba(143,188,184,0.75)") {
  if (pts.length < 2) return;
  ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

export function resistor(ctx: Ctx, x: number, y: number, len: number, label?: string) {
  ctx.strokeStyle = "#f2a83b"; ctx.lineWidth = 2.6; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x - len / 2, y);
  const seg = len / 8;
  for (let i = 0; i < 8; i++) ctx.lineTo(x - len / 2 + seg * (i + 0.5), y + (i % 2 === 0 ? -9 : 9));
  ctx.lineTo(x + len / 2, y);
  ctx.stroke();
  if (label) { ctx.fillStyle = "#8fbcb8"; ctx.font = `10px ${MONO}`; ctx.textAlign = "center"; ctx.fillText(label, x, y - 16); ctx.textAlign = "left"; }
}

export function battery(ctx: Ctx, x: number, y: number, label?: string) {
  ctx.strokeStyle = "#e9f6f3"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 4, y - 14); ctx.lineTo(x - 4, y + 14); ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(x + 6, y - 8); ctx.lineTo(x + 6, y + 8); ctx.stroke();
  ctx.fillStyle = "#e9f6f3"; ctx.font = `10px ${MONO}`;
  ctx.fillText("+", x + 10, y - 10); ctx.fillText("−", x - 16, y - 10);
  if (label) { ctx.fillStyle = "#8fbcb8"; ctx.textAlign = "center"; ctx.fillText(label, x, y + 28); ctx.textAlign = "left"; }
}

export function led(ctx: Ctx, x: number, y: number, on: number, color = "#ff6f61") {
  if (on > 0.04) glow(ctx, x, y, 26, hexToRgb(color), 0.5 * on);
  ctx.fillStyle = on > 0.04 ? hexA(color, 0.35 + on * 0.6) : "rgba(15,61,70,0.7)";
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill(); ctx.stroke();
  if (on > 0.04) {
    ctx.strokeStyle = hexA(color, 0.8 * on); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x + 12, y - 14); ctx.lineTo(x + 20, y - 22); ctx.moveTo(x + 16, y - 8); ctx.lineTo(x + 24, y - 16); ctx.stroke();
  }
}

export function diode(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = "rgba(179,136,255,0.25)";
  ctx.strokeStyle = "#b388ff"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x - 11, y - 11); ctx.lineTo(x - 11, y + 11); ctx.lineTo(x + 8, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 8, y - 11); ctx.lineTo(x + 8, y + 11); ctx.stroke();
}

export function capacitor(ctx: Ctx, x: number, y: number) {
  ctx.strokeStyle = "#56b8ff"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 5, y - 13); ctx.lineTo(x - 5, y + 13); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 5, y - 13); ctx.lineTo(x + 5, y + 13); ctx.stroke();
}

export function inductor(ctx: Ctx, x: number, y: number) {
  ctx.strokeStyle = "#35d3c2"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) ctx.arc(x - 18 + i * 12, y, 6, Math.PI, 0, false);
  ctx.stroke();
}

export function chipBox(ctx: Ctx, x: number, y: number, w: number, h: number, label?: string, color = "#35d3c2") {
  ctx.fillStyle = "rgba(10,30,36,0.9)";
  ctx.strokeStyle = hexA(color, 0.7); ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = hexA(color, 0.9);
  ctx.beginPath(); ctx.roundRect(x + 8, y - 3, 34, 6, 3); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.5); ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x - 10, y + 16 + i * ((h - 32) / 2)); ctx.lineTo(x, y + 16 + i * ((h - 32) / 2)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w, y + 16 + i * ((h - 32) / 2)); ctx.lineTo(x + w + 10, y + 16 + i * ((h - 32) / 2)); ctx.stroke();
  }
  if (label) { ctx.fillStyle = color; ctx.font = `700 12px ${FA}`; ctx.textAlign = "center"; ctx.fillText(label, x + w / 2, y + h / 2 + 4); ctx.textAlign = "left"; }
}

/* ============================== biology ============================== */
export function cell(ctx: Ctx, x: number, y: number, r: number, col: RGB, t = 0) {
  const wob = 1 + 0.035 * Math.sin(t * 2.2);
  glow(ctx, x, y, r * 1.8, col, 0.14);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, rgba(col, 0.55)); g.addColorStop(1, rgba(col, 0.22));
  ctx.fillStyle = g; ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(x, y, r * wob, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = rgba(col, 0.55);
  ctx.beginPath(); ctx.arc(x + r * 0.12, y - r * 0.08, r * 0.38, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.5);
  ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.12, 0, TAU); ctx.fill();
}

export function bacteria(ctx: Ctx, x: number, y: number, t: number, seed: number, col: RGB) {
  ctx.save(); ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 1.4 + seed) * 0.6 + seed);
  ctx.fillStyle = rgba(col, 0.85);
  rr(ctx, -9, -4, 18, 8, 4); ctx.fill();
  ctx.strokeStyle = rgba(col, 0.5); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.quadraticCurveTo(16, Math.sin(t * 8 + seed) * 4, 22, 0); ctx.stroke();
  ctx.restore();
}

export function dnaHelix(ctx: Ctx, x: number, y: number, h: number, t: number) {
  const amp = 26;
  for (let i = 0; i <= 40; i++) {
    const k = i / 40;
    const yy = y + k * h;
    const ph = k * 4 * Math.PI + t * 0.9;
    const x1 = x + Math.sin(ph) * amp, x2 = x - Math.sin(ph) * amp;
    if (i % 2 === 0) {
      ctx.strokeStyle = "rgba(233,246,243,0.22)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x1, yy); ctx.lineTo(x2, yy); ctx.stroke();
    }
    ctx.fillStyle = "#a5d95c"; ctx.beginPath(); ctx.arc(x1, yy, 3.4, 0, TAU); ctx.fill();
    ctx.fillStyle = "#56b8ff"; ctx.beginPath(); ctx.arc(x2, yy, 3.4, 0, TAU); ctx.fill();
  }
}

export function leaf(ctx: Ctx, x: number, y: number, s: number, t: number) {
  const sway = Math.sin(t * 1.3) * 0.08;
  ctx.save(); ctx.translate(x, y); ctx.rotate(sway);
  const g = ctx.createLinearGradient(-s, 0, s, 0);
  g.addColorStop(0, "rgba(124,179,66,0.85)"); g.addColorStop(1, "rgba(156,204,101,0.6)");
  ctx.fillStyle = g;
  ctx.strokeStyle = "rgba(124,179,66,0.9)"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.quadraticCurveTo(-s * 0.3, -s * 0.75, s * 0.9, -s * 0.15);
  ctx.quadraticCurveTo(s * 0.3, s * 0.55, -s, 0);
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(233,246,243,0.35)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.2, s * 0.85, -s * 0.14); ctx.stroke();
  ctx.restore();
}

export function enzyme(ctx: Ctx, x: number, y: number, r: number, t: number, col: RGB) {
  const wob = 1 + 0.05 * Math.sin(t * 2.6);
  glow(ctx, x, y, r * 1.7, col, 0.2);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.15, x, y, r);
  g.addColorStop(0, rgba(col, 0.6)); g.addColorStop(1, rgba(col, 0.25));
  ctx.fillStyle = g; ctx.strokeStyle = rgba(col, 0.95); ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * TAU;
    const rr2 = r * wob * (1 + 0.12 * Math.sin(a * 3 + 1));
    const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // active-site pocket
  ctx.fillStyle = "rgba(4,25,29,0.85)";
  ctx.beginPath(); ctx.arc(x + r * 0.55, y - r * 0.2, r * 0.3, 0.6, TAU - 0.9); ctx.quadraticCurveTo(x + r * 0.75, y - r * 0.2, x + r * 0.55, y - r * 0.2); ctx.fill();
  ctx.fillStyle = rgba([255, 255, 255], 0.4);
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.36, r * 0.13, 0, TAU); ctx.fill();
}

export function membraneWall(ctx: Ctx, x: number, yTop: number, h: number, t: number, w = 4) {
  // vertical phospholipid bilayer at x
  for (let yy = yTop; yy < yTop + h; yy += 13) {
    const wob = Math.sin(t * 1.8 + yy * 0.1) * 2;
    for (const side of [-1, 1]) {
      const hx = x + side * (w + 3) + wob;
      ctx.fillStyle = "rgba(86,184,255,0.85)";
      ctx.beginPath(); ctx.arc(hx, yy, 4, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(242,168,59,0.6)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(hx, yy + 3); ctx.lineTo(hx + side * 5, yy + 11); ctx.moveTo(hx, yy + 3); ctx.lineTo(hx - side * 2, yy + 11); ctx.stroke();
    }
  }
  ctx.strokeStyle = "rgba(86,184,255,0.25)"; ctx.setLineDash([3, 5]); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x, yTop - 8); ctx.lineTo(x, yTop + h + 8); ctx.stroke();
  ctx.setLineDash([]);
}

/* ============================== medicine ============================== */
export function heartBeat(ctx: Ctx, x: number, y: number, s: number, t: number, hr = 72) {
  const phase = ((t * hr) / 60) % 1;
  const beat = Math.exp(-((phase - 0.18) ** 2) / (2 * 0.05 * 0.05));
  const sc = (s / 60) * (1 + beat * 0.16);
  glow(ctx, x, y, s * 1.5, [255, 111, 97], 0.18 + beat * 0.4);
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  const g = ctx.createRadialGradient(-12, -14, 6, 0, 0, 44);
  g.addColorStop(0, "#ff9a8f"); g.addColorStop(1, "#c94a3e");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.bezierCurveTo(-40, 4, -28, -32, 0, -14);
  ctx.bezierCurveTo(28, -32, 40, 4, 0, 34);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,180,170,0.5)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  if (beat > 0.5) {
    ctx.strokeStyle = `rgba(255,111,97,${(beat - 0.5) * 0.9})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, s * (1.25 + (1 - beat) * 0.5), 0, TAU); ctx.stroke();
  }
}

export function lungShape(ctx: Ctx, x: number, y: number, h: number, fill: number, side: 1 | -1) {
  const sc = (h / 180) * (1 + fill * 0.3);
  ctx.save(); ctx.translate(x, y); ctx.scale(side * sc, sc);
  const g = ctx.createLinearGradient(0, -90, 0, 110);
  g.addColorStop(0, `rgba(255,140,125,${0.2 + fill * 0.28})`);
  g.addColorStop(1, `rgba(220,90,80,${0.16 + fill * 0.22})`);
  ctx.fillStyle = g;
  ctx.strokeStyle = "rgba(255,111,97,0.85)"; ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-14, -90);
  ctx.bezierCurveTo(72, -80, 90, 22, 62, 94);
  ctx.bezierCurveTo(30, 118, -8, 98, -14, 44);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // bronchioles
  ctx.strokeStyle = "rgba(255,200,190,0.4)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-4, -70); ctx.quadraticCurveTo(20, -20, 34, 40); ctx.moveTo(-4, -40); ctx.quadraticCurveTo(8, 0, 6, 60); ctx.stroke();
  ctx.restore();
}

export function pulseWave(ctx: Ctx, x: number, y: number, w: number, h: number, t: number, color = "#35d3c2", hr = 72) {
  ctx.fillStyle = "rgba(4,20,24,0.72)";
  rr(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.4); ctx.lineWidth = 1.3;
  rr(ctx, x, y, w, h, 10); ctx.stroke();
  ctx.strokeStyle = "rgba(143,188,184,0.12)"; ctx.lineWidth = 1;
  for (let gx = x + 20; gx < x + w; gx += 20) { ctx.beginPath(); ctx.moveTo(gx, y + 6); ctx.lineTo(gx, y + h - 6); ctx.stroke(); }
  const mid = y + h * 0.62;
  const beat = (t: number) => {
    const p = (t: number, c: number, ww: number, hh: number) => hh * Math.exp(-((t - c) ** 2) / (2 * ww * ww));
    return p(t, 0.16, 0.05, 0.12) - p(t, 0.3, 0.018, 0.08) + p(t, 0.34, 0.022, 1) - p(t, 0.39, 0.02, 0.22) + p(t, 0.56, 0.06, 0.28);
  };
  const per = 60 / hr;
  ctx.strokeStyle = color; ctx.lineWidth = 2.2;
  if (ctx.shadowColor !== undefined) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
  ctx.beginPath();
  for (let i = 0; i <= w - 16; i += 2) {
    const tt = ((i / (w - 16)) * (w / 90) * per + t) % per / per;
    const yy = mid - beat(tt) * h * 0.42;
    if (i === 0) ctx.moveTo(x + 8 + i, yy); else ctx.lineTo(x + 8 + i, yy);
  }
  ctx.stroke(); ctx.shadowBlur = 0;
}

export function vessel(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, t: number, hr = 72) {
  // horizontal vessel centred at (x, y) spanning w
  const x0 = x - w / 2 + 60, x1 = x + w / 2 - 20;
  const pulse = 1 + 0.08 * Math.sin(t * ((hr / 60) * TAU));
  const rp = r * pulse;
  const g = ctx.createLinearGradient(0, y - rp, 0, y + rp);
  g.addColorStop(0, "rgba(140,40,36,0.9)"); g.addColorStop(0.5, "rgba(210,80,70,0.75)"); g.addColorStop(1, "rgba(120,32,30,0.9)");
  ctx.fillStyle = g;
  rr(ctx, x0, y - rp, x1 - x0, rp * 2, rp); ctx.fill();
  ctx.strokeStyle = "rgba(255,180,170,0.4)"; ctx.lineWidth = 1.6;
  rr(ctx, x0, y - rp, x1 - x0, rp * 2, rp); ctx.stroke();
  const n = Math.max(4, Math.round((x1 - x0) / 46));
  for (let i = 0; i < n; i++) {
    const cx2 = x0 + ((i * 46 + t * (40 + hr * 0.5)) % (x1 - x0));
    const cy2 = y + Math.sin(i * 2.3) * rp * 0.4;
    ctx.fillStyle = "#e05548";
    ctx.beginPath(); ctx.ellipse(cx2, cy2, 6, 4.4, Math.sin(t + i) * 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(120,30,26,0.7)";
    ctx.beginPath(); ctx.arc(cx2, cy2, 2, 0, TAU); ctx.fill();
  }
}

/* ============================== mechanics ============================== */
export function spring(ctx: Ctx, x: number, yTop: number, len: number, coils = 8) {
  ctx.strokeStyle = "#2a7a80"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x - 34, yTop); ctx.lineTo(x + 34, yTop); ctx.stroke();
  ctx.strokeStyle = "#8fbcb8"; ctx.lineWidth = 3; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(x, yTop + 3);
  for (let i = 1; i <= coils * 2; i++) {
    const yy = yTop + 3 + (len * i) / (coils * 2);
    ctx.lineTo(x + (i % 2 === 0 ? 0 : i % 4 === 1 ? -17 : 17), yy);
  }
  ctx.lineTo(x, yTop + 3 + len);
  ctx.stroke();
}

export function pendulumArm(ctx: Ctx, x: number, y: number, len: number, ang: number, col = "#f2a83b") {
  const bx = x + Math.sin(ang) * len, by = y + Math.cos(ang) * len;
  ctx.strokeStyle = "rgba(143,188,184,0.8)"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx, by); ctx.stroke();
  glow(ctx, bx, by, 22, hexToRgb(col), 0.4);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(bx, by, 11, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.arc(bx - 3, by - 3, 3, 0, TAU); ctx.fill();
}

export function massBlock(ctx: Ctx, x: number, y: number, w: number, h: number, label?: string, color = "#f2a83b") {
  const g = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
  g.addColorStop(0, hexA(color, 0.95)); g.addColorStop(1, hexA(color, 0.55));
  ctx.fillStyle = g;
  rr(ctx, x - w / 2, y - h / 2, w, h, 6); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.9); ctx.lineWidth = 2;
  rr(ctx, x - w / 2, y - h / 2, w, h, 6); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  rr(ctx, x - w / 2 + 4, y - h / 2 + 4, w - 8, 6, 3); ctx.fill();
  if (label) {
    ctx.fillStyle = "#04191d"; ctx.font = `700 12px ${MONO}`; ctx.textAlign = "center";
    ctx.fillText(String(label), x, y + 4); ctx.textAlign = "left";
  }
}

export function piston(ctx: Ctx, x: number, yTop: number, w: number, h: number, frac: number, heat = 0.5) {
  const cool: RGB = [86, 184, 255], warm: RGB = [255, 140, 80];
  const gas: RGB = [Math.round(cool[0] + (warm[0] - cool[0]) * heat), Math.round(cool[1] + (warm[1] - cool[1]) * heat), Math.round(cool[2] + (warm[2] - cool[2]) * heat)];
  const pistonY = yTop + (1 - Math.max(0.06, Math.min(0.96, frac))) * (h - 46);
  ctx.fillStyle = "rgba(170,215,230,0.05)";
  ctx.strokeStyle = "rgba(214,240,244,0.55)"; ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, yTop); ctx.lineTo(x - w / 2, yTop + h); ctx.lineTo(x + w / 2, yTop + h); ctx.lineTo(x + w / 2, yTop);
  ctx.stroke(); ctx.fill();
  glow(ctx, x, (pistonY + yTop + h) / 2, w * 0.85, gas, 0.2 + heat * 0.12);
  ctx.fillStyle = rgba(gas, 0.3 + heat * 0.12);
  ctx.fillRect(x - w / 2 + 3, pistonY, w - 6, yTop + h - pistonY - 3);
  // gas particles
  const n = 8;
  for (let i = 0; i < n; i++) {
    const ph = (performance.now() / 1000) * (1 + heat * 2) + i * 1.7;
    const px = x - w / 2 + 12 + ((Math.sin(ph * 1.3 + i) * 0.5 + 0.5) * (w - 24));
    const py = pistonY + 10 + ((Math.cos(ph + i * 2.1) * 0.5 + 0.5) * (yTop + h - pistonY - 22));
    ctx.fillStyle = rgba(gas, 0.8);
    ctx.beginPath(); ctx.arc(px, py, 2.6, 0, TAU); ctx.fill();
  }
  const pg = ctx.createLinearGradient(0, pistonY - 15, 0, pistonY + 1);
  pg.addColorStop(0, "#9fc4c0"); pg.addColorStop(1, "#2f626b");
  ctx.fillStyle = pg;
  rr(ctx, x - w / 2 - 7, pistonY - 15, w + 14, 15, 3); ctx.fill();
  ctx.fillStyle = "#5d8a90"; ctx.fillRect(x - 5, pistonY - 58, 10, 45);
  ctx.fillStyle = "#2f626b"; rr(ctx, x - 17, pistonY - 65, 34, 9, 4); ctx.fill();
  ctx.fillStyle = "#1d3a44"; ctx.fillRect(x - w / 2 - 10, yTop + h, w + 20, 8);
}

export function magnet(ctx: Ctx, x: number, y: number, s: number) {
  ctx.lineWidth = s * 0.42; ctx.lineCap = "butt";
  ctx.strokeStyle = "#ff6f61";
  ctx.beginPath(); ctx.arc(x, y, s, Math.PI * 0.9, Math.PI * 1.5); ctx.stroke();
  ctx.strokeStyle = "#56b8ff";
  ctx.beginPath(); ctx.arc(x, y, s, Math.PI * 1.5, Math.PI * 2.1); ctx.stroke();
  ctx.fillStyle = "#9fc4c0";
  ctx.fillRect(x - s - s * 0.21, y - 4, s * 0.42, 26);
  ctx.fillRect(x + s - s * 0.21, y - 4, s * 0.42, 26);
  ctx.fillStyle = "#e9f6f3"; ctx.font = `700 ${Math.max(11, s * 0.34)}px ${MONO}`;
  ctx.fillText("N", x - s - s * 0.13, y + 40); ctx.fillText("S", x + s - s * 0.1, y + 40);
}

export function fieldLines(ctx: Ctx, x: number, y: number, n: number, t: number, col: RGB) {
  for (let i = 0; i < n; i++) {
    const r0 = 26 + i * 26;
    const a0 = t * 0.5 + i;
    ctx.strokeStyle = rgba(col, 0.3 - i * 0.04);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, r0, a0, a0 + 4.6); ctx.stroke();
    const tipA = a0 + 4.6;
    ctx.fillStyle = rgba(col, 0.5 - i * 0.06);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(tipA) * (r0 + 6), y + Math.sin(tipA) * (r0 + 6));
    ctx.lineTo(x + Math.cos(tipA + 0.16) * r0, y + Math.sin(tipA + 0.16) * r0);
    ctx.lineTo(x + Math.cos(tipA - 0.16) * r0, y + Math.sin(tipA - 0.16) * r0);
    ctx.closePath(); ctx.fill();
  }
}
