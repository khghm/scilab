/* Rich chemistry canvas toolkit — glassware, bench, glows, bubbles, HUD */
export const MONO = '"IBM Plex Mono", monospace';
export const FA = "Vazirmatn, sans-serif";

/* ---------- background ---------- */
export function chemBg(ctx: CanvasRenderingContext2D, W: number, H: number, ar: boolean, t = 0) {
  ctx.clearRect(0, 0, W, H);
  if (ar) return;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#071a20");
  g.addColorStop(0.55, "#0a252e");
  g.addColorStop(1, "#0d2f38");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // warm lamp glow (top-left) breathing slowly
  const warm = 0.10 + 0.02 * Math.sin(t * 0.6);
  const rg = ctx.createRadialGradient(W * 0.18, -40, 40, W * 0.18, -40, W * 0.6);
  rg.addColorStop(0, `rgba(242,168,59,${(warm + 0.08).toFixed(3)})`);
  rg.addColorStop(1, "rgba(242,168,59,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
  // cool teal glow bottom-right
  const cg = ctx.createRadialGradient(W * 0.92, H * 1.05, 30, W * 0.92, H * 1.05, W * 0.55);
  cg.addColorStop(0, "rgba(53,211,194,0.10)");
  cg.addColorStop(1, "rgba(53,211,194,0)");
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, H);
  // faint hex molecular lattice
  hexGrid(ctx, W, H);
}

function hexGrid(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const s = 46;
  ctx.strokeStyle = "rgba(143,188,184,0.045)";
  ctx.lineWidth = 1;
  const hstep = s * 1.732;
  for (let row = -1; row * s * 1.5 < H + s; row++) {
    const y = row * s * 1.5;
    const off = row % 2 ? hstep / 2 : 0;
    for (let x = -hstep + off; x < W + hstep; x += hstep) {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k + Math.PI / 6;
        const px = x + s * 0.58 * Math.cos(a), py = y + s * 0.58 * Math.sin(a);
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
}

/* ---------- bench (lab table) ---------- */
export function bench(ctx: CanvasRenderingContext2D, W: number, H: number, y: number) {
  const g = ctx.createLinearGradient(0, y, 0, H);
  g.addColorStop(0, "#133b45");
  g.addColorStop(0.12, "#0e2f38");
  g.addColorStop(1, "#0a242c");
  ctx.fillStyle = g;
  ctx.fillRect(0, y, W, H - y);
  // top edge highlight
  const eg = ctx.createLinearGradient(0, y, 0, y + 10);
  eg.addColorStop(0, "rgba(233,246,243,0.30)");
  eg.addColorStop(1, "rgba(233,246,243,0)");
  ctx.fillStyle = eg;
  ctx.fillRect(0, y, W, 10);
  // subtle plank seams
  ctx.strokeStyle = "rgba(4,25,29,0.35)";
  ctx.lineWidth = 1;
  for (let x = 120; x < W; x += 190) {
    ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x, H); ctx.stroke();
  }
}

/* ---------- glass ---------- */
function strokeGlass(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(214,240,244,0.62)";
  ctx.lineWidth = 2.6;
  ctx.stroke();
}
/** generic glass vessel: pass a path builder */
export function glass(ctx: CanvasRenderingContext2D, build: () => void) {
  ctx.beginPath();
  build();
  ctx.fillStyle = "rgba(180,225,235,0.045)";
  ctx.fill();
  ctx.beginPath();
  build();
  strokeGlass(ctx);
}
/** vertical shine streak across a glass region */
export function shine(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, w: number, lean = 10) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.45, "rgba(255,255,255,0.16)");
  g.addColorStop(0.55, "rgba(255,255,255,0.16)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x + w, y0);
  ctx.lineTo(x + w + lean, y1);
  ctx.lineTo(x + lean, y1);
  ctx.closePath();
  ctx.fill();
}

