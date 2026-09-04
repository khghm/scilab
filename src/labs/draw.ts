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

/* ============ biology ambience — drifting cells & organic glow ============ */
export function bioScene(ctx: CanvasRenderingContext2D, W: number, H: number, ar: boolean, t?: number) {
  if (t === undefined) t = performance.now() / 1000;
  ctx.clearRect(0, 0, W, H);
  if (ar) return;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#062018");
  g.addColorStop(0.55, "#082823");
  g.addColorStop(1, "#0b3028");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, W * 0.12, H * 0.9, 440, [60, 190, 130], 0.07);
  glow(ctx, W * 0.88, H * 0.08, 400, [165, 217, 92], 0.06);
  // drifting cells with membranes + nuclei
  for (let i = 0; i < 13; i++) {
    const seed = i * 137.5;
    const bx = (seed * 7.13) % W;
    const by = (seed * 3.71) % H;
    const x = bx + Math.sin(t * 0.25 + i * 2.1) * 16;
    const y = by + Math.cos(t * 0.2 + i * 1.7) * 12;
    const r = 9 + (i % 4) * 6;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.8 + i);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(120,210,160,${(0.035 + pulse * 0.03).toFixed(3)})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(140,225,175,${(0.10 + pulse * 0.07).toFixed(3)})`;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + r * 0.16, y - r * 0.1, r * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(190,240,200,${(0.10 + pulse * 0.08).toFixed(3)})`;
    ctx.fill();
  }
  // faint helix motif (DNA) bottom-right
  for (let i = 0; i < 22; i++) {
    const x = W - 130 + Math.sin(i * 0.55 + t * 0.4) * 22;
    const y = 90 + i * 21;
    const x2 = W - 130 - Math.sin(i * 0.55 + t * 0.4) * 22;
    ctx.fillStyle = "rgba(165,217,92,0.10)";
    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(86,184,255,0.08)";
    ctx.beginPath(); ctx.arc(x2, y, 2.6, 0, Math.PI * 2); ctx.fill();
    if (i % 2 === 0) {
      ctx.strokeStyle = "rgba(143,188,184,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y); ctx.stroke();
    }
  }
}

/** petri dish with agar gradient, rim highlight and speckled texture */
export function petri(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ar: boolean) {
  const ag = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  ag.addColorStop(0, "rgba(214,170,120,0.32)");
  ag.addColorStop(0.7, "rgba(180,135,90,0.22)");
  ag.addColorStop(1, "rgba(140,100,65,0.30)");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = ag;
  ctx.fill();
  ctx.strokeStyle = "rgba(214,240,244,0.55)";
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(214,240,244,0.18)";
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(cx, cy, r - 7, 0, Math.PI * 2); ctx.stroke();
  if (!ar) {
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r - 3, -2.4, -1.2); ctx.stroke();
    for (let i = 0; i < 40; i++) {
      const a = i * 2.4, d = ((i * 97) % 100) / 100 * (r - 16);
      ctx.fillStyle = "rgba(120,90,60,0.12)";
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** eukaryotic cell: membrane, cytoplasm, nucleus with nucleolus, organelles */
export function euCell(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, nucleus = true, ar = false) {
  if (!ar) glow(ctx, x, y, r * 2.1, hex2rgb(col), 0.14);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.15, x, y, r);
  g.addColorStop(0, hexA(col, 0.35));
  g.addColorStop(1, hexA(col, 0.14));
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1;
  if (nucleus) {
    ctx.beginPath(); ctx.arc(x + r * 0.1, y - r * 0.05, r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = hexA(col, 0.4); ctx.fill();
    ctx.strokeStyle = hexA("#e9f6f3", 0.4); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(x + r * 0.18, y - r * 0.12, r * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = hexA("#e9f6f3", 0.7); ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + x * 0.01;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.65, y + Math.sin(a) * r * 0.65, r * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = hexA("#e9f6f3", 0.35); ctx.fill();
  }
}

export function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function hexA(hex: string, a: number): string {
  const [r, g, b] = hex2rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

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
