import type { SeriesDef } from "../components/Chart";
import * as chemKit from "./chem";

export function sr(name: string, color: string, arr: { x: number; y: number }[]): SeriesDef {
  return { name, color, ["data"]: arr };
}

/** rich layered chemistry scene: ambient gradient + molecular lattice + lab bench */
export function chemScene(ctx: CanvasRenderingContext2D, W: number, H: number, ar: boolean, t = 0, benchY = 462) {
  chemKit.chemBg(ctx, W, H, ar, t);
  if (!ar) chemKit.bench(ctx, W, H, benchY);
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function bg(ctx: CanvasRenderingContext2D, W: number, H: number, ar: boolean) {
  ctx.clearRect(0, 0, W, H);
  if (!ar) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#082229");
    g.addColorStop(1, "#0b3038");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

export function hud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ar: boolean) {
  ctx.fillStyle = ar ? "rgba(4,25,29,0.6)" : "rgba(4,25,29,0.8)";
  ctx.strokeStyle = "rgba(23,80,89,0.9)";
  ctx.lineWidth = 1.5;
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

export function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, color: string, w = 2.5) {
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  const a = Math.atan2(dy, dx);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - 9 * Math.cos(a - 0.4), y + dy - 9 * Math.sin(a - 0.4));
  ctx.lineTo(x + dx - 9 * Math.cos(a + 0.4), y + dy - 9 * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fill();
}

export const MONO = '"IBM Plex Mono", monospace';
export const FA = "Vazirmatn, sans-serif";

/* ================= physics scene system ================= */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: [number, number, number], a: number) {
  if (a <= 0.003) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** rich physics backdrop: deep gradient, traveling sine field-lines, pulsing dot lattice, ambient glows */
export function physScene(ctx: CanvasRenderingContext2D, W: number, H: number, ar: boolean, t = performance.now() / 1000) {
  ctx.clearRect(0, 0, W, H);
  if (ar) return;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#051826");
  g.addColorStop(0.55, "#082835");
  g.addColorStop(1, "#0b3140");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // ambient glows — cool blue top-right, warm amber bottom-left (physics dual accent)
  glow(ctx, W * 0.82, H * 0.05, 340, [86, 184, 255], 0.10);
  glow(ctx, W * 0.08, H * 1.02, 320, [242, 168, 59], 0.07);
  glow(ctx, W * 0.5, H * 0.55, 420, [53, 211, 194], 0.04);

  // traveling sine field-lines (ambient waves drifting)
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 4; k++) {
    const yBase = 90 + k * 130 + Math.sin(t * 0.5 + k * 1.7) * 10;
    ctx.strokeStyle = `rgba(86,184,255,${(0.05 + (k % 2) * 0.03).toFixed(2)})`;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 14) {
      const y = yBase + Math.sin(x / 95 + t * (0.8 + k * 0.15) + k) * (10 + k * 4);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // dot lattice with a faint radial pulse sweeping across
  const pulse = (t * 60) % (W + 300);
  ctx.fillStyle = "rgba(143,188,184,0.14)";
  for (let x = 30; x < W; x += 48) {
    for (let y = 26; y < H; y += 48) {
      const d = Math.abs(x - pulse);
      const boost = d < 120 ? (1 - d / 120) * 0.25 : 0;
      ctx.globalAlpha = Math.min(1, 0.5 + boost * 2.4);
      ctx.beginPath();
      ctx.arc(x, y, boost > 0 ? 1.6 : 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // faint orbital rings (quantum / mechanics signature)
  ctx.strokeStyle = "rgba(86,184,255,0.06)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.52, 120 * i + Math.sin(t * 0.4 + i) * 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** fading motion trail for moving objects */
export function trail(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], color: string, maxW = 5) {
  const n = pts.length;
  if (n < 2) return;
  for (let i = 1; i < n; i++) {
    const k = i / n;
    ctx.strokeStyle = color;
    ctx.globalAlpha = k * k * 0.55;
    ctx.lineWidth = 1 + k * maxW;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