/* ---------- liquid ---------- */
export function liquid(ctx: CanvasRenderingContext2D, build: () => void, base: [number, number, number], alpha = 0.85, topLight = 0.22) {
  const [r, g, b] = base;
  const grad = ctx.createLinearGradient(0, 0, 0, 560);
  grad.addColorStop(0, `rgba(${Math.min(255, r + 70)},${Math.min(255, g + 70)},${Math.min(255, b + 70)},${alpha * topLight})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},${alpha})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  build();
  ctx.fill();
}

/* ---------- apparatus ---------- */
export function erlenmeyer(
  ctx: CanvasRenderingContext2D, cx: number, baseY: number,
  neckHalf = 24, baseHalf = 95, neckTop = -150, bodyTop = -60,
) {
  const build = () => {
    ctx.moveTo(cx - neckHalf, baseY + neckTop);
    ctx.lineTo(cx - neckHalf, baseY + bodyTop - 30);
    ctx.bezierCurveTo(cx - baseHalf - 12, baseY - 26, cx - baseHalf - 12, baseY - 12, cx - baseHalf, baseY);
    ctx.lineTo(cx + baseHalf, baseY);
    ctx.bezierCurveTo(cx + baseHalf + 12, baseY - 12, cx + baseHalf + 12, baseY - 26, cx + neckHalf, baseY + bodyTop - 30);
    ctx.lineTo(cx + neckHalf, baseY + neckTop);
  };
  glass(ctx, build);
  // rim
  ctx.strokeStyle = "rgba(233,246,243,0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - neckHalf - 6, baseY + neckTop); ctx.lineTo(cx + neckHalf + 6, baseY + neckTop); ctx.stroke();
  shine(ctx, cx - baseHalf + 14, baseY + bodyTop - 20, baseY - 8, 14, 20);
}

export function erlenLiquid(
  ctx: CanvasRenderingContext2D, cx: number, baseY: number, level: number,
  baseHalf = 95, color: [number, number, number], alpha = 0.85,
) {
  // level: 0..1 of body height
  const yTop = baseY - level * 90;
  const w = baseHalf * (0.55 + 0.45 * level);
  const build = () => {
    ctx.moveTo(cx - w, yTop);
    ctx.quadraticCurveTo(cx, yTop + 7, cx + w, yTop); // meniscus
    ctx.bezierCurveTo(cx + baseHalf + 10, baseY - 14, cx + baseHalf + 10, baseY - 10, cx + baseHalf - 2, baseY - 2);
    ctx.lineTo(cx - baseHalf + 2, baseY - 2);
    ctx.bezierCurveTo(cx - baseHalf - 10, baseY - 10, cx - baseHalf - 10, baseY - 14, cx - w, yTop);
    ctx.closePath();
  };
  liquid(ctx, build, color, alpha, 0.3);
  // surface ellipse
  ctx.strokeStyle = `rgba(255,255,255,0.28)`;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(cx, yTop, w, 5, 0, 0, Math.PI * 2); ctx.stroke();
}

export function beaker(ctx: CanvasRenderingContext2D, cx: number, baseY: number, half = 70, h = 130) {
  const build = () => {
    ctx.moveTo(cx - half, baseY - h);
    ctx.lineTo(cx - half + 6, baseY);
    ctx.quadraticCurveTo(cx, baseY + 8, cx + half - 6, baseY);
    ctx.lineTo(cx + half, baseY - h);
  };
  glass(ctx, build);
  // spout + rim
  ctx.strokeStyle = "rgba(233,246,243,0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - half - 8, baseY - h); ctx.lineTo(cx + half + 4, baseY - h); ctx.stroke();
  shine(ctx, cx - half + 12, baseY - h + 12, baseY - 10, 12, 8);
  // graduations
  ctx.strokeStyle = "rgba(143,188,184,0.35)";
  ctx.lineWidth = 1;
  ctx.font = `9px ${MONO}`;
  ctx.fillStyle = "rgba(143,188,184,0.55)";
  for (let i = 1; i <= 3; i++) {
    const yy = baseY - (h - 18) * (i / 4);
    ctx.beginPath(); ctx.moveTo(cx - half + 10, yy); ctx.lineTo(cx - half + 30, yy); ctx.stroke();
    ctx.fillText(`${i * 50}`, cx - half + 34, yy + 3);
  }
}

export function beakerLiquid(ctx: CanvasRenderingContext2D, cx: number, baseY: number, half = 70, h = 130, frac = 0.6, color: [number, number, number], alpha = 0.85) {
  const yTop = baseY - (h - 14) * frac;
  const wTop = half - 6 - ((baseY - yTop) / h) * 5;
  const build = () => {
    ctx.moveTo(cx - wTop, yTop);
    ctx.quadraticCurveTo(cx, yTop + 6, cx + wTop, yTop);
    ctx.lineTo(cx + half - 8, baseY - 2);
    ctx.quadraticCurveTo(cx, baseY + 6, cx - half + 8, baseY - 2);
    ctx.closePath();
  };
  liquid(ctx, build, color, alpha, 0.32);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(cx, yTop, wTop, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
}

export function burette(ctx: CanvasRenderingContext2D, cx: number, top: number, h: number, frac: number, color: [number, number, number]) {
  const half = 17;
  const build = () => {
    ctx.moveTo(cx - half, top);
    ctx.lineTo(cx - half, top + h);
    ctx.lineTo(cx - 5, top + h + 26);
    ctx.lineTo(cx + 5, top + h + 26);
    ctx.lineTo(cx + half, top + h);
    ctx.lineTo(cx + half, top);
  };
  glass(ctx, build);
  // liquid column
  const liqTop = top + 6 + (h - 12) * (1 - frac);
  ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},0.75)`;
  ctx.fillRect(cx - half + 3, liqTop, (half - 3) * 2, top + h - liqTop);
  // tip liquid
  ctx.fillRect(cx - 3, top + h, 6, 26);
  shine(ctx, cx - half + 4, top + 8, top + h - 6, 7, 4);
  // graduations
  ctx.strokeStyle = "rgba(143,188,184,0.5)";
  ctx.lineWidth = 1;
  ctx.font = `9px ${MONO}`;
  ctx.fillStyle = "rgba(143,188,184,0.7)";
  for (let i = 0; i <= 10; i++) {
    const yy = top + 8 + ((h - 16) * i) / 10;
    const long = i % 5 === 0;
    ctx.beginPath(); ctx.moveTo(cx + half, yy); ctx.lineTo(cx + half + (long ? 12 : 6), yy); ctx.stroke();
    if (long) ctx.fillText(`${i * 5}`, cx + half + 16, yy + 3);
  }
  // stopcock
  ctx.fillStyle = "#f2a83b";
  ctx.beginPath(); ctx.ellipse(cx, top + h + 8, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(4,25,29,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - 9, top + h + 8); ctx.lineTo(cx + 9, top + h + 8); ctx.stroke();
}

export function testTube(ctx: CanvasRenderingContext2D, cx: number, top: number, w = 30, h = 110, frac = 0, color: [number, number, number] = [86, 184, 255]) {
  const half = w / 2;
  const build = () => {
    ctx.moveTo(cx - half, top);
    ctx.lineTo(cx - half, top + h - half);
    ctx.arc(cx, top + h - half, half, Math.PI, 0, true);
    ctx.lineTo(cx + half, top);
  };
  glass(ctx, build);
  if (frac > 0.02) {
    const liqTop = top + (h - 10) * (1 - frac);
    const buildL = () => {
      ctx.moveTo(cx - half + 3, liqTop);
      ctx.quadraticCurveTo(cx, liqTop + 5, cx + half - 3, liqTop);
      ctx.lineTo(cx + half - 3, top + h - half);
      ctx.arc(cx, top + h - half, half - 3, 0, Math.PI, false);
      ctx.lineTo(cx - half + 3, liqTop);
      ctx.closePath();
    };
    liquid(ctx, buildL, color, 0.85, 0.35);
  }
  shine(ctx, cx - half + 5, top + 6, top + h - 12, 6, 3);
  // rim
  ctx.strokeStyle = "rgba(233,246,243,0.8)";
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx - half - 4, top); ctx.lineTo(cx + half + 4, top); ctx.stroke();
}

export function burner(ctx: CanvasRenderingContext2D, cx: number, baseY: number, t: number, on: boolean) {
  // barrel
  const g = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0);
  g.addColorStop(0, "#24535c");
  g.addColorStop(0.5, "#3a7480");
  g.addColorStop(1, "#1d454e");
  ctx.fillStyle = g;
  ctx.fillRect(cx - 13, baseY - 120, 26, 120);
  // base
  ctx.fillStyle = "#2a5f6a";
  ctx.beginPath(); ctx.ellipse(cx, baseY, 52, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(4,25,29,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(cx, baseY, 52, 13, 0, 0, Math.PI * 2); ctx.stroke();
  // air hole ring
  ctx.strokeStyle = "rgba(143,188,184,0.4)";
  ctx.beginPath(); ctx.ellipse(cx, baseY - 96, 14, 5, 0, 0, Math.PI * 2); ctx.stroke();
  if (!on) return;
  const flick = 0.85 + 0.15 * Math.sin(t * 22) * Math.sin(t * 13.3);
  const fh = 92 * flick;
  // outer cone glow
  const og = ctx.createRadialGradient(cx, baseY - 120 - fh / 2, 6, cx, baseY - 120 - fh / 2, fh);
  og.addColorStop(0, "rgba(255,190,90,0.5)");
  og.addColorStop(0.5, "rgba(255,140,60,0.22)");
  og.addColorStop(1, "rgba(255,120,40,0)");
  ctx.fillStyle = og;
  ctx.beginPath(); ctx.ellipse(cx, baseY - 120 - fh / 2, 34 * flick, fh * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  // blue inner cone
  const ig = ctx.createLinearGradient(cx, baseY - 120, cx, baseY - 120 - 56);
  ig.addColorStop(0, "rgba(90,150,255,0.85)");
  ig.addColorStop(1, "rgba(140,190,255,0.15)");
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.moveTo(cx - 12, baseY - 118);
  ctx.quadraticCurveTo(cx, baseY - 118 - 54 * flick, cx + 12, baseY - 118);
  ctx.closePath();
  ctx.fill();
}

/* ---------- animated effects ---------- */
export function bubbles(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, n: number, t: number, color = "255,255,255", speed = 1) {
  for (let i = 0; i < n; i++) {
    const sp = (0.35 + ((i * 37) % 10) / 14) * speed;
    const cyc = (t * sp + i * 0.618) % 1;
    const bx = x0 + ((i * 53) % 100) / 100 * w + Math.sin((cyc * 6 + i) * 1.7) * 6;
    const by = y0 - cyc * h;
    const r = 1.8 + ((i * 29) % 10) / 10 * 2.6;
    ctx.strokeStyle = `rgba(${color},${(0.5 * (1 - cyc * 0.6)).toFixed(2)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(${color},${(0.14 * (1 - cyc)).toFixed(2)})`;
    ctx.fill();
  }
}

export function swirl(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number, color = "255,255,255") {
  ctx.strokeStyle = `rgba(${color},0.16)`;
  ctx.lineWidth = 1.6;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 1.4; a += 0.12) {
      const rr = r * (1 - a / (Math.PI * 1.6)) * (0.5 + 0.5 * k / 3);
      const ang = a + t * 1.6 + k * 2.1;
      const px = cx + rr * Math.cos(ang), py = cy + rr * Math.sin(ang) * 0.5;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: [number, number, number], alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
  g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/* ---------- HUD ---------- */
export function chemHud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, accent = "#35d3c2") {
  ctx.fillStyle = "rgba(5,22,27,0.82)";
  ctx.strokeStyle = "rgba(23,80,89,0.95)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
  // accent bar
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(x, y + 14, 4, h - 28, 2);
  ctx.fill();
}

export function readout(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, size = 34) {
  ctx.font = `700 ${size}px ${MONO}`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function caption(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color = "#8fbcb8", size = 11.5) {
  ctx.font = `${size}px ${FA}`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function labelChip(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, accent = "#f2a83b") {
  ctx.font = `600 11px ${FA}`;
  const w = ctx.measureText(text).width + 22;
  ctx.fillStyle = "rgba(5,22,27,0.75)";
  ctx.strokeStyle = `${accent}66`;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(x, y, w, 24, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = accent;
  ctx.fillText(text, x + 11, y + 16);
  return w;
}
