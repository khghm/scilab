import type { SeriesDef } from "../components/Chart";

export function sr(name: string, color: string, arr: { x: number; y: number }[]): SeriesDef {
  return { name, color, ["data"]: arr };
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
